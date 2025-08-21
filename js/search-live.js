// js/search-live.js — live results under the Ang page search bar
(function(){
  'use strict';
  if (window.__LIVE_SEARCH_SCRIPT_LOADED__) return;
  window.__LIVE_SEARCH_SCRIPT_LOADED__ = true;

  let ctrl = null, token = 0;

  function esc(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
  function pickStr(o, ks){ for (let i=0;i<ks.length;i++){ const k=ks[i], v=o&&o[k]; if(typeof v==='string'&&v.trim()) return v.trim(); if(typeof v==='number'&&Number.isFinite(v)) return String(v);} return ''; }
  function G(v){ return pickStr(v?.verse,['unicode','gurmukhi'])||pickStr(v?.line,['unicode','gurmukhi'])||pickStr(v,['unicode','gurmukhi','Gurmukhi','gurmukhiUni','GurmukhiUni']); }
  function angOf(v){ let a = pickStr(v,['pageNo','PageNo','page','ang','sourcePage'])||pickStr(v?.line,['sourcePage'])||pickStr(v?.verse,['page','sourcePage']); a=parseInt(a,10); return Number.isFinite(a)?a:null; }

  function apiUrl(type, q){
    if (type==='1'||type==='first') return '/api/banidb/search/first-letter?q='+encodeURIComponent(q);
    if (type==='2'||type==='full')  return '/api/banidb/search/full-word?q='+encodeURIComponent(q);
    return '';
  }

  function boot(){
    const form  = document.querySelector('.shabad-search .search-form');
    if (!form || form.__liveBound) return;

    const input = form.querySelector('#search');
    const typeEl= form.querySelector('#search-type');
    let panel   = form.querySelector('#live-results');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'live-results';
      panel.className = 'live-results-panel';
      panel.hidden = true;
      form.appendChild(panel);
    }

    const state = { q:'', t:'' };
    const minLen = 1, limit = 8;

    function row(v){
      const a = angOf(v), g = G(v)||'[no text]';
      const href = a && a>=1 && a<=1430 ? `ang.html?ang=${a}#ang=${a}` : '#';
      return `<a class="live-row" href="${href}">${esc(g)}</a>`;
    }

    async function run(){
      const q = (input.value||'').trim();
      const t = (typeEl.value||'2').toString();

      if (q.length < minLen) { panel.hidden = true; panel.innerHTML=''; state.q=''; state.t=''; if (ctrl) ctrl.abort(); return; }
      if (q===state.q && t===state.t) return;
      state.q=q; state.t=t;

      if (ctrl) ctrl.abort();
      ctrl = new AbortController();
      const my = ++token;

      panel.hidden = false;
      panel.innerHTML = `<div class="loading">Searching…</div>`;

      const url = apiUrl(t, q);
      try {
        const r = await fetch(url, { signal: ctrl.signal, headers:{'Accept':'application/json'} });
        if (!r.ok) throw new Error('HTTP '+r.status);
        const data = await r.json();
        const arr = Array.isArray(data?.results) ? data.results
                  : Array.isArray(data?.lines)   ? data.lines
                  : Array.isArray(data)          ? data
                  : [];
        if (my !== token) return; // stale
        if (!arr.length) { panel.innerHTML = `<div class="empty">No results</div>`; return; }
        panel.innerHTML = arr.slice(0,limit).map(row).join('');
      } catch (e) {
        if (e.name === 'AbortError') return;
        panel.innerHTML = `<div class="error">Search failed</div>`;
        console.error('[live-search]', e);
      }
    }

    let timer = 0;
    function schedule(){ clearTimeout(timer); timer = setTimeout(run, 180); }

    input.addEventListener('input', schedule);
    typeEl.addEventListener('change', schedule);
    document.addEventListener('click', e => { if (!form.contains(e.target)) { panel.hidden = true; } });

    form.__liveBound = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();