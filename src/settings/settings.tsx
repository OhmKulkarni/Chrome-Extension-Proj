// src/settings/settings.tsx
// This file serves as the settings UI for the Chrome extension.
import './settings.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface SettingsData {
  notifications: boolean;
  autoSync: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  updateFrequency: number;
  privacyMode: boolean;
  dataCollection: boolean;
  networkInterception: {
    enabled: boolean;
    domainFilter: 'current-tab' | 'all-domains' | 'custom';
    customDomains: string[];
    bodyCapture: {
      mode: 'disabled' | 'partial' | 'full';
      captureRequests: boolean;
      captureResponses: boolean;
    };
    privacy: {
      autoRedact: boolean;
    };
    // New scoped interception options
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
      enabled: boolean;
      defaultState: 'active' | 'paused';
    };
    // New filtering options
    requestFilters: {
      methods: {
        enabled: boolean;
        allowed: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'>;
      };
      contentTypes: {
        enabled: boolean;
        allowed: Array<'json' | 'html' | 'image' | 'script' | 'css' | 'xml' | 'text' | 'other'>;
      };
      pathFilters: {
        enabled: boolean;
        keywords: string[];
        regex: string[];
        includeMode: boolean; // true = include matching, false = exclude matching
      };
    };
    // Profiles for quick switching
    profiles: Array<{
      id: string;
      name: string;
      description?: string;
      active: boolean;
      settings: Partial<SettingsData['networkInterception']>;
    }>;
  };
}

