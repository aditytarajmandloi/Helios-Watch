import React, { createContext, useContext } from 'react';

const FrameContext = createContext();
export const useFrames = () => useContext(FrameContext);

/**
 * FrameProvider — simplified pass-through.
 * Frame preloading is now handled directly by the Home page canvas system.
 * This context exists only so App.jsx's splash gate doesn't block navigation.
 */
export const FrameProvider = ({ children }) => {
  return (
    <FrameContext.Provider value={{ loading: false, progress: 1 }}>
      {children}
    </FrameContext.Provider>
  );
};
