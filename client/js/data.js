/* MotionFrame — bibliotecas embutidas (expressões, presets, curvas, efeitos) */
window.MF_DATA = {

  /* Expressões mais usadas — target = propriedade em que é aplicada se nenhuma prop estiver selecionada */
  expressions: [
    { cat: "Movimento", name: "Wiggle (tremer)", target: "position", expr: "wiggle(5, 30)" },
    { cat: "Movimento", name: "Wiggle só no X", target: "position", expr: "w = wiggle(5, 30);\n[w[0], value[1]]" },
    { cat: "Movimento", name: "Flutuar (hover)", target: "position", expr: "amp = 15; freq = 1;\nvalue + [0, Math.sin(time * freq * Math.PI * 2) * amp]" },
    { cat: "Movimento", name: "Pêndulo / balanço", target: "rotation", expr: "amp = 15; freq = 1; decay = 0.6;\namp * Math.sin(freq * time * 2 * Math.PI) / Math.exp(decay * time)" },
    { cat: "Movimento", name: "Rotação contínua", target: "rotation", expr: "time * 90" },
    { cat: "Movimento", name: "Shake de câmera (impacto)", target: "position", expr: "t = time - inPoint; amp = 40 * Math.exp(-6 * t);\nseedRandom(index, false);\nvalue + [wiggle(25, amp)[0] - value[0], wiggle(25, amp)[1] - value[1]]" },
    { cat: "Movimento", name: "Delay seguindo layer acima", target: "position", expr: "d = 0.1;\nthisComp.layer(index - 1).transform.position.valueAtTime(time - d)" },
    { cat: "Movimento", name: "Look At (olhar para layer 1)", target: "rotation", expr: "p = thisComp.layer(1).transform.position;\nv = p - transform.position;\nradiansToDegrees(Math.atan2(v[1], v[0]))" },
    { cat: "Movimento", name: "Stop motion (posterize)", target: "position", expr: "posterizeTime(8);\nvalue" },

    { cat: "Keyframes", name: "Loop (cycle)", target: "position", expr: "loopOut(\"cycle\")" },
    { cat: "Keyframes", name: "Loop ping-pong", target: "position", expr: "loopOut(\"pingpong\")" },
    { cat: "Keyframes", name: "Loop offset (continua)", target: "position", expr: "loopOut(\"offset\")" },
    { cat: "Keyframes", name: "Inércia / Bounce", target: "scale", expr: "amp = .06; freq = 3; decay = 6;\nn = 0;\nif (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\nif (n == 0) { t = 0; } else { t = time - key(n).time; }\nif (n > 0 && t < 1) {\n  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n} else { value; }" },
    { cat: "Keyframes", name: "Bounce de queda (gravidade)", target: "position", expr: "e = .6; g = 4000; nMax = 6;\nn = 0;\nif (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\nif (n > 0) {\n  t = time - key(n).time;\n  v = -velocityAtTime(key(n).time - .001) * e;\n  vl = length(v);\n  if (value instanceof Array) { vu = (vl > 0) ? normalize(v) : [0,0,0]; } else { vu = (v < 0) ? -1 : 1; }\n  tCur = 0; segDur = 2 * vl / g; tNext = segDur; nb = 1;\n  while (tNext < t && nb <= nMax) { vl *= e; segDur *= e; tCur = tNext; tNext += segDur; nb++; }\n  if (nb <= nMax) { delta = t - tCur; value + vu * delta * (vl - g * delta / 2); } else { value; }\n} else { value; }" },
    { cat: "Keyframes", name: "Squash & stretch", target: "scale", expr: "maxDev = 13; spd = 30; decay = 1.0;\nt = time - inPoint;\nx = value[0] + maxDev * Math.sin(spd * t) / Math.exp(decay * t);\ny = value[0] * value[1] / x;\n[x, y]" },

    { cat: "Texto", name: "Máquina de escrever", target: "sourceText", expr: "speed = 15;\nt = Math.max(0, time - inPoint);\ntext.sourceText.substr(0, Math.floor(t * speed))" },
    { cat: "Texto", name: "Máquina de escrever + cursor", target: "sourceText", expr: "speed = 15;\nt = Math.max(0, time - inPoint);\ns = text.sourceText.substr(0, Math.floor(t * speed));\ns + ((Math.floor(time * 2) % 2) ? \"|\" : \" \")" },
    { cat: "Texto", name: "Contador de números", target: "sourceText", expr: "start = 0; end = 1000; dur = 2; dec = 0;\nt = linear(time - inPoint, 0, dur, start, end);\nt.toFixed(dec).replace(/\\B(?=(\\d{3})+(?!\\d))/g, \".\")" },
    { cat: "Texto", name: "Letras aleatórias (decode)", target: "sourceText", expr: "src = text.sourceText; dur = 1.2;\nchars = \"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&\";\nn = Math.floor(linear(time - inPoint, 0, dur, 0, src.length));\nseedRandom(Math.floor(time * 20), true);\nout = src.substr(0, n);\nfor (i = n; i < src.length; i++) out += src[i] == \" \" ? \" \" : chars[Math.floor(random(chars.length))];\nout" },
    { cat: "Texto", name: "Palavra por palavra", target: "sourceText", expr: "wps = 3;\nw = text.sourceText.split(\" \");\nn = Math.min(w.length, Math.floor((time - inPoint) * wps) + 1);\nw.slice(0, n).join(\" \")" },
    { cat: "Texto", name: "Relógio / timer (mm:ss)", target: "sourceText", expr: "t = Math.max(0, time - inPoint);\nm = Math.floor(t / 60); s = Math.floor(t % 60);\n(m < 10 ? \"0\" : \"\") + m + \":\" + (s < 10 ? \"0\" : \"\") + s" },
    { cat: "Texto", name: "MAIÚSCULAS automáticas", target: "sourceText", expr: "text.sourceText.toUpperCase()" },
    { cat: "Texto", name: "Data de hoje", target: "sourceText", expr: "d = new Date(Date(0));\nd.getDate() + \"/\" + (d.getMonth() + 1) + \"/\" + d.getFullYear()" },

    { cat: "Opacidade", name: "Fade in/out automático", target: "opacity", expr: "f = 0.3;\nt1 = linear(time, inPoint, inPoint + f, 0, 100);\nt2 = linear(time, outPoint - f, outPoint, 100, 0);\nMath.min(t1, t2)" },
    { cat: "Opacidade", name: "Piscar (blink)", target: "opacity", expr: "freq = 4;\nMath.sin(time * freq * Math.PI * 2) > 0 ? 100 : 0" },
    { cat: "Opacidade", name: "Flicker aleatório", target: "opacity", expr: "seedRandom(Math.floor(time * 24), true);\nrandom() > .15 ? 100 : random(10, 50)" },
    { cat: "Opacidade", name: "Fade por distância da câmera", target: "opacity", expr: "c = thisComp.activeCamera;\nd = length(toWorld(anchorPoint), c.toWorld([0,0,0]));\nlinear(d, 500, 3000, 100, 0)" },

    { cat: "Escala", name: "Pulsar no ritmo (BPM)", target: "scale", expr: "bpm = 120; amt = 8;\nb = (time * bpm / 60) % 1;\ns = amt * Math.exp(-b * 8);\nvalue + [s, s]" },
    { cat: "Escala", name: "Escala pelo áudio (Audio Amplitude)", target: "scale", expr: "a = thisComp.layer(\"Audio Amplitude\").effect(\"Both Channels\")(\"Slider\");\ns = linear(a, 0, 30, 100, 130);\n[s, s]" },
    { cat: "Escala", name: "Escala proporcional ao comp", target: "scale", expr: "s = thisComp.width / 1920 * 100;\n[s, s]" },

    { cat: "Shape/Layout", name: "Caixa que acompanha o texto (Size)", target: "ADBE Vector Rect Size", expr: "L = thisComp.layer(index - 1); pad = 40;\nr = L.sourceRectAtTime(time, false);\n[r.width + pad * 2, r.height + pad]" },
    { cat: "Shape/Layout", name: "Anchor no centro do texto", target: "anchor", expr: "r = sourceRectAtTime(time, false);\n[r.left + r.width / 2, r.top + r.height / 2]" },
    { cat: "Shape/Layout", name: "Grudar no canto inferior", target: "position", expr: "m = 60;\n[thisComp.width / 2, thisComp.height - m]" },
    { cat: "Shape/Layout", name: "Parallax (z = profundidade)", target: "position", expr: "depth = 0.3;\nc = thisComp.layer(\"MF Null\").transform.position;\nvalue + (c - [thisComp.width/2, thisComp.height/2]) * depth" }
  ],

  /* Presets procedurais (aplicados via ExtendScript, sem precisar de .ffx) */
  motion: [
    { cat: "Entrada", id: "in_fade", name: "Fade In", icon: "◐" },
    { cat: "Entrada", id: "in_pop", name: "Pop (overshoot)", icon: "✦" },
    { cat: "Entrada", id: "in_slideUp", name: "Slide Up", icon: "↑" },
    { cat: "Entrada", id: "in_slideLeft", name: "Slide da direita", icon: "←" },
    { cat: "Entrada", id: "in_zoom", name: "Zoom Punch", icon: "⊕" },
    { cat: "Entrada", id: "in_rotate", name: "Spin In", icon: "↻" },
    { cat: "Entrada", id: "in_blur", name: "Blur In", icon: "≋" },
    { cat: "Saída", id: "out_fade", name: "Fade Out", icon: "◑" },
    { cat: "Saída", id: "out_pop", name: "Pop Out", icon: "✧" },
    { cat: "Saída", id: "out_slideDown", name: "Slide Down", icon: "↓" },
    { cat: "Loop/FX", id: "zoom_slow", name: "Zoom lento (Ken Burns)", icon: "⤢" },
    { cat: "Loop/FX", id: "shake", name: "Shake", icon: "≈" },
    { cat: "Loop/FX", id: "shake_rot", name: "Shake rotação", icon: "∿" },
    { cat: "Loop/FX", id: "bounce", name: "Bounce (inércia)", icon: "⌇" },
    { cat: "Loop/FX", id: "flash", name: "Flash de exposição", icon: "☀" },
    { cat: "Loop/FX", id: "glitch", name: "Glitch", icon: "▦" },
    { cat: "Loop/FX", id: "fx_glow", name: "Deep Glow", icon: "✺" },
    { cat: "Transições", id: "tr_zoomIn", name: "Zoom In", icon: "⊙" },
    { cat: "Transições", id: "tr_zoomOut", name: "Zoom Out", icon: "⊚" },
    { cat: "Transições", id: "tr_slideLeft", name: "Slide", icon: "⇠" },
    { cat: "Transições", id: "tr_slideUp", name: "Slide Up", icon: "⇡" },
    { cat: "Transições", id: "tr_whip", name: "Whip Pan", icon: "⇢" },
    { cat: "Transições", id: "tr_spin", name: "Spin", icon: "⟳" },
    { cat: "Transições", id: "tr_flash", name: "Flash", icon: "✷" },
    { cat: "Transições", id: "tr_blur", name: "Blur", icon: "◌" }
  ],

  /* Curvas (cubic-bezier x1,y1,x2,y2) */
  curves: [
    { name: "Linear", v: [0, 0, 1, 1] },
    { name: "Easy Ease", v: [0.333, 0, 0.667, 1] },
    { name: "Ease Out", v: [0, 0, 0.2, 1] },
    { name: "Ease In", v: [0.8, 0, 1, 1] },
    { name: "Expo", v: [0.87, 0, 0.13, 1] },
    { name: "Quint", v: [0.83, 0, 0.17, 1] },
    { name: "Smooth", v: [0.45, 0, 0.55, 1] },
    { name: "Snap Out", v: [0.05, 0.7, 0.1, 1] },
    { name: "Slow In", v: [0.9, 0, 0.6, 1] },
    { name: "Speed Ramp", v: [0.95, 0, 0.05, 1] }
  ],

  /* Efeitos favoritos rápidos (matchName) */
  effects: [
    { name: "Gaussian Blur", mn: "ADBE Gaussian Blur 2" },
    { name: "Directional Blur", mn: "ADBE Motion Blur" },
    { name: "Glow", mn: "ADBE Glo2" },
    { name: "Drop Shadow", mn: "ADBE Drop Shadow" },
    { name: "Fill", mn: "ADBE Fill" },
    { name: "Tint", mn: "ADBE Tint" },
    { name: "Curves", mn: "ADBE CurvesCustom" },
    { name: "Lumetri Color", mn: "ADBE Lumetri" },
    { name: "Exposure", mn: "ADBE Exposure2" },
    { name: "Transform", mn: "ADBE Geometry2" },
    { name: "Motion Tile", mn: "ADBE Tile" },
    { name: "Turbulent Displace", mn: "ADBE Turbulent Displace" },
    { name: "Wave Warp", mn: "ADBE Wave Warp" },
    { name: "Fractal Noise", mn: "ADBE Fractal Noise" },
    { name: "Noise", mn: "ADBE Noise" },
    { name: "Timewarp", mn: "ADBE Timewarp" },
    { name: "Pixel Motion Blur", mn: "ADBE PixelMotionBlur" },
    { name: "Optics Compensation", mn: "ADBE Optics Compensation" },
    { name: "Slider Control", mn: "ADBE Slider Control" },
    { name: "Deep Glow (plugin)", mn: "Deep Glow" }
  ],

  cc: [
    { id: "teal_orange", name: "Teal & Orange" },
    { id: "bw_contrast", name: "P&B contraste" },
    { id: "warm", name: "Quente" },
    { id: "cold", name: "Frio" },
    { id: "vibrant", name: "Vibrante" },
    { id: "faded", name: "Faded / Film" },
    { id: "vignette", name: "Vinheta" },
    { id: "lumetri", name: "Lumetri vazio" }
  ],

  bodyParts: ["subject", "corpo inteiro", "cabeça", "rosto", "cabelo", "braço", "mão", "perna", "pé", "tronco", "roupa"]
};
