import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, Clock, Star, Zap, Target, TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   "FLARE ALERT OPERATOR" — Classify X-ray flux values
   Speed classification game with streak bonuses
   ═══════════════════════════════════════════════════════════ */

const CLASSES = [
  { letter: 'A', min: 1e-8, max: 1e-7, color: '#22c55e' },
  { letter: 'B', min: 1e-7, max: 1e-6, color: '#38bdf8' },
  { letter: 'C', min: 1e-6, max: 1e-5, color: '#fbbf24' },
  { letter: 'M', min: 1e-5, max: 1e-4, color: '#f97316' },
  { letter: 'X', min: 1e-4, max: 1e-3, color: '#ef4444' },
];

const generateFlux = () => {
  const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
  const flux = cls.min + Math.random() * (cls.max - cls.min);
  return { flux, correctClass: cls.letter };
};

const getClassFromLetter = (l) => CLASSES.find(c => c.letter === l);

const ROUND_COUNT = 12;
const TIME_PER_ROUND = 6; // seconds

const FlareChallenge = ({ onBadge }) => {
  const [phase, setPhase] = useState('ready'); // ready | playing | result
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState(null); // { type: 'correct'|'wrong'|'timeout', letter }
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);

  const startGame = () => {
    setPhase('playing');
    setRound(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setHistory([]);
    nextRound(0);
  };

  const nextRound = useCallback((r) => {
    if (r >= ROUND_COUNT) {
      setPhase('result');
      if (onBadge) onBadge('flare-operator');
      return;
    }
    setRound(r);
    setCurrent(generateFlux());
    setTimeLeft(TIME_PER_ROUND);
    setFeedback(null);
  }, [onBadge]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing' || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, round, feedback]);

  const handleTimeout = () => {
    setFeedback({ type: 'timeout', letter: current?.correctClass });
    setStreak(0);
    setHistory(h => [...h, { flux: current.flux, correct: current.correctClass, answer: '—', result: 'timeout' }]);
    setTimeout(() => nextRound(round + 1), 1200);
  };

  const handleGuess = (letter) => {
    clearInterval(timerRef.current);
    const isCorrect = letter === current.correctClass;
    const timeBonus = Math.ceil(timeLeft * 10);
    const streakBonus = streak * 15;

    if (isCorrect) {
      const pts = 100 + timeBonus + streakBonus;
      setScore(s => s + pts);
      setCorrect(c => c + 1);
      setStreak(s => {
        const newStreak = s + 1;
        setBestStreak(b => Math.max(b, newStreak));
        return newStreak;
      });
      setFeedback({ type: 'correct', letter, pts });
    } else {
      setStreak(0);
      setFeedback({ type: 'wrong', letter, correctLetter: current.correctClass });
    }

    setHistory(h => [...h, {
      flux: current.flux,
      correct: current.correctClass,
      answer: letter,
      result: isCorrect ? 'correct' : 'wrong',
    }]);

    setTimeout(() => nextRound(round + 1), 1000);
  };

  const accuracy = round > 0 ? Math.round((correct / Math.max(1, history.length)) * 100) : 0;

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(15,15,30,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Flare Alert Operator</h3>
          </div>
          <p className="text-[11px] text-white/30">Classify incoming X-ray flux readings — fast!</p>
        </div>
        {phase === 'playing' && (
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-white/30">{round + 1}/{ROUND_COUNT}</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-400/50" />
              <span className="text-amber-400/70">×{streak}</span>
            </div>
            <span className="text-white/50">{score} pts</span>
          </div>
        )}
      </div>

      {/* Ready screen */}
      {phase === 'ready' && (
        <div className="text-center py-8 animate-fadeIn">
          <p className="text-[13px] text-white/40 mb-6 max-w-sm mx-auto">
            You'll receive {ROUND_COUNT} X-ray flux readings. Classify each one as A, B, C, M, or X before time runs out.
            <br /><br />
            <span className="text-white/25">Speed + Streaks = Bonus points!</span>
          </p>
          <button onClick={startGame}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(244,63,94,0.1))',
              border: '1px solid rgba(244,63,94,0.3)',
              color: '#f43f5e',
            }}>
            ▶ Begin Classification
          </button>
        </div>
      )}

      {/* Playing screen */}
      {phase === 'playing' && current && (
        <div className="animate-fadeIn" key={round}>
          {/* Timer bar */}
          <div className="relative h-1.5 rounded-full overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(timeLeft / TIME_PER_ROUND) * 100}%`,
                background: timeLeft <= 2 ? '#ef4444' : timeLeft <= 4 ? '#f59e0b' : '#22c55e',
                transition: 'width 1s linear, background-color 0.3s',
              }}
            />
          </div>

          {/* Flux display */}
          <div className="text-center mb-6">
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-2">
              Incoming X-Ray Flux Reading
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl" style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-3xl font-mono font-black text-white/90">
                {current.flux.toExponential(2)}
              </span>
              <span className="text-xs font-mono text-white/30">W/m²</span>
            </div>
          </div>

          {/* Classification buttons */}
          {!feedback ? (
            <div className="flex justify-center gap-3">
              {CLASSES.map(cls => (
                <button
                  key={cls.letter}
                  onClick={() => handleGuess(cls.letter)}
                  className="w-16 h-16 rounded-xl text-2xl font-black font-mono transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: `${cls.color}10`,
                    border: `2px solid ${cls.color}30`,
                    color: cls.color,
                    boxShadow: `0 0 12px ${cls.color}08`,
                  }}
                >
                  {cls.letter}
                </button>
              ))}
            </div>
          ) : (
            /* Feedback */
            <div className="text-center py-2 animate-fadeIn">
              {feedback.type === 'correct' && (
                <div>
                  <p className="text-lg font-bold text-emerald-400 mb-1">✓ Correct!</p>
                  <p className="text-[11px] font-mono text-emerald-400/60">+{feedback.pts} pts</p>
                </div>
              )}
              {feedback.type === 'wrong' && (
                <div>
                  <p className="text-lg font-bold text-red-400 mb-1">✗ Wrong</p>
                  <p className="text-[11px] font-mono text-white/30">
                    You said {feedback.letter} — correct was{' '}
                    <span style={{ color: getClassFromLetter(feedback.correctLetter)?.color }}>
                      {feedback.correctLetter}
                    </span>
                  </p>
                </div>
              )}
              {feedback.type === 'timeout' && (
                <div>
                  <p className="text-lg font-bold text-amber-400 mb-1">⏱ Time's Up!</p>
                  <p className="text-[11px] font-mono text-white/30">
                    Answer was <span style={{ color: getClassFromLetter(feedback.letter)?.color }}>{feedback.letter}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result screen */}
      {phase === 'result' && (
        <div className="text-center py-4 animate-fadeIn">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
              <Trophy className="w-7 h-7 text-rose-400" />
            </div>
          </div>

          <h4 className="text-lg font-bold text-rose-400 mb-1">Classification Complete</h4>
          <p className="text-[12px] text-white/30 mb-4">{correct}/{ROUND_COUNT} correct · Best streak: {bestStreak}</p>

          {/* Stars */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="w-5 h-5" style={{
                color: (i === 0 && accuracy >= 30) || (i === 1 && accuracy >= 60) || (i === 2 && accuracy >= 85) ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                fill: (i === 0 && accuracy >= 30) || (i === 1 && accuracy >= 60) || (i === 2 && accuracy >= 85) ? '#fbbf24' : 'none',
              }} />
            ))}
          </div>

          {/* Score */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
            <Star className="w-4 h-4 text-rose-400" />
            <span className="text-lg font-mono font-bold text-rose-400">{score} pts</span>
          </div>

          {/* History */}
          <div className="max-w-sm mx-auto mt-4">
            <p className="text-[8px] font-mono text-white/15 uppercase tracking-widest mb-2">Round History</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {history.map((h, i) => (
                <div key={i} className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-mono font-bold"
                  style={{
                    background: h.result === 'correct' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: h.result === 'correct' ? '#22c55e' : '#ef4444',
                  }}>
                  {h.correct}
                </div>
              ))}
            </div>
          </div>

          <button onClick={startGame}
            className="mt-4 text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider">
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

export default FlareChallenge;
