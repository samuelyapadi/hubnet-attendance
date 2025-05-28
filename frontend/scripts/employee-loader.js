// employee-loader.js

import { renderLogTable } from './employee-details.js';
import { setupMetaListeners } from './employee-meta.js';
import { toLocalDatetimeString } from './utils-datetime.js'; // ✅ Ensure datetime function is available

let employeeId = null;
let userDefaultStartTime = null;
let userIsShiftWorker = false;

const params = new URLSearchParams(window.location.search);
const employeeName = params.get('name');
document.getElementById('employeeName').textContent = `Logs for: ${employeeName}`;

fetch('/api/users')
  .then(res => res.json())
  .then(users => {
    const match = users.find(u => decodeURIComponent(u.name.trim()) === decodeURIComponent(employeeName.trim()));
    if (!match) return;
    employeeId = match._id;
    return fetch(`/api/users/${employeeId}`);
  })
  .then(res => res.json())
  .then(user => {
    if (!user) return;

    userDefaultStartTime = user.defaultStartTime || null;
    userIsShiftWorker = user.isShiftWorker || false;

    if (user.joinDate) {
      document.getElementById('editJoinDate').value = new Date(user.joinDate).toISOString().slice(0, 10);
    }

    document.getElementById('employmentTypeDisplay').textContent = user.isPartTime ? 'Part-Time' : 'Full-Time';
    document.getElementById('editIsPartTime').value = user.isPartTime ? "1" : "0";

    document.getElementById('defaultStartTime').value = user.defaultStartTime || '';

    if (user.isPartTime) {
      document.getElementById('editWorkingDaysContainer').style.display = 'block';
      document.getElementById('editWeeklyWorkingDays').value = user.weeklyWorkingDays || "1";
    } else {
      document.getElementById('editWorkingDaysContainer').style.display = 'none';
    }

    document.getElementById('shiftWorkerDisplay').textContent = user.isShiftWorker ? 'Yes' : 'No';
    document.getElementById('editIsShiftWorker').value = user.isShiftWorker ? "1" : "0";
    document.getElementById('monthlyShiftContainer').style.display = user.isShiftWorker ? 'block' : 'none';

    return fetch('/api/sessions/all');
  })
  .then(res => res.json())
  .then(data => {
    const allRecords = data.filter(e => e.name === employeeName && e.checkIn && e.checkOut);
    populateYearMonthFilters(allRecords);
    renderLogTable(allRecords, toLocalDatetimeString); // ✅ Pass the datetime formatter

    // ✅ Register button and shift listeners
    setupMetaListeners(employeeId, employeeName);

    return fetch(`/api/users/${encodeURIComponent(employeeName)}/leave-balance`);
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('leaveBalance').textContent = data.formatted || '0d 0h';
  })
  .catch(err => {
    console.error('[Employee Load Error]', err);
    document.getElementById('leaveBalance').textContent = '-';
  });

function populateYearMonthFilters(records) {
  const yearSet = new Set();
  const monthSet = new Set();

  records.forEach(r => {
    const date = new Date(r.checkIn);
    yearSet.add(date.getFullYear());
    monthSet.add(date.getMonth());
  });

  const yearSelect = document.getElementById('yearFilter');
  const monthSelect = document.getElementById('monthFilter');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  yearSelect.innerHTML = `<option value="">All Years</option>` +
    [...yearSet].sort((a, b) => b - a).map(y => `<option value="${y}">${y}</option>`).join('');

  monthSelect.innerHTML = `<option value="">All Months</option>` +
    [...monthSet].sort((a, b) => a - b)
      .map(m => `<option value="${m}">${monthNames[m]}</option>`)
      .join('');

  yearSelect.addEventListener('change', () => applyFilterAndRender(records));
  monthSelect.addEventListener('change', () => applyFilterAndRender(records));
  document.getElementById('startDate')?.addEventListener('change', () => applyFilterAndRender(records));
  document.getElementById('endDate')?.addEventListener('change', () => applyFilterAndRender(records));
}

function applyFilterAndRender(records) {
  const year = document.getElementById('yearFilter').value;
  const month = document.getElementById('monthFilter').value;
  const startDateVal = document.getElementById('startDate')?.value;
  const endDateVal = document.getElementById('endDate')?.value;
  const startDate = startDateVal ? new Date(startDateVal) : null;
  const endDate = endDateVal ? new Date(new Date(endDateVal).setHours(23, 59, 59, 999)) : null;

  const filtered = records.filter(entry => {
    const d = new Date(entry.checkIn);
    const matchYear = !year || d.getFullYear().toString() === year;
    const matchMonth = month === '' || d.getMonth().toString() === month;
    const matchStart = !startDate || d >= startDate;
    const matchEnd = !endDate || d <= endDate;
    return matchYear && matchMonth && matchStart && matchEnd;
  });

  renderLogTable(filtered, toLocalDatetimeString); // ✅ Pass again for filtered view
}
