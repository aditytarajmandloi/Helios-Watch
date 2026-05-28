import React, { useState, useEffect, useRef } from 'react';
import { Target, AlertTriangle, ShieldAlert, Crosshair, ChevronDown, CheckCircle, RotateCcw, Zap, Heart } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   LEVEL DATA: Solar Descent
   ═══════════════════════════════════════════════════════════ */
const DESCENT_STAGES = [
  {
    id: 'corona', name: 'Corona', depth: '1,000,000 km+',
    telemetry: 'WARNING: Rapid external temperature spike to 2,000,000 K. Density is extremely low (10⁻¹⁶ g/cm³). Magnetic nanoflares impacting hull.',
    options: ['Chromosphere', 'Radiative Zone', 'Corona', 'Photosphere'],
    correct: 'Corona', color: '#a78bfa'
  },
  {
    id: 'chromosphere', name: 'Chromosphere', depth: '2,000 km',
    telemetry: 'H-alpha emissions detected. Plasma jets (spicules) striking hull at 20 km/s. Local temperature plunging rapidly towards 10,000 K.',
    options: ['Tachocline', 'Chromosphere', 'Core', 'Convective Zone'],
    correct: 'Chromosphere', color: '#ef4444'
  },
  {
    id: 'photosphere', name: 'Photosphere', depth: 'Surface (0 km)',
    telemetry: 'Visible light density at maximum. Passing through cool magnetic anomalies (3,700 K) drifting in a 5,800 K ocean of plasma.',
    options: ['Photosphere', 'Radiative Zone', 'Convective Zone', 'Tachocline'],
    correct: 'Photosphere', color: '#ea580c'
  },
  {
    id: 'convective', name: 'Convective Zone', depth: '-200,000 km',
    telemetry: 'Massive thermal updrafts detected. Navigating through Texas-sized convection cells. Plasma boiling rapidly. Temp: 2,000,000 K.',
    options: ['Convective Zone', 'Core', 'Radiative Zone', 'Chromosphere'],
    correct: 'Convective Zone', color: '#d97706'
  },
  {
    id: 'tachocline', name: 'Tachocline', depth: '-210,000 km',
    telemetry: 'CRITICAL WARNING: Extreme shear forces detected! Rapid shift in solar rotation. Primary magnetic dynamo generating huge fields.',
    options: ['Tachocline', 'Photosphere', 'Radiative Zone', 'Corona'],
    correct: 'Tachocline', color: '#eab308'
  },
  {
    id: 'radiative', name: 'Radiative Zone', depth: '-500,000 km',
    telemetry: 'Thermal convection ceased. Density scaling to 20 g/cm³. Experiencing intense photon pressure from deep core radiation.',
    options: ['Convective Zone', 'Radiative Zone', 'Core', 'Tachocline'],
    correct: 'Radiative Zone', color: '#fde047'
  },
  {
    id: 'core', name: 'Core', depth: '-700,000 km (Center)',
    telemetry: 'DANGER: 250 Billion Atmospheres pressure. Temp: 15,000,000 K. Proton-proton chain fusion reactions saturating sensors.',
    options: ['Radiative Zone', 'Chromosphere', 'Core', 'Photosphere'],
    correct: 'Core', color: '#fef9c3'
  }
];

/* ═══════════════════════════════════════════════════════════
   MAIN DESCENT GAME ENGINE
   ═══════════════════════════════════════════════════════════ */
