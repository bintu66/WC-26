import { dataStore } from '../services/dataStore';
import { renderMatchCard } from '../components/matchCard';
import { renderSkeletonsList } from '../components/skeleton';

export function renderHomeView(container, options = {}) {
  container.innerHTML = '';
  
  const view = document.createElement('div');
  view.className = 'view-container';

  // Pull to refresh spinner container
  const pullSpinner = document.createElement('div');
  pullSpinner.className = 'pull-refresh-spinner';
  pullSpinner.innerHTML = '<span class="spinner-icon">🔄</span>';
  view.appendChild(pullSpinner);

  // Hero Dashboard Stats Header
  const heroSection = document.createElement('div');
  heroSection.className = 'glass-card';
  heroSection.style.background = 'linear-gradient(135deg, rgba(19, 24, 66, 0.8) 0%, rgba(10, 14, 39, 0.9) 100%)';
  heroSection.style.border = '1px solid rgba(0, 212, 255, 0.15)';
  heroSection.style.padding = '24px 20px';
  heroSection.style.textAlign = 'center';
  heroSection.style.position = 'relative';
  heroSection.style.overflow = 'hidden';

  // Stylized background glow
  const glow = document.createElement('div');
  glow.style.position = 'absolute';
  glow.style.width = '150px';
  glow.style.height = '150px';
  glow.style.background = 'rgba(0, 212, 255, 0.15)';
  glow.style.filter = 'blur(40px)';
  glow.style.top = '-50px';
  glow.style.left = '50%';
  glow.style.transform = 'translateX(-50%)';
  glow.style.borderRadius = '50%';
  glow.style.pointerEvents = 'none';
  heroSection.appendChild(glow);

  const heroTitle = document.createElement('h2');
  heroTitle.textContent = 'FIFA World Cup 2026';
  heroTitle.style.fontFamily = 'var(--font-display)';
  heroTitle.style.fontSize = '22px';
  heroTitle.style.fontWeight = '900';
  heroTitle.style.letterSpacing = '0.05em';
  heroTitle.style.marginBottom = '6px';
  heroSection.appendChild(heroTitle);

  const heroSubtitle = document.createElement('p');
  heroSubtitle.textContent = 'North America (US • Canada • Mexico)';
  heroSubtitle.style.fontSize = '12px';
  heroSubtitle.style.color = 'var(--text-secondary)';
  heroSubtitle.style.marginBottom = '20px';
  heroSection.appendChild(heroSubtitle);

  // Stats Grid
  const statsGrid = document.createElement('div');
  statsGrid.style.display = 'grid';
  statsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  statsGrid.style.gap = '12px';
  statsGrid.style.marginTop = '16px';

  // Calculate stats from dataStore
  const totalMatches = dataStore.games.length;
  const completedMatches = dataStore.games.filter(g => g.finished === 'TRUE').length;
  const totalGoals = dataStore.games.reduce((sum, g) => {
    const home = parseInt(g.home_score);
    const away = parseInt(g.away_score);
    return sum + (isNaN(home) ? 0 : home) + (isNaN(away) ? 0 : away);
  }, 0);

  const stats = [
    { label: 'Completed', val: `${completedMatches}/${totalMatches}` },
    { label: 'Total Goals', val: totalGoals },
    { label: 'Teams Left', val: 48 - Math.floor(completedMatches / 2) } // approximation or simple calculation
  ];

  stats.forEach(stat => {
    const col = document.createElement('div');
    col.style.background = 'rgba(255, 255, 255, 0.02)';
    col.style.border = '1px solid rgba(255, 255, 255, 0.04)';
    col.style.borderRadius = '12px';
    col.style.padding = '10px 4px';
    
    const valSpan = document.createElement('div');
    valSpan.textContent = stat.val;
    valSpan.style.fontFamily = 'var(--font-display)';
    valSpan.style.fontSize = '18px';
    valSpan.style.fontWeight = '800';
    valSpan.style.color = 'var(--accent-primary)';
    
    const labelSpan = document.createElement('div');
    labelSpan.textContent = stat.label;
    labelSpan.style.fontSize = '10px';
    labelSpan.style.color = 'var(--text-secondary)';
    labelSpan.style.marginTop = '2px';
    
    col.appendChild(valSpan);
    col.appendChild(labelSpan);
    statsGrid.appendChild(col);
  });

  heroSection.appendChild(statsGrid);
  view.appendChild(heroSection);

  // Today's / Live Matches Section
  const matchesHeader = document.createElement('h3');
  matchesHeader.textContent = 'Featured Matches';
  matchesHeader.style.fontFamily = 'var(--font-display)';
  matchesHeader.style.fontSize = '16px';
  matchesHeader.style.fontWeight = '800';
  matchesHeader.style.margin = '24px 0 12px';
  view.appendChild(matchesHeader);

  const matchesContainer = document.createElement('div');
  view.appendChild(matchesContainer);

  // Render matches
  const renderFeaturedMatches = () => {
    matchesContainer.innerHTML = '';
    
    // Check if there are live matches
    let featured = dataStore.getFilteredGames('live');
    
    // If no live matches, get upcoming matches (uncompleted)
    if (featured.length === 0) {
      featured = dataStore.games
        .filter(g => g.finished !== 'TRUE')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);
    }

    // If still empty (tournament finished), show the last completed matches
    if (featured.length === 0) {
      featured = dataStore.games
        .filter(g => g.finished === 'TRUE')
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // newest first
        .slice(0, 4);
    }

    if (featured.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'glass-card';
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '30px';
      emptyState.style.color = 'var(--text-secondary)';
      emptyState.textContent = 'No matches found.';
      matchesContainer.appendChild(emptyState);
    } else {
      featured.forEach(match => {
        const card = renderMatchCard(match, {
          onCardClick: options.onMatchClick
        });
        matchesContainer.appendChild(card);
      });
    }
  };

  if (!dataStore.isLoaded) {
    matchesContainer.appendChild(renderSkeletonsList(3));
  } else {
    renderFeaturedMatches();
  }

  // Pull to refresh gesture logic
  let startY = 0;
  let isPulling = false;

  view.addEventListener('touchstart', (e) => {
    if (view.scrollTop === 0) {
      startY = e.touches[0].pageY;
      isPulling = true;
    }
  }, { passive: true });

  view.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY;
    if (diff > 50) {
      pullSpinner.classList.add('active');
    }
  }, { passive: true });

  view.addEventListener('touchend', async () => {
    if (isPulling && pullSpinner.classList.contains('active')) {
      isPulling = false;
      if (options.onRefresh) {
        await options.onRefresh();
        renderFeaturedMatches();
      }
      pullSpinner.classList.remove('active');
    }
    isPulling = false;
  }, { passive: true });

  container.appendChild(view);
}
