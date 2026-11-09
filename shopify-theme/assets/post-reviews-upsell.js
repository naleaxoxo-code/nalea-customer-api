/* Post-reviews upsells — Nalea XoXo
 * 1) Clothing rail   — "Complete The Moment"      (related 1-4)
 * 2) Orbit carousel  — "Add These For Under R49"  (10 shuffled, <= R49)
 * 3) Runway lookbook — "You'll Also Adore"        (related 5-8)
 * Compact (~60svh each), one continuous background that matches the product
 * hero + reviews tint. Arrows, swipe and gentle autoplay — no scroll pinning.
 */
(function () {
  var PRICE_CAP_CENTS = 4900;
  var ACCENTS = ["#f6a37c", "#f2a6c6", "#bcd98e", "#f5d26a", "#9fcbe8", "#c9b3f0", "#f4b183", "#a8e0d1", "#e8cb82", "#f7a8a8"];
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function money(c) { return "R" + (c / 100).toFixed(2).replace(/\.00$/, ""); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
  function strip(h) { var d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function sized(src, w) {
    if (!src) return "";
    if (src.indexOf("//") === 0) src = "https:" + src;
    return src.indexOf("cdn.shopify") > -1 || src.indexOf("/cdn/shop") > -1 ? src.replace(/(\?|&)width=\d+/, "") + (src.indexOf("?") > -1 ? "&" : "?") + "width=" + w : src;
  }

  function normStore(p) {
    var v = (p.variants && p.variants[0]) || {};
    var price = Math.round(parseFloat(v.price || "0") * 100);
    var cmp = v.compare_at_price ? Math.round(parseFloat(v.compare_at_price) * 100) : null;
    var imgs = (p.images || []).map(function (i) { return i.src || i; });
    return { url: "/products/" + p.handle, title: p.title, type: p.product_type || "", price: price, compare_at_price: cmp, images: imgs, featured_image: imgs[0] || "", desc: strip(p.body_html), variants: [{ id: v.id, price: price, available: v.available !== false }] };
  }
  function normRec(p) {
    var imgs = (p.images || []).map(function (i) { return typeof i === "string" ? i : i.src; });
    var v = (p.variants && p.variants[0]) || {};
    var pr = typeof p.price === "number" ? p.price : Math.round(parseFloat(v.price || "0") * (String(v.price || "").indexOf(".") > -1 ? 100 : 1));
    return { url: p.url || "/products/" + p.handle, title: p.title, type: p.type || p.product_type || "", price: pr, compare_at_price: p.compare_at_price || null, images: imgs, featured_image: p.featured_image || imgs[0] || "", desc: strip(p.description || p.body_html), variants: [{ id: v.id, price: pr, available: v.available !== false }] };
  }

  function findAnchor() {
    var e = document.getElementById("npRevSection") || document.querySelector(".np-reviews");
    if (e) { var s = e.closest("[id^='shopify-section-']") || e; return { el: s, pos: "afterend" }; }
    e = document.querySelector(".np-upsells"); if (e) return { el: e, pos: "afterend" };
    e = document.querySelector("main#MainContent"); if (e) return { el: e, pos: "beforeend" };
    return null;
  }

  function addToCart(btn, variant, label) {
    if (window.npLoggedIn === false) { if (typeof window.npShowAuth === "function") window.npShowAuth("Sign in to add items to your cart."); return; }
    if (!variant || !variant.id || btn.disabled) return;
    var orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = "Adding\u2026";
    if (typeof window.nxLoaderStart === "function") window.nxLoaderStart();
    fetch("/cart/add.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: variant.id, quantity: 1 }) })
      .then(function (r) {
        if (!r.ok) throw new Error();
        btn.innerHTML = "Added \u2713";
        fetch("/cart.js").then(function (r2) { return r2.json(); }).then(function (cart) {
          document.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
          document.dispatchEvent(new CustomEvent("cart:refresh", { detail: cart }));
        }).catch(function () {});
      })
      .catch(function () { btn.innerHTML = "Try again"; })
      .then(function () {
        if (typeof window.nxLoaderDone === "function") window.nxLoaderDone();
        setTimeout(function () { btn.innerHTML = label || orig; btn.disabled = false; }, 1600);
      });
  }

  /* Autoplay that pauses off-screen, on hover/focus, and when the tab is hidden. */
  function autoplay(root, ms, step) {
    var vis = false, hover = false, t = null;
    function run() { stop(); if (!reduced && vis && !hover && !document.hidden) t = setInterval(step, ms); }
    function stop() { if (t) { clearInterval(t); t = null; } }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; run(); }, { threshold: 0.35 }).observe(root);
    root.addEventListener("pointerenter", function () { hover = true; stop(); });
    root.addEventListener("pointerleave", function () { hover = false; run(); });
    root.addEventListener("focusin", function () { hover = true; stop(); });
    root.addEventListener("focusout", function () { hover = false; run(); });
    document.addEventListener("visibilitychange", run);
    return { reset: run };
  }
  function swipe(target, onStep) {
    var s = null;
    target.addEventListener("pointerdown", function (e) { s = { x: e.clientX, y: e.clientY }; });
    target.addEventListener("pointercancel", function () { s = null; });
    target.addEventListener("pointerup", function (e) {
      if (!s) return; var dx = e.clientX - s.x, dy = e.clientY - s.y; s = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) onStep(dx < 0 ? 1 : -1);
    });
  }
  function head(eyebrow, title) {
    return el("div", "npx-hd", '<div><span class="npx-eye">' + esc(eyebrow) + '</span><h2 class="npx-title">' + esc(title) + "</h2></div>");
  }
  var ARROW_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  /* ========== 1) CLOTHING RAIL ========== */
  function buildRail(products) {
    var sec = el("section", "npx-sec npx-rail");
    sec.setAttribute("aria-label", "Complete The Moment");
    sec.appendChild(head("You might also love", "Complete The Moment"));
    var stage = el("div", "npx-rail-stage");
    stage.appendChild(el("div", "npx-rail-bar", '<i></i><i></i>'));
    var track = el("div", "npx-rail-track");
    stage.appendChild(track);
    sec.appendChild(stage);

    var items = products.map(function (p, i) {
      var it = el("button", "npx-hang");
      it.type = "button";
      it.setAttribute("aria-label", p.title + ", " + money(p.price) + ". Open details");
      it.innerHTML =
        '<svg class="npx-hook" viewBox="0 0 120 70" aria-hidden="true"><path d="M60 4c-7 0-11 5-11 10s4 8 9 9v9"/><path d="M58 32 10 62h100z" /></svg>' +
        '<span class="npx-garment"><span class="npx-face npx-front"><img alt="" loading="lazy" src="' + esc(sized(p.featured_image, 500)) + '"></span>' +
        '<span class="npx-face npx-back"><img alt="" loading="lazy" src="' + esc(sized(p.images[1] || p.featured_image, 500)) + '"></span></span>' +
        '<span class="npx-tag"><b>' + esc(p.title) + "</b><em>" + money(p.price) + "</em></span>";
      it.addEventListener("click", function (e) { if (moved) { e.preventDefault(); return; } openDialog(p); });
      track.appendChild(it);
      return { el: it, swing: 0, v: 0 };
    });

    // Drag along the rail; hangers swing with the velocity and turn to face the centre.
    var x = 0, minX = 0, vx = 0, drag = null, moved = false, raf = 0;
    function bounds() { minX = Math.min(0, stage.clientWidth - track.scrollWidth - 24); x = Math.max(minX, Math.min(0, x)); }
    function frame() {
      raf = 0;
      if (!drag) { x += vx; vx *= 0.92; if (x > 0 || x < minX) { x = Math.max(minX, Math.min(0, x)); vx = 0; } }
      track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      var mid = stage.getBoundingClientRect().left + stage.clientWidth / 2, live = Math.abs(vx) > 0.05;
      items.forEach(function (o) {
        var r = o.el.getBoundingClientRect(), d = (r.left + r.width / 2 - mid) / stage.clientWidth;
        o.v += (-vx * 0.9 - o.swing) * 0.08; o.v *= 0.88; o.swing += o.v;
        if (Math.abs(o.v) > 0.01 || Math.abs(o.swing) > 0.05) live = true;
        o.el.style.setProperty("--sw", o.swing.toFixed(2) + "deg");
        o.el.style.setProperty("--ty", (d * -38).toFixed(1) + "deg");
      });
      if (live || drag) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    stage.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, x0: x, t: e.timeStamp, last: e.clientX }; moved = false; vx = 0; kick(); });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return; var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) moved = true;
      vx = e.clientX - drag.last; drag.last = e.clientX;
      x = Math.max(minX - 60, Math.min(60, drag.x0 + dx)); kick();
    });
    window.addEventListener("pointerup", function () { if (drag) { drag = null; kick(); } });
    stage.addEventListener("wheel", function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); vx = -e.deltaX * 0.3; kick(); } }, { passive: false });
    var nav = el("div", "npx-nav");
    var pb = el("button", "npx-arrow", ARROW_L), nb = el("button", "npx-arrow", ARROW_R);
    pb.type = nb.type = "button"; pb.setAttribute("aria-label", "Slide rail left"); nb.setAttribute("aria-label", "Slide rail right");
    pb.onclick = function () { vx = 14; kick(); }; nb.onclick = function () { vx = -14; kick(); };
    nav.appendChild(pb); nav.appendChild(nb); sec.querySelector(".npx-hd").appendChild(nav);
    window.addEventListener("resize", function () { bounds(); kick(); });
    setTimeout(function () { bounds(); items.forEach(function (o, i) { o.v = (i % 2 ? 1 : -1) * 1.2; }); kick(); }, 60);

    // Detail dialog with front / back spin and quick add.
    var dlg = el("dialog", "npx-dlg");
    sec.appendChild(dlg);
    function openDialog(p) {
      var back = p.images[1] || p.featured_image;
      dlg.innerHTML =
        '<button type="button" class="npx-dlg-x" aria-label="Close">\u00d7</button>' +
        '<div class="npx-spin"><div class="npx-spin-in"><img class="npx-front" alt="' + esc(p.title) + '" src="' + esc(sized(p.featured_image, 800)) + '"><img class="npx-back" alt="" src="' + esc(sized(back, 800)) + '"></div></div>' +
        '<div class="npx-dlg-body"><span class="npx-eye">' + esc(p.type || "Nalea XoXo") + '</span><h3>' + esc(p.title) + "</h3>" +
        '<p class="npx-price">' + money(p.price) + (p.compare_at_price > p.price ? " <s>" + money(p.compare_at_price) + "</s>" : "") + "</p>" +
        (p.desc ? '<p class="npx-desc">' + esc(p.desc.slice(0, 220)) + (p.desc.length > 220 ? "\u2026" : "") + "</p>" : "") +
        '<div class="npx-dlg-act"><button type="button" class="npx-btn npx-turn">Turn around</button>' +
        '<button type="button" class="npx-btn npx-add">Quick add</button><a class="npx-link" href="' + esc(p.url) + '">View product</a></div></div>';
      var spun = false;
      dlg.querySelector(".npx-turn").onclick = function () { spun = !spun; dlg.querySelector(".npx-spin-in").style.transform = "rotateY(" + (spun ? 180 : 0) + "deg)"; };
      if (back === p.featured_image) dlg.querySelector(".npx-turn").hidden = true;
      dlg.querySelector(".npx-add").onclick = function (e) { addToCart(e.currentTarget, p.variants[0], "Quick add"); };
      dlg.querySelector(".npx-dlg-x").onclick = function () { dlg.close(); };
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    }
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    return sec;
  }

  /* ========== 2) ORBIT CAROUSEL ========== */
  function arcPath(a0, a1, cx, cy, r, w) {
    var o = [], n = [];
    for (var i = 0; i <= 40; i++) {
      var t = i / 40, a = ((a0 + (a1 - a0) * t) * Math.PI) / 180, h = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.45), c = Math.cos(a), s = Math.sin(a);
      o.push((cx + c * (r + h)).toFixed(1) + " " + (cy + s * (r + h)).toFixed(1));
      n.push((cx + c * (r - h)).toFixed(1) + " " + (cy + s * (r - h)).toFixed(1));
    }
    return "M" + o.join("L") + "L" + n.reverse().join("L") + "Z";
  }
  var ARC_REST = [[50, 98], [46, 124], [60, 126], [40, 100]];
  function buildOrbit(products) {
    var n = products.length, idx = 0, tl = null;
    var sec = el("section", "npx-sec npx-orbit");
    sec.setAttribute("aria-roledescription", "carousel");
    sec.setAttribute("aria-label", "Add These For Under R49");
    sec.tabIndex = 0;
    var canvas = el("div", "npx-oc");
    canvas.innerHTML =
      '<svg class="npx-arc" viewBox="0 0 960 520" aria-hidden="true"><path style="opacity:.34"/></svg>' +
      '<div class="npx-ohead"><span class="npx-eye">Little extras</span><h2 class="npx-title">Add These For Under R49</h2></div>' +
      '<div class="npx-pager" role="tablist" aria-label="Choose a product"></div>' +
      '<div class="npx-plates"></div><div class="npx-titles" aria-live="polite"></div>' +
      '<div class="npx-card"><div class="npx-bodies"></div></div>' +
      '<div class="npx-strip"><button type="button" class="npx-arrow npx-op" aria-label="Previous">' + ARROW_L + '</button><div class="npx-win"><div class="npx-track"></div></div><button type="button" class="npx-arrow npx-on" aria-label="Next">' + ARROW_R + "</button></div>";
    sec.appendChild(canvas);
    var arcEl = canvas.querySelector(".npx-arc path"), arc = { a0: 50, a1: 98 };
    var plates = [], heads = [], bodies = [], dots = [], thumbs = [];
    products.forEach(function (p, i) {
      var accent = ACCENTS[i % ACCENTS.length];
      var pl = el("div", "npx-orb", '<img alt="' + esc(p.title) + '" src="' + esc(sized(p.featured_image, 520)) + '" loading="lazy" draggable="false">');
      canvas.querySelector(".npx-plates").appendChild(pl); plates.push(pl);
      var words = p.title.split(" "), cut = Math.max(1, Math.ceil(words.length / 2));
      var t1 = words.slice(0, cut).join(" "), t2 = words.slice(cut).join(" ") || money(p.price);
      var hd = el("div", "npx-ot",
        '<p class="npx-oeye">#' + (i + 1) + " under R49</p>" +
        '<span class="npx-t1" style="font-size:' + Math.min(44, 330 / (Math.max(1, t1.length) * 0.56)).toFixed(1) + 'px">' + esc(t1) + "</span>" +
        '<span class="npx-t2" style="font-size:' + Math.min(50, 320 / (Math.max(1, t2.length) * 0.64)).toFixed(1) + 'px">' + esc(t2) + "</span>");
      canvas.querySelector(".npx-titles").appendChild(hd); heads.push(hd);
      var save = p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
      var bd = el("div", "npx-body",
        '<div class="npx-rate"><div class="npx-badge" style="background:' + accent + '"></div><span class="npx-num">' + money(p.price) + "</span></div>" +
        '<p class="npx-pt">' + esc(p.type || "Little extra") + (save ? ' \u00b7 <b>Save ' + save + "%</b>" : "") + "</p>" +
        '<p class="npx-desc">' + esc((p.desc || p.title).slice(0, 110)) + ((p.desc || "").length > 110 ? "\u2026" : "") + "</p>" +
        '<div class="npx-react"><button type="button" class="npx-btn npx-add"' + (p.variants[0].available ? "" : " disabled") + ">" + (p.variants[0].available ? "Quick add" : "Sold out") + '</button><a class="npx-link" href="' + esc(p.url) + '">View</a></div>');
      bd.querySelector(".npx-add").onclick = function (e) { addToCart(e.currentTarget, p.variants[0], "Quick add"); };
      canvas.querySelector(".npx-bodies").appendChild(bd); bodies.push(bd);
      var d = el("button", "npx-dot", "<i></i>"); d.type = "button"; d.setAttribute("role", "tab"); d.setAttribute("aria-label", p.title);
      d.onclick = function () { go(i); }; canvas.querySelector(".npx-pager").appendChild(d); dots.push(d);
      var th = el("div", "npx-th", '<button type="button"><img alt="" loading="lazy" src="' + esc(sized(p.featured_image, 160)) + '"><span>' + esc(p.title) + "</span></button>");
      th.firstChild.onclick = function () { go(i); }; canvas.querySelector(".npx-track").appendChild(th); thumbs.push(th.firstChild);
    });
    function drawArc() { arcEl.setAttribute("d", arcPath(arc.a0, arc.a1, 299, -450, 650, 118)); }
    function chrome() {
      dots.forEach(function (d, k) { d.toggleAttribute("aria-current", k === idx); d.setAttribute("aria-selected", k === idx); });
      thumbs.forEach(function (t, k) { t.toggleAttribute("aria-current", k === idx); });
      var start = n <= 4 ? 0 : Math.max(0, Math.min(idx - 1, n - 4));
      canvas.querySelector(".npx-track").style.transform = "translateX(" + -start * 118 + "px)";
      bodies.forEach(function (b, k) { b.querySelectorAll("button,a").forEach(function (x) { x.tabIndex = k === idx ? 0 : -1; }); });
    }
    function show(to, dir) {
      var gs = window.gsap, from = idx; idx = to; chrome();
      var rest = ARC_REST[to % 4], tint = ACCENTS[to % ACCENTS.length];
      if (tl) tl.progress(1).kill();
      if (!gs || reduced || from === to) {
        plates.forEach(function (p, k) { p.style.visibility = k === to ? "visible" : "hidden"; p.style.opacity = 1; p.style.transform = "none"; });
        heads.forEach(function (h, k) { h.style.visibility = k === to ? "visible" : "hidden"; h.querySelectorAll("span").forEach(function (s) { s.style.clipPath = "inset(0)"; }); });
        bodies.forEach(function (b, k) { b.style.visibility = k === to ? "visible" : "hidden"; b.style.opacity = 1; });
        arc.a0 = rest[0]; arc.a1 = rest[1]; drawArc(); arcEl.style.fill = tint; return;
      }
      var a = { o: plates[from], h: heads[from], b: bodies[from] }, b = { o: plates[to], h: heads[to], b: bodies[to] };
      tl = gs.timeline();
      tl.to(a.o, { rotation: 50 * dir, duration: 0.62, ease: "power2.in" }, 0).set(a.o, { autoAlpha: 0, rotation: 0 }, 0.62)
        .fromTo(b.o, { autoAlpha: 1, rotation: -50 * dir }, { rotation: 0, duration: 0.95, ease: "power3.out" }, 0.3)
        .to(a.h.querySelector(".npx-t1"), { clipPath: "inset(0% 0% 0% 100%)", duration: 0.42, ease: "power2.in" }, 0)
        .to(a.h.querySelector(".npx-t2"), { clipPath: "inset(0% 100% 0% 0%)", duration: 0.42, ease: "power2.in" }, 0.06)
        .to(a.h.querySelector(".npx-oeye"), { autoAlpha: 0, duration: 0.25 }, 0)
        .set(a.h, { autoAlpha: 0 }, 0.5).set(b.h, { autoAlpha: 1 }, 0.5)
        .fromTo(b.h.querySelector(".npx-oeye"), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.55)
        .fromTo(b.h.querySelector(".npx-t1"), { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.out" }, 0.55)
        .fromTo(b.h.querySelector(".npx-t2"), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.out" }, 0.62)
        .to(a.b, { autoAlpha: 0, y: -6, duration: 0.3 }, 0.05).set(b.b, { autoAlpha: 1, y: 0 }, 0.4)
        .fromTo(b.b.children, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" }, 0.4)
        .to(arc, { a0: 38, a1: 146, duration: 0.6, ease: "power2.inOut", onUpdate: drawArc }, 0)
        .to(arc, { a0: rest[0], a1: rest[1], duration: 0.85, ease: "power3.out", onUpdate: drawArc }, 0.6)
        .to(arcEl, { fill: tint, duration: 1.1 }, 0.1);
    }
    function go(to, dir) {
      if (n < 2) return; to = ((to % n) + n) % n; if (to === idx) return;
      var f = (to - idx + n) % n; show(to, dir || (f <= n - f ? 1 : -1)); ap.reset();
    }
    canvas.querySelector(".npx-op").onclick = function () { go(idx - 1, -1); };
    canvas.querySelector(".npx-on").onclick = function () { go(idx + 1, 1); };
    sec.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1, 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1, -1); } });
    swipe(canvas.querySelector(".npx-plates"), function (d) { go(idx + d, d); });
    var ap = autoplay(sec, 4800, function () { go(idx + 1, 1); });
    function fit() { var w = sec.clientWidth, h = sec.clientHeight; canvas.style.setProperty("--s", Math.min(w / 960, h / 520, 1.4)); }
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(sec);
    setTimeout(function () { fit(); show(0, 1); }, 0);
    idx = 0; chrome();
    return sec;
  }

  /* ========== 3) RUNWAY LOOKBOOK ========== */
  var SLOTS = [
    { x: 1.28, feet: 0.93, h: 0.83, blur: 0, a: 1 }, { x: 0.74, feet: 0.9, h: 0.79, blur: 0, a: 1 },
    { x: 0.47, feet: 0.82, h: 0.58, blur: 0.0022, a: 1 }, { x: 0.33, feet: 0.745, h: 0.42, blur: 0.0065, a: 0.95 },
    { x: 0.245, feet: 0.7, h: 0.32, blur: 0.011, a: 0.78 }, { x: 0.17, feet: 0.667, h: 0.26, blur: 0.016, a: 0.52 },
    { x: 0.11, feet: 0.65, h: 0.22, blur: 0.021, a: 0.26 }, { x: 0.07, feet: 0.64, h: 0.19, blur: 0.026, a: 0 }
  ];
  var NARROW_X = [1.3, 0.64, 0.36, 0.24, 0.16, 0.1, 0.06, 0.03];
  function pose(d, w, h, n) {
    var narrow = w < 0.9 * h, k = narrow ? Math.min(1, w / (0.62 * h)) : 1;
    var s = Math.max(-1, Math.min(SLOTS.length - 2, d)) + 1, i = Math.min(SLOTS.length - 2, Math.floor(s)), t = s - i;
    var A = SLOTS[i], B = SLOTS[i + 1], mix = function (p, q) { return p + (q - p) * t; };
    var base = SLOTS[1].h * h * k;
    return { base: base, x: (narrow ? mix(NARROW_X[i], NARROW_X[i + 1]) : mix(A.x, B.x)) * w, y: mix(A.feet, B.feet) * h, scale: (mix(A.h, B.h) * h * k) / base, blur: mix(A.blur, B.blur) * h, alpha: mix(A.a, B.a) * Math.max(0, Math.min(1, n - 1 - d)) };
  }
  function buildRunway(products) {
    var n = products.length, pos = { v: 0 }, index = 0, tw = null;
    var sec = el("section", "npx-sec npx-run");
    sec.setAttribute("aria-roledescription", "carousel"); sec.setAttribute("aria-label", "You'll Also Adore"); sec.tabIndex = 0;
    var body = el("div", "npx-run-body");
    var stage = el("div", "npx-stage");
    stage.appendChild(el("div", "npx-copy", '<span class="npx-eye">Editor\'s pick</span><h2 class="npx-title">You\'ll Also Adore</h2>'));
    var figs = products.map(function (p, i) {
      var f = el("div", "npx-fig", '<img alt="' + esc(p.title) + '" loading="lazy" draggable="false" src="' + esc(sized(p.featured_image, 600)) + '"><i></i><button type="button" class="npx-hit" aria-label="' + esc(p.title) + '"></button>');
      f.querySelector(".npx-hit").onclick = function () { bring(i); };
      stage.appendChild(f); return f;
    });
    var foot = el("div", "npx-foot", '<p class="npx-look" aria-hidden="true"><span>Look</span><span class="npx-lnum"></span></p><div class="npx-foot-act"><button type="button" class="npx-arrow npx-rp" aria-label="Previous look">' + ARROW_L + '</button><button type="button" class="npx-arrow npx-rn" aria-label="Next look">' + ARROW_R + '</button><a class="npx-shop" href="#">Shop the look</a></div>');
    stage.appendChild(foot);
    body.appendChild(stage);
    var rail = el("div", "npx-rrail");
    var cards = products.map(function (p, i) {
      var c = el("div", "npx-rcard",
        '<div class="npx-rpic"><img alt="" loading="lazy" src="' + esc(sized(p.featured_image, 400)) + '"></div>' +
        '<div class="npx-rmeta"><span class="npx-rname">' + esc(p.title) + '</span><span class="npx-rprice">' + money(p.price) + (p.compare_at_price > p.price ? " <s>" + money(p.compare_at_price) + "</s>" : "") + "</span>" +
        '<button type="button" class="npx-plus" aria-label="Quick add ' + esc(p.title) + '"' + (p.variants[0].available ? "" : " disabled") + '><svg viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11"/></svg></button></div>');
      c.querySelector(".npx-plus").onclick = function (e) { addToCart(e.currentTarget, p.variants[0], '<svg viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11"/></svg>'); };
      rail.appendChild(c); return c;
    });
    body.appendChild(rail);
    sec.appendChild(body);
    var sr = el("p", "npx-sr"); sr.setAttribute("aria-live", "polite"); sec.appendChild(sr);

    var W = 1, H = 1, RH = 1;
    function render() {
      var p = pos.v;
      figs.forEach(function (f, i) {
        var d = ((((i - p + 1) % n) + n) % n) - 1, q = pose(d, W, H, n);
        f.style.transform = "translate3d(" + q.x.toFixed(1) + "px," + q.y.toFixed(1) + "px,0) scale(" + q.scale.toFixed(4) + ")";
        f.style.filter = q.blur > 0.15 ? "blur(" + (q.blur / q.scale).toFixed(2) + "px)" : "none";
        f.style.opacity = q.alpha.toFixed(3);
        f.style.visibility = q.alpha < 0.01 || q.x > W * 1.6 ? "hidden" : "visible";
        f.style.zIndex = String(Math.round(400 - d * 40));
      });
      var cardH = Math.max(140, RH * 0.5), gap = 4, total = n * (cardH + gap), lap = Math.floor(p / n), scroll = lap * total + (p - lap * n) * (cardH + gap);
      cards.forEach(function (c, i) {
        var y = i * (cardH + gap) - scroll; y = ((((y + cardH + gap) % total) + total) % total) - (cardH + gap);
        c.style.height = cardH + "px"; c.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
        c.toggleAttribute("data-on", i === index);
      });
      var now = ((Math.round(p) % n) + n) % n;
      if (now !== index) { index = now; label(); }
    }
    function label() {
      var num = String(index + 1).padStart(2, "0"), box = foot.querySelector(".npx-lnum");
      box.innerHTML = num.split("").map(function (c) { return '<span class="npx-dg"><span>' + c + "</span></span>"; }).join("");
      if (window.gsap && !reduced) window.gsap.fromTo(box.querySelectorAll(".npx-dg>span"), { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: "power3.out", stagger: 0.04 });
      foot.querySelector(".npx-shop").href = products[index].url;
      sr.textContent = "Look " + (index + 1) + " of " + n + ": " + products[index].title;
    }
    function to(target) {
      if (tw) tw.kill();
      if (window.gsap && !reduced) tw = window.gsap.to(pos, { v: target, duration: 1.1, ease: "power2.inOut", onUpdate: render });
      else { pos.v = target; render(); }
      ap.reset();
    }
    function step(d) { to(Math.round(pos.v) + d); }
    function bring(i) { var cur = ((Math.round(pos.v) % n) + n) % n, f = (i - cur + n) % n; if (f) to(Math.round(pos.v) + f); }
    foot.querySelector(".npx-rp").onclick = function () { step(-1); };
    foot.querySelector(".npx-rn").onclick = function () { step(1); };
    sec.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); step(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); } });
    swipe(stage, step);
    var ap = autoplay(sec, 4200, function () { step(1); });
    function size() {
      sec.toggleAttribute("data-narrow", sec.clientWidth < 720);
      W = stage.clientWidth; H = stage.clientHeight; RH = rail.clientHeight || H;
      var base = pose(0, W, H, n).base;
      figs.forEach(function (f) {
        f.firstChild.style.height = base + "px"; f.firstChild.style.width = base * 0.62 + "px";
        f.children[1].style.width = base * 0.36 + "px"; f.children[1].style.height = base * 0.035 + "px";
        f.children[2].style.height = base + "px"; f.children[2].style.width = base * 0.62 + "px";
      });
      render();
    }
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(sec);
    setTimeout(size, 0); label();
    return sec;
  }

  /* ========== styles ========== */
  function injectStyles() {
    if (document.getElementById("npx-css")) return;
    var css =
      ".npx-wrap{--npx-bg:color-mix(in oklab,var(--snp-tint,transparent) 15%,color-mix(in oklab,var(--foreground,#111) 4%,var(--background,#fff)));position:relative;margin-top:-1px;background:var(--npx-bg);color:var(--foreground,inherit);transition:background-color .8s ease;overflow:hidden}" +
      ".npx-wrap *{box-sizing:border-box}" +
      ".npx-sec{position:relative;height:clamp(380px,60svh,600px);max-width:1400px;margin:0 auto;padding:0 clamp(16px,3.4vw,44px);opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .7s ease}" +
      ".npx-sec.is-in{opacity:1;transform:none}.npx-sec:focus-visible{outline:2px solid currentColor;outline-offset:-4px}" +
      ".npx-sec+.npx-sec{margin-top:clamp(8px,2vw,24px)}" +
      ".npx-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding-top:clamp(10px,2vw,22px)}" +
      ".npx-eye{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in oklab,currentColor 55%,transparent)}" +
      ".npx-title{margin:.2em 0 0;font-size:clamp(20px,2.2vw,30px);line-height:1.1;font-weight:600;letter-spacing:-.01em}" +
      ".npx-nav,.npx-foot-act{display:flex;gap:8px;align-items:center}" +
      ".npx-arrow{display:grid!important;place-items:center;width:34px;height:34px;padding:0!important;border-radius:50%!important;border:1px solid color-mix(in oklab,currentColor 22%,transparent)!important;background:transparent!important;color:inherit!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-arrow svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
      ".npx-arrow:hover{background:color-mix(in oklab,currentColor 8%,transparent)!important}" +
      ".npx-btn{appearance:none;border:0;border-radius:0;padding:10px 16px;font:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;cursor:pointer;background:var(--foreground,#111);color:var(--background,#fff)}" +
      ".npx-btn:disabled{opacity:.5;cursor:default}.npx-link{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:inherit;text-underline-offset:3px}" +
      ".npx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}" +
      /* rail */
      ".npx-rail-stage{position:relative;height:calc(100% - 70px);margin-top:6px;overflow:hidden;cursor:grab;touch-action:pan-y;user-select:none;perspective:900px}" +
      ".npx-rail-stage:active{cursor:grabbing}" +
      ".npx-rail-bar{position:absolute;left:0;right:0;top:22px;height:8px;border-radius:8px;background:linear-gradient(180deg,#d7b98c,#a07b4d 55%,#7a5a35);box-shadow:0 3px 8px rgba(0,0,0,.18)}" +
      ".npx-rail-bar i{position:absolute;top:-14px;width:6px;height:20px;border-radius:3px;background:#8a6a42}.npx-rail-bar i:first-child{left:3%}.npx-rail-bar i:last-child{right:3%}" +
      ".npx-rail-track{position:absolute;left:0;top:18px;bottom:0;display:flex;gap:clamp(14px,2.4vw,34px);padding:0 4%;will-change:transform}" +
      ".npx-hang{--sw:0deg;--ty:0deg;position:relative;flex:none;width:clamp(150px,17vw,220px);height:100%;padding:0!important;border:0!important;background:none!important;color:inherit!important;cursor:pointer;transform-origin:50% 8px;transform:rotate(var(--sw));box-shadow:none!important}" +
      ".npx-hook{display:block;width:44%;margin:0 auto;height:auto;fill:none;stroke:#7a5a35;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}" +
      ".npx-garment{position:relative;display:block;width:88%;margin:-3px auto 0;aspect-ratio:4/5;transform-style:preserve-3d;transform:rotateY(var(--ty));transition:transform .2s linear}" +
      ".npx-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 14px 28px -16px rgba(0,0,0,.45)}" +
      ".npx-face img{width:100%;height:100%;object-fit:cover;display:block}.npx-back{transform:rotateY(180deg)}" +
      ".npx-hang:hover .npx-garment,.npx-hang:focus-visible .npx-garment{transform:rotateY(180deg)}" +
      ".npx-tag{display:flex;flex-direction:column;gap:2px;width:88%;margin:8px auto 0;text-align:left;font-size:12px;line-height:1.3}" +
      ".npx-tag b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.npx-tag em{font-style:normal;color:color-mix(in oklab,currentColor 60%,transparent)}" +
      ".npx-dlg{max-width:min(760px,92vw);width:100%;padding:0;border:0;border-radius:16px;background:var(--background,#fff);color:var(--foreground,#111)}" +
      ".npx-dlg[open]{display:grid;grid-template-columns:1fr 1fr}.npx-dlg::backdrop{background:rgba(10,8,6,.55);backdrop-filter:blur(4px)}" +
      ".npx-dlg-x{position:absolute;right:10px;top:8px;z-index:2;border:0!important;background:none!important;font-size:26px;color:inherit!important;cursor:pointer}" +
      ".npx-spin{perspective:1000px;background:color-mix(in oklab,var(--foreground,#111) 4%,var(--background,#fff))}" +
      ".npx-spin-in{position:relative;aspect-ratio:4/5;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.3,.7,.2,1)}" +
      ".npx-spin-in img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;backface-visibility:hidden}" +
      ".npx-dlg-body{padding:28px 24px;display:flex;flex-direction:column;gap:10px}.npx-dlg-body h3{margin:0;font-size:22px}" +
      ".npx-price{margin:0;font-size:18px}.npx-price s{opacity:.5;font-size:.8em}.npx-desc{margin:0;font-size:13px;line-height:1.5;opacity:.75}" +
      ".npx-dlg-act{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:auto}.npx-turn{background:transparent;color:inherit;border:1px solid currentColor}" +
      "@media (max-width:640px){.npx-dlg[open]{grid-template-columns:1fr;max-height:90svh;overflow:auto}}" +
      /* orbit */
      ".npx-orbit{container-type:inline-size;touch-action:pan-y}@media (max-width:639px){.npx-orbit{height:auto;min-height:0}}" +
      ".npx-oc{position:absolute;left:50%;top:50%;width:960px;height:520px;transform:translate(-50%,-50%) scale(var(--s,1))}" +
      ".npx-arc{position:absolute;inset:0;width:960px;height:520px;overflow:visible;pointer-events:none}" +
      ".npx-ohead{position:absolute;left:0;top:18px}" +
      ".npx-pager{position:absolute;left:76px;top:150px;display:flex;flex-direction:column;align-items:center;gap:7px}" +
      ".npx-dot{width:14px;height:10px;display:grid;place-items:center;padding:0!important;border:0!important;background:none!important;cursor:pointer;transition:height .45s}" +
      ".npx-dot i{display:block;width:3px;height:3px;border-radius:3px;background:currentColor;opacity:.45;transition:height .45s cubic-bezier(.3,.7,.2,1),opacity .3s}" +
      ".npx-dot[aria-current]{height:26px}.npx-dot[aria-current] i{height:22px;opacity:.9}" +
      ".npx-plates{position:absolute;left:130px;top:82px;width:245px;height:245px}" +
      ".npx-orb{position:absolute;inset:0;transform-origin:69% -217%;visibility:hidden}" +
      ".npx-orb img{width:245px;height:245px;object-fit:cover;border-radius:50%;background:#fff;box-shadow:0 0 0 10px #fff,0 0 0 11px rgba(0,0,0,.06),0 26px 34px -10px rgba(0,0,0,.35);user-select:none}" +
      ".npx-titles{position:absolute;left:400px;top:96px;width:320px;height:150px}" +
      ".npx-ot{position:absolute;inset:0;visibility:hidden}.npx-oeye{font-size:12px;font-weight:600;margin:0 0 4px 2px}" +
      ".npx-t1,.npx-t2{display:block;white-space:nowrap;line-height:1.02;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis}" +
      ".npx-t1{font-weight:200;margin-top:6px}.npx-t2{font-weight:800;margin-top:6px;color:color-mix(in oklab,currentColor 86%,transparent)}" +
      ".npx-card{position:absolute;left:722px;top:118px;width:223px;padding:18px 20px 20px;border-radius:20px;background:color-mix(in oklab,var(--background,#fff) 72%,transparent);backdrop-filter:blur(14px);box-shadow:0 18px 40px -24px rgba(0,0,0,.25)}" +
      ".npx-bodies{display:grid}.npx-body{grid-area:1/1;visibility:hidden}" +
      ".npx-rate{position:relative;height:56px;margin:0 0 10px}.npx-badge{position:absolute;left:0;top:0;width:46px;height:56px;border-radius:10px}" +
      ".npx-num{position:absolute;left:10px;top:6px;font-size:30px;font-weight:700;letter-spacing:-.04em;line-height:1}" +
      ".npx-pt{margin:0 0 8px;font-size:11px;opacity:.65}.npx-pt b{color:#c2410c;opacity:1}" +
      ".npx-body .npx-desc{min-height:52px;font-size:12px}.npx-react{display:flex;gap:12px;align-items:center;margin-top:14px}.npx-react .npx-btn{padding:9px 12px;font-size:11px}" +
      ".npx-strip{position:absolute;left:130px;top:370px;width:560px;height:120px;display:flex;align-items:center;gap:4px}" +
      ".npx-win{width:472px;height:120px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}" +
      ".npx-track{display:flex;transition:transform .6s cubic-bezier(.65,0,.35,1)}" +
      ".npx-th{flex:none;width:118px;display:flex;justify-content:center}" +
      ".npx-th button{width:84px;height:114px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:9px 4px 0!important;border:0!important;background:transparent!important;color:inherit!important;cursor:pointer;transition:background .45s;box-shadow:none!important}" +
      ".npx-th button[aria-current]{background:color-mix(in oklab,var(--background,#fff) 62%,transparent)!important;box-shadow:0 10px 24px -16px rgba(0,0,0,.3)!important}" +
      ".npx-th img{width:54px;height:54px;border-radius:50%;object-fit:cover;box-shadow:0 4px 8px rgba(0,0,0,.15)}" +
      ".npx-th span{font-size:10px;line-height:1.25;text-align:center;max-width:78px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
      "@container (max-width:639px){" +
      ".npx-oc{position:relative;left:auto;top:auto;width:100%;height:auto;transform:none;display:flex;flex-direction:column;align-items:center;padding:14px 0 18px}" +
      ".npx-arc{width:200%;height:auto;left:-60%;top:-30px}.npx-ohead{position:relative;top:auto;align-self:flex-start;margin-bottom:8px}" +
      ".npx-pager{left:0;top:120px}.npx-plates{position:relative;left:auto;top:auto;width:min(48vw,200px);height:min(48vw,200px)}.npx-orb img{width:100%;height:100%}" +
      ".npx-titles{position:relative;left:auto;top:auto;width:100%;height:96px;margin-top:14px}.npx-ot{text-align:center;transform:scale(.72);transform-origin:50% 0}" +
      ".npx-card{position:relative;left:auto;top:auto;width:100%;max-width:420px}.npx-strip{position:relative;left:auto;top:auto;width:auto;height:auto;margin-top:12px}.npx-win{display:none}}" +
      /* runway */
      ".npx-run-body{position:absolute;inset:0;display:flex}" +
      ".npx-stage{position:relative;flex:1;min-width:0;overflow:hidden;touch-action:pan-y}" +
      ".npx-fig{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;will-change:transform,filter,opacity}" +
      ".npx-fig>img{position:absolute;bottom:0;left:0;max-width:none;object-fit:cover;object-position:50% 20%;border-radius:12px;transform:translateX(-50%);mix-blend-mode:multiply;pointer-events:none}" +
      ".npx-fig>i{position:absolute;left:0;bottom:-1px;transform:translate(-50%,50%);border-radius:50%;background:radial-gradient(closest-side,color-mix(in oklab,currentColor 22%,transparent),transparent);pointer-events:none}" +
      ".npx-hit{position:absolute;bottom:0;left:0;transform:translateX(-50%);padding:0!important;border:0!important;background:none!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-copy{position:absolute;left:clamp(16px,3.4vw,44px);top:clamp(14px,3vh,28px);z-index:500;pointer-events:none}" +
      ".npx-foot{position:absolute;left:clamp(16px,3.4vw,44px);bottom:clamp(14px,3vh,28px);z-index:500;display:flex;flex-direction:column;gap:10px}" +
      ".npx-look{margin:0;display:flex;align-items:flex-end;gap:.5em;font-size:clamp(18px,2vw,28px);letter-spacing:.14em;text-transform:uppercase;line-height:1}" +
      ".npx-lnum{display:flex;font-variant-numeric:tabular-nums}.npx-dg{display:block;overflow:hidden;height:1.15em;line-height:1.15em}.npx-dg>span{display:block}" +
      ".npx-shop{margin-left:6px;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:inherit;border-bottom:1px solid currentColor;text-decoration:none}" +
      ".npx-rrail{position:relative;flex:none;width:24%;min-width:200px;max-width:320px;overflow:hidden}" +
      ".npx-rcard{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;padding:12px 14px;border-radius:12px;opacity:.55;transition:opacity .4s;will-change:transform}" +
      ".npx-rcard[data-on]{opacity:1;background:color-mix(in oklab,var(--background,#fff) 55%,transparent)}" +
      ".npx-rpic{flex:1;min-height:0;display:flex;justify-content:center}.npx-rpic img{height:100%;width:auto;max-width:100%;object-fit:contain;mix-blend-mode:multiply;border-radius:8px}" +
      ".npx-rmeta{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:end;margin-top:8px}" +
      ".npx-rname{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".npx-rprice{grid-column:1;font-size:12px;opacity:.65}.npx-rprice s{opacity:.6}" +
      ".npx-plus{grid-row:1/3;grid-column:2;width:30px;height:30px;display:grid!important;place-items:center;padding:0!important;border-radius:50%!important;border:1px solid color-mix(in oklab,currentColor 25%,transparent)!important;background:transparent!important;color:inherit!important;cursor:pointer;font-size:11px}" +
      ".npx-plus svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.5}" +
      ".npx-run[data-narrow] .npx-rrail{display:none}@media (max-width:639px){.npx-run{height:clamp(360px,62svh,520px)}}" +
      "@media (prefers-reduced-motion:reduce){.npx-sec{transition:none;opacity:1;transform:none}.npx-track,.npx-spin-in,.npx-garment{transition:none}}";
    var s = document.createElement("style"); s.id = "npx-css"; s.textContent = css; document.head.appendChild(s);
  }

  function syncTint(wrap) {
    function sync() {
      var h = document.querySelector(".snp-root"); if (!h) return;
      var t = h.style.getPropertyValue("--snp-tint"); if (t) wrap.style.setProperty("--snp-tint", t);
      var bg = h.style.getPropertyValue("--color-background"); if (bg) wrap.style.setProperty("--background", bg);
      var fg = h.style.getPropertyValue("--color-foreground"); if (fg) wrap.style.setProperty("--foreground", fg);
    }
    sync();
    var h = document.querySelector(".snp-root");
    if (h) new MutationObserver(sync).observe(h, { attributes: true, attributeFilter: ["style"] });
  }

  function loadGsap(cb) {
    if (window.gsap) return cb();
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
    s.onload = s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  function init() {
    var a = findAnchor(); if (!a || a.el.dataset.npxInit) return;
    var productId = window.npProductId; if (!productId) return;
    a.el.dataset.npxInit = "1";
    injectStyles();
    var wrap = el("div", "npx-wrap");
    a.el.insertAdjacentElement(a.pos, wrap);
    syncTint(wrap);

    Promise.all([
      fetch("/recommendations/products.json?product_id=" + encodeURIComponent(productId) + "&limit=8&intent=related").then(function (r) { return r.json(); }).then(function (d) { return (d && d.products) || []; }).catch(function () { return []; }),
      fetch("/products.json?limit=250").then(function (r) { return r.json(); }).then(function (d) { return (d && d.products) || []; }).catch(function () { return []; })
    ]).then(function (res) {
      var general = res[1].filter(function (p) { return String(p.id) !== String(productId); }).map(normStore);
      var related = res[0].map(normRec).filter(function (p) { return p.price > 0 && p.featured_image; }), seen = {};
      related.forEach(function (p) { seen[p.url] = true; });
      general.forEach(function (p) { if (!seen[p.url] && related.length < 8) { related.push(p); seen[p.url] = true; } });
      var relA = related.slice(0, 4), relB = related.length >= 8 ? related.slice(4, 8) : related.slice(0, 4);
      var cheap = general.filter(function (p) { return p.price > 0 && p.price <= PRICE_CAP_CENTS && p.featured_image; });
      for (var i = cheap.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = cheap[i]; cheap[i] = cheap[j]; cheap[j] = t; }
      cheap = cheap.slice(0, 10);

      loadGsap(function () {
        if (relA.length) wrap.appendChild(buildRail(relA));
        if (cheap.length) wrap.appendChild(buildOrbit(cheap));
        if (relB.length > 1) wrap.appendChild(buildRunway(relB));
        if (!wrap.children.length) { wrap.remove(); return; }
        var secs = wrap.querySelectorAll(".npx-sec");
        if (!("IntersectionObserver" in window)) { secs.forEach(function (s) { s.classList.add("is-in"); }); return; }
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { threshold: 0.15 });
        secs.forEach(function (s) { io.observe(s); });
      });
    }).catch(function () { wrap.remove(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
