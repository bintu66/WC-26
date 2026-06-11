const isLocalBrowser = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port;
const BASE_URL = isLocalBrowser ? '' : 'https://worldcup26.ir';
const CACHE_KEY_PREFIX = 'wc26_cache_';
const CACHE_TTL = 30 * 1000; // 30 seconds for live/dynamic data

// Helper for caching API responses in localStorage
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }
  return null;
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(
      CACHE_KEY_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

export const api = {
  async fetchGroups() {
    const cached = getCachedData('groups');
    if (cached) return cached;

    try {
      const response = await fetch(`${BASE_URL}/get/groups`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setCachedData('groups', data.groups || data);
      return data.groups || data;
    } catch (error) {
      console.error('API Error (fetchGroups):', error);
      // fallback to expired cache if available, or empty list
      const expired = localStorage.getItem(CACHE_KEY_PREFIX + 'groups');
      return expired ? JSON.parse(expired).data : [];
    }
  },

  async fetchTeams() {
    const cached = getCachedData('teams');
    if (cached) return cached;

    try {
      const response = await fetch(`${BASE_URL}/get/teams`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setCachedData('teams', data.teams || data);
      return data.teams || data;
    } catch (error) {
      console.error('API Error (fetchTeams):', error);
      const expired = localStorage.getItem(CACHE_KEY_PREFIX + 'teams');
      return expired ? JSON.parse(expired).data : [];
    }
  },

  async fetchGames() {
    const cached = getCachedData('games');
    if (cached) return cached;

    try {
      const response = await fetch(`${BASE_URL}/get/games`);
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setCachedData('games', data.games || data);
      return data.games || data;
    } catch (error) {
      console.error('API Error (fetchGames):', error);
      const expired = localStorage.getItem(CACHE_KEY_PREFIX + 'games');
      return expired ? JSON.parse(expired).data : [];
    }
  },

  async fetchStadiums() {
    const cached = getCachedData('stadiums');
    if (cached) return cached;

    try {
      const response = await fetch(`${BASE_URL}/get/stadiums`);
      if (!response.ok) throw new Error('Failed to fetch stadiums');
      const data = await response.json();
      setCachedData('stadiums', data.stadiums || data);
      return data.stadiums || data;
    } catch (error) {
      console.error('API Error (fetchStadiums):', error);
      const expired = localStorage.getItem(CACHE_KEY_PREFIX + 'stadiums');
      return expired ? JSON.parse(expired).data : [];
    }
  }
};
