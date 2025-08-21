// js/raag-carousel.js — deck/fan layout (tight), keyboard, no-loop, 5-visible with left fade
(function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function RaagCarousel(root) {
    this.root = typeof root === 'string'
      ? (document.getElementById(root) || document.querySelector('#' + root))
      : root;

    if (!this.root) return;

    this.wrapper = this.root.classList.contains('raag-carousel-wrapper')
      ? this.root
      : (this.root.querySelector('.raag-carousel-wrapper') || this.root);

    this.container = this.wrapper.querySelector('.raag-carousel-container') || this.wrapper;
    this.cards     = Array.from(this.container.querySelectorAll('.raag-card'));

    // Ensure we have nav buttons (create if missing)
    this.prevBtn = this.wrapper.querySelector('.carousel-prev');
    this.nextBtn = this.wrapper.querySelector('.carousel-next');
    if (!this.prevBtn) {
      this.prevBtn = document.createElement('button');
      this.prevBtn.className = 'carousel-nav carousel-prev';
      this.prevBtn.setAttribute('aria-label', 'Previous');
      this.prevBtn.textContent = '‹';
      this.wrapper.insertBefore(this.prevBtn, this.container);
    }
    if (!this.nextBtn) {
      this.nextBtn = document.createElement('button');
      this.nextBtn.className = 'carousel-nav carousel-next';
      this.nextBtn.setAttribute('aria-label', 'Next');
      this.nextBtn.textContent = '›';
      this.wrapper.appendChild(this.nextBtn);
    }

    // Start at first card (ਆਸਾ) unless another has .active
    this.active = Math.max(0, this.cards.findIndex(c => c.classList.contains('active')));
    if (this.active === -1) this.active = 0;

    this.setup();
    this.layout();
  }

  RaagCarousel.prototype.setup = function () {
    var self = this;
    if (!this.cards.length) return;

    // Buttons
    this.prevBtn.addEventListener('click', function () { self.go(-1); });
    this.nextBtn.addEventListener('click', function () { self.go(1); });

    // Click a card to either navigate or focus
    this.cards.forEach(function (card, i) {
      card.addEventListener('click', function () {
        var hasSections = card.getAttribute('data-has-sections') === '1';
        var slug = card.getAttribute('data-raag-slug');
        var angStart = card.getAttribute('data-ang-start');

        // Parse "ਅੰਗ ੧੪" if needed
        if (!angStart) {
          var angEl = card.querySelector('.raag-ang');
          var txt = angEl ? (angEl.textContent || '') : '';
          var map = { '੦':0,'੧':1,'੨':2,'੩':3,'੪':4,'੫':5,'੬':6,'੭':7,'੮':8,'੯':9 };
          var out = '';
          for (var k = 0; k < txt.length; k++) {
            var ch = txt[k];
            if (map.hasOwnProperty(ch)) out += map[ch];
            else if (/\d/.test(ch)) out += ch;
          }
          if (out) angStart = String(parseInt(out,10));
        }

        if (hasSections && slug) {
          location.href = 'pages/sections.html?raag=' + encodeURIComponent(slug);
          return;
        }
        if (angStart) {
          location.href = 'reader.html?ang=' + encodeURIComponent(angStart);
          return;
        }

        self.active = i;
        self.layout();
      });
    });

    // Arrow keys (no loop, handled in go())
    this._onKey = function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); self.go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); self.go(1); }
    };
    document.addEventListener('keydown', this._onKey);

    // Relayout on resize
    this._onResize = this.layout.bind(this);
    window.addEventListener('resize', this._onResize);
  };

  RaagCarousel.prototype.destroy = function () {
    document.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this._onResize);
  };

  // NO-LOOP: clamp [0, n-1] and disable buttons at ends
  RaagCarousel.prototype.go = function (delta) {
    var n = this.cards.length;
    if (!n) return;
    var next = clamp(this.active + delta, 0, n - 1);
    if (next === this.active) return;
    this.active = next;
    this.layout();
  };

  // ---- Tight stack with exactly 5 visible (center ±2), left-edge fade-out ----
  RaagCarousel.prototype.layout = function () {
    if (!this.cards.length) return;

    var centerCard = this.cards[this.active];
    this.cards.forEach(function (c) { c.classList.remove('active'); });
    centerCard.classList.add('active');

    var baseSpacing    = 120;   // tighter overlap
    var scaleStep      = 0.02;  // gentle taper
    var perSide        = 1;     // exactly 5 visible total (center + 2 each side)
    var fadePad        = 50;    // push-out distance for off-window cards (helps fade illusion)

    for (var i = 0; i < this.cards.length; i++) {
      var card = this.cards[i];
      var offset = i - this.active;     // negative = left of center
      var absOff = Math.abs(offset);

      // Position + scale
      var x = offset * baseSpacing;
      var scale = Math.max(0.86, 1 - absOff * scaleStep);

      // Opacity profile: 1, 0.9, 0.6 (center, ±1, ±2)
      var opacity;
      if (absOff === 0) opacity = 1;
      else if (absOff === 1) opacity = 0.90;
      else if (absOff === 2) opacity = 0.60;
      else opacity = 0;                       // outside the 5-tile window

      // Left-edge “disappear” feel: when a card is just beyond the left window,
      // nudge it extra left so it fades while sliding out.
      if (offset < -perSide) {
        x = offset * baseSpacing - fadePad;
      }
      // Likewise for far right (incoming) — start slightly inside so it fades in smoothly.
      if (offset > perSide) {
        x = offset * baseSpacing + fadePad;
      }

      // Z-order (center on top)
      var z = 200 - absOff;

      card.style.zIndex = String(z);
      card.style.opacity = String(opacity);
      card.style.pointerEvents = (opacity > 0) ? 'auto' : 'none';
      card.style.transform =
        'translate(-50%, -50%) translateX(' + x + 'px) scale(' + scale + ')';
    }

    // Update nav disabled state
    var atStart = this.active === 0;
    var atEnd   = this.active === (this.cards.length - 1);
    if (this.prevBtn) {
      this.prevBtn.disabled = atStart;
      this.prevBtn.setAttribute('aria-disabled', atStart ? 'true' : 'false');
      this.prevBtn.classList.toggle('is-disabled', atStart);
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = atEnd;
      this.nextBtn.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
      this.nextBtn.classList.toggle('is-disabled', atEnd);
    }
  };

  // Auto-init
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('raag-carousel');
    if (root) new RaagCarousel(root);
  });

  // Export
  window.RaagCarousel = RaagCarousel;
})();