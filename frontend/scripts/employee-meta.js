// employee-meta.js
import { toLocalDatetimeString, toISOStringLocal } from './utils-datetime.js';

export function setupMetaListeners(employeeId, employeeName) {
  const shiftSelect = document.getElementById('editIsShiftWorker');
  if (shiftSelect) {
    shiftSelect.addEventListener('change', () => {
      const isShift = shiftSelect.value === '1';
      const container = document.getElementById('monthlyShiftContainer');
      if (container) container.style.display = isShift ? 'block' : 'none';
    });
  }

  const shiftMonth = document.getElementById('shiftMonth');
  if (shiftMonth) {
    shiftMonth.addEventListener('change', () => {
      const month = shiftMonth.value;
      if (!employeeId || !month) return;

      fetch(`/api/shifts/${employeeId}/${month}`)
        .then(res => res.json())
        .then(data => {
          if (!data?.shifts) return;
          const dayFields = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          dayFields.forEach(day => {
            const input = document.getElementById(`shift${day}`);
            if (input) input.value = data.shifts[day] || '';
          });
        });
    });
  }

  const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');
  if (saveEmployeeBtn) {
    saveEmployeeBtn.addEventListener('click', () => {
      saveEmployeeInfo(employeeId, employeeName);
    });
  }

  const saveShiftBtn = document.getElementById('saveShiftBtn');
  if (saveShiftBtn) {
    saveShiftBtn.addEventListener('click', () => {
      saveMonthlyShift(employeeId);
    });
  }
}

function saveEmployeeInfo(employeeId, employeeName) {
  const joinDate = document.getElementById('editJoinDate')?.value;
  const isPartTime = document.getElementById('editIsPartTime')?.value === '1';
  const isShiftWorker = document.getElementById('editIsShiftWorker')?.value === '1';
  const weeklyWorkingDays = isPartTime ? Number(document.getElementById('editWeeklyWorkingDays')?.value) || 1 : 5;
  const defaultStartTime = document.getElementById('defaultStartTime')?.value;

  fetch(`/api/users/${employeeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ joinDate, isPartTime, weeklyWorkingDays, isShiftWorker, defaultStartTime })
  })
    .then(res => res.json())
    .then(result => {
      if (!result.success) throw new Error('Failed to update employee info');
      alert('✅ Employment info updated.');
      return fetch(`/api/users/${employeeId}`);
    })
    .then(res => res.json())
    .then(updatedUser => {
      document.getElementById('employmentTypeDisplay').textContent = updatedUser.isPartTime ? 'Part-Time' : 'Full-Time';
      document.getElementById('shiftWorkerDisplay').textContent = updatedUser.isShiftWorker ? 'Yes' : 'No';

      const workingDaysContainer = document.getElementById('editWorkingDaysContainer');
      const workingDaysInput = document.getElementById('editWeeklyWorkingDays');

      if (updatedUser.isPartTime) {
        workingDaysContainer.style.display = 'block';
        if (workingDaysInput) workingDaysInput.value = updatedUser.weeklyWorkingDays || '1';
      } else {
        workingDaysContainer.style.display = 'none';
      }

      document.getElementById('editIsPartTime').value = updatedUser.isPartTime ? '1' : '0';
      document.getElementById('editIsShiftWorker').value = updatedUser.isShiftWorker ? '1' : '0';
      document.getElementById('defaultStartTime').value = updatedUser.defaultStartTime || '';

      return fetch(`/api/users/${encodeURIComponent(employeeName)}/leave-balance`);
    })
    .then(res => res.json())
    .then(data => {
      const balanceEl = document.getElementById('leaveBalance');
      if (balanceEl) {
        balanceEl.textContent = data.formatted || '0d 0h';
      }
      if (typeof window.analyzeAndRenderSessions === 'function') {
        window.analyzeAndRenderSessions(window.allRecordsRaw || []);
      }
    })
    .catch(err => {
      console.error('[Update Error]', err);
      alert('❌ Update request failed.');
    });
}

function saveMonthlyShift(employeeId) {
  const month = document.getElementById('shiftMonth')?.value;
  if (!month) return alert('❌ Please select a month');

  const shifts = {
    Mon: document.getElementById('shiftMon')?.value,
    Tue: document.getElementById('shiftTue')?.value,
    Wed: document.getElementById('shiftWed')?.value,
    Thu: document.getElementById('shiftThu')?.value,
    Fri: document.getElementById('shiftFri')?.value,
    Sat: document.getElementById('shiftSat')?.value,
    Sun: document.getElementById('shiftSun')?.value
  };

  fetch(`/api/shifts/${employeeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, shifts })
  })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        alert('✅ Shift pattern saved!');
        if (typeof window.analyzeAndRenderSessions === 'function') {
          window.analyzeAndRenderSessions(window.allRecordsRaw || []);
        }
      } else {
        alert('❌ Failed to save shift pattern.');
      }
    })
    .catch(err => {
      console.error('[SHIFT SAVE ERROR]', err);
      alert('❌ Server error.');
    });
}
