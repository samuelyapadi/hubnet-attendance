let currentEmployeeId = null;
let currentEmployeeName = null;

function renderLeaveTable(leaves) {
  const tbody = document.querySelector('#leaveTable tbody');
  tbody.innerHTML = '';

  leaves.forEach(leave => {
    const displayValue = leave.hours % 1 === 0 ? `${leave.hours / 8}d` : `${leave.hours}h`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="date" value="${leave.date.split('T')[0]}" data-id="${leave._id}" class="leave-date"></td>
      <td>
        <select data-id="${leave._id}" class="leave-type">
          ${["paid","unpaid","substitute","childcare","maternity","bereavement","summer","care","injury","other"].map(t => `<option value="${t}" ${leave.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" value="${displayValue}" data-id="${leave._id}" class="leave-hours" style="width:60px;"></td>
      <td><input type="text" value="${leave.notes || ''}" data-id="${leave._id}" class="leave-notes" style="width: 100%;"></td>
      <td>
        <button class="btn save-leave" data-id="${leave._id}">💾</button>
        <button class="btn delete-leave" data-id="${leave._id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function loadLeaveRecords() {
  if (!currentEmployeeId) return;
  const typeFilter = document.getElementById('leaveTypeFilter')?.value;
  const monthFilter = document.getElementById('leaveFilterMonth')?.value;

  let url = `/api/leaves/${currentEmployeeId}`;
  if (monthFilter || typeFilter) {
    const query = new URLSearchParams();
    if (monthFilter) query.append('month', monthFilter);
    if (typeFilter) query.append('type', typeFilter);
    url += '?' + query.toString();
  }

  fetch(url)
    .then(res => res.json())
    .then(data => renderLeaveTable(data));
}

function createLeaveRecord() {
  const date = document.getElementById('newLeaveDate').value;
  const type = document.getElementById('newLeaveType').value;
  const notes = document.getElementById('newLeaveNotes').value;
  const isHourly = document.getElementById('isHourly')?.checked;
  const inputValue = parseFloat(document.getElementById('newLeaveDuration').value || '0');
  const hours = isHourly ? inputValue : inputValue * 8;

  if (!date || hours <= 0) {
    alert('Please provide a valid date and duration.');
    return;
  }

  const leaveDate = new Date(date);
  const month = leaveDate.getMonth();
  const year = leaveDate.getFullYear();
  const now = new Date();

  if (type === 'summer') {
    if (month < 6 || month > 8) {
      alert('Summer vacation can only be taken from July to September.');
      return;
    }

    fetch(`/api/leaves/${currentEmployeeId}?type=summer&year=${year}`)
      .then(res => res.json())
      .then(records => {
        const totalSummerHours = records.reduce((sum, l) => sum + (l.hours || 0), 0);
        if (totalSummerHours + hours > 24) {
          alert('Limit exceeded: only 3 days (24h) of summer vacation allowed per year.');
          return;
        }
        postLeave(date, type, hours, notes);
      });
  } else {
    postLeave(date, type, hours, notes);
  }
}

function postLeave(date, type, hours, notes) {
  const payload = { date, type, hours, notes };
  if (currentEmployeeName) payload.name = currentEmployeeName;

  fetch(`/api/leaves/${currentEmployeeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    if (type === 'paid') {
      fetch(`/api/leaves/balance/${currentEmployeeId}`, { method: 'PATCH' });
    }
    loadLeaveRecords();
  });
}

function updateLeaveRecord(id) {
  const date = document.querySelector(`.leave-date[data-id="${id}"]`).value;
  const type = document.querySelector(`.leave-type[data-id="${id}"]`).value;
  const rawHours = document.querySelector(`.leave-hours[data-id="${id}"]`).value;
  const hours = rawHours.includes('h') ? parseFloat(rawHours) : parseFloat(rawHours) * 8;
  const notes = document.querySelector(`.leave-notes[data-id="${id}"]`).value;

  const leaveDate = new Date(date);
  const month = leaveDate.getMonth();

  if (type === 'summer' && (month < 6 || month > 8)) {
    alert('Summer vacation can only be taken from July to September.');
    return;
  }

  fetch(`/api/leaves/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, type, hours, notes })
  }).then(() => loadLeaveRecords());
}

function deleteLeaveRecord(id) {
  if (!confirm('Delete this leave record?')) return;
  fetch(`/api/leaves/${id}`, { method: 'DELETE' }).then(() => loadLeaveRecords());
}

// 🟢 Event Listeners
document.getElementById('addLeaveBtn').addEventListener('click', createLeaveRecord);
document.getElementById('filterLeaveBtn')?.addEventListener('click', loadLeaveRecords);

document.querySelector('#leaveTable tbody').addEventListener('click', (e) => {
  if (e.target.classList.contains('save-leave')) {
    updateLeaveRecord(e.target.dataset.id);
  } else if (e.target.classList.contains('delete-leave')) {
    deleteLeaveRecord(e.target.dataset.id);
  }
});

// 🔁 On Load
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentEmployeeId = params.get('id') || localStorage.getItem('currentEmployeeId');
  currentEmployeeName = params.get('name') || localStorage.getItem('currentEmployeeName');

  const nameInput = document.getElementById('leaveFilterName');
  if (nameInput && currentEmployeeName) {
    nameInput.value = currentEmployeeName;
    nameInput.disabled = true;
  }

  const nameHeader = document.getElementById('employeeLeaveHeader');
  if (nameHeader && currentEmployeeName) {
    nameHeader.textContent = `${currentEmployeeName}'s Leave Records`;
  }

  const nameInputForm = document.getElementById('newLeaveName');
  if (nameInputForm && currentEmployeeName) {
    nameInputForm.value = currentEmployeeName;
    nameInputForm.style.display = 'none';
  }

  const backBtn = document.getElementById('backToLogsBtn');
  if (backBtn && currentEmployeeId && currentEmployeeName) {
    backBtn.href = `employee-details.html?id=${currentEmployeeId}&name=${encodeURIComponent(currentEmployeeName)}`;
  }

  if (!currentEmployeeId) {
    alert('No employee ID provided');
    return;
  }

  loadLeaveRecords();
});
