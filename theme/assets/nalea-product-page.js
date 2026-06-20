/* ================================================================
   NALEA PRODUCT PAGE JS
   ================================================================ */
(function () {
  'use strict';

  /* ── Image Gallery ──────────────────────────────────────────── */
  function initGallery() {
    const main  = document.querySelector('.npm-gallery__main-img');
    const thumbs = document.querySelectorAll('.npm-thumb');
    if (!main || !thumbs.length) return;
    thumbs.forEach(t => {
      t.addEventListener('click', () => {
        main.src = t.querySelector('img').src.replace('_100x', '_900x');
        thumbs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
    });
  }

  /* ── Quantity controls ──────────────────────────────────────── */
  function initQty() {
    document.querySelectorAll('.npm-qty-wrap').forEach(wrap => {
      const num  = wrap.querySelector('.npm-qty-num');
      const dec  = wrap.querySelector('[data-qty="dec"]');
      const inc  = wrap.querySelector('[data-qty="inc"]');
      if (!num) return;
      dec && dec.addEventListener('click', () => {
        const v = Math.max(1, parseInt(num.value || 1) - 1);
        num.value = v;
        num.animate([{transform:'scale(1)'},{transform:'scale(1.2)'},{transform:'scale(1)'}], {duration:200});
      });
      inc && inc.addEventListener('click', () => {
        const v = parseInt(num.value || 1) + 1;
        num.value = v;
        num.animate([{transform:'scale(1)'},{transform:'scale(1.2)'},{transform:'scale(1)'}], {duration:200});
      });
    });
  }

  /* ── Variant pills / swatches ───────────────────────────────── */
  function initVariants() {
    document.querySelectorAll('.npm-pills').forEach(group => {
      group.querySelectorAll('.npm-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          if (pill.classList.contains('unavailable')) return;
          group.querySelectorAll('.npm-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const label = group.closest('.npm-variant-group')?.querySelector('.npm-variant-label strong');
          if (label) label.textContent = pill.textContent.trim();
        });
      });
    });
    document.querySelectorAll('.npm-swatches').forEach(group => {
      group.querySelectorAll('.npm-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          group.querySelectorAll('.npm-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });
    });
  }

  /* ── Spark burst effect ─────────────────────────────────────── */
  function fireSparks(btn) {
    const container = btn.querySelector('.npm-atc__sparks');
    if (!container) return;
    container.querySelectorAll('.npm-spark').forEach(s => {
      s.style.animation = 'none';
      requestAnimationFrame(() => { s.style.animation = ''; });
    });
  }

  /* ── Main ATC button ────────────────────────────────────────── */
  function initMainATC() {
    document.querySelectorAll('.npm-atc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (btn.classList.contains('loading')) return;

        const form = btn.closest('form');
        const variantId = form?.querySelector('[name="id"]')?.value;
        const qty = form?.querySelector('.npm-qty-num')?.value || 1;
        if (!variantId) return;

        btn.classList.add('loading');
        const orig = btn.querySelector('.npm-atc__label');
        if (orig) orig.textContent = 'Adding…';
        fireSparks(btn);

        try {
          const res = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ id: variantId, quantity: qty })
          });
          if (!res.ok) throw new Error();
          btn.classList.remove('loading');
          btn.classList.add('success');
          if (orig) orig.textContent = 'Added!';
          fireSparks(btn);
          updateCartCount();
          setTimeout(() => {
            btn.classList.remove('success');
            if (orig) orig.textContent = 'Add to Cart';
          }, 2200);
        } catch {
          btn.classList.remove('loading');
          if (orig) orig.textContent = 'Add to Cart';
        }
      });
    });
  }

  /* ── Wishlist toggle ────────────────────────────────────────── */
  function initWishlist() {
    document.querySelectorAll('.npm-wishlist').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });
  }

  /* ── Accordion ──────────────────────────────────────────────── */
  function initAccordion() {
    document.querySelectorAll('.npm-accord__toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const accord = toggle.closest('.npm-accord');
        const isOpen = accord.classList.contains('open');
        document.querySelectorAll('.npm-accord').forEach(a => a.classList.remove('open'));
        if (!isOpen) accord.classList.add('open');
      });
    });
  }

  /* ── Quick Add (recommendation cards) ──────────────────────── */
  function initQuickAdd() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.npr-qadd');
      if (!btn) return;
      if (btn.classList.contains('adding') || btn.classList.contains('added')) return;

      const variantId = btn.dataset.variantId;
      if (!variantId) return;

      btn.classList.add('adding');
      const orig = btn.innerHTML;

      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ id: variantId, quantity: 1 })
        });
        if (!res.ok) throw new Error();
        btn.classList.remove('adding');
        btn.classList.add('added');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 13l4 4L19 7"/></svg> Added';
        updateCartCount();
        setTimeout(() => {
          btn.classList.remove('added');
          btn.innerHTML = orig;
        }, 2400);
      } catch {
        btn.classList.remove('adding');
        btn.innerHTML = orig;
      }
    });
  }

  /* ── Cart count bubble ──────────────────────────────────────── */
  async function updateCartCount() {
    try {
      const res  = await fetch('/cart.js');
      const data = await res.json();
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = data.item_count;
        el.style.animation = 'none';
        requestAnimationFrame(() => { el.style.animation = ''; });
      });
    } catch {}
  }

  /* ── Sliders (recommendation sections) ─────────────────────── */
  function initSliders() {
    document.querySelectorAll('.npr-slider-wrap').forEach(wrap => {
      const track = wrap.querySelector('.npr-slider-track');
      const prev  = wrap.querySelector('.npr-slider-prev');
      const next  = wrap.querySelector('.npr-slider-next');
      if (!track) return;

      let startX = 0;
      track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
      track.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        const card = track.querySelector('.npr-card');
        const w = card ? card.offsetWidth + 16 : 220;
        if (Math.abs(dx) > 40) track.scrollBy({ left: dx > 0 ? -w : w, behavior: 'smooth' });
      });

      prev && prev.addEventListener('click', () => {
        const card = track.querySelector('.npr-card');
        track.scrollBy({ left: -(card ? card.offsetWidth + 16 : 220), behavior: 'smooth' });
      });
      next && next.addEventListener('click', () => {
        const card = track.querySelector('.npr-card');
        track.scrollBy({ left: card ? card.offsetWidth + 16 : 220, behavior: 'smooth' });
      });
    });
  }

  /* ── IntersectionObserver — stagger load animations ─────────── */
  function initReveal() {
    if (!window.IntersectionObserver) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const section = entry.target;
        section.querySelectorAll('.npr-card').forEach((card, i) => {
          card.style.setProperty('--i', i);
          card.style.animationPlayState = 'running';
        });
        io.unobserve(section);
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.npr-section').forEach(s => {
      s.querySelectorAll('.npr-card').forEach(c => {
        c.style.animationPlayState = 'paused';
      });
      io.observe(s);
    });
  }

  /* ── Frequently Bought Together total ──────────────────────── */
  function initFreqBought() {
    const section = document.querySelector('[data-recs-type="freq-bought"]');
    if (!section) return;

    const checkboxes = section.querySelectorAll('.npr-freq-check');
    const totalEl    = section.querySelector('.npr-freq-total__price');
    const subEl      = section.querySelector('.npr-freq-total__sub');
    const atcBtn     = section.querySelector('.npr-freq-atc');

    function recalc() {
      let total = 0;
      let count = 0;
      checkboxes.forEach(cb => {
        if (cb.checked) {
          total += parseFloat(cb.dataset.price || 0);
          count++;
        }
      });
      if (totalEl) totalEl.textContent = formatMoney(total);
      if (subEl) subEl.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
    }

    checkboxes.forEach(cb => cb.addEventListener('change', recalc));

    atcBtn && atcBtn.addEventListener('click', async () => {
      const items = [];
      checkboxes.forEach(cb => {
        if (cb.checked && cb.dataset.variantId) {
          items.push({ id: cb.dataset.variantId, quantity: 1 });
        }
      });
      if (!items.length) return;

      atcBtn.textContent = 'Adding…';
      try {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ items })
        });
        atcBtn.textContent = 'Added to Cart ✓';
        updateCartCount();
        setTimeout(() => { atcBtn.textContent = 'Add All to Cart'; }, 2400);
      } catch {
        atcBtn.textContent = 'Add All to Cart';
      }
    });

    recalc();
  }

  /* ── Money format helper ────────────────────────────────────── */
  function formatMoney(cents) {
    return 'R ' + (cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ── Tab controls inside product info ──────────────────────── */
  function initTabs() {
    document.querySelectorAll('.npm-tabs').forEach(tabs => {
      const btns    = tabs.querySelectorAll('.npm-tab-btn');
      const panels  = tabs.querySelectorAll('.npm-tab-panel');
      btns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          panels[i] && panels[i].classList.add('active');
        });
      });
    });
  }

  /* ── Init ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initGallery();
    initQty();
    initVariants();
    initMainATC();
    initWishlist();
    initAccordion();
    initQuickAdd();
    initSliders();
    initReveal();
    initFreqBought();
    initTabs();
  });
})();
