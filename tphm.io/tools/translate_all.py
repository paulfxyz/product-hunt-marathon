#!/usr/bin/env python3
"""Translate assets/i18n/keys.json into every language in langs.json via OpenRouter.
Writer anthropic/claude-sonnet-5.5, reviewer google/gemini-3.8-flash (reasoning low).
Only fills strings a language is missing, so existing (hand-tuned) translations are kept.
Step 1 builds a per-language glossary (assets/i18n/glossary.json) so chapter names stay consistent.
Run: pplx credentials run custom-cred:...@openrouter.ai -- python3 tools/translate_all.py [codes]"""
import json, re, subprocess, sys, os, threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
I18N = ROOT / 'assets/i18n'
LANGS = json.loads((I18N / 'langs.json').read_text())
NOTE = {
 'cmn': 'Simplified Chinese (Mandarin, mainland usage), full-width punctuation',
 'yue': 'Cantonese as written in Hong Kong: Traditional characters and natural written Cantonese (係、嘅、唔、咗), full-width punctuation',
 'wuu': 'Wu Chinese (Shanghainese) in Simplified characters, natural written Shanghainese (阿拉、侬、伊、个、勿), full-width punctuation',
 'ar': 'Modern Standard Arabic, right-to-left',
 'arz': 'Egyptian Arabic (colloquial Masri) in Arabic script, right-to-left',
 'fa': 'Persian (Iran), right-to-left, use ZWNJ where standard',
 'ur': 'Urdu (Pakistan), right-to-left',
 'pnb': 'Western Punjabi in Shahmukhi (Perso-Arabic) script, right-to-left',
 'he': 'Modern Hebrew (Israel), right-to-left, gender-neutral where possible',
 'pcm': 'Nigerian Pidgin (Naijá) as written by Nigerian media like BBC News Pidgin: real Pidgin grammar and words (na, dey, don, wetin, wey, abeg, una, sabi, make, go fit, no be), NOT standard English; keep only brand names and code as English',
 'ha': 'Hausa in Latin script (Boko)', 'jv': 'Javanese in Latin script, ngoko-madya friendly register',
 'tl': 'Tagalog / Filipino, natural modern usage (English loanwords where Filipinos really use them)',
 'pt': 'Portuguese (Portugal); Paul lives in Lisbon', 'es': 'Spanish (Spain, neutral)', 'hi': 'Hindi in Devanagari',
 'mr': 'Marathi in Devanagari', 'bn': 'Bengali', 'te': 'Telugu', 'ta': 'Tamil', 'ja': 'Japanese (polite but warm です/ます in prose, plain in UI labels)',
 'ko': 'Korean (polite 해요체 in prose, concise UI labels)', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ru': 'Russian', 'de': 'German (du-form, friendly)',
 'it': 'Italian', 'tr': 'Turkish', 'sw': 'Swahili', 'fr': 'French (France)'}
def name(c):
    x = next(l for l in LANGS if l['c'] == c); return NOTE.get(c, x['e'])
ALL = [l['c'] for l in LANGS if l['c'] != 'en']
TARGET = sys.argv[1].split(',') if len(sys.argv) > 1 else ALL
K = json.loads((I18N / 'keys.json').read_text())
D = {l: (json.loads((I18N / f'{l}.json').read_text()) if (I18N / f'{l}.json').exists() else {}) for l in ALL}
LOCK = threading.Lock()
BRANDS = r'(Junk|ASE|Mang|Hollr|Clippy|Mercury|Megamesh|AI Credit Checker|xnftables|Timescreen|Mars|Tetris|TPHM|TPHM OS|Openline|Iris|Digital Spot|Enki|Cup of News|Product Hunt|GitHub|LinkedIn|X|OS|MD|TXT|CHO|EN|Ctrl K|esc|[a-z0-9-]+(\.[a-z0-9-]+)+(/[a-z]*)?|Free Software Song)'
TAG = re.compile(r'</?t\d+/?>|\{\d+\}')
def plain(k): return re.sub(r'\s+', ' ', TAG.sub(' ', k)).strip()
def trivial(k):
    p = plain(k)
    if not re.search(r'[A-Za-z]', p): return True
    rest = re.sub(BRANDS, ' ', p); rest = re.sub(r'[\s·→←↗+:,.\-–—()/$%&≈]+', ' ', rest).strip()
    if re.search(r'Hire me|SaaS is dead|Openline\.pitch', p): return False
    return not rest
