import re,sys
from pathlib import Path
JS='''
  // ============ HERO: week progress (7 Weekathon launches, 16:00 Lisbon) ============
  (function(){
    const row=document.querySelector('.prog-row');if(!row)return;
    const dots=[...row.querySelectorAll('.p-dot')],count=row.querySelector('.p-count');
    const base=count?count.textContent:'';
    const times=['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16'].map(d=>Date.parse(d+'T16:00:00Z'));
    const bn=s=>String(s).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
    function tick(){
      const now=Date.now();let n=0;
      times.forEach((t,i)=>{const on=now>=t;if(on)n++;if(dots[i]){dots[i].classList.toggle('done',on);dots[i].classList.toggle('today',on&&now<t+864e5);}});
      if(count)count.textContent=base.replace(/[0০]/,m=>m==='০'?bn(n):String(n));
    }
    tick();setInterval(tick,60000);
  })();
'''
anchor='  setInterval(markLive, 60000);\n'
files=[Path('index.html')]+[Path(l)/'index.html' for l in 'fr zh es pt ar he hi bn id'.split()]
for f in files:
    t=f.read_text()
    if 'p-count' in t: print(f,'already');continue
    a=t.count('<span style="margin-left:6px;color:var(--ph-deep);font-weight:600">')
    b=t.count(anchor)
    assert a==1 and b==1,(f,a,b)
    t=t.replace('<span style="margin-left:6px;color:var(--ph-deep);font-weight:600">','<span class="p-count" style="margin-left:6px;color:var(--ph-deep);font-weight:600">')
    t=t.replace(anchor,anchor+JS)
    f.write_text(t);print(f,'ok')
