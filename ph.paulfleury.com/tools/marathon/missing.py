import json,re
from pathlib import Path
from bs4 import BeautifulSoup,NavigableString,Comment
S=Path('/home/user/workspace/pf-ph-site')
def load():
    s=(S/'index.html').read_text(encoding='utf-8')
    i=s.find('window.PH_TRANSLATIONS=')+len('window.PH_TRANSLATIONS=');j=s.find(';</script>',i)
    return s,i,j,json.loads(s[i:j])
norm=lambda x:re.sub(r'\s+',' ',x).strip()
def keys(s):
    soup=BeautifulSoup(s,'html.parser'); out={}
    def skipped(n):
        for p in n.parents:
            if p.name in('script','style','option') or (p.attrs and ('data-i18n-skip' in p.attrs or p.get('id') in('countdown','language-status'))): return True
        return False
    for n in soup.body.descendants:
        if isinstance(n,NavigableString) and not isinstance(n,Comment) and norm(n) and not skipped(n): out[norm(str(n))]='text'
    for el in soup.body.find_all(True):
        if el.has_attr('data-i18n-skip') or el.find_parent(attrs={'data-i18n-skip':True}) or el.get('id')=='theme-toggle': continue
        for at in('aria-label','title','alt','placeholder'):
            if el.has_attr(at) and norm(el[at]): out[norm(el[at])]='attr:'+at
    for m in soup.head.find_all('meta',attrs={'data-i18n-content':True}): out[norm(m['data-i18n-content'])]='meta'
    return out
if __name__=='__main__':
    s,i,j,D=load(); K=keys(s)
    miss=[k for k in K if k not in D['fr']]
    print(len(K),len(miss))
    for k in miss: print(repr(k[:150]))
