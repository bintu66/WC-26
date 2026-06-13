export function renderBottomNav(activeTab, onTabChange) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: `
        <svg class="nav-svg" viewBox="0 0 32 32" style="width: 22px; height: 22px;">
          <defs>
            <linearGradient id="svg-home-grad-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#00F0FF"/>
              <stop offset="100%" stop-color="#0072FF"/>
            </linearGradient>
            <linearGradient id="svg-home-grad-2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0.1"/>
            </linearGradient>
            <filter id="svg-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
            </filter>
          </defs>
          <path d="M6 15 L16 7 L26 15 L24 16 L24 27 L8 27 L8 16 Z" fill="url(#svg-home-grad-1)" filter="url(#svg-shadow)"/>
          <path d="M6 15 L16 7 L16 27 L8 27 L8 16 Z" fill="#000000" opacity="0.15"/>
          <rect x="13" y="19" width="6" height="8" rx="1" fill="#050818" opacity="0.7"/>
          <path d="M16 7 L26 15 L20 15 L14 9 Z" fill="url(#svg-home-grad-2)"/>
        </svg>
      `
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: `
        <svg class="nav-svg" viewBox="0 0 32 32" style="width: 22px; height: 22px;">
          <defs>
            <linearGradient id="svg-groups-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#00E676"/>
              <stop offset="100%" stop-color="#00B0FF"/>
            </linearGradient>
          </defs>
          <rect x="6" y="16" width="5" height="11" rx="1.5" fill="url(#svg-groups-grad)" filter="url(#svg-shadow)"/>
          <rect x="6" y="16" width="2.5" height="11" rx="0" fill="#ffffff" opacity="0.2"/>
          <rect x="13.5" y="8" width="5" height="19" rx="1.5" fill="url(#svg-groups-grad)" filter="url(#svg-shadow)"/>
          <rect x="13.5" y="8" width="2.5" height="19" rx="0" fill="#ffffff" opacity="0.2"/>
          <rect x="21" y="12" width="5" height="15" rx="1.5" fill="url(#svg-groups-grad)" filter="url(#svg-shadow)"/>
          <rect x="21" y="12" width="2.5" height="15" rx="0" fill="#ffffff" opacity="0.2"/>
        </svg>
      `
    },
    {
      id: 'fixtures',
      label: 'Fixtures',
      icon: `
        <svg class="nav-svg" viewBox="0 0 32 32" style="width: 22px; height: 22px;">
          <defs>
            <linearGradient id="svg-fixtures-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FF007F"/>
              <stop offset="100%" stop-color="#9B00E8"/>
            </linearGradient>
          </defs>
          <rect x="6" y="9" width="20" height="18" rx="3" fill="url(#svg-fixtures-grad)" filter="url(#svg-shadow)"/>
          <path d="M6 9 h20 v5 h-20 z" fill="#000" opacity="0.25"/>
          <rect x="9" y="6" width="3" height="5" rx="1" fill="#FFF" opacity="0.9"/>
          <rect x="20" y="6" width="3" height="5" rx="1" fill="#FFF" opacity="0.9"/>
          <circle cx="10" cy="18" r="1.5" fill="#FFF" opacity="0.6"/>
          <circle cx="16" cy="18" r="1.5" fill="#FFF" opacity="0.6"/>
          <circle cx="22" cy="18" r="1.5" fill="#FFF" opacity="0.6"/>
          <circle cx="10" cy="23" r="1.5" fill="#FFF" opacity="0.6"/>
          <circle cx="16" cy="23" r="1.5" fill="#FFF" opacity="0.9"/>
          <circle cx="22" cy="23" r="1.5" fill="#FFF" opacity="0.6"/>
        </svg>
      `
    },
    {
      id: 'bracket',
      label: 'Bracket',
      icon: `
        <svg class="nav-svg" viewBox="0 0 32 32" style="width: 22px; height: 22px;">
          <defs>
            <linearGradient id="svg-bracket-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FFD700"/>
              <stop offset="50%" stop-color="#FFA500"/>
              <stop offset="100%" stop-color="#B8860B"/>
            </linearGradient>
            <linearGradient id="svg-reflection" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="M9 8 H23 L21 18 C20 21 12 21 11 18 Z" fill="url(#svg-bracket-grad)" filter="url(#svg-shadow)"/>
          <path d="M9 9 C6 9 6 15 9 15" stroke="url(#svg-bracket-grad)" stroke-width="2.5" fill="none"/>
          <path d="M23 9 C26 9 26 15 23 15" stroke="url(#svg-bracket-grad)" stroke-width="2.5" fill="none"/>
          <rect x="14.5" y="18" width="3" height="6" fill="url(#svg-bracket-grad)"/>
          <rect x="11" y="24" width="10" height="3" rx="1" fill="url(#svg-bracket-grad)"/>
          <path d="M9 8 H16 V19 C12 19 11 18 11 18 Z" fill="#000" opacity="0.15"/>
          <path d="M16 8 H20 L18 17 C17 18 16 18 16 18 Z" fill="url(#svg-reflection)"/>
        </svg>
      `
    },
    {
      id: 'watch',
      label: 'Watch',
      icon: `
        <svg class="nav-svg" viewBox="0 0 32 32" style="width: 22px; height: 22px;">
          <defs>
            <linearGradient id="svg-watch-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FF416C"/>
              <stop offset="100%" stop-color="#FF4B2B"/>
            </linearGradient>
            <linearGradient id="svg-watch-screen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
            </linearGradient>
          </defs>
          <!-- TV body -->
          <rect x="4" y="8" width="24" height="16" rx="2.5" fill="url(#svg-watch-grad)" filter="url(#svg-shadow)"/>
          <!-- Screen -->
          <rect x="6" y="10" width="20" height="12" rx="1.5" fill="url(#svg-watch-screen)"/>
          <!-- Play triangle -->
          <polygon points="13,13 13,19 20,16" fill="#ffffff" opacity="0.9"/>
          <!-- Stand -->
          <rect x="13" y="24" width="6" height="2.5" rx="1" fill="url(#svg-watch-grad)"/>
          <rect x="10" y="26.5" width="12" height="2" rx="1" fill="url(#svg-watch-grad)"/>
          <!-- Live dot -->
          <circle cx="24" cy="11.5" r="2" fill="#ffffff" opacity="0.9"/>
          <circle cx="24" cy="11.5" r="1.2" fill="#FF416C"/>
        </svg>
      `
    }
  ];

  const container = document.createElement('div');
  container.className = 'bottom-nav';

  navItems.forEach(item => {
    const navLink = document.createElement('div');
    navLink.className = `nav-item ${activeTab === item.id ? 'active' : ''}`;
    navLink.dataset.tab = item.id;
    
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'nav-icon-wrapper';
    iconWrapper.style.display = 'flex';
    iconWrapper.style.alignItems = 'center';
    iconWrapper.style.justifyContent = 'center';
    iconWrapper.innerHTML = item.icon;
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.label;
    
    navLink.appendChild(iconWrapper);
    navLink.appendChild(labelSpan);
    
    navLink.addEventListener('click', () => {
      if (onTabChange) {
        onTabChange(item.id);
      }
    });
    
    container.appendChild(navLink);
  });

  return container;
}
