// leaveCalculator.js

/**
 * Calculate paid leave days for full-time employees based on join date.
 * Follows rules from 就業規則.
 */
export function calculateFullTimeLeaveDays(joinDate, asOfDate = new Date()) {
  if (!joinDate) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((asOfDate - new Date(joinDate)) / msPerDay);
  const halfYear = 365 / 2;

  if (diffDays < halfYear) return 0;

  const fullYears = Math.floor(diffDays / 365);

  const leaveTable = [
    10, // 0.5 years (after 6 months)
    11, // 1.5 years
    12, // 2.5 years
    14, // 3.5 years
    16, // 4.5 years
    18, // 5.5 years
    20  // 6.5 years and above (max)
  ];

  return leaveTable[Math.min(fullYears, leaveTable.length - 1)];
}

/**
 * Format leave in days and hours (future support if hourly leave allowed).
 */
export function formatLeave(days = 0, hours = 0) {
  return `${days}d ${hours}h`;
}

/**
 * Get remaining leave formatted, based on join date only.
 * This does not deduct taken leave — should be handled elsewhere.
 */
export function getFormattedLeave(joinDate) {
  const days = calculateFullTimeLeaveDays(joinDate);
  return formatLeave(days, 0);
}
