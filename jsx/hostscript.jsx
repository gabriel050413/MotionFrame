/*  MagicTouch — ExtendScript host (After Effects)
 *  Todas as funções públicas começam com mf_ e devolvem uma string JSON:
 *  {"ok":true, ...}  ou  {"ok":false,"error":"..."}
 *  ExtendScript = ES3: nada de let/const/arrow functions.
 */

/* ------------------------------------------------------------------ */
/* JSON mínimo (ExtendScript antigo não tem JSON nativo)               */
/* ------------------------------------------------------------------ */
if (typeof JSON !== "object") { JSON = {}; }
(function () {
    function q(s) {
        return '"' + String(s).replace(/[\\"\u0000-\u001f]/g, function (c) {
            var m = { '"': '\\"', "\\": "\\\\", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f" };
            return m[c] || ("\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4));
        }) + '"';
    }
    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function s(v) {
            var t = typeof v, i, out;
            if (v === null || t === "undefined" || t === "function") return "null";
            if (t === "number") return isFinite(v) ? String(v) : "null";
            if (t === "boolean") return String(v);
            if (t === "string") return q(v);
            if (v instanceof Array) {
                out = [];
                for (i = 0; i < v.length; i++) out.push(s(v[i]));
                return "[" + out.join(",") + "]";
            }
            out = [];
            for (i in v) if (v.hasOwnProperty(i) && typeof v[i] !== "function") out.push(q(i) + ":" + s(v[i]));
            return "{" + out.join(",") + "}";
        };
    }
    if (typeof JSON.parse !== "function") {
        JSON.parse = function (str) { return eval("(" + str + ")"); };
    }
})();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function ok(o) { o = o || {}; o.ok = true; return JSON.stringify(o); }
function fail(e) { return JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }); }

function activeComp() {
    var c = app.project.activeItem;
    if (!c || !(c instanceof CompItem)) throw new Error("Abra/selecione uma composição.");
    return c;
}
function selLayers(comp, required) {
    var s = comp.selectedLayers, a = [], i;
    for (i = 0; i < s.length; i++) a.push(s[i]);
    if (required && a.length === 0) throw new Error("Selecione pelo menos uma layer.");
    return a;
}
function undo(name, fn) {
    app.beginUndoGroup("MagicTouch: " + name);
    try { return fn(); }
    catch (e) { return fail(e); }
    finally { app.endUndoGroup(); }
}
function parseArg(s) { return (typeof s === "string" && s.length) ? JSON.parse(s) : (s || {}); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function isArr(v) { return v instanceof Array; }

/* percorre todas as propriedades animáveis de um grupo */
function walkProps(group, cb) {
    var i, p;
    for (i = 1; i <= group.numProperties; i++) {
        p = group.property(i);
        if (!p) continue;
        if (p.propertyType === PropertyType.PROPERTY) cb(p);
        else walkProps(p, cb);
    }
}
function propPath(p) {
    var a = [], cur = p;
    while (cur && cur.parentProperty) { a.unshift(cur.matchName); cur = cur.parentProperty; }
    return a.join("/");
}


/* ------------------------------------------------------------------ */
/* Idioma dos nomes criados no projeto (layers, pastas, efeitos)       */
/* ------------------------------------------------------------------ */
var MT_LANG = "pt";
var MT_LI = { pt: 0, en: 1, es: 2, fr: 3 };
var MT_NAMES = {
    "null": ["MT Null", "MT Null", "MT Null", "MT Null"],
    adjustment: ["MT Ajuste", "MT Adjustment", "MT Ajuste", "MT Réglage"],
    solid: ["MT Sólido", "MT Solid", "MT Sólido", "MT Solide"],
    camera: ["MT Câmera", "MT Camera", "MT Cámara", "MT Caméra"],
    text: ["TEXTO", "TEXT", "TEXTO", "TEXTE"],
    precomp: ["MT Pré-comp", "MT Precomp", "MT Precomp", "MT Précomp"],
    blurIn: ["MT Desfoque de entrada", "MT Blur In", "MT Desenfoque de entrada", "MT Flou d'entrée"],
    glitch: ["MT Glitch", "MT Glitch", "MT Glitch", "MT Glitch"],
    glowIn: ["MT Deep Glow Interno", "MT Deep Glow Inner", "MT Deep Glow Interno", "MT Deep Glow Intérieur"],
    glowOut: ["MT Deep Glow Externo", "MT Deep Glow Outer", "MT Deep Glow Externo", "MT Deep Glow Extérieur"],
    transition: ["MT Transição", "MT Transition", "MT Transición", "MT Transition"],
    cc: ["MT Cor", "MT Color", "MT Color", "MT Couleur"],
    vignette: ["MT Vinheta", "MT Vignette", "MT Viñeta", "MT Vignette"],
    faceTrack: ["MT Rastreio Facial", "MT Face Track", "MT Seguimiento Facial", "MT Suivi du Visage"],
    face: ["Rosto", "Face", "Rostro", "Visage"],
    faceSize: ["Tamanho do rosto", "Face Size", "Tamaño del rostro", "Taille du visage"],
    offX: ["Deslocamento X", "Offset X", "Desplazamiento X", "Décalage X"],
    offY: ["Deslocamento Y", "Offset Y", "Desplazamiento Y", "Décalage Y"],
    smooth: ["Suavizar", "Smooth", "Suavizado", "Lissage"],
    caption: ["LEG", "CAP", "SUB", "ST"],
    precompFolder: ["MT Pré-comps", "MT Precomps", "MT Precomps", "MT Précomps"],
    fComps: ["01 Comps", "01 Comps", "01 Comps", "01 Compositions"],
    fVideos: ["02 Vídeos", "02 Videos", "02 Videos", "02 Vidéos"],
    fImages: ["03 Imagens", "03 Images", "03 Imágenes", "03 Images"],
    fAudio: ["04 Áudio", "04 Audio", "04 Audio", "04 Audio"],
    fSolids: ["05 Sólidos", "05 Solids", "05 Sólidos", "05 Solides"],
    kVideo: ["Vídeos", "Videos", "Videos", "Vidéos"],
    kAudio: ["Áudio", "Audio", "Audio", "Audio"],
    kImage: ["Imagens", "Images", "Imágenes", "Images"],
    kAep: ["Projetos AEP", "AEP Projects", "Proyectos AEP", "Projets AEP"],
    imports: ["MT Importações", "MT Imports", "MT Importaciones", "MT Imports"],
    pack: ["Pacote", "Package", "Paquete", "Archive"],
    newComp: ["MT Comp", "MT Comp", "MT Comp", "MT Comp"],
    rect: ["Retângulo", "Rectangle", "Rectángulo", "Rectangle"],
    circle: ["Círculo", "Circle", "Círculo", "Cercle"],
    star: ["Estrela", "Star", "Estrella", "Étoile"],
    path: ["Caminho", "Path", "Trazado", "Tracé"],
    shape: ["Forma", "Shape", "Forma", "Forme"],
    control: ["Controle", "Control", "Control", "Contrôle"]
};
function N(k) { var r = MT_NAMES[k]; return r ? r[MT_LI[MT_LANG] || 0] : k; }
function mf_setLang(arg) { var o = parseArg(arg); if (MT_LI[o.lang] !== undefined) MT_LANG = o.lang; return ok({ lang: MT_LANG }); }

/* ------------------------------------------------------------------ */
/* Keyframes: captura e recriação                                       */
/* ------------------------------------------------------------------ */
function captureKeys(p) {
    var keys = [], k, n = p.numKeys, d;
    for (k = 1; k <= n; k++) {
        d = {
            t: p.keyTime(k), v: p.keyValue(k),
            inI: p.keyInInterpolationType(k), outI: p.keyOutInterpolationType(k),
            inE: p.keyInTemporalEase(k), outE: p.keyOutTemporalEase(k),
            tc: p.keyTemporalContinuous(k), ab: p.keyTemporalAutoBezier(k)
        };
        if (p.isSpatial) {
            try {
                d.sIn = p.keyInSpatialTangent(k); d.sOut = p.keyOutSpatialTangent(k);
                d.sc = p.keySpatialContinuous(k); d.sab = p.keySpatialAutoBezier(k);
                d.rov = p.keyRoving(k);
            } catch (e) {}
        }
        keys.push(d);
    }
    return keys;
}
function rebuildKeys(p, keys, mapTime) {
    var k, idx, d;
    for (k = p.numKeys; k >= 1; k--) p.removeKey(k);
    for (k = 0; k < keys.length; k++) {
        d = keys[k];
        idx = p.addKey(mapTime(d.t, k));
        p.setValueAtKey(idx, d.v);
    }
    for (k = 0; k < keys.length; k++) {
        d = keys[k]; idx = k + 1;
        if (idx > p.numKeys) break;
        try { p.setTemporalEaseAtKey(idx, d.inE, d.outE); } catch (e1) {}
        try { p.setInterpolationTypeAtKey(idx, d.inI, d.outI); } catch (e2) {}
        try { p.setTemporalContinuousAtKey(idx, d.tc); p.setTemporalAutoBezierAtKey(idx, d.ab); } catch (e3) {}
        if (d.sIn !== undefined) {
            try {
                p.setSpatialTangentsAtKey(idx, d.sIn, d.sOut);
                p.setSpatialContinuousAtKey(idx, d.sc); p.setSpatialAutoBezierAtKey(idx, d.sab);
                if (d.rov) p.setRovingAtKey(idx, true);
            } catch (e4) {}
        }
    }
}

/* lista de propriedades-alvo: selecionadas ou todas animadas da layer */
function targetProps(layer, onlySelected) {
    var out = [], sp = layer.selectedProperties, i;
    for (i = 0; i < sp.length; i++)
        if (sp[i].propertyType === PropertyType.PROPERTY && sp[i].numKeys > 1) out.push(sp[i]);
    if (out.length || onlySelected) return out;
    walkProps(layer, function (p) { if (p.canVaryOverTime && p.numKeys > 1) out.push(p); });
    return out;
}

/*  Encaixa keyframes no tamanho do clip (proporcional).
 *  opts: { mode:"stretch"|"intro_outro"|"percent", padStart, padEnd (s),
 *          percent (0-100), onlySelected }
 *  - stretch: 1º key -> inPoint, último -> outPoint (tudo escalado proporcionalmente)
 *  - intro_outro: keys da 1ª metade escalam para o começo, 2ª metade ancora no fim
 *  - percent: animação ocupa X% do clip a partir do início
 */
function fitPropToRange(p, t0, t1, opts) {
    var keys = captureKeys(p), a = keys[0].t, b = keys[keys.length - 1].t, span = b - a;
    if (span <= 0) return false;
    var mode = opts.mode || "stretch";
    var dur = t1 - t0;
    if (mode === "percent") { dur = dur * clamp(opts.percent || 100, 1, 100) / 100; }
    if (mode === "intro_outro") {
        var mid = a + span / 2, lenIn = mid - a, lenOut = b - mid;
        var maxEach = (t1 - t0) / 2;
        var sIn = Math.min(1, maxEach / Math.max(lenIn, 0.0001));
        var sOut = Math.min(1, maxEach / Math.max(lenOut, 0.0001));
        rebuildKeys(p, keys, function (t) {
            return (t <= mid) ? t0 + (t - a) * sIn : t1 - (b - t) * sOut;
        });
        return true;
    }
    var scale = dur / span;
    rebuildKeys(p, keys, function (t) { return t0 + (t - a) * scale; });
    return true;
}

function mf_fitKeysToLayer(arg) {
    return undo("Keyframes proporcionais", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, j, n = 0, props;
        for (i = 0; i < L.length; i++) {
            var t0 = L[i].inPoint + (o.padStart || 0), t1 = L[i].outPoint - (o.padEnd || 0) - comp.frameDuration;
            if (t1 <= t0) continue;
            props = targetProps(L[i], !!o.onlySelected);
            for (j = 0; j < props.length; j++) if (fitPropToRange(props[j], t0, t1, o)) n++;
        }
        return ok({ count: n });
    });
}

