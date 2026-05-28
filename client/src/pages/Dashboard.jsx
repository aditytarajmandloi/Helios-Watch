import React, { useState, useMemo } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { useTheme } from '../context/ThemeContext';
import MetricChart from '../components/MetricChart';
import AlertFeed from '../components/AlertFeed';
import CustomAlertPanel from '../components/CustomAlertPanel';
import DailySummaryPanel from '../components/DailySummaryPanel';
import ExpertAnalysisPanel from '../components/ExpertAnalysisPanel';
import CorrelationChart from '../components/CorrelationChart';
import { TrendingUp, TrendingDown, Minus, Shield, Sun, Moon } from 'lucide-react';
import DerivedPhysicsPanel from '../components/DerivedPhysicsPanel';
const metricsList = [
  { id: 'speed', title: 'Solar Wind Speed', color: '#38bdf8' },
  { id: 'density', title: 'Proton Density', color: '#a78bfa' },
  { id: 'bz', title: 'Magnetic Field Bz', color: '#f43f5e' },
  { id: 'xray', title: 'X-Ray Flux', color: '#fbbf24' },
  { id: 'kp', title: 'Kp Index', color: '#10b981' },
  { id: 'electrons', title: '>2 MeV Electrons', color: '#c084fc' }
];

const timeRanges = [
  { label: '6H', hours: 6 },
  { label: '24H', hours: 24 },
  { label: '7D', hours: 168 },
  { label: '1M', hours: 720 },
];

// ─── Beginner Explanations ─────────────────────────────
const getBeginnerExplanation = (id) => {
  switch (id) {
    case 'speed': return "Monitoring global Solar Wind Speed arriving at Earth. Sustained anomalous velocities above 700 km/s can trigger geomagnetic storms, affecting satellites and electrical grids. Currently showing live telemetry natively streamed from deep-space satellites.";
    case 'density': return "Monitoring Proton Density in the solar wind. A dense cluster of particles compresses Earth's magnetic field, increasing the intensity of auroras and the radiation environment for astronauts.";
    case 'bz': return "Monitoring the Interplanetary Magnetic Field (Bz). When Bz points south (negative numbers), it connects smoothly with Earth's north-pointing magnetic field, pouring solar energy directly into our atmosphere.";
    case 'xray': return "Monitoring GOES X-Ray Flux to detect Solar Flares. High energy X-rays (like an X-Class flare) can cause short-wave radio blackouts on the sunlit side of Earth and pose severe radiation hazards.";
    case 'kp': return "Monitoring the Planetary K-index (Kp). This is a globally averaged scale of geomagnetic activity. Kp 5 or higher indicates a geomagnetic storm is actively occurring.";
    case 'electrons': return "Monitoring high-energy electron flux (≥2 MeV) from GOES satellites. These 'killer electrons' accumulate in Earth's radiation belts after solar storms. When levels exceed 1,000 pfu, they can penetrate satellite shielding and destroy onboard electronics through deep dielectric charging.";
    default: return "";
  }
};

// ─── Expert Explanations ───────────────────────────────
const getExpertExplanation = (id) => {
  switch (id) {
    case 'speed': return "Real-time bulk flow velocity measured by DSCOVR at L1 (1.5M km upstream). Sustained V>600 km/s indicates high-speed stream (HSS) from coronal hole or CME-driven sheath. Combined with southward Bz, speeds above 700 km/s correlate with G3+ geomagnetic storms. Coupling function: ε ∝ V·B²·sin⁴(θ/2). Sampling: 1-min resolution, 5-min ingestion cadence.";
    case 'density': return "Proton number density in the solar wind plasma column at L1. Spikes >20 p/cm³ typically precede CME shock fronts where the interplanetary medium is compressed. Magnetopause standoff distance R ∝ n^(-1/6) — higher density pushes Earth's bow shock closer. Sustained elevated density with increasing velocity confirms developing CME impact.";
    case 'bz': return "North-south IMF component in GSM coordinates. Negative (southward) Bz drives magnetic reconnection at the dayside magnetopause — the primary trigger for geomagnetic storms. Sustained Bz < -10 nT for >3 hours typically produces G2+ conditions. Geoeffectiveness is determined by the V×Bz coupling function and dawn-dusk electric field.";
    case 'xray': return "Soft X-ray irradiance (1–8 Å) from GOES-16/17 XRS instrument. Logarithmic classification: A<10⁻⁷, B<10⁻⁶, C<10⁻⁵, M<10⁻⁴, X≥10⁻⁴ W/m². M-class flares cause R1 HF absorption on the sunlit hemisphere. X-class events produce R3+ complete HF blackout and can accelerate Solar Energetic Particles (SEPs).";
    case 'kp': return "Three-hourly planetary index derived from 13 subauroral magnetometer stations. Scale 0–9 maps to NOAA G-scale: Kp5→G1 (minor), Kp6→G2 (moderate), Kp7→G3 (strong), Kp8→G4 (severe), Kp9→G5 (extreme). Values reflect integrated geomagnetic response to solar wind driving. Aurora oval expands equatorward as Kp increases.";
    case 'electrons': return "Integral electron flux (≥ 2 MeV) from GOES. Known as 'killer electrons', prolonged exposure above 1,000 pfu degrades satellite solar panels and causes deep dielectric surface charging, leading to internal electrostatic discharges that permanently disable spacecraft electronics. Electrons typically pool in the radiation belts days after a shockwave.";
    default: return "";
  }
};

