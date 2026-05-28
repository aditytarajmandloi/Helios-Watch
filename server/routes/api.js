const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric');
const Alert = require('../models/Alert');

// GET /api/historical - Fetch metrics for a given time range
router.get('/historical', async (req, res) => {
  try {
    // Accept hours as a query parameter, default to 24
    const hours = parseInt(req.query.hours) || 24;
    
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    const data = await Metric.find({
      timestamp: { $gte: cutoff }
    }).sort({ timestamp: 1 });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching historical data:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// GET /api/alerts
// Fetches the most recent alerts for the dashboard. If 'hours' is specified, restricts.
router.get('/alerts', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours);
    let filter = {};
    if (hours) {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hours);
      filter.timestamp = { $gte: cutoff };
    }

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 }) // Newest first
      .limit(20); 
      
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('[API] Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/ai-insight - Generate AI correlation insight
const aiService = require('../services/aiService');
router.post('/ai-insight', async (req, res) => {
  try {
    const { selectedMetrics, summaryStats, timeRange } = req.body;
    if (!selectedMetrics || !summaryStats) {
      return res.status(400).json({ success: false, message: 'Missing selectedMetrics or summaryStats' });
    }
    const insight = await aiService.generateCorrelationInsight(selectedMetrics, summaryStats, timeRange || '24H');
    if (!insight) {
      return res.json({ success: true, insight: 'GEMINI_API_KEY is not configured. Add it to server/.env to enable AI features.' });
    }
    res.json({ success: true, insight });
  } catch (error) {
    console.error('[API] AI Insight error:', error.message);
    res.json({ success: true, insight: error.message || 'AI models are temporarily unavailable. Please try again in a moment.' });
  }
});

module.exports = router;
