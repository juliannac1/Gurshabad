// Development server for Gurshabad
// Proxies BaniDB and serves static files (with normalization + retries + fallbacks)

'use strict';

const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app  = express();
const PORT = process.env.PORT || 3002;

// ---- Upstream base (BaniDB v2) ----
const BANIDB_API_URL = 'https://api.banidb.com/v2';

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from this project root
app.use(express.static(__dirname));

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

// Normalize any BaniDB-ish payload into a flat array of line-like items
function normalizeAngPayload(data) {
  if (!data) return [];

  // common top-level shapes
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.lines))  return data.lines;
  if (Array.isArray(data.page))   return data.page;
  if (Array.isArray(data.data))   return data.data;
  if (Array.isArray(data.verses)) return data.verses;

  // nested shabads[]
  if (Array.isArray(data.shabads)) {
    const out = [];
    for (const s of data.shabads) {
      if (Array.isArray(s?.lines))  out.push(...s.lines);
      if (Array.isArray(s?.verses)) out.push(...s.verses);
    }
    if (out.length) return out;
  }

  // shallow scan: any array that looks like "lines"
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (Array.isArray(v) && v.length) {
      const f = v[0] || {};
      const looksLike =
        typeof f.unicode === 'string' ||
        typeof f.gurmukhi === 'string' ||
        (f.verse && (f.verse.unicode || f.verse.gurmukhi)) ||
        (f.line  && (f.line.unicode  || f.line.gurmukhi));
      if (looksLike) return v;
    }
  }

  // deep scan
  const stack = [data];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    for (const key of Object.keys(node)) {
      const val = node[key];
      if (Array.isArray(val) && val.length) {
        const f = val[0] || {};
        const looksLike =
          typeof f.unicode === 'string' ||
          typeof f.gurmukhi === 'string' ||
          (f.verse && (f.verse.unicode || f.verse.gurmukhi)) ||
          (f.line  && (f.line.unicode  || f.line.gurmukhi));
        if (looksLike) return val;
      } else if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }

  return [];
}

// Simple in-memory cache with TTL
const cache = new Map();
const ANG_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > ANG_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.v;
}
function cacheSet(key, value) {
  cache.set(key, { v: value, t: Date.now() });
}

// Axios instance with sane defaults
const http = axios.create({
  baseURL: BANIDB_API_URL,
  timeout: 12000,
  headers: { Accept: 'application/json' }
});

async function tryGet(url, params = {}) {
  const res = await http.get(url, { params });
  // Some APIs occasionally mislabel content-type; axios already parses JSON.
  return res.data;
}

// Try multiple upstream endpoints before giving up.
// We see 502s sometimes from Cloudflare; hit alternates + retry.
async function fetchAngRobust(n) {
  const endpoints = [
    `/ang/${encodeURIComponent(n)}`,          // primary
    `/page/${encodeURIComponent(n)}`,         // alternative
    `/ang`,                                   // query style variants
    `/page`
  ];

  let lastErr = null;

  // Up to 2 full passes over the endpoint list
  for (let pass = 0; pass < 2; pass++) {
    for (const ep of endpoints) {
      try {
        let data;
        if (ep === '/ang')  data = await tryGet(ep,  { ang: n });
        else if (ep === '/page') data = await tryGet(ep, { page: n });
        else data = await tryGet(ep);

        const lines = normalizeAngPayload(data);
        if (lines && lines.length) {
          return { lines, raw: data, endpoint: ep, pass };
        }
        // If we got a shape but 0 lines, keep trying others.
        lastErr = new Error(`Empty lines from ${ep}`);
      } catch (err) {
        lastErr = err;
        // 5xx/CF hiccup → try next endpoint
        continue;
      }
    }
  }

  throw lastErr || new Error('All upstream attempts failed');
}

/* ========================================================================== */
/* Routes                                                                     */
/* ========================================================================== */

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ANG (page) proxy with cache + fallbacks
app.get('/api/banidb/ang/:n', async (req, res) => {
  const n = String(req.params.n || '').trim();
  if (!/^\d+$/.test(n)) return res.status(400).json({ error: 'Invalid ang number' });

  const cacheKey = `ang:${n}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { lines, raw, endpoint } = await fetchAngRobust(n);
    const payload = { lines, meta: { n: Number(n), upstream: endpoint } };
    cacheSet(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error(`[proxy] Failed to fetch ang ${n}:`, err && err.message ? err.message : err);
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Upstream temporarily unavailable',
      ang: Number(n)
    });
  }
});

// SEARCH: first-letter
app.get('/api/banidb/search/first-letter', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);

  // Pass-through to upstream
  try {
    const data = await tryGet('/search/first-letter', { q });
    res.json(data);
  } catch (err) {
    console.error('[proxy] first-letter search failed:', err && err.message ? err.message : err);
    res.status(502).json({ error: 'Bad Gateway', message: 'Search upstream unavailable' });
  }
});

// SEARCH: full-word
app.get('/api/banidb/search/full-word', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);

  try {
    const data = await tryGet('/search/full-word', { q });
    res.json(data);
  } catch (err) {
    console.error('[proxy] full-word search failed:', err && err.message ? err.message : err);
    res.status(502).json({ error: 'Bad Gateway', message: 'Search upstream unavailable' });
  }
});

/* ========================================================================== */
/* Start                                                                      */
/* ========================================================================== */

app.listen(PORT, () => {
  console.log(`Gurshabad dev server running at http://localhost:${PORT}`);
  console.log(`Static root: ${__dirname}`);
});