/* MagicTouch — ícones (traço 24×24) e barra lateral */
(function () {
  var P = {
    home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
    link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
    box: "M20.5 7.5 12 3 3.5 7.5 12 12zM3.5 7.5v9L12 21l8.5-4.5v-9M12 12v9M7.8 5.2l8.4 4.6",
    alert: "M12 4 21 19.5H3zM12 10v4M12 17v.01",
    layers: "M12 4 3 8.5l9 4.5 9-4.5zM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5",
    diamond: "M12 3.5 18.5 12 12 20.5 5.5 12z",
    curve: "M4 20C11 20 13 4 20 4M4 20h.01M20 4h.01",
    sparkle: "M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7zM19 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z",
    cc: "M3.5 6.5h17v11h-17zM10.5 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3",
    braces: "M8.5 4C6 4 6 5.5 6 7.5S5 11 3.5 12C5 13 6 14.5 6 16.5S6 20 8.5 20M15.5 4C18 4 18 5.5 18 7.5s1 3.5 2.5 4.5C19 13 18 14.5 18 16.5S18 20 15.5 20",
    wand: "M4 20 15 9M15 9l2-2M18.5 3.5l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9L16 6l1.9-.6zM9 4l.4 1.1L10.5 5.5l-1.1.4L9 7l-.4-1.1L7.5 5.5l1.1-.4z",
    download: "M12 4v11M7 10.5l5 5 5-5M4.5 20h15",
    target: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
    sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
    folder: "M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z",
    play: "M7.5 4.5v15L19.5 12z",
    search: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 20 20",
    clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4.5l3 1.5",
    file: "M6.5 3.5h7l4 4v13h-11zM13.5 3.5v4h4",
    save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
    eraser: "M15 4.5 20 9.5 11 18.5H6l-2.5-2.5zM9.5 10l5 5M11 18.5h9",
    replace: "M4 8h12l-3-3M20 16H8l3 3",
    check: "M5 12.5 10 17 19 7"
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + (P[name] || P.sparkle) + '"/></svg>';
  }
  window.MT_ICON = svg;

  var NAV = [
    ["home", "home", "Início"],
    ["links", "link", "Leitor de links"],
    ["pack", "box", "Projeto de presets .ffx"],
    ["missing", "alert", "Mídias não encontradas"],
    "-",
    ["layer", "layers", "Layer"],
    ["keys", "diamond", "Keyframes proporcionais"],
    ["flow", "curve", "Flow"],
    ["motion", "sparkle", "Motion Library"],
    ["captions", "cc", "Legendas + Face Track"],
    ["expr", "braces", "Expressões"],
    "-",
    ["ai", "wand", "IA: fundo / pessoas"],
    ["media", "download", "Baixar mídia"],
    ["align", "target", "Anchor / Align"],
    ["effects", "sliders", "Efeitos / Cor"],
    ["organize", "folder", "Organizador"],
    ["render", "play", "Render / Projeto"]
  ];
  var rail = document.getElementById("nav");
  rail.innerHTML = '<div class="rail-logo"><img src="img/logo.svg" alt=""></div>' + NAV.map(function (n) {
    if (n === "-") return '<span class="sep"></span>';
    return '<button data-go="' + n[0] + '" data-tip="' + n[2] + '">' + svg(n[1]) + (n[0] === "missing" ? '<b class="badge" id="missBadge" hidden>0</b>' : "") + "</button>";
  }).join("");
  Array.prototype.forEach.call(document.querySelectorAll(".ico[data-i]"), function (el) { el.innerHTML = svg(el.getAttribute("data-i")); });
})();
