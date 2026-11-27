import json, os, subprocess, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path('/home/user/workspace/tphm')
src=(ROOT/'tools/translate_all.py').read_text().split('# ---- glossary')[0]
sys.argv=['x']; __file__=str(ROOT/'tools/translate_all.py'); exec(src)
def instr(l):
    n=name(l)
    return (f"Read this locked script verbatim in native {n}, with a natural native accent, as ONE CONTINUOUS TAKE by one friendly adult male speaker. Sound warm, kind, calm, assured and reassuring, like a knowledgeable person explaining something to a friend. "
 "Avoid solemn documentary delivery, dramatic performance, salesmanship and a robotic list. Keep the SAME voice identity, timbre, accent, microphone distance, recording character, loudness and comfortable unhurried pace from the first word to the final word. "
 "Use modest natural sentence intonation and brief paragraph pauses. Read headings as gentle transitions, then every paragraph exactly. Do not translate, paraphrase, omit, repeat, add commentary or speak these instructions. No music or sound effects. "
 "Read numbers, dates and amounts naturally in this language. Spell acronyms letter by letter as natives would: TPHM, OS, CHO, VPN, MIT, AI where written in Latin letters. SaaS is said 'sass'. "
 "Keep brand names (Product Hunt, Openline, Junk, Mang, Megamesh, Mars, Timescreen, Tetris, Iris, Digital Spot, Chief Hacking Officer) in their usual English pronunciation. Finish the complete final sentence and final word, then leave one second of quiet. Never cut off or fade out while still speaking.")
def one(l):
    out=ROOT/f'simple/voice-{l}.mp3'
    if out.exists(): return l,'exists'
    d=json.loads((ROOT/f'src/simple.{l}.json').read_text())
    script='\n\n'.join([d['title'],d['lead']]+[x for s in d['sections'] for x in (s['heading'],s['text'])])
    body=json.dumps({'model':'google/gemini-3.8-flash-tts','voice':'Achird','input':script,'instructions':instr(l),'response_format':'pcm'})
    rq=f'/tmp/str/req-{l}.json'; Path(rq).write_text(body); pcm=f'/tmp/str/{l}.pcm'
    for a in range(3):
        r=subprocess.run(['curl','--fail-with-body','-s','--max-time','900','https://openrouter.ai/api/v1/audio/speech','-H','Content-Type: application/json','-H','Authorization: Bearer '+os.environ.get('OPENROUTER_API_KEY',''),'--data-binary','@'+rq,'-o',pcm])
        if r.returncode==0 and os.path.getsize(pcm)>200000: break
    else: return l,'FAIL '+open(pcm,errors='ignore').read()[:200]
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar','24000','-ac','1','-i',pcm,'-af','loudnorm=I=-18:TP=-2:LRA=11','-ac','1','-b:a','64k',str(out)],check=True)
    os.remove(pcm); os.remove(rq)
    dur=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(out)],capture_output=True,text=True).stdout.strip()
    return l,dur+' s, '+str(len(script))+' chars'
L=os.environ.get('ONLY','').split(',') if os.environ.get('ONLY') else [x['c'] for x in LANGS if x['c'] not in ('en','fr')]
with ThreadPoolExecutor(5) as ex:
    for l,s in ex.map(one,L): print(l,s,flush=True)
