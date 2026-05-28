import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, BookOpen, Globe, Atom } from 'lucide-react';

const Education = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">

      {/* Decorative orbits */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-purple-500/[0.06] animate-[spin_90s_linear_infinite]" />
        <div className="absolute inset-12 rounded-full border border-indigo-500/[0.07] animate-[spin_70s_linear_infinite_reverse]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-xl mx-auto">
        {/* Glowing icon */}
        <div className="relative inline-flex mb-8">
          <GraduationCap className="w-16 h-16 text-purple-400" />
          <div className="absolute inset-0 w-16 h-16 bg-purple-400/20 rounded-full blur-xl animate-breathe" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
          Education
        </h1>

        <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-md mx-auto">
          Learn about space weather, solar dynamics, and how HeliosWatch protects our planet.
        </p>

        {/* Upcoming topics */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: BookOpen, label: 'Solar Fundamentals' },
            { icon: Globe, label: 'Geomagnetic Storms' },
            { icon: Atom, label: 'Particle Physics' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 font-medium">
              <Icon className="w-4 h-4 text-purple-400/80" />
              {label}
            </div>
          ))}
        </div>

        {/* Coming soon badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-slate-400 text-sm font-mono tracking-widest mb-8">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
          COMING SOON
        </div>

        <div className="block">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors duration-300 group"
          >
            Explore the Dashboard instead
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Education;
