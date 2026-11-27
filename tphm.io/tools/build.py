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

# ---------------------------------------------------------------------------
# Configuration
# ROOT is the repo folder; SITE is the public origin used for canonical URLs.
# VER is a timestamp appended as ?v=VER to every CSS/JS URL. Bump it on every
# release so browsers and the CDN fetch fresh files instead of cached ones.
# LANGS lists every language the selector knows; READY are the ones we build.
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://tphm.io'
VER = "202611270400"
LANGS = json.loads((ROOT / 'assets/i18n/langs.json').read_text())
READY = [x['c'] for x in LANGS]
OG_LOCALE = {'en': 'en_GB', 'fr': 'fr_FR', 'cmn': 'zh_CN', 'he': 'he_IL', 'hi': 'hi_IN', 'es': 'es_ES', 'ar': 'ar_AR',
             'bn': 'bn_IN', 'pt': 'pt_PT', 'ru': 'ru_RU', 'id': 'id_ID', 'ur': 'ur_PK', 'de': 'de_DE', 'ja': 'ja_JP',
             'pcm': 'en_NG', 'arz': 'ar_EG', 'mr': 'mr_IN', 'vi': 'vi_VN', 'te': 'te_IN', 'ha': 'ha_NG', 'tr': 'tr_TR',
             'pnb': 'pa_PK', 'sw': 'sw_KE', 'tl': 'tl_PH', 'ta': 'ta_IN', 'yue': 'zh_HK', 'wuu': 'zh_CN', 'fa': 'fa_IR',
             'ko': 'ko_KR', 'it': 'it_IT', 'jv': 'jv_ID'}
_W = ':wght@400;500;700;800'
FONTS = {'cmn': 'Noto+Sans+SC' + _W, 'wuu': 'Noto+Sans+SC' + _W, 'yue': 'Noto+Sans+TC' + _W, 'ja': 'Noto+Sans+JP' + _W,
         'ko': 'Noto+Sans+KR' + _W, 'he': 'Noto+Sans+Hebrew' + _W, 'hi': 'Noto+Sans+Devanagari' + _W,
         'mr': 'Noto+Sans+Devanagari' + _W, 'bn': 'Noto+Sans+Bengali' + _W, 'ta': 'Noto+Sans+Tamil' + _W,
         'te': 'Noto+Sans+Telugu' + _W, 'ar': 'Noto+Sans+Arabic' + _W, 'arz': 'Noto+Sans+Arabic' + _W,
         'fa': 'Noto+Sans+Arabic' + _W, 'ur': 'Noto+Nastaliq+Urdu:wght@400;700', 'pnb': 'Noto+Nastaliq+Urdu:wght@400;700'}
# Localised chapter slugs. Products and the OS keep their names in every language.
# French has its own slugs; every other language keeps the English ones.
_EN = {'hunt': 'hunt', 'saas': 'saas', 'cho': 'cho', 'invest': 'invest', 'builders': 'builders'}
SLUGS = {c: dict(_EN) for c in READY}
SLUGS['fr'] = {'hunt': 'chasse', 'saas': 'saas', 'cho': 'cho', 'invest': 'investir', 'builders': 'batisseurs'}
# Languages with their own /simple page (tools/simple.py); others link to English.
SIMPLE_LANGS = READY
CHAPTERS = ['hunt', 'saas', 'cho', 'invest', 'builders']
# The twelve tools come from assets/data.js (window.TPHM_LOG), the same file the
# browser uses, so names and one-liners never drift between HTML and JS.
# We read it with a regex rather than a JS engine to keep the build dependency-free.
LOG = re.findall(r"name: '([^']+)', key: '([^']+)', kind: '([^']+)',\s*line: '((?:[^'\\]|\\.)*)'", (ROOT / 'assets/data.js').read_text())
_u = lambda x: re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), x).replace("\\'", "'")
LOG = [(n, k, _u(kind), _u(line)) for n, k, kind, line in LOG]

