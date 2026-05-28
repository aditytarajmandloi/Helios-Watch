import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { ArrowLeft, Zap, Radio, AlertTriangle, Wifi, Plane, Satellite, BookOpen, Gamepad2 } from 'lucide-react';
import FlareChallenge from './FlareChallenge';

/* ═══════════════════════════════════════════════════════════
   FLARE CLASS DATA
   ═══════════════════════════════════════════════════════════ */
const FLARE_CLASSES = [
  {
    letter: 'A',
    range: '< 10⁻⁷ W/m²',
    threshold: 1e-8,
    color: '#22c55e',
    bgGlow: 'rgba(34,197,94,0.06)',
    severity: 'Background',
    description: 'Background-level X-ray flux. No observable effects on Earth. The Sun is in a quiet state with minimal magnetic activity.',
    impacts: [],
    analogy: 'Like a candle flame viewed from a mile away.',
  },
  {
    letter: 'B',
    range: '10⁻⁷ – 10⁻⁶ W/m²',
    threshold: 1e-7,
    color: '#38bdf8',
    bgGlow: 'rgba(56,189,248,0.06)',
    severity: 'Minor',
    description: 'Minor enhancement above background. Small active regions visible on the solar disk. No significant terrestrial effects.',
    impacts: ['Minor HF radio noise at polar latitudes'],
    analogy: 'Like a campfire — warm but no danger.',
  },
  {
    letter: 'C',
    range: '10⁻⁶ – 10⁻⁵ W/m²',
    threshold: 1e-6,
    color: '#fbbf24',
    bgGlow: 'rgba(251,191,36,0.06)',
    severity: 'Moderate',
    description: 'Moderate X-ray emission from significant active regions. The increasing magnetic complexity suggests a developing sunspot group.',
    impacts: [
      'Weak HF radio degradation',
      'Minor GPS accuracy reduction',
    ],
    analogy: 'Like a bonfire — you can feel the heat at distance.',
  },
  {
    letter: 'M',
    range: '10⁻⁵ – 10⁻⁴ W/m²',
    threshold: 1e-5,
    color: '#f97316',
    bgGlow: 'rgba(249,115,22,0.08)',
    severity: 'Strong',
    description: 'Strong flares from complex sunspot regions. These can trigger S1-S2 radiation storms and moderate geomagnetic disturbances. Often accompanied by coronal mass ejections.',
    impacts: [
      'HF radio blackout (1-2 hours)',
      'Navigation satellite errors',
      'Minor radiation dose for polar flights',
      'Possible aurora at 55°+ latitude',
    ],
    analogy: 'Like a welding arc — don\'t look directly at it.',
  },
  {
    letter: 'X',
    range: '> 10⁻⁴ W/m²',
    threshold: 1e-4,
    color: '#ef4444',
    bgGlow: 'rgba(239,68,68,0.1)',
    severity: 'Extreme',
    description: 'The most powerful explosions in the solar system. X-class flares release energy equivalent to billions of nuclear bombs. They can trigger complete HF radio blackouts, severe geomagnetic storms (G4-G5), and satellite damage.',
    impacts: [
      'Complete HF radio blackout (hours)',
      'Satellite orientation loss',
      'Radiation hazard for astronauts/pilots',
      'Power grid transformer damage (GIC)',
      'Aurora visible at 40°+ latitude',
      'GPS/GNSS disruption',
    ],
    analogy: 'Like staring into an arc furnace — catastrophic energy release.',
  },
];

/* ═══════════════════════════════════════════════════════════
   GET CURRENT CLASS FROM X-RAY VALUE
   ═══════════════════════════════════════════════════════════ */
const getCurrentClass = (xray) => {
  if (xray == null) return null;
  if (xray >= 1e-4) return 'X';
  if (xray >= 1e-5) return 'M';
  if (xray >= 1e-6) return 'C';
  if (xray >= 1e-7) return 'B';
  return 'A';
};

const getSubclass = (xray) => {
  if (xray == null) return '';
  const cls = getCurrentClass(xray);
  const thresholds = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };
  const base = thresholds[cls] || 1e-8;
  const sub = (xray / base).toFixed(1);
  return `${cls}${sub}`;
};

/* ═══════════════════════════════════════════════════════════
   ANIMATED X-RAY METER
   ═══════════════════════════════════════════════════════════ */
