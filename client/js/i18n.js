/* MagicTouch — tradutor da interface (Português BR → English / Español / Français)
 * A interface é escrita em PT-BR; este módulo troca textos, placeholders e dicas
 * de toda a página (inclusive o que é criado depois, como listas e avisos).
 * Formato: "texto em PT": ["English", "Español", "Français"]  */
(function () {
  "use strict";
  var LANGS = ["pt", "en", "es", "fr"];
  var LABEL = { pt: "PT-BR", en: "EN", es: "ES", fr: "FR" };

  var D = {
    /* ---------- geral / topo ---------- */
    "Extension · v2.0": ["Extension · v2.0", "Extensión · v2.0", "Extension · v2.0"],
    "IA offline": ["AI offline", "IA offline", "IA hors ligne"],
    "IA online": ["AI online", "IA en línea", "IA en ligne"],
    "Tempo de sessão": ["Session time", "Tiempo de sesión", "Temps de session"],
    "Buscar ferramenta…  (anchor, legenda, ffx, link)": ["Search tool…  (anchor, caption, ffx, link)", "Buscar herramienta…  (anchor, subtítulo, ffx, link)", "Chercher un outil…  (anchor, sous-titre, ffx, lien)"],
    "Todas as mágicas do After Effects em um painel.": ["All the After Effects magic in one panel.", "Toda la magia de After Effects en un panel.", "Toute la magie d'After Effects dans un seul panneau."],
    "Modo preview (fora do After Effects)": ["Preview mode (outside After Effects)", "Modo vista previa (fuera de After Effects)", "Mode aperçu (hors After Effects)"],
    "Idioma da interface": ["Interface language", "Idioma de la interfaz", "Langue de l'interface"],

    /* ---------- nomes enviados ao projeto ---------- */
    "MT IA": ["MT AI", "MT IA", "MT IA"], "MT Downloads": ["MT Downloads", "MT Descargas", "MT Téléchargements"],

    /* ---------- erros do After Effects (ExtendScript) ---------- */
    "Abra/selecione uma composição.": ["Open/select a composition.", "Abre/selecciona una composición.", "Ouvrez/sélectionnez une composition."],
    "Selecione pelo menos uma layer.": ["Select at least one layer.", "Selecciona al menos una capa.", "Sélectionnez au moins un calque."],
    "Nenhum par de keyframes encontrado (selecione 2+ keyframes).": ["No keyframe pair found (select 2+ keyframes).", "No se encontró ningún par de keyframes (selecciona 2+ keyframes).", "Aucune paire de keyframes trouvée (sélectionnez 2+ keyframes)."],
    "Sem keyframes.": ["No keyframes.", "Sin keyframes.", "Aucune keyframe."],
    "Selecione 2 keyframes.": ["Select 2 keyframes.", "Selecciona 2 keyframes.", "Sélectionnez 2 keyframes."],
    "Selecione uma propriedade (ou layer com a propriedade alvo).": ["Select a property (or a layer with the target property).", "Selecciona una propiedad (o una capa con la propiedad destino).", "Sélectionnez une propriété (ou un calque avec la propriété cible)."],
    "A layer selecionada não tem efeitos.": ["The selected layer has no effects.", "La capa seleccionada no tiene efectos.", "Le calque sélectionné n'a aucun effet."],
    "Nenhuma layer de vídeo/áudio com arquivo encontrada.": ["No video/audio layer with a file was found.", "No se encontró ninguna capa de video/audio con archivo.", "Aucun calque vidéo/audio avec fichier trouvé."],
    "Falha ao exportar o frame.": ["Failed to export the frame.", "Error al exportar el frame.", "Échec de l'export de l'image."],
    "Salve o projeto uma vez primeiro.": ["Save the project once first.", "Guarda el proyecto una vez primero.", "Enregistrez d'abord le projet une fois."],
    "Selecione footage no painel Project.": ["Select footage in the Project panel.", "Selecciona footage en el panel Project.", "Sélectionnez un métrage dans le panneau Projet."],
    "Sem resposta do After Effects": ["No response from After Effects", "Sin respuesta de After Effects", "Pas de réponse d'After Effects"],
    "Erro": ["Error", "Error", "Erreur"],
    "Iniciando IA...": ["Starting AI...", "Iniciando IA...", "Démarrage de l'IA..."],
    "Log do servidor": ["Server log", "Registro del servidor", "Journal du serveur"],
    "Python não encontrado": ["Python not found", "Python no encontrado", "Python introuvable"],

    /* ---------- servidor de IA / links ---------- */
    "Iniciando...": ["Starting...", "Iniciando...", "Démarrage..."], "Concluído": ["Done", "Completado", "Terminé"],
    "Transcrevendo áudio...": ["Transcribing audio...", "Transcribiendo audio...", "Transcription de l'audio..."],
    "Não foi possível abrir o vídeo.": ["Could not open the video.", "No se pudo abrir el video.", "Impossible d'ouvrir la vidéo."],
    "Nenhum rosto encontrado no trecho.": ["No face found in this range.", "No se encontró ningún rostro en el tramo.", "Aucun visage trouvé dans cet extrait."],
    "Segmentando...": ["Segmenting...", "Segmentando...", "Segmentation..."], "Gerando PNG...": ["Generating PNG...", "Generando PNG...", "Génération du PNG..."],
    "Detectando o que remover...": ["Detecting what to remove...", "Detectando qué quitar...", "Détection de ce qu'il faut supprimer..."],
    "Preenchendo com IA...": ["Filling with AI...", "Rellenando con IA...", "Remplissage par IA..."],
    "Baixando pasta do Google Drive...": ["Downloading Google Drive folder...", "Descargando carpeta de Google Drive...", "Téléchargement du dossier Google Drive..."],
    "Baixando do Google Drive...": ["Downloading from Google Drive...", "Descargando de Google Drive...", "Téléchargement depuis Google Drive..."],
    "Nenhum link.": ["No links.", "Ningún enlace.", "Aucun lien."], "Lendo arquivos...": ["Reading files...", "Leyendo archivos...", "Lecture des fichiers..."],
    "job não encontrado": ["job not found", "tarea no encontrada", "tâche introuvable"], "rota desconhecida": ["unknown route", "ruta desconocida", "route inconnue"],

    /* ---------- barra lateral / blocos ---------- */
    "Início": ["Home", "Inicio", "Accueil"],
    "Leitor de links": ["Link reader", "Lector de enlaces", "Lecteur de liens"],
    "Projeto de presets .ffx": [".ffx preset project", "Proyecto de presets .ffx", "Projet de presets .ffx"],
    "Mídias não encontradas": ["Missing media", "Medios no encontrados", "Médias introuvables"],
    "Keyframes proporcionais": ["Proportional keyframes", "Keyframes proporcionales", "Keyframes proportionnelles"],
    "Legendas + Face Track": ["Captions + Face Track", "Subtítulos + Face Track", "Sous-titres + Face Track"],
    "Expressões": ["Expressions", "Expresiones", "Expressions"],
    "IA: fundo / pessoas": ["AI: background / people", "IA: fondo / personas", "IA : fond / personnes"],
    "Baixar mídia": ["Download media", "Descargar medios", "Télécharger des médias"],
    "Anchor / Align": ["Anchor / Align", "Anchor / Alinear", "Ancrage / Aligner"],
    "Efeitos / Cor": ["Effects / Color", "Efectos / Color", "Effets / Couleur"],
    "Organizador": ["Organizer", "Organizador", "Organisateur"],
    "Render / Projeto": ["Render / Project", "Render / Proyecto", "Rendu / Projet"],
    "Drive, Dropbox, .zip/.rar → importa tudo": ["Drive, Dropbox, .zip/.rar → imports everything", "Drive, Dropbox, .zip/.rar → importa todo", "Drive, Dropbox, .zip/.rar → importe tout"],
    "Presets .ffx": [".ffx presets", "Presets .ffx", "Presets .ffx"],
    "Cria projeto com todos os presets": ["Builds a project with every preset", "Crea un proyecto con todos los presets", "Crée un projet avec tous les presets"],
    "Mídias ausentes": ["Missing media", "Medios ausentes", "Médias manquants"],
    "Encontre e substitua offline": ["Find and replace offline files", "Encuentra y reemplaza offline", "Trouver et remplacer les fichiers hors ligne"],
    "Criar, cortar, freeze, speed ramp": ["Create, cut, freeze, speed ramp", "Crear, cortar, freeze, speed ramp", "Créer, couper, figer, speed ramp"],
    "Proporcionais ao clip": ["Proportional to the clip", "Proporcionales al clip", "Proportionnelles au clip"],
    "Editor de curvas": ["Curve editor", "Editor de curvas", "Éditeur de courbes"],
    "Animações e transições": ["Animations and transitions", "Animaciones y transiciones", "Animations et transitions"],
    "Legendas": ["Captions", "Subtítulos", "Sous-titres"],
    "Auto legenda + face track": ["Auto captions + face track", "Subtítulos auto + face track", "Sous-titres auto + face track"],
    "Biblioteca + copiar": ["Library + copy", "Biblioteca + copiar", "Bibliothèque + copier"],
    "IA": ["AI", "IA", "IA"],
    "Fundo, partes, pessoas": ["Background, parts, people", "Fondo, partes, personas", "Fond, parties, personnes"],
    "Mídia": ["Media", "Medios", "Médias"],
    "Align": ["Align", "Alinear", "Aligner"],
    "Anchor e centralizar": ["Anchor and center", "Anchor y centrar", "Ancrage et centrer"],
    "Efeitos": ["Effects", "Efectos", "Effets"],
    "Favoritos, próprio, cor": ["Favorites, custom, color", "Favoritos, propio, color", "Favoris, perso, couleur"],
    "Organizar": ["Organize", "Organizar", "Organiser"],
    "Renomeia, colore, pré-compõe": ["Renames, colors, precomposes", "Renombra, colorea, precompone", "Renomme, colore, précompose"],
    "Fila, projeto, sessão": ["Queue, project, session", "Cola, proyecto, sesión", "File, projet, session"],

    /* ---------- leitor de links ---------- */
    "Cole links de projeto (Google Drive, Dropbox, OneDrive, link direto, YouTube…). Baixa, extrai .zip/.rar/.7z e importa tudo no projeto.": ["Paste project links (Google Drive, Dropbox, OneDrive, direct link, YouTube…). Downloads, extracts .zip/.rar/.7z and imports everything into the project.", "Pega enlaces de proyectos (Google Drive, Dropbox, OneDrive, enlace directo, YouTube…). Descarga, extrae .zip/.rar/.7z e importa todo al proyecto.", "Collez des liens de projet (Google Drive, Dropbox, OneDrive, lien direct, YouTube…). Télécharge, extrait .zip/.rar/.7z et importe tout dans le projet."],
    "(um link por linha)": ["(one link per line)", "(un enlace por línea)", "(un lien par ligne)"],
    "Ler links e importar": ["Read links and import", "Leer enlaces e importar", "Lire les liens et importer"],
    "Pasta": ["Folder", "Carpeta", "Dossier"],
    "Mídias": ["Media", "Medios", "Médias"],
    ".ffx → projeto": [".ffx → project", ".ffx → proyecto", ".ffx → projet"],
    ".ai como comp": [".ai as comp", ".ai como comp", ".ai en comp"],
    "Abrir fontes": ["Open fonts", "Abrir fuentes", "Ouvrir les polices"],
    "Vídeos": ["Videos", "Videos", "Vidéos"], "Áudios": ["Audio", "Audios", "Audios"], "Imagens": ["Images", "Imágenes", "Images"],
    "Projetos AEP": ["AEP projects", "Proyectos AEP", "Projets AEP"], "Fontes": ["Fonts", "Fuentes", "Polices"], "Pacotes": ["Packages", "Paquetes", "Archives"], "Outros": ["Other", "Otros", "Autres"],
    "Pacote importado ✨": ["Package imported ✨", "Paquete importado ✨", "Archive importée ✨"],
    "Cole pelo menos um link.": ["Paste at least one link.", "Pega al menos un enlace.", "Collez au moins un lien."],
    "Cole um link válido.": ["Paste a valid link.", "Pega un enlace válido.", "Collez un lien valide."],

    /* ---------- presets .ffx ---------- */
    "Projeto de presets": ["Preset project", "Proyecto de presets", "Projet de presets"],
    "Selecione .ffx soltos, um .zip/.rar com presets ou um link do Drive. Cria uma comp por preset, com o nome do preset no centro e o preset aplicado.": ["Pick loose .ffx files, a .zip/.rar with presets or a Drive link. Creates one comp per preset, with the preset name in the center and the preset applied.", "Elige .ffx sueltos, un .zip/.rar con presets o un enlace de Drive. Crea una comp por preset, con el nombre del preset en el centro y el preset aplicado.", "Choisissez des .ffx, un .zip/.rar de presets ou un lien Drive. Crée une comp par preset, avec le nom du preset au centre et le preset appliqué."],
    "ou cole um link do Drive/Dropbox com .ffx": ["or paste a Drive/Dropbox link with .ffx files", "o pega un enlace de Drive/Dropbox con .ffx", "ou collez un lien Drive/Dropbox avec des .ffx"],
    "Formato": ["Format", "Formato", "Format"],
    "Duração": ["Duration", "Duración", "Durée"],
    "Aplicar em": ["Apply to", "Aplicar en", "Appliquer sur"],
    "Automático (texto ou adjustment pelo tipo)": ["Automatic (text or adjustment by type)", "Automático (texto o adjustment según el tipo)", "Automatique (texte ou adjustment selon le type)"],
    "Texto com o nome do preset": ["Text with the preset name", "Texto con el nombre del preset", "Texte avec le nom du preset"],
    "Fundo degradê": ["Gradient background", "Fondo degradado", "Fond dégradé"],
    "Nenhum preset carregado.": ["No presets loaded.", "Ningún preset cargado.", "Aucun preset chargé."],
    "Criar projeto automático": ["Build project automatically", "Crear proyecto automático", "Créer le projet automatiquement"],
    "Salvar .ffx do projeto": ["Save project .ffx files", "Guardar .ffx del proyecto", "Enregistrer les .ffx du projet"],
    "Salva todos os presets das comps criadas (com o nome atual de cada comp) numa pasta, mantendo as subpastas.": ["Saves every preset from the created comps (using each comp's current name) to a folder, keeping subfolders.", "Guarda todos los presets de las comps creadas (con el nombre actual de cada comp) en una carpeta, manteniendo las subcarpetas.", "Enregistre tous les presets des comps créées (avec le nom actuel de chaque comp) dans un dossier, en gardant les sous-dossiers."],
    "Atualizar lista": ["Refresh list", "Actualizar lista", "Actualiser la liste"],
    "Salvar todos os .ffx": ["Save all .ffx", "Guardar todos los .ffx", "Enregistrer tous les .ffx"],
    "Salvar preset modificado (layer selecionada)…": ["Save modified preset (selected layer)…", "Guardar preset modificado (capa seleccionada)…", "Enregistrer le preset modifié (calque sélectionné)…"],
    "Nenhuma comp criada pelo MagicTouch neste projeto.": ["No comps created by MagicTouch in this project.", "Ninguna comp creada por MagicTouch en este proyecto.", "Aucune comp créée par MagicTouch dans ce projet."],
    "Carregue presets primeiro.": ["Load presets first.", "Carga presets primero.", "Chargez d'abord des presets."],
    "Nenhum .ffx nessa pasta.": ["No .ffx in this folder.", "No hay .ffx en esta carpeta.", "Aucun .ffx dans ce dossier."],
    "Nenhum .ffx encontrado.": ["No .ffx found.", "No se encontró ningún .ffx.", "Aucun .ffx trouvé."],

    /* ---------- mídias ausentes ---------- */
    "Todas as mídias offline do projeto. Substitua uma por uma ou todas de uma vez procurando numa pasta.": ["Every offline file in the project. Replace them one by one or all at once by searching a folder.", "Todos los medios offline del proyecto. Reemplázalos uno a uno o todos a la vez buscando en una carpeta.", "Tous les médias hors ligne du projet. Remplacez-les un par un ou tous d'un coup en cherchant dans un dossier."],
    "Escanear projeto": ["Scan project", "Escanear proyecto", "Analyser le projet"],
    "Substituir todas (pasta)": ["Replace all (folder)", "Reemplazar todos (carpeta)", "Tout remplacer (dossier)"],
    "Aceitar outra extensão": ["Accept other extension", "Aceptar otra extensión", "Accepter une autre extension"],
    "Subpastas": ["Subfolders", "Subcarpetas", "Sous-dossiers"],
    "Placeholder em todas": ["Placeholder for all", "Placeholder en todos", "Placeholder pour tous"],
    "Selecionar tudo": ["Select all", "Seleccionar todo", "Tout sélectionner"],
    "Nenhuma mídia offline 🎉": ["No offline media 🎉", "Ningún medio offline 🎉", "Aucun média hors ligne 🎉"],
    "Substituir": ["Replace", "Reemplazar", "Remplacer"],
    "(caminho desconhecido)": ["(unknown path)", "(ruta desconocida)", "(chemin inconnu)"],
    "Placeholder aplicado": ["Placeholder applied", "Placeholder aplicado", "Placeholder appliqué"],
    "Placeholders aplicados": ["Placeholders applied", "Placeholders aplicados", "Placeholders appliqués"],
    "Nada para substituir — escaneie primeiro.": ["Nothing to replace — scan first.", "Nada que reemplazar — escanea primero.", "Rien à remplacer — analysez d'abord."],
    "Node indisponível no painel.": ["Node is not available in the panel.", "Node no está disponible en el panel.", "Node n'est pas disponible dans le panneau."],

    /* ---------- layer ---------- */
    "Atalhos de criação, corte e tempo.": ["Shortcuts for creating, cutting and timing.", "Atajos de creación, corte y tiempo.", "Raccourcis de création, découpe et temps."],
    "Câmera": ["Camera", "Cámara", "Caméra"], "Texto": ["Text", "Texto", "Texte"], "Pre-compor": ["Precompose", "Precomponer", "Précomposer"],
    "Cortar no CTI": ["Split at CTI", "Cortar en el CTI", "Couper au CTI"], "Início → CTI": ["In → CTI", "Inicio → CTI", "Début → CTI"], "Fim → CTI": ["Out → CTI", "Fin → CTI", "Fin → CTI"],
    "Reverter": ["Reverse", "Invertir", "Inverser"], "Freeze": ["Freeze", "Congelar", "Figer"], "Sequenciar": ["Sequence", "Secuenciar", "Séquencer"],
    "Texto → palavras": ["Text → words", "Texto → palabras", "Texte → mots"], "Comp do footage": ["Comp from footage", "Comp del footage", "Comp depuis le métrage"],
    "Velocidade": ["Speed", "Velocidad", "Vitesse"], "Duração (s)": ["Duration (s)", "Duración (s)", "Durée (s)"],
    "Aplicar speed ramp no CTI": ["Apply speed ramp at CTI", "Aplicar speed ramp en el CTI", "Appliquer le speed ramp au CTI"],
    "Nova comp": ["New comp", "Nueva comp", "Nouvelle comp"],
    "Comp criada": ["Comp created", "Comp creada", "Comp créée"],
    "Speed ramp aplicado": ["Speed ramp applied", "Speed ramp aplicado", "Speed ramp appliqué"],

    /* ---------- keyframes ---------- */
    "Keyframes de presets, efeitos ou animações se ajustam ao tamanho do clip.": ["Keyframes from presets, effects or animations adapt to the clip length.", "Los keyframes de presets, efectos o animaciones se ajustan a la duración del clip.", "Les keyframes des presets, effets ou animations s'adaptent à la durée du clip."],
    "Modo": ["Mode", "Modo", "Mode"],
    "Esticar tudo (início → fim do clip)": ["Stretch everything (clip in → out)", "Estirar todo (inicio → fin del clip)", "Tout étirer (début → fin du clip)"],
    "Intro no início / outro no fim": ["Intro at start / outro at end", "Intro al inicio / outro al final", "Intro au début / outro à la fin"],
    "Ocupar % do clip": ["Fill % of the clip", "Ocupar % del clip", "Occuper % du clip"],
    "% do clip": ["% of clip", "% del clip", "% du clip"], "Folga início": ["Start padding", "Margen inicio", "Marge début"], "Folga fim": ["End padding", "Margen final", "Marge fin"],
    "Só propriedades selecionadas": ["Selected properties only", "Solo propiedades seleccionadas", "Propriétés sélectionnées uniquement"],
    "Encaixar keyframes no clip": ["Fit keyframes to clip", "Ajustar keyframes al clip", "Ajuster les keyframes au clip"],
    "Presets .ffx proporcionais": ["Proportional .ffx presets", "Presets .ffx proporcionales", "Presets .ffx proportionnels"],
    "Escolher pasta": ["Choose folder", "Elegir carpeta", "Choisir un dossier"], "Proporcional": ["Proportional", "Proporcional", "Proportionnel"],
    "Nenhuma pasta escolhida.": ["No folder chosen.", "Ninguna carpeta elegida.", "Aucun dossier choisi."],

    /* ---------- flow ---------- */
    "Arraste os pontos, aplique nos keyframes selecionados.": ["Drag the handles, apply to the selected keyframes.", "Arrastra los puntos y aplica a los keyframes seleccionados.", "Faites glisser les points, appliquez aux keyframes sélectionnées."],
    "Ler": ["Read", "Leer", "Lire"], "Aplicar": ["Apply", "Aplicar", "Appliquer"], "Salvar": ["Save", "Guardar", "Enregistrer"], "Espelhar": ["Mirror", "Reflejar", "Miroir"],
    "Ler curva dos keyframes selecionados": ["Read curve from selected keyframes", "Leer curva de los keyframes seleccionados", "Lire la courbe des keyframes sélectionnées"],
    "Nome do preset:": ["Preset name:", "Nombre del preset:", "Nom du preset :"], "Minha curva": ["My curve", "Mi curva", "Ma courbe"],
    "Preset removido": ["Preset removed", "Preset eliminado", "Preset supprimé"],

    /* ---------- motion ---------- */
    "Animações e transições com 1 clique.": ["One-click animations and transitions.", "Animaciones y transiciones en 1 clic.", "Animations et transitions en 1 clic."],
    "ou seg": ["or sec", "o seg", "ou s"], "Entrada": ["In", "Entrada", "Entrée"], "Saída": ["Out", "Salida", "Sortie"], "Transições": ["Transitions", "Transiciones", "Transitions"],
    "Slide da direita": ["Slide from right", "Slide desde la derecha", "Glisser depuis la droite"],
    "Transições: selecione 2 clips (aplica no corte) ou nada (aplica no CTI).": ["Transitions: select 2 clips (applied at the cut) or nothing (applied at the CTI).", "Transiciones: selecciona 2 clips (se aplica en el corte) o nada (se aplica en el CTI).", "Transitions : sélectionnez 2 clips (appliqué à la coupe) ou rien (appliqué au CTI)."],
    "Zoom lento (Ken Burns)": ["Slow zoom (Ken Burns)", "Zoom lento (Ken Burns)", "Zoom lent (Ken Burns)"], "Shake rotação": ["Rotation shake", "Shake de rotación", "Shake rotation"],
    "Bounce (inércia)": ["Bounce (inertia)", "Bounce (inercia)", "Bounce (inertie)"], "Flash de exposição": ["Exposure flash", "Flash de exposición", "Flash d'exposition"],

    /* ---------- legendas ---------- */
    "Arial Bold, deep glow e sombra seguindo a cabeça. Selecione a layer do vídeo.": ["Arial Bold, deep glow and shadow following the head. Select the video layer.", "Arial Bold, deep glow y sombra siguiendo la cabeza. Selecciona la capa del video.", "Arial Bold, deep glow et ombre qui suivent la tête. Sélectionnez le calque vidéo."],
    "Idioma": ["Language", "Idioma", "Langue"], "Português": ["Portuguese", "Portugués", "Portugais"], "Inglês": ["English", "Inglés", "Anglais"], "Espanhol": ["Spanish", "Español", "Espagnol"],
    "Francês": ["French", "Francés", "Français"], "Alemão": ["German", "Alemán", "Allemand"], "Japonês": ["Japanese", "Japonés", "Japonais"], "Árabe": ["Arabic", "Árabe", "Arabe"],
    "Modelo": ["Model", "Modelo", "Modèle"], "Palavras": ["Words", "Palabras", "Mots"], "Traduzir para inglês": ["Translate to English", "Traducir al inglés", "Traduire en anglais"],
    "Estilo": ["Style", "Estilo", "Style"], "Fonte": ["Font", "Fuente", "Police"], "Tam.": ["Size", "Tam.", "Taille"], "Cor": ["Color", "Color", "Couleur"],
    "Sombra": ["Shadow", "Sombra", "Ombre"], "MAIÚSCULAS": ["UPPERCASE", "MAYÚSCULAS", "MAJUSCULES"], "Contorno": ["Stroke", "Contorno", "Contour"],
    "Nenhuma": ["None", "Ninguna", "Aucune"], "Seguir a cabeça": ["Follow the head", "Seguir la cabeza", "Suivre la tête"],
    "Face tracking automático": ["Automatic face tracking", "Face tracking automático", "Face tracking automatique"], "Precisão": ["Precision", "Precisión", "Précision"],
    "Todo frame": ["Every frame", "Cada frame", "Chaque image"], "Gerar legendas": ["Generate captions", "Generar subtítulos", "Générer les sous-titres"],
    "Só face track (null \"MT Rastreio Facial\")": ["Face track only (null \"MT Face Track\")", "Solo face track (null \"MT Seguimiento Facial\")", "Face track seul (null « MT Suivi du Visage »)"],
    "Editar texto antes de criar": ["Edit text before creating", "Editar el texto antes de crear", "Modifier le texte avant de créer"],
    "Criar a partir do texto": ["Create from text", "Crear a partir del texto", "Créer à partir du texte"], "inicio|fim|texto": ["start|end|text", "inicio|fin|texto", "début|fin|texte"],

    /* ---------- expressões ---------- */
    "Biblioteca + copiar automaticamente da seleção.": ["Library + automatically copy from the selection.", "Biblioteca + copiar automáticamente de la selección.", "Bibliothèque + copie automatique depuis la sélection."],
    "Copiar da seleção": ["Copy from selection", "Copiar de la selección", "Copier depuis la sélection"], "Limpar": ["Clear", "Limpiar", "Effacer"],
    "Movimento": ["Motion", "Movimiento", "Mouvement"], "Opacidade": ["Opacity", "Opacidad", "Opacité"], "Escala": ["Scale", "Escala", "Échelle"], "Minhas": ["Mine", "Mías", "Les miennes"], "Copiadas": ["Copied", "Copiadas", "Copiées"],
    "Editor": ["Editor", "Editor", "Éditeur"], "Nome": ["Name", "Nombre", "Nom"], "Alvo": ["Target", "Destino", "Cible"],
    "// cole ou edite uma expressão": ["// paste or edit an expression", "// pega o edita una expresión", "// collez ou modifiez une expression"],
    "Wiggle (tremer)": ["Wiggle (shake)", "Wiggle (temblar)", "Wiggle (trembler)"], "Wiggle só no X": ["Wiggle X only", "Wiggle solo en X", "Wiggle sur X seulement"],
    "Flutuar (hover)": ["Float (hover)", "Flotar (hover)", "Flotter (hover)"], "Pêndulo / balanço": ["Pendulum / swing", "Péndulo / balanceo", "Pendule / balancement"],
    "Rotação contínua": ["Continuous rotation", "Rotación continua", "Rotation continue"], "Shake de câmera (impacto)": ["Camera shake (impact)", "Shake de cámara (impacto)", "Secousse caméra (impact)"],
    "Delay seguindo layer acima": ["Delay following layer above", "Delay siguiendo la capa superior", "Retard suivant le calque au-dessus"],
    "Look At (olhar para layer 1)": ["Look At (face layer 1)", "Look At (mirar a la capa 1)", "Look At (regarder le calque 1)"],
    "Loop offset (continua)": ["Loop offset (continues)", "Loop offset (continúa)", "Loop offset (continue)"], "Inércia / Bounce": ["Inertia / Bounce", "Inercia / Bounce", "Inertie / Bounce"],
    "Bounce de queda (gravidade)": ["Drop bounce (gravity)", "Bounce de caída (gravedad)", "Rebond de chute (gravité)"],
    "Máquina de escrever": ["Typewriter", "Máquina de escribir", "Machine à écrire"], "Máquina de escrever + cursor": ["Typewriter + cursor", "Máquina de escribir + cursor", "Machine à écrire + curseur"],
    "Contador de números": ["Number counter", "Contador de números", "Compteur de nombres"], "Letras aleatórias (decode)": ["Random letters (decode)", "Letras aleatorias (decode)", "Lettres aléatoires (decode)"],
    "Palavra por palavra": ["Word by word", "Palabra por palabra", "Mot par mot"], "Relógio / timer (mm:ss)": ["Clock / timer (mm:ss)", "Reloj / temporizador (mm:ss)", "Horloge / minuteur (mm:ss)"],
    "MAIÚSCULAS automáticas": ["Automatic UPPERCASE", "MAYÚSCULAS automáticas", "MAJUSCULES automatiques"], "Data de hoje": ["Today's date", "Fecha de hoy", "Date du jour"],
    "Fade in/out automático": ["Automatic fade in/out", "Fade in/out automático", "Fondu entrée/sortie automatique"], "Piscar (blink)": ["Blink", "Parpadear (blink)", "Clignoter (blink)"],
    "Flicker aleatório": ["Random flicker", "Flicker aleatorio", "Scintillement aléatoire"], "Fade por distância da câmera": ["Fade by camera distance", "Fade por distancia de la cámara", "Fondu selon la distance caméra"],
    "Pulsar no ritmo (BPM)": ["Pulse to the beat (BPM)", "Pulsar al ritmo (BPM)", "Pulser au rythme (BPM)"], "Escala pelo áudio (Audio Amplitude)": ["Scale by audio (Audio Amplitude)", "Escala por el audio (Audio Amplitude)", "Échelle selon l'audio (Audio Amplitude)"],
    "Escala proporcional ao comp": ["Scale proportional to comp", "Escala proporcional a la comp", "Échelle proportionnelle à la comp"],
    "Caixa que acompanha o texto (Size)": ["Box that follows the text (Size)", "Caja que acompaña el texto (Size)", "Boîte qui suit le texte (Size)"],
    "Anchor no centro do texto": ["Anchor at text center", "Anchor en el centro del texto", "Ancrage au centre du texte"], "Grudar no canto inferior": ["Stick to bottom edge", "Pegar al borde inferior", "Coller au bord inférieur"],
    "Parallax (z = profundidade)": ["Parallax (z = depth)", "Parallax (z = profundidad)", "Parallaxe (z = profondeur)"],
    "Expressão aplicada": ["Expression applied", "Expresión aplicada", "Expression appliquée"], "Salva em Minhas": ["Saved to Mine", "Guardada en Mías", "Enregistrée dans Les miennes"],
    "Vazio. Use \"Copiar expressões da seleção\" ou salve do editor.": ["Empty. Use \"Copy from selection\" or save from the editor.", "Vacío. Usa \"Copiar de la selección\" o guarda desde el editor.", "Vide. Utilisez « Copier depuis la sélection » ou enregistrez depuis l'éditeur."],
    "Nenhuma expressão nas layers/propriedades selecionadas.": ["No expressions on the selected layers/properties.", "No hay expresiones en las capas/propiedades seleccionadas.", "Aucune expression sur les calques/propriétés sélectionnés."],
    "Apagar": ["Delete", "Borrar", "Supprimer"],

    /* ---------- IA ---------- */
    "Remover fundo": ["Remove background", "Quitar fondo", "Supprimer le fond"],
    "Frame atual da comp → PNG importado acima das layers.": ["Current comp frame → PNG imported above the layers.", "Frame actual de la comp → PNG importado sobre las capas.", "Image actuelle de la comp → PNG importé au-dessus des calques."],
    "objeto principal": ["main subject", "objeto principal", "sujet principal"], "corpo inteiro": ["full body", "cuerpo entero", "corps entier"], "cabeça": ["head", "cabeza", "tête"],
    "rosto": ["face", "rostro", "visage"], "cabelo": ["hair", "cabello", "cheveux"], "braço": ["arm", "brazo", "bras"], "mão": ["hand", "mano", "main"], "perna": ["leg", "pierna", "jambe"],
    "pé": ["foot", "pie", "pied"], "tronco": ["torso", "torso", "torse"], "roupa": ["clothes", "ropa", "vêtements"],
    "ou digite: 'cachorro', 'braço + mão', 'camisa'…": ["or type (any language works best in PT/EN): 'dog', 'arm + hand', 'shirt'…", "o escribe: 'perro', 'brazo + mano', 'camisa'…", "ou tapez : 'chien', 'bras + main', 'chemise'…"],
    "Remover a parte": ["Remove the part", "Quitar la parte", "Supprimer la partie"], "Salvar máscara": ["Save mask", "Guardar máscara", "Enregistrer le masque"],
    "Suavizar borda": ["Feather edge", "Suavizar borde", "Adoucir le bord"], "Remover fundo do frame": ["Remove background from frame", "Quitar fondo del frame", "Supprimer le fond de l'image"],
    "…de um arquivo de imagem": ["…from an image file", "…de un archivo de imagen", "…depuis un fichier image"], "Remover pessoas / objetos": ["Remove people / objects", "Quitar personas / objetos", "Supprimer personnes / objets"],
    "pessoas, carro, texto, logo…": ["people, car, text, logo…", "personas, coche, texto, logo…", "personnes, voiture, texte, logo…"], "Expandir": ["Expand", "Expandir", "Étendre"],
    "Remover com IA": ["Remove with AI", "Quitar con IA", "Supprimer avec l'IA"], "Cancelado": ["Canceled", "Cancelado", "Annulé"],

    /* ---------- mídia ---------- */
    "YouTube, TikTok, Instagram, X, Vimeo… ou pesquise pelo nome.": ["YouTube, TikTok, Instagram, X, Vimeo… or search by name.", "YouTube, TikTok, Instagram, X, Vimeo… o busca por nombre.", "YouTube, TikTok, Instagram, X, Vimeo… ou cherchez par nom."],
    "Link ou pesquisa": ["Link or search", "Enlace o búsqueda", "Lien ou recherche"], "Qualidade": ["Quality", "Calidad", "Qualité"], "Importar": ["Import", "Importar", "Importer"],
    "Pasta de destino": ["Destination folder", "Carpeta de destino", "Dossier de destination"], "Recentes": ["Recent", "Recientes", "Récents"], "Nada ainda.": ["Nothing yet.", "Nada todavía.", "Rien pour l'instant."],
    "Importado na comp": ["Imported into comp", "Importado en la comp", "Importé dans la comp"], "Importado": ["Imported", "Importado", "Importé"],

    /* ---------- align ---------- */
    "Move o anchor sem deslocar a layer.": ["Moves the anchor without moving the layer.", "Mueve el anchor sin desplazar la capa.", "Déplace l'ancrage sans bouger le calque."],
    "Alinhar à comp": ["Align to comp", "Alinear a la comp", "Aligner sur la comp"], "Esquerda": ["Left", "Izquierda", "Gauche"], "Centro H": ["Center H", "Centro H", "Centre H"],
    "Direita": ["Right", "Derecha", "Droite"], "Topo": ["Top", "Arriba", "Haut"], "Centro V": ["Center V", "Centro V", "Centre V"], "Base": ["Bottom", "Abajo", "Bas"],
    "Centralizar tudo": ["Center everything", "Centrar todo", "Tout centrer"], "Ajustar à comp": ["Fit to comp", "Ajustar a la comp", "Ajuster à la comp"],
    "Largura": ["Width", "Ancho", "Largeur"], "Altura": ["Height", "Alto", "Hauteur"],
    "Anchor point movido": ["Anchor point moved", "Anchor point movido", "Point d'ancrage déplacé"], "Alinhado": ["Aligned", "Alineado", "Aligné"], "Ajustado": ["Fitted", "Ajustado", "Ajusté"],

    /* ---------- efeitos ---------- */
    "Favoritos, efeito próprio e cor.": ["Favorites, custom effect and color.", "Favoritos, efecto propio y color.", "Favoris, effet perso et couleur."],
    "Nome/matchName do efeito": ["Effect name/matchName", "Nombre/matchName del efecto", "Nom/matchName de l'effet"], "Adicionar": ["Add", "Añadir", "Ajouter"],
    "Remover todos": ["Remove all", "Quitar todos", "Tout supprimer"], "Efeito próprio": ["Custom effect", "Efecto propio", "Effet perso"], "Nome do seu efeito": ["Your effect's name", "Nombre de tu efecto", "Nom de votre effet"],
    "Salvar da layer": ["Save from layer", "Guardar de la capa", "Enregistrer depuis le calque"], "Keyframes proporcionais ao aplicar": ["Proportional keyframes when applying", "Keyframes proporcionales al aplicar", "Keyframes proportionnelles à l'application"],
    "Nenhum efeito salvo.": ["No saved effects.", "Ningún efecto guardado.", "Aucun effet enregistré."], "Color": ["Color", "Color", "Couleur"], "Como adjustment layer": ["As adjustment layer", "Como adjustment layer", "En calque d'effets"],
    "P&B contraste": ["B&W contrast", "B/N contraste", "N&B contrasté"], "Quente": ["Warm", "Cálido", "Chaud"], "Frio": ["Cold", "Frío", "Froid"], "Vibrante": ["Vibrant", "Vibrante", "Vibrant"],
    "Vinheta": ["Vignette", "Viñeta", "Vignette"], "Lumetri vazio": ["Empty Lumetri", "Lumetri vacío", "Lumetri vide"],
    "Efeito adicionado": ["Effect added", "Efecto añadido", "Effet ajouté"], "Efeitos removidos": ["Effects removed", "Efectos eliminados", "Effets supprimés"],
    "Remover todos os efeitos das layers selecionadas?": ["Remove all effects from the selected layers?", "¿Quitar todos los efectos de las capas seleccionadas?", "Supprimer tous les effets des calques sélectionnés ?"],

    /* ---------- organizador ---------- */
    "Identifica, renomeia, colore e pré-compõe cada layer.": ["Identifies, renames, colors and precomposes every layer.", "Identifica, renombra, colorea y precompone cada capa.", "Identifie, renomme, colore et précompose chaque calque."],
    "Escopo": ["Scope", "Alcance", "Portée"], "Comp ativa": ["Active comp", "Comp activa", "Comp active"], "Todas as comps": ["All comps", "Todas las comps", "Toutes les comps"],
    "Renomear": ["Rename", "Renombrar", "Renommer"], "Cor por tipo": ["Color by type", "Color por tipo", "Couleur par type"], "Pastas no Project": ["Project panel folders", "Carpetas en Project", "Dossiers du projet"],
    "Remover não usados": ["Remove unused", "Quitar no usados", "Supprimer les inutilisés"], "Pré-compor": ["Precompose", "Precomponer", "Précomposer"], "Não": ["No", "No", "Non"],
    "Grupos vizinhos do mesmo tipo": ["Adjacent groups of the same type", "Grupos vecinos del mismo tipo", "Groupes voisins du même type"], "Tudo por tipo": ["Everything by type", "Todo por tipo", "Tout par type"],
    "Vídeo": ["Video", "Video", "Vidéo"], "Imagem": ["Image", "Imagen", "Image"], "Áudio": ["Audio", "Audio", "Audio"], "Projeto organizado": ["Project organized", "Proyecto organizado", "Projet organisé"],

    /* ---------- render / projeto ---------- */
    "Render & Projeto": ["Render & Project", "Render y Proyecto", "Rendu & Projet"], "Fila de render, manutenção e sessão.": ["Render queue, maintenance and session.", "Cola de render, mantenimiento y sesión.", "File de rendu, maintenance et session."],
    "Renderizar imediatamente": ["Render immediately", "Renderizar de inmediato", "Rendre immédiatement"], "Projeto": ["Project", "Proyecto", "Projet"],
    "Salvar +1 versão": ["Save +1 version", "Guardar +1 versión", "Enregistrer +1 version"], "Reduzir projeto": ["Reduce project", "Reducir proyecto", "Réduire le projet"],
    "Consolidar": ["Consolidate", "Consolidar", "Consolider"], "Limpar cache": ["Clear cache", "Limpiar caché", "Vider le cache"], "Sessão": ["Session", "Sesión", "Session"],
    "hoje": ["today", "hoy", "aujourd'hui"], "mês": ["month", "mes", "mois"], "ano": ["year", "año", "an"], "Servidor de IA": ["AI server", "Servidor de IA", "Serveur IA"],
    "Servidor parado. Clique em Iniciar (veja README para instalar as dependências).": ["Server stopped. Click Start (see the README to install dependencies).", "Servidor detenido. Haz clic en Iniciar (consulta el README para instalar las dependencias).", "Serveur arrêté. Cliquez sur Démarrer (voir le README pour installer les dépendances)."],
    "Iniciar servidor": ["Start server", "Iniciar servidor", "Démarrer le serveur"], "Verificar": ["Check", "Verificar", "Vérifier"],
    "python3 (ou caminho completo)": ["python3 (or full path)", "python3 (o ruta completa)", "python3 (ou chemin complet)"],
    "Adicionado à fila de render": ["Added to render queue", "Añadido a la cola de render", "Ajouté à la file de rendu"],
    "Iniciando servidor de IA...": ["Starting AI server...", "Iniciando servidor de IA...", "Démarrage du serveur IA..."], "Servidor já iniciado.": ["Server already started.", "Servidor ya iniciado.", "Serveur déjà démarré."],
    "Servidor de IA não respondeu.": ["AI server did not respond.", "El servidor de IA no respondió.", "Le serveur IA n'a pas répondu."]
  };

  /* mensagens dinâmicas: [regex, [en, es, fr]] — $1, $2 são traduzidos de novo se possível */
  var PATTERNS = [
    [/^Script do After Effects não carregou \((.*)\)$/, ["After Effects script did not load ($1)", "El script de After Effects no cargó ($1)", "Le script After Effects ne s'est pas chargé ($1)"]],
    [/^BG removido - (.*)$/, ["BG removed - $1", "Fondo quitado - $1", "Fond supprimé - $1"]],
    [/^Preset não encontrado: (.*)$/, ["Preset not found: $1", "Preset no encontrado: $1", "Preset introuvable : $1"]],
    [/^Preset desconhecido: (.*)$/, ["Unknown preset: $1", "Preset desconocido: $1", "Preset inconnu : $1"]],
    [/^Ferramenta desconhecida: (.*)$/, ["Unknown tool: $1", "Herramienta desconocida: $1", "Outil inconnu : $1"]],
    [/^Efeito não disponível: (.*)$/, ["Effect not available: $1", "Efecto no disponible: $1", "Effet non disponible : $1"]],
    [/^Arquivo não existe: (.*)$/, ["File does not exist: $1", "El archivo no existe: $1", "Le fichier n'existe pas : $1"]],
    [/^Carregando modelo Whisper '(.*)'\.\.\.$/, ["Loading Whisper model '$1'...", "Cargando modelo Whisper '$1'...", "Chargement du modèle Whisper « $1 »..."]],
    [/^Transcrevendo\.\.\. (\d+)s \/ (\d+)s$/, ["Transcribing... $1s / $2s", "Transcribiendo... $1s / $2s", "Transcription... $1s / $2s"]],
    [/^Rastreando rosto\.\.\. frame (\d+)$/, ["Tracking face... frame $1", "Siguiendo rostro... frame $1", "Suivi du visage... image $1"]],
    [/^Baixando\.\.\. (.*)$/, ["Downloading... $1", "Descargando... $1", "Téléchargement... $1"]],
    [/^Baixando (.*)\.\.\. (\d+)\/(\d+) MB$/, ["Downloading $1... $2/$3 MB", "Descargando $1... $2/$3 MB", "Téléchargement de $1... $2/$3 Mo"]],
    [/^Link (\d+)\/(\d+)\.\.\.$/, ["Link $1/$2...", "Enlace $1/$2...", "Lien $1/$2..."]],
    [/^Extraindo (.*)\.\.\.$/, ["Extracting $1...", "Extrayendo $1...", "Extraction de $1..."]],
    [/^Lendo (.*)\.\.\.$/, ["Reading $1...", "Leyendo $1...", "Lecture de $1..."]],
    [/^Não consegui extrair (.*) — instale o 7-Zip ou 'pip install rarfile py7zr'\.$/, ["Could not extract $1 — install 7-Zip or 'pip install rarfile py7zr'.", "No se pudo extraer $1 — instala 7-Zip o 'pip install rarfile py7zr'.", "Impossible d'extraire $1 — installez 7-Zip ou 'pip install rarfile py7zr'."]],
    [/^Dependência ausente: (.*) — rode: (.*)$/, ["Missing dependency: $1 — run: $2", "Falta una dependencia: $1 — ejecuta: $2", "Dépendance manquante : $1 — exécutez : $2"]],
    [/^Falha ao iniciar Python: (.*)$/, ["Failed to start Python: $1", "Error al iniciar Python: $1", "Échec du démarrage de Python : $1"]],
    [/^Node não disponível — rode server\/start_server manualmente\.$/, ["Node not available — run server/start_server manually.", "Node no disponible — ejecuta server/start_server manualmente.", "Node indisponible — lancez server/start_server manuellement."]],
    [/^No module named '([^']+)'$/, ["Missing Python module '$1' — run: pip install -r server/requirements.txt", "Falta el módulo de Python '$1' — ejecuta: pip install -r server/requirements.txt", "Module Python '$1' manquant — exécutez : pip install -r server/requirements.txt"]],
    [/^Failed to fetch$/, ["AI server unreachable", "Servidor de IA inaccesible", "Serveur IA injoignable"]],
    [/^(.+) ✓$/, ["$1 ✓", "$1 ✓", "$1 ✓"]],
    [/^(.+) adicionado$/, ["$1 added", "$1 añadido", "$1 ajouté"]],
    [/^(.+) aplicado$/, ["$1 applied", "$1 aplicado", "$1 appliqué"]],
    [/^(\d+) propriedade\(s\) ajustada\(s\)$/, ["$1 property(ies) fitted", "$1 propiedad(es) ajustada(s)", "$1 propriété(s) ajustée(s)"]],
    [/^Preset aplicado \((\d+) props ajustadas\)$/, ["Preset applied ($1 props fitted)", "Preset aplicado ($1 props ajustadas)", "Preset appliqué ($1 props ajustées)"]],
    [/^Curva aplicada em (\d+) par\(es\)$/, ["Curve applied to $1 pair(s)", "Curva aplicada en $1 par(es)", "Courbe appliquée à $1 paire(s)"]],
    [/^(\d+) legendas criadas$/, ["$1 captions created", "$1 subtítulos creados", "$1 sous-titres créés"]],
    [/^(\d+) expressão\(ões\) copiada\(s\)$/, ["$1 expression(s) copied", "$1 expresión(es) copiada(s)", "$1 expression(s) copiée(s)"]],
    [/^(\d+) expressão\(ões\) removida\(s\)$/, ["$1 expression(s) removed", "$1 expresión(es) eliminada(s)", "$1 expression(s) supprimée(s)"]],
    [/^(\d+) mídia\(s\) não encontrada\(s\)$/, ["$1 missing file(s)", "$1 medio(s) no encontrado(s)", "$1 média(s) introuvable(s)"]],
    [/^(\d+) mídia\(s\) reconectada\(s\)(.*)$/, ["$1 file(s) relinked$2", "$1 medio(s) reconectado(s)$2", "$1 média(s) reconnecté(s)$2"]],
    [/^ · (\d+) não achada\(s\)$/, [" · $1 not found", " · $1 no encontrado(s)", " · $1 introuvable(s)"]],
    [/^usado em (\d+) comp\(s\)(.*)$/, ["used in $1 comp(s)$2", "usado en $1 comp(s)$2", "utilisé dans $1 comp(s)$2"]],
    [/^ · sequência$/, [" · sequence", " · secuencia", " · séquence"]],
    [/^(\d+) comp\(s\) criada\(s\)(.*)$/, ["$1 comp(s) created$2", "$1 comp(s) creada(s)$2", "$1 comp(s) créée(s)$2"]],
    [/^Projeto de presets criado ✨ \((\d+)\)$/, ["Preset project created ✨ ($1)", "Proyecto de presets creado ✨ ($1)", "Projet de presets créé ✨ ($1)"]],
    [/^(\d+) \.ffx salvo\(s\)(.*)$/, ["$1 .ffx saved$2", "$1 .ffx guardado(s)$2", "$1 .ffx enregistré(s)$2"]],
    [/^ · (\d+) sem arquivo original$/, [" · $1 without original file", " · $1 sin archivo original", " · $1 sans fichier d'origine"]],
    [/^(\d+) importado\(s\)(.*)$/, ["$1 imported$2", "$1 importado(s)$2", "$1 importé(s)$2"]],
    [/^ · (\d+) falha\(s\)(.*)$/, [" · $1 failure(s)$2", " · $1 fallo(s)$2", " · $1 échec(s)$2"]],
    [/^Importando (\d+) arquivo\(s\) no projeto…$/, ["Importing $1 file(s) into the project…", "Importando $1 archivo(s) al proyecto…", "Import de $1 fichier(s) dans le projet…"]],
    [/^(\d+) fonte\(s\) aberta\(s\) para instalar$/, ["$1 font(s) opened to install", "$1 fuente(s) abierta(s) para instalar", "$1 police(s) ouverte(s) pour installation"]],
    [/^Criando comps (\d+)–(\d+) de (\d+)…$/, ["Creating comps $1–$2 of $3…", "Creando comps $1–$2 de $3…", "Création des comps $1–$2 sur $3…"]],
    [/^(\d+)<\/b> preset\(s\) em /, ["$1</b> preset(s) in ", "$1</b> preset(s) en ", "$1</b> preset(s) dans "]],
    [/^ pasta\(s\) · projeto $/, [" folder(s) · project ", " carpeta(s) · proyecto ", " dossier(s) · projet "]],
    [/^Procurando em (.*)…$/, ["Searching in $1…", "Buscando en $1…", "Recherche dans $1…"]],
    [/^Nenhuma correspondência em (\d+) arquivo\(s\)\.$/, ["No matches in $1 file(s).", "Sin coincidencias en $1 archivo(s).", "Aucune correspondance dans $1 fichier(s)."]],
    [/^Trocar (\d+) mídia\(s\) por placeholder\?$/, ["Replace $1 file(s) with placeholders?", "¿Cambiar $1 medio(s) por placeholder?", "Remplacer $1 média(s) par des placeholders ?"]],
    [/^Substituído: (.*)$/, ["Replaced: $1", "Reemplazado: $1", "Remplacé : $1"]],
    [/^Substituir (.*)$/, ["Replace $1", "Reemplazar $1", "Remplacer $1"]],
    [/^Baixado: (.*)$/, ["Downloaded: $1", "Descargado: $1", "Téléchargé : $1"]],
    [/^Baixando (.*)$/, ["Downloading $1", "Descargando $1", "Téléchargement de $1"]],
    [/^Buscando "(.*)"\.\.\.$/, ["Searching \"$1\"...", "Buscando \"$1\"...", "Recherche « $1 »..."]],
    [/^(\d+) resultado\(s\)$/, ["$1 result(s)", "$1 resultado(s)", "$1 résultat(s)"]],
    [/^Importado: (.*)$/, ["Imported: $1", "Importado: $1", "Importé : $1"]],
    [/^Rosto encontrado em (\d+)\/(\d+) frames analisados\.$/, ["Face found in $1/$2 analyzed frames.", "Rostro encontrado en $1/$2 frames analizados.", "Visage trouvé dans $1/$2 images analysées."]],
    [/^Saída: (.*)$/, ["Output: $1", "Salida: $1", "Sortie : $1"]],
    [/^(\d+) layers analisadas$/, ["$1 layers analyzed", "$1 capas analizadas", "$1 calques analysés"]],
    [/^Efeito salvo \((\d+) efeito\(s\)\)$/, ["Effect saved ($1 effect(s))", "Efecto guardado ($1 efecto(s))", "Effet enregistré ($1 effet(s))"]],
    [/^Meu efeito (\d+)$/, ["My effect $1", "Mi efecto $1", "Mon effet $1"]],
    [/^Expressão aplicada: (.*)$/, ["Expression applied: $1", "Expresión aplicada: $1", "Expression appliquée : $1"]],
    [/^Sem (.*)$/, ["Without $1", "Sin $1", "Sans $1"]]
  ];

  var idx = { en: 0, es: 1, fr: 2 };
  var lang = "pt";
  try { lang = localStorage.getItem("mt_lang") || ""; } catch (e) {}
  if (LANGS.indexOf(lang) < 0) {
    var nav = (navigator.language || "pt").slice(0, 2).toLowerCase();
    lang = LANGS.indexOf(nav) >= 0 ? nav : "en";
  }

  function tr(s) {
    if (lang === "pt" || !s) return s;
    var key = s.trim();
    if (!key) return s;
    var lead = s.slice(0, s.indexOf(key.charAt(0))), tail = s.slice(s.lastIndexOf(key.charAt(key.length - 1)) + 1);
    var hit = D[key];
    if (hit) return lead + hit[idx[lang]] + tail;
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = key.match(PATTERNS[i][0]);
      if (m) {
        var out = PATTERNS[i][1][idx[lang]].replace(/\$(\d)/g, function (_, n) { var v = m[+n] || ""; return D[v.trim()] ? tr(v) : v; });
        return lead + out + tail;
      }
    }
    return s;
  }

  /* ----- aplica na página (guarda o original em PT para poder trocar de idioma) ----- */
  var ORIG = "__mtOrig", busy = false, ATTRS = ["placeholder", "title", "data-tip"];
  function doText(n) {
    var p = n.parentNode;
    if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return;
    if (n[ORIG] === undefined || (n.nodeValue !== n.__mtLast)) n[ORIG] = n.nodeValue;
    var v = tr(n[ORIG]);
    n.__mtLast = v;
    if (n.nodeValue !== v) n.nodeValue = v;
  }
  function doEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var key = "mtO" + a.replace(/-/g, ""), cur = el.getAttribute(a);
      if (el.dataset[key] === undefined || cur !== el.dataset[key + "L"]) el.dataset[key] = cur;
      var v = tr(el.dataset[key]);
      el.dataset[key + "L"] = v;
      if (cur !== v) el.setAttribute(a, v);
    }
  }
  function apply(root) {
    busy = true;
    try {
      root = root || document.body;
      if (root.nodeType === 3) { doText(root); return; }
      if (root.nodeType !== 1) return;
      doEl(root);
      var els = root.querySelectorAll("[placeholder],[title],[data-tip]");
      for (var i = 0; i < els.length; i++) doEl(els[i]);
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) doText(n);
    } finally { busy = false; }
  }
  var mo = new MutationObserver(function (list) {
    if (busy) return;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === "characterData") apply(r.target);
      else if (r.type === "attributes") apply(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) apply(r.addedNodes[j]);
    }
  });

  function setLang(l) {
    lang = LANGS.indexOf(l) >= 0 ? l : "pt";
    try { localStorage.setItem("mt_lang", lang); } catch (e) {}
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
    var sel = document.getElementById("langSel"); if (sel) sel.value = lang;
    if (window.MFHost && window.MFHost.inAE) window.MFHost.call("mf_setLang", { lang: lang }).catch(function () {});
    apply(document.body);
  }

  /* API usada pelo resto do painel (prompt/confirm, etc.) */
  window.MT_T = tr;
  window.MT_LANG = function () { return lang; };
  window.MT_SETLANG = setLang;

  function init() {
    var host = document.querySelector(".status");
    if (host && !document.getElementById("langSel")) {
      var wrap = document.createElement("label");
      wrap.className = "pill lang"; wrap.title = "Idioma da interface";
      wrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9M12 3C9.5 5.6 8.4 8.6 8.4 12s1.1 6.4 3.6 9"/></svg>' +
        '<select id="langSel">' + LANGS.map(function (l) { return '<option value="' + l + '">' + LABEL[l] + "</option>"; }).join("") + "</select>";
      host.insertBefore(wrap, host.firstChild);
      wrap.querySelector("select").onchange = function () { setLang(this.value); };
    }
    setLang(lang);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
