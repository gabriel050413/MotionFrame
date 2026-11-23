#!/usr/bin/env python3
"""
MotionFrame AI Server
---------------------
Servidor local (http://127.0.0.1:5717) usado pelo painel do After Effects para:
  * /transcribe   legendas automáticas (faster-whisper, timestamps por palavra)
  * /facetrack    rastreio automático do rosto/cabeça (MediaPipe ou OpenCV)
  * /removebg     remover fundo / extrair partes do corpo (rembg + CLIPSeg por texto)
  * /inpaint      remover pessoas/objetos da imagem com IA (LaMa ou OpenCV)
  * /download     baixar mídias do YouTube, TikTok, Instagram, X... (yt-dlp)
  * /search       pesquisar vídeos (YouTube) para baixar
Tarefas longas viram "jobs": o POST devolve {"job": id} e o painel consulta GET /job/<id>.

Só escuta em 127.0.0.1. Todas as dependências são opcionais e carregadas sob demanda;
GET /health mostra o que está instalado.
"""
import json
import os
import sys
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST, PORT = "127.0.0.1", int(os.environ.get("MF_PORT", "5717"))
JOBS = {}
JOBS_LOCK = threading.Lock()
_CACHE = {}

# ---------------------------------------------------------------------------
# util
# ---------------------------------------------------------------------------

def has(mod):
    try:
        __import__(mod)
        return True
    except Exception:
        return False


def out_dir():
    d = os.environ.get("MF_OUT") or os.path.join(os.path.expanduser("~"), "MotionFrame")
    os.makedirs(d, exist_ok=True)
    return d


def new_job(fn, payload):
    jid = uuid.uuid4().hex[:10]
    with JOBS_LOCK:
        JOBS[jid] = {"status": "running", "progress": 0, "message": "Iniciando...", "result": None, "error": None}

    def progress(p, msg=None):
        with JOBS_LOCK:
            JOBS[jid]["progress"] = round(float(p), 1)
            if msg:
                JOBS[jid]["message"] = msg

    def run():
        try:
            res = fn(payload, progress)
            with JOBS_LOCK:
                JOBS[jid].update(status="done", progress=100, result=res, message="Concluído")
        except Exception as e:  # noqa
            traceback.print_exc()
            with JOBS_LOCK:
                JOBS[jid].update(status="error", error=str(e), message=str(e))

    threading.Thread(target=run, daemon=True).start()
    return jid


# ---------------------------------------------------------------------------
# PT -> EN para prompts de segmentação (CLIPSeg entende inglês)
# ---------------------------------------------------------------------------
PT_EN = {
    "corpo inteiro": "person", "corpo": "person", "pessoa": "person", "pessoas": "person", "humano": "person",
    "cabeça": "head", "cabeca": "head", "rosto": "face", "cara": "face", "cabelo": "hair",
    "braço": "arm", "braco": "arm", "braços": "arms", "bracos": "arms", "mão": "hand", "mao": "hand", "mãos": "hands",
    "perna": "leg", "pernas": "legs", "pé": "foot", "pe": "foot", "pés": "feet", "tronco": "torso",
    "roupa": "clothes", "camisa": "shirt", "camiseta": "t-shirt", "calça": "pants", "calca": "pants",
    "sapato": "shoes", "tênis": "sneakers", "olhos": "eyes", "boca": "mouth", "carro": "car",
    "céu": "sky", "ceu": "sky", "chão": "floor", "chao": "floor", "árvore": "tree", "arvore": "tree",
    "cachorro": "dog", "gato": "cat", "fundo": "background", "texto": "text", "logo": "logo", "objeto": "object",
}


def to_en(prompt):
    p = prompt.strip().lower()
    if p in PT_EN:
        return PT_EN[p]
    words = [PT_EN.get(w, w) for w in p.replace(",", " ").split()]
    return " ".join(words)


# ---------------------------------------------------------------------------
# Legendas
# ---------------------------------------------------------------------------

