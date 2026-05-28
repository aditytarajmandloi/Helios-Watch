import React, { useState } from 'react';
import { ArrowLeft, Thermometer, Atom, Zap, Info, BookOpen, Gamepad2, Activity } from 'lucide-react';
import SunChallenge from './SunChallenge';
import SunModelR3F from './SunModelR3F';

/* ═══════════════════════════════════════════════════════════
   SUN LAYER DATA
   ═══════════════════════════════════════════════════════════ */
const LAYERS = [
  {
    id: 'core', name: 'Core', order: 1, radiusPct: 20,
    temperature: '15,000,000 K', density: '150 g/cm³',
    color: '#fffbe6', glowColor: '#fef9c3', gradient: ['#fffbe6', '#fef08a', '#fde047'],
    description: 'The nuclear furnace. Hydrogen fuses into helium at 15 million Kelvin, producing 99% of the Sun\'s energy through the proton-proton chain reaction.',
    fact: 'Every second, the core converts 600 million tons of hydrogen into helium.',
    physics: 'pp-chain fusion'
  },
  {
    id: 'radiative', name: 'Radiative Zone', order: 2, radiusPct: 45,
    temperature: '7,000,000 K', density: '20 g/cm³',
    color: '#fef08a', glowColor: '#fde047', gradient: ['#fef08a', '#fde047', '#facc15'],
    description: 'A dense plasma where photons bounce between atoms in a random walk that takes 170,000 years to cross.',
    fact: 'A photon created in the core takes 170,000 years to reach the surface.',
    physics: 'Radiative diffusion'
  },
  {
    id: 'tachocline', name: 'Tachocline', order: 3, radiusPct: 50,
    temperature: '2,000,000 K', density: '0.2 g/cm³',
    color: '#facc15', glowColor: '#eab308', gradient: ['#facc15', '#eab308', '#ca8a04'],
    description: 'A thin shear layer where the magnetic dynamo operates, generating the Sun\'s massive magnetic fields.',
    fact: 'The Sun\'s magnetic field originates right here.',
    physics: 'MHD dynamo'
  },
  {
    id: 'convective', name: 'Convective Zone', order: 4, radiusPct: 70,
    temperature: '2,000,000 K', density: '0.2 g/cm³',
    color: '#f59e0b', glowColor: '#d97706', gradient: ['#f59e0b', '#d97706', '#b45309'],
    description: 'Hot plasma rises, cools, and sinks in giant convection cells. The top of these cells causes surface granulation.',
    fact: 'Granulation cells span up to 30,000 km across.',
    physics: 'Thermal convection'
  },
  {
    id: 'photosphere', name: 'Photosphere', order: 5, radiusPct: 74,
    temperature: '5,800 K', density: '3x10⁻⁷ g/cm³',
    color: '#fb923c', glowColor: '#ea580c', gradient: ['#fb923c', '#ea580c', '#c2410c'],
    description: 'The visible "surface". Sunspots (cooler magnetic regions) appear as dark patches here.',
    fact: 'The photosphere is surprisingly thin — only 400 km thick.',
    physics: 'Thermal emission'
  },
  {
    id: 'chromosphere', name: 'Chromosphere', order: 6, radiusPct: 78,
    temperature: '6,000 → 20,000 K', density: '10⁻¹² g/cm³',
    color: '#ef4444', glowColor: '#dc2626', gradient: ['#ef4444', '#dc2626', '#b91c1c'],
    description: 'The "color sphere". Spicules — jets of plasma — shoot up from this layer at 20 km/s.',
    fact: 'About 60,000 spicules are active at any time.',
    physics: 'Hα emission'
  },
  {
    id: 'corona', name: 'Corona', order: 7, radiusPct: 100,
    temperature: '1,000,000 K+', density: '10⁻¹⁶ g/cm³',
    color: '#a78bfa', glowColor: '#8b5cf6', gradient: ['#a78bfa', '#8b5cf6', '#7c3aed'],
    description: 'The outermost atmosphere, extending millions of kilometers. Hotter than the surface, driving space weather.',
    fact: 'It is 200× hotter than the photosphere, a massive solar mystery.',
    physics: 'Coronal heating'
  }
];

/* ═══════════════════════════════════════════════════════════
   PREMIUM DATA TERMINAL
   ═══════════════════════════════════════════════════════════ */
