import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { ArrowLeft, Wind, Zap, Globe, Sun, Radio, ChevronRight, BookOpen, Gamepad2 } from 'lucide-react';
import WindChallenge from './WindChallenge';

/* ═══════════════════════════════════════════════════════════
   WAYPOINT DATA — Sun-to-Earth journey stages
   ═══════════════════════════════════════════════════════════ */
const WAYPOINTS = [
  {
    id: 'corona',
    name: 'Solar Corona',
    distanceAU: 0,
    distanceKm: '0',
    icon: Sun,
    color: '#fbbf24',
    description: 'The journey begins in the Sun\'s million-degree corona. Magnetic field loops confine plasma, but occasionally break open, releasing it as solar wind or violent coronal mass ejections (CMEs).',
    physics: 'Magnetic reconnection heats coronal plasma to escape velocity (~400–800 km/s). The Parker spiral shapes the outbound magnetic field.',
    liveMetric: null,
    timeTo: null,
  },
  {
    id: 'inner-helio',
    name: 'Inner Heliosphere',
    distanceAU: 0.1,
    distanceKm: '15,000,000',
    icon: Wind,
    color: '#f97316',
    description: 'Within 0.1 AU, the solar wind is still accelerating. The Parker Solar Probe operates here, surviving temperatures over 1,400°C behind its heat shield while sampling the nascent solar wind.',
    physics: 'Alfvén waves and magnetic switchbacks detected by Parker Solar Probe suggest that wave-driven acceleration continues well beyond the corona.',
    liveMetric: null,
    timeTo: '2–6 hours',
  },
  {
    id: 'mid-transit',
    name: 'Interplanetary Medium',
    distanceAU: 0.5,
    distanceKm: '75,000,000',
    icon: Wind,
    color: '#38bdf8',
    description: 'At the halfway point, the solar wind has reached its cruise speed. The interplanetary magnetic field (IMF) spirals outward. CMEs can be detected by the STEREO spacecraft from this vantage.',
    physics: 'The Parker spiral angle at 0.5 AU is ~30°. Co-rotating interaction regions (CIRs) form where fast wind catches slow wind.',
    liveMetric: null,
    timeTo: '20–40 hours',
  },
  {
    id: 'l1-point',
    name: 'L1 Lagrange Point (DSCOVR)',
    distanceAU: 0.99,
    distanceKm: '148,000,000',
    icon: Radio,
    color: '#818cf8',
    description: 'NOAA\'s DSCOVR satellite orbits here — 1.5 million km sunward of Earth. It provides 15–60 minutes of warning before solar wind impacts Earth\'s magnetosphere. This is where YOUR dashboard data comes from.',
    physics: 'The L1 point balances Sun and Earth gravity, allowing a stable monitoring position. DSCOVR\'s Faraday Cup measures speed, density, and temperature.',
    liveMetric: 'speed',
    timeTo: '15–60 min warning',
  },
  {
    id: 'bow-shock',
    name: 'Bow Shock',
    distanceAU: 1.0,
    distanceKm: '149,460,000',
    icon: Zap,
    color: '#a78bfa',
    description: 'The solar wind slams into Earth\'s magnetic field at supersonic speed, creating a standing shock wave — the bow shock. Plasma decelerates abruptly, heats up, and becomes turbulent.',
    physics: 'At the bow shock, the solar wind decelerates from ~400 km/s to ~100 km/s. Kinetic energy converts to thermal energy, heating the magnetosheath plasma.',
    liveMetric: 'density',
    timeTo: '~5 min after L1',
  },
  {
    id: 'magnetopause',
    name: 'Magnetopause & Impact',
    distanceAU: 1.0,
    distanceKm: '149,596,000',
    icon: Globe,
    color: '#22c55e',
    description: 'The magnetopause is Earth\'s magnetic shield boundary. When Bz turns southward (negative), the IMF reconnects with Earth\'s field, opening the magnetosphere to energetic particles and triggering geomagnetic storms.',
    physics: 'Southward Bz (negative) is the key: it enables magnetic reconnection at the dayside magnetopause, driving Dungey-cycle convection and substorm activity.',
    liveMetric: 'bz',
    timeTo: 'Impact!',
  },
];

/* ═══════════════════════════════════════════════════════════
   TRAVEL TIME CALCULATOR
   ═══════════════════════════════════════════════════════════ */