/* Snapshot (path -> numKeys) usado para descobrir o que um preset adicionou */
function keySnapshot(layer) {
    var s = {};
    walkProps(layer, function (p) { if (p.canVaryOverTime) s[propPath(p)] = p.numKeys; });
    return s;
}

/* Aplica .ffx e encaixa os keyframes novos no clip */
function mf_applyPresetProportional(arg) {
    return undo("Preset proporcional", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, n = 0;
        var f = new File(o.path);
        if (!f.exists) throw new Error("Preset não encontrado: " + o.path);
        var keepTime = comp.time;
        for (i = 0; i < L.length; i++) {
            var before = keySnapshot(L[i]);
            for (var s = 0; s < comp.numLayers; s++) comp.layer(s + 1).selected = false;
            L[i].selected = true;
            comp.time = L[i].inPoint;
            L[i].applyPreset(f);
            if (o.proportional !== false) {
                var t0 = L[i].inPoint, t1 = L[i].outPoint - comp.frameDuration;
                walkProps(L[i], function (p) {
                    if (!p.canVaryOverTime || p.numKeys < 2) return;
                    var path = propPath(p);
                    if (before[path] === undefined || before[path] !== p.numKeys) {
                        if (fitPropToRange(p, t0, t1, o)) n++;
                    }
                });
            }
        }
        for (i = 0; i < L.length; i++) L[i].selected = true;
        comp.time = keepTime;
        return ok({ count: n });
    });
}

/* ------------------------------------------------------------------ */
/* FLOW — curva bezier -> temporal ease do AE                          */
/* ------------------------------------------------------------------ */
function selectedKeyPairs(p) {
    var ks = p.selectedKeys, pairs = [], i;
    if (!ks || ks.length < 2) { if (p.numKeys >= 2 && (!ks || ks.length === 0)) { for (i = 1; i < p.numKeys; i++) pairs.push([i, i + 1]); } return pairs; }
    for (i = 0; i < ks.length - 1; i++) pairs.push([ks[i], ks[i + 1]]);
    return pairs;
}
function valDiff(a, b) {
    if (!isArr(a)) return [b - a];
    var r = [], i; for (i = 0; i < a.length; i++) r.push(b[i] - a[i]); return r;
}
function mag(v) { var s = 0, i; for (i = 0; i < v.length; i++) s += v[i] * v[i]; return Math.sqrt(s); }

function applyCurveToPair(p, k1, k2, x1, y1, x2, y2) {
    var dt = p.keyTime(k2) - p.keyTime(k1);
    if (dt <= 0) return;
    var dv = valDiff(p.keyValue(k1), p.keyValue(k2));
    var dims = 1, spatial = false;
    if (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL) spatial = true;
    else if (p.propertyValueType === PropertyValueType.TwoD || p.propertyValueType === PropertyValueType.ThreeD) dims = dv.length;
    else if (p.propertyValueType === PropertyValueType.COLOR) dims = 4;
    var outInf = clamp(x1 * 100, 0.1, 100), inInf = clamp((1 - x2) * 100, 0.1, 100);
    var outRatio = x1 > 0.0001 ? y1 / x1 : 0, inRatio = (1 - x2) > 0.0001 ? (1 - y2) / (1 - x2) : 0;
    var outE = [], inE = [], d, speed;
    if (spatial) {
        speed = mag(dv) / dt;
        outE.push(new KeyframeEase(speed * outRatio, outInf));
        inE.push(new KeyframeEase(speed * inRatio, inInf));
    } else {
        for (d = 0; d < dims; d++) {
            speed = (dv[d] !== undefined ? dv[d] : 0) / dt;
            outE.push(new KeyframeEase(speed * outRatio, outInf));
            inE.push(new KeyframeEase(speed * inRatio, inInf));
        }
    }
    p.setInterpolationTypeAtKey(k1, p.keyInInterpolationType(k1), KeyframeInterpolationType.BEZIER);
    p.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, p.keyOutInterpolationType(k2));
    p.setTemporalEaseAtKey(k1, p.keyInTemporalEase(k1), outE);
    p.setTemporalEaseAtKey(k2, inE, p.keyOutTemporalEase(k2));
}

/* arg: {x1,y1,x2,y2}  — mesma notação do cubic-bezier CSS */
function mf_applyFlow(arg) {
    return undo("Flow", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, j, k, n = 0;
        for (i = 0; i < L.length; i++) {
            var props = targetProps(L[i], false);
            for (j = 0; j < props.length; j++) {
                var pairs = selectedKeyPairs(props[j]);
                for (k = 0; k < pairs.length; k++) {
                    try { applyCurveToPair(props[j], pairs[k][0], pairs[k][1], o.x1, o.y1, o.x2, o.y2); n++; } catch (e) {}
                }
            }
        }
        if (!n) throw new Error("Nenhum par de keyframes encontrado (selecione 2+ keyframes).");
        return ok({ count: n });
    });
}

/* lê a curva do primeiro par selecionado (para mostrar no gráfico) */
function mf_readFlow() {
    try {
        var comp = activeComp(), L = selLayers(comp, true), props = targetProps(L[0], false);
        if (!props.length) throw new Error("Sem keyframes.");
        var p = props[0], pr = selectedKeyPairs(p)[0];
        if (!pr) throw new Error("Selecione 2 keyframes.");
        var dt = p.keyTime(pr[1]) - p.keyTime(pr[0]);
        var dv = valDiff(p.keyValue(pr[0]), p.keyValue(pr[1]));
        var avg = (p.isSpatial ? mag(dv) : dv[0]) / dt;
        var o = p.keyOutTemporalEase(pr[0])[0], ie = p.keyInTemporalEase(pr[1])[0];
        var x1 = o.influence / 100, x2 = 1 - ie.influence / 100;
        var y1 = avg ? x1 * o.speed / avg : 0, y2 = avg ? 1 - (1 - x2) * ie.speed / avg : 1;
        return ok({ x1: x1, y1: y1, x2: x2, y2: y2 });
    } catch (e) { return fail(e); }
}

