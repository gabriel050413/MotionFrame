/*  MotionFrame FX — recriação dos shakes, CCs, glitches, blurs e overlays das 3 edits
    ---------------------------------------------------------------------------------
    Como usar:
      1. Copie MotionFrame_FX.jsx para  .../Adobe After Effects <versão>/Scripts/ScriptUI Panels/
         (ou File > Scripts > Run Script File...)
      2. Window > MotionFrame_FX.jsx
      3. Selecione um layer (ou nada -> cria Adjustment Layer), posicione o playhead no corte/batida
         e clique em "Aplicar".
      4. Para gerar o .ffx: com o layer selecionado clique "Salvar efeitos do layer como .FFX"
         (abre o diálogo nativo Animation > Save Animation Preset com os efeitos já selecionados).
         Ou "Construir biblioteca" + "Exportar TODOS como .FFX" para gerar todos em sequência.

    Os shakes "E1_/E2_/E3_" são curvas MEDIDAS quadro-a-quadro das edits (tracking de features +
    RANSAC similarity), normalizadas para largura 1080 e escaladas para a sua comp.
    Plugins (Sapphire, BCC, Deep Glow, Glitchify, Twitch, RSMB, Twixtor) são usados se a opção
    estiver marcada E o plugin estiver instalado; senão cai para efeitos nativos equivalentes.
*/
(function MotionFrameFX(thisObj) {

    // ======================== DADOS MEDIDOS ========================
    var SIGS = /*__SIGS__*/;
    var ONSETS = /*__ONSETS__*/;   // frames (30 fps) com transientes de áudio detectados em cada edit

    var USE_PLUGINS = true;
    var LOG = [];

    // ======================== HELPERS ========================
    function log(s) { LOG.push(s); }

    function getComp() {
        var c = app.project.activeItem;
        if (!(c && c instanceof CompItem)) { alert("Abra/seleciona uma composição primeiro."); return null; }
        return c;
    }

    function newAdjustment(comp, name) {
        var l = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, comp.pixelAspect, comp.duration);
        l.adjustmentLayer = true;
        l.label = 9;
        return l;
    }

    function targetLayer(comp, name, forceNew) {
        if (!forceNew && comp.selectedLayers.length > 0) return comp.selectedLayers[0];
        return newAdjustment(comp, name);
    }

    // tenta uma lista de matchNames / nomes de exibição; devolve o efeito ou null
    function addFx(layer, ids, label) {
        var fxg = layer.property("ADBE Effect Parade");
        for (var i = 0; i < ids.length; i++) {
            try {
                if (fxg.canAddProperty(ids[i])) {
                    var fx = fxg.addProperty(ids[i]);
                    if (label) { try { fx.name = label; } catch (e0) {} }
                    return fx;
                }
            } catch (e) {}
        }
        log("Efeito não encontrado: " + ids.join(" | "));
        return null;
    }

    // plugin primeiro (se habilitado), depois nativo
    function addFxPlugin(layer, pluginIds, nativeIds, label) {
        if (USE_PLUGINS && pluginIds && pluginIds.length) {
            var p = addFx(layer, pluginIds, label);
            if (p) return { fx: p, plugin: true };
        }
        return { fx: nativeIds ? addFx(layer, nativeIds, label) : null, plugin: false };
    }

    function prop(fx, ids) {
        if (!fx) return null;
        if (!(ids instanceof Array)) ids = [ids];
        // nomes de exibição primeiro (AE em inglês), matchName "ADBE xxx-00NN" como fallback (qualquer idioma)
        if (ids.length > 1 && /-\d{4}$/.test(ids[0])) ids = ids.slice(1).concat([ids[0]]);
        for (var i = 0; i < ids.length; i++) {
            try { var p = fx.property(ids[i]); if (p) return p; } catch (e) {}
        }
        return null;
    }

    function setP(fx, ids, v) {
        var p = prop(fx, ids);
        if (!p) { log("Parâmetro não encontrado: " + (ids instanceof Array ? ids.join("|") : ids)); return null; }
        try { p.setValue(v); } catch (e) { log("Falhou setValue " + p.name + ": " + e); }
        return p;
    }

    // keyframes; interp: "ease" | "linear" | "hold" | "auto"
    function keysP(p, times, vals, interp) {
        if (!p) return;
        try { p.setValuesAtTimes(times, vals); } catch (e) { log("Falhou keys " + p.name + ": " + e); return; }
        for (var i = 0; i < times.length; i++) {
            var k = p.nearestKeyIndex(times[i]);
            try {
                if (interp === "hold") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
                } else if (interp === "linear") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
                } else if (interp === "ease") {
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    var dims = 1;
                    if (!p.isSpatial) { var vv = p.valueAtTime(times[i], true); if (vv instanceof Array) dims = vv.length; }
                    var ein = [], eout = [];
                    for (var d = 0; d < dims; d++) { ein.push(new KeyframeEase(0, 80)); eout.push(new KeyframeEase(0, 80)); }
                    p.setTemporalEaseAtKey(k, ein, eout);
                } else { // auto / continuous bezier
                    p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                    p.setTemporalAutoBezierAtKey(k, true);
                    p.setTemporalContinuousAtKey(k, true);
                    if (p.isSpatial) { p.setSpatialAutoBezierAtKey(k, true); }
                }
            } catch (e2) {}
        }
    }

    // keys em frames relativos (30 fps de referência -> tempo absoluto)
    function fk(t0, frames) { var a = []; for (var i = 0; i < frames.length; i++) a.push(t0 + frames[i] / 30); return a; }

    function slider(layer, name, v) {
        var s = addFx(layer, ["ADBE Slider Control"], name);
        if (s) setP(s, ["ADBE Slider Control-0001", "Slider"], v);
        return s;
    }
    function checkbox(layer, name, v) {
        var s = addFx(layer, ["ADBE Checkbox Control"], name);
        if (s) setP(s, ["ADBE Checkbox Control-0001", "Checkbox"], v ? 1 : 0);
        return s;
    }

    function C(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, 1]; }

    // ---------- Transform (ADBE Geometry2) ----------
    var TR = {
        anchor: ["ADBE Geometry2-0001", "Anchor Point"], pos: ["ADBE Geometry2-0002", "Position"],
        uniform: ["ADBE Geometry2-0011", "Uniform Scale"], sh: ["ADBE Geometry2-0003", "Scale Height", "Scale"],
        sw: ["ADBE Geometry2-0004", "Scale Width"], skew: ["ADBE Geometry2-0005", "Skew"],
        rot: ["ADBE Geometry2-0007", "Rotation"], useComp: ["ADBE Geometry2-0009", "Use Composition's Shutter Angle"],
        shutter: ["ADBE Geometry2-0010", "Shutter Angle"]
    };

    function motionTile(layer) {
        var mt = addFx(layer, ["ADBE Tile", "Motion Tile"], "MF Motion Tile (bordas)");
        setP(mt, ["ADBE Tile-0004", "Output Width"], 300);
        setP(mt, ["ADBE Tile-0005", "Output Height"], 300);
        setP(mt, ["ADBE Tile-0006", "Mirror Edges"], 1);
        return mt;
    }

    function transformFx(layer, label, shutter) {
        var t = addFx(layer, ["ADBE Geometry2", "Transform"], label);
        setP(t, TR.uniform, 1);
        setP(t, TR.useComp, 0);
        setP(t, TR.shutter, shutter === undefined ? 270 : shutter); // motion blur estilo RSMB
        return t;
    }

    // ======================== SHAKES MEDIDOS ========================
    function applySignature(sig, layer, t0, comp) {
        var W = comp.width, H = comp.height;
        motionTile(layer);
        var k = slider(layer, "MF Intensidade %", 100);
        var tr = transformFx(layer, "MF Shake " + sig.id, 270);
        var times = [], P = [], R = [], Sx = [];
        for (var i = 0; i < sig.s.length; i++) {
            times.push(t0 + i / sig.fps);
            P.push([W / 2 + sig.x[i] * W, H / 2 + sig.y[i] * W]);
            R.push(sig.r[i]);
            Sx.push(sig.s[i]);
        }
        var nm = "MF Intensidade %";
        var pp = prop(tr, TR.pos), rp = prop(tr, TR.rot), sp = prop(tr, TR.sh);
        keysP(pp, times, P, "auto");
        keysP(rp, times, R, "auto");
        keysP(sp, times, Sx, "auto");
        try {
            pp.expression = 'k=effect("' + nm + '")(1)/100; c=[thisComp.width/2,thisComp.height/2]; add(c,mul(sub(value,c),k))';
            rp.expression = 'value*effect("' + nm + '")(1)/100';
            sp.expression = '100+(value-100)*effect("' + nm + '")(1)/100';
        } catch (e) {}
        if (USE_PLUGINS) addFx(layer, ["RSMB", "ReelSmart Motion Blur", "RSMB Pro"], "MF RSMB (opcional)");
        layer.comment = "MotionFrame: " + sig.name + " — " + sig.desc + " [" + sig.src + "]";
    }

    // ======================== SHAKES PARAMÉTRICOS (marcadores) ========================
    // dispara a cada marcador do layer (use "Marcadores de batida" para gerar a partir do áudio)
    var EXPR_MARK = 'var n=0; if(thisLayer.marker.numKeys>0){n=thisLayer.marker.nearestKey(time).index; if(thisLayer.marker.key(n).time>time) n--;}\n';

    function impactKick(layer, comp, preset) {
        motionTile(layer);
        slider(layer, "MF Amp px", preset.amp);          // px @1080 de largura
        slider(layer, "MF Pico frames", preset.peak);    // frames até o pico do kick
        slider(layer, "MF Freq Hz", preset.freq);        // oscilação depois do pico
        slider(layer, "MF Decay", preset.decay);         // amortecimento (1/s)
        slider(layer, "MF Rot graus", preset.rot);
        slider(layer, "MF Punch %", preset.punch);       // zoom no impacto
        slider(layer, "MF Jitter px", preset.jitter);    // tremido aleatório por frame (estilo Twitch)
        var tr = transformFx(layer, "MF " + preset.name, 300);
        var core =
            EXPR_MARK +
            'function env(t){var tp=Math.max(1,effect("MF Pico frames")(1))*thisComp.frameDuration; if(t<0) return 0;' +
            ' if(t<tp){var u=t/tp; return Math.sin(u*Math.PI/2);}' +
            ' var s=t-tp; return Math.cos(2*Math.PI*effect("MF Freq Hz")(1)*s)*Math.exp(-effect("MF Decay")(1)*s);}\n';
        var posE = core +
            'if(n<1){value}else{var t=time-thisLayer.marker.key(n).time; seedRandom(n,true);' +
            ' var a=random(0,2*Math.PI); var sc=thisComp.width/1080;' +
            ' var amp=effect("MF Amp px")(1)*sc; var d=[Math.cos(a),Math.sin(a)];' +
            ' seedRandom(Math.floor(time/thisComp.frameDuration),true);' +
            ' var j=effect("MF Jitter px")(1)*sc*Math.exp(-effect("MF Decay")(1)*t);' +
            ' add(add(value,mul(d,amp*env(t))),[random(-j,j),random(-j,j)]);}';
        var rotE = core +
            'if(n<1){value}else{var t=time-thisLayer.marker.key(n).time; seedRandom(n+99,true);' +
            ' var sg=(random()<0.5)?-1:1; value+sg*effect("MF Rot graus")(1)*env(t);}';
        var sclE = EXPR_MARK +
            'if(n<1){value}else{var t=time-thisLayer.marker.key(n).time;' +
            ' var tp=Math.max(1,effect("MF Pico frames")(1))*thisComp.frameDuration;' +
            ' var p=effect("MF Punch %")(1); var e=(t<tp)?(t/tp):Math.exp(-effect("MF Decay")(1)*0.8*(t-tp));' +
            ' value+p*e;}';
        try {
            prop(tr, TR.pos).expression = posE;
            prop(tr, TR.rot).expression = rotE;
            prop(tr, TR.sh).expression = sclE;
        } catch (e) { log("expr: " + e); }
        // borrão direcional extra que acompanha a velocidade (efeito "smear" das edits)
        var db = addFx(layer, ["ADBE Motion Blur", "Directional Blur"], "MF Smear (velocidade)");
        if (db) {
            try {
                prop(db, ["ADBE Motion Blur-0001", "Direction"]).expression =
                    'v=effect("MF ' + preset.name + '")(2).velocity; radiansToDegrees(Math.atan2(v[0],-v[1]))';
                prop(db, ["ADBE Motion Blur-0002", "Blur Length"]).expression =
                    'v=effect("MF ' + preset.name + '")(2).velocity; Math.min(150,length(v)*thisComp.frameDuration*' + preset.smear + ')';
            } catch (e3) { log("smear expr: " + e3); }
        }
        if (layer.marker.numKeys === 0) {
            layer.marker.setValueAtTime(comp.time, new MarkerValue("hit"));
        }
        layer.comment = "MotionFrame: " + preset.name + " — dispara em cada marcador do layer.";
    }

    var PARAM_SHAKES = [
        { name: "Impact Kick", desc: "Kick medido (pico em 3f, assenta em ~10f, 45px, 2°, +12%) — padrão das 3 edits", amp: 45, peak: 3, freq: 3.5, decay: 9, rot: 2, punch: 12, jitter: 4, smear: 0.6 },
        { name: "Hard Rattle", desc: "Tremida forte (12 Hz) estilo S_Shake/Twitch em drops", amp: 28, peak: 1, freq: 12, decay: 7, rot: 3, punch: 8, jitter: 10, smear: 0.8 },
        { name: "Soft Bounce", desc: "Quique suave (E3) — 25px, 1.2°, +6%", amp: 25, peak: 4, freq: 2.2, decay: 6, rot: 1.2, punch: 6, jitter: 0, smear: 0.4 },
        { name: "Zoom Punch", desc: "Só zoom/rotação no beat (+18%, 1.5°), posição mínima", amp: 8, peak: 2, freq: 3, decay: 8, rot: 1.5, punch: 18, jitter: 2, smear: 0.3 }
    ];

    function handheldWiggle(layer, comp) {
        motionTile(layer);
        slider(layer, "MF Freq", 1.6);
        slider(layer, "MF Amp px", 14);
        slider(layer, "MF Rot", 0.8);
        var tr = transformFx(layer, "MF Handheld", 180);
        try {
            prop(tr, TR.pos).expression = 'wiggle(effect("MF Freq")(1), effect("MF Amp px")(1)*thisComp.width/1080, 2, 0.5)';
            prop(tr, TR.rot).expression = 'wiggle(effect("MF Freq")(1)*0.8, effect("MF Rot")(1), 1)';
            setP(tr, TR.sh, 104);
        } catch (e) {}
    }

    function twitchJitter(layer, comp) {
        // tremido "quebrado" a 12 fps por N frames depois de cada marcador
        motionTile(layer);
        slider(layer, "MF Jitter px", 22);
        slider(layer, "MF Duracao frames", 6);
        slider(layer, "MF Jitter fps", 15);
        var tr = transformFx(layer, "MF Twitch Jitter", 180);
        var e = EXPR_MARK +
            'posterizeTime(effect("MF Jitter fps")(1));' +
            'if(n<1){value}else{var t=time-thisLayer.marker.key(n).time; var d=effect("MF Duracao frames")(1)*thisComp.frameDuration;' +
            ' if(t>d){value}else{seedRandom(Math.floor(time*100),true); var a=effect("MF Jitter px")(1)*thisComp.width/1080*(1-t/d); add(value,[random(-a,a),random(-a,a)]);}}';
        try { prop(tr, TR.pos).expression = e; } catch (x) {}
        var e2 = EXPR_MARK + 'posterizeTime(effect("MF Jitter fps")(1)); if(n<1){value}else{var t=time-thisLayer.marker.key(n).time; var d=effect("MF Duracao frames")(1)*thisComp.frameDuration; if(t>d){value}else{seedRandom(Math.floor(time*100)+7,true); value+random(-2,2)*(1-t/d);}}';
        try { prop(tr, TR.rot).expression = e2; } catch (x2) {}
        // RGB split no mesmo trecho
        var ca = addFxPlugin(layer, ["Twitch", "VC Twitch"], ["ADBE VRAbberation", "VR Chromatic Aberrations"], "MF RGB Split");
        if (ca.fx && !ca.plugin) {
            var gate = EXPR_MARK + 'var on=0; if(n>0){var t=time-thisLayer.marker.key(n).time; on=(t<=effect("MF Duracao frames")(1)*thisComp.frameDuration)?1:0;} ';
            try {
                prop(ca.fx, ["ADBE VRAbberation-0001", "Aberration (Red)"]).expression = gate + 'on*18';
                prop(ca.fx, ["ADBE VRAbberation-0003", "Aberration (Blue)"]).expression = gate + '-on*18';
            } catch (e4) { log("RGB split: ajuste 'Aberration (Red/Blue)' manualmente."); }
        }
    }

    // ======================== TRANSIÇÕES / BLURS ========================
    function zoomBlur(layer, comp, t0) {
        // medido: e1 f303-307 e f340-345 — 2 frames de subida, 2-3 de descida
        var r = addFxPlugin(layer, ["S_BlurMoCurves", "S_ZoomBlur", "BCC Radial Blur", "BCC Zoom Blur"], ["CC Radial Blur"], "MF Zoom Blur");
        var fx = r.fx; if (!fx) return;
        if (!r.plugin) {
            setP(fx, ["Type"], 2); // Fading Zoom
            setP(fx, ["Quality"], 50);
            setP(fx, ["Center"], [comp.width / 2, comp.height / 2]);
            keysP(prop(fx, ["Amount"]), fk(t0, [-3, -1, 0, 1, 3]), [0, 45, 90, 45, 0], "auto");
        }
        var t = addFx(layer, ["ADBE Geometry2"], "MF Zoom Punch");
        setP(t, TR.useComp, 0); setP(t, TR.shutter, 360);
        keysP(prop(t, TR.sh), fk(t0, [-3, 0, 4]), [100, 135, 100], "ease");
    }

    function smearTransition(layer, comp, t0, dir) {
        // whip: deslocamento + motion blur (RSMB/Directional blur) — e2 f206-212 (smear para a esquerda)
        motionTile(layer);
        var t = transformFx(layer, "MF Whip " + dir, 360);
        var W = comp.width, H = comp.height, off = W * 0.9;
        var v = { left: [-off, 0], right: [off, 0], up: [0, -off], down: [0, off] }[dir];
        // entra rápido (ease-out forte, igual ao gráfico medido: 70% do caminho nos 2 primeiros frames)
        var p = prop(t, TR.pos);
        keysP(p, fk(t0, [-4, 0]), [[W / 2 - v[0], H / 2 - v[1]], [W / 2, H / 2]], "linear");
        try {
            p.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            p.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            p.setTemporalEaseAtKey(1, [new KeyframeEase(0, 5)], [new KeyframeEase(0, 5)]);
            p.setTemporalEaseAtKey(2, [new KeyframeEase(0, 92)], [new KeyframeEase(0, 92)]);
        } catch (e) {}
        keysP(prop(t, TR.sh), fk(t0, [-4, 0, 3]), [125, 112, 100], "ease");
        var db = addFx(layer, ["ADBE Motion Blur"], "MF Smear");
        setP(db, ["ADBE Motion Blur-0001", "Direction"], (dir === "left" || dir === "right") ? 90 : 0);
        keysP(prop(db, ["ADBE Motion Blur-0002", "Blur Length"]), fk(t0, [-4, -1, 0, 2, 4]), [60, 140, 90, 20, 0], "auto");
    }

    function blurIn(layer, comp, t0) {
        // e3: blur gigante -> nítido em 5 frames + zoom 110->100
        var r = addFxPlugin(layer, ["S_Blur", "BCC Gaussian Blur"], ["ADBE Gaussian Blur 2"], "MF Blur In");
        if (!r.plugin) {
            setP(r.fx, ["ADBE Gaussian Blur 2-0003", "Repeat Edge Pixels"], 1);
            keysP(prop(r.fx, ["ADBE Gaussian Blur 2-0001", "Blurriness"]), fk(t0, [0, 2, 5]), [80, 25, 0], "auto");
        }
        var t = addFx(layer, ["ADBE Geometry2"], "MF Blur-In Zoom");
        keysP(prop(t, TR.sh), fk(t0, [0, 6]), [112, 100], "ease");
        var ex = addFx(layer, ["ADBE Exposure2"], "MF Blur-In Exposure");
        keysP(prop(ex, ["ADBE Exposure2-0002", "Exposure"]), fk(t0, [0, 5]), [0.8, 0], "ease");
    }

    function flashWhite(layer, comp, t0) {
        // e3 f45-60: sobe em 5f, segura 3f, desce em 6f
        var ex = addFx(layer, ["ADBE Exposure2", "Exposure"], "MF Flash");
        keysP(prop(ex, ["ADBE Exposure2-0002", "Exposure"]), fk(t0, [-5, 0, 3, 9]), [0, 4, 4, 0], "ease");
        var gl = addFx(layer, ["ADBE Glo2"], "MF Flash Bloom");
        setP(gl, ["ADBE Glo2-0002", "Glow Threshold"], 55);
        setP(gl, ["ADBE Glo2-0003", "Glow Radius"], 120);
        keysP(prop(gl, ["ADBE Glo2-0004", "Glow Intensity"]), fk(t0, [-5, 0, 9]), [0, 2.5, 0], "ease");
    }

    function outroWhiteBlack(layer, comp, t0) {
        // e1 f546-573: estoura para branco e decai até preto em ~24 frames
        var ex = addFx(layer, ["ADBE Exposure2"], "MF Outro Exposure");
        keysP(prop(ex, ["ADBE Exposure2-0002", "Exposure"]), fk(t0, [0, 1, 3]), [0, 5, 5], "linear");
        var bc = addFx(layer, ["ADBE Brightness & Contrast 2"], "MF Outro Fade");
        keysP(prop(bc, ["ADBE Brightness & Contrast 2-0001", "Brightness"]), fk(t0, [3, 27]), [0, -150], "linear");
        var bl = addFx(layer, ["ADBE Gaussian Blur 2"], "MF Outro Blur");
        keysP(prop(bl, ["ADBE Gaussian Blur 2-0001", "Blurriness"]), fk(t0, [0, 3]), [0, 120], "linear");
    }

    function invertFlash(layer, comp, t0) {
        // e1 f393-406: frames invertidos (branco/ciano) intercalados — hold keys
        var inv = addFx(layer, ["ADBE Invert", "Invert"], "MF Invert Flash");
        keysP(prop(inv, ["ADBE Invert-0002", "Blend With Original"]), fk(t0, [0, 2, 5, 6, 8, 9]), [0, 100, 0, 100, 0, 100], "hold");
        var tn = addFx(layer, ["ADBE Tint"], "MF Invert Tint");
        setP(tn, ["ADBE Tint-0001", "Map Black To"], C(0x0A1A24));
        setP(tn, ["ADBE Tint-0002", "Map White To"], C(0xE8FFFF));
        keysP(prop(tn, ["ADBE Tint-0003", "Amount to Tint"]), fk(t0, [0, 2, 5, 6, 8, 9]), [85, 0, 85, 0, 85, 0], "hold");
    }

    function bwStrobe(layer, comp, t0) {
        // e1 f311-338: alterna P&B / cor (padrão medido 4-3-4-2-4-3)
        var tn = addFx(layer, ["ADBE Tint", "Tint"], "MF BW Strobe");
        var fr = [0, 4, 7, 11, 13, 17, 20], v = [100, 0, 100, 0, 100, 0, 100];
        keysP(prop(tn, ["ADBE Tint-0003", "Amount to Tint"]), fk(t0, fr), v, "hold");
        var bc = addFx(layer, ["ADBE Brightness & Contrast 2"], "MF BW Contrast");
        keysP(prop(bc, ["ADBE Brightness & Contrast 2-0002", "Contrast"]), fk(t0, fr), [35, 0, 35, 0, 35, 0, 35], "hold");
    }

    function velocityRamp(layer, comp, t0) {
        // Twixtor / Timewarp — precisa estar no layer de FOOTAGE
        var r = addFxPlugin(layer, ["Twixtor Pro", "Twixtor", "RE:Vision Twixtor"], ["ADBE Timewarp", "Timewarp"], "MF Velocity");
        if (!r.fx) return;
        if (r.plugin) {
            log("Twixtor aplicado: anime 'Speed %' 100 -> 25 -> 100 (o script tenta abaixo).");
            keysP(prop(r.fx, ["Speed %", "Speed"]), fk(t0, [0, 6, 24, 30]), [100, 25, 25, 100], "ease");
        } else {
            setP(r.fx, ["Method"], 3); // Pixel Motion
            keysP(prop(r.fx, ["Speed"]), fk(t0, [0, 6, 24, 30]), [100, 25, 25, 100], "ease");
        }
        addFxPlugin(layer, ["RSMB", "ReelSmart Motion Blur", "RSMB Pro"], ["ADBE Pixel Motion Blur", "Pixel Motion Blur"], "MF Motion Blur");
    }

    // ======================== GLITCH ========================
    function sliceGlitch(layer, comp, t0) {
        // e1 f63-68, f354-356, e3 f201-207: faixas horizontais deslocadas + RGB split, 4-6 frames
        var r = addFxPlugin(layer, ["Glitchify", "S_DigitalDamage", "BCC Video Glitch", "BCC Data Glitch"], null, "MF Glitch (plugin)");
        var ww = addFx(layer, ["ADBE Wave Warp", "Wave Warp"], "MF Slice Glitch");
        if (ww) {
            setP(ww, ["ADBE Wave Warp-0001", "Wave Type"], 2); // Square
            setP(ww, ["ADBE Wave Warp-0004", "Direction"], 0);
            setP(ww, ["ADBE Wave Warp-0005", "Wave Speed"], 0);
            setP(ww, ["ADBE Wave Warp-0006", "Pinning"], 1);
            var fr = [-1, 0, 1, 2, 3, 4, 5], H = [0, 60, 25, 110, 40, 15, 0], Wd = [100, 180, 60, 300, 90, 140, 100];
            var ph = [0, 30, 120, 210, 75, 300, 0];
            keysP(prop(ww, ["ADBE Wave Warp-0002", "Wave Height"]), fk(t0, fr), H, "hold");
            keysP(prop(ww, ["ADBE Wave Warp-0003", "Wave Width"]), fk(t0, fr), Wd, "hold");
            keysP(prop(ww, ["ADBE Wave Warp-0007", "Phase"]), fk(t0, fr), ph, "hold");
        }
        rgbSplitKeys(layer, t0, [-1, 0, 2, 5], [0, 1, 1, 0]);
    }

    function blockGlitch(layer, comp, t0) {
        // e2 f225-262: blocos/tiles deslocados nas duas direções (estilo Twitch "slide"/Glitchify blocks)
        var r = addFxPlugin(layer, ["Twitch", "Glitchify", "BCC Pixel Sorter", "S_DigitalDamage"], null, "MF Block Glitch (plugin)");
        motionTile(layer);
        var a = addFx(layer, ["ADBE Wave Warp"], "MF Blocks H");
        var b = addFx(layer, ["ADBE Wave Warp"], "MF Blocks V");
        var fr = [-1, 0, 1, 3, 4, 6, 7];
        var cfg = [[a, 0, [0, 140, 60, 220, 90, 30, 0], [400, 520, 300, 700, 360, 480, 400]],
                   [b, 90, [0, 90, 180, 70, 160, 40, 0], [300, 700, 420, 520, 640, 380, 300]]];
        for (var i = 0; i < cfg.length; i++) {
            var w = cfg[i][0]; if (!w) continue;
            setP(w, ["ADBE Wave Warp-0001", "Wave Type"], 2);
            setP(w, ["ADBE Wave Warp-0004", "Direction"], cfg[i][1]);
            setP(w, ["ADBE Wave Warp-0005", "Wave Speed"], 0);
            setP(w, ["ADBE Wave Warp-0006", "Pinning"], 1);
            keysP(prop(w, ["ADBE Wave Warp-0002", "Wave Height"]), fk(t0, fr), cfg[i][2], "hold");
            keysP(prop(w, ["ADBE Wave Warp-0003", "Wave Width"]), fk(t0, fr), cfg[i][3], "hold");
        }
        var ex = addFx(layer, ["ADBE Exposure2"], "MF Block Exposure");
        keysP(prop(ex, ["ADBE Exposure2-0002", "Exposure"]), fk(t0, fr), [0, 1.2, 0.3, 1.6, 0.2, 0.8, 0], "hold");
        rgbSplitKeys(layer, t0, [-1, 0, 4, 7], [0, 1, 1, 0]);
    }

    function rgbSplitKeys(layer, t0, fr, onOff) {
        // RGB split nativo: 3 Shift Channels não deslocam, então usamos 2 Transform com blend via Channel Combiner é pesado.
        // Solução leve: "VR Chromatic Aberrations" (nativo AE CC 2018+) ou S_Glitch/BCC se houver.
        var r = addFxPlugin(layer, ["S_ChromaticAberration", "BCC Chromatic Aberration", "BCC Prism"], ["ADBE VRAbberation", "VR Chromatic Aberrations"], "MF RGB Split");
        if (!r.fx) return;
        if (!r.plugin) {
            var pr = prop(r.fx, ["ADBE VRAbberation-0001", "Aberration (Red)"]);
            var pb = prop(r.fx, ["ADBE VRAbberation-0003", "Aberration (Blue)"]);
            var vr = [], vb = [];
            for (var i = 0; i < onOff.length; i++) { vr.push(onOff[i] * 18); vb.push(-onOff[i] * 18); }
            keysP(pr, fk(t0, fr), vr, "hold");
            keysP(pb, fk(t0, fr), vb, "hold");
        }
    }

    // ======================== COLOR (CC) ========================
    // valores derivados das médias medidas (sombras/altas/preto/branco/saturação) de cada edit
    function ccStack(layer, look) {
        var bc = addFx(layer, ["ADBE Brightness & Contrast 2"], "MF CC Contraste");
        setP(bc, ["ADBE Brightness & Contrast 2-0001", "Brightness"], look.bright);
        setP(bc, ["ADBE Brightness & Contrast 2-0002", "Contrast"], look.contrast);
        var cb = addFx(layer, ["ADBE Color Balance 2", "Color Balance"], "MF CC Split Tone");
        var ids = ["Shadow Red Balance", "Shadow Green Balance", "Shadow Blue Balance",
                   "Midtone Red Balance", "Midtone Green Balance", "Midtone Blue Balance",
                   "Hilight Red Balance", "Hilight Green Balance", "Hilight Blue Balance"];
        for (var i = 0; i < 9; i++) {
            var mn = "ADBE Color Balance 2-000" + (i + 1);
            setP(cb, [mn, ids[i], ids[i].replace("Hilight", "Highlight")], look.bal[i]);
        }
        setP(cb, ["ADBE Color Balance 2-0010", "Preserve Luminosity"], 1);
        var vb = addFx(layer, ["ADBE Vibrance", "Vibrance"], "MF CC Saturação");
        setP(vb, ["ADBE Vibrance-0001", "Vibrance"], look.vib);
        setP(vb, ["ADBE Vibrance-0002", "Saturation"], look.sat);
        if (look.lift) {
            // preto levantado / branco comprimido: out = in*2^E + offset
            var lv = addFx(layer, ["ADBE Exposure2", "Exposure"], "MF CC Fade (matte)");
            var off = look.lift / 255, ev = Math.log(look.white / 255 - off) / Math.LN2;
            setP(lv, ["ADBE Exposure2-0002", "Exposure"], Math.round(ev * 100) / 100);
            setP(lv, ["ADBE Exposure2-0003", "Offset"], Math.round(off * 1000) / 1000);
        }
        if (look.bloom) {
            var gl = addFx(layer, ["ADBE Glo2"], "MF CC Bloom");
            setP(gl, ["ADBE Glo2-0002", "Glow Threshold"], look.bloom[0]);
            setP(gl, ["ADBE Glo2-0003", "Glow Radius"], look.bloom[1]);
            setP(gl, ["ADBE Glo2-0004", "Glow Intensity"], look.bloom[2]);
        }
        var sh = addFx(layer, ["ADBE Unsharp Mask2", "Unsharp Mask"], "MF Sharpen");
        setP(sh, ["ADBE Unsharp Mask2-0001", "Amount"], look.sharp);
        setP(sh, ["ADBE Unsharp Mask2-0002", "Radius"], 1.4);
        var vg = addFx(layer, ["CC Vignette"], "MF Vignette");
        setP(vg, ["Amount"], look.vig);
        var nz = addFx(layer, ["ADBE Noise", "Noise"], "MF Grain");
        setP(nz, ["ADBE Noise-0001", "Amount of Noise"], look.grain);
        setP(nz, ["ADBE Noise-0002", "Use Color Noise"], 0);
    }

    var LOOKS = {
        E1: { name: "E1 Cold Teal (THE REACTION)", bright: -6, contrast: 22, vib: 18, sat: 6,
              bal: [-8, 2, 14, -3, 4, 4, 0, 4, -4], lift: 10, white: 238, bloom: [80, 40, 0.25], sharp: 70, vig: 60, grain: 2.5 },
        E2: { name: "E2 Magenta Night (FTB)", bright: -4, contrast: 26, vib: 10, sat: -4,
              bal: [8, -12, 16, 3, -4, 6, 2, 0, 0], lift: 0, white: 255, bloom: [70, 60, 0.45], sharp: 80, vig: 55, grain: 2 },
        E3: { name: "E3 Faded Warm Cine (FTB)", bright: 0, contrast: 12, vib: -6, sat: -15,
              bal: [4, -8, 6, 0, -2, 0, 9, 3, -9], lift: 19, white: 232, bloom: [60, 90, 0.5], sharp: 55, vig: 70, grain: 3 }
    };

    // ======================== OVERLAYS / GLOWS ========================
    function subjectGlow(layer, comp, color, label) {
        // Deep Glow se instalado; senão Glow nativo em dois passes (núcleo + halo)
        var r = addFxPlugin(layer, ["Deep Glow", "Deep Glow 2", "PEDG", "S_Glow", "BCC Glow"], null, "MF " + label);
        if (r.fx && r.plugin) {
            setP(r.fx, ["Radius"], 120); setP(r.fx, ["Exposure"], 0.6);
            setP(r.fx, ["Tint", "Tint Color"], color);
            return;
        }
        var passes = [[40, 30, 1.5], [55, 140, 1.0]];
        for (var i = 0; i < passes.length; i++) {
            var g = addFx(layer, ["ADBE Glo2"], "MF " + label + " " + (i + 1));
            setP(g, ["ADBE Glo2-0002", "Glow Threshold"], passes[i][0]);
            setP(g, ["ADBE Glo2-0003", "Glow Radius"], passes[i][1]);
            setP(g, ["ADBE Glo2-0004", "Glow Intensity"], passes[i][2]);
            setP(g, ["ADBE Glo2-0007", "Glow Colors"], 2); // A & B
            setP(g, ["ADBE Glo2-0012", "Color A"], color);
            setP(g, ["ADBE Glo2-0013", "Color B"], color);
        }
    }

    function spotlightHalo(comp, t0) {
        // e1 f207-280: halo branco radial atrás do sujeito + fundo escuro
        var l = comp.layers.addSolid([0, 0, 0], "MF Spotlight Halo", comp.width, comp.height, comp.pixelAspect, comp.duration);
        var rp = addFx(l, ["ADBE Ramp"], "MF Halo Ramp");
        setP(rp, ["ADBE Ramp-0001", "Start of Ramp"], [comp.width / 2, comp.height * 0.32]);
        setP(rp, ["ADBE Ramp-0002", "Start Color"], C(0xEDEDED));
        setP(rp, ["ADBE Ramp-0003", "End of Ramp"], [comp.width / 2 + comp.width * 0.32, comp.height * 0.32]);
        setP(rp, ["ADBE Ramp-0004", "End Color"], C(0x000000));
        setP(rp, ["ADBE Ramp-0005", "Ramp Shape"], 2);
        var bl = addFx(l, ["ADBE Box Blur2"], "MF Halo Soft");
        setP(bl, ["ADBE Box Blur2-0001", "Blur Radius"], 60);
        l.blendingMode = BlendingMode.SCREEN;
        l.opacity.setValue(85);
        l.comment = "Coloque ABAIXO do sujeito recortado (Roto Brush) e acima do fundo.";
        return l;
    }

    function lightRays(layer, comp) {
        // e1 f327-338: raios saindo do sujeito (fundo P&B esverdeado) — CC Light Rays / S_Rays / BCC Rays
        var r = addFxPlugin(layer, ["S_Rays", "BCC Rays Light", "BCC Rays Puffy"], ["CC Light Rays"], "MF Light Rays");
        if (r.fx && !r.plugin) {
            setP(r.fx, ["Intensity"], 140);
            setP(r.fx, ["Center"], [comp.width / 2, comp.height * 0.33]);
            setP(r.fx, ["Radius"], 70);
            setP(r.fx, ["Warp Softness"], 25);
        }
        var tn = addFx(layer, ["ADBE Tritone"], "MF Rays Tone");
        setP(tn, ["ADBE Tritone-0001", "Highlights"], C(0xE8FFF4));
        setP(tn, ["ADBE Tritone-0002", "Midtones"], C(0x4F6F66));
        setP(tn, ["ADBE Tritone-0003", "Shadows"], C(0x061010));
        setP(tn, ["ADBE Tritone-0004", "Blend With Original"], 35);
    }

    function lightStreak(comp, t0) {
        // e3 f0-25 / f195-205: risco de luz horizontal (Optical Flares / S_Glint)
        var W = comp.width, H = comp.height;
        var l = comp.layers.addSolid([1, 1, 1], "MF Light Streak", W, H, comp.pixelAspect, comp.duration);
        var m = l.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        var sh = new Shape(); var y = H * 0.55, hh = H * 0.004;
        sh.vertices = [[-W * 0.1, y - hh], [W * 1.1, y - hh], [W * 1.1, y + hh], [-W * 0.1, y + hh]]; sh.closed = true;
        m.property("ADBE Mask Shape").setValue(sh);
        m.property("ADBE Mask Feather").setValue([60, 6]);
        var bl = addFx(l, ["ADBE Box Blur2"], "MF Streak Blur");
        setP(bl, ["ADBE Box Blur2-0001", "Blur Radius"], 40);
        setP(bl, ["ADBE Box Blur2-0003", "Blur Dimensions"], 2);
        var gl = addFx(l, ["ADBE Glo2"], "MF Streak Glow");
        setP(gl, ["ADBE Glo2-0003", "Glow Radius"], 80); setP(gl, ["ADBE Glo2-0004", "Glow Intensity"], 2);
        l.blendingMode = BlendingMode.ADD;
        keysP(l.opacity, fk(t0, [0, 3, 10, 18]), [0, 90, 70, 0], "ease");
        keysP(l.position, fk(t0, [0, 18]), [[W / 2, H / 2 + H * 0.06], [W / 2, H / 2 - H * 0.05]], "ease");
        return l;
    }

    function lightLeak(comp, t0) {
        // e2 f126-135: vazamento de luz laranja/roxo (overlay)
        var W = comp.width, H = comp.height;
        var l = comp.layers.addSolid([0, 0, 0], "MF Light Leak", W, H, comp.pixelAspect, comp.duration);
        var fn = addFx(l, ["ADBE Fractal Noise", "Fractal Noise"], "MF Leak Noise");
        setP(fn, ["Contrast"], 160); setP(fn, ["Brightness"], -10);
        try { prop(fn, ["Evolution"]).expression = "time*220"; } catch (e) {}
        var tri = addFx(l, ["ADBE Tritone"], "MF Leak Color");
        setP(tri, ["ADBE Tritone-0001", "Highlights"], C(0xFFD27A));
        setP(tri, ["ADBE Tritone-0002", "Midtones"], C(0xC2329A));
        setP(tri, ["ADBE Tritone-0003", "Shadows"], C(0x000000));
        var bl = addFx(l, ["ADBE Gaussian Blur 2"], "MF Leak Blur");
        setP(bl, ["ADBE Gaussian Blur 2-0001", "Blurriness"], 90);
        l.blendingMode = BlendingMode.SCREEN;
        keysP(l.opacity, fk(t0, [0, 3, 6, 10]), [0, 100, 85, 0], "ease");
        return l;
    }

    function textShake(layer, comp) {
        // "THE REACTION" / "on cooked" — tremido de texto a 12 fps + glow
        var e = 'posterizeTime(12); wiggle(12, 4*thisComp.width/1080)';
        try { layer.property("ADBE Transform Group").property("ADBE Position").expression = e; } catch (x) { log("textShake: " + x); }
        var g = addFx(layer, ["ADBE Glo2"], "MF Text Glow");
        setP(g, ["ADBE Glo2-0002", "Glow Threshold"], 40); setP(g, ["ADBE Glo2-0003", "Glow Radius"], 25);
        setP(g, ["ADBE Glo2-0004", "Glow Intensity"], 1.2);
    }

    function endCardGlow(layer, comp) {
        // e2/e3 final: texto manuscrito com glow forte + poeira
        subjectGlow(layer, comp, C(0xFFFFFF), "EndCard Glow");
        var ds = addFx(layer, ["ADBE Drop Shadow"], "MF EndCard Shadow");
        setP(ds, ["ADBE Drop Shadow-0004", "Distance"], 0); setP(ds, ["ADBE Drop Shadow-0005", "Softness"], 40);
        keysP(layer.property("ADBE Transform Group").property("ADBE Scale"), fk(comp.time, [0, 60]), [[96, 96, 100], [104, 104, 100]], "linear");
    }

    // ======================== CATÁLOGO ========================
    var PRESETS = [];
    function add(cat, name, desc, fn, forceNewName) { PRESETS.push({ cat: cat, name: name, desc: desc, fn: fn, adj: forceNewName }); }

    for (var si = 0; si < SIGS.length; si++) {
        (function (sig) {
            add("Shakes medidos", sig.name, sig.desc + "  [medido em " + sig.src + ", " + sig.s.length + " frames]",
                function (L, comp) { applySignature(sig, L, comp.time, comp); });
        })(SIGS[si]);
    }
    for (var pi = 0; pi < PARAM_SHAKES.length; pi++) {
        (function (ps) {
            add("Shakes por batida (marcadores)", ps.name, ps.desc, function (L, comp) { impactKick(L, comp, ps); });
        })(PARAM_SHAKES[pi]);
    }
    add("Shakes por batida (marcadores)", "Twitch Jitter", "Tremido picotado a 15fps + RGB split por 6 frames após cada marcador", function (L, c) { twitchJitter(L, c); });
    add("Shakes por batida (marcadores)", "Handheld Wiggle", "Camera na mão contínua (1.6 Hz, 14px, 0.8°)", function (L, c) { handheldWiggle(L, c); });

    add("Transições / Blur", "Zoom Blur Punch", "Radial zoom blur 4f + zoom 135% (E1 f303/f340)", function (L, c) { zoomBlur(L, c, c.time); });
    add("Transições / Blur", "Whip Left", "Whip com smear (E2 f206)", function (L, c) { smearTransition(L, c, c.time, "left"); });
    add("Transições / Blur", "Whip Right", "Whip com smear", function (L, c) { smearTransition(L, c, c.time, "right"); });
    add("Transições / Blur", "Whip Up", "Whip vertical com smear (E1 f339)", function (L, c) { smearTransition(L, c, c.time, "up"); });
    add("Transições / Blur", "Whip Down", "Whip vertical com smear", function (L, c) { smearTransition(L, c, c.time, "down"); });
    add("Transições / Blur", "Blur In", "Blur 80->0 em 5f + zoom 112->100 (E3)", function (L, c) { blurIn(L, c, c.time); });
    add("Transições / Blur", "Flash White", "Flash branco 5f sobe / 6f desce (E3 f45-60)", function (L, c) { flashWhite(L, c, c.time); });
    add("Transições / Blur", "Outro White->Black", "Final da E1 (estoura branco e apaga)", function (L, c) { outroWhiteBlack(L, c, c.time); });
    add("Transições / Blur", "Invert Flash", "Frames invertidos ciano (E1 f393-406)", function (L, c) { invertFlash(L, c, c.time); });
    add("Transições / Blur", "BW Strobe", "Pisca P&B/cor 4-3-4-2 frames (E1 f311-338)", function (L, c) { bwStrobe(L, c, c.time); });
    add("Transições / Blur", "Velocity Ramp (Twixtor/Timewarp)", "Slow-mo 100->25->100 + motion blur. APLIQUE NO FOOTAGE", function (L, c) { velocityRamp(L, c, c.time); });

    add("Glitch", "Slice Glitch (Glitchify-like)", "Faixas horizontais + RGB split, 6 frames", function (L, c) { sliceGlitch(L, c, c.time); });
    add("Glitch", "Block Glitch (Twitch-like)", "Blocos deslocados H/V + exposição piscando (E2)", function (L, c) { blockGlitch(L, c, c.time); });
    add("Glitch", "RGB Split hit", "Separação RGB de 4 frames", function (L, c) { rgbSplitKeys(L, c.time, [-1, 0, 4], [0, 1, 0]); });

    add("Color (CC)", LOOKS.E1.name, "Sombras frias, contraste alto, branco comprimido, vinheta", function (L, c) { ccStack(L, LOOKS.E1); });
    add("Color (CC)", LOOKS.E2.name, "Sombras magenta/roxas, bloom, contraste", function (L, c) { ccStack(L, LOOKS.E2); });
    add("Color (CC)", LOOKS.E3.name, "Preto levantado (matte), altas quentes, dessaturado, haze", function (L, c) { ccStack(L, LOOKS.E3); });

    add("Glow / Overlays", "Subject Glow Verde (E1)", "Deep Glow verde no sujeito recortado", function (L, c) { subjectGlow(L, c, C(0x2BFF8A), "Glow Verde"); });
    add("Glow / Overlays", "Subject Glow Amarelo (E3)", "Glow dourado no sujeito (Neymar seleção)", function (L, c) { subjectGlow(L, c, C(0xFFC21A), "Glow Amarelo"); });
    add("Glow / Overlays", "Eye Glow Vermelho (E2)", "Glow vermelho (aplique em máscara do olho)", function (L, c) { subjectGlow(L, c, C(0xFF1020), "Glow Olho"); });
    add("Glow / Overlays", "Light Rays BG (E1)", "Raios de luz + tom verde-acinzentado", function (L, c) { lightRays(L, c); });
    add("Glow / Overlays", "Spotlight Halo (E1)", "Cria solid com halo radial (põe atrás do sujeito)", function (L, c) { spotlightHalo(c, c.time); }, "solid");
    add("Glow / Overlays", "Light Streak (E3)", "Cria risco de luz horizontal animado", function (L, c) { lightStreak(c, c.time); }, "solid");
    add("Glow / Overlays", "Light Leak (E2)", "Cria light leak laranja/roxo 10f", function (L, c) { lightLeak(c, c.time); }, "solid");
    add("Glow / Overlays", "Text Shake + Glow", "Aplique no layer de texto", function (L, c) { textShake(L, c); });
    add("Glow / Overlays", "End Card Glow", "Texto final com glow forte", function (L, c) { endCardGlow(L, c); });

    // ======================== FERRAMENTAS ========================
    function deselectAll(comp) { for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false; }

    function saveLayerFFX(layer) {
        var fxg = layer.property("ADBE Effect Parade");
        if (!fxg || fxg.numProperties === 0) { alert("O layer '" + layer.name + "' não tem efeitos."); return; }
        var comp = layer.containingComp;
        deselectAll(comp);
        layer.selected = true;
        for (var i = 1; i <= fxg.numProperties; i++) fxg.property(i).selected = true;
        var id = app.findMenuCommandId("Save Animation Preset...");
        if (!id) id = 3075;
        app.executeCommand(id); // abre o diálogo nativo: escolha a pasta e o nome (sugestão: nome do layer)
    }

    function buildLibrary() {
        var c = app.project.items.addComp("MF_PRESET_LIBRARY", 1080, 1920, 1, 10, 30);
        c.openInViewer();
        c.time = 1;
        for (var i = PRESETS.length - 1; i >= 0; i--) {
            var P = PRESETS[i];
            if (P.adj === "solid") continue; // geradores de layer não viram .ffx de efeito
            var L = newAdjustment(c, P.name);
            try { P.fn(L, c); } catch (e) { log(P.name + ": " + e); }
            L.enabled = false;
        }
        return c;
    }

    function exportAll() {
        var c = app.project.activeItem;
        if (!(c && c instanceof CompItem && c.name === "MF_PRESET_LIBRARY")) c = buildLibrary();
        if (!confirm("Vai abrir " + c.numLayers + " diálogos 'Save Animation Preset' em sequência.\nDica: salve em Documents/Adobe/After Effects <versão>/User Presets/MotionFrame. Continuar?")) return;
        for (var i = 1; i <= c.numLayers; i++) {
            c.time = 1; saveLayerFFX(c.layer(i));
        }
    }

    // projeto demo: importa uma foto e cria UMA COMP POR EFEITO + uma comp "00 TODOS" com tudo em sequência
    function buildDemoProject() {
        var f = File.openDialog("Escolha a foto (jpg/png) para o projeto demo");
        if (!f) return;
        var foot = app.project.importFile(new ImportOptions(f));
        var folder = app.project.items.addFolder("MotionFrame DEMO");
        foot.parentFolder = folder;
        var W = 1080, H = 1440, DUR = 2, HIT = 0.4, comps = [];
        for (var i = 0; i < PRESETS.length; i++) {
            var P = PRESETS[i];
            if (/Velocity/.test(P.name)) continue; // precisa de vídeo, não de foto
            var num = (comps.length + 1 < 10 ? "0" : "") + (comps.length + 1);
            var c = app.project.items.addComp(num + " " + P.name, W, H, 1, DUR, 30);
            c.parentFolder = folder;
            var ph = c.layers.add(foot);
            var sc = Math.max(W / foot.width, H / foot.height) * 100;
            ph.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
            c.time = HIT;
            var L = null;
            if (P.adj === "solid") { L = null; }
            else if (/Text/.test(P.name)) { L = c.layers.addText("THE REACTION"); }
            else if (/Glow|Rays/.test(P.name)) { L = ph; } // glow vai no próprio sujeito
            else { L = newAdjustment(c, "MF " + P.name); }
            try { P.fn(L, c); } catch (e) { log(P.name + ": " + e); }
            if (L && L.marker && /Kick|Rattle|Bounce|Punch|Jitter/.test(P.name)) {
                L.marker.setValueAtTime(HIT + 0.8, new MarkerValue("hit 2"));
            }
            c.time = 0;
            comps.push(c);
        }
        var all = app.project.items.addComp("00 TODOS OS EFEITOS", W, H, 1, DUR * comps.length, 30);
        all.parentFolder = folder;
        for (var j = comps.length - 1; j >= 0; j--) {
            var l = all.layers.add(comps[j]); l.startTime = j * DUR;
            var tx = all.layers.addText(comps[j].name); tx.startTime = j * DUR; tx.outPoint = (j + 1) * DUR;
            try {
                var td = tx.property("ADBE Text Properties").property("ADBE Text Document"); var d = td.value;
                d.fontSize = 48; d.fillColor = [1, 1, 0]; d.applyStroke = true; d.strokeColor = [0, 0, 0]; d.strokeWidth = 4; td.setValue(d);
                tx.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, 90]);
            } catch (e2) {}
        }
        all.openInViewer();
        alert(comps.length + " comps criadas na pasta 'MotionFrame DEMO'.\nAbra '00 TODOS OS EFEITOS' e dê File > Save As para ter o .aep.");
    }

    // detecção de batida a partir do áudio da comp -> marcadores (para os shakes por marcador)
    function beatMarkers(comp, sens, minGap) {
        var audio = null;
        for (var i = 1; i <= comp.numLayers; i++) if (comp.layer(i).selected && comp.layer(i).hasAudio) audio = comp.layer(i);
        if (!audio) { alert("Selecione o layer de ÁUDIO (e opcionalmente o layer que vai receber os marcadores por último)."); return; }
        var target = null;
        for (var j = 0; j < comp.selectedLayers.length; j++) if (comp.selectedLayers[j] !== audio) target = comp.selectedLayers[j];
        deselectAll(comp); audio.selected = true;
        app.executeCommand(app.findMenuCommandId("Convert Audio to Keyframes"));
        var amp = comp.layer(1); // AE cria "Audio Amplitude" no topo
        var both = null;
        try { both = amp.property("ADBE Effect Parade").property("Both Channels").property(1); } catch (e) {}
        if (!both) { try { both = amp.property("ADBE Effect Parade").property(3).property(1); } catch (e2) {} }
        if (!both) { alert("Não achei 'Audio Amplitude'."); return; }
        var fd = comp.frameDuration, n = Math.floor(comp.duration / fd), v = [];
        for (var f = 0; f < n; f++) v.push(both.valueAtTime(f * fd, false));
        if (!target) target = newAdjustment(comp, "MF SHAKE (beats)");
        var last = -999, count = 0;
        for (var k = 4; k < n - 1; k++) {
            var avg = 0; for (var q = k - 4; q < k; q++) avg += v[q]; avg /= 4;
            if (v[k] > avg * sens && v[k] >= v[k - 1] && v[k] >= v[k + 1] && k - last >= minGap) {
                target.marker.setValueAtTime(k * fd, new MarkerValue("beat")); last = k; count++;
            }
        }
        amp.enabled = false;
        alert(count + " marcadores criados em '" + target.name + "'. Agora aplique um preset de 'Shakes por batida'.");
    }

    function refMarkers(comp, key) {
        var L = comp.selectedLayers.length ? comp.selectedLayers[0] : newAdjustment(comp, "MF SHAKE (" + key + " ref)");
        var a = ONSETS[key];
        for (var i = 0; i < a.length; i++) L.marker.setValueAtTime(comp.time + a[i] / 30, new MarkerValue(key + " " + a[i]));
    }

    function dumpMatchNames(layer) {
        var fxg = layer.property("ADBE Effect Parade"), s = "";
        for (var i = 1; i <= fxg.numProperties; i++) {
            var fx = fxg.property(i); s += fx.name + "  =>  " + fx.matchName + "\n";
            for (var j = 1; j <= fx.numProperties; j++) { try { s += "     " + fx.property(j).name + "  =>  " + fx.property(j).matchName + "\n"; } catch (e) {} }
        }
        var f = new File(Folder.desktop.fsName + "/MotionFrame_matchnames.txt");
        f.encoding = "UTF-8"; f.open("w"); f.write(s); f.close();
        alert("Salvo em " + f.fsName + "\n\n" + s.substring(0, 1500));
    }

    // ======================== UI ========================
    function buildUI(obj) {
        var w = (obj instanceof Panel) ? obj : new Window("palette", "MotionFrame FX", undefined, { resizeable: true });
        w.orientation = "column"; w.alignChildren = ["fill", "top"]; w.spacing = 6; w.margins = 8;
        var cats = [];
        for (var i = 0; i < PRESETS.length; i++) { var ok = true; for (var j = 0; j < cats.length; j++) if (cats[j] === PRESETS[i].cat) ok = false; if (ok) cats.push(PRESETS[i].cat); }
        var dd = w.add("dropdownlist", undefined, cats); dd.selection = 0;
        var lb = w.add("listbox", undefined, [], { multiselect: false }); lb.preferredSize = [320, 230];
        var desc = w.add("statictext", undefined, "", { multiline: true }); desc.preferredSize = [320, 48];
        var cb = w.add("checkbox", undefined, "Usar plugins se instalados (Sapphire/BCC/Deep Glow/Glitchify/Twitch/RSMB/Twixtor)"); cb.value = true;
        var cbNew = w.add("checkbox", undefined, "Sempre criar nova Adjustment Layer"); cbNew.value = false;
        var bA = w.add("button", undefined, "Aplicar no playhead");
        var g2 = w.add("group"); g2.orientation = "row"; g2.alignChildren = ["fill", "center"];
        var bS = g2.add("button", undefined, "Salvar efeitos do layer como .FFX");
        var bL = g2.add("button", undefined, "Construir biblioteca");
        var bE = w.add("button", undefined, "Exportar TODOS como .FFX (diálogo por preset)");
        var p3 = w.add("panel", undefined, "Batidas / marcadores"); p3.alignChildren = ["fill", "top"];
        var g3 = p3.add("group"); g3.add("statictext", undefined, "Sensib.");
        var sens = g3.add("edittext", undefined, "1.6"); sens.characters = 4;
        g3.add("statictext", undefined, "Gap (f)"); var gap = g3.add("edittext", undefined, "6"); gap.characters = 3;
        var bB = p3.add("button", undefined, "Marcadores de batida (do áudio selecionado)");
        var g4 = p3.add("group"); g4.add("statictext", undefined, "Timing original:");
        var r1 = g4.add("button", undefined, "E1"), r2 = g4.add("button", undefined, "E2"), r3 = g4.add("button", undefined, "E3");
        var bD = w.add("button", undefined, "PROJETO DEMO: 1 comp por efeito com uma foto");
        var bM = w.add("button", undefined, "Listar matchNames do layer (debug de plugin)");

        function fill() {
            lb.removeAll();
            for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].cat === dd.selection.text) { var it = lb.add("item", PRESETS[i].name); it.preset = PRESETS[i]; }
            if (lb.items.length) lb.selection = 0;
        }
        dd.onChange = fill;
        lb.onChange = function () { desc.text = lb.selection ? lb.selection.preset.desc : ""; };
        fill(); lb.onChange();

        function run(name, f) {
            LOG = []; USE_PLUGINS = cb.value;
            app.beginUndoGroup("MotionFrame: " + name);
            try { f(); } catch (e) { alert("Erro: " + e.toString() + (e.line ? " (linha " + e.line + ")" : "")); }
            app.endUndoGroup();
            if (LOG.length) alert("MotionFrame — avisos:\n" + LOG.join("\n"));
        }
        bA.onClick = function () {
            if (!lb.selection) return; var P = lb.selection.preset;
            run(P.name, function () {
                var c = getComp(); if (!c) return;
                var L = (P.adj === "solid") ? null : targetLayer(c, "MF " + P.name, cbNew.value);
                P.fn(L, c);
            });
        };
        bS.onClick = function () { var c = getComp(); if (!c) return; if (!c.selectedLayers.length) { alert("Selecione o layer."); return; } saveLayerFFX(c.selectedLayers[0]); };
        bL.onClick = function () { run("Biblioteca", buildLibrary); };
        bE.onClick = function () { USE_PLUGINS = cb.value; exportAll(); };
        bB.onClick = function () { run("Beat markers", function () { var c = getComp(); if (c) beatMarkers(c, parseFloat(sens.text) || 1.6, parseInt(gap.text, 10) || 6); }); };
        r1.onClick = function () { run("E1 markers", function () { var c = getComp(); if (c) refMarkers(c, "e1"); }); };
        r2.onClick = function () { run("E2 markers", function () { var c = getComp(); if (c) refMarkers(c, "e2"); }); };
        r3.onClick = function () { run("E3 markers", function () { var c = getComp(); if (c) refMarkers(c, "e3"); }); };
        bD.onClick = function () { USE_PLUGINS = cb.value; run("Projeto demo", buildDemoProject); };
        bM.onClick = function () { var c = getComp(); if (c && c.selectedLayers.length) dumpMatchNames(c.selectedLayers[0]); };

        w.onResizing = w.onResize = function () { this.layout.resize(); };
        if (w instanceof Window) { w.center(); w.show(); } else { w.layout.layout(true); }
        return w;
    }

    buildUI(thisObj);
})(this);