const CyberDataPanel = ({ layer }) => {
  if (!layer) return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-black/20 backdrop-blur-md rounded-3xl border border-white/5">
       <div className="text-center animate-pulse">
         <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
         <p className="text-xs font-mono uppercase tracking-[0.3em] text-white/30">Select solar cross-section</p>
       </div>
    </div>
  );

  return (
    <div key={layer.id} className="h-full flex flex-col p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl transition-all animate-fadeIn relative overflow-hidden"
         style={{ boxShadow: `inset 0 0 80px ${layer.color}10` }}>
       
       <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: layer.color }} />

       <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${layer.color}15`, border: `1px solid ${layer.color}40`, boxShadow: `0 0 30px ${layer.color}20` }}>
             <span className="font-black text-2xl" style={{ color: layer.color }}>0{layer.order}</span>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] mb-1" style={{ color: layer.color }}>Depth Profile</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white/95 tracking-tight">{layer.name}</h2>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
             <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50" style={{ backgroundColor: layer.color }} />
             <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-white/50" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Core Temp</span>
             </div>
             <p className="text-xl sm:text-2xl font-bold tracking-tight text-white/90">{layer.temperature}</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
             <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50" style={{ backgroundColor: layer.color }} />
             <div className="flex items-center gap-2 mb-2">
                <Atom className="w-4 h-4 text-white/50" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Density Map</span>
             </div>
             <p className="text-xl sm:text-2xl font-bold tracking-tight text-white/90">{layer.density}</p>
          </div>
       </div>

       <div className="p-4 rounded-xl mb-8 flex items-center gap-4 bg-white/5 border border-white/10">
          <div className="p-3 rounded-lg bg-black/30">
            <Zap className="w-6 h-6 animate-pulse" style={{ color: layer.color }} />
          </div>
          <div>
             <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest block mb-1">Primary Mechanism</span>
             <p className="text-base font-bold text-white/90">{layer.physics}</p>
          </div>
       </div>

       <div className="mb-8">
         <h4 className="text-[11px] font-mono uppercase tracking-widest text-white/40 mb-3 border-b border-white/10 pb-2">Atmospheric Profile</h4>
         <p className="text-[15px] text-white/70 leading-relaxed font-light">
           {layer.description}
         </p>
       </div>

       <div className="mt-auto p-5 rounded-2xl backdrop-blur-md" style={{ background: `linear-gradient(135deg, ${layer.color}15, transparent)`, border: `1px solid ${layer.color}30` }}>
         <div className="flex items-center gap-2 mb-2">
           <Info className="w-4 h-4" style={{ color: layer.color }} />
           <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: layer.color }}>Mission Briefing Fact</span>
         </div>
         <p className="text-sm text-white/70 leading-relaxed">{layer.fact}</p>
       </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const SunExplorer = ({ onBack }) => {
  const [activeLayer, setActiveLayer] = useState(null);
  const [mode, setMode] = useState('learn'); // 'learn' | 'challenge'
  const activeData = LAYERS.find(l => l.id === activeLayer);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center">
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 lg:px-12 py-10 flex-1 flex flex-col">
        
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
           <div className="flex items-center gap-5">
             {onBack && (
               <button onClick={onBack} className="p-3 bg-white/5 backdrop-blur-md rounded-2xl hover:bg-white/10 transition-all hover:scale-105 border border-white/10 shadow-xl">
                 <ArrowLeft className="w-6 h-6 text-white/80" />
               </button>
             )}
             <div>
               <p className="text-[11px] uppercase tracking-[0.3em] font-mono font-bold mb-1" style={{ color: '#fbbf24' }}>Module 01</p>
               <h1 className="text-4xl sm:text-5xl font-black text-white/95 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                 The Sun <span className="font-light text-white/50">Explorer</span>
               </h1>
             </div>
           </div>

           {/* Sleek Mode Toggles */}
           <div className="flex items-center p-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
             <button onClick={() => setMode('learn')}
               className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300"
               style={{ 
                 background: mode === 'learn' ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))' : 'transparent', 
                 color: mode === 'learn' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                 border: mode === 'learn' ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent'
               }}>
               <BookOpen className="w-4 h-4" /> Learn
             </button>
             <button onClick={() => setMode('challenge')}
               className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300"
               style={{ 
                 background: mode === 'challenge' ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))' : 'transparent', 
                 color: mode === 'challenge' ? '#ef4444' : 'rgba(255,255,255,0.4)',
                 border: mode === 'challenge' ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent'
               }}>
               <Gamepad2 className="w-4 h-4" /> Challenge
             </button>
           </div>
        </div>

        {mode === 'learn' ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10">
             {/* Interactive WebGL 3D Model */}
             <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-3xl border border-white/5 relative overflow-hidden" style={{ minHeight: '500px' }}>
                <div className="absolute inset-0 z-0">
                  <SunModelR3F activeLayer={activeLayer} />
                </div>
                
                {/* Embedded WebGL UI Overlay (Visual Label Tracker) */}
                <div className="absolute bottom-6 z-10 flex flex-wrap justify-center gap-2 px-4 pointer-events-auto">
                  {LAYERS.map(layer => {
                    const isActive = activeLayer === layer.id;
                    return (
                      <button key={layer.id} onClick={() => setActiveLayer(layer.id)}
                        className="px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-widest uppercase transition-all duration-300 hover:scale-105"
                        style={{
                          background: isActive ? `${layer.color}40` : 'rgba(0,0,0,0.5)',
                          borderColor: isActive ? `${layer.color}80` : 'rgba(255,255,255,0.1)',
                          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                          backdropFilter: 'blur(8px)'
                        }}>
                        {layer.name}
                      </button>
                    )
                  })}
                  
                  {/* Reset view button */}
                  {activeLayer && (
                    <button onClick={() => setActiveLayer(null)}
                      className="px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-widest uppercase transition-all duration-300 hover:scale-105"
                      style={{
                        background: 'rgba(239,68,68,0.2)',
                        borderColor: 'rgba(239,68,68,0.4)',
                        color: '#ef4444',
                        backdropFilter: 'blur(8px)'
                      }}>
                      Reset View
                    </button>
                  )}
                </div>
             </div>
             
             {/* Data Terminal */}
             <div className="lg:col-span-5 h-full min-h-[600px]">
                <CyberDataPanel layer={activeData} />
             </div>
          </div>
        ) : (
          <SunChallenge />
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SunExplorer;