def sig(s): return Counter(TAG.findall(s))
exec(open(Path(__file__).parent / '_ctx.py').read())
GLOSS_TERMS = ['The Marathon', 'The Product Hunt Marathon', 'The hunt', 'SaaS is dead', 'Hire a CHO', 'Chief Hacking Officer', 'Invest', 'Builders', 'Run your own', 'The logbook', 'The log', 'Encore', 'Field notes', 'Inbox', 'Trash', 'Terminal', 'Open the OS', 'Boot TPHM OS', 'Coming soon', 'Current', 'Rent or build', 'Built, not rented.', 'upvote', 'The upvote black market', 'shipped', 'launch', 'Think. Build. Ship. Repeat.', 'Mon/Tue/Wed/Thu/Fri/Sat/Sun {0} Nov (date pattern)', 'Chapter {0} of {1}', 'Day {0}']
RULES = ("Rules: 1) Translate each English string, then reread and rewrite your own translation so it reads as native, idiomatic web copy, not a literal translation. Keep the meaning and every detail; add nothing. "
"2) Strings contain inline markup tokens like <t3>...</t3>, self-closing <t5/>, and number placeholders {0}. Keep EVERY token exactly as written (same names, each exactly once, properly nested). You may move tokens to fit the target word order, but text that was inside a pair must stay inside it. Never translate or renumber tokens. "
"3) Keep product and brand names untranslated and in Latin script: Junk, ASE, Mang, Hollr, Clippy, Mercury, Megamesh, AI Credit Checker, xnftables, Timescreen, Mars, Tetris, TPHM, TPHM OS, Openline, Iris, Digital Spot, Enki, Cup of News, Product Hunt, GitHub, LinkedIn, X, MIT, WireGuard, macOS, Free Software Song, domains (ase.so, mang.sh...), shell commands and terminal output words (help, ls, open, cat, whoami, zsh: command not found...). File names may translate the base words but keep the extension (.md, .txt, .key, .app). Keep 'CHO' as the acronym. "
"4) Use the glossary given for each language exactly, so names stay consistent across the site. "
"5) Dates: weekday and month in the target language's natural short form. Keep currency as written (US$, ≈) and symbols (· → ← ↗ …). Language names: translate the English exonym (e.g. 'German') but keep native endonyms (Deutsch, 日本語) unchanged. "
"6) Correct script and punctuation for each language (full-width for Chinese and Japanese, Arabic comma and question mark for Arabic-script languages, no stray English). "
"7) Never output an email address; contact is paulfleury.com/contact. Keep Paul's informal, contracted, first-person voice.")
def call(model, sysmsg, user, schema, effort='low'):
    payload = {"model": model, "max_tokens": 12000, "reasoning": {"effort": effort},
      "response_format": {"type": "json_schema", "json_schema": {"name": "o", "strict": True, "schema": schema}},
      "messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": user}]}
    err = ''
    import time
    for a in range(5):
        if a: time.sleep(6 * a)
        o = subprocess.run(["curl", "-sS", "--max-time", "600", "https://openrouter.ai/api/v1/chat/completions", "-H", "Content-Type: application/json", "--data-binary", "@-"],
            input=json.dumps(payload), capture_output=True, text=True)
        try:
            b = json.loads(o.stdout); return json.loads(b['choices'][0]['message']['content']), b.get('usage', {}).get('cost') or 0
        except Exception: err = (o.stdout or o.stderr)[:300]
    raise RuntimeError(err)
# ---- glossary
GP = I18N / 'glossary.json'
G = json.loads(GP.read_text()) if GP.exists() else {}
def gloss(l):
    sch = {"type": "object", "additionalProperties": False, "properties": {"terms": {"type": "array", "items": {"type": "object", "additionalProperties": False, "properties": {"en": {"type": "string"}, "t": {"type": "string"}}, "required": ["en", "t"]}}}, "required": ["terms"]}
    seed = ''
    if l == 'fr': seed = "Fixed French: The hunt = La chasse; SaaS is dead = Le SaaS est mort; Hire a CHO = Engager un CHO; Invest = Investir; Builders = Bâtisseurs; The Marathon = le Marathon. "
    ex = {k: v for k, v in D[l].items() if k in GLOSS_TERMS}
    if ex: seed += 'Existing site translations to keep: ' + json.dumps(ex, ensure_ascii=False) + ' '
    w, c1 = call('anthropic/claude-sonnet-5.5', "You are a senior localisation writer. " + CTX, f"Target: {name(l)}. {seed}Give the best natural translation of each glossary term for this site's menus and headings (chapter names short and punchy, event name natural). Terms: " + json.dumps(GLOSS_TERMS), sch)
    r, c2 = call('google/gemini-3.8-flash', "You are a native-speaker reviewer. " + CTX, f"Target: {name(l)}. {seed}Review this glossary for natural, idiomatic, consistent choices; fix anything off; return all terms. " + json.dumps(w, ensure_ascii=False), sch)
    return {x['en']: x['t'] for x in r['terms']}, c1 + c2
