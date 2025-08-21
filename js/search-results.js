// js/search-results.js — results page (first letter / full word)
(function () {
  'use strict';

  const elInfo = document.getElementById('search-query-info');
  const elList = document.getElementById('search-results');
  const input  = document.getElementById('search');
  const typeEl = document.getElementById('search-type');

  function qs(name){ return (new URLSearchParams(location.search).get(name)||'').trim(); }
  function esc(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  function pickStr(o, ks){ for (let i=0;i<ks.length;i++){ const k=ks[i], v=o&&o[k]; if(typeof v==='string'&&v.trim()) return v.trim(); if(typeof v==='number'&&Number.isFinite(v)) return String(v);} return ''; }
  function G(v){ return pickStr(v?.verse,['unicode','gurmukhi'])||pickStr(v?.line,['unicode','gurmukhi'])||pickStr(v,['unicode','gurmukhi','Gurmukhi','gurmukhiUni','GurmukhiUni']); }
  function A(v){ let a = pickStr(v,['pageNo','PageNo','page','ang','sourcePage'])||pickStr(v?.line,['sourcePage'])||pickStr(v?.verse,['page','sourcePage']); a=parseInt(a,10); return Number.isFinite(a)?a:null; }
  function L(v){ return pickStr(v,['lineNo','LineNo','line']) || pickStr(v?.verse,['line']); }

  function apiUrl(type, q){
    if (type==='1'||type==='first') return '/api/banidb/search/first-letter?q='+encodeURIComponent(q);
    if (type==='2'||type==='full')  return '/api/banidb/search/full-word?q='+encodeURIComponent(q);
    return '';
  }

  function row(v){
    const g = G(v)||'[no text]';
    const a = A(v);
    const l = L(v);
    const href = a && a>=1 && a<=1430 ? `reader.html?ang=${a}` : '#';
    const meta = [a?`Ang ${a}`:null, l?`Line ${l}`:null].filter(Boolean).join(' • ');
    return `
      <div class="result-item card">
        <a class="result-link" href="${href}">
          <div class="result-text">${esc(g)}</div>
          ${meta ? `<div class="result-meta latin-ui">${esc(meta)}</div>` : ``}
        </a>
      </div>`;
  }

  async function run(){
    const q = qs('q');
    const t = (qs('type') || qs('search-type') || '2').toString();

    if (input) input.value = q;
    if (typeEl) typeEl.value = (t==='1'||t==='first') ? '1' : '2';

    elInfo.textContent = q ? `Search Results — “${q}” (${t==='1'?'First letter':'Full word'})` : 'Search Results';

    const url = apiUrl(t, q);
    elList.innerHTML = `<div class="loading">Loading…</div>`;
    try{
      const r = await fetch(url, { headers:{'Accept':'application/json'} });
      if (!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json();
      const arr = Array.isArray(data?.results) ? data.results
                : Array.isArray(data?.lines)   ? data.lines
                : Array.isArray(data)          ? data
                : [];
      if (!arr.length){ elList.innerHTML = `<div class="empty">No results found</div>`; return; }
      elList.innerHTML = arr.map(row).join('');
    }catch(e){
      console.error('[results]', e);
      elList.innerHTML = `<div class="error">Failed to load results</div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();