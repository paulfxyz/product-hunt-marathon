"""Build SEO head + static per-language pages. Idempotent: run on root index.html."""
import json,re,sys
from pathlib import Path
from bs4 import BeautifulSoup,NavigableString,Comment
S=Path(__file__).resolve().parents[2]; T=S/'tools/seo'
B='https://ph.paulfleury.com'
LANGS=['en','fr','zh','es','pt','ar','he','hi','bn','id']
HL={'zh':'zh-Hans','pt':'pt-PT'}
LOC={'en':'en_US','fr':'fr_FR','zh':'zh_CN','es':'es_ES','pt':'pt_PT','ar':'ar_AR','he':'he_IL','hi':'hi_IN','bn':'bn_IN','id':'id_ID'}
FONT={'zh':'Noto+Sans+SC','ar':'Noto+Sans+Arabic','he':'Noto+Sans+Hebrew','hi':'Noto+Sans+Devanagari','bn':'Noto+Sans+Bengali'}
DESC='Seven free, open-source Product Hunt launches in seven days, 9–15 November, during Web Summit week in Lisbon. Then four free extras, followed by Enki, Openline and Cup of News.'
ALT='The Weekathon by Paul Fleury: seven free, open-source launches in seven days, 9–15 November 2026'
OGT='The Weekathon — 7 products in 7 days'; TITLE=OGT+' · Paul Fleury'
OLD_DESC='Seven free, open-source launches, 9–15 November, during Web Summit week in Lisbon. Then four free extras on 16, 17, 18 and 22 November, a serious proposal with the non-profit Enki on 24 November, my main startup on 1 December and, later, a side commercial project, Cup of News, on 15 December.'
rev=json.loads((T/'seo-review.json').read_text())
url=lambda L:B+('/' if L=='en' else f'/{L}/')
s=(S/'index.html').read_text(encoding='utf-8')
# --- dictionary entries
i=s.find('window.PH_TRANSLATIONS=')+len('window.PH_TRANSLATIONS=');j=s.find(';</script>',i)
D=json.loads(s[i:j])
PREV='Seven free, open-source Product Hunt launches in seven days, 9–15 November, during Web Summit week in Lisbon. Then four free extras, Enki, Openline and Cup of News.'
for L in LANGS: D[L].pop(PREV,None)
for L in LANGS[1:]:
    D[L][DESC]=rev[L]['desc'].replace('\\xa0','\xa0'); D[L][ALT]=rev[L]['alt'].replace('\\xa0','\xa0')
