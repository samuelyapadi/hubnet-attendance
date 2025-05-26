const express = require('express');
const router = express.Router();
const ShiftAssignment = require('../models/ShiftAssignment');

// POST /api/shifts/:userId
router.post('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { month, shifts } = req.body;

  if (!month || !shifts) {
    return res.status(400).json({ error: 'Month and shifts required.' });
  }

  try {
    const updated = await ShiftAssignment.findOneAndUpdate(
      { userId, month },
      { shifts },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[SHIFT POST ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/shifts/:userId/:month
router.get('/:userId/:month', async (req, res) => {
  const { userId, month } = req.params;

  try {
    const result = await ShiftAssignment.findOne({ userId, month });
    res.json(result || {});
  } catch (err) {
    console.error('[SHIFT GET ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