const XRayMeter = ({ currentXray, selectedClass }) => {
  // Map x-ray to a 0-100 scale (log)
  const xrayToPercent = (val) => {
    if (!val || val <= 0) return 0;
    const log = Math.log10(val);
    // Range: -8 (A1.0) to -3 (X10)
    return Math.max(0, Math.min(100, ((log + 8) / 5) * 100));
  };

  const currentPct = xrayToPercent(currentXray);
  const classData = FLARE_CLASSES.find(c => c.letter === selectedClass);
  const thresholdPct = classData ? xrayToPercent(classData.threshold) : 0;

  return (
    <div className="relative rounded-xl p-4" style={{
      background: 'rgba(15,15,30,0.5)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <p className="text-[8px] uppercase tracking-[0.3em] font-mono text-white/20 mb-3">
        GOES X-Ray Flux Meter
      </p>

      {/* Meter bar */}
      <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
        {/* Class zones */}
        {FLARE_CLASSES.map((cls, i) => {
          const start = xrayToPercent(cls.threshold);
          const end = i < FLARE_CLASSES.length - 1 ? xrayToPercent(FLARE_CLASSES[i + 1].threshold) : 100;
          return (
            <div
              key={cls.letter}
              className="absolute top-0 h-full flex items-center justify-center"
              style={{
                left: `${start}%`,
                width: `${end - start}%`,
                background: `${cls.color}10`,
                borderRight: `1px solid ${cls.color}30`,
              }}
            >
              <span className="text-[10px] font-mono font-bold" style={{ color: `${cls.color}80` }}>
                {cls.letter}
              </span>
            </div>
          );
        })}

        {/* Current level indicator */}
        {currentXray && (
          <div
            className="absolute top-0 h-full w-0.5 transition-all duration-1000 ease-out"
            style={{
              left: `${currentPct}%`,
              background: `linear-gradient(180deg, ${FLARE_CLASSES.find(c => c.letter === getCurrentClass(currentXray))?.color || '#fff'}, transparent)`,
              boxShadow: `0 0 8px ${FLARE_CLASSES.find(c => c.letter === getCurrentClass(currentXray))?.color || '#fff'}`,
            }}
          >
            {/* Pulse dot */}
            <div className="absolute -top-1 -left-[3px] w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: FLARE_CLASSES.find(c => c.letter === getCurrentClass(currentXray))?.color,
                boxShadow: `0 0 8px ${FLARE_CLASSES.find(c => c.letter === getCurrentClass(currentXray))?.color}`,
              }}
            />
          </div>
        )}
      </div>

      {/* Current reading */}
      {currentXray && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] font-mono text-white/30">Current Reading</span>
          <span className="text-sm font-mono font-bold" style={{
            color: FLARE_CLASSES.find(c => c.letter === getCurrentClass(currentXray))?.color
          }}>
            {getSubclass(currentXray)} ({currentXray.toExponential(1)} W/m²)
          </span>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FLARE CLASS CARD
   ═══════════════════════════════════════════════════════════ */
const FlareClassCard = ({ cls, isSelected, isCurrent, onClick }) => (
  <button
    onClick={onClick}
    className="relative flex-1 min-w-[60px] rounded-xl p-3 transition-all duration-500 group"
    style={{
      background: isSelected ? cls.bgGlow : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isSelected ? `${cls.color}30` : 'rgba(255,255,255,0.05)'}`,
      boxShadow: isSelected ? `0 0 20px ${cls.color}10, inset 0 0 20px ${cls.color}05` : 'none',
      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
    }}
  >
    {isCurrent && (
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
        style={{ backgroundColor: cls.color, boxShadow: `0 0 8px ${cls.color}` }}
      />
    )}
    <span className="text-2xl font-black font-mono block mb-1 transition-colors duration-300"
      style={{ color: isSelected ? cls.color : 'rgba(255,255,255,0.2)' }}>
      {cls.letter}
    </span>
    <span className="text-[8px] font-mono uppercase tracking-wider block"
      style={{ color: isSelected ? `${cls.color}aa` : 'rgba(255,255,255,0.15)' }}>
      {cls.severity}
    </span>
  </button>
);

/* ═══════════════════════════════════════════════════════════
   IMPACT ICONS
   ═══════════════════════════════════════════════════════════ */
const impactIcons = {
  HF: Radio,
  radio: Radio,
  GPS: Satellite,
  Navigation: Satellite,
  Satellite: Satellite,
  satellite: Satellite,
  Radiation: AlertTriangle,
  radiation: AlertTriangle,
  Power: Zap,
  Aurora: () => <span className="text-sm">🌌</span>,
  aurora: () => <span className="text-sm">🌌</span>,
  flight: Plane,
  polar: Plane,
};

const getImpactIcon = (text) => {
  for (const [key, Icon] of Object.entries(impactIcons)) {
    if (text.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return AlertTriangle;
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const FlareClassroom = ({ onBack }) => {
  const { chartData } = useTelemetry();
  const [selectedClass, setSelectedClass] = useState('C');
  const [mode, setMode] = useState('learn');

  // Get latest X-ray value
  const currentXray = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i]?.xray != null) return chartData[i].xray;
    }
    return null;
  }, [chartData]);

  const currentClass = getCurrentClass(currentXray);
  const selectedData = FLARE_CLASSES.find(c => c.letter === selectedClass);

  // Auto-highlight current class on mount
  useEffect(() => {
    if (currentClass) setSelectedClass(currentClass);
  }, [currentClass]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none transition-colors duration-1000" style={{
        background: `radial-gradient(ellipse at 50% 20%, ${selectedData?.bgGlow || 'transparent'}, transparent 60%)`,
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
            <p className="text-[9px] uppercase tracking-[0.3em] font-mono" style={{ color: '#f43f5e' }}>Module 02</p>
            <h1 className="text-2xl font-bold text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Solar Flares — Live Classroom
            </h1>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setMode('learn')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'learn' ? 'rgba(244,63,94,0.12)' : 'transparent', color: mode === 'learn' ? '#f43f5e' : 'rgba(255,255,255,0.25)' }}>
              <BookOpen className="w-3 h-3" /> Learn
            </button>
            <button onClick={() => setMode('challenge')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'challenge' ? 'rgba(244,63,94,0.12)' : 'transparent', color: mode === 'challenge' ? '#f43f5e' : 'rgba(255,255,255,0.25)' }}>
              <Gamepad2 className="w-3 h-3" /> Challenge
            </button>
          </div>
          {/* Live badge */}
          {currentXray && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
              background: `${FLARE_CLASSES.find(c => c.letter === currentClass)?.color}10`,
              border: `1px solid ${FLARE_CLASSES.find(c => c.letter === currentClass)?.color}25`,
            }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{
                backgroundColor: FLARE_CLASSES.find(c => c.letter === currentClass)?.color,
                boxShadow: `0 0 6px ${FLARE_CLASSES.find(c => c.letter === currentClass)?.color}`,
              }} />
              <span className="text-[11px] font-mono font-bold" style={{
                color: FLARE_CLASSES.find(c => c.letter === currentClass)?.color
              }}>
                LIVE: {getSubclass(currentXray)}
              </span>
            </div>
          )}
        </div>

        {mode === 'learn' ? (
          <>
            <div className="mb-6"><XRayMeter currentXray={currentXray} selectedClass={selectedClass} /></div>
            <div className="flex gap-2 mb-6">
              {FLARE_CLASSES.map(cls => (
                <FlareClassCard key={cls.letter} cls={cls} isSelected={selectedClass === cls.letter}
                  isCurrent={currentClass === cls.letter} onClick={() => setSelectedClass(cls.letter)} />
              ))}
            </div>
            {selectedData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fadeIn" key={selectedData.letter}>
                <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="text-5xl font-black font-mono" style={{ color: selectedData.color }}>{selectedData.letter}</span>
                    <div><p className="text-lg font-bold text-white/80">{selectedData.severity} Flare</p><p className="text-[11px] font-mono text-white/30">{selectedData.range}</p></div>
                  </div>
                  <p className="text-[13px] leading-relaxed text-white/50 mb-5">{selectedData.description}</p>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-[10px] uppercase tracking-wider text-white/25 font-mono mb-1">Analogy</p>
                    <p className="text-[12px] text-white/40 italic">"{selectedData.analogy}"</p>
                  </div>
                </div>
                <div className="rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold mb-4" style={{ color: selectedData.color }}>Earth Impacts</h4>
                  {selectedData.impacts.length === 0 ? (
                    <div className="flex items-center justify-center py-8"><p className="text-[12px] text-white/20 font-mono text-center">No significant<br/>terrestrial impacts</p></div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedData.impacts.map((impact, idx) => {
                        const Icon = getImpactIcon(impact);
                        return (
                          <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: `${selectedData.color}06`, border: `1px solid ${selectedData.color}10` }}>
                            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${selectedData.color}15` }}>
                              <Icon className="w-3 h-3" style={{ color: selectedData.color }} />
                            </div>
                            <span className="text-[11px] text-white/50 leading-relaxed">{impact}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedClass === currentClass && currentXray && (
                    <div className="mt-4 p-3 rounded-xl animate-pulse" style={{ background: `${selectedData.color}08`, border: `1px solid ${selectedData.color}20` }}>
                      <p className="text-[10px] font-mono font-bold" style={{ color: selectedData.color }}>⚡ This is the current live classification</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <FlareChallenge />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default FlareClassroom;
