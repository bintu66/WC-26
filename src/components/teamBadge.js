import { dataStore } from '../services/dataStore';

export function renderTeamBadge(team, options = {}) {
  const { 
    isPlaceholder = false,
    textClass = 'team-name',
    flagClass = 'team-flag',
    badgeClass = 'team-info'
  } = options;

  const container = document.createElement('div');
  container.className = badgeClass;

  const flagContainer = document.createElement('div');
  flagContainer.className = flagClass;

  if (isPlaceholder || !team.name || team.name === 'TBD') {
    flagContainer.textContent = '🏳️';
  } else {
    const emoji = dataStore.getFlagEmoji(team.name);
    
    if (team.flag && team.flag !== 'null' && team.flag !== '') {
      const img = document.createElement('img');
      img.src = team.flag;
      img.alt = `${team.name} Flag`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      
      // Fallback to emoji if flag image fails
      img.onerror = () => {
        img.remove();
        flagContainer.textContent = emoji;
      };
      
      flagContainer.appendChild(img);
    } else {
      flagContainer.textContent = emoji;
    }
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = `${textClass} ${isPlaceholder ? 'placeholder' : ''}`;
  nameSpan.textContent = team.name || 'TBD';

  container.appendChild(flagContainer);
  container.appendChild(nameSpan);

  return container;
}
