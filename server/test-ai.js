require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('./models/Alert');
const aiService = require('./services/aiService');

async function simulateAIContext() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate 1: Extreme Flash Warning 
    console.log('🤖 Gemini analyzing critical anomaly...');
    const speed = 920;
    const flashMessage = `Severe Storm Warning: Solar wind speed reached ${speed} km/s.`;
    const flashNarrative = await aiService.generateFlashReport(
      { type: 'SEVERE_STORM_WARNING', severity: 'Critical', value: speed, message: flashMessage },
      { speed: speed, density: 45, bz: -18 }
    );
    
    console.log('💾 Saving Flash Warning to DB...');
    await Alert.create({
      type: 'SEVERE_STORM_WARNING',
      severity: 'Critical',
      message: flashMessage,
      value: speed,
      aiNarrative: flashNarrative
    });

    // Simulate 2: Daily Scheduled Summary
    console.log('🤖 Gemini drafting Daily Space Weather Summary...');
    const daySummary = {
      solar_wind_speed: { max: 450, min: 380, avg: 410 },
      geomagnetic_kp: { max: 4, min: 1, avg: 2 },
      xray_flux: { max: 1e-6, min: 1e-8, avg: 5e-8 }
    };
    
    const dailyNarrative = await aiService.generateDailySummary(daySummary);
    
    console.log('💾 Saving Daily Summary to DB...');
    await Alert.create({
      type: 'DAILY_SUMMARY',
      severity: 'Info',
      message: 'Daily Space Weather Briefing: Overview of the last 24 hours of solar activity and its potential impacts.',
      value: 0,
      aiNarrative: dailyNarrative
    });

    console.log('✅ Simulation complete! You can view these in the UI now.');
  } catch (error) {
    console.error('❌ Failed simulation:', error);
  } finally {
    process.exit(0);
  }
}

simulateAIContext();
