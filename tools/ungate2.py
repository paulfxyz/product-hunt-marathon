import re,sys
s=open('/tmp/ungate_stage1.html',encoding='utf-8').read()
n0=len(s)
def rep(old,new,count=1):
    global s
    parts=re.split(r'(<script[^>]*>.*?</script>)',s,flags=re.S)
    c=sum(p.count(old) for p in parts[0::2])
    if c<count: sys.exit(f'count {c}<{count} for {old[:80]!r}')
    for i in range(0,len(parts),2): parts[i]=parts[i].replace(old,new)
    s=''.join(parts)
# ---- script 5: keep reveal/countdown/parallax, add calendar live state
scripts=list(re.finditer(r'(<script[^>]*>)(.*?)(</script>)',s,re.S))
s5=scripts[5].group(2); assert "getElementById('pinModal')" in s5
a=s5.index('  // ============ SCROLL REVEAL'); b=s5.index('  // ============ EASTER')
LIVE='''  // ============ CALENDAR: mark launched rows as live ============
  const launchRows=[...document.querySelectorAll('.pl-stop[data-launch]')];
  function markLive(){
    const now=Date.now();
    launchRows.forEach(row=>{
      if(now<Date.parse(row.dataset.launch)) return;
      row.classList.add('s-done');
      const state=row.querySelector('.pl-state');
      if(state && state.textContent!=='Live') state.textContent='Live';
    });
  }
  markLive();
  setInterval(markLive, 60000);
'''
new5='\n(() => {\n'+s5[a:b]+LIVE+'})();\n'
s=s[:scripts[5].start(2)]+new5+s[scripts[5].end(2):]
# ---- script 10: drop calendar unlock helpers
a=s.index("  const calendarRows=[...document.querySelectorAll('.pl-classified')];")
b=s.index("  unlockObserver.observe(document.body,{attributes:true,attributeFilter:['class']});\n")+len("  unlockObserver.observe(document.body,{attributes:true,attributeFilter:['class']});\n")
s=s[:a]+s[b:]
# ---- remove openPin leftovers anywhere
for k in ['openPin','closePin','unlockAll','pinModal','interest.php','is-unlocked','sessionUnlocked']:
    pass
# ---- CSS pruning
DEAD=re.compile(r'lock-veil|\.lk-|card-classified|\.card\.locked|\.locked\.revealed|\.revealed\b(?![-\w])|pl-redacted|pl-classified|pl-locked-state|s-locked|#pinModal|\.modal(?!-icon)|modal-(?!icon)|\.email-|interest|\.toast|confetti|peek-all|is-unlocked|venture-veil|wt-plate|ol-hero-lock|ol-locked|ol-hero-locked|lock-ico|venture-shell\.is-open|\.is-open')
def prune(css):
    out=[];i=0;L=len(css)
    while i<L:
        j=css.find('{',i)
        if j<0: out.append(css[i:]);break
        sel=css[i:j]
        # find matching brace
        depth=0;k=j
        while True:
            if css[k]=='{':depth+=1
            elif css[k]=='}':
                depth-=1
                if depth==0:break
            k+=1
        body=css[j+1:k]
        if sel.strip().startswith('@media') or sel.strip().startswith('@supports'):
            inner=prune(body)
            if inner.strip(): out.append(sel+'{'+inner+'}')
        elif sel.strip().startswith('@'):
            name=sel.strip()
            if re.search(r'@keyframes\s+(confetti|toast|modal|lk|unlock)',name,re.I): pass
            else: out.append(css[i:k+1])
        else:
            # keep comments preceding selector
            m=re.match(r'(\s*(?:/\*.*?\*/\s*)*)(.*)',sel,re.S); pre,seltxt=m.group(1),m.group(2)
            if re.search(r'CLASSIF|Classified|unlock|EMAIL|Email|modal|MODAL|Openline hero',pre): pre='\n'
            parts=[p for p in seltxt.split(',')]
            keep=[p for p in parts if not DEAD.search(p)]
            if seltxt.strip()=='.venture-content' and 'display:none' in body.replace(' ',''): keep=[]
            if keep: out.append(pre+','.join(keep)+'{'+body+'}')
            elif pre.strip(): out.append(pre)
        i=k+1
    return ''.join(out)
removed=[]
def fixstyle(m):
    css=m.group(2); new=prune(css); removed.append(len(css)-len(new)); return m.group(1)+new+m.group(3)
s=re.sub(r'(<style[^>]*>)(.*?)(</style>)',fixstyle,s,flags=re.S)
print('css removed bytes',removed)
# ---- copy
rep('Explore the projects as they launch, or preview the full line-up now. Sharing your email is optional. All seven are free and open source, with their code on GitHub.','Explore the full line-up below. All seven are free and open source, with their code on GitHub.')
s=re.sub(r'<span class="legend-chip">\s*<svg class="lock-ico".*?</svg>\s*Locked · tap to unlock\s*</span>\s*','',s,count=1,flags=re.S)
for o,nw in [('serious proposal · Nov 24','serious proposal'),('main startup · Dec 1','main startup'),('side commercial project · Dec 15','side commercial project')]:
    rep('</strong> '+o+'</div>','</strong> '+nw+'</div>')
for d in ['TUESDAY 24 NOVEMBER','TUESDAY 1 DECEMBER','TUESDAY 15 DECEMBER']: rep(f'<small>{d}</small>','<small>COMING SOON</small>')
for d in ['Tuesday 24 November 2026','Tuesday 1 December 2026','Tuesday 15 December 2026']:
    rep(f'<span>{d}</span>','<span>Coming soon</span>')
rep('<span class="day-badge">Tue 15 Dec · Freemium</span>','<span class="day-badge">Freemium</span>')
rep('The full pipeline · October–December 2026','The full pipeline · 2026')
rep('a serious proposal with the non-profit Enki on 24 November, my main startup on 1 December and, later, a side commercial project, the freemium Cup of News, on 15 December.','followed by a serious proposal with the non-profit Enki, my main startup Openline and, later, a side commercial project, the freemium Cup of News.')
rep('Fourteen Product Hunt launches, all at 16:00 Lisbon time: 10–19 Nov, 22 Nov, 24 Nov, 1 Dec and 15 Dec.','Eleven Product Hunt launches, all at 16:00 Lisbon time: 10–19 Nov and 22 Nov. Enki, Openline and Cup of News follow later.')
rep('Fourteen launch reminders plus Web Summit Lisbon, shown in your local time. Neutral titles keep the unrevealed projects private. This is a read-only feed, not access to my personal calendar.','Eleven launch reminders plus Web Summit Lisbon, shown in your local time. This is a read-only feed, not access to my personal calendar.')
s=re.sub(r'<!--[^>]*OPTIONAL EMAIL REVEAL[^>]*-->\s*','',s)
s=s.replace(' (locked) -->',' -->')
open('/tmp/ungate_stage2.html','w',encoding='utf-8').write(s)
print(n0,len(s))
for k in ['openPin','closePin','unlockAll','pinModal','interest','is-unlocked','sessionUnlocked','lock-veil','pl-redacted','classified','Classified','data-payload','data-locked','confetti','toast','▓','█','peek','Unlock','unlock']:
    print(k,s.count(k),end='; ')
