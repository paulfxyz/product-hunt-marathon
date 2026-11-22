const fs=require('fs'),cp=require('child_process');
const dir='/tmp/simpleph/tr',en=JSON.parse(fs.readFileSync('/tmp/simpleph/en.json'));
const L={fr:'French (France)',zh:'Simplified Chinese (Mainland)',es:'Spanish (neutral international)',pt:'European Portuguese (Portugal, not Brazilian)',ar:'Modern Standard Arabic',he:'Modern Hebrew',hi:'Hindi (Devanagari)',bn:'Bengali (Bangla)',id:'Indonesian (Bahasa Indonesia)'};
function call(name,system,input){
  const out=`${dir}/${name}.res.json`;
  if(!fs.existsSync(out)){
    const req=`${dir}/${name}.req.json`;
    fs.writeFileSync(req,JSON.stringify({model:'google/gemini-3.8-flash',reasoning:{effort:'low'},max_tokens:8000,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}]}));
    const r=cp.spawnSync('curl',['--fail-with-body','-sS','--max-time','300','https://openrouter.ai/api/v1/chat/completions','-H','Content-Type: application/json','--data-binary','@'+req,'-o',out],{encoding:'utf8'});
    if(r.status){fs.renameSync(out,out+'.err');throw Error(name+' '+r.stderr)}
  }
  const r=JSON.parse(fs.readFileSync(out));if(r.choices?.[0]?.finish_reason!=='stop')throw Error('incomplete '+name);
  return {data:JSON.parse(r.choices[0].message.content.replace(/^```json\s*|```\s*$/g,'')),usage:r.usage};
}
const keep='Keep these names exactly as written in Latin script (do not translate or transliterate): Paul Fleury, Weekathon, Product Hunt, Web Summit, Enki, Cup of News, Openline, X, LinkedIn. Keep all dates and numbers with the same meaning; write dates in the natural native format.';
const shape='Return JSON with exactly the same keys and structure as the input (same number of sections, same key names). Translate every value.';
const lang=process.argv[2];const name=L[lang];
const t=call(lang+'-1',`You are a native ${name} writer specialising in plain-language (easy-read) web copy. Translate this short page about a product-launch week into natural, idiomatic ${name}. It is read aloud as audio too, so sentences must be short, warm, clear and easy to speak. Do not add or remove facts; keep every detail and nuance. "Plain language · 1 minute" is a small tag. "Listen to this page", "Pause", "Language" are UI labels: keep them short. ${keep} ${shape}`,en);
const p=call(lang+'-2',`You are a senior native ${name} editor. You receive an English source and a ${name} draft. Proofread and rewrite the draft so it reads as if originally written by a native speaker in plain, warm, easy-to-read ${name}, suitable for being read aloud. Fix grammar, unnatural phrasing, literal calques, register and punctuation (use correct native punctuation). Check against the source that NO fact, date, number or nuance was lost, changed or added. ${keep} Return JSON {"final": <same structure as the draft>, "changes": [short list of what you changed and why]}.`,{source:en,draft:t.data});
const f=p.data.final;for(const k of Object.keys(f))if(!(k in en))delete f[k];
// structural checks
const ks=o=>JSON.stringify(Object.keys(o).sort());
if(ks(f)!==ks(en)||f.sections.length!==en.sections.length||f.sections.some(s=>!s.heading||!s.text))throw Error('shape '+lang);
const all=JSON.stringify(f);for(const n of ['Weekathon','Product Hunt','Web Summit','Enki','Cup of News','Openline','LinkedIn'])if(!all.includes(n))throw Error(lang+' missing name '+n);
for(const n of ['9','15','16','18','24','27','12','2026'])if(!all.includes(n)&&!/[०-९০-৯٠-٩]/.test(all))console.warn(lang,'number?',n);
fs.writeFileSync(`/tmp/simpleph/${lang}.json`,JSON.stringify(f,null,1));
console.log(lang,'ok',t.usage.cost??'',p.usage.cost??'',p.data.changes?.length);
