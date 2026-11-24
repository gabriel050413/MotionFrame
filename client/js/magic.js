/* MagicTouch — Leitor de links, Projeto de presets (.ffx) e Mídias não encontradas */
(function () {
  "use strict";
  var H = window.MFHost, M = window.MT, $ = M.$, $$ = M.$$, esc = M.esc;
  var req = H.nodeRequire, fs = req ? req("fs") : null, pathM = req ? req("path") : null;

  function base(p) { return String(p).split(/[\\\/]/).pop(); }
  function noExt(n) { return n.replace(/\.[^.]+$/, ""); }

  /* percorre pasta local com Node (sem servidor) */
  function walk(dir, filter, deep, out) {
    out = out || [];
    if (!fs) return out;
    var list = [];
    try { list = fs.readdirSync(dir); } catch (e) { return out; }
    list.forEach(function (n) {
      if (n.charAt(0) === "." || n === "__MACOSX") return;
      var full = pathM.join(dir, n), st;
      try { st = fs.statSync(full); } catch (e) { return; }
      if (st.isDirectory()) { if (deep) walk(full, filter, deep, out); }
      else if (!filter || filter(n, full)) out.push(full);
    });
    return out;
  }
  function openWithOS(file) {
    if (!req) return H.openURL("file://" + file);
    var cp = req("child_process");
    if (process.platform === "win32") cp.exec('start "" "' + file + '"');
    else cp.exec('open "' + file.replace(/"/g, '\\"') + '"');
  }

  var KIND_LABEL = { video: "Vídeos", audio: "Áudios", image: "Imagens", ai: "Illustrator/PDF", psd: "Photoshop", aep: "Projetos AEP", ffx: "Presets .ffx",
    font: "Fontes", mogrt: "MOGRT", lut: "LUTs", script: "Scripts", archive: "Pacotes", other: "Outros" };

  /* =================================================================== */
  /* LEITOR DE LINKS                                                      */
  /* =================================================================== */
  function showSummary(res) {
    var c = res.counts || {};
    $("#lnkReport").innerHTML = Object.keys(c).map(function (k) {
      return '<span class="kind k-' + k + '"><b>' + c[k] + "</b>" + (KIND_LABEL[k] || k) + "</span>";
    }).join("");
    $("#lnkFiles").innerHTML = res.files.slice(0, 300).map(function (f) {
      return '<div class="item"><span class="tag k-' + f.kind + '">' + f.kind + "</span><span>" + esc(f.name) + "</span><small>" + esc(f.group || "") + "</small></div>";
    }).join("") + (res.files.length > 300 ? '<div class="muted small">+' + (res.files.length - 300) + " arquivos…</div>" : "");
  }

  function importPackage(res) {
    showSummary(res);
    var title = res.title || base(res.root), files = res.files, steps = [];
    var want = { video: M.chk("lnkMedia"), audio: M.chk("lnkMedia"), image: M.chk("lnkMedia"), aep: M.chk("lnkAep"), ai: M.chk("lnkAi"), psd: M.chk("lnkAi") };
    var toImport = files.filter(function (f) { return want[f.kind]; });
    if (toImport.length) steps.push(function () {
      $("#lnkMsg").textContent = "Importando " + toImport.length + " arquivo(s) no projeto…";
      return M.run("mf_importAssets", { files: toImport, title: title, aiAsComp: M.chk("lnkAiComp") }).then(function (r) {
        $("#lnkMsg").textContent = r.imported + " importado(s)" + (r.failed.length ? " · " + r.failed.length + " falha(s)" : "");
        if (r.failed.length) console.warn(r.failed);
      });
    });
    var ffx = files.filter(function (f) { return f.kind === "ffx"; });
    if (ffx.length && M.chk("lnkFfx")) steps.push(function () {
      setQueue(ffx.map(function (f) { return { path: f.path, name: noExt(f.name), group: f.group || "" }; }), title);
      return buildPack();
    });
    var fonts = files.filter(function (f) { return f.kind === "font"; });
    if (fonts.length && M.chk("lnkFonts")) steps.push(function () {
      fonts.slice(0, 25).forEach(function (f) { openWithOS(f.path); });
      M.toast(fonts.length + " fonte(s) aberta(s) para instalar");
    });
    return steps.reduce(function (p, fn) { return p.then(fn); }, Promise.resolve()).then(function () {
      M.toast("Pacote importado ✨");
      M.store.set("lastPack", res.root);
    });
  }

  $("#btnFetch").onclick = function () {
    var urls = M.val("lnkUrls").split(/\s+/).filter(function (u) { return /^https?:\/\//i.test(u); });
    if (!urls.length) return M.toast("Cole pelo menos um link.", true);
    $("#lnkBar").style.width = "0%";
    M.job("/fetch", { urls: urls }, "#lnkBar", "#lnkMsg").then(importPackage).catch(function (e) { M.toast(e.message, true); $("#lnkMsg").textContent = e.message; });
  };
  $("#btnPickArchive").onclick = function () {
    H.pickFiles("Pacotes", ["zip", "rar", "7z"]).then(function (ps) {
      if (!ps.length) return;
      return M.job("/extract", { paths: ps }, "#lnkBar", "#lnkMsg").then(importPackage);
    }).catch(function (e) { M.toast(e.message, true); });
  };
  $("#btnPickFolderPack").onclick = function () {
    H.pickFolder("Pasta do projeto").then(function (d) {
      if (!d) return;
      return M.job("/extract", { paths: [d] }, "#lnkBar", "#lnkMsg").then(importPackage);
    }).catch(function (e) { M.toast(e.message, true); });
  };

  /* =================================================================== */
  /* PROJETO DE PRESETS (.ffx)                                            */
  /* =================================================================== */
  var queue = [], queueTitle = "Presets";
  function setQueue(list, title) {
    var seen = {};
    queue = list.filter(function (p) { if (seen[p.path]) return false; seen[p.path] = 1; return true; })
      .sort(function (a, b) { return (a.group + "/" + a.name).localeCompare(b.group + "/" + b.name); });
    queueTitle = title || "Presets";
    var groups = {};
    queue.forEach(function (q) { groups[q.group || "(raiz)"] = (groups[q.group || "(raiz)"] || 0) + 1; });
    $("#ffxQueue").innerHTML = queue.length ? "<b>" + queue.length + "</b> preset(s) em <b>" + Object.keys(groups).length + "</b> pasta(s) · projeto <b>" + esc(queueTitle) + "</b><div class='qg'>" +
      Object.keys(groups).slice(0, 30).map(function (g) { return "<span>" + esc(g) + " · " + groups[g] + "</span>"; }).join("") + "</div>" : "Nenhum preset carregado.";
  }
  function fromPaths(paths, rootDir) {
    return paths.map(function (p) {
      var rel = rootDir && pathM ? pathM.relative(rootDir, pathM.dirname(p)).split(pathM.sep).join("/") : "";
      return { path: p, name: noExt(base(p)), group: rel === "." ? "" : rel };
    });
  }
  function fromServer(res) {
    var ffx = res.files.filter(function (f) { return f.kind === "ffx"; });
    if (!ffx.length) throw new Error("Nenhum .ffx encontrado.");
    setQueue(ffx.map(function (f) { return { path: f.path, name: noExt(f.name), group: f.group || "" }; }), res.title || base(res.root));
  }
  $("#btnFfxFiles").onclick = function () {
    H.pickFiles("Presets .ffx", ["ffx"]).then(function (ps) { if (ps.length) setQueue(fromPaths(ps), "Presets"); });
  };
  $("#btnFfxFolder").onclick = function () {
    H.pickFolder("Pasta com .ffx").then(function (d) {
      if (!d) return;
      if (fs) {
        var ps = walk(d, function (n) { return /\.ffx$/i.test(n); }, true);
        if (!ps.length) return M.toast("Nenhum .ffx nessa pasta.", true);
        return setQueue(fromPaths(ps, d), base(d));
      }
      return M.job("/extract", { paths: [d] }, "#ffxBar", "#ffxMsg").then(fromServer);
    }).catch(function (e) { M.toast(e.message, true); });
  };
  $("#btnFfxArchive").onclick = function () {
    H.pickFiles("Pacote com presets", ["zip", "rar", "7z"]).then(function (ps) {
      if (!ps.length) return;
      return M.job("/extract", { paths: ps }, "#ffxBar", "#ffxMsg").then(fromServer);
    }).catch(function (e) { M.toast(e.message, true); });
  };
  $("#btnFfxLink").onclick = function () {
    var u = M.val("ffxLink").trim(); if (!/^https?:\/\//.test(u)) return M.toast("Cole um link válido.", true);
    M.job("/fetch", { urls: [u] }, "#ffxBar", "#ffxMsg").then(fromServer).catch(function (e) { M.toast(e.message, true); });
  };

  function buildPack() {
    if (!queue.length) { M.toast("Carregue presets primeiro.", true); return Promise.resolve(); }
    var sz = M.val("ffxSize").split("x"), opts = { w: +sz[0], h: +sz[1], fps: M.num("ffxFps") || 30, dur: M.num("ffxDur") || 5,
      mode: M.val("ffxMode"), bg: M.chk("ffxBg"), proportional: M.chk("ffxProp"), title: queueTitle };
    var BATCH = 15, made = 0, failed = [], i = 0;
    function next() {
      if (i >= queue.length) return Promise.resolve();
      var chunk = queue.slice(i, i + BATCH), o = JSON.parse(JSON.stringify(opts));
      o.presets = chunk; o.open = i === 0;
      $("#ffxMsg").textContent = "Criando comps " + (i + 1) + "–" + Math.min(queue.length, i + BATCH) + " de " + queue.length + "…";
      return M.run("mf_buildPresetProject", o).then(function (r) {
        made += r.made; failed = failed.concat(r.failed); i += BATCH;
        $("#ffxBar").style.width = Math.round(100 * Math.min(1, i / queue.length)) + "%";
        return next();
      });
    }
    return next().then(function () {
      $("#ffxMsg").textContent = made + " comp(s) criada(s)" + (failed.length ? " · " + failed.length + " falha(s): " + failed.slice(0, 3).join(" | ") : "");
      M.toast("Projeto de presets criado ✨ (" + made + ")");
      listPresetComps();
    });
  }
  $("#btnBuildPack").onclick = function () { buildPack().catch(function (e) { M.toast(e.message, true); }); };

  function listPresetComps() {
    return H.call("mf_listPresetComps").then(function (r) {
      var it = r.items || [];
      $("#presetComps").innerHTML = it.length ? it.map(function (c) {
        return '<div class="item"><span class="ico">' + window.MT_ICON("diamond") + "</span><span>" + esc(c.name) + "</span><small>" + esc(c.group || "") + "</small></div>";
      }).join("") : '<div class="muted small">Nenhuma comp criada pelo MagicTouch neste projeto.</div>';
      return it;
    }).catch(function () {});
  }
  $("#btnListPresets").onclick = listPresetComps;
  $("#btnExportFfx").onclick = function () {
    H.pickFolder("Salvar todos os .ffx em…").then(function (d) {
      if (!d) return;
      return M.run("mf_exportPresets", { dest: d, keepFolders: true }).then(function (r) {
        M.toast(r.count + " .ffx salvo(s)" + (r.missing.length ? " · " + r.missing.length + " sem arquivo original" : ""), !!r.missing.length && !r.count);
      });
    });
  };
  $("#btnSavePresetDlg").onclick = function () { M.run("mf_saveAnimationPreset"); };

  /* =================================================================== */
  /* MÍDIAS NÃO ENCONTRADAS                                               */
  /* =================================================================== */
  var missing = [], selected = {};
  function badge(n) { var b = $("#missBadge"); if (!b) return; b.hidden = !n; b.textContent = n > 99 ? "99+" : n; }
  function renderMissing() {
    badge(missing.length);
    $("#misMsg").textContent = missing.length ? missing.length + " mídia(s) não encontrada(s)" : "Nenhuma mídia offline 🎉";
    $("#missingList").innerHTML = missing.map(function (m, i) {
      return '<div class="item miss" data-i="' + i + '"><label class="tg"><input type="checkbox" ' + (selected[m.id] !== false ? "checked" : "") + '><span></span></label>' +
        '<div class="mi"><b>' + esc(m.name) + "</b><small>" + esc(m.path || "(caminho desconhecido)") + "</small><em>usado em " + m.used + " comp(s)" + (m.seq ? " · sequência" : "") + "</em></div>" +
        '<button class="mini" data-a="rep" title="Substituir">' + window.MT_ICON("replace") + "</button>" +
        '<button class="mini" data-a="ph" title="Placeholder">▢</button></div>';
    }).join("");
    $$("#missingList .item").forEach(function (el) {
      var m = missing[+el.dataset.i];
      $("input", el).onchange = function () { selected[m.id] = this.checked; };
      $('[data-a="rep"]', el).onclick = function () {
        H.pickFile("Substituir " + m.name, []).then(function (p) {
          if (!p) return;
          return M.run("mf_replaceFootage", { items: [{ id: m.id, path: p, seq: m.seq }] }, "Substituído: " + m.name).then(scanMissing);
        });
      };
      $('[data-a="ph"]', el).onclick = function () { M.run("mf_placeholderFootage", { ids: [m.id] }, "Placeholder aplicado").then(scanMissing); };
    });
  }
  function scanMissing() {
    return H.call("mf_missingFootage").then(function (r) {
      missing = r.items || []; renderMissing(); return missing;
    }).catch(function (e) { $("#misMsg").textContent = e.message; });
  }
  $("#btnScanMissing").onclick = scanMissing;
  $("#btnSelAllMissing").onclick = function () {
    var all = missing.every(function (m) { return selected[m.id] !== false; });
    missing.forEach(function (m) { selected[m.id] = !all; }); renderMissing();
  };
  $("#btnPlaceholderAll").onclick = function () {
    var ids = missing.filter(function (m) { return selected[m.id] !== false; }).map(function (m) { return m.id; });
    if (ids.length && confirm("Trocar " + ids.length + " mídia(s) por placeholder?")) M.run("mf_placeholderFootage", { ids: ids }, "Placeholders aplicados").then(scanMissing);
  };
  $("#btnRelinkAll").onclick = function () {
    if (!fs) return M.toast("Node indisponível no painel.", true);
    var todo = missing.filter(function (m) { return selected[m.id] !== false; });
    if (!todo.length) return M.toast("Nada para substituir — escaneie primeiro.", true);
    H.pickFolder("Pasta onde estão as mídias").then(function (d) {
      if (!d) return;
      $("#misMsg").textContent = "Procurando em " + d + "…";
      setTimeout(function () {
        var files = walk(d, null, M.chk("misSub")), byName = {}, byStem = {};
        files.forEach(function (f) { var n = base(f).toLowerCase(); if (!byName[n]) byName[n] = f; var st = noExt(n); if (!byStem[st]) byStem[st] = f; });
        var items = [], notFound = [];
        todo.forEach(function (m) {
          var n = (m.file || m.name).toLowerCase(), hit = byName[n] || byName[m.name.toLowerCase()];
          if (!hit && M.chk("misExt")) hit = byStem[noExt(n)] || byStem[noExt(m.name.toLowerCase())];
          if (hit) items.push({ id: m.id, path: hit, seq: m.seq }); else notFound.push(m.name);
        });
        if (!items.length) { $("#misMsg").textContent = "Nenhuma correspondência em " + files.length + " arquivo(s)."; return; }
        M.run("mf_replaceFootage", { items: items }).then(function (r) {
          M.toast(r.count + " mídia(s) reconectada(s)" + (notFound.length ? " · " + notFound.length + " não achada(s)" : ""));
          return scanMissing();
        });
      }, 30);
    });
  };

  /* atualiza o badge ao abrir o painel e quando entra na aba */
  $$('[data-go="missing"]').forEach(function (b) { b.addEventListener("click", scanMissing); });
  $$('[data-go="pack"]').forEach(function (b) { b.addEventListener("click", listPresetComps); });
  if (H.inAE) { scanMissing(); setInterval(function () { if (document.hasFocus()) scanMissing(); }, 30000); }
})();
