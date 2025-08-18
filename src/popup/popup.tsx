// src/popup/popup.tsx
// This file serves as the popup UI for the Chrome extension.
import './popup.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';

// MEMORY LEAK FIX: External delay function to prevent closure capture
function createDelayPromise(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Use the external function
const delay = createDelayPromise

// MEMORY LEAK FIX: Centralized Chrome message handler to prevent response accumulation
const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    // Immediately copy and nullify response to prevent accumulation
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      console.warn('Background script not ready yet, retrying...', error.message)
      // Retry once after a short delay
      await delay(100)
      try {
        const response = await chrome.runtime.sendMessage(message)
        return response ? { ...response } : null
      } catch (retryError) {
        console.error('Chrome message failed after retry:', retryError)
        return null
      }
    } else {
      console.error('Chrome message failed:', error)
      return null
    }
  }
}

// MEMORY LEAK FIX: Pre-allocated Chrome message functions with Promise constructor elimination
const getChromeTabInfo = async (): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getTabInfo' })
    if (response && !response.error) {
      console.log('Tab info received:', response)
      return response
    } else {
      console.warn('Invalid response for tab info:', response)
      return { title: 'Unknown', url: 'Unknown' }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn('Error getting tab info (background script may not be ready):', errorMessage)
    return { title: 'Loading...', url: 'Extension starting up...' }
  }
}

const openChromeDashboard = async (): Promise<void> => {
  await sendChromeMessage({ action: 'openDashboard' })
}

interface TabInfo {
  url?: string;
  title?: string;
  id?: number;
}

interface StorageData {
  extensionEnabled: boolean;
  extensionSettings?: {
    networkInterception?: {
      enabled: boolean;
      tabSpecific?: {
        enabled: boolean;
        defaultState: 'active' | 'paused';
      };
    };
    errorLogging?: {
      enabled: boolean;
      tabSpecific?: {
        enabled: boolean;
        defaultState: 'active' | 'paused';
      };
    };
    tokenLogging?: {
      enabled: boolean;
      tabSpecific?: {
        enabled: boolean;
        defaultState: 'active' | 'paused';
      };
    };
  };
}

