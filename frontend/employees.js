// employees.js

import { translate, applyTranslations } from './scripts/lang.js';

const section = 'employees';
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations('employees', lang);
});

let allUsers = [];
let allSessions = [];

export async function fetchAndRenderEmployees() {
  const [usersRes, sessionsRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/sessions/all'),
  ]);

  const users = await usersRes.json();
  const sessions = await sessionsRes.json();

  allUsers = users;
  allSessions = sessions;
  window.allUsers = users;

  clearExistingContent();
  renderUIContainer();
  populateFilters(users, sessions);
  applyCombinedFilters();
}

function clearExistingContent() {
  const app = document.getElementById('app');
  if (app) app.innerHTML = '';
}

function renderUIContainer() {
  const app = document.getElementById('app');

  const header = document.createElement('h1');
  header.setAttribute('data-i18n', 'employees.title');
  header.textContent = translate('title', section);
  app.appendChild(header);

  const filterBar = document.createElement('div');
  filterBar.className = 'filter-bar';
  filterBar.style.display = 'flex';
  filterBar.style.flexWrap = 'wrap';
  filterBar.style.gap = '1rem';
  filterBar.style.marginBottom = '1rem';
  filterBar.style.alignItems = 'center';

  filterBar.innerHTML = `
  <label data-i18n="${section}.startDate">${translate('startDate', section)}:
    <input type="date" id="startDate" />
  </label>
  <label data-i18n="${section}.endDate">${translate('endDate', section)}:
    <input type="date" id="endDate" />
  </label>
  <label data-i18n="${section}.year">${translate('year', section)}:
    <select id="yearSelect"></select>
  </label>
  <label data-i18n="${section}.month">${translate('month', section)}:
    <select id="monthSelect"></select>
  </label>
  <label data-i18n="${section}.department">${translate('department', section)}:
    <select id="employeeDeptFilter">
      <option value="">${translate('all', section)}</option>
    </select>
  </label>
  <label data-i18n="${section}.name">${translate('name', section)}:
    <select id="employeeNameFilter">
      <option value="">${translate('all', section)}</option>
    </select>
  </label>
  <button onclick="resetEmployeeFilters()" data-i18n="${section}.clearAll">
    ${translate('clearAll', section)}
  </button>
`;

  app.appendChild(filterBar);

  const notice = document.createElement('div');
    notice.id = 'deptNotice';
    notice.setAttribute('data-i18n', 'employees.selectDeptNotice');
    notice.textContent = translate('selectDeptNotice', section);
    notice.style.color = 'red';
    notice.style.marginBottom = '1rem';
    notice.style.display = 'none';
    app.appendChild(notice);

  const table = document.createElement('table');
  table.id = 'employeesTable';
  table.innerHTML = `
  <thead>
    <tr>
      <th data-i18n="employees.name">${translate('name', section)}</th>
      <th data-i18n="employees.department">${translate('department', section)}</th>
      <th data-i18n="employees.workHours">${translate('workHours', section)}</th>
      <th data-i18n="employees.totalOvertime">${translate('totalOvertime', section)}</th>
      <th data-i18n="employees.paidLeaveLeft">${translate('paidLeaveLeft', section)}</th>
      <th data-i18n="employees.actions">${translate('actions', section)}</th>
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
  const startDate = document.getElementById('startDate')?.value;
  const endDate = document.getElementById('endDate')?.value;
  const notice = document.getElementById('deptNotice');
  const table = document.getElementById('employeesTable');

  if (!dept) {
    populateEmployeesTable([]);
    if (notice) notice.style.display = 'block';
    if (table) table.style.opacity = '0.3';
    return;
  }

  if (notice) notice.style.display = 'none';
  if (table) table.style.opacity = '1';

  const params = new URLSearchParams({ dept });
  if (year) params.append('year', year);
  if (month) params.append('month', month);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  try {
    const res = await fetch(`/api/employees-summary?${params.toString()}`);
    const summary = await res.json();

    const filtered = name
      ? summary.filter(u => u.name === name)
      : summary;

    populateEmployeesTable(filtered);
  } catch (err) {
    console.error('Error fetching summary:', err);
    alert('❌ Failed to load employee summary');
  }
}

function populateEmployeesTable(users) {
  const tbody = document.querySelector("#employeesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = '';

  const section = 'employees';

  users.forEach(user => {
    const userId = user._id;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" value="${user.name || ''}" disabled></td>
      <td>
        <select disabled style="font-size: 13px; padding: 4px 6px;">
          ${['THERMAL', 'SPL', 'IMPORTEXPORT', 'FIELD', 'NARITAOPS', 'ART', 'OCEAN', 'BIZDEV', 'IT', 'FINANCE', 'QA', 'HR']
            .map(dept => {
              const label = ({
                IMPORTEXPORT: '国際航空貨物輸送部',
                FIELD: 'フィールド部',
                NARITAOPS: '成田通関部',
                ART: '美術品輸送部',
                OCEAN: '海上貨物輸送部',
                BIZDEV: '事業開発部',
                FINANCE: '財務経理部',
                QA: '品質保証部',
                HR: '人事部'
              })[dept] || dept;
              return `<option value="${dept}" ${user.department === dept ? 'selected' : ''}>${label}</option>`;
            }).join('')}
        </select>
      </td>
      <td>
        <button onclick="viewEmployeeLog('${user.name}')" data-i18n="employees.viewLogs">
          ${translate('viewLogs', section)}
        </button>
      </td>
      <td><input type="text" value="${user.totalOvertime || '0h 0m'}" disabled></td>
      <td><input type="text" value="${user.remainingLeave || '-'}" disabled></td>
      <td>
        <button onclick="enableEdit(this)" data-i18n="employees.edit">
          ${translate('edit', section)}
        </button>
        <button onclick="saveUserEdits('${userId}', this)" style="display:none;" data-i18n="employees.save">
          ${translate('save', section)}
        </button>
        <button onclick="deleteUser('${userId}')" data-i18n="employees.delete">
          ${translate('delete', section)}
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function populateFilters(users, sessions) {
  const yearSet = new Set();
  const monthSet = new Set();
  const deptFilter = document.getElementById('employeeDeptFilter');
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');

  sessions.forEach(s => {
    const date = new Date(s.checkIn);
    if (!isNaN(date)) {
      yearSet.add(date.getFullYear());
      monthSet.add(date.getMonth());
    }
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  yearSelect.innerHTML = `<option value="">${translate('employees.all')}</option>` +
    [...yearSet].sort((a, b) => b - a).map(y => `<option value="${y}">${y}</option>`).join('');

  monthSelect.innerHTML = `<option value="">${translate('employees.all')}</option>` + 
    [...monthSet].sort((a, b) => a - b).map(m => `<option value="${m}">${monthNames[m]}</option>`).join('');

  const depts = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  deptFilter.innerHTML = `<option value="">${translate('employees.all')}</option>`;
  depts.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    deptFilter.appendChild(opt);
  });

  updateNameFilterOptions();
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

  nameFilter.innerHTML = `<option value="">${translate('employees.all')}</option>`;
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
