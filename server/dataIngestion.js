const cron = require('node-cron');
const axios = require('axios');
const Metric = require('./models/Metric');
const Alert = require('./models/Alert');
const aiService = require('./services/aiService');

/**
 * Checks if we recently triggered this specific alert to prevent spam.
 * Lookback window: 4 hours.
 */
const shouldTriggerAlert = async (alertType) => {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const recentAlert = await Alert.findOne({
    type: alertType,
    timestamp: { $gte: fourHoursAgo }
  });

  // If we found a recent alert, return false (do not trigger again).
  return !recentAlert;
};
/**
 * Helper to parse solar flare class to a numeric intensity value
 * A -> 0.01, B -> 0.1, C -> 1, M -> 10, X -> 100
 */
const parseFlareIntensity = (classType) => {
  if (!classType) return 0;

  const letter = classType.charAt(0).toUpperCase();
  const number = parseFloat(classType.substring(1)) || 1;
  const multipliers = { A: 0.01, B: 0.1, C: 1, M: 10, X: 100 };

  return (multipliers[letter] || 0) * number;
};

/**
 * Fetch Data from NOAA SWPC API 
 * Target Metrics: Solar Wind Speed, Density, and Bz
 */
const fetchNOAAData = async (io) => {
  try {
    console.log('[NOAA] Fetching Solar Wind data...');

    // plasma data contains speed and density (7-day window for historical depth)
    const plasmaRes = await axios.get('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json');
    const plasmaData = plasmaRes.data;

    // mag data contains Bz (7-day window for historical depth)
    const magRes = await axios.get('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json');
    const magData = magRes.data;

    const ops = [];

    const toUTC = (str) => {
      let s = str.replace(' ', 'T');
      if (!s.endsWith('Z')) s += 'Z';
      return new Date(s);
    };

    // Plasma headers: ['time_tag', 'density', 'speed', 'temperature']
    if (plasmaData.length > 1) {
      for (let i = 1; i < plasmaData.length; i++) {
        const [time_tag, density, speed] = plasmaData[i];
        const timestamp = toUTC(time_tag);

        if (density) {
          ops.push({ updateOne: { filter: { timestamp, 'metadata.metricType': 'solar_wind_density' }, update: { $set: { timestamp, value: parseFloat(density), metadata: { source: 'NOAA', metricType: 'solar_wind_density' } } }, upsert: true } });
        }
        if (speed) {
          ops.push({ updateOne: { filter: { timestamp, 'metadata.metricType': 'solar_wind_speed' }, update: { $set: { timestamp, value: parseFloat(speed), metadata: { source: 'NOAA', metricType: 'solar_wind_speed' } } }, upsert: true } });
        }
      }

      // Check Latest for Alerting — Solar Wind Speed thresholds
      const latestPlasma = plasmaData[plasmaData.length - 1];
      const latestSpeed = parseFloat(latestPlasma[2]);
      const latestDensity = parseFloat(latestPlasma[1]);

      if (!isNaN(latestSpeed) && latestSpeed >= 700) {
        const canAlert = await shouldTriggerAlert('SEVERE_STORM_WARNING');
        if (canAlert) {
          const message = `Severe Storm Warning: Solar wind speed reached ${latestSpeed} km/s — well above the 700 km/s danger threshold. This indicates a possible coronal mass ejection (CME) impact. High-latitude power grids, satellite operations, and GPS accuracy may be affected.`;
          const aiNarrative = await aiService.generateFlashReport(
            { type: 'SEVERE_STORM_WARNING', severity: 'Critical', value: latestSpeed, message },
            { speed: latestSpeed, density: latestDensity }
          );
          await Alert.create({
            type: 'SEVERE_STORM_WARNING',
            severity: 'Critical',
            message,
            value: latestSpeed,
            aiNarrative
          });
          console.log('⚠️ ALERT: Severe Storm Warning (Speed)');
          if (io) io.emit('NEW_ALERT', { type: 'SEVERE_STORM_WARNING' });
        }
      } else if (!isNaN(latestSpeed) && latestSpeed >= 500) {
        const canAlert = await shouldTriggerAlert('FAST_SOLAR_WIND');
        if (canAlert) {
          await Alert.create({
            type: 'FAST_SOLAR_WIND',
            severity: 'Warning',
            message: `Fast Solar Wind detected at ${latestSpeed} km/s (threshold: 500 km/s). Enhanced geomagnetic activity is possible. Auroras may be visible at higher latitudes.`,
            value: latestSpeed
          });
          console.log('⚠️ ALERT: Fast Solar Wind');
          if (io) io.emit('NEW_ALERT', { type: 'FAST_SOLAR_WIND' });
        }
      }

      // Check Latest for Alerting — Proton Density thresholds
      if (!isNaN(latestDensity) && latestDensity >= 30) {
        const canAlert = await shouldTriggerAlert('DENSE_PARTICLE_CLUSTER');
        if (canAlert) {
          await Alert.create({
            type: 'DENSE_PARTICLE_CLUSTER',
            severity: 'Critical',
            message: `Dense Particle Cluster: Proton density surged to ${latestDensity.toFixed(1)} p/cm³ (threshold: 30). Earth's magnetosphere is being severely compressed, increasing radiation exposure for astronauts and stressing satellite electronics.`,
            value: latestDensity
          });
          console.log('⚠️ ALERT: Dense Particle Cluster');
          if (io) io.emit('NEW_ALERT', { type: 'DENSE_PARTICLE_CLUSTER' });
        }
      } else if (!isNaN(latestDensity) && latestDensity >= 10) {
        const canAlert = await shouldTriggerAlert('ELEVATED_DENSITY');
        if (canAlert) {
          await Alert.create({
            type: 'ELEVATED_DENSITY',
            severity: 'Warning',
            message: `Elevated Proton Density: ${latestDensity.toFixed(1)} p/cm³ (threshold: 10). An increasing stream of solar particles is reaching Earth. Monitor for further escalation.`,
            value: latestDensity
          });
          console.log('⚠️ ALERT: Elevated Density');
          if (io) io.emit('NEW_ALERT', { type: 'ELEVATED_DENSITY' });
        }
      }
    }

    // Mag headers: ['time_tag', 'bx_gsm', 'by_gsm', 'bz_gsm', 'lon_gsm', 'lat_gsm', 'bt']
    if (magData.length > 1) {
      for (let i = 1; i < magData.length; i++) {
        const time_tag = magData[i][0];
        const bz = magData[i][3];
        const timestamp = toUTC(time_tag);
        if (bz) {
          ops.push({ updateOne: { filter: { timestamp, 'metadata.metricType': 'solar_wind_bz' }, update: { $set: { timestamp, value: parseFloat(bz), metadata: { source: 'NOAA', metricType: 'solar_wind_bz' } } }, upsert: true } });
        }
      }
    }

    // Execute Bulk Upsert
    if (ops.length > 0) {
      const result = await Metric.bulkWrite(ops, { ordered: false });
      console.log(`[NOAA] Synced Solar Wind. Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}.`);
      if (io && result.upsertedCount > 0) io.emit('NEW_TELEMETRY');
    }

    // Check Bz for Alerting — Southward Magnetic Field
    if (magData.length > 1) {
      const latestMag = magData[magData.length - 1];
      const latestBz = parseFloat(latestMag[3]);
      if (!isNaN(latestBz) && latestBz <= -10) {
        const canAlert = await shouldTriggerAlert('SOUTHWARD_BZ_PRECURSOR');
        if (canAlert) {
          await Alert.create({
            type: 'SOUTHWARD_BZ_PRECURSOR',
            severity: 'Critical',
            message: `Storm Precursor: Interplanetary Magnetic Field Bz dropped to ${latestBz.toFixed(1)} nT (threshold: -10 nT). A strongly southward Bz opens Earth's magnetic shield, allowing solar energy to pour into the magnetosphere. Geomagnetic storm probability is significantly elevated.`,
            value: latestBz
          });
          console.log('⚠️ ALERT: Southward Bz Precursor');
          if (io) io.emit('NEW_ALERT', { type: 'SOUTHWARD_BZ_PRECURSOR' });
        }
      }
    }

  } catch (error) {
    console.error('[NOAA] Error fetching data:', error.message);
  }
};

