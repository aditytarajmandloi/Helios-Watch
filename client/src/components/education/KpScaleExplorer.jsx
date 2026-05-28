import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { ArrowLeft, Globe, Satellite, Zap, Radio, Navigation, Eye, AlertTriangle, Shield, BookOpen, Gamepad2 } from 'lucide-react';
import KpChallenge from './KpChallenge';

/* ═══════════════════════════════════════════════════════════
   KP SCALE DATA — full 0-9 with G-scale mapping
   ═══════════════════════════════════════════════════════════ */
const KP_LEVELS = [
  {
    kp: 0, gScale: 'G0', label: 'Quiet',
    color: '#22c55e', barColor: '#22c55e',
    auroraLat: '67°+ (Arctic Circle only)',
    description: 'Minimal geomagnetic activity. The magnetosphere is undisturbed. Perfect conditions for satellite operations and precision navigation.',
    impacts: { satellites: 'Normal', powerGrid: 'Normal', radio: 'Normal', navigation: 'Full precision', aviation: 'No restrictions' },
  },
  {
    kp: 1, gScale: 'G0', label: 'Quiet',
    color: '#22c55e', barColor: '#22c55e',
    auroraLat: '65°+',
    description: 'Very quiet conditions. Slight magnetic field variations detectable by ground magnetometers but no practical effects.',
    impacts: { satellites: 'Normal', powerGrid: 'Normal', radio: 'Normal', navigation: 'Full precision', aviation: 'No restrictions' },
  },
  {
    kp: 2, gScale: 'G0', label: 'Unsettled',
    color: '#4ade80', barColor: '#4ade80',
    auroraLat: '63°+',
    description: 'Slightly unsettled conditions. Minor magnetic fluctuations. Aurora may become faintly visible at high latitudes under dark, clear skies.',
    impacts: { satellites: 'Normal', powerGrid: 'Normal', radio: 'Minimal noise', navigation: 'Full precision', aviation: 'No restrictions' },
  },
  {
    kp: 3, gScale: 'G0', label: 'Unsettled',
    color: '#86efac', barColor: '#86efac',
    auroraLat: '60°+',
    description: 'Active geomagnetic conditions. Aurora visible across Scandinavia, northern Canada, and Alaska. No significant infrastructure impacts.',
    impacts: { satellites: 'Minimal drag increase', powerGrid: 'Normal', radio: 'Minor polar HF noise', navigation: 'Normal', aviation: 'No restrictions' },
  },
  {
    kp: 4, gScale: 'G0', label: 'Active',
    color: '#fbbf24', barColor: '#fbbf24',
    auroraLat: '57°+',
    description: 'Active conditions approaching minor storm threshold. Noticeable aurora at sub-auroral latitudes. Spacecraft operators begin monitoring.',
    impacts: { satellites: 'Increased drag', powerGrid: 'Monitoring', radio: 'HF degradation at poles', navigation: 'Minor errors', aviation: 'Polar route monitoring' },
  },
  {
    kp: 5, gScale: 'G1', label: 'Minor Storm',
    color: '#f59e0b', barColor: '#f59e0b',
    auroraLat: '55°+ (Edinburgh, Moscow)',
    description: 'Minor geomagnetic storm (G1). Weak power grid fluctuations possible. Satellite drag increases noticeably. Aurora visible across Scotland, southern Scandinavia, and northern US states.',
    impacts: { satellites: 'Orientation corrections needed', powerGrid: 'Weak fluctuations', radio: 'HF fading at high lat.', navigation: 'Degraded accuracy', aviation: 'Polar HF backup comms' },
  },
  {
    kp: 6, gScale: 'G2', label: 'Moderate Storm',
    color: '#f97316', barColor: '#f97316',
    auroraLat: '50°+ (London, Seattle)',
    description: 'Moderate geomagnetic storm (G2). High-latitude power systems may experience voltage alarms. Spacecraft may need corrective maneuvers. Aurora extends to mid-latitudes.',
    impacts: { satellites: 'Drag-induced altitude loss', powerGrid: 'Voltage alarms', radio: 'HF blackout at polar', navigation: 'GPS scintillation', aviation: 'Polar rerouting possible' },
  },
  {
    kp: 7, gScale: 'G3', label: 'Strong Storm',
    color: '#ef4444', barColor: '#ef4444',
    auroraLat: '45°+ (Paris, New York)',
    description: 'Strong geomagnetic storm (G3). Power grid operators may need to take protective action. Satellite surface charging events likely. GPS navigation significantly degraded.',
    impacts: { satellites: 'Surface charging', powerGrid: 'Protective action needed', radio: 'HF impossible at high lat.', navigation: 'Significant GPS errors', aviation: 'Extended polar rerouting' },
  },
  {
    kp: 8, gScale: 'G4', label: 'Severe Storm',
    color: '#dc2626', barColor: '#dc2626',
    auroraLat: '40°+ (Madrid, Beijing)',
    description: 'Severe geomagnetic storm (G4). Widespread voltage control problems on power grids. Transformer damage from geomagnetically induced currents (GIC). Satellite anomalies and deep charging.',
    impacts: { satellites: 'Deep dielectric charging', powerGrid: 'Transformer GIC damage', radio: 'HF blackout hours', navigation: 'GPS unreliable', aviation: 'All polar routes cancelled' },
  },
  {
    kp: 9, gScale: 'G5', label: 'Extreme Storm',
    color: '#991b1b', barColor: '#b91c1c',
    auroraLat: '30°+ (Tokyo, Houston, Cairo)',
    description: 'Extreme geomagnetic storm (G5) — the rarest and most destructive. Complete power grid collapse possible (Carrington-class event). Modern civilization has not experienced a G5 in the satellite era. Aurora visible near the equator.',
    impacts: { satellites: 'Total loss possible', powerGrid: 'Grid collapse risk', radio: 'Complete HF blackout', navigation: 'GPS/GNSS failure', aviation: 'Global disruption' },
  },
];

