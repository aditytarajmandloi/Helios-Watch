import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { useTheme } from '../context/ThemeContext';

// Interactive module components
import SunExplorer from '../components/education/SunExplorer';
import FlareClassroom from '../components/education/FlareClassroom';
import KpScaleExplorer from '../components/education/KpScaleExplorer';
import SolarWindJourney from '../components/education/SolarWindJourney';
import RadiationBelts from '../components/education/RadiationBelts';
import EduScrollytelling from '../components/EduScrollytelling';

/* ═══════════════════════════════════════════════════════════
   MODULE DEFINITIONS
   ═══════════════════════════════════════════════════════════ */
const modules = [
  {
    id: 'sun-explorer',
    number: '01',
    title: 'The Sun — Layer by Layer',
    subtitle: 'Stellar Structure',
    description: 'Explore the Sun\'s internal architecture from the nuclear furnace at its core to the million-degree corona. Tap each layer to reveal its temperature, density, and role in driving space weather.',
    liveDataKey: null,
    tags: ['Interactive SVG', '6 Layers', 'Temperature Data'],
    status: 'available',
  },
  {
    id: 'flare-classroom',
    number: '02',
    title: 'Solar Flares — Live Classroom',
    subtitle: 'X-Ray Classification',
    description: 'Master the A→B→C→M→X flare classification system used by NOAA scientists. See the current flare class in real-time from GOES satellite X-ray sensors.',
    liveDataKey: 'xray',
    tags: ['Live Data', 'GOES XRS', '5 Classes'],
    status: 'available',
  },
  {
    id: 'solar-wind-journey',
    number: '03',
    title: 'The Solar Wind Journey',
    subtitle: 'Sun to Earth in 3 Days',
    description: 'Follow a coronal mass ejection from the Sun\'s surface through interplanetary space to Earth\'s magnetopause. Understand how solar wind speed determines arrival time.',
    liveDataKey: 'speed',
    tags: ['Live Plasma', 'CME Tracking', '150M km'],
    status: 'available',
  },
  {
    id: 'kp-scale',
    number: '04',
    title: 'Geomagnetic Storms — The Kp Scale',
    subtitle: 'Planetary Disturbance Index',
    description: 'Slide through the 0–9 Kp scale and discover how geomagnetic storms affect satellites, power grids, GPS navigation, and aurora visibility at different intensity levels.',
    liveDataKey: 'kp',
    tags: ['Live Index', 'G-Scale', 'Aurora Map'],
    status: 'available',
  },
  {
    id: 'radiation-belts',
    number: '05',
    title: 'The Radiation Belts',
    subtitle: 'Van Allen Belt Physics',
    description: 'Understand why high-energy "killer electrons" accumulate in Earth\'s radiation belts after solar storms, and how they threaten spacecraft through deep dielectric charging.',
    liveDataKey: 'electrons',
    tags: ['Live Electrons', 'Van Allen', '>2 MeV'],
    status: 'available',
  },
];

/* ═══════════════════════════════════════════════════════════
   SIMULATION CARD (special card for Project DEFEND)
   ═══════════════════════════════════════════════════════════ */
const simulationCard = {
  id: 'project-defend',
  title: 'PROJECT DEFEND',
  subtitle: 'Command Center Simulation',
  description: 'Assume the role of Earth Defense Commander. A coronal mass ejection is incoming — allocate limited shield energy across satellites, power grids, and communications to survive the impact. Difficulty is determined by live space weather conditions.',
  liveDataKey: 'kp',
  status: 'available',
};

/* ═══════════════════════════════════════════════════════════
   HELPER: Get live data value for display on cards
   ═══════════════════════════════════════════════════════════ */
const getFlareClass = (xray) => {
  if (xray == null) return '—';
  if (xray >= 1e-4) return 'X';
  if (xray >= 1e-5) return 'M';
  if (xray >= 1e-6) return 'C';
  if (xray >= 1e-7) return 'B';
  return 'A';
};

const getThreatLevel = (kp) => {
  if (kp == null) return '—';
  if (kp >= 7) return 'SEVERE';
  if (kp >= 5) return 'HIGH';
  if (kp >= 3) return 'MODERATE';
  return 'LOW';
};

