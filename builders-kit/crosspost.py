#!/usr/bin/env python3
"""
crosspost.py: write a launch post once, get a correct version for every platform.

This is the pipeline behind the Marathon, reduced to one file and the standard
library. You write a single Markdown file per post. The script turns it into a
thread for X, a long post for LinkedIn, a thread for Bluesky and one for
Mastodon, each one sized to that platform's limit. Then you publish:

  - by hand (recommended): `open` prefills each platform's own composer in your
    browser, you read it one last time and press Post yourself;
  - or by API, for the two networks with an open, free API (Bluesky, Mastodon).

Either way, `receipt` logs the published link, so you always know what went
out where. That log is what kept the Marathon in sync when dates moved.

Usage
  python3 crosspost.py draft   posts/example.md            # write out/<slug>/*.txt
  python3 crosspost.py open    posts/example.md x          # prefilled composer
  python3 crosspost.py publish posts/example.md bluesky    # dry run
  python3 crosspost.py publish posts/example.md bluesky --yes
  python3 crosspost.py receipt example x https://x.com/you/status/123
  python3 crosspost.py status                              # what went where

Environment (only for `publish`)
  BLUESKY_HANDLE, BLUESKY_APP_PASSWORD   an app password, never your real one
  MASTODON_INSTANCE, MASTODON_TOKEN      e.g. https://mastodon.social and a
                                         token with the write:statuses scope

Post file format (see posts/example.md)
  ---
  slug: example            (optional, defaults to the file name)
  url: https://example.com
  tags: opensource, buildinpublic
  ---
  The common text, in plain paragraphs.

  ## x
  Optional text used only on X. Same for ## linkedin, ## bluesky, ## mastodon.
"""
import csv
import datetime as dt
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
RECEIPTS = HERE / 'receipts.csv'

# Each platform's limit per post, and how it counts a link.
# X and Mastodon count any URL as 23 characters, whatever its real length.
# Bluesky and LinkedIn count the URL as written.
PLATFORMS = {
    'x':        {'limit': 280,  'url_len': 23,   'thread': True},
    'linkedin': {'limit': 3000, 'url_len': None, 'thread': False},
    'bluesky':  {'limit': 300,  'url_len': None, 'thread': True},
    'mastodon': {'limit': 500,  'url_len': 23,   'thread': True},
}
URL_RE = re.compile(r'https?://\S+')


# ---------------------------------------------------------------- reading

def read_post(path):
    """Return (meta, common_text, overrides) from a post file."""
    raw = Path(path).read_text(encoding='utf-8')
    meta = {}
    if raw.startswith('---'):
        head, _, raw = raw[3:].partition('\n---')
        for line in head.strip().splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip().lower()] = v.strip()
    meta.setdefault('slug', Path(path).stem)
    # Split on "## platform" headings. Anything before the first one is common.
    parts = re.split(r'^##\s+(\w+)\s*$', raw.strip(), flags=re.M)
    common, overrides = parts[0].strip(), {}
    for name, body in zip(parts[1::2], parts[2::2]):
        overrides[name.lower()] = body.strip()
    return meta, common, overrides


# ---------------------------------------------------------------- sizing

def weight(text, url_len):
    """Length as the platform counts it.

    X also counts most CJK characters and emoji as two. We approximate that by
    counting any character above U+10FF as two, which errs on the safe side.
    """
    if url_len:
        text = URL_RE.sub('x' * url_len, text)
    if url_len == 23:  # X and Mastodon style counting
        return sum(2 if ord(c) > 0x10FF else 1 for c in text)
    return len(text)


