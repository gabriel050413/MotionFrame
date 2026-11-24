# Instalação do MagicTouch — do GitHub até rodar no After Effects

Tempo estimado: 10 minutos (sem IA) · 20–30 minutos (com IA).

---

## 1. Baixar do GitHub

**Opção A — sem programar (recomendada)**

1. Abra o repositório no GitHub.
2. Enquanto o Pull Request não for aceito (merge), o código está na branch `claude/laughing-tesla-f4z28j`:
   - clique no seletor de branch (botão que mostra `main`) e escolha **claude/laughing-tesla-f4z28j**;
   - depois do merge, basta ficar na `main`.
3. Clique no botão verde **Code › Download ZIP**.
4. Extraia o ZIP numa pasta fácil, por exemplo `Documentos\MagicTouch`.

**Opção B — com Git**

```bash
git clone https://github.com/gabriel050413/MotionFrame.git
cd MotionFrame
git checkout claude/laughing-tesla-f4z28j   # só enquanto o PR não foi aceito
```

A pasta precisa ter dentro: `CSXS`, `client`, `jsx`, `server`, `tools`.

---

## 2. Instalar a extensão

### Windows

1. Feche o After Effects.
2. Abra a pasta extraída › `tools` › dê **duplo clique em `install_windows.bat`**.
   - Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações › Executar assim mesmo**.
3. O instalador:
   - libera extensões não assinadas (`PlayerDebugMode` no registro, CSXS 9 a 13);
   - copia a extensão para `%APPDATA%\Adobe\CEP\extensions\MagicTouch`;
   - instala as dependências de IA, se o Python já estiver instalado.

### macOS

1. Feche o After Effects.
2. Abra o **Terminal**, arraste o arquivo `tools/install_mac.sh` para dentro dele e aperte Enter
   (ou rode `bash caminho/para/tools/install_mac.sh`).
3. A extensão vai para `~/Library/Application Support/Adobe/CEP/extensions/MagicTouch`.

### Manual (se preferir)

1. Copie as pastas `CSXS`, `client`, `jsx` e `server` para uma pasta `MagicTouch` dentro de:
   - Windows: `C:\Users\<você>\AppData\Roaming\Adobe\CEP\extensions\`
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/`
2. Libere extensões não assinadas:
   - Windows (Prompt de Comando): `reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f`
     (repita trocando `12` por `9`, `10`, `11` e `13`)
   - macOS (Terminal): `defaults write com.adobe.CSXS.12 PlayerDebugMode 1` (idem para 9–13)

---

## 3. Abrir no After Effects

1. Abra o After Effects (2020 ou mais novo).
2. **Importante:** vá em **Edit › Preferences › Scripting & Expressions** (no Mac: **After Effects › Settings › Scripting & Expressions**) e marque
   **"Allow Scripts to Write Files and Access Network"**. Sem isso, exportar frame, salvar .ffx e baixar mídias não funcionam.
3. Menu **Window › Extensions › MagicTouch**.
4. Encaixe o painel onde quiser (arraste pela aba). Escolha o idioma no globo do topo.

Pronto: as ferramentas que não usam IA já funcionam (keyframes, Flow, Motion, expressões, align, efeitos, organizador, mídias ausentes, projeto de presets a partir de .ffx/pasta, render).

---

## 4. Ativar as funções de IA, links e pacotes (opcional)

Necessário para: legendas automáticas, face tracking, remover fundo/pessoas, baixar mídia, leitor de links e .zip/.rar.

1. Instale o **Python** (3.11, 3.12, 3.13 ou 3.14) em <https://www.python.org/downloads/>.
   - **Windows:** na primeira tela do instalador marque **"Add python.exe to PATH"**.
2. Abra o Terminal/Prompt na pasta da extensão instalada e rode:
   ```bash
   # Windows
   cd %APPDATA%\Adobe\CEP\extensions\MagicTouch
   python -m pip install --upgrade pip
   python -m pip install --prefer-binary -r server\requirements.txt

   # macOS
   cd ~/Library/Application\ Support/Adobe/CEP/extensions/MagicTouch
   python3 -m pip install --prefer-binary -r server/requirements.txt
   ```
   Opcional (face tracking mais preciso / .7z sem 7-Zip): `pip install --prefer-binary -r server/requirements-extra.txt`
   Isso baixa ~2–3 GB (PyTorch e modelos). Se só quiser legendas, links e downloads, instale só:
   `pip install --prefer-binary yt-dlp opencv-python faster-whisper imageio-ffmpeg gdown rarfile Pillow numpy`
