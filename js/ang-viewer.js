// js/ang-viewer.js — Ang Viewer (stacked transliteration + stable fetch)
(function () {
  'use strict';

  /* ============================== Constants ============================== */
  const ANG_MIN = 1, ANG_MAX = 1430;

  /* ============================ Small Utilities =========================== */
  const clamp = n => Math.min(ANG_MAX, Math.max(ANG_MIN, (n|0) || ANG_MIN));
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

  function pickStr(obj, keys) {
    for (const k of keys) {
      const v = obj && obj[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    }
    return '';
  }

  function qsAng() {
    const u = new URL(location.href);
    const q = (u.searchParams.get('ang') || '').trim();
    if (q) return clamp(+q);
    const h = new URLSearchParams((location.hash || '').slice(1));
    const x = (h.get('ang') || '').trim();
    return x ? clamp(+x) : null;
  }

  /* ========================== Field Extractors =========================== */
  function getGurmukhi(v) {
    return (
      pickStr(v?.verse, ['unicode','gurmukhi']) ||
      pickStr(v?.line,  ['unicode','gurmukhi']) ||
      pickStr(v, ['unicode','gurmukhi','Gurmukhi','gurmukhiUni','GurmukhiUni'])
    );
  }

  // flattened or nested transliteration
  function getTranslit(v) {
    const top = pickStr(v, ['transliteration','translit','translitEnglish','pronunciation','latn','rom']);
    if (top) return top;
    const from = o => o && typeof o === 'object'
      ? (pickStr(o, ['english','English','en','EN']) || '')
      : '';
    return (
      from(v?.transliteration) ||
      from(v?.line?.transliteration) ||
      from(v?.verse?.transliteration) ||
      ''
    );
  }

  /* ============================ Normalization ============================ */
  function normalizeAngPayload(data) {
    if (!data) return [];

    // obvious shapes
    if (Array.isArray(data)) return data;
    for (const k of ['lines','page','data','verses']) {
      if (Array.isArray(data[k])) return data[k];
    }

    // shabads[].lines / .verses
    if (Array.isArray(data.shabads)) {
      const out = [];
      for (const s of data.shabads) {
        if (Array.isArray(s?.lines))  out.push(...s.lines);
        if (Array.isArray(s?.verses)) out.push(...s.verses);
      }
      if (out.length) return out;
    }

    // shallow scan
    for (const k of Object.keys(data)) {
      const v = data[k];
      if (Array.isArray(v) && v.length) {
        const f = v[0] || {};
        const looks = typeof f.unicode === 'string' ||
                      typeof f.gurmukhi === 'string' ||
                      (f.verse && (f.verse.unicode || f.verse.gurmukhi)) ||
                      (f.line  && (f.line.unicode  || f.line.gurmukhi));
        if (looks) return v;
      }
    }

    // deep scan
    const stack = [data];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (Array.isArray(v) && v.length) {
          const f = v[0] || {};
          const looks = typeof f.unicode === 'string' ||
                        typeof f.gurmukhi === 'string' ||
                        (f.verse && (f.verse.unicode || f.verse.gurmukhi)) ||
                        (f.line  && (f.line.unicode  || f.line.gurmukhi));
          if (looks) return v;
        } else if (v && typeof v === 'object') {
          stack.push(v);
        }
      }
    }
    return [];
  }

  /* ============================== API Shim =============================== */
  // Uses your gurbani-api-shim.js if loaded; else falls back to fetch /api/banidb/ang/:n
  async function fetchAng(n, { signal } = {}) {
    if (window.GurbaniAPI) {
      const api = window.__gApi__ || (window.__gApi__ = new window.GurbaniAPI(window.__GURBANI_API_BASE__));
      return api.getAng(n, { signal });
    }
    const res = await fetch(`/api/banidb/ang/${n}`, { signal, headers:{'Accept':'application/json'} });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return res.json();
  }

  /* ============================== Rendering ============================== */
  const elContainer = document.getElementById('gurbani-container') || (() => {
    const d = document.createElement('div');
    d.id = 'gurbani-container';
    document.body.appendChild(d);
    return d;
  })();

  function lineHTML(v) {
    const g = getGurmukhi(v);
    const t = getTranslit(v);

    // Always output transliteration as its own block UNDER the Gurmukhi.
    return `
      <div class="gurbani-line">
        <div class="g-line-text">${esc(g)}</div>
        ${t ? `<div class="g-line-translit latin-ui">${esc(t)}</div>` : ``}
      </div>
    `;
  }

  function renderLines(items) {
    if (!items || !items.length) {
      elContainer.innerHTML = `<p class="empty">No lines found.</p>`;
      return;
    }
    elContainer.innerHTML = items.map(lineHTML).join('');
  }

  /* ============================= Page Controls =========================== */
  const elPrev = document.getElementById('prev-ang');
  const elNext = document.getElementById('next-ang');
  const elGo   = document.getElementById('go-ang');
  const elIn   = document.getElementById('ang-input');

  function setInput(n){ if (elIn) elIn.value = String(clamp(n)); }
  function nav(n){ const a = clamp(n); history.replaceState(null,'',`?ang=${a}#ang=${a}`); boot(); }

  if (elPrev) elPrev.addEventListener('click', () => nav((qsAng()||1)-1));
  if (elNext) elNext.addEventListener('click', () => nav((qsAng()||1)+1));
  if (elGo)   elGo.addEventListener('click', () => nav(+elIn.value||1));
  if (elIn)   elIn.addEventListener('keydown', e => { if (e.key==='Enter'){ e.preventDefault(); nav(+elIn.value||1); } });

  /* ================================= Boot ================================ */
  let inflight = null;

  async function boot() {
    const ang = clamp(qsAng() ?? (+localStorage.getItem('lastAng')||1));
    setInput(ang);

    // show loading
    elContainer.innerHTML = `<div class="loading">Loading…</div>`;

    // abort older
    if (inflight) inflight.abort();
    inflight = new AbortController();

    try {
      const raw = await fetchAng(ang, { signal: inflight.signal });
      const items = normalizeAngPayload(raw);
      renderLines(items);
      try { localStorage.setItem('lastAng', String(ang)); } catch(_){}
    } catch (err) {
      console.error('[ang] load error', err);
      elContainer.innerHTML = `<div class="error">Error loading Ang. Please try again.</div>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();