/**
 * Fetch Data from NASA DONKI API
 * Target Metrics: Solar Flares
 */
const fetchNASAData = async (io) => {
  try {
    console.log('[NASA] Fetching Solar Flare data...');

    // Using a 7-day lookback window for recent flares
    const endDate = new Date().toISOString().split('T')[0];
    const startDateDate = new Date();
    startDateDate.setDate(startDateDate.getDate() - 7);
    const startDate = startDateDate.toISOString().split('T')[0];

    const url = `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${process.env.NASA_API_KEY || 'DEMO_KEY'}`;
    const res = await axios.get(url);
    const flares = res.data;

    if (flares && flares.length > 0) {
      // Get the most recent flare from the list
      const latestFlare = flares[flares.length - 1];
      const timestamp = new Date(latestFlare.beginTime);
      const intensity = parseFlareIntensity(latestFlare.classType);

      // Detect M-Class or X-Class Flares
      if (intensity >= 10) {
        const canAlert = await shouldTriggerAlert('SOLAR_FLARE');
        if (canAlert) {
          await Alert.create({
            type: 'SOLAR_FLARE',
            severity: intensity >= 100 ? 'Critical' : 'Warning',
            message: `Significant Solar Flare detected: Class ${latestFlare.classType}`,
            value: intensity
          });
          console.log(`⚠️ ALERT GENERATED: Solar Flare ${latestFlare.classType}`);
          if (io) io.emit('NEW_ALERT', { message: "New Solar Flare Detected", type: "SOLAR_FLARE" });
        }
      }

      // Prevent duplicate entries by checking if the latest flare is already saved
      const existingFlare = await Metric.findOne({
        timestamp,
        'metadata.metricType': 'solar_flare'
      });

      if (!existingFlare) {
        await Metric.create({
          timestamp,
          metadata: { source: 'NASA', metricType: 'solar_flare' },
          value: intensity
        });
        console.log(`[NASA] Successfully synced latest flare (${latestFlare.classType}).`);
      } else {
        console.log(`[NASA] Flare (${latestFlare.classType}) is already synced. Skipping.`);
      }
    } else {
      console.log('[NASA] No recent solar flares found.');
    }

  } catch (error) {
    console.error('[NASA] Error fetching data:', error.message);
  }
};

