// src/settings/settings.tsx
// This file serves as the settings UI for the Chrome extension.
// 
// STORAGE ARCHITECTURE:
// - UI settings are saved to both chrome.storage.sync (key: 'extensionSettings') 
//   and chrome.storage.local (key: 'settings')
// - Background script reads from chrome.storage.local (key: 'settings')
// - This dual storage ensures UI persistence and background script compatibility
//
// NOISE FILTERING LOGIC:
// - The filterNoise toggle controls networkInterception.privacy.filterNoise
// - Background script uses this setting in isNoiseRequest() function
// - Filters telemetry, analytics, tracking domains and paths automatically
// - Full filtering logic is in src/background/background.ts (isNoiseRequest function)
import './settings.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Select } from './components/ui/select';
import { Switch } from './components/ui/switch';

interface SettingsData {
  networkInterception: {
    bodyCapture: {
      mode: 'disabled' | 'partial' | 'full';
      captureRequests: boolean;
      captureResponses: boolean;
      maxBodySize: number;
    };
    privacy: {
      filterNoise: boolean;
    };
    urlPatterns: {
      enabled: boolean;
      patterns: Array<{
        id: string;
        pattern: string;
        active: boolean;
        description?: string;
      }>;
    };
    tabSpecific: {
      defaultState: 'active' | 'paused';
    };
  };
  errorLogging: {
    enabled: boolean; // Fix: Add missing enabled field
    severity: Array<'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace'>; // Fix: Add severity field
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
}

const defaultSettings: SettingsData = {
  networkInterception: {
    bodyCapture: {
      mode: 'partial',
      captureRequests: false,
      captureResponses: false,
      maxBodySize: 2000,
    },
    privacy: {
      filterNoise: true,
    },
    urlPatterns: {
      enabled: false,
      patterns: [
        {
          id: 'example-1',
          pattern: 'https://example.com/*',
          active: true,
          description: 'Example pattern for example.com'
        }
      ]
    },
    tabSpecific: {
      defaultState: 'paused'
    }
  },
  errorLogging: {
    enabled: true, // Fix: Add missing enabled field to match backend
    severity: ['error', 'warn'], // Fix: Add severity field that main-world script expects
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
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [storageUsage, setStorageUsage] = useState<{
    bytes: number;
    percentage: number;
    isLoading: boolean;
  }>({ bytes: 0, percentage: 0, isLoading: true });
  
  // MEMORY LEAK FIX: Track timeouts for cleanup
  const timeoutsRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    loadSettings();
    loadStorageUsage();
    
    // MEMORY LEAK FIX: Cleanup timeouts on unmount
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  // Load IndexedDB storage usage
  const loadStorageUsage = async () => {
    try {
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
      }
    } catch (error) {
      console.error('Failed to load storage usage:', error);
      setStorageUsage({ bytes: 0, percentage: 0, isLoading: false });
    }
  };

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

  const loadSettings = async () => {
    try {
      // MEMORY LEAK FIX: Use minimal chrome.storage call
      // Check both storage locations for backward compatibility
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(['extensionSettings']),
        chrome.storage.local.get(['settings'])
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
        };
      } else if (syncResult.extensionSettings) {
        // Use deep merge to handle partial settings from sync storage
        // Extract only the properties we care about
        const syncSettings = syncResult.extensionSettings;
        loadedSettings = {
          networkInterception: syncSettings.networkInterception || defaultSettings.networkInterception,
          errorLogging: syncSettings.errorLogging || defaultSettings.errorLogging,
          tokenLogging: syncSettings.tokenLogging || defaultSettings.tokenLogging,
        };
      }
      
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
      // Save to both storage locations for compatibility
      // Background script expects chrome.storage.local with key 'settings'
      const backendSettings = {
        networkInterception: settings.networkInterception,
        errorLogging: settings.errorLogging,
        tokenLogging: settings.tokenLogging,
      };
      
      await Promise.all([
        // Save to local storage for background script compatibility
        chrome.storage.local.set({ settings: backendSettings }),
        // Keep sync storage for UI persistence
        chrome.storage.sync.set({ extensionSettings: settings })
      ]);
      
      setSaveMessage('Settings saved successfully!');
      
      // MEMORY LEAK FIX: Track timeout for cleanup
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-2">
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
          <div className={`mb-6 p-4 rounded-lg border ${
            saveMessage.includes('Error') 
              ? 'bg-destructive/10 text-destructive border-destructive/20' 
              : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="grid gap-6">
          {/* Network Interception Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Network Interception & Filtering</CardTitle>
              <CardDescription>
                Configure network request monitoring and filtering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-4">
                    <div className="grid gap-2">
                      <label className="setting-label">Body Capture Mode</label>
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
                            updatedBodyCapture.maxBodySize = 0; // No limit in full mode
                          } else {
                            updatedBodyCapture.mode = 'partial';
                            // Keep existing settings for partial mode
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
                        <div className="grid gap-4">
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
                          <label htmlFor="maxBodySize" className="setting-label">
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

                    <div className="grid gap-4">
                      <Switch
                        checked={settings.networkInterception?.privacy?.filterNoise || false}
                        onChange={(e) => updateSetting('networkInterception', {
                          ...settings.networkInterception,
                          privacy: {
                            ...settings.networkInterception?.privacy,
                            filterNoise: e.target.checked
                          }
                        })}
                        label="Filter noise requests"
                        description="Hide telemetry, analytics, and tracking requests (e.g., Google Analytics, AWS WAF, Facebook Pixel, error tracking services)"
                      />

                      {settings.networkInterception?.privacy?.filterNoise && (
                        <div className="ml-4 mt-3 p-3 bg-muted/50 rounded-lg border border-muted">
                          <p className="text-sm font-medium mb-2">🔇 Noise filtering is active</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            The following types of requests will be automatically filtered out:
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• <strong>Analytics:</strong> Google Analytics, Mixpanel, Amplitude, Segment</li>
                            <li>• <strong>Advertising:</strong> Google Ads (DoubleClick), Facebook Pixel, tracking pixels</li>
                            <li>• <strong>Error tracking:</strong> Sentry, Bugsnag, Rollbar</li>
                            <li>• <strong>Performance monitoring:</strong> New Relic, DataDog</li>
                            <li>• <strong>CDN health checks:</strong> /health, /ping, /telemetry endpoints</li>
                            <li>• <strong>Browser telemetry:</strong> Mozilla telemetry, AWS WAF</li>
                            <li>• <strong>URL tracking parameters:</strong> utm_source, fbclid, gclid</li>
                          </ul>
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Legitimate API calls and application requests will always be captured.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <Switch
                        checked={settings.networkInterception?.urlPatterns?.enabled || false}
                        onChange={(e) => updateSetting('networkInterception', {
                          ...settings.networkInterception,
                          urlPatterns: {
                            ...settings.networkInterception?.urlPatterns,
                            enabled: e.target.checked
                          }
                        })}
                        label="Enable URL pattern filtering"
                        description="Only capture requests matching specific URL patterns (e.g., https://api.example.com/*)"
                      />

                      {settings.networkInterception?.urlPatterns?.enabled && (
                        <div className="ml-4 mt-3 p-3 bg-muted/50 rounded-lg border border-muted">
                          <p className="text-sm font-medium mb-3">🎯 URL Pattern Configuration</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Define URL patterns to capture. Use * for wildcards (e.g., https://api.example.com/*)
                          </p>
                          
                          {settings.networkInterception?.urlPatterns?.patterns?.map((pattern, index) => (
                            <div key={pattern.id} className="flex items-center space-x-3 mb-2 p-2 bg-background rounded border">
                              <input
                                type="checkbox"
                                checked={pattern.active}
                                onChange={(e) => {
                                  const updatedPatterns = [...(settings.networkInterception?.urlPatterns?.patterns || [])];
                                  updatedPatterns[index] = { ...pattern, active: e.target.checked };
                                  updateSetting('networkInterception', {
                                    ...settings.networkInterception,
                                    urlPatterns: {
                                      ...settings.networkInterception?.urlPatterns,
                                      patterns: updatedPatterns
                                    }
                                  });
                                }}
                                className="h-4 w-4 text-primary border-input rounded focus:ring-ring"
                              />
                              <Input
                                value={pattern.pattern}
                                onChange={(e) => {
                                  const updatedPatterns = [...(settings.networkInterception?.urlPatterns?.patterns || [])];
                                  updatedPatterns[index] = { ...pattern, pattern: e.target.value };
                                  updateSetting('networkInterception', {
                                    ...settings.networkInterception,
                                    urlPatterns: {
                                      ...settings.networkInterception?.urlPatterns,
                                      patterns: updatedPatterns
                                    }
                                  });
                                }}
                                placeholder="https://api.example.com/*"
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updatedPatterns = settings.networkInterception?.urlPatterns?.patterns?.filter((_, i) => i !== index) || [];
                                  updateSetting('networkInterception', {
                                    ...settings.networkInterception,
                                    urlPatterns: {
                                      ...settings.networkInterception?.urlPatterns,
                                      patterns: updatedPatterns
                                    }
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPattern = {
                                id: `pattern-${Date.now()}`,
                                pattern: '',
                                active: true,
                                description: ''
                              };
                              const updatedPatterns = [...(settings.networkInterception?.urlPatterns?.patterns || []), newPattern];
                              updateSetting('networkInterception', {
                                ...settings.networkInterception,
                                urlPatterns: {
                                  ...settings.networkInterception?.urlPatterns,
                                  patterns: updatedPatterns
                                }
                              });
                            }}
                          >
                            Add Pattern
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                        <p className="text-sm font-medium mb-3">🗂️ Tab-Specific Control Settings</p>
                        
                        <div className="grid gap-2">
                          <label className="setting-label">Default state for new tabs</label>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            This determines whether new tabs start with network monitoring enabled or disabled
                          </p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Token Logging Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Token Display Settings</CardTitle>
              <CardDescription>
                Configure how authentication token hashes are displayed (token logging is controlled via the dashboard)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
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
                  <div className="ml-4 mt-3 p-3 bg-muted/50 rounded-lg border border-muted">
                    <p className="text-sm font-medium mb-2">🔒 Token hashes are partially redacted</p>
                    <p className="text-xs text-muted-foreground">
                      Token hash values will be displayed as: <code className="bg-muted px-1 rounded">abc***...***xyz</code> (showing first/last 3 characters)
                    </p>
                  </div>
                )}

                {settings.tokenLogging?.showFullHash && (
                  <div className="ml-4 mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                    <p className="text-sm font-medium mb-2">⚠️ Full token hashes visible</p>
                    <p className="text-xs text-muted-foreground">
                      Complete token hash values will be displayed. Use caution when sharing screenshots or logs.
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                    <p className="text-sm font-medium mb-3">🗂️ Tab-Specific Token Logging</p>
                    
                    <div className="grid gap-2">
                      <label className="setting-label">Default state for new tabs</label>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        This determines whether new tabs start with token logging enabled or disabled
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Logging Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Console Error Logging</CardTitle>
              <CardDescription>
                Configure browser console error monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
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
                              className="h-4 w-4 text-primary border-input rounded focus:ring-ring"
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
                      <p className="text-sm text-muted-foreground">
                        Unselected severity levels will be ignored completely
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                      <p className="text-sm font-medium mb-3">🗂️ Tab-Specific Error Logging</p>
                      
                      <div className="grid gap-2">
                        <label className="setting-label">Default state for new tabs</label>
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
                        <p className="text-xs text-muted-foreground mt-1">
                          This determines whether new tabs start with error logging enabled or disabled
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Usage Card */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>
                IndexedDB storage usage and data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {storageUsage.isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Calculating storage usage...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">IndexedDB Usage</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {formatBytes(storageUsage.bytes)} / 100 MB
                        </span>
                        <div 
                          className="relative group cursor-help"
                          title="Once the 100MB limit is exceeded, automatic data pruning will begin to maintain performance"
                        >
                          <div className="w-4 h-4 rounded-full bg-muted text-xs flex items-center justify-center text-muted-foreground">
                            ?
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-3">
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
                        <span className="text-muted-foreground">Usage:</span>
                        <span className="ml-2 font-medium">{storageUsage.percentage.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Available:</span>
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
            </CardContent>
          </Card>

          {/* About Card */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Extension information and support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Version:</strong> 1.0.0</div>
                <div><strong>Build:</strong> 2024.1.0</div>
                <div><strong>Manifest:</strong> V3</div>
                <div><strong>Support:</strong> <a href="#" className="text-primary hover:underline">Help Center</a></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('settings-root');
if (container) {
  const root = createRoot(container);
  root.render(<Settings />);
}
