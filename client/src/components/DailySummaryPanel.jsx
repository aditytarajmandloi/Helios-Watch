import React, { useEffect, useState } from 'react';
import { getAlerts } from '../services/api';
import { socket } from '../services/socket';

const DailySummaryPanel = ({ dark }) => {
  const [summary, setSummary] = useState(null);

  const fetchSummary = async () => {
    try {
      // Pull alerts from last 48 hours to ensure we definitely catch the latest midnight summary
      const response = await getAlerts(48);
      if (response.success && response.data) {
        const latestSummary = response.data.find(a => a.type === 'DAILY_SUMMARY');
        if (latestSummary) setSummary(latestSummary);
      }
    } catch (error) {
      console.error("Failed to fetch daily summary", error);
    }
  };

  useEffect(() => {
    fetchSummary();

    // Listen for new summaries via socket
    socket.on('NEW_ALERT', (alertPayload) => {
      if (alertPayload && alertPayload.type === 'DAILY_SUMMARY') {
        fetchSummary();
      }
    });

    return () => {
      socket.off('NEW_ALERT');
    };
  }, []);

  if (!summary || !summary.aiNarrative) return null;

  return (
    <div className="mt-4 p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden group shadow-lg" 
         style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
       <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(168,85,247,0.08), transparent)' }} />
       
       <h3 className="text-[13px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: dark ? '#c084fc' : '#9333ea', fontFamily: "'Outfit', sans-serif" }}>
         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7', boxShadow: '0 0 10px #a855f7' }}></div>
         Space Weather Briefing
       </h3>
       
       <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
         {summary.aiNarrative}
       </p>
       
       <div className="mt-3 text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-faint)' }}>
         Generated: {new Date(summary.timestamp).toLocaleString()}
       </div>
    </div>
  );
};

export default DailySummaryPanel;
