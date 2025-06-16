//api.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

function roundToTwoDecimals(mins) {
  return Math.round((mins / 60) * 100) / 100;
}

router.post('/admins/grant', async (req, res) => {
  const { userId, username, password } = req.body;
  if (!userId || !username || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const hash = await bcrypt.hash(password, 10);
    await Admin.findOneAndUpdate(
      { userId },
      { userId, username, password: hash },
      { upsert: true }
    );

    return res.json({ success: true, message: 'Admin granted' });
  } catch (err) {
    console.error('[GRANT ADMIN ERROR]', err.stack || err);
    res.status(500).json({ success: false, message: 'Server error', detail: err.message });
  }
});

// Reset admin password
router.patch('/admins/reset-password', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const admin = await Admin.findOneAndUpdate(
      { userId },
      { password: hash }
    );
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin login
router.post('/admins/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    res.json({ success: true });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function calculateLeaveEntitlement(user) {
  if (!user.joinDate || isNaN(new Date(user.joinDate))) return 0;

  const now = new Date();
  const joinDate = new Date(user.joinDate);
  const monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const fullYears = Math.floor(monthsWorked / 12);

  if (!user.isPartTime || user.weeklyWorkingDays >= 5) {
    const fullTimeTable = [10, 11, 12, 14, 16, 18, 20];
    const index = Math.max(0, Math.min(fullTimeTable.length - 1, fullYears));
    return fullTimeTable[index];
  } else {
    const partTimeTable = {
      4: [7, 8, 9, 10, 12, 13, 15],
      3: [5, 6, 6, 8, 9, 10, 11],
      2: [3, 4, 4, 5, 6, 6, 7],
      1: [1, 2, 2, 2, 3, 3, 3]
    };
    const row = partTimeTable[user.weeklyWorkingDays] || [];
    const index = Math.max(0, Math.min(row.length - 1, fullYears));
    return row[index] || 0;
  }
}

// Register face
router.post('/register', async (req, res) => {
  const { name, descriptors, snapshots, department, joinDate } = req.body;
    if (!joinDate || isNaN(Date.parse(joinDate))) {
      return res.status(400).json({ error: 'Invalid or missing join date.' });
    }
  try {
    const user = new User({ name, descriptors, snapshots, department, joinDate: new Date(joinDate) });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login with a single descriptor
router.post('/login', async (req, res) => {
  const { descriptor } = req.body;
  const threshold = 0.55;

  const euclideanDistance = (a, b) =>
    Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));

  try {
    const users = await User.find({});
    let bestMatch = null;
    let bestScore = Infinity;

    users.forEach(user => {
      user.descriptors.forEach(saved => {
        const score = euclideanDistance(descriptor, saved);
        if (score < threshold && score < bestScore) {
          bestScore = score;
          bestMatch = user;
        }
      });
    });

    let alreadyLoggedIn = false;

    if (bestMatch) {
      const openSession = await Attendance.findOne({
        name: bestMatch.name,
        sessionCompleted: false
      });

      if (openSession) {
        alreadyLoggedIn = true;
        console.warn(`[WARNING] ${bestMatch.name} already has an open session.`);
      } else {
        const session = new Attendance({
          name: bestMatch.name,
          checkIn: new Date(),
          sessionCompleted: false
        });

        await session.save();
      }
    }

    res.json({
      match: bestMatch?.name || null,
      score: bestScore,
      alreadyLoggedIn
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Log check-out
router.post('/logout', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  try {
    const session = await Attendance.findOne({
      name,
      sessionCompleted: false
    });

    if (!session) {
      return res.status(404).json({ error: 'No active session found.' });
    }

    session.checkOut = new Date();
    session.sessionCompleted = true;
    await session.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance check-in
router.post('/attendance', async (req, res) => {
  const { name } = req.body;
  console.log('[ATTENDANCE] Received:', name);

  if (!name) return res.status(400).json({ error: 'Name is required.' });

  try {
    const user = await User.findOne({ name });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const existing = await Attendance.findOne({
      name: user.name,
      sessionCompleted: false
    });

    if (existing) {
      console.warn(`[ATTENDANCE WARNING] ${user.name} already has an open session.`);
      return res.status(200).json({ warning: 'Already logged in.' });
    }

    const record = new Attendance({ name: user.name });
    await record.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[ATTENDANCE DB ERROR]', err);
    res.status(500).json({ error: 'Failed to save attendance.' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name department workHours overtime snapshots joinDate');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get remaining paid leave with 2-year expiry logic
router.get('/users/:name/leave-balance', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const joinDate = new Date(user.joinDate);

    const totalEntitledHours = getValidGrantedLeaveHours(user, now);

    const paidLeaveSessions = await Attendance.find({
      name: user.name,
      type: 'paid_leave',
      checkIn: { $exists: true },
      checkOut: { $exists: true }
    });

    const manualLeaves = await Leave.find({ userId: user._id, type: 'paid' });
    const manualHours = manualLeaves.reduce((sum, l) => sum + (l.hours || 0), 0);

    const hoursUsedRaw = paidLeaveSessions.reduce((sum, s) => {
      const ms = new Date(s.checkOut) - new Date(s.checkIn);
      return sum + Math.min(ms / 3600000, 8);
    }, 0);

    const hoursUsed = Math.round((hoursUsedRaw + manualHours + Number.EPSILON) * 2) / 2;
    const hoursRemaining = Math.max(0, totalEntitledHours - hoursUsed);
    const days = Math.floor(hoursRemaining / 8);
    const hours = Math.round((hoursRemaining % 8 + Number.EPSILON) * 2) / 2;

    res.json({
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      hoursUsed: Math.round(hoursUsed * 10) / 10,
      entitlementDays: Math.floor(totalEntitledHours / 8),
      formatted: `${days}d ${hours}h`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await Attendance.updateMany({ name: user.name }, { status: 'resigned' });
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE USER ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get active sessions
router.get('/sessions/active', async (req, res) => {
  try {
    const activeSessions = await Attendance.find({ sessionCompleted: false }).sort({ checkIn: -1 });
    res.json(activeSessions);
  } catch (err) {
    console.error('[SESSIONS/ACTIVE ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch active sessions.' });
  }
});

// Get all sessions
// ✅ Enhanced session export with overtime, night work, lateness
router.get('/sessions/all', async (req, res) => {
  try {
    const sessions = await Attendance.find({ checkIn: { $exists: true }, checkOut: { $exists: true } }).lean();

    const users = await User.find({});
    const userMap = {};
    users.forEach(u => userMap[u.name] = u);

    const toDecimalFormat = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}.${m.toString().padStart(2, '0')}`;
    };

    const enriched = sessions.map(s => {
      const checkIn = new Date(s.checkIn);
      const checkOut = new Date(s.checkOut);

      const durationMs = checkOut - checkIn;
      const totalMinutes = Math.floor(durationMs / 60000);
      const adjustedMinutes = totalMinutes > 360 ? totalMinutes - 60 : totalMinutes;

      const workedHours = toDecimalFormat(adjustedMinutes);
      const overtimeMinutes = Math.max(0, adjustedMinutes - 480);
      const overtimeHours = toDecimalFormat(overtimeMinutes);

      // Accurate night work calculation
    let nightMinutes = 0;
    for (let ts = checkIn.getTime(); ts < checkOut.getTime(); ts += 60000) {
      const hour = new Date(ts).getHours();
      if (hour >= 22 || hour < 5) nightMinutes++;
    }
      const nightHours = toDecimalFormat(nightMinutes);

    let user = userMap[s.employeeId?.toString()];
    if (!user) {
      user = users.find(u => u.name === s.name); // fallback if employeeId is missing
    }

    let lateMinutes = 0;

    if (typeof s.lateMinutes === 'number') {
      lateMinutes = s.lateMinutes;
    } else if (user?.defaultStartTime) {
      const [h, m] = user.defaultStartTime.split(':').map(Number);
      const expected = new Date(checkIn);
      expected.setHours(h, m, 0, 0);
      const diff = Math.round((checkIn - expected) / 60000);
      if (diff > 5) lateMinutes = diff;
    }

      return {
        ...s,
        workedHours,
        overtimeHours,
        nightHours,
        lateMinutes
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('[ENRICHED SESSIONS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch enriched sessions.' });
  }
});

// Update user department
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { department } = req.body;

  try {
    await User.findByIdAndUpdate(id, { department });
    res.json({ success: true });
  } catch (err) {
    console.error('[UPDATE USER ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update session details (final timezone fix + leave support)
router.patch('/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut, isOvertime, department, type, hoursUsed, lateMinutes } = req.body;

  try {
    const session = await Attendance.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const parseLocalDatetime = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      return isNaN(parsed) ? null : parsed;
    };

    const parsedCheckIn = parseLocalDatetime(checkIn);
    const parsedCheckOut = parseLocalDatetime(checkOut);

    if (parsedCheckIn) session.checkIn = parsedCheckIn;
    if (parsedCheckOut) session.checkOut = parsedCheckOut;
    if (typeof isOvertime === 'boolean') session.isOvertime = isOvertime;
    if (department) session.department = department;
    if (type) session.type = type;
    if (!isNaN(hoursUsed)) {
      session.hoursUsed = Number(hoursUsed);
    if (!isNaN(lateMinutes)){
      session.lateMinutes = Number(lateMinutes);
    }
    } else if (type !== 'work' && parsedCheckIn && parsedCheckOut) {
      const ms = parsedCheckOut - parsedCheckIn;
      session.hoursUsed = Math.round((ms / 3600000) * 2) / 2;
    }

    // ⏱ Adjust overtime calculation: 9 hours (8h work + 1h break) is normal
    if (type === 'work' && parsedCheckIn && parsedCheckOut) {
      const totalMinutes = Math.floor((parsedCheckOut - parsedCheckIn) / 60000);
      session.isOvertime = totalMinutes > 540; // 540 minutes = 9 hours
    }

    await session.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[SESSION UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user fields
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    department,
    joinDate,
    isPartTime,
    weeklyWorkingDays,
    isShiftWorker,
    defaultStartTime
  } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (typeof name === 'string') user.name = name;
    if (typeof department === 'string') user.department = department;

    if (joinDate && !isNaN(Date.parse(joinDate))) {
      user.joinDate = new Date(joinDate);
    }

    if (typeof isPartTime !== 'undefined') {
      user.isPartTime = isPartTime === true || isPartTime === 'true';
    }

    if (typeof weeklyWorkingDays !== 'undefined' && !isNaN(Number(weeklyWorkingDays))) {
      user.weeklyWorkingDays = Number(weeklyWorkingDays);
    }

    if (typeof isShiftWorker !== 'undefined') {
      user.isShiftWorker = isShiftWorker === true || isShiftWorker === 'true';
    }

    if (typeof defaultStartTime === 'string') {
      user.defaultStartTime = defaultStartTime;
    }

    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[UPDATE USER ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Create session (employee-details page)
router.post('/sessions', async (req, res) => {
  const { name, checkIn, checkOut, type = 'work' } = req.body;

  if (!name || !checkIn || !checkOut) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    const newSession = new Attendance({
      name,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      type,
      sessionCompleted: true,
      hoursUsed: type !== 'work' ? Math.round(((new Date(checkOut) - new Date(checkIn)) / 3600000) * 2) / 2 : 0
    });

    await newSession.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[CREATE SESSION ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Manual session input (admin panel)
router.post('/sessions/manual', async (req, res) => {
  const { name, checkIn, checkOut, type = 'work', hoursUsed = 0 } = req.body;

  if (!name || !checkIn || !checkOut) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  try {
    const session = new Attendance({
      name,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      sessionCompleted: true,
      type,
      hoursUsed: type !== 'work' ? Math.round(((new Date(checkOut) - new Date(checkIn)) / 3600000) * 2) / 2 : 0
    });

    await session.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[MANUAL SESSION ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Delete session by ID
router.delete('/sessions/:id', async (req, res) => {
  try {
    const result = await Attendance.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[SESSION DELETE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function calculateEntitlementDays(user, yearIndex) {
  if (!user.joinDate || isNaN(new Date(user.joinDate))) return 0;

  if (!user.isPartTime || user.weeklyWorkingDays >= 5) {
    const fullTimeTable = [10, 11, 12, 14, 16, 18, 20];
    const index = Math.max(0, Math.min(fullTimeTable.length - 1, yearIndex));
    return fullTimeTable[index];
  }

  const partTimeTable = {
    4: [7, 8, 9, 10, 12, 13, 15],
    3: [5, 6, 6, 8, 9, 10, 11],
    2: [3, 4, 4, 5, 6, 6, 7],
    1: [1, 2, 2, 2, 3, 3, 3]
  };
  const row = partTimeTable[user.weeklyWorkingDays] || [];
  const index = Math.max(0, Math.min(row.length - 1, yearIndex));
  return row[index] || 0;
}

// ✅ Batch fetch leave balances for all users
router.get('/leave-balance/all', async (req, res) => {
  try {
    const users = await User.find({});
    const now = new Date();
    const results = [];

    for (const user of users) {

    if (!user.joinDate) {
      results.push({
        name: user.name,
        hoursRemaining: 0,
        hoursUsed: 0,
        entitlementDays: 0,
        formatted: '0d 0h'
      });
      continue;
    }

    const totalEntitledHours = getValidGrantedLeaveHours(user, now);

      const paidLeaveSessions = await Attendance.find({
        name: user.name,
        type: 'paid_leave',
        checkIn: { $exists: true },
        checkOut: { $exists: true }
      });

      const manualLeaves = await Leave.find({ userId: user._id, type: 'paid' });
      const manualHours = manualLeaves.reduce((sum, l) => sum + (l.hours || 0), 0);

      const hoursUsedRaw = paidLeaveSessions.reduce((sum, s) => {
        const ms = new Date(s.checkOut) - new Date(s.checkIn);
        return sum + Math.min(ms / 3600000, 8);
      }, 0);

      const hoursUsed = Math.round((hoursUsedRaw + manualHours + Number.EPSILON) * 2) / 2;
      const hoursRemaining = Math.max(0, totalEntitledHours - hoursUsed);
      const days = Math.floor(hoursRemaining / 8);
      const hours = Math.round((hoursRemaining % 8 + Number.EPSILON) * 2) / 2;

      results.push({
        name: user.name,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        hoursUsed: Math.round(hoursUsed * 10) / 10,
        entitlementDays: Math.floor(totalEntitledHours / 8),
        formatted: `${days}d ${hours}h`
      });
    }

    res.json(results);
  } catch (err) {
    console.error('[LEAVE BALANCE ALL ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all leave records for a user
router.get('/leaves/:userId', async (req, res) => {
  try {
    const { month, type } = req.query;
    const query = { userId: req.params.userId };

    if (type) query.type = type;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      query.date = { $gte: start, $lt: end };
    }

    const records = await Leave.find(query).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new leave record
router.post('/leaves/:userId', async (req, res) => {
  const { type, hours, notes, date } = req.body;
  if (!type || !hours || !date) return res.status(400).json({ error: 'Missing fields' });

  try {
    const record = new Leave({
      userId: req.params.userId,
      type,
      hours,
      notes,
      date: new Date(date)
    });
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit an existing leave
router.patch('/leaves/:leaveId', async (req, res) => {
  const { type, hours, notes, date } = req.body;
  try {
    const record = await Leave.findById(req.params.leaveId);
    if (!record) return res.status(404).json({ error: 'Leave not found' });

    if (type) record.type = type;
    if (!isNaN(hours)) record.hours = hours;
    if (notes) record.notes = notes;
    if (date) record.date = new Date(date);

    await record.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a leave record
router.delete('/leaves/:leaveId', async (req, res) => {
  try {
    await Leave.findByIdAndDelete(req.params.leaveId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getValidGrantedLeaveHours(user, asOfDate = new Date()) {
  if (!user.joinDate) return 0;

  const joinDate = new Date(user.joinDate);
  const totalYears = asOfDate.getFullYear() - joinDate.getFullYear();
  let totalHours = 0;

  for (let i = 0; i <= totalYears; i++) {
    const grantDate = new Date(joinDate.getFullYear() + i, joinDate.getMonth(), joinDate.getDate());
    const expiryDate = new Date(grantDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    if (grantDate <= asOfDate && asOfDate < expiryDate) {
    const days = calculateEntitlementDays(user, i);
      totalHours += days * 8;
    }
  }

  return Math.min(totalHours, 320); // Cap at 40 days
}

router.get('/export-attendance', async (req, res) => {
  const { dept, year, month, startDate, endDate } = req.query;

  try {
    const query = {};
    if (dept) query.department = dept;

    const users = await User.find(query);
    const userMap = {};
    users.forEach(user => {
      userMap[user.name] = user; // ✅ FIX: store by name, not by _id
    });

    const sessions = await Attendance.find({ checkIn: { $ne: null }, checkOut: { $ne: null } });

    const filtered = sessions.filter(s => {
      const checkIn = new Date(s.checkIn);
      if (year && checkIn.getFullYear() !== Number(year)) return false;
      if (month && checkIn.getMonth() !== Number(month)) return false;

      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

      if (start && checkIn < start) return false;
      if (end && checkIn > end) return false;

      return true;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');

    sheet.columns = [
      { header: '名前', key: 'name', width: 20 },
      { header: '部署', key: 'department', width: 20 },
      { header: '出勤時間', key: 'checkIn', width: 25 },
      { header: '退勤時間', key: 'checkOut', width: 25 },
      { header: '勤務時間 (h)', key: 'worked', width: 15 },
      { header: '残業区分', key: 'overtime', width: 15 },
      { header: '深夜勤務 (h)', key: 'night', width: 15 },
      { header: '遅刻 (分)', key: 'late', width: 15 },
      { header: '種別', key: 'type', width: 10 },
    ];

    for (const s of filtered) {
      const checkIn = new Date(s.checkIn);
      const checkOut = new Date(s.checkOut);
      const user = userMap[s.name]; // ✅ FIXED: lookup now works

      const toDecimalFormat = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}.${m.toString().padStart(2, '0')}`;
      };

      const durationMs = checkOut - checkIn;
      const totalMinutes = Math.floor(durationMs / 60000);
      const adjustedMinutes = totalMinutes > 360 ? totalMinutes - 60 : totalMinutes;

      const workedHours = toDecimalFormat(adjustedMinutes);
      const overtimeMinutes = Math.max(0, adjustedMinutes - 480);
      const overtimeHours = toDecimalFormat(overtimeMinutes);

      let nightMinutes = 0;
      for (let ts = checkIn.getTime(); ts < checkOut.getTime(); ts += 60000) {
        const hour = new Date(ts).getHours();
        if (hour >= 22 || hour < 5) nightMinutes++;
      }
      const nightHours = toDecimalFormat(nightMinutes);

      let lateMinutes = 0;
      if (user?.defaultStartTime) {
        const [h, m] = user.defaultStartTime.split(':').map(Number);
        const expected = new Date(checkIn);
        expected.setHours(h, m, 0, 0);
        const diff = Math.round((checkIn - expected) / 60000);
        if (diff > 5) lateMinutes = diff;
      }

      sheet.addRow({
        name: s.name,
        department: user?.department || '',
        checkIn: checkIn.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        checkOut: checkOut.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        worked: workedHours,
        overtime: overtimeHours,
        night: nightHours,
        late: lateMinutes,
        type: s.type || 'work',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[EXPORT ERROR]', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

module.exports = router;