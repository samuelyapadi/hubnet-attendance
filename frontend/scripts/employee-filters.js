// employee-filters.js

export function populateYearMonthFilters(records) {
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

  yearSelect.innerHTML = `<option value="">All Years</option>` +
    [...yearSet].sort((a, b) => b - a).map(y => `<option value="${y}">${y}</option>`).join('');

  monthSelect.innerHTML = `<option value="">All Months</option>` +
    [...monthSet].sort((a, b) => a - b)
      .map(m => `<option value="${m}">${monthNames[m]}</option>`)
      .join('');

  yearSelect.addEventListener('change', applyFilterAndRender);
  monthSelect.addEventListener('change', applyFilterAndRender);
  document.getElementById('startDate')?.addEventListener('change', applyFilterAndRender);
  document.getElementById('endDate')?.addEventListener('change', applyFilterAndRender);
}

export function applyFilterAndRender() {
  const year = document.getElementById('yearFilter').value;
  const month = document.getElementById('monthFilter').value;
  const startDateVal = document.getElementById('startDate')?.value;
  const endDateVal = document.getElementById('endDate')?.value;
  const startDate = startDateVal ? new Date(startDateVal) : null;
  const endDate = endDateVal ? new Date(new Date(endDateVal).setHours(23, 59, 59, 999)) : null;

  const filtered = allRecords.filter(entry => {
    const d = new Date(entry.checkIn);
    const matchYear = !year || d.getFullYear().toString() === year;
    const matchMonth = month === '' || d.getMonth().toString() === month;
    const matchStart = !startDate || d >= startDate;
    const matchEnd = !endDate || d <= endDate;
    return matchYear && matchMonth && matchStart && matchEnd;
  });

  renderLogTable(filtered);
}

export function resetFilters() {
  document.getElementById('yearFilter').value = '';
  document.getElementById('monthFilter').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  applyFilterAndRender();
}