const SunChallenge = () => {
  const [started, setStarted] = useState(false);
  const [levelIdx, setLevelIdx] = useState(0);
  const [shield, setShield] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [diveFlash, setDiveFlash] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20);

  const currentStage = DESCENT_STAGES[levelIdx];

  // Stage Timer Loop - Safe React 18 Implementation
  useEffect(() => {
    let timerId;
    if (started && !gameOver && !victory) {
      if (timeRemaining > 0) {
        timerId = setTimeout(() => {
          setTimeRemaining(prev => prev - 1);
        }, 1000);
      } else {
        // Time ran out!
        handleAnswer('TIMEOUT');
      }
    }
    return () => clearTimeout(timerId);
  }, [started, gameOver, victory, timeRemaining, levelIdx]);

  const flashScreen = (type) => {
    if (type === 'damage') {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 400);
    } else {
      setDiveFlash(true);
      setTimeout(() => setDiveFlash(false), 500);
    }
  };

  const handleAnswer = (answer) => {
    if (gameOver || victory) return; // Prevent double clicks

    if (answer === currentStage.correct) {
      // Correct: Restore shield heavily and dive
      flashScreen('dive');
      setShield(prev => Math.min(100, prev + 30));
      
      if (levelIdx === DESCENT_STAGES.length - 1) {
        setVictory(true);
      } else {
        setLevelIdx(prev => prev + 1);
        setTimeRemaining(20 - (levelIdx + 1) * 2); // Gets faster each level!
      }
    } else {
      // Wrong or Timeout: Massive damage
      flashScreen('damage');
      setShield(prev => {
        const next = prev - 40; // Severe penalty
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
      // Reset timer so they can try again if shield > 0
      setTimeRemaining(20 - levelIdx * 2); 
    }
  };

  const restart = () => {
    setStarted(false);
    setLevelIdx(0);
    setShield(100);
    setGameOver(false);
    setVictory(false);
    setTimeRemaining(20);
  };

  /* ── Intro Screen ── */
  if (!started) {
    return (
      <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-8 rounded-3xl border border-white/5 relative overflow-hidden"
           style={{ background: 'radial-gradient(ellipse at center, rgba(30,10,20,0.6), rgba(10,5,15,0.9))' }}>
        
        <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.3)]">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">Core Descent <span className="text-red-500">Protocol</span></h2>
        <p className="text-center text-xs text-red-400 font-mono tracking-[0.4em] mb-10 uppercase">Simulation Clearance Required</p>
        
        <div className="max-w-xl text-center text-white/50 text-sm leading-relaxed mb-10 space-y-4">
          <p>You have been assigned to pilot a heat-shielded probe diving directly into the core of the Sun.</p>
          <p>Read the incoming thermal anomalies carefully. You must correctly identify what solar layer you have entered to adjust hull harmonics before the heat shield melts.</p>
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 inline-block mt-4 text-red-300 font-mono text-xs">
            WARNING: Selecting incorrect harmonics will cause catastrophic 40% hull damage.
          </div>
        </div>

        <button 
          onClick={() => setStarted(true)}
          className="px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', boxShadow: '0 0 40px rgba(239,68,68,0.5)', color: 'white' }}
        >
          Initialize Drop
        </button>
      </div>
    );
  }

  /* ── Victory/Game Over Screens ── */
  if (victory) {
    return (
      <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-8 rounded-3xl border border-green-500/30 bg-green-500/10 relative text-center">
        <CheckCircle className="w-24 h-24 text-green-400 mb-6 drop-shadow-[0_0_30px_rgba(74,222,128,0.6)] animate-bounce" />
        <h2 className="text-5xl font-black text-white mb-4">CORE REACHED</h2>
        <p className="text-green-300 font-mono tracking-widest uppercase mb-10">Simulation Passed • Shields Intact at {Math.round(shield)}%</p>
        <button onClick={restart} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-green-500/50 hover:bg-green-500/20 text-xs uppercase font-bold tracking-widest text-green-400 transition-colors">
          <RotateCcw className="w-4 h-4" /> Run Simulation Again
        </button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-8 rounded-3xl border border-red-500/40 bg-red-500/10 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-red-500 mix-blend-overlay animate-pulse opacity-20" />
        <Zap className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_40px_rgba(239,68,68,1)]" />
        <h2 className="text-5xl font-black text-red-500 mb-2 font-mono tracking-tight">HULL BREACH</h2>
        <p className="text-white/70 mb-10 max-w-md text-sm leading-relaxed">
          The probe was incinerated at {DESCENT_STAGES[levelIdx].depth}. Thermal shielding completely overwhelmed due to incorrect harmonic alignment.
        </p>
        <button onClick={restart} className="z-10 px-6 py-3 border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 rounded-xl font-mono uppercase tracking-widest text-xs transition-colors">
          Deploy New Probe
        </button>
      </div>
    );
  }

  /* ── Main Game UI ── */
  const isCritical = shield <= 40;
  const shieldColor = isCritical ? '#ef4444' : (shield <= 70 ? '#f59e0b' : '#3b82f6');

  return (
    <div className="w-full relative min-h-[500px] flex flex-col rounded-3xl border overflow-hidden transition-all duration-700"
         style={{ borderColor: `${currentStage.color}40`, backgroundColor: 'rgba(10,10,15,0.95)' }}>
      
      {/* Visual FX Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 flex items-center justify-center overflow-hidden">
        {/* Simulated plunging rings */}
        <div className="relative w-[800px] h-[800px]" style={{ perspective: '800px' }}>
           {[1,2,3,4,5].map(i => (
             <div 
               key={i} 
               className="absolute inset-0 rounded-full border border-dashed animate-[spin_10s_linear_infinite]"
               style={{ 
                  animationDuration: `${(8 - levelIdx) * 0.4}s`,
                  borderColor: currentStage.color, 
                  opacity: i * 0.15,
                  transform: `rotateX(75deg) translateZ(${-(i * 200) + (levelIdx * 50)}px)`,
                  transition: 'transform 1s ease-out, border-color 1s'
               }}
             />
           ))}
        </div>
      </div>

      {/* Screen Flashes */}
      <div className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-300 ${damageFlash ? 'opacity-100 bg-red-500/40' : 'opacity-0'}`} />
      <div className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-300 ${diveFlash ? 'opacity-100 bg-white/70' : 'opacity-0'}`} />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 border-b border-white/5 bg-black/60 backdrop-blur-md gap-4">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${currentStage.color}15`, borderColor: `${currentStage.color}40` }}>
            <Crosshair className="w-6 h-6" style={{ color: currentStage.color }} />
          </div>
          <div>
            <div className="text-[9px] text-white/50 font-mono tracking-[0.2em] uppercase mb-1">Depth Status</div>
            <div className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: currentStage.color }}>
              {currentStage.depth}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
             <Heart className={`w-5 h-5 ${isCritical ? 'animate-ping' : ''}`} style={{ color: shieldColor }} />
             <div>
               <div className="text-[8px] uppercase tracking-widest text-white/40 mb-0.5">Integrity</div>
               <div className="text-base font-mono font-bold" style={{ color: shieldColor }}>{shield}%</div>
             </div>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="text-right">
            <div className="text-[8px] uppercase tracking-widest text-white/40 mb-0.5">Time To Align</div>
            <div className={`text-base font-mono font-bold ${timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-white/90'}`}>
              00:{timeRemaining.toString().padStart(2, '0')}
            </div>
          </div>
        </div>

      </div>

      {/* Main Play Area */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-8">
        
        {/* Left: Telemetry Feed */}
        <div className="lg:col-span-12 flex flex-col justify-center max-w-4xl mx-auto w-full">
          <div className="mb-8 p-6 sm:p-8 rounded-2xl border bg-black/50 backdrop-blur-xl relative overflow-hidden" style={{ borderColor: `${currentStage.color}30`, boxShadow: `inset 0 0 60px ${currentStage.color}10` }}>
            <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: currentStage.color }} />
            
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
               <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentStage.color, boxShadow: `0 0 10px ${currentStage.color}` }} />
               <span className="text-xs font-mono tracking-[0.2em] uppercase text-white/70">Incoming Telemetry</span>
            </div>
            <p className="text-xl sm:text-3xl leading-relaxed text-white/95 font-medium tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              "{currentStage.telemetry}"
            </p>
          </div>

          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-white/40 mb-4 flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-white/20" /> Align Harmonic Frequency to Identity Layer
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentStage.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className="px-6 py-5 rounded-xl border bg-white/5 hover:bg-white/10 text-sm font-bold tracking-widest uppercase transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group flex items-center"
                  style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <Target className="w-5 h-5 text-white/20 group-hover:text-amber-400 mr-4 transition-colors" />
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SunChallenge;
