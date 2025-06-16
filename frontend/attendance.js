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

  const departments = [
    'THERMAL', 'SPL', 'IMPORTEXPORT', 'FIELD', 'NARITAOPS',
    'ART', 'OCEAN', 'BIZDEV', 'IT', 'FINANCE', 'QA', 'HR'
  ];

  const departmentLabels = {
    IMPORTEXPORT: '国際航空貨物輸送部',
    FIELD: 'フィールド部',
    NARITAOPS: '成田通関部',
    ART: '美術品輸送部',
    OCEAN: '海上貨物輸送部',
    BIZDEV: '事業開発部',
    FINANCE: '財務経理部',
    QA: '品質保証部',
    HR: '人事部'
  };

  departments.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = departmentLabels[dept] || dept;
    deptSelect.appendChild(opt);
  });

  deptSelect.addEventListener('change', populateActiveTable);
}

function populateActiveTable() {
  const tbody = document.getElementById('activeTable').querySelector('tbody');
  tbody.innerHTML = '';

  const selectedDept = document.getElementById('sortDepartment')?.value;

  const departmentLabels = {
    IMPORTEXPORT: '国際航空貨物輸送部',
    FIELD: 'フィールド部',
    NARITAOPS: '成田通関部',
    ART: '美術品輸送部',
    OCEAN: '海上貨物輸送部',
    BIZDEV: '事業開発部',
    FINANCE: '財務経理部',
    QA: '品質保証部',
    HR: '人事部'
  };

  const enriched = activeSessions.map(entry => {
    const user = allUsers.find(u => u.name === entry.name);
    return {
      ...entry,
      department: user?.department || '-'
    };
  });

  const filtered = selectedDept
    ? enriched.filter(e => e.department === selectedDept)
    : enriched;

  const sorted = [...filtered].sort((a, b) => {
    const aValue = sortKey === 'checkIn' ? new Date(a.checkIn) : a.name.toLowerCase();
    const bValue = sortKey === 'checkIn' ? new Date(b.checkIn) : b.name.toLowerCase();
    return (aValue < bValue ? -1 : 1) * sortDirection;
  });

  sorted.forEach(entry => {
    const row = document.createElement('tr');
    const checkIn = new Date(entry.checkIn);
    const deptLabel = departmentLabels[entry.department] || entry.department;
    row.innerHTML = `<td>${entry.name}</td><td>${deptLabel}</td><td>${checkIn.toLocaleString()}</td>`;
    tbody.appendChild(row);
  });
}

export function setupActiveTableSorting() {
  const table = document.getElementById('activeTable');
  if (!table) return;

  const headers = table.querySelectorAll('th');
  headers.forEach((th, index) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      sortKey = index === 0 ? 'name' : 'checkIn';
      sortDirection *= -1;
      populateActiveTable();
    });
  });
}