# Per-page SEO strings: (title, description, og:title, og:description).
# These are English; tr() looks each one up in the language dictionary.
META = {
    'home': ('TPHM · The Product Hunt Marathon logbook · Paul Fleury',
             'Twelve free, open-source tools in twelve days, from Junk to Tetris. The permanent logbook of The Product Hunt Marathon by Paul Fleury: what was built, what it cost, what Product Hunt taught me, and why companies should build what they rent.',
             'TPHM · The Product Hunt Marathon logbook', 'Twelve free, open-source tools in twelve days. Built, not rented.'),
    'hunt': ('Product Hunt: field notes from the Marathon · TPHM',
             'No launch squad, no upvote ask. An honest account of the Marathon on Product Hunt: why a launch without a marketing budget stalls near 4 points, the Mang feature, the upvote market I said no to, and a case for open source.',
             'Product Hunt: field notes from the Marathon', 'No squad. No upvote ask. Just feedback.'),
    'saas': ('SaaS is dead: build what you rent · TPHM',
             'Rent by default? Not anymore. A calculator to see when building beats renting, and what twelve tools in twelve days actually took.',
             'SaaS is dead: build what you rent', 'Rent by default? Not anymore.'),
    'cho': ('Hire a Chief Hacking Officer · TPHM',
            'A playful title, serious consulting. Up to 30 hours a week, open now: I find your recurring bottlenecks, then build simple tools your team owns.',
            'Hire a Chief Hacking Officer', 'A playful title, serious consulting.'),
    'invest': ('Investors: Openline and more · TPHM',
               'The Marathon was the side project. Openline is the main bet: travel eSIMs, proven in B2B with over one million activated. Raising from angels and VCs.',
               'For investors', 'The Marathon was the side project. Here is the main bet.'),
    'builders': ('Run your own little marathon · TPHM',
                 'Six lessons, a launch-day checklist, a step-by-step field guide and four free Python scripts for builders planning a run of public launches.',
                 'Run your own little marathon', 'Six lessons, a field guide and a free toolkit.'),
    'os': ('TPHM OS · The Product Hunt Marathon · Paul Fleury',
           'Twelve free, open-source tools in twelve days, installed on a tiny operating system. Open the apps, read the field notes, decline the upvote sellers, and see why companies should build what they rent.',
           'TPHM OS · The Product Hunt Marathon', 'Twelve tools. Twelve days. Built, not rented.'),
}
PRODUCT_SUFFIX = 'Free and open source, from The Product Hunt Marathon logbook.'


# Everything above that needs translating, so tools/harvest.py can add it to keys.json.
def meta_strings():
    out = []
    for t in META.values(): out += list(t)
    for n, k, kind, line in LOG: out += [kind, line]
    out.append(PRODUCT_SUFFIX)
    return out


# A dictionary maps an English string to its translation (assets/i18n/<code>.json).
def load_dict(code):
    if code == 'en': return {}
    p = ROOT / f'assets/i18n/{code}.json'
    return json.loads(p.read_text()) if p.exists() else {}


# Translation lookup. Numbers are replaced with {0}, {1}... before the lookup so
# one dictionary entry covers "12 tools" and "11 tools"; the real numbers are put
# back afterwards. Missing entries fall back to English rather than breaking.
NUM = re.compile(r'\d+(?:[.,]\d+)*')
def tr(D, s):
    if not D: return s
    nums = []
    k = NUM.sub(lambda m: '{%d}' % (nums.append(m.group(0)) or len(nums) - 1), re.sub(r'\s+', ' ', s).strip())
    v = D.get(k)
    if not v: return s
    return re.sub(r'\{(\d+)\}', lambda m: nums[int(m.group(1))] if int(m.group(1)) < len(nums) else m.group(0), v)


# URL helpers. English lives at the root (/hunt); other languages get a prefix and
# a localised slug where one exists (/fr/chasse).
def base(code): return '' if code == 'en' else '/' + code
def url(code, key):
    b = base(code)
    if not key: return SITE + (b or '/')
    slug = SLUGS[code].get(key, key)
    return SITE + b + '/' + slug


# Every page we generate: the home, the five chapters, one page per tool and the OS.
def pages():
    yield 'home', None
    for c in CHAPTERS: yield c, c
    for n, k, kind, line in LOG: yield 'product', k
    yield 'os', 'os'


