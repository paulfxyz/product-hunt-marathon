# Per-product Open Graph cards (1200x630): the product's Marathon kitty plus its name.
from PIL import Image,ImageDraw,ImageFont
import re
s=open('assets/data.js').read()
items=re.findall(r"name: '([^']+)', key: '([^']+)'",s)
f=ImageFont.truetype('/tmp/brico.ttf',58); f.set_variation_by_axes([96,800,100])
for name,key in items:
  im=Image.new('RGB',(1200,630),'#FBF4EA')
  k=Image.open(f'assets/kitty/p/{key}.webp').convert('RGBA')
  h=470; w=int(k.width*h/k.height); k=k.resize((w,h),Image.LANCZOS)
  im.paste(k,((1200-w)//2,36),k)
  d=ImageDraw.Draw(im); t=f'{name} · TPHM'; tw=d.textlength(t,font=f)
  d.text(((1200-tw)/2,530),t,font=f,fill='#1C1512')
  im.save(f'assets/og/{key}.jpg',quality=86)
