// attendance.js (sortable active sessions with department)

let allUsers = [];
let activeSessions = [];
let sortDirection = 1;
let sortKey = 'checkIn';

export async function fetchAndRenderAttendance() {
  const [activeRes, usersRes] = await Promise.all([
    fetch('/api/sessions/active'),
    fetch('/api/users')
  ]);

  activeSessions = await activeRes.json();
  allUsers = await usersRes.json();

  populateDepartmentDropdown();
  populateActiveTable();
}

function populateDepartmentDropdown() {
  const deptSelect = document.getElementById('sortDepartment');
  if (!deptSelect) return;

  const depts = [...new Set(allUsers.map(u => u.department).filter(Boolean))].sort();
  depts.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    deptSelect.appendChild(opt);
  });

  deptSelect.addEventListener('change', populateActiveTable);
}

function populateActiveTable() {
  const tbody = document.getElementById('activeTable').querySelector('tbody');
  tbody.innerHTML = '';

  const selectedDept = document.getElementById('sortDepartment')?.value;

  if (!selectedDept) {
    return; // Don't render anything until department is selected
  }

  const enriched = activeSessions.map(entry => {
    const user = allUsers.find(u => u.name === entry.name);
    return {
      ...entry,
      department: user?.department || '-'
    };
  });

  const filtered = enriched.filter(e => e.department === selectedDept);

  const sorted = [...filtered].sort((a, b) => {
    const aValue = sortKey === 'checkIn' ? new Date(a.checkIn) : a.name.toLowerCase();
    const bValue = sortKey === 'checkIn' ? new Date(b.checkIn) : b.name.toLowerCase();
    return (aValue < bValue ? -1 : 1) * sortDirection;
  });

  sorted.forEach(entry => {
    const row = document.createElement('tr');
    const checkIn = new Date(entry.checkIn);
    row.innerHTML = `<td>${entry.name}</td><td>${entry.department}</td><td>${checkIn.toLocaleString()}</td>`;
    tbody.appendChild(row);
  });
}

export function setupActiveTableSorting() {
  const headers = document.querySelectorAll('#activeTable thead th');
  headers.forEach((th, idx) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      sortKey = idx === 0 ? 'name' : idx === 2 ? 'checkIn' : sortKey;
      sortDirection = -sortDirection;
      populateActiveTable();
    });
  });
}