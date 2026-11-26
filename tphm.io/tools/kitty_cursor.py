from PIL import Image, ImageDraw, ImageFilter
def halo(im,S):
  a=im.split()[3].point(lambda v:255 if v>0 else 0).filter(ImageFilter.MaxFilter(int(S/32*4)*2+1 if int(S/32*4)%2==0 else int(S/32*4)+2))
  w=Image.new('RGBA',im.size,(255,255,255,0)); w.putalpha(a); w.alpha_composite(im); return w
O=(232,116,42,255); D=(42,26,18,255); Wt=(255,247,237,255); P=(240,150,150,255)
def arrow(S):
  k=S/32; im=Image.new('RGBA',(S*4//1,)*2,(0,0,0,0)); s=4*k
  d=ImageDraw.Draw(im)
  pt=lambda pts:[(x*s,y*s) for x,y in pts]
  body=[(2,2),(2,25),(7.2,20.4),(10.6,28.8),(15.2,26.9),(11.9,19.6),(19,19.6)]
  ears=[[(5.2,6.6),(9.5,2.2),(10.4,10.8)],[(2,9.5),(-0.2,11.5),(2,14)]]
  # outline: draw with thick line then fill
  for e in [ears[0]]: d.polygon(pt(e),fill=D)
  d.polygon(pt(body),fill=D)
  # inner: shrink by drawing again slightly inset (approx via scaling about centroid)
  def inset(pts,c,f): return [(c[0]+(x-c[0])*f,c[1]+(y-c[1])*f) for x,y in pts]
  d.polygon(pt(inset(ears[0],(8.4,6.5),.55)),fill=O)
  d.polygon(pt([(3.6,5.6),(3.6,21.4),(7.9,17.7),(11.5,26.6),(13.2,25.9),(9.7,18.1),(15.2,18.1)]),fill=O)
  d.polygon(pt(inset(ears[0],(8.4,6.5),.28)),fill=P)
  # face: eyes, muzzle
  d.ellipse(pt([(4.3,11.6),(6.1,13.9)]),fill=D); d.ellipse(pt([(8.3,13.4),(10.1,15.7)]),fill=D)
  d.ellipse(pt([(4.6,14.9),(8.8,17.6)]),fill=Wt)
  d.polygon(pt([(6.0,15.2),(7.3,15.5),(6.5,16.4)]),fill=P)
  return halo(im,S).resize((S,S),Image.LANCZOS)
def paw(S):
  k=S/32; im=Image.new('RGBA',(S*4,)*2,(0,0,0,0)); s=4*k; d=ImageDraw.Draw(im)
  pt=lambda a:[(x*s,y*s) for x,y in a]
  def bean(cx,cy,rx,ry,c,o=1.3):
    d.ellipse(pt([(cx-rx-o,cy-ry-o),(cx+rx+o,cy+ry+o)]),fill=D); 
  def fillb(cx,cy,rx,ry,c): d.ellipse(pt([(cx-rx,cy-ry),(cx+rx,cy+ry)]),fill=c)
  T=[(9,9.5,2.6,3.2),(14,5.2,2.7,3.4),(19.6,6.4,2.6,3.2),(23.4,11.6,2.4,3)]
  for t in T: bean(*t,None)
  bean(16,19.5,7.2,6,None); 
  for t in T: fillb(*t,O)
  fillb(16,19.5,7.2,6,O)
  for (cx,cy,rx,ry) in T: fillb(cx,cy+.4,rx*.5,ry*.5,P)
  fillb(16,20.4,4,3.2,P)
  return halo(im,S).resize((S,S),Image.LANCZOS)
for S,suf in [(32,''),(64,'@2x')]:
  arrow(S).save(f'kitty-arrow{suf}.png'); paw(S).save(f'kitty-paw{suf}.png')
bg=Image.new('RGBA',(520,330),(250,240,228,255))
bg.alpha_composite(arrow(64).resize((256,256),Image.NEAREST),(0,0)); bg.alpha_composite(paw(64).resize((256,256),Image.NEAREST),(262,0))
bg.save('preview.png')

for i,c in enumerate([(250,240,228,255),(20,16,14,255)]):
  t=Image.new('RGBA',(80,36),c); t.alpha_composite(arrow(32),(2,2)); t.alpha_composite(paw(32),(44,2)); bg.alpha_composite(t.resize((240,108),Image.NEAREST) if False else t,(10+i*100,270))
bg.save('preview.png')
