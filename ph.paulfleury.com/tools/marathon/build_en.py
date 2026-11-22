# Build the Product Hunt Marathon English page from the committed (pre-marathon) index.html.
import re,subprocess,json,sys
SRC=subprocess.run(['git','show','dd889bc:index.html'],capture_output=True,text=True,check=True).stdout
lines=SRC.split('\n')
big=[i for i,l in enumerate(lines) if len(l)>100000]
print('big lines',big)
SAVED={i:lines[i] for i in big}
for i in big: lines[i]='@@DICT%d@@'%i
s='\n'.join(lines)
PH={'junk':'junk','ase':'ase-2','mang':'mang-sh','hollr':'hollr-2','clippy':'clippy-11','mercury':'mercury-414','megamesh':'megamesh-sh','aicredit':'ai-credit-checker','xnftables':'xnftables','timescreen':'timescreen','mars':'mars-2031'}
def rep(a,b,n=1):
    global s
    c=s.count(a)
    if c!=n: raise SystemExit(f'expected {n} got {c}: {a[:80]!r}')
    s=s.replace(a,b)
def rx(pat,b,flags=re.S):
    global s
    s,c=re.subn(pat,b,s,count=1,flags=flags)
    if c!=1: raise SystemExit('no match '+pat[:80])
# ---------- head ----------
rep('<title>The Weekathon — 7 products in 7 days · Paul Fleury</title>','<title>The Product Hunt Marathon — 11 products in 11 days · Paul Fleury</title>')
OLD_D='Seven free, open-source Product Hunt launches in seven days, 10–16 November, during Web Summit week in Lisbon. Then four free extras, followed by Enki, Openline and Cup of News.'
NEW_D='Eleven free, open-source Product Hunt launches in eleven days, 10–20 November 2026. Plus five ventures from Paul Fleury: Enki, Openline, Iris, Digital.spot and Cup of News.'
s=s.replace(OLD_D,NEW_D)
s=s.replace('The Weekathon — 7 products in 7 days','The Product Hunt Marathon — 11 products in 11 days')
s=s.replace('The Weekathon by Paul Fleury: seven free, open-source launches in seven days, 10–16 November 2026','The Product Hunt Marathon by Paul Fleury: eleven free, open-source launches in eleven days, 10–20 November 2026')
# ---------- nav ----------
rep('<li><a href="#week">7 Launches</a></li>','<li><a href="#week">11 Launches</a></li>')
rep('<li><a href="#bonus">Bonus</a></li>\n','')
rep('<li><a href="#enki">Beyond</a></li>','<li><a href="#ventures">Ventures</a></li>')
# ---------- hero ----------
rep('Kick-off · Tue 10 Nov 2026 ·','The Product Hunt Marathon · 10–20 Nov 2026 ·')
rep('Seven products.<br/>','Eleven products.<br/>'); rep('Seven days.<br/>','Eleven days.<br/>')
rx(r"I'm Paul\. From 10 to 16 November, I’m launching one AI-assisted project a day, all free and open source\..*?improved with your feedback\.",
 "I'm Paul. From 10 to 20 November, I’m launching one AI-assisted project a day on Product Hunt, all free and open source: eleven launches in eleven days, the Product Hunt Marathon. It started in the week builders came to Lisbon for Web Summit, and it is dedicated to Web Summit and to the builders’ mentality. No launch squad. No upvote campaign. Just useful things, shared in the open, then improved with your feedback.")
rep('See the week\n','See the 11 launches\n')
rep('Seven launch days, 100% free and open source. Not seven builds from scratch.','Eleven launch days, 100% free and open source. Not eleven builds from scratch.')
rx(r'<div class="hero-meta">.*?</div>\n</div>\n<div aria-label="Week progress"',
 '<div class="hero-meta">\n<div><strong>11</strong> free, open-source launches · Nov 10–20</div>\n<div><strong>+ 5</strong> ventures: Enki, Openline, Iris, Digital.spot, Cup of News</div>\n<div><strong>Mon 23 Nov</strong> the full report</div>\n</div>\n<div aria-label="Week progress"')