def split_thread(text, limit, url_len):
    """Cut text into posts that fit, breaking on paragraphs, then sentences,
    then words. Never cuts a word or a link in half. Adds " 1/3" counters."""
    room = limit - 6  # space kept for the " 10/12" counter
    pieces = []
    for para in [p.strip() for p in text.split('\n\n') if p.strip()]:
        if weight(para, url_len) <= room:
            pieces.append(para)
            continue
        for sent in re.split(r'(?<=[.!?])\s+', para):
            if weight(sent, url_len) <= room:
                pieces.append(sent)
                continue
            line = ''
            for word in sent.split():
                test = (line + ' ' + word).strip()
                if weight(test, url_len) > room and line:
                    pieces.append(line)
                    line = word
                else:
                    line = test
            if line:
                pieces.append(line)
    # Greedily merge small pieces back together so posts are not too short.
    posts = []
    for p in pieces:
        if posts and weight(posts[-1] + '\n\n' + p, url_len) <= room:
            posts[-1] += '\n\n' + p
        else:
            posts.append(p)
    if len(posts) > 1:
        posts = [f'{p} {i}/{len(posts)}' for i, p in enumerate(posts, 1)]
    return posts


def build(meta, common, overrides):
    """Return {platform: [post, post, ...]}."""
    tags = [t.strip().lstrip('#') for t in meta.get('tags', '').split(',') if t.strip()]
    hashtags = ' '.join('#' + t for t in tags)
    out = {}
    for name, rule in PLATFORMS.items():
        text = overrides.get(name, common)
        if meta.get('url') and meta['url'] not in text:
            text += '\n\n' + meta['url']
        if hashtags:
            text += '\n\n' + hashtags
        if rule['thread']:
            out[name] = split_thread(text, rule['limit'], rule['url_len'])
        else:
            if weight(text, rule['url_len']) > rule['limit']:
                sys.exit(f'{name}: {weight(text, rule["url_len"])} characters, limit is {rule["limit"]}. Shorten the ## {name} section.')
            out[name] = [text]
    return out


# ---------------------------------------------------------------- receipts

