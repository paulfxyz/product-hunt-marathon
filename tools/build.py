#!/usr/bin/env python3
"""Build tphm.io: one static HTML file per page and language, each with its own
URL, title, description, canonical, hreflang and Open Graph tags.

  python3 tools/build.py            # write pages (English + every ready language)
  python3 tools/build.py --prerender  # also bake translated text into the HTML

Sources: src/index.html (logbook) and src/os.html (TPHM OS).
Dictionaries: assets/i18n/<code>.json (English key -> translation).
"""
import html, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://tphm.io'
VER = '202611211400'
LANGS = json.loads((ROOT / 'assets/i18n/langs.json').read_text())
READY = ['en', 'fr', 'cmn', 'he']
OG_LOCALE = {'en': 'en_GB', 'fr': 'fr_FR', 'cmn': 'zh_CN', 'he': 'he_IL'}
FONTS = {'cmn': 'Noto+Sans+SC:wght@400;500;700;800', 'he': 'Noto+Sans+Hebrew:wght@400;500;700;800'}
# Localised chapter slugs. Products and the OS keep their names in every language.
SLUGS = {
    'en': {'hunt': 'hunt', 'saas': 'saas', 'cho': 'cho', 'invest': 'invest', 'builders': 'builders'},
    'fr': {'hunt': 'chasse', 'saas': 'saas', 'cho': 'cho', 'invest': 'investir', 'builders': 'batisseurs'},
    'cmn': {'hunt': 'hunt', 'saas': 'saas', 'cho': 'cho', 'invest': 'invest', 'builders': 'builders'},
    'he': {'hunt': 'hunt', 'saas': 'saas', 'cho': 'cho', 'invest': 'invest', 'builders': 'builders'},
}
CHAPTERS = ['hunt', 'saas', 'cho', 'invest', 'builders']
LOG = re.findall(r"name: '([^']+)', key: '([^']+)', kind: '([^']+)',\s*line: '((?:[^'\\]|\\.)*)'", (ROOT / 'assets/data.js').read_text())
_u = lambda x: re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), x).replace("\\'", "'")
LOG = [(n, k, _u(kind), _u(line)) for n, k, kind, line in LOG]

META = {
    'home': ('TPHM · The Product Hunt Marathon logbook · Paul Fleury',
             'Twelve free, open-source tools in twelve days, from Junk to Tetris. The permanent logbook of The Product Hunt Marathon by Paul Fleury: what was built, what it cost, what Product Hunt taught me, and why companies should build what they rent.',
             'TPHM · The Product Hunt Marathon logbook', 'Twelve free, open-source tools in twelve days. Built, not rented.'),
    'hunt': ('The hunt: field notes from Product Hunt · TPHM',
             'No launch squad, no upvote ask. An honest account of the Marathon on Product Hunt: why the editors featured Mang but not the Marathon, and the upvote market I said no to.',
             'The hunt: field notes from Product Hunt', 'No squad. No upvote ask. Just feedback.'),
    'saas': ('SaaS is dead: build what you rent · TPHM',
             'Rent by default? Not anymore. A calculator to see when building beats renting, and what twelve tools in twelve days actually took.',
             'SaaS is dead: build what you rent', 'Rent by default? Not anymore.'),
    'cho': ('Hire a Chief Hacking Officer · TPHM',
            'A playful title, serious consulting. Up to 30 hours a week, open now: I find your recurring bottlenecks, then build simple tools your team owns.',
            'Hire a Chief Hacking Officer', 'A playful title, serious consulting.'),
    'invest': ('Invest in Openline · TPHM',
               'The Marathon was the side project. Openline is the main bet: travel eSIMs, proven in B2B with over one million activated. Raising from angels and VCs.',
               'Invest in Openline', 'The Marathon was the side project. Here is the main bet.'),
    'builders': ('Run your own little marathon · TPHM',
                 'Six lessons and a launch-day checklist for builders and consultants planning a run of public launches.',
                 'Run your own little marathon', 'Six lessons and a launch-day checklist.'),
    'os': ('TPHM OS · The Product Hunt Marathon · Paul Fleury',
           'Twelve free, open-source tools in twelve days, installed on a tiny operating system. Open the apps, read the field notes, decline the upvote sellers, and see why companies should build what they rent.',
           'TPHM OS · The Product Hunt Marathon', 'Twelve tools. Twelve days. Built, not rented.'),
}
PRODUCT_SUFFIX = 'Free and open source, from The Product Hunt Marathon logbook.'


