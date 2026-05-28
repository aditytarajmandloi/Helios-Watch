import React, { useState, useMemo, useRef } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { ArrowLeft, Satellite, AlertTriangle, Shield, Zap, Radio, Info, BookOpen, Gamepad2 } from 'lucide-react';
import BeltChallenge from './BeltChallenge';

/* ═══════════════════════════════════════════════════════════
   VAN ALLEN BELT DATA
   ═══════════════════════════════════════════════════════════ */
const BELTS = [
  {
    id: 'inner',
    name: 'Inner Belt',
    altRange: '1,000 – 6,000 km',
    altMin: 1000,
    altMax: 6000,
    peakAlt: 3000,
    color: '#f97316',
    glowColor: 'rgba(249,115,22,0.15)',
    particles: 'Protons (10–100 MeV)',
    origin: 'Cosmic Ray Albedo Neutron Decay (CRAND)',
    description: 'The inner belt is a stable population of high-energy protons trapped by Earth\'s magnetic field. These protons originate from cosmic rays striking atmospheric atoms, which produce neutrons that decay into protons and electrons.',
    hazards: [
      'Single-Event Upsets (SEU) in satellite electronics',
      'Cumulative radiation dose for astronauts in ISS orbit',
      'Degradation of solar panel efficiency over time',
    ],
    fact: 'The inner belt is remarkably stable — it has existed since Earth formed its magnetic field ~3.5 billion years ago. The South Atlantic Anomaly (SAA) is where this belt dips closest to Earth\'s surface.',
    discovery: 'Discovered by James Van Allen in 1958 using Explorer 1 — the first US satellite.',
  },
  {
    id: 'slot',
    name: 'Slot Region',
    altRange: '6,000 – 13,000 km',
    altMin: 6000,
    altMax: 13000,
    peakAlt: 9500,
    color: '#64748b',
    glowColor: 'rgba(100,116,139,0.1)',
    particles: 'Low particle density (gap)',
    origin: 'Wave-particle interactions clear this region',
    description: 'The slot region is a relatively empty zone between the two belts. Very Low Frequency (VLF) radio waves from lightning and human transmitters scatter particles out of this region, keeping it depleted.',
    hazards: [
      'Generally safe — low radiation environment',
      'Medium Earth Orbit (MEO) GPS satellites operate here',
    ],
    fact: 'Human-made VLF transmissions (like submarine communications) actually create this gap. They scatter electrons, preventing them from accumulating. We are literally reshaping Earth\'s radiation environment.',
    discovery: 'The slot\'s connection to VLF waves was confirmed by the Van Allen Probes mission (2012–2019).',
  },
  {
    id: 'outer',
    name: 'Outer Belt',
    altRange: '13,000 – 60,000 km',
    altMin: 13000,
    altMax: 60000,
    peakAlt: 20000,
    color: '#c084fc',
    glowColor: 'rgba(192,132,252,0.15)',
    particles: 'Electrons (0.1–10 MeV) — "Killer Electrons"',
    origin: 'Solar wind injection + local acceleration',
    description: 'The outer belt is highly dynamic and dangerous. It swells dramatically during geomagnetic storms as solar wind injects energetic electrons. These ">2 MeV killer electrons" can penetrate spacecraft shielding and cause deep dielectric charging — internal electrical discharges that destroy electronics.',
    hazards: [
      'Deep dielectric charging: electrons penetrate shielding and build up charge inside electronics',
      'Surface charging: differential voltages across spacecraft surfaces cause arcing',
      'Geostationary satellites (36,000 km) are immersed in this belt',
      'Telstar 401 satellite failure was caused by killer electron event (1997)',
    ],
    fact: 'Your dashboard\'s ">2 MeV Electron Flux" metric directly measures these killer electrons. When it exceeds 1,000 pfu (particle flux units), spacecraft operators enter heightened alert mode.',
    discovery: 'The outer belt\'s extreme variability was first characterized by the CRRES satellite (1990–1991).',
  },
];

