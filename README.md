<p align="center"><img src="docs/logo.png" width="120" alt="MagicTouch"></p>

# MagicTouch Extension — After Effects

Painel CEP (After Effects 2020+) com visual "aurora glass" que junta ferramentas de mobilidade, animação, organização e IA.

![preview](docs/preview.png)

## Novidades da v2

| Aba | O que faz |
|---|---|
| **Leitor de links** | Cole um ou vários links de projeto (**Google Drive** arquivo ou pasta, **Dropbox**, **OneDrive**, link direto, YouTube/TikTok…) ou escolha um **.zip / .rar / .7z** ou uma pasta. Baixa, extrai (inclusive pacotes dentro de pacotes) e importa no projeto, organizado em `MagicTouch Import/<pacote>/`: **vídeos, áudios, imagens, .ai/.eps/.pdf, .psd, .aep** (projetos importados inteiros). Os **.ffx** viram automaticamente um projeto de presets e as **fontes** abrem para instalar. |
| **Projeto de presets (.ffx)** | Selecione .ffx soltos, um .zip/.rar com presets, uma pasta ou um link do Drive. Cria **uma comp por preset com o nome do preset no centro** e o preset aplicado (no texto ou em adjustment layer, detectado automaticamente), com fundo degradê, nas mesmas subpastas do pacote (`MagicTouch Presets/<pacote>/…`). |
| **Salvar .ffx do projeto** | Salva de uma vez todos os .ffx das comps criadas automaticamente numa pasta, com o nome atual de cada comp e mantendo as subpastas. Para um preset que você modificou, o botão "Salvar preset modificado" abre o "Save Animation Preset" do AE para a layer selecionada. |
| **Mídias não encontradas** | Lista todas as mídias offline do projeto (com contador na barra lateral). Substitua **uma por uma** (escolhendo o arquivo) ou **todas de uma vez** escolhendo uma pasta: procura pelo nome em subpastas, opcionalmente aceita outra extensão, e reconecta sequências de imagens. Também pode trocar por placeholder. |
| **Projeto** | Salvar nova versão (`_v02`, `_v03`…), reduzir projeto, remover não usados, consolidar, limpar cache e Collect Files. |

## Todas as funções (da v1)

| Aba | O que faz |
|---|---|
| **Layer** | Null, adjustment, solid, câmera, texto, pre-compor, cortar no CTI, trim, reverter, freeze, sequenciar, motion blur, texto → palavras, comp do footage, **speed ramp** (com Timewarp opcional), presets de comp. |
| **Keyframes proporcionais** | Encaixa keyframes no tamanho do clip (esticar / intro+outro / % do clip). Presets .ffx de uma pasta aplicados proporcionalmente. |
| **Flow** | Editor de curva bezier com presets, salvar, espelhar e ler dos keyframes. |
| **Motion Library** | Entradas, saídas, shake, bounce, glitch, flash, deep glow e transições (zoom, slide, whip, spin, flash, blur). |
| **Legendas + Face Track** | Whisper com timestamps por palavra; Arial Bold + deep glow + sombra seguindo a cabeça (null `MT Face Track` com Offset/Smooth). |
| **Expressões** | ~30 expressões prontas + copiar automaticamente as expressões da seleção. |
| **IA** | Remover fundo (objeto, corpo, cabeça, braço, perna… ou texto livre) e remover pessoas/objetos com inpainting. |
| **Mídia** | Download de YouTube, TikTok, Instagram, X, Vimeo… + pesquisa por nome. |
| **Align** | Grade 3×3 de anchor point, alinhar, fit/fill. |
| **Efeitos** | Favoritos, efeito próprio (salva e reaplica pilhas de efeitos), presets de cor. |
| **Organizar** | Identifica, renomeia, colore, pré-compõe e cria pastas. |
| **Render / Sessão** | Fila de render, tempo de uso, status do servidor de IA. |

## Instalação

1. **Windows:** `tools/install_windows.bat` · **macOS:** `bash tools/install_mac.sh`
2. Reabra o After Effects → **Window › Extensions › MagicTouch**.
3. Para IA, links e pacotes instale **Python 3.10–3.12** e `pip install -r server/requirements.txt` (o instalador já tenta). O painel inicia o servidor sozinho.
   - `.zip` funciona sem nada extra; `.rar` usa `rarfile` + **7-Zip/unrar** instalado; `.7z` usa `py7zr` ou 7-Zip.
   - Google Drive usa `gdown` (links públicos / "qualquer pessoa com o link").

Sem Python: keyframes, flow, motion, expressões, align, efeitos, organizador, mídias ausentes, render e projeto de presets a partir de **.ffx soltos ou pasta** continuam funcionando.

## Estrutura

```
CSXS/manifest.xml        manifesto CEP (AEFT 17+)
client/                  painel
  img/logo.svg           logo (varinha + cartola)
  js/cep.js              ponte com o ExtendScript
  js/icons.js            ícones + barra lateral
  js/data.js             expressões, presets, curvas, efeitos
  js/main.js             abas da v1
  js/magic.js            leitor de links, presets .ffx, mídias ausentes
jsx/hostscript.jsx       ações no After Effects (funções mf_*)
server/mt_server.py      servidor local (127.0.0.1:5717): IA, downloads, links, extração
tools/                   instaladores
```

## Observações

- Um .ffx não pode ser gerado por script no AE; "Salvar todos os .ffx" copia o arquivo original de cada preset com o nome atual da comp. Alterações feitas dentro da comp precisam do "Save Animation Preset" (botão na aba).
- Parâmetros de alguns efeitos são definidos pelo nome em inglês; em AE de outro idioma podem ficar no padrão.
- Baixe apenas conteúdo que você tem direito de usar.
- Interface, presets e código são originais (inspirados nos fluxos dos vídeos de referência, sem copiar extensões comerciais).
