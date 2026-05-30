require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initCronJobs, fetchNOAAData, fetchNASAData, fetchKpData, fetchXrayData, fetchElectronData, generateDailySummaryAlert } = require('./dataIngestion');
const Alert = require('./models/Alert');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// UPDATED: Dynamic CORS for Express HTTP routes
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));
app.use(express.json());

// Create HTTP server and bind Socket.io to it
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // UPDATED: Dynamic CORS for WebSocket connections
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Import API Routes
app.use('/api', require('./routes/api'));
app.use('/api/auth', require('./routes/auth'));

// Listen for client connections
io.on('connection', (socket) => {
  console.log(`⚡ [WebSocket] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Time Series successfully!');
    
    // Start the cron jobs
    initCronJobs(io);

    // Check if we have a recent daily summary, if not, generate one now
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSummary = await Alert.findOne({ type: 'DAILY_SUMMARY', timestamp: { $gte: oneDayAgo } });
    if (!recentSummary) {
      console.log('No recent Daily Summary found. Generating one now...');
      await generateDailySummaryAlert(io);
    }

    // Optionally: Run them once on boot for immediate data flow
    console.log('Running initial sync...');
    fetchNOAAData(io).then(() => fetchNASAData(io)).then(() => fetchKpData(io)).then(() => fetchXrayData(io)).then(() => fetchElectronData(io));

    // UPDATED: Bind to 0.0.0.0 for external routing on Render
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`HeliosWatch Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
