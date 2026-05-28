import React, { createContext, useContext, useState, useEffect } from 'react';
import { getHistoricalData } from '../services/api';
import { formatChartData } from '../utils/formatData';
import { socket } from '../services/socket';

const TelemetryContext = createContext();

export const useTelemetry = () => {
  return useContext(TelemetryContext);
};

export const TelemetryProvider = ({ children }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [activeHours, setActiveHours] = useState(24); // Globally tracks fetching scale independently

  const fetchTelemetry = async (hours = activeHours) => {
    setActiveHours(hours);
    try {
      const response = await getHistoricalData(hours);
      const rawData = response.success ? response.data : response;
      if (rawData && rawData.length >= 0) {
        const formatted = formatChartData(rawData, hours);
        setChartData(formatted);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (error) {
      console.error("Failed to load global telemetry", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initiate background fetching immediately upon Mount! (During Splash Screen)
    fetchTelemetry(24);

    socket.on('NEW_TELEMETRY', () => {
      console.log('⚡ Live telemetry received globally');
      // Use standard generic callback approach to retrieve state dynamically so closure is not stale
      setLoading(false); // To ensure socket doesn't invoke spinner logic 
      fetchTelemetry();
    });

    return () => { socket.off('NEW_TELEMETRY'); };
  }, []); // Only mount once! Socket updates independently.

  return (
    <TelemetryContext.Provider value={{ chartData, lastUpdated, loading, fetchTelemetry, activeHours }}>
      {children}
    </TelemetryContext.Provider>
  );
};
