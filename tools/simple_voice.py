#!/usr/bin/env python3
"""Record the /simple narration (English or French) with the same voice as paulfleury.com/simple.
Run: pplx credentials run custom-cred:...@openrouter.ai -- python3 tools/simple_voice.py [en|fr]"""
import json, os, subprocess, sys, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
LANG = (sys.argv[1:] or ['en'])[0]
d = json.loads((ROOT / ('src/simple.json' if LANG == 'en' else f'src/simple.{LANG}.json')).read_text())
script = '\n\n'.join([d['title'], d['lead']] + [x for s in d['sections'] for x in (s['heading'], s['text'])])
instr = ("Read this locked script verbatim in native English, as ONE CONTINUOUS TAKE by one friendly adult male speaker. Sound warm, kind, calm, assured and reassuring, like a knowledgeable person explaining something to a friend. "
 "Avoid solemn documentary delivery, dramatic performance, salesmanship and a robotic list. Maintain the SAME voice identity, timbre, accent, microphone distance, recording character, loudness and comfortable unhurried average pace from the first word through the final word. "
 "Use modest natural sentence intonation and brief paragraph pauses. Read headings as gentle transitions, then every paragraph exactly. Do not translate, paraphrase, omit, repeat, add commentary or speak these instructions. No music or sound effects. "
 "Say abbreviations and numbers naturally: TPHM is spelled T-P-H-M, OS is O-S, CHO is C-H-O, SaaS is said 'sass', VPN is V-P-N, MIT is M-I-T, eSIMs is 'ee-sims'. Finish the complete final sentence and final word, then leave one second of quiet. Never cut off or fade out while still speaking. "
 "Keep Product Hunt, Openline, Junk, Mang, Megamesh, Mars, Timescreen, Tetris, Iris and Digital Spot in their usual English pronunciation.")
instr_fr = ("Lis ce texte verrouillé mot pour mot, en français natif de France, en UNE SEULE PRISE CONTINUE, par un seul homme adulte à la voix amicale. Ton chaleureux, bienveillant, calme, assuré et rassurant, comme quelqu’un qui explique quelque chose à un ami. "
 "Évite le ton solennel de documentaire, le jeu dramatique, le ton commercial et la lecture robotique de liste. Garde la MÊME voix, le même timbre, l’accent, la distance au micro, le volume et un débit posé et régulier du premier au dernier mot. "
 "Intonation naturelle et courtes pauses entre les paragraphes. Lis les titres comme des transitions douces, puis chaque paragraphe exactement. Ne traduis pas, ne reformule pas, n’omets rien, ne répète rien, n’ajoute aucun commentaire et ne lis pas ces instructions. Pas de musique ni d’effets sonores. "
 "Prononce naturellement : TPHM s’épelle T-P-H-M, OS se dit O-S, CHO se dit C-H-O, SaaS se dit « sasse », VPN se dit V-P-N, MIT se dit M-I-T, IA se dit I-A, eSIM se dit « i-sim ». Les nombres en français. Termine la dernière phrase et le dernier mot en entier, puis laisse une seconde de silence. "
 "Garde Product Hunt, Openline, Junk, Mang, Megamesh, Mars, Timescreen, Tetris, Iris, Digital Spot et Chief Hacking Officer avec leur prononciation anglaise habituelle.")
if LANG == 'fr': instr = instr_fr
body = json.dumps({'model': 'google/gemini-3.8-flash-tts', 'voice': 'Achird', 'input': script, 'instructions': instr, 'response_format': 'pcm'}).encode()
Path('/tmp/simple-req.json').write_bytes(body)
subprocess.run(['curl', '--fail-with-body', '-s', '--max-time', '900', 'https://openrouter.ai/api/v1/audio/speech', '-H', 'Content-Type: application/json',
                '-H', 'Authorization: Bearer ' + os.environ.get('OPENROUTER_API_KEY', ''), '--data-binary', '@/tmp/simple-req.json', '-o', f'/tmp/simple-{LANG}.pcm'], check=True)
out = ROOT / f'simple/voice-{LANG}.mp3'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', f'/tmp/simple-{LANG}.pcm', '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ac', '1', '-b:a', '64k', str(out)], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout.strip(), 's')
