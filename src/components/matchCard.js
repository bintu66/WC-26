import { dataStore } from '../services/dataStore';
import { renderTeamBadge } from './teamBadge';

export function renderMatchCard(match, options = {}) {
  const { onCardClick } = options;
  const game = dataStore.getMatchDetails(match.id);
  if (!game) return document.createElement('div');

  const card = document.createElement('div');
  card.className = 'glass-card match-card';
  
  const isLive = game.time_elapsed && game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'FT' && game.finished !== 'TRUE';
  if (isLive) {
    card.classList.add('live');
  }

  // Header
  const header = document.createElement('div');
  header.className = 'match-header';
  
  const stageSpan = document.createElement('span');
  if (game.type === 'group') {
    stageSpan.textContent = `Group ${game.group}`;
  } else {
    const stageNames = {
      r32: 'Round of 32',
      r16: 'Round of 16',
      qf: 'Quarter-finals',
      sf: 'Semi-finals',
      third: 'Third Place Match',
      final: 'Final'
    };
    stageSpan.textContent = stageNames[game.type] || game.type.toUpperCase();
  }

  const statusPill = document.createElement('span');
  statusPill.className = 'match-status-pill';
  
  if (isLive) {
    statusPill.classList.add('status-live');
    statusPill.textContent = `Live ${game.time_elapsed}'`;
  } else if (game.finished === 'TRUE') {
    statusPill.classList.add('status-ft');
    statusPill.textContent = 'FT';
  } else {
    statusPill.classList.add('status-scheduled');
    statusPill.textContent = dataStore.formatMatchTime(game.date || game.local_date);
  }

  header.appendChild(stageSpan);
  header.appendChild(statusPill);

  // Teams
  const teamsContainer = document.createElement('div');
  teamsContainer.className = 'match-teams';

  const homeScoreVal = game.home_score !== 'null' && game.finished === 'TRUE' || isLive ? game.home_score : '-';
  const awayScoreVal = game.away_score !== 'null' && game.finished === 'TRUE' || isLive ? game.away_score : '-';

  const isHomeWinner = game.finished === 'TRUE' && parseInt(game.home_score) > parseInt(game.away_score);
  const isAwayWinner = game.finished === 'TRUE' && parseInt(game.away_score) > parseInt(game.home_score);

  // Home Team Row
  const homeRow = document.createElement('div');
  homeRow.className = `team-row ${isHomeWinner ? 'winner' : ''}`;
  const homeBadge = renderTeamBadge(game.home, { isPlaceholder: game.home.isPlaceholder });
  const homeScoreSpan = document.createElement('span');
  homeScoreSpan.className = 'team-score';
  homeScoreSpan.textContent = homeScoreVal;
  homeRow.appendChild(homeBadge);
  homeRow.appendChild(homeScoreSpan);

  // Away Team Row
  const awayRow = document.createElement('div');
  awayRow.className = `team-row ${isAwayWinner ? 'winner' : ''}`;
  const awayBadge = renderTeamBadge(game.away, { isPlaceholder: game.away.isPlaceholder });
  const awayScoreSpan = document.createElement('span');
  awayScoreSpan.className = 'team-score';
  awayScoreSpan.textContent = awayScoreVal;
  awayRow.appendChild(awayBadge);
  awayRow.appendChild(awayScoreSpan);

  teamsContainer.appendChild(homeRow);
  teamsContainer.appendChild(awayRow);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'match-footer';
  
  const venueSpan = document.createElement('span');
  venueSpan.textContent = `${game.stadiumCity || 'TBD'}`;
  
  const dateSpan = document.createElement('span');
  dateSpan.textContent = dataStore.formatMatchDate(game.date || game.local_date);

  footer.appendChild(venueSpan);
  footer.appendChild(dateSpan);

  card.appendChild(header);
  card.appendChild(teamsContainer);
  card.appendChild(footer);

  if (onCardClick) {
    card.addEventListener('click', () => onCardClick(game));
  }

  return card;
}
