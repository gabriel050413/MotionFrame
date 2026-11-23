# Análise das 3 edits → presets de After Effects

Como os dados foram tirados:
- **Movimento:** em cada par de frames rastreei features ORB e estimei uma transformação de similaridade (posição, rotação e escala) com RANSAC. Os valores foram convertidos para px de uma comp com 1080 de largura.
- **Cortes:** distância entre histogramas HSV de frames seguidos.
- **Batidas:** spectral flux do áudio.
- **Cor:** médias das sombras e das altas luzes, pretos e brancos nos percentis 2 e 98, e saturação.

Todos os frames abaixo estão a **30 fps**. Os scripts estão em `tools/` e os números brutos em `ae/data/`.

| | E1 (`c949…`) | E2 (`56df…`) | E3 (`15ae…`) |
|---|---|---|---|
| Duração útil | 0–573 (19,1 s) | 0–459 (15,3 s) | 0–418 (13,9 s) |
| Formato | 1080×1440, 30 fps | 1080×1440, 30 fps | 1080×1440, 30 fps |
| Tempo da música | variável (impactos a cada ~13 f) | ~150 BPM (batida a cada 12 f) | ~190 BPM (batida a cada 9–10 f) |
| Estilo | "THE REACTION": frio, agressivo, glitch/inversão | Noturno magenta, blocos de glitch, light leaks | Cinemático suave, parallax, flashes e brilho |

---

## 1. Shakes (a parte mais precisa)

### O padrão que se repete nas 3 edits
Em quase todo corte rápido o movimento tem a mesma forma:

1. **Frames 0–3 do corte:** borrão de transição (zoom blur ou smear). O tracking não acha features aqui.
2. **Kick:** um deslocamento de **15–50 px** (em 1080) que chega ao pico em **2–3 frames**.
3. **Assentamento** em **8–12 frames**, sem oscilação longa. É um kick amortecido, não um tremor senoidal.
4. Junto com o kick:
   - **rotação de 1–3°** (até 11° nos kicks da E3);
   - **zoom de 9–21%** com ease (entra ou sai).
5. No fim do plano vem um **snap de saída**: o zoom e a posição voltam bruscamente para o próximo corte.

### Curvas medidas (viram keyframes no script)
| Preset | Origem | Frames | Posição máx. | Rotação máx. | Escala |
|---|---|---|---|---|---|
| Slam Bounce (E1) | e1 f324–341 | 12 | 38 / 33 px | 1,9° | 119 → 100% |
| Push Kick (E1) | e1 f341–358 | 14 | 53 / 30 px | 4,9° | até 118% |
| Whip Out (E1) | e1 f359–375 | 15 | 61 / 25 px | 2,6° | até 123% |
| Recoil (E1) | e1 f291–307 | 15 | 32 / 20 px | 0,8° | até 112% |
| Punch In/Out (E2) | e2 f303–327 | 19 | 48 / 47 px | 2,0° | até 117% |
| Drop Zoom (E2) | e2 f351–374 | 18 | 18 / 67 px | 1,3° | até 121% |
| Whip Snap (E2) | e2 f279–303 | 17 | 30 / 8 px | 2,9° | até 135%* |
| Spin Zoom Intro (E2) | e2 f0–39 | 39 | 118 / 108 px* | 9,8° | 135 → 100%* |
| Handheld Swing (E2) | e2 f209–240 | 27 | 318 / 90 px | 14° | até 121% |
| Rotate Kick (E3) | e3 f282–300 | 15 | 47 / 48 px | 11° | até 132% |
| Soft Drop (E3) | e3 f225–243 | 14 | 33 / 52 px | 2,5° | até 109% |
| Tilt Drift (E3) | e3 f319–339 | 14 | 29 / 24 px | 4,8° | até 118% |
| Smooth Push (E3) | e3 f63–100 | 37 | 324 / 208 px* | 9,6° | até 135%* |

\* Limitado: escala em no máximo 135% e posição em no máximo 120 px (ou 324 px nos pans longos). Nesses planos o movimento da própria filmagem somava ao shake.

Todos os presets de curva têm o slider **"MF Intensidade %"**, que aumenta ou reduz o shake inteiro. Também usam:
- **Motion Tile** com bordas espelhadas, para não aparecer borda preta;
- **Transform** com shutter angle 270°, que dá um motion blur parecido com o RSMB.

### Shakes paramétricos (disparam em cada marcador do layer)
O botão **"Marcadores de batida"** converte o áudio selecionado em keyframes (Convert Audio to Keyframes). Depois detecta os picos e cria um marcador em cada batida.