/* ═══════════════════════════════════════════════════════════
   IMPACT ROW COMPONENT
   ═══════════════════════════════════════════════════════════ */
const impactIconMap = {
  satellites: Satellite,
  powerGrid: Zap,
  radio: Radio,
  navigation: Navigation,
  aviation: Globe,
};

const impactLabelMap = {
  satellites: 'Satellites',
  powerGrid: 'Power Grid',
  radio: 'HF Radio',
  navigation: 'Navigation',
  aviation: 'Aviation',
};

const getSeverityColor = (text) => {
  const t = text.toLowerCase();
  if (t.includes('normal') || t.includes('full') || t.includes('no ')) return '#22c55e';
  if (t.includes('minimal') || t.includes('minor') || t.includes('monitoring')) return '#fbbf24';
  if (t.includes('degraded') || t.includes('fading') || t.includes('weak') || t.includes('increased')) return '#f97316';
  if (t.includes('blackout') || t.includes('damage') || t.includes('charging') || t.includes('significant') || t.includes('protective')) return '#ef4444';
  if (t.includes('collapse') || t.includes('failure') || t.includes('total') || t.includes('impossible') || t.includes('unreliable')) return '#991b1b';
  return '#94a3b8';
};

/* ═══════════════════════════════════════════════════════════
   ANIMATED KP BAR VISUALIZER
   ═══════════════════════════════════════════════════════════ */
