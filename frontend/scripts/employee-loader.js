//employee-loader.js
import { renderLogTable } from './employee-details.js';
import { setupMetaListeners } from './employee-meta.js';
import { toLocalDatetimeString } from './utils-datetime.js';

let employeeId = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const employeeName = params.get('name');
  const employeeNameEl = document.getElementById('employeeName');
  if (employeeNameEl) employeeNameEl.textContent = `Logs for: ${employeeName}`;

  fetch('/api/users')
    .then(res => res.json())
    .then(users => {
      const match = users.find(u => decodeURIComponent(u.name.trim()) === decodeURIComponent(employeeName.trim()));
      if (!match) return;
      employeeId = match._id;
      window.employeeId = employeeId;
      return fetch(`/api/users/${employeeId}`);
    })
    .then(res => res.json())
    .then(user => {
      if (!user) return;

      const userDefaultStartTime = user.defaultStartTime || null;
      const userIsShiftWorker = user.isShiftWorker || false;

      window.userDefaultStartTime = userDefaultStartTime;
      window.userIsShiftWorker = userIsShiftWorker;

      const joinDateEl = document.getElementById('editJoinDate');
      if (joinDateEl && user.joinDate) {
        joinDateEl.value = new Date(user.joinDate).toISOString().slice(0, 10);
      }

      const isPartTimeEl = document.getElementById('editIsPartTime');
      if (isPartTimeEl) {
        isPartTimeEl.value = user.isPartTime ? "1" : "0";
      }

      const defaultStartTimeEl = document.getElementById('defaultStartTime');
      if (defaultStartTimeEl) {
        defaultStartTimeEl.value = user.defaultStartTime || '';
      }

      const workingDaysContainer = document.getElementById('editWorkingDaysContainer');
      const workingDaysInput = document.getElementById('editWeeklyWorkingDays');
      if (workingDaysContainer && workingDaysInput) {
        if (user.isPartTime) {
          workingDaysContainer.style.display = 'block';
          workingDaysInput.value = user.weeklyWorkingDays || "1";
        } else {
          workingDaysContainer.style.display = 'none';
        }
      }

      const isShiftWorkerEl = document.getElementById('editIsShiftWorker');
      if (isShiftWorkerEl) {
        isShiftWorkerEl.value = user.isShiftWorker ? "1" : "0";
      }

      const monthlyShiftContainer = document.getElementById('monthlyShiftContainer');
      if (monthlyShiftContainer) {
        monthlyShiftContainer.style.display = user.isShiftWorker ? 'block' : 'none';
      }

      // ✅ Populate Display Fields
      const employmentTypeDisplayEl = document.getElementById('employmentTypeDisplay');
      if (employmentTypeDisplayEl) {
        employmentTypeDisplayEl.textContent = user.isPartTime ? 'Part-Time' : 'Full-Time';
      }

      const shiftWorkerDisplayEl = document.getElementById('shiftWorkerDisplay');
      if (shiftWorkerDisplayEl) {
        shiftWorkerDisplayEl.textContent = user.isShiftWorker ? 'Yes' : 'No';
      }

      return fetch('/api/sessions/all');
    })
    .then(res => res.json())
    .then(data => {
      const allRecords = data.filter(e => e.name === employeeName && e.checkIn && e.checkOut);
      window.allRecords = allRecords;
      window.employeeName = employeeName;

      populateYearMonthFilters(allRecords);
      renderLogTable(allRecords);
      setupMetaListeners(employeeId, employeeName);

      window.applyFilterAndRender = () => applyFilterAndRender(allRecords);

      return fetch(`/api/users/${encodeURIComponent(employeeName)}/leave-balance`);
    })
    .then(res => res.json())
    .then(data => {
      const leaveEl = document.getElementById('leaveBalance');
      if (leaveEl) leaveEl.textContent = data.formatted || '0d 0h';
    })
    .catch(err => {
      console.error('[Employee Load Error]', err);
      const leaveEl = document.getElementById('leaveBalance');
      if (leaveEl) leaveEl.textContent = '-';
    });
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

  if (yearSelect) {
    yearSelect.innerHTML = `<option value="">All Years</option>` +
      [...yearSet].sort((a, b) => b - a).map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.addEventListener('change', () => applyFilterAndRender(records));
  }

  if (monthSelect) {
    monthSelect.innerHTML = `<option value="">All Months</option>` +
      [...monthSet].sort((a, b) => a - b)
        .map(m => `<option value="${m}">${monthNames[m]}</option>`)
        .join('');
    monthSelect.addEventListener('change', () => applyFilterAndRender(records));
  }

  document.getElementById('startDate')?.addEventListener('change', () => applyFilterAndRender(records));
  document.getElementById('endDate')?.addEventListener('change', () => applyFilterAndRender(records));
}

function applyFilterAndRender(records) {
  const year = document.getElementById('yearFilter')?.value;
  const month = document.getElementById('monthFilter')?.value;
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

  renderLogTable(filtered, toLocalDatetimeString);
}
