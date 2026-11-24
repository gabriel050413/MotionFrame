/* MagicTouch — Outro Maker: biblioteca de templates de outro (.aep) com miniatura,
 * importação, edição de textos e "colocar no fim da edição". */
(function () {
  "use strict";
  var M = window.MT, H = window.MFHost, $ = M.$, $$ = M.$$, esc = M.esc;
  var T = function (s) { return window.MT_T ? window.MT_T(s) : s; };
  var req = H.nodeRequire, fs = req ? req("fs") : null, path = req ? req("path") : null, os = req ? req("os") : null;

  function libDir() {
    if (!req) return "";
    var d = path.join(os.homedir(), "MagicTouch", "Outros");
    try { fs.mkdirSync(path.join(d, ".thumbs"), { recursive: true }); } catch (e) {}
    return d;
  }
  function sources() { var s = M.store.get("outroSources", []); var d = libDir(); if (d && s.indexOf(d) < 0) s.unshift(d); return s; }
  function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function thumbPath(p) { return path.join(libDir(), ".thumbs", hash(p) + ".png"); }
  var GENERIC = /^(outro|outro file|project|projeto|template|main|final|untitled)( ?\(?\d+\)?)?$/i;

  /* procura .aep (e .zip/.rar ainda não extraídos) nas pastas da biblioteca */
  function scan() {
    var out = [], zips = [];
    if (!fs) return { items: out, zips: zips };
    function walk(dir, depth) {
      var list = [];
      try { list = fs.readdirSync(dir); } catch (e) { return; }
      list.forEach(function (n) {
        if (n.charAt(0) === "." || /auto-save|__MACOSX/i.test(n)) return;
        var full = path.join(dir, n), st;
        try { st = fs.statSync(full); } catch (e) { return; }
        if (st.isDirectory()) { if (depth < 5) walk(full, depth + 1); return; }
        if (/\.aep$/i.test(n)) {
          var base = n.replace(/\.aep$/i, ""), parent = path.basename(dir);
          var name = GENERIC.test(base.trim()) && parent && !GENERIC.test(parent) && !/^Link \d{4}-/.test(parent) && dir !== libDir() ? parent : base;
          out.push({ path: full, name: name, dir: dir, size: st.size, mtime: st.mtimeMs });
        } else if (/\.(zip|rar|7z)$/i.test(n)) {
          var ex = path.join(dir, n.replace(/\.(zip|rar|7z)$/i, ""));
          if (!fs.existsSync(ex)) zips.push({ path: full, name: n });
        }
      });
    }
    sources().forEach(function (s) { walk(s, 0); });
    var seen = {};
    out = out.filter(function (o) { if (seen[o.path]) return false; seen[o.path] = 1; return true; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { items: out, zips: zips };
  }

  var lib = { items: [], zips: [] }, sel = null, cur = null, query = "";
  function render() {
    lib = scan();
    var favs = M.store.get("outroFavs", []), q = query.toLowerCase();
    var list = lib.items.filter(function (it) { return !q || it.name.toLowerCase().indexOf(q) >= 0; });
    list.sort(function (a, b) { return (favs.indexOf(b.path) >= 0) - (favs.indexOf(a.path) >= 0); });
    $("#outroCount").textContent = lib.items.length + " " + T("templates");
    $("#outroZips").innerHTML = lib.zips.length ? lib.zips.map(function (z, i) {
      return '<div class="item"><span>📦 ' + esc(z.name) + '</span><button class="mini" data-z="' + i + '">' + esc(T("Extrair")) + "</button></div>";
    }).join("") : "";
    $$("#outroZips [data-z]").forEach(function (b) {
      b.onclick = function () {
        var z = lib.zips[+b.dataset.z];
        M.job("/extract", { paths: [z.path], folder: path.dirname(z.path) }, "#outroBar", "#outroMsg").then(function () { M.toast(T("Extraído") + ": " + z.name); render(); })
          .catch(function (e) { M.toast(e.message, true); });
      };
    });
    $("#outroGrid").innerHTML = list.length ? list.map(function (it) {
      var th = thumbPath(it.path), has = fs && fs.existsSync(th);
      var img = has ? '<img src="file:///' + th.replace(/\\/g, "/").replace(/^\//, "") + "?v=" + Math.round(fs.statSync(th).mtimeMs) + '">' :
        '<div class="ph"><b>' + esc(it.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase() || "OUT") + "</b></div>";
      return '<div class="ocard' + (sel && sel.path === it.path ? " on" : "") + '" data-p="' + esc(it.path) + '">' + img +
        '<div class="lname"><span title="' + esc(it.path) + '">' + esc(it.name) + '</span><button class="star' + (favs.indexOf(it.path) >= 0 ? " on" : "") + '">★</button></div></div>';
    }).join("") : '<div class="muted small">' + esc(T("Nenhum template ainda. Adicione uma pasta, um .zip ou um link do Drive.")) + "</div>";
    $$("#outroGrid .ocard").forEach(function (el) {
      var it = lib.items.filter(function (x) { return x.path === el.dataset.p; })[0];
      el.onclick = function () { select(it); };
      $(".star", el).onclick = function (e) {
        e.stopPropagation(); var f = M.store.get("outroFavs", []), k = f.indexOf(it.path);
        if (k >= 0) f.splice(k, 1); else f.push(it.path); M.store.set("outroFavs", f); render();
      };
    });
    $("#outroSources").innerHTML = sources().map(function (s, i) {
      return '<div class="item"><span title="' + esc(s) + '">📁 ' + esc(s) + "</span>" + (i === 0 ? "" : '<button class="mini del" data-s="' + esc(s) + '">✕</button>') + "</div>";
    }).join("");
    $$("#outroSources [data-s]").forEach(function (b) {
      b.onclick = function () { M.store.set("outroSources", M.store.get("outroSources", []).filter(function (x) { return x !== b.dataset.s; })); render(); };
    });
  }

  function select(it) {
    sel = it; cur = null;
    $("#outroEdit").hidden = false;
    $("#outroSel").textContent = it.name;
    $("#outroTexts").innerHTML = '<div class="muted small">' + esc(T("Clique em Importar para editar os textos.")) + "</div>";
    $("#btnOutroAdd").disabled = true; $("#btnOutroThumb").disabled = true; $("#btnOutroApply").disabled = true;
    $$("#outroGrid .ocard").forEach(function (c) { c.classList.toggle("on", c.dataset.p === it.path); });
    $("#outroEdit").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function showTexts(info) {
    cur = info;
    var warn = info.missing ? '<div class="warnbox">⚠ ' + info.missing + " " + esc(T("mídia(s) do template não encontrada(s) — use a aba Mídias ausentes.")) + "</div>" : "";
    $("#outroTexts").innerHTML = warn + (info.texts.length ? info.texts.map(function (t, i) {
      return '<label>' + esc(t.name) + ' <small class="muted">· ' + esc(t.compName) + '</small><textarea rows="' + Math.min(3, t.text.split("\n").length) + '" data-i="' + i + '">' + esc(t.text) + "</textarea></label>";
    }).join("") : '<div class="muted small">' + esc(T("Este template não tem camadas de texto.")) + "</div>");
    $("#btnOutroAdd").disabled = false; $("#btnOutroThumb").disabled = false; $("#btnOutroApply").disabled = !info.texts.length;
  }
  function collect() {
    return $$("#outroTexts textarea").map(function (ta) {
      var t = cur.texts[+ta.dataset.i]; return { comp: t.comp, index: t.index, text: ta.value, changed: ta.value !== t.text };
    });
  }
  function makeThumb(silent) {
    if (!cur || !sel) return Promise.resolve();
    return M.run("mf_outroThumb", { compId: cur.compId, path: thumbPath(sel.path), at: 0.6 }, silent ? null : T("Miniatura gerada")).then(render);
  }

  $("#btnOutroImport").onclick = function () {
    if (!sel) return;
    M.run("mf_outroImport", { path: sel.path, name: sel.name }, T("Template importado") + ": " + sel.name).then(function (info) {
      showTexts(info);
      if (fs && !fs.existsSync(thumbPath(sel.path))) makeThumb(true).catch(function () {});
    });
  };
  $("#btnOutroApply").onclick = function () {
    if (!cur) return;
    var items = collect().filter(function (x) { return x.changed; });
    if (!items.length) return M.toast(T("Nenhum texto foi alterado."));
    M.run("mf_outroSetTexts", { items: items }, function (r) { return r.count + " " + T("texto(s) atualizado(s)"); }).then(function () {
      items.forEach(function (x) { cur.texts.forEach(function (t) { if (t.comp === x.comp && t.index === x.index) t.text = x.text; }); });
    });
  };
  $("#btnOutroHandle").onclick = function () {
    var h = M.val("outroHandle").trim(); if (!h || !cur) return;
    if (h.charAt(0) !== "@") h = "@" + h;
    M.store.set("outroHandle", h);
    var n = 0;
    $$("#outroTexts textarea").forEach(function (ta) {
      var v = ta.value.replace(/@[\w.\-_]+/g, function () { n++; return h; });
      if (v !== ta.value) ta.value = v;
    });
    if (!n) return M.toast(T("Nenhum @ encontrado nos textos — edite os campos manualmente."), true);
    $("#btnOutroApply").click();
  };
  $("#outroHandle").value = M.store.get("outroHandle", "");
  $("#btnOutroAdd").onclick = function () {
    if (!cur) return;
    M.run("mf_outroAddToEdit", { compId: cur.compId, targetId: cur.prevCompId || 0, fit: M.chk("outroFit") }, T("Outro adicionado no fim da edição"));
  };
  $("#btnOutroThumb").onclick = function () { makeThumb(false); };

  /* adicionar à biblioteca */
  $("#btnOutroFolder").onclick = function () {
    H.pickFolder(T("Pasta com templates de outro")).then(function (d) {
      if (!d) return; var s = M.store.get("outroSources", []); if (s.indexOf(d) < 0) s.push(d); M.store.set("outroSources", s); render();
    });
  };
  $("#btnOutroZip").onclick = function () {
    H.pickFiles(T("Pacotes de outro"), ["zip", "rar", "7z"]).then(function (ps) {
      if (!ps.length) return;
      return M.job("/extract", { paths: ps, folder: libDir() }, "#outroBar", "#outroMsg").then(function () { M.toast(T("Templates adicionados")); render(); });
    }).catch(function (e) { M.toast(e.message, true); });
  };
  $("#btnOutroLink").onclick = function () {
    var u = M.val("outroLink").trim(); if (!/^https?:\/\//.test(u)) return M.toast(T("Cole um link válido."), true);
    var dest = path ? path.join(libDir(), "Link " + new Date().toISOString().slice(0, 10) + " " + hash(u)) : undefined;
    M.job("/fetch", { urls: [u], folder: dest }, "#outroBar", "#outroMsg").then(function (r) {
      M.toast(T("Templates adicionados") + " (" + ((r.counts || {}).aep || 0) + " .aep)"); render();
    }).catch(function (e) { M.toast(e.message, true); });
  };
  $("#btnOutroRescan").onclick = render;
  $("#outroSearch").addEventListener("input", function () { query = this.value.trim(); render(); });
  $$('[data-go="outro"]').forEach(function (b) { b.addEventListener("click", render); });
  render();
})();
