#!/usr/bin/env python3
"""Translate assets/i18n/keys.json into fr, cmn (Simplified Chinese) and he via OpenRouter.
Writer: anthropic/claude-sonnet-5.5, reviewer: google/gemini-3.8-flash. Caches to assets/i18n/<code>.json.
Run: pplx credentials run custom-cred:...@openrouter.ai -- python3 tools/translate.py"""
import json, re, subprocess, sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
I18N = ROOT / 'assets/i18n'
import os
L = os.environ.get('TPHM_LANGS', 'fr,cmn,he').split(',')
NAMES = {'fr': 'French (France)', 'cmn': 'Simplified Chinese (Mandarin, mainland usage)', 'he': 'Modern Hebrew (Israel)'}
K = json.loads((I18N / 'keys.json').read_text())
D = {l: (json.loads((I18N / f'{l}.json').read_text()) if (I18N / f'{l}.json').exists() else {}) for l in L}
LANGNAMES = {x['e'] for x in json.loads((I18N / 'langs.json').read_text())} | {x['n'] for x in json.loads((I18N / 'langs.json').read_text())}
BRANDS = r'(Junk|ASE|Mang|Hollr|Clippy|Mercury|Megamesh|AI Credit Checker|xnftables|Timescreen|Mars|Tetris|TPHM|TPHM OS|Openline|Iris|Digital Spot|Enki|Cup of News|Product Hunt|GitHub|LinkedIn|X|OS|MD|TXT|CHO|EN|Ctrl K|esc|[a-z0-9-]+(\.[a-z0-9-]+)+(/[a-z]*)?|Free Software Song)'
TAG = re.compile(r'</?t\d+/?>|\{\d+\}')
def plain(k): return re.sub(r'\s+', ' ', TAG.sub(' ', k)).strip()
def trivial(k):
    p = plain(k)
    if not re.search(r'\p{L}' if False else r'[A-Za-z]', p): return True
    rest = re.sub(BRANDS, ' ', p)
    rest = re.sub(r'[\s·→←↗+:,.\-–—()/$%&≈]+', ' ', rest).strip()
    if re.search(r'Hire me|SaaS is dead|Openline\.pitch', p): return False
    return not rest
def sig(s): return Counter(TAG.findall(s))
todo = [k for k in K if not trivial(k) and any(k not in D[l] for l in L)]
print('keys', len(K), 'to translate', len(todo), flush=True)

CTX = ("Website: tphm.io, 'The Product Hunt Marathon' (TPHM) logbook by Paul Fleury, a French founder in Lisbon. He shipped twelve free, MIT-licensed tools on Product Hunt in twelve days (10-21 Nov 2026): eleven plus a Tetris encore. "
"Chapters: 'The hunt' (what Product Hunt rewards, the upvote black market he refused), 'SaaS is dead' (rent or build software with AI), 'Hire a CHO' (Chief Hacking Officer consulting), 'Invest' (Openline), 'Builders' / 'Run your own' (lessons and a checklist). There is also 'TPHM OS', a playful retro desktop version of the site with windows, a terminal, notes, an inbox and a trash. "
"Venture hierarchy, keep it exact: Openline (eSIMs, B2B then direct to travellers) is his main venture and startup; Iris and Digital Spot are spin-offs of tools built for Openline; Enki.ngo is a thought experiment; Cup of News is a Sunday afternoon hobby turning soon into an app. "
"Tone: first person, warm, plain, honest, a bit playful, never salesy. ")
RULES = ("Rules: 1) Translate each English string into every target language, then reread and rewrite your own translation so it reads as native, idiomatic web copy, not a literal translation. Keep the meaning and every detail; add nothing. "
"2) Strings contain inline markup tokens like <t3>...</t3>, self-closing <t5/>, and number placeholders {0}. Keep EVERY token exactly as written (same names, each exactly once, properly nested). You may move tokens to fit the target word order, but text that was inside a pair must stay inside it. Never translate or renumber tokens. "
"3) Keep product and brand names untranslated: Junk, ASE, Mang, Hollr, Clippy, Mercury, Megamesh, AI Credit Checker, xnftables, Timescreen, Mars, Tetris, TPHM, TPHM OS, Openline, Iris, Digital Spot, Enki, Cup of News, Product Hunt, GitHub, LinkedIn, X, MIT, Free Software Song, domains (ase.so, mang.sh...), file names (CHO.md, Field notes.txt may translate the base words but keep the extension). Keep 'CHO' as the acronym; 'Chief Hacking Officer' may stay in English with a natural gloss if needed. "
"4) 'The Marathon' is the event name: French 'le Marathon', Chinese '马拉松', Hebrew 'המרתון'. Chapter names: 'The hunt' = FR 'La chasse'; 'SaaS is dead' = FR 'Le SaaS est mort'; 'Hire a CHO' = FR 'Engager un CHO'; 'Invest' = FR 'Investir'; 'Builders' = FR 'Bâtisseurs'; use natural equivalents in Chinese and Hebrew and stay consistent. "
"5) Dates: weekday abbreviations and months in the target language (e.g. 'Tue {0} Nov' -> FR 'mar. {0} nov.', ZH '11月{0}日周二', HE 'יום ג׳, {0} בנוב׳'). Keep currency as written (US$, ≈). Keep symbols (· → ← ↗ …). 'Coming soon' for languages not yet available. Language names: translate the English exonym (e.g. 'German') but keep native endonyms (Deutsch, 日本語) unchanged. "
"6) French: typographic apostrophe ’ and a narrow no-break space before ? ! : ; is optional, keep it simple with a normal space. Chinese: full-width punctuation, no spaces between Chinese characters, keep a space around Latin brand names only if natural. Hebrew: natural modern Hebrew, gender-neutral where possible, keep Latin brand names in Latin script. "
"7) Never output an email address; contact is paulfleury.com/contact.")
SYS_W = "You are a senior localisation writer. " + CTX + RULES
SYS_R = ("You are a native-speaker reviewer for French, Simplified Chinese and Hebrew. " + CTX + "Review the translations against the English source. Fix mistranslations, literal or awkward phrasing, lost or added detail, wrong terminology, leftover English (other than brand names), wrong script, and any damaged markup token. "
 + RULES + " Return the final corrected strings for every item and language (unchanged if already good).")
