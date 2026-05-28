const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  receiveAlerts: {
    type: Boolean,
    default: true
  },
  resetOtp: {
    type: String
  },
  resetOtpExpires: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
