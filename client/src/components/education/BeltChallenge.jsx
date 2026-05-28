import React, { useState, useCallback } from 'react';
import { Trophy, Star, Satellite, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   "SATELLITE ORBIT PLANNER" — Choose safe orbits
   Given a mission, pick the safest altitude & explain why
   ═══════════════════════════════════════════════════════════ */

const MISSIONS = [
  {
    name: 'International Space Station',
    mission: 'A crewed space station requiring minimal radiation exposure for astronauts.',
    correctAlt: 'LEO',
    options: [
      { id: 'LEO', label: 'Low Earth Orbit (400 km)', alt: 400, color: '#22c55e', safe: true,
        reason: 'Correct! At 400 km, the ISS orbits below the inner radiation belt. Earth\'s magnetic field still provides significant shielding. Astronauts receive ~1 mSv/day — manageable with monitoring.' },
      { id: 'INNER', label: 'Inner Belt (3,000 km)', alt: 3000, color: '#ef4444', safe: false,
        reason: 'Dangerous! The inner belt contains trapped high-energy protons (10–100 MeV). A crewed station here would expose astronauts to lethal radiation doses within weeks.' },
      { id: 'GEO', label: 'Geostationary (36,000 km)', alt: 36000, color: '#f97316', safe: false,
        reason: 'Too dangerous for crew. GEO is inside the outer radiation belt. During storms, "killer electrons" would dose the crew with dangerous radiation levels. Also requires massive fuel for crew resupply.' },
    ],
  },
  {
    name: 'GPS Navigation Satellite',
    mission: 'A positioning satellite requiring stable orbit and moderate radiation tolerance.',
    correctAlt: 'MEO',
    options: [
      { id: 'LEO', label: 'Low Earth Orbit (500 km)', alt: 500, color: '#f97316', safe: false,
        reason: 'Too low! LEO satellites orbit too fast and are too close to Earth. You\'d need 30+ satellites for continuous coverage. Also, atmospheric drag requires frequent reboosting.' },
      { id: 'MEO', label: 'Medium Earth Orbit (20,200 km)', alt: 20200, color: '#22c55e', safe: true,
        reason: 'Correct! GPS operates in the "slot region" between the belts at ~20,200 km. This provides good Earth coverage with a 12-hour orbital period, and radiation levels are relatively low between the belts.' },
      { id: 'GEO', label: 'Geostationary (36,000 km)', alt: 36000, color: '#f97316', safe: false,
        reason: 'Possible but suboptimal. GEO would provide coverage but only over the equator. GPS needs inclined MEO orbits to cover high latitudes. Also, GEO is deeper in the outer belt.' },
    ],
  },
  {
    name: 'Weather Monitoring Satellite',
    mission: 'A satellite that needs to observe Earth\'s full disk continuously from a fixed position.',
    correctAlt: 'GEO',
    options: [
      { id: 'LEO', label: 'Low Earth Orbit (800 km)', alt: 800, color: '#fbbf24', safe: false,
        reason: 'LEO provides high-resolution imagery but the satellite moves too fast — it circles Earth every 90 minutes and can\'t continuously watch one region. Not suitable for persistent weather monitoring.' },
      { id: 'MEO', label: 'Medium Earth Orbit (10,000 km)', alt: 10000, color: '#f97316', safe: false,
        reason: 'MEO doesn\'t provide a fixed viewing position. The satellite would drift across different regions. Also, 10,000 km altitude is inside the outer radiation belt, causing electronics damage.' },
      { id: 'GEO', label: 'Geostationary (36,000 km)', alt: 36000, color: '#22c55e', safe: true,
        reason: 'Correct! GOES weather satellites use GEO orbit. At 36,000 km with 0° inclination, the orbital period matches Earth\'s rotation — the satellite appears stationary over one point, providing continuous full-disk imagery.' },
    ],
  },
  {
    name: 'Scientific Research Probe',
    mission: 'A probe designed to study the radiation belts themselves — it MUST pass through them.',
    correctAlt: 'HEO',
    options: [
      { id: 'LEO', label: 'Low Earth Orbit (600 km)', alt: 600, color: '#f97316', safe: false,
        reason: 'LEO stays below the belts — you\'d never reach them! The Van Allen Probes needed a highly elliptical orbit to sample both belts during each pass.' },
      { id: 'HEO', label: 'Highly Elliptical (600 – 30,000 km)', alt: 15000, color: '#22c55e', safe: true,
        reason: 'Correct! The Van Allen Probes (2012–2019) used HEO orbits with perigee ~600 km and apogee ~30,000 km. This swept through both belts twice per orbit, sampling the full radiation environment.' },
      { id: 'GEO', label: 'Geostationary (36,000 km)', alt: 36000, color: '#f97316', safe: false,
        reason: 'GEO is a circular orbit — it stays at a constant altitude inside the outer belt. You\'d only sample one altitude, missing the inner belt and slot region entirely.' },
    ],
  },
  {
    name: 'Communication Relay Satellite',
    mission: 'A satellite providing TV and internet to a specific continent — must appear stationary.',
    correctAlt: 'GEO',
    options: [
      { id: 'MEO', label: 'Medium Earth Orbit (8,000 km)', alt: 8000, color: '#f97316', safe: false,
        reason: 'MEO satellites move relative to the ground. You\'d need a constellation (like Starlink) for continuous coverage. Also, 8,000 km is inside the outer belt — heavy radiation shielding needed.' },
      { id: 'GEO', label: 'Geostationary (36,000 km)', alt: 36000, color: '#22c55e', safe: true,
        reason: 'Correct! Communication satellites like DirecTV and SES use GEO. The apparent stationary position means ground antennas can be fixed-pointed, eliminating the need for tracking. Despite outer belt radiation, the satellites are hardened against it.' },
      { id: 'POLAR', label: 'Polar Orbit (700 km)', alt: 700, color: '#f97316', safe: false,
        reason: 'Polar orbits pass over the poles and don\'t stay fixed. The satellite would only be over your continent briefly every ~90 minutes. Completely wrong for continuous comm relay.' },
    ],
  },
];

const BeltChallenge = ({ onBadge }) => {
  const [phase, setPhase] = useState('ready');
  const [missions, setMissions] = useState([]);
  const [mIdx, setMIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    const shuffled = [...MISSIONS].sort(() => Math.random() - 0.5);
    shuffled.forEach(m => { m.options = [...m.options].sort(() => Math.random() - 0.5); });
    setMissions(shuffled);
    setMIdx(0);
    setSelected(null);
    setScore(0);
    setPhase('playing');
  };

  const handleSelect = (opt) => {
    if (selected) return;
    setSelected(opt);
    if (opt.id === missions[mIdx].correctAlt) setScore(s => s + 1);
  };

  const nextMission = () => {
    if (mIdx + 1 >= missions.length) {
      setPhase('result');
      if (onBadge) onBadge('orbit-planner');
      return;
    }
    setMIdx(m => m + 1);
    setSelected(null);
  };

  const current = missions[mIdx];
  const accuracy = missions.length > 0 ? Math.round((score / missions.length) * 100) : 0;

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Satellite className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Satellite Orbit Planner</h3>
          </div>
          <p className="text-[11px] text-white/30">Choose the safest orbit for each mission</p>
        </div>
        {phase === 'playing' && (
          <span className="text-[11px] font-mono text-white/30">{mIdx + 1}/{missions.length}</span>
        )}
      </div>

      {phase === 'ready' && (
        <div className="text-center py-8 animate-fadeIn">
          <p className="text-[13px] text-white/40 mb-6 max-w-sm mx-auto">
            You're the orbit planner. For each satellite mission, choose the altitude that balances radiation safety, coverage, and mission requirements.
          </p>
          <button onClick={startGame}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.3)', color: '#c084fc' }}>
            ▶ Start Mission Planning
          </button>
        </div>
      )}

      {phase === 'playing' && current && (
        <div className="animate-fadeIn" key={mIdx}>
          {/* Mission brief */}
          <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(192,132,252,0.04)', border: '1px solid rgba(192,132,252,0.1)' }}>
            <p className="text-[9px] font-mono text-purple-400 uppercase tracking-widest mb-1">Mission Brief</p>
            <h4 className="text-base font-bold text-white/80 mb-1">{current.name}</h4>
            <p className="text-[12px] text-white/40">{current.mission}</p>
          </div>

          {/* Altitude visualization */}
          <div className="relative h-20 rounded-xl overflow-hidden mb-4" style={{
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)',
          }}>
            {/* Belt zones */}
            <div className="absolute h-full" style={{ left: '5%', width: '15%', background: 'rgba(249,115,22,0.06)', borderRight: '1px solid rgba(249,115,22,0.15)' }}>
              <span className="absolute bottom-1 left-1 text-[6px] font-mono text-orange-400/30">Inner Belt</span>
            </div>
            <div className="absolute h-full" style={{ left: '20%', width: '10%', background: 'rgba(100,116,139,0.03)' }}>
              <span className="absolute bottom-1 left-1 text-[6px] font-mono text-white/10">Slot</span>
            </div>
            <div className="absolute h-full" style={{ left: '30%', width: '50%', background: 'rgba(192,132,252,0.04)', borderRight: '1px solid rgba(192,132,252,0.1)' }}>
              <span className="absolute bottom-1 left-1 text-[6px] font-mono text-purple-400/30">Outer Belt</span>
            </div>

            {/* Earth */}
            <div className="absolute left-0 h-full w-[5%] flex items-center justify-center"
              style={{ background: 'rgba(56,189,248,0.08)' }}>
              <span className="text-[8px]">🌍</span>
            </div>

            {/* Altitude labels */}
            <div className="absolute top-1 left-[5%] text-[6px] font-mono text-white/15">1K km</div>
            <div className="absolute top-1 left-[20%] text-[6px] font-mono text-white/15">6K</div>
            <div className="absolute top-1 left-[30%] text-[6px] font-mono text-white/15">13K</div>
            <div className="absolute top-1 left-[65%] text-[6px] font-mono text-white/15">36K (GEO)</div>
            <div className="absolute top-1 left-[80%] text-[6px] font-mono text-white/15">60K</div>
          </div>

          {/* Options */}
          <div className="space-y-2.5 mb-4">
            {current.options.map((opt) => {
              let bg = 'rgba(255,255,255,0.02)';
              let border = 'rgba(255,255,255,0.06)';
              let textColor = 'rgba(255,255,255,0.5)';

              if (selected) {
                if (opt.id === current.correctAlt) {
                  bg = 'rgba(34,197,94,0.1)';
                  border = 'rgba(34,197,94,0.3)';
                  textColor = '#22c55e';
                } else if (opt === selected && opt.id !== current.correctAlt) {
                  bg = 'rgba(239,68,68,0.1)';
                  border = 'rgba(239,68,68,0.3)';
                  textColor = '#ef4444';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  disabled={selected !== null}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.01]"
                  style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  <span className="text-[12px] leading-relaxed flex-1">{opt.label}</span>
                  {selected && opt.id === current.correctAlt && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {selected && opt === selected && opt.id !== current.correctAlt && <XCircle className="w-4 h-4 text-red-400" />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {selected && (
            <div className="p-4 rounded-xl mb-4 animate-fadeIn" style={{
              background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)',
            }}>
              <p className="text-[10px] font-mono font-bold text-sky-400 mb-1">📡 Mission Debrief</p>
              <p className="text-[11px] leading-relaxed text-white/40">{selected.reason}</p>
            </div>
          )}

          {selected && (
            <button onClick={nextMission}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              {mIdx + 1 < missions.length ? 'Next Mission →' : 'See Results →'}
            </button>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="text-center py-4 animate-fadeIn">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)' }}>
              <Trophy className="w-7 h-7 text-purple-400" />
            </div>
          </div>
          <h4 className="text-lg font-bold text-purple-400 mb-1">Mission Planning Complete</h4>
          <p className="text-[12px] text-white/30 mb-3">{score}/{missions.length} correct · {accuracy}% accuracy</p>
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="w-5 h-5" style={{
                color: (i === 0 && accuracy >= 30) || (i === 1 && accuracy >= 60) || (i === 2 && accuracy >= 85) ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                fill: (i === 0 && accuracy >= 30) || (i === 1 && accuracy >= 60) || (i === 2 && accuracy >= 85) ? '#fbbf24' : 'none',
              }} />
            ))}
          </div>
          <button onClick={startGame}
            className="text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider">
            ↻ Play Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default BeltChallenge;
