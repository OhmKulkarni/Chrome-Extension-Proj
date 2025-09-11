import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { themeMode, setThemeMode } = useTheme();

  const getIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'auto':
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
    }
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['light', 'auto', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className={`
        relative inline-flex h-9 items-center gap-2 rounded-lg px-3 py-2
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
        border border-gray-200 dark:border-gray-700
        text-gray-700 dark:text-gray-300
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${className}
      `}
      title={`Theme: ${getLabel(themeMode)} (click to cycle)`}
    >
      <div className="flex items-center gap-1.5">
        {getIcon(themeMode)}
        <span className="text-sm font-medium">{getLabel(themeMode)}</span>
      </div>

      {/* Theme indicator dots */}
      <div className="flex gap-1 ml-1">
        {(['light', 'auto', 'dark'] as ThemeMode[]).map((mode) => (
          <div
            key={mode}
            className={`
              w-1.5 h-1.5 rounded-full transition-all duration-200
              ${themeMode === mode
                ? mode === 'light'
                  ? 'bg-yellow-400'
                  : mode === 'dark'
                    ? 'bg-blue-400'
                    : 'bg-green-400'
                : 'bg-gray-300 dark:bg-gray-600'
              }
            `}
          />
        ))}
      </div>
    </button>
  );
};
