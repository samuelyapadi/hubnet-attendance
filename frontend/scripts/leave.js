let currentEmployeeId = null;
let currentEmployeeName = null;

function renderLeaveTable(leaves) {
  const tbody = document.querySelector('#leaveTable tbody');
  tbody.innerHTML = '';

  leaves.forEach(leave => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${leave.name}</td>
      <td><input type="date" value="${leave.date.split('T')[0]}" data-id="${leave._id}" class="leave-date"></td>
      <td>
        <select data-id="${leave._id}" class="leave-type">
          ${["paid","unpaid","substitute","childcare","maternity","bereavement","summer","care","injury","other"].map(t => `<option value="${t}" ${leave.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" value="${leave.hours}" data-id="${leave._id}" class="leave-hours" style="width:60px;"></td>
      <td><input type="text" value="${leave.notes || ''}" data-id="${leave._id}" class="leave-notes"></td>
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
  const hours = parseFloat(document.getElementById('newLeaveHours').value || '0');
  const notes = document.getElementById('newLeaveNotes').value;

  if (!date || hours <= 0) {
    alert('Please provide a valid date and hours.');
    return;
  }

  const payload = { date, type, hours, notes };
  if (currentEmployeeName) payload.name = currentEmployeeName;

  fetch(`/api/leaves/${currentEmployeeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    // If paid leave, update employee balance
    if (type === 'paid') {
      fetch(`/api/leaves/balance/${currentEmployeeId}`, { method: 'PATCH' });
    }
    loadLeaveRecords();
  });
}

function updateLeaveRecord(id) {
  const date = document.querySelector(`.leave-date[data-id="${id}"]`).value;
  const type = document.querySelector(`.leave-type[data-id="${id}"]`).value;
  const hours = parseFloat(document.querySelector(`.leave-hours[data-id="${id}"]`).value || '0');
  const notes = document.querySelector(`.leave-notes[data-id="${id}"]`).value;

  fetch(`/api/leaves/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, type, hours, notes })
  }).then(() => loadLeaveRecords());
}

function deleteLeaveRecord(id) {
  if (!confirm('Delete this leave record?')) return;

  fetch(`/api/leaves/${id}`, {
    method: 'DELETE'
  }).then(() => loadLeaveRecords());
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
