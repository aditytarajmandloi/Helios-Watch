import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const AuthPage = ({ onSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot_step1', 'forgot_step2'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { dark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.success) {
          if (onSuccess) onSuccess();
          else navigate('/dashboard');
        }
        else setError(result.message || 'Authentication failed');
      } 
      else if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const result = await register(email, password);
        if (result.success) {
          setSuccessMsg('Registration successful. Please log in.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(result.message || 'Registration failed');
        }
      } 
      else if (mode === 'forgot_step1') {
        const result = await forgotPassword(email);
        if (result.success) {
          setMode('forgot_step2');
          setSuccessMsg('A 6-digit code has been sent to your email.');
        } else {
          setError(result.message || 'Failed to send reset code');
        }
      } 
      else if (mode === 'forgot_step2') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const result = await resetPassword(email, otp, password);
        if (result.success) {
          setSuccessMsg('Password reset successfully. You can now log in.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setOtp('');
        } else {
          setError(result.message || 'Failed to reset password');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { 
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff'
  };

  return (
    <div className="w-full flex items-center justify-center p-6">
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'white', fontFamily: "'Outfit', sans-serif" }}>
            HeliosWatch
          </h1>
          <p className="text-sm font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Sign in to your account
          </p>
        </div>

        <div className="rounded-2xl p-8 border shadow-2xl transition-all backdrop-blur-md"
             style={{ 
               background: 'rgba(0, 0, 0, 0.65)', 
               borderColor: 'rgba(255, 255, 255, 0.1)'
             }}>
          
          {(mode === 'login' || mode === 'register') && (
            <div className="flex mb-6 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${mode === 'login' ? 'shadow-sm' : ''}`}
                style={{
                  background: mode === 'login' ? '#2563eb' : 'transparent',
                  color: mode === 'login' ? '#ffffff' : 'rgba(255,255,255,0.5)'
                }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${mode === 'register' ? 'shadow-sm' : ''}`}
                style={{
                  background: mode === 'register' ? '#2563eb' : 'transparent',
                  color: mode === 'register' ? '#ffffff' : 'rgba(255,255,255,0.5)'
                }}
              >
                Register
              </button>
            </div>
          )}

          {(mode === 'forgot_step1' || mode === 'forgot_step2') && (
            <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: 'white' }}>
              Password Recovery
            </h2>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-xl text-sm font-medium"
                 style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3 rounded-xl text-sm font-medium"
                 style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={mode === 'forgot_step2'}
                className="block w-full px-4 py-2.5 rounded-lg text-sm transition-all outline-none"
                style={{ ...inputStyle, opacity: mode === 'forgot_step2' ? 0.5 : 1 }}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
              />
            </div>

            {mode === 'forgot_step2' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>
                  6-Digit Reset Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="block w-full px-4 py-2.5 rounded-lg text-sm transition-all outline-none tracking-widest font-mono"
                  style={inputStyle}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
                />
              </div>
            )}

            {mode !== 'forgot_step1' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>
                  {mode === 'forgot_step2' ? 'New Password' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  className="block w-full px-4 py-2.5 rounded-lg text-sm transition-all outline-none"
                  style={inputStyle}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
                />
              </div>
            )}

            {(mode === 'register' || mode === 'forgot_step2') && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  className="block w-full px-4 py-2.5 rounded-lg text-sm transition-all outline-none"
                  style={inputStyle}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-card)'}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => { setMode('forgot_step1'); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: '#2563eb' }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 mt-4"
              style={{ 
                background: '#2563eb',
                color: '#ffffff',
                opacity: loading ? 0.7 : 1
              }}
              onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
              onMouseOut={(e) => e.target.style.background = '#2563eb'}
            >
              {loading ? 'Processing...' : (
                mode === 'login' ? 'Log In' : 
                mode === 'register' ? 'Register' : 
                mode === 'forgot_step1' ? 'Send Reset Code' : 'Reset Password'
              )}
            </button>
          </form>

          {(mode === 'forgot_step1' || mode === 'forgot_step2') && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
