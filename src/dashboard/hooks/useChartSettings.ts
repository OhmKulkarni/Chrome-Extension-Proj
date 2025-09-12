/**
 * Chart Settings Hook
 * Provides centralized access to chart performance settings
 * with real-time updates from storage
 */

import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../../utils/storage-service';

export interface ChartSettings {
  refreshMode: 'auto' | 'manual';
  refreshInterval: number; // seconds
  enableSharedProcessing: boolean;
  enableStalenessTracking: boolean; // Fixed: consistent naming
}

// Default chart settings - Conservative for safety
const DEFAULT_CHART_SETTINGS: ChartSettings = {
  refreshMode: 'manual',  // Default to manual for better performance
  refreshInterval: 30,    // Slower refresh rate (30 seconds)
  enableSharedProcessing: false,  // Not implemented - disabled
  enableStalenessTracking: false // Not implemented - disabled
};

// Storage service singleton to prevent recreation on every render
const _storageService = new StorageService();

/**
 * Hook to manage chart settings with real-time updates
 */
export const _useChartSettings = () => {
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_CHART_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage
  const _loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try both storage locations
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(['extensionSettings']),
        storageService.get(['settings'])
      ]);

      let _chartSettings = DEFAULT_CHART_SETTINGS;

      // Priority: local storage > sync storage
      if (localResult.settings?.chartSettings) {
        chartSettings = { ...DEFAULT_CHART_SETTINGS, ...localResult.settings.chartSettings };
      } else if (syncResult.extensionSettings?.chartSettings) {
        chartSettings = { ...DEFAULT_CHART_SETTINGS, ...syncResult.extensionSettings.chartSettings };
      }

      // console.log('🔧 Chart settings loaded:', chartSettings);
      setSettings(chartSettings);
    } catch (error) {
      console.error('Failed to load chart settings, using defaults:', error);
      setSettings(DEFAULT_CHART_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update settings
  const _updateSettings = useCallback(async (newSettings: Partial<ChartSettings>) => {
    const _updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      // Save to both storage locations for compatibility
      await Promise.all([
        // Update in local storage for background script
        storageService.get(['settings']).then(result => {
          const _currentSettings = result.settings || {};
          return storageService.set({
            settings: {
              ...currentSettings,
              chartSettings: updatedSettings
            }
          });
        }),
        // Update in sync storage for UI persistence
        chrome.storage.sync.get(['extensionSettings']).then(result => {
          const _currentSettings = result.extensionSettings || {};
          return chrome.storage.sync.set({
            extensionSettings: {
              ...currentSettings,
              chartSettings: updatedSettings
            }
          });
        })
      ]);

      // console.log('🔧 Chart settings updated:', updatedSettings);
    } catch (error) {
      console.error('Failed to save chart settings:', error);
      // Revert on failure
      setSettings(settings);
    }
  }, [settings]);

  // Listen for storage changes
  useEffect(() => {
    const _handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'sync' && changes.extensionSettings) {
        const _newSettings = changes.extensionSettings.newValue;
        if (newSettings?.chartSettings) {
          // console.log('🔧 Chart settings changed from sync storage');
          setSettings({ ...DEFAULT_CHART_SETTINGS, ...newSettings.chartSettings });
        }
      }

      if (namespace === 'local' && changes.settings) {
        const _newSettings = changes.settings.newValue;
        if (newSettings?.chartSettings) {
          // console.log('🔧 Chart settings changed from local storage');
          setSettings({ ...DEFAULT_CHART_SETTINGS, ...newSettings.chartSettings });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    // CRITICAL FIX: Remove loadSettings from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    settings,
    updateSettings,
    isLoading,
    reload: loadSettings
  };
};

/**
 * Helper hook for components that only need to read settings
 */
export const _useChartSettingsRead = () => {
  const { settings, isLoading } = useChartSettings();
  return { settings, isLoading };
};
