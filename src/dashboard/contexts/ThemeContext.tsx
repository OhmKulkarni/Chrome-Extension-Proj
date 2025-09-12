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
  const _getSystemTheme = (): ActualTheme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Calculate actual theme based on mode
  const _calculateActualTheme = (mode: ThemeMode): ActualTheme => {
    if (mode === 'auto') {
      return getSystemTheme();
    }
    return mode;
  };

  // Set theme mode with persistence
  const _setThemeMode = (mode: ThemeMode) => {
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
  const _toggleTheme = () => {
    const newMode: ThemeMode = actualTheme === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  // Apply theme to DOM
  const _applyTheme = (theme: ActualTheme) => {
    const _root = document.documentElement;

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
    const _initializeTheme = async () => {
      try {
        // Try Chrome storage first
        const _result = await chrome.storage.sync.get(['themePreference']);
        const _savedTheme = result.themePreference as ThemeMode || 'auto';
        setThemeModeState(savedTheme);
      } catch (error) {
        // Fallback to localStorage for development
        const _savedTheme = localStorage.getItem('themePreference') as ThemeMode || 'auto';
        setThemeModeState(savedTheme);
      }
    };

    initializeTheme();
  }, []);

  // Update actual theme when mode changes or system preference changes
  useEffect(() => {
    const _newActualTheme = calculateActualTheme(themeMode);
    setActualTheme(newActualTheme);
    applyTheme(newActualTheme);
  }, [themeMode]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    const _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const _handleSystemThemeChange = () => {
      if (themeMode === 'auto') {
        const _newActualTheme = getSystemTheme();
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

export const _useTheme = (): ThemeContextType => {
  const _context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
