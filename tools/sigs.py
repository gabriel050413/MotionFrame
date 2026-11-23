import json,numpy as np
SEL=[ # edit, start, end, id, name, desc
 ('e1',324,341,'E1_SLAM_BOUNCE','Slam Bounce (E1)','Entrada com zoom 119%->100% + quique diagonal e snap-out no fim (Neymar/flicker B&W)'),
 ('e1',341,358,'E1_PUSH_KICK','Push Kick (E1)','Zoom-in +18% com chute para cima/direita e retorno brusco'),
 ('e1',359,375,'E1_WHIP_OUT','Whip Out (E1)','Zoom-out leve, tremida e whip lateral de ~60px no final (saida do corte)'),
 ('e1',291,307,'E1_RECOIL','Recoil (E1)','Recuo curto: escala -9% e tremor em X/Y (pos zoom blur)'),
 ('e2',303,327,'E2_PUNCH_INOUT','Punch In/Out (E2)','Kick diagonal -49px + zoom +17% ease e volta (zoom-out) no final'),
 ('e2',351,374,'E2_DROP_ZOOM','Drop Zoom (E2)','Queda vertical +68px com zoom +21% e retorno'),
 ('e2',279,303,'E2_WHIP_SNAP','Whip Snap (E2)','Snap horizontal -31px que assenta com leve rotacao'),
 ('e2',0,39,'E2_SPIN_ZOOM_INTRO','Spin Zoom Intro (E2)','Intro: rotacao -9.7 graus + zoom 134%->100% desacelerando'),
 ('e2',209,240,'E2_HANDHELD_SWING','Handheld Swing (E2)','Balanço de camera na mao: pan -190px, rot +11 graus'),
 ('e3',282,300,'E3_ROTATE_KICK','Rotate Kick (E3)','Kick com rotacao +11 graus e zoom +32%'),
 ('e3',225,243,'E3_SOFT_DROP','Soft Drop (E3)','Drop suave -53px em Y com drift de rotacao +2.5 graus'),
 ('e3',319,339,'E3_TILT_DRIFT','Tilt Drift (E3)','Drift com tilt +4.8 graus e respiração de escala'),
 ('e3',63,100,'E3_SMOOTH_PUSH','Smooth Push (E3)','Push-in cinematográfico contínuo (Ronaldinho / Neymar parallax)'),
]
out=[]
for e,a,b,i,n,d in SEL:
    R=json.load(open(f'{e}.json'))
    X=[0];Y=[0];T=[0];Z=[0];good=[True]
    for r in R[a+1:b]:
        g=r['inl']>=25 and r['tx'] is not None and abs(r['tx'])<150 and abs(r['ty'])<150 and abs(r['rot'])<8
        X.append(X[-1]+(r['tx'] if g else 0));Y.append(Y[-1]+(r['ty'] if g else 0))
        T.append(T[-1]+(r['rot'] if g else 0));Z.append(Z[-1]+(np.log(r['scl']) if g else 0));good.append(g)
    X,Y,T,Z=map(np.array,(X,Y,T,Z)); good=np.array(good)
    # trim leading unmeasured frames (transition blur), keep 1 frame before motion
    k=0
    while k<len(good)-3 and not good[k+1]: k+=1
    X,Y,T,Z=X[k:]-X[k],Y[k:]-Y[k],T[k:]-T[k],Z[k:]-Z[k]
    # trim trailing flat frames
    m=len(X)
    while m>4 and X[m-1]==X[m-2] and Y[m-1]==Y[m-2] and Z[m-1]==Z[m-2]: m-=1
    X,Y,T,Z=X[:m],Y[:m],T[:m],Z[:m]
    S=np.exp(Z); S=S/S.min()   # min scale = 100%
    out.append(dict(id=i,name=n,desc=d,src=f'{e} f{a}-{b}',fps=30,
        x=[round(v/1080,5) for v in X],y=[round(v/1080,5) for v in Y],
        r=[round(v,3) for v in T],s=[round(100*v,2) for v in S]))
    print(i,len(X),'maxXY',int(np.abs(X).max()),int(np.abs(Y).max()),'rot',round(np.abs(T).max(),1),'scale',round(100*S.max()))
json.dump(out,open(f'{__import__("sys").argv[1]}','w'),indent=0)
