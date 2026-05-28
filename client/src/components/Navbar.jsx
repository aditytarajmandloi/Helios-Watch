import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/education', label: 'Education' },
];

const Navbar = ({ transparent = false }) => {
  const { user, logout, toggleAlerts } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 z-50 w-full pointer-events-auto">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 flex items-center justify-between h-14">

        {/* Brand */}
        <NavLink to="/" className="select-none">
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(1.4rem, 2.8vw, 1.8rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#93c5fd',
              transition: 'color 0.5s ease',
            }}
          >
            HeliosWatch
          </span>
        </NavLink>

        {/* Nav links */}
        <div className="flex items-center">
          <div className="hidden sm:flex items-center gap-6 mr-3">
            {navItems.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `relative px-3.5 py-1.5 rounded-md text-[15px] font-medium tracking-wide transition-all duration-300 ${isActive ? 'text-white/90' : 'text-white/40 hover:text-white/80'}`
                }
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-px rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
          
          {/* User Profile Area */}
          {user ? (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest text-white/60">
                  {user.email.split('@')[0].toUpperCase()}
                </span>
              </div>
              
              <button 
                onClick={toggleAlerts}
                title={user.receiveAlerts ? "Disable Email Alerts" : "Enable Email Alerts"}
                className={`px-3 py-1.5 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest ${user.receiveAlerts ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/80'}`}
              >
                {user.receiveAlerts ? 'ALERTS ON' : 'ALERTS OFF'}
              </button>
              
              <button 
                onClick={handleLogout}
                title="Logout"
                className="px-3 py-1.5 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="ml-4 pl-4 border-l border-white/10">
              <NavLink to="/login" className="px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                Login
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
