#!/bin/bash
# MotionFrame - instalador macOS
set -e
for v in 9 10 11 12; do defaults write com.adobe.CSXS.$v PlayerDebugMode 1; done
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/MotionFrame"
rm -rf "$DEST"; mkdir -p "$DEST"
cp -R "$SRC/CSXS" "$SRC/client" "$SRC/jsx" "$SRC/server" "$DEST/"
if command -v python3 >/dev/null; then
  echo "Instalando dependências Python (pode demorar)..."
  python3 -m pip install --user -r "$DEST/server/requirements.txt" || echo "Falhou — instale manualmente."
else
  echo "Python 3 não encontrado — instale para usar as funções de IA."
fi
echo "Pronto! After Effects > Window > Extensions > MotionFrame"
