import './index.css';
import { dataStore } from './services/dataStore';
import { renderBottomNav } from './components/bottomNav';
import { renderHomeView } from './views/home';
import { renderGroupsView } from './views/groups';
import { renderFixturesView } from './views/fixtures';
import { renderBracketView } from './views/bracket';
import { renderTeamBadge } from './components/teamBadge';

class App {
  constructor() {
    this.root = document.querySelector('#app');
    this.activeTab = 'home';
    this.currentViewInstance = null;
    
    // Create view wrapper
    this.viewWrapper = document.createElement('div');
    this.viewWrapper.style.flex = '1';
    this.viewWrapper.style.display = 'flex';
    this.viewWrapper.style.flexDirection = 'column';
    this.viewWrapper.style.overflow = 'hidden';
    this.viewWrapper.style.position = 'relative';

    this.init();
  }

  async init() {
    // 1. Initialise Data Store
    await dataStore.init();

    // 2. Clear loader & setup app shell
    const splash = document.querySelector('#splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 500);
    }

    // Body container
    this.root.appendChild(this.viewWrapper);

    // Header
    this.renderHeader();

    // Bottom Navigation
    this.navContainer = document.createElement('div');
    this.root.appendChild(this.navContainer);
    this.updateBottomNav();

    // 3. Setup router
    window.addEventListener('hashchange', () => this.handleRouting());
    
    // Initial route
    this.handleRouting();

    // Auto update live scores every 30 seconds
    setInterval(() => this.refreshScores(), 30000);
  }

  renderHeader() {
    const header = document.createElement('header');
    header.className = 'app-header';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'header-title-container';

    const title = document.createElement('h1');
    title.className = 'header-title';
    title.innerHTML = '⚽ WC 2026';

    const subtitle = document.createElement('span');
    subtitle.className = 'header-subtitle';
    subtitle.textContent = 'Interactive Tournament Hub';

    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);
    header.appendChild(titleContainer);

    // Dynamic Live indicator or current date
    const liveIndicator = document.createElement('div');
    liveIndicator.style.display = 'flex';
    liveIndicator.style.alignItems = 'center';
    liveIndicator.style.gap = '6px';
    liveIndicator.style.fontSize = '12px';
    liveIndicator.style.fontWeight = '700';
    liveIndicator.style.color = 'var(--accent-primary)';
    
    const dot = document.createElement('span');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.background = 'var(--accent-primary)';
    dot.style.boxShadow = '0 0 8px var(--accent-primary)';
    liveIndicator.appendChild(dot);
    
    const text = document.createElement('span');
    text.textContent = 'ONLINE';
    liveIndicator.appendChild(text);

