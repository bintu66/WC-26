import { dataStore } from '../services/dataStore';
import { renderTeamBadge } from './teamBadge';

export function renderMatchCard(match, options = {}) {
  const { onCardClick } = options;
  const game = dataStore.getMatchDetails(match.id);
  if (!game) return document.createElement('div');

  const card = document.createElement('div');
  card.className = 'glass-card match-card';

  const isLive = game.isLive;
  if (isLive) card.classList.add('live');

  // ── Header ────────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'match-header';

  const stageSpan = document.createElement('span');
  stageSpan.className = 'match-stage';
  if (game.type === 'group') {
    stageSpan.textContent = `Group ${game.group}`;
  } else {
    const stageNames = {
      r32: 'Round of 32', r16: 'Round of 16',
      qf: 'Quarter-finals', sf: 'Semi-finals',
      third: 'Third Place', final: 'Final'
    };
    stageSpan.textContent = stageNames[game.type] || game.type.toUpperCase();
  }

  const statusPill = document.createElement('span');
  statusPill.className = 'match-status-pill';

  let tickerInterval = null;
  if (isLive) {
    statusPill.classList.add('status-live');

    const getElapsedMinutes = () => {
      let elapsedNum = parseInt(game.time_elapsed);
      if (!isNaN(elapsedNum)) return elapsedNum;
      
      if (game.date) {
        const diffMs = Date.now() - new Date(game.date).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        return Math.max(1, Math.min(120, diffMins));
      }
      return 45;
    };

    const currentMin = getElapsedMinutes();
    statusPill.innerHTML = `<span class="live-dot"></span> LIVE <span class="live-min">${currentMin}'</span>`;

    tickerInterval = setInterval(() => {
      const minEl = statusPill.querySelector('.live-min');
      if (minEl) {
        minEl.textContent = `${getElapsedMinutes()}'`;
      }
    }, 10000);

    const observer = new MutationObserver(() => {
      if (!document.contains(card)) {
        clearInterval(tickerInterval);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else if (game.finished === 'TRUE') {
    statusPill.classList.add('status-ft');
    statusPill.textContent = 'Full Time';
  } else {
    statusPill.classList.add('status-scheduled');
    statusPill.textContent = dataStore.formatMatchTime(game.date || game.local_date);
  }

  header.appendChild(stageSpan);
  header.appendChild(statusPill);

  // ── Teams + Scores ────────────────────────────────────────────────────────
  const teamsContainer = document.createElement('div');
  teamsContainer.className = 'match-teams';

  const showScore = game.finished === 'TRUE' || isLive;
  const homeScoreVal = showScore && game.home_score !== 'null' ? game.home_score : '–';
  const awayScoreVal = showScore && game.away_score !== 'null' ? game.away_score : '–';

  const isHomeWinner = game.finished === 'TRUE' && parseInt(game.home_score) > parseInt(game.away_score);
  const isAwayWinner = game.finished === 'TRUE' && parseInt(game.away_score) > parseInt(game.home_score);

  const buildTeamRow = (teamObj, scoreVal, isWinner) => {
    const row = document.createElement('div');
    row.className = `team-row ${isWinner ? 'winner' : ''}`;
    const badge = renderTeamBadge(teamObj, { isPlaceholder: teamObj.isPlaceholder });
    const scoreSpan = document.createElement('span');
    scoreSpan.className = `team-score ${isLive ? 'score-live' : ''}`;
    scoreSpan.textContent = scoreVal;
    row.appendChild(badge);
    row.appendChild(scoreSpan);
    return row;
  };

  teamsContainer.appendChild(buildTeamRow(game.home, homeScoreVal, isHomeWinner));
  teamsContainer.appendChild(buildTeamRow(game.away, awayScoreVal, isAwayWinner));

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'match-footer';

  const venueSpan = document.createElement('span');
  venueSpan.className = 'match-venue';
  venueSpan.innerHTML = `📍 ${game.stadiumCity || 'TBD'}`;

  const dateSpan = document.createElement('span');
  dateSpan.className = 'match-date';
  dateSpan.textContent = dataStore.formatMatchDate(game.date || game.local_date);

  footer.appendChild(venueSpan);
  footer.appendChild(dateSpan);

  card.appendChild(header);
  card.appendChild(teamsContainer);
  card.appendChild(footer);

  if (onCardClick) {
    card.addEventListener('click', () => onCardClick(game));
    card.style.cursor = 'pointer';
  }

  return card;
}
