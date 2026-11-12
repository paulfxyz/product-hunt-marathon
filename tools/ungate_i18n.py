import json,re,subprocess,sys
from pathlib import Path
OUT=Path('/home/user/workspace/ph-social-manager/runtime/ungate')
s=open('/tmp/ungate_stage2.html',encoding='utf-8').read()
i=s.find('window.PH_TRANSLATIONS=')+len('window.PH_TRANSLATIONS=');j=s.find(';</script>',i)
D=json.loads(s[i:j]); L=[k for k in D if k!='en']
NEW={ # new string -> old string it replaces (for terminology), or None
"Explore the full line-up below. All seven are free and open source, with their code on GitHub.":"Explore the projects as they launch, or preview the full line-up now. Sharing your email is optional. All seven are free and open source, with their code on GitHub.",
"serious proposal":"serious proposal · Nov 24","main startup":"main startup · Dec 1","side commercial project":"side commercial project · Dec 15",
"COMING SOON":None,"Coming soon":None,"Later":None,"Freemium":"Tue 15 Dec · Freemium",
"The full pipeline · 2026":"The full pipeline · October–December 2026",
"Seven free, open-source launches, 10–16 November, during Web Summit week in Lisbon (9–12 November). Then four free extras on 17, 18, 19 and 22 November, followed by a serious proposal with the non-profit Enki, my main startup Openline and, later, a side commercial project, the freemium Cup of News.":"Seven free, open-source launches, 10–16 November, during Web Summit week in Lisbon (9–12 November). Then four free extras on 17, 18, 19 and 22 November, a serious proposal with the non-profit Enki on 24 November, my main startup on 1 December and, later, a side commercial project, the freemium Cup of News, on 15 December.",
"Eleven Product Hunt launches, all at 16:00 Lisbon time: 10–19 Nov and 22 Nov. Enki, Openline and Cup of News follow later.":"Fourteen Product Hunt launches, all at 16:00 Lisbon time: 10–19 Nov, 22 Nov, 24 Nov, 1 Dec and 15 Dec.",
"Eleven launch reminders plus Web Summit Lisbon, shown in your local time. This is a read-only feed, not access to my personal calendar.":"Fourteen launch reminders plus Web Summit Lisbon, shown in your local time. Neutral titles keep the unrevealed projects private. This is a read-only feed, not access to my personal calendar.",
"Junk canonical mark and the Weekathon laptop kitty":None,
}
ctx={"COMING SOON":"Small uppercase eyebrow in the top navigation above 'A serious proposal' / 'My main startup' / 'A side commercial project'; no date announced yet.",
"Coming soon":"Label where a launch date used to be (chapter header and calendar row).","Later":"Small line above 'Coming soon' in a calendar row (the launch is after the dated ones).",
"Freemium":"Badge on the Cup of News card.","serious proposal":"Hero counter: '+ 1 serious proposal'","main startup":"Hero counter: '+ 1 main startup'","side commercial project":"Hero counter: '+ 1 side commercial project'",
"Junk canonical mark and the Weekathon laptop kitty":"Image alt text."}
items=[]
for k,o in NEW.items():
    ref={l:D[l].get(o) for l in L} if o else {}
    items.append({"en":k,"context":ctx.get(k,''),"replaces_en":o,"existing_translations_of_replaced":ref})
sys.path.insert(0,'/home/user/workspace/ph-social-manager/scripts')
def call(model,sysmsg,user,schema,effort='low',max_tokens=16000):
    payload={"model":model,"max_tokens":max_tokens,"reasoning":{"effort":effort},
      "response_format":{"type":"json_schema","json_schema":{"name":"o","strict":True,"schema":schema}},
      "messages":[{"role":"system","content":sysmsg},{"role":"user","content":user}]}
    for _ in range(3):
        o=subprocess.run(["curl","-sS","--max-time","600","https://openrouter.ai/api/v1/chat/completions","-H","Content-Type: application/json","--data-binary","@-"],input=json.dumps(payload),capture_output=True,text=True)
        try: b=json.loads(o.stdout);return json.loads(b['choices'][0]['message']['content']),b.get('usage',{}).get('cost') or 0
        except Exception: err=(o.stdout or o.stderr)[:300]
    raise RuntimeError(err)
props={l:{"type":"string"} for l in L}
schema={"type":"object","additionalProperties":False,"properties":{"items":{"type":"array","items":{"type":"object","additionalProperties":False,"properties":{"en":{"type":"string"},**props},"required":["en",*L]}}},"required":["items"]}
SYS=("You are a senior localisation editor for Paul Fleury's Weekathon website (ph.paulfleury.com). Translate each English UI string into: "+", ".join(L)+" (zh = Simplified Chinese, pt = European Portuguese). "
"Then proofread and rewrite your own translation so it reads as native, idiomatic copy, not a literal translation. Keep the meaning and every detail; do not add dates that are not in the English. "
"Where an existing translation of the replaced string is given, reuse its terminology, tone and date formatting so the page stays consistent. Keep product names (Enki, Openline, Cup of News, Web Summit, Product Hunt, GitHub) untranslated. Keep uppercase strings uppercase where the script has case. Return every item with the exact 'en' value.")
w,c1=call('anthropic/claude-sonnet-5.5',SYS,json.dumps(items,ensure_ascii=False),schema)
(OUT/'writer.json').write_text(json.dumps(w,ensure_ascii=False,indent=1))
REV=("You are a native-speaker reviewer for each target language. Review these website UI translations against the English and the reference translations of the replaced strings. Fix any mistranslation, unnatural phrasing, inconsistency with the reference terminology, lost detail, added detail, or invented date. Return the full corrected set (unchanged values if already good).")
r,c2=call('google/gemini-3.8-flash',REV,json.dumps({"source":items,"translations":w['items']},ensure_ascii=False),schema)
(OUT/'reviewed.json').write_text(json.dumps(r,ensure_ascii=False,indent=1))
print('cost',c1,c2)
for it in r['items']: print(it['en'][:50],'|',it['fr'][:70],'|',it['ar'][:40])
