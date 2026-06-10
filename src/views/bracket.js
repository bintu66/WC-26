import { dataStore } from '../services/dataStore';
import { renderTeamBadge } from '../components/teamBadge';

export function renderBracketView(container, options = {}) {
  container.innerHTML = '';

  const view = document.createElement('div');
  view.className = 'view-container';
  view.style.padding = '12px';
  view.style.display = 'flex';
  view.style.flexDirection = 'column';
  view.style.height = '100%';

  // Zoom controls header
  const controlsRow = document.createElement('div');
  controlsRow.style.display = 'flex';
  controlsRow.style.justifyContent = 'space-between';
  controlsRow.style.alignItems = 'center';
  controlsRow.style.marginBottom = '12px';

  const title = document.createElement('h3');
  title.textContent = 'Knockout Stage';
  title.style.fontFamily = 'var(--font-display)';
  title.style.fontSize = '16px';
  title.style.fontWeight = '800';

  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.gap = '8px';

  const btnZoomIn = document.createElement('button');
  btnZoomIn.className = 'filter-chip';
  btnZoomIn.style.padding = '4px 10px';
  btnZoomIn.textContent = '🔍 +';

  const btnZoomOut = document.createElement('button');
  btnZoomOut.className = 'filter-chip';
  btnZoomOut.style.padding = '4px 10px';
  btnZoomOut.textContent = '🔍 -';

  const btnReset = document.createElement('button');
  btnReset.className = 'filter-chip';
  btnReset.style.padding = '4px 10px';
  btnReset.textContent = 'Reset';

  buttons.appendChild(btnZoomIn);
  buttons.appendChild(btnZoomOut);
  buttons.appendChild(btnReset);
  controlsRow.appendChild(title);
  controlsRow.appendChild(buttons);
  view.appendChild(controlsRow);

  // Bracket Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'bracket-wrapper';
  
  const hint = document.createElement('div');
  hint.className = 'zoom-hint';
  hint.textContent = 'Swipe & drag to explore';
  wrapper.appendChild(hint);

  const bracketContainer = document.createElement('div');
  bracketContainer.className = 'bracket-container';
  wrapper.appendChild(bracketContainer);
  view.appendChild(wrapper);

  let currentZoom = 1;
  const minZoom = 0.5;
  const maxZoom = 1.5;

  const updateZoom = () => {
    bracketContainer.style.transform = `scale(${currentZoom})`;
  };

  btnZoomIn.addEventListener('click', () => {
    currentZoom = Math.min(currentZoom + 0.1, maxZoom);
    updateZoom();
    setTimeout(drawLines, 100);
  });

  btnZoomOut.addEventListener('click', () => {
    currentZoom = Math.max(currentZoom - 0.1, minZoom);
    updateZoom();
    setTimeout(drawLines, 100);
  });

  btnReset.addEventListener('click', () => {
    currentZoom = 0.8;
    updateZoom();
    wrapper.scrollLeft = 0;
    wrapper.scrollTop = 0;
    setTimeout(drawLines, 100);
  });

  // SVG Layer for connectors
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgOverlay.setAttribute('class', 'bracket-svg-overlay');
  bracketContainer.appendChild(svgOverlay);

  // Helper to parse parent match ID from label
  const getParentMatchId = (label) => {
    if (!label) return null;
    const match = label.match(/Winner Match (\d+)/i);
    return match ? match[1] : null;
  };

  const drawLines = () => {
    // Clear SVG overlay
    svgOverlay.innerHTML = '';
    
    // Get full SVG dimensions based on content size
    const containerWidth = bracketContainer.scrollWidth;
    const containerHeight = bracketContainer.scrollHeight;
    
    svgOverlay.setAttribute('width', String(containerWidth));
    svgOverlay.setAttribute('height', String(containerHeight));

    // Get all match nodes
    const nodes = bracketContainer.querySelectorAll('.bracket-match-node');
    const containerRect = bracketContainer.getBoundingClientRect();

    nodes.forEach(node => {
      const matchId = node.dataset.matchId;
      const matchDetails = dataStore.getMatchDetails(matchId);
      if (!matchDetails) return;

      const connectParent = (parentLabel, isHomeSlot) => {
        const parentId = getParentMatchId(parentLabel);
        if (!parentId) return;

        const parentNode = bracketContainer.querySelector(`[data-match-id="${parentId}"]`);
        if (!parentNode) return;

        const childRect = node.getBoundingClientRect();
        const parentRect = parentNode.getBoundingClientRect();

        // Calculate positions relative to bracketContainer
        // Adjust coordinate calculation by dividing by the current scale factor (currentZoom)
        const x1 = (parentRect.right - containerRect.left) / currentZoom;
        const y1 = (parentRect.top - containerRect.top + parentRect.height / 2) / currentZoom;

        const x2 = (childRect.left - containerRect.left) / currentZoom;
        const y2 = (childRect.top - containerRect.top + (isHomeSlot ? childRect.height * 0.3 : childRect.height * 0.7)) / currentZoom;

        // Path drawing (Cubic Bezier curve)
        const dx = Math.abs(x2 - x1) * 0.5;
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'bracket-connector-path');

        // Check if parent match is finished and the winner goes to this slot
        const prevMatch = dataStore.gameMap[parentId];
        if (prevMatch && prevMatch.finished === 'TRUE') {
          const homeScore = parseInt(prevMatch.home_score || 0);
          const awayScore = parseInt(prevMatch.away_score || 0);
          const winnerId = homeScore > awayScore ? prevMatch.home_team_id : prevMatch.away_team_id;
          const currentSlotId = isHomeSlot ? matchDetails.home.id : matchDetails.away.id;
          
          if (winnerId && winnerId === currentSlotId) {
            path.classList.add('highlighted');
          }
        }

        svgOverlay.appendChild(path);
      };

      // Connect home slot to its parent
      connectParent(matchDetails.home_team_label, true);
      // Connect away slot to its parent
      connectParent(matchDetails.away_team_label, false);
    });
  };

  const renderBracket = () => {
    bracketContainer.innerHTML = '';
    bracketContainer.appendChild(svgOverlay);

    if (!dataStore.isLoaded) return;

    const data = dataStore.getBracketData();

    // Horizontal Rounds mapping: R32 -> R16 -> QF -> SF -> Final
    const roundOrder = ['r32', 'r16', 'qf', 'sf', 'final'];
    const roundNames = {
      r32: 'Round of 32',
      r16: 'Round of 16',
      qf: 'Quarter-finals',
      sf: 'Semi-finals',
      final: 'Final'
    };

    roundOrder.forEach(roundKey => {
      const roundMatches = data[roundKey] || [];
      if (roundMatches.length === 0) return;

      const roundCol = document.createElement('div');
      roundCol.className = 'bracket-round';

      // Header for the round
      const roundTitle = document.createElement('div');
      roundTitle.textContent = roundNames[roundKey];
      roundTitle.style.fontFamily = 'var(--font-display)';
      roundTitle.style.fontSize = '12px';
      roundTitle.style.fontWeight = '800';
      roundTitle.style.textAlign = 'center';
      roundTitle.style.color = 'var(--accent-primary)';
      roundTitle.style.textTransform = 'uppercase';
      roundTitle.style.letterSpacing = '0.05em';
      roundTitle.style.marginBottom = '10px';
      roundCol.appendChild(roundTitle);

      roundMatches.forEach(match => {
        const node = document.createElement('div');
        node.className = 'bracket-match-node';
        node.dataset.matchId = match.id;

        // Home Team
        const homeRow = document.createElement('div');
        homeRow.className = 'bracket-team-row';
        if (match.finished === 'TRUE' && parseInt(match.home_score) > parseInt(match.away_score)) {
          homeRow.classList.add('winner');
        } else if (match.finished === 'TRUE') {
          homeRow.classList.add('eliminated');
        }
        const homeBadge = renderTeamBadge(match.home, { isPlaceholder: match.home.isPlaceholder });
        const homeScore = document.createElement('span');
        homeScore.className = 'team-score';
        homeScore.textContent = match.finished === 'TRUE' ? match.home_score : '-';
        homeRow.appendChild(homeBadge);
        homeRow.appendChild(homeScore);

        // Away Team
        const awayRow = document.createElement('div');
        awayRow.className = 'bracket-team-row';
        if (match.finished === 'TRUE' && parseInt(match.away_score) > parseInt(match.home_score)) {
          awayRow.classList.add('winner');
        } else if (match.finished === 'TRUE') {
          awayRow.classList.add('eliminated');
        }
        const awayBadge = renderTeamBadge(match.away, { isPlaceholder: match.away.isPlaceholder });
        const awayScore = document.createElement('span');
        awayScore.className = 'team-score';
        awayScore.textContent = match.finished === 'TRUE' ? match.away_score : '-';
        awayRow.appendChild(awayBadge);
        awayRow.appendChild(awayScore);

        node.appendChild(homeRow);
        node.appendChild(awayRow);

        // Click interaction
        node.addEventListener('click', () => {
          if (options.onMatchClick) {
            options.onMatchClick(match);
          }
        });

        roundCol.appendChild(node);
      });

      bracketContainer.appendChild(roundCol);
    });

    // Initial scale and draw lines
    currentZoom = 0.8;
    updateZoom();
    setTimeout(drawLines, 200);
  };

  // Drag scroll support
  let isDown = false;
  let startX, startY, scrollLeft, scrollTop;

  wrapper.addEventListener('mousedown', (e) => {
    isDown = true;
    wrapper.classList.add('active');
    startX = e.pageX - wrapper.offsetLeft;
    startY = e.pageY - wrapper.offsetTop;
    scrollLeft = wrapper.scrollLeft;
    scrollTop = wrapper.scrollTop;
  });

  wrapper.addEventListener('mouseleave', () => {
    isDown = false;
  });

  wrapper.addEventListener('mouseup', () => {
    isDown = false;
  });

  wrapper.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - wrapper.offsetLeft;
    const y = e.pageY - wrapper.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    wrapper.scrollLeft = scrollLeft - walkX;
    wrapper.scrollTop = scrollTop - walkY;
  });

  // Touch scroll support (native swipe works, but helper redraws SVG lines during scroll)
  wrapper.addEventListener('scroll', () => {
    // Redraw or update overlays if needed
  });

  if (dataStore.isLoaded) {
    renderBracket();
  } else {
    const loader = document.createElement('div');
    loader.style.color = 'var(--text-secondary)';
    loader.style.textAlign = 'center';
    loader.style.padding = '50px';
    loader.textContent = 'Loading bracket...';
    bracketContainer.appendChild(loader);
  }

  container.appendChild(view);

  // Redraw lines on window resize
  window.addEventListener('resize', drawLines);

  return {
    update() {
      renderBracket();
    },
    destroy() {
      window.removeEventListener('resize', drawLines);
    }
  };
}