def batch(langs, chunk):
    items = [{"id": i, "en": k} for i, k in enumerate(chunk)]
    sch = {"type": "object", "additionalProperties": False, "properties": {"items": {"type": "array", "items": {"type": "object", "additionalProperties": False,
      "properties": {"id": {"type": "integer"}, **{"L_" + l: {"type": "string"} for l in langs}}, "required": ["id"] + ["L_" + l for l in langs]}}}, "required": ["items"]}
    tg = 'Target languages (JSON field = code): ' + '; '.join(f'L_{l} = {name(l)}' for l in langs) + '. Glossary per language: ' + json.dumps({'L_' + l: G[l] for l in langs}, ensure_ascii=False)
    w, c1 = call('anthropic/claude-sonnet-5.5', "You are a senior localisation writer. " + CTX + RULES, tg + '\nStrings: ' + json.dumps(items, ensure_ascii=False), sch)
    w = w['items']; wm = {x['id']: x for x in w}
    r, c2 = call('google/gemini-3.8-flash', "You are a native-speaker reviewer for these languages. " + CTX + "Review the translations against the English source. Fix mistranslations, literal or awkward phrasing, lost or added detail, wrong terminology, leftover English (other than brand names and commands), wrong script, and any damaged markup token. " + RULES + " Return the final corrected strings for every item and language (unchanged if already good).",
        tg + '\n' + json.dumps({"source": items, "translations": w}, ensure_ascii=False), sch)
    rm = {x['id']: x for x in r['items']}
    out, bad = {}, []
    for i, k in enumerate(chunk):
        for l in langs:
            v = (rm.get(i) or {}).get('L_' + l)
            if not v or sig(v) != sig(k): v = (wm.get(i) or {}).get('L_' + l)
            if v and sig(v) == sig(k) and not re.search(r'@\w+\.\w', v.replace('paul@tphm', '')): out.setdefault(l, {})[k] = v.replace('\\xa0', '\u00a0').strip()
            else: bad.append((l, k))
    return out, bad, c1 + c2
def safe(langs, chunk):
    try: return batch(langs, chunk)
    except Exception as e:
        if len(chunk) == 1: print('  failed', langs, chunk[0][:60], str(e)[:120], flush=True); return {}, [(l, chunk[0]) for l in langs], 0
        h = len(chunk) // 2; a = safe(langs, chunk[:h]); b = safe(langs, chunk[h:])
        return {l: {**a[0].get(l, {}), **b[0].get(l, {})} for l in langs}, a[1] + b[1], a[2] + b[2]
def save(l):
    (I18N / f'{l}.json').write_text(json.dumps(D[l], ensure_ascii=False, indent=0, sort_keys=True))
cost = 0
with ThreadPoolExecutor(8) as ex:
    for l, (g, c) in zip([l for l in TARGET if l not in G], ex.map(gloss, [l for l in TARGET if l not in G])):
        G[l] = g; cost += c
GP.write_text(json.dumps(G, ensure_ascii=False, indent=1, sort_keys=True)); print('glossary ok', round(cost, 2), flush=True)
src = [k for k in K if not trivial(k)]
# trivial strings (brand-only etc.) are copied as-is so the dictionary is complete
for l in TARGET:
    for k in K:
        if trivial(k) and k not in D[l]: D[l][k] = k
# language groups of 2 (keeps output per call within limits); each group processes its own chunks
groups = [TARGET[i:i + 2] for i in range(0, len(TARGET), 2)]
jobs = []
for g in groups:
    todo = [k for k in src if any(k not in D[l] for l in g)]
    jobs += [(g, todo[n:n + 12]) for n in range(0, len(todo), 12)]
print('jobs', len(jobs), flush=True)
bads = []; done = 0
def run(j):
    g, ch = j; out, bad, c = safe(g, ch)
    global cost, done
    with LOCK:
        cost += c; bads.extend(bad); done += 1
        for l in g:
            for k, v in out.get(l, {}).items():
                if k not in D[l]: D[l][k] = v
            save(l)
        if done % 20 == 0: print('done', done, '/', len(jobs), 'cost', round(cost, 2), flush=True)
with ThreadPoolExecutor(int(os.environ.get('W', '16'))) as ex: list(ex.map(run, jobs))
print('bad', len(bads)); [print(' ', l, k[:100]) for l, k in bads[:60]]
json.dump(bads, open('/tmp/tr_bads.json', 'w'), ensure_ascii=False)
print('cost', round(cost, 2))