/* ------------------------------------------------------------------ */
/* LAYER tools                                                         */
/* ------------------------------------------------------------------ */
function mf_layerTool(arg) {
    return undo("Layer tool", function () {
        var o = parseArg(arg), comp = activeComp(), L, i, nl;
        switch (o.tool) {
            case "null":
                nl = comp.layers.addNull(); nl.name = N("null"); break;
            case "adjustment":
                nl = comp.layers.addSolid([1, 1, 1], N("adjustment"), comp.width, comp.height, comp.pixelAspect, comp.duration);
                nl.adjustmentLayer = true; nl.label = 5; break;
            case "solid":
                nl = comp.layers.addSolid(o.color || [0, 0, 0], N("solid"), comp.width, comp.height, comp.pixelAspect, comp.duration); break;
            case "camera":
                nl = comp.layers.addCamera(N("camera"), [comp.width / 2, comp.height / 2]); break;
            case "text":
                nl = comp.layers.addText(o.text || N("text")); break;
            case "split":
                L = selLayers(comp, true);
                for (i = 0; i < L.length; i++) {
                    if (comp.time <= L[i].inPoint || comp.time >= L[i].outPoint) continue;
                    var dupL = L[i].duplicate(); dupL.inPoint = comp.time; L[i].outPoint = comp.time;
                }
                break;
            case "trimToCTI_in":
                L = selLayers(comp, true); for (i = 0; i < L.length; i++) L[i].inPoint = comp.time; break;
            case "trimToCTI_out":
                L = selLayers(comp, true); for (i = 0; i < L.length; i++) L[i].outPoint = comp.time; break;
            case "reverse":
                L = selLayers(comp, true);
                for (i = 0; i < L.length; i++) {
                    if (!L[i].canSetTimeRemapEnabled) continue;
                    var a = L[i].inPoint, b = L[i].outPoint;
                    L[i].timeRemapEnabled = true;
                    var tr = L[i].property("ADBE Time Remapping");
                    var va = tr.valueAtTime(a, false), vb = tr.valueAtTime(b - comp.frameDuration, false);
                    while (tr.numKeys) tr.removeKey(1);
                    tr.setValueAtTime(a, vb); tr.setValueAtTime(b - comp.frameDuration, va);
                    L[i].outPoint = b;
                }
                break;
            case "freeze":
                L = selLayers(comp, true);
                for (i = 0; i < L.length; i++) {
                    if (!L[i].canSetTimeRemapEnabled) continue;
                    L[i].timeRemapEnabled = true;
                    var t = L[i].property("ADBE Time Remapping"), v = t.valueAtTime(comp.time, false);
                    while (t.numKeys) t.removeKey(1);
                    t.setValueAtTime(comp.time, v);
                    t.setInterpolationTypeAtKey(1, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                }
                break;
            case "sequence":
                L = selLayers(comp, true);
                L.sort(function (x, y) { return x.index - y.index; });
                var cur = L[0].inPoint;
                for (i = 0; i < L.length; i++) { var off = cur - L[i].inPoint; L[i].startTime += off; cur = L[i].outPoint - (o.overlap || 0); }
                break;
            case "precompose":
                L = selLayers(comp, true);
                var idx = []; for (i = 0; i < L.length; i++) idx.push(L[i].index);
                comp.layers.precompose(idx, o.name || N("precomp"), true); break;
            case "motionBlur":
                L = selLayers(comp, true); comp.motionBlur = true;
                for (i = 0; i < L.length; i++) L[i].motionBlur = !L[i].motionBlur; break;
            case "textToLines":
                L = selLayers(comp, true);
                for (i = 0; i < L.length; i++) {
                    if (!(L[i] instanceof TextLayer)) continue;
                    var td = L[i].property("ADBE Text Properties").property("ADBE Text Document");
                    var words = String(td.value.text).split(/\s+/), y0 = 0;
                    for (var w = 0; w < words.length; w++) {
                        if (!words[w]) continue;
                        var d = L[i].duplicate(), dd = d.property("ADBE Text Properties").property("ADBE Text Document").value;
                        dd.text = words[w]; d.property("ADBE Text Properties").property("ADBE Text Document").setValue(dd);
                        d.name = words[w];
                    }
                    L[i].enabled = false;
                }
                break;
            default: throw new Error("Ferramenta desconhecida: " + o.tool);
        }
        return ok({});
    });
}

/* ------------------------------------------------------------------ */
/* ALIGN / ANCHOR POINT                                                 */
/* ------------------------------------------------------------------ */
function layerRect(layer, t) {
    try { return layer.sourceRectAtTime(t, false); }
    catch (e) { return { left: 0, top: 0, width: layer.width, height: layer.height }; }
}
/* arg: {x:0|0.5|1, y:0|0.5|1}  -> move anchor sem deslocar a layer */
function mf_setAnchor(arg) {
    return undo("Anchor point", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i;
        for (i = 0; i < L.length; i++) {
            var ly = L[i];
            if (ly instanceof CameraLayer || ly instanceof LightLayer) continue;
            var r = layerRect(ly, comp.time);
            var tr = ly.property("ADBE Transform Group");
            var ap = tr.property("ADBE Anchor Point"), pos = tr.property("ADBE Position");
            var newA = [r.left + r.width * o.x, r.top + r.height * o.y];
            var oldA = ap.value;
            if (oldA.length > 2) newA.push(oldA[2]);
            // compensação manual (escala + rotação) para a layer não sair do lugar
            var sc = tr.property("ADBE Scale").value, rot = tr.property("ADBE Rotate Z").value * Math.PI / 180;
            var dx = (newA[0] - oldA[0]) * sc[0] / 100, dy = (newA[1] - oldA[1]) * sc[1] / 100;
            var rx = dx * Math.cos(rot) - dy * Math.sin(rot), ry = dx * Math.sin(rot) + dy * Math.cos(rot);
            if (ap.numKeys === 0) ap.setValue(newA); else ap.setValueAtTime(comp.time, newA);
            if (pos.dimensionsSeparated) {
                var px = tr.property("ADBE Position_0"), py = tr.property("ADBE Position_1");
                if (px.numKeys === 0) px.setValue(px.value + rx); if (py.numKeys === 0) py.setValue(py.value + ry);
            } else if (pos.numKeys === 0) {
                var pv = pos.value; pv[0] += rx; pv[1] += ry; pos.setValue(pv);
            } else {
                for (var k = 1; k <= pos.numKeys; k++) { var kv = pos.keyValue(k); kv[0] += rx; kv[1] += ry; pos.setValueAtKey(k, kv); }
            }
        }
        return ok({});
    });
}
/* arg: {h:"left|center|right|none", v:"top|center|bottom|none", target:"comp"|"selection"} */
function mf_align(arg) {
    return undo("Alinhar", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i;
        for (i = 0; i < L.length; i++) {
            var ly = L[i]; if (ly instanceof CameraLayer || ly instanceof LightLayer) continue;
            var r = layerRect(ly, comp.time), tr = ly.property("ADBE Transform Group");
            var ap = tr.property("ADBE Anchor Point").value, sc = tr.property("ADBE Scale").value;
            var pos = tr.property("ADBE Position"), pv = pos.value;
            var w = r.width * Math.abs(sc[0]) / 100, h = r.height * Math.abs(sc[1]) / 100;
            var leftOff = (ap[0] - r.left) * sc[0] / 100, topOff = (ap[1] - r.top) * sc[1] / 100;
            if (o.h === "left") pv[0] = leftOff;
            if (o.h === "center") pv[0] = comp.width / 2 - w / 2 + leftOff;
            if (o.h === "right") pv[0] = comp.width - w + leftOff;
            if (o.v === "top") pv[1] = topOff;
            if (o.v === "center") pv[1] = comp.height / 2 - h / 2 + topOff;
            if (o.v === "bottom") pv[1] = comp.height - h + topOff;
            if (pos.dimensionsSeparated) { tr.property("ADBE Position_0").setValue(pv[0]); tr.property("ADBE Position_1").setValue(pv[1]); }
            else if (pos.numKeys) pos.setValueAtTime(comp.time, pv); else pos.setValue(pv);
        }
        return ok({});
    });
}
/* arg: {mode:"fit"|"fill"|"width"|"height"} */
function mf_fitToComp(arg) {
    return undo("Fit to comp", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i;
        for (i = 0; i < L.length; i++) {
            var r = layerRect(L[i], comp.time); if (!r.width || !r.height) continue;
            var sx = comp.width / r.width * 100, sy = comp.height / r.height * 100, s;
            if (o.mode === "fill") s = Math.max(sx, sy); else if (o.mode === "width") s = sx; else if (o.mode === "height") s = sy; else s = Math.min(sx, sy);
            var tr = L[i].property("ADBE Transform Group"), sc = tr.property("ADBE Scale").value;
            sc[0] = s; sc[1] = s; tr.property("ADBE Scale").setValue(sc);
        }
        return mf_align(JSON.stringify({ h: "center", v: "center" }));
    });
}

/* ------------------------------------------------------------------ */
/* EXPRESSÕES                                                           */
/* ------------------------------------------------------------------ */
function mf_getExpressions() {
    try {
        var comp = activeComp(), L = selLayers(comp, true), out = [], i, sp, j;
        for (i = 0; i < L.length; i++) {
            sp = L[i].selectedProperties;
            var list = [];
            for (j = 0; j < sp.length; j++) if (sp[j].propertyType === PropertyType.PROPERTY) list.push(sp[j]);
            if (!list.length) walkProps(L[i], function (p) { list.push(p); });
            for (j = 0; j < list.length; j++) {
                var p = list[j];
                if (p.canSetExpression && p.expression && p.expressionEnabled !== false)
                    out.push({ layer: L[i].name, prop: p.name, matchName: p.matchName, expr: p.expression });
            }
        }
        return ok({ items: out });
    } catch (e) { return fail(e); }
}
/* nomes amigáveis -> matchName */
var MF_PROPMAP = {
    "position": "ADBE Position", "scale": "ADBE Scale", "rotation": "ADBE Rotate Z", "opacity": "ADBE Opacity",
    "anchor": "ADBE Anchor Point", "sourceText": "ADBE Text Document", "timeRemap": "ADBE Time Remapping"
};
function findProp(layer, matchName) {
    var found = null;
    walkProps(layer, function (p) { if (!found && (p.matchName === matchName)) found = p; });
    return found;
}
/* arg: {expr, target?: "position"|matchName} — aplica nas props selecionadas ou no alvo */
function mf_applyExpression(arg) {
    return undo("Expressão", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, j, n = 0;
        for (i = 0; i < L.length; i++) {
            var sp = L[i].selectedProperties, done = false;
            for (j = 0; j < sp.length; j++) {
                if (sp[j].propertyType === PropertyType.PROPERTY && sp[j].canSetExpression) { sp[j].expression = o.expr; n++; done = true; }
            }
            if (!done && o.target) {
                var mn = MF_PROPMAP[o.target] || o.target;
                if (mn === "ADBE Text Document" && !(L[i] instanceof TextLayer)) continue;
                var p = findProp(L[i], mn);
                if (p && p.canSetExpression) { p.expression = o.expr; n++; }
            }
        }
        if (!n) throw new Error("Selecione uma propriedade (ou layer com a propriedade alvo).");
        return ok({ count: n });
    });
}
function mf_clearExpressions() {
    return undo("Limpar expressões", function () {
        var comp = activeComp(), L = selLayers(comp, true), i, n = 0;
        for (i = 0; i < L.length; i++) walkProps(L[i], function (p) { if (p.canSetExpression && p.expression) { p.expression = ""; n++; } });
        return ok({ count: n });
    });
}

