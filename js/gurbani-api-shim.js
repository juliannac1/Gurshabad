// js/gurbani-api-shim.js — resilient client for Gurshabad (NO /page fallback)
//
// - Primary base: window.__GURBANI_API_BASE__  (your local proxy: /api/banidb)
// - If primary 4xx/5xx/network fails, we try the same path on a direct base:
//     https://api.banidb.com/v2
// - Ang endpoint candidates tried IN ORDER: /ang/:n, then /angs/:n
//   (No /page/:n calls — they caused your 404s.)
// - Gentle retry for transient errors and a tiny in-memory cache.
//

(function () {
  'use strict';

  const DEFAULT_PRIMARY =
    (typeof window !== 'undefined' && window.__GURBANI_API_BASE__) || '/api/banidb';

  const DEFAULT_FALLBACKS = [
    (typeof window !== 'undefined' && window.__GURBANI_API_DIRECT__) || 'https://api.banidb.com/v2'
  ].filter(Boolean);

  const DEBUG = false; // set true to log base/path attempts

  // ---- fetch with timeout ---------------------------------------------------
  function fetchWithTimeout(url, { signal, timeoutMs = 12000, headers } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // If caller provided a signal, chain aborts
    if (signal) signal.addEventListener('abort', () => { try { controller.abort(); } catch (_) {} }, { once: true });

    const finalSignal = signal || controller.signal;
    return fetch(url, { signal: finalSignal, headers })
      .finally(() => clearTimeout(timer));
  }

  // Treat network/timeout/5xx as transient
  function isTransient(errOrStatus) {
    if (typeof errOrStatus === 'number') return errOrStatus >= 500 && errOrStatus < 600;
    if (!errOrStatus) return false;
    if (errOrStatus.name === 'AbortError') return true;
    const msg = (errOrStatus.message || '').toLowerCase();
    return msg.includes('timeout') || msg.includes('network') || msg.includes('failed to fetch');
  }

  class GurbaniAPI {
    constructor(base) {
      this.primaryBase   = base || DEFAULT_PRIMARY;
      this.fallbackBases = [...DEFAULT_FALLBACKS];
      this.angCache      = new Map();
    }

    // Try a single relativePath across all bases (primary then fallbacks)
    async _getJSONAcrossBases(relativePath, { signal, timeoutMs = 12000, retryPerBase = 1 } = {}) {
      const bases = [this.primaryBase, ...this.fallbackBases];
      let lastErr = null;

      for (const base of bases) {
        const url = `${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
        for (let attempt = 0; attempt <= retryPerBase; attempt++) {
          try {
            DEBUG && console.info('[api] GET', url, 'attempt', attempt + 1);
            const res = await fetchWithTimeout(url, {
              signal,
              timeoutMs,
              headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
              // Non-OK: keep going to next attempt/base
              const text = await res.text().catch(() => '');
              const err  = new Error(`HTTP ${res.status}`);
              err.status = res.status;
              err.body   = text;
              throw err;
            }

            // Parse JSON (be tolerant of wrong content-type)
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (!ct.includes('json')) {
              const raw = await res.text();
              try { return JSON.parse(raw); }
              catch { throw new Error('Invalid JSON: ' + url); }
            }
            return await res.json();

          } catch (err) {
            lastErr = err;
            // retry transient issues on SAME base
            if (attempt < retryPerBase && isTransient(err.status ?? err)) {
              await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
              continue;
            }
            // move to next base
            break;
          }
        }
      }
      throw lastErr || new Error('All bases failed');
    }

    // Try multiple candidate paths, each across all bases, in order.
    async _getFirstWorking(paths, opts = {}) {
      let lastErr = null;
      for (const p of paths) {
        try {
          return await this._getJSONAcrossBases(p, opts);
        } catch (err) {
          lastErr = err;
          // If it was a 404 on every base for this path, continue to next path.
          // Otherwise (e.g., 401), still continue — next path may exist.
          DEBUG && console.warn('[api] path failed', p, err);
        }
      }
      throw lastErr || new Error('No candidate path worked');
    }

    /* ============================= Public API ============================= */

    async getAng(n, opts = {}) {
      const key = String(n);
      if (this.angCache.has(key)) return this.angCache.get(key);

      // IMPORTANT: Only ang-style endpoints; NO /page fallback.
      const candidates = [
        `/ang/${encodeURIComponent(n)}`,
        `/angs/${encodeURIComponent(n)}` // some deployments expose plural
      ];

      const data = await this._getFirstWorking(candidates, opts);
      this.angCache.set(key, data);
      return data;
    }

    async searchFirstLetter(q, opts = {}) {
      if (!q) return [];
      const data = await this._getFirstWorking(
        [
          `/search/first-letter?q=${encodeURIComponent(q)}`,
          `/search/first?q=${encodeURIComponent(q)}`
        ],
        opts
      );
      return Array.isArray(data?.results) ? data.results : data;
    }

    async searchFullWord(q, opts = {}) {
      if (!q) return [];
      const data = await this._getFirstWorking(
        [
          `/search/full-word?q=${encodeURIComponent(q)}`,
          `/search/full?q=${encodeURIComponent(q)}`
        ],
        opts
      );
      return Array.isArray(data?.results) ? data.results : data;
    }
  }

  window.GurbaniAPI = GurbaniAPI;
})();