def meta_strings():
    out = []
    for t in META.values(): out += list(t)
    for n, k, kind, line in LOG: out += [kind, line]
    out.append(PRODUCT_SUFFIX)
    return out


def load_dict(code):
    if code == 'en': return {}
    p = ROOT / f'assets/i18n/{code}.json'
    return json.loads(p.read_text()) if p.exists() else {}


NUM = re.compile(r'\d+(?:[.,]\d+)*')
def tr(D, s):
    if not D: return s
    nums = []
    k = NUM.sub(lambda m: '{%d}' % (nums.append(m.group(0)) or len(nums) - 1), re.sub(r'\s+', ' ', s).strip())
    v = D.get(k)
    if not v: return s
    return re.sub(r'\{(\d+)\}', lambda m: nums[int(m.group(1))] if int(m.group(1)) < len(nums) else m.group(0), v)


def base(code): return '' if code == 'en' else '/' + code
def url(code, key):
    b = base(code)
    if not key: return SITE + (b or '/')
    slug = SLUGS[code].get(key, key)
    return SITE + b + '/' + slug


def pages():
    yield 'home', None
    for c in CHAPTERS: yield c, c
    for n, k, kind, line in LOG: yield 'product', k
    yield 'os', 'os'


def head_block(code, kind, key, D):
    L = next(x for x in LANGS if x['c'] == code)
    if kind == 'product':
        n, k, knd, line = next(x for x in LOG if x[1] == key)
        title = f'{n} · {tr(D, knd)} · TPHM'
        desc = f'{tr(D, line)} {tr(D, PRODUCT_SUFFIX)}'
        ogt, ogd, img = f'{n} · {tr(D, knd)}', tr(D, line), f'{SITE}/assets/og/{k}.jpg'
    else:
        t, d, ot, od = META[kind]
        title, desc, ogt, ogd = tr(D, t), tr(D, d), tr(D, ot), tr(D, od)
        img = f'{SITE}/assets/og.jpg'
    canon = url(code, key)
    e = lambda s: html.escape(s, quote=True)
    alts = '\n'.join(f'<link rel="alternate" hreflang="{next(x["l"] for x in LANGS if x["c"] == c)}" href="{url(c, key)}">' for c in READY)
    alts += f'\n<link rel="alternate" hreflang="x-default" href="{url("en", key)}">'
    font = f'\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={FONTS[code]}&display=swap">' if code in FONTS else ''
    ld = {"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "url": canon, "inLanguage": L['l'],
          "isPartOf": {"@type": "WebSite", "name": "TPHM · The Product Hunt Marathon", "url": SITE + '/'},
          "author": {"@type": "Person", "name": "Paul Fleury", "url": "https://paulfleury.com/"}, "image": img}
    return f'''<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="{canon}">
{alts}
<meta property="og:type" content="website">
<meta property="og:site_name" content="TPHM">
<meta property="og:locale" content="{OG_LOCALE[code]}">
{''.join(f'<meta property="og:locale:alternate" content="{OG_LOCALE[c]}">' for c in READY if c != code)}
<meta property="og:url" content="{canon}">
<meta property="og:title" content="{e(ogt)}">
<meta property="og:description" content="{e(ogd)}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@paulfxyz">
<meta name="twitter:title" content="{e(ogt)}">
<meta name="twitter:description" content="{e(ogd)}">
<meta name="twitter:image" content="{img}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>{font}
<link rel="stylesheet" href="/assets/i18n/i18n.css?v={VER}">'''


