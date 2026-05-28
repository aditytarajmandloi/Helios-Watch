require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Metric = require('./models/Metric');

const backfill = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting comprehensive backfill...\n');

    // 1. Fetch 7-day Plasma (Speed & Density)
    console.log('[1/5] Fetching 7-day Plasma data (speed & density)...');
    const plasmaRes = await axios.get('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json');
    const plasmaData = plasmaRes.data.slice(1);

    // 2. Fetch 7-day Mag (Bz)
    console.log('[2/5] Fetching 7-day Mag data (Bz)...');
    const magRes = await axios.get('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json');
    const magData = magRes.data.slice(1);

    // 3. Fetch Kp Index history
    console.log('[3/5] Fetching Kp Index history...');
    const kpRes = await axios.get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    const kpData = kpRes.data.slice(1);

    // 4. Fetch GOES X-Ray Flux (7-day continuous radiation)
    console.log('[4/6] Fetching GOES X-Ray Flux (7-day)...');
    let xrayData = [];
    try {
      const xrayRes = await axios.get('https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json');
      xrayData = xrayRes.data || [];
      console.log(`   Found ${xrayData.length} X-Ray readings.`);
    } catch (e) {
      console.log('   X-Ray fetch failed:', e.message);
    }

    // 5. Fetch GOES Integral Electron Flux (7-day)
    console.log('[5/6] Fetching GOES Integral Electrons (7-day)...');
    let electronData = [];
    try {
      const electronRes = await axios.get('https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-7-day.json');
      electronData = electronRes.data || [];
      console.log(`   Found ${electronData.length} Electron Flux readings.`);
    } catch (e) {
      console.log('   Electron fetch failed:', e.message);
    }

    // 6. Fetch Solar Flares from NASA (past 60 days — kept for alerts)
    console.log('[6/6] Fetching 60-day NASA Solar Flare history...');
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - 60);
    const startDate = startDateObj.toISOString().split('T')[0];

    let flareData = [];
    try {
      const flareRes = await axios.get(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`);
      flareData = flareRes.data || [];
      console.log(`   Found ${flareData.length} solar flares.`);
    } catch (e) {
      console.log('   NASA flare fetch failed:', e.message);
    }

    const metricsToSave = [];

    // Process Plasma
    plasmaData.forEach(row => {
      const timestamp = new Date(row[0]);
      if (row[1]) metricsToSave.push({ timestamp, value: parseFloat(row[1]), metadata: { source: 'NOAA', metricType: 'solar_wind_density' } });
      if (row[2]) metricsToSave.push({ timestamp, value: parseFloat(row[2]), metadata: { source: 'NOAA', metricType: 'solar_wind_speed' } });
    });

    // Process Mag
    magData.forEach(row => {
      const timestamp = new Date(row[0]);
      if (row[3]) metricsToSave.push({ timestamp, value: parseFloat(row[3]), metadata: { source: 'NOAA', metricType: 'solar_wind_bz' } });
    });

    // Process Kp Index
    kpData.forEach(row => {
      const timestamp = new Date(row[0]);
      const kpValue = parseFloat(row[1]);
      if (!isNaN(kpValue)) {
        metricsToSave.push({ timestamp, value: kpValue, metadata: { source: 'NOAA', metricType: 'kp_index' } });
      }
    });

    // Process X-Ray Flux
    xrayData.forEach(reading => {
      if (reading.time_tag && reading.flux != null) {
        const timestamp = new Date(reading.time_tag);
        const flux = parseFloat(reading.flux);
        if (!isNaN(flux)) {
          metricsToSave.push({ timestamp, value: flux, metadata: { source: 'NOAA', metricType: 'xray_flux' } });
        }
      }
    });

    // Process Solar Flares (kept for alert history)
    const flareMultipliers = { A: 0.01, B: 0.1, C: 1, M: 10, X: 100 };
    flareData.forEach(flare => {
      if (flare.beginTime && flare.classType) {
        const timestamp = new Date(flare.beginTime);
        const letter = flare.classType.charAt(0).toUpperCase();
        const number = parseFloat(flare.classType.substring(1)) || 1;
        const intensity = (flareMultipliers[letter] || 0) * number;
        if (intensity > 0) {
          metricsToSave.push({ timestamp, value: intensity, metadata: { source: 'NASA', metricType: 'solar_flare' } });
        }
      }
    });

    // Process Electron Flux
    electronData.forEach(reading => {
      if (reading.time_tag && reading.flux != null && reading.energy === '>=2 MeV') {
        const timestamp = new Date(reading.time_tag);
        const flux = parseFloat(reading.flux);
        if (!isNaN(flux)) {
          metricsToSave.push({ timestamp, value: flux, metadata: { source: 'NOAA', metricType: 'electron_flux' } });
        }
      }
    });

    console.log(`\nTotal records to insert: ${metricsToSave.length}`);

    // Insert in batches
    const BATCH_SIZE = 5000;
    let inserted = 0;
    for (let i = 0; i < metricsToSave.length; i += BATCH_SIZE) {
      const batch = metricsToSave.slice(i, i + BATCH_SIZE);
      try {
        await Metric.insertMany(batch, { ordered: false });
      } catch (e) {
        if (e.code !== 11000 && !e.insertedDocs) {
          console.log(`   Batch note: ${e.message.substring(0, 80)}`);
        }
      }
      inserted += batch.length;
      console.log(`   Progress: ${inserted}/${metricsToSave.length}`);
    }

    console.log('\n✅ BACKFILL COMPLETE!');
    console.log('   Metrics: Speed, Density, Bz, Kp Index, X-Ray Flux, Electron Flux, Solar Flares');
    process.exit(0);

  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  }
};

backfill();
