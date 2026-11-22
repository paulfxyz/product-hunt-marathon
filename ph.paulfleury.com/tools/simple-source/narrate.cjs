const fs = require('fs'), cp = require('child_process'), path = require('path');
const dir='/tmp/simpleph/audio';
fs.mkdirSync(dir, {recursive:true});
const lang = process.argv[2], sample = process.argv.includes('--sample');
const names = {en:'English',fr:'French from France',zh:'Mandarin Chinese',hi:'Hindi',es:'Spanish',ar:'Arabic',bn:'Bengali',pt:'European Portuguese',ru:'Russian',ur:'Urdu',id:'Indonesian',de:'German',ja:'Japanese',ko:'Korean',vi:'Vietnamese',tr:'Turkish',it:'Italian',pl:'Polish',nl:'Dutch',he:'Hebrew'};
if (!names[lang]) throw Error('Unknown locale');
const d = JSON.parse(fs.readFileSync('/tmp/simpleph/'+lang+'.json','utf8'));
const source = [d.title,d.lead,...d.sections.flatMap(x=>[x.heading,x.text])].join('\n\n');
const phonetic = process.argv.includes('--phonetic');
const repair = process.argv.includes('--repair');
const stem = dir + '/' + (sample ? 'sample-' : 'narration-') + lang + (phonetic ? '-phonetic' : '') + (repair ? '-v2' : '');
if(fs.existsSync(stem+'-source.txt')&&fs.readFileSync(stem+'-source.txt','utf8')!==source)throw Error('Existing take has a different script; inspect before replacing');
if(fs.existsSync(stem+'-response.part')&&!fs.existsSync(stem+'-raw.pcm'))throw Error('An earlier speech request has an uncertain outcome; inspect it before retrying');
fs.writeFileSync(stem+'-source.txt',source);
const instructions = `Read this locked script verbatim in native ${names[lang]}, as ONE CONTINUOUS TAKE by one friendly adult male speaker. Sound warm, kind, calm, assured and reassuring, like a knowledgeable person explaining something to a friend. Avoid solemn documentary delivery, dramatic performance, salesmanship and a robotic list. Maintain the SAME voice identity, timbre, accent, microphone distance, recording character, loudness and comfortable unhurried average pace from the first word through the final word. Never reset into a new announcer voice at a heading or halfway through. Use modest natural sentence intonation and brief paragraph pauses, without changing vocal persona or accelerating later sections. Read headings as gentle transitions, then every paragraph exactly. Do not translate, paraphrase, omit, repeat, add commentary or speak these instructions. No music or sound effects. Say abbreviations and numbers naturally. Finish the complete final sentence and final word, then leave one second of quiet. ` +
  (lang==='fr' ? 'PRONUNCIATION ESSENTIELLE : Enki se prononce /ɛn.ki/, comme les mots français « haine » puis « qui » liés en deux syllabes. Le premier son est un è oral ouvert, suivi du n consonantique, jamais le son nasal « an ». Dans le texte de synthèse, Èn-ki est une aide phonétique pour ce même nom ; ne prononce pas le trait d’union.' : 'The name Enki has two syllables, EN-kee, with an audible n consonant; it is a proper name, not an acronym. Weekathon is one English word, WEEK-a-thon. Keep product names (Product Hunt, Web Summit, Cup of News, Openline, LinkedIn) in their usual English pronunciation.');
const request = {model:'google/gemini-3.8-flash-tts',voice:'Achird',input:lang==='fr'?source.replace(/\bEnki\b/g,phonetic?'Haine-qui':'Èn-ki'):source,instructions:instructions+(phonetic?' Le texte « Haine-qui » doit être lu littéralement avec les sons français de « haine » et « qui », liés naturellement sans pause. Ne corrigez pas cette graphie en un autre nom.':''),response_format:'pcm'};
if(repair){
 request.instructions += ' Carefully finish the entire final sentence and its final word; leave one second of quiet after it. Never cut off or fade out while still speaking.';
 if(lang==='ja')request.input=source.replace(/Context Vault/g,'コンテキスト・ヴォールト').replace(/Enki Institute/g,'エンキ・インスティテュート').replace(/Enki/g,'エンキ');
}
fs.writeFileSync(stem+'-request.json',JSON.stringify(request,null,2));
if (!fs.existsSync(stem+'-raw.pcm')) {
  const r = cp.spawnSync('curl',['--fail-with-body','--silent','--show-error','--max-time','480','https://openrouter.ai/api/v1/audio/speech','-H','Content-Type: application/json','--data-binary','@'+stem+'-request.json','-D',stem+'-headers.txt','-o',stem+'-response.part'],{encoding:'utf8'});
  if (r.status) throw Error('Speech request failed: '+r.stderr+'; inspect '+stem+'-response.part before retrying');
  const headers = fs.readFileSync(stem+'-headers.txt','utf8');
  if (!/content-type:\s*audio\/(pcm|l16)/i.test(headers) || fs.statSync(stem+'-response.part').size < 1000) throw Error('Invalid PCM response; inspect before retrying');
  fs.renameSync(stem+'-response.part',stem+'-raw.pcm');
}
cp.execFileSync('ffmpeg',['-y','-f','s16le','-ar','24000','-ac','1','-i',stem+'-raw.pcm','-af','loudnorm=I=-18:TP=-2:LRA=9','-codec:a','libmp3lame','-b:a','64k',stem+'.mp3'],{stdio:['ignore','ignore','pipe']});
const duration = Number(cp.execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',stem+'.mp3'],{encoding:'utf8'}));
const headers = fs.readFileSync(stem+'-headers.txt','utf8');
const generationId = headers.match(/^x-generation-id:\s*(.+)$/im)?.[1].trim();
const record = {lang,sample,model:request.model,voice:request.voice,sourceCharacters:source.length,duration,bytes:fs.statSync(stem+'.mp3').size,generationId};
fs.writeFileSync(stem+'-record.json',JSON.stringify(record,null,2));
console.log(record);
