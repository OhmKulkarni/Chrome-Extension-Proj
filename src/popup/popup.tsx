// src/popup/popup.tsx
// This file serves as the popup UI for the Chrome extension.
import './popup.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { StorageService } from '../utils/storage-service';
import { ChromeSyncService } from '../services/chrome-sync-service';

// Initialize services
const storageService = new StorageService();
const chromeSyncService = ChromeSyncService.getInstance();

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
    const initializePopup = async () => {
      try {
        // Initialize Chrome sync storage with defaults
        await chromeSyncService.initializeSyncStorage();

        // MEMORY LEAK FIX: Use pre-allocated function instead of direct chrome.runtime.sendMessage
        getChromeTabInfo().then(response => {
          setTabInfo(response)
        }).catch(error => {
          console.error('Failed to get tab info:', error)
          setTabInfo({ title: 'Error', url: 'Failed to get tab info' })
        })

        // Get extension settings and tab-specific state using StorageService (IndexedDB)
        const result = await storageService.get(['settings']);
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

        // Persist default settings if they don't exist using StorageService (IndexedDB)
        if (!settings.networkInterception || !settings.errorLogging || !settings.tokenLogging) {
          const updatedSettings = {
            ...settings,
            networkInterception: settings.networkInterception || networkInterceptionDefaults,
            errorLogging: settings.errorLogging || errorLoggingDefaults,
            tokenLogging: settings.tokenLogging || tokenLoggingDefaults
          };
          await storageService.set({ settings: updatedSettings });
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setLoading(false);
      }
    };

    initializePopup();

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
          // Fallback to storage for backward compatibility using StorageService
          try {
            const result = await storageService.get(['extensionEnabled']);
            setGlobalPowerEnabled(result.extensionEnabled ?? true);
          } catch (error) {
            console.error('Failed to get extension enabled state:', error);
            setGlobalPowerEnabled(true);
          }
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
        // Fallback to storage using StorageService
        try {
          const result = await storageService.get(['extensionEnabled']);
          setGlobalPowerEnabled(result.extensionEnabled ?? true);
        } catch (storageError) {
          console.error('Failed to get extension enabled state from storage:', storageError);
          setGlobalPowerEnabled(true);
        }
        setSiteSpecificEnabled(true);
      }
    };

    loadExtensionState();

    // Get current tab's logging state (network, error, and token)
    // NEW: Uses Chrome sync for preferences, IndexedDB for real-time counters
    const loadTabStates = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id || !tabs[0]?.url) return;

        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;

        // Get logging preferences from Chrome sync (cross-device)
        const syncPrefs = await chromeSyncService.getTabPreferencesForUrl(tabUrl);

        // Get real-time state data from IndexedDB (device-specific counters)
        const [networkState, errorState, tokenState] = await Promise.all([
          sendChromeMessage({ action: 'getTabNetworkState', tabId }),
          sendChromeMessage({ action: 'getTabErrorState', tabId }),
          sendChromeMessage({ action: 'getTabTokenState', tabId })
        ]);

        // Set tab logging states based on sync preferences (with IndexedDB overrides if active)
        setTabLoggingActive(
          (networkState?.success && typeof networkState.active === 'boolean')
            ? networkState.active
            : syncPrefs.network
        );

        setTabErrorLoggingActive(
          (errorState?.success && typeof errorState.active === 'boolean')
            ? errorState.active
            : syncPrefs.errors
        );

        setTabTokenLoggingActive(
          (tokenState?.success && typeof tokenState.active === 'boolean')
            ? tokenState.active
            : syncPrefs.tokens
        );

      } catch (error) {
        console.error('Error loading tab states:', error);
        // Fallback to sync defaults if everything fails
        try {
          const defaults = await chromeSyncService.getTabDefaults();
          setTabLoggingActive(defaults.network);
          setTabErrorLoggingActive(defaults.errors);
          setTabTokenLoggingActive(defaults.tokens);
        } catch (syncError) {
          console.error('Error loading sync defaults:', syncError);
          // Final fallback to hardcoded defaults
          setTabLoggingActive(false);
          setTabErrorLoggingActive(true);
          setTabTokenLoggingActive(false);
        }
      }
    };

    loadTabStates();

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

    // Update storage using StorageService (IndexedDB)
    try {
      await storageService.set({ extensionEnabled: newState });
    } catch (error) {
      console.error('Failed to save extension enabled state:', error);
    }

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

  const toggleTabLogging = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id || !tabs[0]?.url) return;

      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      const newState = !tabLoggingActive;
      setTabLoggingActive(newState);

      // Save user preference to Chrome sync (cross-device)
      await chromeSyncService.setTabPreferencesForUrl(tabUrl, { network: newState });

      // Update real-time state in IndexedDB via background script
      const response = await sendChromeMessage({
        action: 'setTabNetworkState',
        tabId,
        active: newState
      });

      if (response && !response.error) {
        // Send message to content script to start/stop logging
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'toggleLogging',
            enabled: newState
          });
        } catch (error) {
          console.log('Could not send message to tab (may not have content script):', error);
        }
      } else {
        console.error('Failed to toggle tab network state:', response?.error);
        // Revert local state if backend update failed
        setTabLoggingActive(!newState);
      }
    } catch (error) {
      console.error('Error toggling network logging:', error);
      // Revert local state on error
      setTabLoggingActive(!tabLoggingActive);
    }
  };

  const toggleTabErrorLogging = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id || !tabs[0]?.url) return;

      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      const newState = !tabErrorLoggingActive;
      setTabErrorLoggingActive(newState);

      // Save user preference to Chrome sync (cross-device)
      await chromeSyncService.setTabPreferencesForUrl(tabUrl, { errors: newState });

      // Update real-time state in IndexedDB via background script
      const response = await sendChromeMessage({
        action: 'setTabErrorState',
        tabId,
        active: newState
      });

      if (response && !response.error) {
        // Send message to content script
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'toggleErrorLogging',
            enabled: newState
          });
        } catch (error) {
          console.log('Could not send message to tab (may not have content script):', error);
        }
      } else {
        console.error('Failed to toggle tab error state:', response?.error);
        // Revert local state if backend update failed
        setTabErrorLoggingActive(!newState);
      }
    } catch (error) {
      console.error('Error toggling error logging:', error);
      // Revert local state on error
      setTabErrorLoggingActive(!tabErrorLoggingActive);
    }
  };

  const toggleTabTokenLogging = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id || !tabs[0]?.url) return;

      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      const newState = !tabTokenLoggingActive;
      setTabTokenLoggingActive(newState);

      // Save user preference to Chrome sync (cross-device)
      await chromeSyncService.setTabPreferencesForUrl(tabUrl, { tokens: newState });

      // Update real-time state in IndexedDB via background script
      const response = await sendChromeMessage({
        action: 'setTabTokenState',
        tabId,
        active: newState
      });

      if (!response || response.error) {
        console.error('Failed to toggle tab token state:', response?.error);
        // Revert local state if backend update failed
        setTabTokenLoggingActive(!newState);
      }

      // Note: Token logging doesn't require content script communication
      // as it's handled purely in the background script via network interception
    } catch (error) {
      console.error('Error toggling token logging:', error);
      // Revert local state on error
      setTabTokenLoggingActive(!tabTokenLoggingActive);
    }
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
