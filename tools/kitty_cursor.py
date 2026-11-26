from PIL import Image, ImageDraw, ImageFilter
O=(232,116,42,255); O2=(246,140,60,255); D=(42,26,18,255); P=(240,150,150,255); P2=(255,96,128,255); Wt=(255,255,255,255)
def paw(S,hover=False):
  s=4*S/32; im=Image.new('RGBA',(S*4,)*2,(0,0,0,0)); d=ImageDraw.Draw(im)
  e=lambda cx,cy,rx,ry,c:d.ellipse([(cx-rx)*s,(cy-ry)*s,(cx+rx)*s,(cy+ry)*s],fill=c)
  T=[(7.2,10.6,2.5,3.1),(12.4,6.4,2.6,3.3),(18.4,6.9,2.5,3.1),(22.8,11.4,2.3,2.9)]
  M=(15,19.8,7,5.8)
  for t in T+[M]: e(t[0],t[1],t[2]+1.3,t[3]+1.3,D)
  for t in T+[M]: e(*t,O2 if hover else O)
  pc=P2 if hover else P
  for (cx,cy,rx,ry) in T: e(cx,cy+.4,rx*.52,ry*.52,pc)
  e(15,20.6,3.9,3.1,pc)
  if hover:
    for (cx,cy,rx,ry) in T[:2]: e(cx-.8,cy-1.2,.55,.55,Wt)
  im=im.rotate(28,resample=Image.BICUBIC,center=(16*s,16*s))
  a=im.split()[3].point(lambda v:255 if v>40 else 0).filter(ImageFilter.MaxFilter(5 if S==32 else 9))
  w=Image.new('RGBA',im.size,(255,255,255,0));w.putalpha(a);w.alpha_composite(im)
  w=w.resize((S,S),Image.LANCZOS)
  # crop so the top-left-most pixel sits near (1,1)
  bb=w.getbbox(); w2=Image.new('RGBA',(S,S),(0,0,0,0)); w2.alpha_composite(w.crop(bb),(S//32,S//32))
  px=w2.load(); best=min(((x+y,x,y) for x in range(S) for y in range(S) if px[x,y][3]>128))
  return w2,(best[1],best[2])
for S,suf in [(32,''),(64,'@2x')]:
  for h,n in [(False,'kitty-paw'),(True,'kitty-paw-hover')]:
    im,hs=paw(S,h); im.save(f'{n}{suf}.png'); print(n,suf,hs)
bg=Image.new('RGBA',(540,340),(250,240,228,255))
for i,h in enumerate([False,True]): bg.alpha_composite(paw(64,h)[0].resize((256,256),Image.NEAREST),(i*270,0))
for i,c in enumerate([(250,240,228,255),(20,16,14,255)]):
  t=Image.new('RGBA',(80,36),c); t.alpha_composite(paw(32)[0],(2,2)); t.alpha_composite(paw(32,True)[0],(44,2)); bg.alpha_composite(t,(10+i*100,280))
bg.save('preview2.png')
