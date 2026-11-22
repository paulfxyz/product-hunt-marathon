#!/usr/bin/env python3
"""Record the /simple narration (English) with the same voice as paulfleury.com/simple.
Run: pplx credentials run custom-cred:...@openrouter.ai -- python3 tools/simple_voice.py"""
import json, os, subprocess, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
d = json.loads((ROOT / 'src/simple.json').read_text())
script = '\n\n'.join([d['title'], d['lead']] + [x for s in d['sections'] for x in (s['heading'], s['text'])])
instr = ("Read this locked script verbatim in native English, as ONE CONTINUOUS TAKE by one friendly adult male speaker. Sound warm, kind, calm, assured and reassuring, like a knowledgeable person explaining something to a friend. "
 "Avoid solemn documentary delivery, dramatic performance, salesmanship and a robotic list. Maintain the SAME voice identity, timbre, accent, microphone distance, recording character, loudness and comfortable unhurried average pace from the first word through the final word. "
 "Use modest natural sentence intonation and brief paragraph pauses. Read headings as gentle transitions, then every paragraph exactly. Do not translate, paraphrase, omit, repeat, add commentary or speak these instructions. No music or sound effects. "
 "Say abbreviations and numbers naturally: TPHM is spelled T-P-H-M, OS is O-S, CHO is C-H-O, SaaS is said 'sass', VPN is V-P-N, MIT is M-I-T, eSIMs is 'ee-sims'. Finish the complete final sentence and final word, then leave one second of quiet. Never cut off or fade out while still speaking. "
 "Keep Product Hunt, Openline, Junk, Mang, Megamesh, Mars, Timescreen, Tetris, Iris and Digital Spot in their usual English pronunciation.")
body = json.dumps({'model': 'google/gemini-3.8-flash-tts', 'voice': 'Achird', 'input': script, 'instructions': instr, 'response_format': 'pcm'}).encode()
Path('/tmp/simple-req.json').write_bytes(body)
subprocess.run(['curl', '--fail-with-body', '-s', '--max-time', '900', 'https://openrouter.ai/api/v1/audio/speech', '-H', 'Content-Type: application/json',
                '-H', 'Authorization: Bearer ' + os.environ.get('OPENROUTER_API_KEY', ''), '--data-binary', '@/tmp/simple-req.json', '-o', '/tmp/simple-en.pcm'], check=True)
out = ROOT / 'simple/voice-en.mp3'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', '/tmp/simple-en.pcm', '-af', 'loudnorm=I=-18:TP=-2:LRA=11', '-ac', '1', '-b:a', '64k', str(out)], check=True)
print(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout.strip(), 's')
