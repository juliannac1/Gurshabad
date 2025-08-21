// js/menu.js — click-to-toggle dropdown; positions panel under the trigger
(function () {
  'use strict';

  const dropdowns = document.querySelectorAll('.dropdown');
  if (!dropdowns.length) return;

  function ensureBackdrop() {
    let el = document.getElementById('menu-backdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'menu-backdrop';
      el.className = 'menu-backdrop';
      document.body.appendChild(el);
    }
    return el;
  }

  function close(dd) {
    const btn = dd.querySelector('.learning, .nav-pill, [data-dropdown-trigger]');
    const panel = dd.querySelector('.dropdown-content');
    dd.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) {
      panel.style.display = 'none';
      panel.style.pointerEvents = 'none';
    }
    const bd = document.getElementById('menu-backdrop');
    if (bd) bd.classList.remove('active');
  }

  dropdowns.forEach(function (dd) {
    const btn   = dd.querySelector('.learning, .nav-pill, [data-dropdown-trigger]');
    const panel = dd.querySelector('.dropdown-content');
    if (!btn || !panel) return;

    // A11y
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('role', 'menu');
    panel.removeAttribute('hidden');

    function open() {
      // Close others
      document.querySelectorAll('.dropdown.open').forEach(d => { if (d !== dd) close(d); });

      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const top = r.bottom + 10; // gap below trigger

      panel.style.setProperty('--dd-left', cx + 'px');
      panel.style.setProperty('--dd-top',  top + 'px');

      dd.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');

      panel.style.display       = 'block';
      panel.style.opacity       = '1';
      panel.style.visibility    = 'visible';
      panel.style.pointerEvents = 'auto';
      panel.style.zIndex        = '1300';

      requestAnimationFrame(() => ensureBackdrop().classList.add('active'));
    }

    function toggle(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      dd.classList.contains('open') ? close(dd) : open();
    }

    btn.addEventListener('click', toggle);

    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) close(dd); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(dd); });
  });
})();