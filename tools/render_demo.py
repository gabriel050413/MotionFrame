"""Renderiza cada efeito do MotionFrame sobre uma foto (prévia sem After Effects).
uso: python3 tools/render_demo.py foto.png pasta_saida"""
import sys, os, json, math, subprocess
import cv2, numpy as np
IMG, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
W, H, FPS, SEG, HIT = 720, 960, 30, 42, 8
sigs = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'ae', 'data', 'shake_signatures.json')))
src = cv2.imread(IMG); src = src[4:-4, 4:-4]
sh, sw = src.shape[:2]; sc = max(W / sw, H / sh)
src = cv2.resize(src, (int(sw * sc + .5), int(sh * sc + .5)), interpolation=cv2.INTER_LANCZOS4)
y0, x0 = (src.shape[0] - H) // 2, (src.shape[1] - W) // 2
BASE = src[y0:y0 + H, x0:x0 + W].astype(np.float32) / 255
K = W / 1080  # px medidos (@1080) -> px desta prévia

def warp(img, dx, dy, rot, s):
    M = cv2.getRotationMatrix2D((W / 2, H / 2), -rot, s / 100); M[0, 2] += dx; M[1, 2] += dy
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def mblur(img, f, fn, sub=5, shutter=0.75):
    """motion blur por subframes: fn(t)->(dx,dy,rot,scale)"""
    acc = np.zeros_like(img)
    for t in np.linspace(f - shutter / 2, f + shutter / 2, sub): acc += warp(img, *fn(t))
    return acc / sub

def lerp_sig(sig, t, over):
    n = len(sig['s']); t = min(max(t, 0), n - 1); i = int(t); j = min(i + 1, n - 1); a = t - i
    g = lambda k: sig[k][i] * (1 - a) + sig[k][j] * a
    return g('x') * 1080 * K, g('y') * 1080 * K, g('r'), g('s') * over

def overscan(sig):
    need = 1
    for i in range(len(sig['s'])):
        th = math.radians(abs(sig['r'][i])); dx = abs(sig['x'][i]) * 1080 * K; dy = abs(sig['y'][i]) * 1080 * K
        need = max(need, ((math.cos(th) + H / W * math.sin(th)) + 2 * max(dx / W, dy / H)) / (sig['s'][i] / 100))
    return need * 1.01

def kick(t, amp, pico, freq, decay, rot, punch, n=1, jit=0):
    if t < 0: return 0, 0, 0, 110
    tp = pico / FPS; tt = t / FPS
    e = math.sin(tt / tp * math.pi / 2) if tt < tp else math.cos(2 * math.pi * freq * (tt - tp)) * math.exp(-decay * (tt - tp))
    r = np.random.RandomState(n); a = r.uniform(0, 2 * math.pi); sg = r.choice([-1, 1])
    rj = np.random.RandomState(int(t * 10) + 7); j = jit * K * math.exp(-decay * tt)
    sc = 110 + punch * ((tt / tp) if tt < tp else math.exp(-decay * .8 * (tt - tp)))
    return (math.cos(a) * amp * K * e + rj.uniform(-j, j), math.sin(a) * amp * K * e + rj.uniform(-j, j), sg * rot * e, sc)

def radial_zoom(img, amt, cx=W / 2, cy=H / 2, n=12):
    acc = np.zeros_like(img)
    for k in range(n):
        s = 1 + amt * k / n; M = cv2.getRotationMatrix2D((cx, cy), 0, s); acc += cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return acc / n

def dir_blur(img, length, horiz=True):
    L = max(1, int(length)); k = np.zeros((L, L) if False else ((1, L) if horiz else (L, 1)), np.float32); k[:] = 1 / L
    return cv2.filter2D(img, -1, k, borderType=cv2.BORDER_REFLECT)

def exposure(img, ev, off=0): return np.clip(img * 2 ** ev + off, 0, None)
def gray(img): g = img.mean(2, keepdims=True); return np.repeat(g, 3, 2)
def contrast(img, c): return np.clip((img - .5) * (1 + c / 100) + .5, 0, 1)
def rgb_split(img, px):
    o = img.copy(); px = int(px)
    if px: o[..., 2] = np.roll(img[..., 2], px, 1); o[..., 0] = np.roll(img[..., 0], -px, 1)
    return o
def glow(img, thr, rad, inten, color=None):
    l = img.mean(2, keepdims=True); m = np.clip((l - thr) / (1 - thr + 1e-6), 0, 1) * img
    if color is not None: m = m.mean(2, keepdims=True) * np.array(color, np.float32)[::-1]
    b = cv2.GaussianBlur(m, (0, 0), rad); return img + b * inten
