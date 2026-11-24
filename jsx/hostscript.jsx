/*  MagicTouch \u2014 ExtendScript host (After Effects)
 *  Todas as fun\u00e7\u00f5es p\u00fablicas come\u00e7am com mf_ e devolvem uma string JSON:
 *  {"ok":true, ...}  ou  {"ok":false,"error":"..."}
 *  ExtendScript = ES3: nada de let/const/arrow functions.
 */

/* ------------------------------------------------------------------ */
/* JSON m\u00ednimo (ExtendScript antigo n\u00e3o tem JSON nativo)               */
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
    if (!c || !(c instanceof CompItem)) throw new Error("Abra/selecione uma composi\u00e7\u00e3o.");
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

/* percorre todas as propriedades anim\u00e1veis de um grupo */
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
    adjustment: ["MT Ajuste", "MT Adjustment", "MT Ajuste", "MT R\u00e9glage"],
    solid: ["MT S\u00f3lido", "MT Solid", "MT S\u00f3lido", "MT Solide"],
    camera: ["MT C\u00e2mera", "MT Camera", "MT C\u00e1mara", "MT Cam\u00e9ra"],
    text: ["TEXTO", "TEXT", "TEXTO", "TEXTE"],
    precomp: ["MT Pr\u00e9-comp", "MT Precomp", "MT Precomp", "MT Pr\u00e9comp"],
    blurIn: ["MT Desfoque de entrada", "MT Blur In", "MT Desenfoque de entrada", "MT Flou d'entr\u00e9e"],
    glitch: ["MT Glitch", "MT Glitch", "MT Glitch", "MT Glitch"],
    glowIn: ["MT Deep Glow Interno", "MT Deep Glow Inner", "MT Deep Glow Interno", "MT Deep Glow Int\u00e9rieur"],
    glowOut: ["MT Deep Glow Externo", "MT Deep Glow Outer", "MT Deep Glow Externo", "MT Deep Glow Ext\u00e9rieur"],
    transition: ["MT Transi\u00e7\u00e3o", "MT Transition", "MT Transici\u00f3n", "MT Transition"],
    cc: ["MT Cor", "MT Color", "MT Color", "MT Couleur"],
    vignette: ["MT Vinheta", "MT Vignette", "MT Vi\u00f1eta", "MT Vignette"],
    faceTrack: ["MT Rastreio Facial", "MT Face Track", "MT Seguimiento Facial", "MT Suivi du Visage"],
    face: ["Rosto", "Face", "Rostro", "Visage"],
    faceSize: ["Tamanho do rosto", "Face Size", "Tama\u00f1o del rostro", "Taille du visage"],
    offX: ["Deslocamento X", "Offset X", "Desplazamiento X", "D\u00e9calage X"],
    offY: ["Deslocamento Y", "Offset Y", "Desplazamiento Y", "D\u00e9calage Y"],
    smooth: ["Suavizar", "Smooth", "Suavizado", "Lissage"],
    caption: ["LEG", "CAP", "SUB", "ST"],
    precompFolder: ["MT Pr\u00e9-comps", "MT Precomps", "MT Precomps", "MT Pr\u00e9comps"],
    fComps: ["01 Comps", "01 Comps", "01 Comps", "01 Compositions"],
    fVideos: ["02 V\u00eddeos", "02 Videos", "02 Videos", "02 Vid\u00e9os"],
    fImages: ["03 Imagens", "03 Images", "03 Im\u00e1genes", "03 Images"],
    fAudio: ["04 \u00c1udio", "04 Audio", "04 Audio", "04 Audio"],
    fSolids: ["05 S\u00f3lidos", "05 Solids", "05 S\u00f3lidos", "05 Solides"],
    kVideo: ["V\u00eddeos", "Videos", "Videos", "Vid\u00e9os"],
    kAudio: ["\u00c1udio", "Audio", "Audio", "Audio"],
    kImage: ["Imagens", "Images", "Im\u00e1genes", "Images"],
    kAep: ["Projetos AEP", "AEP Projects", "Proyectos AEP", "Projets AEP"],
    imports: ["MT Importa\u00e7\u00f5es", "MT Imports", "MT Importaciones", "MT Imports"],
    pack: ["Pacote", "Package", "Paquete", "Archive"],
    newComp: ["MT Comp", "MT Comp", "MT Comp", "MT Comp"],
    rect: ["Ret\u00e2ngulo", "Rectangle", "Rect\u00e1ngulo", "Rectangle"],
    circle: ["C\u00edrculo", "Circle", "C\u00edrculo", "Cercle"],
    star: ["Estrela", "Star", "Estrella", "\u00c9toile"],
    path: ["Caminho", "Path", "Trazado", "Trac\u00e9"],
    shape: ["Forma", "Shape", "Forma", "Forme"],
    control: ["Controle", "Control", "Control", "Contr\u00f4le"]
};
function N(k) { var r = MT_NAMES[k]; return r ? r[MT_LI[MT_LANG] || 0] : k; }
function mf_setLang(arg) { var o = parseArg(arg); if (MT_LI[o.lang] !== undefined) MT_LANG = o.lang; return ok({ lang: MT_LANG }); }

/* ------------------------------------------------------------------ */
/* Keyframes: captura e recria\u00e7\u00e3o                                       */
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
 *  - stretch: 1\u00ba key -> inPoint, \u00faltimo -> outPoint (tudo escalado proporcionalmente)
 *  - intro_outro: keys da 1\u00aa metade escalam para o come\u00e7o, 2\u00aa metade ancora no fim
 *  - percent: anima\u00e7\u00e3o ocupa X% do clip a partir do in\u00edcio
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
        if (!f.exists) throw new Error("Preset n\u00e3o encontrado: " + o.path);
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
/* FLOW \u2014 curva bezier -> temporal ease do AE                          */
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

/* arg: {x1,y1,x2,y2}  \u2014 mesma nota\u00e7\u00e3o do cubic-bezier CSS */
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

/* l\u00ea a curva do primeiro par selecionado (para mostrar no gr\u00e1fico) */
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
            // compensa\u00e7\u00e3o manual (escala + rota\u00e7\u00e3o) para a layer n\u00e3o sair do lugar
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
/* EXPRESS\u00d5ES                                                           */
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
/* nomes amig\u00e1veis -> matchName */
var MF_PROPMAP = {
    "position": "ADBE Position", "scale": "ADBE Scale", "rotation": "ADBE Rotate Z", "opacity": "ADBE Opacity",
    "anchor": "ADBE Anchor Point", "sourceText": "ADBE Text Document", "timeRemap": "ADBE Time Remapping"
};
function findProp(layer, matchName) {
    var found = null;
    walkProps(layer, function (p) { if (!found && (p.matchName === matchName)) found = p; });
    return found;
}
/* arg: {expr, target?: "position"|matchName} \u2014 aplica nas props selecionadas ou no alvo */
/* aplica uma expressao e confere o erro que o proprio AE reporta; se der erro, desfaz */
function applyExprSafe(p, expr) {
    var old = "", err = "";
    try { old = p.expression; } catch (e0) {}
    try { p.expression = expr; } catch (e) { err = e.message || String(e); }
    if (!err) { try { err = p.expressionError || ""; } catch (e2) { err = ""; } }
    if (err) { try { p.expression = old; } catch (e3) {} }
    return err;
}
/* arg: {expr, target?: "position"|matchName, useSelected?: bool}
 * Ordem: 1) propriedade-alvo da expressao  2) propriedades selecionadas (se nao houver alvo) */
