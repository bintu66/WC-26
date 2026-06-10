import { dataStore } from '../services/dataStore';
import { renderMatchCard } from '../components/matchCard';
import { renderSkeletonsList } from '../components/skeleton';

export function renderFixturesView(container, options = {}) {
  container.innerHTML = '';
  
  const view = document.createElement('div');
  view.className = 'view-container';

  // Filters Chips Row
  const filtersRow = document.createElement('div');
  filtersRow.className = 'filter-scroll-row';

  const filterOptions = [
    { id: 'all', label: 'All Matches' },
    { id: 'live', label: 'Live' },
    { id: 'group', label: 'Group Stage' },
    { id: 'r32', label: 'Round of 32' },
    { id: 'r16', label: 'Round of 16' },
    { id: 'qf', label: 'Quarter-finals' },
    { id: 'sf', label: 'Semi-finals' },
    { id: 'final', label: 'Finals' }
  ];

  let activeFilter = 'all';

  const timelineContainer = document.createElement('div');
  timelineContainer.className = 'timeline-section';

  const drawFilters = () => {
    filtersRow.innerHTML = '';
    filterOptions.forEach(opt => {
      const chip = document.createElement('div');
      chip.className = `filter-chip ${activeFilter === opt.id ? 'active' : ''}`;
      chip.textContent = opt.label;
      chip.addEventListener('click', () => {
        if (activeFilter !== opt.id) {
          activeFilter = opt.id;
          drawFilters();
          drawTimeline();
        }
      });
      filtersRow.appendChild(chip);
    });
  };

  const drawTimeline = () => {
    timelineContainer.innerHTML = '';

    if (!dataStore.isLoaded) {
      timelineContainer.appendChild(renderSkeletonsList(5));
      return;
    }

    const groupedMatches = dataStore.getGamesByDate(activeFilter);

    if (groupedMatches.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'glass-card';
      emptyState.style.textAlign = 'center';
      emptyState.style.padding = '40px 20px';
      emptyState.style.color = 'var(--text-secondary)';
      emptyState.textContent = 'No matches found matching this filter.';
      timelineContainer.appendChild(emptyState);
      return;
    }

    groupedMatches.forEach(group => {
      const dateHeader = document.createElement('div');
      dateHeader.className = 'timeline-date-header';
      dateHeader.textContent = group.date;
      timelineContainer.appendChild(dateHeader);

      // Unique ID for auto-scrolling to today
      const todayString = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      if (group.date === todayString) {
        dateHeader.id = 'today-marker';
      }

      group.matches.forEach(match => {
        const card = renderMatchCard(match, {
          onCardClick: options.onMatchClick
        });
        timelineContainer.appendChild(card);
      });
    });

    // Auto-scroll to today's matches after rendering completes
    setTimeout(() => {
      const marker = view.querySelector('#today-marker');
      if (marker) {
        marker.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  view.appendChild(filtersRow);
  view.appendChild(timelineContainer);

  if (dataStore.isLoaded) {
    drawFilters();
    drawTimeline();
  } else {
    timelineContainer.appendChild(renderSkeletonsList(5));
  }

  container.appendChild(view);

  return {
    update() {
      drawFilters();
      drawTimeline();
    }
  };
}
