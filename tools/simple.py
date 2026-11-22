#!/usr/bin/env python3
"""Write simple/index.html (English) from src/simple.json. Run after tools/build.py."""
import html, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
# The page is a single JSON file (title, lead, sections with heading/text/link),
# so the copy can be edited, reviewed and narrated without touching HTML.
d = json.loads((ROOT / 'src/simple.json').read_text())
# Reuse build.py's cache-busting version so CSS/JS/audio URLs change together.
VER = re.search(r"^VER = '(\d+)'", (ROOT / 'tools/build.py').read_text(), re.M).group(1)
e = lambda s: html.escape(s, quote=True)
# Borrow the SVG icon sprite from the main template, so icons stay identical.
syms = re.search(r'<svg[^>]*style="position:absolute"[^>]*>.*?</svg>', (ROOT / 'src/index.html').read_text(), re.S)
syms = syms.group(0) if syms else ''
# One icon per section, keyed by the page each section links to.
ICON = {'/#log': 'i-grid', '/hunt': 'i-target', '/saas': 'i-cloudx', '/cho': 'i-case', '/invest': 'i-trend', '/builders': 'i-tool', '/os': 'i-os'}
cards = '\n'.join(f'''    <section class="s-card">
      <span class="s-ico" aria-hidden="true"><svg class="ico"><use href="#{'i-ph' if i == 0 else ICON[s['href']]}"/></svg></span>
      <h2>{e(s['heading'])}</h2>
      <p>{e(s['text'])}</p>
      <a class="s-more" href="{s['href']}">{e(s['link'])} <svg class="ico"><use href="#i-go"/></svg></a>
    </section>''' for i, s in enumerate(d['sections']))
# Structured data, including the narration as an AudioObject.
ld = {"@context": "https://schema.org", "@type": "WebPage", "name": d['title'], "description": d['metaDescription'], "url": "https://tphm.io/simple", "inLanguage": "en-GB",
      "isPartOf": {"@type": "WebSite", "name": "TPHM · The Product Hunt Marathon", "url": "https://tphm.io/"}, "author": {"@type": "Person", "name": "Paul Fleury", "url": "https://paulfleury.com/"},
      "audio": {"@type": "AudioObject", "contentUrl": "https://tphm.io/simple/voice-en.mp3", "encodingFormat": "audio/mpeg"}}
# The whole page as one template. Doubled braces {{ }} are literal braces in an f-string.
# Plain-language rules: short sentences, one idea per card, a player that
# works without JS errors breaking the text, and reading aids loaded at the end.
page = f'''<!DOCTYPE html>
<html lang="en-GB" dir="ltr" data-lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(d['title'])} · TPHM</title>
<meta name="description" content="{e(d['metaDescription'])}">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://tphm.io/simple">
<meta name="theme-color" content="#DA552F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TPHM">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="https://tphm.io/simple">
<meta property="og:title" content="{e(d['title'])}">
<meta property="og:description" content="{e(d['metaDescription'])}">
<meta property="og:image" content="https://tphm.io/assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@paulfxyz">
<meta name="twitter:image" content="https://tphm.io/assets/og.jpg">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<link rel="icon" href="/assets/img/pfph-v1-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/img/pfph-v1-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Figtree:wght@400..800&display=swap">
<script>(function(){{var t;try{{t=localStorage.getItem('tphm-theme')}}catch(e){{}}if(!t)t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.classList.add('js')}})()</script>
<link rel="stylesheet" href="/ph.css?v={VER}">
<link rel="stylesheet" href="/tphm.css?v={VER}">
<link rel="stylesheet" href="/simple/simple.css?v={VER}">
<link rel="stylesheet" href="/assets/a11y/a11y-v2.css">
</head>
<body class="simple">
{syms}
<a class="skip" href="#main">Skip to content</a>
<header class="top" id="top">
  <div class="wrap top-in">
    <a class="brand" href="/" aria-label="TPHM, the logbook"><img src="/assets/brand/pfph-head-v1.webp" alt="" width="272" height="201"><span>TPHM</span></a>
    <div class="s-top">
      <a class="s-back" href="/"><svg class="ico"><use href="#i-back"/></svg><span>The logbook</span></a>
      <button class="tool theme" type="button" aria-label="Switch between light and dark"><svg class="ico moon"><use href="#i-moon"/></svg><svg class="ico sun"><use href="#i-sun"/></svg></button>
    </div>
  </div>
</header>
<main id="main" class="wrap s-main">
  <section class="s-hero">
    <p class="eyebrow">{e(d['tag'])}</p>
    <h1>{e(d['title'])}</h1>
    <p class="s-lead">{e(d['lead'])}</p>
    <div class="s-player" role="group" aria-label="Listen to this page">
      <button id="play" class="s-play" type="button" aria-pressed="false" data-src="/simple/voice-en.mp3?v={VER}"><svg class="ico i-p"><use href="#i-play"/></svg><svg class="ico i-s" viewBox="0 0 24 24"><path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg><span id="play-label">Listen to this page</span></button>
      <div class="s-track" aria-hidden="true"><i id="play-bar"></i></div>
      <span id="play-time" class="s-time">3 min</span>
    </div>
    <p id="play-error" class="s-err" hidden>The audio could not be played. You can still read the page.</p>
  </section>
  <div class="s-cards">
{cards}
  </div>
  <p class="s-full"><a class="btn btn-primary" href="/">See the full logbook</a> <a class="btn btn-ghost" href="https://paulfleury.com/contact" target="_blank" rel="noopener">Contact me</a></p>
</main>
<footer class="foot">
  <div class="wrap foot-in">
    <p class="motto">Think. Build. Ship. Repeat.</p>
    <p class="foot-note">© 2026 Paul Fleury. All twelve tools are free and MIT-licensed. Narration generated with an AI voice.</p>
  </div>
</footer>
<script src="/simple/simple.js?v={VER}" defer></script>
<script type="module" src="/assets/a11y/a11y-v3.js"></script>
</body>
</html>
'''
(ROOT / 'simple').mkdir(exist_ok=True)
(ROOT / 'simple/index.html').write_text(page)
print('simple/index.html', len(page), 'symbols' if syms else 'NO SYMBOLS')
