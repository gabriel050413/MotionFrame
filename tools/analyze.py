import cv2, numpy as np, json, sys, subprocess, wave
path, out, endf = sys.argv[1], sys.argv[2], int(sys.argv[3])
cap = cv2.VideoCapture(path)
W,H = 540,720; SC = 1080/W
orb = cv2.ORB_create(1500)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
prev=None; pk=pd=None; rows=[]; i=0; prevhist=None
while True:
    ok, f = cap.read()
    if not ok or i>=endf: break
    f = cv2.resize(f,(W,H)); g = cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    # crop out tiktok watermark area
    mask = np.full(g.shape,255,np.uint8); mask[int(H*.4):int(H*.55),0:int(W*.12)]=0; mask[int(H*.85):,int(W*.85):]=0
    k,d = orb.detectAndCompute(g,mask)
    lap = cv2.Laplacian(g,cv2.CV_64F).var()
    gx = np.abs(cv2.Sobel(g,cv2.CV_64F,1,0)).mean(); gy=np.abs(cv2.Sobel(g,cv2.CV_64F,0,1)).mean()
    hist = cv2.calcHist([hsv],[0,1],None,[32,16],[0,180,0,256]); cv2.normalize(hist,hist)
    r = dict(f=i, luma=float(g.mean()), sat=float(hsv[...,1].mean()), sharp=float(lap), gx=float(gx), gy=float(gy),
             b=float(f[...,0].mean()), gch=float(f[...,1].mean()), rch=float(f[...,2].mean()))
    r['cut']= float(cv2.compareHist(prevhist,hist,cv2.HISTCMP_BHATTACHARYYA)) if prevhist is not None else 1.0
    tx=ty=rot=scl=None; inl=0
    if prev is not None and d is not None and pd is not None and len(k)>20 and len(pk)>20:
        m = bf.match(pd,d)
        if len(m)>15:
            p0=np.float32([pk[x.queryIdx].pt for x in m]); p1=np.float32([k[x.trainIdx].pt for x in m])
            M,inl_ = cv2.estimateAffinePartial2D(p0,p1,method=cv2.RANSAC,ransacReprojThreshold=2.0)
            if M is not None:
                inl=int(inl_.sum())
                # express about the centre
                a,b_ = M[0,0],M[1,0]; s=np.hypot(a,b_); th=np.degrees(np.arctan2(b_,a))
                c=np.array([W/2,H/2]); ct = M[:,:2]@c+M[:,2]-c
                tx,ty,rot,scl=float(ct[0]*SC),float(ct[1]*SC),float(th),float(s)
    if inl<12:  # fallback phase correlation
        if prev is not None:
            (dx,dy),resp = cv2.phaseCorrelate(np.float32(prev),np.float32(g))
            tx,ty,rot,scl=float(dx*SC),float(dy*SC),0.0,1.0; r['pc']=float(resp)
    r.update(tx=tx,ty=ty,rot=rot,scl=scl,inl=inl)
    rows.append(r); prev=g; pk,pd=k,d; prevhist=hist; i+=1
json.dump(rows,open(out,'w'))
print(len(rows))
