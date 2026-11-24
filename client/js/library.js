/* MagicTouch — Biblioteca navegável (presets de texto, caixas, elementos, social, animações, transições)
 * e modelos prontos de legenda. Prévias animadas em CSS. */
(function () {
  "use strict";
  var M = window.MT, D = window.MF_DATA, H = window.MFHost, $ = M.$, $$ = M.$$, esc = M.esc;
  var T = function (s) { return window.MT_T ? window.MT_T(s) : s; };

  /* ---------------- catálogo unificado ---------------- */
  var CATS = ["Favoritos", "Texto · Entrada", "Texto · Saída", "Texto · Loop", "Títulos", "Caixas de texto", "Elementos", "Social", "Transições", "Overlays", "Fundos", "Layer · Entrada", "Layer · Saída", "Layer · Loop"];
  var MOTION_CAT = { "Entrada": "Layer · Entrada", "Saída": "Layer · Saída", "Loop/FX": "Layer · Loop", "Transições": "Transições" };
  var ITEMS = [];
  D.textPresets.forEach(function (p) { ITEMS.push({ kind: "text", id: p.id, cat: p.cat, name: p.name, spec: p }); });
  D.elements.forEach(function (e) { ITEMS.push({ kind: "element", id: e.id, cat: e.cat, name: e.name, prev: e.prev }); });
  D.motion.forEach(function (m) { ITEMS.push({ kind: "motion", id: m.id, cat: MOTION_CAT[m.cat] || m.cat, name: m.name, icon: m.icon }); });

  var cat = M.store.get("libCat", "Texto · Entrada"), query = "";
  function favs() { return M.store.get("favs", []); }
  function toggleFav(id) { var f = favs(), i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); M.store.set("favs", f); }

  /* ---------------- prévias ---------------- */
  function unitsFor(spec) {
    var sample = spec.based === "words" ? "Seu texto aqui" : spec.based === "lines" ? "Seu texto" : "Texto";
    if (spec.based === "words") return sample.split(" ");
    if (spec.based === "lines") return [sample];
    return sample.split("");
  }
  function textPreview(spec) {
    var P = spec.props || {}, u = unitsFor(spec), n = u.length;
    var vars = "--dx:" + ((P.pos || [0, 0])[0] / 3) + "px;--dy:" + ((P.pos || [0, 0])[1] / 3) + "px;" +
      "--sc:" + ((P.scale || [100, 100])[0] / 100) + ";--rot:" + (P.rot || 0) + "deg;--blur:" + ((P.blur || 0) / 6) + "px;" +
      "--op:" + (P.opacity !== undefined ? P.opacity / 100 : 1) + ";--skew:" + (-(P.skew || 0)) + "deg;--ls:" + ((P.track || 0) / 12) + "px;" +
      (P.fill ? "--col:rgb(" + P.fill.map(function (c) { return Math.round(c * 255); }).join(",") + ");" : "--col:#fff;");
    var cls = spec.dir === "loop" ? "lp-" + (spec.decode ? "decode" : spec.loop) : spec.dir === "out" ? "pv-out" : "pv-in";
    if (spec.decode && spec.dir !== "loop") cls += " lp-decode";
    var html = u.map(function (ch, i) {
      var k = spec.order === "rev" ? n - 1 - i : spec.order === "rand" ? (i * 7 + 3) % n : i;
      var step = spec.based === "chars" ? (spec.smooth === 0 ? 0.09 : 0.06) : 0.14;
      return '<span class="u ' + cls + '" style="animation-delay:' + (k * step).toFixed(2) + 's;--i:' + i + '">' + (ch === " " ? "&nbsp;" : esc(ch)) + "</span>";
    }).join(spec.based === "words" ? "&nbsp;" : "");
    return '<div class="pv txt' + (spec.based === "lines" ? " whole" : "") + '" style="' + vars + '">' + html + "</div>";
  }
  function elementPreview(prev) {
    var map = {
      pill: '<div class="pv el"><span class="bx pill">Texto</span></div>',
      solid: '<div class="pv el"><span class="bx solid">Texto</span></div>',
      black: '<div class="pv el"><span class="bx black">Texto</span></div>',
      outline: '<div class="pv el"><span class="bx outline">Texto</span></div>',
      underline: '<div class="pv el"><span class="bx under">Texto<i></i></span></div>',
      marker: '<div class="pv el"><span class="bx marker"><i></i>Texto</span></div>',
      burst: '<div class="pv el"><span class="burst">' + new Array(9).join("<i></i>") + "</span></div>",
      ring: '<div class="pv el"><span class="ring"></span></div>',
      swoosh: '<div class="pv el"><svg viewBox="0 0 120 40" class="draw"><path d="M8 28 C 40 34, 80 6, 112 14"/></svg></div>',
      arrow: '<div class="pv el"><svg viewBox="0 0 120 40" class="draw"><path d="M10 20 H 104 M 88 8 L 106 20 L 88 32"/></svg></div>',
      sparkle: '<div class="pv el"><svg viewBox="-30 -30 60 60" class="spark"><path d="M0 -26 C 3 -6, 6 -3, 26 0 C 6 3, 3 6, 0 26 C -3 6, -6 3, -26 0 C -6 -3, -3 -6, 0 -26 Z"/></svg></div>',
      subscribe: '<div class="pv el"><span class="sub"><b>INSCREVA-SE</b><b>INSCRITO</b></span></div>',
      follow: '<div class="pv el"><span class="bx pill follow">@perfil</span></div>',
      timer: '<div class="pv el"><span class="timer"></span></div>',
      rating: '<div class="pv el"><span class="rating">★ <b></b></span></div>',
      bullets: '<div class="pv el"><span class="bul"><i>• Item um</i><i>• Item dois</i><i>• Item três</i></span></div>',
      letterbox: '<div class="pv el lbx"><i></i><i></i></div>',
      leak: '<div class="pv el"><span class="leak"></span></div>',
      grain: '<div class="pv el grain"></div>',
      circles: '<div class="pv el"><span class="circ"><i></i><i></i><i></i></span></div>',
      stripes: '<div class="pv el stripes"></div>',
      gradient: '<div class="pv el gradbg"></div>',
      chroma: '<div class="pv el"><span class="chroma" data-t="Texto">Texto</span></div>'
    };
    return map[prev] || '<div class="pv el"></div>';
  }
  function motionPreview(it) {
    return '<div class="pv mo"><span class="sq m-' + it.id + '"></span>' + (it.id.indexOf("tr_") === 0 ? '<span class="sq2 m-' + it.id + '"></span>' : "") + "</div>";
  }
  function preview(it) { return it.kind === "text" ? textPreview(it.spec) : it.kind === "element" ? elementPreview(it.prev) : motionPreview(it); }

  /* ---------------- render ---------------- */
  function visible() {
    var f = favs(), q = query.toLowerCase();
    return ITEMS.filter(function (it) {
      if (q) return (it.name + " " + it.cat + " " + T(it.name) + " " + T(it.cat)).toLowerCase().indexOf(q) >= 0;
      return cat === "Favoritos" ? f.indexOf(it.id) >= 0 : it.cat === cat;
    });
  }
  function render() {
    $("#libTabs").innerHTML = CATS.map(function (c) {
      var n = c === "Favoritos" ? favs().length : ITEMS.filter(function (it) { return it.cat === c; }).length;
      return '<button data-cat="' + c + '" class="' + (c === cat && !query ? "on" : "") + '">' + (c === "Favoritos" ? "★ " : "") + c + ' <small>' + n + "</small></button>";
    }).join("");
    $$("#libTabs button").forEach(function (b) { b.onclick = function () { cat = b.dataset.cat; query = ""; $("#libSearch").value = ""; M.store.set("libCat", cat); render(); }; });
    var list = visible(), f = favs();
    $("#libCards").innerHTML = list.length ? list.map(function (it, i) {
      return '<div class="lcard" data-i="' + ITEMS.indexOf(it) + '">' + preview(it) +
        '<div class="lname"><span>' + esc(it.name) + '</span><button class="star' + (f.indexOf(it.id) >= 0 ? " on" : "") + '" title="Favoritar">★</button></div></div>';
    }).join("") : '<div class="muted small">' + (cat === "Favoritos" ? "Clique na ★ de um item para favoritar." : "Nada encontrado.") + "</div>";
    $$("#libCards .lcard").forEach(function (el) {
      var it = ITEMS[+el.dataset.i];
      el.onclick = function () { apply(it, el); };
      $(".star", el).onclick = function (e) { e.stopPropagation(); toggleFav(it.id); render(); };
    });
  }
  function apply(it, el) {
    el.classList.add("applying"); setTimeout(function () { el.classList.remove("applying"); }, 500);
    var o = { proportional: M.chk("motProp"), percent: M.num("motPct"), dur: M.num("motDur") || undefined, sample: M.val("libSample") || undefined };
    var done = T(it.name) + " ✓";
    if (it.kind === "text") { o.spec = it.spec; o.dur = M.chk("motProp") ? undefined : (M.num("motDur") || it.spec.dur); return M.run("mf_applyTextPreset", o, done); }
    if (it.kind === "element") { o.id = it.id; o.handle = M.val("libHandle") || undefined; return M.run("mf_addElement", o, done); }
    o.id = it.id; o.dur = M.num("motDur") || 0.5; return M.run("mf_applyMotion", o, done);
  }
  $("#libSearch").addEventListener("input", function () { query = this.value.trim(); render(); });
  render();

  /* ================================================================== */
  /* MODELOS DE LEGENDA                                                   */
  /* ================================================================== */
  var TPL = D.captionTemplates, cur = M.store.get("capTpl", "hormozi");
  function rgb(c) { return "rgb(" + c.map(function (x) { return Math.round(x * 255); }).join(",") + ")"; }
  function hex(c) { return "#" + c.map(function (x) { var h = Math.round(x * 255).toString(16); return h.length < 2 ? "0" + h : h; }).join(""); }
  function capPreview(t) {
    var words = ["sua", "legenda", "aqui"], st = [];
    st.push("font-family:" + (/Black/.test(t.font) ? "'Arial Black',Arial" : "Arial") + ";font-weight:" + (/Bold|Black/.test(t.font) ? 800 : 400));
    st.push("font-size:" + Math.max(9, Math.min(15, t.size / 4.6)) + "px");
    st.push("color:" + rgb(t.color));
    if (t.tracking) st.push("letter-spacing:" + t.tracking / 40 + "px");
    var sh = [];
    if (t.glow) { var gc = t.glowColor ? rgb(t.glowColor) : "rgba(255,255,255,.85)"; sh.push("0 0 6px " + gc, "0 0 14px " + gc); }
    if (t.shadow) sh.push("0 2px 4px rgba(0,0,0,.8)");
    if (sh.length) st.push("text-shadow:" + sh.join(","));
    if (t.stroke) st.push("-webkit-text-stroke:" + Math.max(1, t.stroke / 4) + "px #000;paint-order:stroke fill");
    if (t.gradient) st.push("background:linear-gradient(" + rgb(t.gradient[0]) + "," + rgb(t.gradient[1]) + ");-webkit-background-clip:text;color:transparent");
    var hotIdx = t.hot === "last" ? 2 : t.hot === "keyword" ? 1 : -1;
    var pcol = t.palette ? t.palette[0] : DEF_PAL[0];
    if (t.captionColor === "palette") { st.push("color:" + rgb(pcol)); sh = ["0 0 6px " + rgb(pcol), "0 0 14px " + rgb(pcol)]; st.push("text-shadow:" + sh.join(",")); }
    var inner = words.map(function (w, i) {
      if (i === hotIdx) return (t.lines === 2 && i === 2 ? "<br>" : "") + '<span style="color:' + rgb(pcol) + ';text-shadow:0 0 6px ' + rgb(pcol) + ',0 0 14px ' + rgb(pcol) + '">' + (t.upper ? w.toUpperCase() : w) + "</span>";
      if (t.lines === 2 && i === 2) return "<br>" + (t.upper ? w.toUpperCase() : w);
      var cls = (t.words === "highlight" && i === 1) ? ' class="hl" style="color:' + rgb(t.highlight) + (t.highlightScale > 100 ? ";display:inline-block;transform:scale(1.12);margin:0 .28em" : "") + '"' :
        (t.words === "reveal" ? ' class="rv" style="animation-delay:' + i * 0.35 + 's"' : "");
      var tx = t.upper ? w.toUpperCase() : t.lower ? w.toLowerCase() : w;
      return "<span" + cls + ">" + tx + "</span>";
    }).join("&nbsp;");
    var box = t.box ? ' style="background:' + rgb(t.box.color) + ';padding:3px 8px;border-radius:6px"' : "";
    return '<div class="cpv' + (t.rays ? " rays" : "") + (t.follow ? " film" : "") + '"><div class="cpt"' + box + '><div style="' + st.join(";") + '">' + inner + "</div></div></div>";
  }
  function renderTpl() {
    $("#capTpls").innerHTML = TPL.map(function (t) {
      return '<button class="tpl' + (t.id === cur ? " on" : "") + '" data-id="' + t.id + '">' + capPreview(t) + "<b>" + esc(t.name) + "</b><small>" + esc(t.desc) + "</small></button>";
    }).join("");
    $$("#capTpls .tpl").forEach(function (b) { b.onclick = function () { cur = b.dataset.id; M.store.set("capTpl", cur); fillForm(); renderTpl(); }; });
  }
  function tpl() { for (var i = 0; i < TPL.length; i++) if (TPL[i].id === cur) return TPL[i]; return TPL[0]; }
  function setChk(id, v) { var el = document.getElementById(id); if (el) el.checked = !!v; }
  function setVal(id, v) { var el = document.getElementById(id); if (el && v !== undefined) el.value = v; }
  /* ---------- preparo por legenda: quebra em 2 linhas, palavra de destaque e cor ---------- */
  var STOP = ("a o e é de da do das dos em no na nos nas um uma uns umas que se por para com sem ao à os as eu tu ele ela nós vós eles elas " +
    "the a an and or of to in on at for is are was were be it i you he she we they my your his her our their this that with " +
    "el la los las y o de del en un una que es por con le les et ou du des un une est pour avec").split(" ");
  var DEF_PAL = [[0.3, 1, 0.42], [1, 0.23, 0.3], [1, 0.77, 0.19], [0.25, 0.9, 1], [1, 0.37, 0.64]];
  function clean(w) { return String(w).toLowerCase().replace(/[^\wÀ-ÿ']/g, ""); }
  window.MT_CAPPREP = function (segs) {
    var t = tpl(), pal = t.palette || DEF_PAL;
    return segs.map(function (sg, i) {
      var s = JSON.parse(JSON.stringify(sg));
      var words = (s.words && s.words.length ? s.words.map(function (w) { return String(w.text).trim(); }) : String(s.text).split(/\s+/)).filter(Boolean);
      var col = pal[(i * 3 + 1) % pal.length];
      if (t.lines === 2 && words.length >= 3) {
        var total = words.join(" ").length, best = 1, bestD = 1e9, acc = 0;
        for (var k = 1; k < words.length; k++) { acc += words[k - 1].length + 1; var d = Math.abs(acc - (total - acc)); if (d < bestD) { bestD = d; best = k; } }
        s.breakAfter = best;
      }
      if (t.hot === "last" && words.length) {
        s.hot = [words.length];
        if (words.length > 2 && clean(words[words.length - 1]).length <= 3) s.hot.unshift(words.length - 1);
      } else if (t.hot === "keyword" && words.length) {
        var cand = words.map(function (w, j) { return { j: j + 1, w: clean(w) }; }).filter(function (o) { return o.w && STOP.indexOf(o.w) < 0; })
          .sort(function (a, b) { return b.w.length - a.w.length; });
        if (cand.length) { s.hot = [cand[0].j]; if (words.length >= 5 && cand[1]) s.hot.push(cand[1].j); }
      }
      if (s.hot) s.hotColor = col;
      if (t.captionColor === "palette") s.color = col;
      return s;
    });
  };
  function fillForm() {
    var t = tpl();
    setVal("capFont", t.font); setVal("capSize", t.size); setVal("capColor", hex(t.color));
    setChk("capGlow", t.glow); setChk("capShadow", t.shadow); setChk("capUpper", t.upper);
    setVal("capStroke", t.stroke || 0); setVal("capAnim", t.anim || "none");
    setChk("capTrack", !!t.follow); setVal("capWords", t.wordsPer || 3);
    if (t.offY !== undefined) setVal("capOffY", t.offY);
  }
  /* extras do modelo que não têm campo no formulário (degradê, raios, caixa, destaque…) */
  window.MT_CAPTPL = function () {
    var t = tpl(), x = {};
    ["gradient", "rays", "bevel", "box", "words", "highlight", "highlightScale", "tracking", "lower", "glowColor", "glowStrength", "y", "shadowSoft", "shadowDist"].forEach(function (k) { if (t[k] !== undefined) x[k] = t[k]; });
    return x;
  };
  renderTpl();
  if (!M.store.get("capTplInit")) { fillForm(); M.store.set("capTplInit", true); }
})();