| Preset | Amp | Pico | Oscilação | Decay | Rot | Zoom | Jitter |
|---|---|---|---|---|---|---|---|
| Impact Kick (padrão medido) | 45 px | 3 f | 3,5 Hz | 9 | 2° | +12% | 4 px |
| Hard Rattle | 28 px | 1 f | 12 Hz | 7 | 3° | +8% | 10 px |
| Soft Bounce (E3) | 25 px | 4 f | 2,2 Hz | 6 | 1,2° | +6% | 0 |
| Zoom Punch | 8 px | 2 f | 3 Hz | 8 | 1,5° | +18% | 2 px |
| Twitch Jitter | 22 px a 15 fps por 6 f, ±2°, com RGB split | | | | | | |
| Handheld Wiggle | wiggle 1,6 Hz, 14 px, 0,8° | | | | | | |

A direção do kick muda a cada batida. Ela é aleatória, mas fixa por marcador (`seedRandom(n)`), então o resultado se repete igual a cada render. O **Directional Blur** acompanha a velocidade do Transform, o que dá o "smear" das edits.

### Equivalentes em plugin (para ajustar manualmente)
Os valores de partida vêm da documentação e dos tutoriais (fontes no fim).
- **Sapphire S_Shake:** Frequency 5–8 e Amplitude ~40 para o kick. Ligue **Motion Blur** com Mo Blur Length 1 em footage progressivo. Anime a Amplitude de 0 até o valor e de volta a 0 em ~10 frames por batida.
- **BCC (Wiggle / Camera Shake):** mesma lógica. Ligue o motion blur interno.
- **Twitch (Video Copilot):** ative Blur, Slide, Scale e RGB Split. Use Amount ~30–50 e Speed alto, por 4–6 frames por marcador. O preset "Twitch Jitter" faz o mesmo com efeitos nativos.
- **RSMB:** sobre o shake, Motion Blur Amount 0,5–1,0.

---

## 2. Linha do tempo por edit

### E1: "THE REACTION" (@zazgoat)
| Frames | Efeito | Preset |
|---|---|---|
| 0–70 | Abertura com o texto "THE REACTION" (fade + leve tremida) | Text Shake + Glow |
| 63–69 | **Glitch em faixas** + contorno amarelo/neon e corte para preto | Slice Glitch |
| 69–90 | **Halo radial branco** atrás do sujeito (fundo preto) e cortes com blur | Spotlight Halo, Blur In |
| 207–280 | Halo + **zoom blur** entre cortes | Zoom Blur Punch |
| 285 | **Shatter / polígonos** (transição de estilhaço) | Shatter nativo, manual |
| 296–306 | **Zoom blur radial** (Fading Zoom, 4 f) | Zoom Blur Punch |
| 311–338 | **Pisca P&B/cor** (4-3-4-2 f) + **directional smear** | BW Strobe, Whip |
| 327–338 | **Glow verde no sujeito** + **light rays** saindo dele, fundo P&B esverdeado | Subject Glow Verde, Light Rays BG |
| 339–345 | Smear vertical + blur-in | Whip Up, Blur In |
| 354–356 | **Glitch em fatias verticais** | Slice Glitch |
| 393–406 | **Frames invertidos** (branco/ciano) intercalados | Invert Flash |
| 409–510 | O mesmo bloco de 274–375 repetido (loop da edit) | os mesmos |
| 546–573 | **Estoura para branco → preto** | Outro White→Black |

**CC (E1):**
- sombras frias (B > R por ~8 níveis);
- altas levemente verdes;
- brancos comprimidos (p98 = 186);
- preto em 11;
- contraste alto, vinheta e sharpen.

### E2: FTB aep (Kings League / Santos)
| Frames | Efeito | Preset |
|---|---|---|
| 0–39 | **Spin zoom de abertura** (−9,7°, 134→100%) | Spin Zoom Intro |
| 42–49 | **Flash multicolor** (light leak rosa/laranja) | Light Leak |
| 69–90 | P&B dessaturado com texto vermelho "on cooked" | Text Shake, BW Strobe |
| 126–135 | **Light leak laranja/roxo com riscos** (lens flare) | Light Leak, Light Streak |
| 206–212 | **Whip com smear** horizontal | Whip Left |
| 225–262 | **Blocos de glitch** (tiles deslocados, estilo Twitch/Glitchify) | Block Glitch |
| 279–420 | Cortes no beat com **Punch In/Out** e **Drop Zoom** | presets medidos |
| 387–396 | **Olho vermelho brilhando** + RGB split | Eye Glow Vermelho, RGB Split hit |
| 399–459 | End card: texto manuscrito com glow + poeira | End Card Glow |

**CC (E2):**
- sombras **magenta/roxas** (G baixo, B alto);
- contraste alto e bloom nas luzes;
- brancos em p98 = 215.

