// employee-details.js

import { toLocalDatetimeString, parseTimeString } from './utils-datetime.js';
import { employeeDetailsLang } from './employee-details.lang.js';
import { registerTranslations, applyTranslations, translate } from './lang.js'; 

function formatToHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export async function renderLogTable(records) {
  const userDefaultStartTime = window.userDefaultStartTime || null;
  const userIsShiftWorker = window.userIsShiftWorker || false;
  console.log('[Render] userDefaultStartTime =', userDefaultStartTime);

  const tbody = document.getElementById('logTable');
  tbody.innerHTML = '';
  document.getElementById('sessionCount').textContent = records.length;

  let totalOvertimeMinutes = 0;
  const shiftTimes = {
    '1': '08:30',
    '2': '12:00',
    '3': '13:30',
    '4': '22:30',
    '5': '23:50'
  };

  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const rowPromises = records.map(async entry => {
    const checkIn = new Date(entry.checkIn);
    const checkOut = new Date(entry.checkOut);
    const workedMs = checkOut - checkIn;
    const totalMinutes = Math.max(0, Math.round(workedMs / 60000));
    const adjustedWorked = totalMinutes > 360 ? totalMinutes - 60 : totalMinutes;

    const sessionDate = new Date(entry.checkIn);
    const yearMonth = sessionDate.toISOString().slice(0, 7);
    const weekDayIndex = sessionDate.getDay();
    const shiftDay = dayMap[weekDayIndex];

    let isLate = false;
    let nightWorkMinutes = 0;
    let lateNote = '';
    let lateMinutes = 0;

    try {
if (userIsShiftWorker) {
  const shiftRes = await fetch(`/api/shifts/${window.employeeId}/${yearMonth}`);
  const shiftData = await shiftRes.json();

  // Map current and possibly previous day if check-in is early morning
  const checkInHour = checkIn.getHours();
  let shiftDayKey = shiftDay;
  let shiftCode = shiftData?.shifts?.[shiftDayKey];

  if (!shiftCode && checkInHour < 5) {
    // Try previous day
    const prevDayIndex = (weekDayIndex + 6) % 7; // wrap around
    const prevDay = dayMap[prevDayIndex];
    shiftDayKey = prevDay;
    shiftCode = shiftData?.shifts?.[shiftDayKey];
  }

  const shiftStart = shiftTimes[shiftCode];
  if (shiftStart) {
    const [h, m] = shiftStart.split(':').map(Number);
    const expected = new Date(checkIn);
    expected.setHours(h, m, 0, 0);

    // If shift is late-night (22:00 or later) and check-in hour is past midnight
    if (h >= 22 && checkInHour < 5) {
      expected.setDate(expected.getDate() - 1); // Roll back expected to previous day
    }

    isLate = checkIn > expected;

    if (isLate) {
      const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
      const shiftStartMinutes = h * 60 + m;
      let lateMinutes = checkInMinutes - shiftStartMinutes;

      // If late past midnight, add 1440 mins (1 day) to shift time for proper diff
      if (lateMinutes < 0) lateMinutes += 1440;

      lateNote = ' ' + translate('lateNotice', 'employee-details').replace('{min}', lateMinutes);
    }
  }
} else if (userDefaultStartTime) {
  const defaultStartMinutes = parseTimeString(userDefaultStartTime);
  if (defaultStartMinutes !== null && !isNaN(defaultStartMinutes)) {
    const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
    isLate = checkInMinutes > defaultStartMinutes;
    if (isLate) {
      lateMinutes = checkInMinutes - defaultStartMinutes;
      lateNote = ' ' + translate('lateNotice', 'employee-details').replace('{min}', lateMinutes);
    }
    console.log('Default Start:', userDefaultStartTime, '→', defaultStartMinutes);
    console.log('Check-in:', checkIn.toTimeString(), '→', checkInMinutes);
    console.log('Late?', isLate);
  } else {
    console.warn('⚠️ Failed to parse default start time:', userDefaultStartTime);
  }
}

    function calculateNightWorkMinutes(start, end) {
      let total = 0;
      const step = 1000 * 60; // 1 minute

      for (let t = new Date(start); t < end; t = new Date(t.getTime() + step)) {
        const hour = t.getHours();
        if (hour >= 22 || hour < 5) {
          total++;
        }
      }
      return total;
    }

nightWorkMinutes = calculateNightWorkMinutes(checkIn, checkOut);


    } catch (err) {
      console.warn('[Lateness or Night Work check failed]', err);
    }

    if (isLate && userDefaultStartTime) {
      const defaultStartMinutes = parseTimeString(userDefaultStartTime);
      if (defaultStartMinutes !== null) {
        const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
        const lateMinutes = checkInMinutes - defaultStartMinutes;
        lateNote = ' ' + translate('lateNotice', 'employee-details').replace('{min}', lateMinutes);
      }
    }

    const workedTime = entry.type === 'work'
      ? `${formatToHHMM(adjustedWorked)}${lateNote}`
      : '-';

    const overtimeMinutes = entry.type === 'work' ? Math.max(0, adjustedWorked - 480) : 0;
    const overtime = overtimeMinutes > 0 ? formatToHHMM(overtimeMinutes) : '-';

    if (overtimeMinutes > 0) totalOvertimeMinutes += overtimeMinutes;

    const nightWork = nightWorkMinutes > 0 ? formatToHHMM(nightWorkMinutes) : '';

    entry.workedHours = formatToHHMM(adjustedWorked);
    entry.overtimeHours = formatToHHMM(overtimeMinutes);
    entry.nightHours = formatToHHMM(nightWorkMinutes);
    entry.lateMinutes = isLate ? formatToHHMM(lateMinutes) : '';

    const row = document.createElement('tr');
    if (isLate && nightWorkMinutes > 0) {
      row.style.backgroundColor = '#f0e5ff'; // Light purple = both late + night
    } else if (isLate) {
      row.style.backgroundColor = '#ffe5e5'; // Light red = late only
    } else if (nightWorkMinutes > 0) {
      row.style.backgroundColor = '#e5f0ff'; // Light blue = night work only
    }

    row.innerHTML = `
      <td><input type="datetime-local" value="${toLocalDatetimeString(entry.checkIn)}" data-id="${entry._id}" data-type="checkIn" disabled></td>
      <td><input type="datetime-local" value="${toLocalDatetimeString(entry.checkOut)}" data-id="${entry._id}" data-type="checkOut" disabled></td>
      <td class="worked-cell">${workedTime}</td>
      <td class="overtime-cell">${overtime}</td>
      <td>
        <select data-id="${entry._id}" data-type="type" disabled>
          <option value="work" ${entry.type === 'work' ? 'selected' : ''}>${translate('work', 'employee-details')}</option>
          <option value="leave" ${entry.type === 'leave' ? 'selected' : ''}>${translate('paidLeave', 'employee-details')}</option>
          <option value="unpaid" ${entry.type === 'unpaid' ? 'selected' : ''}>${translate('unpaidLeave', 'employee-details')}</option>
        </select>
      </td>
      <td>${nightWork}</td>
      <td>
        <button class="btn edit-btn" onclick="enableEdit('${entry._id}', this)">✏️ ${translate('edit', 'employees')}</button>
        <button class="btn save-btn" onclick="saveSession('${entry._id}')" style="display:none;">📂 ${translate('save', 'employees')}</button>
        <button class="btn delete-btn" onclick="deleteSession('${entry._id}')">🗑️ ${translate('delete', 'employees')}</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  await Promise.all(rowPromises);

  const totalOvertime = `${Math.floor(totalOvertimeMinutes / 60)}h ${totalOvertimeMinutes % 60}m`;
  document.getElementById('overtimeCount').textContent = totalOvertime;
}

export function enableEdit(sessionId, button) {
  const row = button.closest('tr');
  row.querySelectorAll('input, select').forEach(input => input.disabled = false);
  row.querySelector('.save-btn').style.display = 'inline-flex';
  button.style.display = 'none';
}

export async function saveSession(sessionId) {
  const checkInInput = document.querySelector(`input[data-id='${sessionId}'][data-type='checkIn']`);
  const checkOutInput = document.querySelector(`input[data-id='${sessionId}'][data-type='checkOut']`);
  const typeSelect = document.querySelector(`select[data-id='${sessionId}'][data-type='type']`);
  const row = checkInInput.closest('tr');

  const checkInDate = new Date(checkInInput.value);
  const checkOutDate = new Date(checkOutInput.value);
  let lateMinutes = 0;
  if (!userIsShiftWorker && userDefaultStartTime) {
  const defaultStartMinutes = parseTimeString(userDefaultStartTime);
  const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  lateMinutes = Math.max(0, checkInMinutes - defaultStartMinutes);
  }

  const body = {
    checkIn: checkInDate.toISOString(),
    checkOut: checkOutDate.toISOString(),
    type: typeSelect.value,
    lateMinutes
  };

  try {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.success) {
    alert(translate('sessionUpdated', 'employee-details'));
      // Update the display values directly without full re-render
      const durationMs = checkOutDate - checkInDate;
      const minutes = Math.max(0, Math.round(durationMs / 60000));
      const adjusted = minutes > 360 ? minutes - 60 : minutes;

      const workedText = body.type === 'work' ? `${Math.floor(adjusted / 60)}h ${adjusted % 60}m` : '-';
      const overtimeMinutes = body.type === 'work' ? Math.max(0, adjusted - 480) : 0;
      const overtimeText = overtimeMinutes > 0 ? `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m` : '-';

      row.querySelector('.worked-cell').textContent = workedText;
      row.querySelector('.overtime-cell').textContent = overtimeText;

      checkInInput.disabled = true;
      checkOutInput.disabled = true;
      typeSelect.disabled = true;
      row.querySelector('.save-btn').style.display = 'none';
      row.querySelector('.edit-btn').style.display = 'inline-flex';
    } else {
      alert('❌ Failed to update session.');
    }
  } catch (err) {
    console.error('Session update error:', err);
    alert('❌ Request failed.');
  }
}

export async function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      const result = await res.json();
  if (result.success) {
    alert('🗑️ Session deleted.');

    const refreshed = await fetch('/api/sessions/all').then(res => res.json());
    window.allRecords = refreshed.filter(
    e => e.name === window.employeeName && e.checkIn && e.checkOut
  );

    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthFilter').value;
    const startDateVal = document.getElementById('startDate')?.value;
    const endDateVal = document.getElementById('endDate')?.value;
    const startDate = startDateVal ? new Date(startDateVal) : null;
    const endDate = endDateVal ? new Date(new Date(endDateVal).setHours(23, 59, 59, 999)) : null;

    const filtered = window.allRecords.filter(entry => {
    const d = new Date(entry.checkIn);
    const matchYear = !year || d.getFullYear().toString() === year;
    const matchMonth = month === '' || d.getMonth().toString() === month;
    const matchStart = !startDate || d >= startDate;
    const matchEnd = !endDate || d <= endDate;
    return matchYear && matchMonth && matchStart && matchEnd;
  });
  renderLogTable(filtered);
}
 else {
      alert('❌ Failed to delete session.');
    }
  } catch (err) {
    console.error('Session delete error:', err);
    alert('❌ Request failed.');
  }
}

// Expose for inline HTML handlers
window.enableEdit = enableEdit;
window.saveSession = saveSession;
window.deleteSession = deleteSession;

document.getElementById('createSessionBtn')?.addEventListener('click', async () => {
  const type = document.getElementById('sessionType').value;
  const checkInStr = document.getElementById('manualCheckIn').value;
  const checkOutStr = document.getElementById('manualCheckOut').value;

  if (!checkInStr || !checkOutStr) {
    alert('⛔ Please fill in both check-in and check-out times.');
    return;
  }

  const checkIn = new Date(checkInStr);
  const checkOut = new Date(checkOutStr);

  if (isNaN(checkIn) || isNaN(checkOut)) {
    alert('❌ Invalid date input.');
    return;
  }

  if (checkOut <= checkIn) {
    alert('⚠️ Check-out must be after check-in.');
    return;
  }

  const durationMs = checkOut - checkIn;
  const hoursUsed = type !== 'work' ? Math.round((durationMs / 3600000) * 2) / 2 : 0;

  const body = {
    name: window.employeeName,
    employeeId: window.employeeId,
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    type,
    hoursUsed
  };

  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();

  if (result.success) {
    alert('✅ Session created.');
    const refreshed = await fetch('/api/sessions/all').then(res => res.json());
    window.allRecords = refreshed.filter(e => e.name === window.employeeName && e.checkIn && e.checkOut);
    renderLogTable(window.allRecords);

    // auto-clear form fields
    document.getElementById('manualCheckIn').value = '';
    document.getElementById('manualCheckOut').value = '';
    document.getElementById('sessionType').value = 'work';
  } else {
      alert('❌ Failed to create session.');
    }
  } catch (err) {
    console.error('Create session error:', err);
    alert('❌ Request failed.');
  }
});

document.getElementById('openCreateSessionModal')?.addEventListener('click', () => {
  document.getElementById('createSessionModal').style.display = 'block';
});

window.analyzeAndRenderSessions = () => {
  renderLogTable(window.allRecords);
};

document.getElementById('exportExcelBtn')?.addEventListener('click', async () => {
  if (!window.allRecords || window.allRecords.length === 0) {
    return alert('⚠️ No records to export.');
  }

  const lang = localStorage.getItem('lang') || 'en';

  try {
    const res = await fetch('/api/export-employee-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: window.employeeName,
        records: window.allRecords,
        lang
      })
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${window.employeeName}_attendance.xlsx`;
    a.click();
  } catch (err) {
    console.error('[Export Error]', err);
    alert('❌ Export failed.');
  }
});

registerTranslations('employee-details', employeeDetailsLang);
applyTranslations("employee-details");