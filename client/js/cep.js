/* Ponte mínima com o CEP (substitui o CSInterface.js da Adobe).
 * Fora do After Effects (abrindo o index.html no navegador) roda em modo "preview". */
(function () {
  var cep = window.__adobe_cep__;
  var MF = window.MFHost = {
    inAE: !!cep,
    nodeRequire: (typeof window.require === "function") ? window.require : (typeof require === "function" ? require : null),

    /* chama uma função mf_* do hostscript.jsx e devolve Promise com o JSON */
    call: function (fn, arg) {
      var a = arg == null ? "" : JSON.stringify(arg);
      var script = fn + "(" + (a ? JSON.stringify(a) : "") + ")";
      return new Promise(function (resolve, reject) {
        if (!cep) { console.log("[preview] " + script); return resolve({ ok: true, preview: true }); }
        cep.evalScript(script, function (res) {
          var o;
          try { o = JSON.parse(res); } catch (e) { return reject(new Error(res || "Sem resposta do After Effects")); }
          if (o && o.ok) resolve(o); else reject(new Error((o && o.error) || "Erro"));
        });
      });
    },

    extensionPath: function () {
      try { return cep.getSystemPath("extension").replace(/^file:\/{2,3}/, "").replace(/%20/g, " "); } catch (e) { return ""; }
    },
    userDataPath: function () {
      try { return cep.getSystemPath("userData").replace(/^file:\/{2,3}/, "").replace(/%20/g, " "); } catch (e) { return ""; }
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
