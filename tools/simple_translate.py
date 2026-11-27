import json, re, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT = Path('/home/user/workspace/tphm')
src = (ROOT/'tools/translate_all.py').read_text().split('# ---- glossary')[0]
sys.argv = ['x']; __file__ = str(ROOT/'tools/translate_all.py')
exec(src)
G = json.loads((I18N/'glossary.json').read_text())
EN = json.loads((ROOT/'src/simple.json').read_text())
sp = (ROOT/'tools/simple.py').read_text()
EN_UI = eval(re.search(r'EN_UI = (\{.*?\})\n', sp, re.S).group(1))
UIK = list(EN_UI)
S = lambda: {"type":"string"}
sch = {"type":"object","additionalProperties":False,"properties":{
  "title":S(),"tag":S(),"lead":S(),"metaDescription":S(),
  "sections":{"type":"array","items":{"type":"object","additionalProperties":False,"properties":{"heading":S(),"text":S(),"link":S()},"required":["heading","text","link"]}},
  "ui":{"type":"object","additionalProperties":False,"properties":{k:S() for k in UIK},"required":UIK}},
  "required":["title","tag","lead","metaDescription","sections","ui"]}
srcj = {k: EN[k] for k in ['title','tag','lead','metaDescription']}
srcj['sections'] = [{k: s[k] for k in ['heading','text','link']} for s in EN['sections']]
srcj['ui'] = EN_UI
PL = ("This is the site's plain-language page (/simple): short sentences, everyday words, one idea per card, readable by anyone including people with reading difficulties. "
      "Keep that plain register in the target language. Keep numbers, dates and amounts exact. 'metaDescription' is an SEO description: natural and under about 160 characters where the script allows. "
      "'min' is the reading/listening time label. 'listen', 'pause', 'resume' are audio player button labels.")
def one(l):
    out = ROOT/f'src/simple.{l}.json'
    if out.exists(): return l, 0, 'kept'
    u = f"Target: {name(l)}. Glossary: {json.dumps(G.get(l,{}), ensure_ascii=False)}\nTranslate this JSON (same structure, same number of sections, same keys):\n" + json.dumps(srcj, ensure_ascii=False)
    w, c1 = call('anthropic/claude-sonnet-5.5', "You are a senior localisation writer. " + CTX + RULES + " " + PL, u, sch)
    r, c2 = call('google/gemini-3.8-flash', "You are a native-speaker proofreader. " + CTX + "Review the translation against the English source. Fix mistranslations, awkward or literal phrasing, lost or added detail, leftover English (other than brand names), wrong script or punctuation, register that is not plain and friendly. " + RULES + " " + PL + " Return the full corrected JSON (unchanged where already good).",
        f"Target: {name(l)}.\n" + json.dumps({"source": srcj, "translation": w}, ensure_ascii=False), sch)
    ok = len(r['sections']) == len(EN['sections']) and all(r['ui'].get(k) for k in UIK) and not re.search(r'@\w+\.\w', json.dumps(r))
    if not ok: r = w
    d = dict(r); d['sections'] = [dict(x, href=s['href']) for x, s in zip(r['sections'], EN['sections'])]
    out.write_text(json.dumps(d, ensure_ascii=False, indent=1))
    return l, c1 + c2, 'ok' if ok else 'writer-only'
langs = [x['c'] for x in LANGS if x['c'] not in ('en','fr')]
tot = 0
with ThreadPoolExecutor(8) as ex:
    for l, c, st in ex.map(lambda l: (lambda: one(l))() , langs):
        tot += c; print(l, st, round(c,3), flush=True)
print('COST', round(tot, 3))
