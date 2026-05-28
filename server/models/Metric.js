const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
  },
  metadata: {
    source: {
      type: String,
      required: true,
      enum: ['NOAA', 'NASA', 'OTHER'] // Example sources
    },
    metricType: {
      type: String,
      required: true,
      description: 'E.g., solar_flare, geomagnetic_storm'
    }
  },
  value: {
    type: Number,
    required: true
  }
}, {
  // Explicitly defining the Time Series settings
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'minutes', // Perfect for metrics logged every 5 minutes
    expireAfterSeconds: 2592000 // 1 Month TTL retention
  }
});

// Prevent duplicate data: same timestamp + same metricType = rejected
MetricSchema.index({ timestamp: 1, 'metadata.metricType': 1 }, { unique: true });

module.exports = mongoose.model('Metric', MetricSchema);