function mf_applyExpression(arg) {
    return undo("Expressao", function () {
        var o = parseArg(arg), comp = activeComp(), L = selLayers(comp, true), i, j, n = 0, errs = [];
        for (i = 0; i < L.length; i++) {
            var targets = [];
            if (o.target && !o.useSelected) {
                var mn = MF_PROPMAP[o.target] || o.target;
                if (!(mn === "ADBE Text Document" && !(L[i] instanceof TextLayer))) {
                    var p = findProp(L[i], mn);
                    if (p && mn === "ADBE Position" && p.dimensionsSeparated) { errs.push(L[i].name + ": Position com dimensoes separadas"); continue; }
                    if (p && p.canSetExpression) targets.push(p);
                }
            }
            if (!targets.length) {
                var sp = L[i].selectedProperties;
                for (j = 0; j < sp.length; j++) if (sp[j].propertyType === PropertyType.PROPERTY && sp[j].canSetExpression) targets.push(sp[j]);
            }
            for (j = 0; j < targets.length; j++) {
                var err = applyExprSafe(targets[j], o.expr);
                if (err) errs.push(L[i].name + " > " + targets[j].name + ": " + err); else n++;
            }
        }
        if (!n && errs.length) throw new Error(errs[0]);
        if (!n) throw new Error("Selecione uma propriedade (ou layer com a propriedade alvo).");
        return ok({ count: n, errors: errs });
    });
}
function mf_clearExpressions() {
    return undo("Limpar express\u00f5es", function () {
        var comp = activeComp(), L = selLayers(comp, true), i, n = 0;
        for (i = 0; i < L.length; i++) walkProps(L[i], function (p) { if (p.canSetExpression && p.expression) { p.expression = ""; n++; } });
        return ok({ count: n });
    });
}

/* ------------------------------------------------------------------ */
/* EFEITOS / EFEITO PR\u00d3PRIO (stack de efeitos salvo em JSON)           */
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
        if (!n) throw new Error("Efeito n\u00e3o dispon\u00edvel: " + o.name);
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
            if (d.expr) applyExprSafe(p, d.expr);
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
        if (!list.length) throw new Error("A layer selecionada n\u00e3o tem efeitos.");
        return ok({ effects: list });
    } catch (e) { return fail(e); }
}
function mf_applyEffectStack(arg) {
    return undo("Efeito pr\u00f3prio", function () {
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
/* MOTION LIBRARY (presets procedurais estilo "pack de anima\u00e7\u00f5es")     */
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
                case "shake": applyExprSafe(pos, "wiggle(" + (o.freq || 12) + "," + (o.amp || 25) + ")"); break;
                case "shake_rot": applyExprSafe(rot, "wiggle(10,4)"); break;
                case "bounce":
                    applyExprSafe(sc, "var n=0;if(numKeys>0){n=nearestKey(time).index;if(key(n).time>time)n--;}var t=(n==0)?0:time-key(n).time;if(n>0&&t<1){var v=velocityAtTime(key(n).time-thisComp.frameDuration/10);add(value,mul(v,0.06*Math.sin(3*t*2*Math.PI)/Math.exp(5*t)));}else{value;}");
                    break;
                case "flash":
                    var ex = addEffect(ly, "ADBE Exposure2");
                    if (ex) { var e1 = ex.property(3); e1.setValueAtTime(a, 4); e1.setValueAtTime(a + d, 0); }
                    break;
                case "glitch":
                    var ww = addEffect(ly, "ADBE Wave Warp");
                    if (ww) { ww.name = N("glitch"); setByName(ww, "Wave Type", 3); setByName(ww, "Wave Height", 0); setByName(ww, "Wave Width", 30);
                        try { applyExprSafe(ww.property(2), "seedRandom(Math.floor(time*12),true);(random()>0.8)?random(20,80):0"); } catch (gx) {} }
                    applyExprSafe(pos, "seedRandom(Math.floor(time*12),true);var v=value;if(random()>0.85){v[0]+=random(-25,25);}v");
                    break;
                case "fx_glow": deepGlow(ly, 1); break;
                default: throw new Error("Preset desconhecido: " + o.id);
            }
        }
        return ok({});
    });
}