def vignette(img, amt):
    yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / 1.414
    return img * (1 - amt * np.clip(d, 0, 1)[..., None] ** 2)

LOOKS = {  # sombras(BGR), altas(BGR), contraste, sat, lift, white, bloom(thr,rad,int), vig
 'E1': dict(sh=(.06, .01, -.035), hi=(-.02, .02, 0), con=22, sat=1.08, lift=10, white=238, bloom=(.8, 12, .25), vig=.6),
 'E2': dict(sh=(.07, -.05, .035), hi=(0, 0, .01), con=26, sat=.97, lift=0, white=255, bloom=(.7, 18, .45), vig=.55),
 'E3': dict(sh=(.025, -.03, .015), hi=(-.035, .01, .035), con=12, sat=.85, lift=19, white=232, bloom=(.6, 26, .5), vig=.7)}
def look(img, L):
    o = contrast(img, L['con']); l = o.mean(2, keepdims=True)
    o = o + (1 - l) ** 2 * np.array(L['sh'], np.float32) + l ** 2 * np.array(L['hi'], np.float32)
    g = o.mean(2, keepdims=True); o = g + (o - g) * L['sat']
    o = o * (L['white'] - L['lift']) / 255 + L['lift'] / 255
    o = glow(np.clip(o, 0, 1), *L['bloom'])
    bl = cv2.GaussianBlur(o, (0, 0), 1.4); o = o + (o - bl) * .7
    o = vignette(o, L['vig'] * .6)
    o = o + np.random.RandomState(0).normal(0, .012, o.shape[:2])[..., None]
    return np.clip(o, 0, 1)

EFFECTS = []
def fx(name, desc=''):
    def d(f): EFFECTS.append((name, desc, f)); return f
    return d

for sig in sigs:
    def mk(sig=sig):
        ov = overscan(sig)
        def f(img, i):
            return mblur(img, i - HIT, lambda t: lerp_sig(sig, t, ov)) if i >= HIT else warp(img, 0, 0, 0, sig['s'][0] * ov)
        return f
    fx('SHAKE ' + sig['id'], sig['desc'])(mk())

for nm, p in [('Impact Kick', (45, 3, 3.5, 9, 2, 12, 4)), ('Hard Rattle', (28, 1, 12, 7, 3, 8, 10)),
              ('Soft Bounce', (25, 4, 2.2, 6, 1.2, 6, 0)), ('Zoom Punch', (8, 2, 3, 8, 1.5, 18, 2))]:
    def mk(p=p):
        def f(img, i):
            n = 1 if i < HIT + 20 else 2; t0 = HIT if n == 1 else HIT + 20
            return mblur(img, i - t0, lambda t: kick(t, *p[:6], n=n, jit=p[6]))
        return f
    fx('BEAT ' + nm, 'shake por batida (2 batidas)')(mk())

