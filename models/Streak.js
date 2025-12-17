const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  bestStreak: {
    type: Number,
    default: 0
  },
  lastQuizDate: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model("Streak", streakSchema);