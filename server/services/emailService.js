const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // Return null if not configured
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const sendEmailAlert = async (recipients, subject, htmlContent) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn('⚠️ Email not sent. EMAIL_USER and EMAIL_PASS not configured in .env');
    console.log(`[Mock Email] To: ${recipients.join(', ')} | Subject: ${subject}`);
    return;
  }

  if (!recipients || recipients.length === 0) return;

  try {
    const mailOptions = {
      from: `"HeliosWatch Alerts" <${process.env.EMAIL_USER}>`,
      to: recipients, // Array of emails
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent to ${recipients.length} users: ${info.messageId}`);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
};

module.exports = {
  sendEmailAlert
};
