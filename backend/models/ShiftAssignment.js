const mongoose = require('mongoose');

const shiftAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // format: 'YYYY-MM'
  shifts: {
    Mon: String,
    Tue: String,
    Wed: String,
    Thu: String,
    Fri: String,
    Sat: String,
    Sun: String
  }
});

shiftAssignmentSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('ShiftAssignment', shiftAssignmentSchema);
