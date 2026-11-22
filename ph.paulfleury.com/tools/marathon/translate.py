import json,re,subprocess,sys
from pathlib import Path
sys.path.insert(0,'/home/user/workspace/pf-ph-site/tools/marathon')
from missing import load,keys,S
OUT=Path('/home/user/workspace/ph-social-manager/runtime/marathon-i18n');OUT.mkdir(parents=True,exist_ok=True)
s,i,j,D=load(); L=[k for k in D if k!='en']
K=keys(s); K['the Marathon has started']='js'
miss=[k for k in K if k not in D['fr']]
trivial=lambda k: not re.search(r'[A-Za-zÀ-ÿ]{3,}',k) or k in('Megamesh','AI Credit Checker','Timescreen','Mars','Enki','Iris','Digital.spot','Venture','X','Reviews Hub','THINK','BUILD','SHIP','REPEAT')
todo=[k for k in miss if not trivial(k)]
for k in miss:
    if trivial(k) and k not in todo:
        for l in L: D[l][k]=k
        D['en'][k]=k
print('to translate',len(todo))
def call(model,sysmsg,user,schema,effort='low',max_tokens=32000):
    payload={"model":model,"max_tokens":max_tokens,"reasoning":{"effort":effort},"response_format":{"type":"json_schema","json_schema":{"name":"o","strict":True,"schema":schema}},"messages":[{"role":"system","content":sysmsg},{"role":"user","content":user}]}
    err=''
    for _ in range(3):
        o=subprocess.run(["curl","-sS","--max-time","600","https://openrouter.ai/api/v1/chat/completions","-H","Content-Type: application/json","--data-binary","@-"],input=json.dumps(payload),capture_output=True,text=True)
        try: b=json.loads(o.stdout);return json.loads(b['choices'][0]['message']['content']),b.get('usage',{}).get('cost') or 0
        except Exception: err=(o.stdout or o.stderr)[:300]
    raise RuntimeError(err)
props={l:{"type":"string"} for l in L}
schema={"type":"object","additionalProperties":False,"properties":{"items":{"type":"array","items":{"type":"object","additionalProperties":False,"properties":{"en":{"type":"string"},**props},"required":["en"]+L}}},"required":["items"]}
refkeys=['DAY 7 · Megamesh','Fri · Day 4','Day 7','Follow the sprint','7 Launches','Beyond','Bonus','Add to your calendar']
refs={l:{k:D[l].get(k) for k in refkeys if D[l].get(k)} for l in L}
SYS=("You are a senior localisation editor for Paul Fleury's Product Hunt Marathon website (ph.paulfleury.com): 11 free open-source Product Hunt launches in 11 days (10-20 Nov 2026), plus five ventures (Enki non-profit, Openline, Iris, Digital.spot, Cup of News) and a recap report on Mon 23 Nov. "
"Translate each English string into: "+", ".join(L)+" (zh = Simplified Chinese, pt = European Portuguese, hi/bn = natural modern usage). Then proofread and rewrite your own translation so it reads as native, idiomatic copy, not literal. Keep meaning and every detail; keep numbers, dates and symbols (↗ ↓ · §). "
"Keep product and brand names untranslated (Product Hunt, Enki, Openline, Iris, Digital.spot, Cup of News, Web Summit, Lisbon names as usual, LinkedIn, X, GitHub, VCs may be spelled out naturally). 'Marathon' = the event name, translate naturally as the word for a marathon event. Uppercase source strings stay uppercase where the script has case. Reuse the terminology and date format of these existing translations per language: "+json.dumps(refs,ensure_ascii=False))
REV=("You are a native-speaker reviewer for each target language. Review the website translations against the English. Fix mistranslations, literal phrasing, lost detail, untranslated or mixed-language text, wrong script or direction issues. Return the final corrected strings for every item and language (unchanged if already good).")
allw={}
B=22
for n in range(0,len(todo),B):
    chunk=todo[n:n+B]
    items=[{"en":k} for k in chunk]
    w,c1=call('anthropic/claude-sonnet-5.5',SYS,json.dumps(items,ensure_ascii=False),schema)
    r,c2=call('google/gemini-3.8-flash',REV,json.dumps({"source":chunk,"translations":w['items']},ensure_ascii=False),schema)
    got={it['en']:it for it in r['items']}
    for k in chunk:
        it=got.get(k) or next((x for x in r['items'] if x['en'].strip()==k.strip()),None)
        if not it: print('MISSING',k[:60]); continue
        allw[k]=it
    print('batch',n,round(c1+c2,3),flush=True)
(OUT/'reviewed.json').write_text(json.dumps(allw,ensure_ascii=False,indent=1))
for k,it in allw.items():
    D['en'][k]=k
    for l in L: D[l][k]=it[l].replace('\\xa0','\xa0')
bad=[k for k in todo if k not in allw]; print('missing',bad)
s=s[:i]+json.dumps(D,ensure_ascii=False,separators=(',',':'))+s[j:]
(S/'index.html').write_text(s,encoding='utf-8'); print('dictionary written')
