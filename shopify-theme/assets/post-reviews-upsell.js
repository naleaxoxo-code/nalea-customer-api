/* Post-reviews upsells — Nalea XoXo
 * 1) Clothing rail   — "Complete The Moment"      (10: related, topped up)
 * 2) Orbit carousel  — "Add These For Under R49"  (10 shuffled, <= R49)
 * 3) Runway lookbook — "You'll Also Adore"        (8: more related, topped up)
 * No product appears in more than one of the three.
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
    return { id: p.id, url: "/products/" + p.handle, title: p.title, type: p.product_type || "", price: price, compare_at_price: cmp, images: imgs, featured_image: imgs[0] || "", desc: strip(p.body_html), variants: [{ id: v.id, price: price, available: v.available !== false }] };
  }
  function normRec(p) {
    var imgs = (p.images || []).map(function (i) { return typeof i === "string" ? i : i.src; });
    var v = (p.variants && p.variants[0]) || {};
    var pr = typeof p.price === "number" ? p.price : Math.round(parseFloat(v.price || "0") * (String(v.price || "").indexOf(".") > -1 ? 100 : 1));
    return { id: p.id, url: p.url || "/products/" + p.handle, title: p.title, type: p.type || p.product_type || "", price: pr, compare_at_price: p.compare_at_price || null, images: imgs, featured_image: p.featured_image || imgs[0] || "", desc: strip(p.description || p.body_html), variants: [{ id: v.id, price: pr, available: v.available !== false }] };
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

  /* ========== 1) CLOTHING RAIL (port of 21st.dev ClothingRailHero) ========== */
  var VB_W = 200, VB_H = 310, ASPECT = VB_W / VB_H, HOOK_TOP = 4, REST = -70, PERSP = 1100, GAP = 0.035;
  var HOOK = "M100,36 L100,-0.4 C100,-3.4 102.2,-4.2 103.9,-2.8 C104.9,-2 105.4,-1.2 105.6,-0.2";
  var HOOK_HI = "M99.5,30 L99.5,-0.2 C99.5,-2.4 101,-3.2 102.4,-2.6";
  var BAR = "M38,57 Q70,38 100,36 Q130,38 162,57";
  var BAR_HI = "M40,54.5 Q71,35.5 100,33.5 Q129,35.5 160,54.5";
  var railUid = 0;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lambert(a) { var r = (a * Math.PI) / 180; return 0.66 + 0.34 * Math.max(0, Math.sin(r) * 0.42 + Math.cos(r) * 0.91); }
  function footprint(h, angle, sideW) { var e = clamp(1 - angle / REST, 0, 1), k = e * e * (3 - 2 * e); return h * ASPECT * (sideW + (0.94 - sideW) * k); }
  function railDefs(u) {
    return '<svg aria-hidden="true" width="0" height="0" style="position:absolute" focusable="false"><defs>' +
      '<linearGradient id="' + u + '-wood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="color-mix(in oklab, sienna 55%, white)"/><stop offset=".45" stop-color="color-mix(in oklab, sienna 80%, black)"/><stop offset="1" stop-color="color-mix(in oklab, sienna 45%, black)"/></linearGradient>' +
      '<linearGradient id="' + u + '-grain" gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" x2="11" y1="0" y2=".6"><stop offset="0" stop-color="black" stop-opacity="0"/><stop offset=".45" stop-color="black" stop-opacity=".16"/><stop offset=".6" stop-color="white" stop-opacity=".08"/><stop offset="1" stop-color="black" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + u + '-chrome" gradientUnits="userSpaceOnUse" x1="98.5" x2="101.7" y1="0" y2="0"><stop offset="0" stop-color="color-mix(in oklab, white 45%, gray)"/><stop offset=".35" stop-color="white"/><stop offset=".78" stop-color="color-mix(in oklab, gray 65%, black)"/><stop offset="1" stop-color="color-mix(in oklab, gray 75%, white)"/></linearGradient>' +
      "</defs></svg>";
  }
  function hangerSvg(u) {
    return '<svg aria-hidden="true" viewBox="0 0 200 310" preserveAspectRatio="xMidYMin meet" class="npx-hsvg">' +
      '<path d="' + BAR + '" fill="none" stroke="black" stroke-opacity=".25" stroke-width="9.5" stroke-linecap="round" transform="translate(.6 1.6)"/>' +
      '<path d="' + BAR + '" fill="none" stroke="url(#' + u + '-wood)" stroke-width="8.5" stroke-linecap="round"/>' +
      '<path d="' + BAR + '" fill="none" stroke="url(#' + u + '-grain)" stroke-width="8.5" stroke-linecap="round"/>' +
      '<path d="' + BAR_HI + '" fill="none" stroke="white" stroke-opacity=".3" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="' + HOOK + '" fill="none" stroke="black" stroke-opacity=".28" stroke-width="3.4" stroke-linecap="round" transform="translate(.9 1.1)"/>' +
      '<path d="' + HOOK + '" fill="none" stroke="url(#' + u + '-chrome)" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="' + HOOK_HI + '" fill="none" stroke="white" stroke-opacity=".6" stroke-width=".6" stroke-linecap="round"/>' +
      '<ellipse cx="105.9" cy=".6" rx="1.9" ry=".9" fill="black" fill-opacity=".4"/>' +
      '<rect x="96" y="27" width="8" height="9" rx="2" fill="url(#' + u + '-chrome)"/><rect x="97.2" y="28.2" width="2" height="6.6" rx="1" fill="white" fill-opacity=".5"/></svg>';
  }

  /* Product photos sit on white; cut the white away (flood fill from the edges)
     and trim to the piece, so it hangs like the cut-outs in the original. */
  var cutCache = {};
  /* Shopify also serves every store image from the shop's own domain (/cdn/shop/...),
     which lets the page read the pixels without needing the CDN to allow it. */
  function sameOrigin(src) {
    var m = String(src).match(/^(?:https?:)?\/\/cdn\.shopify\.com\/s\/files\/\d+\/\d+\/\d+\/\d+\/(files|products)\/(.+)$/);
    return m ? "/cdn/shop/" + m[1] + "/" + m[2] : src;
  }
  function cutout(src) {
    if (cutCache[src]) return cutCache[src];
    cutCache[src] = new Promise(function (res) {
      var img = new Image(); img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          var s = Math.min(1, 520 / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
          var c = document.createElement("canvas"); c.width = w; c.height = h;
          var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
          var d = x.getImageData(0, 0, w, h), p = d.data, seen = new Uint8Array(w * h), st = [], bg = 0;
          // Background = the plain colour around the edge (white, dark, any flat colour).
          var br = [], bgc = [0, 0, 0];
          for (var ex = 0; ex < w; ex += 4) { br.push(ex, (h - 1) * w + ex); }
          for (var ey = 0; ey < h; ey += 4) { br.push(ey * w, ey * w + w - 1); }
          br.forEach(function (k2) { bgc[0] += p[k2 * 4]; bgc[1] += p[k2 * 4 + 1]; bgc[2] += p[k2 * 4 + 2]; });
          bgc = bgc.map(function (v) { return v / br.length; });
          var flat = br.filter(function (k2) { return Math.abs(p[k2 * 4] - bgc[0]) + Math.abs(p[k2 * 4 + 1] - bgc[1]) + Math.abs(p[k2 * 4 + 2] - bgc[2]) < 54; }).length / br.length;
          if (flat < 0.8) return res({ src: src, cut: false });
          var isWhite = bgc[0] > 232 && bgc[1] > 232 && bgc[2] > 232;
          function light(i) {
            var r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
            if (isWhite) return r > 232 && g > 232 && b > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 18;
            return Math.abs(r - bgc[0]) + Math.abs(g - bgc[1]) + Math.abs(b - bgc[2]) < 46;
          }
          for (var i = 0; i < w; i++) { st.push(i, (h - 1) * w + i); }
          for (var j = 0; j < h; j++) { st.push(j * w, j * w + w - 1); }
          while (st.length) {
            var k = st.pop(); if (seen[k]) continue; seen[k] = 1;
            if (!light(k)) continue; p[k * 4 + 3] = 0; bg++;
            var cx = k % w, cy = (k / w) | 0;
            if (cx > 0) st.push(k - 1); if (cx < w - 1) st.push(k + 1); if (cy > 0) st.push(k - w); if (cy < h - 1) st.push(k + w);
          }
          if (bg < w * h * 0.12) return res({ src: src, cut: false });
          var x0 = w, y0 = h, x1 = 0, y1 = 0;
          for (var q = 0; q < w * h; q++) if (p[q * 4 + 3]) { var qx = q % w, qy = (q / w) | 0; if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy; }
          // feather the edge one pixel so it doesn't look jagged
          for (var e = 0; e < w * h; e++) if (p[e * 4 + 3] && ((e % w > 0 && !p[(e - 1) * 4 + 3]) || (e % w < w - 1 && !p[(e + 1) * 4 + 3]) || (e >= w && !p[(e - w) * 4 + 3]) || (e < w * h - w && !p[(e + w) * 4 + 3]))) p[e * 4 + 3] = 150;
          x.putImageData(d, 0, 0);
          var t = document.createElement("canvas"); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
          t.getContext("2d").drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
          res({ src: t.toDataURL("image/png"), cut: true });
        } catch (err) { res({ src: src, cut: false }); }
      };
      img.onerror = function () { res({ src: src, cut: false }); };
      img.src = sameOrigin(src);
    });
    return cutCache[src];
  }

  function buildRail(products) {
    var u = "npxr" + (++railUid), n = products.length, sideW = 0.4;
    var sec = el("section", "npx-sec npx-rail");
    sec.setAttribute("aria-roledescription", "clothing rail"); sec.setAttribute("aria-label", "Complete The Moment");
    sec.innerHTML = railDefs(u) +
      '<header class="npx-rail-hd"><span class="npx-eye">You might also love \u00b7 ' + n + ' pieces on the rail</span><h2 class="npx-title">Complete The Moment</h2></header>' +
      '<div class="npx-rstage" role="group" aria-label="Complete The Moment"><div class="npx-bar" aria-hidden="true"><i class="npx-bar-sh"></i><i class="npx-bar-chrome"></i><i class="npx-bar-brush"></i><b class="npx-bracket"><s></s><s></s></b><b class="npx-bracket npx-r"><s></s><s></s></b></div></div>' +
      '<div class="npx-rcap" aria-live="polite"><p class="npx-capname">Brush along the rail, slide a hanger, tap a piece to see more.</p><p class="npx-capdesc"></p><div class="npx-capact"></div></div>';
    var stage = sec.querySelector(".npx-rstage"), bar = sec.querySelector(".npx-bar");
    var capName = sec.querySelector(".npx-capname"), capDesc = sec.querySelector(".npx-capdesc"), capAct = sec.querySelector(".npx-capact"), capDefault = capName.textContent;
    var S = { x: [], vx: [], tx: [], turn: [], vturn: [], tturn: [], swing: [], vswing: [], tag: [], vtag: [], drag: -1, grab: 0, free: 0, last: 0, raf: 0 };
    var size = { w: 0, h: 260 }, active = null, playing = true, ptr = { id: -1 };
    var els = products.map(function (p, i) {
      var b = el("button", "npx-slot"); b.type = "button"; b.setAttribute("aria-label", p.title + ", " + money(p.price)); b.dataset.i = i;
      b.innerHTML =
        '<span class="npx-sw"><span class="npx-shw" aria-hidden="true"><span class="npx-sh"></span></span>' +
        '<span class="npx-turn">' +
        ["front", "back"].map(function (side) {
          return '<span class="npx-face" data-face="' + side + '">' + hangerSvg(u) + '<span class="npx-drape"><img alt="" draggable="false" class="npx-ph"><span class="npx-shade"></span></span></span>';
        }).join("") +
        '</span><span class="npx-tagw" aria-hidden="true"><span class="npx-string"></span><span class="npx-ptag"><i></i>' + money(p.price) + "</span></span></span>";
      stage.appendChild(b);
      var o = { b: b, sw: b.querySelector(".npx-sw"), turn: b.querySelector(".npx-turn"), sh: b.querySelector(".npx-sh"), drape: b.querySelector('[data-face="front"] .npx-drape'), shade: b.querySelector('[data-face="front"] .npx-shade'), tag: b.querySelector(".npx-tagw") };
      var imgs = b.querySelectorAll(".npx-ph"), front = sized(p.featured_image, 600), back = sized(p.images[1] || p.featured_image, 600);
      imgs[0].src = front; imgs[1].src = back;
      Promise.all([cutout(front), cutout(back)]).then(function (r) {
        imgs[0].src = r[0].src; imgs[1].src = r[1].src;
        b.classList.toggle("is-cut", r[0].cut);
        var m = 'url("' + r[0].src + '") top center / contain no-repeat';
        if (r[0].cut) [o.sh, o.shade].forEach(function (x) { x.style.webkitMask = m; x.style.mask = m; });
        b.querySelector('[data-face="back"] .npx-shade').style.cssText = r[1].cut ? '-webkit-mask:url("' + r[1].src + '") top center / contain no-repeat;mask:url("' + r[1].src + '") top center / contain no-repeat' : "";
      });
      S.x[i] = S.tx[i] = 0; S.vx[i] = 0; S.turn[i] = S.tturn[i] = REST; S.vturn[i] = 0; S.swing[i] = S.vswing[i] = S.tag[i] = S.vtag[i] = 0;
      return o;
    });

    function targets() {
      var h = size.h, feet = products.map(function (_, i) { return footprint(h, i === active ? 0 : REST, sideW) + h * GAP; });
      var total = feet.reduce(function (a, f) { return a + f; }, 0), cur = (size.w - total) / 2;
      return feet.map(function (f) { var x = cur + f / 2; cur += f; return x; });
    }
    function layout() {
      var h = size.h, boxW = h * ASPECT, railY = Math.round(h * 0.07) + 10, railR = Math.max(3, Math.round((4.6 / VB_H) * h * 10) / 10);
      stage.style.height = Math.round(railY + h + h * 0.05 + 12) + "px";
      bar.style.top = railY - railR + "px"; bar.style.height = railR * 2 + "px";
      els.forEach(function (o, i) {
        o.b.style.top = railY - (HOOK_TOP / VB_H) * h + "px"; o.b.style.width = boxW + "px"; o.b.style.height = h + "px";
        o.b.querySelector(".npx-shw").style.filter = "blur(" + Math.max(3, h * 0.022).toFixed(1) + "px)";
        o.tag.style.top = (32 / VB_H) * h + "px";
      });
      var xs = targets(); for (var i = 0; i < n; i++) { S.tx[i] = xs[i]; S.tturn[i] = i === active ? 0 : REST; }
    }
    function paint(i) {
      var h = size.h, w = h * ASPECT, o = els[i], a = S.turn[i], e = clamp(1 - a / REST, 0, 1);
      o.b.style.transform = "translate3d(" + (S.x[i] - w / 2).toFixed(2) + "px,0,0)";
      o.b.style.zIndex = i === active ? 30 : 10 + i;
      o.sw.style.transform = "rotate(" + S.swing[i].toFixed(3) + "deg)";
      o.turn.style.transform = "perspective(" + PERSP + "px) rotateY(" + a.toFixed(2) + "deg)";
      o.drape.style.setProperty("--drape", clamp(-S.vswing[i] * 0.018, -5, 5).toFixed(3) + "deg");
      o.shade.style.opacity = (1 - lambert(a)).toFixed(3);
      o.sh.style.transform = "translate3d(" + (w * 0.05).toFixed(1) + "px," + (h * 0.035).toFixed(1) + "px,0) scaleX(" + Math.max(0.12, Math.abs(Math.cos((a * Math.PI) / 180))).toFixed(3) + ")";
      o.tag.style.transform = "rotate(" + (-12 + S.tag[i]).toFixed(2) + "deg)";
    }
    function step(now) {
      var dt = S.last ? Math.min(0.034, (now - S.last) / 1000) : 1 / 60, h = size.h, busy = false, sdt = dt / 2;
      S.last = now;
      for (var k = 0; k < 2; k++) {
        for (var i = 0; i < n; i++) {
          var before = S.vx[i];
          if (i !== S.drag) {
            var rest = now > S.free, stiff = rest ? 130 : 0, damp = rest ? 2 * Math.sqrt(130) * 0.86 : 3.2;
            S.vx[i] = before + (-stiff * (S.x[i] - S.tx[i]) - damp * before) * sdt; S.x[i] += S.vx[i] * sdt;
          }
          var acc = (S.vx[i] - before) / sdt;
          S.vturn[i] += (-150 * (S.turn[i] - S.tturn[i]) - 2 * Math.sqrt(150) * 0.78 * S.vturn[i]) * sdt; S.turn[i] += S.vturn[i] * sdt;
          S.vswing[i] += (-24 * S.swing[i] - 2.1 * S.vswing[i] - clamp(acc, -6000, 6000) * 0.0045) * sdt;
          S.swing[i] = clamp(S.swing[i] + S.vswing[i] * sdt, -12, 12);
          S.vtag[i] += (-46 * (S.tag[i] - S.swing[i] * 0.6) - 3.4 * S.vtag[i] - S.vswing[i] * 0.9) * sdt;
          S.tag[i] = clamp(S.tag[i] + S.vtag[i] * sdt, -30, 30);
        }
        for (var pass = 0; pass < 2; pass++) for (var j = 0; j < n - 1; j++) {
          var a = S.x[j], b = S.x[j + 1], gap = (footprint(h, S.turn[j], sideW) + footprint(h, S.turn[j + 1], sideW)) / 2 + h * 0.012, ov = gap - (b - a);
          if (ov <= 0) continue;
          if (j === S.drag) S.x[j + 1] = b + ov; else if (j + 1 === S.drag) S.x[j] = a - ov; else { S.x[j] = a - ov / 2; S.x[j + 1] = b + ov / 2; }
          if (S.vx[j] > S.vx[j + 1]) { var sh = (S.vx[j] + S.vx[j + 1]) / 2; if (j !== S.drag) S.vx[j] = sh; if (j + 1 !== S.drag) S.vx[j + 1] = sh; }
        }
        var edge = h * 0.06, first = edge + footprint(h, S.turn[0], sideW) / 2, last = size.w - edge - footprint(h, S.turn[n - 1], sideW) / 2;
        if (S.x[0] < first) { S.x[0] = first; S.vx[0] = Math.abs(S.vx[0]) * 0.3; }
        if (S.x[n - 1] > last) { S.x[n - 1] = last; S.vx[n - 1] = -Math.abs(S.vx[n - 1]) * 0.3; }
      }
      for (var q = 0; q < n; q++) {
        paint(q);
        if (Math.abs(S.vx[q]) > 0.4 || (now > S.free && Math.abs(S.x[q] - S.tx[q]) > 0.25) || Math.abs(S.turn[q] - S.tturn[q]) > 0.05 || Math.abs(S.vturn[q]) > 0.05 || Math.abs(S.swing[q]) > 0.02 || Math.abs(S.vswing[q]) > 0.05 || Math.abs(S.tag[q]) > 0.05 || Math.abs(S.vtag[q]) > 0.08) busy = true;
      }
      if (S.drag >= 0 || now < S.free) busy = true;
      if (busy) S.raf = requestAnimationFrame(step); else { S.raf = 0; S.last = 0; }
    }
    function kick() {
      if (reduced) { for (var i = 0; i < n; i++) { S.x[i] = S.tx[i]; S.turn[i] = S.tturn[i]; paint(i); } return; }
      if (!S.raf) { S.last = 0; S.raf = requestAnimationFrame(step); }
    }
    function impulse(i, amt) { if (reduced || i < 0 || i >= n) return; S.vswing[i] += amt; kick(); }
    function caption() {
      var p = active === null ? null : products[active];
      capName.textContent = p ? p.title : capDefault;
      capDesc.textContent = p && p.desc ? p.desc.slice(0, 120) + (p.desc.length > 120 ? "\u2026" : "") : "";
      capAct.innerHTML = "";
      if (p) {
        var add = el("button", "npx-pill", p.variants[0].available ? "Quick add \u00b7 " + money(p.price) : "Sold out"); add.type = "button"; add.disabled = !p.variants[0].available;
        add.onclick = function () { addToCart(add, p.variants[0], "Quick add \u00b7 " + money(p.price)); };
        var view = el("a", "npx-link", "View piece"); view.href = p.url;
        capAct.appendChild(add); capAct.appendChild(view);
      }
    }
    function choose(i) {
      if (i === active) return;
      if (i !== null) { impulse(i - 1, -30); impulse(i + 1, 30); }
      if (active !== null) { impulse(active - 1, 14); impulse(active + 1, -14); }
      active = i; layout(); kick(); caption();
    }
    function nearest(cx, cy) {
      var r = stage.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, best = null, dist = Infinity;
      if (y < 0 || y > size.h + 46) return null;
      for (var i = 0; i < n; i++) { var half = footprint(size.h, S.turn[i], sideW) / 2 + 4, d = Math.abs(x - S.x[i]); if (d < half && d < dist) { best = i; dist = d; } }
      return best;
    }
    function stop() { playing = false; }
    stage.addEventListener("pointerdown", function (e) {
      if (e.button) return; var now = performance.now();
      ptr = { id: e.pointerId, index: nearest(e.clientX, e.clientY), x: e.clientX, y: e.clientY, moved: false, kind: e.pointerType, lastX: e.clientX, lastT: now, v: 0 };
      if (ptr.index === null) ptr.index = -1;
    });
    stage.addEventListener("pointermove", function (e) {
      if (ptr.id === e.pointerId) {
        var dx = e.clientX - ptr.x, now = performance.now();
        if (!ptr.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - ptr.y)) {
          ptr.moved = true; stop(); stage.setPointerCapture(e.pointerId);
          if (ptr.index >= 0) { S.drag = ptr.index; S.grab = e.clientX - stage.getBoundingClientRect().left - S.x[ptr.index]; }
        }
        if (ptr.moved) {
          var v = (e.clientX - ptr.lastX) / Math.max(1, now - ptr.lastT); ptr.v = ptr.v * 0.6 + v * 0.4; ptr.lastX = e.clientX; ptr.lastT = now;
          if (S.drag >= 0) { S.vx[S.drag] = ptr.v * 1000; S.x[S.drag] = e.clientX - stage.getBoundingClientRect().left - S.grab; S.free = now + 900; kick(); }
        }
        return;
      }
      if (e.pointerType !== "mouse" || dlg.open) return;
      var hit = nearest(e.clientX, e.clientY);
      if (active !== null && hit !== active) {
        var box = stage.getBoundingClientRect();
        if (Math.abs(e.clientX - box.left - S.x[active]) < footprint(size.h, 0, sideW) / 2 + 14) return;
      }
      if (hit !== null) { stop(); choose(hit); }
    });
    function finish(e, cancel) {
      if (ptr.id !== e.pointerId) return;
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      var p = ptr; ptr = { id: -1 };
      if (S.drag >= 0) { S.drag = -1; S.free = performance.now() + 700; kick(); return; }
      if (cancel || p.moved || p.index < 0) return;
      stop();
      if (p.kind !== "mouse" && active !== p.index) choose(p.index); else openDetail(p.index);
    }
    stage.addEventListener("pointerup", function (e) { finish(e, false); });
    stage.addEventListener("pointercancel", function (e) { finish(e, true); });
    stage.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && ptr.id < 0 && !dlg.open) choose(null); });
    els.forEach(function (o, i) {
      o.b.addEventListener("click", function (e) { if (e.detail === 0) openDetail(i); });
      o.b.addEventListener("focus", function () { if (ptr.id < 0) { stop(); choose(i); } });
    });
    stage.addEventListener("keydown", function (e) {
      if (["ArrowRight", "ArrowLeft"].indexOf(e.key) < 0) return; e.preventDefault(); stop();
      var nx = clamp((active === null ? 0 : active) + (e.key === "ArrowRight" ? 1 : -1), 0, n - 1); choose(nx); els[nx].b.focus({ preventScroll: true });
    });

    // Detail: the piece lifts off the rail, turn it with a drag or Front / Back.
    var dlg = el("dialog", "npx-dlg npx-rdlg"); sec.appendChild(dlg);
    function openDetail(i) {
      var p = products[i], o = els[i], fi = o.b.querySelectorAll(".npx-ph");
      dlg.innerHTML =
        '<button type="button" class="npx-dlg-x">Close <svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13"/></svg></button>' +
        '<div class="npx-dfig"><div class="npx-dwire" aria-hidden="true"></div><div class="npx-dspin-w"><div class="npx-dspin">' +
        ["front", "back"].map(function (side, k) { return '<div class="npx-dface" data-face="' + side + '">' + hangerSvg(u) + '<img alt="' + (k ? "" : esc(p.title)) + '" src="' + fi[k].src + '" class="npx-ph' + (o.b.classList.contains("is-cut") ? "" : " npx-boxed") + '"></div>'; }).join("") +
        '</div></div></div><div class="npx-dinfo"><p class="npx-dnum">' + String(i + 1).padStart(2, "0") + " / " + String(n).padStart(2, "0") + '</p><h3>' + esc(p.title) + "</h3>" +
        '<p class="npx-price">' + money(p.price) + (p.compare_at_price > p.price ? " <s>" + money(p.compare_at_price) + "</s>" : "") + "</p>" +
        (p.desc ? '<p class="npx-desc">' + esc(p.desc.slice(0, 240)) + (p.desc.length > 240 ? "\u2026" : "") + "</p>" : "") +
        '<div class="npx-fb"><button type="button" aria-pressed="true" data-s="front">Front</button><button type="button" aria-pressed="false" data-s="back">Back</button></div>' +
        '<div class="npx-dlg-act"><button type="button" class="npx-pill npx-add"' + (p.variants[0].available ? "" : " disabled") + ">" + (p.variants[0].available ? "Quick add" : "Sold out") + '</button><a class="npx-link" href="' + esc(p.url) + '">View piece</a></div></div>';
      var spin = dlg.querySelector(".npx-dspin"), A = { v: 0, t: 0, vel: 0, raf: 0, last: 0, drag: false };
      function loop(now) {
        var dt = A.last ? Math.min(0.034, (now - A.last) / 1000) : 1 / 60; A.last = now;
        A.vel += (-90 * (A.v - A.t) - 2 * Math.sqrt(90) * 0.82 * A.vel) * dt; A.v += A.vel * dt;
        spin.style.transform = "rotateY(" + A.v.toFixed(2) + "deg)";
        if (Math.abs(A.v - A.t) < 0.05 && Math.abs(A.vel) < 0.05) { A.raf = 0; A.last = 0; return; }
        A.raf = requestAnimationFrame(loop);
      }
      function turnTo(s) {
        var base = Math.round(A.v / 360) * 360; A.t = base + (s === "back" ? 180 : 0);
        dlg.querySelectorAll(".npx-fb button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.s === s); });
        if (reduced) { A.v = A.t; spin.style.transform = "rotateY(" + A.v + "deg)"; } else if (!A.raf) A.raf = requestAnimationFrame(loop);
      }
      dlg.querySelectorAll(".npx-fb button").forEach(function (b) { b.onclick = function () { turnTo(b.dataset.s); }; });
      var w = dlg.querySelector(".npx-dspin-w");
      w.addEventListener("pointerdown", function (e) { A.drag = true; A.sx = e.clientX; A.sa = A.v; cancelAnimationFrame(A.raf); A.raf = 0; w.setPointerCapture(e.pointerId); });
      w.addEventListener("pointermove", function (e) { if (!A.drag) return; A.v = clamp(A.sa + (e.clientX - A.sx) * 0.45, A.sa - 220, A.sa + 220); spin.style.transform = "rotateY(" + A.v.toFixed(2) + "deg)"; });
      w.addEventListener("pointerup", function () { if (!A.drag) return; A.drag = false; var f = ((A.v % 360) + 360) % 360; turnTo(f > 90 && f < 270 ? "back" : "front"); });
      dlg.querySelector(".npx-add").onclick = function (e) { addToCart(e.currentTarget, p.variants[0], "Quick add"); };
      dlg.querySelector(".npx-dlg-x").onclick = function () { dlg.close(); };
      o.b.style.visibility = "hidden";
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
      var fig = dlg.querySelector(".npx-dfig"), from = o.turn.getBoundingClientRect(), to = fig.getBoundingClientRect();
      if (!reduced && from.width && fig.animate) {
        var sc = from.height / to.height, dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top - to.top, lift = Math.min(90, Math.abs(dy) * 0.25 + 30);
        fig.animate([{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sc + ")" }, { transform: "translate(" + dx * 0.4 + "px," + (dy * 0.4 - lift) + "px) scale(" + ((sc + 1) / 2) * 1.03 + ") rotate(" + (dx > 0 ? -2.5 : 2.5) + "deg)", offset: 0.5 }, { transform: "none" }], { duration: 680, easing: "cubic-bezier(.22,.85,.3,1)" });
      }
      dlg.onclose = function () { o.b.style.visibility = ""; impulse(i, (i % 2 ? 1 : -1) * 44); };
    }
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

    // Size: the pieces fill the rail width, capped so the section stays compact.
    function measure() {
      var w = stage.clientWidth; if (!w) return;
      var restK = footprint(1, REST, sideW) + GAP, actK = footprint(1, 0, sideW) + GAP, fit = (w - 24) / (n * restK + (actK - restK));
      var cap = Math.max(180, Math.min(330, window.innerHeight * 0.6 - 150));
      size = { w: w, h: Math.round(Math.max(170, Math.min(cap, fit))) };
      var fresh = !S.init; layout();
      if (fresh) { S.init = 1; for (var i = 0; i < n; i++) { S.x[i] = S.tx[i]; paint(i); } }
      kick();
    }
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(stage);
    setTimeout(function () { measure(); if (!reduced) products.forEach(function (_, i) { setTimeout(function () { impulse(i, 46 - i * 2.5); }, 120 + i * 55); }); }, 30);

    // Autoplay: each piece turns to the front in turn until the visitor touches the rail.
    var vis = false;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0.4 }).observe(stage);
    (function tick() {
      setTimeout(function () {
        if (playing && vis && !reduced && !document.hidden && !dlg.open) choose(active === null ? 0 : (active + 1) % n);
        if (playing) tick();
      }, active === null ? 1100 : 2600);
    })();
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
    var n = products.length, idx = 0, tl = null, tab = "price";
    var loggedIn = window.npLoggedIn !== false;
    var assetBase = (document.querySelector('script[src*="post-reviews-upsell"]') || {}).src || "";
    var room = assetBase ? assetBase.replace(/post-reviews-upsell\.js[^/]*$/, "npx-room.webp") : "";
    var sec = el("section", "npx-sec npx-orbit");
    sec.setAttribute("aria-roledescription", "carousel"); sec.setAttribute("aria-label", "Add These For Under R49"); sec.tabIndex = 0;
    var ICO = {
      search: '<svg class="npx-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
      menu: '<svg class="npx-ico" viewBox="0 0 24 24"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
      play: '<svg class="npx-ico npx-fill" viewBox="0 0 24 24"><path d="M6 3.5v17l14-8.5z"/></svg>',
      order: '<svg class="npx-ico npx-fill" viewBox="0 0 24 24"><path d="M12 5 3 15h18zM3 18h18v2.5H3z"/></svg>',
      up: '<svg class="npx-ico" viewBox="0 0 24 24"><path d="M7 10v10H3.5V10zM7 10l4-7c1.6 0 2.6 1.2 2.2 2.8L12.6 9H19a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/></svg>',
      star: '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>'
    };
    sec.innerHTML =
      (room ? '<img class="npx-bd" alt="" src="' + room + '" loading="lazy"><div class="npx-dim"></div><div class="npx-wash"></div>' : "") +
      '<div class="npx-oc">' +
      '<svg class="npx-arc" viewBox="0 0 960 520" aria-hidden="true"><path style="opacity:.34"/></svg>' +
      '<p class="npx-olabel">Little extras \u00b7 under R49</p>' +
      '<div class="npx-top"><a class="npx-ib" href="/search" aria-label="Search">' + ICO.search + '</a><a class="npx-ib" href="/collections/all" aria-label="All products">' + ICO.menu + "</a></div>" +
      '<div class="npx-pager" role="tablist" aria-label="Choose a product"></div>' +
      '<div class="npx-plates"></div><div class="npx-titles" aria-live="polite"></div>' +
      '<div class="npx-acts"><a class="npx-ab npx-view">' + ICO.play + 'View product</a><button type="button" class="npx-ab npx-qa">' + ICO.order + "Quick add</button></div>" +
      '<div class="npx-card"><div class="npx-tabs" role="tablist" aria-label="Product details"><button type="button" role="tab" data-t="price" aria-selected="true">Price</button><button type="button" role="tab" data-t="reviews" aria-selected="false">Reviews</button></div><div class="npx-bodies"></div></div>' +
      '<div class="npx-strip"><button type="button" class="npx-tri npx-op" aria-label="Previous"><svg viewBox="0 0 12 16"><path d="M11 0v16L0 8z"/></svg></button><div class="npx-win"><div class="npx-track"></div></div><button type="button" class="npx-tri npx-on" aria-label="Next"><svg viewBox="0 0 12 16"><path d="M1 0v16l11-8z"/></svg></button></div>' +
      '<div class="npx-zoom" hidden><img alt=""></div>' +
      "</div>";
    var canvas = sec.querySelector(".npx-oc"), arcEl = canvas.querySelector(".npx-arc path"), arc = { a0: 50, a1: 98 };
    var plates = [], heads = [], bodies = [], dots = [], thumbs = [], likes = {}, reviews = {};
    var zoom = canvas.querySelector(".npx-zoom");

    function plate(p, cls) {
      var d = el("div", cls, '<span class="npx-rim"></span><img alt="' + esc(p.title) + '" draggable="false" loading="lazy" src="' + esc(sized(p.featured_image, 520)) + '">');
      var img = d.querySelector("img");
      cutout(sized(p.featured_image, 520)).then(function (r) { img.src = r.src; d.classList.toggle("is-cut", r.cut); });
      return d;
    }
    products.forEach(function (p, i) {
      var accent = ACCENTS[i % ACCENTS.length];
      var pl = el("div", "npx-orb"); pl.appendChild(plate(p, "npx-plate"));
      canvas.querySelector(".npx-plates").appendChild(pl); plates.push(pl);
      var words = p.title.split(" "), cut = Math.max(1, Math.min(3, Math.ceil(words.length / 3)));
      var t1 = words.slice(0, cut).join(" "), t2 = words.slice(cut, cut + 3).join(" ") || money(p.price);
      var hd = el("div", "npx-ot",
        '<p class="npx-oeye">#' + (i + 1) + " under R49</p><h3>" +
        '<span class="npx-t1" style="font-size:' + Math.min(56, 330 / (Math.max(1, t1.length) * 0.56)).toFixed(1) + 'px">' + esc(t1) + "</span>" +
        '<span class="npx-t2" style="font-size:' + Math.min(62, 320 / (Math.max(1, t2.length) * 0.64)).toFixed(1) + 'px">' + esc(t2) + "</span></h3>");
      canvas.querySelector(".npx-titles").appendChild(hd); heads.push(hd);
      var bd = el("div", "npx-body");
      bd.dataset.accent = accent;
      canvas.querySelector(".npx-bodies").appendChild(bd); bodies.push(bd);
      var d = el("button", "npx-dot", "<i></i>"); d.type = "button"; d.setAttribute("role", "tab"); d.setAttribute("aria-label", p.title);
      d.onclick = function () { go(i); }; canvas.querySelector(".npx-pager").appendChild(d); dots.push(d);
      var th = el("div", "npx-th"), tb = el("button"); tb.type = "button";
      tb.appendChild(plate(p, "npx-mini")); tb.appendChild(el("span", null, esc(p.title)));
      tb.onclick = function () { go(i); }; th.appendChild(tb); canvas.querySelector(".npx-track").appendChild(th); thumbs.push(tb);
    });

    function stars(avg) {
      var s = ""; for (var k = 1; k <= 5; k++) s += '<i class="' + (avg >= k - 0.25 ? "on" : avg >= k - 0.75 ? "half" : "") + '">' + ICO.star + "</i>"; return '<span class="npx-stars">' + s + "</span>";
    }
    function likeRow(p) {
      var L = likes[p.id] || { count: 0, heads: [], mine: false };
      var hs = L.heads.slice(0, 5).map(function (src, k) {
        return src ? '<button type="button" class="npx-head" data-src="' + esc(src) + '" aria-label="Enlarge picture" style="z-index:' + (9 - k) + '"><img alt="" src="' + esc(src) + '" loading="lazy"></button>'
          : '<span class="npx-head npx-blank" style="z-index:' + (9 - k) + '"></span>';
      }).join("");
      var more = L.count > 5 ? '<span class="npx-more">+' + (L.count - 5) + "</span>" : "";
      return '<div class="npx-react"><button type="button" class="npx-like" aria-pressed="' + !!L.mine + '">' + ICO.up + "<span>" + L.count + (L.count === 1 ? " like" : " likes") + "</span></button>" +
        (hs ? '<span class="npx-heads">' + hs + more + "</span>" : "") + "</div>";
    }
    function renderBody(i) {
      var p = products[i], bd = bodies[i], accent = bd.dataset.accent, save = p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
      var R = reviews[p.id];
      var html;
      if (tab === "price") {
        html = '<div class="npx-rate"><div class="npx-badge" style="background:' + accent + '"><svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/></svg></div><span class="npx-num">' + money(p.price) + "</span></div>" +
          '<p class="npx-chef">' + esc(p.title.length > 34 ? p.title.slice(0, 33) + "\u2026" : p.title) + "</p>" +
          '<p class="npx-kit">' + esc(p.type || "Little extra") + (save ? " \u00b7 save " + save + "%" : "") + (p.compare_at_price > p.price ? " \u00b7 was " + money(p.compare_at_price) : "") + "</p>" +
          '<p class="npx-desc">' + esc((p.desc || "A little extra to finish the moment.").slice(0, 120)) + ((p.desc || "").length > 120 ? "\u2026" : "") + "</p>";
      } else if (!R) {
        html = '<div class="npx-rate"><div class="npx-badge" style="background:' + accent + '">' + ICO.star + '</div><span class="npx-num">\u2026</span></div><p class="npx-kit">Loading reviews</p><p class="npx-desc"></p>';
      } else if (!R.count) {
        html = '<div class="npx-rate"><div class="npx-badge" style="background:' + accent + '">' + ICO.star + '</div><span class="npx-num">\u2013</span></div>' +
          '<p class="npx-chef">No stars yet</p>' +
          (loggedIn ? '<p class="npx-desc">Bought this? Be the first to <a href="' + esc(p.url) + '#npRevSection">give it stars</a>.</p>'
            : '<p class="npx-desc"><button type="button" class="npx-signin">Sign in</button> to like or give a star rating.</p>');
      } else {
        html = '<div class="npx-rate"><div class="npx-badge" style="background:' + accent + '">' + ICO.star + '</div><span class="npx-num">' + R.average.toFixed(1) + "</span></div>" +
          '<p class="npx-chef">' + stars(R.average) + "</p>" +
          '<p class="npx-kit">' + R.count + (R.count === 1 ? " honest review" : " honest reviews") + "</p>" +
          (R.quote ? '<p class="npx-desc">\u201c' + esc(R.quote) + "\u201d</p>" : '<p class="npx-desc"></p>') +
          (loggedIn ? "" : '<p class="npx-kit"><button type="button" class="npx-signin">Sign in</button> to like or rate.</p>');
      }
      bd.innerHTML = html + likeRow(p);
      bd.querySelectorAll("a,button").forEach(function (x) { x.tabIndex = i === idx ? 0 : -1; });
      var lk = bd.querySelector(".npx-like");
      lk.onclick = function () { like(p, i, lk); };
      bd.querySelectorAll(".npx-head[data-src]").forEach(function (h) { h.onclick = function (e) { e.stopPropagation(); openZoom(h.dataset.src); }; });
      bd.querySelectorAll(".npx-signin").forEach(function (b) { b.onclick = signIn; });
    }
    function signIn() { if (typeof window.npShowAuth === "function") window.npShowAuth("Sign in to like or rate products."); else location.href = "/account/login?return_url=" + encodeURIComponent(location.pathname); }
    function openZoom(src) { zoom.querySelector("img").src = src; zoom.hidden = false; }
    zoom.onclick = function () { zoom.hidden = true; };
    function like(p, i, btn) {
      if (!loggedIn) return signIn();
      var L = likes[p.id] || { count: 0, heads: [], mine: false };
      L.mine = !L.mine; L.count += L.mine ? 1 : -1; likes[p.id] = L; renderBody(i);
      fetch("/apps/nalea/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: p.id }) })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) { likes[p.id] = { count: d.count, heads: d.heads || [], mine: d.mine }; renderBody(i); })
        .catch(function () { L.mine = !L.mine; L.count += L.mine ? 1 : -1; renderBody(i); });
    }
    function loadReviews(i) {
      var p = products[i]; if (!p.id || reviews[p.id]) return;
      fetch("/apps/nalea/reviews?product_id=" + p.id).then(function (r) { return r.json(); }).then(function (d) {
        var list = (d && d.reviews) || [], best = list.filter(function (r) { return r.rating >= 4 && (r.body || r.text); })[0];
        var q = best ? String(best.body || best.text) : "";
        reviews[p.id] = { count: d.count || 0, average: d.average || 0, quote: q.length > 110 ? q.slice(0, 109) + "\u2026" : q };
      }).catch(function () { reviews[p.id] = { count: 0, average: 0 }; }).then(function () { if (i === idx) renderBody(i); });
    }
    var ids = products.map(function (p) { return p.id; }).filter(Boolean);
    if (ids.length) fetch("/apps/nalea/likes?ids=" + ids.join(",")).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.likes) { Object.keys(d.likes).forEach(function (k) { likes[k] = d.likes[k]; }); renderBody(idx); }
    }).catch(function () {});
    canvas.querySelectorAll(".npx-tabs button").forEach(function (b) {
      b.onclick = function () {
        tab = b.dataset.t; canvas.querySelectorAll(".npx-tabs button").forEach(function (x) { x.setAttribute("aria-selected", x === b); });
        if (tab === "reviews") loadReviews(idx);
        renderBody(idx);
      };
    });
    canvas.querySelector(".npx-qa").onclick = function (e) { var p = products[idx]; addToCart(e.currentTarget, p.variants[0], ICO.order + "Quick add"); };

    function drawArc() { arcEl.setAttribute("d", arcPath(arc.a0, arc.a1, 299, -450, 650, 118)); }
    function chrome() {
      dots.forEach(function (d, k) { d.toggleAttribute("aria-current", k === idx); d.setAttribute("aria-selected", k === idx); });
      thumbs.forEach(function (t, k) { t.toggleAttribute("aria-current", k === idx); });
      var start = n <= 4 ? 0 : Math.max(0, Math.min(idx - 1, n - 4));
      canvas.querySelector(".npx-track").style.transform = "translateX(" + -start * 118 + "px)";
      canvas.querySelector(".npx-view").href = products[idx].url;
      canvas.querySelector(".npx-qa").disabled = !products[idx].variants[0].available;
      if (tab === "reviews") loadReviews(idx);
      renderBody(idx);
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
    sec.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1, 1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1, -1); } else if (e.key === "Escape") zoom.hidden = true; });
    swipe(canvas.querySelector(".npx-plates"), function (d) { go(idx + d, d); });
    var ap = autoplay(sec, 5200, function () { if (zoom.hidden) go(idx + 1, 1); });
    function fit() { var w = sec.clientWidth, h = sec.clientHeight; canvas.style.setProperty("--s", Math.min(w / 960, h / 520, 1.4)); }
    // The room photo blends into the page colour: on a dark page the white wall must vanish too.
    function tone() {
      var m = getComputedStyle(sec).color.match(/\d+(\.\d+)?/g);
      var lum = m ? (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 : 0;
      sec.toggleAttribute("data-dark", lum > 0.6);
    }
    tone();
    var hero = document.querySelector(".snp-root");
    if (hero) new MutationObserver(tone).observe(hero, { attributes: true, attributeFilter: ["style"] });
    new MutationObserver(tone).observe(document.documentElement, { attributes: true, attributeFilter: ["data-nx-theme", "class"] });
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(sec);
    setTimeout(function () { fit(); show(0, 1); }, 0);
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
  var RUN_CATS = [
    { label: "For you", handle: "" },
    { label: "Handbags", handle: "handbags" },
    { label: "Lipsticks", handle: "lip-studio" },
    { label: "Graduation", handle: "graduation-gifts" },
    { label: "Anniversary", handle: "anniversary-gifts" },
    { label: "Makeup accessories", handle: "make-up-tools" }
  ];
  var LOVED_KEY = "naleaxoxo_loved_items";
  function lovedList() { try { return JSON.parse(localStorage.getItem(LOVED_KEY) || "[]") || []; } catch (e) { return []; } }
  function isLoved(p) { return lovedList().some(function (x) { return (x.url || "") === p.url || String(x.id || x.product_id || "") === String(p.id); }); }
  function toggleLoved(p) {
    var list = lovedList(), on = isLoved(p);
    list = on ? list.filter(function (x) { return (x.url || "") !== p.url && String(x.id || x.product_id || "") !== String(p.id); })
      : list.concat([{ id: p.id, product_id: p.id, url: p.url, title: p.title, image: p.featured_image, price: p.price }]);
    try { localStorage.setItem(LOVED_KEY, JSON.stringify(list)); } catch (e) {}
    return !on;
  }
  var HEART = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.4S2.2 9.9 2.2 6.1A2.9 2.9 0 0 1 8 4.8a2.9 2.9 0 0 1 5.8 1.3C13.8 9.9 8 13.4 8 13.4Z"/></svg>';
  var THUMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v10H3.5V10zM7 10l4-7c1.6 0 2.6 1.2 2.2 2.8L12.6 9H19a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7"/></svg>';
  var PLUS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11"/></svg>';

  function buildRunway(initial) {
    var products = [], n = 0, pos = { v: 0 }, index = -1, tw = null, likes = {}, catIdx = 0;
    var loggedIn = window.npLoggedIn !== false;
    var sec = el("section", "npx-sec npx-run");
    sec.setAttribute("aria-roledescription", "carousel"); sec.setAttribute("aria-label", "You'll Also Adore"); sec.tabIndex = 0;
    var nav = el("nav", "npx-rnav npx-cap"); nav.setAttribute("aria-label", "Shop by category");
    RUN_CATS.forEach(function (c, i) {
      var b = el("button", "npx-rlnk", esc(c.label)); b.type = "button"; if (!i) b.setAttribute("aria-current", "page");
      b.onclick = function () { pick(i); };
      nav.appendChild(b);
    });
    sec.appendChild(nav);
    var body = el("div", "npx-run-body");
    var stage = el("div", "npx-stage");
    stage.appendChild(el("div", "npx-copy", '<h2 class="npx-rtitle npx-cap">You\'ll Also Adore</h2><p class="npx-rblurb">Hand-picked to go with what you\'re viewing. Tap a look to bring it forward, or pick a category above.</p>'));
    var figWrap = el("div", "npx-figs"); stage.appendChild(figWrap);
    var foot = el("div", "npx-foot",
      '<p class="npx-look npx-cap" aria-hidden="true"><span>Look</span><span class="npx-lnum"></span></p>' +
      '<div class="npx-foot-act"><a class="npx-shop npx-cap" href="#">Shop the look</a><button type="button" class="npx-arrow npx-rp" aria-label="Previous look">' + ARROW_L + '</button><button type="button" class="npx-arrow npx-rn" aria-label="Next look">' + ARROW_R + "</button></div>" +
      '<div class="npx-mobact"></div>');
    stage.appendChild(foot);
    body.appendChild(stage);
    var rail = el("div", "npx-rrail"); body.appendChild(rail);
    sec.appendChild(body);
    var sr = el("p", "npx-sr"); sr.setAttribute("aria-live", "polite"); sec.appendChild(sr);
    var figs = [], cards = [];

    function likeHTML(p) {
      var L = likes[p.id] || { count: 0, heads: [], mine: false };
      var hs = L.heads.slice(0, 5).map(function (src, k) {
        return src ? '<button type="button" class="npx-head" data-src="' + esc(src) + '" aria-label="Enlarge picture" style="z-index:' + (9 - k) + '"><img alt="" src="' + esc(src) + '" loading="lazy"></button>'
          : '<span class="npx-head npx-blank" style="z-index:' + (9 - k) + '"></span>';
      }).join("");
      return '<button type="button" class="npx-rlike" aria-pressed="' + !!L.mine + '">' + THUMB + "<span>" + L.count + "</span></button>" +
        (hs ? '<span class="npx-heads">' + hs + (L.count > 5 ? '<span class="npx-more">+' + (L.count - 5) + "</span>" : "") + "</span>" : "");
    }
    function signIn() { if (typeof window.npShowAuth === "function") window.npShowAuth("Sign in to like products."); else location.href = "/account/login?return_url=" + encodeURIComponent(location.pathname); }
    var zoom = el("div", "npx-zoom", '<img alt="">'); zoom.hidden = true; zoom.onclick = function () { zoom.hidden = true; }; sec.appendChild(zoom);
    function wireLikes(box, p) {
      var b = box.querySelector(".npx-rlike");
      if (b) b.onclick = function () {
        if (!loggedIn) return signIn();
        var L = likes[p.id] || { count: 0, heads: [], mine: false };
        L.mine = !L.mine; L.count += L.mine ? 1 : -1; likes[p.id] = L; refreshLikes(p);
        fetch("/apps/nalea/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: p.id }) })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function (d) { likes[p.id] = { count: d.count, heads: d.heads || [], mine: d.mine }; refreshLikes(p); })
          .catch(function () { L.mine = !L.mine; L.count += L.mine ? 1 : -1; refreshLikes(p); });
      };
      box.querySelectorAll(".npx-head[data-src]").forEach(function (h) { h.onclick = function (e) { e.stopPropagation(); zoom.querySelector("img").src = h.dataset.src; zoom.hidden = false; }; });
    }
    function refreshLikes(p) {
      sec.querySelectorAll('[data-likes="' + p.id + '"]').forEach(function (box) { box.innerHTML = likeHTML(p); wireLikes(box, p); });
    }
    function heartBtn(p) {
      var h = el("button", "npx-rheart", HEART); h.type = "button";
      h.setAttribute("aria-label", "Save " + p.title + " to My Loved Items"); h.setAttribute("aria-pressed", isLoved(p));
      h.onclick = function () { var on = toggleLoved(p); sec.querySelectorAll('[data-heart="' + p.id + '"]').forEach(function (x) { x.setAttribute("aria-pressed", on); }); };
      h.dataset.heart = p.id;
      return h;
    }

    function setProducts(list) {
      products = list; n = list.length; figWrap.innerHTML = ""; rail.innerHTML = ""; figs = []; cards = [];
      figs = list.map(function (p, i) {
        var f = el("div", "npx-fig", '<img alt="' + esc(p.title) + '" draggable="false"><i></i><button type="button" class="npx-hit" aria-label="' + esc(p.title) + '"></button>');
        var img = f.querySelector("img"), src = sized(p.featured_image, 700);
        img.src = src;
        cutout(src).then(function (r) { img.src = r.src; f.classList.toggle("is-cut", r.cut); size(); });
        f.querySelector(".npx-hit").onclick = function () { bring(i); };
        figWrap.appendChild(f); return f;
      });
      cards = list.map(function (p, i) {
        var c = el("div", "npx-rcard");
        c.appendChild(heartBtn(p));
        c.appendChild(el("div", "npx-rpic", '<img alt="" loading="lazy" src="' + esc(sized(p.featured_image, 500)) + '">'));
        var im = c.querySelector(".npx-rpic img"); cutout(sized(p.featured_image, 500)).then(function (r) { im.src = r.src; c.classList.toggle("is-cut", r.cut); });
        c.appendChild(el("div", "npx-rmeta",
          '<a class="npx-rname npx-cap" href="' + esc(p.url) + '">' + esc(p.title) + '</a><span class="npx-rprice">' + money(p.price) + (p.compare_at_price > p.price ? " <s>" + money(p.compare_at_price) + "</s>" : "") + "</span>" +
          '<span class="npx-rlikes" data-likes="' + p.id + '"></span>' +
          '<button type="button" class="npx-plus" aria-label="Quick add ' + esc(p.title) + '"' + (p.variants[0].available ? "" : " disabled") + ">" + PLUS + "</button>"));
        c.querySelector(".npx-plus").onclick = function (e) { addToCart(e.currentTarget, p.variants[0], PLUS); };
        rail.appendChild(c); return c;
      });
      list.forEach(function (p) { refreshLikes(p); });
      var ids = list.map(function (p) { return p.id; }).filter(function (id) { return id && !likes[id]; });
      if (ids.length) fetch("/apps/nalea/likes?ids=" + ids.join(",")).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.likes) { Object.keys(d.likes).forEach(function (k) { likes[k] = d.likes[k]; }); products.forEach(refreshLikes); }
      }).catch(function () {});
      pos.v = 0; index = -1; size();
    }
    var cache = { 0: initial };
    function pick(i) {
      if (i === catIdx) return; catIdx = i;
      nav.querySelectorAll(".npx-rlnk").forEach(function (b, k) { b.toggleAttribute("aria-current", k === i); });
      if (cache[i]) { setProducts(cache[i]); return; }
      sec.classList.add("is-loading");
      fetch("/collections/" + RUN_CATS[i].handle + "/products.json?limit=12").then(function (r) { return r.json(); }).then(function (d) {
        var list = ((d && d.products) || []).map(normStore).filter(function (p) { return p.featured_image && p.price > 0 && String(p.id) !== String(window.npProductId); }).slice(0, 8);
        if (list.length < 2) list = initial;
        cache[i] = list; if (catIdx === i) setProducts(list);
      }).catch(function () { setProducts(initial); }).then(function () { sec.classList.remove("is-loading"); });
    }

    var W = 1, H = 1, RH = 1;
    function render() {
      if (!n) return;
      var p = pos.v;
      figs.forEach(function (f, i) {
        var d = ((((i - p + 1) % n) + n) % n) - 1, q = pose(d, W, H, n);
        f.style.transform = "translate3d(" + q.x.toFixed(1) + "px," + q.y.toFixed(1) + "px,0) scale(" + q.scale.toFixed(4) + ")";
        f.style.filter = q.blur > 0.15 ? "blur(" + (q.blur / q.scale).toFixed(2) + "px)" : "none";
        f.style.opacity = q.alpha.toFixed(3);
        f.style.visibility = q.alpha < 0.01 || q.x > W * 1.6 ? "hidden" : "visible";
        f.style.zIndex = String(Math.round(400 - d * 40));
      });
      var cardH = Math.max(150, RH * 0.5), gap = 4, total = n * (cardH + gap), lap = Math.floor(p / n), scroll = lap * total + (p - lap * n) * (cardH + gap);
      var now = ((Math.round(p) % n) + n) % n;
      cards.forEach(function (c, i) {
        var y = i * (cardH + gap) - scroll; y = ((((y + cardH + gap) % total) + total) % total) - (cardH + gap);
        c.style.height = cardH + "px"; c.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
        c.toggleAttribute("data-on", i === now);
        c.toggleAttribute("data-tint", i % 2 === 0);
      });
      if (now !== index) { index = now; label(); }
    }
    function label() {
      var p = products[index], num = String(index + 1).padStart(2, "0"), box = foot.querySelector(".npx-lnum");
      box.innerHTML = num.split("").map(function (c) { return '<span class="npx-dg"><span>' + c + "</span></span>"; }).join("");
      if (window.gsap && !reduced) window.gsap.fromTo(box.querySelectorAll(".npx-dg>span"), { yPercent: 105 }, { yPercent: 0, duration: 0.55, ease: "power3.out", stagger: 0.04 });
      foot.querySelector(".npx-shop").href = p.url;
      var mob = foot.querySelector(".npx-mobact");
      mob.innerHTML = '<span class="npx-mname">' + esc(p.title) + " \u00b7 " + money(p.price) + '</span><span class="npx-rlikes" data-likes="' + p.id + '"></span><button type="button" class="npx-plus" aria-label="Quick add"' + (p.variants[0].available ? "" : " disabled") + ">" + PLUS + "</button>";
      mob.insertBefore(heartBtn(p), mob.firstChild);
      mob.querySelector(".npx-plus").onclick = function (e) { addToCart(e.currentTarget, p.variants[0], PLUS); };
      refreshLikes(p);
      sr.textContent = "Look " + (index + 1) + " of " + n + ": " + p.title;
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
    sec.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); step(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); } else if (e.key === "Escape") zoom.hidden = true; });
    swipe(stage, step);
    var ap = autoplay(sec, 4200, function () { if (zoom.hidden && n > 1) step(1); });
    function size() {
      sec.toggleAttribute("data-narrow", sec.clientWidth < 720);
      W = figWrap.clientWidth; H = figWrap.clientHeight; RH = rail.clientHeight || H;
      var base = pose(0, W, H, n).base * (sec.hasAttribute("data-narrow") ? 0.8 : 1);
      figs.forEach(function (f) {
        var cut = f.classList.contains("is-cut");
        f.firstChild.style.height = (cut ? base : base * 0.62) + "px"; f.firstChild.style.width = base * 0.62 + "px";
        f.children[1].style.width = base * 0.36 + "px"; f.children[1].style.height = base * 0.035 + "px";
        f.children[2].style.height = base + "px"; f.children[2].style.width = base * 0.62 + "px";
      });
      render();
    }
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(sec);
    setProducts(initial);
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
      ".npx-rail{height:auto;padding-bottom:6px}" +
      ".npx-rail-hd{display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:clamp(14px,2.4vw,26px);text-align:center}" +
      ".npx-rail-hd .npx-eye{letter-spacing:.28em}" +
      ".npx-rstage{position:relative;width:100%;margin-top:10px;touch-action:pan-y;user-select:none;overflow-x:clip;--mf:color-mix(in oklab,var(--foreground,#111) 55%,var(--background,#fff))}" +
      ".npx-bar{position:absolute;left:0;right:0;z-index:0;pointer-events:none}" +
      ".npx-bar i,.npx-bar b{position:absolute;display:block}" +
      ".npx-bar-sh{left:0;right:0;top:calc(100% + 1px);height:12px;border-radius:99px;background:color-mix(in oklab,var(--foreground,#111) 10%,transparent);filter:blur(5px)}" +
      ".npx-bar-chrome{inset:0;border-radius:99px;background:linear-gradient(to bottom,color-mix(in oklab,var(--mf) 35%,white) 0%,white 18%,color-mix(in oklab,var(--mf) 70%,white) 38%,var(--mf) 62%,color-mix(in oklab,var(--mf) 55%,black) 100%);box-shadow:0 1px 0 color-mix(in oklab,var(--foreground,#111) 18%,transparent)}" +
      ".npx-bar-brush{inset:0;border-radius:99px;opacity:.4;mix-blend-mode:overlay;background:repeating-linear-gradient(90deg,transparent 0 2px,color-mix(in oklab,white 40%,transparent) 2px 3px,transparent 3px 7px)}" +
      ".npx-bracket{left:6px;top:50%;width:16px;height:28px;transform:translateY(-50%);border-radius:3px;background:linear-gradient(to right,color-mix(in oklab,var(--mf) 60%,white),var(--mf) 55%,color-mix(in oklab,var(--mf) 60%,black));box-shadow:0 3px 6px color-mix(in oklab,var(--foreground,#111) 18%,transparent)}" +
      ".npx-bracket.npx-r{left:auto;right:6px}.npx-bracket s{position:absolute;left:50%;top:4px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:color-mix(in oklab,var(--foreground,#111) 35%,transparent)}.npx-bracket s+s{top:auto;bottom:4px}" +
      ".npx-slot{position:absolute;left:0;padding:0!important;margin:0;border:0!important;border-radius:12px!important;background:none!important;box-shadow:none!important;color:inherit!important;cursor:pointer;outline:none}" +
      ".npx-slot:focus-visible{outline:2px solid currentColor;outline-offset:4px}" +
      ".npx-sw{position:absolute;inset:0;transform-origin:50% 1.3%}" +
      ".npx-shw{position:absolute;inset:0;pointer-events:none}.npx-sh{position:absolute;left:0;right:0;top:8%;bottom:0;display:block;background:#000;opacity:.16}" +
      ".npx-slot:not(.is-cut) .npx-sh{border-radius:10px;left:8%;right:8%;bottom:20%}" +
      ".npx-turn{position:absolute;inset:0;transform-style:preserve-3d;border-radius:8px}" +
      ".npx-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}.npx-face[data-face=back]{transform:rotateY(180deg)}" +
      ".npx-hsvg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:2}" +
      ".npx-drape{position:absolute;inset:0;transform-origin:top;transform:skewX(var(--drape,0deg))}" +
      ".npx-face[data-face=back] .npx-drape{transform:skewX(calc(var(--drape,0deg) * -1))}" +
      ".npx-ph{position:absolute;left:0;right:0;top:8%;bottom:0;width:100%;height:92%;max-width:none;object-fit:contain;object-position:top;pointer-events:none;user-select:none}" +
      ".npx-slot:not(.is-cut) .npx-ph,.npx-boxed{left:8%;width:84%;height:auto!important;aspect-ratio:1;object-fit:cover;border-radius:6px;box-shadow:0 10px 20px -12px rgba(0,0,0,.5)}" +
      ".npx-shade{position:absolute;left:0;right:0;top:8%;bottom:0;background:#000;pointer-events:none;opacity:.2}" +
      ".npx-slot:not(.is-cut) .npx-shade{left:8%;right:8%;bottom:auto;aspect-ratio:1;border-radius:6px}" +
      ".npx-tagw{position:absolute;left:50%;transform-origin:top;pointer-events:none;z-index:3}" +
      ".npx-string{display:block;width:1px;height:14px;margin-left:3px;background:color-mix(in oklab,var(--foreground,#111) 35%,transparent)}" +
      ".npx-ptag{position:relative;display:block;transform:translateX(calc(-50% + 3px));white-space:nowrap;border-radius:3px;border:1px solid color-mix(in oklab,var(--foreground,#111) 10%,transparent);background:var(--background,#fff);color:var(--foreground,#111);padding:8px 6px 4px;font-size:9px;font-weight:600;line-height:1;letter-spacing:.04em;box-shadow:0 2px 6px color-mix(in oklab,var(--foreground,#111) 18%,transparent)}" +
      ".npx-ptag i{position:absolute;left:50%;top:3px;width:3px;height:3px;margin-left:-1.5px;border-radius:50%;background:color-mix(in oklab,var(--foreground,#111) 30%,transparent)}" +
      ".npx-rcap{display:flex;flex-direction:column;align-items:center;gap:10px;padding:2px 16px 14px;text-align:center;min-height:96px}" +
      ".npx-capname{margin:0;font-size:14px;font-weight:500}.npx-capdesc{margin:0;max-width:46ch;font-size:13px;line-height:1.5;color:color-mix(in oklab,currentColor 60%,transparent)}.npx-capdesc:empty{display:none}" +
      ".npx-capact{display:flex;gap:14px;align-items:center}.npx-capact:empty{display:none}" +
      ".npx-pill{appearance:none;border:0;border-radius:999px!important;padding:9px 18px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;background:var(--foreground,#111)!important;color:var(--background,#fff)!important}" +
      ".npx-pill:disabled{opacity:.5;cursor:default}" +
      ".npx-dlg{max-width:min(980px,94vw);width:100%;padding:0;border:0;border-radius:18px;background:var(--background,#fff);color:var(--foreground,#111);overflow:visible}" +
      ".npx-rdlg[open]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,22rem);gap:32px;align-items:center;padding:40px 32px 32px;background:color-mix(in oklab,var(--background,#fff) 94%,transparent)}" +
      ".npx-dlg::backdrop{background:color-mix(in oklab,var(--background,#000) 80%,transparent);backdrop-filter:blur(14px)}" +
      ".npx-dlg-x{position:absolute;right:14px;top:12px;z-index:3;display:inline-flex;align-items:center;gap:6px;border:0!important;background:none!important;color:color-mix(in oklab,currentColor 60%,transparent)!important;font:inherit;font-size:12px;cursor:pointer}" +
      ".npx-dlg-x svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}" +
      ".npx-dfig{position:relative;margin:0 auto;aspect-ratio:200/310;height:min(56vh,480px);transform-origin:top}" +
      ".npx-dwire{position:absolute;left:50%;width:3px;height:40vh;top:calc(-40vh + 1.3%);margin-left:-1.5px;border-radius:99px;background:linear-gradient(to right,color-mix(in oklab,gray 50%,white),gray,color-mix(in oklab,gray 50%,black))}" +
      ".npx-dspin-w{position:absolute;inset:0;perspective:1400px;cursor:grab;touch-action:pan-y}.npx-dspin{position:absolute;inset:0;transform-style:preserve-3d}" +
      ".npx-dface{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}.npx-dface[data-face=back]{transform:rotateY(180deg)}" +
      ".npx-dinfo{display:flex;flex-direction:column;gap:12px}.npx-dinfo h3{margin:0;font-size:clamp(22px,2.4vw,30px);font-weight:500;letter-spacing:-.01em}" +
      ".npx-dnum{margin:0;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.2em;opacity:.6}" +
      ".npx-fb{display:flex;gap:22px}.npx-fb button{position:relative;padding:0 0 6px!important;border:0!important;background:none!important;color:color-mix(in oklab,currentColor 55%,transparent)!important;font:inherit;font-size:14px;cursor:pointer}" +
      ".npx-fb button[aria-pressed=true]{color:inherit!important}.npx-fb button::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .3s}.npx-fb button[aria-pressed=true]::after{transform:none}" +
      ".npx-price{margin:0;font-size:18px}.npx-price s{opacity:.5;font-size:.8em}.npx-desc{margin:0;font-size:13px;line-height:1.55;opacity:.72}" +
      ".npx-dlg-act{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:4px}" +
      "@media (max-width:700px){.npx-rdlg[open]{grid-template-columns:1fr;max-height:92svh;overflow:auto;padding:36px 18px 22px;gap:16px}.npx-dfig{height:min(44svh,360px)}.npx-dwire{display:none}.npx-dinfo{text-align:center;align-items:center}}" +
      /* orbit */
      ".npx-orbit{container-type:inline-size;touch-action:pan-y;overflow:hidden;font-family:'Outfit',ui-sans-serif,system-ui,sans-serif}@media (max-width:639px){.npx-orbit{height:auto;min-height:0}}" +
      ".npx-bd{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:50% 92%;pointer-events:none;mix-blend-mode:multiply;filter:grayscale(.35) contrast(1.15);opacity:.9;-webkit-mask-image:radial-gradient(ellipse 60% 56% at 50% 44%,#000 52%,transparent 100%);mask-image:radial-gradient(ellipse 60% 56% at 50% 44%,#000 52%,transparent 100%)}" +
      ".npx-orbit[data-dark] .npx-bd{mix-blend-mode:screen;filter:grayscale(.6) contrast(1.9) invert(1);opacity:.55}" +
      ".npx-dim,.npx-wash{display:none}" +
      ".npx-oc{position:absolute;left:50%;top:50%;width:960px;height:520px;transform:translate(-50%,-50%) scale(var(--s,1))}" +
      ".npx-arc{position:absolute;inset:0;width:960px;height:520px;overflow:visible;pointer-events:none}" +
      ".npx-ico{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.npx-fill{fill:currentColor;stroke:none}" +
      ".npx-olabel{position:absolute;left:76px;top:56px;margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.6}" +
      ".npx-top{position:absolute;left:800px;top:48px;display:flex;gap:14px}.npx-ib{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;color:inherit}" +
      ".npx-pager{position:absolute;left:76px;top:172px;display:flex;flex-direction:column;align-items:center;gap:7px}" +
      ".npx-dot{width:14px;height:10px;display:grid;place-items:center;padding:0!important;border:0!important;background:none!important;color:inherit!important;cursor:pointer;transition:height .45s;box-shadow:none!important}" +
      ".npx-dot i{display:block;width:3px;height:3px;border-radius:3px;background:currentColor;opacity:.45;transition:height .45s cubic-bezier(.3,.7,.2,1),opacity .3s}" +
      ".npx-dot[aria-current]{height:26px}.npx-dot[aria-current] i{height:22px;opacity:.9}" +
      ".npx-plates{position:absolute;left:130px;top:82px;width:245px;height:245px}" +
      ".npx-orb{position:absolute;inset:0;transform-origin:69% -217%;visibility:hidden}" +
      ".npx-plate,.npx-mini{position:relative;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 50% 50%,#3a3a3c 0 54%,#2a2a2c 56%,#1e1e20 63%,#3b3b3e 66%,#252527 72%,#18181a 100%);box-shadow:0 22px 34px -12px rgba(0,0,0,.55),0 3px 6px rgba(0,0,0,.25)}" +
      ".npx-plate img,.npx-mini img{position:absolute;left:50%;top:50%;width:66%;height:66%;object-fit:contain;transform:translate(-50%,-50%);filter:drop-shadow(0 10px 12px rgba(0,0,0,.45));user-select:none}" +
      ".npx-plate:not(.is-cut) img,.npx-mini:not(.is-cut) img{width:58%;height:58%;object-fit:cover;border-radius:50%;filter:none;box-shadow:0 0 0 3px rgba(255,255,255,.06)}" +
      ".npx-titles{position:absolute;left:388px;top:96px;width:330px;height:150px}" +
      ".npx-ot{position:absolute;inset:0;visibility:hidden}.npx-ot h3{margin:0;font:inherit}" +
      ".npx-oeye{font-size:12.5px;font-weight:600;margin:0 0 4px 2px}" +
      ".npx-t1,.npx-t2{display:block;white-space:nowrap;line-height:1;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;margin:6px 0 0}" +
      ".npx-t1{font-weight:200;letter-spacing:-.015em}.npx-t2{font-weight:800;letter-spacing:-.025em;color:color-mix(in oklab,currentColor 86%,transparent)}" +
      ".npx-acts{position:absolute;left:396px;top:280px;display:flex;gap:44px;font-size:12.5px;font-weight:500}" +
      ".npx-ab{display:flex;align-items:center;gap:9px;padding:4px 0!important;border:0!important;background:none!important;color:inherit!important;font:inherit;cursor:pointer;text-decoration:none;box-shadow:none!important}.npx-ab .npx-ico{width:13px;height:13px}.npx-ab:disabled{opacity:.45}" +
      ".npx-card{position:absolute;left:722px;top:118px;width:223px;padding:18px 20px 20px;border-radius:20px;background:color-mix(in oklab,var(--background,#fff) 72%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 1px 0 color-mix(in oklab,var(--foreground,#111) 6%,transparent) inset,0 18px 40px -24px rgba(0,0,0,.25)}" +
      ".npx-tabs{display:flex;justify-content:space-between;padding:0 6px 0 20px;margin-bottom:18px}" +
      ".npx-tabs button{padding:3px 0!important;border:0!important;background:none!important;font:inherit;font-size:12px;font-weight:500;color:color-mix(in oklab,currentColor 55%,transparent)!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-tabs button[aria-selected=true]{color:inherit!important;font-weight:600}" +
      ".npx-bodies{display:grid}.npx-body{grid-area:1/1;visibility:hidden}" +
      ".npx-rate{position:relative;height:62px;margin:0 0 12px 6px}.npx-badge{position:absolute;left:0;top:0;width:46px;height:62px;border-radius:10px}" +
      ".npx-badge svg{position:absolute;left:16px;bottom:9px;width:13px;height:13px;fill:#1b1b1b;opacity:.8}" +
      ".npx-num{position:absolute;left:10px;top:4px;font-size:34px;font-weight:700;letter-spacing:-.04em;line-height:1;white-space:nowrap}" +
      ".npx-chef{font-size:17px;font-weight:600;letter-spacing:-.01em;margin:0;line-height:1.2}" +
      ".npx-kit{font-size:10.5px;color:color-mix(in oklab,currentColor 60%,transparent);margin:4px 0 10px}" +
      ".npx-body .npx-desc{font-size:12.5px;line-height:1.38;margin:0;min-height:50px;opacity:1}.npx-desc a{color:inherit}" +
      ".npx-signin{padding:0!important;border:0!important;background:none!important;color:inherit!important;font:inherit;text-decoration:underline;cursor:pointer}" +
      ".npx-stars{display:inline-flex;gap:2px}.npx-stars i{width:14px;height:14px;display:block}.npx-stars svg{width:100%;height:100%;fill:color-mix(in oklab,currentColor 22%,transparent)}.npx-stars .on svg{fill:#f5b942}.npx-stars .half svg{fill:url(#none);fill:#f5b942;opacity:.55}" +
      ".npx-react{display:flex;align-items:center;gap:10px;margin-top:16px}" +
      ".npx-like{display:flex;align-items:center;gap:8px;height:34px;padding:0 14px 0 10px!important;border:0!important;border-radius:99px!important;font:inherit;font-size:10.5px;white-space:nowrap;color:inherit!important;cursor:pointer;background:color-mix(in oklab,var(--foreground,#111) 7%,transparent)!important;transition:background .25s;box-shadow:none!important}" +
      ".npx-like .npx-ico{width:16px;height:16px}.npx-like[aria-pressed=true] .npx-ico{fill:currentColor}.npx-like[aria-pressed=true]{background:color-mix(in oklab,var(--foreground,#111) 14%,transparent)!important}" +
      ".npx-heads{display:flex;align-items:center}.npx-head{position:relative;width:24px;height:24px;margin-left:-7px;padding:0!important;border-radius:50%!important;border:2px solid color-mix(in oklab,var(--background,#fff) 90%,transparent)!important;overflow:hidden;background:color-mix(in oklab,var(--foreground,#111) 18%,transparent)!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-head:first-child{margin-left:0}.npx-head img{width:100%;height:100%;object-fit:cover;display:block}.npx-blank{cursor:default}" +
      ".npx-more{margin-left:4px;font-size:10px;opacity:.7}" +
      ".npx-zoom{position:absolute;inset:0;z-index:50;display:grid;place-items:center;background:color-mix(in oklab,var(--background,#000) 55%,transparent);backdrop-filter:blur(6px);cursor:zoom-out}" +
      ".npx-zoom[hidden]{display:none}.npx-zoom img{width:150px;height:150px;border-radius:50%;object-fit:cover;box-shadow:0 18px 40px -12px rgba(0,0,0,.5);border:3px solid var(--background,#fff)}" +
      ".npx-strip{position:absolute;left:130px;top:362px;width:550px;height:122px;display:flex;align-items:center}" +
      ".npx-tri{width:36px;height:36px;display:grid!important;place-items:center;flex:none;padding:0!important;border:0!important;background:none!important;color:inherit!important;cursor:pointer;box-shadow:none!important}.npx-tri svg{width:12px;height:16px;fill:currentColor}" +
      ".npx-win{width:472px;height:122px;overflow:hidden;flex:none;margin:0 2px;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}" +
      ".npx-track{display:flex;transition:transform .6s cubic-bezier(.65,0,.35,1)}" +
      ".npx-th{flex:none;width:118px;height:122px;display:flex;justify-content:center;padding-top:3px}" +
      ".npx-th button{width:84px;height:116px;border-radius:14px!important;display:flex;flex-direction:column;align-items:center;gap:7px;padding:9px 3px 0!important;border:0!important;background:transparent!important;color:inherit!important;cursor:pointer;transition:background .45s;box-shadow:none!important}" +
      ".npx-th button[aria-current]{background:color-mix(in oklab,var(--background,#fff) 62%,transparent)!important;box-shadow:0 10px 24px -16px rgba(0,0,0,.3)!important}" +
      ".npx-mini{width:56px;height:56px;flex:none;transition:transform .45s}.npx-th button[aria-current] .npx-mini{transform:scale(1.06)}" +
      ".npx-th span{font-size:10px;line-height:1.25;text-align:center;font-weight:500;max-width:78px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:color-mix(in oklab,currentColor 78%,transparent)}" +
      "@container (max-width:639px){" +
      ".npx-oc{position:relative;left:auto;top:auto;width:100%;height:auto;transform:none;display:flex;flex-direction:column;align-items:center;padding:14px 16px 18px}" +
      ".npx-arc{width:200%;height:auto;left:-60%;top:-30px}.npx-olabel{position:relative;left:auto;top:auto;align-self:flex-start}.npx-top{position:relative;left:auto;top:auto;align-self:flex-end;margin-top:-26px}" +
      ".npx-pager{left:14px;top:150px}.npx-plates{position:relative;left:auto;top:auto;width:min(52vw,32svh);height:min(52vw,32svh)}" +
      ".npx-titles{position:relative;left:auto;top:auto;width:100%;height:132px;margin-top:10px}.npx-ot{text-align:center;transform:scale(.78);transform-origin:50% 0}" +
      ".npx-acts{position:relative;left:auto;top:auto;margin-top:4px}.npx-card{position:relative;left:auto;top:auto;width:100%;max-width:420px;margin-top:12px}.npx-strip{display:none}}" +
      /* runway */
      ".npx-run{height:clamp(440px,64svh,640px);display:flex;flex-direction:column;--npx-wide:'Lexend Zetta','Lexend',ui-sans-serif,system-ui,sans-serif}" +
      ".npx-cap{font-family:var(--npx-wide);text-transform:uppercase}" +
      ".npx-rnav{flex:none;display:flex;justify-content:center;gap:clamp(22px,3.4vw,52px);padding:clamp(10px,1.6vw,18px) 16px 0;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid color-mix(in oklab,currentColor 14%,transparent)}" +
      ".npx-rnav::-webkit-scrollbar{display:none}" +
      ".npx-rlnk{position:relative;flex:none;padding:6px 0 12px!important;border:0!important;background:none!important;box-shadow:none!important;font:inherit;font-family:var(--npx-wide)!important;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:color-mix(in oklab,currentColor 55%,transparent)!important;cursor:pointer;white-space:nowrap}" +
      ".npx-rlnk::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:currentColor;transform:scaleX(0);transition:transform .35s cubic-bezier(.2,.7,.2,1)}" +
      ".npx-rlnk:hover,.npx-rlnk[aria-current]{color:inherit!important}.npx-rlnk:hover::after,.npx-rlnk[aria-current]::after{transform:scaleX(1)}" +
      ".npx-run-body{position:relative;flex:1;min-height:0;display:flex;transition:opacity .3s}.npx-run.is-loading .npx-run-body{opacity:.4}" +
      ".npx-stage{position:relative;flex:1;min-width:0;overflow:hidden;touch-action:pan-y}" +
      ".npx-figs{position:absolute;inset:0}" +
      ".npx-fig{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;will-change:transform,filter,opacity}" +
      ".npx-fig>img{position:absolute;bottom:0;left:0;max-width:none;object-fit:contain;object-position:50% 100%;transform:translateX(-50%);pointer-events:none;user-select:none}" +
      ".npx-fig:not(.is-cut)>img{object-fit:cover;object-position:50% 30%;border-radius:12px;box-shadow:0 18px 30px -18px rgba(0,0,0,.55)}" +
      ".npx-fig.is-cut>img{filter:drop-shadow(0 14px 18px rgba(0,0,0,.28))}" +
      ".npx-fig>i{position:absolute;left:0;bottom:-1px;transform:translate(-50%,50%);border-radius:50%;background:radial-gradient(closest-side,color-mix(in oklab,#000 40%,transparent),transparent);opacity:.6;pointer-events:none}" +
      ".npx-hit{position:absolute;bottom:0;left:0;transform:translateX(-50%);padding:0!important;border:0!important;background:none!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-copy{position:absolute;left:clamp(16px,3.4vw,44px);top:clamp(16px,3.4vh,34px);z-index:500;max-width:min(440px,52%);pointer-events:none}" +
      ".npx-rtitle{margin:0 0 14px;font-size:clamp(15px,1.5vw,22px);font-weight:300;letter-spacing:.08em;line-height:1.2}" +
      ".npx-rblurb{margin:0;max-width:300px;font-size:clamp(10px,.82vw,12px);line-height:1.65;color:color-mix(in oklab,currentColor 62%,transparent)}" +
      ".npx-foot{position:absolute;left:clamp(16px,3.4vw,44px);right:16px;bottom:clamp(14px,3vh,28px);z-index:500;display:flex;flex-direction:column;gap:10px;pointer-events:none}.npx-foot>*{pointer-events:auto}" +
      ".npx-look{margin:0;display:flex;align-items:flex-end;gap:.55em;font-size:clamp(18px,2vw,30px);font-weight:400;letter-spacing:.1em;line-height:1}" +
      ".npx-lnum{display:flex;font-variant-numeric:tabular-nums}.npx-dg{display:block;overflow:hidden;height:1.15em;line-height:1.15em}.npx-dg>span{display:block}" +
      ".npx-foot-act{display:flex;align-items:center;gap:8px}.npx-foot-act .npx-arrow{width:28px;height:28px}.npx-foot-act .npx-arrow svg{width:13px;height:13px}" +
      ".npx-shop{margin-right:10px;font-size:8px;font-weight:600;letter-spacing:.06em;color:inherit;border-bottom:1px solid currentColor;text-decoration:none;padding-bottom:1px}" +
      ".npx-mobact{display:none}" +
      ".npx-rrail{position:relative;flex:none;width:24%;min-width:200px;max-width:330px;overflow:hidden}" +
      ".npx-rcard{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;padding:14px 16px;will-change:transform;opacity:.7;transition:opacity .4s}" +
      ".npx-rcard[data-on]{opacity:1}.npx-rcard[data-tint]{background:color-mix(in oklab,currentColor 4%,transparent)}" +
      ".npx-rheart{width:22px;height:22px;display:grid!important;place-items:center;padding:0!important;border:0!important;background:none!important;color:inherit!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-rheart svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.3;stroke-linejoin:round;transition:fill .25s,stroke .25s,transform .25s}" +
      ".npx-rheart[aria-pressed=true] svg{fill:#e0565b;stroke:#e0565b;transform:scale(1.12)}" +
      ".npx-rcard .npx-rheart{position:absolute;left:10px;top:10px;z-index:2}" +
      ".npx-rpic{flex:1;min-height:0;display:flex;justify-content:center;align-items:center;margin:4px 12% 10px}" +
      ".npx-rpic img{max-height:100%;max-width:100%;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,.25))}" +
      ".npx-rcard:not(.is-cut) .npx-rpic img{border-radius:8px;filter:none;box-shadow:0 10px 20px -12px rgba(0,0,0,.5)}" +
      ".npx-rmeta{display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:end}" +
      ".npx-rname{font-size:8px;font-weight:600;letter-spacing:.05em;line-height:1.5;color:inherit;text-decoration:none;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
      ".npx-rprice{grid-column:1;font-size:9px;letter-spacing:.06em;color:color-mix(in oklab,currentColor 62%,transparent)}.npx-rprice s{opacity:.6}" +
      ".npx-rlikes{grid-column:1;display:flex;align-items:center;gap:6px;min-height:22px}" +
      ".npx-rlike{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px 0 7px!important;border:0!important;border-radius:99px!important;background:color-mix(in oklab,currentColor 8%,transparent)!important;color:inherit!important;font:inherit;font-size:10px;cursor:pointer;box-shadow:none!important}" +
      ".npx-rlike svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.npx-rlike[aria-pressed=true] svg{fill:currentColor}" +
      ".npx-rlikes .npx-head{width:20px;height:20px;margin-left:-6px}.npx-rlikes .npx-head:first-child{margin-left:0}" +
      ".npx-plus{grid-row:1/4;grid-column:2;align-self:end;width:24px;height:24px;display:grid!important;place-items:center;padding:0!important;border:0!important;background:none!important;color:color-mix(in oklab,currentColor 62%,transparent)!important;cursor:pointer;box-shadow:none!important}" +
      ".npx-plus svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.3;stroke-linecap:round}" +
      ".npx-run[data-narrow] .npx-figs{top:70px;bottom:118px}.npx-run[data-narrow] .npx-rrail{display:none}.npx-run[data-narrow] .npx-rnav{justify-content:flex-start}.npx-run[data-narrow] .npx-copy{max-width:70%}" +
      ".npx-run[data-narrow] .npx-mobact{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border-radius:12px;background:color-mix(in oklab,var(--background,#fff) 70%,transparent);backdrop-filter:blur(10px);max-width:100%}" +
      ".npx-mname{font-size:11px;font-weight:500;max-width:52vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "@media (max-width:639px){.npx-run{height:clamp(440px,70svh,560px)}}" +
      "@media (prefers-reduced-motion:reduce){.npx-sec{transition:none;opacity:1;transform:none}.npx-track,.npx-spin-in,.npx-garment{transition:none}}";
    if (!document.getElementById("npx-font")) { var lf = document.createElement("link"); lf.id = "npx-font"; lf.rel = "stylesheet"; lf.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@200;400;500;600;700;800&family=Lexend+Zetta:wght@200..600&display=swap"; document.head.appendChild(lf); }
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
      fetch("/recommendations/products.json?product_id=" + encodeURIComponent(productId) + "&limit=10&intent=related").then(function (r) { return r.json(); }).then(function (d) { return (d && d.products) || []; }).catch(function () { return []; }),
      fetch("/products.json?limit=250").then(function (r) { return r.json(); }).then(function (d) { return (d && d.products) || []; }).catch(function () { return []; })
    ]).then(function (res) {
      var general = res[1].filter(function (p) { return String(p.id) !== String(productId); }).map(normStore).filter(function (p) { return p.featured_image && p.price > 0; });
      var related = res[0].map(normRec).filter(function (p) { return p.price > 0 && p.featured_image; });
      var used = {};
      function take(list, max, test) {
        var out = [];
        for (var k = 0; k < list.length && out.length < max; k++) { var p = list[k]; if (used[p.url] || (test && !test(p))) continue; used[p.url] = true; out.push(p); }
        return out;
      }
      function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
      var cheapTest = function (p) { return p.price > 0 && p.price <= PRICE_CAP_CENTS; };
      // Rail: 10 related first, topped up from the store. No product shows twice across the three.
      var relA = take(related, 10);
      var rest = shuffle(general);
      // Keep enough under-R49 pieces for the orbit before the rail tops up from the store.
      var cheapPool = rest.filter(function (p) { return !used[p.url] && cheapTest(p); });
      var reserve = {}; cheapPool.slice(0, 10).forEach(function (p) { reserve[p.url] = true; });
      relA = relA.concat(take(rest, 10 - relA.length, function (p) { return !reserve[p.url]; }));
      var cheap = take(cheapPool, 10);
      var relB = take(related, 8);
      relB = relB.concat(take(rest, 8 - relB.length));
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
