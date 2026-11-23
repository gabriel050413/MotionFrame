"""Gera arquivos 'Adobe After Effects 8.0 Keyframe Data' (copiar/colar no layer) para cada shake medido."""
import json, math, os
sigs = json.load(open('ae/data/shake_signatures.json'))
SIZES = [(1080, 1920), (1080, 1440), (1920, 1080)]
NL = '\r\n'
for W, H in SIZES:
    d = f'ae/keyframes/{W}x{H}'; os.makedirs(d, exist_ok=True)
    k = min(W, H) / 1080
    for s in sigs:
        n = len(s['s'])
        # overscan para nunca aparecer borda preta (deslocamento + rotação)
        need = 1.0
        for i in range(n):
            th = math.radians(abs(s['r'][i])); dx = abs(s['x'][i]) * 1080 * k; dy = abs(s['y'][i]) * 1080 * k
            req = (math.cos(th) + max(W / H, H / W) * math.sin(th)) + 2 * max(dx / W, dy / H)
            need = max(need, req / (s['s'][i] / 100))
        over = need * 1.01
        L = ['Adobe After Effects 8.0 Keyframe Data', '',
             '\tUnits Per Second\t30', f'\tSource Width\t{W}', f'\tSource Height\t{H}',
             '\tSource Pixel Aspect Ratio\t1', '\tComp Pixel Aspect Ratio\t1', '',
             'Transform\tPosition', '\tFrame\tX pixels\tY pixels\tZ pixels\t']
        for i in range(n):
            L.append(f"\t{i}\t{W/2 + s['x'][i]*1080*k:.3f}\t{H/2 + s['y'][i]*1080*k:.3f}\t0\t")
        L += ['', 'Transform\tScale', '\tFrame\tX percent\tY percent\tZ percent\t']
        for i in range(n):
            v = s['s'][i] * over; L.append(f'\t{i}\t{v:.3f}\t{v:.3f}\t100\t')
        L += ['', 'Transform\tRotation', '\tFrame\tdegrees\t']
        for i in range(n):
            L.append(f"\t{i}\t{s['r'][i]:.3f}\t")
        L += ['', '', 'End of Keyframe Data', '']
        open(f"{d}/{s['id']}.txt", 'w', newline='').write(NL.join(L))
    print(W, H, 'ok')
