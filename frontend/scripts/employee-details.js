// employee-details.js

import { toLocalDatetimeString, parseTimeString } from './utils-datetime.js';

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

    try {
      if (userIsShiftWorker) {
        const shiftRes = await fetch(`/api/shifts/${window.employeeId}/${yearMonth}`);
        const shiftData = await shiftRes.json();
        const shiftCode = shiftData?.shifts?.[shiftDay];
        const shiftStart = shiftTimes[shiftCode];
        if (shiftStart) {
          const [h, m] = shiftStart.split(':').map(Number);
          const expected = new Date(checkIn);
          expected.setHours(h, m, 0, 0);
          isLate = checkIn > expected;

          if (isLate) {
            const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
            const shiftStartMinutes = h * 60 + m;
            const lateMinutes = checkInMinutes - shiftStartMinutes;
            lateNote = `Late by ${lateMinutes}m`;
          }
        }
      } else if (userDefaultStartTime) {
    const defaultStartMinutes = parseTimeString(userDefaultStartTime);
      if (defaultStartMinutes !== null && !isNaN(defaultStartMinutes)) {
      const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
      isLate = checkInMinutes > defaultStartMinutes;
      console.log('Default Start:', userDefaultStartTime, '→', defaultStartMinutes);
      console.log('Check-in:', checkIn.toTimeString(), '→', checkInMinutes);
      console.log('Late?', isLate);
    } else {
        console.warn('⚠️ Failed to parse default start time:', userDefaultStartTime);
    }
  }

      const ci = checkIn.getHours() + checkIn.getMinutes() / 60;
      const co = checkOut.getHours() + checkOut.getMinutes() / 60;
      if (ci < 5) nightWorkMinutes += Math.min(5, co) * 60;
      if (co > 22) nightWorkMinutes += (co - Math.max(ci, 22)) * 60;

    } catch (err) {
      console.warn('[Lateness or Night Work check failed]', err);
    }

    if (isLate && userDefaultStartTime) {
      const defaultStartMinutes = parseTimeString(userDefaultStartTime);
      if (defaultStartMinutes !== null) {
        const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
        const lateMinutes = checkInMinutes - defaultStartMinutes;
        lateNote = ` 🚨 Late by ${lateMinutes}m`;
      }
    }

    const workedTime = entry.type === 'work'
      ? `${Math.floor(adjustedWorked / 60)}h ${adjustedWorked % 60}m${lateNote}`
      : '-';

    const overtimeMinutes = entry.type === 'work' ? Math.max(0, adjustedWorked - 480) : 0;
    const overtime = overtimeMinutes > 0 ? `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m` : '-';
    if (overtimeMinutes > 0) totalOvertimeMinutes += overtimeMinutes;

    const nightWork = nightWorkMinutes > 0 ? `${Math.floor(nightWorkMinutes / 60)}h ${nightWorkMinutes % 60}m` : '';

    const row = document.createElement('tr');
    if (isLate) {
    row.style.backgroundColor = '#ffe5e5'; // Light red background
    }
    row.innerHTML = `
      <td><input type="datetime-local" value="${toLocalDatetimeString(entry.checkIn)}" data-id="${entry._id}" data-type="checkIn" disabled></td>
      <td><input type="datetime-local" value="${toLocalDatetimeString(entry.checkOut)}" data-id="${entry._id}" data-type="checkOut" disabled></td>
      <td class="worked-cell">${workedTime}</td>
      <td class="overtime-cell">${overtime}</td>
      <td>
        <select data-id="${entry._id}" data-type="type" disabled>
          <option value="work" ${entry.type === 'work' ? 'selected' : ''}>work</option>
          <option value="leave" ${entry.type === 'leave' ? 'selected' : ''}>leave</option>
          <option value="unpaid" ${entry.type === 'unpaid' ? 'selected' : ''}>unpaid</option>
        </select>
      </td>
      <td>${nightWork}</td>
      <td>
        <button class="btn edit-btn" onclick="enableEdit('${entry._id}', this)">✏️ Edit</button>
        <button class="btn save-btn" onclick="saveSession('${entry._id}')" style="display:none;">📂 Save</button>
        <button class="btn delete-btn" onclick="deleteSession('${entry._id}')">🗑️ Delete</button>
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
      alert('✅ Session updated!');
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