# The <head> for one page in one language: title, description, canonical URL,
# hreflang alternates (so search engines pair the languages), Open Graph and
# Twitter cards (link previews), and JSON-LD structured data. Pages are indexable
# (approved by Paul on 24 November 2026).
PERSON = {"@type": "Person", "name": "Paul Fleury", "url": "https://paulfleury.com/", "jobTitle": "Founder, CEO, Chief Hacking Officer",
          "sameAs": ["https://github.com/paulfxyz", "https://x.com/paulfxyz", "https://www.producthunt.com/@paulfxyz", "https://www.linkedin.com/in/paulfxyz"]}


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
          "author": PERSON, "image": img}
    if kind == 'home':
        ld = [ld, {"@context": "https://schema.org", "@type": "WebSite", "name": "TPHM · The Product Hunt Marathon", "alternateName": "TPHM",
                   "url": SITE + '/', "inLanguage": [x['l'] for x in LANGS if x['c'] in READY], "publisher": PERSON}]
    elif kind == 'product':
        ld = [ld, {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": n, "description": tr(D, line),
                   "applicationCategory": "DeveloperApplication", "isAccessibleForFree": True, "license": "https://opensource.org/licenses/MIT",
                   "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "author": PERSON, "url": canon, "image": img}]
    return f'''<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
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


# Remove the template's placeholder head tags before inserting the real ones.
def strip_head(s):
    s = re.sub(r'<title>.*?</title>\n', '', s, flags=re.S)
    s = re.sub(r'<meta (name="(description|robots)"|property="og:[^"]+")[^>]*>\n', '', s)
    return s


# The i18n runtime: language list, the language's dictionary (if not English),
# then i18n.js, which translates the DOM and anything the app renders later.
def scripts(code):
    d = '' if code == 'en' else f'<script src="/assets/i18n/{code}.js?v={VER}"></script>\n'
    return f'<script src="/assets/i18n/langs.js?v={VER}"></script>\n{d}<script src="/assets/i18n/i18n.js?v={VER}"></script>\n'


# Render one page: take the template, set lang/dir (Hebrew is right-to-left),
# inject the head, stamp the cache-busting version, localise internal links and
# show the right section, so each URL works as plain static HTML without JS.
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
        if k == 'simple' and code in SIMPLE_LANGS: return f'href="{b}/simple"'
        return m.group(0)
    s = re.sub(r'href="(/(?:[a-z-]+/?)?)"', link, s)
    if kind not in ('home', 'product', 'os'):
        # show the chapter, hide the landing, so the static HTML matches the URL
        s = re.sub(r'(<section[^>]*data-page=")home(")(?![^>]*hidden)', r'\1home\2 hidden', s)
        s = re.sub(rf'(<section[^>]*data-page="{kind}"[^>]*?) hidden', r'\1', s)
    return s


# Where a page is written: /index.html, /hunt/index.html, /fr/chasse/index.html...
# .htaccess (and tools/serve.py locally) serve these folders as clean URLs.
def out_path(code, kind, key):
    d = ROOT / (base(code).lstrip('/') or '.')
    if key: d = d / (SLUGS[code].get(key, key))
    return d / 'index.html'


# Generated JS: the language list and slug map for the selector, plus one
# dictionary file per language, loaded only by pages in that language.
def write_langs_js():
    langs = [dict(x, on=int(x['c'] in READY)) for x in LANGS]
    js = '/* generated by tools/build.py */\nwindow.TPHM_LANGS=' + json.dumps(langs, ensure_ascii=False, separators=(',', ':')) + ';\nwindow.TPHM_SLUGMAP=' + json.dumps(SLUGS, separators=(',', ':')) + ';\n'
    js += '(function(){var c=document.documentElement.dataset.lang||"en";window.TPHM_SLUGS=(window.TPHM_SLUGMAP[c]||{});})();\n'
    (ROOT / 'assets/i18n/langs.js').write_text(js)
    for c in READY:
        if c == 'en': continue
        D = load_dict(c)
        (ROOT / f'assets/i18n/{c}.js').write_text('/* generated by tools/build.py */\nwindow.TPHM_DICT=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n')


# Build every page in every ready language, then the sitemap with hreflang links.
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
            sm += f'<url><loc>{url(c, key)}</loc><lastmod>2026-11-24</lastmod>' + ''.join(
                f'<xhtml:link rel="alternate" hreflang="{next(x["l"] for x in LANGS if x["c"] == a)}" href="{url(a, key)}"/>' for a in READY) + '</url>\n'
    su = lambda c: SITE + base(c) + '/simple'
    for c in SIMPLE_LANGS:
        sm += f'<url><loc>{su(c)}</loc><lastmod>2026-11-27</lastmod>' + ''.join(
            f'<xhtml:link rel="alternate" hreflang="{next(x["l"] for x in LANGS if x["c"] == a)}" href="{su(a)}"/>' for a in SIMPLE_LANGS) + '</url>\n'
    (ROOT / 'sitemap.xml').write_text(sm + '</urlset>\n')
    return written


if __name__ == '__main__':
    w = build()
    print(len(w), 'pages')
