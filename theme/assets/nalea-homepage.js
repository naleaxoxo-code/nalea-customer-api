// ================================================================
// NALEA HOMEPAGE — ANIMATIONS & INTERACTIONS
// ================================================================

(function () {
  'use strict';

  // ── HERO SLIDER ──────────────────────────────────────────────
  const slides  = document.querySelectorAll('.nh-hero__slide');
  const dots    = document.querySelectorAll('.nh-hero__dot');
  const counter = document.querySelector('.nh-hero__counter');
  let current   = 0;
  let timer;

  function pad(n) { return String(n).padStart(2, '0'); }

  function goToSlide(n) {
    slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');
    current = ((n % slides.length) + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dots[current]) dots[current].classList.add('active');
    if (counter) counter.textContent = pad(current + 1) + ' / ' + pad(slides.length);
  }

  function startSlider() {
    if (slides.length < 1) return;
    goToSlide(0);
    if (slides.length > 1) {
      timer = setInterval(function () { goToSlide(current + 1); }, 5800);
    }
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      clearInterval(timer);
      goToSlide(i);
      timer = setInterval(function () { goToSlide(current + 1); }, 5800);
    });
  });

  // Touch / swipe support on hero
  var touchStartX = null;
  var heroEl = document.querySelector('.nh-hero');
  if (heroEl) {
    heroEl.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    heroEl.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 45) {
        clearInterval(timer);
        goToSlide(current + (diff > 0 ? 1 : -1));
        timer = setInterval(function () { goToSlide(current + 1); }, 5800);
      }
      touchStartX = null;
    }, { passive: true });
  }

  // ── EMAIL POPUP ───────────────────────────────────────────────
  var overlay  = document.getElementById('nhPopupOverlay');
  var closeBtn = document.getElementById('nhPopupClose');
  var skipBtn  = document.getElementById('nhPopupSkip');

  function setCookie(name, val, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + val + ';expires=' + d.toUTCString() + ';path=/';
  }
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }
  function closePopup() {
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(function () { overlay.style.display = 'none'; }, 500);
    setCookie('nh_popup_dismissed', '1', 14);
  }

  if (overlay && !getCookie('nh_popup_dismissed')) {
    setTimeout(function () {
      overlay.style.display = 'flex';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.add('open');
        });
      });
    }, 3000);

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (skipBtn)  skipBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closePopup();
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    // Mark subscribed
    var popupForm = overlay.querySelector('form');
    if (popupForm) {
      popupForm.addEventListener('submit', function () {
        setCookie('nh_popup_dismissed', '1', 365);
      });
    }
  }

  // ── MAIN COUNTDOWN (#nhCountdown) ───────────────────────────
  var cdEl = document.getElementById('nhCountdown');
  if (cdEl) {
    var endHours = parseInt(cdEl.getAttribute('data-hours') || '24', 10);
    var KEY = 'nh_sale_end';
    var stored = localStorage.getItem(KEY);
    var endTime;
    if (stored && !isNaN(Number(stored))) {
      endTime = Number(stored);
    } else {
      endTime = Date.now() + endHours * 3600000;
      localStorage.setItem(KEY, String(endTime));
    }

    var dEl = document.getElementById('nhDays');
    var hEl = document.getElementById('nhHours');
    var mEl = document.getElementById('nhMins');
    var sEl = document.getElementById('nhSecs');

    function tickMain() {
      var rem = Math.max(0, endTime - Date.now());
      var days = Math.floor(rem / 86400000);
      var hrs  = Math.floor((rem % 86400000) / 3600000);
      var mins = Math.floor((rem % 3600000) / 60000);
      var secs = Math.floor((rem % 60000) / 1000);
      if (dEl) dEl.textContent = pad(days);
      if (hEl) hEl.textContent = pad(hrs);
      if (mEl) mEl.textContent = pad(mins);
      if (sEl) sEl.textContent = pad(secs);
      if (rem > 0) requestAnimationFrame(function () {
        setTimeout(tickMain, 1000);
      });
    }
    tickMain();
  }

  // ── MINI COUNTDOWNS (.nh-mini-countdown[data-hours]) ─────────
  document.querySelectorAll('.nh-mini-countdown[data-hours]').forEach(function (el, i) {
    var h  = parseInt(el.getAttribute('data-hours') || '24', 10);
    var hEl = el.querySelector('.mc-h');
    var mEl = el.querySelector('.mc-m');
    var sEl = el.querySelector('.mc-s');
    var KEY = 'nh_mini_end_' + i;
    var stored = localStorage.getItem(KEY);
    var end;
    if (stored && !isNaN(Number(stored))) {
      end = Number(stored);
    } else {
      end = Date.now() + h * 3600000;
      localStorage.setItem(KEY, String(end));
    }
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

  // ── SCROLL REVEAL (IntersectionObserver) ─────────────────────
  var revealEls = document.querySelectorAll('.nh-reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // ── MAGNETIC BUTTONS ─────────────────────────────────────────
  document.querySelectorAll('.nh-hero__cta, .nh-brand__cta').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var r  = this.getBoundingClientRect();
      var x  = e.clientX - r.left - r.width  / 2;
      var y  = e.clientY - r.top  - r.height / 2;
      this.style.transform = 'translate(' + (x * 0.14) + 'px,' + (y * 0.14) + 'px) translateY(-3px) scale(1.02)';
    });
    btn.addEventListener('mouseleave', function () {
      this.style.transform = '';
    });
  });

  // ── COLLECTION CARD TILT ─────────────────────────────────────
  document.querySelectorAll('.nh-collections__card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r  = this.getBoundingClientRect();
      var x  = (e.clientX - r.left)  / r.width  - 0.5;
      var y  = (e.clientY - r.top)   / r.height - 0.5;
      this.style.transform =
        'translateY(-10px) scale(1.02) perspective(600px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 5) + 'deg)';
    });
    card.addEventListener('mouseleave', function () {
      this.style.transform = '';
    });
  });

  // ── LIKE / HEART TOGGLE ──────────────────────────────────────
  document.querySelectorAll('.nh-product-card__like').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.toggle('liked');
      var self = this;
      self.style.transform = 'scale(1.45)';
      setTimeout(function () { self.style.transform = ''; }, 220);
    });
  });

  // ── PRODUCT QUICK ADD ─────────────────────────────────────────
  document.querySelectorAll('.nh-product-card__quick-add').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var url = this.getAttribute('data-product-url');
      if (url) window.location.href = url;
    });
  });

  // ── CURSOR GLOW (desktop only) ───────────────────────────────
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var glow = document.createElement('div');
    glow.className = 'nh-cursor-glow';
    document.body.appendChild(glow);
    document.addEventListener('mousemove', function (e) {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    }, { passive: true });
  }

  // ── MARQUEE PAUSE ON HOVER ───────────────────────────────────
  var marqueeTrack = document.querySelector('.nh-marquee__track');
  var marqueeWrap  = document.querySelector('.nh-marquee');
  if (marqueeTrack && marqueeWrap) {
    marqueeWrap.addEventListener('mouseenter', function () {
      marqueeTrack.style.animationPlayState = 'paused';
    });
    marqueeWrap.addEventListener('mouseleave', function () {
      marqueeTrack.style.animationPlayState = 'running';
    });
  }

  // ── NEWSLETTER FORM FEEDBACK ──────────────────────────────────
  var newsletterForm = document.querySelector('.nh-newsletter__form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function () {
      var btn = this.querySelector('.nh-newsletter__btn');
      if (btn) {
        btn.textContent = 'Subscribed ✓';
        btn.style.background = 'linear-gradient(135deg,#4caf50,#2e7d32)';
        btn.style.color = '#fff';
      }
    });
  }

  // ── HEADER ICON UPGRADE (profile + cart + search) ────────────
  function upgradeHeaderIcons() {
    var accountLinks = document.querySelectorAll(
      'a[href="/account"], a[href="/account/login"], .header__icon--account, [data-icon="account"]'
    );
    var profileSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    accountLinks.forEach(function (el) {
      var existing = el.querySelector('svg');
      if (!existing) {
        el.insertAdjacentHTML('afterbegin', profileSVG);
      } else {
        existing.outerHTML = profileSVG;
      }
    });

    var searchBtns = document.querySelectorAll(
      '.header__icon--search, [data-icon="search"], button[aria-label*="Search"], a[href*="search"]'
    );
    var searchSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>';
    searchBtns.forEach(function (el) {
      var existing = el.querySelector('svg');
      if (!existing) { el.insertAdjacentHTML('afterbegin', searchSVG); }
    });

    var cartBtns = document.querySelectorAll(
      '.header__icon--cart, [data-icon="cart"], a[href="/cart"], button[aria-label*="Cart"]'
    );
    var cartSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>';
    cartBtns.forEach(function (el) {
      var existing = el.querySelector('svg');
      if (!existing) { el.insertAdjacentHTML('afterbegin', cartSVG); }
    });
  }

  // ── INIT ─────────────────────────────────────────────────────
  startSlider();
  upgradeHeaderIcons();

})();