def strip_head(s):
    s = re.sub(r'<title>.*?</title>\n', '', s, flags=re.S)
    s = re.sub(r'<meta (name="(description|robots)"|property="og:[^"]+")[^>]*>\n', '', s)
    return s


def scripts(code):
    d = '' if code == 'en' else f'<script src="/assets/i18n/{code}.js?v={VER}"></script>\n'
    return f'<script src="/assets/i18n/langs.js?v={VER}"></script>\n{d}<script src="/assets/i18n/i18n.js?v={VER}"></script>\n'


def render(code, kind, key):
    D = load_dict(code)
    L = next(x for x in LANGS if x['c'] == code)
    src = (ROOT / ('src/os.html' if kind == 'os' else 'src/index.html')).read_text()
    s = strip_head(src)
    s = s.replace('<html lang="en" dir="ltr">', f'<html lang="{L["l"]}" dir="{L["d"]}" data-lang="{code}" data-base="{base(code)}">', 1)
    s = s.replace('<meta name="viewport"', head_block(code, kind, key, D) + '\n<meta name="viewport"', 1)
    s = re.sub(r'\?v=\d{12}', f'?v={VER}', s)
    # i18n first (in <head>, so its observer sees everything the app renders)
    s = s.replace('</head>', scripts(code) + '</head>', 1)
    if kind != 'os':
        s = s.replace('<script src="/app.js', f'<script src="/assets/i18n/lang-ui.js?v={VER}" defer></script>\n<script src="/app.js', 1)
    # internal links
    b = base(code)
    def link(m):
        p = m.group(1)
        if p == '/': return f'href="{b or "/"}"'
        k = p.strip('/')
        if k in CHAPTERS: return f'href="{b}/{SLUGS[code][k]}"'
        if k == 'os': return f'href="{b}/os"'
        return m.group(0)
    s = re.sub(r'href="(/(?:[a-z-]+/?)?)"', link, s)
    if kind not in ('home', 'product', 'os'):
        # show the chapter, hide the landing, so the static HTML matches the URL
        s = re.sub(r'(<section[^>]*data-page=")home(")(?![^>]*hidden)', r'\1home\2 hidden', s)
        s = re.sub(rf'(<section[^>]*data-page="{kind}"[^>]*?) hidden', r'\1', s)
    return s


def out_path(code, kind, key):
    d = ROOT / (base(code).lstrip('/') or '.')
    if key: d = d / (SLUGS[code].get(key, key))
    return d / 'index.html'


def write_langs_js():
    langs = [dict(x, on=int(x['c'] in READY)) for x in LANGS]
    js = '/* generated by tools/build.py */\nwindow.TPHM_LANGS=' + json.dumps(langs, ensure_ascii=False, separators=(',', ':')) + ';\nwindow.TPHM_SLUGMAP=' + json.dumps(SLUGS, separators=(',', ':')) + ';\n'
    js += '(function(){var c=document.documentElement.dataset.lang||"en";window.TPHM_SLUGS=(window.TPHM_SLUGMAP[c]||{});})();\n'
    (ROOT / 'assets/i18n/langs.js').write_text(js)
    for c in READY:
        if c == 'en': continue
        D = load_dict(c)
        (ROOT / f'assets/i18n/{c}.js').write_text('/* generated by tools/build.py */\nwindow.TPHM_DICT=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n')


def build(langs=READY):
    write_langs_js()
    written = []
    for code in langs:
        for kind, key in pages():
            p = out_path(code, kind, key)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(render(code, kind, key))
            written.append(p)
    urls = [url(c, k) for c in READY for _, k in pages()]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    for kind, key in pages():
        for c in READY:
            sm += f'<url><loc>{url(c, key)}</loc><lastmod>2026-11-20</lastmod>' + ''.join(
                f'<xhtml:link rel="alternate" hreflang="{next(x["l"] for x in LANGS if x["c"] == a)}" href="{url(a, key)}"/>' for a in READY) + '</url>\n'
    (ROOT / 'sitemap.xml').write_text(sm + '</urlset>\n')
    return written


if __name__ == '__main__':
    w = build()
    print(len(w), 'pages')