rep('aria-label="Week progress"','aria-label="Marathon progress"')
dots=''.join(f'<span class="p-dot" title="Day {i}"></span>\n' for i in range(1,12))
rx(r'(<span style="margin-right:6px">Progress</span>\n).*?(<span class="p-count")',r'\1'+dots+r'\2')
s=s.replace("0\u00a0/\u00a07 launched on PH","0\u00a0/\u00a011 launched on PH")
rep('<span class="dt"></span>7 launches</span>','<span class="dt"></span>11 launches</span>')
rep('alt="The Weekathon coding kitty"','alt="The Marathon coding kitty"')
# ---------- chapter map + ticker ----------
rx(r'<nav aria-label="The campaign at a glance".*?</nav>',
 '<nav aria-label="The campaign at a glance" class="chapter-map"><div class="wrap">\n'
 '<a href="#week"><small>10–20 NOVEMBER</small><strong>Eleven daily launches</strong><span>100% free and open source</span></a>\n'
 '<a href="#ventures"><small>BEYOND THE MARATHON</small><strong>Five ventures</strong><span>Investors and philanthropists welcome</span></a>\n'
 '<a href="#pipeline"><small>MON 23 NOV</small><strong>The full report</strong><span>What the 11 launches brought</span></a>\n'
 '</div></nav>')
names=['Junk','ASE','Mang','Hollr','Clippy','Mercury','Megamesh','AI Credit Checker','xnftables','Timescreen','Mars']
tick=''.join(f'<span>DAY {i+1} · {n}</span>' for i,n in enumerate(names))+'<span>VENTURE · Enki.ngo</span><span>VENTURE · Openline</span><span>VENTURE · Iris</span><span>VENTURE · Digital.spot</span><span>VENTURE · Cup of News</span>'
rx(r'(<div class="strip-track">\n).*?(\n</div>\n</div>\n<!-- =+ MANIFESTO)',lambda m:m.group(1)+tick+'\n'+tick+m.group(2))
rep('Seven free, open-source launches. One experiment: turn AI work into useful tools people can keep improving.','Eleven free, open-source launches. One experiment: turn AI work into useful tools people can keep improving.')
s=s.replace('SEVEN PRODUCTS · SEVEN DAYS · ONE PERSON','ELEVEN PRODUCTS · ELEVEN DAYS · ONE PERSON')
# ---------- week grid ----------
rep('The 7 launches · Nov 10 → 16, 2026','The 11 launches · Nov 10 → 20, 2026')
rep('Explore the full line-up below. All seven are free and open source, with their code on GitHub.','Explore the full line-up below. All eleven are free and open source, with their code on GitHub.')
rep('The seventh free, open-source ship; read the limits before deploying.','A free, open-source ship; read the limits before deploying.')
# bonus cards -> grid
bonus=re.search(r'<div class="bonus-cards">(.*?)</div></div></section>',s,re.S)
cards=bonus.group(1)
cards=cards.replace('Tue 17 Nov · Encore','Tue · Day 8').replace('Wed 18 Nov · Bonus','Wed · Day 9').replace('Thu 19 Nov · Side quest','Thu · Day 10').replace('Fri 20 Nov · Goodie','Fri · Day 11')
backstory=re.search(r'<div id="bonus-backstory">(.*?)</div></div>',s[bonus.start()-3000:bonus.start()+10],re.S)
bs=re.search(r'<p>(xnftables comes from my cybersecurity work[^<]*)</p><a href="(https://megastack.sh)"',s).groups()
s=s[:s.find('<section id="bonus">')]+s[s.find('</section>',s.find('<section id="bonus">'))+len('</section>'):]
assert 'id="bonus"' not in s
# insert after megamesh card inside grid-week
cta=('<article class="card card-ventures-cta" data-reveal="" data-revealed="1"><div class="card-body">'
 '<span class="eyebrow">Beyond the marathon</span><h3>Five more things I’m building.</h3>'
 '<p class="tagline">Enki, Openline, Iris, Digital.spot and Cup of News. Not part of the 11 launches. Looking for VCs, investors and philanthropists.</p>'
 '<a class="card-link-btn" href="#ventures">Meet the ventures ↓</a></div></article>')
gw_end=s.find('</article>\n</div>\n</div>\n</section>\n<section class="iteration" id="after-launch">')
assert gw_end>0
s=s[:gw_end]+'</article>\n'+cards+cta+s[gw_end+len('</article>'):]
note=f'<p class="week-draft-note">{bs[0]} <a href="{bs[1]}" rel="noopener noreferrer" target="_blank">megastack.sh ↗</a></p>'
rep('<div class="grid" id="grid-week">',note+'\n<div class="grid" id="grid-week">')
# PH buttons per card
for k,slug in PH.items():
    m=re.search(r'(<article class="card" data-key="%s".*?)(</div>\s*</article>)'%k,s,re.S)
    assert m,k
    btn=f'<a class="card-link-btn card-ph-btn" href="https://www.producthunt.com/products/{slug}" rel="noopener noreferrer" target="_blank">View on Product Hunt ↗</a>\n'
    s=s[:m.end(1)]+btn+s[m.end(1):]
