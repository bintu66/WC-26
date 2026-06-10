import { dataStore } from '../services/dataStore';
import { renderTeamBadge } from './teamBadge';

export function renderGroupTable(groupLetter, options = {}) {
  const standings = dataStore.getGroupStandings(groupLetter);
  
  const table = document.createElement('table');
  table.className = 'group-table';

  // Table Head
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  const headers = [
    { label: '#', class: '' },
    { label: 'Team', class: '' },
    { label: 'MP', class: 'col-center' },
    { label: 'W', class: 'col-center' },
    { label: 'D', class: 'col-center' },
    { label: 'L', class: 'col-center' },
    { label: 'GD', class: 'col-center' },
    { label: 'PTS', class: 'col-right' }
  ];

  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h.label;
    if (h.class) th.className = h.class;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table Body
  const tbody = document.createElement('tbody');
  
  standings.forEach((row, index) => {
    const tr = document.createElement('tr');
    
    // Qualification color indicators
    // Top 2 advance directly. Pos 3 might advance based on comparison. Pos 4 is eliminated.
    const pos = index + 1;
    if (pos <= 2) {
      tr.className = 'qualify-direct';
    } else if (pos === 3) {
      tr.className = 'qualify-playoff';
    } else {
      tr.className = 'eliminated';
    }

    // Rank Pos Cell
    const tdRank = document.createElement('td');
    const rankNum = document.createElement('span');
    rankNum.className = 'rank-num';
    rankNum.textContent = pos;
    tdRank.appendChild(rankNum);
    tr.appendChild(tdRank);

    // Team Cell
    const tdTeam = document.createElement('td');
    const teamBadge = renderTeamBadge({ name: row.name, flag: row.flag }, { 
      badgeClass: 'team-cell', 
      textClass: 'team-name' 
    });
    
    if (options.onTeamClick && row.team_id) {
      teamBadge.style.cursor = 'pointer';
      teamBadge.addEventListener('click', () => options.onTeamClick(row.team_id));
    }
    
    tdTeam.appendChild(teamBadge);
    tr.appendChild(tdTeam);

    // Stats Cells
    const stats = [
      { val: row.mp, class: 'col-center' },
      { val: row.w, class: 'col-center' },
      { val: row.d, class: 'col-center' },
      { val: row.l, class: 'col-center' },
      { val: row.gd > 0 ? `+${row.gd}` : row.gd, class: 'col-center' },
      { val: row.pts, class: 'col-right' }
    ];

    stats.forEach(s => {
      const td = document.createElement('td');
      td.textContent = s.val;
      if (s.class) td.className = s.class;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}
