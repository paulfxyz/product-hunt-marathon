"""One-off: turn the gated/email-unlock page into a fully static page."""
import re,base64,json,html,sys
from bs4 import BeautifulSoup, NavigableString
SRC='index.html'
s=open(SRC,encoding='utf-8').read()
dec=lambda v: base64.b64decode(v).decode('utf-8')
soup=BeautifulSoup(s,'html.parser')
def frag(h): return BeautifulSoup(h,'html.parser')
esc=html.escape
# ---- cards
for card in soup.select('.card-classified'):
    d=json.loads(dec(card['data-payload']))
    media=card.select_one('.card-media')
    cov=media.select_one('.card-classified-cover'); cov and cov.decompose()
    media.append(frag(f'<img src="{esc(d["kittyImg"])}" alt="{esc(d["kittyAlt"])}" loading="lazy"/>'))
    h3=card.select_one('h3'); h3.clear()
    h3.append(frag(f'<a class="card-site-link" href="{esc(d["website"])}" target="_blank" rel="noopener noreferrer">{esc(d["name"])}</a>'))
    price=card.select_one('.price-tag')
    if price:
        price.clear()
        if d.get('build'):
            price.append(frag(f'<span>Approximate budget · US${d["build"]["estimate"]:,}</span><button type="button" class="budget-help" aria-label="What does this budget include?" aria-haspopup="dialog" aria-controls="budget-role-dialog">?</button>'))
        else: price.append(d.get('price',''))
    tl=card.select_one('.tagline'); tl.clear()
    tl.append(frag(d['taglineHtml']) if d.get('taglineHtml') else NavigableString(d['tagline']))
    if d.get('story'):
        tl.insert_after(frag('<details class="product-story"><summary>Why this became a news app</summary>'+''.join(f'<p>{esc(p)}</p>' for p in d['story'])+'</details>'))
    meta=card.select_one('.meta'); meta.clear()
    meta.append(frag(''.join(f'<span class="chip{" locked" if c.get("locked") else ""}">{c["text"]}</span>' for c in d['chips'])))
    b=d.get('build')
    if b and b.get('orchestrator'):
        badges=''.join(f'<span class="build-badge{" orchestrator" if i==0 else ""}">{"Orchestrator: " if i==0 else ""}{esc(n)}</span>' for i,n in enumerate([b['orchestrator'],*b['models']]))
        meta.insert_after(frag(f'<details class="build-stack"><summary>Example tools, models &amp; budget</summary><p class="build-stack-label">Example stack · unconfirmed</p><div class="build-badges">{badges}</div><p class="build-caveat">Approximate total, not an invoice; models may be used in separate tools.</p></details>'))
    a=card.select_one('.card-link-btn'); a.clear()
    for k in ('onclick','aria-label'): a.attrs.pop(k,None)
    a['href']=d['repo']; a['target']='_blank'; a['rel']='noopener noreferrer'; a.string=d.get('linkLabel') or 'View source on GitHub ↗'
    card.select_one('.day-badge').string=d['dayLabel']
    v=card.select_one('.lock-veil'); v and v.decompose()
    for k in ('data-locked','data-payload','style','title'): card.attrs.pop(k,None)
    card['class']=[c for c in card['class'] if c not in ('locked','card-classified')]
    card['data-revealed']='1'
# ---- ventures
for sec in soup.select('[data-venture-payload]'):
    content=sec.select_one('.venture-content'); content.clear(); content.append(frag(dec(sec['data-venture-payload'])))
    content['data-revealed']='1'
    sec.attrs.pop('data-venture-payload')
for sh in soup.select('.venture-shell'):
    sh.attrs.pop('data-locked',None); sh.attrs.pop('style',None); sh.attrs.pop('title',None)
    for v in sh.select('.venture-veil'): v.decompose()
for el in soup.select('[data-context-payload]'):
    el.clear(); el.append(frag(dec(el['data-context-payload']))); el.attrs.pop('data-context-payload')
# ---- calendar rows
NODATE={'winter','bridge','cofn'}
YEAR='2026'; MON={'Nov':'11','Dec':'12'}
rows=soup.select('.pl-classified')
for r in rows:
    r.select_one('.pl-name').string=dec(r['data-n']); r.select_one('.pl-tag').string=dec(r['data-t'])
    st=r.select_one('.pl-state'); st.string='PH · planned'; st['class']=['pl-state']
    for k in ('data-locked','data-n','data-s','data-t','style','title'): r.attrs.pop(k,None)
    r['class']=[c for c in r['class'] if c not in ('s-locked','pl-classified')]
    w=r.select_one('.pl-when')
    if r['data-key'] in NODATE:
        w.clear(); w.append(frag('Later<br/><b>Coming soon</b>'))
    else:
        dd,mm=w.b.get_text().split(); r['data-launch']=f'{YEAR}-{MON[mm]}-{int(dd):02d}T16:00:00Z'
def label(r):
    c=r['class']
    if 't-side' in c: return '+ FREE EXTRA'
    if 't-app' in c: return '+ SIDE PROJECT'
    if 't-bridge' in c: return '+ MAIN STARTUP'
    if 't-final' in c: return '+ SERIOUS PROPOSAL'
    return f'DAY {[x for x in rows if "t-week" in x["class"]].index(r)+1}'
labels=[f'{label(r)} · {r.select_one(".pl-name").get_text()}' for r in rows]
for tr in soup.select('.strip-track'):
    for i,sp in enumerate(tr.find_all('span',recursive=False)): sp.string=labels[i%len(labels)]
# ---- remove modal/toast/peek
for sel in ['#pinModal','#toast','.peek-all']:
    for el in soup.select(sel): el.decompose()
out=str(soup)
open('/tmp/ungate_stage1.html','w',encoding='utf-8').write(out)
print('ok',len(out),'rows',len(rows),labels)