def load_audio(path, sr=16000):
    """Decodifica qualquer vídeo/áudio para float32 mono 16 kHz usando o ffmpeg (mais robusto que PyAV)."""
    import shutil
    import subprocess

    import numpy as np

    ff = shutil.which("ffmpeg")
    if not ff:
        try:
            import imageio_ffmpeg  # pip install imageio-ffmpeg (traz um ffmpeg embutido)
            ff = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            return path  # deixa o faster-whisper decodificar sozinho
    cmd = [ff, "-nostdin", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def job_transcribe(o, progress):
    from faster_whisper import WhisperModel  # pip install faster-whisper

    path = o["path"]
    model_name = o.get("model", "small")
    key = ("whisper", model_name)
    if key not in _CACHE:
        progress(2, f"Carregando modelo Whisper '{model_name}'...")
        device = "cuda" if o.get("gpu") else "cpu"
        _CACHE[key] = WhisperModel(model_name, device=device, compute_type="int8" if device == "cpu" else "float16")
    model = _CACHE[key]
    progress(5, "Transcrevendo áudio...")
    lang = o.get("lang") or None
    task = "translate" if o.get("translate") else "transcribe"
    audio = load_audio(path)
    segments, info = model.transcribe(audio, language=lang, task=task, word_timestamps=True, vad_filter=True)
    dur = max(info.duration or 1, 1)
    words = []
    for seg in segments:
        for w in (seg.words or []):
            words.append({"start": w.start, "end": w.end, "text": w.word.strip()})
        progress(5 + 90 * min(1, seg.end / dur), f"Transcrevendo... {int(seg.end)}s / {int(dur)}s")
    max_words = int(o.get("maxWords", 3))
    max_chars = int(o.get("maxChars", 22))
    caps, cur = [], []
    for w in words:
        cand = " ".join(x["text"] for x in cur + [w])
        gap = cur and (w["start"] - cur[-1]["end"] > 0.6)
        if cur and (len(cur) >= max_words or len(cand) > max_chars or gap):
            caps.append({"start": cur[0]["start"], "end": cur[-1]["end"], "text": " ".join(x["text"] for x in cur)})
            cur = []
        cur.append(w)
    if cur:
        caps.append({"start": cur[0]["start"], "end": cur[-1]["end"], "text": " ".join(x["text"] for x in cur)})
    # estende cada legenda até a próxima (sem buracos piscando)
    for i in range(len(caps) - 1):
        if caps[i + 1]["start"] - caps[i]["end"] < 0.4:
            caps[i]["end"] = caps[i + 1]["start"]
    return {"segments": caps, "words": words, "language": info.language}


# ---------------------------------------------------------------------------
# Face tracking
# ---------------------------------------------------------------------------

def _face_detector():
    if "face" in _CACHE:
        return _CACHE["face"]
    import cv2
    det = None
    try:
        import mediapipe as mp  # pip install mediapipe
        fd = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

        def det(frame_bgr):
            r = fd.process(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
            if not r.detections:
                return None
            best = max(r.detections, key=lambda d: d.location_data.relative_bounding_box.width)
            b = best.location_data.relative_bounding_box
            return (b.xmin + b.width / 2, b.ymin + b.height / 2, b.height)
    except Exception:
        casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        def det(frame_bgr):
            h, w = frame_bgr.shape[:2]
            g = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
            faces = casc.detectMultiScale(g, 1.15, 5, minSize=(int(h * 0.05), int(h * 0.05)))
            if len(faces) == 0:
                return None
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            return ((x + fw / 2) / w, (y + fh / 2) / h, fh / h)
    _CACHE["face"] = det
    return det


def job_facetrack(o, progress):
    import cv2

    cap = cv2.VideoCapture(o["path"])
    if not cap.isOpened():
        raise RuntimeError("Não foi possível abrir o vídeo.")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    t0 = float(o.get("start", 0))
    t1 = float(o.get("end", total / fps if total else 0)) or total / fps
    step = max(1, int(o.get("step", 2)))  # analisa 1 a cada N frames
    det = _face_detector()
    f0, f1 = int(t0 * fps), int(t1 * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, f0)
    raw, fi = [], f0
    while fi <= f1:
        ok, frame = cap.read()
        if not ok:
            break
        if (fi - f0) % step == 0:
            r = det(frame)
            raw.append((fi / fps, r))
            progress(100 * (fi - f0) / max(1, f1 - f0), f"Rastreando rosto... frame {fi}")
        fi += 1
    cap.release()
    # preenche buracos (mantém último valor) e suaviza
    pts, last = [], None
    first = next((r for _, r in raw if r), None)
    if first is None:
        raise RuntimeError("Nenhum rosto encontrado no trecho.")
    for t, r in raw:
        r = r or last or first
        last = r
        pts.append([t, r[0], r[1], r[2]])
    k = int(o.get("smooth", 2))
    sm = []
    for i in range(len(pts)):
        a, b = max(0, i - k), min(len(pts), i + k + 1)
        win = pts[a:b]
        sm.append({"t": pts[i][0], "x": sum(p[1] for p in win) / len(win), "y": sum(p[2] for p in win) / len(win),
                   "s": sum(p[3] for p in win) / len(win)})
    found = sum(1 for _, r in raw if r)
    return {"fps": fps, "points": sm, "found": found, "analyzed": len(raw)}


# ---------------------------------------------------------------------------
# Segmentação / remoção de fundo
# ---------------------------------------------------------------------------

def _rembg_mask(img, model="isnet-general-use"):
    from rembg import new_session, remove  # pip install rembg

    key = ("rembg", model)
    if key not in _CACHE:
        _CACHE[key] = new_session(model)
    rgba = remove(img, session=_CACHE[key])
    return rgba.split()[-1]


def _clipseg_mask(img, prompt, threshold=0.35):
    import numpy as np
    import torch
    from PIL import Image
    from transformers import CLIPSegForImageSegmentation, CLIPSegProcessor

    if "clipseg" not in _CACHE:
        name = "CIDAS/clipseg-rd64-refined"
        _CACHE["clipseg"] = (CLIPSegProcessor.from_pretrained(name), CLIPSegForImageSegmentation.from_pretrained(name))
    proc, model = _CACHE["clipseg"]
    prompts = [to_en(p) for p in prompt.split("+") if p.strip()] or ["person"]
    inp = proc(text=prompts, images=[img.convert("RGB")] * len(prompts), padding=True, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inp).logits
    if logits.ndim == 2:
        logits = logits.unsqueeze(0)
    prob = torch.sigmoid(logits).max(dim=0).values.numpy()
    prob = (prob - prob.min()) / max(1e-6, prob.max() - prob.min())
    m = Image.fromarray((prob * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    arr = np.array(m).astype(np.float32) / 255
    # transição suave em volta do threshold
    arr = np.clip((arr - threshold) / 0.15 + 0.5, 0, 1)
    return Image.fromarray((arr * 255).astype(np.uint8))


def _refine(mask, img):
    """Recorta a máscara grosseira do CLIPSeg pela silhueta precisa do rembg."""
    import numpy as np
    from PIL import Image

    try:
        sil = np.array(_rembg_mask(img, "u2net_human_seg")).astype(np.float32) / 255
        m = np.array(mask).astype(np.float32) / 255
        return Image.fromarray((np.minimum(m, sil) * 255).astype(np.uint8))
    except Exception:
        return mask


def job_removebg(o, progress):
    from PIL import Image, ImageFilter

    img = Image.open(o["image"]).convert("RGBA")
    part = (o.get("part") or "subject").strip()
    progress(10, "Segmentando...")
    if part in ("subject", "tudo", "objeto principal"):
        mask = _rembg_mask(img, o.get("model", "isnet-general-use"))
    elif part in ("person", "corpo inteiro", "corpo", "pessoa"):
        mask = _rembg_mask(img, "u2net_human_seg")
    else:
        mask = _clipseg_mask(img, part, float(o.get("threshold", 0.35)))
        if o.get("refine", True):
            mask = _refine(mask, img)
    progress(80, "Gerando PNG...")
    if o.get("feather"):
        mask = mask.filter(ImageFilter.GaussianBlur(float(o["feather"])))
    if o.get("invert"):  # "remover" a parte em vez de "manter"
        from PIL import ImageOps
        mask = ImageOps.invert(mask)
    img.putalpha(mask)
    base = os.path.splitext(os.path.basename(o["image"]))[0]
    dst = os.path.join(out_dir(), f"{base}_{part.replace(' ', '_')}_{int(time.time())}.png")
    img.save(dst)
    if o.get("saveMask"):
        mask.save(dst.replace(".png", "_mask.png"))
    return {"path": dst}


def job_inpaint(o, progress):
    import numpy as np
    from PIL import Image, ImageFilter

    img = Image.open(o["image"]).convert("RGB")
    target = o.get("target") or "person"
    progress(10, "Detectando o que remover...")
    if o.get("mask"):
        mask = Image.open(o["mask"]).convert("L")
    elif to_en(target) == "person":
        mask = _rembg_mask(img, "u2net_human_seg")
    else:
        mask = _clipseg_mask(img, target, float(o.get("threshold", 0.3)))
    grow = int(o.get("grow", 15))
    mask = mask.point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(grow * 2 + 1))
    progress(40, "Preenchendo com IA...")
    result = None
    try:
        from simple_lama_inpainting import SimpleLama  # pip install simple-lama-inpainting

        if "lama" not in _CACHE:
            _CACHE["lama"] = SimpleLama()
        result = _CACHE["lama"](img, mask)
    except Exception:
        import cv2

        arr = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        res = cv2.inpaint(arr, np.array(mask), 9, cv2.INPAINT_TELEA)
        result = Image.fromarray(cv2.cvtColor(res, cv2.COLOR_BGR2RGB))
    result = result.resize(img.size)
    base = os.path.splitext(os.path.basename(o["image"]))[0]
    dst = os.path.join(out_dir(), f"{base}_clean_{int(time.time())}.png")
    result.save(dst)
    return {"path": dst}


# ---------------------------------------------------------------------------
# Download de mídia (yt-dlp)
# ---------------------------------------------------------------------------

def job_download(o, progress):
    import yt_dlp  # pip install yt-dlp

    folder = o.get("folder") or os.path.join(out_dir(), "Downloads")
    os.makedirs(folder, exist_ok=True)
    fmt = o.get("format", "mp4")
    files = []

    def hook(d):
        if d["status"] == "downloading":
            tot = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if tot:
                progress(95 * d.get("downloaded_bytes", 0) / tot, f"Baixando... {d.get('_percent_str', '').strip()}")
        elif d["status"] == "finished":
            files.append(d.get("filename"))

    opts = {
        "outtmpl": os.path.join(folder, "%(title).80s [%(id)s].%(ext)s"),
        "progress_hooks": [hook],
        "noplaylist": not o.get("playlist"),
        "quiet": True,
        "restrictfilenames": False,
    }
    if fmt == "mp3":
        opts.update(format="bestaudio/best", postprocessors=[{"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}])
    elif fmt == "wav":
        opts.update(format="bestaudio/best", postprocessors=[{"key": "FFmpegExtractAudio", "preferredcodec": "wav"}])
    else:
        # H.264 + AAC em MP4: o formato que o After Effects importa sem dor de cabeça
        h = int(o.get("maxHeight", 1080))
        opts.update(format=f"bv*[vcodec^=avc1][height<={h}]+ba[ext=m4a]/b[ext=mp4][height<={h}]/bv*+ba/b",
                    merge_output_format="mp4")
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(o["url"], download=True)
        final = ydl.prepare_filename(info)
    base = os.path.splitext(final)[0]
    for ext in (".mp4", ".mp3", ".wav", ".m4a", ".webm", ".mkv", ".mov"):
        if os.path.exists(base + ext):
            final = base + ext
            break
    return {"path": final, "title": info.get("title"), "duration": info.get("duration")}


def do_search(o):
    import yt_dlp

    q = o.get("query", "").strip()
    n = int(o.get("limit", 12))
    with yt_dlp.YoutubeDL({"quiet": True, "extract_flat": True, "skip_download": True}) as ydl:
        info = ydl.extract_info(f"ytsearch{n}:{q}", download=False)
    res = []
    for e in info.get("entries", []):
        thumbs = e.get("thumbnails") or []
        res.append({"title": e.get("title"), "url": e.get("url") or f"https://www.youtube.com/watch?v={e.get('id')}",
                    "duration": e.get("duration"), "channel": e.get("channel") or e.get("uploader"),
                    "thumb": thumbs[-1]["url"] if thumbs else None})
    return {"results": res}


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
JOB_ROUTES = {"/transcribe": job_transcribe, "/facetrack": job_facetrack, "/removebg": job_removebg,
              "/inpaint": job_inpaint, "/download": job_download}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stderr.write("[mf] " + fmt % args + "\n")

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {
                "ok": True, "version": "1.0.0", "out": out_dir(),
                "features": {
                    "transcribe": has("faster_whisper"), "facetrack": has("cv2"), "mediapipe": has("mediapipe"),
                    "removebg": has("rembg"), "clipseg": has("transformers") and has("torch"),
                    "lama": has("simple_lama_inpainting"), "download": has("yt_dlp"),
                }})
        if self.path.startswith("/job/"):
            jid = self.path.split("/")[-1]
            with JOBS_LOCK:
                j = JOBS.get(jid)
                j = dict(j) if j else None
            return self._send(200 if j else 404, j or {"error": "job não encontrado"})
        self._send(404, {"error": "rota desconhecida"})

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
            if self.path in JOB_ROUTES:
                return self._send(200, {"job": new_job(JOB_ROUTES[self.path], payload)})
            if self.path == "/search":
                return self._send(200, do_search(payload))
            self._send(404, {"error": "rota desconhecida"})
        except Exception as e:  # noqa
            traceback.print_exc()
            self._send(500, {"error": str(e)})


def main():
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"MotionFrame AI server em http://{HOST}:{PORT}  (saída: {out_dir()})", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
