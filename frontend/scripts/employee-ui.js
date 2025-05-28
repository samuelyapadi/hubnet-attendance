// employee-ui.js

export function populateUserUI(user) {
  if (!user) return;

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
}

export function fetchAndDisplayLeaveBalance(employeeName) {
  fetch(`/api/users/${encodeURIComponent(employeeName)}/leave-balance`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('leaveBalance').textContent = data.formatted || '0d 0h';
    })
    .catch(err => {
      console.error('[Leave Balance Fetch Error]', err);
      document.getElementById('leaveBalance').textContent = '-';
    });
}

export function toggleShiftPatternVisibility() {
  const isShift = document.getElementById('editIsShiftWorker').value === '1';
  document.getElementById('monthlyShiftContainer').style.display = isShift ? 'block' : 'none';
}
