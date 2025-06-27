//Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: { type: String, required: true },
  checkIn: { type: Date, default: Date.now },
  checkOut: { type: Date },
  sessionCompleted: { type: Boolean, default: false },

  type: {
    type: String,
    enum: ['work', 'paid_leave', 'unpaid_leave'],
    default: 'work'
  },
  hoursUsed: {
    type: Number,
    default: 0
  },
  lateMinutes: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
