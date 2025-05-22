const SPL_SHIFTS = {
  weekday: [
    { label: "①", time: "08:30-17:30" },
    { label: "②", time: "12:00-21:00" },
    { label: "③", time: "13:30-22:30" },
    { label: "④", time: "22:30-08:30", night: true },
    { label: "⑤", time: "23:50-08:50", night: true }
  ],
  weekend: [
    { label: "①", time: "08:30-15:30" },
    { label: "②", time: "14:00-21:00" },
    { label: "③", time: "15:30-22:30" },
    { label: "④", time: "22:30-08:30", night: true },
    { label: "⑤", time: "23:50-08:50", night: true }
  ]
};

const DEFAULT_SHIFT = { time: "09:00-18:00" };

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getExpectedShifts(user, date = new Date()) {
  const dateStr = date.toISOString().split("T")[0];

  // 1. Manual override takes top priority
  if (user?.manualShifts?.[dateStr]) {
    return user.manualShifts[dateStr];
  }

  // 2. Custom weekly schedule
  if (user?.customSchedule) {
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayMap[date.getDay()];
    const schedule = user.customSchedule[today];
    if (schedule) return schedule;
  }

  // 3. Fixed default shift
  if (user?.defaultShift) return user.defaultShift;

  // 4. SPL department fallback
  if (user?.department === "SPL") {
    return isWeekend(date) ? SPL_SHIFTS.weekend : SPL_SHIFTS.weekday;
  }

  // 5. Global fallback
  return DEFAULT_SHIFT;
}

function calculateNightMinutes(startTime, endTime) {
  const NIGHT_START = 22 * 60; // 22:00
  const NIGHT_END = 5 * 60;    // 05:00 next day

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);

  let start = sH * 60 + sM;
  let end = eH * 60 + eM;

  // handle next-day shift
  const endsNextDay = end <= start;
  if (endsNextDay) end += 24 * 60;

  // Special rule: if shift ends at 22:30, only count 30 min as night work
  if (!endsNextDay && end === 22 * 60 + 30) {
    return 30;
  }

  let nightMinutes = 0;
  for (let t = start; t < end; t++) {
    const minuteOfDay = t % (24 * 60);
    if (minuteOfDay >= NIGHT_START || minuteOfDay < NIGHT_END) {
      nightMinutes++;
    }
  }

  return nightMinutes;
}

function getWorkMinutes(timeStr) {
  if (!timeStr || !timeStr.includes('-')) return 0;

  const [start, end] = timeStr.split('-');
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);

  let startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;

  // handle overnight shift
  if (endMin <= startMin) endMin += 24 * 60;

  return endMin - startMin;
}

export { getExpectedShifts, calculateNightMinutes, getWorkMinutes };