/* transi\u00e7\u00f5es: cria adjustment layer no CTI (ou entre 2 clips selecionados) */
function applyTransition(comp, o) {
    var fd = comp.frameDuration, d = o.dur || 0.5, t = comp.time, L = selLayers(comp, false);
    if (L.length >= 2) { L.sort(function (x, y) { return x.inPoint - y.inPoint; }); t = L[1].inPoint; }
    var adj = comp.layers.addSolid([1, 1, 1], N("transition") + " " + o.id.replace("tr_", ""), comp.width, comp.height, comp.pixelAspect, d * 2);
    adj.adjustmentLayer = true; adj.label = 9; adj.startTime = t - d; adj.motionBlur = true; comp.motionBlur = true;
    var a = t - d, m = t, b = t + d;
    var tx = addEffect(adj, "ADBE Geometry2");
    tx.property("ADBE Geometry2-0011").setValue(false); // Use comp shutter angle off
    try { tx.property("ADBE Geometry2-0012").setValue(360); } catch (e0) {}
    var mir = addEffect(adj, "ADBE Tile"); // Motion Tile para n\u00e3o mostrar bordas
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
        case "tr_glitch":
            var gw = addEffect(adj, "ADBE Wave Warp");
            if (gw) applyExprSafe(gw.property(2), "var k=Math.abs(time-" + m + ");seedRandom(Math.floor(time*24),true);(k<" + d + ")?random(0,70):0");
            applyExprSafe(posP, "var k=Math.abs(time-" + m + ");var v=value;if(k<" + (d * 0.6) + "){seedRandom(Math.floor(time*24),true);v[0]+=random(-90,90);}v");
            break;
        case "tr_shake":
            applyExprSafe(posP, "var k=Math.abs(time-" + m + ");var amp=linear(k,0," + d + ",140,0);var w=wiggle(18,amp);[w[0],w[1]]");
            var oc = addEffect(adj, "ADBE Optics Compensation"); var fov = getP(oc, ["ADBE Optics Compensation-0001", "Field Of View (FOV)"]);
            if (fov) k3(fov, 0, 60, 0);
            break;
        case "tr_dzoom":
            k3(scP, 100, 30, 100);
            var oc2 = addEffect(adj, "ADBE Optics Compensation"); var fov2 = getP(oc2, ["ADBE Optics Compensation-0001", "Field Of View (FOV)"]);
            if (fov2) k3(fov2, 0, 90, 0);
            break;
        case "tr_zrot": k3(scP, 100, 260, 100); k3(rotP, 0, 90, 0); break;
        case "tr_pan": k3(posP, C, [C[0] - comp.width * 0.5, C[1]], C); break;
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
            // velocidade normal at\u00e9 t-half, lenta entre t-half e t+half, normal depois
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
/* LEGENDAS AUTOM\u00c1TICAS + FACE TRACKING                                 */
/* ------------------------------------------------------------------ */
/* informa\u00e7\u00f5es da layer de v\u00eddeo selecionada (para o servidor de IA) */
function mf_getSelectedMedia() {
    try {
        var comp = activeComp(), L = selLayers(comp, false), ly = null, i;
        for (i = 0; i < L.length; i++) if (L[i].source && L[i].source.file) { ly = L[i]; break; }
        if (!ly) for (i = 1; i <= comp.numLayers; i++) { var c = comp.layer(i); if (c.source && c.source.file && c.hasVideo) { ly = c; break; } }
        if (!ly) throw new Error("Nenhuma layer de v\u00eddeo/\u00e1udio com arquivo encontrada.");
        return ok({
            path: ly.source.file.fsName, layer: ly.name, index: ly.index,
            startTime: ly.startTime, inPoint: ly.inPoint, outPoint: ly.outPoint, stretch: ly.stretch,
            width: ly.source.width, height: ly.source.height, compW: comp.width, compH: comp.height,
            fps: comp.frameRate, compName: comp.name
        });
    } catch (e) { return fail(e); }
}


/* ================================================================== */
/* Setters robustos: matchName primeiro, nome em ingles depois         */
/* (funciona em AE de qualquer idioma)                                 */
/* ================================================================== */
function setP(group, keys, v) {
    var i, p;
    if (!group) return false;
    for (i = 0; i < keys.length; i++) {
        try { p = group.property(keys[i]); if (p) { p.setValue(v); return true; } } catch (e) {}
    }
    return false;
}
function getP(group, keys) {
    if (!group) return null;
    for (var i = 0; i < keys.length; i++) { try { var p = group.property(keys[i]); if (p) return p; } catch (e) {} }
    return null;
}
function col4(c) { return [c[0], c[1], c[2], c.length > 3 ? c[3] : 1]; }
function setColor(group, keys, c) { return setP(group, keys, col4(c)) || setP(group, keys, [c[0], c[1], c[2]]); }
function exprStr(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n"); }

/* ================================================================== */
/* BIBLIOTECA \u2014 presets de texto (estilo Animation Composer)           */
/* spec: {name, based:"chars|words|lines", props:{opacity,pos,scale,rot,blur,track,skew,fill},
 *        dir:"in|out|loop", order:"fwd|rev|rand", shape:"square|rampUp|...", smooth:0-100,
 *        loop:"wave|wiggle|flicker|pulse|color|breathe", dur}                                   */
/* ================================================================== */
var MT_BASED = { chars: 1, charsNoSpace: 2, words: 3, lines: 4 };
var MT_SHAPE = { square: 1, rampUp: 2, rampDown: 3, triangle: 4, round: 5, smooth: 6 };

function textAnimators(layer) { return layer.property("ADBE Text Properties").property("ADBE Text Animators"); }
function addAnimProps(getAP, P) {
    if (!P) return;
    var p;
    if (P.opacity !== undefined) { p = getAP().addProperty("ADBE Text Opacity"); p.setValue(P.opacity); }
    if (P.pos) { p = getAP().addProperty("ADBE Text Position 3D"); p.setValue([P.pos[0], P.pos[1], 0]); }
    if (P.scale) { p = getAP().addProperty("ADBE Text Scale 3D"); p.setValue([P.scale[0], P.scale[1], 100]); }
    if (P.rot !== undefined) { p = getAP().addProperty("ADBE Text Rotation"); p.setValue(P.rot); }
    if (P.blur !== undefined) { p = getAP().addProperty("ADBE Text Blur"); p.setValue([P.blur, P.blur]); }
    if (P.track !== undefined) { p = getAP().addProperty("ADBE Text Tracking Amount"); p.setValue(P.track); }
    if (P.skew !== undefined) { p = getAP().addProperty("ADBE Text Skew"); p.setValue(P.skew); }
    if (P.fill) { p = getAP().addProperty("ADBE Text Fill Color"); try { p.setValue(col4(P.fill)); } catch (e) { p.setValue([P.fill[0], P.fill[1], P.fill[2]]); } }
}
function keyLinear2(p, t0, v0, t1, v1, infl) {
    p.setValueAtTime(t0, v0); p.setValueAtTime(t1, v1);
    var k, e = [new KeyframeEase(0, infl || 70)];
    for (k = 1; k <= p.numKeys; k++) { try { p.setTemporalEaseAtKey(k, e, e); } catch (x) {} }
}
function buildTextPreset(comp, layer, spec, dur) {
    if (spec.decode) applyDecode(layer, dur, spec.decode === "loop");
    var hasProps = false, q; for (q in (spec.props || {})) if (spec.props.hasOwnProperty(q)) hasProps = true;
    if (!hasProps) return;
    var A0 = textAnimators(layer).addProperty("ADBE Text Animator");
    var ai = A0.propertyIndex;
    A0.name = "MT " + spec.name;
    function A() { return textAnimators(layer).property(ai); }
    function AP() { return A().property("ADBE Text Animator Properties"); }
    addAnimProps(AP, spec.props);
    var based = MT_BASED[spec.based || "chars"] || 1;

    if (spec.dir === "loop") {
        if (spec.loop === "wiggle") {
            A().property("ADBE Text Selectors").addProperty("ADBE Text Wiggly Selector");
            var w = A().property("ADBE Text Selectors").property(1);
            setP(w, ["ADBE Text Range Type2"], based);
            setP(w, ["ADBE Text Wiggly Wiggles", "Wiggles/Second"], spec.freq || 3);
            return;
        }
        A().property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
        var xs = A().property("ADBE Text Selectors").property(1);
        setP(xs, ["ADBE Text Range Type2"], based);
        var code = {
            wave: "var a=(Math.sin((time*2-textIndex*0.18)*Math.PI*2)+1)*50;[a,a,a]",
            pulse: "var a=(Math.sin(time*4-textIndex*0.6)+1)*50;[a,a,a]",
            flicker: "seedRandom(textIndex*13+Math.floor(time*12),true);var a=random()>0.82?100:0;[a,a,a]",
            color: "var a=(Math.sin((time*1.5-textIndex*0.12)*Math.PI*2)+1)*50;[a,a,a]",
            breathe: "var a=(Math.sin(time*2)+1)*50;[a,a,a]",
            bounce: "var t=(time*1.6-textIndex*0.12)%1;var a=t<0.5?Math.sin(t*Math.PI*2)*100:0;a=Math.max(0,a);[a,a,a]"
        }[spec.loop] || "[100,100,100]";
        var amt = xs.property("ADBE Text Expressible Amount");
        var err = amt ? applyExprSafe(amt, code) : "";
        if (err) throw new Error(err);
        return;
    }

    A().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    function SEL() { return A().property("ADBE Text Selectors").property(1); }
    var adv = SEL().property("ADBE Text Range Advanced");
    setP(adv, ["ADBE Text Range Type2"], based);
    if (spec.shape) setP(SEL().property("ADBE Text Range Advanced"), ["ADBE Text Range Shape"], MT_SHAPE[spec.shape] || 1);
    if (spec.smooth !== undefined) setP(SEL().property("ADBE Text Range Advanced"), ["ADBE Text Selector Smoothness"], spec.smooth);
    if (spec.order === "rand") setP(SEL().property("ADBE Text Range Advanced"), ["ADBE Text Randomize Order"], 1);
    var fd = comp.frameDuration, t0, t1;
    if (spec.dir === "out") { t1 = layer.outPoint - fd; t0 = Math.max(layer.inPoint, t1 - dur); }
    else { t0 = layer.inPoint; t1 = Math.min(layer.outPoint - fd, t0 + dur); }
    var start = SEL().property("ADBE Text Percent Start"), end = SEL().property("ADBE Text Percent End");
    var rev = spec.order === "rev", infl = spec.infl || 70;
    if (spec.dir === "out") {
        if (rev) keyLinear2(start, t0, 100, t1, 0, infl); else keyLinear2(end, t0, 0, t1, 100, infl);
    } else {
        if (rev) keyLinear2(SEL().property("ADBE Text Percent End"), t0, 100, t1, 0, infl);
        else keyLinear2(SEL().property("ADBE Text Percent Start"), t0, 0, t1, 100, infl);
    }
}
function targetTextLayers(comp, sampleText) {
    var L = selLayers(comp, false), out = [], i;
    for (i = 0; i < L.length; i++) if (L[i] instanceof TextLayer) out.push(L[i]);
    if (!out.length) {
        var t = comp.layers.addText(sampleText || N("text"));
        var tp = t.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
        try { td.font = "Arial-BoldMT"; } catch (e) {}
        td.fontSize = Math.round(Math.min(comp.width, comp.height) / 8); td.applyFill = true; td.fillColor = [1, 1, 1];
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        try { tp.setValue(td); } catch (e2) {}
        t.startTime = 0; t.inPoint = comp.time; t.outPoint = Math.min(comp.duration, comp.time + 4);
        centerLayer(comp, t);
        out.push(t);
    }
    return out;
}
/* arg: {spec, proportional, percent, dur, sample} */
function mf_applyTextPreset(arg) {
    return undo("Preset de texto", function () {
        var o = parseArg(arg), comp = activeComp(), L = targetTextLayers(comp, o.sample), i;
        for (i = 0; i < L.length; i++) {
            var d = o.dur || o.spec.dur || 1;
            if (o.proportional) d = Math.max(comp.frameDuration * 4, (L[i].outPoint - L[i].inPoint) * (o.percent || 25) / 100);
            buildTextPreset(comp, L[i], o.spec, d);
        }
        return ok({ count: L.length });
    });
}

/* ================================================================== */
/* BIBLIOTECA \u2014 caixas de texto, elementos e social                    */
/* ================================================================== */
function shapeContents(sh) { return sh.property("ADBE Root Vectors Group"); }
function newGroup(sh, name) {
    var g = shapeContents(sh).addProperty("ADBE Vector Group"); g.name = name || "MT";
    var gi = g.propertyIndex;
    return function () { return shapeContents(sh).property(gi); };
}
function gAdd(G, mn) { var p = G().property("ADBE Vectors Group").addProperty(mn); var pi = p.propertyIndex; return function () { return G().property("ADBE Vectors Group").property(pi); }; }
function gFill(G, c, op) { var f = gAdd(G, "ADBE Vector Graphic - Fill"); setColor(f(), ["ADBE Vector Fill Color"], c); if (op !== undefined) setP(f(), ["ADBE Vector Fill Opacity"], op); return f; }
function gStroke(G, c, w) {
    var s = gAdd(G, "ADBE Vector Graphic - Stroke");
    setColor(s(), ["ADBE Vector Stroke Color"], c); setP(s(), ["ADBE Vector Stroke Width"], w); setP(s(), ["ADBE Vector Stroke Line Cap"], 2);
    return s;
}
function gPath(G, verts, closed) {
    var p = gAdd(G, "ADBE Vector Shape - Group"), sh = new Shape();
    sh.vertices = verts; sh.closed = !!closed;
    p().property("ADBE Vector Shape").setValue(sh);
    return p;
}
function gXform(G) { return G().property("ADBE Vector Transform Group"); }
function popScale(prop, t, d, from) {
    from = from || 0;
    prop.setValueAtTime(t, [from, from]); prop.setValueAtTime(t + d * 0.7, [110, 110]); prop.setValueAtTime(t + d, [100, 100]); easeAll(prop);
}
function shapeLayerAt(comp, name, t, dur, pos) {
    var sh = comp.layers.addShape(); sh.name = name;
    sh.startTime = 0; sh.inPoint = t; sh.outPoint = Math.min(comp.duration, t + dur);
    sh.property("ADBE Transform Group").property("ADBE Position").setValue(pos || [comp.width / 2, comp.height / 2]);
    return sh;
}
function anchorOfSelection(comp) {
    var L = selLayers(comp, false);
    if (L.length && !(L[0] instanceof CameraLayer)) {
        try { var r = L[0].sourceRectAtTime(comp.time, false), p = L[0].property("ADBE Transform Group").property("ADBE Position").value; return [p[0], p[1]]; } catch (e) {}
    }
    return [comp.width / 2, comp.height / 2];
}

/* caixa que acompanha o texto (tamanho/posicao por expressao) */
function addTextBox(comp, txt, style) {
    var nm = exprStr(txt.name), padX = style.padX || 28, padY = style.padY || 14;
    var sh = comp.layers.addShape();
    sh.name = "MT Box | " + txt.name; sh.moveAfter(txt);
    sh.startTime = 0; sh.inPoint = txt.inPoint; sh.outPoint = txt.outPoint;
    var G = newGroup(sh, "Box"), R = gAdd(G, "ADBE Vector Shape - Rect");
    var rectRef = 'var L=thisComp.layer("' + nm + '");var r=L.sourceRectAtTime(time,false);var s=L.transform.scale;var w=r.width*s[0]/100,h=r.height*s[1]/100;';
    if (style.kind === "underline") {
        applyExprSafe(R().property("ADBE Vector Rect Size"), rectRef + '[w+' + padX + ',' + (style.thick || 8) + ']');
        applyExprSafe(sh.property("ADBE Transform Group").property("ADBE Position"), rectRef + 'var p=L.toComp([r.left+r.width/2,r.top+r.height]);[p[0],p[1]+' + (style.gap || 12) + ']');
    } else if (style.kind === "marker") {
        applyExprSafe(R().property("ADBE Vector Rect Size"), rectRef + '[w+' + padX + ',h*0.55]');
        applyExprSafe(sh.property("ADBE Transform Group").property("ADBE Position"), rectRef + 'var p=L.toComp([r.left+r.width/2,r.top+r.height*0.68]);[p[0],p[1]]');
    } else {
        applyExprSafe(R().property("ADBE Vector Rect Size"), rectRef + '[w+' + (padX * 2) + ',h+' + (padY * 2) + ']');
        applyExprSafe(sh.property("ADBE Transform Group").property("ADBE Position"), rectRef + 'var p=L.toComp([r.left+r.width/2,r.top+r.height/2]);[p[0],p[1]]');
    }
    setP(R(), ["ADBE Vector Rect Roundness"], style.round !== undefined ? style.round : 16);
    if (style.stroke) gStroke(G, style.color, style.stroke); else gFill(G, style.color, style.opacity);
    /* entrada: cresce da esquerda (marker/underline) ou do centro */
    var X = gXform(G), sc = X.property("ADBE Vector Scale"), t = txt.inPoint, d = 0.35;
    if (style.kind === "marker" || style.kind === "underline") {
        var half = rectRef + '[-(w+' + padX + ')/2,0]';
        applyExprSafe(gXform(G).property("ADBE Vector Anchor"), half);
        applyExprSafe(gXform(G).property("ADBE Vector Position"), half);
        gXform(G).property("ADBE Vector Scale").setValueAtTime(t, [0, 100]);
        gXform(G).property("ADBE Vector Scale").setValueAtTime(t + d, [100, 100]); easeAll(gXform(G).property("ADBE Vector Scale"));
    } else {
        sc.setValueAtTime(t, [0, 100]); sc.setValueAtTime(t + d, [100, 100]); easeAll(sc);
    }
    if (style.textColor) {
        var tp = txt.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
        td.applyFill = true; td.fillColor = style.textColor; try { tp.setValue(td); } catch (e) {}
    }
    return sh;
}
var MT_BOXES = {
    box_pill: { kind: "box", color: [1, 1, 1], round: 60, textColor: [0.05, 0.05, 0.07] },
    box_solid: { kind: "box", color: [0.45, 0.3, 1], round: 10 },
    box_black: { kind: "box", color: [0, 0, 0], round: 8, opacity: 80 },
    box_outline: { kind: "box", color: [1, 1, 1], round: 14, stroke: 5 },
    box_underline: { kind: "underline", color: [1, 0.8, 0.1], round: 4, thick: 8 },
    box_marker: { kind: "marker", color: [1, 0.85, 0.1], round: 6, opacity: 75 }
};

function addElement(comp, id, o) {
    var t = comp.time, pos = anchorOfSelection(comp), sh, G, X, P;
    switch (id) {
        case "el_burst":
            sh = shapeLayerAt(comp, "MT Burst", t, 1.2, pos); G = newGroup(sh, "Burst");
            gPath(G, [[0, -70], [0, -130]], false);
            var tr = gAdd(G, "ADBE Vector Filter - Trim");
            gStroke(G, o.color || [1, 1, 1], 9);
            var rp = gAdd(G, "ADBE Vector Filter - Repeater");
            setP(rp(), ["ADBE Vector Repeater Copies"], 8);
            setP(rp().property("ADBE Vector Repeater Transform"), ["ADBE Vector Repeater Position"], [0, 0]);
            setP(rp().property("ADBE Vector Repeater Transform"), ["ADBE Vector Repeater Rotation"], 45);
            keyLinear2(tr().property("ADBE Vector Trim End"), t, 0, t + 0.3, 100, 70);
            keyLinear2(tr().property("ADBE Vector Trim Start"), t + 0.15, 0, t + 0.5, 100, 70);
            break;
        case "el_ring":
            sh = shapeLayerAt(comp, "MT Ring", t, 1, pos); G = newGroup(sh, "Ring");
            setP(gAdd(G, "ADBE Vector Shape - Ellipse")(), ["ADBE Vector Ellipse Size"], [80, 80]);
            var st = gStroke(G, o.color || [1, 1, 1], 16);
            keyLinear2(gXform(G).property("ADBE Vector Scale"), t, [0, 0], t + 0.5, [320, 320], 80);
            keyLinear2(st().property("ADBE Vector Stroke Width"), t, 16, t + 0.5, 0, 60);
            break;
        case "el_swoosh":
            sh = shapeLayerAt(comp, "MT Swoosh", t, 2, [pos[0], pos[1] + 70]); G = newGroup(sh, "Swoosh");
            var ps = gAdd(G, "ADBE Vector Shape - Group"), s1 = new Shape();
            s1.vertices = [[-180, 10], [180, -6]]; s1.inTangents = [[0, 0], [-120, 30]]; s1.outTangents = [[120, 20], [0, 0]]; s1.closed = false;
            ps().property("ADBE Vector Shape").setValue(s1);
            var tr2 = gAdd(G, "ADBE Vector Filter - Trim");
            gStroke(G, o.color || [1, 0.8, 0.1], 10);
            keyLinear2(tr2().property("ADBE Vector Trim End"), t, 0, t + 0.45, 100, 75);
            break;
        case "el_arrow":
            sh = shapeLayerAt(comp, "MT Arrow", t, 2, pos); G = newGroup(sh, "Arrow");
            gPath(G, [[-110, 0], [100, 0]], false);
            gPath(G, [[60, -40], [102, 0], [60, 40]], false);
            var tr3 = gAdd(G, "ADBE Vector Filter - Trim");
            gStroke(G, o.color || [1, 1, 1], 12);
            keyLinear2(tr3().property("ADBE Vector Trim End"), t, 0, t + 0.5, 100, 75);
            break;
        case "el_sparkle":
            sh = shapeLayerAt(comp, "MT Sparkle", t, 1.5, pos); G = newGroup(sh, "Sparkle");
            var star = gAdd(G, "ADBE Vector Shape - Star");
            setP(star(), ["ADBE Vector Star Type"], 1); setP(star(), ["ADBE Vector Star Points"], 4);
            setP(star(), ["ADBE Vector Star Inner Radius"], 14); setP(star(), ["ADBE Vector Star Outer Radius"], 60);
            setP(star(), ["ADBE Vector Star Inner Roundess", "ADBE Vector Star Inner Roundness"], 60);
            gFill(G, o.color || [1, 1, 1]);
            popScale(gXform(G).property("ADBE Vector Scale"), t, 0.35);
            keyLinear2(gXform(G).property("ADBE Vector Rotation"), t, -45, t + 0.6, 0, 70);
            break;
        case "so_subscribe":
        case "so_follow":
            var sub = id === "so_subscribe";
            sh = shapeLayerAt(comp, sub ? "MT Subscribe" : "MT Follow", t, 3.5, [comp.width / 2, comp.height * 0.78]); G = newGroup(sh, "Button");
            var R = gAdd(G, "ADBE Vector Shape - Rect");
            setP(R(), ["ADBE Vector Rect Size"], sub ? [420, 100] : [460, 96]); setP(R(), ["ADBE Vector Rect Roundness"], sub ? 14 : 48);
            var F = gFill(G, sub ? [0.9, 0.08, 0.1] : [1, 1, 1]);
            var label = sub ? (o.label || "INSCREVA-SE") : (o.handle || "@seuperfil");
            var tx = comp.layers.addText(label), tp = tx.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
            try { td.font = "Arial-BoldMT"; } catch (e1) {}
            td.fontSize = sub ? 44 : 42; td.applyFill = true; td.fillColor = sub ? [1, 1, 1] : [0.06, 0.06, 0.08];
            td.justification = ParagraphJustification.CENTER_JUSTIFY; tp.setValue(td);
            tx.name = sub ? "MT Subscribe Text" : "MT Follow Text";
            tx.startTime = 0; tx.inPoint = sh.inPoint; tx.outPoint = sh.outPoint;
            centerLayer(comp, tx);
            tx.property("ADBE Transform Group").property("ADBE Position").setValue(sh.property("ADBE Transform Group").property("ADBE Position").value);
            tx.parent = sh;
            popScale(sh.property("ADBE Transform Group").property("ADBE Scale"), t, 0.4);
            if (sub) {
                var c2 = t + 1.6;
                setColor(F(), ["ADBE Vector Fill Color"], [0.9, 0.08, 0.1]);
                F().property("ADBE Vector Fill Color").setValueAtTime(c2 - 0.01, col4([0.9, 0.08, 0.1]));
                F().property("ADBE Vector Fill Color").setValueAtTime(c2, col4([0.35, 0.35, 0.38]));
                var sTxt = tx.property("ADBE Text Properties").property("ADBE Text Document");
                var d1 = sTxt.value; sTxt.setValueAtTime(t, d1);
                var d2 = sTxt.value; d2.text = o.label2 || "INSCRITO"; sTxt.setValueAtTime(c2, d2);
                var scl = sh.property("ADBE Transform Group").property("ADBE Scale");
                scl.setValueAtTime(c2 - 0.12, [100, 100]); scl.setValueAtTime(c2, [90, 90]); scl.setValueAtTime(c2 + 0.15, [100, 100]);
            }
            var so = sh.property("ADBE Transform Group").property("ADBE Opacity");
            so.setValueAtTime(sh.outPoint - 0.3, 100); so.setValueAtTime(sh.outPoint - comp.frameDuration, 0);
            break;
        default: throw new Error("Elemento desconhecido: " + id);
    }
    return sh;
}

/* ================================================================== */
/* Extras estilo Mister Horse: decode, titulos, overlays, fundos, chroma */
/* ================================================================== */
function decodeExpr(dur, continuous) {
    var ch = 'var ch="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&";';
    if (continuous) return 'var src=""+value;' + ch + 'seedRandom(Math.floor(time*12),true);var o="";' +
        'for(var i=0;i<src.length;i++){var c=src.charAt(i);o+=(c!=" "&&c!="\\r"&&random()<0.15)?ch.charAt(Math.floor(random(ch.length))):c;}o';
    return 'var src=""+value;var d=' + dur + ';var t=time-inPoint;var o=src;' + ch +
        'if(t<d){var n=Math.floor(src.length*Math.max(0,t)/d);seedRandom(Math.floor(time*24),true);o=src.substr(0,n);' +
        'for(var i=n;i<src.length;i++){var c=src.charAt(i);o+=(c==" "||c=="\\r")?c:ch.charAt(Math.floor(random(ch.length)));}}o';
}
function applyDecode(layer, dur, continuous) {
    var sp = layer.property("ADBE Text Properties").property("ADBE Text Document");
    var err = applyExprSafe(sp, decodeExpr(dur, continuous));
    if (err) throw new Error(err);
}
function textLayerAt(comp, txt, size, pos, t, dur, color) {
    var tx = comp.layers.addText(txt), tp = tx.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
    try { td.font = "Arial-BoldMT"; } catch (e) {}
    td.fontSize = size; td.applyFill = true; td.fillColor = color || [1, 1, 1];
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    try { tp.setValue(td); } catch (e2) {}
    tx.startTime = 0; tx.inPoint = t; tx.outPoint = Math.min(comp.duration, t + dur);
    centerLayer(comp, tx);
    tx.property("ADBE Transform Group").property("ADBE Position").setValue(pos);
    return tx;
}
function chromaSplit(comp, ly) {
    var cols = [[1, 0.1, 0.2], [0.1, 0.9, 1]], offs = [-1, 1], i;
    for (i = 0; i < 2; i++) {
        var d = ly.duplicate();
        d.name = ly.name + (i ? " | Ciano" : " | Vermelho");
        var fx = d.property("ADBE Effect Parade"); while (fx.numProperties) fx.property(1).remove();
        var f = addEffect(d, "ADBE Fill"); if (f) setColor(f, ["ADBE Fill-0002", "Color"], cols[i]);
        d.blendingMode = BlendingMode.SCREEN;
        d.moveAfter(ly);
        applyExprSafe(d.property("ADBE Transform Group").property("ADBE Position"),
            'seedRandom(index,true);var a=6+wiggle(8,4)[0]-value[0];var v=value;v[0]+=' + offs[i] + '*a;v');
    }
}
function addExtraElement(comp, id, o) {
    var t = comp.time, C = [comp.width / 2, comp.height / 2], sh, G, i;
    switch (id) {
        case "ti_timer":
            var tm = textLayerAt(comp, "00:00.00", Math.round(comp.height / 9), C, t, 5);
            applyExprSafe(tm.property("ADBE Text Properties").property("ADBE Text Document"),
                'var s=Math.max(0,time-inPoint);var m=Math.floor(s/60),x=Math.floor(s%60),c=Math.floor((s%1)*100);' +
                '(m<10?"0":"")+m+":"+(x<10?"0":"")+x+"."+(c<10?"0":"")+c');
            tm.name = "MT Timer"; return tm;
        case "ti_rating":
            var rt = textLayerAt(comp, "0.0", Math.round(comp.height / 9), [C[0] + comp.height * 0.06, C[1]], t, 4);
            applyExprSafe(rt.property("ADBE Text Properties").property("ADBE Text Document"),
                'var v=' + (o.rating || 4.6) + ';linear(time-inPoint,0,1.2,0,v).toFixed(1)');
            rt.name = "MT Rating";
            sh = shapeLayerAt(comp, "MT Rating Star", t, 4, [C[0] - comp.height * 0.1, C[1] - comp.height * 0.03]); G = newGroup(sh, "Star");
            var st = gAdd(G, "ADBE Vector Shape - Star");
            setP(st(), ["ADBE Vector Star Points"], 5); setP(st(), ["ADBE Vector Star Inner Radius"], comp.height * 0.022); setP(st(), ["ADBE Vector Star Outer Radius"], comp.height * 0.05);
            gFill(G, [1, 0.8, 0.1]);
            popScale(gXform(G).property("ADBE Vector Scale"), t, 0.4);
            return sh;
        case "ti_bullets":
            var items = o.lines || ["Primeiro item", "Segundo item", "Terceiro item"], bt = [];
            for (i = 0; i < items.length; i++) bt.push("\u2022 " + items[i]);
            var bl = textLayerAt(comp, bt.join("\r"), Math.round(comp.height / 18), C, t, 5);
            var tp = bl.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
            td.justification = ParagraphJustification.LEFT_JUSTIFY; tp.setValue(td); centerLayer(comp, bl);
            bl.name = "MT Bullet List";
            buildTextPreset(comp, bl, { name: "Bullets", based: "lines", props: { opacity: 0, pos: [-60, 0] }, dir: "in" }, 1.2);
            return bl;
        case "ov_letterbox":
            var h = Math.round(comp.height * 0.12), k;
            for (k = 0; k < 2; k++) {
                sh = shapeLayerAt(comp, "MT Letterbox " + (k ? "Base" : "Topo"), 0, comp.duration, [C[0], k ? comp.height - h / 2 : h / 2]);
                G = newGroup(sh, "Bar");
                setP(gAdd(G, "ADBE Vector Shape - Rect")(), ["ADBE Vector Rect Size"], [comp.width + 20, h]);
                gFill(G, [0, 0, 0]);
                keyLinear2(gXform(G).property("ADBE Vector Position"), t, [0, k ? h : -h], t + 0.6, [0, 0], 80);
            }
            return sh;
        case "ov_leak":
            sh = shapeLayerAt(comp, "MT Light Leak", t, 2.5, [comp.width * 0.15, comp.height * 0.3]); G = newGroup(sh, "Leak");
            setP(gAdd(G, "ADBE Vector Shape - Ellipse")(), ["ADBE Vector Ellipse Size"], [comp.width * 0.9, comp.height * 0.7]);
            gFill(G, o.color || [1, 0.45, 0.1]);
            sh.blendingMode = BlendingMode.ADD;
            var gb = addEffect(sh, "ADBE Gaussian Blur 2"); if (gb) setP(gb, ["ADBE Gaussian Blur 2-0001", "Blurriness"], comp.width * 0.18);
            var lp = sh.property("ADBE Transform Group").property("ADBE Position");
            keyLinear2(lp, t, [comp.width * 0.05, comp.height * 0.25], t + 2.5, [comp.width * 0.95, comp.height * 0.7], 30);
            var lo = sh.property("ADBE Transform Group").property("ADBE Opacity");
            lo.setValueAtTime(t, 0); lo.setValueAtTime(t + 0.6, 85); lo.setValueAtTime(t + 1.9, 85); lo.setValueAtTime(t + 2.5 - comp.frameDuration, 0);
            return sh;
        case "ov_grain":
            var adj = comp.layers.addSolid([1, 1, 1], "MT Grain", comp.width, comp.height, comp.pixelAspect, comp.duration);
            adj.adjustmentLayer = true; adj.label = 5;
            var nz = addEffect(adj, "ADBE Noise"); if (nz) { setP(nz, ["ADBE Noise-0001", "Amount of Noise"], 8); setP(nz, ["ADBE Noise-0003", "Clipping"], 1); }
            return adj;
        case "bg_circles":
            sh = shapeLayerAt(comp, "MT Circles", 0, comp.duration, C);
            var pal = [[1, 0.25, 0.25], [1, 0.55, 0.15], [1, 0.85, 0.2], [1, 0.3, 0.5]];
            for (i = 3; i >= 0; i--) {
                G = newGroup(sh, "C" + i);
                var dd = Math.max(comp.width, comp.height) * (0.35 + i * 0.4);
                setP(gAdd(G, "ADBE Vector Shape - Ellipse")(), ["ADBE Vector Ellipse Size"], [dd, dd]);
                gFill(G, pal[i]);
                keyLinear2(gXform(G).property("ADBE Vector Scale"), t + i * 0.08, [0, 0], t + 0.6 + i * 0.08, [100, 100], 80);
            }
            sh.moveToEnd();
            return sh;
        case "bg_stripes":
            sh = shapeLayerAt(comp, "MT Stripes", 0, comp.duration, C); G = newGroup(sh, "Stripes");
            var big = Math.max(comp.width, comp.height) * 2;
            setP(gAdd(G, "ADBE Vector Shape - Rect")(), ["ADBE Vector Rect Size"], [60, big]);
            gFill(G, o.color || [1, 0.85, 0.2]);
            var rp = gAdd(G, "ADBE Vector Filter - Repeater");
            setP(rp(), ["ADBE Vector Repeater Copies"], 40);
            setP(rp().property("ADBE Vector Repeater Transform"), ["ADBE Vector Repeater Position"], [120, 0]);
            setP(rp(), ["ADBE Vector Repeater Offset"], -20);
            setP(gXform(G), ["ADBE Vector Rotation"], 45);
            applyExprSafe(rp().property("ADBE Vector Repeater Offset"), "-20+(time*0.8)%1");
            var bgs = comp.layers.addSolid([0.95, 0.35, 0.15], "MT Stripes BG", comp.width, comp.height, comp.pixelAspect, comp.duration);
            bgs.moveToEnd(); sh.moveBefore(bgs);
            return sh;
        case "bg_gradient":
            var g = comp.layers.addSolid([0, 0, 0], "MT Gradient BG", comp.width, comp.height, comp.pixelAspect, comp.duration);
            var rg = addEffect(g, "ADBE Ramp");
            if (rg) {
                setP(rg, ["ADBE Ramp-0001", "Start of Ramp"], [0, 0]); setColor(rg, ["ADBE Ramp-0002", "Start Color"], [0.45, 0.2, 1]);
                setP(rg, ["ADBE Ramp-0003", "End of Ramp"], [comp.width, comp.height]); setColor(rg, ["ADBE Ramp-0004", "End Color"], [0.1, 0.85, 1]);
            }
            g.moveToEnd();
            return g;
        case "fx_chroma":
            var L = selLayers(comp, true);
            for (i = 0; i < L.length; i++) chromaSplit(comp, L[i]);
            return L[0];
        default:
            return null;
    }
}

/* arg: {id, color?, handle?, label?} */
function mf_addElement(arg) {
    return undo("Elemento", function () {
        var o = parseArg(arg), comp = activeComp();
        if (MT_BOXES[o.id]) {
            var L = targetTextLayers(comp, o.sample), i;
            for (i = 0; i < L.length; i++) addTextBox(comp, L[i], MT_BOXES[o.id]);
            return ok({ count: L.length });
        }
        if (!addExtraElement(comp, o.id, o)) addElement(comp, o.id, o);
        return ok({ count: 1 });
    });
}

/* ================================================================== */
/* LEGENDAS \u2014 estilo por modelo                                         */
/* ================================================================== */
function deepGlow(layer, strength, color) {
    strength = strength || 1;
    var dg = addEffect(layer, "Deep Glow") || addEffect(layer, "PEDG");
    if (dg) { setP(dg, ["Radius"], 60 * strength); setP(dg, ["Exposure"], 0.6 * strength); return; }
    var specs = [[N("glowIn"), 40, 12, 1.2], [N("glowOut"), 30, 70, 0.8]], i;
    for (i = 0; i < specs.length; i++) {
        var g = addEffect(layer, "ADBE Glo2"); if (!g) continue;
        g.name = specs[i][0];
        setP(g, ["ADBE Glo2-0002", "Glow Threshold"], specs[i][1]);
        setP(g, ["ADBE Glo2-0003", "Glow Radius"], specs[i][2] * strength);
        setP(g, ["ADBE Glo2-0004", "Glow Intensity"], specs[i][3]);
        if (color) {
            setP(g, ["ADBE Glo2-0007", "Glow Colors"], 2);
            setColor(g, ["ADBE Glo2-0012", "Color A"], color); setColor(g, ["ADBE Glo2-0013", "Color B"], color);
        }
    }
}
function dropShadow(layer, st) {
    var ds = addEffect(layer, "ADBE Drop Shadow"); if (!ds) return;
    setColor(ds, ["ADBE Drop Shadow-0001", "Shadow Color"], st.shadowColor || [0, 0, 0]);
    setP(ds, ["ADBE Drop Shadow-0002", "Opacity"], (st.shadowOpacity || 0.85) * 255);
    setP(ds, ["ADBE Drop Shadow-0003", "Direction"], 150);
    setP(ds, ["ADBE Drop Shadow-0004", "Distance"], st.shadowDist !== undefined ? st.shadowDist : 6);
    setP(ds, ["ADBE Drop Shadow-0005", "Softness"], st.shadowSoft !== undefined ? st.shadowSoft : 18);
}
function gradientFill(layer, c1, c2) {
    var rg = addEffect(layer, "ADBE Ramp"); if (!rg) return;
    var r = layerRect(layer, layer.inPoint);
    setP(rg, ["ADBE Ramp-0001", "Start of Ramp"], [r.left + r.width / 2, r.top]);
    setColor(rg, ["ADBE Ramp-0002", "Start Color"], c1);
    setP(rg, ["ADBE Ramp-0003", "End of Ramp"], [r.left + r.width / 2, r.top + r.height]);
    setColor(rg, ["ADBE Ramp-0004", "End Color"], c2);
}
function wordTimesExpr(times) {
    var a = [], i; for (i = 0; i < times.length; i++) a.push(Math.round(times[i] * 1000) / 1000);
    return "[" + a.join(",") + "]";
}
/* destaque por palavra usando os tempos do Whisper */
function wordAnimator(layer, name, props, code) {
    var A0 = textAnimators(layer).addProperty("ADBE Text Animator"), ai = A0.propertyIndex;
    A0.name = name;
    function A() { return textAnimators(layer).property(ai); }
    addAnimProps(function () { return A().property("ADBE Text Animator Properties"); }, props);
    A().property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
    var xs = A().property("ADBE Text Selectors").property(1);
    setP(xs, ["ADBE Text Range Type2"], 3);
    var err = applyExprSafe(A().property("ADBE Text Selectors").property(1).property("ADBE Text Expressible Amount"), code);
    if (err) throw new Error(err);
}
function styleCaption(comp, layer, st, starts, ends) {
    var tp = layer.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
    try { td.resetCharStyle(); } catch (e) {}
    try { td.font = st.font || "Arial-BoldMT"; } catch (e1) { try { td.font = "Arial-BoldMT"; } catch (e2) {} }
    td.fontSize = st.size || 64;
    td.applyFill = true; td.fillColor = st.color || [1, 1, 1];
    if (st.stroke) { td.applyStroke = true; td.strokeColor = st.strokeColor || [0, 0, 0]; td.strokeWidth = st.stroke; td.strokeOverFill = false; }
    else { td.applyStroke = false; }
    if (st.tracking !== undefined) { try { td.tracking = st.tracking; } catch (e3) {} }
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    if (st.upper) td.text = String(td.text).toUpperCase();
    if (st.lower) td.text = String(td.text).toLowerCase();
    tp.setValue(td);
    if (tp.value.font !== (st.font || "Arial-BoldMT")) { /* fonte indisponivel: AE substitui sozinho */ }

    if (st.gradient) gradientFill(layer, st.gradient[0], st.gradient[1]);
    if (st.bevel) { var bv = addEffect(layer, "ADBE Bevel Alpha"); if (bv) setP(bv, ["ADBE Bevel Alpha-0001", "Edge Thickness"], 1.6); }
    if (st.glow !== false) deepGlow(layer, st.glowStrength || 1, st.glowColor);
    if (st.rays) { var rays = addEffect(layer, "CC Light Rays"); if (rays) { setP(rays, ["CC Light Rays-0001", "Intensity"], 35); setP(rays, ["CC Light Rays-0003", "Radius"], 25); } }
    if (st.shadow !== false) dropShadow(layer, st);

    if (starts && starts.length && st.words && st.words !== "none") {
        var T = wordTimesExpr(starts), E = wordTimesExpr(ends || starts);
        if (st.words === "highlight") {
            var hc = st.highlight || [1, 0.85, 0.1], hs = st.highlightScale || 112;
            wordAnimator(layer, "MT Highlight", { fill: hc, scale: [hs, hs] },
                "var t=" + T + ";var e=" + E + ";var i=textIndex-1;var on=false;" +
                "if(i<t.length){var nx=(i+1<t.length)?t[i+1]:e[i]+0.3;on=(time>=t[i]&&time<nx);}" +
                "var a=on?100:0;[a,a,a]");
        }
        if (st.words === "type") {
            wordAnimator(layer, "MT Type", { opacity: 0 },
                "var t=" + T + ";var i=textIndex-1;var k=(i<t.length)?t[i]:0;var a=(time<k)?100:0;" +
                "if(time>=k&&time<k+0.12){seedRandom(textIndex*7+Math.floor(time*30),true);a=(random()>0.5)?100:0;}[a,a,a]");
        }
        if (st.words === "reveal" || st.words === "highlight-reveal") {
            wordAnimator(layer, "MT Reveal", { opacity: 0, scale: [60, 60] },
                "var t=" + T + ";var i=textIndex-1;var k=(i<t.length)?t[i]:0;var a=linear(time,k,k+0.08,100,0);[a,a,a]");
        }
    }
}
/* junta as palavras; breakAfter = quantas palavras ficam na 1a linha */
function joinWords(parts, breakAfter) {
    var out = "", i;
    for (i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        if (out) out += (breakAfter && i === breakAfter) ? "\r" : " ";
        out += parts[i];
    }
    return out;
}
function mf_createCaptions(arg) {
    return undo("Legendas", function () {
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
            applyExprSafe(follow.property("ADBE Transform Group").property("ADBE Position"),
                'var L=thisComp.layer("' + exprStr(media.name) + '");\n' +
                'var n=Math.max(1,Math.round(effect("' + exprStr(N("smooth")) + '")(1)));var f=thisComp.frameDuration;var ax=0,ay=0;\n' +
                'for(var k=-n;k<=n;k++){var v=effect("' + exprStr(N("face")) + '")(1).valueAtTime(time+k*f);ax+=v[0];ay+=v[1];}\n' +
                'var p=L.toComp([ax/(2*n+1),ay/(2*n+1)]);\n' +
                '[p[0]+effect("' + exprStr(N("offX")) + '")(1),p[1]+effect("' + exprStr(N("offY")) + '")(1)]');
        }
        var made = 0, errs = [];
        for (i = 0; i < o.segments.length; i++) {
            var sg = o.segments[i], words = sg.words || [], txt, starts = [], ends = [], w;
            if (words.length) {
                var parts = [];
                for (w = 0; w < words.length; w++) {
                    var wt = String(words[w].text).replace(/^\s+|\s+$/g, "");
                    if (!wt) continue;
                    parts.push(wt); starts.push(mediaToComp(words[w].start)); ends.push(mediaToComp(words[w].end));
                }
                txt = joinWords(parts, sg.breakAfter);
            } else txt = joinWords(String(sg.text).replace(/^\s+|\s+$/g, "").split(/\s+/), sg.breakAfter);
            if (!txt) continue;
            var t = comp.layers.addText(txt);
            t.name = N("caption") + " " + (i + 1) + " - " + txt.replace(/[\r\n]+/g, " ").substr(0, 24);
            t.label = 3;
            t.inPoint = mediaToComp(sg.start); t.outPoint = Math.max(mediaToComp(sg.end), t.inPoint + comp.frameDuration * 2);
            var st2 = {}, kk; for (kk in st) if (st.hasOwnProperty(kk)) st2[kk] = st[kk];
            if (sg.color) { st2.color = sg.color; }
            try { styleCaption(comp, t, st2, starts, ends); } catch (se) { errs.push(se.message); }
            if (sg.hot && sg.hot.length && sg.hotColor) {
                try {
                    wordAnimator(t, "MT Destaque", { fill: sg.hotColor },
                        "var h=[" + sg.hot.join(",") + "];var a=0;for(var q=0;q<h.length;q++){if(h[q]==textIndex)a=100;}[a,a,a]");
                } catch (he) { errs.push(he.message); }
            }
            var pos = t.property("ADBE Transform Group").property("ADBE Position");
            if (follow) applyExprSafe(pos, 'var p=thisComp.layer("' + exprStr(follow.name) + '").transform.position;[p[0],p[1]]');
            else pos.setValue([comp.width / 2, comp.height * (st.y || 0.8)]);
            if (st.box) { try { addTextBox(comp, t, st.box); } catch (be) { errs.push(be.message); } }
            if (st.anim && st.anim !== "none") {
                var sc = t.property("ADBE Transform Group").property("ADBE Scale"), op = t.property("ADBE Transform Group").property("ADBE Opacity");
                var a = t.inPoint, d = Math.min(0.15, (t.outPoint - t.inPoint) / 3);
                if (st.anim === "pop") { sc.setValueAtTime(a, [70, 70]); sc.setValueAtTime(a + d * 0.7, [108, 108]); sc.setValueAtTime(a + d, [100, 100]); easeAll(sc); }
                if (st.anim === "fade") { op.setValueAtTime(a, 0); op.setValueAtTime(a + d, 100); }
                if (st.anim === "slide") { var pv = pos.expression ? null : pos.value; if (pv) { pos.setValueAtTime(a, [pv[0], pv[1] + 30]); pos.setValueAtTime(a + d, pv); easeAll(pos); } op.setValueAtTime(a, 0); op.setValueAtTime(a + d, 100); }
            }
            made++;
        }
        return ok({ count: made, errors: errs });
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
        if (!f.exists) throw new Error("Arquivo n\u00e3o existe: " + o.path);
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
var MF_LABEL = { text: 3, shape: 8, camera: 13, light: 6, "null": 1, adjustment: 5, solid: 15, audio: 10, precomp: 12, video: 9, image: 4, sequence: 14, unknown: 0 };
var MF_PREFIX = { text: "TXT", shape: "SHP", camera: "CAM", light: "LIGHT", "null": "CTRL", adjustment: "ADJ", solid: "SOLID", audio: "AUDIO", precomp: "COMP", video: "VIDEO", image: "IMG", sequence: "SEQ", unknown: "LAYER" };
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
                // de baixo para cima para n\u00e3o bagun\u00e7ar \u00edndices
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
        var c = app.project.activeItem, info = { version: app.version, project: app.project.file ? app.project.file.name : "(n\u00e3o salvo)" };
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
/* MAGICTOUCH \u2014 Leitor de links / importa\u00e7\u00e3o autom\u00e1tica                */
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
/* MAGICTOUCH \u2014 Criador autom\u00e1tico de projeto de presets (.ffx)        */
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
            if (!f.exists) { failed.push(ps.name + ": arquivo n\u00e3o existe"); continue; }
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
                // modo auto: se aplicar na layer de texto n\u00e3o mudou nada, tenta numa adjustment
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
/* arg: {dest, keepFolders:true} \u2014 salva todos os .ffx do projeto (com o nome atual da comp) */
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
/* abre o di\u00e1logo nativo "Save Animation Preset" para a layer/props selecionadas (presets modificados) */
function mf_saveAnimationPreset() {
    try { app.executeCommand(app.findMenuCommandId("Save Animation Preset...")); return ok({}); } catch (e) { return fail(e); }
}

/* ================================================================== */
/* MAGICTOUCH \u2014 M\u00eddias n\u00e3o encontradas                                 */
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
    return undo("Substituir m\u00eddias", function () {
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
/* MAGICTOUCH \u2014 Projeto (salvar incremental, reduzir, limpar cache)    */
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
