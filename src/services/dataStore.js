import { api } from './api';

// Map team name to flag emoji as fallback
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
  'South Africa': '🇿🇦', 'Democratic Republic of the Congo': '🇨🇩'
};

export const dataStore = {
  teams: [],
  groups: [],
  games: [],
  stadiums: [],
  
  teamMap: {}, // team_id -> team object
  teamByName: {}, // name -> team object
  gameMap: {}, // match_id -> game object
  stadiumMap: {}, // stadium_id -> stadium object

  isLoaded: false,

  async init() {
    try {
      const [teamsData, groupsData, gamesData, stadiumsData] = await Promise.all([
        api.fetchTeams(),
        api.fetchGroups(),
        api.fetchGames(),
        api.fetchStadiums()
      ]);

      this.teams = teamsData || [];
      this.groups = groupsData || [];
      this.games = gamesData || [];
      this.stadiums = stadiumsData || [];

      // Build lookups
      this.teams.forEach(team => {
        team.name = team.name_en || team.name;
        this.teamMap[team._id] = team;
        this.teamMap[team.id] = team; // support both IDs
        this.teamMap[team.team_id] = team; // support both IDs
        if (team.name) {
          this.teamByName[team.name.toLowerCase()] = team;
        }
      });

      this.stadiums.forEach(stadium => {
        this.stadiumMap[stadium.id] = stadium;
        this.stadiumMap[stadium._id] = stadium;
      });

      this.games.forEach(game => {
        this.gameMap[game.id] = game;
      });

      this.isLoaded = true;
      console.log('DataStore Initialized. Games loaded:', this.games.length);
    } catch (e) {
      console.error('DataStore init error:', e);
    }
  },

  getFlagEmoji(teamName) {
    if (!teamName) return '🏳️';
    return flagFallback[teamName] || '🏳️';
  },

  getTeamFlag(teamIdOrName) {
    if (!teamIdOrName) return '';
    // Check if ID or name
    const team = this.teamMap[teamIdOrName] || this.teamByName[String(teamIdOrName).toLowerCase()];
    if (team && team.flag && team.flag !== 'null') {
      return team.flag;
    }
    return '';
  },

  // Helper to format match local date into a user friendly readable date
  formatMatchDate(dateStr) {
    if (!dateStr) return 'TBD';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  },

  formatMatchTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  },

  // Groups logic
  getGroupList() {
    return this.groups.map(g => g.name).sort();
  },

  getGroupStandings(groupLetter) {
    const group = this.groups.find(g => g.name === groupLetter);
    if (!group) return [];
    
    // The teams list inside groups API might only contain team_id and stats.
    // Let's resolve the actual team details (name, flag) from teamMap.
    const standings = group.teams.map(t => {
      const teamDetails = this.teamMap[t.team_id];
      return {
        ...t,
        name: teamDetails ? teamDetails.name : `Team ${t.team_id}`,
        flag: teamDetails ? teamDetails.flag : ''
      };
    });

    // Sort standings by pts (desc), gd (desc), gf (desc)
    return standings.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  },

  getGroupMatches(groupLetter) {
    return this.games.filter(g => g.group === groupLetter).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  // Fixtures page logic
  getFilteredGames(filter) {
    let list = [...this.games];
    
    if (filter === 'live') {
      list = list.filter(g => g.time_elapsed && g.time_elapsed !== 'notstarted' && g.time_elapsed !== 'FT' && g.finished !== 'TRUE');
    } else if (filter === 'group') {
      list = list.filter(g => g.type === 'group');
    } else if (filter === 'knockout') {
      list = list.filter(g => g.type !== 'group');
    } else if (filter && filter !== 'all') {
      // stages like r32, r16, qf, sf, final
      list = list.filter(g => g.type === filter);
    }

    // Sort chronologically
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  getGamesByDate(filter) {
    const games = this.getFilteredGames(filter);
    const groups = {};
    
    games.forEach(game => {
      const dateKey = this.formatMatchDate(game.date || game.local_date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(game);
    });

    return Object.entries(groups).map(([date, matches]) => ({ date, matches }));
  },

  // Resolve knockout team placeholders (e.g. Winner Group A) based on finished matches
  resolveKnockoutTeam(label, type) {
    if (!label) return { name: 'TBD', flag: '', isPlaceholder: true };
    
    // Check if label contains Match reference (e.g., "Winner Match 86")
    const matchRef = label.match(/Winner Match (\d+)/i);
    const loserRef = label.match(/Loser Match (\d+)/i);
    
    if (matchRef) {
      const prevMatchId = matchRef[1];
      const prevMatch = this.gameMap[prevMatchId];
      if (prevMatch && prevMatch.finished === 'TRUE') {
        const homeScore = parseInt(prevMatch.home_score || 0);
        const awayScore = parseInt(prevMatch.away_score || 0);
        
        // Check for penalty shootouts or extra time (if API has scorers or status)
        // If finished, home_score/away_score should reflect winner, or we can check finished status
        if (homeScore > awayScore) {
          return { name: prevMatch.home_team_name_en, flag: this.getTeamFlag(prevMatch.home_team_id), id: prevMatch.home_team_id };
        } else {
          return { name: prevMatch.away_team_name_en, flag: this.getTeamFlag(prevMatch.away_team_id), id: prevMatch.away_team_id };
        }
      }
      return { name: label, flag: '', isPlaceholder: true };
    }

    if (loserRef) {
      const prevMatchId = loserRef[1];
      const prevMatch = this.gameMap[prevMatchId];
      if (prevMatch && prevMatch.finished === 'TRUE') {
        const homeScore = parseInt(prevMatch.home_score || 0);
        const awayScore = parseInt(prevMatch.away_score || 0);
        if (homeScore < awayScore) {
          return { name: prevMatch.home_team_name_en, flag: this.getTeamFlag(prevMatch.home_team_id), id: prevMatch.home_team_id };
        } else {
          return { name: prevMatch.away_team_name_en, flag: this.getTeamFlag(prevMatch.away_team_id), id: prevMatch.away_team_id };
        }
      }
      return { name: label, flag: '', isPlaceholder: true };
    }

    // Check if label references Group Winner/Runner-up (e.g., "Winner Group A", "Runner-up Group B")
    const groupWinnerRef = label.match(/Winner Group ([A-L])/i);
    const groupRunnerRef = label.match(/Runner-up Group ([A-L])/i);
    
    if (groupWinnerRef) {
      const groupLetter = groupWinnerRef[1];
      const standings = this.getGroupStandings(groupLetter);
      if (standings.length > 0 && standings[0].mp >= 3) {
        // If group is finished (MP = 3)
        return { name: standings[0].name, flag: standings[0].flag, id: standings[0].team_id };
      }
      return { name: label, flag: '', isPlaceholder: true };
    }

    if (groupRunnerRef) {
      const groupLetter = groupRunnerRef[1];
      const standings = this.getGroupStandings(groupLetter);
      if (standings.length > 1 && standings[1].mp >= 3) {
        return { name: standings[1].name, flag: standings[1].flag, id: standings[1].team_id };
      }
      return { name: label, flag: '', isPlaceholder: true };
    }

    // If it's a team name already
    const team = this.teamByName[label.toLowerCase()] || this.teamMap[label];
    if (team) {
      return { name: team.name, flag: team.flag, id: team._id };
    }

    return { name: label, flag: '', isPlaceholder: true };
  },

  // Get full details of a match, resolving placeholders if it is a knockout match
  getMatchDetails(gameId) {
    const game = this.gameMap[gameId];
    if (!game) return null;

    let home = { name: game.home_team_name_en, flag: this.getTeamFlag(game.home_team_id), id: game.home_team_id };
    let away = { name: game.away_team_name_en, flag: this.getTeamFlag(game.away_team_id), id: game.away_team_id };

    if (game.type !== 'group') {
      if (!game.home_team_name_en || game.home_team_id === '0') {
        home = this.resolveKnockoutTeam(game.home_team_label, game.type);
      }
      if (!game.away_team_name_en || game.away_team_id === '0') {
        away = this.resolveKnockoutTeam(game.away_team_label, game.type);
      }
    }

    const stadium = this.stadiumMap[game.stadium_id];

    return {
      ...game,
      home,
      away,
      stadiumName: stadium ? stadium.name : 'Unknown Stadium',
      stadiumCity: stadium ? stadium.city : 'Unknown City'
    };
  },

  // Knockout Bracket Logic
  // Build a structured tree for the bracket visualization
  getBracketData() {
    // We want to group all knockout matches by round: r32, r16, qf, sf, final
    const rounds = {
      r32: this.games.filter(g => g.type === 'r32').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
      r16: this.games.filter(g => g.type === 'r16').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
      qf: this.games.filter(g => g.type === 'qf').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
      sf: this.games.filter(g => g.type === 'sf').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
      final: this.games.filter(g => g.type === 'final').sort((a,b) => parseInt(a.id) - parseInt(b.id)),
      third: this.games.filter(g => g.type === 'third').sort((a,b) => parseInt(a.id) - parseInt(b.id))
    };

    // For each round, resolve team placeholders
    const resolvedRounds = {};
    Object.entries(rounds).forEach(([roundKey, matches]) => {
      resolvedRounds[roundKey] = matches.map(m => this.getMatchDetails(m.id));
    });

    return resolvedRounds;
  }
};
