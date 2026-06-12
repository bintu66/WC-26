import { api } from './api';

// ── Flag emoji fallback map ────────────────────────────────────────────────────
const flagFallback = {
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Belgium': '🇧🇪',
  'Brazil': '🇧🇷', 'Canada': '🇨🇦', 'Croatia': '🇭🇷', 'Czech Republic': '🇨🇿',
  'Denmark': '🇩🇰', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷', 'Germany': '🇩🇪', 'Ghana': '🇬🇭', 'Iran': '🇮🇷',
  'Iraq': '🇮🇶', 'Italy': '🇮🇹', 'Japan': '🇯🇵', 'Mexico': '🇲🇽',
  'Morocco': '🇲🇦', 'Netherlands': '🇳🇱', 'Norway': '🇳🇴', 'Panama': '🇵🇦',
  'Paraguay': '🇵🇾', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦', 'Saudi Arabia': '🇸🇦',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳', 'South Korea': '🇰🇷', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Tunisia': '🇹🇳', 'Turkey': '🇹🇷',
  'United States': '🇺🇸', 'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'Jordan': '🇯🇴', 'Algeria': '🇩🇿', 'Bosnia and Herzegovina': '🇧🇦',
  'Cape Verde': '🇨🇻', 'Curaçao': '🇨🇼', 'Haiti': '🇭🇹', 'New Zealand': '🇳🇿',
  'South Africa': '🇿🇦', 'Democratic Republic of the Congo': '🇨🇩',
  'Venezuela': '🇻🇪', 'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳', 'Jamaica': '🇯🇲',
  'Trinidad and Tobago': '🇹🇹', 'Guatemala': '🇬🇹', 'El Salvador': '🇸🇻',
  'Peru': '🇵🇪', 'Bolivia': '🇧🇴', 'Chile': '🇨🇱', 'Nigeria': '🇳🇬',
  'Cameroon': '🇨🇲', 'Ivory Coast': '🇨🇮', 'Mali': '🇲🇱', 'Tanzania': '🇹🇿',
  'Zambia': '🇿🇲', 'Uganda': '🇺🇬', 'Zimbabwe': '🇿🇼', 'Kenya': '🇰🇪',
  'Indonesia': '🇮🇩', 'Philippines': '🇵🇭', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳',
  'China': '🇨🇳', 'India': '🇮🇳', 'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩',
  'United Arab Emirates': '🇦🇪', 'Kuwait': '🇰🇼', 'Bahrain': '🇧🇭',
  'Oman': '🇴🇲', 'Palestine': '🇵🇸', 'Lebanon': '🇱🇧', 'Syria': '🇸🇾',
  'New Caledonia': '🇳🇨', 'Tahiti': '🇵🇫', 'Fiji': '🇫🇯',
};

// ── Bangladesh Standard Time helpers (UTC+6) ─────────────────────────────────
const BST_TZ = 'Asia/Dhaka'; // UTC+6 — Bangladesh Standard Time

// ── Venue timezone mapping (summer / daylight saving offsets) ──────────────────
// WC2026 matches are Jun-Jul (summer), so daylight saving is in effect.
const REGION_UTC_OFFSET = {
  'Eastern': '-04:00', // EDT (New York, Toronto, Atlanta, Miami, Boston, Philadelphia)
  'Central': '-05:00', // CDT (Houston, Dallas, Kansas City) / Mexico CDT
  'Western': '-07:00', // PDT (LA, Seattle, San Francisco, Vancouver)
};

/**
 * Parse the API's local_date (venue local time) into a proper JS Date with UTC offset.
 * API format: "MM/DD/YYYY HH:mm" — no timezone info.
 * We look up the stadium region to determine the UTC offset.
 */
