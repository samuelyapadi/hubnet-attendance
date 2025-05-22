const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  department: { type: String },
  workHours: { type: String },
  overtime: { type: String },
  descriptors: [[Number]],
  snapshots: [String],
  joinDate: { type: Date, required: true }, // ✅ For leave tracking

  // ✅ NEW: Weekly recurring schedule
  customSchedule: {
    type: Map,
    of: {
      label: { type: String, default: '' },
      time: { type: String, required: true }
    },
    default: {}
  },

  // ✅ NEW: Manual one-day overrides (optional)
  manualShifts: {
    type: Map,
    of: {
      label: { type: String, default: '' },
      time: { type: String, required: true }
    },
    default: {}
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
