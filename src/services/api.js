const isLocalBrowser = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port;
const BASE_URL = isLocalBrowser ? '' : 'https://worldcup26.ir';
const CACHE_KEY_PREFIX = 'wc26_cache_';

// ── Cache TTL Tiers ────────────────────────────────────────────────────────────
// Tier 1 FRESH  : < 5 minutes  → serve immediately, no banner
// Tier 2 SOFT   : 5min – 2hr   → serve immediately + show "Refreshing…" banner
// Tier 3 HARD   : > 2 hours    → block on fresh fetch (show skeleton loaders)
//                                 only fall back to stale if network totally fails
const CACHE_FRESH_TTL      =  5 * 60 * 1000; //  5 minutes
const CACHE_SOFT_STALE_MAX =  2 * 60 * 60 * 1000; //  2 hours
const CACHE_HARD_STALE_MAX = 24 * 60 * 60 * 1000; // 24 hours (absolute max fallback)

// ── Cache helpers ─────────────────────────────────────────────────────────────
/**
 * Returns cache entry with staleness tier.
 * @returns {{ data: any, age: number, staleTier: 'fresh'|'soft'|'hard'|null }}
 */
function getCachedEntry(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return { data: null, age: Infinity, staleTier: null };
    const { data, timestamp } = JSON.parse(raw);
    const age = Date.now() - timestamp;
    let staleTier;
    if (age < CACHE_FRESH_TTL)           staleTier = 'fresh';
    else if (age < CACHE_SOFT_STALE_MAX) staleTier = 'soft';
    else if (age < CACHE_HARD_STALE_MAX) staleTier = 'hard';
    else                                  staleTier = null; // too old, ignore
    return { data, age, staleTier };
  } catch (e) {
    console.warn('[API] Cache read error:', e);
    return { data: null, age: Infinity, staleTier: null };
  }
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

// ── Generic endpoint fetch factory ────────────────────────────────────────────
/**
 * 3-Tier cache strategy:
 *   FRESH  (<5min)  → { data, stale: false }
 *   SOFT   (5m-2hr) → { data, stale: 'soft' }   — show data + Refreshing banner
 *   HARD   (>2hr)   → blocks on fresh fetch, returns { data, stale: false } once done
 *                      if network fails → { data, stale: 'hard', fromCache: true }
 *   NONE            → blocks on fetch, returns { data, stale: false } or { error: true }
 */
async function fetchEndpoint(key, url, dataKey) {
  const cached = getCachedEntry(key);

  // TIER 1: FRESH — return immediately, no banner needed
  if (cached.staleTier === 'fresh') {
    return { data: cached.data, stale: false };
  }

  // TIER 2: SOFT-STALE — return immediately with soft banner; background revalidate later
  if (cached.staleTier === 'soft') {
    const mins = Math.round(cached.age / 60000);
    console.log(`[API] Soft-stale "${key}" (${mins}m old). Serving now, revalidating in background.`);
    return { data: cached.data, stale: 'soft' };
  }

  // TIER 3: HARD-STALE (>2hr) or NO CACHE — BLOCK on a fresh fetch
  // We intentionally do NOT flash outdated data; skeletons stay visible until this resolves.
  const isHard = cached.staleTier === 'hard';
  if (isHard) {
    console.log(`[API] Hard-stale "${key}" (>${Math.round(cached.age / 3600000)}h old). Blocking on fresh fetch…`);
  }

  try {
    const json = await fetchWithRetry(`${BASE_URL}${url}`);
    const data = json[dataKey] || json;
    setCachedData(key, data);
    return { data, stale: false };
  } catch (networkError) {
    // Network failed — use hard-stale as last resort
    if (isHard && cached.data) {
      const ageHours = Math.round(cached.age / 3600000);
      console.warn(`[API] Network failed for "${key}". Emergency fallback: ${ageHours}h-old cache.`);
      return { data: cached.data, stale: 'hard', fromCache: true, cacheAge: cached.age };
    }
    // Try bundled fallback.json
    const fallback = await getFallbackData(key);
    if (fallback) {
      console.warn(`[API] Network failed for "${key}". Using bundled fallback.json.`);
      return { data: fallback, stale: 'hard', fromCache: true };
    }
    console.error(`[API] All retries failed for ${url}:`, networkError);
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

  /** Direct fresh fetch — bypasses cache; used for background soft-stale revalidation */
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

  /** Clear live/score caches so next fetch is always fresh. */
  clearLiveCaches() {
    ['groups', 'games'].forEach(k => localStorage.removeItem(CACHE_KEY_PREFIX + k));
  },

  /** Clear ALL caches (for hard manual refresh). */
  clearAllCaches() {
    ['groups', 'games', 'teams', 'stadiums'].forEach(k => localStorage.removeItem(CACHE_KEY_PREFIX + k));
  }
};