# web summit past tense
rep('Web Summit Lisbon · 9–12 November','Web Summit Lisbon · 9–12 November (done)') if False else None
rep('<h2 id="web-summit-title"><span>Let’s meet</span> <span class="meetup-accent">at Web Summit.</span></h2>','<h2 id="web-summit-title"><span>Thanks,</span> <span class="meetup-accent">Web Summit.</span></h2>')
rx(r'<p class="meetup-lead">.*?</p>','<p class="meetup-lead">Web Summit Lisbon ran from 9 to 12 November. I was there as a VIP attendee, on my own: no booth, just conversations, while the Marathon began. Thank you to everyone I met. I live in Lisbon, so we can still meet informally around the city.</p>')
rx(r'<p class="meetup-why">.*?</p>','<p class="meetup-why">Enki needs more talent, reach and resources than any one founder can bring: I’ll help in year one, then step away. And I’m raising funds for Openline, my main startup, to reshape the eSIM market with a deep pipeline of ideas ready to execute, so investors are welcome to talk about that too.</p>')
rep('<p class="meetup-schedule">Opening night Monday 9, conference Tuesday 10 to Thursday 12</p>','<p class="meetup-schedule">Opening night Monday 9, conference Tuesday 10 to Thursday 12</p>')
rep('<p class="meetup-label">I’d love to meet</p>','<p class="meetup-label">I’d love to talk with</p>')
# ---------- ventures ----------
rx(r'<section class="venture-section venture-public-good" id="enki">',
 '<section class="ventures-intro" id="ventures"><div class="wrap"><span class="eyebrow">Beyond the marathon</span><h2 class="section-title">Five ventures. <em>One person.</em></h2>'
 '<p class="section-sub">Not part of the 11 launches, and not dated. I’m looking for VCs and investors for Openline, Iris and Digital.spot, and for philanthropists for Enki.</p>'
 '<ul class="ventures-list"><li><a href="#enki"><strong>Enki</strong><span>Non-profit · philanthropists</span></a></li><li><a href="#openline"><strong>Openline</strong><span>Main startup · VCs and investors</span></a></li><li><a href="#iris"><strong>Iris</strong><span>Customer inbox · investors</span></a></li><li><a href="#digital-spot"><strong>Digital.spot</strong><span>Presence platform · investors</span></a></li><li><a href="#cupofnews"><strong>Cup of News</strong><span>AI morning digest · contributors</span></a></li></ul>'
 '<div class="meetup-cta"><a class="btn btn-primary" href="https://x.com/paulfxyz" rel="noopener" target="_blank">DM me on X</a><a class="btn btn-ghost" href="https://paulfleury.com/contact" rel="noopener" target="_blank">Contact me</a></div></div></section>\n<section class="venture-section venture-public-good" id="enki">')
rep('<span>A serious proposal · Non-profit, public good</span><span>Coming soon</span>','<span>Venture · Non-profit, public good</span><span>Looking for philanthropists</span>')
rep('<span>After the experiment · My main startup</span><span>Coming soon</span>','<span>Venture · My main startup</span><span>Looking for VCs and investors</span>')
rep('<span>A side commercial project · Semi open source</span><span>Coming soon</span>','<span>Venture · Semi open source</span><span>Open to contributors</span>')
def venture(i,label,ask,brand,kicker,h2,lead,asides,cta,url,foot):
    li=''.join(f'<div class="journey-step"><div><h3>{a}</h3></div></div>' for a in asides)
    return (f'<section class="venture-section venture-business" id="{i}">\n<div class="wrap">\n<div class="venture-chapter"><span>{label}</span><span>{ask}</span></div>\n'
     f'<div class="venture-shell" data-venture="{i}">\n<div class="venture-content" data-revealed="1"><div class="venture-grid">\n<div class="venture-main">\n'
     f'<div class="venture-brand"><span>{brand}</span></div>\n<p class="venture-kicker">{kicker}</p>\n<h2>{h2}</h2>\n<p class="venture-lead">{lead}</p>\n'
     f'<a class="venture-cta" href="{url}" rel="noopener noreferrer" target="_blank">{cta} <span aria-hidden="true">↗</span></a>\n</div>\n'
     f'<div class="venture-aside">\n<p class="venture-aside-title">What it does</p>\n{li}\n</div>\n</div>\n<div class="venture-footer"><span>{foot[0]}</span><span>{foot[1]}</span></div></div>\n</div>\n</div>\n</section>\n')