/**
 * Fetch Kp Index from NOAA (Geomagnetic Activity)
 */
const fetchKpData = async (io) => {
  try {
    console.log('[NOAA] Fetching Kp Index data...');
    const res = await axios.get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    const kpData = res.data;

    const toUTC = (str) => {
      let s = str.replace(' ', 'T');
      if (!s.endsWith('Z')) s += 'Z';
      return new Date(s);
    };

    if (kpData.length > 0) {
      const ops = [];
      // Data is an array of objects: { time_tag, Kp }
      for (let i = 0; i < kpData.length; i++) {
        const timestamp = toUTC(kpData[i].time_tag);
        const kp_value = parseFloat(kpData[i].Kp);

        if (!isNaN(kp_value)) {
          ops.push({ updateOne: { filter: { timestamp, 'metadata.metricType': 'kp_index' }, update: { $set: { timestamp, value: kp_value, metadata: { source: 'NOAA', metricType: 'kp_index' } } }, upsert: true } });
        }
      }

      if (ops.length > 0) {
        const result = await Metric.bulkWrite(ops, { ordered: false });
        console.log(`[NOAA] Synced Kp Index. Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}.`);
        if (io && result.upsertedCount > 0) io.emit('NEW_TELEMETRY');
      }

      // Check Latest purely for Alerting Purposes
      const latestKp = kpData[kpData.length - 1];
      const latestKpValue = parseFloat(latestKp.Kp);
      if (latestKpValue >= 5) {
        const recentAlert = await Alert.findOne({ type: 'GEOMAGNETIC_STORM', timestamp: { $gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } });
        if (!recentAlert) {
          await Alert.create({
            type: 'GEOMAGNETIC_STORM',
            severity: latestKpValue >= 7 ? 'Critical' : 'Warning',
            message: `Geomagnetic Storm detected. Kp Index is ${latestKpValue}.`,
            value: latestKpValue
          });
          if (io) io.emit('NEW_ALERT', { type: 'GEOMAGNETIC_STORM' });
        }
      }
    }
  } catch (error) {
    console.error('[NOAA] Error fetching Kp data:', error.message);
  }
};

