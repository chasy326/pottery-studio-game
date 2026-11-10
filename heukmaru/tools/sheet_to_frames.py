import sys, json, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
src, prefix, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
OUT='/home/claude/v4/heukmaru-v4/public/chars/'
a=np.asarray(Image.open(src).convert('RGB')).astype(int)
nw=(a.min(2)>=232)&(np.ptp(a,2)<18)
lab,_=nd.label(nw); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
fg=~np.isin(lab,list(border)); fg=nd.binary_opening(fg,iterations=1)
lab2,k=nd.label(fg); sizes=nd.sum(fg,lab2,range(1,k+1))
big=sorted([i+1 for i in np.argsort(sizes)[::-1][:n]], key=lambda L: np.where(lab2==L)[1].mean())
frames=[]
for L in big:
    m=lab2==L; ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    top=m[y0:y0+int((y1-y0)*0.35)]; hy,hx=np.where(top); hcx=hx.mean()
    frames.append((m,y0,y1,x0,x1,hcx))
H=max(f[2]-f[1] for f in frames)+6; half=int(max(max(f[5]-f[3],f[4]-f[5]) for f in frames))+6; W=half*2
base=max(f[2] for f in frames)
meta={}
for i,(m,y0,y1,x0,x1,hcx) in enumerate(frames):
    al=Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    al=Image.fromarray(np.clip((np.asarray(al).astype(int)-40)*1.4,0,255).astype('uint8'))
    im=Image.fromarray(a.astype('uint8')).convert('RGBA'); im.putalpha(al)
    cut=im.crop((x0,y0,x1,y1)); cv=Image.new('RGBA',(W,H),(0,0,0,0))
    # 발 기준선: 각 컷 아래끝을 캔버스 바닥에 (걷기 자세의 자연스러운 오르내림은 머리 위치로 유지)
    cv.paste(cut,(int(half-(hcx-x0)), H-3-(y1-y0)),cut)
    cv.save(f'{OUT}{prefix}{i}.png'); meta[f"{prefix}{i}"]=[int(W),int(H)]
    # 머리 폭
hw=[]
for i in range(n):
    q=np.asarray(Image.open(f'{OUT}{prefix}{i}.png'))[...,3]>128; ys=np.where(q.any(1))[0]; t=ys[0]; h=ys[-1]-t
    hw.append(max((np.ptp(np.where(q[y])[0]) if q[y].any() else 0) for y in range(t,t+int(h*0.3))))
print(json.dumps(meta)); print('headW', np.median(hw), 'H', H)