iris=venture('iris','Venture · Customer messaging','Looking for investors','Iris','Customer inbox · Bring your own AI key','One inbox. Every channel.<br/>You press Send.',
 'Customer messages from 19 channels, including WhatsApp, Instagram, X, email, reviews and tickets, in one inbox. Magic drafts each reply in your customer’s language with your own AI key, and nothing is sent until you approve it.',
 ['19 channels, one inbox','AI-drafted replies you approve','Your own AI key, no markup'],'Discover Iris','https://iris.online',('Pay your AI provider directly.','$59 a month, waitlist open.'))
dspot=venture('digital-spot','Venture · Presence platform','Looking for investors','Digital.spot','Online presence · Physical businesses','Hands-off digital presence for physical businesses.',
 'For restaurants, cafés, shops, salons and other local businesses: publish to social platforms, monitor and reply to reviews, and get a weekly report, with one flat price and unlimited usage.',
 ['Social Studio, 30+ platforms','Reviews Hub','Weekly Reports'],'Discover Digital.spot','https://digital.spot',('14-day free trial.','No credit card required.'))
rep('<!-- CUP OF NEWS FREEMIUM START -->',iris+dspot+'<!-- CUP OF NEWS FREEMIUM START -->')
# ---------- pipeline ----------
rx(r'(<span class="eyebrow" data-reveal="">)The full pipeline · 2026','\\1The full calendar · 2026') if False else None
rep('The full pipeline · 2026','The full calendar · 2026')
rx(r'<p class="section-sub" data-delay="2" data-reveal="">Seven free, open-source launches, 10–16 November.*?</p>','<p class="section-sub" data-delay="2" data-reveal="">Eleven free, open-source Product Hunt launches, one a day, 10–20 November at 16:00 Lisbon time. On Monday 23 November I publish the full report on LinkedIn and X: all 11 launches, and what they brought. Five ventures follow, undated.</p>')
rx(r'<div class="pl-legend".*?</div>\n<!-- Unified rail',
 '<div class="pl-legend" data-delay="1" data-reveal="">\n<span class="pl-chip"><i class="pl-dot pl-dot-week"></i> Marathon launch</span>\n<span class="pl-chip"><i class="pl-dot pl-dot-side"></i> The full report</span>\n<span class="pl-chip"><i class="pl-dot pl-dot-bridge"></i> Commercial venture</span>\n<span class="pl-chip"><i class="pl-dot pl-dot-final"></i> Non-profit</span>\n</div>\n<!-- Unified rail')
# stops: re-tag side stops as week, and day numbers
def tagfix(a,b):
    global s
    rep(a,b)
