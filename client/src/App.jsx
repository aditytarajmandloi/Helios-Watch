import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Education from './pages/EducationHub';
import { useFrames } from './context/FrameContext';
import { useTheme } from './context/ThemeContext';
import { TelemetryProvider } from './context/TelemetryContext';
import { useAuth } from './context/AuthContext';

/* ── Splash screen shown while frames load ── */
function SplashScreen({ progress }) {
  const { dark } = useTheme();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#050508' }}>
      <span
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '2.8rem',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: dark ? '#93c5fd' : '#fb923c',
          marginBottom: '2rem',
        }}
      >
        HeliosWatch
      </span>
      <div
        className="w-48 h-px rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: dark
              ? 'linear-gradient(90deg, #2563eb, #3b82f6, #93c5fd)'
              : 'linear-gradient(90deg, #ea580c, #f97316, #fbbf24)',
            transition: 'width 0.12s linear',
          }}
        />
      </div>
      <span className="mt-4 text-[9px] font-mono text-white/10 tracking-[0.5em]">
        PREPARING EXPERIENCE
      </span>
    </div>
  );
}

/* ── Protected Route Wrapper ── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050508' }}>
        <div className="w-5 h-5 border-2 border-t-blue-500 border-gray-700 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* ── Main app content ── */
function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#050508' }}>
      {!isLogin && <Navbar transparent={isHome} />}
      <main className={isHome || isLogin ? '' : 'flex-1 pt-14'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Home />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/education" element={<Education />} />
          <Route path="/education/*" element={<Education />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { loading, progress } = useFrames();

  if (loading) return <SplashScreen progress={progress} />;

  return (
    <TelemetryProvider>
      <Router>
        <AppContent />
      </Router>
    </TelemetryProvider>
  );
}

export default App;