// ─── NOAA Space Weather Scales ─────────────────────────
const getGScale = (kp) => {
  if (kp == null) return { level: '—', label: 'No Data', color: '#475569' };
  if (kp >= 9) return { level: 'G5', label: 'Extreme', color: '#dc2626' };
  if (kp >= 8) return { level: 'G4', label: 'Severe', color: '#ea580c' };
  if (kp >= 7) return { level: 'G3', label: 'Strong', color: '#f59e0b' };
  if (kp >= 6) return { level: 'G2', label: 'Moderate', color: '#eab308' };
  if (kp >= 5) return { level: 'G1', label: 'Minor', color: '#84cc16' };
  return { level: 'G0', label: 'Quiet', color: '#22c55e' };
};

const getRScale = (xray) => {
  if (xray == null) return { level: '—', label: 'No Data', color: '#475569' };
  if (xray >= 2e-3) return { level: 'R5', label: 'Extreme', color: '#dc2626' };
  if (xray >= 1e-3) return { level: 'R4', label: 'Severe', color: '#ea580c' };
  if (xray >= 1e-4) return { level: 'R3', label: 'Strong', color: '#f59e0b' };
  if (xray >= 5e-5) return { level: 'R2', label: 'Moderate', color: '#eab308' };
  if (xray >= 1e-5) return { level: 'R1', label: 'Minor', color: '#84cc16' };
  return { level: 'R0', label: 'None', color: '#22c55e' };
};

const getWindCondition = (speed, bz) => {
  if (speed == null) return { label: 'No Data', color: '#475569' };
  if (speed >= 700 || (speed >= 500 && bz != null && bz <= -10))
    return { label: 'Disturbed', color: '#dc2626' };
  if (speed >= 500 || (bz != null && bz <= -5))
    return { label: 'Elevated', color: '#f59e0b' };
  return { label: 'Nominal', color: '#22c55e' };
};

