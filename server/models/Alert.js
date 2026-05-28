const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    required: true
  },
  severity: { type: String, required: true }, // e.g., 'Warning', 'Critical', 'Info'
  message: { type: String, required: true },
  value: { type: Number, required: true },
  isRead: { type: Boolean, default: false },
  aiNarrative: { type: String }
});

// Enforce 1-Month Data limit on Alerts automatically
AlertSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

AlertSchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    const { sendEmailAlert } = require('../services/emailService');
    
    // Find all users opted in to alerts
    const users = await User.find({ receiveAlerts: true }).select('email');
    const emails = users.map(u => u.email);
    
    if (emails.length > 0) {
      let subject = `[HeliosWatch] ${doc.severity} Alert: ${doc.type}`;
      let html = `<h2>${doc.severity} Alert</h2>
                  <p><strong>Type:</strong> ${doc.type}</p>
                  <p><strong>Message:</strong> ${doc.message}</p>
                  <p><strong>Value:</strong> ${doc.value}</p>`;

      if (doc.type === 'DAILY_SUMMARY') {
        subject = `[HeliosWatch] Daily Space Weather Briefing`;
      }

      if (doc.aiNarrative) {
        html += `<h3>AI Expert Analysis</h3>
                 <p style="white-space: pre-wrap;">${doc.aiNarrative}</p>`;
      }

      // Do not await to avoid blocking the save operation
      sendEmailAlert(emails, subject, html);
    }
  } catch (error) {
    console.error('Error in Alert post-save hook:', error);
  }
});

module.exports = mongoose.model('Alert', AlertSchema);
