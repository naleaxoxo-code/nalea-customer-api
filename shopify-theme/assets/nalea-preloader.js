/* Nalea preloader: a vanilla port of the 21st.dev "Old Masters Preloader"
   (Classical Statue Portfolio Preloader). The design, CSS, timings and motion
   are the original's; only the words are Nalea's. It plays over the product
   page once per browser session and lifts off on a scroll, a swipe, Escape,
   or the call to action. */
(function () {
  "use strict";
  if (window.__naleaPreloader) return;
  window.__naleaPreloader = true;
  try {
    if (sessionStorage.getItem("nalea_om_seen") === "1") return;
    sessionStorage.setItem("nalea_om_seen", "1");
  } catch (e) {}

  var CDN = "https://cdn.shopify.com/s/files/1/0789/2166/2696/files/";
  var IMG = (window.__NALEA_OM_IMG) || {
    apollo: CDN + "photo-1574359587026-daf1bfd26baa.jpg?v=1794263757&width=1600",
    hercules: CDN + "photo-1567522874215-d5e2f1bee83d.jpg?v=1794263757&width=1600",
    flowers: CDN + "photo-1662808141421-54240cbfd45f.jpg?v=1794263757&width=1600",
    david: CDN + "photo-1601887389937-0b02c26b602c.jpg?v=1794263757&width=1600"
  };

  /* ---- props (the original defaults, Nalea's words) ---------------------- */
  var P = {
    durationMs: 4800,
    minLoadMs: 2600,
    skippable: true,
    figures: [
      { src: IMG.apollo, alt: "The Apollo Belvedere, a cloak over one arm", x: 58, y: 100, h: 84, depth: 1 },
      { src: IMG.hercules, alt: "The torso of a marble Hercules", x: 24, y: 103, h: 90, depth: 1.25 },
      { src: IMG.flowers, alt: "A marble figure holding flowers", x: 88, y: 100, h: 100, depth: 0.75, flip: true, phone: false }
    ],
    backdrop: IMG.david,
    wordDepth: 0.9,
    exposure: 1,
    rays: true,
    dust: true,
    tilt: 2.5,
    wordmark: "Nalea xoxo",
    face: "didone",
    tagline: "Your gifts. Your glow. Your Nalea.",
    eyebrow: "Naleaxoxo \u00b7 MMXXVI",
    brand: "N.",
    nav: [
      { label: "Shop", href: "/collections/all" },
      { label: "Gifts", href: "/collections/anniversary-gifts" },
      { label: "Account", href: "/account" },
      { label: "Contact", href: "/pages/contact" }
    ],
    labels: ["Made with love", "Gifted with xoxo"],
    asides: [
      { title: "Nalea", text: "Handpicked gifts, beauty and little luxuries for every moment worth celebrating. Every piece chosen with love." },
      { title: "xoxo", text: "Begin with the people you love. Wrap it, gift it, keep a little something for yourself." }
    ],
    annotations: [
      { x: 33, y: 44, label: "0.7324" },
      { x: 66, y: 36, label: "1.1429" },
      { x: 48, y: 58, label: "1.0000" }
    ],
    plate: "Pl. I",
    loadingLabel: "Loading",
    cta: { label: "Shop all products xoxo", href: "/collections/all" },
    holdMs: 0,
    scrollToEnter: true,
    tone: "carmine"
  };

  var FONT_HREF = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Jost:wght@400;500&family=Pinyon+Script&display=swap";
  var FONT_PROBES = ['400 1em "Bodoni Moda"', '400 1em "Bebas Neue"', '400 1em "Pinyon Script"', '400 1em "Jost"', '500 1em "Jost"'];
  var FACES = {
    didone: { family: '"Bodoni Moda", "Didot", "Bodoni 72", "Playfair Display", "Times New Roman", serif', weight: 400, tracking: -0.01 },
    condensed: { family: '"Bebas Neue", "Oswald", "Impact", "Arial Narrow", sans-serif', weight: 400, tracking: 0.02 },
    grotesk: { family: '"Jost", "Futura", "Helvetica Neue", Arial, sans-serif', weight: 500, tracking: -0.035 }
  };
  var SCRIPT_FAMILY = '"Pinyon Script", "Snell Roundhand", "Apple Chancery", "Brush Script MT", cursive';
  var UI_FAMILY = '"Jost", "Futura", "Helvetica Neue", Arial, sans-serif';
  var SERIF_FAMILY = '"Bodoni Moda", "Didot", "Bodoni 72", "Playfair Display", "Times New Roman", serif';
  var TONES = {
    noir: { stage: "#0e0c0a", ground: "#050403", text: "#efe6d6", muted: "#9a917f", accent: "#d9b25c", word: "#f1e9d8", rule: "#4a4336", glow: "#ffd98a", highlight: "#f4ecdc" },
    carmine: { stage: "#7a1511", ground: "#1a0706", text: "#f6ead6", muted: "#dba79d", accent: "#f6ead6", word: "#f8eedc", rule: "#b2463c", glow: "#ffdcb0", highlight: "#f0b08f" },
    vellum: { stage: "#e8ddc6", ground: "#d9ccb0", text: "#221c16", muted: "#7a6d58", accent: "#8e2b1d", word: "#1f1913", rule: "#c7b58f", glow: "#fff6e0", highlight: "#ffffff" }
  };
  var UNVEIL_MS = 3000;
  var EXIT_MS = 1250;

  /* ---- timeline helpers (verbatim) -------------------------------------- */
  var OM_CURVE = [[0, 0], [0.1, 0.14], [0.26, 0.2], [0.4, 0.52], [0.5, 0.56], [0.72, 0.84], [0.82, 0.88], [1, 1]];
  function omSimulated(t) {
    if (!(t > 0)) return 0;
    if (t >= 1) return 1;
    for (var i = 1; i < OM_CURVE.length; i++) {
      var t0 = OM_CURVE[i - 1][0], p0 = OM_CURVE[i - 1][1], t1 = OM_CURVE[i][0], p1 = OM_CURVE[i][1];
      if (t <= t1) { var u = (t - t0) / (t1 - t0); var s = u * u * (3 - 2 * u); return p0 + (p1 - p0) * s; }
    }
    return 1;
  }
  function omRatio(p) { return Math.min(1, Math.max(0, p)).toFixed(4); }
  function round2(v) { return Math.round(v * 100) / 100 + 0; }
  function omMeander(cx, cy, r, depth, units) {
    var n = Math.max(4, Math.floor(units));
    var unit = (Math.PI * 2) / n;
    var hook = [[0, 0], [0, 3], [4, 3], [4, 2], [2, 2], [2, 0], [6, 0]];
    function at(u, v) {
      var a = -Math.PI / 2 + (u / 6) * unit;
      var rr = r + (v / 3 - 0.5) * depth;
      return [round2(cx + Math.cos(a) * rr), round2(cy + Math.sin(a) * rr), round2(rr)];
    }
    var d = "", prevV = 0;
    for (var i = 0; i < n; i++) {
      for (var k = 0; k < hook.length; k++) {
        if (i > 0 && k === 0) continue;
        var hu = hook[k][0], hv = hook[k][1];
        var p = at(i * 6 + hu, hv);
        if (i === 0 && k === 0) d = "M" + p[0] + " " + p[1];
        else if (hv === prevV) d += " A" + p[2] + " " + p[2] + " 0 0 1 " + p[0] + " " + p[1];
        else d += " L" + p[0] + " " + p[1];
        prevV = hv;
      }
    }
    return d;
  }
  function omCover(iw, ih, w, h, fx, fy) {
    if (!(iw > 0) || !(ih > 0) || !(w > 0) || !(h > 0)) return { x: 0, y: 0, w: Math.max(0, w), h: Math.max(0, h) };
    var s = Math.max(w / iw, h / ih), cw = iw * s, ch = ih * s;
    var cx = Math.min(1, Math.max(0, fx)), cy = Math.min(1, Math.max(0, fy));
    return { x: round2((w - cw) * cx), y: round2((h - ch) * cy), w: round2(cw), h: round2(ch) };
  }
  function omFigureBox(x, y, h, aspect, stageW, stageH) {
    if (!(stageW > 0) || !(stageH > 0)) return { left: 0, top: 0, w: 0, h: 0 };
    var a = aspect > 0 ? aspect : 0.6;
    var ph = (h / 100) * stageH, pw = ph * a;
    return { left: round2((x / 100) * stageW - pw / 2), top: round2((y / 100) * stageH - ph), w: round2(pw), h: round2(ph) };
  }
  function omFit(w100, avail, maxFs, minFs) {
    if (!(w100 > 0) || !(avail > 0)) return minFs;
    return Math.max(minFs, Math.min(maxFs, (avail / w100) * 100));
  }
  function omTransfer(threshold, softness, subject) {
    var soft = Math.max(0.02, Math.min(1, softness));
    var th = Math.min(1, Math.max(0, threshold));
    if (subject === "light") return { slope: round2(1 / soft), intercept: round2(-(th - soft / 2) / soft) };
    return { slope: round2(-1 / soft), intercept: round2((th + soft / 2) / soft) };
  }
  function omRng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function omHash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h || 1;
  }
  function omBars(seed, count, width) {
    var rnd = omRng(seed), bars = [], pitch = width / Math.max(1, count);
    for (var i = 0; i < count; i++) bars.push({ x: round2(i * pitch), w: Math.max(1, Math.round(pitch * (0.25 + rnd() * 0.55))) });
    return bars;
  }
  function omSplit(word, script) {
    var chars = Array.from(word);
    if (!script || chars.length === 0) return { initial: "", rest: chars };
    return { initial: chars[0], rest: chars.slice(1) };
  }
  function omBaseline(ascent, descent) {
    if (!(ascent > 0) || !(descent >= 0)) return 0.2;
    return round2(((1 + descent - ascent) / 2) * 100) / 100;
  }
  function omNearest(px, centres, reach) {
    var best = -1, bestD = reach;
    for (var i = 0; i < centres.length; i++) { var d = Math.abs(centres[i] - px); if (d < bestD) { bestD = d; best = i; } }
    return best;
  }
  function hexAlpha(hex, alpha) {
    var m = hex.replace("#", "");
    var n = m.length === 3 ? m.split("").map(function (c) { return c + c; }).join("") : m;
    var r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    if ([r, g, b].some(function (v) { return isNaN(v); })) return hex;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }
  function hexMix(a, b, t) {
    function p(h) { var m = h.replace("#", ""); var n = m.length === 3 ? m.split("").map(function (c) { return c + c; }).join("") : m; return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]; }
    var x = p(a), y = p(b);
    var c = x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); });
    return "#" + c.map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
  }
  function paintGrain(seed) {
    var c = document.createElement("canvas"); c.width = 160; c.height = 160;
    var ctx = c.getContext("2d"); if (!ctx) return "";
    var img = ctx.createImageData(160, 160), rnd = omRng(seed);
    for (var i = 0; i < img.data.length; i += 4) { var v = 96 + Math.floor(rnd() * 96); img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }

  /* ---- the original stylesheet, verbatim -------------------------------- */
  var OM_CSS = `
.om-root { position: relative; width: 100%; overflow: hidden; background: var(--om-ground); color: var(--om-text); font-family: var(--om-ui); -webkit-font-smoothing: antialiased; --om-px: 0; --om-py: 0; --om-sx: 50%; --om-sy: 40%; --om-gap: 90px; --om-fill: 0%; --om-lift: 0px; }
.om-root svg, .om-root canvas, .om-root img { max-width: none; }
.om-root a { color: inherit; text-decoration: none; }
.om-root button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; }
.om-root :focus-visible { outline: 1px solid var(--om-accent); outline-offset: 4px; }
.om-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.om-page { position: absolute; inset: 0; overflow: auto; }
.om-stage { position: absolute; inset: 0; overflow: hidden; background: var(--om-ground); clip-path: inset(0 0 0 0); }
.om-root[data-phase="exit"] .om-stage { clip-path: inset(0 0 100% 0); transition: clip-path 1.2s cubic-bezier(0.76, 0, 0.24, 1); }
.om-root[data-phase="exit"] .om-cast { transform: translate3d(0, -12%, 0); transition: transform 1.2s cubic-bezier(0.76, 0, 0.24, 1); }
.om-root[data-phase="exit"] .om-chrome { opacity: 0; transition: opacity 0.5s ease; }
.om-flood { position: absolute; inset: 0; background: radial-gradient(ellipse 90% 80% at 50% 110%, var(--om-stage-l) 0%, var(--om-stage) 55%, var(--om-stage-d) 100%); clip-path: circle(0% at 50% 56%); }
.om-root[data-phase="unveil"] .om-flood, .om-root[data-phase="landing"] .om-flood, .om-root[data-phase="exit"] .om-flood { clip-path: circle(120% at 50% 56%); transition: clip-path 1.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s; }
.om-backdrop { position: absolute; display: block; opacity: 0; filter: grayscale(1) contrast(1.15) brightness(0.55) blur(3px); transform: translate3d(calc(var(--om-px) * 4px), calc(var(--om-py) * 3px), 0) scale(1.06); }
.om-root[data-phase="landing"] .om-backdrop, .om-root[data-phase="exit"] .om-backdrop, .om-root[data-phase="unveil"] .om-backdrop { opacity: 0.42; transition: opacity 2.4s ease 0.9s; }
.om-root[data-tone="vellum"] .om-backdrop { filter: grayscale(1) contrast(1.1) brightness(1.15) blur(3px); mix-blend-mode: multiply; }
.om-light { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; mix-blend-mode: screen; opacity: 0; filter: blur(4px); }
.om-root[data-tone="vellum"] .om-light { mix-blend-mode: multiply; }
.om-root[data-phase="landing"] .om-light, .om-root[data-phase="exit"] .om-light, .om-root[data-phase="unveil"] .om-light { opacity: 1; transition: opacity 2.6s ease 1.1s; }
.om-spot { position: absolute; inset: -20%; pointer-events: none; mix-blend-mode: screen; opacity: 0; background: radial-gradient(circle 30vmax at var(--om-sx) var(--om-sy), var(--om-glow-a) 0%, transparent 62%); transition: opacity 1.2s ease 1.6s; }
.om-root[data-tone="vellum"] .om-spot { mix-blend-mode: soft-light; }
.om-root[data-phase="landing"] .om-spot, .om-root[data-phase="exit"] .om-spot { opacity: 1; }
.om-flash { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 50%, var(--om-glow-b) 0%, transparent 50%); opacity: 0; }
.om-root[data-phase="unveil"] .om-flash { animation: om-flash 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
@keyframes om-flash { 0% { opacity: 0; } 10% { opacity: 1; } 100% { opacity: 0; } }
.om-grain { position: absolute; inset: -32px; pointer-events: none; background-repeat: repeat; background-size: 160px 160px; opacity: var(--om-grain); mix-blend-mode: overlay; animation: om-grain 0.5s steps(1) infinite; }
@keyframes om-grain { 0% { transform: translate(0, 0); } 25% { transform: translate(-16px, 9px); } 50% { transform: translate(11px, -14px); } 75% { transform: translate(-7px, -19px); } }
.om-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 70% at 50% 45%, transparent 55%, var(--om-ground-a) 100%); opacity: 0; }
.om-root[data-phase="landing"] .om-vignette, .om-root[data-phase="exit"] .om-vignette { opacity: 1; transition: opacity 2s ease 1s; }
.om-ring { position: absolute; left: 50%; top: 50%; width: var(--om-ring); height: var(--om-ring); transform: translate(-50%, -50%); overflow: visible; }
.om-ring-spin { transform-origin: 200px 200px; animation: om-spin 90s linear infinite; }
@keyframes om-spin { to { transform: rotate(360deg); } }
.om-ring-hair { fill: none; stroke: var(--om-rule); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0; transition: opacity 1.4s ease 0.4s; }
.om-ring-key { fill: none; stroke: var(--om-accent); stroke-width: 1.3; vector-effect: non-scaling-stroke; stroke-linejoin: miter; stroke-linecap: butt; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; transition: opacity 0.6s ease 0.4s, stroke-dashoffset 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.5s; }
.om-root[data-up="true"] .om-ring-hair { opacity: 0.8; }
.om-root[data-up="true"] .om-ring-key { opacity: 0.55; stroke-dashoffset: 0; }
.om-root[data-phase="unveil"] .om-ring, .om-root[data-phase="landing"] .om-ring, .om-root[data-phase="exit"] .om-ring { transform: translate(-50%, -50%) scale(2.6); opacity: 0; transition: transform 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, opacity 1s ease 0.25s; pointer-events: none; }
.om-root[data-phase="unveil"] .om-ring-key { stroke: var(--om-glow); opacity: 1; filter: drop-shadow(0 0 6px var(--om-glow)); transition: stroke 0.25s ease, opacity 0.25s ease; }
.om-wordlayer { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.om-wordclip { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--om-fs) * (var(--om-cap) + 0.2) + 1.4vh); overflow: visible; }
.om-word { position: absolute; left: 0; right: 0; bottom: calc(var(--om-fs) * var(--om-base) * -1 + 1.4vh); margin: 0; text-align: center; white-space: nowrap; font-family: var(--om-face); font-weight: var(--om-weight); font-size: var(--om-fs); line-height: 1; letter-spacing: calc(var(--om-tracking) * 1em); text-transform: uppercase; transform: translate3d(calc(var(--om-px) * 8px), calc(var(--om-lift) + var(--om-py) * 5px), 0); transition: transform 1.6s cubic-bezier(0.7, 0, 0.18, 1) 0.35s; }
.om-root[data-phase="load"] .om-wordlayer { z-index: 5; }
.om-root[data-phase="load"] .om-word { transition: none; }
.om-l, .om-init { display: inline-block; pointer-events: auto; color: transparent; -webkit-text-stroke: 1px var(--om-word-a); background-image: linear-gradient(to top, var(--om-word) 0%, var(--om-word) calc(var(--om-fill) - 1.2%), var(--om-glow) calc(var(--om-fill) - 0.4%), var(--om-glow) calc(var(--om-fill) + 0.3%), transparent calc(var(--om-fill) + 1.4%)); -webkit-background-clip: text; background-clip: text; opacity: 0; transform: translate3d(0, 10px, 0); transition: opacity 0.9s ease calc(0.5s + var(--i) * 55ms), transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) calc(0.5s + var(--i) * 55ms), -webkit-text-stroke-color 0.4s ease, background-image 0.4s ease; }
.om-root[data-up="true"] .om-l, .om-root[data-up="true"] .om-init { opacity: 1; transform: none; }
.om-root[data-phase="landing"] .om-l, .om-root[data-phase="exit"] .om-l, .om-root[data-phase="unveil"] .om-l, .om-root[data-phase="landing"] .om-init, .om-root[data-phase="exit"] .om-init, .om-root[data-phase="unveil"] .om-init { background-image: linear-gradient(to top, var(--om-word), var(--om-word)); -webkit-text-stroke-color: transparent; }
.om-root[data-phase="landing"] .om-l:hover { background-image: linear-gradient(to top, transparent, transparent); -webkit-text-stroke-color: var(--om-word); transition: background-image 0.25s ease, -webkit-text-stroke-color 0.25s ease; }
.om-root[data-phase="landing"] .om-init, .om-root[data-phase="exit"] .om-init, .om-root[data-phase="unveil"] .om-init { background-image: linear-gradient(to top, var(--om-accent), var(--om-accent)); }
.om-sheen { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, transparent 30%, var(--om-glow-c) 48%, var(--om-glow-d) 50%, var(--om-glow-c) 52%, transparent 70%); background-size: 260% 100%; background-position: 120% 0; opacity: 0; mix-blend-mode: screen; }
.om-root[data-phase="unveil"] .om-sheen { animation: om-sheen 1.1s cubic-bezier(0.4, 0, 0.2, 1) both; }
@keyframes om-sheen { 0% { opacity: 1; background-position: 120% 0; } 100% { opacity: 1; background-position: -40% 0; } }
.om-sp { display: inline-block; width: 0.26em; }
.om-init { font-family: var(--om-script); font-weight: 400; font-size: 1.32em; line-height: 1; letter-spacing: 0; text-transform: none; margin-right: -0.14em; position: relative; z-index: 1; vertical-align: baseline; -webkit-text-stroke-color: var(--om-accent-a); background-image: linear-gradient(to top, var(--om-accent) 0%, var(--om-accent) calc(var(--om-fill) - 1.2%), var(--om-glow) calc(var(--om-fill) - 0.4%), var(--om-glow) calc(var(--om-fill) + 0.3%), transparent calc(var(--om-fill) + 1.4%)); }
.om-cast { position: absolute; inset: 0; pointer-events: none; perspective: 1400px; perspective-origin: 50% 40%; z-index: 2; }
.om-cast-front { z-index: 4; }
.om-root[data-narrow="true"] .om-wordlayer { z-index: 5; }
.om-tilt { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateX(calc(var(--om-py) * var(--om-tilt) * -1deg)) rotateY(calc(var(--om-px) * var(--om-tilt) * 1deg)); }
.om-fig { position: absolute; transform-origin: 50% 100%; transform: translate3d(calc(var(--om-px) * var(--om-depth) * 22px), calc(28% + var(--om-py) * var(--om-depth) * 10px), 0); opacity: 0; filter: brightness(0.6); will-change: transform, opacity; }
.om-root[data-phase="unveil"] .om-fig, .om-root[data-phase="landing"] .om-fig, .om-root[data-phase="exit"] .om-fig { opacity: 1; filter: brightness(var(--om-exposure)); transform: translate3d(calc(var(--om-px) * var(--om-depth) * 22px), calc(var(--om-py) * var(--om-depth) * 10px + var(--om-bob)), 0); transition: transform 2s cubic-bezier(0.16, 1, 0.3, 1) calc(0.65s + var(--i) * 0.24s), opacity 1.2s ease calc(0.65s + var(--i) * 0.24s), filter 2s ease calc(0.65s + var(--i) * 0.24s); }
.om-root[data-phase="landing"] .om-fig { transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1), filter 0.9s ease; }
.om-root[data-phase="landing"] .om-fig[data-near="true"] { filter: brightness(calc(var(--om-exposure) * 1.08)); transform: translate3d(calc(var(--om-px) * var(--om-depth) * 22px), calc(var(--om-py) * var(--om-depth) * 10px - 10px), 0) scale(1.018); }
.om-fig-in { position: absolute; inset: 0; animation: om-bob 9s ease-in-out infinite; animation-delay: calc(var(--i) * -3s); }
@keyframes om-bob { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -0.6%, 0); } }
.om-fig img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: fill; }
.om-fig[data-flip="true"] img { transform: scaleX(-1); }
.om-root[data-duotone="true"] .om-fig img { filter: grayscale(1) contrast(1.12); }
.om-duo { position: absolute; inset: 0; pointer-events: none; display: none; }
.om-root[data-duotone="true"] .om-duo { display: block; }
.om-duo-a { background: var(--om-ground); mix-blend-mode: lighten; }
.om-duo-b { background: var(--om-highlight); mix-blend-mode: multiply; }
.om-fig-shadow { position: absolute; left: 10%; right: 10%; bottom: -1.5%; height: 6%; border-radius: 50%; background: radial-gradient(ellipse at 50% 50%, var(--om-ground-b) 0%, transparent 70%); filter: blur(6px); }
.om-chrome { position: absolute; inset: 0; pointer-events: none; }
.om-chrome > * { pointer-events: auto; }
.om-ui { font-family: var(--om-ui); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500; }
.om-top { position: absolute; left: 0; right: 0; top: 0; height: 64px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 clamp(18px, 3.2vw, 48px); }
.om-rule { position: absolute; left: clamp(18px, 3.2vw, 48px); right: clamp(18px, 3.2vw, 48px); top: 64px; height: 1px; background: var(--om-rule); transform: scaleX(0); transform-origin: 50% 50%; transition: transform 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.2s; }
.om-rule[data-gap="true"] { -webkit-mask-image: linear-gradient(to right, #000 calc(50% - var(--om-gap)), transparent calc(50% - var(--om-gap)), transparent calc(50% + var(--om-gap)), #000 calc(50% + var(--om-gap))); mask-image: linear-gradient(to right, #000 calc(50% - var(--om-gap)), transparent calc(50% - var(--om-gap)), transparent calc(50% + var(--om-gap)), #000 calc(50% + var(--om-gap))); }
.om-root[data-up="true"] .om-rule { transform: scaleX(1); }
.om-eyebrow { position: absolute; left: 50%; top: 64px; transform: translate(-50%, -50%); color: var(--om-muted); font-size: 10.5px; letter-spacing: 0.3em; white-space: nowrap; opacity: 0; transition: opacity 0.9s ease 0.9s; }
.om-root[data-up="true"] .om-eyebrow { opacity: 1; }
.om-navl, .om-navr { display: flex; gap: clamp(18px, 2.4vw, 36px); margin: 0; padding: 0; list-style: none; }
.om-navr { justify-content: flex-end; }
.om-navl li, .om-navr li { opacity: 0; transform: translateY(6px); transition: opacity 0.7s ease calc(0.5s + var(--i) * 70ms), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) calc(0.5s + var(--i) * 70ms); }
.om-root[data-up="true"] .om-navl li, .om-root[data-up="true"] .om-navr li { opacity: 1; transform: none; }
.om-navl a, .om-navl button, .om-navr a, .om-navr button { position: relative; display: inline-block; padding: 6px 0; color: var(--om-text); opacity: 0.8; transition: opacity 0.3s ease; }
.om-navl a:hover, .om-navl button:hover, .om-navr a:hover, .om-navr button:hover { opacity: 1; }
.om-navl a::after, .om-navl button::after, .om-navr a::after, .om-navr button::after { content: ""; position: absolute; left: 0; right: 0; bottom: 2px; height: 1px; background: currentColor; transform: scaleX(0); transform-origin: 0 50%; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.om-navl a:hover::after, .om-navl button:hover::after, .om-navr a:hover::after, .om-navr button:hover::after { transform: scaleX(1); }
.om-brand { font-family: var(--om-serif); font-size: 22px; font-style: italic; letter-spacing: 0.02em; text-transform: none; font-weight: 400; color: var(--om-text); opacity: 0; transition: opacity 0.9s ease 0.4s; }
.om-root[data-up="true"] .om-brand { opacity: 1; }
.om-pill { position: absolute; top: 96px; padding: 7px 15px 6px; border: 1px solid var(--om-rule); border-radius: 999px; color: var(--om-text); font-size: 10.5px; letter-spacing: 0.24em; white-space: nowrap; opacity: 0; transform: translateY(4px); transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.om-pill-l { left: clamp(18px, 7vw, 120px); }
.om-pill-r { right: clamp(18px, 7vw, 120px); }
.om-root[data-pills="1"] .om-pill-l, .om-root[data-pills="2"] .om-pill { opacity: 1; transform: none; }
.om-star { position: absolute; width: 18px; height: 18px; color: var(--om-accent); opacity: 0; transform: scale(0.4) rotate(-30deg); transition: opacity 0.9s ease calc(0.6s + var(--i) * 140ms), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1) calc(0.6s + var(--i) * 140ms), left 1.6s cubic-bezier(0.16, 1, 0.3, 1), top 1.6s cubic-bezier(0.16, 1, 0.3, 1); }
.om-root[data-up="true"] .om-star { opacity: 1; transform: none; }
.om-star svg { display: block; width: 100%; height: 100%; animation: om-twinkle 3.6s ease-in-out infinite; animation-delay: calc(var(--i) * -0.9s); transform-origin: 50% 50%; }
.om-star-s { width: 10px; height: 10px; }
.om-root[data-phase="landing"] .om-star-c, .om-root[data-phase="exit"] .om-star-c { opacity: 0; transition: opacity 0.8s ease 0.8s; }
@keyframes om-twinkle { 0%, 100% { transform: scale(0.72) rotate(0deg); opacity: 0.55; } 50% { transform: scale(1) rotate(12deg); opacity: 1; } }
.om-aside { position: absolute; top: 40%; width: 200px; font-size: 11.5px; line-height: 1.65; letter-spacing: 0.01em; color: var(--om-muted); text-shadow: 0 1px 14px var(--om-ground-c), 0 0 2px var(--om-ground-c); opacity: 0; transform: translateY(10px); transition: opacity 1s ease, transform 1s cubic-bezier(0.16, 1, 0.3, 1); }
.om-aside-l { left: clamp(18px, 7vw, 120px); }
.om-aside-r { right: clamp(18px, 7vw, 120px); text-align: right; }
.om-aside b { display: block; margin-bottom: 8px; font-weight: 500; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--om-accent); }
.om-aside p { margin: 0; }
.om-root[data-phase="landing"] .om-aside, .om-root[data-phase="exit"] .om-aside { opacity: 1; transform: none; }
.om-root[data-phase="landing"] .om-aside-l { transition-delay: 2.1s; }
.om-root[data-phase="landing"] .om-aside-r { transition-delay: 2.25s; }
.om-counter { position: absolute; right: clamp(18px, 3.2vw, 48px); bottom: clamp(18px, 3.2vw, 44px); text-align: right; opacity: 0; transform: translateY(8px); transition: opacity 0.9s ease 0.7s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.7s; }
.om-root[data-up="true"] .om-counter { opacity: 1; transform: none; }
.om-num { margin: 0; font-family: var(--om-serif); font-weight: 400; font-size: clamp(64px, 11vh, 120px); line-height: 0.9; letter-spacing: -0.02em; color: var(--om-text); font-variant-numeric: tabular-nums lining-nums; }
.om-ratio { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 10px; color: var(--om-muted); font-size: 10.5px; letter-spacing: 0.26em; white-space: nowrap; font-variant-numeric: tabular-nums; }
.om-ratio i { display: block; width: 22px; height: 1px; background: var(--om-rule); }
.om-root[data-phase="unveil"] .om-counter, .om-root[data-phase="landing"] .om-counter, .om-root[data-phase="exit"] .om-counter { opacity: 0; filter: blur(6px); transition: opacity 0.5s ease 0.1s, filter 0.5s ease 0.1s; pointer-events: none; }
.om-copy { position: absolute; left: 50%; top: 16.5%; transform: translateX(-50%); width: min(88vw, 760px); text-align: center; }
.om-tagline { margin: 0; font-family: var(--om-serif); font-style: italic; font-weight: 400; font-size: clamp(22px, 2.9vw, 42px); line-height: 1.15; letter-spacing: 0.005em; color: var(--om-text); text-shadow: 0 1px 24px var(--om-ground-c); }
.om-tagline span { display: inline-block; opacity: 0; transform: translateY(14px); transition: opacity 0.8s ease calc(1.7s + var(--i) * 55ms), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) calc(1.7s + var(--i) * 55ms); }
.om-root[data-phase="landing"] .om-tagline span, .om-root[data-phase="exit"] .om-tagline span, .om-root[data-phase="unveil"] .om-tagline span { opacity: 1; transform: none; }
.om-root .om-cta { display: inline-block; margin-top: 26px; padding: 13px 30px 12px; border: 1px solid var(--om-text); color: var(--om-text); background: var(--om-ground-d); font-family: var(--om-ui); font-size: 11.5px; letter-spacing: 0.26em; text-transform: uppercase; font-weight: 500; opacity: 0; transform: translateY(10px) scale(0.98); transition: opacity 0.8s ease 2.2s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 2.2s, background-color 0.35s ease, color 0.35s ease; }
.om-root[data-phase="landing"] .om-cta, .om-root[data-phase="exit"] .om-cta, .om-root[data-phase="unveil"] .om-cta { opacity: 1; transform: none; }
.om-root .om-cta:hover { background: var(--om-text); color: var(--om-stage); }
.om-ann { position: absolute; width: 58px; height: 30px; color: var(--om-text); opacity: 0; transform: scale(0.7); transform-origin: 0 0; transition: opacity 0.6s ease calc(2.3s + var(--i) * 160ms), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) calc(2.3s + var(--i) * 160ms); }
.om-root[data-phase="landing"] .om-ann, .om-root[data-phase="exit"] .om-ann { opacity: 1; transform: none; }
.om-ann svg { display: block; width: 58px; height: 30px; overflow: visible; }
.om-ann span { position: absolute; left: 62px; top: 11px; font-size: 10px; letter-spacing: 0.16em; font-variant-numeric: tabular-nums; white-space: nowrap; text-shadow: 0 1px 10px var(--om-ground-c); }
.om-root[data-tone="vellum"] .om-ann { color: var(--om-accent); }
.om-foot { position: absolute; left: clamp(18px, 3.2vw, 48px); right: clamp(18px, 3.2vw, 48px); bottom: clamp(16px, 2.6vw, 30px); display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; transition: bottom 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.6s; }
.om-root[data-phase="unveil"] .om-foot, .om-root[data-phase="landing"] .om-foot, .om-root[data-phase="exit"] .om-foot { bottom: calc(var(--om-fs) * (var(--om-cap) + 0.03) + 1.4vh + 18px); }
.om-bars { display: block; width: 92px; height: 22px; color: var(--om-text); opacity: 0; transition: opacity 1s ease 1s; }
.om-root[data-up="true"] .om-bars { opacity: 0.75; }
.om-plate { color: var(--om-muted); font-size: 10.5px; letter-spacing: 0.26em; opacity: 0; text-shadow: 0 1px 12px var(--om-ground-c); transition: opacity 1s ease 1.1s; }
.om-root[data-up="true"] .om-plate { opacity: 1; }
.om-root[data-phase="load"] .om-plate { display: none; }
.om-skip { position: absolute; left: 50%; bottom: clamp(16px, 2.6vw, 30px); transform: translateX(-50%); color: var(--om-muted); font-size: 10.5px; letter-spacing: 0.3em; padding: 6px 10px; opacity: 0; transition: opacity 0.8s ease 1.6s, color 0.3s ease; }
.om-root[data-up="true"][data-phase="load"] .om-skip { opacity: 1; }
.om-skip:hover { color: var(--om-text); }
.om-hint { position: absolute; left: 50%; bottom: clamp(14px, 2vw, 24px); transform: translateX(-50%); display: flex; align-items: center; gap: 10px; color: var(--om-muted); font-size: 9.5px; letter-spacing: 0.3em; opacity: 0; transition: opacity 1s ease 3s; }
.om-hint i { display: block; width: 1px; height: 26px; background: linear-gradient(to bottom, transparent, var(--om-text)); animation: om-hint 2.2s ease-in-out infinite; }
@keyframes om-hint { 0% { transform: scaleY(0); transform-origin: 0 0; } 50% { transform: scaleY(1); transform-origin: 0 0; } 51% { transform-origin: 0 100%; } 100% { transform: scaleY(0); transform-origin: 0 100%; } }
.om-root[data-phase="landing"][data-gate="true"] .om-hint { opacity: 1; }
.om-root[data-phase="load"] .om-copy, .om-root[data-phase="load"] .om-ann, .om-root[data-phase="load"] .om-aside { visibility: hidden; }
.om-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 1023px) { .om-aside { display: none; } }
@media (max-width: 639px) {
  .om-navl, .om-navr { display: none; }
  .om-top { grid-template-columns: 1fr; justify-items: center; }
  .om-pill { top: 86px; }
  .om-pill-l { left: 18px; }
  .om-pill-r { right: 18px; }
  .om-copy { top: 19%; width: 88vw; }
  .om-star { top: 15.5% !important; }
  .om-star-s { top: 72% !important; }
  .om-tagline { font-size: clamp(19px, 6vw, 26px); }
  .om-root .om-cta { margin-top: 18px; padding: 11px 22px 10px; }
  .om-ann { display: none; }
  .om-num { font-size: 56px; }
  .om-foot { bottom: 14px; }
  .om-skip { bottom: 17%; }
  .om-hint { left: 18px; transform: none; }
}
.om-root[data-instant="true"] *, .om-root[data-instant="true"] *::before, .om-root[data-instant="true"] *::after { transition-duration: 0s !important; transition-delay: 0s !important; animation-duration: 0s !important; }
@media (prefers-reduced-motion: reduce) {
  .om-root { --om-px: 0 !important; --om-py: 0 !important; --om-tilt: 0 !important; --om-bob: 0px !important; }
  .om-star svg, .om-grain, .om-ring-spin, .om-fig-in, .om-hint i { animation: none; }
  .om-word { transition: transform 0.01s linear 0.35s; }
  .om-fig { transition-duration: 0.9s !important; }
  .om-root[data-phase="unveil"] .om-ring, .om-root[data-phase="landing"] .om-ring { transform: translate(-50%, -50%); transition: opacity 0.6s ease; }
  .om-root[data-phase="unveil"] .om-flood, .om-root[data-phase="landing"] .om-flood { transition-duration: 0.6s; }
  .om-root[data-phase="unveil"] .om-sheen { animation: none; }
  .om-root[data-phase="exit"] .om-stage { transition-duration: 0.6s; }
  .om-root[data-phase="exit"] .om-cast { transform: none; }
  .om-ring-key { transition: opacity 0.6s ease 0.4s; }
}
/* Nalea: the stage sits over the product page and lifts off it. */
.om-root.nalea-om { position: fixed !important; inset: 0; z-index: 2147483000; background: transparent; }
.om-root.nalea-om[data-phase="exit"] { pointer-events: none; }
`;

  var STAR_PATH = "M12 0C12.6 6.8 17.2 11.4 24 12C17.2 12.6 12.6 17.2 12 24C11.4 17.2 6.8 12.6 0 12C6.8 11.4 11.4 6.8 12 0Z";
  var STARS = [
    { x: "4.4%", y: "15%", small: false, under: false },
    { x: "95%", y: "15%", small: false, under: false },
    { x: "7.5%", y: "72%", small: true, under: false },
    { x: "92.5%", y: "70%", small: true, under: false },
    { x: "50%", y: "84%", small: true, under: true }
  ];
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, cls, attrs, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function start() {
    var pal = TONES[P.tone];
    var faceDef = FACES[P.face];
    var isDuotone = P.tone === "carmine";
    var uid = "om" + Math.random().toString(36).slice(2, 8);
    var chars = omSplit(P.wordmark, false);
    var reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    var style = el("style", null, null, document.head);
    style.textContent = OM_CSS;
    if (!document.querySelector('link[data-om-fonts="' + FONT_HREF + '"]')) {
      var link = el("link", null, { rel: "stylesheet", href: FONT_HREF, "data-om-fonts": FONT_HREF }, document.head);
    }

    /* ---- the DOM, as the original renders it ---- */
    var root = el("div", "om-root nalea-om", { "data-phase": "load", "data-tone": P.tone, "data-face": P.face, "data-up": "false", "data-pills": "0", "data-duotone": isDuotone ? "true" : "false", "data-instant": "false", "data-gate": "true", "data-narrow": "false", tabindex: "0", "aria-busy": "true", role: "dialog", "aria-label": "Nalea xoxo" });
    var defs = sv("svg", { "class": "om-defs", "aria-hidden": "true", focusable: "false" }, root);
    var defsIn = sv("defs", null, defs);
    var stage = el("div", "om-stage", null, root);
    el("div", "om-flood", null, stage);
    var back = el("img", "om-backdrop", { src: P.backdrop, alt: "", draggable: "false", decoding: "async" }, stage);
    back.style.maxWidth = "none";

    var ring = sv("svg", { "class": "om-ring", viewBox: "0 0 400 400", "aria-hidden": "true" }, stage);
    var spin = sv("g", { "class": "om-ring-spin" }, ring);
    sv("circle", { "class": "om-ring-hair", cx: 200, cy: 200, r: 198 }, spin);
    sv("circle", { "class": "om-ring-hair", cx: 200, cy: 200, r: 154 }, spin);
    sv("path", { "class": "om-ring-key", d: omMeander(200, 200, 176, 22, 32), pathLength: 1 }, spin);

    var wl = el("div", "om-wordlayer", null, stage);
    var wc = el("div", "om-wordclip", null, wl);
    var word = el("h1", "om-word", { "aria-label": P.wordmark }, wc);
    word.style.setProperty("--om-fill", "0%");
    chars.rest.forEach(function (ch, k) {
      if (ch === " ") { el("span", "om-sp", { "aria-hidden": "true" }, word); return; }
      var s = el("span", "om-l", { "aria-hidden": "true" }, word);
      s.style.setProperty("--i", k);
      s.textContent = ch;
    });
    el("div", "om-sheen", { "aria-hidden": "true" }, wl);

    var castBack = el("div", "om-cast", { "aria-hidden": "true" }, stage);
    var tiltBack = el("div", "om-tilt", null, castBack);
    var castFront = el("div", "om-cast om-cast-front", { "aria-hidden": "true" }, stage);
    var tiltFront = el("div", "om-tilt", null, castFront);

    var light = el("canvas", "om-light", { "aria-hidden": "true" }, stage);
    el("div", "om-spot", null, stage);
    el("div", "om-vignette", null, stage);
    var grainEl = el("div", "om-grain", { "aria-hidden": "true" }, stage);
    grainEl.style.backgroundImage = "url(" + paintGrain(omHash(P.wordmark) ^ 0x9e3779b9) + ")";
    el("div", "om-flash", { "aria-hidden": "true" }, stage);

    var chrome = el("div", "om-chrome", null, stage);
    var top = el("header", "om-top om-ui", null, chrome);
    var half = Math.ceil(P.nav.length / 2);
    [["Primary, left", "om-navl", P.nav.slice(0, half), 0], [null, null, null, 0], ["Primary, right", "om-navr", P.nav.slice(half), half]].forEach(function (g, gi) {
      if (gi === 1) { var b = el("div", "om-brand", null, top); b.textContent = P.brand; return; }
      var nav = el("nav", null, { "aria-label": g[0] }, top);
      var ul = el("ul", g[1], null, nav);
      g[2].forEach(function (l, k) {
        var li = el("li", null, null, ul);
        li.style.setProperty("--i", k + g[3]);
        var a = l.href ? el("a", null, { href: l.href }, li) : el("button", null, { type: "button" }, li);
        a.textContent = l.label;
      });
    });
    el("div", "om-rule", { "data-gap": P.eyebrow ? "true" : "false", "aria-hidden": "true" }, chrome);
    var eyebrow = el("div", "om-eyebrow om-ui", null, chrome);
    eyebrow.textContent = P.eyebrow;
    if (P.labels[0]) el("div", "om-pill om-pill-l om-ui", null, chrome).textContent = P.labels[0];
    if (P.labels[1]) el("div", "om-pill om-pill-r om-ui", null, chrome).textContent = P.labels[1];
    STARS.forEach(function (s, k) {
      var d = el("div", "om-star" + (s.small ? " om-star-s" : "") + (s.under ? " om-star-c" : ""), { "aria-hidden": "true" }, chrome);
      d.style.left = s.x; d.style.top = s.y; d.style.setProperty("--i", k);
      var g = sv("svg", { viewBox: "0 0 24 24" }, d);
      sv("path", { d: STAR_PATH, fill: "currentColor" }, g);
    });
    P.asides.forEach(function (a, k) {
      var as = el("aside", "om-aside " + (k ? "om-aside-r" : "om-aside-l"), null, chrome);
      el("b", null, null, as).textContent = a.title;
      el("p", null, null, as).textContent = a.text;
    });
    var counter = el("div", "om-counter", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0", "aria-label": P.loadingLabel }, chrome);
    var num = el("span", null, null, el("p", "om-num", { "aria-hidden": "true" }, counter));
    num.textContent = "0";
    var ratioWrap = el("div", "om-ratio om-ui", { "aria-hidden": "true" }, counter);
    var ratio = el("span", null, null, ratioWrap);
    ratio.textContent = "0.0000";
    el("i", null, null, ratioWrap);
    el("span", null, null, ratioWrap).textContent = P.loadingLabel;

    var copy = el("div", "om-copy", null, chrome);
    var tag = el("p", "om-tagline", null, copy);
    var words = P.tagline.split(/\s+/).filter(Boolean);
    words.forEach(function (w, k) {
      var s = el("span", null, null, tag); s.style.setProperty("--i", k); s.textContent = w;
      if (k < words.length - 1) tag.appendChild(document.createTextNode(" "));
    });
    var cta = el("a", "om-cta", { href: P.cta.href }, copy);
    cta.textContent = P.cta.label;

    P.annotations.forEach(function (a, k) {
      var d = el("div", "om-ann", { "aria-hidden": "true" }, chrome);
      d.style.left = a.x + "%"; d.style.top = a.y + "%"; d.style.setProperty("--i", k);
      var g = sv("svg", { viewBox: "0 0 58 30", fill: "none", stroke: "currentColor", "stroke-width": "1" }, d);
      sv("path", { d: "M0.5 8V0.5H8M50 0.5H57.5V8M57.5 22V29.5H50M8 29.5H0.5V22" }, g);
      el("span", "om-ui", null, d).textContent = a.label;
    });
    var foot = el("div", "om-foot", null, chrome);
    var barsSvg = sv("svg", { "class": "om-bars", viewBox: "0 0 92 22", "aria-hidden": "true" }, foot);
    omBars(omHash(P.wordmark), 34, 92).forEach(function (b) { sv("rect", { x: b.x, y: 0, width: b.w, height: 22, fill: "currentColor" }, barsSvg); });
    var plate = el("div", "om-plate om-ui", null, foot);
    plate.textContent = P.plate + " \u00b7 ";
    el("span", null, null, plate).textContent = "1.0000";
    var skip = el("button", "om-skip om-ui", { type: "button" }, chrome);
    skip.textContent = "Skip";
    var hint = el("div", "om-hint om-ui", { "aria-hidden": "true" }, chrome);
    el("i", null, null, hint);
    el("span", null, null, hint).textContent = "Scroll";
    el("div", "om-live", { "aria-live": "polite" }, chrome);

    /* palette variables */
    var vars = {
      "--om-stage": pal.stage, "--om-stage-l": hexMix(pal.stage, pal.glow, 0.14), "--om-stage-d": hexMix(pal.stage, pal.ground, 0.55),
      "--om-ground": pal.ground, "--om-ground-a": hexAlpha(pal.ground, 0.85), "--om-ground-b": hexAlpha(pal.ground, 0.7), "--om-ground-c": hexAlpha(pal.ground, 0.6), "--om-ground-d": hexAlpha(pal.ground, 0.3),
      "--om-text": pal.text, "--om-muted": pal.muted, "--om-accent": pal.accent, "--om-accent-a": hexAlpha(pal.accent, 0.75), "--om-word": pal.word, "--om-word-a": hexAlpha(pal.word, 0.7),
      "--om-rule": pal.rule, "--om-glow": pal.glow, "--om-highlight": pal.highlight, "--om-glow-a": hexAlpha(pal.glow, 0.22), "--om-glow-b": hexAlpha(pal.glow, 0.55), "--om-glow-c": hexAlpha(pal.glow, 0.25), "--om-glow-d": hexAlpha(pal.glow, 0.75),
      "--om-face": faceDef.family, "--om-weight": String(faceDef.weight), "--om-tracking": String(faceDef.tracking), "--om-script": SCRIPT_FAMILY, "--om-ui": UI_FAMILY, "--om-serif": SERIF_FAMILY,
      "--om-exposure": String(Math.max(0.2, P.exposure)), "--om-tilt": String(Math.max(0, P.tilt)), "--om-bob": "0px", "--om-grain": "0.11"
    };
    for (var v in vars) root.style.setProperty(v, vars[v]);
    root.style.height = "100svh";

    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.appendChild(root);

    /* ---- state ---- */
    var phase = "load", pct = 0, size = { w: 0, h: 0 }, naturals = {}, fs = 120, metrics = { base: 0.16, cap: 0.7 };
    var rushed = false, shown = 0, pctShown = 0;
    var pt = { tx: 0, ty: 0, x: 0, y: 0, sx: 50, sy: 40, near: -1, inside: false };
    var centres = [], figEls = [];
    var narrow = false;

    function setPhase(p) {
      phase = p;
      root.setAttribute("data-phase", p);
      root.setAttribute("aria-busy", p === "load" ? "true" : "false");
      if (p !== "load") { skip.style.display = "none"; root.style.setProperty("--om-lift", "0px"); }
      if (p === "unveil") setTimeout(function () { setPhase("landing"); }, UNVEIL_MS);
      if (p === "landing") {
        root.querySelector(".om-live").textContent = P.wordmark + ". " + P.tagline;
        if (P.holdMs > 0) setTimeout(function () { if (phase === "landing") setPhase("exit"); }, P.holdMs);
      }
      if (p === "exit") setTimeout(done, EXIT_MS);
    }
    function done() {
      phase = "done";
      cancelAnimationFrame(raf); cancelAnimationFrame(lraf);
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener("resize", onResize);
      root.remove(); style.remove();
    }
    function lift() { if (phase === "landing") setPhase("exit"); }

    function cast() { return P.figures.filter(function (f) { return !narrow || f.phone !== false; }); }

    /* fit, metrics, figures, masks, backdrop, ring: everything that hangs on the size */
    function layout() {
      if (phase === "done") return;
      var r = stage.getBoundingClientRect();
      size = { w: r.width, h: r.height };
      narrow = size.w > 0 && size.w < 640;
      root.setAttribute("data-narrow", narrow ? "true" : "false");
      var ctx = document.createElement("canvas").getContext("2d");
      if (ctx && size.w && size.h) {
        var rest = chars.rest.join("").toUpperCase();
        ctx.font = faceDef.weight + " 100px " + faceDef.family;
        var hm = ctx.measureText("H");
        var cap = hm.actualBoundingBoxAscent > 0 ? hm.actualBoundingBoxAscent / 100 : 0.7;
        metrics = { base: omBaseline(hm.fontBoundingBoxAscent / 100, hm.fontBoundingBoxDescent / 100), cap: Math.round(cap * 100) / 100 };
        var w100 = ctx.measureText(rest).width + Math.max(0, chars.rest.length - 1) * faceDef.tracking * 100;
        var pad = Math.max(10, size.w * 0.025);
        fs = Math.round(omFit(w100, size.w - pad * 2, (size.h * 0.34) / cap, 36));
      }
      root.style.setProperty("--om-fs", fs + "px");
      root.style.setProperty("--om-base", String(metrics.base));
      root.style.setProperty("--om-cap", String(metrics.cap));
      var wordBottomPx = fs * metrics.base * -1 + size.h * 0.014;
      var wordMid = wordBottomPx + (fs * metrics.cap) / 2;
      var liftPx = phase === "load" && size.h ? -(size.h / 2 - wordMid) : 0;
      root.style.setProperty("--om-lift", Math.round(liftPx) + "px");
      root.style.setProperty("--om-ring", Math.round(Math.max(260, Math.min(760, Math.min(size.w || 900, size.h || 700) * 0.78))) + "px");
      root.style.setProperty("--om-gap", Math.round(eyebrow.offsetWidth / 2 + 14) + "px");

      var bn = naturals[P.backdrop];
      var bb = omCover(bn ? bn.w : 0, bn ? bn.h : 0, size.w, size.h, 0.5, 0.4);
      back.style.left = bb.x + "px"; back.style.top = bb.y + "px";
      back.style.width = bb.w ? bb.w + "px" : "100%"; back.style.height = bb.h ? bb.h + "px" : "100%";

      /* the cast */
      while (defsIn.firstChild) defsIn.removeChild(defsIn.firstChild);
      tiltBack.innerHTML = ""; tiltFront.innerHTML = ""; figEls = [];
      var list = cast();
      centres = list.map(function (f) { return f.x / 100; });
      list.forEach(function (f, i) {
        var nat = naturals[f.src];
        var box = omFigureBox(f.x, f.y == null ? 100 : f.y, f.h, nat ? nat.w / nat.h : 0.62, size.w, size.h);
        var tr = omTransfer(f.threshold == null ? (f.subject === "dark" ? 0.72 : 0.2) : f.threshold, f.softness == null ? 0.16 : f.softness, f.subject || "light");
        var filt = sv("filter", { id: uid + "-k" + i, "color-interpolation-filters": "sRGB", x: "0", y: "0", width: "1", height: "1" }, defsIn);
        sv("feColorMatrix", { type: "matrix", values: "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0" }, filt);
        var ct = sv("feComponentTransfer", null, filt);
        ["feFuncR", "feFuncG", "feFuncB"].forEach(function (fn) { sv(fn, { type: "linear", slope: tr.slope, intercept: tr.intercept }, ct); });
        if (!(box.w > 0)) return;
        var mask = sv("mask", { id: uid + "-m" + i, maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse", x: "0", y: "0", width: box.w, height: box.h }, defsIn);
        mask.style.maskType = "luminance";
        var mi = sv("image", { href: f.src, x: "0", y: "0", width: box.w, height: box.h, preserveAspectRatio: "none", filter: "url(#" + uid + "-k" + i + ")" }, mask);
        if (f.flip) mi.setAttribute("transform", "translate(" + box.w + " 0) scale(-1 1)");
        var front = (f.depth == null ? 1 : f.depth) >= P.wordDepth;
        var fig = el("div", "om-fig", { "data-index": i, "data-flip": f.flip ? "true" : "false", "data-near": "false" }, front ? tiltFront : tiltBack);
        fig.style.left = box.left + "px"; fig.style.top = box.top + "px"; fig.style.width = box.w + "px"; fig.style.height = box.h + "px";
        fig.style.setProperty("--i", i); fig.style.setProperty("--om-depth", f.depth == null ? 1 : f.depth); fig.style.zIndex = Math.round((f.depth == null ? 1 : f.depth) * 100);
        el("div", "om-fig-shadow", null, fig);
        var fin = el("div", "om-fig-in", null, fig);
        fin.style.webkitMask = "url(#" + uid + "-m" + i + ")"; fin.style.mask = "url(#" + uid + "-m" + i + ")";
        var img = el("img", null, { src: f.src, alt: f.alt || "", draggable: "false", decoding: "async" }, fin);
        img.style.maxWidth = "none";
        el("div", "om-duo om-duo-a", null, fin); el("div", "om-duo om-duo-b", null, fin);
        figEls.push(fig);
      });
      paintLight();
    }

    /* natural sizes */
    P.figures.map(function (f) { return f.src; }).concat([P.backdrop]).forEach(function (src) {
      var im = new Image();
      im.onload = function () { if (!naturals[src]) { naturals[src] = { w: im.naturalWidth, h: im.naturalHeight }; layout(); } };
      im.src = src;
    });

    /* fonts */
    var fonts = document.fonts;
    if (fonts && fonts.load) {
      Promise.all(FONT_PROBES.map(function (f) { return fonts.load(f).catch(function () { return null; }); })).then(layout, layout);
      fonts.addEventListener("loadingdone", layout);
    }
    setTimeout(layout, 2500);
    var rt;
    function onResize() { clearTimeout(rt); rt = setTimeout(layout, 60); }
    window.addEventListener("resize", onResize);

    /* curtain up */
    setTimeout(function () { root.setAttribute("data-up", "true"); }, 60);

    /* the load, parallax and nearest figure, one frame loop */
    var raf = 0, last = performance.now(), t0 = last, loadDone = false;
    function tick(now) {
      var dt = Math.min(64, now - last); last = now;
      if (!loadDone) {
        var elapsed = now - t0;
        var target = omSimulated(elapsed / Math.max(400, P.durationMs));
        if (rushed) target = 1;
        var k = 1 - Math.exp(-dt / (rushed ? 90 : 170));
        var s = shown + (target - shown) * k;
        if (target >= 1 && s > 0.995) s = 1;
        shown = Math.max(shown, s);
        word.style.setProperty("--om-fill", (shown * 100).toFixed(2) + "%");
        var p = Math.round(shown * 100);
        if (p !== pctShown) {
          pctShown = p; num.textContent = String(p); ratio.textContent = omRatio(shown);
          if (p % 10 === 0 || p === 100) { pct = p; counter.setAttribute("aria-valuenow", p); root.setAttribute("data-pills", pct >= 50 ? "2" : pct >= 20 ? "1" : "0"); }
        }
        if (shown >= 1 && (elapsed >= P.minLoadMs || rushed)) {
          loadDone = true;
          word.style.setProperty("--om-fill", "102%");
          root.setAttribute("data-pills", "2");
          setPhase("unveil");
        }
      }
      if (!reduced) {
        var e = 1 - Math.exp(-dt / 240);
        pt.x += (pt.tx - pt.x) * e; pt.y += (pt.ty - pt.y) * e;
        pt.sx += (50 + pt.tx * 24 - pt.sx) * e; pt.sy += (40 + pt.ty * 22 - pt.sy) * e;
        root.style.setProperty("--om-px", pt.x.toFixed(3));
        root.style.setProperty("--om-py", pt.y.toFixed(3));
        root.style.setProperty("--om-sx", pt.sx.toFixed(2) + "%");
        root.style.setProperty("--om-sy", pt.sy.toFixed(2) + "%");
        var near = pt.inside && phase === "landing" ? omNearest((pt.tx + 1) / 2, centres, 0.22) : -1;
        if (near !== pt.near) {
          pt.near = near;
          figEls.forEach(function (f) { f.setAttribute("data-near", f.getAttribute("data-index") === String(near) ? "true" : "false"); });
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    /* the light: shafts and dust */
    var lraf = 0;
    function paintLight() {
      cancelAnimationFrame(lraf);
      var ctx = light.getContext("2d");
      if (!ctx || !size.w || !size.h || (!P.rays && !P.dust)) return;
      var dpr = Math.min(1.5, window.devicePixelRatio || 1);
      var w = Math.round(size.w), h = Math.round(size.h);
      light.width = Math.round(w * dpr); light.height = Math.round(h * dpr);
      var rnd = omRng(omHash(P.wordmark) ^ 0x51ed27);
      var motes = [], n = P.dust ? Math.round(Math.min(140, (w * h) / 11000)) : 0, i;
      for (i = 0; i < n; i++) motes.push({ x: rnd() * w, y: rnd() * h, r: 0.5 + rnd() * 1.3, vx: (rnd() - 0.5) * 6, vy: -4 - rnd() * 9, a: rnd() * Math.PI * 2, s: 0.6 + rnd() * 1.2 });
      var shafts = [];
      for (i = 0; i < (P.rays ? 7 : 0); i++) shafts.push({ a: -0.46 + (i / 6) * 0.92 + (rnd() - 0.5) * 0.08, w: 0.035 + rnd() * 0.05, k: 0.6 + rnd() * 0.8, o: rnd() * Math.PI * 2 });
      var glow = pal.glow, lastL = performance.now();
      function draw(now) {
        var dt = Math.min(64, now - lastL) / 1000; lastL = now;
        var t = now / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        var ox = w * 0.5, oy = -h * 0.55, len = h * 1.9;
        shafts.forEach(function (s) {
          var a = Math.PI / 2 + s.a + Math.sin(t * 0.11 * s.k + s.o) * 0.05;
          var alpha = 0.055 * (0.7 + 0.3 * Math.sin(t * 0.23 * s.k + s.o));
          var g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
          g.addColorStop(0, hexAlpha(glow, alpha)); g.addColorStop(0.55, hexAlpha(glow, alpha * 0.5)); g.addColorStop(1, hexAlpha(glow, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(a - s.w) * len, oy + Math.sin(a - s.w) * len);
          ctx.lineTo(ox + Math.cos(a + s.w) * len, oy + Math.sin(a + s.w) * len);
          ctx.closePath(); ctx.fill();
        });
        motes.forEach(function (m) {
          if (!reduced) {
            m.x += (m.vx + Math.sin(t * m.s + m.a) * 4) * dt; m.y += m.vy * dt;
            if (m.y < -4) { m.y = h + 4; m.x = rnd() * w; }
            if (m.x < -4) m.x = w + 4; if (m.x > w + 4) m.x = -4;
          }
          var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 * m.s + m.a));
          ctx.fillStyle = hexAlpha(glow, 0.55 * tw);
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        });
        if (!reduced && phase !== "done") lraf = requestAnimationFrame(draw);
      }
      lraf = requestAnimationFrame(draw);
    }

    /* input */
    function rush() { if (P.skippable && phase === "load") rushed = true; }
    root.addEventListener("click", rush);
    skip.addEventListener("click", rush);
    root.addEventListener("keydown", function (e) {
      if (phase === "load" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); rush(); }
      if (e.key === "Escape") { if (phase === "load") rush(); else lift(); }
    });
    root.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      pt.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      pt.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      pt.inside = true;
    });
    root.addEventListener("pointerleave", function () { pt.tx = 0; pt.ty = 0; pt.inside = false; });
    var y0 = -1;
    root.addEventListener("wheel", function (e) { if (P.scrollToEnter && e.deltaY > 12) lift(); }, { passive: true });
    root.addEventListener("touchstart", function (e) { y0 = e.touches[0] ? e.touches[0].clientY : -1; }, { passive: true });
    root.addEventListener("touchmove", function (e) { var y = e.touches[0] && e.touches[0].clientY; if (P.scrollToEnter && y0 >= 0 && y != null && y0 - y > 40) lift(); }, { passive: true });

    layout();
    root.focus({ preventScroll: true });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