/* ------------------------------------------------------------------ */
/* EFEITOS / EFEITO PRÓPRIO (stack de efeitos salvo em JSON)           */
/* ------------------------------------------------------------------ */
function addEffect(layer, name) {
    var fx = layer.property("ADBE Effect Parade");
    if (fx.canAddProperty(name)) return fx.addProperty(name);
    return null;
}
function mf_addEffect(arg) {
    return undo("Efeito", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, n = 0;
        for (i = 0; i < L.length; i++) if (addEffect(L[i], o.name)) n++;
        if (!n) throw new Error("Efeito não disponível: " + o.name);
        return ok({});
    });
}
function captureGroup(g) {
    var o = [], i, p;
    for (i = 1; i <= g.numProperties; i++) {
        p = g.property(i);
        if (p.propertyType === PropertyType.PROPERTY) {
            var d = { i: i, mn: p.matchName };
            try {
                if (p.propertyValueType !== PropertyValueType.NO_VALUE && p.propertyValueType !== PropertyValueType.CUSTOM_VALUE &&
                    p.propertyValueType !== PropertyValueType.LAYER_INDEX && p.propertyValueType !== PropertyValueType.MASK_INDEX) {
                    if (p.numKeys > 0) d.keys = captureKeys(p); else d.v = p.value;
                }
                if (p.canSetExpression && p.expression) d.expr = p.expression;
            } catch (e) {}
            if (d.v !== undefined || d.keys || d.expr) o.push(d);
        } else o.push({ i: i, mn: p.matchName, g: captureGroup(p) });
    }
    return o;
}
function restoreGroup(g, data, t0) {
    var i, d, p;
    for (i = 0; i < data.length; i++) {
        d = data[i];
        try {
            p = g.property(d.i);
            if (!p || p.matchName !== d.mn) p = g.property(d.mn);
            if (!p) continue;
            if (d.g) { restoreGroup(p, d.g, t0); continue; }
            if (d.keys && d.keys.length) {
                var base = d.keys[0].t;
                rebuildKeys(p, d.keys, function (t) { return t0 + (t - base); });
            } else if (d.v !== undefined) p.setValue(d.v);
            if (d.expr) p.expression = d.expr;
        } catch (e) {}
    }
}
/* salva a pilha de efeitos da layer selecionada */
function mf_captureEffects() {
    try {
        var comp = activeComp(), L = selLayers(comp, true), fx = L[0].property("ADBE Effect Parade"), list = [], i;
        var onlySel = false;
        for (i = 1; i <= fx.numProperties; i++) if (fx.property(i).selected) onlySel = true;
        for (i = 1; i <= fx.numProperties; i++) {
            var e = fx.property(i);
            if (onlySel && !e.selected) continue;
            list.push({ mn: e.matchName, name: e.name, props: captureGroup(e) });
        }
        if (!list.length) throw new Error("A layer selecionada não tem efeitos.");
        return ok({ effects: list });
    } catch (e) { return fail(e); }
}
function mf_applyEffectStack(arg) {
    return undo("Efeito próprio", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, j;
        for (i = 0; i < L.length; i++) {
            for (j = 0; j < o.effects.length; j++) {
                var e = addEffect(L[i], o.effects[j].mn);
                if (!e) continue;
                try { e.name = o.effects[j].name; } catch (x) {}
                restoreGroup(e, o.effects[j].props, L[i].inPoint);
            }
            if (o.proportional) {
                var t0 = L[i].inPoint, t1 = L[i].outPoint - comp.frameDuration;
                walkProps(L[i].property("ADBE Effect Parade"), function (p) { if (p.numKeys > 1) fitPropToRange(p, t0, t1, { mode: "stretch" }); });
            }
        }
        return ok({});
    });
}
function mf_removeEffects() {
    return undo("Remover efeitos", function () {
        var comp = activeComp(), L = selLayers(comp, true), i;
        for (i = 0; i < L.length; i++) { var fx = L[i].property("ADBE Effect Parade"); while (fx.numProperties) fx.property(1).remove(); }
        return ok({});
    });
}

/* ------------------------------------------------------------------ */
/* MOTION LIBRARY (presets procedurais estilo "pack de animações")     */
/* ------------------------------------------------------------------ */
function tProp(l, mn) { return l.property("ADBE Transform Group").property(mn); }
function easeAll(p) {
    var k, e = new KeyframeEase(0, 75);
    for (k = 1; k <= p.numKeys; k++) {
        var dims = 1, vt = p.propertyValueType;
        if (vt === PropertyValueType.TwoD || vt === PropertyValueType.ThreeD) dims = p.keyValue(k).length;
        var arr = []; for (var d = 0; d < dims; d++) arr.push(e);
        try { p.setTemporalEaseAtKey(k, arr, arr); } catch (x) {}
    }
}
function keyPair(p, t0, v0, t1, v1, ease) {
    p.setValueAtTime(t0, v0); p.setValueAtTime(t1, v1);
    if (ease !== false) easeAll(p);
}
function add2(a, b) { return [a[0] + b[0], a[1] + b[1]].concat(a.length > 2 ? [a[2]] : []); }

/* arg: {id, dur (s), proportional(bool), percent} */
function mf_applyMotion(arg) {
    return undo("Motion preset", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, o.id.indexOf("tr_") !== 0 && o.id.indexOf("fx_") !== 0), i;
        var fd = comp.frameDuration;
        if (o.id.indexOf("tr_") === 0) return applyTransition(comp, o);
        for (i = 0; i < L.length; i++) {
            var ly = L[i], a = ly.inPoint, b = ly.outPoint - fd;
            var d = o.dur || 0.5;
            if (o.proportional) d = Math.max(fd * 2, (b - a) * (o.percent || 25) / 100);
            var pos = tProp(ly, "ADBE Position"), sc = tProp(ly, "ADBE Scale"), op = tProp(ly, "ADBE Opacity"), rot = tProp(ly, "ADBE Rotate Z");
            var P = pos.value, S = sc.value;
            switch (o.id) {
                case "in_fade": keyPair(op, a, 0, a + d, 100); break;
                case "out_fade": keyPair(op, b - d, 100, b, 0); break;
                case "in_pop": keyPair(sc, a, [0, 0, 100], a + d, S); sc.setValueAtTime(a + d * 0.7, [S[0] * 1.12, S[1] * 1.12, S[2] || 100]); easeAll(sc); break;
                case "out_pop": keyPair(sc, b - d, S, b, [0, 0, 100]); break;
                case "in_slideUp": keyPair(pos, a, add2(P, [0, comp.height * 0.15]), a + d, P); keyPair(op, a, 0, a + d * 0.6, 100); break;
                case "in_slideLeft": keyPair(pos, a, add2(P, [comp.width * 0.2, 0]), a + d, P); keyPair(op, a, 0, a + d * 0.6, 100); break;
                case "out_slideDown": keyPair(pos, b - d, P, b, add2(P, [0, comp.height * 0.15])); keyPair(op, b - d * 0.6, 100, b, 0); break;
                case "in_zoom": keyPair(sc, a, [S[0] * 2.5, S[1] * 2.5, S[2] || 100], a + d, S); keyPair(op, a, 0, a + d * 0.5, 100); break;
                case "in_rotate": keyPair(rot, a, -90, a + d, 0); keyPair(sc, a, [0, 0, 100], a + d, S); break;
                case "in_blur":
                    var bl = addEffect(ly, "ADBE Gaussian Blur 2"); bl.name = N("blurIn");
                    keyPair(bl.property(1), a, 80, a + d, 0); keyPair(op, a, 0, a + d * 0.5, 100); break;
                case "zoom_slow": keyPair(sc, a, S, b, [S[0] * 1.15, S[1] * 1.15, S[2] || 100], false); break;
                case "shake": pos.expression = "freq=" + (o.freq || 12) + ";amp=" + (o.amp || 25) + ";wiggle(freq,amp)"; break;
                case "shake_rot": rot.expression = "wiggle(10,4)"; break;
                case "bounce":
                    sc.expression = "n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--;}\nif(n==0)t=0;else t=time-key(n).time;\nif(n>0&&t<1){v=velocityAtTime(key(n).time-thisComp.frameDuration/10);amp=.06;freq=3;decay=5;value+v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);}else value;";
                    break;
                case "flash":
                    var ex = addEffect(ly, "ADBE Exposure2");
                    if (ex) { var e1 = ex.property(3); e1.setValueAtTime(a, 4); e1.setValueAtTime(a + d, 0); }
                    break;
                case "glitch":
                    var ww = addEffect(ly, "ADBE Wave Warp");
                    if (ww) { ww.name = N("glitch"); setByName(ww, "Wave Type", 3); setByName(ww, "Wave Height", 0); setByName(ww, "Wave Width", 30);
                        try { ww.property(2).expression = "seedRandom(Math.floor(time*12),true);r=random();r>.8?random(20,80):0"; } catch (gx) {} }
                    pos.expression = "seedRandom(Math.floor(time*12),true);r=random();r>.85?value+[random(-25,25),0]:value";
                    break;
                case "fx_glow": deepGlow(ly, 1); break;
                default: throw new Error("Preset desconhecido: " + o.id);
            }
        }
        return ok({});
    });
}

