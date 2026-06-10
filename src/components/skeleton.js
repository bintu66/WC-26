export function renderMatchSkeleton() {
  const container = document.createElement('div');
  container.className = 'glass-card match-card skeleton skeleton-card';
  return container;
}

export function renderGroupSkeleton() {
  const container = document.createElement('div');
  container.className = 'glass-card';
  container.style.height = '280px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '16px';
  container.style.padding = '20px';

  for (let i = 0; i < 5; i++) {
    const row = document.createElement('div');
    row.className = 'skeleton';
    row.style.height = '32px';
    row.style.borderRadius = '8px';
    row.style.width = '100%';
    container.appendChild(row);
  }

  return container;
}

export function renderSkeletonsList(count = 3) {
  const container = document.createElement('div');
  container.className = 'skeleton-list';
  for (let i = 0; i < count; i++) {
    container.appendChild(renderMatchSkeleton());
  }
  return container;
}
