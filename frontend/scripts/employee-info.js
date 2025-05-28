// employee-info.js

export function saveEmployeeInfo() {
  if (!employeeId) return alert('❌ Employee ID not loaded.');

  const joinDate = document.getElementById('editJoinDate').value;
  const isPartTime = document.getElementById('editIsPartTime').value === '1';
  const isShiftWorker = document.getElementById('editIsShiftWorker').value === '1';
  const weeklyWorkingDays = isPartTime ? Number(document.getElementById('editWeeklyWorkingDays').value) : 5;
  const defaultStartTime = document.getElementById('defaultStartTime').value;

  fetch(`/api/users/${employeeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ joinDate, isPartTime, weeklyWorkingDays, isShiftWorker, defaultStartTime })
  })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        alert('✅ Employment info updated.');
        location.reload();
      } else {
        alert('❌ Failed to update.');
      }
    })
    .catch(err => {
      console.error('[Update Error]', err);
      alert('❌ Update request failed.');
    });
}

export function saveMonthlyShift() {
  if (!employeeId) return alert('❌ User ID missing');
  const month = document.getElementById('shiftMonth').value;
  if (!month) return alert('❌ Please select a month');

  const shifts = {
    Mon: document.getElementById('shiftMon').value,
    Tue: document.getElementById('shiftTue').value,
    Wed: document.getElementById('shiftWed').value,
    Thu: document.getElementById('shiftThu').value,
    Fri: document.getElementById('shiftFri').value,
    Sat: document.getElementById('shiftSat').value,
    Sun: document.getElementById('shiftSun').value
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
      } else {
        alert('❌ Failed to save shift pattern.');
      }
    })
    .catch(err => {
      console.error('[SHIFT SAVE ERROR]', err);
      alert('❌ Server error.');
    });
}

document.getElementById('editIsShiftWorker')?.addEventListener('change', () => {
  const isShift = document.getElementById('editIsShiftWorker').value === '1';
  document.getElementById('monthlyShiftContainer').style.display = isShift ? 'block' : 'none';
});
