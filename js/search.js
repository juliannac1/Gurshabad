// js/search.js — Ang routing + hide all clear icons (let 1/2 submit normally)
(function () {
  'use strict';

  /* ---- Hide ALL clear icons (native + custom) ---- */
  function injectHideAllClear() {
    if (document.getElementById('hide-all-search-clear-style')) return;
    var css = [
      'input[type="search"]::-webkit-search-cancel-button{ -webkit-appearance:none; appearance:none; display:none; }',
      'input[type="search"]::-webkit-search-decoration{ display:none; }',
      'input[type="search"]::-ms-clear{ display:none; width:0; height:0; }',
      'input[type="search"]::-ms-reveal{ display:none; width:0; height:0; }',
      '.clear-search-toggle{ display:none !important; }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'hide-all-search-clear-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---- Client-side routing: only special-case Ang ---- */
  function bindSearchRouting() {
    var form = document.querySelector('.search-form');
    var input = document.getElementById('search');
    var typeSel = document.getElementById('search-type');

    if (!form || !input || !typeSel) return;
    if (form.__searchBound) return;

    form.addEventListener('submit', function (e) {
      var q = (input.value || '').trim();
      var type = (typeSel.value || '').toString();

      // TYPE 5 = Ang → route to ang.html with both query AND hash (compat)
      if (type === '5') {
        e.preventDefault();
        var ang = parseInt(q, 10);
        if (!Number.isFinite(ang)) {
          alert('Enter a valid Ang number (1–1430).');
          input.focus();
          return;
        }
        if (ang < 1) ang = 1;
        if (ang > 1430) ang = 1430;

        try { localStorage.setItem('lastAng', String(ang)); } catch (_) {}
        window.location.href = 'ang.html?ang=' + ang + '#ang=' + ang;
        return;
      }

      // For types 1 & 2, DO NOT preventDefault → let HTML GET submit to search-results.html
    });

    form.setAttribute('novalidate', 'novalidate');
    form.__searchBound = true;
  }

  function init() {
    injectHideAllClear();
    bindSearchRouting();

    // Re-bind if DOM is injected later
    var mo = new MutationObserver(function () { bindSearchRouting(); });
    try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();