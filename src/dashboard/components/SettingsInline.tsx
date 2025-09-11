import React, { useState, useEffect } from 'react';
import { StorageService } from '../../utils/storage-service';

// Interface definitions matching the full settings page
interface SettingsData {
  networkInterception: {
    bodyCapture: {
      mode: 'disabled' | 'partial' | 'full';
      captureRequests: boolean;
      captureResponses: boolean;
      maxBodySize: number;
    };
    tabSpecific: {
      defaultState: 'active' | 'paused';
    };
  };
  errorLogging: {
    enabled: boolean;
    severity: Array<'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace'>;
    severityFilter: {
      enabled: boolean;
      allowed: Array<'error' | 'warn' | 'info'>;
    };
    tabSpecific: {
      defaultState: 'active' | 'paused';
    };
  };
  tokenLogging: {
    showFullHash: boolean;
    tabSpecific: {
      defaultState: 'active' | 'paused';
    };
  };
  chartSettings: {
    refreshMode: 'auto' | 'manual';
    refreshInterval: number; // seconds
    enableSharedProcessing: boolean;
    enableStalenessTracking: boolean; // Fixed: Changed from enableStalenessIndicators
  };
}

// Default settings matching the full settings page
const defaultSettings: SettingsData = {
  networkInterception: {
    bodyCapture: {
      mode: 'partial',
      captureRequests: false,
      captureResponses: false,
      maxBodySize: 2000,
    },
    tabSpecific: {
      defaultState: 'active' // Changed from 'paused' to 'active' for better UX
    }
  },
  errorLogging: {
    enabled: true,
    severity: ['error', 'warn'],
    severityFilter: {
      enabled: false,
      allowed: ['error', 'warn', 'info']
    },
    tabSpecific: {
      defaultState: 'paused'
    }
  },
  tokenLogging: {
    showFullHash: false,
    tabSpecific: {
      defaultState: 'paused'
    }
  },
  chartSettings: {
    refreshMode: 'manual',  // Conservative default - manual mode
    refreshInterval: 30,    // Slower refresh rate
    enableSharedProcessing: false,  // Not implemented - disabled
    enableStalenessTracking: false // Not implemented - disabled
  },
};