/* transições: cria adjustment layer no CTI (ou entre 2 clips selecionados) */
function applyTransition(comp, o) {
    var fd = comp.frameDuration, d = o.dur || 0.5, t = comp.time, L = selLayers(comp, false);
    if (L.length >= 2) { L.sort(function (x, y) { return x.inPoint - y.inPoint; }); t = L[1].inPoint; }
    var adj = comp.layers.addSolid([1, 1, 1], N("transition") + " " + o.id.replace("tr_", ""), comp.width, comp.height, comp.pixelAspect, d * 2);
    adj.adjustmentLayer = true; adj.label = 9; adj.startTime = t - d; adj.motionBlur = true; comp.motionBlur = true;
    var a = t - d, m = t, b = t + d;
    var tx = addEffect(adj, "ADBE Geometry2");
    tx.property("ADBE Geometry2-0011").setValue(false); // Use comp shutter angle off
    try { tx.property("ADBE Geometry2-0012").setValue(360); } catch (e0) {}
    var mir = addEffect(adj, "ADBE Tile"); // Motion Tile para não mostrar bordas
    try { mir.property("ADBE Tile-0004").setValue(300); mir.property("ADBE Tile-0005").setValue(300); mir.property("ADBE Tile-0006").setValue(true); } catch (e1) {}
    var C = [comp.width / 2, comp.height / 2];
    var posP = tx.property("ADBE Geometry2-0002"), scP = tx.property("ADBE Geometry2-0003"), rotP = tx.property("ADBE Geometry2-0007");
    function k3(p, v0, v1, v2) { p.setValueAtTime(a, v0); p.setValueAtTime(m, v1); p.setValueAtTime(b, v2); easeStrong(p); }
    switch (o.id) {
        case "tr_zoomIn": k3(scP, 100, 400, 100); break;
        case "tr_zoomOut": k3(scP, 100, 25, 100); break;
        case "tr_slideLeft": k3(posP, C, [C[0] - comp.width, C[1]], C); break;
        case "tr_slideUp": k3(posP, C, [C[0], C[1] - comp.height], C); break;
        case "tr_spin": k3(rotP, 0, 180, 360); break;
        case "tr_whip":
            k3(posP, C, [C[0] + comp.width * 1.5, C[1]], C);
            var bl = addEffect(adj, "ADBE Motion Blur"); if (bl) { try { bl.property(2).setValue(80); } catch (e2) {} }
            break;
        case "tr_flash":
            var ex = addEffect(adj, "ADBE Exposure2"); if (ex) k3(ex.property(3), 0, 5, 0);
            break;
        case "tr_blur":
            var g = addEffect(adj, "ADBE Gaussian Blur 2"); k3(g.property(1), 0, 120, 0); break;
        default: break;
    }
    return ok({});
}
function easeStrong(p) {
    var k;
    for (k = 1; k <= p.numKeys; k++) {
        var vt = p.propertyValueType, dims = (vt === PropertyValueType.TwoD || vt === PropertyValueType.ThreeD) ? p.keyValue(k).length : 1, arr = [];
        for (var d = 0; d < dims; d++) arr.push(new KeyframeEase(0, 95));
        try { p.setTemporalEaseAtKey(k, arr, arr); } catch (e) {}
    }
}

/* ------------------------------------------------------------------ */
/* SPEED RAMP / Velocity (estilo twixtor/time remap)                    */
/* ------------------------------------------------------------------ */
/* arg: {slow: 0.25, rampDur: 0.3} -> ramp em torno do CTI */
function mf_speedRamp(arg) {
    return undo("Speed ramp", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i;
        var slow = o.slow || 0.3, half = (o.width || 1.0) / 2;
        for (i = 0; i < L.length; i++) {
            var ly = L[i]; if (!ly.canSetTimeRemapEnabled) continue;
            ly.timeRemapEnabled = true;
            var tr = ly.property("ADBE Time Remapping"), t = comp.time;
            var src = tr.valueAtTime(t, false);
            while (tr.numKeys) tr.removeKey(1);
            var startSrc = tr.valueAtTime(ly.inPoint, false);
            // velocidade normal até t-half, lenta entre t-half e t+half, normal depois
            var s0 = src - half; tr.setValueAtTime(ly.inPoint, src - (t - ly.inPoint));
            tr.setValueAtTime(t - half, s0);
            var slowSpan = half * 2 * slow;
            tr.setValueAtTime(t + half, s0 + slowSpan);
            var rest = ly.source.duration - (s0 + slowSpan);
            tr.setValueAtTime(Math.min(ly.outPoint, t + half + rest), ly.source.duration - comp.frameDuration);
            for (var k = 2; k <= 3; k++) {
                var e = [new KeyframeEase(slow, 60)];
                try { tr.setTemporalEaseAtKey(k, e, e); } catch (x) {}
            }
            ly.outPoint = Math.min(comp.duration, t + half + rest);
            if (o.pixelMotion) { var tw = addEffect(ly, "ADBE Timewarp"); }
        }
        return ok({});
    });
}

/* ------------------------------------------------------------------ */
/* COLOR (CC presets)                                                   */
/* ------------------------------------------------------------------ */
function setByName(fx, name, v) { try { fx.property(name).setValue(v); return true; } catch (e) { return false; } }
function mf_applyCC(arg) {
    return undo("Color preset", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, false), i, targets = L;
        if (!targets.length || o.asAdjustment) {
            var adj = comp.layers.addSolid([1, 1, 1], N("cc") + " " + o.id, comp.width, comp.height, comp.pixelAspect, comp.duration);
            adj.adjustmentLayer = true; adj.label = 2; targets = [adj];
        }
        for (i = 0; i < targets.length; i++) {
            var t = targets[i], c, h;
            switch (o.id) {
                case "teal_orange":
                    c = addEffect(t, "ADBE Color Balance (HLS)");
                    h = addEffect(t, "ADBE Vibrance"); if (h) setByName(h, "Vibrance", 30);
                    var cb = addEffect(t, "ADBE Color Balance 2");
                    if (cb) { setByName(cb, "Shadow Blue Balance", 25); setByName(cb, "Shadow Red Balance", -15); setByName(cb, "Highlight Red Balance", 20); setByName(cb, "Highlight Blue Balance", -20); }
                    if (c) c.remove();
                    break;
                case "bw_contrast":
                    addEffect(t, "ADBE Black&White");
                    c = addEffect(t, "ADBE Brightness & Contrast 2"); if (c) setByName(c, "Contrast", 35);
                    break;
                case "warm":
                    c = addEffect(t, "ADBE Photo Filter Effect") || addEffect(t, "ADBE Photo Filter"); break;
                case "cold":
                    c = addEffect(t, "ADBE Tint"); if (c) { setByName(c, "Map Black To", [0, 0.05, 0.15, 1]); setByName(c, "Amount to Tint", 25); } break;
                case "vibrant":
                    c = addEffect(t, "ADBE Vibrance"); if (c) { setByName(c, "Vibrance", 50); setByName(c, "Saturation", 10); }
                    c = addEffect(t, "ADBE Brightness & Contrast 2"); if (c) setByName(c, "Contrast", 15); break;
                case "faded":
                    c = addEffect(t, "ADBE CurvesCustom"); h = addEffect(t, "ADBE HUE SATURATION");
                    var lv = addEffect(t, "ADBE Easy Levels2"); if (lv) setByName(lv, "Output Black", 25 / 255);
                    break;
                case "lumetri": addEffect(t, "ADBE Lumetri"); break;
                case "vignette":
                    var v = comp.layers.addSolid([0, 0, 0], N("vignette"), comp.width, comp.height, comp.pixelAspect, comp.duration);
                    var m = v.Masks.addProperty("ADBE Mask Atom"); m.maskMode = MaskMode.SUBTRACT;
                    var sh = new Shape(), w = comp.width, hh = comp.height, k = 0.5523;
                    sh.vertices = [[w / 2, 0], [w, hh / 2], [w / 2, hh], [0, hh / 2]];
                    sh.inTangents = [[-w / 2 * k, 0], [0, -hh / 2 * k], [w / 2 * k, 0], [0, hh / 2 * k]];
                    sh.outTangents = [[w / 2 * k, 0], [0, hh / 2 * k], [-w / 2 * k, 0], [0, -hh / 2 * k]];
                    sh.closed = true; m.property("ADBE Mask Shape").setValue(sh);
                    m.property("ADBE Mask Feather").setValue([w * 0.25, w * 0.25]);
                    v.property("ADBE Transform Group").property("ADBE Opacity").setValue(70);
                    break;
                default: break;
            }
        }
        return ok({});
    });
}

/* ------------------------------------------------------------------ */
/* LEGENDAS AUTOMÁTICAS + FACE TRACKING                                 */
/* ------------------------------------------------------------------ */
/* informações da layer de vídeo selecionada (para o servidor de IA) */
function mf_getSelectedMedia() {
    try {
        var comp = activeComp(), L = selLayers(comp, false), ly = null, i;
        for (i = 0; i < L.length; i++) if (L[i].source && L[i].source.file) { ly = L[i]; break; }
        if (!ly) for (i = 1; i <= comp.numLayers; i++) { var c = comp.layer(i); if (c.source && c.source.file && c.hasVideo) { ly = c; break; } }
        if (!ly) throw new Error("Nenhuma layer de vídeo/áudio com arquivo encontrada.");
        return ok({
            path: ly.source.file.fsName, layer: ly.name, index: ly.index,
            startTime: ly.startTime, inPoint: ly.inPoint, outPoint: ly.outPoint, stretch: ly.stretch,
            width: ly.source.width, height: ly.source.height, compW: comp.width, compH: comp.height,
            fps: comp.frameRate, compName: comp.name
        });
    } catch (e) { return fail(e); }
}

function deepGlow(layer, strength) {
    strength = strength || 1;
    // Usa o plugin Deep Glow (Plugin Everything) se estiver instalado; senão simula com 2 Glows + Gaussian.
    var dg = addEffect(layer, "Deep Glow") || addEffect(layer, "PEDG");
    if (dg) { setByName(dg, "Radius", 60 * strength); setByName(dg, "Exposure", 0.6 * strength); return; }
    var g1 = addEffect(layer, "ADBE Glo2");
    if (g1) { g1.name = N("glowIn"); setByName(g1, "Glow Threshold", 40); setByName(g1, "Glow Radius", 12 * strength); setByName(g1, "Glow Intensity", 1.2); }
    var g2 = addEffect(layer, "ADBE Glo2");
    if (g2) { g2.name = N("glowOut"); setByName(g2, "Glow Threshold", 30); setByName(g2, "Glow Radius", 70 * strength); setByName(g2, "Glow Intensity", 0.8); }
}
function styleCaption(layer, st) {
    var tp = layer.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
    try { td.resetCharStyle(); } catch (e) {}
    td.font = st.font || "Arial-BoldMT";
    td.fontSize = st.size || 64;
    td.applyFill = true; td.fillColor = st.color || [1, 1, 1];
    if (st.stroke) { td.applyStroke = true; td.strokeColor = [0, 0, 0]; td.strokeWidth = st.stroke; td.strokeOverFill = false; }
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    if (st.upper) td.text = String(td.text).toUpperCase();
    tp.setValue(td);
    if (st.glow !== false) deepGlow(layer, st.glowStrength || 1);
    if (st.shadow !== false) {
        var ds = addEffect(layer, "ADBE Drop Shadow");
        if (ds) { setByName(ds, "Opacity", 0.85 * 255); setByName(ds, "Distance", 6); setByName(ds, "Softness", 18); setByName(ds, "Direction", 150); }
    }
}
/*  arg: {
 *    segments:[{start,end,text}] (tempo da mídia em s),
 *    media:{index,startTime,stretch, width,height},
 *    style:{font,size,color,stroke,upper,glow,shadow,anim},
 *    track:{fps, points:[{t,x,y,s}]  (x,y normalizados 0-1 no frame da mídia, s = tamanho do rosto)},
 *    offset:[dx,dy]  (deslocamento da legenda em relação à cabeça, px)
 *  } */
