import './index.css';
import { dataStore } from './services/dataStore';
import { api } from './services/api';
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
    this.clockInterval = null;

    this.viewWrapper = document.createElement('div');
    this.viewWrapper.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;';

    // Swipe gesture navigation setup
    this.setupSwipeNavigation();

    window.appInstance = this;

    this.init();
  }

  setupSwipeNavigation() {
    this.pointerStartX = undefined;
    this.pointerStartY = undefined;

    this.viewWrapper.addEventListener('pointerdown', (e) => {
      // Don't trigger if swiping inside bracket-wrapper, group standings table, scrollable chips, or tabs
      const ignoreSelectors = ['.bracket-wrapper', '.filter-scroll-row', '.group-tabs', '.group-tab-pill', '.modal-tabs', '.modal-tab', '.modal-tab-content'];
      for (const selector of ignoreSelectors) {
        if (e.target.closest(selector)) return;
      }
      
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
    });

    this.viewWrapper.addEventListener('pointerup', (e) => {
      if (this.pointerStartX === undefined || this.pointerStartY === undefined) return;
      
      const touchEndX = e.clientX;
      const touchEndY = e.clientY;
      const diffX = touchEndX - this.pointerStartX;
      const diffY = touchEndY - this.pointerStartY;
      
      // Reset
      this.pointerStartX = undefined;
      this.pointerStartY = undefined;

      // Check for horizontal swipe (swipe length > 80px, vertical deviation < 65px)
      if (Math.abs(diffX) > 80 && Math.abs(diffY) < 65) {
        const tabsOrder = ['home', 'groups', 'fixtures', 'bracket'];
        const currentIndex = tabsOrder.indexOf(this.activeTab);
        
        if (diffX < 0) {
          // Swipe left -> Next tab
          if (currentIndex < tabsOrder.length - 1) {
            window.location.hash = tabsOrder[currentIndex + 1];
          }
        } else {
          // Swipe right -> Previous tab
          if (currentIndex > 0) {
            window.location.hash = tabsOrder[currentIndex - 1];
          }
        }
      }
    });

    this.viewWrapper.addEventListener('pointercancel', () => {
      this.pointerStartX = undefined;
      this.pointerStartY = undefined;
    });
  }

  async init() {
    await dataStore.init();

    // Remove splash
    const splash = document.querySelector('#splash-screen');
    if (splash) { splash.classList.add('fade-out'); setTimeout(() => splash.remove(), 500); }

    this.root.appendChild(this.viewWrapper);
    this.renderHeader();

    // Error / stale banner slot (between header and view)
    this.bannerSlot = document.createElement('div');
    this.root.insertBefore(this.bannerSlot, this.viewWrapper);
    this.updateBanner();

    // Bottom nav
    this.navContainer = document.createElement('div');
    this.root.appendChild(this.navContainer);
    this.updateBottomNav();

    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting();

    // Auto-refresh every 30s
    setInterval(() => this.refreshScores(), 30000);
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  renderHeader() {
    const header = document.createElement('header');
    header.className = 'app-header';

    const left = document.createElement('div');
    left.className = 'header-title-container';

    const title = document.createElement('h1');
    title.className = 'header-title';
    title.innerHTML = '⚽ WC 2026';

    const sub = document.createElement('span');
    sub.className = 'header-subtitle';
    sub.textContent = 'Live Tournament Tracker';

    left.appendChild(title);
    left.appendChild(sub);

    const right = document.createElement('div');
    right.className = 'header-right';

    // BST Clock
    this.clockEl = document.createElement('span');
    this.clockEl.className = 'header-clock';
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    right.appendChild(this.clockEl);

    // Live badge (shown only when live matches exist)
    this.liveBadge = document.createElement('div');
    this.liveBadge.className = 'live-badge';
    this.liveBadge.style.display = 'none';
    this.liveBadge.innerHTML = '<span class="live-dot"></span> LIVE';
    right.appendChild(this.liveBadge);

    header.appendChild(left);
    header.appendChild(right);
    this.root.insertBefore(header, this.viewWrapper);

    this.updateLiveBadge();
  }

  updateClock() {
    const now = new Date();
    this.clockEl.textContent = now.toLocaleTimeString('en-BD', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka'
    });
  }

  updateLiveBadge() {
    const hasLive = dataStore.games.some(g => dataStore.isMatchLive(g));
    this.liveBadge.style.display = hasLive ? 'flex' : 'none';
  }

  // ── Error / Stale Banner ────────────────────────────────────────────────────
  updateBanner() {
    this.bannerSlot.innerHTML = '';
    if (dataStore.hasError) {
      const b = document.createElement('div');
      b.className = 'error-banner';
      b.innerHTML = '<span style="font-size:20px">⚠️</span><div class="error-banner-text"><strong>Connection Failed</strong>Could not load match data. Tap to retry.</div>';
      b.addEventListener('click', () => this.refreshScores());
      this.bannerSlot.appendChild(b);
    } else if (dataStore.isStale) {
      const b = document.createElement('div');
      b.className = 'error-banner stale-banner';
      b.innerHTML = '<span style="font-size:20px">📡</span><div class="error-banner-text"><strong>Showing Cached Data</strong>Tap to refresh for latest scores.</div>';
      b.addEventListener('click', () => this.refreshScores());
      this.bannerSlot.appendChild(b);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  updateBottomNav() {
    this.navContainer.innerHTML = '';
    this.navContainer.appendChild(renderBottomNav(this.activeTab, (tabId) => { window.location.hash = tabId; }));
  }

  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const validTabs = ['home', 'groups', 'fixtures', 'bracket'];
    if (!validTabs.includes(hash)) { window.location.hash = 'home'; return; }

    if (this.currentViewInstance && this.currentViewInstance.destroy) this.currentViewInstance.destroy();

    this.activeTab = hash;
    this.updateBottomNav();

    const temp = document.createElement('div');
    temp.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
    temp.className = 'view-slide-enter';

    if (hash === 'home') {
      renderHomeView(temp, { onMatchClick: (m) => this.showMatchModal(m), onRefresh: () => this.refreshScores() });
    } else if (hash === 'groups') {
      this.currentViewInstance = renderGroupsView(temp, { onMatchClick: (m) => this.showMatchModal(m), onTeamClick: (id) => this.showTeamModal(id) });
    } else if (hash === 'fixtures') {
      this.currentViewInstance = renderFixturesView(temp, { onMatchClick: (m) => this.showMatchModal(m) });
    } else if (hash === 'bracket') {
      this.currentViewInstance = renderBracketView(temp, { onMatchClick: (m) => this.showMatchModal(m) });
    }

    this.viewWrapper.innerHTML = '';
    this.viewWrapper.appendChild(temp);
  }

  async refreshScores() {
    api.clearLiveCaches();
    await dataStore.init();
  }

  onDataUpdated() {
    this.updateBanner();
    this.updateLiveBadge();
    if (this.currentViewInstance && this.currentViewInstance.update) {
      this.currentViewInstance.update();
    }
  }

  // ── Modal Overlay System ────────────────────────────────────────────────────
  createModalOverlay() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;inset:0;background:rgba(5,8,24,0.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity 0.25s ease;';
    ov.addEventListener('click', (e) => { if (e.target === ov) this.closeModal(ov); });
    return ov;
  }

  closeModal(ov) { ov.style.opacity = '0'; setTimeout(() => ov.remove(), 250); }

  // ── Rich Match Modal with Tabs ──────────────────────────────────────────────
  showMatchModal(match) {
    const game = dataStore.getMatchDetails(match.id);
    if (!game) return;

    const ov = this.createModalOverlay();
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.cssText = 'width:100%;max-width:380px;max-height:85vh;overflow-y:auto;padding:20px 16px;border:1px solid rgba(255,255,255,0.08);box-shadow:var(--shadow-lg);transform:scale(0.92);transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);';

    // ─ Modal Header
    const mh = document.createElement('div');
    mh.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    const st = document.createElement('span');
    st.style.cssText = 'font-size:11px;font-weight:800;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.05em;';
    st.textContent = game.type === 'group' ? `Group ${game.group}` : ({r32:'Round of 32',r16:'Round of 16',qf:'Quarter-finals',sf:'Semi-finals',third:'3rd Place',final:'Final'}[game.type] || game.type);
    const cb = document.createElement('button');
    cb.textContent = '✕';
    cb.style.cssText = 'background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer;padding:4px;';
    cb.addEventListener('click', () => this.closeModal(ov));
    mh.appendChild(st);
    mh.appendChild(cb);
    card.appendChild(mh);

    // ─ Scoreboard
    const sb = document.createElement('div');
    sb.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';

    const makeBadge = (teamObj) => {
      const b = renderTeamBadge(teamObj, { isPlaceholder: teamObj.isPlaceholder, badgeClass:'modal-team-info', flagClass:'team-flag', textClass:'team-name' });
      b.style.cssText = 'flex-direction:column;gap:8px;align-items:center;width:90px;';
      const f = b.querySelector('.team-flag'); if (f) f.style.cssText = 'width:48px;height:33px;font-size:26px;border-radius:5px;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);';
      const n = b.querySelector('.team-name'); if (n) { n.style.cssText = 'font-size:12px;text-align:center;font-weight:600;'; }
      return b;
    };

    const sc = document.createElement('div');
    sc.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
    const sv = document.createElement('span');
    sv.style.cssText = 'font-family:var(--font-display);font-size:34px;font-weight:900;letter-spacing:0.04em;';
    const hs = game.home_score !== 'null' ? game.home_score : '–';
    const as = game.away_score !== 'null' ? game.away_score : '–';
    sv.textContent = `${hs} : ${as}`;

    const ti = document.createElement('span');
    ti.style.cssText = 'font-size:10px;font-weight:800;margin-top:6px;padding:3px 10px;border-radius:12px;display:flex;align-items:center;gap:4px;';
    if (game.isLive) {
      ti.style.background = 'rgba(255,82,82,0.12)';
      ti.style.color = 'var(--danger)';
      ti.innerHTML = `<span class="live-dot" style="width:6px;height:6px;border-radius:50%;background:var(--danger);animation:live-pulse 1.2s infinite;"></span> LIVE ${game.time_elapsed}'`;
    } else if (game.finished === 'TRUE') {
      ti.style.background = 'rgba(255,255,255,0.05)';
      ti.style.color = 'var(--text-secondary)';
      ti.textContent = 'FULL TIME';
    } else {
      ti.style.background = 'rgba(0,212,255,0.08)';
      ti.style.color = 'var(--accent-primary)';
      ti.textContent = 'UPCOMING';
    }
    sc.appendChild(sv);
    sc.appendChild(ti);

    sb.appendChild(makeBadge(game.home));
    sb.appendChild(sc);
    sb.appendChild(makeBadge(game.away));
    card.appendChild(sb);

    // ─ Tabs
    const tabs = document.createElement('div');
    tabs.className = 'modal-tabs';
    const tabDefs = [{ id:'overview', label:'Overview' }, { id:'info', label:'Match Info' }];
    // Only show timeline tab for finished/live
    if (game.finished === 'TRUE' || game.isLive) tabDefs.push({ id:'timeline', label:'Events' });

    const tabContents = {};
    let activeTab = 'overview';

    const setTab = (tabId) => {
      activeTab = tabId;
      tabs.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
      Object.entries(tabContents).forEach(([id, el]) => el.classList.toggle('active', id === tabId));
    };

    tabDefs.forEach(td => {
      const t = document.createElement('div');
      t.className = `modal-tab ${td.id === activeTab ? 'active' : ''}`;
      t.dataset.tab = td.id;
      t.textContent = td.label;
      t.addEventListener('click', () => setTab(td.id));
      tabs.appendChild(t);
    });
    card.appendChild(tabs);

    // ── Overview Tab ─────────────────────────────────────────────
    const overviewContent = document.createElement('div');
    overviewContent.className = 'modal-tab-content active';

    // Scorers
    const parseScorersList = (str) => (!str || str === 'null') ? [] : str.split(',').map(s => s.trim()).filter(Boolean);
    const homeScorers = parseScorersList(game.home_scorers);
    const awayScorers = parseScorersList(game.away_scorers);

    if (homeScorers.length > 0 || awayScorers.length > 0) {
      const box = document.createElement('div');
      box.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:12px;font-size:12px;margin-bottom:16px;display:flex;justify-content:space-between;gap:12px;';
      const hc = document.createElement('div'); hc.style.cssText = 'flex:1;color:var(--text-secondary);';
      homeScorers.forEach(s => { const d = document.createElement('div'); d.innerHTML = `⚽ ${s}`; d.style.marginBottom = '3px'; hc.appendChild(d); });
      const ac = document.createElement('div'); ac.style.cssText = 'flex:1;text-align:right;color:var(--text-secondary);';
      awayScorers.forEach(s => { const d = document.createElement('div'); d.innerHTML = `${s} ⚽`; d.style.marginBottom = '3px'; ac.appendChild(d); });
      box.appendChild(hc); box.appendChild(ac);
      overviewContent.appendChild(box);
    }

    // Quick stats row
    const qr = document.createElement('div');
    qr.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;';
    const statItems = [
      { label: 'Match #', val: game.id || '–' },
      { label: 'Stage', val: game.type === 'group' ? `Group ${game.group}` : game.type?.toUpperCase() || '–' },
      { label: 'Status', val: game.isLive ? 'Live' : game.finished === 'TRUE' ? 'Finished' : 'Scheduled' },
    ];
    statItems.forEach(si => {
      const d = document.createElement('div');
      d.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);border-radius:10px;padding:8px 6px;text-align:center;';
      d.innerHTML = `<div style="font-family:var(--font-display);font-size:14px;font-weight:800;color:var(--accent-primary);">${si.val}</div><div style="font-size:9px;color:var(--text-muted);margin-top:2px;text-transform:uppercase;font-weight:600;">${si.label}</div>`;
      qr.appendChild(d);
    });
    overviewContent.appendChild(qr);
    tabContents.overview = overviewContent;
    card.appendChild(overviewContent);

    // ── Info Tab ─────────────────────────────────────────────────
    const infoContent = document.createElement('div');
    infoContent.className = 'modal-tab-content';
    const infoRows = [
      { icon: '🗓️', label: 'Date & Time', val: dataStore.formatMatchDateTime(game.date || game.local_date) },
      { icon: '🏟️', label: 'Stadium', val: game.stadiumName || 'TBD' },
      { icon: '📍', label: 'City', val: game.stadiumCity || 'TBD' },
    ];
    if (game.stadiumCapacity) infoRows.push({ icon: '👥', label: 'Capacity', val: Number(game.stadiumCapacity).toLocaleString() });
    if (game.referee) infoRows.push({ icon: '🧑‍⚖️', label: 'Referee', val: game.referee });
    if (game.attendance) infoRows.push({ icon: '🎟️', label: 'Attendance', val: Number(game.attendance).toLocaleString() });

    infoRows.forEach(r => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:12px;';
      row.innerHTML = `<span style="font-size:16px;">${r.icon}</span><div style="flex:1;"><div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;margin-bottom:1px;">${r.label}</div><div style="color:var(--text-primary);font-weight:600;">${r.val}</div></div>`;
      infoContent.appendChild(row);
    });
    tabContents.info = infoContent;
    card.appendChild(infoContent);

    // ── Events Tab ──────────────────────────────────────────────
    if (game.finished === 'TRUE' || game.isLive) {
      const evContent = document.createElement('div');
      evContent.className = 'modal-tab-content';

      // Build a simple timeline from scorers
      const allEvents = [];
      homeScorers.forEach(s => allEvents.push({ team: 'home', text: s, icon: '⚽', name: game.home.name }));
      awayScorers.forEach(s => allEvents.push({ team: 'away', text: s, icon: '⚽', name: game.away.name }));

      if (allEvents.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:20px;color:var(--text-muted);font-size:12px;';
        empty.textContent = 'No events recorded yet.';
        evContent.appendChild(empty);
      } else {
        allEvents.forEach(ev => {
          const row = document.createElement('div');
          row.style.cssText = `display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:12px;${ev.team === 'away' ? 'flex-direction:row-reverse;text-align:right;' : ''}`;
          row.innerHTML = `<span style="font-size:16px;">${ev.icon}</span><div><div style="font-weight:700;color:var(--text-primary);">${ev.text}</div><div style="font-size:10px;color:var(--text-muted);">${ev.name}</div></div>`;
          evContent.appendChild(row);
        });
      }
      tabContents.timeline = evContent;
      card.appendChild(evContent);
    }

    ov.appendChild(card);
    this.root.appendChild(ov);
    setTimeout(() => { ov.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 50);
  }

  // ── Team Modal ──────────────────────────────────────────────────────────────
  showTeamModal(teamId) {
    const team = dataStore.teamMap[teamId];
    if (!team) return;

    const teamGames = dataStore.games.filter(g => g.home_team_id === teamId || g.away_team_id === teamId || g.home_team_name_en === team.name || g.away_team_name_en === team.name);
    const ov = this.createModalOverlay();

    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.cssText = 'width:100%;max-width:380px;max-height:85vh;overflow-y:auto;padding:20px 16px;border:1px solid rgba(255,255,255,0.08);box-shadow:var(--shadow-lg);transform:scale(0.92);transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);';

    // Header
    const mh = document.createElement('div');
    mh.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';
    const tt = renderTeamBadge(team, { badgeClass:'modal-team-title', textClass:'team-name' });
    tt.style.cssText = 'display:flex;align-items:center;gap:12px;';
    const ttf = tt.querySelector('.team-flag'); if (ttf) ttf.style.cssText = 'width:32px;height:22px;font-size:18px;';
    const ttn = tt.querySelector('.team-name'); if (ttn) ttn.style.cssText = 'font-family:var(--font-display);font-size:18px;font-weight:800;';
    const cb = document.createElement('button');
    cb.textContent = '✕';
    cb.style.cssText = 'background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer;';
    cb.addEventListener('click', () => this.closeModal(ov));
    mh.appendChild(tt); mh.appendChild(cb);
    card.appendChild(mh);

    const sh = document.createElement('h4');
    sh.textContent = 'Schedule & Results';
    sh.style.cssText = 'font-family:var(--font-display);font-size:12px;font-weight:800;color:var(--accent-primary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;';
    card.appendChild(sh);

    const gl = document.createElement('div');
    gl.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    if (teamGames.length === 0) {
      const e = document.createElement('div');
      e.style.cssText = 'color:var(--text-muted);font-size:12px;';
      e.textContent = 'No matches scheduled yet.';
      gl.appendChild(e);
    } else {
      teamGames.forEach(g => {
        const item = document.createElement('div');
        item.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;';
        const left = document.createElement('div');
        left.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
        const stage = document.createElement('span');
        stage.style.cssText = 'font-size:9px;color:var(--text-muted);text-transform:uppercase;font-weight:700;';
        stage.textContent = g.type === 'group' ? `Group ${g.group}` : (g.type || '').toUpperCase();
        const opName = g.home_team_name_en === team.name ? g.away_team_name_en : g.home_team_name_en;
        const opObj = dataStore.teamByName[(opName || '').toLowerCase()] || { name: opName };
        const opBadge = renderTeamBadge(opObj, { badgeClass:'opponent-badge', flagClass:'team-flag', textClass:'team-name' });
        opBadge.style.cssText = 'display:flex;align-items:center;gap:6px;';
        const of = opBadge.querySelector('.team-flag'); if (of) of.style.cssText = 'width:18px;height:12px;font-size:10px;';
        const on = opBadge.querySelector('.team-name'); if (on) on.style.cssText = 'font-weight:600;font-size:12px;';
        left.appendChild(stage); left.appendChild(opBadge);
        const right = document.createElement('div');
        const score = document.createElement('span');
        score.style.cssText = 'font-family:var(--font-display);font-weight:700;';
        if (g.finished === 'TRUE') {
          score.textContent = `${g.home_score} – ${g.away_score}`;
          score.style.color = 'var(--text-primary)';
        } else {
          score.textContent = dataStore.formatMatchTime(g.date || g.local_date);
          score.style.color = 'var(--accent-primary)';
        }
        right.appendChild(score);
        item.appendChild(left); item.appendChild(right);
        gl.appendChild(item);
      });
    }

    card.appendChild(gl);
    ov.appendChild(card);
    this.root.appendChild(ov);
    setTimeout(() => { ov.style.opacity = '1'; card.style.transform = 'scale(1)'; }, 50);
  }
}

document.addEventListener('DOMContentLoaded', () => { new App(); });