/**
 * Fetch GOES X-Ray Flux (Continuous Solar Radiation)
 * This gives us a smooth, continuous line for solar activity
 * instead of the sparse discrete flare events from NASA DONKI.
 */
const fetchXrayData = async (io) => {
  try {
    console.log('[NOAA] Fetching GOES X-Ray Flux...');
    const res = await axios.get('https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json');
    const xrayData = res.data;

    if (xrayData && xrayData.length > 0) {
      const ops = [];
      for (let i = 0; i < xrayData.length; i++) {
        const timestamp = new Date(xrayData[i].time_tag);
        const flux = xrayData[i].flux;

        if (flux != null && !isNaN(flux)) {
          ops.push({ updateOne: { filter: { timestamp, 'metadata.metricType': 'xray_flux' }, update: { $set: { timestamp, value: flux, metadata: { source: 'NOAA', metricType: 'xray_flux' } } }, upsert: true } });
        }
      }

      if (ops.length > 0) {
        const result = await Metric.bulkWrite(ops, { ordered: false });
        console.log(`[NOAA] Synced X-Ray Flux. Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}.`);
        if (io && result.upsertedCount > 0) io.emit('NEW_TELEMETRY');
      }

      // Check Latest for Alerting — X-Ray Flux thresholds
      const latestXray = xrayData[xrayData.length - 1];
      const latestFlux = latestXray ? latestXray.flux : null;
      if (latestFlux != null && latestFlux >= 1e-4) {
        const canAlert = await shouldTriggerAlert('XRAY_X_CLASS');
        if (canAlert) {
          const message = `X-Class Solar Radiation Event: GOES X-Ray flux reached ${latestFlux.toExponential(2)} W/m² — exceeding the X-class threshold (1×10⁻⁴). Expect HF radio blackouts on the sunlit side of Earth, potential satellite anomalies, and navigation degradation.`;
          const aiNarrative = await aiService.generateFlashReport(
            { type: 'XRAY_X_CLASS', severity: 'Critical', value: latestFlux, message },
            { xray_flux: latestFlux }
          );
          await Alert.create({
            type: 'XRAY_X_CLASS',
            severity: 'Critical',
            message,
            value: latestFlux,
            aiNarrative
          });
          console.log('⚠️ ALERT: X-Class X-Ray Event');
          if (io) io.emit('NEW_ALERT', { type: 'XRAY_X_CLASS' });
        }
      } else if (latestFlux != null && latestFlux >= 1e-5) {
        const canAlert = await shouldTriggerAlert('XRAY_M_CLASS');
        if (canAlert) {
          await Alert.create({
            type: 'XRAY_M_CLASS',
            severity: 'Warning',
            message: `M-Class X-Ray Flare: GOES flux at ${latestFlux.toExponential(2)} W/m² (M-class threshold: 1×10⁻⁵). Brief HF radio blackouts possible in sunlit regions. Monitor for escalation to X-class levels.`,
            value: latestFlux
          });
          console.log('⚠️ ALERT: M-Class X-Ray Event');
          if (io) io.emit('NEW_ALERT', { type: 'XRAY_M_CLASS' });
        }
      }
    }
  } catch (error) {
    console.error('[NOAA] Error fetching X-Ray data:', error.message);
  }
};

/**
 * Fetch GOES Integral Electron Flux (High Energy >2 MeV)
 * Critical for satellite operators to monitor "killer electrons"
 */
