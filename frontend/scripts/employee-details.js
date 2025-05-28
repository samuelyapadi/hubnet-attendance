// employee-details.js
import { toLocalDatetimeString, toISOStringLocal } from './utils-datetime.js';


let userDefaultStartTime = null;
let userIsShiftWorker = false;

export function renderLogTable(records) {
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

  records.forEach(async entry => {
    const checkIn = new Date(entry.checkIn);
    const checkOut = new Date(entry.checkOut);
    const workedMs = checkOut - checkIn;
    const totalMinutes = Math.max(0, Math.round(workedMs / 60000));
    const adjustedWorked = totalMinutes > 360 ? totalMinutes - 60 : totalMinutes;

    const sessionDate = new Date(entry.checkIn);
    const yearMonth = sessionDate.toISOString().slice(0, 7);
    const weekDayIndex = sessionDate.getDay();
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const shiftDay = dayMap[weekDayIndex];

    let isLate = false;
    let nightWorkMinutes = 0;

    try {
      if (userIsShiftWorker) {
        const shiftRes = await fetch(`/api/shifts/${employeeId}/${yearMonth}`);
        const shiftData = await shiftRes.json();
        const shiftCode = shiftData?.shifts?.[shiftDay];
        const shiftStart = shiftTimes[shiftCode];
        if (shiftStart) {
          const [h, m] = shiftStart.split(':').map(Number);
          const expected = new Date(checkIn);
          expected.setHours(h, m, 0, 0);
          isLate = checkIn > expected;
        }
      } else if (userDefaultStartTime) {
        const [h, m] = userDefaultStartTime.split(':').map(Number);
        const expected = new Date(checkIn);
        expected.setHours(h, m, 0, 0);
        isLate = checkIn > expected;
      }

      const ci = checkIn.getHours() + checkIn.getMinutes() / 60;
      const co = checkOut.getHours() + checkOut.getMinutes() / 60;
      if (ci < 5) nightWorkMinutes += Math.min(5, co) * 60;
      if (co > 22) nightWorkMinutes += (co - Math.max(ci, 22)) * 60;

    } catch (err) {
      console.warn('[Lateness or Night Work check failed]', err);
    }

    const workedTime = entry.type === 'work'
      ? `${Math.floor(adjustedWorked / 60)}h ${adjustedWorked % 60}m${isLate ? ' 🚨 Late' : ''}`
      : '-';

    const overtimeMinutes = entry.type === 'work' ? Math.max(0, adjustedWorked - 480) : 0;
    const overtime = overtimeMinutes > 0 ? `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m` : '-';
    if (overtimeMinutes > 0) totalOvertimeMinutes += overtimeMinutes;

    const nightWork = nightWorkMinutes > 0 ? `${Math.floor(nightWorkMinutes / 60)}h ${nightWorkMinutes % 60}m` : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="datetime-local" value="${toLocalDatetimeString(entry.checkIn)}" data-id="${entry._id}" data-type="checkIn" disabled></td>
      <td><input type="datetime-local" value="${toLocalDatetimeString(entry.checkOut)}" data-id="${entry._id}" data-type="checkOut" disabled></td>
      <td>${workedTime}</td>
      <td>${overtime}</td>
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

  const body = {
    checkIn: toISOStringLocal(checkInInput.value),
    checkOut: toISOStringLocal(checkOutInput.value),
    type: typeSelect.value
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
      const refreshed = await fetch('/api/sessions/all').then(res => res.json());
      allRecords = refreshed.filter(e => e.name === employeeName && e.checkIn && e.checkOut);
      applyFilterAndRender();
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
      allRecords = refreshed.filter(e => e.name === employeeName && e.checkIn && e.checkOut);
      applyFilterAndRender();
    } else {
      alert('❌ Failed to delete session.');
    }
  } catch (err) {
    console.error('Session delete error:', err);
    alert('❌ Request failed.');
  }
}