schema = {"type": "object", "additionalProperties": False, "properties": {"items": {"type": "array", "items": {"type": "object", "additionalProperties": False,
  "properties": {"id": {"type": "integer"}, **{l: {"type": "string"} for l in L}}, "required": ["id"] + L}}}, "required": ["items"]}

def call(model, sysmsg, user, effort='low'):
    payload = {"model": model, "max_tokens": 32000, "reasoning": {"effort": effort},
      "response_format": {"type": "json_schema", "json_schema": {"name": "o", "strict": True, "schema": schema}},
      "messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": user}]}
    err = ''
    for _ in range(3):
        o = subprocess.run(["curl", "-sS", "--max-time", "600", "https://openrouter.ai/api/v1/chat/completions", "-H", "Content-Type: application/json", "--data-binary", "@-"],
            input=json.dumps(payload), capture_output=True, text=True)
        try:
            b = json.loads(o.stdout); return json.loads(b['choices'][0]['message']['content'])['items'], b.get('usage', {}).get('cost') or 0
        except Exception: err = (o.stdout or o.stderr)[:300]
    raise RuntimeError(err)

def batch(chunk):
    items = [{"id": i, "en": k} for i, k in enumerate(chunk)]
    w, c1 = call('anthropic/claude-sonnet-5.5', SYS_W, json.dumps(items, ensure_ascii=False))
    wm = {x['id']: x for x in w}
    r, c2 = call('google/gemini-3.8-flash', SYS_R, json.dumps({"source": items, "translations": w}, ensure_ascii=False))
    rm = {x['id']: x for x in r}
    out, bad = {}, []
    for i, k in enumerate(chunk):
        for l in L:
            v = (rm.get(i) or {}).get(l)
            if not v or sig(v) != sig(k): v = (wm.get(i) or {}).get(l)
            if v and sig(v) == sig(k): out.setdefault(l, {})[k] = v.replace('\\xa0', '\u00a0').strip()
            else: bad.append((l, k))
    return out, bad, c1 + c2

def safe(chunk):
    try: return batch(chunk)
    except Exception as e:
        if len(chunk) == 1: print('  failed', chunk[0][:80], str(e)[:100], flush=True); return {}, [(l, chunk[0]) for l in L], 0
        h = len(chunk) // 2; a = safe(chunk[:h]); b = safe(chunk[h:])
        out = {l: {**a[0].get(l, {}), **b[0].get(l, {})} for l in L}
        return out, a[1] + b[1], a[2] + b[2]
B = 15
chunks = [todo[n:n + B] for n in range(0, len(todo), B)]
cost = 0; bads = []
with ThreadPoolExecutor(4) as ex:
    for n, (out, bad, c) in enumerate(ex.map(safe, chunks)):
        cost += c; bads += bad
        for l in L: D[l].update(out.get(l, {}))
        for l in L: (I18N / f'{l}.json').write_text(json.dumps(D[l], ensure_ascii=False, indent=0, sort_keys=True))
        print('batch', n, 'ok', round(c, 3), flush=True)
print('bad', len(bads)); [print(' ', l, k[:100]) for l, k in bads[:40]]
print('cost', round(cost, 2))