const fetchElectronData = async (io) => {
  try {
    console.log('[NOAA] Fetching GOES Integral Electrons...');
    const res = await axios.get('https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-7-day.json');
    const d = res.data;

    if (d && d.length > 0) {
      const ops = [];
      let latestFlux = null;

      for (let i = 0; i < d.length; i++) {
        if (d[i].energy === '>=2 MeV') {
          const timestamp = new Date(d[i].time_tag);
          const flux = d[i].flux;

          if (flux != null && !isNaN(flux)) {
            ops.push({ updateOne: { filter: { timestamp, 'metadata.metricType': 'electron_flux' }, update: { $set: { timestamp, value: flux, metadata: { source: 'NOAA', metricType: 'electron_flux' } } }, upsert: true } });
            latestFlux = flux;
          }
        }
      }

      if (ops.length > 0) {
        const result = await Metric.bulkWrite(ops, { ordered: false });
        console.log(`[NOAA] Synced Electron Flux. Upserted ${result.upsertedCount}, Modified ${result.modifiedCount}.`);
        if (io && result.upsertedCount > 0) io.emit('NEW_TELEMETRY');
      }

      // Check Latest for Alerting — Deep Dielectric Charging thresholds (>1000 pfu)
      if (latestFlux != null && latestFlux >= 1000) {
        const canAlert = await shouldTriggerAlert('HIGH_ELECTRON_FLUX');
        if (canAlert) {
          const message = `High-Energy Electron Alert: GOES integral electron flux (≥ 2 MeV) has reached ${latestFlux.toFixed(0)} pfu. Extreme risk of deep dielectric electrostatic charging in high-orbit satellites.`;
          const aiNarrative = await aiService.generateFlashReport(
            { type: 'HIGH_ELECTRON_FLUX', severity: 'Critical', value: latestFlux, message },
            { electron_flux: latestFlux }
          );
          await Alert.create({
            type: 'HIGH_ELECTRON_FLUX',
            severity: 'Critical',
            message,
            value: latestFlux,
            aiNarrative
          });
          console.log('⚠️ ALERT: High Electron Flux Event');
          if (io) io.emit('NEW_ALERT', { type: 'HIGH_ELECTRON_FLUX' });
        }
      }
    }
  } catch (error) {
    console.error('[NOAA] Error fetching Electron data:', error.message);
  }
};

const generateDailySummaryAlert = async (io) => {
  console.log('--- Generating AI Daily Space Weather Summary ---');
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metrics = await Metric.aggregate([
      { $match: { timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: "$metadata.metricType", max: { $max: "$value" }, min: { $min: "$value" }, avg: { $avg: "$value" } } }
    ]);
    const daySummary = {};
    metrics.forEach(m => daySummary[m._id] = { max: m.max, min: m.min, avg: m.avg });

    const aiNarrative = await aiService.generateDailySummary(daySummary);
    if (aiNarrative) {
      await Alert.create({
        type: 'DAILY_SUMMARY',
        severity: 'Info',
        message: 'Daily Space Weather Briefing: Overview of the last 24 hours of solar activity and its potential impacts.',
        value: 0,
        aiNarrative
      });
      if (io) io.emit('NEW_ALERT', { type: 'DAILY_SUMMARY' });
    }
  } catch(err) {
    console.error('[AI] Failed to generate Daily Summary:', err);
  }
};

/**
 * Initialize Cron Jobs
 */
const initCronJobs = (io) => {
  console.log('Initializing data ingestion cron jobs...');

  // Schedule to run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('--- Running scheduled data ingestion ---');
    await fetchNOAAData(io);
    await fetchNASAData(io);
    await fetchKpData(io);
    await fetchXrayData(io);
    await fetchElectronData(io);
  });

  // Schedule AI Daily Summary at UTC 00:00 everyday
  cron.schedule('0 0 * * *', async () => {
    await generateDailySummaryAlert(io);
  });
};

module.exports = {
  fetchNOAAData,
  fetchNASAData,
  fetchKpData,
  fetchXrayData,
  fetchElectronData,
  initCronJobs,
  generateDailySummaryAlert
};

