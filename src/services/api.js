const isLocalBrowser = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port;
const BASE_URL = isLocalBrowser ? '' : 'https://worldcup26.ir';
const CACHE_KEY_PREFIX = 'wc26_cache_';
const CACHE_TTL = 30 * 1000;        // 30 seconds — fresh window
const CACHE_STALE_MAX = 24 * 60 * 60 * 1000; // 24 hours — max stale age

// ── Cache helpers ─────────────────────────────────────────────────────────────
function getCachedData(key, { allowStale = false } = {}) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    const age = Date.now() - timestamp;
    if (age < CACHE_TTL) return data; // fresh
    if (allowStale && age < CACHE_STALE_MAX) return data; // stale but usable
  } catch (e) {
    console.warn('[API] Cache read error:', e);
  }
  return null;
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('[API] Cache write error:', e);
  }
}

// ── Retry fetch with exponential back-off ─────────────────────────────────────
async function fetchWithRetry(url, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000); // 18s timeout (API is slow)
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // Exponential back-off: 500ms, 1000ms…
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        console.warn(`[API] Attempt ${attempt} failed for ${url}. Retrying…`);
      }
    }
  }
  throw lastError;
}

// ── Static fallback data loader ──────────────────────────────────────────────
let fallbackPromise = null;
async function getFallbackData(key) {
  if (!fallbackPromise) {
    fallbackPromise = (async () => {
      try {
        const res = await fetch('/data/fallback.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('[API] Failed to load local fallback.json:', err);
        return null;
      }
    })();
  }
  const fallback = await fallbackPromise;
  return fallback ? fallback[key] : null;
}

// ── Generic endpoint fetch factory (Stale-While-Revalidate pattern) ───────────
async function fetchEndpoint(key, url, dataKey) {
  // 1. Return fresh cache immediately
  const fresh = getCachedData(key);
  if (fresh) return { data: fresh, stale: false };

  // 2. Return stale cache immediately to prevent page hang, revalidation happens in background
  const stale = getCachedData(key, { allowStale: true });
  if (stale) {
    console.log(`[API] Returning stale cache immediately for "${key}"`);
    return { data: stale, stale: true };
  }

  // 3. Return local bundled fallback.json immediately to prevent page hang
  const fallback = await getFallbackData(key);
  if (fallback) {
    console.log(`[API] Returning static fallback immediately for "${key}"`);
    return { data: fallback, stale: true };
  }

  // 4. Truly nothing available (e.g. first load, offline, no fallback file), do blocked fetch
  try {
    const json = await fetchWithRetry(`${BASE_URL}${url}`);
    const data = json[dataKey] || json;
    setCachedData(key, data);
    return { data, stale: false };
  } catch (error) {
    console.error(`[API] All retries failed for ${url}:`, error);
    return { data: [], stale: false, error: true };
  }
}

export const api = {
  async fetchGroups() {
    return fetchEndpoint('groups', '/get/groups', 'groups');
  },
  async fetchTeams() {
    return fetchEndpoint('teams', '/get/teams', 'teams');
  },
  async fetchGames() {
    return fetchEndpoint('games', '/get/games', 'games');
  },
  async fetchStadiums() {
    return fetchEndpoint('stadiums', '/get/stadiums', 'stadiums');
  },

  /** Direct fresh fetch that bypasses cache and updates it (for background updates) */
  async fetchEndpointFresh(key, url, dataKey) {
    try {
      const json = await fetchWithRetry(`${BASE_URL}${url}`);
      const data = json[dataKey] || json;
      setCachedData(key, data);
      return { data, stale: false };
    } catch (error) {
      console.error(`[API] Background revalidation failed for ${url}:`, error);
      return { data: [], stale: false, error: true };
    }
  },

  /** Clear only the short-lived (live) caches so next fetch is always fresh. */
  clearLiveCaches() {
    ['groups', 'games'].forEach(k => localStorage.removeItem(CACHE_KEY_PREFIX + k));
  }
};
