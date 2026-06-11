import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { darkColors, lightColors } from '../theme/appTheme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Siempre inicia en claro al entrar a la app autenticada.
  const [darkMode, setDarkModeState] = useState(false);

  const setDarkMode = useCallback((value) => {
    setDarkModeState(value);
  }, []);

  const colors = darkMode ? darkColors : lightColors;

  const value = useMemo(
    () => ({ darkMode, colors, setDarkMode }),
    [darkMode, colors, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
}