/* ═══════════════════════════════════════════════════════════
   DANGER THRESHOLDS for electron flux
   ═══════════════════════════════════════════════════════════ */
const ELECTRON_THRESHOLDS = [
  { level: 'Background', max: 100, color: '#22c55e', description: 'Normal radiation belt activity.' },
  { level: 'Elevated', max: 1000, color: '#fbbf24', description: 'Outer belt energized. Monitoring recommended.' },
  { level: 'High', max: 10000, color: '#f97316', description: 'Active charging environment. Spacecraft in alert mode.' },
  { level: 'Critical', max: 100000, color: '#ef4444', description: 'Extreme radiation storm. Satellite anomalies expected.' },
];

const getElectronLevel = (flux) => {
  if (flux == null) return ELECTRON_THRESHOLDS[0];
  for (const t of ELECTRON_THRESHOLDS) {
    if (flux < t.max) return t;
  }
  return ELECTRON_THRESHOLDS[ELECTRON_THRESHOLDS.length - 1];
};

/* ═══════════════════════════════════════════════════════════
   SVG CROSS-SECTION of Earth + Radiation Belts
   ═══════════════════════════════════════════════════════════ */
const BeltDiagram = ({ selectedBelt, onSelect, electronFlux }) => {
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const earthR = 30;

  // Scale: 1px = ~200km for visualization
  const altToR = (altKm) => earthR + (altKm / 60000) * (size / 2 - earthR - 10);

  const electronLevel = getElectronLevel(electronFlux);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[400px] mx-auto">
      <defs>
        {BELTS.map(belt => (
          <radialGradient key={`bg-${belt.id}`} id={`bg-${belt.id}`} cx="50%" cy="50%">
            <stop offset="0%" stopColor={belt.color} stopOpacity={0.01} />
            <stop offset="40%" stopColor={belt.color} stopOpacity={selectedBelt === belt.id ? 0.2 : 0.06} />
            <stop offset="70%" stopColor={belt.color} stopOpacity={selectedBelt === belt.id ? 0.25 : 0.08} />
            <stop offset="100%" stopColor={belt.color} stopOpacity={0.01} />
          </radialGradient>
        ))}
        <filter id="earth-glow">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Background field lines (simplified magnetic dipole) */}
      {[0.3, 0.5, 0.7, 0.9].map((f, i) => (
        <ellipse
          key={i}
          cx={cx} cy={cy}
          rx={earthR + f * (size / 2 - earthR - 10)}
          ry={earthR + f * (size / 2 - earthR - 10) * 0.4}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.5"
          strokeDasharray="4,6"
        />
      ))}

      {/* Belt regions (rendered as annular rings) */}
      {BELTS.map(belt => {
        const rMin = altToR(belt.altMin);
        const rMax = altToR(belt.altMax);
        const isSelected = selectedBelt === belt.id;

        return (
          <g key={belt.id} className="cursor-pointer" onClick={() => onSelect(belt.id)}>
            {/* Belt fill */}
            <circle cx={cx} cy={cy} r={rMax} fill={`url(#bg-${belt.id})`}
              style={{ transition: 'all 0.5s ease' }} />
            <circle cx={cx} cy={cy} r={rMin} fill="#050508" />

            {/* Border rings */}
            <circle cx={cx} cy={cy} r={rMax}
              fill="none"
              stroke={isSelected ? belt.color : `${belt.color}20`}
              strokeWidth={isSelected ? 1.5 : 0.5}
              strokeDasharray={isSelected ? 'none' : '2,4'}
              style={{
                transition: 'all 0.5s ease',
                filter: isSelected ? `drop-shadow(0 0 6px ${belt.color}50)` : 'none',
              }}
            />
            <circle cx={cx} cy={cy} r={rMin}
              fill="none"
              stroke={isSelected ? belt.color : `${belt.color}15`}
              strokeWidth={isSelected ? 1 : 0.3}
              style={{ transition: 'all 0.5s ease' }}
            />

            {/* Label */}
            {isSelected && (
              <text
                x={cx}
                y={cy - (rMin + rMax) / 2 + 3}
                textAnchor="middle"
                fill={belt.color}
                fontSize="7"
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
                letterSpacing="0.15em"
              >
                {belt.name.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {/* Geostationary orbit marker */}
      <circle cx={cx} cy={cy} r={altToR(36000)}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="3,5" />
      <text x={cx + altToR(36000) + 3} y={cy - 2} fill="rgba(255,255,255,0.15)" fontSize="5" fontFamily="ui-monospace, monospace">
        GEO
      </text>

      {/* Earth */}
      <circle cx={cx} cy={cy} r={earthR} fill="#0f172a" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={earthR - 2} fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="0.5" />
      <text x={cx} y={cy + 3} textAnchor="middle" fill="rgba(56,189,248,0.6)" fontSize="7" fontFamily="ui-monospace, monospace" fontWeight="bold">
        ⊕
      </text>

      {/* Earth glow */}
      <circle cx={cx} cy={cy} r={earthR + 2} fill="rgba(56,189,248,0.05)" filter="url(#earth-glow)" />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════
   ELECTRON FLUX GAUGE
   ═══════════════════════════════════════════════════════════ */
const ElectronGauge = ({ flux }) => {
  const level = getElectronLevel(flux);
  const fillPct = flux == null ? 0 :
    Math.min(100, (Math.log10(Math.max(1, flux)) / Math.log10(100000)) * 100);

  return (
    <div className="rounded-2xl p-5" style={{
      background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-white/30">
          Live Electron Flux (&gt;2 MeV)
        </h4>
        {flux != null && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{
            background: `${level.color}10`, border: `1px solid ${level.color}20`,
          }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
              backgroundColor: level.color, boxShadow: `0 0 4px ${level.color}`,
            }} />
            <span className="text-[9px] font-mono font-bold" style={{ color: level.color }}>
              {level.level.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Gauge bar */}
      <div className="relative h-4 rounded-lg overflow-hidden mb-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
        {/* Threshold zones */}
        {ELECTRON_THRESHOLDS.map((t, i) => {
          const start = i === 0 ? 0 : (Math.log10(ELECTRON_THRESHOLDS[i - 1].max) / Math.log10(100000)) * 100;
          const end = (Math.log10(t.max) / Math.log10(100000)) * 100;
          return (
            <div key={t.level} className="absolute top-0 h-full" style={{
              left: `${start}%`, width: `${end - start}%`,
              background: `${t.color}08`, borderRight: `1px solid ${t.color}20`,
            }} />
          );
        })}

        {/* Current level */}
        <div className="absolute top-0 h-full rounded transition-all duration-1000" style={{
          width: `${fillPct}%`,
          background: `linear-gradient(90deg, ${level.color}40, ${level.color}80)`,
          boxShadow: `0 0 10px ${level.color}30`,
        }} />
      </div>

      {/* Values */}
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-mono text-white/25">0 pfu</span>
        <span className="text-lg font-mono font-black transition-colors duration-500" style={{ color: level.color }}>
          {flux != null ? `${flux >= 1000 ? (flux / 1000).toFixed(1) + 'K' : Math.round(flux)} pfu` : '—'}
        </span>
        <span className="text-[10px] font-mono text-white/25">100K pfu</span>
      </div>

      <p className="text-[10px] text-white/25 text-center mt-2">{level.description}</p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const RadiationBelts = ({ onBack }) => {
  const { chartData } = useTelemetry();
  const [selectedBelt, setSelectedBelt] = useState('outer');
  const [mode, setMode] = useState('learn');

  // Get latest electron flux
  const electronFlux = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i]?.electrons != null) return chartData[i].electrons;
    }
    return null;
  }, [chartData]);

  const belt = BELTS.find(b => b.id === selectedBelt);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background glow based on electron activity */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-1000" style={{
        background: `radial-gradient(ellipse at 50% 30%, ${belt?.glowColor || 'transparent'}, transparent 60%)`,
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-5 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-4 h-4 text-white/40" />
            </button>
          )}
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] font-mono" style={{ color: '#c084fc' }}>Module 05</p>
            <h1 className="text-2xl font-bold text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>
              The Radiation Belts
            </h1>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setMode('learn')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'learn' ? 'rgba(192,132,252,0.12)' : 'transparent', color: mode === 'learn' ? '#c084fc' : 'rgba(255,255,255,0.25)' }}>
              <BookOpen className="w-3 h-3" /> Learn
            </button>
            <button onClick={() => setMode('challenge')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'challenge' ? 'rgba(192,132,252,0.12)' : 'transparent', color: mode === 'challenge' ? '#c084fc' : 'rgba(255,255,255,0.25)' }}>
              <Gamepad2 className="w-3 h-3" /> Challenge
            </button>
          </div>
        </div>

        {mode === 'learn' ? (
          <>
            <div className="mb-6"><ElectronGauge flux={electronFlux} /></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              <div className="rounded-2xl p-6 flex items-center justify-center" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <BeltDiagram selectedBelt={selectedBelt} onSelect={setSelectedBelt} electronFlux={electronFlux} />
              </div>
              {belt && (
                <div className="rounded-2xl p-6 animate-fadeIn" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }} key={belt.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: belt.color, boxShadow: `0 0 10px ${belt.glowColor}` }} />
                    <div>
                      <h3 className="text-lg font-bold text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>{belt.name}</h3>
                      <p className="text-[10px] font-mono text-white/30">Altitude: {belt.altRange}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1">Particles</p>
                      <p className="text-[11px] font-mono font-bold" style={{ color: belt.color }}>{belt.particles}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1">Origin</p>
                      <p className="text-[11px] font-mono font-bold" style={{ color: belt.color }}>{belt.origin}</p>
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed text-white/50 mb-4">{belt.description}</p>
                  <h4 className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold mb-2" style={{ color: '#ef4444' }}>
                    <AlertTriangle className="w-3 h-3 inline mr-1" />Spacecraft Hazards
                  </h4>
                  <div className="space-y-1.5 mb-4">
                    {belt.hazards.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
                        <span className="text-[10px] text-red-400 mt-0.5">▸</span>
                        <span className="text-[11px] text-white/40">{h}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: `${belt.color}06`, border: `1px solid ${belt.color}12` }}>
                    <p className="text-[9px] font-mono font-bold mb-1" style={{ color: belt.color }}>✦ DID YOU KNOW?</p>
                    <p className="text-[11px] leading-relaxed text-white/35">{belt.fact}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(15,15,30,0.4)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex gap-2 justify-center">
                {BELTS.map(b => (
                  <button key={b.id} onClick={() => setSelectedBelt(b.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all duration-300"
                    style={{ background: selectedBelt === b.id ? `${b.color}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedBelt === b.id ? `${b.color}30` : 'rgba(255,255,255,0.05)'}`, color: selectedBelt === b.id ? b.color : 'rgba(255,255,255,0.25)', boxShadow: selectedBelt === b.id ? `0 0 12px ${b.color}10` : 'none', transform: selectedBelt === b.id ? 'scale(1.05)' : 'scale(1)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color, opacity: selectedBelt === b.id ? 1 : 0.3 }} />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
            {belt && <p className="text-[9px] font-mono text-white/15 text-center mt-6">{belt.discovery}</p>}
          </>
        ) : (
          <BeltChallenge />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out both; }
      `}</style>
    </div>
  );
};

export default RadiationBelts;