const formatLiveValue = (key, value) => {
  if (value == null) return '—';
  switch (key) {
    case 'xray': return getFlareClass(value);
    case 'speed': return `${Math.round(value)} km/s`;
    case 'kp': return value.toFixed(1);
    case 'electrons': return value >= 1000 ? `${(value / 1000).toFixed(1)}K pfu` : `${Math.round(value)} pfu`;
    default: return String(value);
  }
};

/* ═══════════════════════════════════════════════════════════
   MODULE CARD COMPONENT
   ═══════════════════════════════════════════════════════════ */
const ModuleCard = ({ module, liveValue, onClick }) => {
  const displayValue = module.liveDataKey ? formatLiveValue(module.liveDataKey, liveValue) : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer border rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/10 backdrop-blur-md shadow-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
      }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <span className="text-sm font-mono text-white/30 pt-0.5">
              {module.number}
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-blue-400 mb-1">
                {module.subtitle}
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {module.title}
              </h3>
            </div>
          </div>

          {displayValue && displayValue !== '—' && (
            <div className="px-2.5 py-1 rounded border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <span className="text-[10px] font-mono font-bold text-white/70">
                LIVE: {displayValue}
              </span>
            </div>
          )}
        </div>

        <p className="text-[13px] leading-relaxed text-white/50 mb-6">
          {module.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {module.tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] font-mono tracking-wide px-2 py-1 rounded"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70 group-hover:text-white transition-colors">
            Start Lesson →
          </span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SIMULATION BANNER COMPONENT
   ═══════════════════════════════════════════════════════════ */
const SimulationBanner = ({ kpValue }) => {
  const threat = getThreatLevel(kpValue);

  return (
    <Link to="/education" className="block mt-6">
      <div className="rounded-xl border transition-all duration-300 hover:bg-white/10 backdrop-blur-md shadow-xl"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-red-400">
                  {simulationCard.subtitle}
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border"
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  THREAT: {threat}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {simulationCard.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-white/50 max-w-2xl">
                {simulationCard.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                Launch Simulator
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN EDUCATION HUB PAGE
   ═══════════════════════════════════════════════════════════ */
const EducationHub = () => {
  const { chartData } = useTelemetry();
  const [activeModule, setActiveModule] = useState(null);

  // Module component map
  const moduleComponents = {
    'sun-explorer': SunExplorer,
    'flare-classroom': FlareClassroom,
    'solar-wind-journey': SolarWindJourney,
    'kp-scale': KpScaleExplorer,
    'radiation-belts': RadiationBelts,
  };

  // Extract latest live values from chartData
  const latestData = useMemo(() => {
    if (!chartData || chartData.length === 0) return {};
    const last = chartData[chartData.length - 1];
    return {
      speed: last?.speed,
      density: last?.density,
      bz: last?.bz,
      xray: last?.xray,
      kp: last?.kp,
      electrons: last?.electrons,
    };
  }, [chartData]);

  // If a module is active, render it full-screen
  if (activeModule && moduleComponents[activeModule]) {
    const ModuleComponent = moduleComponents[activeModule];
    return <ModuleComponent onBack={() => setActiveModule(null)} />;
  }

  return (
    <EduScrollytelling>
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 relative">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="mb-12 border-b border-white/10 pb-8">
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-400 mb-3">
            Education Center
          </p>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Space Weather Science
          </h1>

          <p className="text-base text-white/50 max-w-3xl leading-relaxed">
            Interactive modules powered by live satellite telemetry. Each lesson is connected to real-time data from NOAA's DSCOVR and GOES spacecraft — exploring authentic data instead of static textbooks.
          </p>
        </div>

        {/* ── Module Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              liveValue={mod.liveDataKey ? latestData[mod.liveDataKey] : null}
              onClick={() => moduleComponents[mod.id] ? setActiveModule(mod.id) : null}
            />
          ))}
        </div>

        {/* ── Simulation Banner (full width) ──────────────── */}
        <SimulationBanner kpValue={latestData.kp} />

        {/* ── Bottom: Data attribution ────────────────────── */}
        <div className="mt-12 pt-8 text-center border-t border-white/10">
          <p className="text-[10px] font-mono text-white/30 tracking-widest">
            EDUCATIONAL CONTENT POWERED BY LIVE TELEMETRY FROM NOAA SWPC · NASA DONKI · GOES-16/18 XRS · DSCOVR FARADAY CUP
          </p>
        </div>
      </div>
    </EduScrollytelling>
  );
};

export default EducationHub;
