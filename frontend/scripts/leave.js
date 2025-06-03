// leave.js

let currentEmployeeId = null;

function renderLeaveTable(leaves) {
  const tbody = document.querySelector('#leaveTable tbody');
  tbody.innerHTML = '';

  leaves.forEach(leave => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
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
  fetch(`/api/leaves/${currentEmployeeId}`)
    .then(res => res.json())
    .then(data => renderLeaveTable(data));
}

function createLeaveRecord() {
  const date = document.getElementById('leaveDate').value;
  const type = document.getElementById('leaveType').value;
  const hours = parseFloat(document.getElementById('leaveHours').value || '0');
  const notes = document.getElementById('leaveNotes').value;

  if (!date || hours <= 0) {
    alert('Please provide a valid date and hours.');
    return;
  }

  fetch(`/api/leaves/${currentEmployeeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, type, hours, notes })
  }).then(() => loadLeaveRecords());
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

document.querySelector('#leaveTable tbody').addEventListener('click', (e) => {
  if (e.target.classList.contains('save-leave')) {
    updateLeaveRecord(e.target.dataset.id);
  } else if (e.target.classList.contains('delete-leave')) {
    deleteLeaveRecord(e.target.dataset.id);
  }
});

// 🔁 On Load (assuming employeeId is passed via query param like ?id=xxxxx)
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  currentEmployeeId = params.get('id');
  if (!currentEmployeeId) {
    alert('No employee ID provided');
    return;
  }
  loadLeaveRecords();
});