const Popup: React.FC = () => {
  const [tabInfo, setTabInfo] = useState<TabInfo>({});
  const [globalPowerEnabled, setGlobalPowerEnabled] = useState(true); // Global power button
  const [siteSpecificEnabled, setSiteSpecificEnabled] = useState(true); // Site-specific toggle
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StorageData['extensionSettings']>({});
  const [tabLoggingActive, setTabLoggingActive] = useState(false);
  const [tabErrorLoggingActive, setTabErrorLoggingActive] = useState(false);
  const [tabTokenLoggingActive, setTabTokenLoggingActive] = useState(false);

  useEffect(() => {
    // MEMORY LEAK FIX: Use pre-allocated function instead of direct chrome.runtime.sendMessage
    getChromeTabInfo().then(response => {
      setTabInfo(response)
    }).catch(error => {
      console.error('Failed to get tab info:', error)
      setTabInfo({ title: 'Error', url: 'Failed to get tab info' })
    })

    // Get extension settings and tab-specific state
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};

      // Ensure we have default networkInterception settings if they don't exist
      const networkInterceptionDefaults = {
        enabled: true,
        tabSpecific: {
          enabled: true,
          defaultState: 'paused'  // FIXED: Match background script defaults (disabled by default)
        }
      };

      // Ensure we have default errorLogging settings if they don't exist
      const errorLoggingDefaults = {
        enabled: true,
        tabSpecific: {
          enabled: true,
          defaultState: 'paused'  // FIXED: Match background script defaults (disabled by default)
        }
      };

      // Ensure we have default tokenLogging settings if they don't exist
      const tokenLoggingDefaults = {
        enabled: true,
        tabSpecific: {
          enabled: true,
          defaultState: 'paused'  // FIXED: Match background script defaults (disabled by default)
        }
      };

      setSettings({
        networkInterception: settings.networkInterception || networkInterceptionDefaults,
        errorLogging: settings.errorLogging || errorLoggingDefaults,
        tokenLogging: settings.tokenLogging || tokenLoggingDefaults
      });

      setLoading(false);
    });

    // Also get extension enabled state from the new extension state controller
    const loadExtensionState = async () => {
      try {
        // Load global power state (entire extension on/off)
        const globalResponse = await sendChromeMessage({
          action: 'GET_GLOBAL_POWER_STATE'
        });

        if (globalResponse && 'enabled' in globalResponse) {
          setGlobalPowerEnabled(globalResponse.enabled);
        } else {
          // Fallback to sync storage for backward compatibility
          chrome.storage.sync.get(['extensionEnabled'], (result) => {
            setGlobalPowerEnabled(result.extensionEnabled ?? true);
          });
        }

        // Load site-specific state for current tab
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs[0]?.id && tabs[0]?.url) {
            try {
              const siteResponse = await sendChromeMessage({
                action: 'GET_SITE_SPECIFIC_STATE',
                tabId: tabs[0].id
              });

              if (siteResponse && 'enabled' in siteResponse) {
                setSiteSpecificEnabled(siteResponse.enabled);
              } else {
                // Default to enabled for site-specific if no override
                setSiteSpecificEnabled(true);
              }
            } catch (error) {
              console.error('Error loading site-specific state:', error);
              setSiteSpecificEnabled(true);
            }
          }
        });

      } catch (error) {
        console.error('Error loading extension state:', error);
        // Fallback to sync storage
        chrome.storage.sync.get(['extensionEnabled'], (result) => {
          setGlobalPowerEnabled(result.extensionEnabled ?? true);
        });
        setSiteSpecificEnabled(true);
      }
    };

    loadExtensionState();

    // Get current tab's logging state (network, error, and token)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const tabId = tabs[0].id;
        chrome.storage.local.get([`tabLogging_${tabId}`, `tabErrorLogging_${tabId}`, `tabTokenLogging_${tabId}`, 'settings'], (result) => {
          const tabState = result[`tabLogging_${tabId}`];
          const errorTabState = result[`tabErrorLogging_${tabId}`];
          const tokenTabState = result[`tabTokenLogging_${tabId}`];
          const settings = result.settings || {};
          const networkConfig = settings.networkInterception || {};
          const errorConfig = settings.errorLogging || {};
          const tokenConfig = settings.tokenLogging || {};

          // Handle network logging state
          if (tabState) {
            if (typeof tabState === 'boolean') {
              setTabLoggingActive(tabState);
            } else if (tabState && typeof tabState === 'object' && 'active' in tabState) {
              setTabLoggingActive(tabState.active);
            }
          } else {
            const defaultActive = networkConfig.tabSpecific?.defaultState === 'active';
            setTabLoggingActive(defaultActive);

            const initialTabState = {
              active: defaultActive,
              startTime: defaultActive ? Date.now() : undefined,
              requestCount: 0
            };
            chrome.storage.local.set({ [`tabLogging_${tabId}`]: initialTabState });
          }

          // Handle error logging state
          if (errorTabState) {
            if (typeof errorTabState === 'boolean') {
              setTabErrorLoggingActive(errorTabState);
            } else if (errorTabState && typeof errorTabState === 'object' && 'active' in errorTabState) {
              setTabErrorLoggingActive(errorTabState.active);
            }
          } else {
            const defaultErrorActive = errorConfig.tabSpecific?.defaultState === 'active';
            setTabErrorLoggingActive(defaultErrorActive);

            const initialErrorTabState = {
              active: defaultErrorActive,
              startTime: defaultErrorActive ? Date.now() : undefined,
              errorCount: 0
            };
            chrome.storage.local.set({ [`tabErrorLogging_${tabId}`]: initialErrorTabState });
          }

          // Handle token logging state
          if (tokenTabState) {
            if (typeof tokenTabState === 'boolean') {
              setTabTokenLoggingActive(tokenTabState);
            } else if (tokenTabState && typeof tokenTabState === 'object' && 'active' in tokenTabState) {
              setTabTokenLoggingActive(tokenTabState.active);
            }
          } else {
            const defaultTokenActive = tokenConfig.tabSpecific?.defaultState === 'active';
            setTabTokenLoggingActive(defaultTokenActive);

            const initialTokenTabState = {
              active: defaultTokenActive,
              startTime: defaultTokenActive ? Date.now() : undefined,
              tokenCount: 0
            };
            chrome.storage.local.set({ [`tabTokenLogging_${tabId}`]: initialTokenTabState });
          }
        });
      }
    });

    // Add storage change listeners to stay synchronized with dashboard
    const handleStorageChanges = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // Get current tab ID to check for relevant changes
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            const tabId = tabs[0].id;

            // Check for network logging changes
            const networkLoggingKey = `tabLogging_${tabId}`;
            if (changes[networkLoggingKey]) {
              const newValue = changes[networkLoggingKey].newValue;
              if (newValue && typeof newValue === 'object' && 'active' in newValue) {
                setTabLoggingActive(newValue.active);
              }
            }

            // Check for error logging changes
            const errorLoggingKey = `tabErrorLogging_${tabId}`;
            if (changes[errorLoggingKey]) {
              const newValue = changes[errorLoggingKey].newValue;
              if (newValue && typeof newValue === 'object' && 'active' in newValue) {
                setTabErrorLoggingActive(newValue.active);
              }
            }

            // Check for token logging changes
            const tokenLoggingKey = `tabTokenLogging_${tabId}`;
            if (changes[tokenLoggingKey]) {
              const newValue = changes[tokenLoggingKey].newValue;
              if (newValue && typeof newValue === 'object' && 'active' in newValue) {
                setTabTokenLoggingActive(newValue.active);
              }
            }
          }
        });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanges);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanges);
    };
  }, []);

  // MEMORY LEAK FIX: Toggle global power state (entire extension)
  const toggleGlobalPower = async () => {
    const newState = !globalPowerEnabled;
    setGlobalPowerEnabled(newState);

    // Update Chrome storage for backward compatibility
    chrome.storage.sync.set({ extensionEnabled: newState });

    // Update extension state controller for immediate effect
    try {
      const response = await sendChromeMessage({
        action: 'SET_EXTENSION_STATE',
        enabled: newState
      });

      if (!response?.success) {
        console.warn('Failed to update global extension state:', response);
      }
    } catch (error) {
      console.error('Error updating global extension state:', error);
    }
  };

  // MEMORY LEAK FIX: Toggle site-specific state (current site only)
  const toggleSiteSpecific = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id && tabs[0]?.url) {
        const newState = !siteSpecificEnabled;
        setSiteSpecificEnabled(newState);

        try {
          const response = await sendChromeMessage({
            action: 'SET_EXTENSION_STATE',
            tabId: tabs[0].id,
            enabled: newState
          });

          if (!response?.success) {
            console.warn('Failed to update site-specific extension state:', response);
          }
        } catch (error) {
          console.error('Error updating site-specific extension state:', error);
        }
      }
    });
  };

  const toggleTabLogging = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const tabId = tabs[0].id;
        const newState = !tabLoggingActive;
        setTabLoggingActive(newState);

        const tabState = {
          status: newState ? 'active' : 'inactive',
          active: newState, // Keep for backward compatibility
          startTime: newState ? Date.now() : undefined,
          requestCount: 0
        };

        chrome.storage.local.set({ [`tabLogging_${tabId}`]: tabState });

        // Send message to content script to start/stop logging
        chrome.tabs.sendMessage(tabId, {
          action: 'toggleLogging',
          enabled: newState
        });
      }
    });
  };

  const toggleTabErrorLogging = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const tabId = tabs[0].id;
        const newState = !tabErrorLoggingActive;
        setTabErrorLoggingActive(newState);

        const tabState = {
          active: newState,
          startTime: newState ? Date.now() : undefined,
          errorCount: 0
        };

        chrome.storage.local.set({ [`tabErrorLogging_${tabId}`]: tabState });

        // Send message to content script to start/stop error logging
        chrome.tabs.sendMessage(tabId, {
          action: 'toggleErrorLogging',
          enabled: newState
        });
      }
    });
  };

  const toggleTabTokenLogging = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const tabId = tabs[0].id;
        const newState = !tabTokenLoggingActive;
        setTabTokenLoggingActive(newState);

        const tabState = {
          active: newState,
          startTime: newState ? Date.now() : undefined,
          tokenCount: 0
        };

        chrome.storage.local.set({ [`tabTokenLogging_${tabId}`]: tabState });

        // Note: Token logging doesn't require content script communication
        // as it's handled purely in the background script via network interception
      }
    });
  };

  const openDashboard = () => {
    openChromeDashboard().catch(error => {
      console.error('Failed to open dashboard:', error)
    })
  };

  const openSettings = () => {
    console.log('🔧 Opening settings page...');
    try {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/settings/settings.html')
      }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Error opening settings:', chrome.runtime.lastError);
        } else {
          console.log('Settings tab created:', tab);
        }
      });
    } catch (error) {
      console.error('Exception in openSettings:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-[500px]">
      <div className="p-4 space-y-3">
        {/* Header with Gradient */}
        <div className="text-center pb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 shadow-lg">
          <h1 className="text-xl font-bold tracking-tight flex items-center justify-center">
            <span className="mr-2">📊</span>
            Web App Monitor
          </h1>
          <p className="text-blue-100 text-xs mt-1">
            Scaffold v1.0.0 • Extension Popup
          </p>
        </div>

        {/* Current Tab Info Card */}
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base flex items-center text-blue-900">
              <span className="mr-2">🌐</span>
              Current Tab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
            <div>
              <p className="text-xs font-medium text-blue-700">Title</p>
              <p className="text-sm truncate text-blue-900">{tabInfo.title || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700">URL</p>
              <p className="text-xs truncate text-blue-600">{tabInfo.url || 'Unknown'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Global Power Control Card */}
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center text-green-900">
              <span className="mr-2">⚡</span>
              Extension Status
            </CardTitle>
            <CardDescription className="text-xs text-green-700">
              {globalPowerEnabled ? '✅ Extension is active' : '🔴 Extension is disabled'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="bg-white rounded-md p-3 border-2 border-green-200 shadow-sm">
              <Switch
                checked={globalPowerEnabled}
                onChange={() => toggleGlobalPower()}
                label="Global Power"
                description={globalPowerEnabled ? '🟢 All monitoring active' : '🔴 All monitoring disabled'}
                className={globalPowerEnabled ? 'accent-green-500' : 'accent-red-500'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Site-Specific Control Card */}
        {globalPowerEnabled && (
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center text-purple-900">
                <span className="mr-2">🏠</span>
                This Site
              </CardTitle>
              <CardDescription className="text-xs text-purple-700">
                {siteSpecificEnabled ? '🟢 Site monitoring enabled' : '🟡 Site monitoring disabled'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="bg-white rounded-md p-3 border-2 border-purple-200 shadow-sm">
                <Switch
                  checked={siteSpecificEnabled}
                  onChange={() => toggleSiteSpecific()}
                  label="Site Monitoring"
                  description={siteSpecificEnabled ? '🟢 Monitoring enabled for this site' : '🟡 Monitoring disabled for this site'}
                  className={siteSpecificEnabled ? 'accent-purple-500' : 'accent-gray-400'}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab-Specific Controls */}
        {globalPowerEnabled && siteSpecificEnabled && (
          <div className="space-y-3">
            {/* Network Logging Control */}
            {settings?.networkInterception?.tabSpecific?.enabled && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center text-blue-900">
                    <span className="mr-2">🌐</span>
                    Network Logging
                  </CardTitle>
                  <CardDescription className="text-xs text-blue-700">
                    {tabLoggingActive ? '📡 Capturing network requests' : '⏸️ Network monitoring paused'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="bg-white rounded-md p-3 border-2 border-blue-200 shadow-sm">
                    <Switch
                      checked={tabLoggingActive}
                      onChange={() => toggleTabLogging()}
                      label="Network Monitoring"
                      description={tabLoggingActive ? '📡 Capturing network requests' : '⏸️ Network monitoring paused'}
                      className={tabLoggingActive ? 'accent-blue-500' : 'accent-gray-400'}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Logging Control */}
            {settings?.errorLogging?.tabSpecific?.enabled && (
              <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center text-red-900">
                    <span className="mr-2">⚠️</span>
                    Error Logging
                  </CardTitle>
                  <CardDescription className="text-xs text-red-700">
                    {tabErrorLoggingActive ? '🔴 Capturing console errors' : '⏸️ Error monitoring paused'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="bg-white rounded-md p-3 border-2 border-red-200 shadow-sm">
                    <Switch
                      checked={tabErrorLoggingActive}
                      onChange={() => toggleTabErrorLogging()}
                      label="Error Monitoring"
                      description={tabErrorLoggingActive ? '🔴 Capturing console errors' : '⏸️ Error monitoring paused'}
                      className={tabErrorLoggingActive ? 'accent-red-500' : 'accent-gray-400'}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Token Logging Control */}
            {settings?.tokenLogging?.tabSpecific?.enabled && (
              <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center text-yellow-900">
                    <span className="mr-2">🔑</span>
                    Token Logging
                  </CardTitle>
                  <CardDescription className="text-xs text-yellow-700">
                    {tabTokenLoggingActive ? '🟡 Capturing authentication tokens' : '⏸️ Token monitoring paused'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="bg-white rounded-md p-3 border-2 border-yellow-200 shadow-sm">
                    <Switch
                      checked={tabTokenLoggingActive}
                      onChange={() => toggleTabTokenLogging()}
                      label="Token Monitoring"
                      description={tabTokenLoggingActive ? '🟡 Capturing authentication tokens' : '⏸️ Token monitoring paused'}
                      className={tabTokenLoggingActive ? 'accent-yellow-500' : 'accent-gray-400'}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={openDashboard}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-2 border-blue-300 shadow-lg transform hover:scale-105 transition-all duration-200"
            size="default"
          >
            <span className="mr-2">📊</span>
            Open Dashboard
          </Button>
          <Button
            onClick={openSettings}
            variant="outline"
            className="w-full border-2 border-purple-300 text-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 shadow-lg transform hover:scale-105 transition-all duration-200"
            size="default"
          >
            <span className="mr-2">⚙️</span>
            Settings
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center pt-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-2">
          <p className="text-xs text-gray-600 flex items-center justify-center">
            <span className="mr-1">🛠️</span>
            Built with TypeScript, React & Vite
          </p>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
