import { calculateFullTimeLeaveDays } from '/scripts/leaveCalculator.js';

let allUsers = [];
let allSessions = [];

export async function fetchAndRenderEmployees() {
  const [usersRes, sessionsRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/sessions/all')
  ]);

  allUsers = await usersRes.json();
  allSessions = await sessionsRes.json();
  window.allUsers = allUsers;

  clearExistingContent();
  renderUIContainer();
  populateFilters(allUsers, allSessions);
  applyCombinedFilters();
}

function clearExistingContent() {
  const app = document.getElementById('app');
  if (app) app.innerHTML = '';
}

function renderUIContainer() {
  const app = document.getElementById('app');

  const header = document.createElement('h1');
  header.textContent = 'Employees List';
  app.appendChild(header);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.style.display = 'flex';
  filterBar.style.flexWrap = 'wrap';
  filterBar.style.gap = '1rem';
  filterBar.style.marginBottom = '1rem';
  filterBar.style.alignItems = 'center';
  filterBar.innerHTML = `
    <label>Start Date:
      <input type="date" id="startDate" style="font-size: 13px; padding: 4px 6px; width: 150px;" />
    </label>
    <label>End Date:
      <input type="date" id="endDate" style="font-size: 13px; padding: 4px 6px; width: 150px;" />
    </label>

    <label>Year:
      <select id="yearSelect" style="font-size: 13px; padding: 4px 6px; width: 100px;"></select>
    </label>
    <label>Month:
      <select id="monthSelect" style="font-size: 13px; padding: 4px 6px; width: 120px;"></select>
    </label>
    <label>Department:
      <select id="employeeDeptFilter" style="font-size: 13px; padding: 4px 6px; width: 160px;">
        <option value="">All</option>
      </select>
    </label>
    <label>Name:
      <select id="employeeNameFilter" style="font-size: 13px; padding: 4px 6px; width: 160px;">
        <option value="">All</option>
      </select>
    </label>
    <button onclick="resetEmployeeFilters()" style="padding: 6px 10px; font-size: 13px;">Clear All</button>
  `;
  app.appendChild(filterBar);

  const table = document.createElement('table');
  table.id = 'employeesTable';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Department</th>
        <th>Work Hours</th>
        <th>Total Overtime</th>
        <th>Paid Leave Left</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  app.appendChild(table);

  setTimeout(() => {
    document.getElementById('startDate')?.addEventListener('change', applyCombinedFilters);
    document.getElementById('endDate')?.addEventListener('change', applyCombinedFilters);
    document.getElementById('yearSelect')?.addEventListener('change', applyCombinedFilters);
    document.getElementById('monthSelect')?.addEventListener('change', applyCombinedFilters);
    document.getElementById('employeeDeptFilter')?.addEventListener('change', () => {
      updateNameFilterOptions();
      applyCombinedFilters();
    });
    document.getElementById('employeeNameFilter')?.addEventListener('change', applyCombinedFilters);
  }, 0);
}

async function applyCombinedFilters() {
  const year = document.getElementById('yearSelect')?.value;
  const month = document.getElementById('monthSelect')?.value;
  const dept = document.getElementById('employeeDeptFilter')?.value;
  const name = document.getElementById('employeeNameFilter')?.value;

  let filteredUsers = allUsers.filter(u => {
    const hasResigned = allSessions.some(s => s.name === u.name && s.status === 'resigned');
    return !hasResigned;
  });

  if (dept) {
    filteredUsers = filteredUsers.filter(u => u.department === dept);
  }
  if (name) {
    filteredUsers = filteredUsers.filter(u => u.name === name);
  }

  const startDateVal = document.getElementById('startDate')?.value;
  const endDateVal = document.getElementById('endDate')?.value;
  const startDate = startDateVal ? new Date(startDateVal) : null;
  const endDate = endDateVal ? new Date(new Date(endDateVal).setHours(23, 59, 59, 999)) : null;

  const filteredSessions = allSessions.filter(session => {
    if (!session.checkIn || !session.checkOut) return false;

    const checkIn = new Date(session.checkIn);
    if (year && checkIn.getFullYear() !== Number(year)) return false;
    if (month && checkIn.getMonth() !== Number(month)) return false;

    if (startDate && checkIn < startDate) return false;
    if (endDate && checkIn > endDate) return false;
    return true;
  });

  await Promise.all(filteredUsers.map(async user => {
    const sessions = filteredSessions.filter(s => s.name === user.name);
    let totalOvertimeMinutes = 0;

    sessions.forEach(s => {
      if (s.type !== 'work') return;
      const checkIn = new Date(s.checkIn);
      const checkOut = new Date(s.checkOut);
      const workedMinutes = Math.floor((checkOut - checkIn) / 60000);
      const adjustedWorked = Math.max(0, workedMinutes - 60);
      const overtime = adjustedWorked - 480;
      if (overtime > 0) totalOvertimeMinutes += overtime;
    });

    user.totalOvertime = `${Math.floor(totalOvertimeMinutes / 60)}h ${totalOvertimeMinutes % 60}m`;

    if (user.joinDate) {
      const days = calculateFullTimeLeaveDays(user.joinDate);
      user.remainingLeave = `${days}d`;
    } else {
      user.remainingLeave = '-';
    }
  }));

  populateEmployeesTable(filteredUsers);
}

export function updateNameFilterOptions() {
  const nameFilter = document.getElementById('employeeNameFilter');
  const deptFilter = document.getElementById('employeeDeptFilter');
  const selectedDept = deptFilter?.value;

  const names = [...new Set(
    allUsers
      .filter(u => !selectedDept || u.department === selectedDept)
      .map(u => u.name)
  )].sort();

  nameFilter.innerHTML = '<option value="">All</option>';
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    nameFilter.appendChild(opt);
  });
}

export function resetEmployeeFilters() {
  document.getElementById('yearSelect').value = '';
  document.getElementById('monthSelect').value = '';
  document.getElementById('employeeDeptFilter').value = '';
  document.getElementById('employeeNameFilter').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  updateNameFilterOptions();
  applyCombinedFilters();
}

export function enableEdit(button) {
  const row = button.closest('tr');
  row.querySelectorAll('input, select').forEach(el => el.disabled = false);
  row.querySelector('button[onclick^="save"]').style.display = 'inline-block';
  button.style.display = 'none';
}

export async function saveUserEdits(userId, button) {
  const row = button.closest('tr');
  const nameInput = row.querySelector('td:nth-child(1) input');
  const deptSelect = row.querySelector('td:nth-child(2) select');
  const overtimeInput = row.querySelector('td:nth-child(4) input');

  const payload = {
    name: nameInput?.value,
    department: deptSelect?.value,
    overtime: overtimeInput?.value
  };

  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      alert('✅ Saved');
      await fetchAndRenderEmployees();
    } else {
      alert('❌ Failed to save changes');
    }
  } catch (err) {
    console.error('❌ Save error:', err);
    alert('Request failed.');
  }
}

export async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      alert('User deleted.');
      fetchAndRenderEmployees();
    } else {
      alert('Delete failed.');
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Request failed.');
  }
}

export function viewEmployeeLog(name) {
  window.location.href = `employee-details.html?name=${encodeURIComponent(name)}`;
}

window.viewEmployeeLog = viewEmployeeLog;
window.enableEdit = enableEdit;
window.saveUserEdits = saveUserEdits;
window.deleteUser = deleteUser;
window.updateNameFilterOptions = updateNameFilterOptions;
window.resetEmployeeFilters = resetEmployeeFilters;