    header.appendChild(liveIndicator);
    this.root.insertBefore(header, this.viewWrapper);
  }

  updateBottomNav() {
    this.navContainer.innerHTML = '';
    const nav = renderBottomNav(this.activeTab, (tabId) => {
      window.location.hash = tabId;
    });
    this.navContainer.appendChild(nav);
  }

  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const validTabs = ['home', 'groups', 'fixtures', 'bracket'];
    
    if (!validTabs.includes(hash)) {
      window.location.hash = 'home';
      return;
    }

    if (this.currentViewInstance && this.currentViewInstance.destroy) {
      this.currentViewInstance.destroy();
    }

    this.activeTab = hash;
    this.updateBottomNav();

    // Dynamic View Mount with Slide Animation
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '100%';
    tempContainer.style.height = '100%';
    tempContainer.style.display = 'flex';
    tempContainer.style.flexDirection = 'column';
    tempContainer.className = 'view-slide-enter';

    if (hash === 'home') {
      renderHomeView(tempContainer, {
        onMatchClick: (match) => this.showMatchModal(match),
        onRefresh: () => this.refreshScores()
      });
    } else if (hash === 'groups') {
      this.currentViewInstance = renderGroupsView(tempContainer, {
        onMatchClick: (match) => this.showMatchModal(match),
        onTeamClick: (teamId) => this.showTeamModal(teamId)
      });
    } else if (hash === 'fixtures') {
      this.currentViewInstance = renderFixturesView(tempContainer, {
        onMatchClick: (match) => this.showMatchModal(match)
      });
    } else if (hash === 'bracket') {
      this.currentViewInstance = renderBracketView(tempContainer, {
        onMatchClick: (match) => this.showMatchModal(match)
      });
    }

    // Replace child view cleanly
    this.viewWrapper.innerHTML = '';
    this.viewWrapper.appendChild(tempContainer);
  }

  async refreshScores() {
    console.log('Refreshing live scores...');
    // Clear dynamic API caches so it fetches fresh data
    const keys = ['groups', 'games'];
    keys.forEach(k => localStorage.removeItem('wc26_cache_' + k));
    
    await dataStore.init();
    
    if (this.currentViewInstance && this.currentViewInstance.update) {
      this.currentViewInstance.update();
    }
  }

  // Modals Overlay System
  createModalOverlay() {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(5, 8, 24, 0.85)';
    overlay.style.backdropFilter = 'blur(12px)';
    overlay.style.webkitBackdropFilter = 'blur(12px)';
    overlay.style.zIndex = '999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '20px';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease';
    
    // Tap to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal(overlay);
    });

    return overlay;
  }

  closeModal(overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 250);
  }

  showMatchModal(match) {
    const game = dataStore.getMatchDetails(match.id);
    if (!game) return;

    const overlay = this.createModalOverlay();
    
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.width = '100%';
    card.style.maxWidth = '360px';
    card.style.padding = '24px 20px';
    card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    card.style.boxShadow = 'var(--shadow-lg)';
    card.style.transform = 'scale(0.9)';
    card.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Stage Name / Header
    const modalHeader = document.createElement('div');
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';
    modalHeader.style.marginBottom = '20px';

    const stageTitle = document.createElement('span');
    stageTitle.style.fontSize = '12px';
    stageTitle.style.fontWeight = '700';
    stageTitle.style.color = 'var(--accent-primary)';
    stageTitle.style.textTransform = 'uppercase';
    stageTitle.textContent = game.type === 'group' ? `Group ${game.group}` : game.type.toUpperCase();
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-secondary)';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => this.closeModal(overlay));

    modalHeader.appendChild(stageTitle);
    modalHeader.appendChild(closeBtn);
    card.appendChild(modalHeader);

    // Scoreboard
    const scoreboard = document.createElement('div');
    scoreboard.style.display = 'flex';
    scoreboard.style.justifyContent = 'space-between';
    scoreboard.style.alignItems = 'center';
    scoreboard.style.marginBottom = '24px';

    const homeBadge = renderTeamBadge(game.home, { 
      isPlaceholder: game.home.isPlaceholder,
      badgeClass: 'modal-team-info',
      flagClass: 'team-flag',
      textClass: 'team-name'
    });
    homeBadge.style.flexDirection = 'column';
    homeBadge.style.gap = '8px';
    homeBadge.style.alignItems = 'center';
    homeBadge.querySelector('.team-flag').style.width = '48px';
    homeBadge.querySelector('.team-flag').style.height = '32px';
    homeBadge.querySelector('.team-flag').style.fontSize = '24px';
    homeBadge.querySelector('.team-name').style.fontSize = '13px';
    homeBadge.querySelector('.team-name').style.textAlign = 'center';

    const scoreContainer = document.createElement('div');
    scoreContainer.style.display = 'flex';
    scoreContainer.style.flexDirection = 'column';
    scoreContainer.style.alignItems = 'center';
    
    const scoreVal = document.createElement('span');
    scoreVal.style.fontFamily = 'var(--font-display)';
    scoreVal.style.fontSize = '32px';
    scoreVal.style.fontWeight = '900';
    
    const homeScore = game.home_score !== 'null' ? game.home_score : '-';
    const awayScore = game.away_score !== 'null' ? game.away_score : '-';
    scoreVal.textContent = `${homeScore} : ${awayScore}`;

    const timeIndicator = document.createElement('span');
    timeIndicator.style.fontSize = '10px';
    timeIndicator.style.fontWeight = '700';
    timeIndicator.style.marginTop = '4px';
    timeIndicator.style.padding = '2px 8px';
    timeIndicator.style.borderRadius = '10px';
    
    if (game.time_elapsed && game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'FT' && game.finished !== 'TRUE') {
      timeIndicator.style.background = 'rgba(255, 82, 82, 0.15)';
      timeIndicator.style.color = 'var(--danger)';
      timeIndicator.textContent = `LIVE ${game.time_elapsed}'`;
    } else if (game.finished === 'TRUE') {
      timeIndicator.style.background = 'rgba(255, 255, 255, 0.06)';
      timeIndicator.style.color = 'var(--text-secondary)';
      timeIndicator.textContent = 'FINISHED';
    } else {
      timeIndicator.style.background = 'rgba(0, 212, 255, 0.1)';
      timeIndicator.style.color = 'var(--accent-primary)';
      timeIndicator.textContent = 'SCHEDULED';
    }

    scoreContainer.appendChild(scoreVal);
    scoreContainer.appendChild(timeIndicator);

    const awayBadge = renderTeamBadge(game.away, { 
      isPlaceholder: game.away.isPlaceholder,
      badgeClass: 'modal-team-info',
      flagClass: 'team-flag',
      textClass: 'team-name'
    });
    awayBadge.style.flexDirection = 'column';
    awayBadge.style.gap = '8px';
    awayBadge.style.alignItems = 'center';
    awayBadge.querySelector('.team-flag').style.width = '48px';
    awayBadge.querySelector('.team-flag').style.height = '32px';
    awayBadge.querySelector('.team-flag').style.fontSize = '24px';
    awayBadge.querySelector('.team-name').style.fontSize = '13px';
    awayBadge.querySelector('.team-name').style.textAlign = 'center';

    scoreboard.appendChild(homeBadge);
    scoreboard.appendChild(scoreContainer);
    scoreboard.appendChild(awayBadge);
    card.appendChild(scoreboard);

    // Scorers Section
    const formatScorersList = (scorersStr) => {
      if (!scorersStr || scorersStr === 'null') return [];
      // split comma separated list and clean
      return scorersStr.split(',').map(s => s.trim()).filter(s => s !== '');
    };

    const homeScorers = formatScorersList(game.home_scorers);
    const awayScorers = formatScorersList(game.away_scorers);

    if (homeScorers.length > 0 || awayScorers.length > 0) {
      const scorersBox = document.createElement('div');
      scorersBox.style.background = 'rgba(255, 255, 255, 0.02)';
      scorersBox.style.border = '1px solid rgba(255, 255, 255, 0.04)';
      scorersBox.style.borderRadius = '12px';
      scorersBox.style.padding = '12px';
      scorersBox.style.fontSize = '12px';
      scorersBox.style.marginBottom = '20px';
      scorersBox.style.display = 'flex';
      scorersBox.style.justifyContent = 'space-between';
      scorersBox.style.gap = '16px';

      const homeScorersCol = document.createElement('div');
      homeScorersCol.style.flex = '1';
      homeScorersCol.style.color = 'var(--text-secondary)';
      homeScorers.forEach(s => {
        const item = document.createElement('div');
        item.innerHTML = `⚽ ${s}`;
        homeScorersCol.appendChild(item);
      });

      const awayScorersCol = document.createElement('div');
      awayScorersCol.style.flex = '1';
      awayScorersCol.style.textAlign = 'right';
      awayScorersCol.style.color = 'var(--text-secondary)';
      awayScorers.forEach(s => {
        const item = document.createElement('div');
        item.innerHTML = `${s} ⚽`;
        awayScorersCol.appendChild(item);
      });

      scorersBox.appendChild(homeScorersCol);
      scorersBox.appendChild(awayScorersCol);
      card.appendChild(scorersBox);
    }

    // Match Details Info Box
    const infoBox = document.createElement('div');
    infoBox.style.display = 'flex';
    infoBox.style.flexDirection = 'column';
    infoBox.style.gap = '8px';
    infoBox.style.fontSize = '11px';
    infoBox.style.color = 'var(--text-secondary)';
    infoBox.style.borderTop = '1px solid rgba(255,255,255,0.05)';
    infoBox.style.paddingTop = '16px';

    const timeRow = document.createElement('div');
    timeRow.innerHTML = `🗓️ <b>Date:</b> ${dataStore.formatMatchDate(game.date || game.local_date)} @ ${dataStore.formatMatchTime(game.date || game.local_date)}`;
    
    const venueRow = document.createElement('div');
    venueRow.innerHTML = `🏟️ <b>Stadium:</b> ${game.stadiumName}, ${game.stadiumCity}`;

    infoBox.appendChild(timeRow);
    infoBox.appendChild(venueRow);
    card.appendChild(infoBox);

    overlay.appendChild(card);
    this.root.appendChild(overlay);

    // Animate open
    setTimeout(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    }, 50);
  }

  showTeamModal(teamId) {
    const team = dataStore.teamMap[teamId];
    if (!team) return;

    // Filter games of this team
    const teamGames = dataStore.games.filter(g => g.home_team_id === teamId || g.away_team_id === teamId || g.home_team_name_en === team.name || g.away_team_name_en === team.name);

    const overlay = this.createModalOverlay();
    
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.width = '100%';
    card.style.maxWidth = '380px';
    card.style.maxHeight = '90vh';
    card.style.overflowY = 'auto';
    card.style.padding = '24px 20px';
    card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    card.style.boxShadow = 'var(--shadow-lg)';
    card.style.transform = 'scale(0.9)';
    card.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Modal Header
    const modalHeader = document.createElement('div');
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.alignItems = 'center';
    modalHeader.style.marginBottom = '20px';

    const teamTitle = renderTeamBadge(team, {
      badgeClass: 'modal-team-title',
      textClass: 'team-name'
    });
    teamTitle.style.display = 'flex';
    teamTitle.style.alignItems = 'center';
    teamTitle.style.gap = '12px';
    teamTitle.querySelector('.team-flag').style.width = '32px';
    teamTitle.querySelector('.team-flag').style.height = '22px';
    teamTitle.querySelector('.team-flag').style.fontSize = '18px';
    teamTitle.querySelector('.team-name').style.fontFamily = 'var(--font-display)';
    teamTitle.querySelector('.team-name').style.fontSize = '18px';
    teamTitle.querySelector('.team-name').style.fontWeight = '800';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-secondary)';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => this.closeModal(overlay));

    modalHeader.appendChild(teamTitle);
    modalHeader.appendChild(closeBtn);
    card.appendChild(modalHeader);

    // Team Stats header
    const statsHeader = document.createElement('h4');
    statsHeader.textContent = 'Team Schedule & Results';
    statsHeader.style.fontFamily = 'var(--font-display)';
    statsHeader.style.fontSize = '13px';
    statsHeader.style.fontWeight = '800';
    statsHeader.style.color = 'var(--accent-primary)';
    statsHeader.style.textTransform = 'uppercase';
    statsHeader.style.letterSpacing = '0.05em';
    statsHeader.style.marginBottom = '12px';
    card.appendChild(statsHeader);

    // List games
    const gamesList = document.createElement('div');
    gamesList.style.display = 'flex';
    gamesList.style.flexDirection = 'column';
    gamesList.style.gap = '10px';

    if (teamGames.length === 0) {
      const empty = document.createElement('div');
      empty.style.color = 'var(--text-secondary)';
      empty.style.fontSize = '12px';
      empty.textContent = 'No matches scheduled yet.';
      gamesList.appendChild(empty);
    } else {
      teamGames.forEach(g => {
        const item = document.createElement('div');
        item.style.background = 'rgba(255, 255, 255, 0.01)';
        item.style.border = '1px solid rgba(255, 255, 255, 0.03)';
        item.style.borderRadius = '10px';
        item.style.padding = '8px 12px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.fontSize = '12px';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.gap = '2px';

        const stage = document.createElement('span');
        stage.style.fontSize = '10px';
        stage.style.color = 'var(--text-secondary)';
        stage.textContent = g.type === 'group' ? `Group ${g.group}` : g.type.toUpperCase();

        const opponentName = g.home_team_name_en === team.name ? g.away_team_name_en : g.home_team_name_en;
        const opponentObj = dataStore.teamByName[opponentName.toLowerCase()] || { name: opponentName };
        const opponentBadge = renderTeamBadge(opponentObj, { 
          badgeClass: 'opponent-badge', 
          flagClass: 'team-flag',
          textClass: 'team-name' 
        });
        opponentBadge.style.display = 'flex';
        opponentBadge.style.alignItems = 'center';
        opponentBadge.style.gap = '6px';
        opponentBadge.querySelector('.team-flag').style.width = '18px';
        opponentBadge.querySelector('.team-flag').style.height = '12px';
        opponentBadge.querySelector('.team-name').style.fontWeight = '600';
        opponentBadge.querySelector('.team-name').style.fontSize = '12px';

        left.appendChild(stage);
        left.appendChild(opponentBadge);

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';

        const score = document.createElement('span');
        score.style.fontFamily = 'var(--font-display)';
        score.style.fontWeight = '700';
        
        if (g.finished === 'TRUE') {
          score.textContent = `${g.home_score} - ${g.away_score}`;
          score.style.color = 'var(--text-primary)';
        } else {
          score.textContent = dataStore.formatMatchTime(g.date || g.local_date);
          score.style.color = 'var(--accent-primary)';
        }

        right.appendChild(score);
        item.appendChild(left);
        item.appendChild(right);
        gamesList.appendChild(item);
      });
    }

    card.appendChild(gamesList);
    overlay.appendChild(card);
    this.root.appendChild(overlay);

    // Animate open
    setTimeout(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    }, 50);
  }
}

// Initialise App
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
