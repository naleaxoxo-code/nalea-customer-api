/*
 * nalea-global.js
 * Nalèa XoXo — global enhancement layer for the Tinker theme.
 * Injects per-page vibe headers, ambient particles, reveal animations,
 * a scroll-aware header, live cart bubble, fire cursor trail and page
 * transitions. Pure vanilla JS, wrapped in an IIFE, no dependencies.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function getMain() {
    return document.querySelector('main[data-template]');
  }

  /* ------------------------------------------------------------------ */
  /* 1. Page vibe header                                                */
  /* ------------------------------------------------------------------ */

  function resolveVibe(template, path) {
    var p = (path || '').toLowerCase();
    var t = (template || '').toLowerCase();

    // Account is special — match by template OR path.
    if (t.indexOf('account') !== -1 || p.indexOf('/account') !== -1) {
      return { emoji: '💎', tagline: 'Welcome Back, Queen' };
    }

    switch (t) {
      case 'collection':
        return { emoji: '🛍️', tagline: 'Discover Your Next Obsession' };
      case 'search':
        return { emoji: '🔍', tagline: 'Find What Calls to You' };
      case 'cart':
        return { emoji: '🛒', tagline: 'Almost There, Beautiful' };
      case 'blog':
        return { emoji: '📖', tagline: 'Stories, Tips & Style Inspo' };
      case 'article':
        return { emoji: '✍️', tagline: 'Reading Mode: On' };
      case 'list-collections':
        return { emoji: '🗂️', tagline: 'Browse Every Collection' };
      case '404':
        return { emoji: '🔥', tagline: "Lost in the Fire — Let's Find Your Way" };
      case 'page':
        // Path-based mapping for CMS pages.
        if (p.indexOf('welcome') !== -1) return null; // skip
        if (p.indexOf('about') !== -1) return { emoji: '✨', tagline: 'The Story Behind The Brand' };
        if (p.indexOf('contact') !== -1) return { emoji: '💌', tagline: "We'd Love to Hear From You" };
        if (p.indexOf('faq') !== -1) return { emoji: '💬', tagline: "Got Questions? We've Got Answers" };
        if (p.indexOf('loyalty') !== -1) return { emoji: '👑', tagline: 'Exclusive Rewards for Our Queens' };
        if (p.indexOf('careers') !== -1) return { emoji: '💼', tagline: 'Build Something Beautiful With Us' };
        if (p.indexOf('disclaimer') !== -1) return { emoji: '📋', tagline: 'Keeping It Transparent' };
        if (p.indexOf('track') !== -1) return { emoji: '📦', tagline: "Where's Your Order?" };
        if (p.indexOf('size') !== -1 || p.indexOf('guide') !== -1) return { emoji: '📏', tagline: 'Find Your Perfect Fit' };
        if (p.indexOf('matric') !== -1 || p.indexOf('farewell') !== -1) return { emoji: '🌹', tagline: 'Your Night to Shine' };
        if (p.indexOf('weave') !== -1 || p.indexOf('wig') !== -1) return { emoji: '💇', tagline: 'Crown Yourself' };
        if (p.indexOf('shoe') !== -1 || p.indexOf('slipper') !== -1) return { emoji: '👠', tagline: 'Step Into Your Confidence' };
        if (p.indexOf('ticket') !== -1) return { emoji: '🎫', tagline: 'Support is Here For You' };
        if (p.indexOf('terms') !== -1 || p.indexOf('polic') !== -1) return { emoji: '🛡️', tagline: 'Your Rights, Our Promise' };
        return null;
      default:
        return null;
    }
  }

  function initPageVibe() {
    var main = getMain();
    if (!main) return;
    var template = main.dataset.template || '';
    var path = window.location.pathname || '';

    var vibe = resolveVibe(template, path);
    if (!vibe) return;

    // Avoid duplicates.
    if (main.querySelector(':scope > .nalea-page-vibe')) return;

    var pageKey = template.split('.')[0];
    if (path.toLowerCase().indexOf('/account') !== -1 || pageKey.indexOf('account') !== -1) {
      pageKey = 'account';
    }

    var wrap = document.createElement('div');
    wrap.className = 'nalea-page-vibe nalea-reveal';
    wrap.setAttribute('data-page', pageKey);

    var emoji = document.createElement('span');
    emoji.className = 'nalea-page-vibe__emoji';
    emoji.textContent = vibe.emoji;

    var text = document.createElement('span');
    text.className = 'nalea-page-vibe__text';
    text.textContent = vibe.tagline;

    wrap.appendChild(emoji);
    wrap.appendChild(text);

    main.insertBefore(wrap, main.firstChild);
  }

  /* ------------------------------------------------------------------ */
  /* 2. Ambient particles                                               */
  /* ------------------------------------------------------------------ */

  function initParticles() {
    var colors = ['#c9a84c', '#ff6b00', '#ffd200', '#ff3d00'];
    var count = 8;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'nalea-particle';
      var size = rand(3, 8);
      p.style.left = rand(10, 90) + '%';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.background = colors[Math.floor(rand(0, colors.length))];
      p.style.animationDelay = rand(0, 8) + 's';
      p.style.animationDuration = rand(9, 16) + 's';
      document.body.appendChild(p);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Reveal on scroll                                                */
  /* ------------------------------------------------------------------ */

  function initReveal() {
    var selector = '[class*="section"], [class*="card"], [class*="product"], .nalea-reveal';
    var nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('nalea-revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('nalea-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    nodes.forEach(function (n, idx) {
      // Light stagger via inline custom property.
      n.style.setProperty('--nalea-reveal-delay', (idx % 8) * 60 + 'ms');
      io.observe(n);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Scroll-aware header                                             */
  /* ------------------------------------------------------------------ */

  function initScrollHeader() {
    var header = document.getElementById('header-group');
    if (!header) return;
    var ticking = false;

    function update() {
      if (window.scrollY > 50) {
        header.classList.add('nalea-scrolled');
      } else {
        header.classList.remove('nalea-scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ------------------------------------------------------------------ */
  /* 5. Live cart bubble                                                */
  /* ------------------------------------------------------------------ */

  function setCartCount(count) {
    var nodes = document.querySelectorAll('[data-cart-count]');
    nodes.forEach(function (node) {
      var prev = parseInt(node.getAttribute('data-cart-count'), 10);
      node.setAttribute('data-cart-count', count);
      node.textContent = count;
      if (!isNaN(prev) && prev !== count) {
        node.classList.remove('nalea-cart-bounce');
        // Force reflow to restart animation.
        void node.offsetWidth;
        node.classList.add('nalea-cart-bounce');
      }
      node.style.display = count > 0 ? '' : node.style.display;
    });
  }

  function initCartBubble() {
    if (!window.fetch) return;
    fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && typeof data.item_count === 'number') {
          setCartCount(data.item_count);
        }
      })
      .catch(function () { /* silent */ });
  }

  /* ------------------------------------------------------------------ */
  /* 6. Fire cursor trail                                               */
  /* ------------------------------------------------------------------ */

  function initFireCursor() {
    // Disable on touch / reduced-motion for performance & accessibility.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) return;

    var embers = [];
    var max = 20;
    var lastTime = 0;
    var fireColors = ['#ff6b00', '#ff3d00', '#ffd200', '#c9a84c'];

    document.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - lastTime < 24) return; // throttle
      lastTime = now;

      if (embers.length >= max) {
        var old = embers.shift();
        if (old && old.parentNode) old.parentNode.removeChild(old);
      }

      var ember = document.createElement('div');
      ember.className = 'nalea-ember';
      ember.style.left = e.clientX + 'px';
      ember.style.top = e.clientY + 'px';
      ember.style.background = fireColors[Math.floor(rand(0, fireColors.length))];
      document.body.appendChild(ember);
      embers.push(ember);

      window.setTimeout(function () {
        if (ember.parentNode) ember.parentNode.removeChild(ember);
        var i = embers.indexOf(ember);
        if (i !== -1) embers.splice(i, 1);
      }, 600);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 7. Page transitions                                                */
  /* ------------------------------------------------------------------ */

  function isInternalLink(a) {
    if (!a || !a.getAttribute) return false;
    var href = a.getAttribute('href');
    if (!href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    // Same-origin only.
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (url.pathname === window.location.pathname && url.hash) return false;
      return true;
    } catch (err) {
      return false;
    }
  }

  function initPageTransition() {
    var main = getMain();
    if (main) main.classList.remove('nalea-page-exit');

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest && e.target.closest('a');
      if (!isInternalLink(a)) return;

      var m = getMain();
      if (m) m.classList.add('nalea-page-exit');
      // Let the navigation proceed naturally; the class drives the fade.
    }, true);

    // Restore on bfcache navigation.
    window.addEventListener('pageshow', function () {
      var m = getMain();
      if (m) m.classList.remove('nalea-page-exit');
    });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Ambient background canvas                                       */
  /* ------------------------------------------------------------------ */

  function initAmbientCanvas() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canvas = document.createElement('canvas');
    canvas.id = 'nalea-ambient-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100%',
      'height:100%',
      'z-index:0',
      'pointer-events:none',
    ].join(';');
    document.body.insertBefore(canvas, document.body.firstChild);

    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* ── Embers ─────────────────────────────────────────────────────── */
    var FIRE_COLORS = ['#ff6b00', '#ff3d00', '#ffd200', '#c9a84c', '#ff8c00'];
    var embers = [];

    function mkEmber(spreadY) {
      var maxLife = rand(320, 600);
      return {
        x: rand(0, W),
        y: spreadY !== undefined ? rand(0, H) : H + rand(0, 60),
        size: rand(0.6, 2.2),
        speed: rand(0.18, 0.55),
        drift: (Math.random() - 0.5) * 0.28,
        opacity: 0,
        maxOpacity: rand(0.10, 0.32),
        color: FIRE_COLORS[Math.floor(rand(0, FIRE_COLORS.length))],
        life: spreadY !== undefined ? rand(0, maxLife) : 0,
        maxLife: maxLife,
      };
    }

    for (var i = 0; i < 22; i++) { embers.push(mkEmber(true)); }

    /* ── Laser streaks ──────────────────────────────────────────────── */
    var lasers = [];
    var nextLaser = Date.now() + rand(3000, 7000);

    function mkLaser() {
      var dir = Math.random() > 0.5 ? 1 : -1;
      return {
        y: rand(H * 0.04, H * 0.92),
        progress: 0,
        speed: rand(0.006, 0.012),
        halfLen: rand(60, 140),
        maxOpacity: rand(0.10, 0.22),
        color: Math.random() > 0.45 ? '#ff6b00' : '#c9a84c',
        dir: dir,
      };
    }

    /* ── Glass shimmer bands ────────────────────────────────────────── */
    var shimmers = [];
    var nextShimmer = Date.now() + rand(5000, 11000);

    function mkShimmer() {
      return {
        progress: 0,
        speed: rand(0.0014, 0.0028),
        halfW: rand(30, 70),
        maxOpacity: rand(0.018, 0.045),
        tilt: rand(-0.25, 0.25),
      };
    }

    /* ── Draw loop ──────────────────────────────────────────────────── */
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var now = Date.now();

      /* spawn lasers */
      if (now >= nextLaser) {
        lasers.push(mkLaser());
        nextLaser = now + rand(3500, 8000);
      }

      /* spawn shimmers */
      if (now >= nextShimmer) {
        shimmers.push(mkShimmer());
        nextShimmer = now + rand(5000, 12000);
      }

      /* draw embers */
      for (var e = 0; e < embers.length; e++) {
        var em = embers[e];
        em.y     -= em.speed;
        em.x     += em.drift;
        em.life  += 1;
        var lf = em.life / em.maxLife;
        em.opacity = lf < 0.15 ? (lf / 0.15) * em.maxOpacity
                   : lf > 0.78 ? ((1 - lf) / 0.22) * em.maxOpacity
                   : em.maxOpacity;
        if (em.life >= em.maxLife || em.y < -8) {
          embers[e] = mkEmber();
          continue;
        }
        ctx.save();
        ctx.globalAlpha = em.opacity;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size, 0, 6.2832);
        ctx.fillStyle   = em.color;
        ctx.shadowColor = em.color;
        ctx.shadowBlur  = em.size * 5;
        ctx.fill();
        ctx.restore();
      }

      /* draw lasers */
      for (var li = lasers.length - 1; li >= 0; li--) {
        var l = lasers[li];
        l.progress += l.speed;
        if (l.progress > 1.35) { lasers.splice(li, 1); continue; }

        var lOp = l.maxOpacity;
        if (l.progress < 0.08) lOp *= l.progress / 0.08;
        if (l.progress > 1.0)  lOp *= (1.35 - l.progress) / 0.35;

        var cx = l.dir === 1
          ? l.progress * (W + l.halfLen * 2) - l.halfLen
          : W - (l.progress * (W + l.halfLen * 2) - l.halfLen);

        var gL = ctx.createLinearGradient(cx - l.halfLen, l.y, cx + l.halfLen, l.y);
        gL.addColorStop(0,    'transparent');
        gL.addColorStop(0.35, l.color);
        gL.addColorStop(0.5,  '#ffffff');
        gL.addColorStop(0.65, l.color);
        gL.addColorStop(1,    'transparent');

        ctx.save();
        ctx.globalAlpha  = lOp;
        ctx.strokeStyle  = gL;
        ctx.lineWidth    = 0.9;
        ctx.shadowColor  = l.color;
        ctx.shadowBlur   = 7;
        ctx.beginPath();
        ctx.moveTo(cx - l.halfLen, l.y);
        ctx.lineTo(cx + l.halfLen, l.y);
        ctx.stroke();
        ctx.restore();
      }

      /* draw glass shimmer bands */
      for (var si = shimmers.length - 1; si >= 0; si--) {
        var s = shimmers[si];
        s.progress += s.speed;
        if (s.progress > 1) { shimmers.splice(si, 1); continue; }

        var sx = -s.halfW * 2 + s.progress * (W + s.halfW * 4);
        var fade = s.progress < 0.12 ? s.progress / 0.12
                 : s.progress > 0.88 ? (1 - s.progress) / 0.12
                 : 1;
        var sOp = s.maxOpacity * fade;

        /* tilted band using transform */
        ctx.save();
        ctx.translate(sx, 0);
        ctx.transform(1, s.tilt, 0, 1, 0, 0);
        var gS = ctx.createLinearGradient(-s.halfW, 0, s.halfW, 0);
        gS.addColorStop(0,   'transparent');
        gS.addColorStop(0.4, 'rgba(255,255,255,' + sOp + ')');
        gS.addColorStop(0.6, 'rgba(220,200,160,' + (sOp * 1.5) + ')');
        gS.addColorStop(1,   'transparent');
        ctx.fillStyle = gS;
        ctx.fillRect(-s.halfW, -H * 0.3, s.halfW * 2, H * 1.6);
        ctx.restore();
      }

      requestAnimationFrame(draw);
    }

    draw();
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */

  ready(function () {
    try { initAmbientCanvas(); } catch (e) {}
    try { initPageVibe(); } catch (e) {}
    try { initParticles(); } catch (e) {}
    try { initReveal(); } catch (e) {}
    try { initScrollHeader(); } catch (e) {}
    try { initCartBubble(); } catch (e) {}
    try { initFireCursor(); } catch (e) {}
    try { initPageTransition(); } catch (e) {}
  });
})();