const calcTravelTime = (speedKmS) => {
  if (!speedKmS || speedKmS <= 0) return null;
  const distKm = 1.496e8; // Sun-Earth distance
  const seconds = distKm / speedKmS;
  const hours = seconds / 3600;
  if (hours < 24) return `${hours.toFixed(0)} hours`;
  return `${(hours / 24).toFixed(1)} days`;
};

/* ═══════════════════════════════════════════════════════════
   ANIMATED PARTICLE STREAM (represents solar wind flow)
   ═══════════════════════════════════════════════════════════ */
const ParticleStream = ({ speed }) => {
  const normalizedSpeed = Math.max(0.3, Math.min(1, (speed || 400) / 800));
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      y: 48 + (Math.random() - 0.5) * 10,
      delay: Math.random() * 3,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.4 + 0.1,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ top: '0', height: '100%' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${p.y}%`,
            width: `${p.size * 2}px`,
            height: `${p.size}px`,
            backgroundColor: `rgba(56,189,248,${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(56,189,248,${p.opacity * 0.5})`,
            animation: `streamParticle ${3 / normalizedSpeed}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   WAYPOINT NODE COMPONENT
   ═══════════════════════════════════════════════════════════ */
const WaypointNode = ({ wp, isSelected, isReached, onClick, liveValue }) => {
  const Icon = wp.icon;

  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={onClick}>
      {/* Node circle */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
        style={{
          background: isSelected
            ? `${wp.color}25`
            : isReached ? `${wp.color}10` : 'rgba(255,255,255,0.03)',
          border: `2px solid ${isSelected ? wp.color : isReached ? `${wp.color}40` : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isSelected ? `0 0 20px ${wp.color}30, inset 0 0 10px ${wp.color}10` : 'none',
        }}
      >
        <Icon className="w-5 h-5 transition-colors duration-300"
          style={{ color: isSelected || isReached ? wp.color : 'rgba(255,255,255,0.2)' }} />

        {/* Pulse ring on selected */}
        {isSelected && (
          <div className="absolute inset-0 rounded-full animate-ping"
            style={{ border: `1px solid ${wp.color}30` }} />
        )}
      </div>

      {/* Label */}
      <span className="text-[9px] font-mono text-center leading-tight max-w-[70px] transition-colors duration-300"
        style={{ color: isSelected ? wp.color : 'rgba(255,255,255,0.25)' }}>
        {wp.name}
      </span>

      {/* Live value badge */}
      {liveValue != null && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{
          background: `${wp.color}10`,
          border: `1px solid ${wp.color}15`,
        }}>
          <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: wp.color }} />
          <span className="text-[8px] font-mono font-bold" style={{ color: wp.color }}>
            {typeof liveValue === 'number' ? (Math.abs(liveValue) < 1 ? liveValue.toFixed(2) : Math.round(liveValue)) : liveValue}
          </span>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const SolarWindJourney = ({ onBack }) => {
  const { chartData } = useTelemetry();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState('learn');

  // Get latest live values
  const latestData = useMemo(() => {
    if (!chartData || chartData.length === 0) return {};
    const last = chartData[chartData.length - 1];
    return { speed: last?.speed, density: last?.density, bz: last?.bz };
  }, [chartData]);

  const travelTime = calcTravelTime(latestData.speed);
  const selected = WAYPOINTS[selectedIdx];

  // Auto-advance animation
  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setSelectedIdx(prev => {
        if (prev >= WAYPOINTS.length - 1) { setAutoPlay(false); return prev; }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const getLiveValue = (wp) => {
    if (!wp.liveMetric) return null;
    return latestData[wp.liveMetric];
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at ${10 + (selectedIdx / (WAYPOINTS.length - 1)) * 80}% 50%, ${selected.color}06, transparent 50%)`,
        transition: 'background 1s ease',
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-5 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-4 h-4 text-white/40" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-[0.3em] font-mono" style={{ color: '#38bdf8' }}>Module 03</p>
            <h1 className="text-2xl font-bold text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>
              The Solar Wind Journey
            </h1>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setMode('learn')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'learn' ? 'rgba(56,189,248,0.12)' : 'transparent', color: mode === 'learn' ? '#38bdf8' : 'rgba(255,255,255,0.25)' }}>
              <BookOpen className="w-3 h-3" /> Learn
            </button>
            <button onClick={() => setMode('challenge')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'challenge' ? 'rgba(56,189,248,0.12)' : 'transparent', color: mode === 'challenge' ? '#38bdf8' : 'rgba(255,255,255,0.25)' }}>
              <Gamepad2 className="w-3 h-3" /> Challenge
            </button>
          </div>

          {/* Live travel time */}
          {latestData.speed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
              background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
            }}>
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <div className="text-right">
                <p className="text-[8px] font-mono text-white/30">Current transit</p>
                <p className="text-[12px] font-mono font-bold text-sky-400">
                  {travelTime} at {Math.round(latestData.speed)} km/s
                </p>
              </div>
            </div>
          )}
        </div>

        {mode === 'learn' ? (
          <>
            <div className="relative rounded-2xl p-6 mb-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <ParticleStream speed={latestData.speed} />
              <div className="relative z-10">
                <div className="absolute top-6 left-6 right-6 h-[2px]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="h-full transition-all duration-700" style={{ width: `${(selectedIdx / (WAYPOINTS.length - 1)) * 100}%`, background: `linear-gradient(to right, #fbbf24, ${selected.color})`, boxShadow: `0 0 8px ${selected.color}40` }} />
                </div>
                <div className="flex justify-between pt-0">
                  {WAYPOINTS.map((wp, i) => (
                    <WaypointNode key={wp.id} wp={wp} isSelected={i === selectedIdx} isReached={i <= selectedIdx} onClick={() => setSelectedIdx(i)} liveValue={getLiveValue(wp)} />
                  ))}
                </div>
              </div>
              <div className="flex justify-center mt-4 relative z-10">
                <button onClick={() => { setSelectedIdx(0); setAutoPlay(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 hover:scale-105"
                  style={{ background: autoPlay ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${autoPlay ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`, color: autoPlay ? '#38bdf8' : 'rgba(255,255,255,0.3)' }}>
                  {autoPlay ? '▶ Simulating Journey...' : '▶ Simulate Full Transit'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" key={selected.id}>
              <div className="rounded-2xl p-6 animate-fadeIn" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${selected.color}15`, border: `1px solid ${selected.color}25` }}>
                    {React.createElement(selected.icon, { className: 'w-5 h-5', style: { color: selected.color } })}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-mono" style={{ color: selected.color }}>Stage {selectedIdx + 1} of {WAYPOINTS.length}</p>
                    <h3 className="text-lg font-bold text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>{selected.name}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1">Distance</p>
                    <p className="text-sm font-mono font-bold" style={{ color: selected.color }}>{selected.distanceAU} AU</p>
                    <p className="text-[9px] font-mono text-white/20">{selected.distanceKm} km</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1">Travel Time</p>
                    <p className="text-sm font-mono font-bold" style={{ color: selected.color }}>{selected.timeTo || 'Origin'}</p>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-white/50">{selected.description}</p>
              </div>
              <div className="rounded-2xl p-6 animate-fadeIn" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: '100ms' }}>
                <h4 className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold mb-4" style={{ color: selected.color }}>
                  <Zap className="w-3 h-3 inline mr-1.5" />Plasma Physics
                </h4>
                <p className="text-[13px] leading-relaxed text-white/45 mb-6">{selected.physics}</p>
                {selected.liveMetric && latestData[selected.liveMetric] != null && (
                  <div className="p-4 rounded-xl" style={{ background: `${selected.color}06`, border: `1px solid ${selected.color}15` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selected.color, boxShadow: `0 0 6px ${selected.color}` }} />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: selected.color }}>Live Sensor Reading</span>
                    </div>
                    <p className="text-2xl font-mono font-black" style={{ color: selected.color }}>
                      {selected.liveMetric === 'speed' && `${Math.round(latestData.speed)} km/s`}
                      {selected.liveMetric === 'density' && `${latestData.density?.toFixed(1)} p/cm³`}
                      {selected.liveMetric === 'bz' && `${latestData.bz?.toFixed(1)} nT`}
                    </p>
                    <p className="text-[10px] text-white/25 font-mono mt-1">
                      {selected.liveMetric === 'speed' && 'DSCOVR Faraday Cup'}
                      {selected.liveMetric === 'density' && 'DSCOVR Plasma Probe'}
                      {selected.liveMetric === 'bz' && 'DSCOVR Magnetometer'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <WindChallenge />
        )}
      </div>

      <style>{`
        @keyframes streamParticle {
          0% { left: -2%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 102%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out both; }
      `}</style>
    </div>
  );
};

export default SolarWindJourney;
