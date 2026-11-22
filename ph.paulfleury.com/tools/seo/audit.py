# Coverage audit: which visible strings / attributes lack a translation per language.
import re,json,sys
from bs4 import BeautifulSoup, Comment
s=open('index.html',encoding='utf-8').read()
a=s.index('window.PH_TRANSLATIONS=')+len('window.PH_TRANSLATIONS=');b=s.index(';</script>',a)
D=json.loads(s[a:b])
norm=lambda t:re.sub(r'\s+',' ',t).strip()
soup=BeautifulSoup(s,'lxml')
skip='script,style,option,[data-i18n-skip],#countdown,#language-status'
strings=[]
for node in soup.body.find_all(string=True):
    if isinstance(node,Comment):continue
    t=norm(node)
    if not t:continue
    if any(p.name in('script','style','option','noscript','template') or p.has_attr('data-i18n-skip') or p.get('id') in('countdown','language-status') for p in node.parents if p.name):continue
    strings.append(t)
for el in soup.body.find_all(True):
    if el.find_parent(attrs={'data-i18n-skip':True}) or el.has_attr('data-i18n-skip'):continue
    for at in ['aria-label','title','alt','placeholder']:
        if el.has_attr(at) and norm(el[at]):strings.append(norm(el[at]))
for m in soup.find_all('meta',attrs={'data-i18n-content':True}):strings.append(norm(m['data-i18n-content']))
strings.append('The Weekathon — 7 products in 7 days · Paul Fleury')
u=sorted(set(strings))
has_letters=[x for x in u if re.search(r'[A-Za-z]{3,}',x)]
print('unique',len(u),'with words',len(has_letters))
for L in D:
    if L=='en':continue
    miss=[x for x in has_letters if x not in D[L]]
    print(L,len(D[L]),'missing',len(miss))
json.dump({L:[x for x in has_letters if x not in D[L]] for L in D if L!='en'},open('/tmp/missing.json','w'),ensure_ascii=False,indent=1)