function mf_createCaptions(arg) {
    return undo("Legendas automáticas", function () {
        var o = parseArg(arg), comp = activeComp(), st = o.style || {}, i;
        var media = comp.layer(o.media.index), stretch = (o.media.stretch || 100) / 100, st0 = o.media.startTime || 0;
        function mediaToComp(t) { return st0 + t * stretch; }
        var follow = null;
        if (o.track && o.track.points && o.track.points.length) {
            follow = comp.layers.addNull(); follow.name = N("faceTrack"); follow.label = 11;
            var ctl = addEffect(follow, "ADBE Point Control"); ctl.name = N("face");
            var sz = addEffect(follow, "ADBE Slider Control"); sz.name = N("faceSize");
            var offX = addEffect(follow, "ADBE Slider Control"); offX.name = N("offX");
            var offY = addEffect(follow, "ADBE Slider Control"); offY.name = N("offY");
            var smooth = addEffect(follow, "ADBE Slider Control"); smooth.name = N("smooth");
            offX.property(1).setValue(o.offset ? o.offset[0] : 0);
            offY.property(1).setValue(o.offset ? o.offset[1] : 0);
            smooth.property(1).setValue(3);
            var pts = o.track.points, times = [], vals = [], svals = [];
            for (i = 0; i < pts.length; i++) {
                times.push(mediaToComp(pts[i].t));
                vals.push([pts[i].x * o.media.width, pts[i].y * o.media.height]);
                svals.push(pts[i].s * o.media.height);
            }
            ctl.property(1).setValuesAtTimes(times, vals);
            sz.property(1).setValuesAtTimes(times, svals);
            follow.property("ADBE Transform Group").property("ADBE Position").expression =
                'L=thisComp.layer("' + media.name.replace(/"/g, '\\"') + '");\n' +
                'n=Math.max(1,Math.round(effect("' + N("smooth") + '")(1)));f=thisComp.frameDuration;acc=[0,0];\n' +
                'for(i=-n;i<=n;i++){acc+=effect("' + N("face") + '")(1).valueAtTime(time+i*f);}\n' +
                'p=L.toComp(acc/(2*n+1));\n' +
                'p+[effect("' + N("offX") + '")(1), effect("' + N("offY") + '")(1)]';
        }
        var made = 0;
        for (i = 0; i < o.segments.length; i++) {
            var sg = o.segments[i], txt = String(sg.text).replace(/^\s+|\s+$/g, "");
            if (!txt) continue;
            var t = comp.layers.addText(txt);
            t.name = N("caption") + " " + (i + 1) + " - " + txt.substr(0, 20);
            t.label = 3;
            t.inPoint = mediaToComp(sg.start); t.outPoint = Math.max(mediaToComp(sg.end), t.inPoint + comp.frameDuration * 2);
            styleCaption(t, st);
            var pos = t.property("ADBE Transform Group").property("ADBE Position");
            if (follow) { t.parent = null; pos.expression = 'thisComp.layer("' + follow.name + '").toComp([0,0,0])'; }
            else pos.setValue([comp.width / 2, comp.height * (st.y || 0.8)]);
            if (st.anim && st.anim !== "none") {
                var sc = t.property("ADBE Transform Group").property("ADBE Scale"), op = t.property("ADBE Transform Group").property("ADBE Opacity");
                var a = t.inPoint, d = Math.min(0.15, (t.outPoint - t.inPoint) / 3);
                if (st.anim === "pop") { sc.setValueAtTime(a, [70, 70]); sc.setValueAtTime(a + d * 0.7, [108, 108]); sc.setValueAtTime(a + d, [100, 100]); easeAll(sc); }
                if (st.anim === "fade") { op.setValueAtTime(a, 0); op.setValueAtTime(a + d, 100); }
            }
            made++;
        }
        return ok({ count: made });
    });
}

/* ------------------------------------------------------------------ */
/* FRAME export / import (Background remover, Remover pessoas)         */
/* ------------------------------------------------------------------ */
function mf_exportFrame(arg) {
    try {
        var o = parseArg(arg), comp = activeComp();
        var f = new File(o.path);
        if (f.exists) f.remove();
        if (typeof comp.saveFrameToPng === "function") {
            comp.saveFrameToPng(comp.time, f);
            var waited = 0; while (!f.exists && waited < 15000) { $.sleep(100); waited += 100; }
        } else {
            // fallback: render queue de 1 frame
            var rq = app.project.renderQueue.items.add(comp);
            rq.timeSpanStart = comp.time; rq.timeSpanDuration = comp.frameDuration;
            var om = rq.outputModule(1);
            try { om.applyTemplate("_HIDDEN X-Factor 8 Premul"); } catch (e) {}
            try { om.applyTemplate("PNG Sequence"); } catch (e2) {}
            om.file = new File(o.path.replace(/\.png$/i, "_[#####].png"));
            app.project.renderQueue.render();
            rq.remove();
            var dir = new Folder(f.parent.fsName), found = dir.getFiles(f.name.replace(/\.png$/i, "_*.png"));
            if (found.length) found[0].rename(f.name);
        }
        if (!new File(o.path).exists) throw new Error("Falha ao exportar o frame.");
        return ok({ path: o.path, time: comp.time, width: comp.width, height: comp.height });
    } catch (e) { return fail(e); }
}
/* arg: {path, addToComp, still(bool), name, folder} */
function mf_importFile(arg) {
    return undo("Importar", function () {
        var o = parseArg(arg), f = new File(o.path);
        if (!f.exists) throw new Error("Arquivo não existe: " + o.path);
        var io = new ImportOptions(f);
        var item = app.project.importFile(io);
        if (o.name) item.name = o.name;
        var folder = getFolder(o.folder || N("imports")); item.parentFolder = folder;
        if (o.addToComp) {
            var comp = activeComp(), ly = comp.layers.add(item);
            ly.startTime = (o.still ? comp.time : (o.atCTI ? comp.time : 0));
            if (o.still) { ly.inPoint = comp.time; ly.outPoint = comp.time + (o.stillDur || comp.frameDuration); }
            if (o.fit) { try { mf_fitToComp(JSON.stringify({ mode: "fit" })); } catch (z) {} }
            ly.selected = true;
        }
        return ok({ name: item.name });
    });
}
function getFolder(name) {
    var i, it;
    for (i = 1; i <= app.project.numItems; i++) { it = app.project.item(i); if (it instanceof FolderItem && it.name === name && it.parentFolder === app.project.rootFolder) return it; }
    return app.project.items.addFolder(name);
}
function mf_projectFolder() {
    try { var f = app.project.file; return ok({ path: f ? f.parent.fsName : Folder.myDocuments.fsName }); } catch (e) { return fail(e); }
}

/* ------------------------------------------------------------------ */
/* RENDER                                                               */
/* ------------------------------------------------------------------ */
function mf_render(arg) {
    return undo("Render", function () {
        var o = parseArg(arg), comp = activeComp();
        var rq = app.project.renderQueue.items.add(comp), om = rq.outputModule(1), tpl = om.templates, i;
        var want = o.format === "prores" ? /ProRes 422 HQ|ProRes 4444|Apple ProRes/i : (o.format === "png" ? /PNG/i : /H\.264|High Quality with Alpha|Lossless/i);
        for (i = 0; i < tpl.length; i++) if (want.test(tpl[i])) { try { om.applyTemplate(tpl[i]); break; } catch (e) {} }
        if (o.workArea === false) { rq.timeSpanStart = 0; rq.timeSpanDuration = comp.duration; }
        if (o.folder) om.file = new File(o.folder + "/" + comp.name);
        if (o.start) app.project.renderQueue.render();
        return ok({ templates: tpl });
    });
}

/* ------------------------------------------------------------------ */
/* ORGANIZADOR DE PROJETO                                               */
/* ------------------------------------------------------------------ */
var MF_LABEL = { text: 3, shape: 8, camera: 13, light: 6, null: 1, adjustment: 5, solid: 15, audio: 10, precomp: 12, video: 9, image: 4, sequence: 14, unknown: 0 };
var MF_PREFIX = { text: "TXT", shape: "SHP", camera: "CAM", light: "LIGHT", null: "CTRL", adjustment: "ADJ", solid: "SOLID", audio: "AUDIO", precomp: "COMP", video: "VIDEO", image: "IMG", sequence: "SEQ", unknown: "LAYER" };
function classify(ly) {
    if (ly instanceof TextLayer) return "text";
    if (ly instanceof ShapeLayer) return "shape";
    if (ly instanceof CameraLayer) return "camera";
    if (ly instanceof LightLayer) return "light";
    if (ly.nullLayer) return "null";
    if (ly.adjustmentLayer) return "adjustment";
    var s = ly.source;
    if (!s) return "unknown";
    if (s instanceof CompItem) return "precomp";
    if (s.mainSource instanceof SolidSource) return "solid";
    if (!ly.hasVideo && ly.hasAudio) return "audio";
    if (s.mainSource && s.mainSource.isStill) return "image";
    if (s.file && /\.(png|jpe?g|tiff?|exr|dpx|tga)$/i.test(s.file.name) && s.duration > s.frameDuration) return "sequence";
    if (s.file) return "video";
    return "unknown";
}
function smartName(ly, type, idx) {
    var base = "";
    if (type === "text") { try { base = String(ly.property("ADBE Text Properties").property("ADBE Text Document").value.text).replace(/[\r\n]+/g, " ").substr(0, 24); } catch (e) {} }
    else if (ly.source && ly.source.file) base = ly.source.file.displayName.replace(/\.[^.]+$/, "");
    else if (ly.source) base = ly.source.name;
    else if (type === "shape") {
        var c = ly.property("ADBE Root Vectors Group"), hint = "";
        for (var i = 1; i <= c.numProperties && !hint; i++) {
            var g = c.property(i); if (g.matchName !== "ADBE Vector Group") continue;
            var cont = g.property("ADBE Vectors Group");
            for (var j = 1; j <= cont.numProperties; j++) {
                var mn = cont.property(j).matchName;
                if (mn === "ADBE Vector Shape - Rect") { hint = N("rect"); break; }
                if (mn === "ADBE Vector Shape - Ellipse") { hint = N("circle"); break; }
                if (mn === "ADBE Vector Shape - Star") { hint = N("star"); break; }
                if (mn === "ADBE Vector Shape - Group") { hint = N("path"); }
            }
        }
        base = hint || N("shape");
    }
    var fx = ly.property("ADBE Effect Parade");
    if (type === "adjustment" && fx && fx.numProperties) base = fx.property(1).name;
    if (type === "null") base = N("control");
    if (!base) base = ly.name;
    return MF_PREFIX[type] + " | " + base;
}
/* arg: {scope:"active"|"all", rename, color, folders, precompose:"none"|"runs"|"type", removeUnused} */
function mf_organize(arg) {
    return undo("Organizar projeto", function () {
        var o = parseArg(arg), comps = [], i, j, report = { layers: 0, precomps: 0, moved: 0, removed: 0, types: {} };
        if (o.scope === "all") { for (i = 1; i <= app.project.numItems; i++) if (app.project.item(i) instanceof CompItem) comps.push(app.project.item(i)); }
        else comps.push(activeComp());
        for (i = 0; i < comps.length; i++) {
            var comp = comps[i], types = [];
            for (j = 1; j <= comp.numLayers; j++) {
                var ly = comp.layer(j), tp = classify(ly);
                types.push(tp);
                report.types[tp] = (report.types[tp] || 0) + 1;
                if (o.color !== false) ly.label = MF_LABEL[tp];
                if (o.rename !== false && ly.name.indexOf(" | ") < 0) { try { ly.name = smartName(ly, tp, j); } catch (e) {} }
                report.layers++;
            }
            if (o.precompose === "runs" || o.precompose === "type") {
                var groups = [];
                if (o.precompose === "runs") {
                    var start = 1;
                    for (j = 2; j <= comp.numLayers + 1; j++) {
                        if (j > comp.numLayers || types[j - 1] !== types[start - 1]) {
                            if (j - start >= 2) groups.push({ type: types[start - 1], idx: range(start, j - 1) });
                            start = j;
                        }
                    }
                } else {
                    var byT = {};
                    for (j = 1; j <= comp.numLayers; j++) { if (!byT[types[j - 1]]) byT[types[j - 1]] = []; byT[types[j - 1]].push(j); }
                    for (var k in byT) if (byT.hasOwnProperty(k) && byT[k].length >= 2) groups.push({ type: k, idx: byT[k] });
                }
                // de baixo para cima para não bagunçar índices
                groups.sort(function (a, b) { return b.idx[0] - a.idx[0]; });
                for (j = 0; j < groups.length; j++) {
                    var g = groups[j];
                    if (g.type === "camera" || g.type === "light" || g.type === "null") continue;
                    var pc = comp.layers.precompose(g.idx, comp.name + " - " + MF_PREFIX[g.type], true);
                    pc.parentFolder = getFolder(N("precompFolder"));
                    comp.layer(g.idx[0]).label = MF_LABEL[g.type];
                    comp.layer(g.idx[0]).name = "COMP | " + MF_PREFIX[g.type];
                    report.precomps++;
                }
            }
        }
        if (o.removeUnused) { report.removed = app.project.removeUnusedFootage(); }
        if (o.folders !== false) {
            var items = [];
            for (i = 1; i <= app.project.numItems; i++) items.push(app.project.item(i));
            for (i = 0; i < items.length; i++) {
                var it = items[i], dest = null;
                if (it instanceof FolderItem) continue;
                if (it.parentFolder !== app.project.rootFolder) continue;
                if (it instanceof CompItem) dest = N("fComps");
                else if (it.mainSource instanceof SolidSource) dest = N("fSolids");
                else if (it.mainSource && it.mainSource.isStill) dest = N("fImages");
                else if (it.hasVideo) dest = N("fVideos");
                else if (it.hasAudio) dest = N("fAudio");
                if (dest) { it.parentFolder = getFolder(dest); report.moved++; }
            }
        }
        return ok(report);
    });
}
function range(a, b) { var r = [], i; for (i = a; i <= b; i++) r.push(i); return r; }

/* ------------------------------------------------------------------ */
/* PROJECT / misc                                                       */
/* ------------------------------------------------------------------ */
function mf_info() {
    try {
        var c = app.project.activeItem, info = { version: app.version, project: app.project.file ? app.project.file.name : "(não salvo)" };
        if (c && c instanceof CompItem) { info.comp = c.name; info.w = c.width; info.h = c.height; info.fps = c.frameRate; info.dur = c.duration; info.sel = c.selectedLayers.length; }
        return ok(info);
    } catch (e) { return fail(e); }
}
function mf_compSettings(arg) {
    return undo("Comp settings", function () {
        var o = parseArg(arg), comp = activeComp();
        if (o.w && o.h) { comp.width = o.w; comp.height = o.h; }
        if (o.fps) comp.frameRate = o.fps;
        if (o.dur) comp.duration = o.dur;
        return ok({});
    });
}
function mf_newComp(arg) {
    return undo("Nova comp", function () {
        var o = parseArg(arg);
        var c = app.project.items.addComp(o.name || N("newComp"), o.w || 1080, o.h || 1920, 1, o.dur || 15, o.fps || 30);
        c.openInViewer();
        return ok({});
    });
}
function mf_compFromSelection() {
    return undo("Comp do footage", function () {
        var s = app.project.selection, i, n = 0;
        for (i = 0; i < s.length; i++) if (s[i] instanceof FootageItem && s[i].hasVideo) {
            var c = app.project.items.addComp(s[i].name.replace(/\.[^.]+$/, ""), s[i].width, s[i].height, s[i].pixelAspect, s[i].duration > 0 ? s[i].duration : 10, s[i].frameRate || 30);
            c.layers.add(s[i]); n++; if (n === 1) c.openInViewer();
        }
        if (!n) throw new Error("Selecione footage no painel Project.");
        return ok({ count: n });
    });
}

/* ================================================================== */
/* MAGICTOUCH — Leitor de links / importação automática                */
/* ================================================================== */
function getFolderIn(parent, name) {
    var i, it;
    for (i = 1; i <= parent.numItems; i++) { it = parent.item(i); if (it instanceof FolderItem && it.name === name) return it; }
    var f = app.project.items.addFolder(name); f.parentFolder = parent; return f;
}
function itemById(id) {
    if (app.project.itemByID) { try { return app.project.itemByID(id); } catch (e) {} }
    for (var i = 1; i <= app.project.numItems; i++) if (app.project.item(i).id === id) return app.project.item(i);
    return null;
}
var MT_KIND_FOLDER = { video: "kVideo", audio: "kAudio", image: "kImage", ai: "Illustrator", psd: "Photoshop", aep: "kAep" };

/* arg: {files:[{path,kind,name,group}], title, aiAsComp, addToComp} */
function mf_importAssets(arg) {
    return undo("Importar link", function () {
        var o = parseArg(arg), root = getFolderIn(app.project.rootFolder, "MagicTouch Import");
        var base = getFolderIn(root, o.title || N("pack")), i, rep = { imported: 0, failed: [], skipped: 0 };
        var comp = null; if (o.addToComp) { try { comp = activeComp(); } catch (e) {} }
        for (i = 0; i < o.files.length; i++) {
            var f = o.files[i], folderName = MT_KIND_FOLDER[f.kind] ? N(MT_KIND_FOLDER[f.kind]) : null;
            if (!folderName) { rep.skipped++; continue; }
            try {
                var file = new File(f.path), io = new ImportOptions(file);
                if ((f.kind === "ai" || f.kind === "psd") && o.aiAsComp && io.canImportAs(ImportAsType.COMP_CROPPED_LAYERS)) io.importAs = ImportAsType.COMP_CROPPED_LAYERS;
                if (f.kind === "aep") io.importAs = ImportAsType.PROJECT;
                var item = app.project.importFile(io);
                var dest = getFolderIn(base, folderName);
                if (f.group && f.kind !== "aep") {
                    var parts = String(f.group).split("/"), d = dest;
                    for (var p = 0; p < parts.length && p < 3; p++) if (parts[p]) d = getFolderIn(d, parts[p]);
                    dest = d;
                }
                item.parentFolder = dest;
                if (comp && (f.kind === "video" || f.kind === "image" || f.kind === "audio")) comp.layers.add(item);
                rep.imported++;
            } catch (e) { rep.failed.push(f.name + ": " + e.message); }
        }
        return ok(rep);
    });
}

/* ================================================================== */
/* MAGICTOUCH — Criador automático de projeto de presets (.ffx)        */
/* ================================================================== */
var MT_ADJ_HINT = /(transi|shake|zoom|glitch|color|cor|cc|lut|grade|blur|distort|warp|flash|light|leak|rgb|vhs|film|camera|cam |overlay|fx)/i;

function layerFingerprint(l) {
    var n = 0;
    try { n += l.property("ADBE Effect Parade").numProperties * 1000; } catch (e) {}
    try { n += l.property("ADBE Text Properties").property("ADBE Text Animators").numProperties * 100000; } catch (e2) {}
    walkProps(l, function (p) { if (p.canVaryOverTime) n += p.numKeys + (p.expression ? 1 : 0); });
    return n;
}
function centerLayer(comp, l) {
    try {
        var r = l.sourceRectAtTime(0, false), tr = l.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
        tr.property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
    } catch (e) {}
}
/* arg: {presets:[{path,name,group}], w,h,fps,dur, mode:"auto|text|adjustment|solid", bg:true, proportional:false, title} */
function mf_buildPresetProject(arg) {
    return undo("Criar projeto de presets", function () {
        var o = parseArg(arg), w = o.w || 1920, h = o.h || 1080, fps = o.fps || 30, dur = o.dur || 5;
        var root = getFolderIn(app.project.rootFolder, "MagicTouch Presets"), base = getFolderIn(root, o.title || "Presets");
        var i, made = 0, failed = [], first = null;
        for (i = 0; i < o.presets.length; i++) {
            var ps = o.presets[i], f = new File(ps.path);
            if (!f.exists) { failed.push(ps.name + ": arquivo não existe"); continue; }
            var folder = base;
            if (ps.group) { var parts = String(ps.group).split("/"); for (var q = 0; q < parts.length && q < 3; q++) if (parts[q]) folder = getFolderIn(folder, parts[q]); }
            var comp = app.project.items.addComp(ps.name, w, h, 1, dur, fps);
            comp.parentFolder = folder; comp.comment = "MT_FFX:" + f.fsName; comp.bgColor = [0.04, 0.03, 0.08];
            if (o.bg !== false) {
                var bg = comp.layers.addSolid([0.06, 0.05, 0.11], "BG", w, h, 1, dur); bg.locked = false;
                var ramp = addEffect(bg, "ADBE Ramp");
                if (ramp) { try { ramp.property(1).setValue([w / 2, 0]); ramp.property(2).setValue([0.16, 0.1, 0.3, 1]); ramp.property(3).setValue([w / 2, h]); ramp.property(4).setValue([0.02, 0.02, 0.05, 1]); } catch (e0) {} }
                bg.label = 0; bg.locked = true;
            }
            var txt = comp.layers.addText(ps.name), tp = txt.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
            try { td.resetCharStyle(); } catch (e1) {}
            td.font = "Arial-BoldMT"; td.fontSize = Math.round(Math.min(w, h) / 9); td.applyFill = true; td.fillColor = [1, 1, 1];
            td.justification = ParagraphJustification.CENTER_JUSTIFY;
            try { tp.setValue(td); } catch (e2) {}
            txt.name = ps.name; centerLayer(comp, txt); txt.label = 3;
            var mode = o.mode || "auto", target = txt;
            if (mode === "adjustment" || (mode === "auto" && MT_ADJ_HINT.test(ps.name + " " + (ps.group || "")))) {
                target = comp.layers.addSolid([1, 1, 1], "FX | " + ps.name, w, h, 1, dur); target.adjustmentLayer = true; target.label = 5;
            } else if (mode === "solid") {
                target = comp.layers.addSolid([0.5, 0.4, 1], "SOLID | " + ps.name, Math.round(w / 3), Math.round(w / 3), 1, dur); target.label = 9;
            }
            try {
                for (var s = 1; s <= comp.numLayers; s++) comp.layer(s).selected = false;
                target.selected = true;
                var before = layerFingerprint(target);
                target.applyPreset(f);
                // modo auto: se aplicar na layer de texto não mudou nada, tenta numa adjustment
                if (mode === "auto" && target === txt && layerFingerprint(txt) === before) {
                    var adj = comp.layers.addSolid([1, 1, 1], "FX | " + ps.name, w, h, 1, dur); adj.adjustmentLayer = true; adj.label = 5;
                    adj.selected = true; adj.applyPreset(f); target = adj;
                }
                if (o.proportional) walkProps(target, function (p) { if (p.canVaryOverTime && p.numKeys > 1) fitPropToRange(p, 0, dur - comp.frameDuration, { mode: "stretch" }); });
                made++; if (!first) first = comp;
            } catch (e3) { failed.push(ps.name + ": " + e3.message); }
        }
        if (first && o.open !== false) first.openInViewer();
        return ok({ made: made, failed: failed });
    });
}

/* comps criadas pelo MagicTouch a partir de .ffx */
function mf_listPresetComps() {
    try {
        var out = [], i, it;
        for (i = 1; i <= app.project.numItems; i++) {
            it = app.project.item(i);
            if (it instanceof CompItem && it.comment && it.comment.indexOf("MT_FFX:") === 0) {
                var grp = [], pf = it.parentFolder;
                while (pf && pf !== app.project.rootFolder && pf.name !== "MagicTouch Presets") { grp.unshift(pf.name); pf = pf.parentFolder; }
                out.push({ id: it.id, name: it.name, path: it.comment.substr(7), group: grp.slice(1).join("/") });
            }
        }
        return ok({ items: out });
    } catch (e) { return fail(e); }
}
function safeName(s) { return String(s).replace(/[\\\/:*?"<>|]/g, "_"); }
/* arg: {dest, keepFolders:true} — salva todos os .ffx do projeto (com o nome atual da comp) */
function mf_exportPresets(arg) {
    try {
        var o = parseArg(arg), list = JSON.parse(mf_listPresetComps()).items, i, n = 0, miss = [];
        o.dest = String(o.dest).replace(/\\/g, "/").replace(/\/$/, "");
        for (i = 0; i < list.length; i++) {
            var src = new File(list[i].path);
            if (!src.exists) { miss.push(list[i].name); continue; }
            var dir = o.dest + (o.keepFolders !== false && list[i].group ? "/" + list[i].group : "");
            var fd = new Folder(dir); if (!fd.exists) { var parts = dir.split("/"), acc = ""; for (var p = 0; p < parts.length; p++) { acc += (p ? "/" : "") + parts[p]; if (acc && !new Folder(acc).exists) new Folder(acc).create(); } }
            if (src.copy(dir + "/" + safeName(list[i].name) + ".ffx")) n++; else miss.push(list[i].name);
        }
        return ok({ count: n, missing: miss });
    } catch (e) { return fail(e); }
}
/* abre o diálogo nativo "Save Animation Preset" para a layer/props selecionadas (presets modificados) */
function mf_saveAnimationPreset() {
    try { app.executeCommand(app.findMenuCommandId("Save Animation Preset...")); return ok({}); } catch (e) { return fail(e); }
}

/* ================================================================== */
/* MAGICTOUCH — Mídias não encontradas                                 */
/* ================================================================== */
function mf_missingFootage() {
    try {
        var out = [], i, it;
        for (i = 1; i <= app.project.numItems; i++) {
            it = app.project.item(i);
            if (!(it instanceof FootageItem) || !it.footageMissing) continue;
            var path = "";
            try { path = it.missingFootagePath || (it.file ? it.file.fsName : ""); } catch (e) { try { path = it.file ? it.file.fsName : ""; } catch (e2) {} }
            var seq = false; try { seq = !it.mainSource.isStill && /\.(png|jpe?g|tiff?|exr|dpx|tga)$/i.test(path) && it.duration > it.frameDuration; } catch (e3) {}
            out.push({ id: it.id, name: it.name, path: path, file: String(path).split(/[\\\/]/).pop(), used: it.usedIn.length, seq: seq, w: it.width, h: it.height });
        }
        return ok({ items: out });
    } catch (e) { return fail(e); }
}
/* arg: {items:[{id, path, seq}]} */
function mf_replaceFootage(arg) {
    return undo("Substituir mídias", function () {
        var o = parseArg(arg), i, n = 0, errs = [];
        for (i = 0; i < o.items.length; i++) {
            var it = itemById(o.items[i].id), f = new File(o.items[i].path);
            if (!it || !f.exists) { errs.push(String(o.items[i].path)); continue; }
            try {
                if (o.items[i].seq) it.replaceWithSequence(f, false); else it.replace(f);
                n++;
            } catch (e) { errs.push(it.name + ": " + e.message); }
        }
        return ok({ count: n, errors: errs });
    });
}
/* substitui por um placeholder (solid colorido) para o projeto abrir sem avisos */
function mf_placeholderFootage(arg) {
    return undo("Placeholder", function () {
        var o = parseArg(arg), i, n = 0;
        for (i = 0; i < o.ids.length; i++) {
            var it = itemById(o.ids[i]); if (!it) continue;
            it.replaceWithPlaceholder(it.name, it.width || 1920, it.height || 1080, it.frameRate || 30, it.duration || 10); n++;
        }
        return ok({ count: n });
    });
}

/* ================================================================== */
/* MAGICTOUCH — Projeto (salvar incremental, reduzir, limpar cache)    */
/* ================================================================== */
function mf_projectTool(arg) {
    return undo("Projeto", function () {
        var o = parseArg(arg), r = {};
        switch (o.tool) {
            case "save_inc":
                var f = app.project.file; if (!f) throw new Error("Salve o projeto uma vez primeiro.");
                var nm = f.name.replace(/\.aep$/i, ""), m = nm.match(/^(.*?)(?:_v(\d+))?$/), v = m[2] ? parseInt(m[2], 10) + 1 : 2;
                var nf = new File(f.parent.fsName + "/" + m[1] + "_v" + (v < 10 ? "0" : "") + v + ".aep");
                app.project.save(nf); r.path = nf.fsName; break;
            case "reduce": app.project.reduceProject(app.project.selection.length ? app.project.selection : [activeComp()]); break;
            case "unused": r.removed = app.project.removeUnusedFootage(); break;
            case "consolidate": r.removed = app.project.consolidateFootage(); break;
            case "purge": app.purge(PurgeTarget.ALL_CACHES); break;
            case "collect": app.executeCommand(app.findMenuCommandId("Collect Files...")); break;
            default: throw new Error("?");
        }
        return ok(r);
    });
}
