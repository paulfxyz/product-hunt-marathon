# Two new SEO strings for ph.paulfleury.com, 9 native versions (Sonnet 5.5) + independent proofread (Gemini 3.8 Flash).
import json,subprocess,sys
from pathlib import Path
R=Path('/home/user/workspace/ph-social-manager');OUT=Path('/home/user/workspace/pf-ph-site/tools/seo')
src=(R/'scripts/site-i18n-openrouter.py').read_text()
GUIDE=eval(src[src.index('GUIDE = {')+8:src.index('}\nSITE')+1])
SRC={"desc":"Seven free, open-source Product Hunt launches in seven days, 9–15 November, during Web Summit week in Lisbon. Then four free extras, followed by Enki, Openline and Cup of News.",
     "alt":"The Weekathon by Paul Fleury: seven free, open-source launches in seven days, 9–15 November 2026"}
ROLE={"desc":"search-result meta description and social share description; at most ~165 characters in Latin scripts (shorter for zh); every fact kept",
      "alt":"alt text of the social share image; plain and descriptive"}
LANGS=['fr','zh','es','pt','ar','he','hi','bn','id']
PROT="Keep unchanged: Product Hunt, Web Summit, Lisbon may be localised as the city name, Enki, Openline, Cup of News, Paul Fleury, The Weekathon (may be kept in English as a brand). Keep every date and number. The four free extras are separate from Enki, Openline and Cup of News, which come after them: never present those three as the extras."
def call(model,sysmsg,user,schema,effort='low'):
    payload={"model":model,"max_tokens":8000,"reasoning":{"effort":effort},"response_format":{"type":"json_schema","json_schema":{"name":"o","strict":True,"schema":schema}},"messages":[{"role":"system","content":sysmsg},{"role":"user","content":user}]}
    o=subprocess.run(["curl","-sS","--max-time","300","https://openrouter.ai/api/v1/chat/completions","-H","Content-Type: application/json","--data-binary","@-"],input=json.dumps(payload),capture_output=True,text=True)
    b=json.loads(o.stdout)
    if 'choices' not in b: raise SystemExit(o.stdout[:600])
    return json.loads(b['choices'][0]['message']['content']),b.get('usage',{}).get('cost')
item={"type":"object","additionalProperties":False,"properties":{"lang":{"type":"string"},"desc":{"type":"string"},"alt":{"type":"string"}},"required":["lang","desc","alt"]}
if sys.argv[1]=='write':
    sysmsg=f"""Localise two short SEO strings for ph.paulfleury.com (Paul Fleury's Weekathon campaign site) into each language: not a literal translation but what a native copywriter would write, same meaning and every detail.
Slots: {json.dumps(ROLE)}
{PROT}
Language rules: {json.dumps(GUIDE,ensure_ascii=False)}"""
    raw,cost=call("anthropic/claude-sonnet-5.5",sysmsg,"English source: "+json.dumps(SRC,ensure_ascii=False)+"\nReturn one entry per language: "+", ".join(LANGS),{"type":"object","additionalProperties":False,"properties":{"langs":{"type":"array","items":item}},"required":["langs"]})
    r={x['lang']:{'desc':x['desc'],'alt':x['alt']} for x in raw['langs']};assert sorted(r)==sorted(LANGS)
    (OUT/'seo-write.json').write_text(json.dumps({'en':SRC,**r,'cost':cost},ensure_ascii=False,indent=1));print('cost',cost)
if sys.argv[1]=='review':
    w=json.loads((OUT/'seo-write.json').read_text());res={};tot=0
    sch={"type":"object","additionalProperties":False,"properties":{"desc":{"type":"string"},"alt":{"type":"string"},"changed":{"type":"boolean"},"note":{"type":"string"}},"required":["desc","alt","changed","note"]}
    for l in LANGS:
        sysmsg=f"You are an exacting native {l} editor, independent of the writer. Check both drafts against the English source: meaning and every fact kept (dates, counts, names), nothing added, grammar, typography, register, natural native quality. Rewrite anything that sounds translated. {PROT} The description must stay concise for search results. Return final text; changed=true plus a short English note if you changed anything.\n{GUIDE[l]}"
        r,c=call("google/gemini-3.8-flash",sysmsg,json.dumps({"en":w['en'],"draft":w[l]},ensure_ascii=False),sch,effort='medium')
        res[l]=r;tot+=c or 0
    res['cost']=tot;(OUT/'seo-review.json').write_text(json.dumps(res,ensure_ascii=False,indent=1));print('cost',tot)
    for l in LANGS:print(l,res[l]['changed'],res[l]['note'][:160],'|',len(res[l]['desc']),res[l]['desc'])
