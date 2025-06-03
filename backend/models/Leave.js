const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'paid',        // 有休
      'unpaid',      // 欠勤
      'substitute',  // 代休
      'childcare',   // 子の看護
      'maternity',   // 産前産後
      'bereavement', // 慶弔
      'summer',      // 夏季
      'care',        // 介護
      'injury',      // 労災
      'other'
    ],
    required: true
  },
  date: { type: Date, required: true },
  hours: { type: Number, required: true }, // supports hourly or full-day
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Leave', LeaveSchema);
