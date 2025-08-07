// src/popup/popup.tsx
// This file serves as the popup UI for the Chrome extension.
import './popup.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

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
  const [extensionEnabled, setExtensionEnabled] = useState(true);
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
      
      // Ensure we have default errorLogging settings if they don't exist
      const errorLoggingDefaults = {
        enabled: true,
        tabSpecific: {
          enabled: true,
          defaultState: 'paused'
        }
      };

      // Ensure we have default tokenLogging settings if they don't exist
      const tokenLoggingDefaults = {
        enabled: true,
        tabSpecific: {
          enabled: true,
          defaultState: 'paused'
        }
      };
      
      setSettings({ 
        networkInterception: settings.networkInterception,
        errorLogging: settings.errorLogging || errorLoggingDefaults,
        tokenLogging: settings.tokenLogging || tokenLoggingDefaults
      });
      setLoading(false);
    });

    // Also get extension enabled state from sync storage (if it exists there)
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      setExtensionEnabled(result.extensionEnabled ?? true);
    });

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

  const toggleExtension = () => {
    const newState = !extensionEnabled;
    setExtensionEnabled(newState);
    chrome.storage.sync.set({ extensionEnabled: newState });
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
    <div className="w-80 h-96 bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <h1 className="text-lg font-bold">Web App Monitor</h1>
        <p className="text-sm opacity-90">Scaffold v1.0.0</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Current Tab Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="font-semibold text-gray-800 mb-2">Current Tab</h3>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 truncate">
              <span className="font-medium">Title:</span> {tabInfo.title || 'Unknown'}
            </p>
            <p className="text-sm text-gray-600 truncate">
              <span className="font-medium">URL:</span> {tabInfo.url || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Extension Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-800">Extension Status</h3>
            <p className="text-sm text-gray-600">
              {extensionEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <button
            onClick={toggleExtension}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              extensionEnabled ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                extensionEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Tab-Specific Logging Control */}
        {extensionEnabled && settings?.networkInterception?.tabSpecific?.enabled && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <h3 className="font-semibold text-gray-800">Tab Logging</h3>
              <p className="text-sm text-gray-600">
                {tabLoggingActive ? 'Active' : 'Paused'}
              </p>
            </div>
            <button
              onClick={toggleTabLogging}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                tabLoggingActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  tabLoggingActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Tab-Specific Error Logging Control */}
        {extensionEnabled && settings?.errorLogging?.tabSpecific?.enabled && (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h3 className="font-semibold text-gray-800">Error Logging</h3>
              <p className="text-sm text-gray-600">
                {tabErrorLoggingActive ? 'Active' : 'Paused'}
              </p>
            </div>
            <button
              onClick={toggleTabErrorLogging}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                tabErrorLoggingActive ? 'bg-red-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  tabErrorLoggingActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Tab-Specific Token Logging Control */}
        {extensionEnabled && settings?.tokenLogging?.tabSpecific?.enabled && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div>
              <h3 className="font-semibold text-gray-800">Token Logging</h3>
              <p className="text-sm text-gray-600">
                {tabTokenLoggingActive ? 'Active' : 'Paused'}
              </p>
            </div>
            <button
              onClick={toggleTabTokenLogging}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                tabTokenLoggingActive ? 'bg-yellow-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  tabTokenLoggingActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={openDashboard}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Open Dashboard
          </button>
          <button
            onClick={openSettings}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Settings
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
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