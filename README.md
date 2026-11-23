# MotionFrame

Recria no After Effects os shakes, CCs, glitches, blurs e overlays de 3 edits de referência.

- `ae/scripts/MotionFrame_FX.jsx`: painel ScriptUI com 45 presets e exportação para `.ffx`.
- `docs/ANALISE_EDITS.md`: análise quadro a quadro das edits, valores medidos e equivalentes em plugin.
- `ae/data/`: curvas de shake medidas (`shake_signatures.json`) e batidas detectadas (`onsets_30fps.json`).
- `tools/`: scripts Python (OpenCV) da análise e `build_jsx.py`, que embute os dados no `.jsx`.

## Instalação rápida
1. Copie `ae/scripts/MotionFrame_FX.jsx` para `Adobe After Effects <versão>/Scripts/ScriptUI Panels/`.
2. Reinicie o AE e abra o painel em **Window › MotionFrame_FX.jsx**.
3. Escolha um preset e clique em **Aplicar no playhead**.
4. Para salvar como preset: clique em **Salvar efeitos do layer como .FFX**, ou em **Construir biblioteca** e depois **Exportar TODOS**.

Para editar o script, mude o `MotionFrame_FX.src.jsx` e rode `python3 tools/build_jsx.py`.
