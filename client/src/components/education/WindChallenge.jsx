import React, { useState, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, Star, Wind, Clock, ArrowRight, Target } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   "CME ARRIVAL PREDICTOR" — Estimate CME travel time
   Drag slider to predict arrival time based on CME speed
   ═══════════════════════════════════════════════════════════ */

const SUN_EARTH_KM = 1.496e8; // 149.6 million km

// Generate a random CME event
const generateEvent = () => {
  // Typical CME speeds: 200–3000 km/s
  const speed = Math.round(200 + Math.random() * 2400);
  const actualHours = (SUN_EARTH_KM / speed) / 3600;
  // Classify
  let type, color;
  if (speed < 500) { type = 'Slow CME'; color = '#22c55e'; }
  else if (speed < 1000) { type = 'Moderate CME'; color = '#fbbf24'; }
  else if (speed < 2000) { type = 'Fast CME'; color = '#f97316'; }
  else { type = 'Extreme CME'; color = '#ef4444'; }

  return { speed, actualHours, type, color };
};

const ROUNDS = 6;

const WindChallenge = ({ onBadge }) => {
  const [phase, setPhase] = useState('ready');
  const [round, setRound] = useState(0);
  const [event, setEvent] = useState(null);
  const [guess, setGuess] = useState(50);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [totalScore, setTotalScore] = useState(0);

  const startGame = () => {
    setPhase('playing');
    setRound(0);
    setResults([]);
    setTotalScore(0);
    nextRound(0);
  };

  const nextRound = (r) => {
    if (r >= ROUNDS) {
      setPhase('result');
      if (onBadge) onBadge('cme-predictor');
      return;
    }
    setRound(r);
    setEvent(generateEvent());
    setGuess(50);
    setSubmitted(false);
  };

  const submitGuess = () => {
    if (!event) return;
    const actual = event.actualHours;
    const errorPct = Math.abs(guess - actual) / actual * 100;
    const pts = Math.max(0, Math.round(200 - errorPct * 3));
    setTotalScore(s => s + pts);
    setResults(r => [...r, { speed: event.speed, actual, guess, errorPct, pts }]);
    setSubmitted(true);
  };

  const avgError = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.errorPct, 0) / results.length)
    : 0;

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">CME Arrival Predictor</h3>
          </div>
          <p className="text-[11px] text-white/30">Estimate the travel time from Sun to Earth</p>
        </div>
        {phase === 'playing' && (
          <span className="text-[11px] font-mono text-white/30">{round + 1}/{ROUNDS}</span>
        )}
      </div>

      {phase === 'ready' && (
        <div className="text-center py-8 animate-fadeIn">
          <p className="text-[13px] text-white/40 mb-2 max-w-sm mx-auto">
            A CME is launched from the Sun. Given its speed, predict how many hours it takes to reach Earth.
          </p>
          <p className="text-[11px] text-white/20 mb-6">
            Distance: 149.6 million km · Formula: Time = Distance ÷ Speed
          </p>
          <button onClick={startGame}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8' }}>
            ▶ Launch Simulation
          </button>
        </div>
      )}

      {phase === 'playing' && event && (
        <div className="animate-fadeIn" key={round}>
          {/* Event card */}
          <div className="p-4 rounded-xl mb-5" style={{
            background: `${event.color}06`, border: `1px solid ${event.color}15`,
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-white/20 mb-1">Incoming CME</p>
                <p className="text-sm font-bold" style={{ color: event.color }}>{event.type}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-mono text-white/20">Measured Speed</p>
                <p className="text-2xl font-mono font-black" style={{ color: event.color }}>
                  {event.speed} <span className="text-xs font-normal text-white/30">km/s</span>
                </p>
              </div>
            </div>
          </div>

          {/* Slider */}
          {!submitted ? (
            <div className="mb-4">
              <p className="text-[10px] font-mono text-white/25 mb-3 text-center">
                Drag to predict arrival time (hours)
              </p>
              <div className="px-2">
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={guess}
                  onChange={e => setGuess(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: 'linear-gradient(to right, #ef4444, #f97316, #fbbf24, #22c55e)',
                    accentColor: '#38bdf8',
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] font-mono text-white/15">1h (super fast)</span>
                  <span className="text-[8px] font-mono text-white/15">200h (~8 days)</span>
                </div>
              </div>

              <div className="text-center mt-4">
                <span className="text-3xl font-mono font-black text-sky-400">{guess}</span>
                <span className="text-sm font-mono text-white/30 ml-1">hours</span>
                <p className="text-[10px] text-white/20 mt-0.5">
                  ({(guess / 24).toFixed(1)} days)
                </p>
              </div>

              <button onClick={submitGuess}
                className="w-full mt-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}>
                <Target className="w-3 h-3 inline mr-2" />
                Lock In Prediction
              </button>
            </div>
          ) : (
            /* Result */
            <div className="animate-fadeIn">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <p className="text-[8px] font-mono text-white/20 mb-1">Your Guess</p>
                  <p className="text-lg font-mono font-bold text-sky-400">{guess}h</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                  <p className="text-[8px] font-mono text-white/20 mb-1">Actual</p>
                  <p className="text-lg font-mono font-bold text-emerald-400">{event.actualHours.toFixed(1)}h</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{
                  background: results[results.length - 1]?.pts > 100 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${results[results.length - 1]?.pts > 100 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
                }}>
                  <p className="text-[8px] font-mono text-white/20 mb-1">Points</p>
                  <p className="text-lg font-mono font-bold" style={{
                    color: results[results.length - 1]?.pts > 100 ? '#22c55e' : '#ef4444',
                  }}>
                    +{results[results.length - 1]?.pts}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] text-white/30">
                  📐 Calculation: {SUN_EARTH_KM.toExponential(2)} km ÷ {event.speed} km/s = {(SUN_EARTH_KM / event.speed).toFixed(0)} seconds = <strong className="text-white/50">{event.actualHours.toFixed(1)} hours</strong>
                </p>
              </div>

              <button onClick={() => nextRound(round + 1)}
                className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                {round + 1 < ROUNDS ? 'Next CME →' : 'See Results →'}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="text-center py-4 animate-fadeIn">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)' }}>
              <Trophy className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <h4 className="text-lg font-bold text-sky-400 mb-1">Predictions Complete</h4>
          <p className="text-[12px] text-white/30 mb-3">Average error: {avgError}%</p>
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="w-5 h-5" style={{
                color: (i === 0 && avgError < 80) || (i === 1 && avgError < 40) || (i === 2 && avgError < 15) ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                fill: (i === 0 && avgError < 80) || (i === 1 && avgError < 40) || (i === 2 && avgError < 15) ? '#fbbf24' : 'none',
              }} />
            ))}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
            style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Star className="w-4 h-4 text-sky-400" />
            <span className="text-lg font-mono font-bold text-sky-400">{totalScore} pts</span>
          </div>
          <br />
          <button onClick={startGame}
            className="text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider">
            ↻ Play Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: #38bdf8; cursor: pointer; box-shadow: 0 0 10px rgba(56,189,248,0.4);
          border: 2px solid rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
};

export default WindChallenge;
