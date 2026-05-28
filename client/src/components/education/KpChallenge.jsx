import React, { useState, useCallback } from 'react';
import { Trophy, RotateCcw, Star, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   "STORM RESPONSE COMMANDER" — Scenario-based Kp quiz
   Multiple-choice questions about geomagnetic storm effects
   ═══════════════════════════════════════════════════════════ */

const SCENARIOS = [
  {
    kp: 2, gScale: 'G0',
    question: 'Kp index is 2 (Quiet). What action should a satellite operator take?',
    options: [
      { text: 'Normal operations — no action needed', correct: true },
      { text: 'Begin emergency shutdown procedures', correct: false },
      { text: 'Activate radiation shield protocols', correct: false },
      { text: 'Redirect all polar flights', correct: false },
    ],
    explanation: 'At Kp 2, the magnetosphere is undisturbed. Satellite operations proceed normally with no protective measures required.',
  },
  {
    kp: 5, gScale: 'G1',
    question: 'Kp reaches 5 (G1 Minor Storm). What can you expect to see?',
    options: [
      { text: 'Aurora only visible at the north pole', correct: false },
      { text: 'Aurora visible at ~55° latitude (Edinburgh, Moscow)', correct: true },
      { text: 'Aurora visible everywhere globally', correct: false },
      { text: 'No visible aurora at any latitude', correct: false },
    ],
    explanation: 'G1 storms push the auroral oval down to approximately 55° latitude, making aurora visible in Scotland, southern Scandinavia, and northern US states.',
  },
  {
    kp: 7, gScale: 'G3',
    question: 'A G3 Strong Storm (Kp 7) is detected. What\'s the PRIMARY risk to power grids?',
    options: [
      { text: 'Solar panel overheating', correct: false },
      { text: 'Geomagnetically Induced Currents (GIC) damaging transformers', correct: true },
      { text: 'Wind turbine malfunction', correct: false },
      { text: 'Nuclear reactor cooling failure', correct: false },
    ],
    explanation: 'GIC flows through long conductors (power lines, pipelines) during geomagnetic storms. These quasi-DC currents can saturate and permanently damage high-voltage transformers.',
  },
  {
    kp: 9, gScale: 'G5',
    question: 'Kp 9 (G5 Extreme Storm). How far south could aurora be visible?',
    options: [
      { text: '60° latitude (Oslo)', correct: false },
      { text: '50° latitude (London)', correct: false },
      { text: '30° latitude (Tokyo, Houston, Cairo)', correct: true },
      { text: 'Only at the magnetic poles', correct: false },
    ],
    explanation: 'During extreme G5 storms (Carrington-class events), the auroral oval expands dramatically. The 1859 Carrington Event produced aurora visible in Colombia and Hawaii (~20° latitude).',
  },
  {
    kp: 6, gScale: 'G2',
    question: 'At G2 (Kp 6), what happens to GPS navigation accuracy?',
    options: [
      { text: 'GPS works perfectly', correct: false },
      { text: 'GPS signals experience ionospheric scintillation, causing position errors', correct: true },
      { text: 'GPS satellites shut down automatically', correct: false },
      { text: 'GPS only fails over the ocean', correct: false },
    ],
    explanation: 'Ionospheric irregularities during G2 storms cause GPS signal scintillation — rapid phase and amplitude fluctuations that degrade positioning accuracy by meters to tens of meters.',
  },
  {
    kp: 8, gScale: 'G4',
    question: 'During a G4 Severe Storm, what is "deep dielectric charging" in satellites?',
    options: [
      { text: 'The satellite\'s battery overcharges', correct: false },
      { text: 'High-energy electrons penetrate shielding and build up charge inside electronics', correct: true },
      { text: 'The satellite\'s solar panels generate too much power', correct: false },
      { text: 'Static electricity on the satellite\'s surface', correct: false },
    ],
    explanation: 'Unlike surface charging, deep dielectric charging occurs when >2 MeV "killer electrons" penetrate spacecraft shielding and accumulate in insulating materials. When the charge builds up enough, it discharges internally — destroying electronics.',
  },
  {
    kp: 4, gScale: 'G0',
    question: 'Kp is 4 (Active, below storm threshold). Should polar airline routes be modified?',
    options: [
      { text: 'No — Kp 4 is below storm levels', correct: true },
      { text: 'Yes — all polar flights should be cancelled', correct: false },
      { text: 'Yes — only military aircraft can use polar routes', correct: false },
      { text: 'No flights should operate anywhere globally', correct: false },
    ],
    explanation: 'Kp 4 is "Active" but below the G1 storm threshold (Kp 5). Polar routes remain operational, though monitoring increases. Rerouting typically begins at G2 (Kp 6) due to HF radio blackout risk.',
  },
  {
    kp: 7, gScale: 'G3',
    question: 'What does the "K" in Kp index stand for?',
    options: [
      { text: 'Kinetic (from kinetic energy)', correct: false },
      { text: 'Kennziffer (German for "characteristic digit")', correct: true },
      { text: 'Kelvin (temperature unit)', correct: false },
      { text: 'Krypton (like the element)', correct: false },
    ],
    explanation: 'The K-index was invented by Julius Bartels in 1939. "K" stands for "Kennziffer" (German for characteristic digit). The "p" stands for "planetary" — it\'s the average of K-indices from 13 observatories worldwide.',
  },
];

const getKpColor = (kp) => {
  if (kp >= 7) return '#ef4444';
  if (kp >= 5) return '#f59e0b';
  if (kp >= 3) return '#fbbf24';
  return '#22c55e';
};

const KpChallenge = ({ onBadge }) => {
  const [phase, setPhase] = useState('ready');
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const startGame = () => {
    // Shuffle and pick 6 questions
    const shuffled = [...SCENARIOS].sort(() => Math.random() - 0.5).slice(0, 6);
    // Also shuffle options within each question
    shuffled.forEach(q => { q.options = [...q.options].sort(() => Math.random() - 0.5); });
    setQuestions(shuffled);
    setQIdx(0);
    setScore(0);
    setSelected(null);
    setShowExplanation(false);
    setPhase('playing');
  };

  const handleAnswer = (option) => {
    if (selected !== null) return;
    setSelected(option);
    if (option.correct) setScore(s => s + 1);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (qIdx + 1 >= questions.length) {
      setPhase('result');
      if (onBadge) onBadge('storm-commander');
      return;
    }
    setQIdx(q => q + 1);
    setSelected(null);
    setShowExplanation(false);
  };

  const current = questions[qIdx];
  const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Storm Response Commander</h3>
          </div>
          <p className="text-[11px] text-white/30">Test your geomagnetic storm knowledge</p>
        </div>
        {phase === 'playing' && (
          <span className="text-[11px] font-mono text-white/30">{qIdx + 1}/{questions.length}</span>
        )}
      </div>

      {phase === 'ready' && (
        <div className="text-center py-8 animate-fadeIn">
          <p className="text-[13px] text-white/40 mb-6 max-w-sm mx-auto">
            6 real-world scenarios about geomagnetic storm impacts. Choose the correct response for each Kp level.
          </p>
          <button onClick={startGame}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
            ▶ Start Briefing
          </button>
        </div>
      )}

      {phase === 'playing' && current && (
        <div className="animate-fadeIn" key={qIdx}>
          {/* Kp badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1.5 rounded-lg" style={{
              background: `${getKpColor(current.kp)}10`,
              border: `1px solid ${getKpColor(current.kp)}25`,
            }}>
              <span className="text-lg font-mono font-black" style={{ color: getKpColor(current.kp) }}>
                Kp {current.kp}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{
              background: `${getKpColor(current.kp)}08`, color: getKpColor(current.kp),
            }}>
              {current.gScale}
            </span>
          </div>

          {/* Question */}
          <p className="text-[14px] text-white/70 font-medium leading-relaxed mb-5">
            {current.question}
          </p>

          {/* Options */}
          <div className="space-y-2.5 mb-4">
            {current.options.map((opt, i) => {
              let bg = 'rgba(255,255,255,0.02)';
              let border = 'rgba(255,255,255,0.06)';
              let textColor = 'rgba(255,255,255,0.5)';
              let icon = null;

              if (selected) {
                if (opt.correct) {
                  bg = 'rgba(34,197,94,0.1)';
                  border = 'rgba(34,197,94,0.3)';
                  textColor = '#22c55e';
                  icon = <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
                } else if (opt === selected && !opt.correct) {
                  bg = 'rgba(239,68,68,0.1)';
                  border = 'rgba(239,68,68,0.3)';
                  textColor = '#ef4444';
                  icon = <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  disabled={selected !== null}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.01]"
                  style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
                >
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-[12px] leading-relaxed flex-1">{opt.text}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="p-4 rounded-xl mb-4 animate-fadeIn" style={{
              background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)',
            }}>
              <p className="text-[10px] font-mono font-bold text-sky-400 mb-1">📚 Explanation</p>
              <p className="text-[11px] leading-relaxed text-white/40">{current.explanation}</p>
            </div>
          )}

          {selected && (
            <button onClick={nextQuestion}
              className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              {qIdx + 1 < questions.length ? 'Next Scenario →' : 'See Results →'}
            </button>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="text-center py-4 animate-fadeIn">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Trophy className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h4 className="text-lg font-bold text-emerald-400 mb-1">Briefing Complete</h4>
          <p className="text-[12px] text-white/30 mb-3">{score}/{questions.length} correct · {accuracy}% accuracy</p>
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

export default KpChallenge;
