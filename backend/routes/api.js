const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');

function calculateLeaveEntitlement(user) {
  if (!user.joinDate || isNaN(new Date(user.joinDate))) return 0;

  const now = new Date();
  const joinDate = new Date(user.joinDate);
  const monthsWorked = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  const halfYears = Math.floor(monthsWorked / 6);

  if (!user.isPartTime || user.weeklyWorkingDays >= 5) {
    const fullTimeTable = [10, 11, 12, 14, 16, 18, 20];
    return fullTimeTable[Math.min(fullTimeTable.length - 1, halfYears - 1)] || 0;
  } else {
    const partTimeTable = {
      4: [7, 8, 9, 10, 12, 13, 15],
      3: [5, 6, 6, 8, 9, 10, 11],
      2: [3, 4, 4, 5, 6, 6, 7],
      1: [1, 2, 2, 2, 3, 3, 3]
    };
    const row = partTimeTable[user.weeklyWorkingDays] || [];
    return row[Math.min(row.length - 1, halfYears - 1)] || 0;
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

// Get remaining paid leave
router.get('/users/:name/leave-balance', async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const entitlementDays = calculateLeaveEntitlement(user);
    const totalEntitledHours = entitlementDays * 8;

    const paidLeaveSessions = await Attendance.find({
      name: user.name,
      type: 'paid_leave',
      checkIn: { $exists: true },
      checkOut: { $exists: true }
    });

    const hoursUsedRaw = paidLeaveSessions.reduce((sum, s) => {
      const start = new Date(s.checkIn);
      const end = new Date(s.checkOut);
      const msDiff = end - start;

      const fullDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
      const leftoverMs = msDiff % (1000 * 60 * 60 * 24);
      const leftoverHours = leftoverMs / (1000 * 60 * 60);

      return sum + (fullDays * 8) + Math.min(leftoverHours, 8);
    }, 0);

    const hoursUsed = Math.round((hoursUsedRaw + Number.EPSILON) * 2) / 2;

    const hoursRemaining = Math.max(0, totalEntitledHours - hoursUsed);
    const days = Math.floor(hoursRemaining / 8);
    const hours = Math.round((hoursRemaining % 8 + Number.EPSILON) * 2) / 2;

    res.json({
  hoursRemaining: Math.round(hoursRemaining * 10) / 10,
  hoursUsed: Math.round(hoursUsed * 10) / 10,
  entitlementDays,
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
router.get('/sessions/all', async (req, res) => {
  try {
    const allSessions = await Attendance.find({}).sort({ checkIn: -1 });
    res.json(allSessions);
  } catch (err) {
    console.error('[SESSIONS/ALL ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch session logs.' });
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
  const { checkIn, checkOut, isOvertime, department, type, hoursUsed } = req.body;

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
  const updates = req.body;

  try {
    const user = await User.findByIdAndUpdate(id, updates);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true });
  } catch (err) {
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

// ✅ Batch fetch leave balances for all users
router.get('/leave-balance/all', async (req, res) => {
  try {
    const users = await User.find({});
    const results = [];

    for (const user of users) {
      const entitlementDays = calculateLeaveEntitlement(user);
      const totalEntitledHours = entitlementDays * 8;

      const paidLeaveSessions = await Attendance.find({
        name: user.name,
        type: 'paid_leave',
        checkIn: { $exists: true },
        checkOut: { $exists: true }
      });

      const hoursUsedRaw = paidLeaveSessions.reduce((sum, s) => {
        const start = new Date(s.checkIn);
        const end = new Date(s.checkOut);
        const msDiff = end - start;
        const fullDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        const leftoverMs = msDiff % (1000 * 60 * 60 * 24);
        const leftoverHours = leftoverMs / (1000 * 60 * 60);
        return sum + (fullDays * 8) + Math.min(leftoverHours, 8);
      }, 0);

      const hoursUsed = Math.round((hoursUsedRaw + Number.EPSILON) * 2) / 2;
      const hoursRemaining = Math.max(0, totalEntitledHours - hoursUsed);
      const days = Math.floor(hoursRemaining / 8);
      const hours = Math.round((hoursRemaining % 8 + Number.EPSILON) * 2) / 2;

      console.log('[LEAVE DEBUG]', {
        name: user.name,
        joinDate: user.joinDate,
        isPartTime: user.isPartTime,
        weeklyWorkingDays: user.weeklyWorkingDays,
        entitlementDays
      });

      results.push({
        name: user.name,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        hoursUsed: Math.round(hoursUsed * 10) / 10,
        entitlementDays,
        formatted: `${days}d ${hours}h`
      });
    }

    res.json(results);
  } catch (err) {
    console.error('[LEAVE BALANCE ALL ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;