rep('class="pl-stop t-side" data-key="aicredit"','class="pl-stop t-week" data-key="aicredit"')
rep('class="pl-stop t-side" data-key="xnft"','class="pl-stop t-week" data-key="xnft"')
rep('class="pl-stop t-side" data-key="timescreen"','class="pl-stop t-week" data-key="timescreen"')
rep('class="pl-stop t-side" data-key="mars"','class="pl-stop t-week" data-key="mars"')
# move the 4 side stops into pl-stops, ventures into followups
m=re.search(r'</div></div>\n<div class="pl-followups">\n(.*?)<div class="pl-stop t-final"',s,re.S)
side=m.group(1)
s=s[:m.start()]+'</div>'+side.rstrip()+'</div>\n<div class="pl-followups">\n<div class="pl-stop t-final"'+s[m.end():]
rep('<div class="pl-name">Enki.ngo</div>\n<div class="pl-tag">Founding team of 300</div>','<div class="pl-name">Enki.ngo</div>\n<div class="pl-tag">Non-profit · philanthropists</div>')
rep('<div class="pl-name">Openline</div>\n<div class="pl-tag">Main startup</div>','<div class="pl-name">Openline</div>\n<div class="pl-tag">Main startup · VCs</div>')
rep('<div class="pl-name">Cup of News</div>\n<div class="pl-tag">Side commercial project</div>','<div class="pl-name">Cup of News</div>\n<div class="pl-tag">AI morning digest</div>')
extra=''.join(f'<div class="pl-stop t-bridge" data-key="{k}">\n<div class="pl-mark"><span></span></div>\n<div class="pl-when">Later<br/><b aria-hidden="true">&nbsp;</b></div>\n<div class="pl-name">{n}</div>\n<div class="pl-tag">{t}</div>\n<div class="pl-state">Venture</div>\n</div>' for k,n,t in [('iris','Iris','Customer inbox · investors'),('digital-spot','Digital.spot','Presence platform · investors')])
rep('<div class="pl-stop t-app" data-key="cofn">',extra+'<div class="pl-stop t-app" data-key="cofn">')
report=('<div class="pl-report"><div class="pl-stop t-report" data-key="report" data-launch="2026-11-23T09:00:00Z">\n<div class="pl-mark"><span></span></div>\n<div class="pl-when">Mon<br/><b>23 Nov</b></div>\n<div class="pl-name">The full report</div>\n<div class="pl-tag">LinkedIn and X · what the 11 launches brought</div>\n<div class="pl-state">Report · planned</div>\n</div></div>\n')
rep('<div class="pl-followups">',report+'<div class="pl-followups">')
rep('Eleven Product Hunt launches, all at 16:00 Lisbon time: 10–20 Nov. Enki, Openline and Cup of News follow later.','Eleven Product Hunt launches, all at 16:00 Lisbon time: 10–20 Nov. The full report follows on Mon 23 Nov. Enki, Openline, Iris, Digital.spot and Cup of News are undated.')
i0=s.find('<div class="pl-followups">'); i1=s.find('</section>',i0)
s=s[:i0]+s[i0:i1].replace('PH · planned','Venture')+s[i1:]
# ---------- follow, experiment, cho strings ----------
rep('Follow the sprint','Follow the marathon')
rep('Daily launches during the Weekathon. Try the products, ask questions and share useful feedback. No upvote ask.','Daily launches during the Marathon. Try the products, ask questions and share useful feedback. No upvote ask.')
rep('Or start your own little Weekathon.','Or start your own little marathon.')
rep('Live threads, receipts, and the day-to-day reality of shipping in public.','Live threads, receipts, the daily launch and the day-to-day reality of shipping in public.') if False else None
s=s.replace('This Weekathon is a public experiment','This Marathon is a public experiment')
s=s.replace('the Weekathon','the Marathon').replace('The Weekathon','The Marathon').replace('this Weekathon','this Marathon')
s=s.replace('THE WEEKATHON · WORLDWIDE','THE MARATHON · WORLDWIDE')
s=s.replace('my deliberately','my deliberately')
# JS
rep("times=['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16']","times=['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20']")
s=s.replace("'launch week has started'","'the Marathon has started'")
s=s.replace('HERO: week progress (7 Weekathon launches','HERO: marathon progress (11 launches')
# CSS
css='''<style>
/* Marathon rework */
#grid-week .card[data-key="megamesh"]{grid-column:auto;display:block;grid-template-columns:none}
#grid-week .card[data-key="megamesh"] .card-media{height:auto;min-height:0;aspect-ratio:16/10}
#grid-week .card[data-key="megamesh"] .card-body{padding:var(--card-pad,22px)}
.card-ph-btn{margin-top:8px}
.card-ventures-cta{display:flex;align-items:center;background:var(--ph);color:#fff;border-color:transparent}
.card-ventures-cta .card-body{padding:28px}
.card-ventures-cta h3,.card-ventures-cta .tagline,.card-ventures-cta .eyebrow{color:#fff}
.card-ventures-cta .card-link-btn{background:#fff;color:var(--ph-deep);border-color:#fff}
.ventures-intro{padding:clamp(56px,7vw,96px) 0 8px}
.ventures-list{list-style:none;margin:28px 0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.ventures-list a{display:flex;flex-direction:column;gap:6px;padding:16px 18px;border:1px solid var(--line-2);border-radius:14px;text-decoration:none;color:inherit;height:100%}
.ventures-list strong{font:600 18px/1.2 var(--font-display)}
.ventures-list span{font-size:13px;color:var(--ink-3)}
.ventures-list a:hover{border-color:var(--ph)}
.ventures-intro .meetup-cta{display:flex;gap:12px;flex-wrap:wrap}
.venture-brand:not(.enki-brand):not(.openline-brand) span{font:600 clamp(28px,3vw,40px)/1 var(--font-display);letter-spacing:-.03em}
.pl-report{margin:36px 0 0;padding-top:28px;border-top:1px dashed var(--line-2);display:grid;grid-template-columns:minmax(0,320px)}
.pl-stop.t-report{--calendar-accent:var(--ph)}
@media(min-width:1001px){.pl-stops{grid-template-columns:repeat(6,minmax(0,1fr))}.pl-followups{grid-template-columns:repeat(5,minmax(0,1fr))}}
@media(max-width:1000px){.ventures-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:540px){.ventures-list{grid-template-columns:1fr}}
</style>
'''
rep('</head>',css+'</head>')
for i,l in SAVED.items(): s=s.replace('@@DICT%d@@'%i,l)
open('index.html','w',encoding='utf-8').write(s)
print('ok',len(s))
