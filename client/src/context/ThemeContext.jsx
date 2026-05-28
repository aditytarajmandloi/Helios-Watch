import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('helios-theme') !== 'light'; }
    catch { return true; }
  });

  const toggle = () => {
    setDark(prev => {
      const next = !prev;
      try { localStorage.setItem('helios-theme', next ? 'dark' : 'light'); } catch { }
      return next;
    });
  };

  // Sync to body class for global CSS hooks
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
