const fs=require('fs'),cp=require('child_process'),dir='/tmp/simpleph/audio',lang=process.argv[2],stem=dir+'/narration-'+lang;
const source=fs.readFileSync(stem+'-source.txt','utf8'),resp=stem+'-asr.json';
if(!fs.existsSync(resp)){
 const payload={model:'google/gemini-3.8-flash',temperature:0,reasoning:{effort:'low'},response_format:{type:'json_object'},max_tokens:8000,messages:[
 {role:'system',content:'Listen to the ENTIRE attached recording. Transcribe it faithfully in its original language. Never translate, reconstruct or invent. Return JSON {audio_received:boolean,transcript:string,cutoff:boolean,male_sounding:boolean,voice_consistent:boolean,issues:[short strings: dropped/repeated words, mispronounced names, noise, abrupt voice change]}.'},
 {role:'user',content:[{type:'input_audio',input_audio:{data:fs.readFileSync(stem+'.mp3').toString('base64'),format:'mp3'}},{type:'text',text:'Transcribe this '+lang+' narration exactly as heard and report issues.'}]}]};
 fs.writeFileSync(stem+'-asr-req.json',JSON.stringify(payload));
 const r=cp.spawnSync('curl',['--fail-with-body','-sS','--max-time','300','https://openrouter.ai/api/v1/chat/completions','-H','Content-Type: application/json','--data-binary','@'+stem+'-asr-req.json','-o',resp],{encoding:'utf8'});
 if(r.status){fs.renameSync(resp,resp+'.err');throw Error(r.stderr)}
}
const r=JSON.parse(fs.readFileSync(resp));const c=JSON.parse(r.choices[0].message.content.replace(/^```json\s*|```\s*$/g,''));
const norm=s=>s.normalize('NFKC').toLowerCase().replace(/èn-ki/g,'enki').replace(/[^\p{L}\p{N}]/gu,'');
const a=[...norm(source.replace(/Èn-ki/g,'Enki'))],b=[...norm(c.transcript)];
let dp=new Uint32Array(b.length+1);for(const ch of a){let prev=0;for(let j=1;j<=b.length;j++){const s=dp[j];dp[j]=ch===b[j-1]?prev+1:Math.max(dp[j],dp[j-1]);prev=s}}
console.log(JSON.stringify({lang,coverage:+(dp[b.length]/a.length).toFixed(3),cutoff:c.cutoff,male:c.male_sounding,consistent:c.voice_consistent,issues:c.issues}));
