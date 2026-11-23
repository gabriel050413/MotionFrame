import json,sys,numpy as np
e=sys.argv[1]; R=json.load(open(e+'.json'))
cuts=[0]+[r['f'] for r in R if r['cut']>0.6]+[len(R)]
cuts=sorted(set(cuts))
shots=[(a,b) for a,b in zip(cuts[:-1],cuts[1:]) if b-a>=4]
allres=[]
for a,b in shots:
    X=[0];Y=[0];T=[0];Z=[0];ok=[]
    for r in R[a+1:b]:
        good=r['inl']>=25 and r['tx'] is not None
        tx,ty,rot,s=(r['tx'],r['ty'],r['rot'],r['scl']) if good else (0,0,0,1)
        X.append(X[-1]+tx);Y.append(Y[-1]+ty);T.append(T[-1]+rot);Z.append(Z[-1]+np.log(s));ok.append(good)
    X,Y,T,Z=map(np.array,(X,Y,T,Z))
    sh=[R[i]['sharp'] for i in range(a,b)]
    # residual shake = minus 7-frame moving avg
    def hp(v):
        k=min(7,len(v)|1); p=np.pad(v,k//2,mode='edge'); return v-np.convolve(p,np.ones(k)/k,'valid')
    rx,ry,rt=hp(X),hp(Y),hp(T)
    allres.append((rx,ry,rt))
    print(f"shot {a:3d}-{b:3d} n={b-a:2d} okfrac={np.mean(ok) if ok else 0:.2f} zoom%/f={100*(np.exp(Z[-1]/max(1,b-a-1))-1):+.2f} "
          f"pan=({X[-1]:+.0f},{Y[-1]:+.0f})px rot={T[-1]:+.1f} | shakeRMS x={rx.std():.1f} y={ry.std():.1f} r={rt.std():.2f} peak={np.abs(np.r_[rx,ry]).max():.0f} | sharp min/max={min(sh):.0f}/{max(sh):.0f}")
    print('   X',' '.join(f"{v:+.0f}" for v in X[:24]))
    print('   Y',' '.join(f"{v:+.0f}" for v in Y[:24]))
    print('   R',' '.join(f"{v:+.1f}" for v in T[:24]))
    print('   Z',' '.join(f"{100*(np.exp(v)-1):+.0f}" for v in Z[:24]))
