// ================================================================
// NALEA — NEW SECTIONS JS  (nalea-sections.js)
// ================================================================
(function () {
  'use strict';

  // ── SALE SLIDER ─────────────────────────────────────────────
  document.querySelectorAll('.ns-sale-slider').forEach(function (section) {
    var track   = section.querySelector('.ns-sale-slider__track');
    var prev    = section.querySelector('.ns-sale-slider__prev');
    var next    = section.querySelector('.ns-sale-slider__next');
    var dotsWrap = section.querySelector('.ns-sale-slider__dots');
    if (!track) return;

    var cards     = track.querySelectorAll('.ns-sale-card');
    var cardW     = 0;
    var gap       = 20;
    var visible   = 4;
    var current   = 0;
    var total     = cards.length;
    var autoTimer = null;

    function calcCardW() {
      if (!cards[0]) return;
      cardW   = cards[0].offsetWidth;
      visible = Math.round(track.parentElement.offsetWidth / (cardW + gap)) || 1;
    }
    function maxIndex() { return Math.max(0, total - visible); }
    function goTo(n) {
      current = Math.max(0, Math.min(n, maxIndex()));
      track.style.transform = 'translateX(-' + (current * (cardW + gap)) + 'px)';
      dotsWrap && dotsWrap.querySelectorAll('.ns-sale-slider__dot').forEach(function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }
    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      var pages = maxIndex() + 1;
      for (var i = 0; i < pages; i++) {
        var btn = document.createElement('button');
        btn.className = 'ns-sale-slider__dot' + (i === 0 ? ' active' : '');
        btn.setAttribute('aria-label', 'Slide ' + (i + 1));
        btn.setAttribute('data-i', i);
        btn.addEventListener('click', function () {
          clearInterval(autoTimer);
          goTo(parseInt(this.getAttribute('data-i')));
          startAuto();
        });
        dotsWrap.appendChild(btn);
      }
    }
    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(function () {
        goTo(current >= maxIndex() ? 0 : current + 1);
      }, 3800);
    }

    calcCardW();
    buildDots();
    goTo(0);
    startAuto();

    prev && prev.addEventListener('click', function () {
      clearInterval(autoTimer);
      goTo(current - 1);
      startAuto();
    });
    next && next.addEventListener('click', function () {
      clearInterval(autoTimer);
      goTo(current + 1);
      startAuto();
    });

    // Touch/swipe
    var tx = null;
    track.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var diff = tx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 45) {
        clearInterval(autoTimer);
        goTo(current + (diff > 0 ? 1 : -1));
        startAuto();
      }
      tx = null;
    }, { passive: true });

    window.addEventListener('resize', function () {
      calcCardW();
      buildDots();
      goTo(Math.min(current, maxIndex()));
    });
  });

  // ── DEAL CARD TIMERS ─────────────────────────────────────────
  document.querySelectorAll('.ns-deal-card[data-hours]').forEach(function (card, i) {
    var h   = parseInt(card.getAttribute('data-hours') || '24', 10);
    var KEY = 'ns_deal_end_' + i;
    var stored = localStorage.getItem(KEY);
    var end;
    if (stored && !isNaN(Number(stored))) {
      end = Number(stored);
    } else {
      end = Date.now() + h * 3600000;
      localStorage.setItem(KEY, String(end));
    }
    var hEl = card.querySelector('.ns-deal-h');
    var mEl = card.querySelector('.ns-deal-m');
    var sEl = card.querySelector('.ns-deal-s');
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      var rem = Math.max(0, end - Date.now());
      var hrs  = Math.floor(rem / 3600000);
      var mins = Math.floor((rem % 3600000) / 60000);
      var secs = Math.floor((rem % 60000) / 1000);
      if (hEl) hEl.textContent = pad(hrs);
      if (mEl) mEl.textContent = pad(mins);
      if (sEl) sEl.textContent = pad(secs);
      if (rem > 0) setTimeout(tick, 1000);
    }
    tick();
  });

  // ── DEPARTMENT CARDS — scroll reveal ─────────────────────────
  if ('IntersectionObserver' in window) {
    var deptObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          deptObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.ns-dept-card').forEach(function (card) {
      card.style.animationPlayState = 'paused';
      deptObs.observe(card);
    });
  }

  // ── HERITAGE CATS — stagger scroll ───────────────────────────
  if ('IntersectionObserver' in window) {
    var hObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ns-heritage-cat--visible');
          hObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.ns-heritage-cat').forEach(function (el) {
      hObserver.observe(el);
    });
  }

  // ── LIKE BUTTONS ON SALE CARDS ───────────────────────────────
  document.querySelectorAll('.ns-sale-card__like').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.toggle('liked');
      var self = this;
      self.style.transform = 'scale(1.5)';
      setTimeout(function () { self.style.transform = ''; }, 220);
    });
  });

  // ── FIRE COMPARE DRAG (desktop) ──────────────────────────────
  var compareWrap = document.querySelector('.ns-fire-compare__wrap');
  if (compareWrap) {
    var isDragging = false;
    var divider = compareWrap.querySelector('.ns-fire-compare__divider');
    if (divider) {
      divider.addEventListener('mousedown', function (e) {
        e.preventDefault();
        isDragging = true;
      });
      document.addEventListener('mouseup', function () { isDragging = false; });
      document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        var rect = compareWrap.getBoundingClientRect();
        var x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        var pct = (x / rect.width) * 100;
        var panelL = compareWrap.querySelector('.ns-fire-compare__panel--left');
        var panelR = compareWrap.querySelector('.ns-fire-compare__panel--right');
        if (panelL) panelL.style.flex = pct + ' 0 0';
        if (panelR) panelR.style.flex = (100 - pct) + ' 0 0';
      });
    }
  }

})();