@fx('BEAT Twitch Jitter')
def _(img, i):
    t = i - HIT
    if 0 <= t < 6:
        r = np.random.RandomState(i // 2); a = 22 * K * (1 - t / 6)
        return rgb_split(warp(img, r.uniform(-a, a), r.uniform(-a, a), r.uniform(-2, 2), 110), 6 * K * (1 - t / 6) + 2)
    return warp(img, 0, 0, 0, 110)

@fx('Handheld Wiggle')
def _(img, i):
    t = i / FPS; dx = 14 * K * (math.sin(t * 6.1) + .5 * math.sin(t * 11.3 + 1)); dy = 14 * K * (math.sin(t * 5.3 + 2) + .5 * math.sin(t * 13.7))
    return warp(img, dx, dy, .8 * math.sin(t * 4.2), 106)

@fx('Zoom Blur Punch')
def _(img, i):
    t = i - HIT; amt = np.interp(t, [-3, -1, 0, 1, 3], [0, .15, .3, .15, 0]); s = np.interp(t, [-3, 0, 4], [100, 135, 100])
    return radial_zoom(warp(img, 0, 0, 0, s), amt)

for d in ['Left', 'Right', 'Up', 'Down']:
    def mk(d=d):
        def f(img, i):
            t = i - HIT; v = {'Left': (-1, 0), 'Right': (1, 0), 'Up': (0, -1), 'Down': (0, 1)}[d]
            if t < -4: return warp(img, 0, 0, 0, 100)
            u = min(max((t + 4) / 4, 0), 1); e = 1 - (1 - u) ** 3; off = (1 - e) * W * .9
            s = np.interp(t, [-4, 0, 3], [125, 112, 100]); o = warp(img, -v[0] * off, -v[1] * off, 0, s)
            L = np.interp(t, [-4, -1, 0, 2, 4], [60, 140, 90, 20, 0]) * K
            return dir_blur(o, L, horiz=(v[1] == 0))
        return f
    fx('Whip ' + d)(mk())

@fx('Blur In')
def _(img, i):
    t = i - HIT; s = np.interp(t, [0, 6], [112, 100]); b = np.interp(t, [0, 2, 5], [80, 25, 0]) * K * .5
    o = warp(img, 0, 0, 0, s if t >= 0 else 112); b = b if t >= 0 else 40 * K
    if b > .3: o = cv2.GaussianBlur(o, (0, 0), b)
    return exposure(o, np.interp(t, [0, 5], [.8, 0]))

@fx('Flash White')
def _(img, i):
    t = i - HIT; ev = np.interp(t, [-5, 0, 3, 9], [0, 4, 4, 0]); g = np.interp(t, [-5, 0, 9], [0, 2.5, 0])
    return glow(exposure(img, ev), .55, 30, g)

@fx('Outro White to Black')
def _(img, i):
    t = i - HIT; o = exposure(img, np.interp(t, [0, 1, 3], [0, 5, 5]))
    b = np.interp(t, [0, 3], [0, 60]) * K
    if b > .3: o = cv2.GaussianBlur(o, (0, 0), b)
    return np.clip(o, 0, 1) * np.interp(t, [3, 27], [1, 0])

@fx('Invert Flash')
def _(img, i):
    t = i - HIT; on = t in (0, 1, 5, 8)
    if not on: return img
    inv = 1 - img; g = inv.mean(2, keepdims=True)
    tint = np.array([0x24, 0x1A, 0x0A], np.float32) / 255 * (1 - g) + np.array([0xFF, 0xFF, 0xE8], np.float32) / 255 * g
    return inv * .15 + tint * .85

@fx('BW Strobe')
def _(img, i):
    t = i - HIT; bw = [(0, 4), (7, 11), (13, 17), (20, 30)]
    return contrast(gray(img), 35) if any(a <= t < b for a, b in bw) else img

@fx('Slice Glitch')
def _(img, i):
    t = i - HIT
    if not 0 <= t < 6: return img
    r = np.random.RandomState(i); o = img.copy(); y = 0
    amp = [60, 25, 110, 40, 15, 5][t] * K
    while y < H:
        h = r.randint(6, 60); sh = int(r.uniform(-amp, amp)) if r.rand() < .6 else 0
        o[y:y + h] = np.roll(img[y:y + h], sh, 1); y += h
    return rgb_split(o, 18 * K if t < 5 else 0)

@fx('Block Glitch')
def _(img, i):
    t = i - HIT
    if not 0 <= t < 8: return img
    r = np.random.RandomState(i * 3); o = img.copy(); bs = int(r.choice([80, 120, 160]) * K)
    for _ in range(14):
        x, y = r.randint(0, W - bs), r.randint(0, H - bs); dx, dy = r.randint(-bs, bs), r.randint(-bs, bs)
        xs, ys = np.clip(x + dx, 0, W - bs), np.clip(y + dy, 0, H - bs)
        o[y:y + bs, x:x + bs] = img[ys:ys + bs, xs:xs + bs] * r.uniform(.9, 1.6)
    return rgb_split(o, 18 * K)

@fx('RGB Split Hit')
def _(img, i): t = i - HIT; return rgb_split(img, 18 * K if 0 <= t < 4 else 0)

for k, nm in [('E1', 'CC E1 Cold Teal'), ('E2', 'CC E2 Magenta Night'), ('E3', 'CC E3 Faded Warm Cine')]:
    def mk(k=k):
        cache = {}
        def f(img, i):
            if i < HIT: return img
            if 'o' not in cache: cache['o'] = look(img, LOOKS[k])
            return cache['o']
        return f
    fx(nm, 'antes -> depois')(mk())

def subject_glow(color):
    def f(img, i):
        if i < HIT: return img
        e = cv2.Canny((img * 255).astype(np.uint8), 60, 160).astype(np.float32) / 255
        e = cv2.dilate(e, np.ones((3, 3)))[..., None] * np.array(color, np.float32)[::-1]
        return img + cv2.GaussianBlur(e, (0, 0), 6) * 1.5 + cv2.GaussianBlur(e, (0, 0), 25) * 1.2
    return f
fx('Subject Glow Verde (E1)', 'no AE use com recorte (Roto Brush)')(subject_glow((0.17, 1, 0.54)))
fx('Subject Glow Amarelo (E3)')(subject_glow((1, 0.76, 0.1)))
fx('Eye Glow Vermelho (E2)')(subject_glow((1, 0.06, 0.12)))

@fx('Light Rays BG (E1)')
def _(img, i):
    if i < HIT: return img
    cx, cy = W * .42, H * .22; m = np.clip((img.mean(2, keepdims=True) - .45) * 2, 0, 1) * img
    rays = radial_zoom(m, .9, cx, cy, 24) * 2.2
    tone = gray(img) * np.array([.85, 1, .9], np.float32)
    return img * .65 + tone * .35 + rays * np.array([.9, 1, .85], np.float32)

@fx('Spotlight Halo (E1)')
def _(img, i):
    if i < HIT: return img
    yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt((xx - W / 2) ** 2 + (yy - H * .32) ** 2) / (W * .45)
    halo = np.clip(1 - d, 0, 1)[..., None] ** 1.5 * .93
    return 1 - (1 - img * .55) * (1 - halo * .85)

@fx('Light Streak (E3)')
def _(img, i):
    t = i - HIT
    if t < 0: return img
    a = np.interp(t, [0, 3, 10, 18], [0, .9, .7, 0]); y = np.interp(t, [0, 18], [H * .61, H * .45])
    s = np.zeros((H, W, 3), np.float32); cv2.line(s, (0, int(y)), (W, int(y)), (1, 1, 1), 3)
    s = cv2.GaussianBlur(s, (0, 0), sigmaX=40, sigmaY=2) * 6 + cv2.GaussianBlur(s, (0, 0), 20) * 2
    return img + s * a

@fx('Light Leak (E2)')
def _(img, i):
    t = i - HIT
    if t < 0: return img
    a = np.interp(t, [0, 3, 6, 10], [0, 1, .85, 0]); r = np.random.RandomState(3)
    n = cv2.resize(r.rand(6, 5).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    n = np.roll(n, int(t * 12 * K), 1); n = np.clip((n - .3) * 1.8, 0, 1)[..., None]
    col = n * np.array([0x7A, 0xD2, 0xFF], np.float32) / 255 + (1 - n) * np.array([0x9A, 0x32, 0xC2], np.float32) / 255 * n * 2
    leak = cv2.GaussianBlur(col * n, (0, 0), 30)
    return 1 - (1 - img) * (1 - leak * a)

@fx('Text Shake + Glow', '"THE REACTION"')
def _(img, i):
    o = img.copy(); r = np.random.RandomState(i // 2); j = 4 * K
    t = np.zeros((H, W, 3), np.uint8); cv2.putText(t, 'THE REACTION', (int(W * .2 + r.uniform(-j, j)), int(H * .5 + r.uniform(-j, j))), cv2.FONT_HERSHEY_DUPLEX, 1.5, (255, 255, 255), 3, cv2.LINE_AA); t = t.astype(np.float32) / 255
    return np.maximum(o, t) + cv2.GaussianBlur(t, (0, 0), 8) * .9

def label(frame, k, name, desc):
    f = frame.copy(); cv2.rectangle(f, (0, 0), (W, 62), (0, 0, 0), -1)
    cv2.putText(f, f'{k:02d}. {name}', (12, 28), cv2.FONT_HERSHEY_SIMPLEX, .72, (80, 255, 255), 2, cv2.LINE_AA)
    if desc: cv2.putText(f, desc.encode('ascii', 'ignore').decode()[:70], (12, 52), cv2.FONT_HERSHEY_SIMPLEX, .45, (230, 230, 230), 1, cv2.LINE_AA)
    return f

def enc(path):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path], stdin=subprocess.PIPE)
reel = enc(os.path.join(OUT, '00_TODOS_OS_EFEITOS.mp4'))
for k, (name, desc, f) in enumerate(EFFECTS, 1):
    one = enc(os.path.join(OUT, f'{k:02d}_' + ''.join(c if c.isalnum() else '_' for c in name) + '.mp4'))
    for i in range(SEG):
        fr = (np.clip(f(BASE, i), 0, 1) * 255).astype(np.uint8)
        one.stdin.write(fr.tobytes()); reel.stdin.write(label(fr, k, name, desc).tobytes())
    one.stdin.close(); one.wait()
reel.stdin.close(); reel.wait()
print(len(EFFECTS), 'efeitos')
