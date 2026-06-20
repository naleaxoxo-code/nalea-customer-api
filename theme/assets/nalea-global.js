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
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */

  ready(function () {
    try { initPageVibe(); } catch (e) {}
    try { initParticles(); } catch (e) {}
    try { initReveal(); } catch (e) {}
    try { initScrollHeader(); } catch (e) {}
    try { initCartBubble(); } catch (e) {}
    try { initFireCursor(); } catch (e) {}
    try { initPageTransition(); } catch (e) {}
  });
})();
