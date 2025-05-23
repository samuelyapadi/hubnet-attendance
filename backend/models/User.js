const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  department: { type: String },
  workHours: { type: String },
  overtime: { type: String },
  descriptors: [[Number]],
  snapshots: [String],
  joinDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  isPartTime: { type: Boolean, default: false },
  weeklyWorkingDays: { type: Number, default: 5 },
  isShiftWorker: { type: Boolean, default: false } // 👈 new field
});

module.exports = mongoose.model('User', userSchema);
