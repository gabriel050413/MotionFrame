#!/usr/bin/env node
/* Verifica se jsx/hostscript.jsx é compatível com o ExtendScript (ES3) do After Effects:
 *  - só caracteres ASCII (acentos como \uXXXX)
 *  - nada de palavras reservadas como nome de propriedade sem aspas ({ null: 1 }, obj.class)
 *  - nada de let/const/arrow functions/template strings
 * Uso: node tools/check_jsx.js */
var fs = require("fs"), path = require("path");
var file = path.join(__dirname, "..", "jsx", "hostscript.jsx"), src = fs.readFileSync(file, "utf8"), errs = [];
var RES = "break|case|catch|continue|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with|null|true|false|abstract|boolean|byte|char|class|const|debugger|double|enum|export|extends|final|float|goto|implements|import|int|interface|long|native|package|private|protected|public|short|static|super|synchronized|throws|transient|volatile";
src.split("\n").forEach(function (line, i) {
  var code = line.replace(/\/\/.*$/, "").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  if (/[^\x00-\x7F]/.test(line)) errs.push((i + 1) + ": caractere não-ASCII");
  if (new RegExp("[{,]\\s*(" + RES + ")\\s*:").test(code)) errs.push((i + 1) + ": palavra reservada como chave sem aspas");
  if (new RegExp("\\.(" + RES + ")\\b").test(code)) errs.push((i + 1) + ": acesso .palavraReservada");
  if (/\b(let|const)\s+\w|=>|`/.test(code)) errs.push((i + 1) + ": sintaxe ES6");
});
try { new Function(src); } catch (e) { errs.push("sintaxe: " + e.message); }
if (errs.length) { console.error("hostscript.jsx incompatível com o After Effects:\n  " + errs.join("\n  ")); process.exit(1); }
console.log("hostscript.jsx OK para ExtendScript (ES3)");
