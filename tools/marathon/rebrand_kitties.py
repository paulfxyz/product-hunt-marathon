"""Rebrand only: replace 'N of 7' / Encore / Bonus sign lettering with 'DAY n OF 11'. Run from assets/kitties on the ORIGINALS in kit-before."""
import cv2,numpy as np,sys
from PIL import Image,ImageDraw,ImageFont
SRC='/home/user/workspace/kit-before/'
F='/usr/share/fonts/truetype/noto/NotoSansDisplay-CondensedBold.ttf'
# file: (day, text box x0,y0,x1,y1, tilt degrees)
J={'2-ase.webp':(2,(398,274,508,322),0),'3-mang.webp':(3,(394,278,510,326),0),'4-hollr.webp':(4,(382,274,510,320),0),
'5-clippy.webp':(5,(332,290,545,348),-4),'6-mercury.webp':(6,(406,250,495,288),0),'7-megamesh.webp':(7,(312,232,500,292),-5),
'ai-credit-checker.webp':(8,(585,412,820,495),2),'xnftables-bonus.webp':(9,(585,412,820,495),2),'timescreen.webp':(10,(585,412,820,495),2),'mars-goodie.webp':(11,(585,412,820,495),2)}
for f,(day,b,tilt) in J.items():
    im=Image.open(SRC+f).convert('RGB'); a=np.array(im); tx0,ty0,tx1,ty1=b; PAD={'4-hollr.webp':(8,12),'7-megamesh.webp':(18,3),'3-mang.webp':(8,4),'2-ase.webp':(6,4),'6-mercury.webp':(6,2)}.get(f,(0,0)); x0,y0,x1,y1=tx0-PAD[0],ty0-PAD[1]-(10 if f=='7-megamesh.webp' else 0),tx1+PAD[0]+(6 if f=='4-hollr.webp' else 0),ty1+PAD[1]
    sub=a[y0:y1,x0:x1].astype(int); lum=sub.mean(2)
    card=(lum>=130)&(abs(sub[...,0]-sub[...,2])>35)&(sub[...,0]<235)&(sub[...,1]>100)
    col=np.median(sub[card],axis=0) if card.sum()>30 else np.array([200,150,100])
    clean=a.copy(); r=np.ones((y1-y0,x1-x0),np.float32)
    r=cv2.GaussianBlur(np.pad(r[2:-2,2:-2],2),(0,0),2)[...,None]
    clean[y0:y1,x0:x1]=(sub*(1-r)+col*r).astype(np.uint8)
    im=Image.fromarray(clean)
    w,h=tx1-tx0,ty1-ty0; txt=f'DAY {day} OF 11'
    sz=int(h*0.9)
    while True:
        fo=ImageFont.truetype(F,sz); bb=fo.getbbox(txt)
        if bb[2]-bb[0]<=w*0.96 and bb[3]-bb[1]<=h*0.62: break
        sz-=1
    lay=Image.new('RGBA',(w*3,h*3),(0,0,0,0)); d=ImageDraw.Draw(lay)
    bb=fo.getbbox(txt); d.text((w*1.5-(bb[0]+bb[2])/2,h*1.5-(bb[1]+bb[3])/2),txt,font=fo,fill=(52,46,42,255))
    lay=lay.rotate(-tilt,resample=Image.BICUBIC)
    lay=lay.crop((w,h,2*w,2*h)); im.paste(lay,(tx0,ty0),lay)
    out=f; im.save(out,quality=92) if f.endswith('webp') else im.save(out)
    print(f,sz)
# junk footer
im=Image.open(SRC+'junk-canonical-20261006.png').convert('RGB'); a=np.array(im)
x0,y0,x1,y1=44,458,300,480
bg=tuple(int(v) for v in np.median(a[y0:y1,x0:x1].reshape(-1,3),axis=0))
d=ImageDraw.Draw(im); d.rectangle((x0,y0,x1,y1),fill=bg)
fo=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',12)
d.text((49,462),'THE MARATHON · DAY 1 / 11',font=fo,fill=(150,108,66))
im.save('junk-canonical-20261006.png')
