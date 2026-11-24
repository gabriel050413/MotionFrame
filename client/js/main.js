/* MagicTouch — lógica do painel */
(function () {
  "use strict";
  var H = window.MFHost, D = window.MF_DATA;
  var SRV = "http://127.0.0.1:5717";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var val = function (id) { return document.getElementById(id).value; };
  var num = function (id) { return parseFloat(val(id)) || 0; };
  var chk = function (id) { return document.getElementById(id).checked; };

  /* ---------------- armazenamento persistente (arquivo JSON via Node, ou localStorage) ---------------- */
  var store = (function () {
    var req = H.nodeRequire, file = null, cache = {};
    if (req && H.userDataPath()) {
      try {
        var path = req("path"), fs = req("fs"), dir = path.join(H.userDataPath(), "MagicTouch");
        fs.mkdirSync(dir, { recursive: true }); file = path.join(dir, "settings.json");
        if (fs.existsSync(file)) cache = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (e) { file = null; }
    }
    if (!file) { try { cache = JSON.parse(localStorage.getItem("mt") || "{}"); } catch (e) { cache = {}; } }
    function save() {
      try { if (file) req("fs").writeFileSync(file, JSON.stringify(cache)); else localStorage.setItem("mt", JSON.stringify(cache)); } catch (e) {}
    }
    return { get: function (k, d) { return cache[k] === undefined ? d : cache[k]; }, set: function (k, v) { cache[k] = v; save(); } };
  })();

  /* ---------------- UI básica ---------------- */
  var toastT;
  function toast(msg, isErr) {
    var t = $("#toast"); t.textContent = msg; t.className = "show" + (isErr ? " err" : "");
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = ""; }, 3200);
  }
  function run(fn, arg, okMsg) {
    return H.call(fn, arg).then(function (r) { if (okMsg) toast(typeof okMsg === "function" ? okMsg(r) : okMsg); return r; })
      .catch(function (e) { toast(e.message, true); throw e; });
  }
  function go(view) {
    $$(".view").forEach(function (v) { v.classList.toggle("active", v.dataset.view === view); });
    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.go === view); });
    store.set("view", view);
    if (view === "home") refreshInfo();
  }
  $$("#nav button").forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });

  /* tiles da home + busca */
  var TOOLS = [
    { g: "Importar", v: "links", i: "link", t: "Importar projeto", d: "Link do Drive/Dropbox ou .zip/.rar", k: "link drive dropbox zip rar importar projeto aep ai ffx pacote" },
    { g: "Importar", v: "pack", i: "box", t: "Presets .ffx", d: "Cria um projeto com todos os presets", k: "ffx preset projeto automatico zip rar salvar exportar" },
    { g: "Importar", v: "media", i: "download", t: "Baixar vídeo/música", d: "YouTube, TikTok, Instagram…", k: "download baixar youtube tiktok instagram media musica" },
    { g: "Importar", v: "missing", i: "alert", t: "Mídias ausentes", d: "Encontre e substitua arquivos offline", k: "missing midia ausente offline relink substituir" },
    { g: "Animar", v: "motion", i: "sparkle", t: "Animações", d: "Entradas, saídas, transições, shake", k: "motion bro animacao transicao shake glitch zoom pop texto" },
    { g: "Animar", v: "keys", i: "diamond", t: "Keyframes no clip", d: "Ajusta a animação ao tamanho do clip", k: "keyframe proporcional preset ffx esticar" },
    { g: "Animar", v: "flow", i: "curve", t: "Curvas (Flow)", d: "Suavize os keyframes", k: "flow curva ease bezier grafico speed" },
    { g: "Animar", v: "expr", i: "braces", t: "Expressões", d: "Wiggle, loop, typewriter…", k: "expressao expression wiggle loop typewriter" },
    { g: "IA", v: "captions", i: "cc", t: "Legendas automáticas", d: "Com glow seguindo a cabeça", k: "legenda caption subtitle whisper tracking rosto cabeca" },
    { g: "IA", v: "ai", i: "wand", t: "Remover fundo / pessoas", d: "Do frame atual", k: "fundo background remover pessoa ia inpaint corpo braco cabeca" },
    { g: "Projeto", v: "layer", i: "layers", t: "Layers", d: "Criar, cortar, congelar, speed ramp", k: "null solid split cortar reverse freeze ramp twixtor velocidade comp" },
    { g: "Projeto", v: "align", i: "target", t: "Alinhar", d: "Anchor point e centralizar", k: "anchor ancora alinhar centralizar fit fill" },
    { g: "Projeto", v: "effects", i: "sliders", t: "Efeitos e cor", d: "Favoritos, seu efeito, cores", k: "efeito fx glow blur cor cc lumetri proprio" },
    { g: "Projeto", v: "organize", i: "folder", t: "Organizar projeto", d: "Renomeia, colore e agrupa layers", k: "organizar projeto renomear cor pasta precompor" },
    { g: "Projeto", v: "render", i: "play", t: "Render e IA", d: "Exportar e status do servidor", k: "render exportar prores sessao tempo servidor cache versao" }
  ];
  var lastG = "";
  $("#tiles").innerHTML = TOOLS.map(function (t) {
    var head = t.g !== lastG ? '<h3 class="tg-head">' + t.g + "</h3>" : ""; lastG = t.g;
    return head + '<button class="tile" data-go="' + t.v + '"><span class="ti">' + window.MT_ICON(t.i) + "</span><span class='tt'><b>" + t.t + "</b><small>" + t.d + "</small></span><span class='chev'>›</span></button>";
  }).join("");
  $$("#tiles .tile").forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
  $("#search").addEventListener("input", function () {
    var q = this.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    go("home");
    $$("#tiles .tile").forEach(function (b, i) {
      var t = TOOLS[i], hay = (t.t + " " + t.d + " " + t.k + " " + b.textContent).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      b.style.display = !q || hay.indexOf(q) >= 0 ? "" : "none";
    });
    $$("#tiles .tg-head").forEach(function (h) { h.style.display = q ? "none" : ""; });
  });
  $("#search").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var f = $$("#tiles .tile").filter(function (b) { return b.style.display !== "none"; })[0]; if (f) { go(f.dataset.go); this.value = ""; } }
  });
  function refreshInfo() {
    H.call("mf_info").then(function (r) {
      $("#compInfo").textContent = r.preview ? "Modo preview (fora do After Effects)" :
        "AE " + r.version + " · " + r.project + (r.comp ? " · " + r.comp + " " + r.w + "×" + r.h + " @" + Math.round(r.fps * 100) / 100 + "fps · " + r.sel + " sel." : "");
    }).catch(function (e) { $("#compInfo").textContent = e.message; toast(e.message, true); });
  }

  /* ---------------- Servidor de IA ---------------- */
  var S = window.MTServer, srvOnline = false, starting = null;
  function srvLog(line) {
    var el = $("#srvLog"); if (!el) return;
    el.textContent = (el.textContent + line + "\n").split("\n").slice(-80).join("\n");
    el.scrollTop = el.scrollHeight;
  }
  /* status com tolerância: só marca offline depois de 2 falhas seguidas (e nunca durante um processamento) */
  var hFails = 0, activeJobs = 0;
  function setStatus(state) {
    $("#srvDot").className = "dot" + (state === "on" ? " on" : state === "busy" ? " busy" : "");
    $("#srvTxt").textContent = state === "on" ? "IA online" : state === "busy" ? "IA ocupada" : state === "starting" ? "Iniciando IA..." : "IA offline";
  }
  function health() {
    return S.http("GET", "/health", undefined, 8000).then(function (h) {
      hFails = 0; srvOnline = true;
      setStatus(h.busy || activeJobs ? "busy" : "on");
      $("#health").innerHTML = Object.keys(h.features).map(function (k) { return '<span class="' + (h.features[k] ? "y" : "n") + '">' + k + "</span>"; }).join(" ") + "<br>Saída: " + esc(h.out);
      return h;
    }).catch(function () {
      hFails++;
      if (starting) return setStatus("starting");
      if (activeJobs && hFails < 6) return setStatus("busy");     // processando pesado: dá mais tempo
      if (hFails < 2) return;                                      // uma falha isolada não derruba o status
      srvOnline = false; setStatus("off");
      $("#health").textContent = "Servidor parado. Clique em Iniciar (veja README para instalar as dependências).";
    });
  }
  function startServer() {
    if (starting) return starting;
    var path = H.nodeRequire ? H.nodeRequire("path") : null;
    var script = path ? path.join(H.extensionPath(), "server", "mt_server.py") : "";
    setStatus("starting");
    srvLog("— " + new Date().toLocaleTimeString() + " · pasta da extensão: " + H.extensionPath());
    starting = new Promise(function (resolve, reject) {
      S.start({
        script: script, python: val("pyPath") || store.get("py"), log: srvLog,
        onReady: function (cmd) { if (cmd) store.set("py", cmd); starting = null; health(); resolve(); },
        onFail: function (msg) { starting = null; health(); toast("Falha ao iniciar Python: " + msg, true); reject(new Error("Falha ao iniciar Python: " + msg)); }
      });
    });
    starting.catch(function () {});
    return starting;
  }
  function ensureServer() {
    if (srvOnline) return Promise.resolve();
    return health().then(function () { if (!srvOnline) return startServer(); });
  }
  function post(route, body) {
    return S.http("POST", route, body, 60000).then(function (j) { if (j.error) throw new Error(j.error); return j; });
  }
  /* inicia job e acompanha com barra de progresso */
  function job(route, body, bar, msg) {
    return ensureServer().then(function () { return post(route, body); }).then(function (j) {
      activeJobs++; setStatus("busy");
      var done = function (x) { activeJobs = Math.max(0, activeJobs - 1); health(); return x; };
      return new Promise(function (resolve, reject) {
        var fails = 0, t = setInterval(function () {
          S.http("GET", "/job/" + j.job, undefined, 5000).then(function (s) {
            fails = 0;
            if (bar) $(bar).style.width = (s.progress || 0) + "%";
            if (msg) $(msg).textContent = s.message || "";
            if (s.status === "done") { clearInterval(t); resolve(s.result); }
            if (s.status === "error") { clearInterval(t); reject(new Error(s.error)); }
          }).catch(function (e) { if (++fails > 20) { clearInterval(t); reject(new Error("Servidor de IA não respondeu.")); } });
        }, 700);
      }).then(done, function (e) { done(); throw e; });
    });
  }
  $("#btnStartSrv").onclick = function () { startServer().then(function () { toast("IA online"); }); };
  $("#btnHealth").onclick = function () {
    health();
    var cmd = val("pyPath") || store.get("py") || S.candidates()[0];
    S.pythonVersion(cmd, function (v) { srvLog("Python (" + cmd + "): " + (v || "não encontrado")); });
  };
  $("#pyPath").value = store.get("py", "");
  /* inicia sozinho ao abrir o painel e religa se o servidor cair */
  var autoAI = H.inAE && H.nodeRequire && store.get("autoAI", true), restarts = 0;
  health().then(function () { if (!srvOnline && autoAI) startServer(); });
  setInterval(function () {
    if (starting) return;
    health().then(function () {
      if (srvOnline || !autoAI || hFails < 2) return;
      if (restarts >= 5) return;                     // evita loop infinito se algo estiver quebrado
      restarts++;
      var ex = S.lastExit && S.lastExit();
      srvLog("⚠ Servidor caiu" + (ex ? " (código " + ex.code + (ex.tail ? ": " + ex.tail : "") + ")" : "") + " — reiniciando…");
      var tail = S.logTail && S.logTail(4); if (tail) srvLog(tail);
      startServer().then(function () { restarts = 0; });
    });
  }, 10000);

  /* ---------------- LAYER ---------------- */
  $$("[data-layer]").forEach(function (b) {
    b.onclick = function () { run("mf_layerTool", { tool: b.dataset.layer }, b.textContent + " ✓"); };
  });
  $("#btnCompFromSel").onclick = function () { run("mf_compFromSelection", null, "Comp criada"); };
  $("#btnRamp").onclick = function () { run("mf_speedRamp", { slow: num("rampSlow"), width: num("rampW"), pixelMotion: chk("rampPM") }, "Speed ramp aplicado"); };
  $$("[data-newcomp]").forEach(function (b) {
    b.onclick = function () { var s = b.dataset.newcomp.split("x"); run("mf_newComp", { name: b.textContent, w: +s[0], h: +s[1], fps: 30, dur: 15 }, "Comp criada"); };
  });

  /* ---------------- KEYFRAMES PROPORCIONAIS ---------------- */
  function fitOpts() { return { mode: val("fitMode"), percent: num("fitPct"), padStart: num("padIn"), padEnd: num("padOut"), onlySelected: chk("fitOnlySel") }; }
  $("#btnFit").onclick = function () { run("mf_fitKeysToLayer", fitOpts(), function (r) { return r.count + " propriedade(s) ajustada(s)"; }); };
  function renderPresets() {
    var dir = store.get("presetDir"), box = $("#presetList");
    if (!dir) { box.innerHTML = '<div class="muted small">Nenhuma pasta escolhida.</div>'; return; }
    var files = [];
    (function walk(d, depth) {
      H.listDir(d).forEach(function (f) {
        var p = d + "/" + f;
        if (/\.ffx$/i.test(f)) files.push(p); else if (depth < 2 && f.indexOf(".") < 0) walk(p, depth + 1);
      });
    })(dir, 0);
    box.innerHTML = files.length ? files.map(function (p) {
      return '<div class="item" data-p="' + p.replace(/"/g, "&quot;") + '"><span>' + p.split("/").pop().replace(/\.ffx$/i, "") + '</span><small>' + p.split("/").slice(-2, -1)[0] + "</small></div>";
    }).join("") : '<div class="muted small">Nenhum .ffx em ' + dir + "</div>";
    $$(".item", box).forEach(function (it) {
      it.onclick = function () {
        var o = fitOpts(); o.path = it.dataset.p; o.proportional = chk("presetProp");
        run("mf_applyPresetProportional", o, function (r) { return "Preset aplicado (" + r.count + " props ajustadas)"; });
      };
    });
  }
  $("#btnPresetFolder").onclick = function () { H.pickFolder("Pasta de presets .ffx").then(function (d) { if (d) { store.set("presetDir", d); renderPresets(); } }); };
  renderPresets();

  /* ---------------- FLOW (editor de curva) ---------------- */
  var cv = $("#curve"), cx = cv.getContext("2d"), curve = [0.33, 0, 0.67, 1], drag = -1;
  var PAD = 60;
  function toPx(x, y) { var w = cv.width - PAD * 2, h = cv.height - PAD * 2; return [PAD + x * w, cv.height - PAD - y * h]; }
  function fromPx(px, py) { var w = cv.width - PAD * 2, h = cv.height - PAD * 2; return [Math.min(1, Math.max(0, (px - PAD) / w)), (cv.height - PAD - py) / h]; }
  function drawCurve() {
    var w = cv.width, h = cv.height, i;
    cx.clearRect(0, 0, w, h);
    cx.strokeStyle = "rgba(255,255,255,.06)"; cx.lineWidth = 1;
    for (i = 0; i <= 4; i++) {
      var a = toPx(i / 4, 0), b = toPx(i / 4, 1); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke();
      a = toPx(0, i / 4); b = toPx(1, i / 4); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke();
    }
    var p0 = toPx(0, 0), p1 = toPx(curve[0], curve[1]), p2 = toPx(curve[2], curve[3]), p3 = toPx(1, 1);
    cx.setLineDash([4, 4]); cx.strokeStyle = "rgba(255,255,255,.35)";
    cx.beginPath(); cx.moveTo(p0[0], p0[1]); cx.lineTo(p1[0], p1[1]); cx.moveTo(p3[0], p3[1]); cx.lineTo(p2[0], p2[1]); cx.stroke(); cx.setLineDash([]);
    var g = cx.createLinearGradient(p0[0], 0, p3[0], 0); g.addColorStop(0, "#c850ff"); g.addColorStop(1, "#3fe8ff");
    cx.strokeStyle = g; cx.lineWidth = 4; cx.shadowColor = "#3fe8ff"; cx.shadowBlur = 14;
    cx.beginPath(); cx.moveTo(p0[0], p0[1]); cx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); cx.stroke(); cx.shadowBlur = 0;
    [[p0, "#c850ff", 7], [p3, "#c850ff", 7], [p1, "#3fe8ff", 10], [p2, "#3fe8ff", 10]].forEach(function (d) {
      cx.fillStyle = d[1]; cx.beginPath(); cx.arc(d[0][0], d[0][1], d[2], 0, Math.PI * 2); cx.fill();
    });
    $("#curveTxt").value = curve.map(function (v) { return v.toFixed(2); }).join(", ");
    $$("#curveList .cv").forEach(function (b) { b.classList.toggle("on", b.dataset.v === curve.join(",")); });
  }
  function evPos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
  cv.addEventListener("pointerdown", function (e) {
    var p = evPos(e), a = toPx(curve[0], curve[1]), b = toPx(curve[2], curve[3]);
    var da = Math.hypot(p[0] - a[0], p[1] - a[1]), db = Math.hypot(p[0] - b[0], p[1] - b[1]);
    drag = da < db ? 0 : 1; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", function (e) {
    if (drag < 0) return; var q = fromPx.apply(null, evPos(e));
    curve[drag * 2] = q[0]; curve[drag * 2 + 1] = Math.max(-1, Math.min(2, q[1])); drawCurve();
  });
  cv.addEventListener("pointerup", function () { drag = -1; });
  $("#curveTxt").addEventListener("change", function () {
    var v = this.value.split(/[ ,]+/).map(parseFloat); if (v.length === 4 && v.every(isFinite)) { curve = v; drawCurve(); }
  });
  function curveList() {
    var all = D.curves.concat(store.get("curves", []));
    $("#curveList").innerHTML = all.map(function (c, i) {
      var v = c.v, w = 54, h = 34, path = "M2," + (h - 2) + " C" + (2 + v[0] * (w - 4)) + "," + (h - 2 - v[1] * (h - 4)) + " " + (2 + v[2] * (w - 4)) + "," + (h - 2 - v[3] * (h - 4)) + " " + (w - 2) + ",2";
      return '<button class="cv" data-i="' + i + '" data-v="' + v.join(",") + '"><svg viewBox="0 0 ' + w + " " + h + '"><path d="' + path + '"/></svg><small>' + c.name + "</small></button>";
    }).join("");
    $$("#curveList .cv").forEach(function (b) {
      b.onclick = function () { curve = all[+b.dataset.i].v.slice(); drawCurve(); };
      b.ondblclick = function () { curve = all[+b.dataset.i].v.slice(); drawCurve(); applyCurve(); };
      b.oncontextmenu = function (e) {
        e.preventDefault(); var i = +b.dataset.i - D.curves.length; if (i < 0) return;
        var c = store.get("curves", []); c.splice(i, 1); store.set("curves", c); curveList(); toast("Preset removido");
      };
    });
    drawCurve();
  }
  function applyCurve() { run("mf_applyFlow", { x1: curve[0], y1: curve[1], x2: curve[2], y2: curve[3] }, function (r) { return "Curva aplicada em " + r.count + " par(es)"; }); }
  $("#btnApplyCurve").onclick = applyCurve;
  $("#btnMirror").onclick = function () { curve = [1 - curve[2], 1 - curve[3], 1 - curve[0], 1 - curve[1]]; drawCurve(); };
  $("#btnReadCurve").onclick = function () { run("mf_readFlow").then(function (r) { curve = [r.x1, r.y1, r.x2, r.y2]; drawCurve(); }); };
  $("#btnSaveCurve").onclick = function () {
    var name = prompt(window.MT_T("Nome do preset:"), window.MT_T("Minha curva")); if (!name) return;
    var c = store.get("curves", []); c.push({ name: name, v: curve.slice() }); store.set("curves", c); curveList();
  };
  curveList();

  /* ---------------- MOTION LIBRARY ---------------- */
  var motCat = "Entrada";
  function motionUI() {
    var cats = []; D.motion.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat); });
    $("#motTabs").innerHTML = cats.map(function (c) { return '<button data-cat="' + c + '" class="' + (c === motCat ? "on" : "") + '">' + c + "</button>"; }).join("");
    $$("#motTabs button").forEach(function (b) { b.onclick = function () { motCat = b.dataset.cat; motionUI(); }; });
    var list = D.motion.filter(function (m) { return m.cat === motCat; });
    $("#motCards").innerHTML = list.map(function (m) { return '<button class="card" data-id="' + m.id + '"><i>' + m.icon + "</i><span>" + m.name + "</span></button>"; }).join("");
    $$("#motCards .card").forEach(function (b) {
      b.onclick = function () { run("mf_applyMotion", { id: b.dataset.id, proportional: chk("motProp"), percent: num("motPct"), dur: num("motDur") }, b.textContent + " ✓"); };
    });
  }
  motionUI();

  /* ---------------- LEGENDAS + FACE TRACK ---------------- */
  var lastCaps = null, lastMedia = null, lastTrack = null;
  function hexToRgb(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
  function capStyle() {
    return { font: val("capFont"), size: num("capSize"), color: hexToRgb(val("capColor")), glow: chk("capGlow"), shadow: chk("capShadow"),
      upper: chk("capUpper"), stroke: num("capStroke"), anim: val("capAnim") };
  }
  function mediaRange(m) {
    // trecho da mídia visível na comp (em tempo da mídia)
    var s = (m.stretch || 100) / 100;
    return { start: Math.max(0, (m.inPoint - m.startTime) / s), end: Math.max(0, (m.outPoint - m.startTime) / s) };
  }
  function createCaps(segments) {
    var arg = { segments: segments, media: lastMedia, style: capStyle(), offset: [num("capOffX"), num("capOffY")] };
    if (chk("capTrack") && lastTrack) arg.track = lastTrack;
    return run("mf_createCaptions", arg, function (r) { return r.count + " legendas criadas"; });
  }
  $("#btnCaptions").onclick = function () {
    $("#capBar").style.width = "0%";
    H.call("mf_getSelectedMedia").then(function (m) {
      lastMedia = m; var rg = mediaRange(m);
      var tasks = [job("/transcribe", { path: m.path, lang: val("capLang"), model: val("capModel"), maxWords: num("capWords"), translate: chk("capTranslate") }, "#capBar", "#capMsg")];
      if (chk("capTrack")) tasks.push(job("/facetrack", { path: m.path, start: rg.start, end: rg.end, step: +val("capStep") }));
      return Promise.all(tasks);
    }).then(function (res) {
      var segs = res[0].segments, rg = mediaRange(lastMedia);
      segs = segs.filter(function (s) { return s.end > rg.start && s.start < rg.end; });
      lastCaps = segs; lastTrack = res[1] || null;
      $("#capEdit").value = segs.map(function (s) { return s.start.toFixed(2) + "|" + s.end.toFixed(2) + "|" + s.text; }).join("\n");
      if (lastTrack) $("#capMsg").textContent = "Rosto encontrado em " + lastTrack.found + "/" + lastTrack.analyzed + " frames analisados.";
      return createCaps(segs);
    }).catch(function (e) { toast(e.message, true); $("#capMsg").textContent = e.message; });
  };
  $("#btnCapCreate").onclick = function () {
    if (!lastMedia) return toast("Gere as legendas uma vez primeiro (precisa da layer de mídia).", true);
    var segs = val("capEdit").split("\n").map(function (l) { var p = l.split("|"); return p.length >= 3 ? { start: +p[0], end: +p[1], text: p.slice(2).join("|") } : null; }).filter(Boolean);
    createCaps(segs);
  };
  $("#btnTrackOnly").onclick = function () {
    H.call("mf_getSelectedMedia").then(function (m) {
      lastMedia = m; var rg = mediaRange(m);
      return job("/facetrack", { path: m.path, start: rg.start, end: rg.end, step: +val("capStep") }, "#capBar", "#capMsg");
    }).then(function (t) {
      lastTrack = t;
      return run("mf_createCaptions", { segments: [], media: lastMedia, style: capStyle(), track: t, offset: [num("capOffX"), num("capOffY")] }, "Null 'MT Face Track' criado — use como parent/expressão");
    }).catch(function (e) { toast(e.message, true); });
  };

  /* ---------------- EXPRESSÕES ---------------- */
  var exprCat = "Movimento";
  function exprAll() {
    return D.expressions.concat(store.get("myExpr", []).map(function (e) { e.cat = "Minhas"; return e; }))
      .concat(store.get("copiedExpr", []).map(function (e) { e.cat = "Copiadas"; return e; }));
  }
  function exprUI() {
    var all = exprAll(), cats = [];
    all.forEach(function (e) { if (cats.indexOf(e.cat) < 0) cats.push(e.cat); });
    if (cats.indexOf("Minhas") < 0) cats.push("Minhas");
    $("#exprTabs").innerHTML = cats.map(function (c) { return '<button data-cat="' + c + '" class="' + (c === exprCat ? "on" : "") + '">' + c + "</button>"; }).join("");
    $$("#exprTabs button").forEach(function (b) { b.onclick = function () { exprCat = b.dataset.cat; exprUI(); }; });
    var list = all.filter(function (e) { return e.cat === exprCat; });
    $("#exprList").innerHTML = list.length ? list.map(function (e, i) {
      return '<div class="item" data-i="' + i + '"><span>' + e.name + "</span><small>" + (e.target || "") + '</small><button class="mini" title="Aplicar">▶</button>' +
        ((e.cat === "Minhas" || e.cat === "Copiadas") ? '<button class="mini del" title="Apagar">✕</button>' : "") + "</div>";
    }).join("") : '<div class="muted small">Vazio. Use "Copiar expressões da seleção" ou salve do editor.</div>';
    $$("#exprList .item").forEach(function (it) {
      var e = list[+it.dataset.i];
      it.onclick = function () { $("#exprName").value = e.name; $("#exprCode").value = e.expr; if (e.target && $('#exprTarget option[value="' + e.target + '"]')) $("#exprTarget").value = e.target; };
      $(".mini", it).onclick = function (ev) { ev.stopPropagation(); run("mf_applyExpression", { expr: e.expr, target: e.target }, "Expressão aplicada: " + e.name); };
      var del = $(".del", it);
      if (del) del.onclick = function (ev) {
        ev.stopPropagation(); var key = e.cat === "Minhas" ? "myExpr" : "copiedExpr", arr = store.get(key, []);
        arr = arr.filter(function (x) { return !(x.name === e.name && x.expr === e.expr); }); store.set(key, arr); exprUI();
      };
    });
  }
  $("#btnCopyExpr").onclick = function () {
    run("mf_getExpressions").then(function (r) {
      if (!r.items.length) return toast("Nenhuma expressão nas layers/propriedades selecionadas.", true);
      var arr = store.get("copiedExpr", []);
      r.items.forEach(function (it) {
        var inv = { "ADBE Position": "position", "ADBE Scale": "scale", "ADBE Rotate Z": "rotation", "ADBE Opacity": "opacity", "ADBE Anchor Point": "anchor", "ADBE Text Document": "sourceText" };
        var e = { name: it.layer + " › " + it.prop, expr: it.expr, target: inv[it.matchName] || it.matchName };
        if (!arr.some(function (x) { return x.expr === e.expr; })) arr.unshift(e);
      });
      store.set("copiedExpr", arr.slice(0, 200)); exprCat = "Copiadas"; exprUI();
      try { navigator.clipboard.writeText(r.items.map(function (i) { return "// " + i.layer + " › " + i.prop + "\n" + i.expr; }).join("\n\n")); } catch (e) {}
      toast(r.items.length + " expressão(ões) copiada(s)");
    });
  };
  $("#btnClearExpr").onclick = function () { run("mf_clearExpressions", null, function (r) { return r.count + " expressão(ões) removida(s)"; }); };
  $("#btnApplyExpr").onclick = function () { run("mf_applyExpression", { expr: val("exprCode"), target: val("exprTarget") }, "Expressão aplicada"); };
  $("#btnSaveExpr").onclick = function () {
    if (!val("exprCode").trim()) return;
    var arr = store.get("myExpr", []); arr.push({ name: val("exprName") || "Expressão " + (arr.length + 1), expr: val("exprCode"), target: val("exprTarget") });
    store.set("myExpr", arr); exprCat = "Minhas"; exprUI(); toast("Salva em Minhas");
  };
  exprUI();

  /* ---------------- IA: fundo e pessoas ---------------- */
  var part = "subject";
  $("#partChips").innerHTML = D.bodyParts.map(function (p) { return '<button class="chip' + (p === part ? " on" : "") + '">' + (p === "subject" ? "objeto principal" : p) + "</button>"; }).join("");
  $$("#partChips .chip").forEach(function (b, i) {
    b.onclick = function () { part = D.bodyParts[i]; $("#partPrompt").value = ""; $$("#partChips .chip").forEach(function (c) { c.classList.toggle("on", c === b); }); };
  });
  function frameFile() {
    var p = H.tmpDir() + "/frame_" + Date.now() + ".png";
    return run("mf_exportFrame", { path: p }).then(function (r) { return r.path; });
  }
  function importResult(path, name) {
    return run("mf_importFile", { path: path, addToComp: true, still: true, stillDur: 5, name: name, folder: window.MT_T("MT IA") }, "Importado: " + name);
  }
  function removeBg(imgPromise) {
    var what = val("partPrompt").trim() || part;
    $("#aiBar").style.width = "0%";
    imgPromise.then(function (img) {
      if (!img) throw new Error("Cancelado");
      return job("/removebg", { image: img, part: what, invert: chk("bgInvert"), feather: num("bgFeather"), saveMask: chk("bgMask") }, "#aiBar", "#aiMsg");
    }).then(function (r) { return importResult(r.path, window.MT_T("BG removido - " + what)); }).catch(function (e) { toast(e.message, true); });
  }
  $("#btnRemoveBg").onclick = function () { removeBg(frameFile()); };
  $("#btnRemoveBgFile").onclick = function () { removeBg(H.pickFile("Imagem", ["png", "jpg", "jpeg", "webp"])); };
  function inpaint(imgPromise) {
    $("#aiBar").style.width = "0%";
    imgPromise.then(function (img) {
      if (!img) throw new Error("Cancelado");
      return job("/inpaint", { image: img, target: val("inpTarget") || "pessoas", grow: num("inpGrow") }, "#aiBar", "#aiMsg");
    }).then(function (r) { return importResult(r.path, window.MT_T("Sem " + val("inpTarget"))); }).catch(function (e) { toast(e.message, true); });
  }
  $("#btnInpaint").onclick = function () { inpaint(frameFile()); };
  $("#btnInpaintFile").onclick = function () { inpaint(H.pickFile("Imagem", ["png", "jpg", "jpeg", "webp"])); };

  /* ---------------- MEDIA DOWNLOADER ---------------- */
  function isURL(s) { return /^https?:\/\//i.test(s); }
  function download(url, title) {
    $("#dlBar").style.width = "0%"; $("#dlMsg").textContent = "Baixando " + (title || url);
    job("/download", { url: url, format: val("dlFmt"), maxHeight: +val("dlH"), folder: store.get("dlFolder") }, "#dlBar", "#dlMsg").then(function (r) {
      var h = store.get("dlHist", []); h.unshift({ title: r.title, path: r.path, url: url }); store.set("dlHist", h.slice(0, 30)); histUI();
      toast("Baixado: " + r.title);
      if (chk("dlImport")) return run("mf_importFile", { path: r.path, addToComp: true, atCTI: true, folder: window.MT_T("MT Downloads") }, "Importado na comp");
    }).catch(function (e) { toast(e.message, true); $("#dlMsg").textContent = e.message; });
  }
  function fmtDur(s) { if (!s) return ""; s = Math.round(s); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  $("#btnDl").onclick = function () {
    var q = val("dlUrl").trim(); if (!q) return;
    if (isURL(q)) return download(q);
    $("#dlMsg").textContent = 'Buscando "' + q + '"...';
    ensureServer().then(function () { return post("/search", { query: q, limit: 12 }); }).then(function (r) {
      $("#dlMsg").textContent = r.results.length + " resultado(s)";
      $("#dlResults").innerHTML = r.results.map(function (v, i) {
        return '<div class="res" data-i="' + i + '">' + (v.thumb ? '<img src="' + esc(v.thumb) + '">' : "<div class=noimg></div>") +
          "<div><b>" + esc(v.title) + "</b><small>" + esc(v.channel) + " · " + fmtDur(v.duration) + "</small></div><button class='mini'>⬇</button></div>";
      }).join("");
      $$("#dlResults .res").forEach(function (el) {
        var v = r.results[+el.dataset.i];
        $(".mini", el).onclick = function () { download(v.url, v.title); };
        $("img", el) && ($("img", el).onclick = function () { H.openURL(v.url); });
      });
    }).catch(function (e) { toast(e.message, true); });
  };
  $("#dlUrl").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#btnDl").click(); });
  $("#btnDlFolder").onclick = function () { H.pickFolder("Pasta de downloads").then(function (d) { if (d) { store.set("dlFolder", d); $("#dlFolder").textContent = d; } }); };
  if (store.get("dlFolder")) $("#dlFolder").textContent = store.get("dlFolder");
  function histUI() {
    var h = store.get("dlHist", []);
    $("#dlHistory").innerHTML = h.length ? h.map(function (x, i) { return '<div class="item" data-i="' + i + '"><span>' + esc(x.title) + '</span><button class="mini" title="Importar">＋</button></div>'; }).join("") : '<div class="muted small">Nada ainda.</div>';
    $$("#dlHistory .item").forEach(function (it) {
      $(".mini", it).onclick = function () { run("mf_importFile", { path: h[+it.dataset.i].path, addToComp: true, atCTI: true, folder: window.MT_T("MT Downloads") }, "Importado"); };
    });
  }
  histUI();

  /* ---------------- ALIGN / ANCHOR ---------------- */
  var ag = "";
  for (var y = 0; y <= 2; y++) for (var x = 0; x <= 2; x++) ag += '<button data-x="' + x / 2 + '" data-y="' + y / 2 + '"></button>';
  $("#anchorGrid").innerHTML = ag;
  $$("#anchorGrid button").forEach(function (b) { b.onclick = function () { run("mf_setAnchor", { x: +b.dataset.x, y: +b.dataset.y }, "Anchor point movido"); }; });
  $$("[data-align]").forEach(function (b) { b.onclick = function () { run("mf_align", JSON.parse(b.dataset.align), "Alinhado"); }; });
  $$("[data-fit]").forEach(function (b) { b.onclick = function () { run("mf_fitToComp", { mode: b.dataset.fit }, "Ajustado"); }; });

  /* ---------------- EFEITOS / EFEITO PRÓPRIO / CC ---------------- */
  $("#fxChips").innerHTML = D.effects.map(function (f) { return '<button class="chip" data-mn="' + f.mn + '">' + f.name + "</button>"; }).join("");
  $$("#fxChips .chip").forEach(function (b) { b.onclick = function () { run("mf_addEffect", { name: b.dataset.mn }, b.textContent + " adicionado"); }; });
  $("#btnAddFx").onclick = function () { if (val("fxName")) run("mf_addEffect", { name: val("fxName") }, "Efeito adicionado"); };
  $("#btnRemoveFx").onclick = function () { if (confirm(window.MT_T("Remover todos os efeitos das layers selecionadas?"))) run("mf_removeEffects", null, "Efeitos removidos"); };
  function myFxUI() {
    var arr = store.get("myFx", []);
    $("#myFxList").innerHTML = arr.length ? arr.map(function (f, i) {
      return '<div class="item" data-i="' + i + '"><span>' + esc(f.name) + "</span><small>" + f.effects.map(function (e) { return e.name; }).join(" + ") + '</small><button class="mini del">✕</button></div>';
    }).join("") : '<div class="muted small">Nenhum efeito salvo.</div>';
    $$("#myFxList .item").forEach(function (it) {
      var f = arr[+it.dataset.i];
      it.onclick = function () { run("mf_applyEffectStack", { effects: f.effects, proportional: chk("myFxProp") }, f.name + " aplicado"); };
      $(".del", it).onclick = function (e) { e.stopPropagation(); arr.splice(+it.dataset.i, 1); store.set("myFx", arr); myFxUI(); };
    });
  }
  $("#btnCaptureFx").onclick = function () {
    run("mf_captureEffects").then(function (r) {
      var arr = store.get("myFx", []); arr.push({ name: val("myFxName") || "Meu efeito " + (arr.length + 1), effects: r.effects });
      store.set("myFx", arr); myFxUI(); toast("Efeito salvo (" + r.effects.length + " efeito(s))");
    });
  };
  myFxUI();
  $("#ccGrid").innerHTML = D.cc.map(function (c) { return '<button data-cc="' + c.id + '">' + c.name + "</button>"; }).join("");
  $$("[data-cc]").forEach(function (b) { b.onclick = function () { run("mf_applyCC", { id: b.dataset.cc, asAdjustment: chk("ccAdj") }, b.textContent + " aplicado"); }; });

  /* ---------------- ORGANIZADOR ---------------- */
  $("#btnOrganize").onclick = function () {
    run("mf_organize", { scope: val("orgScope"), rename: chk("orgRename"), color: chk("orgColor"), folders: chk("orgFolders"), removeUnused: chk("orgUnused"), precompose: val("orgPrecomp") }, "Projeto organizado")
      .then(function (r) {
        var t = r.types || {};
        $("#orgReport").innerHTML = "<b>" + (r.layers || 0) + "</b> layers analisadas · <b>" + (r.precomps || 0) + "</b> precomps · <b>" + (r.moved || 0) + "</b> itens movidos" +
          (r.removed ? " · " + r.removed + " removidos" : "") + "<br>" + Object.keys(t).map(function (k) { return k + ": " + t[k]; }).join(" · ");
      });
  };

  /* ---------------- RENDER ---------------- */
  $$("[data-render]").forEach(function (b) { b.onclick = function () { run("mf_render", { format: b.dataset.render, start: chk("rndStart") }, "Adicionado à fila de render"); }; });

  /* ---------------- SESSÃO (tempo de uso) ---------------- */
  var t0 = Date.now();
  function key(d, k) { return k === "d" ? d.toISOString().slice(0, 10) : (k === "m" ? d.toISOString().slice(0, 7) : String(d.getFullYear())); }
  function fmt(min) { return min < 60 ? Math.round(min) + "m" : (min / 60).toFixed(1) + "h"; }
  setInterval(function () {
    var s = Math.floor((Date.now() - t0) / 1000);
    $("#sessTime").textContent = ("0" + Math.floor(s / 3600)).slice(-2) + ":" + ("0" + Math.floor(s / 60) % 60).slice(-2);
    if (s % 60 === 0 && s > 0) {
      var st = store.get("stats", {}), d = new Date();
      ["d", "m", "y"].forEach(function (k) { var kk = k + key(d, k); st[kk] = (st[kk] || 0) + 1; });
      store.set("stats", st);
    }
    var st2 = store.get("stats", {}), n = new Date();
    $("#stToday").textContent = fmt(st2["d" + key(n, "d")] || 0);
    $("#stMonth").textContent = fmt(st2["m" + key(n, "m")] || 0);
    $("#stYear").textContent = fmt(st2["y" + key(n, "y")] || 0);
  }, 1000);
  

  /* ---------------- MODO SIMPLES / AVANÇADO ---------------- */
  function setMode(adv) {
    document.body.classList.toggle("advanced", adv);
    $("#modeTxt").textContent = adv ? "Avançado" : "Simples";
    $("#btnMode").classList.toggle("on", adv);
    store.set("advanced", adv);
  }
  $("#btnMode").onclick = function () { setMode(!document.body.classList.contains("advanced")); };
  setMode(!!store.get("advanced", false));

  /* helpers compartilhados com magic.js */
  window.MT = { run: run, job: job, toast: toast, store: store, post: post, ensureServer: ensureServer, go: go, esc: esc, $: $, $$: $$, val: val, num: num, chk: chk };
  go(store.get("view", "home"));
})();