### E3: "Best Brazilian footballer?" (FTB aep)
| Frames | Efeito | Preset |
|---|---|---|
| 0–54 | Rostos em crossfade com haze, texto com shake e **riscos de luz horizontais** | Light Streak |
| 45–60 | **Flash branco** (5 f subindo, 3 f segurando, 6 f descendo) | Flash White |
| 63–206 | **Parallax 3D:** jogadores em camadas deslizando, fundo com **bokeh** (Camera Lens Blur) e **glow amarelo** no sujeito | Smooth Push, Subject Glow Amarelo |
| 195–207 | Riscos de luz + glitch | Light Streak, Slice Glitch |
| 206–360 | Cortes no beat com **blur-in** (blur grande → nítido em 5 f) + Rotate Kick / Soft Drop / Tilt Drift | Blur In + presets medidos |
| 345–357 | P&B + **RGB split** no rosto | BW Strobe, RGB Split hit |
| 360–418 | End card com glow + partículas | End Card Glow |

**CC (E3):**
- **preto levantado** (p2 = 19, look matte);
- altas **quentes** (R > B por 18);
- sombras magenta;
- dessaturado (−15) e bloom suave.

---

## 3. Sobre o arquivo .ffx

O `.ffx` é um formato binário fechado da Adobe. Para efeitos de terceiros ele guarda blocos de dados opacos que só o After Effects gera, então não dá para escrever `.ffx` válidos de forma confiável sem o AE aberto. Por isso a entrega é um **script (.jsx)** que:

1. **Recria cada preset** dentro do AE com keyframes, expressões e controles.
2. **Gera os .ffx:**
   - **"Salvar efeitos do layer como .FFX":** seleciona todos os efeitos do layer e abre *Animation › Save Animation Preset*.
   - **"Construir biblioteca" + "Exportar TODOS como .FFX":** cria a comp `MF_PRESET_LIBRARY` com uma adjustment layer por preset e abre o diálogo de salvar para cada um.

   Salve em `Documents/Adobe/After Effects <versão>/User Presets/MotionFrame/`. Os .ffx aparecem no painel Effects & Presets.

Os keyframes do .ffx começam no playhead, então aplique com o playhead no corte ou na batida.

Os presets "Spotlight Halo", "Light Streak" e "Light Leak" **criam layers**, porque são geradores, não efeitos. Por isso não viram .ffx.

### Plugins
Com "Usar plugins se instalados" marcado, o script tenta adicionar o plugin pelo nome e, se não encontrar, usa o efeito nativo equivalente:

| Uso | Plugins tentados | Nativo usado se faltar |
|---|---|---|
| Glow | Deep Glow, S_Glow, BCC Glow | Glow nativo em 2 passes |
| Zoom blur | S_BlurMoCurves, S_ZoomBlur, BCC Radial Blur | CC Radial Blur |
| Glitch | Glitchify, Twitch, S_DigitalDamage, BCC Video/Data Glitch | Wave Warp quadrado + VR Chromatic Aberrations |
| Light rays | S_Rays, BCC Rays | CC Light Rays |
| Motion blur | RSMB | Pixel Motion Blur / shutter do Transform |
| Slow-mo | Twixtor | Timewarp (Pixel Motion) |

Os nomes internos (matchNames) de plugins variam de versão para versão. Se um plugin não for encontrado, aplique-o num layer e use **"Listar matchNames do layer"**: o nome sai num .txt na Área de Trabalho e pode ser colocado nas listas de `addFxPlugin` em `ae/scripts/MotionFrame_FX.src.jsx`.

O que precisa ser feito à mão:
- **Roto Brush:** recorte do sujeito para o glow verde/amarelo e o halo.
- **Shatter** (E1 f285).
- **Camera 3D / parallax** da E3. O preset Smooth Push só reproduz o movimento.
- **Textos** e o **CC Particle World** do end card.

## Fontes (tutoriais e documentação de shake)
- [Boris FX: Sapphire S_Shake (documentação AE)](https://borisfx.com/documentation/sapphire/ae/shake/)
- [Boris FX: Sapphire S_Shake (OFX, padrões de Amplitude/Frequency)](https://borisfx.com/documentation/sapphire/ofx/shake/)
- [Boris FX: Shake effect in After Effects (tutorial)](https://borisfx.com/blog/shake-effect-after-effects-tutorial/)
- [LinkedIn Learning: Simulating camera shake](https://www.lynda.com/After-Effects-tutorials/Simulating-camera-shake/129027/2218657-4.html)
- [School of Motion: How to simulate camera shake](https://www.schoolofmotion.com/blog/how-to-simulate-camera-shake-adobe-after-effects)
- [AEJuice: How to master shakes in After Effects](https://aejuice.com/blog/how-to-do-shakes-in-after-effects/)
- [Adobe Community: recriar o shake do Twitch](https://community.adobe.com/t5/after-effects-discussions/twitch-shake-effect-how-to-re-create/td-p/14565107)
- [ProVideo Coalition: lista de matchNames de plugins](https://www.provideocoalition.com/effects-match-names/)
