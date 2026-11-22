import re
from pathlib import Path
p=Path('/home/user/workspace/pf-ph-site/index.html'); s=p.read_text(encoding='utf-8')
def rep(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: raise SystemExit(f'expected {n} got {c}: {a[:90]!r}')
    s=s.replace(a,b)
# --- Digital Spot rename (display name only; domain stays lowercase)
s=s.replace('Digital.spot','Digital Spot')
# --- Digital Spot facts (digital.spot meta, 13 Nov)
rep('<span>Online presence · Physical businesses</span>','<span>Social media on autopilot · Human review</span>') if '<span>Online presence · Physical businesses</span>' in s else None
for a,b in [
 ('Online presence · Physical businesses','Social media on autopilot · Human review'),
 ('Hands-off digital presence for physical businesses.','Social media on autopilot, four weeks ahead.'),
 ('For restaurants, cafés, shops, salons and other local businesses: publish to social platforms, monitor and reply to reviews, and get a weekly report, with one flat price and unlimited usage.','Digital Spot writes up to one idea a day for every channel, always four weeks ahead and in your voice. Magic proofreads each draft, you verify, and only verified posts publish. 100% bring your own AI key.'),
 ('Social Studio, 30+ platforms','One idea a day, every channel'),('Reviews Hub','Magic proofreads each draft'),('Weekly Reports','Only verified posts publish'),
 ('14-day free trial.','Waitlist open.'),('No credit card required.','First 200 members get priority, $59 a month.'),
 ('Presence platform · investors','Social media autopilot · investors'),('Venture · Presence platform','Venture · Social media autopilot'),
]:
    if a in s: s=s.replace(a,b)
# --- icons
rep('<div class="venture-brand"><span>Iris</span></div>','<div class="venture-brand"><img alt="Iris logo" class="venture-icon" height="52" src="assets/brand/iris.webp" width="52"/><span>Iris</span></div>')
rep('<div class="venture-brand"><span>Digital Spot</span></div>','<div class="venture-brand"><img alt="Digital Spot logo" class="venture-icon" height="52" src="assets/brand/digital-spot.png" width="52"/><span>Digital Spot</span></div>')
if '.venture-icon{' not in s:
    rep('</head>','<style>.venture-icon{width:52px;height:52px;border-radius:12px;object-fit:cover;flex:none}</style>\n</head>')
# --- report entry: second row, 12th grid cell
m=re.search(r'<div class="pl-report">(<div class="pl-stop t-report".*?</div>)</div>\n',s,re.S)
if m:
    stop=m.group(1)
    s=s.replace(m.group(0),'')
    k=s.find('<div class="pl-followups">')
    # close of pl-stops precedes followups: "</div>\n<div class=\"pl-followups\">" -> insert stop before that closing div
    pre=s[:k].rstrip()
    assert pre.endswith('</div>')
    s=pre[:-6]+stop+'</div>\n'+s[k:]
for a,b in [
 ('<div class="pl-name">The full report</div>','<div class="pl-name">Full Report</div>'),
 ('<div class="pl-tag">LinkedIn and X · what the 11 launches brought</div>','<div class="pl-tag">A thorough analysis of what happened during the Marathon.</div>'),
 ('<div class="pl-state">Report · planned</div>','<div class="pl-state">LinkedIn &amp; X · planned</div>'),
 ('</i> The full report</span>','</i> Full Report</span>'),
 ('<strong>The full report</strong>','<strong>Full Report</strong>'),
 ('<div><strong>Mon 23 Nov</strong> the full report</div>','<div><strong>Mon 23 Nov</strong> Full Report</div>'),
]:
    if a in s: s=s.replace(a,b)
    else: print('skip',a[:50])
p.write_text(s,encoding='utf-8'); print('ok')