const SettingsInline: React.FC = () => {
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

  // Load storage usage - connect to Chrome extension API
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

      // Get table counts for storage estimation
      const response = await chrome.runtime.sendMessage({
        action: 'getTableCounts'
      });

      if (response && response.success && response.data) {
        const tableCounts = response.data;
        let estimatedBytes = 0;

        // Calculate estimated size based on table counts
        // Using the same estimation logic as the dashboard
        if (tableCounts.apiCalls) {
          estimatedBytes += tableCounts.apiCalls * 9500; // ~9.5KB average
        }
        if (tableCounts.consoleErrors) {
          estimatedBytes += tableCounts.consoleErrors * 3200; // ~3.2KB average
        }
        if (tableCounts.tokenEvents) {
          estimatedBytes += tableCounts.tokenEvents * 1800; // ~1.8KB average
        }
        if (tableCounts.minifiedLibraries) {
          estimatedBytes += tableCounts.minifiedLibraries * 15000; // ~15KB average
        }

        const STORAGE_LIMIT = 100 * 1024 * 1024; // 100MB limit
        const percentage = (estimatedBytes / STORAGE_LIMIT) * 100;

        setStorageUsage({
          bytes: estimatedBytes,
          percentage: Math.min(percentage, 100),
          isLoading: false
        });
      } else {
        throw new Error('Failed to get table counts from background script');
      }
    } catch (error) {
      console.error('Failed to load storage usage:', error);
      // Fallback to estimated data
      const estimatedBytes = 1024 * 1024 * 5; // 5MB fallback
      const STORAGE_LIMIT = 100 * 1024 * 1024;
      const percentage = (estimatedBytes / STORAGE_LIMIT) * 100;

      setStorageUsage({
        bytes: estimatedBytes,
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
          errorLogging: backendSettings.errorLogging || defaultSettings.errorLogging,
          tokenLogging: backendSettings.tokenLogging || defaultSettings.tokenLogging,
          chartSettings: backendSettings.chartSettings || defaultSettings.chartSettings,
        };
      } else if (syncResult.extensionSettings) {
        // Use deep merge to handle partial settings from sync storage
        // Extract only the properties we care about
        const syncSettings = syncResult.extensionSettings;
        loadedSettings = {
          networkInterception: syncSettings.networkInterception || defaultSettings.networkInterception,
          errorLogging: syncSettings.errorLogging || defaultSettings.errorLogging,
          tokenLogging: syncSettings.tokenLogging || defaultSettings.tokenLogging,
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
        errorLogging: settings.errorLogging,
        tokenLogging: settings.tokenLogging,
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

  // Custom UI components matching the original settings page
  const Switch: React.FC<{
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: string;
    description: string;
  }> = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between">
      <div>
        <label className="font-medium text-gray-900">{label}</label>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div className={`w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ml-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}></div>
        </div>
      </label>
    </div>
  );

  const Select: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
    className?: string;
  }> = ({ value, onChange, children, className = "" }) => (
    <select
      value={value}
      onChange={onChange}
      className={`px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      {children}
    </select>
  );

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
      className={`px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
  );

  const Button: React.FC<{
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm';
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }> = ({ variant = 'default', size = 'default', onClick, disabled, children }) => {
    const baseClasses = `font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`;
    const variantClasses = variant === 'outline'
      ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      : 'bg-blue-600 text-white hover:bg-blue-700';
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
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-2">
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
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {saveMessage}
        </div>
      )}

      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {/* Network Interception Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-xl font-semibold text-gray-900">Network Interception & Filtering</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure network request monitoring and filtering
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-900">Body Capture Mode</label>
                <Select
                  value={settings.networkInterception?.bodyCapture?.mode || 'disabled'}
                  onChange={(e) => {
                    const newMode = e.target.value as 'disabled' | 'partial' | 'full';
                    const updatedBodyCapture = { ...settings.networkInterception?.bodyCapture };

                    // Reset dependent settings based on mode
                    if (newMode === 'disabled') {
                      updatedBodyCapture.mode = 'disabled';
                      updatedBodyCapture.captureRequests = false;
                      updatedBodyCapture.captureResponses = false;
                    } else if (newMode === 'full') {
                      updatedBodyCapture.mode = 'full';
                      updatedBodyCapture.captureRequests = true;
                      updatedBodyCapture.captureResponses = true;
                      updatedBodyCapture.maxBodySize = 0;
                    } else {
                      updatedBodyCapture.mode = 'partial';
                    }

                    updateSetting('networkInterception', {
                      ...settings.networkInterception,
                      bodyCapture: updatedBodyCapture
                    });
                  }}
                  className="max-w-xs"
                >
                  <option value="disabled">Disabled</option>
                  <option value="partial">Partial</option>
                  <option value="full">Full</option>
                </Select>
              </div>

              {/* Only show additional options when mode is 'partial' */}
              {settings.networkInterception?.bodyCapture?.mode === 'partial' && (
                <>
                  <div className="space-y-4">
                    <Switch
                      checked={settings.networkInterception?.bodyCapture?.captureRequests || false}
                      onChange={(e) => updateSetting('networkInterception', {
                        ...settings.networkInterception,
                        bodyCapture: {
                          ...settings.networkInterception?.bodyCapture,
                          captureRequests: e.target.checked
                        }
                      })}
                      label="Capture request bodies"
                      description="Include request body content in logs"
                    />

                    <Switch
                      checked={settings.networkInterception?.bodyCapture?.captureResponses || false}
                      onChange={(e) => updateSetting('networkInterception', {
                        ...settings.networkInterception,
                        bodyCapture: {
                          ...settings.networkInterception?.bodyCapture,
                          captureResponses: e.target.checked
                        }
                      })}
                      label="Capture response bodies"
                      description="Include response body content in logs"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="maxBodySize" className="text-sm font-medium text-gray-900">
                      Max body size (characters, 0 = no limit)
                    </label>
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
                </>
              )}

              {/* Show explanation for full mode */}
              {settings.networkInterception?.bodyCapture?.mode === 'full' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Full mode:</strong> Captures all request and response bodies without size limits (up to 50KB safety limit).
                  </p>
                </div>
              )}

              {/* Show explanation for disabled mode */}
              {settings.networkInterception?.bodyCapture?.mode === 'disabled' && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Disabled mode:</strong> Network requests are logged without body content for better performance and privacy.
                  </p>
                </div>
              )}

              {/* Request filtering and URL patterns removed - not implemented in backend */}

              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium mb-3">🗂️ Tab-Specific Control Settings</p>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">Default state for new tabs</label>
                    <Select
                      value={settings.networkInterception?.tabSpecific?.defaultState || 'paused'}
                      onChange={(e) => updateSetting('networkInterception', {
                        ...settings.networkInterception,
                        tabSpecific: {
                          ...settings.networkInterception?.tabSpecific,
                          defaultState: e.target.value as any
                        }
                      })}
                      className="max-w-xs"
                    >
                      <option value="active">Active (monitoring enabled)</option>
                      <option value="paused">Paused (monitoring disabled)</option>
                    </Select>
                    <p className="text-xs text-gray-600 mt-1">
                      This determines whether new tabs start with network monitoring enabled or disabled
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Token Logging Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-xl font-semibold text-gray-900">Token Display Settings</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure how authentication token hashes are displayed (token logging is controlled via the dashboard)
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <Switch
                checked={settings.tokenLogging?.showFullHash || false}
                onChange={(e) => updateSetting('tokenLogging', {
                  ...settings.tokenLogging,
                  showFullHash: e.target.checked
                })}
                label="Show full token hash values"
                description="Display complete token hashes instead of partially redacted versions"
              />

              {!settings.tokenLogging?.showFullHash && (
                <div className="ml-4 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium mb-2">🔒 Token hashes are partially redacted</p>
                  <p className="text-xs text-gray-600">
                    Token hash values will be displayed as: <code className="bg-gray-100 px-1 rounded">abc***...***xyz</code> (showing first/last 3 characters)
                  </p>
                </div>
              )}

              {settings.tokenLogging?.showFullHash && (
                <div className="ml-4 mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium mb-2">⚠️ Full token hashes visible</p>
                  <p className="text-xs text-yellow-800">
                    Complete token hash values will be displayed. Use caution when sharing screenshots or logs.
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium mb-3">🗂️ Tab-Specific Token Logging</p>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">Default state for new tabs</label>
                    <Select
                      value={settings.tokenLogging?.tabSpecific?.defaultState || 'paused'}
                      onChange={(e) => updateSetting('tokenLogging', {
                        ...settings.tokenLogging,
                        tabSpecific: {
                          ...settings.tokenLogging?.tabSpecific,
                          defaultState: e.target.value as any
                        }
                      })}
                      className="max-w-xs"
                    >
                      <option value="active">Active (token logging enabled)</option>
                      <option value="paused">Paused (token logging disabled)</option>
                    </Select>
                    <p className="text-xs text-gray-600 mt-1">
                      This determines whether new tabs start with token logging enabled or disabled
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Logging Settings Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-xl font-semibold text-gray-900">Console Error Logging</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure browser console error monitoring
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Main Error Logging Toggle */}
              <Switch
                checked={settings.errorLogging?.enabled || false}
                onChange={(e) => updateSetting('errorLogging', {
                  ...settings.errorLogging,
                  enabled: e.target.checked
                })}
                label="Enable console error logging"
                description="Capture and monitor browser console errors, warnings, and other messages"
              />

              {/* Severity Selection */}
              {settings.errorLogging?.enabled && (
                <div className="ml-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-3">🎯 Console Methods to Capture</p>
                    <div className="space-y-2">
                      {(['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) => (
                        <div key={method} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`console-${method}`}
                            checked={settings.errorLogging?.severity?.includes(method) || false}
                            onChange={(e) => {
                              const currentSeverity = settings.errorLogging?.severity || [];
                              const newSeverity = e.target.checked
                                ? [...currentSeverity, method]
                                : currentSeverity.filter(s => s !== method);
                              updateSetting('errorLogging', {
                                ...settings.errorLogging,
                                severity: newSeverity
                              });
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`console-${method}`} className="text-sm">
                            console.{method}()
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Switch
                  checked={settings.errorLogging?.severityFilter?.enabled || false}
                  onChange={(e) => updateSetting('errorLogging', {
                    ...settings.errorLogging,
                    severityFilter: {
                      ...settings.errorLogging?.severityFilter,
                      enabled: e.target.checked
                    }
                  })}
                  label="Filter by severity (legacy)"
                  description="Only capture specific error levels (deprecated - use console methods above)"
                />

                {settings.errorLogging?.severityFilter?.enabled && (
                  <div className="ml-4 space-y-2">
                    <p className="text-sm font-medium">Capture these severity levels:</p>
                    <div className="space-y-2">
                      {(['error', 'warn', 'info'] as const).map((severity) => (
                        <label key={severity} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={settings.errorLogging?.severityFilter?.allowed?.includes(severity) || false}
                            onChange={(e) => {
                              const currentAllowed = settings.errorLogging?.severityFilter?.allowed || [];
                              const newAllowed = e.target.checked
                                ? [...currentAllowed, severity]
                                : currentAllowed.filter(s => s !== severity);

                              updateSetting('errorLogging', {
                                ...settings.errorLogging,
                                severityFilter: {
                                  ...settings.errorLogging?.severityFilter,
                                  allowed: newAllowed as any
                                }
                              });
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm capitalize">
                            {severity}
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              severity === 'error' ? 'bg-red-100 text-red-800' :
                              severity === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {severity === 'error' ? 'console.error()' :
                               severity === 'warn' ? 'console.warn()' :
                               'console.info/log()'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      Unselected severity levels will be ignored completely
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium mb-3">🗂️ Tab-Specific Error Logging</p>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-900">Default state for new tabs</label>
                      <Select
                        value={settings.errorLogging?.tabSpecific?.defaultState || 'paused'}
                        onChange={(e) => updateSetting('errorLogging', {
                          ...settings.errorLogging,
                          tabSpecific: {
                            ...settings.errorLogging?.tabSpecific,
                            defaultState: e.target.value as any
                          }
                        })}
                        className="max-w-xs"
                      >
                        <option value="active">Active (error logging enabled)</option>
                        <option value="paused">Paused (error logging disabled)</option>
                      </Select>
                      <p className="text-xs text-gray-600 mt-1">
                        This determines whether new tabs start with error logging enabled or disabled
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Usage Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-xl font-semibold text-gray-900">Storage Usage</h3>
            <p className="text-sm text-gray-600 mt-1">
              IndexedDB storage usage and data management
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {storageUsage.isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Calculating storage usage...</span>
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
                  <div className="w-full bg-gray-200 rounded-full h-3">
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
                      <span className="text-gray-600">Usage:</span>
                      <span className="ml-2 font-medium">{storageUsage.percentage.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Available:</span>
                      <span className="ml-2 font-medium">
                        {formatBytes(100 * 1024 * 1024 - storageUsage.bytes)}
                      </span>
                    </div>
                  </div>

                  {storageUsage.percentage > 80 && (
                    <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-xl font-semibold text-gray-900">Chart Performance Settings</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure dashboard chart refresh behavior
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {/* Chart Refresh Mode */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">Chart Refresh Mode</label>
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
                    <label htmlFor="refresh-auto" className="text-sm">
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
                    <label htmlFor="refresh-manual" className="text-sm">
                      🖱️ Manual (refresh button only)
                    </label>
                  </div>
                </div>
              </div>

              {/* Refresh Interval - only show when auto mode is selected */}
              {settings.chartSettings?.refreshMode === 'auto' && (
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-2 block">Refresh Interval</label>
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
                      className="flex-1"
                    />
                    <span className="text-sm font-medium min-w-[4rem]">
                      {Math.max(settings.chartSettings?.refreshInterval || 30, 15)}s
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Higher intervals reduce CPU usage but may show stale data longer
                  </p>
                </div>
              )}

              {/* Performance optimizations removed - not implemented in backend */}
              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                <p className="text-sm font-medium mb-2">💡 Performance Impact</p>
                <div className="text-xs space-y-1">
                  <p><strong>Manual mode:</strong> ~90% less CPU usage, charts update only when refreshed</p>
                  <p><strong>Longer intervals:</strong> Proportionally less CPU usage vs refresh frequency</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-xl font-semibold text-gray-900">About</h3>
            <p className="text-sm text-gray-600 mt-1">
              Extension information and support
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Version:</strong> 1.0.0</div>
              <div><strong>Build:</strong> 2024.1.0</div>
              <div><strong>Manifest:</strong> V3</div>
              <div><strong>Support:</strong> <a href="#" className="text-blue-600 hover:underline">Help Center</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsInline;