// ─── Statistics Computation ────────────────────────────
const computeStats = (data, metricId) => {
  const values = data.map(d => d[metricId]).filter(v => v != null && !isNaN(v));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const windowSize = Math.max(Math.floor(values.length * 0.15), 1);
  const recentAvg = values.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const earlyAvg = values.slice(0, windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const changePct = earlyAvg !== 0 ? ((recentAvg - earlyAvg) / Math.abs(earlyAvg)) * 100 : 0;
  const trend = changePct > 5 ? 'rising' : changePct < -5 ? 'falling' : 'stable';

  return { min, max, avg, trend, changePct };
};

const formatValue = (id, val) => {
  if (val == null) return '—';
  if (id === 'electrons') return val > 9999 ? val.toExponential(2) : val.toFixed(0);
  return id === 'xray' ? val.toExponential(2) : val.toFixed(2);
};

const Dashboard = () => {
  const { chartData, lastUpdated, loading, fetchTelemetry } = useTelemetry();
  const { dark, toggle: toggleTheme } = useTheme();

  const [activeMetricId, setActiveMetricId] = useState('speed');
  const [selectedHours, setSelectedHours] = useState(24);
  const [isExpert, setIsExpert] = useState(false);

  const activeMetric = metricsList.find(m => m.id === activeMetricId);
  const accentColor = '#3b82f6';

  const getLatestStats = () => {
    const stats = {};
    const times = {};
    metricsList.forEach(m => {
      for (let i = chartData.length - 1; i >= 0; i--) {
        if (chartData[i][m.id] != null) {
          stats[m.id] = chartData[i][m.id];
          times[m.id] = chartData[i].time;
          break;
        }
      }
    });
    return { stats, times };
  };
  const { stats: latestData, times: latestTimes } = getLatestStats();

  const metricStats = useMemo(() => {
    if (!isExpert) return {};
    const result = {};
    metricsList.forEach(m => { result[m.id] = computeStats(chartData, m.id); });
    return result;
  }, [chartData, isExpert]);

  const gScale = useMemo(() => getGScale(latestData.kp), [latestData.kp]);
  const rScale = useMemo(() => getRScale(latestData.xray), [latestData.xray]);
  const windCondition = useMemo(() => getWindCondition(latestData.speed, latestData.bz), [latestData.speed, latestData.bz]);

  const handleTimeRangeChange = (hours) => {
    setSelectedHours(hours);
    fetchTelemetry(hours);
  };

  if (loading && chartData.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-card)', borderTopColor: accentColor }} />
        <div className="font-mono tracking-[0.3em] text-xs" style={{ color: 'var(--text-dim)' }}>PULLING TELEMETRY...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 lg:p-8 font-sans" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      {/* Dashboard header */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
            Mission Control
          </h1>
          <div className="text-sm font-medium tracking-wide flex items-center flex-wrap gap-3" style={{ color: 'var(--text-dim)' }}>
            {isExpert ? 'Advanced Telemetry Analysis & Custom Monitoring' : 'Live Space Weather Telemetry & Active Anomalies'}

            {/* Beginner/Expert Toggle */}
            <div className="ml-2 flex items-center p-1 rounded-full shadow-inner" style={{ background: dark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)', border: '1px solid var(--border-card)' }}>
              <span className={`text-[9px] font-bold tracking-wider uppercase px-2 transition-colors duration-300`}
                style={{ color: !isExpert ? '#3b82f6' : 'var(--text-faint)' }}>
                Beginner
              </span>
              <button
                onClick={() => {
                  const newMode = !isExpert;
                  setIsExpert(newMode);
                  if (!newMode) { setSelectedHours(24); setActiveMetricId('speed'); fetchTelemetry(24); }
                }}
                className="relative w-10 h-5 rounded-full flex items-center cursor-pointer transition-colors"
                style={{ background: dark ? '#0f172a' : '#e2e8f0', border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                aria-label="Toggle Expert Mode"
              >
                <div className={`absolute w-3.5 h-3.5 rounded-full transition-transform duration-300 ease-in-out ${isExpert ? 'translate-x-[22px]' : 'translate-x-[3px]'}`}
                  style={{ backgroundColor: isExpert ? '#f97316' : '#3b82f6', boxShadow: `0 0 10px ${isExpert ? 'rgba(249,115,22,0.6)' : 'rgba(59,130,246,0.6)'}` }}
                />
              </button>
              <span className={`text-[9px] font-bold tracking-wider uppercase px-2 transition-colors duration-300`}
                style={{ color: isExpert ? '#f97316' : 'var(--text-faint)' }}>
                Expert
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition-all duration-300 hover:scale-105"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            aria-label="Toggle theme"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark
              ? <Sun className="w-4 h-4" style={{ color: '#fbbf24' }} />
              : <Moon className="w-4 h-4" style={{ color: '#6366f1' }} />
            }
          </button>

          {/* Last Sync */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-full"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <span className="text-[10px] font-mono tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
              LAST SYNC: {lastUpdated}
            </span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Telemetry + Chart */}
        <div className="xl:col-span-2 flex flex-col gap-5">

          {/* Controls */}
          {!isExpert && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-1.5">
              {metricsList.map(metric => (
                  <button
                    key={metric.id}
                    onClick={() => setActiveMetricId(metric.id)}
                    className="px-3.5 py-2 rounded-lg font-semibold text-xs tracking-wide transition-all duration-300"
                    style={{
                      background: activeMetricId === metric.id ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'var(--bg-card)',
                      border: `1px solid ${activeMetricId === metric.id ? (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') : 'transparent'}`,
                      color: activeMetricId === metric.id ? 'var(--text-primary)' : 'var(--text-dim)',
                      textShadow: activeMetricId === metric.id ? `0 0 8px ${metric.color}60` : 'none',
                      borderBottomColor: activeMetricId === metric.id ? metric.color : '',
                    }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ backgroundColor: metric.color, opacity: activeMetricId === metric.id ? 1 : 0.3 }} />
                    {metric.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metric Explanation — Beginner Only */}
          {!isExpert && (
            <div className="rounded-xl p-4 text-sm leading-relaxed"
              style={{ background: dark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.06)', border: `1px solid ${dark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.12)'}`, color: dark ? 'rgba(147,197,253,0.7)' : '#1e40af' }}>
              {getBeginnerExplanation(activeMetricId)}
            </div>
          )}

          {/* NOAA Condition Assessment — Expert Only */}
          {isExpert && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { scale: gScale, label: 'Geomagnetic' },
                { scale: rScale, label: 'Radio Blackout' },
              ].map(({ scale, label }) => (
                <div key={label} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black font-mono flex-shrink-0"
                    style={{ background: `${scale.color}18`, color: scale.color, border: `1px solid ${scale.color}30` }}>
                    {scale.level}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-dim)' }}>{label}</span>
                    <span className="text-sm font-semibold truncate" style={{ color: scale.color }}>{scale.label}</span>
                  </div>
                </div>
              ))}
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                <Shield className="w-5 h-5 flex-shrink-0" style={{ color: windCondition.color }} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-dim)' }}>Solar Wind</span>
                  <span className="text-sm font-semibold truncate" style={{ color: windCondition.color }}>{windCondition.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Bar */}
          <div className={`grid gap-3 mt-1 mb-2 grid-cols-3 md:grid-cols-6`}>
            {metricsList.map(m => {
              const val = latestData[m.id];
              const t = latestTimes[m.id] || 'N/A';
              const displayVal = formatValue(m.id, val);
              const stats = metricStats[m.id];

              return (
                <div key={m.id} className="rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden group"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ backgroundColor: m.color }} />
                  <div className="flex flex-col items-center justify-center gap-0.5 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-center" style={{ color: 'var(--text-dim)' }}>{m.title}</span>
                    <span className="text-[8px] italic" style={{ color: 'var(--text-faint)' }}>Last point: {t}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-mono font-bold" style={{ color: m.color, textShadow: `0 0 10px ${m.color}40` }}>
                      {displayVal}
                    </span>
                    {isExpert && stats && (
                      <span className="flex items-center" title={`${stats.changePct > 0 ? '+' : ''}${stats.changePct.toFixed(1)}% trend`}>
                        {stats.trend === 'rising' && <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
                        {stats.trend === 'falling' && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
                        {stats.trend === 'stable' && <Minus className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />}
                      </span>
                    )}
                  </div>

                  {isExpert && stats && (
                    <div className="mt-1.5 flex items-center gap-2 text-[9px] font-mono" style={{ color: 'var(--text-dim)' }}>
                      <span title="Minimum">↓{formatValue(m.id, stats.min)}</span>
                      <span style={{ color: 'var(--text-faint)' }}>·</span>
                      <span title="Average">μ{formatValue(m.id, stats.avg)}</span>
                      <span style={{ color: 'var(--text-faint)' }}>·</span>
                      <span title="Maximum">↑{formatValue(m.id, stats.max)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chart Header Controls — Beginner Only (Expert uses controls near correlation chart) */}
          {!isExpert && (
            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-0.5 p-1 rounded-lg shadow-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                {timeRanges.map(range => (
                  <button
                    key={range.label}
                    onClick={() => handleTimeRangeChange(range.hours)}
                    className="px-3 py-1.5 rounded-md text-[10px] font-bold font-mono tracking-[0.15em] transition-all duration-300"
                    style={selectedHours === range.hours ? {
                      color: accentColor,
                      background: `${accentColor}18`,
                      border: `1px solid ${accentColor}30`,
                      boxShadow: `0 0 8px ${accentColor}14`,
                    } : { color: 'var(--text-dim)', border: '1px solid transparent' }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-h-[520px] flex flex-col">
            {isExpert ? (
              <DerivedPhysicsPanel latestData={latestData} dark={dark} />
            ) : (
              <MetricChart
                title={activeMetric.title}
                data={chartData}
                dataKey={activeMetric.id}
                color={activeMetric.color}
                selectedHours={selectedHours}
                dark={dark}
              />
            )}
          </div>
          {!isExpert && <DailySummaryPanel dark={dark} />}
        </div>

        {/* Right Column */}
        <div className="xl:col-span-1 h-[600px] xl:h-auto">
          {isExpert ? (
            <ExpertAnalysisPanel latestData={latestData} chartData={chartData} />
          ) : (
            <AlertFeed limitHours={24} dark={dark} />
          )}
        </div>
      </div>

      {/* ─── Expert Only: Correlation Chart (Full Width) + Custom Alerts ─── */}
      {isExpert && (
        <div className="mt-8 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)', fontFamily: "'Outfit', sans-serif" }}>
                Multi-Metric Correlation
              </h2>
              <div className="flex items-center gap-0.5 p-1 rounded-lg shadow-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
                {timeRanges.map(range => (
                  <button
                    key={range.label}
                    onClick={() => handleTimeRangeChange(range.hours)}
                    className="px-3 py-1.5 rounded-md text-[10px] font-bold font-mono tracking-[0.15em] transition-all duration-300"
                    style={selectedHours === range.hours ? {
                      color: accentColor,
                      background: `${accentColor}18`,
                      border: `1px solid ${accentColor}30`,
                      boxShadow: `0 0 8px ${accentColor}14`,
                    } : { color: 'var(--text-dim)', border: '1px solid transparent' }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <CorrelationChart data={chartData} dark={dark} />
          </div>
          <CustomAlertPanel latestData={latestData} dark={dark} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
