import json,base64,asyncio,sys
from pathlib import Path
from playwright.async_api import async_playwright
S=Path(__file__).resolve().parents[2]
s=(S/'index.html').read_text(encoding='utf-8')
i=s.find('window.PH_TRANSLATIONS=')+len('window.PH_TRANSLATIONS=');D=json.loads(s[i:s.find(';</script>',i)])
kitty=base64.b64encode((S/'assets/kitties/hero-master.webp').read_bytes()).decode()
FONT={'zh':'Noto Sans SC','ar':'Noto Sans Arabic','he':'Noto Sans Hebrew','hi':'Noto Sans Devanagari','bn':'Noto Sans Bengali'}
LANGS=sys.argv[1:] or ['en','fr','zh','es','pt','ar','he','hi','bn','id']
def html(L):
    t=lambda k:D[L].get(k,k) if L!='en' else k
    rtl=L in('ar','he'); f=FONT.get(L)
    fam=("'%s',"%f) if f else ''
    q=('&family='+f.replace(' ','+')+':wght@500;700') if f else ''
    prods=''.join(f'<span>{p}</span>' for p in ['Junk','ASE','Mang','Hollr','Clippy','Mercury','Megamesh'])
    return f'''<!doctype html><html lang="{L}" dir="{'rtl' if rtl else 'ltr'}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@500;600{q}&display=block" rel="stylesheet">
<style>*{{margin:0;box-sizing:border-box}}body{{width:1200px;height:630px;background:#FFF7ED;font-family:'Space Grotesk',{fam}sans-serif;color:#1F1A17;overflow:hidden;position:relative}}
.wrap{{position:absolute;inset:56px 64px;display:flex;flex-direction:column}}
.brand{{font:600 22px 'IBM Plex Mono',monospace;letter-spacing:.04em;direction:ltr;unicode-bidi:isolate}}.brand b{{color:#DA552F}}
.top{{display:flex;justify-content:space-between;align-items:center}}
.pill{{font:600 17px 'IBM Plex Mono',{fam}monospace;background:#DA552F;color:#fff;padding:8px 16px;border-radius:999px;letter-spacing:.03em}}
h1{{margin-top:44px;font-size:84px;line-height:1.02;font-weight:700;letter-spacing:-.02em;max-width:690px}}h1 em{{font-style:normal;color:#DA552F;display:block}}
.sub{{margin-top:26px;font-size:28px;font-weight:500;color:#4A3F38;max-width:660px}}
.prods{{margin-top:auto;display:flex;flex-wrap:wrap;gap:10px;max-width:700px;direction:ltr}}
.prods span{{font:600 18px 'IBM Plex Mono',monospace;border:2px solid #1F1A17;border-radius:8px;padding:6px 12px;background:#fff}}
.url{{position:absolute;bottom:56px;{'left' if rtl else 'right'}:64px;font:600 20px 'IBM Plex Mono',monospace;color:#DA552F}}
.kitty{{position:absolute;{'left' if rtl else 'right'}:20px;top:150px;width:470px;}}
html[dir=rtl] .prods{{justify-content:flex-end;margin-left:auto}}
</style></head><body><img class="kitty" src="data:image/webp;base64,{kitty}"><div class="wrap">
<div class="top"><div class="brand">PF <b>&#10084;</b> PH · The Weekathon</div><div class="pill">{t('10–16 NOVEMBER')} · {t('Web Summit Lisbon')}</div></div>
<h1>{t('Seven products.')}<em>{t('Seven days.')}</em></h1>
<div class="sub">{t('100% free and open source')}</div>
<div class="prods">{prods}</div></div><div class="url">ph.paulfleury.com</div></body></html>'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1200,'height':630})
        for L in LANGS:
            await pg.set_content(html(L),wait_until='networkidle'); await pg.evaluate('document.fonts.ready')
            await pg.screenshot(path=str(S/f'assets/og/og-{L}.jpg'),type='jpeg',quality=88)
            print(L,(S/f'assets/og/og-{L}.jpg').stat().st_size)
        await b.close()
asyncio.run(main())
