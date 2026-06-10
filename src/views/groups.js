import { dataStore } from '../services/dataStore';
import { renderGroupTable } from '../components/groupTable';
import { renderMatchCard } from '../components/matchCard';
import { renderGroupSkeleton, renderSkeletonsList } from '../components/skeleton';

export function renderGroupsView(container, options = {}) {
  container.innerHTML = '';
  
  const view = document.createElement('div');
  view.className = 'view-container';

  // Group letters selector tabs row
  const tabsRow = document.createElement('div');
  tabsRow.className = 'group-tabs';

  const contentSection = document.createElement('div');
  contentSection.style.marginTop = '8px';

  // Set default group to 'A'
  let activeGroup = options.initialGroup || 'A';

  const groupLetters = dataStore.getGroupList();

  // Draw group tab pills
  const drawTabs = () => {
    tabsRow.innerHTML = '';
    groupLetters.forEach(letter => {
      const tab = document.createElement('div');
      tab.className = `group-tab-pill ${activeGroup === letter ? 'active' : ''}`;
      tab.textContent = letter;
      tab.addEventListener('click', () => {
        if (activeGroup !== letter) {
          activeGroup = letter;
          drawTabs();
          drawContent();
        }
      });
      tabsRow.appendChild(tab);
    });
  };

  // Draw standings and matches for selected group
  const drawContent = () => {
    contentSection.innerHTML = '';

    if (!dataStore.isLoaded) {
      contentSection.appendChild(renderGroupSkeleton());
      contentSection.appendChild(renderSkeletonsList(2));
      return;
    }

    // Header Card
    const headerCard = document.createElement('div');
    headerCard.className = 'glass-card';
    headerCard.style.padding = '14px 16px 8px';
    headerCard.style.marginBottom = '20px';

    const groupTitle = document.createElement('h3');
    groupTitle.textContent = `Group ${activeGroup}`;
    groupTitle.style.fontFamily = 'var(--font-display)';
    groupTitle.style.fontSize = '18px';
    groupTitle.style.fontWeight = '800';
    groupTitle.style.marginBottom = '12px';
    headerCard.appendChild(groupTitle);

    // Render Group Standings Table
    const table = renderGroupTable(activeGroup, {
      onTeamClick: (teamId) => {
        if (options.onTeamClick) {
          options.onTeamClick(teamId);
        }
      }
    });
    headerCard.appendChild(table);
    contentSection.appendChild(headerCard);

    // Render Group Matches List
    const matchesHeader = document.createElement('h4');
    matchesHeader.textContent = 'Group Fixtures';
    matchesHeader.style.fontFamily = 'var(--font-display)';
    matchesHeader.style.fontSize = '14px';
    matchesHeader.style.fontWeight = '800';
    matchesHeader.style.margin = '20px 0 10px';
    contentSection.appendChild(matchesHeader);

    const matchesList = dataStore.getGroupMatches(activeGroup);
    matchesList.forEach(match => {
      const card = renderMatchCard(match, {
        onCardClick: options.onMatchClick
      });
      contentSection.appendChild(card);
    });
  };

  view.appendChild(tabsRow);
  view.appendChild(contentSection);
  
  if (dataStore.isLoaded) {
    drawTabs();
    drawContent();
  } else {
    // Show placeholder/skeleton until data is loaded
    contentSection.appendChild(renderGroupSkeleton());
    contentSection.appendChild(renderSkeletonsList(2));
  }

  // Listen to store updates if any
  container.appendChild(view);

  // Return function to update view if data loads later
  return {
    update() {
      drawTabs();
      drawContent();
    }
  };
}