const defaultSettings: SettingsData = {
  notifications: true,
  autoSync: true,
  theme: 'system',
  language: 'en',
  updateFrequency: 5,
  privacyMode: false,
  dataCollection: true,
  networkInterception: {
    enabled: true,
    domainFilter: 'current-tab',
    customDomains: [],
    bodyCapture: {
      mode: 'partial',
      captureRequests: false,
      captureResponses: false,
    },
    privacy: {
      autoRedact: true,
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
      enabled: false,
      defaultState: 'active'
    },
    requestFilters: {
      methods: {
        enabled: false,
        allowed: ['GET', 'POST', 'PUT', 'DELETE']
      },
      contentTypes: {
        enabled: false,
        allowed: ['json', 'html', 'script']
      },
      pathFilters: {
        enabled: false,
        keywords: [],
        regex: [],
        includeMode: true
      }
    },
    profiles: [
      {
        id: 'default',
        name: 'Default Profile',
        description: 'Standard network interception settings',
        active: true,
        settings: {}
      }
    ]
  },
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get('extensionSettings');
      if (result.extensionSettings) {
        setSettings({ ...defaultSettings, ...result.extensionSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await chrome.storage.sync.set({ extensionSettings: settings });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(defaultSettings);
    }
  };

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Extension Settings</h1>
            <div className="flex space-x-3">
              <button 
                onClick={resetSettings} 
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Reset to Default
              </button>
              <button 
                onClick={saveSettings} 
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`mx-6 mt-4 p-3 rounded-lg ${
              saveMessage.includes('Error') 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {saveMessage}
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* General Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={(e) => updateSetting('notifications', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Enable notifications</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Show desktop notifications from the extension</p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoSync}
                      onChange={(e) => updateSetting('autoSync', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Auto-sync data</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Automatically sync data across devices</p>
                </div>

                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700">Theme</label>
                  <select
                    id="theme"
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                  <select
                    id="language"
                    value={settings.language}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="updateFrequency" className="block text-sm font-medium text-gray-700">
                    Update frequency (minutes)
                  </label>
                  <input
                    type="number"
                    id="updateFrequency"
                    min="1"
                    max="60"
                    value={settings.updateFrequency}
                    onChange={(e) => updateSetting('updateFrequency', parseInt(e.target.value))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Security</h2>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.privacyMode}
                      onChange={(e) => updateSetting('privacyMode', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Privacy mode</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Enhanced privacy protection</p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.dataCollection}
                      onChange={(e) => updateSetting('dataCollection', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Allow data collection</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Help improve the extension by sharing anonymous usage data</p>
                </div>
              </div>
            </div>

            {/* Network Interception Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Network Interception</h2>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.networkInterception.enabled}
                      onChange={(e) => updateSetting('networkInterception', {
                        ...settings.networkInterception,
                        enabled: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Enable network interception</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Capture and monitor network requests</p>
                </div>

                {settings.networkInterception.enabled && (
                  <div className="ml-6 space-y-4 pl-4 border-l-2 border-blue-100">
                    <div>
                      <label htmlFor="domainFilter" className="block text-sm font-medium text-gray-700">
                        Domain Filter
                      </label>
                      <select
                        id="domainFilter"
                        value={settings.networkInterception.domainFilter}
                        onChange={(e) => updateSetting('networkInterception', {
                          ...settings.networkInterception,
                          domainFilter: e.target.value as any
                        })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="current-tab">Current Tab Only</option>
                        <option value="all-domains">All Domains</option>
                        <option value="custom">Custom Domains</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500">
                        Choose which domains to monitor for network requests
                      </p>
                    </div>

                    {settings.networkInterception.domainFilter === 'custom' && (
                      <div>
                        <label htmlFor="customDomains" className="block text-sm font-medium text-gray-700">
                          Custom Domains
                        </label>
                        <textarea
                          id="customDomains"
                          rows={3}
                          value={settings.networkInterception.customDomains.join('\n')}
                          onChange={(e) => updateSetting('networkInterception', {
                            ...settings.networkInterception,
                            customDomains: e.target.value.split('\n').filter(d => d.trim())
                          })}
                          placeholder="example.com&#10;*.api.example.com&#10;subdomain.example.org"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Enter one domain per line. Use * for wildcards (e.g., *.example.com)
                        </p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="bodyCaptureMode" className="block text-sm font-medium text-gray-700">
                        Body Capture Mode
                      </label>
                      <select
                        id="bodyCaptureMode"
                        value={settings.networkInterception.bodyCapture.mode}
                        onChange={(e) => updateSetting('networkInterception', {
                          ...settings.networkInterception,
                          bodyCapture: {
                            ...settings.networkInterception.bodyCapture,
                            mode: e.target.value as any
                          }
                        })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="disabled">Disabled</option>
                        <option value="partial">Metadata Only (Recommended)</option>
                        <option value="full">Full Body Capture</option>
                      </select>
                      <p className="mt-1 text-sm text-gray-500">
                        Control what data is captured from network requests
                      </p>
                    </div>

                    {settings.networkInterception.bodyCapture.mode === 'full' && (
                      <div className="space-y-3">
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={settings.networkInterception.bodyCapture.captureRequests}
                              onChange={(e) => updateSetting('networkInterception', {
                                ...settings.networkInterception,
                                bodyCapture: {
                                  ...settings.networkInterception.bodyCapture,
                                  captureRequests: e.target.checked
                                }
                              })}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Capture request bodies</span>
                          </label>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={settings.networkInterception.bodyCapture.captureResponses}
                              onChange={(e) => updateSetting('networkInterception', {
                                ...settings.networkInterception,
                                bodyCapture: {
                                  ...settings.networkInterception.bodyCapture,
                                  captureResponses: e.target.checked
                                }
                              })}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Capture response bodies</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.networkInterception.privacy.autoRedact}
                          onChange={(e) => updateSetting('networkInterception', {
                            ...settings.networkInterception,
                            privacy: {
                              ...settings.networkInterception.privacy,
                              autoRedact: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Auto-redact sensitive data</span>
                      </label>
                      <p className="mt-1 text-sm text-gray-500">
                        Automatically redact authorization headers, cookies, and API keys
                      </p>
                      {!settings.networkInterception.privacy.autoRedact && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <span className="text-yellow-400">⚠️</span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-800">
                                <strong>Warning:</strong> Disabling auto-redaction may expose sensitive data like passwords and API keys.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* URL Pattern Scoping */}
            {settings.networkInterception.enabled && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">URL Pattern Scoping</h2>
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.networkInterception.urlPatterns.enabled}
                        onChange={(e) => updateSetting('networkInterception', {
                          ...settings.networkInterception,
                          urlPatterns: {
                            ...settings.networkInterception.urlPatterns,
                            enabled: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Enable URL pattern filtering</span>
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      Intercept requests only from specific URL patterns. Leave disabled to use domain filter above.
                    </p>
                  </div>

                  {settings.networkInterception.urlPatterns.enabled && (
                    <div className="ml-6 space-y-4 pl-4 border-l-2 border-green-100">
                      <div className="space-y-3">
                        {settings.networkInterception.urlPatterns.patterns.map((pattern, index) => (
                          <div key={pattern.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <input
                              type="checkbox"
                              checked={pattern.active}
                              onChange={(e) => {
                                const newPatterns = [...settings.networkInterception.urlPatterns.patterns];
                                newPatterns[index] = { ...pattern, active: e.target.checked };
                                updateSetting('networkInterception', {
                                  ...settings.networkInterception,
                                  urlPatterns: {
                                    ...settings.networkInterception.urlPatterns,
                                    patterns: newPatterns
                                  }
                                });
                              }}
                              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={pattern.pattern}
                                onChange={(e) => {
                                  const newPatterns = [...settings.networkInterception.urlPatterns.patterns];
                                  newPatterns[index] = { ...pattern, pattern: e.target.value };
                                  updateSetting('networkInterception', {
                                    ...settings.networkInterception,
                                    urlPatterns: {
                                      ...settings.networkInterception.urlPatterns,
                                      patterns: newPatterns
                                    }
                                  });
                                }}
                                placeholder="https://example.com/* or *://*.api.example.com/*"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                              />
                              {pattern.description && (
                                <p className="mt-1 text-xs text-gray-500">{pattern.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const newPatterns = settings.networkInterception.urlPatterns.patterns.filter((_, i) => i !== index);
                                updateSetting('networkInterception', {
                                  ...settings.networkInterception,
                                  urlPatterns: {
                                    ...settings.networkInterception.urlPatterns,
                                    patterns: newPatterns
                                  }
                                });
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove pattern"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            const newPattern = {
                              id: `pattern_${Date.now()}`,
                              pattern: '',
                              active: true,
                              description: ''
                            };
                            updateSetting('networkInterception', {
                              ...settings.networkInterception,
                              urlPatterns: {
                                ...settings.networkInterception.urlPatterns,
                                patterns: [...settings.networkInterception.urlPatterns.patterns, newPattern]
                              }
                            });
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                          Add Pattern
                        </button>
                        
                        <button
                          onClick={() => {
                            const commonPatterns = [
                              { id: `pattern_${Date.now()}_1`, pattern: 'https://api.example.com/*', active: true, description: 'API endpoints' },
                              { id: `pattern_${Date.now()}_2`, pattern: '*://*.googleapis.com/*', active: true, description: 'Google APIs' },
                              { id: `pattern_${Date.now()}_3`, pattern: 'https://*/api/*', active: true, description: 'Any /api/ paths' }
                            ];
                            updateSetting('networkInterception', {
                              ...settings.networkInterception,
                              urlPatterns: {
                                ...settings.networkInterception.urlPatterns,
                                patterns: [...settings.networkInterception.urlPatterns.patterns, ...commonPatterns]
                              }
                            });
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                          Add Common Patterns
                        </button>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Pattern Examples:</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li><code>https://example.com/*</code> - All pages on example.com</li>
                          <li><code>*://*.api.example.com/*</code> - Any subdomain of api.example.com</li>
                          <li><code>https://*/api/*</code> - Any /api/ path on any HTTPS site</li>
                          <li><code>*://news-site.com/article/*</code> - Article pages on news-site.com</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab-Specific Control */}
            {settings.networkInterception.enabled && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tab-Specific Control</h2>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.networkInterception.tabSpecific.enabled}
                        onChange={(e) => updateSetting('networkInterception', {
                          ...settings.networkInterception,
                          tabSpecific: {
                            ...settings.networkInterception.tabSpecific,
                            enabled: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Enable per-tab logging control</span>
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      Allow users to start/stop logging on individual tabs via the popup
                    </p>
                  </div>

                  {settings.networkInterception.tabSpecific.enabled && (
                    <div className="ml-6 pl-4 border-l-2 border-purple-100">
                      <div>
                        <label htmlFor="defaultTabState" className="block text-sm font-medium text-gray-700">
                          Default state for new tabs
                        </label>
                        <select
                          id="defaultTabState"
                          value={settings.networkInterception.tabSpecific.defaultState}
                          onChange={(e) => updateSetting('networkInterception', {
                            ...settings.networkInterception,
                            tabSpecific: {
                              ...settings.networkInterception.tabSpecific,
                              defaultState: e.target.value as 'active' | 'paused'
                            }
                          })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="active">Start logging immediately</option>
                          <option value="paused">Wait for user to start logging</option>
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                          Choose whether new tabs should start logging network requests automatically
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Version:</strong> 1.0.0</div>
                  <div><strong>Build:</strong> 2024.1.0</div>
                  <div><strong>Manifest:</strong> V3</div>
                  <div><strong>Support:</strong> <a href="#" className="text-blue-600 hover:text-blue-800">Help Center</a></div>
                </div>
              </div>
            </div>
          </div>
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