function parseVenueDate(localDateStr, stadiumId, stadiumMap) {
  if (!localDateStr) return null;
  try {
    // Format: "06/12/2026 15:00" → need to convert to ISO
    const [datePart, timePart] = localDateStr.split(' ');
    const [month, day, year] = datePart.split('/');
    const time = timePart || '00:00';

    // Look up stadium region for timezone offset
    const stadium = stadiumMap[stadiumId];
    const region = stadium?.region || 'Eastern'; // default to Eastern
    const offset = REGION_UTC_OFFSET[region] || '-04:00';

    // Build ISO 8601 string: "2026-06-12T15:00:00-04:00"
    const isoStr = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${time}:00${offset}`;
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export const dataStore = {
  teams: [],
  groups: [],
  games: [],
  stadiums: [],

  teamMap: {},
  teamByName: {},
  gameMap: {},
  stadiumMap: {},

  isLoaded: false,
  hasError: false,   // true when ALL retries failed AND no stale cache
  isStale: false,    // true when we're showing stale (cached) data

  async init() {
    this.hasError = false;
    this.isStale = false;
    try {
      const [teamsRes, groupsRes, gamesRes, stadiumsRes] = await Promise.all([
        api.fetchTeams(),
        api.fetchGroups(),
        api.fetchGames(),
        api.fetchStadiums()
      ]);

      // Detect errors / staleness across all endpoints
      const results = [teamsRes, groupsRes, gamesRes, stadiumsRes];
      const anyError = results.every(r => r.error); // truly empty on ALL
      const anyStale = results.some(r => r.stale);

      if (anyError) {
        this.hasError = true;
        // Don't overwrite existing data if a re-init is called
        if (this.games.length === 0) return;
      }

      if (anyStale) this.isStale = true;

      this.teams    = teamsRes.data    || [];
      this.groups   = groupsRes.data   || [];
      this.games    = gamesRes.data    || [];
      this.stadiums = stadiumsRes.data || [];

      // Build lookup maps
      this.teamMap    = {};
      this.teamByName = {};
      this.gameMap    = {};
      this.stadiumMap = {};

      this.teams.forEach(team => {
        team.name = team.name_en || team.name;
        this.teamMap[team._id]     = team;
        this.teamMap[team.id]      = team;
        this.teamMap[team.team_id] = team;
        if (team.name) this.teamByName[team.name.toLowerCase()] = team;
      });

      this.stadiums.forEach(s => {
        this.stadiumMap[s.id]  = s;
        this.stadiumMap[s._id] = s;
      });

      // Convert all game local_date (venue time) to proper UTC dates
      this.games.forEach(g => {
        const parsed = parseVenueDate(g.local_date, g.stadium_id, this.stadiumMap);
        if (parsed) g.date = parsed.toISOString();
        this.gameMap[g.id] = g;
      });

      this.isLoaded = true;
      console.log('[DataStore] Ready. Games:', this.games.length, this.isStale ? '(stale)' : '(fresh)');
    } catch (e) {
      console.error('[DataStore] Unhandled init error:', e);
      this.hasError = true;
    }
  },

  // ── Timezone helpers ─────────────────────────────────────────────────────────

  /** Format an ISO date string to Bangladesh Standard Time date label */
  formatMatchDate(dateStr) {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        timeZone: BST_TZ
      });
    } catch { return dateStr; }
  },

  /** Format an ISO date string to BST time like "01:00 AM BST" */
  formatMatchTime(dateStr) {
    if (!dateStr) return '';
    try {
      const time = new Date(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: BST_TZ
      });
      return `${time} BST`;
    } catch { return ''; }
  },

  /** Full datetime label — e.g. "Fri, Jun 13 · 01:00 AM BST" */
  formatMatchDateTime(dateStr) {
    if (!dateStr) return 'TBD';
    try {
      const date = new Date(dateStr);
      const d = date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', timeZone: BST_TZ
      });
      const t = date.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: BST_TZ
      });
      return `${d} · ${t} BST`;
    } catch { return dateStr; }
  },

  getFlagEmoji(teamName) {
    if (!teamName) return '🏳️';
    return flagFallback[teamName] || '🏳️';
  },

  getTeamFlag(teamIdOrName) {
    if (!teamIdOrName) return '';
    const team = this.teamMap[teamIdOrName] || this.teamByName[String(teamIdOrName).toLowerCase()];
    return (team && team.flag && team.flag !== 'null') ? team.flag : '';
  },

  // ── Group helpers ────────────────────────────────────────────────────────────

  getGroupList() {
    return this.groups.map(g => g.name).sort();
  },

  getGroupStandings(groupLetter) {
    const group = this.groups.find(g => g.name === groupLetter);
    if (!group) return [];
    const standings = group.teams.map(t => {
      const td = this.teamMap[t.team_id];
      return { ...t, name: td ? td.name : `Team ${t.team_id}`, flag: td ? td.flag : '' };
    });
    return standings.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd  !== a.gd)  return b.gd - a.gd;
      return b.gf - a.gf;
    });
  },

  getGroupMatches(groupLetter) {
    return this.games
      .filter(g => g.group === groupLetter)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  // ── Fixtures helpers ─────────────────────────────────────────────────────────

  getFilteredGames(filter) {
    let list = [...this.games];
    if (filter === 'live') {
      list = list.filter(g => this.isMatchLive(g));
    } else if (filter === 'group') {
      list = list.filter(g => g.type === 'group');
    } else if (filter === 'knockout') {
      list = list.filter(g => g.type !== 'group');
    } else if (filter && filter !== 'all') {
      list = list.filter(g => g.type === filter);
    }
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getGamesByDate(filter) {
    const games = this.getFilteredGames(filter);
    const groups = {};
    games.forEach(game => {
      const key = this.formatMatchDate(game.date || game.local_date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(game);
    });
    return Object.entries(groups).map(([date, matches]) => ({ date, matches }));
  },

  /** Returns true when the match is currently in-play */
  isMatchLive(game) {
    if (!game.time_elapsed) return false;
    if (game.finished === 'TRUE') return false;
    const te = String(game.time_elapsed).toLowerCase();
    return te !== 'notstarted' && te !== 'ft' && te !== '' && te !== 'null';
  },

  // ── Knockout resolution ──────────────────────────────────────────────────────

  resolveKnockoutTeam(label) {
    if (!label) return { name: 'TBD', flag: '', isPlaceholder: true };

    const matchRef  = label.match(/Winner Match (\d+)/i);
    const loserRef  = label.match(/Loser Match (\d+)/i);

    if (matchRef) {
      const prev = this.gameMap[matchRef[1]];
      if (prev && prev.finished === 'TRUE') {
        const hs = parseInt(prev.home_score || 0), as = parseInt(prev.away_score || 0);
        return hs >= as
          ? { name: prev.home_team_name_en, flag: this.getTeamFlag(prev.home_team_id), id: prev.home_team_id }
          : { name: prev.away_team_name_en, flag: this.getTeamFlag(prev.away_team_id), id: prev.away_team_id };
      }
      return { name: label, flag: '', isPlaceholder: true };
    }

    if (loserRef) {
      const prev = this.gameMap[loserRef[1]];
      if (prev && prev.finished === 'TRUE') {
        const hs = parseInt(prev.home_score || 0), as = parseInt(prev.away_score || 0);
        return hs < as
          ? { name: prev.home_team_name_en, flag: this.getTeamFlag(prev.home_team_id), id: prev.home_team_id }
          : { name: prev.away_team_name_en, flag: this.getTeamFlag(prev.away_team_id), id: prev.away_team_id };
      }
      return { name: label, flag: '', isPlaceholder: true };
    }

    const winnerRef = label.match(/Winner Group ([A-L])/i);
    const runnerRef = label.match(/Runner-up Group ([A-L])/i);

    if (winnerRef) {
      const st = this.getGroupStandings(winnerRef[1]);
      if (st.length > 0 && st[0].mp >= 3) return { name: st[0].name, flag: st[0].flag, id: st[0].team_id };
      return { name: label, flag: '', isPlaceholder: true };
    }

    if (runnerRef) {
      const st = this.getGroupStandings(runnerRef[1]);
      if (st.length > 1 && st[1].mp >= 3) return { name: st[1].name, flag: st[1].flag, id: st[1].team_id };
      return { name: label, flag: '', isPlaceholder: true };
    }

    const team = this.teamByName[label.toLowerCase()] || this.teamMap[label];
    if (team) return { name: team.name, flag: team.flag, id: team._id };

    return { name: label, flag: '', isPlaceholder: true };
  },

  // ── Match details ────────────────────────────────────────────────────────────

  getMatchDetails(gameId) {
    const game = this.gameMap[gameId];
    if (!game) return null;

    let home = { name: game.home_team_name_en, flag: this.getTeamFlag(game.home_team_id), id: game.home_team_id };
    let away = { name: game.away_team_name_en, flag: this.getTeamFlag(game.away_team_id), id: game.away_team_id };

    if (game.type !== 'group') {
      if (!game.home_team_name_en || game.home_team_id === '0') home = this.resolveKnockoutTeam(game.home_team_label);
      if (!game.away_team_name_en || game.away_team_id === '0') away = this.resolveKnockoutTeam(game.away_team_label);
    }

    const stadium = this.stadiumMap[game.stadium_id];

    return {
      ...game,
      home,
      away,
      isLive: this.isMatchLive(game),
      stadiumName: stadium ? stadium.name : 'TBD',
      stadiumCity: stadium ? stadium.city : '',
      stadiumCapacity: stadium ? stadium.capacity : null,
    };
  },

  // ── Bracket ──────────────────────────────────────────────────────────────────

  getBracketData() {
    const rounds = {
      r32:   this.games.filter(g => g.type === 'r32').sort((a,b)   => parseInt(a.id) - parseInt(b.id)),
      r16:   this.games.filter(g => g.type === 'r16').sort((a,b)   => parseInt(a.id) - parseInt(b.id)),
      qf:    this.games.filter(g => g.type === 'qf').sort((a,b)    => parseInt(a.id) - parseInt(b.id)),
      sf:    this.games.filter(g => g.type === 'sf').sort((a,b)    => parseInt(a.id) - parseInt(b.id)),
      final: this.games.filter(g => g.type === 'final').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
      third: this.games.filter(g => g.type === 'third').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
    };
    const resolved = {};
    Object.entries(rounds).forEach(([k, matches]) => {
      resolved[k] = matches.map(m => this.getMatchDetails(m.id));
    });
    return resolved;
  }
};