def log_receipt(slug, platform, status, link=''):
    """Append one line to receipts.csv. The file is the single source of truth."""
    new = not RECEIPTS.exists()
    with RECEIPTS.open('a', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        if new:
            w.writerow(['when', 'slug', 'platform', 'status', 'link'])
        w.writerow([dt.datetime.now().isoformat(timespec='minutes'), slug, platform, status, link])


def latest_receipts():
    if not RECEIPTS.exists():
        return {}
    last = {}
    with RECEIPTS.open(encoding='utf-8') as f:
        for row in csv.DictReader(f):
            last[(row['slug'], row['platform'])] = row
    return last


# ---------------------------------------------------------------- publishing

def http_json(url, data=None, headers=None, form=False):
    body = None
    headers = dict(headers or {})
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        else:
            body = json.dumps(data).encode()
            headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def bluesky_facets(text):
    """Bluesky does not turn URLs into links by itself: each link needs a
    'facet' with its position counted in UTF-8 bytes, not characters."""
    facets, raw = [], text.encode('utf-8')
    for m in URL_RE.finditer(text):
        start = len(text[:m.start()].encode('utf-8'))
        end = start + len(m.group().encode('utf-8'))
        facets.append({'index': {'byteStart': start, 'byteEnd': end},
                       'features': [{'$type': 'app.bsky.richtext.facet#link', 'uri': m.group()}]})
    return facets


def publish_bluesky(posts):
    host = 'https://bsky.social/xrpc/'
    s = http_json(host + 'com.atproto.server.createSession',
                  {'identifier': os.environ['BLUESKY_HANDLE'], 'password': os.environ['BLUESKY_APP_PASSWORD']})
    auth = {'Authorization': 'Bearer ' + s['accessJwt']}
    root = parent = None
    for text in posts:
        record = {'$type': 'app.bsky.feed.post', 'text': text,
                  'createdAt': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z')}
        if bluesky_facets(text):
            record['facets'] = bluesky_facets(text)
        if parent:  # a reply needs both the first post (root) and the previous one
            record['reply'] = {'root': root, 'parent': parent}
        r = http_json(host + 'com.atproto.repo.createRecord',
                      {'repo': s['did'], 'collection': 'app.bsky.feed.post', 'record': record}, auth)
        parent = {'uri': r['uri'], 'cid': r['cid']}
        root = root or parent
    rkey = root['uri'].rsplit('/', 1)[-1]
    return f'https://bsky.app/profile/{os.environ["BLUESKY_HANDLE"]}/post/{rkey}'


def publish_mastodon(posts):
    inst = os.environ['MASTODON_INSTANCE'].rstrip('/')
    auth = {'Authorization': 'Bearer ' + os.environ['MASTODON_TOKEN']}
    first = reply_to = None
    for text in posts:
        data = {'status': text}
        if reply_to:
            data['in_reply_to_id'] = reply_to
        r = http_json(inst + '/api/v1/statuses', data, auth, form=True)
        reply_to = r['id']
        first = first or r['url']
    return first


PUBLISHERS = {'bluesky': publish_bluesky, 'mastodon': publish_mastodon}

# Prefilled composers. Each one opens the platform's own posting screen with
# the text in place; nothing is sent until you press the button yourself.
COMPOSE = {
    'x':        'https://x.com/intent/post?text={t}',
    'linkedin': 'https://www.linkedin.com/feed/?shareActive=true&text={t}',
    'bluesky':  'https://bsky.app/intent/compose?text={t}',
    'mastodon': '{inst}/share?text={t}',
}


# ---------------------------------------------------------------- commands

def cmd_draft(path):
    meta, common, overrides = read_post(path)
    slug, posts = meta['slug'], build(meta, common, overrides)
    folder = OUT / slug
    folder.mkdir(parents=True, exist_ok=True)
    for name, items in posts.items():
        (folder / f'{name}.txt').write_text('\n\n-----\n\n'.join(items) + '\n', encoding='utf-8')
        print(f'{name:9} {len(items)} post(s), longest {max(weight(p, PLATFORMS[name]["url_len"]) for p in items)}/{PLATFORMS[name]["limit"]}')
        log_receipt(slug, name, 'draft')
    print(f'Drafts written to {folder}')


def cmd_open(path, platform):
    meta, common, overrides = read_post(path)
    posts = build(meta, common, overrides)[platform]
    if len(posts) > 1:
        print(f'{len(posts)} posts in this thread. Opening the first one; paste the rest as replies from out/{meta["slug"]}/{platform}.txt')
    inst = os.environ.get('MASTODON_INSTANCE', 'https://mastodon.social').rstrip('/')
    webbrowser.open(COMPOSE[platform].format(t=urllib.parse.quote(posts[0]), inst=inst))
    print('Then log the link: python3 crosspost.py receipt', meta['slug'], platform, '<url>')


def cmd_publish(path, platforms, really):
    meta, common, overrides = read_post(path)
    posts = build(meta, common, overrides)
    for p in platforms:
        if p not in PUBLISHERS:
            print(f'{p}: no open API worth using. Run: python3 crosspost.py open {path} {p}')
            continue
        if not really:
            print(f'--- {p} (dry run, add --yes to send) ---')
            print('\n\n-----\n\n'.join(posts[p]))
            continue
        link = PUBLISHERS[p](posts[p])
        log_receipt(meta['slug'], p, 'published', link)
        print(f'{p}: {link}')


def cmd_status():
    rows = latest_receipts()
    if not rows:
        print('No receipts yet.')
    for (slug, platform), r in sorted(rows.items()):
        print(f'{slug:20} {platform:9} {r["status"]:10} {r["link"]}')


def main(argv):
    if len(argv) < 2 or argv[1] in ('-h', '--help'):
        print(__doc__)
        return
    c, a = argv[1], argv[2:]
    if c == 'draft' and a:
        cmd_draft(a[0])
    elif c == 'open' and len(a) >= 2 and a[1] in COMPOSE:
        cmd_open(a[0], a[1])
    elif c == 'publish' and len(a) >= 2:
        cmd_publish(a[0], a[1].split(','), '--yes' in a)
    elif c == 'receipt' and len(a) == 3:
        log_receipt(a[0], a[1], 'published', a[2])
        print('Logged.')
    elif c == 'status':
        cmd_status()
    else:
        print(__doc__)


if __name__ == '__main__':
    main(sys.argv)
