import React, { useEffect, useState } from 'react';
import { getAlerts } from '../services/api';
import { socket } from '../services/socket';
import { TriangleAlert } from 'lucide-react';

const AlertFeed = ({ limitHours = null, dark }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSystemAlerts = async () => {
    try {
      const response = await getAlerts(limitHours);
      if (response.success) {
        setAlerts(response.data.filter(a => a.type !== 'DAILY_SUMMARY'));
      }
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemAlerts();

    // Listen for instant alert pushes
    socket.on('NEW_ALERT', (alertPayload) => {
      console.log('⚠️ CRITICAL SYSTEM ALERT RECEIVED OVER SOCKET');
      fetchSystemAlerts(); // Sync the UI with the database
    });

    return () => {
      socket.off('NEW_ALERT');
    };
  }, [limitHours]);

  if (loading) return <div className="text-slate-400 p-4 font-mono text-sm animate-pulse">Scanning for anomalies...</div>;

  return (
    <div className="glass-panel p-6 rounded-2xl h-[600px] xl:h-full flex flex-col relative overflow-hidden group/container">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      <h2 className="text-xl font-display font-semibold mb-6 text-slate-100 flex items-center gap-3 relative z-10 tracking-wide">
        <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          <TriangleAlert className="w-5 h-5 text-red-500" />
        </div>
        System Alerts
      </h2>

      <div className="overflow-y-auto flex-1 pr-2 space-y-4 relative z-10">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mb-3 shadow-[0_0_10px_#34d399]"></div>
            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">System Nominal</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert._id}
              className={`p-4 rounded-xl border backdrop-blur-md relative overflow-hidden transition-all duration-300 ${
                alert.type === 'DAILY_SUMMARY'
                  ? 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                  : alert.severity === 'Critical'
                  ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                  : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                }`}
            >
              {/* Glowing side border */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  alert.type === 'DAILY_SUMMARY'
                  ? 'bg-purple-500 shadow-[0_0_15px_#a855f7]'
                  : alert.severity === 'Critical'
                  ? 'bg-red-500 shadow-[0_0_15px_#ef4444] animate-pulse'
                  : 'bg-amber-500 shadow-[0_0_15px_#f59e0b]'
                }`}></div>

              <div className="flex justify-between items-start mb-2 pl-3">
                <span className={`text-sm font-bold tracking-widest uppercase font-display ${
                  alert.type === 'DAILY_SUMMARY'
                    ? (dark ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-purple-600 font-extrabold')
                    : alert.severity === 'Critical' 
                    ? (dark ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-red-600 font-extrabold') 
                    : (dark ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'text-amber-600 font-extrabold')
                }`}>
                  {alert.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm pl-3 leading-relaxed opacity-90" style={{ color: 'var(--text-secondary)' }}>{alert.message}</p>
              
              {alert.aiNarrative && (
                <div className="mt-3 ml-3 pl-3 pr-2 py-2 border-l-2 rounded-r" style={{ borderColor: 'rgba(168,85,247,0.6)', backgroundColor: 'rgba(168,85,247,0.08)' }}>
                  <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: dark ? '#c084fc' : '#9333ea' }}>
                    Analysis
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {alert.aiNarrative}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* NASA/NOAA Standards Legend for Beginners */}
      {limitHours && (
        <div className="mt-4 pt-3 space-y-1.5 px-1 relative z-10" style={{ borderTop: '1px solid var(--border-card)' }}>
          <p className="text-[10px] uppercase tracking-widest font-mono mb-2" style={{ color: 'var(--text-dim)' }}>NASA & NOAA Alert Standards</p>
          <div className="flex justify-between items-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>Solar Flare M/X Class</span>
            <span className="text-amber-500 font-medium">Intensity ≥ 10.0</span>
          </div>
          <div className="flex justify-between items-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>Geomagnetic Storm</span>
            <span className="text-red-500 font-medium">Kp Index ≥ 5</span>
          </div>
          <div className="flex justify-between items-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>Solar Wind Anomaly</span>
            <span className="text-red-500 font-medium">Speed &gt; 700 km/s</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertFeed;
