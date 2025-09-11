import React, { useState, useEffect } from 'react';
import { StorageService } from '../../utils/storage-service';

// Hook to detect dark mode
const useDarkMode = () => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

// Essential settings interface - only core functionality
interface SettingsData {
  networkInterception: {
    bodyCapture: {
      maxBodySize: number;
    };
  };
  chartSettings: {
    refreshMode: 'auto' | 'manual';
    refreshInterval: number; // seconds
  };
}

// Essential settings defaults - only core functionality
const defaultSettings: SettingsData = {
  networkInterception: {
    bodyCapture: {
      maxBodySize: 2000,
    }
  },
  chartSettings: {
    refreshMode: 'manual',  // Conservative default - manual mode
    refreshInterval: 30,    // Slower refresh rate
  },
};

const SettingsInline: React.FC = () => {
  const isDark = useDarkMode();
  
  // Storage service for IndexedDB access
  const storageService = React.useMemo(() => new StorageService(), []);

  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [storageUsage, setStorageUsage] = useState<{
    bytes: number;
    percentage: number;
    isLoading: boolean;
  }>({ bytes: 0, percentage: 0, isLoading: true });

  // Track timeouts for cleanup
  const timeoutsRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    loadSettings();
    loadStorageUsage();

    // Cleanup timeouts on unmount
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Deep merge function to properly merge nested settings
  const deepMerge = (target: any, source: any): any => {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  };

  // Load storage usage - get actual IndexedDB size
  const loadStorageUsage = async () => {
    try {
      // Check if Chrome extension APIs are available
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.warn('Chrome extension APIs not available, using mock storage data');
        const estimatedBytes = 1024 * 1024 * 5; // 5MB mock
        const STORAGE_LIMIT = 100 * 1024 * 1024; // 100MB limit
        const percentage = (estimatedBytes / STORAGE_LIMIT) * 100;

        setStorageUsage({
          bytes: estimatedBytes,
          percentage: Math.min(percentage, 100),
          isLoading: false
        });
        return;
      }

      // Try to get actual storage usage first
      let actualBytes = 0;
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage) {
            actualBytes = estimate.usage;
            console.log('📊 Using actual storage estimate:', actualBytes, 'bytes');
          }
        }
      } catch (storageError) {
        console.warn('Could not get storage estimate:', storageError);
      }

      // If we couldn't get actual usage, fall back to estimation via backend
      if (actualBytes === 0) {
        console.log('📊 Falling back to backend storage estimation');

        // Try the STORAGE_INFO action first (more accurate than table counts)
        try {
          const storageResponse = await chrome.runtime.sendMessage({
            action: 'STORAGE_INFO'
          });

          if (storageResponse && storageResponse.success && storageResponse.data?.size) {
            actualBytes = storageResponse.data.size;
            console.log('📊 Using backend storage info:', actualBytes, 'bytes');
          }
        } catch (storageInfoError) {
          console.warn('STORAGE_INFO failed, trying table counts:', storageInfoError);
        }

        // Final fallback to table count estimation
        if (actualBytes === 0) {
          const response = await chrome.runtime.sendMessage({
            action: 'getTableCounts'
          });

          if (response && response.success && response.data) {
            const tableCounts = response.data;

            // More conservative estimation based on actual record analysis
            if (tableCounts.apiCalls) {
              actualBytes += tableCounts.apiCalls * 8000; // ~8KB average (more conservative)
            }
            if (tableCounts.consoleErrors) {
              actualBytes += tableCounts.consoleErrors * 2500; // ~2.5KB average
            }
            if (tableCounts.tokenEvents) {
              actualBytes += tableCounts.tokenEvents * 1500; // ~1.5KB average
            }
            if (tableCounts.minifiedLibraries) {
              actualBytes += tableCounts.minifiedLibraries * 12000; // ~12KB average
            }

            console.log('📊 Using table count estimation:', actualBytes, 'bytes');
          } else {
            throw new Error('All storage estimation methods failed');
          }
        }
      }

      const STORAGE_LIMIT = 100 * 1024 * 1024; // 100MB limit
      const percentage = (actualBytes / STORAGE_LIMIT) * 100;

      setStorageUsage({
        bytes: actualBytes,
        percentage: Math.min(percentage, 100),
        isLoading: false
      });

    } catch (error) {
      console.error('Failed to load storage usage:', error);
      // Fallback to conservative estimate
      const fallbackBytes = 1024 * 1024 * 3; // 3MB conservative fallback
      const STORAGE_LIMIT = 100 * 1024 * 1024;
      const percentage = (fallbackBytes / STORAGE_LIMIT) * 100;

      setStorageUsage({
        bytes: fallbackBytes,
        percentage: Math.min(percentage, 100),
        isLoading: false
      });
    }
  };

  const loadSettings = async () => {
    try {
      // Check if Chrome extension APIs are available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome extension APIs not available, using default settings');
        setSettings(defaultSettings);
        setIsLoading(false);
        return;
      }

      // Check both storage locations for backward compatibility
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(['extensionSettings']),
        storageService.get(['settings'])
      ]);

      let loadedSettings = defaultSettings;

      // Priority: local storage (used by background script) > sync storage
      if (localResult.settings) {
        // Map from background script format to UI format
        const backendSettings = localResult.settings;
        loadedSettings = {
          networkInterception: backendSettings.networkInterception || defaultSettings.networkInterception,
          chartSettings: backendSettings.chartSettings || defaultSettings.chartSettings,
        };
      } else if (syncResult.extensionSettings) {
        // Use deep merge to handle partial settings from sync storage
        // Extract only the properties we care about
        const syncSettings = syncResult.extensionSettings;
        loadedSettings = {
          networkInterception: syncSettings.networkInterception || defaultSettings.networkInterception,
          chartSettings: syncSettings.chartSettings || defaultSettings.chartSettings,
        };
      }

      // Privacy settings migration removed - features not implemented

      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSaveMessage('Error loading settings. Using defaults.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Check if Chrome extension APIs are available
      if (typeof chrome === 'undefined' || !chrome.storage) {
        setSaveMessage('Chrome extension APIs not available - settings not saved');
        return;
      }

      // Save to both storage locations for compatibility
      // Background script expects chrome.storage.local with key 'settings'
      const backendSettings = {
        networkInterception: settings.networkInterception,
        chartSettings: settings.chartSettings,
      };

      await Promise.all([
        // Save to local storage for background script compatibility
        storageService.set({ settings: backendSettings }),
        // Keep sync storage for UI persistence
        chrome.storage.sync.set({ extensionSettings: settings })
      ]);

      setSaveMessage('Settings saved successfully!');

      // Track timeout for cleanup
      const timeoutId = window.setTimeout(() => {
        setSaveMessage('');
        timeoutsRef.current.delete(timeoutId);
      }, 3000);
      timeoutsRef.current.add(timeoutId);

    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setSaveMessage('Settings reset to default values. Click Save to apply.');
  };

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Custom UI components

  const Input: React.FC<{
    type?: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
    min?: string;
    id?: string;
  }> = ({ type = "text", value, onChange, placeholder, className = "", min, id }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      id={id}
      className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  );

  const Button: React.FC<{
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm';
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }> = ({ variant = 'default', size = 'default', onClick, disabled, children }) => {
    const baseClasses = `font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800`;
    const variantClasses = variant === 'outline'
      ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
      : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600';
    const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses}`}
      >
        {children}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Settings</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your extension preferences and behavior
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={resetSettings}
            >
              Reset to Default
            </Button>
            <Button
              onClick={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mx-6 mt-6 p-4 rounded-lg border ${
          saveMessage.includes('Error')
            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
            : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
        }`}>
          {saveMessage}
        </div>
      )}

      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {/* Network Body Size Limit */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Network Body Size Limit</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure memory safeguards for network request body capture
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <label htmlFor="maxBodySize" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Max body size (characters, 0 = no limit)
                  </label>
                  <div
                    className="relative group cursor-help"
                    title="This setting prevents memory issues by limiting how much request/response body content is stored. Large payloads are truncated to this size. Set to 0 to disable truncation (not recommended for production use)."
                  >
                    <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 text-xs flex items-center justify-center text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                      ?
                    </div>
                  </div>
                </div>
                <Input
                  type="number"
                  id="maxBodySize"
                  min="0"
                  value={settings.networkInterception?.bodyCapture?.maxBodySize || 2000}
                  onChange={(e) => updateSetting('networkInterception', {
                    ...settings.networkInterception,
                    bodyCapture: {
                      ...settings.networkInterception?.bodyCapture,
                      maxBodySize: parseInt(e.target.value) || 0
                    }
                  })}
                  className="max-w-xs"
                />
              </div>

              {/* Informational tooltip about the safeguard */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-300 text-xs font-medium">ℹ</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">Memory Protection Safeguard</p>
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <p><strong>Purpose:</strong> Prevents browser crashes from large network payloads (images, files, API responses)</p>
                      <p><strong>Default (2000 chars):</strong> Captures ~2KB of body content - enough for most API responses</p>
                      <p><strong>Set to 0:</strong> No truncation but may cause memory issues with large files</p>
                      <p><strong>Recommended:</strong> 1000-5000 characters for most use cases</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Storage Usage Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Storage Usage</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              IndexedDB storage usage and data management
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {storageUsage.isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Calculating storage usage...</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">IndexedDB Usage</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {formatBytes(storageUsage.bytes)} / 100 MB
                      </span>
                      <div
                        className="relative group cursor-help"
                        title="Once the 100MB limit is exceeded, automatic data pruning will begin to maintain performance"
                      >
                        <div className="w-4 h-4 rounded-full bg-gray-300 text-xs flex items-center justify-center text-gray-600">
                          ?
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        storageUsage.percentage < 50 ? 'bg-green-500' :
                        storageUsage.percentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Usage:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{storageUsage.percentage.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Available:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                        {formatBytes(100 * 1024 * 1024 - storageUsage.bytes)}
                      </span>
                    </div>
                  </div>

                  {storageUsage.percentage > 80 && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <p className="text-sm font-medium">⚠️ High storage usage detected</p>
                      <p className="text-xs mt-1">
                        Storage is {storageUsage.percentage.toFixed(1)}% full. Automatic pruning will begin when the limit is exceeded.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chart Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Chart Performance Settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure dashboard chart refresh behavior
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Chart Refresh Mode */}
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">Chart Refresh Mode</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="refresh-auto"
                      name="refreshMode"
                      value="auto"
                      checked={settings.chartSettings?.refreshMode === 'auto'}
                      onChange={() => updateSetting('chartSettings', {
                        ...settings.chartSettings,
                        refreshMode: 'auto'
                      })}
                      className="text-blue-600"
                    />
                    <label htmlFor="refresh-auto" className="text-sm text-gray-900 dark:text-gray-100">
                      🔄 Automatic (periodic refresh)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="refresh-manual"
                      name="refreshMode"
                      value="manual"
                      checked={settings.chartSettings?.refreshMode === 'manual'}
                      onChange={() => updateSetting('chartSettings', {
                        ...settings.chartSettings,
                        refreshMode: 'manual'
                      })}
                      className="text-blue-600"
                    />
                    <label htmlFor="refresh-manual" className="text-sm text-gray-900 dark:text-gray-100">
                      🖱️ Manual (refresh button only)
                    </label>
                  </div>
                </div>
              </div>

              {/* Refresh Interval - only show when auto mode is selected */}
              {settings.chartSettings?.refreshMode === 'auto' && (
                <div>
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">Refresh Interval</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="15"
                      max="60"
                      step="5"
                      value={Math.max(settings.chartSettings?.refreshInterval || 30, 15)}
                      onChange={(e) => updateSetting('chartSettings', {
                        ...settings.chartSettings,
                        refreshInterval: parseInt(e.target.value)
                      })}
                      className={`flex-1 ${isDark ? 'accent-blue-400' : 'accent-blue-600'}`}
                    />
                    <span className="text-sm font-medium min-w-[4rem] text-gray-900 dark:text-gray-100">
                      {Math.max(settings.chartSettings?.refreshInterval || 30, 15)}s
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Higher intervals reduce CPU usage but may show stale data longer
                  </p>
                </div>
              )}

              {/* Performance optimizations removed - not implemented in backend */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm font-medium mb-2">💡 Performance Impact</p>
                <div className="text-xs space-y-1">
                  <p><strong>Manual mode:</strong> ~90% less CPU usage, charts update only when refreshed</p>
                  <p><strong>Longer intervals:</strong> Proportionally less CPU usage vs refresh frequency</p>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default SettingsInline;