const KpBarVisualizer = ({ selectedKp, currentKp }) => {
  return (
    <div className="flex items-end gap-1.5 h-32">
      {KP_LEVELS.map(level => {
        const isSelected = level.kp === selectedKp;
        const isCurrent = currentKp != null && Math.round(currentKp) === level.kp;
        const barH = 20 + (level.kp / 9) * 80; // 20% to 100% height

        return (
          <div key={level.kp} className="flex-1 flex flex-col items-center gap-1">
            {/* Current indicator */}
            {isCurrent && (
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: level.color, boxShadow: `0 0 6px ${level.color}` }} />
                <span className="text-[7px] font-mono font-bold" style={{ color: level.color }}>NOW</span>
              </div>
            )}

            {/* Bar */}
            <div
              className="w-full rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden"
              style={{
                height: `${barH}%`,
                background: isSelected
                  ? `linear-gradient(180deg, ${level.color}, ${level.color}40)`
                  : `${level.color}15`,
                border: isSelected ? `1px solid ${level.color}50` : `1px solid ${level.color}10`,
                boxShadow: isSelected ? `0 0 20px ${level.color}20, inset 0 0 15px ${level.color}10` : 'none',
                transform: isSelected ? 'scaleY(1.05)' : 'scaleY(1)',
                transformOrigin: 'bottom',
              }}
            >
              {/* Shimmer on selected */}
              {isSelected && (
                <div className="absolute inset-0 animate-shimmer" style={{
                  background: `linear-gradient(180deg, ${level.color}20, transparent, ${level.color}10)`,
                }} />
              )}
            </div>

            {/* Label */}
            <span className="text-[10px] font-mono font-bold transition-colors duration-300"
              style={{ color: isSelected ? level.color : 'rgba(255,255,255,0.15)' }}>
              {level.kp}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   AURORA LATITUDE RING
   ═══════════════════════════════════════════════════════════ */
const AuroraIndicator = ({ selectedKp, color }) => {
  const level = KP_LEVELS[selectedKp];
  // Map kp 0-9 to ring size (small = high latitude only, large = visible everywhere)
  const ringPct = 30 + (selectedKp / 9) * 60;

  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Earth */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
            border: '2px solid rgba(56,189,248,0.3)',
            boxShadow: '0 0 12px rgba(56,189,248,0.15)',
          }}
        >
          <Globe className="w-6 h-6 text-sky-400/60 m-auto mt-2.5" />
        </div>
      </div>

      {/* Aurora ring */}
      <div
        className="absolute rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `${ringPct}%`,
          height: `${ringPct}%`,
          top: `${(100 - ringPct) / 2}%`,
          left: `${(100 - ringPct) / 2}%`,
          border: `2px solid ${color}40`,
          boxShadow: `0 0 15px ${color}20, inset 0 0 10px ${color}10`,
          background: `radial-gradient(circle, transparent 60%, ${color}08 100%)`,
        }}
      />

      {/* Label */}
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <p className="text-[9px] font-mono" style={{ color: `${color}80` }}>
          {level.auroraLat}
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const KpScaleExplorer = ({ onBack }) => {
  const { chartData } = useTelemetry();
  const [selectedKp, setSelectedKp] = useState(3);
  const [mode, setMode] = useState('learn');

  // Get latest Kp value
  const currentKp = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i]?.kp != null) return chartData[i].kp;
    }
    return null;
  }, [chartData]);

  // Auto-select current Kp on mount
  useEffect(() => {
    if (currentKp != null) setSelectedKp(Math.round(currentKp));
  }, [currentKp]);

  const level = KP_LEVELS[selectedKp];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-1000" style={{
        background: `radial-gradient(ellipse at 50% 30%, ${level.color}08, transparent 60%)`,
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
            <p className="text-[9px] uppercase tracking-[0.3em] font-mono" style={{ color: '#10b981' }}>Module 04</p>
            <h1 className="text-2xl font-bold text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Geomagnetic Storms — The Kp Scale
            </h1>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setMode('learn')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'learn' ? 'rgba(16,185,129,0.12)' : 'transparent', color: mode === 'learn' ? '#10b981' : 'rgba(255,255,255,0.25)' }}>
              <BookOpen className="w-3 h-3" /> Learn
            </button>
            <button onClick={() => setMode('challenge')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
              style={{ background: mode === 'challenge' ? 'rgba(16,185,129,0.12)' : 'transparent', color: mode === 'challenge' ? '#10b981' : 'rgba(255,255,255,0.25)' }}>
              <Gamepad2 className="w-3 h-3" /> Challenge
            </button>
          </div>
          {currentKp != null && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
              background: `${KP_LEVELS[Math.round(currentKp)]?.color}10`,
              border: `1px solid ${KP_LEVELS[Math.round(currentKp)]?.color}25`,
            }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{
                backgroundColor: KP_LEVELS[Math.round(currentKp)]?.color,
              }} />
              <span className="text-[11px] font-mono font-bold" style={{
                color: KP_LEVELS[Math.round(currentKp)]?.color,
              }}>
                LIVE Kp: {currentKp.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {mode === 'learn' ? (
          <>
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <KpBarVisualizer selectedKp={selectedKp} currentKp={currentKp} />
            </div>
            <div className="mb-6">
              <input type="range" min="0" max="9" step="1" value={selectedKp}
                onChange={e => setSelectedKp(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: 'linear-gradient(to right, #22c55e, #fbbf24 40%, #f97316 60%, #ef4444 80%, #991b1b)', accentColor: level.color }} />
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] font-mono text-white/15">Kp 0 — Quiet</span>
                <span className="text-[9px] font-mono text-white/15">Kp 9 — Extreme</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-4 mb-4" key={selectedKp}>
                  <div className="text-center">
                    <span className="text-5xl font-black font-mono block transition-colors duration-500" style={{ color: level.color }}>{level.kp}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded mt-1 inline-block" style={{ background: `${level.color}15`, color: level.color }}>{level.gScale}</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white/80">{level.label}</p>
                    <p className="text-[11px] font-mono text-white/30">Planetary K-index = {level.kp}</p>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-white/50 mb-6">{level.description}</p>
                <h4 className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-white/30 mb-3">Infrastructure Impact Assessment</h4>
                <div className="space-y-2">
                  {Object.entries(level.impacts).map(([key, status]) => {
                    const Icon = impactIconMap[key];
                    const severityColor = getSeverityColor(status);
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300" style={{ background: `${severityColor}05`, border: `1px solid ${severityColor}10` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${severityColor}10` }}>
                          <Icon className="w-4 h-4" style={{ color: severityColor }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-white/30">{impactLabelMap[key]}</p>
                          <p className="text-[12px] font-medium" style={{ color: severityColor }}>{status}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor, boxShadow: `0 0 6px ${severityColor}50` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-5">
                <div className="rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold mb-6" style={{ color: level.color }}>
                    <Eye className="w-3 h-3 inline mr-1.5" />Aurora Visibility
                  </h4>
                  <AuroraIndicator selectedKp={selectedKp} color={level.color} />
                  <p className="text-[11px] text-white/30 text-center mt-8 font-mono">Approximate southern aurora boundary</p>
                </div>
                <div className="rounded-2xl p-5" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-white/30 mb-3">NOAA G-Scale Reference</h4>
                  <div className="space-y-1.5">
                    {[{ g: 'G0', kRange: 'Kp 0-4', label: 'Below Storm', color: '#22c55e' },
                      { g: 'G1', kRange: 'Kp 5', label: 'Minor', color: '#f59e0b' },
                      { g: 'G2', kRange: 'Kp 6', label: 'Moderate', color: '#f97316' },
                      { g: 'G3', kRange: 'Kp 7', label: 'Strong', color: '#ef4444' },
                      { g: 'G4', kRange: 'Kp 8', label: 'Severe', color: '#dc2626' },
                      { g: 'G5', kRange: 'Kp 9', label: 'Extreme', color: '#991b1b' },
                    ].map(g => (
                      <div key={g.g} className="flex items-center gap-2 text-[10px]">
                        <span className="font-mono font-bold w-6" style={{ color: g.color }}>{g.g}</span>
                        <span className="text-white/20 font-mono w-12">{g.kRange}</span>
                        <span className="text-white/35">{g.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <KpChallenge />
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255,255,255,0.3);
          border: 2px solid rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
};

export default KpScaleExplorer;
