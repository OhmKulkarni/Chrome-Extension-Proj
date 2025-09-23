import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ActualTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  actualTheme: ActualTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [actualTheme, setActualTheme] = useState<ActualTheme>('light');

  // Detect system preference
  const getSystemTheme = (): ActualTheme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Calculate actual theme based on mode
  const calculateActualTheme = (mode: ThemeMode): ActualTheme => {
    if (mode === 'auto') {
      return getSystemTheme();
    }
    return mode;
  };

  // Set theme mode with persistence
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    // Save to Chrome storage
    try {
      chrome.storage.sync.set({ themePreference: mode });
    } catch (error) {
      // console.warn('Failed to save theme preference:', error);
      // Fallback to localStorage for development
      localStorage.setItem('themePreference', mode);
    }
  };

  // Toggle between light and dark (skipping auto for manual toggle)
  const toggleTheme = () => {
    const newMode: ThemeMode = actualTheme === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  // Apply theme to DOM
  const applyTheme = (theme: ActualTheme) => {
    const root = document.documentElement;

    // Add transition class to prevent flash
    root.classList.add('theme-transitioning');

    // Apply theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Remove transition class after a short delay
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 100);
  };

  // Initialize theme from storage
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Try Chrome storage first
        const result = await chrome.storage.sync.get(['themePreference']);
        const savedTheme = result.themePreference as ThemeMode || 'auto';
        setThemeModeState(savedTheme);
      } catch (error) {
        // Fallback to localStorage for development
        const savedTheme = localStorage.getItem('themePreference') as ThemeMode || 'auto';
        setThemeModeState(savedTheme);
      }
    };

    initializeTheme();
  }, []);

  // Update actual theme when mode changes or system preference changes
  useEffect(() => {
    const newActualTheme = calculateActualTheme(themeMode);
    setActualTheme(newActualTheme);
    applyTheme(newActualTheme);
  }, [themeMode]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = () => {
      if (themeMode === 'auto') {
        const newActualTheme = getSystemTheme();
        setActualTheme(newActualTheme);
        applyTheme(newActualTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode]);

  const value: ThemeContextType = {
    themeMode,
    actualTheme,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