3. Para **.rar**: instale o **7-Zip** (Windows, <https://www.7-zip.org>) ou `brew install sevenzip` (macOS).
4. No painel, abra a aba **Render** (▶) › **Iniciar servidor**. O ponto no topo fica verde: **IA online**.
   - Se não ficar verde, preencha o campo **Python** com o caminho completo (ex.: `C:\Users\<você>\AppData\Local\Programs\Python\Python311\python.exe`) e clique de novo.
   - A lista mostra em verde cada recurso instalado e em vermelho o que falta.
5. Na primeira vez que usar cada recurso, os modelos são baixados automaticamente (pode demorar alguns minutos).

---

## 5. Atualizar

Baixe o ZIP novo (ou `git pull`) e rode o instalador de novo. Suas expressões, curvas e efeitos salvos ficam guardados à parte e não se perdem.

---

## Problemas comuns

| Problema | Solução |
|---|---|
| **MagicTouch não aparece em Window › Extensions** | Rode o instalador de novo e **reinicie o AE**. Confira se a pasta `MagicTouch` está em `CEP/extensions` com `CSXS/manifest.xml` dentro (e não uma pasta a mais no meio). |
| **Painel abre em branco / cinza** | `PlayerDebugMode` não foi aplicado para a sua versão. Rode os comandos do item 2 (Manual) para CSXS 9–13 e reinicie o AE. |
| **"No response from After Effects" / "Sem resposta do After Effects" em todo botão** | Era um bug da versão anterior (o script do AE não carregava). Baixe a versão nova e rode o instalador de novo. Se ainda acontecer, a mensagem agora mostra a linha do erro — mande um print. |
| **`metadata-generation-failed` … `numpy`** no pip | Versão anterior pedia um pacote que exigia numpy antigo. Baixe a versão nova e rode `python -m pip install --prefer-binary -r server\requirements.txt` de novo. Se persistir, rode `python --version` e mande o resultado. |
| **"Abra/selecione uma composição"** | Clique na timeline da comp antes de usar a ferramenta. |
| **Exportar frame / salvar .ffx falha** | Marque "Allow Scripts to Write Files and Access Network" (item 3). |
| **IA offline** | O painel agora inicia o servidor sozinho. Abra a aba **Render › Log do servidor**: ele mostra cada Python tentado e o erro. Se aparecer "comando não encontrado", instale o Python marcando "Add python.exe to PATH" ou cole o caminho completo do `python.exe` no campo **Python** (ex.: `C:\Users\VOCÊ\AppData\Local\Programs\Python\Python312\python.exe`) e clique **Iniciar servidor**. Também dá para rodar `tools\start_server.bat` (da pasta baixada) e ver o erro na janela. |
| **IA fica offline sozinha** | Corrigido na v2.1 (a verificação de status demorava ~20 s e o painel desistia). Agora o painel tolera processamentos pesados ("IA ocupada", ponto amarelo) e religa o servidor se ele cair. O motivo de qualquer queda fica em `C:\Users\VOCÊ\MagicTouch\server.log` (Mac: `~/MagicTouch/server.log`) e no **Log do servidor** (modo Avançado). |
| **"Dependência ausente: …"** | Rode `pip install -r server/requirements.txt` de novo. |
| **Erro ao extrair .rar** | Instale o 7-Zip (item 4.3). |
| **Link do Google Drive não baixa** | O arquivo/pasta precisa estar como "Qualquer pessoa com o link". Pastas muito grandes (+50 arquivos) podem precisar ser baixadas em partes. |
| **Porta ocupada** | Outro servidor usa a 5717: feche-o ou defina a variável `MF_PORT`. |
| **Mac bloqueou o script** | Rode no Terminal: `chmod +x tools/*.sh` e tente de novo. |

Para ver o console do painel (desenvolvedores): crie um arquivo `.debug` na pasta da extensão com a porta 8088 e abra `http://localhost:8088` no Chrome.
