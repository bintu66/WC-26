export function renderBottomNav(activeTab, onTabChange) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'groups', label: 'Groups', icon: '📊' },
    { id: 'fixtures', label: 'Fixtures', icon: '📅' },
    { id: 'bracket', label: 'Bracket', icon: '🏆' }
  ];

  const container = document.createElement('div');
  container.className = 'bottom-nav';

  navItems.forEach(item => {
    const navLink = document.createElement('div');
    navLink.className = `nav-item ${activeTab === item.id ? 'active' : ''}`;
    navLink.dataset.tab = item.id;
    
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'nav-icon-wrapper';
    iconWrapper.textContent = item.icon;
    
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
