import json,sys,numpy as np,wave
e=sys.argv[1]; R=json.load(open(e+'.json'))
# audio onsets
w=wave.open(e+'.wav'); sr=w.getframerate(); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768
hop=sr//30; n=len(a)//hop
env=np.array([np.sqrt((a[i*hop:(i+1)*hop]**2).mean()) for i in range(n)])
# spectral flux onset
fr=np.array([np.abs(np.fft.rfft(a[i*hop:i*hop+2048]*np.hanning(2048))) if i*hop+2048<len(a) else np.zeros(1025) for i in range(n)])
flux=np.r_[0,np.maximum(fr[1:]-fr[:-1],0).sum(1)]; flux/=flux.max()+1e-9
thr=np.convolve(flux,np.ones(9)/9,'same')*1.6+0.05
onsets=[i for i in range(1,n-1) if flux[i]>thr[i] and flux[i]>=flux[i-1] and flux[i]>=flux[i+1]]
cuts=[r['f'] for r in R if r['cut']>0.45]
print(e,'CUTS',cuts)
print('ONSETS',onsets[:200])
print('f  cut  luma sat  sharp  tx    ty    rot   scl   inl  flux')
for r in R:
    t=lambda k: (r[k] if r[k] is not None else 0)
    print(f"{r['f']:3d} {r['cut']:.2f} {r['luma']:5.1f} {r['sat']:5.1f} {r['sharp']:6.0f} {t('tx'):6.1f} {t('ty'):6.1f} {t('rot'):5.2f} {t('scl'):.3f} {r['inl']:4d} {flux[r['f']] if r['f']<n else 0:.2f}")
