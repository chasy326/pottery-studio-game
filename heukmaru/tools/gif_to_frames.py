import numpy as np, json, sys
from PIL import Image, ImageSequence, ImageFilter
from scipy import ndimage as nd
OUT='/home/claude/v4/heukmaru-v4/public/chars/'
def masks(path, thr=236):
    fr=[x.convert('RGB') for x in ImageSequence.Iterator(Image.open(path))]
    res=[]
    for f in fr:
        a=np.asarray(f).astype(int)
        nw=(a.min(2)>=thr)&(np.ptp(a,2)<16)
        H=a.shape[0]; low=np.zeros_like(nw); low[int(H*0.86):]=True
        nw|= low&(a.min(2)>=175)&(np.ptp(a,2)<14)   # 발밑 바닥 그림자(연회색) 제거
        lab,_=nd.label(nw); border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
        fg=~np.isin(lab,list(border)); fg=nd.binary_opening(fg,iterations=1)
        lab2,n=nd.label(fg); 
        if n>1:
            sizes=nd.sum(fg,lab2,range(1,n+1)); keep=[i+1 for i,s in enumerate(sizes) if s>300]; fg=np.isin(lab2,keep)
        res.append((f,fg))
    return res
def save(path, prefix, keepBottom=False):
    res=masks(path); ys=[];xs=[]
    for f,m in res:
        yy,xx=np.where(m); ys+= [yy.min(),yy.max()]; xs+=[xx.min(),xx.max()]
    y0,y1,x0,x1=min(ys),max(ys)+1,min(xs),max(xs)+1
    meta={}
    for i,(f,m) in enumerate(res):
        al=Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7))
        al=Image.fromarray(np.clip((np.asarray(al).astype(int)-40)*1.4,0,255).astype('uint8'))
        im=f.convert('RGBA'); im.putalpha(al); im=im.crop((x0,y0,x1,y1))
        im.save(f'{OUT}{prefix}{i}.png'); meta[f"{prefix}{i}"]=[int(x1-x0),int(y1-y0)]
    print(prefix, x1-x0, y1-y0); return meta
m={}; m.update(save('/mnt/user-data/uploads/a110998d-image.gif','A_cw')); m.update(save('/mnt/user-data/uploads/55f10f53-image.gif','B_gl'))
json.dump(m,open('newmeta.json','w'))
