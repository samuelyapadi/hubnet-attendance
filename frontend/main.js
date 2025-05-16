// main.js
import { fetchAndRenderAttendance } from './attendance.js';
import { fetchAndRenderEmployees } from './employees.js';

window.showTab = function(tabId) {
  document.querySelectorAll('.tab-section').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');

  if (tabId === 'attendanceTab') {
    fetchAndRenderAttendance();
  } else if (tabId === 'employeesTab') {
    fetchAndRenderEmployees();
  }
};

window.onload = () => {
  fetchAndRenderAttendance();
  fetchAndRenderEmployees();
};