D['en'][DESC]=DESC; D['en'][ALT]=ALT
s=s[:i]+json.dumps(D,ensure_ascii=False,separators=(',',':'))+s[j:]
t=lambda L,k: k if L=='en' else D[L].get(k,k)
# --- head block
def esc(x): return x.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;')
def block(L):
    d=t(L,DESC);a=t(L,ALT);o=t(L,OGT);img=f'{B}/assets/og/og-{L}.jpg'
    h=['<!-- SEO START -->',
    f'<meta content="{esc(OGT)}" data-i18n-content="{esc(OGT)}" property="og:title"/>',
    f'<meta content="{esc(DESC)}" data-i18n-content="{esc(DESC)}" property="og:description"/>',
    '<meta content="website" property="og:type"/>','<meta content="The Weekathon · Paul Fleury" property="og:site_name"/>',
    f'<meta content="{url(L)}" property="og:url"/>',f'<meta content="{LOC[L]}" property="og:locale"/>']
    h+= [f'<meta content="{LOC[x]}" property="og:locale:alternate"/>' for x in LANGS if x!=L]
    h+=[f'<meta content="{img}" property="og:image"/>',f'<meta content="{img}" property="og:image:secure_url"/>','<meta content="image/jpeg" property="og:image:type"/>',
    '<meta content="1200" property="og:image:width"/>','<meta content="630" property="og:image:height"/>',
    f'<meta content="{esc(ALT)}" data-i18n-content="{esc(ALT)}" property="og:image:alt"/>',
    '<meta content="summary_large_image" name="twitter:card"/>','<meta content="@paulfxyz" name="twitter:site"/>','<meta content="@paulfxyz" name="twitter:creator"/>',
    f'<meta content="{esc(OGT)}" data-i18n-content="{esc(OGT)}" name="twitter:title"/>',
    f'<meta content="{esc(DESC)}" data-i18n-content="{esc(DESC)}" name="twitter:description"/>',
    f'<meta content="{img}" name="twitter:image"/>',f'<meta content="{esc(ALT)}" data-i18n-content="{esc(ALT)}" name="twitter:image:alt"/>',
    '<meta content="index,follow,max-image-preview:large" name="robots"/>','<meta content="Paul Fleury" name="author"/>',
    f'<link href="{url(L)}" rel="canonical"/>']
    h+=[f'<link href="{url(x)}" hreflang="{HL.get(x,x)}" rel="alternate"/>' for x in LANGS]+[f'<link href="{B}/" hreflang="x-default" rel="alternate"/>']
    ld={"@context":"https://schema.org","@graph":[
      {"@type":"WebSite","@id":B+"/#website","url":B+"/","name":"The Weekathon","inLanguage":[HL.get(x,x) for x in LANGS],"publisher":{"@id":B+"/#paul"}},
      {"@type":"WebPage","@id":url(L)+"#webpage","url":url(L),"name":t(L,TITLE),"description":d,"inLanguage":HL.get(L,L),"isPartOf":{"@id":B+"/#website"},
       "primaryImageOfPage":{"@type":"ImageObject","url":img,"width":1200,"height":630,"caption":a},"author":{"@id":B+"/#paul"}},
      {"@type":"Person","@id":B+"/#paul","name":"Paul Fleury","url":"https://paulfleury.com/","sameAs":["https://x.com/paulfxyz","https://www.linkedin.com/in/paulfxyz/","https://paulfleury.com/"]}]}
    h.append('<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('</','<\\/')+'</script>')
    if L=='en':
        h.append("""<script id="ph-lang-redirect">(function(){try{var L=['fr','zh','es','pt','ar','he','hi','bn','id'],p=new URLSearchParams(location.search),q=p.get('lang'),s=null;try{s=localStorage.getItem('ph-language')}catch(e){}if(!s){var m=document.cookie.match(/(?:^|; )ph-language=([^;]*)/);s=m&&decodeURIComponent(m[1])}var c=(q||s||navigator.language||'en').toLowerCase().split('-')[0];if(L.indexOf(c)>-1&&!/bot|crawl|spider|preview|facebookexternalhit|slurp|embedly|whatsapp|telegram|discord|slack/i.test(navigator.userAgent)){p.delete('lang');var r=p.toString();location.replace('/'+c+'/'+(r?'?'+r:'')+location.hash)}}catch(e){}})();</script>""")
    h.append('<!-- SEO END -->'); return '\n'.join(h)
if '<!-- SEO START -->' in s:
    s=re.sub(r'<!-- SEO START -->[\s\S]*?<!-- SEO END -->',lambda m:block('en'),s,count=1)
else:
    a=s.index('<!-- Open Graph -->'); b=s.index('<link href="https://ph.paulfleury.com/" rel="canonical"/>')+len('<link href="https://ph.paulfleury.com/" rel="canonical"/>')
    s=s[:a]+block('en')+s[b:]
h=s.index("</head>"); s=s[:h].replace(OLD_DESC,DESC).replace(PREV,DESC)+s[h:]
# --- engine: language fixed per URL; switching navigates
old1="""  let language=matchLanguage(new URLSearchParams(location.search).get('lang'))
    ||matchLanguage(stored('language'))
    ||matchLanguage(navigator.language)||'en';"""
new1="""  // Each language has its own URL (/ for English, /xx/ otherwise); the page fixes its language.
  let language=matchLanguage(root.dataset.langFixed)||'en';"""
old2="""    store('language',value);setLanguage(value,true);
    try {const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);}catch(_){}
    closeLanguages();"""
new2="""    store('language',value);
    if(value!==language&&names[value]){location.assign((value==='en'?'/':'/'+value+'/')+location.hash);return;}
    closeLanguages();"""
if old1 in s: s=s.replace(old1,new1)
if old2 in s: s=s.replace(old2,new2)
assert new1 in s and new2 in s
(S/'index.html').write_text(s,encoding='utf-8')
# --- per-language pages
SKIP=('script','style','option')
def skipped(node):
    for p in node.parents:
        if p.name in SKIP or (p.attrs and ('data-i18n-skip' in p.attrs or p.get('id') in('countdown','language-status'))): return True
    return False
norm=lambda x:re.sub(r'\s+',' ',x).strip()
for L in LANGS[1:]:
    soup=BeautifulSoup(s,'html.parser'); d=D[L]; tr=lambda k:d.get(norm(k),None)
    html=soup.html; html['lang']=HL.get(L,L); html['dir']='rtl' if L in('ar','he') else 'ltr'; html['data-language']=L; html['data-lang-fixed']=L
    head=soup.head; seo_start=None
    # replace SEO block
    new=BeautifulSoup(block(L),'html.parser')
    nodes=list(head.children); a=next(k for k,n in enumerate(nodes) if isinstance(n,Comment) and n.strip()=='SEO START'); b=next(k for k,n in enumerate(nodes) if isinstance(n,Comment) and n.strip()=='SEO END')
    anchor=nodes[a]
    for n in nodes[a+1:b+1]: n.extract()
    anchor.replace_with(new)
    for m in head.find_all('meta',attrs={'data-i18n-content':True}):
        v=tr(m['data-i18n-content']); 
        if v: m['content']=v
    soup.title.string=d.get(TITLE,TITLE)
    NAMES={'fr':'Français','zh':'简体中文','es':'Español','pt':'Português','ar':'العربية','he':'עברית','hi':'हिन्दी','bn':'বাংলা','id':'Bahasa Indonesia'}
    cl=soup.find(id='current-language'); cl.string=NAMES[L]; cl['lang']=HL.get(L,L)
    for btn in soup.find_all(attrs={'data-language-option':True}): btn['aria-pressed']=str(btn['data-language-option']==L).lower()
    if L in FONT:
        lk=soup.new_tag('link',rel='stylesheet',href=f'https://fonts.googleapis.com/css2?family={FONT[L]}:wght@400;500;600;700&display=swap',id='font-'+L); head.append(lk)
    for n in list(soup.body.descendants):
        if isinstance(n,NavigableString) and not isinstance(n,Comment) and norm(n) and not skipped(n):
            v=tr(str(n))
            if v:
                lead=re.match(r'^\s*',str(n)).group(0);trail=re.search(r'\s*$',str(n)).group(0); n.replace_with(lead+v+trail)
    for el in soup.body.find_all(True):
        if el.has_attr('data-i18n-skip') or el.find_parent(attrs={'data-i18n-skip':True}) or el.get('id')=='theme-toggle': continue
        for at in ('aria-label','title','alt','placeholder'):
            if el.has_attr(at):
                v=tr(el[at])
                if v: el[at]=v
    for el in soup.find_all(True):
        for at in ('src','href','poster','srcset'):
            v=el.get(at)
            if isinstance(v,str) and v and not re.match(r'^(#|/|[a-z][a-z0-9+.-]*:)',v,re.I): el[at]='/'+v
    out=S/L/'index.html'; out.parent.mkdir(exist_ok=True); out.write_text(str(soup),encoding='utf-8'); print(L,out.stat().st_size)
