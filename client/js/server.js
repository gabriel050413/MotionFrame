/* MagicTouch — inicia o servidor de IA (Python) e conversa com ele via Node (sem CORS).
 * Funciona no painel do AE (window.require) e também em Node puro (para testes). */
(function (root) {
  "use strict";
  var req = (typeof window !== "undefined" && typeof window.require === "function") ? window.require
    : (typeof require === "function" ? require : null);
  var PORT = 5717, HOST = "127.0.0.1";

  function platform() {
    try { return req("os").platform(); } catch (e) {}
    return (typeof navigator !== "undefined" && /Win/i.test(navigator.platform)) ? "win32" : "darwin";
  }

  /* GET/POST JSON. Usa o módulo http do Node quando existe (não sofre bloqueio de rede do navegador). */
  function http(method, route, body, timeoutMs) {
    if (!req) {
      var opt = { method: method, headers: { "Content-Type": "application/json" } };
      if (body !== undefined) opt.body = JSON.stringify(body);
      return fetch("http://" + HOST + ":" + PORT + route, opt).then(function (r) { return r.json(); });
    }
    var h = req("http");
    return new Promise(function (resolve, reject) {
      var data = body === undefined ? null : JSON.stringify(body);
      var r = h.request({ host: HOST, port: PORT, path: route, method: method,
        headers: data ? { "Content-Type": "application/json", "Content-Length": req("buffer").Buffer.byteLength(data) } : {} }, function (res) {
        var chunks = "";
        res.setEncoding("utf8");
        res.on("data", function (c) { chunks += c; });
        res.on("end", function () { try { resolve(JSON.parse(chunks || "{}")); } catch (e) { reject(new Error("Resposta inválida do servidor")); } });
      });
      r.on("error", reject);
      r.setTimeout(timeoutMs || 8000, function () { r.destroy(new Error("Tempo esgotado")); });
      if (data) r.write(data);
      r.end();
    });
  }

  function candidates(custom) {
    var list = custom ? [custom] : [];
    if (platform() === "win32") list = list.concat(["py", "python", "py -3.12", "py -3.11", "python3"]);
    else list = list.concat(["python3", "python3.12", "python3.11", "/opt/homebrew/bin/python3", "/usr/local/bin/python3", "python"]);
    return list.filter(function (c, i) { return c && list.indexOf(c) === i; });
  }
  function splitCmd(c) {
    try { if (req("fs").existsSync(c)) return [c, []]; } catch (e) {}
    var m = c.trim().match(/^"([^"]+)"\s*(.*)$/);           // "C:\caminho com espaço\python.exe" -args
    if (m) return [m[1], m[2] ? m[2].split(/\s+/) : []];
    var parts = c.trim().split(/\s+/);
    return [parts[0], parts.slice(1)];
  }

  var proc = null, lastExit = null;
  function logFile() {
    var os = req("os"), path = req("path"), fs = req("fs");
    var d = path.join(os.homedir(), "MagicTouch");
    try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
    return path.join(d, "server.log");
  }
  /* últimas linhas do log do servidor (para mostrar o motivo de uma queda) */
  function logTail(n) {
    try { return req("fs").readFileSync(logFile(), "utf8").trim().split(/\r?\n/).slice(-(n || 6)).join("\n"); } catch (e) { return ""; }
  }
  /* opts: {script, python, log(fn), onReady(cmd), onFail(msg)} */
  function start(opts) {
    var log = opts.log || function () {};
    if (!req) { opts.onFail && opts.onFail("Node não disponível — rode tools/start_server manualmente."); return; }
    var cp = req("child_process"), fs = req("fs");
    if (!fs.existsSync(opts.script)) { log("✖ Script não encontrado: " + opts.script); opts.onFail && opts.onFail("Script não encontrado: " + opts.script); return; }
    var cands = candidates(opts.python), i = 0, lastErr = "";

    function next() {
      if (i >= cands.length) {
        proc = null;
        log("✖ Nenhum Python funcionou. Instale o Python (python.org) marcando \"Add python.exe to PATH\" ou informe o caminho completo do python.exe.");
        opts.onFail && opts.onFail(lastErr || "Python não encontrado");
        return;
      }
      var c = cands[i++], sc = splitCmd(c), started = Date.now(), p, settled = false, errBuf = "";
      log("→ Tentando: " + c);
      function fail(msg) {
        if (settled) return; settled = true;
        if (proc === p) proc = null;
        lastErr = c + ": " + msg; log("  ✖ " + msg);
        // a porta pode já estar em uso por um servidor que JÁ está rodando
        http("GET", "/health", undefined, 1500).then(function () { log("✔ Servidor já estava rodando."); opts.onReady && opts.onReady(null); }, next);
      }
      // o servidor roda DESTACADO do painel (fechar/recarregar a aba não o derruba) e grava a saída num log
      var lf = logFile(), fd = null, logStart = 0;
      try { logStart = fs.existsSync(lf) ? fs.statSync(lf).size : 0; fd = fs.openSync(lf, "a"); } catch (e) { fd = null; }
      try {
        p = cp.spawn(sc[0], sc[1].concat(["-u", opts.script]), {
          windowsHide: true, detached: true, stdio: ["ignore", fd === null ? "ignore" : fd, fd === null ? "ignore" : fd],
          env: Object.assign({}, req("process").env, { PYTHONIOENCODING: "utf-8" })
        });
        p.unref();
      } catch (e) { if (fd !== null) try { fs.closeSync(fd); } catch (x) {} return fail(e.message); }
      if (fd !== null) try { fs.closeSync(fd); } catch (x) {}
      proc = p;
      function newLog() { try { return fs.readFileSync(lf).slice(logStart).toString("utf8").slice(-4000); } catch (e) { return ""; } }
      p.on("error", function (e) { fail(e.code === "ENOENT" ? "comando não encontrado" : e.message); });
      p.on("exit", function (code, signal) {
        if (code === null) code = signal || "?";
        var tail = newLog().trim().split(/\r?\n/).slice(-2).join(" | ");
        if (!settled) return fail("saiu com código " + code + (tail ? " — " + tail : ""));
        if (proc === p) { proc = null; lastExit = { code: code, tail: tail, at: Date.now() }; log("✖ Servidor parou (código " + code + ")" + (tail ? ": " + tail : "")); }
      });
      // espera o servidor responder
      var tries = 0;
      (function poll() {
        if (settled) return;
        http("GET", "/health", undefined, 1500).then(function () {
          if (settled) return; settled = true;
          log("✔ Servidor online com: " + c);
          opts.onReady && opts.onReady(c);
        }, function () {
          if (settled) return;
          if (++tries > 40) { try { p.kill(); } catch (e) {} return fail("não respondeu em 20 s"); }
          setTimeout(poll, 500);
        });
      })();
    }
    // antes de tudo: já existe um servidor rodando?
    http("GET", "/health", undefined, 1500).then(function () { log("✔ Servidor já estava rodando."); opts.onReady && opts.onReady(null); }, next);
  }
  function running() { return !!proc; }
  function stop() { if (proc) { try { proc.kill(); } catch (e) {} proc = null; } }
  function pythonVersion(cmd, cb) {
    if (!req) return cb("");
    var sc = splitCmd(cmd);
    req("child_process").execFile(sc[0], sc[1].concat(["--version"]), { windowsHide: true, timeout: 8000 }, function (err, out, errOut) {
      cb(err ? "" : String(out || errOut).trim());
    });
  }

  var api = { http: http, start: start, stop: stop, running: running, logTail: logTail, lastExit: function () { return lastExit; }, logFile: function () { return req ? logFile() : ""; }, candidates: candidates, platform: platform, pythonVersion: pythonVersion, PORT: PORT };
  root.MTServer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
