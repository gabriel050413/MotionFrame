/* Ponte mínima com o CEP (substitui o CSInterface.js da Adobe).
 * Fora do After Effects (abrindo o index.html no navegador) roda em modo "preview". */
(function () {
  var cep = window.__adobe_cep__;
  var MF = window.MFHost = {
    inAE: !!cep,
    nodeRequire: (typeof window.require === "function") ? window.require : (typeof require === "function" ? require : null),

    /* carrega o hostscript.jsx explicitamente (mostra o erro exato se o AE não conseguir) */
    loadStatus: null,
    boot: function () {
      if (!cep) return Promise.resolve("OK");
      if (MF._boot) return MF._boot;
      var file = (MF.extensionPath() + "/jsx/hostscript.jsx").replace(/\\/g, "/").replace(/"/g, '\\"');
      var script = '(function(){try{' +
        'if(typeof mf_info!=="function"){$.evalFile(new File("' + file + '"));}' +
        'return (typeof mf_info==="function")?"OK":"NOFN";' +
        '}catch(e){return "ERR: linha "+e.line+": "+e.toString();}})()';
      MF._boot = new Promise(function (resolve) {
        cep.evalScript(script, function (r) { MF.loadStatus = r || "SEM RESPOSTA"; resolve(MF.loadStatus); });
      });
      return MF._boot;
    },

    /* chama uma função mf_* do hostscript.jsx e devolve Promise com o JSON */
    call: function (fn, arg) {
      var a = arg == null ? "" : JSON.stringify(arg);
      var script = fn + "(" + (a ? JSON.stringify(a) : "") + ")";
      if (!cep) { console.log("[preview] " + script); return Promise.resolve({ ok: true, preview: true }); }
      return MF.boot().then(function (st) {
        return new Promise(function (resolve, reject) {
          cep.evalScript(script, function (res) {
            var o;
            try { o = JSON.parse(res); } catch (e) {
              if (st !== "OK") return reject(new Error("Script do After Effects não carregou (" + st + ")"));
              return reject(new Error(res && res !== "EvalScript error." ? res : "Sem resposta do After Effects"));
            }
            if (o && o.ok) resolve(o); else reject(new Error((o && o.error) || "Erro"));
          });
        });
      });
    },

    /* converte file:///C:/... (Win) ou file:///Users/... (Mac) em caminho do sistema */
    _fsPath: function (u) {
      var p = decodeURIComponent(String(u || "")).replace(/^file:\/\//, "");
      if (/^\/[A-Za-z]:/.test(p)) p = p.substr(1);
      return p;
    },
    extensionPath: function () {
      try { return MF._fsPath(cep.getSystemPath("extension")); } catch (e) { return ""; }
    },
    userDataPath: function () {
      try { return MF._fsPath(cep.getSystemPath("userData")); } catch (e) { return ""; }
    },

    pickFolder: function (title) {
      if (!window.cep || !window.cep.fs) return Promise.resolve(null);
      var r = window.cep.fs.showOpenDialogEx(false, true, title || "Escolher pasta", "", []);
      return Promise.resolve(r && r.data && r.data[0] ? r.data[0] : null);
    },
    pickFile: function (title, types) {
      if (!window.cep || !window.cep.fs) return Promise.resolve(null);
      var r = window.cep.fs.showOpenDialogEx(false, false, title || "Escolher arquivo", "", types || []);
      return Promise.resolve(r && r.data && r.data[0] ? r.data[0] : null);
    },
    pickFiles: function (title, types) {
      if (!window.cep || !window.cep.fs) return Promise.resolve([]);
      var r = window.cep.fs.showOpenDialogEx(true, false, title || "Escolher arquivos", "", types || []);
      return Promise.resolve(r && r.data ? r.data : []);
    },
    listDir: function (dir) {
      if (!window.cep || !window.cep.fs) return [];
      var r = window.cep.fs.readdir(dir);
      return r.err === 0 ? r.data : [];
    },
    openURL: function (u) {
      if (window.cep && window.cep.util) window.cep.util.openURLInDefaultBrowser(u); else window.open(u);
    },
    tmpDir: function () {
      var req = MF.nodeRequire;
      if (req) { var os = req("os"), path = req("path"), fs = req("fs"); var d = path.join(os.tmpdir(), "MagicTouch"); try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} return d; }
      return "/tmp";
    }
  };
})();
