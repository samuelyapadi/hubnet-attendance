const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  department: { type: String },
  workHours: { type: String },
  overtime: { type: String },
  descriptors: [[Number]],
  snapshots: [String],
  joinDate: { type: Date, required: true }, // ✅ New field for paid leave calculation
  createdAt: { type: Date, default: Date.now },
  isPartTime: { type: Boolean, default: false },
  weeklyWorkingDays: { type: Number, default: 5 }
});

module.exports = mongoose.model('User', userSchema);
