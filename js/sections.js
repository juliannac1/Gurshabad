// ===== sections.js PATCH: robust open at ang =====
(function () {
  'use strict';

  // Convert Arabic digits to Gurmukhi digits (unchanged)
  function toGurmukhiDigits(n) {
    return String(n).replace(/\d/g, d => "੦੧੨੩੪੫੬੭੮੯"[Number(d)]);
  }

  // 🔒 Use an absolute path so we never depend on current folder depth
  const READER_ROUTE = '/ang.html';
  const DATA_URL     = '../data/raag-sections.json';

  // 👉 Helper: open reader at a given ang, with a hash fallback if needed
  function openReaderAtAng(ang) {
    const n = parseInt(ang, 10);
    if (Number.isNaN(n)) return;

    // First try query param (your carousel uses this too)
    const urlQuery = `${READER_ROUTE}?ang=${n}`;
    console.log('[sections] opening', urlQuery);
    location.assign(urlQuery);

    // After a short delay, if the reader still hasn't rendered (blank content),
    // try the hash style — some reader implementations watch location.hash.
    setTimeout(() => {
      // If your reader sets a global like window.__ANG_RENDERED once loaded,
      // you can check that instead of a blind fallback.
      if (document.visibilityState === 'visible') {
        // Only attempt fallback if we are still on reader.html AND
        // there is no element with a known reader container id/class.
        const onReader = /\/reader\.html(?:$|\?)/.test(location.pathname + location.search);
        const hasCanvas = document.querySelector('#ang-view, .ang-container, .reader-root'); // adjust if you have a known id
        if (onReader && !hasCanvas) {
          const urlHash = `${READER_ROUTE}#ang=${n}`;
          console.log('[sections] fallback to hash', urlHash);
          location.replace(urlHash);
        }
      }
    }, 350);
  }

  function getSlug() {
    const qs = new URLSearchParams(location.search);
    return (qs.get('raag') || '').trim().toLowerCase();
  }

  async function loadData() {
    const r = await fetch(DATA_URL);
    if (!r.ok) throw new Error('Failed to load raag-sections.json');
    return r.json();
  }

  function renderRaag(raag) {
    const titleEl = document.getElementById('raag-title');
    const tilesEl = document.getElementById('tiles');
    titleEl.textContent = raag.raag_pa || raag.slug;
    tilesEl.innerHTML = '';

    raag.sections.forEach(sec => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.setAttribute('aria-label', sec.title_pa);

      const sRaag = document.createElement('span');
      sRaag.className = 't-raag';
      sRaag.textContent = raag.raag_pa || '';

      const sTitle = document.createElement('span');
      sTitle.className = 't-title';
      sTitle.textContent = sec.title_pa;

      const sSub = document.createElement('span');
      sSub.className = 't-sub';
      sSub.textContent = `ਅੰਗ ${toGurmukhiDigits(sec.ang_start)}–${toGurmukhiDigits(sec.ang_end)}`;

      btn.appendChild(sRaag);
      btn.appendChild(sTitle);
      btn.appendChild(sSub);

      // ⏩ use the robust opener
      btn.addEventListener('click', () => openReaderAtAng(sec.ang_start));

      tilesEl.appendChild(btn);
    });
  }

  async function init() {
    try {
      const slug = getSlug();
      const all = await loadData();
      const raag = all.find(r => (r.slug || '').toLowerCase() === slug);
      if (!raag) {
        document.getElementById('tiles').innerHTML =
          '<p>ਇਸ ਰਾਗ ਲਈ ਕੋਈ ਭਾਗ ਨਹੀਂ ਮਿਲੇ। <a href="../index.html">ਘਰ ਵਾਪਸ</a></p>';
        return;
      }
      renderRaag(raag);
    } catch (err) {
      console.error(err);
      document.getElementById('tiles').innerHTML = '<p>ਭਾਗ ਲੋਡ ਕਰਨ ਵਿੱਚ ਗੜਬੜ।</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();