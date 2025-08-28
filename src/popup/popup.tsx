// src/popup/popup.tsx
// This file serves as the popup UI for the Chrome extension.
import './popup.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { ThreeStateToggle, ThreeState } from './components/ui/three-state-toggle';
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

// MEMORY LEAK FIX: Centralized Chrome message handler with enhanced background script detection
const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    // Immediately copy and nullify response to prevent accumulation
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      console.warn('Background script not ready yet, retrying...', error.message)

      // Try to ping the background script first
      try {
        const pingResponse = await chrome.runtime.sendMessage({ action: 'ping' })
        if (pingResponse && pingResponse.initializing) {
          console.log('Background script is initializing, waiting...')
          // Wait a bit longer for initialization
          await delay(1000)
          try {
            const retryResponse = await chrome.runtime.sendMessage(message)
            return retryResponse ? { ...retryResponse } : null
          } catch (finalError) {
            console.error('Chrome message failed after initialization wait:', finalError)
            return { error: 'Background script still initializing' }
          }
        }
      } catch (pingError) {
        // Ping failed, background script might be completely unavailable
        console.error('Background script ping failed:', pingError)
      }

      // Original retry logic as fallback
      await delay(100)
      try {
        const response = await chrome.runtime.sendMessage(message)
        return response ? { ...response } : null
      } catch (retryError) {
        console.error('Chrome message failed after retry:', retryError)
        return { error: 'Could not establish connection with background script' }
      }
    } else {
      console.error('Chrome message failed:', error)
      return null
    }
  }
}

// MEMORY LEAK FIX: Pre-allocated Chrome message functions with enhanced initialization detection
const getChromeTabInfo = async (): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getTabInfo' })
    if (response && !response.error) {
      console.log('Tab info received:', response)
      return response
    } else if (response && response.loading) {
      console.log('Background script still loading:', response)
      return response // Return the loading state
    } else {
      console.warn('Invalid response for tab info:', response)
      return { title: 'Unknown', url: 'Unknown' }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn('Error getting tab info (background script may not be ready):', errorMessage)

    // Check if it's a connection error and provide better feedback
    if (errorMessage.includes('Could not establish connection')) {
      return {
        title: 'Extension Loading...',
        url: 'Background script starting up...',
        loading: true
      }
    }

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
  // const [siteSpecificEnabled, setSiteSpecificEnabled] = useState(true); // Removed - using computed three-state instead
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StorageData['extensionSettings']>({});
  const [tabLoggingActive, setTabLoggingActive] = useState(false);
  const [tabErrorLoggingActive, setTabErrorLoggingActive] = useState(false);
  const [tabTokenLoggingActive, setTabTokenLoggingActive] = useState(false);

  // Compute three-state value for the UI based on individual toggle states
  const siteToggleState: ThreeState = (() => {
    const allEnabled = tabLoggingActive && tabErrorLoggingActive && tabTokenLoggingActive;
    const allDisabled = !tabLoggingActive && !tabErrorLoggingActive && !tabTokenLoggingActive;

    if (allEnabled) return 'on';
    if (allDisabled) return 'off';
    return 'mixed';
  })();

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
          // CRITICAL FIX: Read from chrome.storage.local (where background script saves)
          // instead of IndexedDB via StorageService
          try {
            const result = await chrome.storage.local.get(['extensionEnabled']);
            setGlobalPowerEnabled(result.extensionEnabled ?? true);
            console.log('✅ Popup: Loaded extensionEnabled from chrome.storage.local:', result.extensionEnabled);
          } catch (error) {
            console.error('❌ Popup: Failed to load from chrome.storage.local:', error);
            setGlobalPowerEnabled(true);
          }
        }

      } catch (error) {
        console.error('Error loading extension state:', error);
        // CRITICAL FIX: Fallback to chrome.storage.local instead of StorageService
        try {
          const result = await chrome.storage.local.get(['extensionEnabled']);
          setGlobalPowerEnabled(result.extensionEnabled ?? true);
          console.log('✅ Popup: Fallback loaded extensionEnabled from chrome.storage.local:', result.extensionEnabled);
        } catch (storageError) {
          console.error('❌ Popup: Failed to load from chrome.storage.local in fallback:', storageError);
          setGlobalPowerEnabled(true);
        }
        // Site-specific state will be loaded in loadTabStates
      }
    };

    loadExtensionState();

    // Get current tab's logging state (network, error, and token)
    // NEW: Uses Chrome sync for preferences, IndexedDB for real-time counters
    // UPDATED: Now respects site-specific toggle state
    const loadTabStates = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id || !tabs[0]?.url) return;

        const tabId = tabs[0].id;
        const tabUrl = tabs[0].url;

        // Load individual logging preferences first
        // Get logging preferences from Chrome sync (cross-device)
        const syncPrefs = await chromeSyncService.getTabPreferencesForUrl(tabUrl);

        // Get real-time state data from IndexedDB (device-specific counters)
        const [networkState, errorState, tokenState] = await Promise.all([
          sendChromeMessage({ action: 'getTabNetworkState', tabId }),
          sendChromeMessage({ action: 'getTabErrorState', tabId }),
          sendChromeMessage({ action: 'getTabTokenState', tabId })
        ]);

        // Set individual toggle states based on sync preferences (with IndexedDB overrides if active)
        const networkActive = (networkState?.success && typeof networkState.active === 'boolean')
          ? networkState.active
          : syncPrefs.network;
        const errorActive = (errorState?.success && typeof errorState.active === 'boolean')
          ? errorState.active
          : syncPrefs.errors;
        const tokenActive = (tokenState?.success && typeof tokenState.active === 'boolean')
          ? tokenState.active
          : syncPrefs.tokens;

        setTabLoggingActive(networkActive);
        setTabErrorLoggingActive(errorActive);
        setTabTokenLoggingActive(tokenActive);

        // BIDIRECTIONAL: Site toggle state is now computed automatically from individual toggles
        // No need to manually set it - siteToggleState is derived reactively
        const allEnabled = networkActive && errorActive && tokenActive;

        console.log(`🔄 Initial state loaded - Network: ${networkActive}, Error: ${errorActive}, Token: ${tokenActive}, Site: ${allEnabled ? 'on' : (networkActive || errorActive || tokenActive) ? 'mixed' : 'off'}`);

      } catch (error) {
        console.error('Error loading tab states:', error);

        // Fallback to sync defaults if everything fails
        try {
          const defaults = await chromeSyncService.getTabDefaults();
          setTabLoggingActive(defaults.network);
          setTabErrorLoggingActive(defaults.errors);
          setTabTokenLoggingActive(defaults.tokens);

          // Site toggle is now computed automatically - no manual setting needed

        } catch (syncError) {
          console.error('Error loading sync defaults:', syncError);
          // Final fallback: Use settings-based defaults instead of hardcoded ones
          try {
            const settingsResult = await storageService.get(['settings']);
            const settings = settingsResult?.settings || {};

            const networkDefault = settings.networkInterception?.tabSpecific?.defaultState === 'active';
            const errorDefault = settings.errorLogging?.tabSpecific?.defaultState === 'active';
            const tokenDefault = settings.tokenLogging?.tabSpecific?.defaultState === 'active';

            setTabLoggingActive(networkDefault);
            setTabErrorLoggingActive(errorDefault);
            setTabTokenLoggingActive(tokenDefault);

            // Site toggle is now computed automatically from individual states

            console.log('🔄 POPUP: Using settings-based defaults - Network:', networkDefault, 'Error:', errorDefault, 'Token:', tokenDefault);
          } catch (settingsError) {
            console.error('Error loading settings defaults:', settingsError);
            // Ultimate fallback: Use disabled defaults (safer than enabled)
            setTabLoggingActive(false);
            setTabErrorLoggingActive(false);
            setTabTokenLoggingActive(false);
            // Site toggle will show 'off' automatically since all individual toggles are off
            console.log('🔄 POPUP: Using ultimate disabled defaults');
          }
        }
      }
    };

    loadTabStates();

    // Add storage change listeners to stay synchronized with dashboard and other sources
    const handleStorageChanges = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // Get current tab ID to check for relevant changes
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            const tabId = tabs[0].id;
            let hasIndividualChanges = false;
            let newNetworkState = tabLoggingActive;
            let newErrorState = tabErrorLoggingActive;
            let newTokenState = tabTokenLoggingActive;

            // Check for network logging changes
            const networkLoggingKey = `tabLogging_${tabId}`;
            if (changes[networkLoggingKey]) {
              const newValue = changes[networkLoggingKey].newValue;
              if (newValue && typeof newValue === 'object' && 'active' in newValue) {
                setTabLoggingActive(newValue.active);
                newNetworkState = newValue.active;
                hasIndividualChanges = true;
              }
            }

            // Check for error logging changes
            const errorLoggingKey = `tabErrorLogging_${tabId}`;
            if (changes[errorLoggingKey]) {
              const newValue = changes[errorLoggingKey].newValue;
              if (newValue && typeof newValue === 'object' && 'active' in newValue) {
                setTabErrorLoggingActive(newValue.active);
                newErrorState = newValue.active;
                hasIndividualChanges = true;
              }
            }

            // Check for token logging changes
            const tokenLoggingKey = `tabTokenLogging_${tabId}`;
            if (changes[tokenLoggingKey]) {
              const newValue = changes[tokenLoggingKey].newValue;
              if (newValue && typeof newValue === 'object' && 'active' in newValue) {
                setTabTokenLoggingActive(newValue.active);
                newTokenState = newValue.active;
                hasIndividualChanges = true;
              }
            }

            // If any individual toggles changed, update site toggle to reflect new state
            if (hasIndividualChanges) {
              updateSiteToggleFromIndividualStates(newNetworkState, newErrorState, newTokenState);
            }
          }
        });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanges);

    // Listen for background ready signal
    const handleBackgroundReady = (message: any) => {
      if (message.action === 'BACKGROUND_READY') {
        console.log('Background script is now ready, refreshing popup state...');
        // Refresh all states when background becomes ready
        loadExtensionState();
        loadTabStates();
      }
    };

    chrome.runtime.onMessage.addListener(handleBackgroundReady);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanges);
      chrome.runtime.onMessage.removeListener(handleBackgroundReady);
    };
  }, []);

  // MEMORY LEAK FIX: Toggle global power state (entire extension)
  const toggleGlobalPower = async () => {
    const newState = !globalPowerEnabled;
    setGlobalPowerEnabled(newState);

    // CRITICAL FIX: Save directly to chrome.storage.local (where background script reads from)
    // instead of IndexedDB via StorageService
    try {
      await chrome.storage.local.set({ extensionEnabled: newState });
      console.log('✅ Popup: Saved extensionEnabled to chrome.storage.local:', newState);
    } catch (error) {
      console.error('❌ Popup: Failed to save to chrome.storage.local:', error);
    }

    // Also update extension state controller for immediate effect
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

  // Helper function to update site toggle based on individual toggle states
  const updateSiteToggleFromIndividualStates = (networkState: boolean, errorState: boolean, tokenState: boolean) => {
    const allEnabled = networkState && errorState && tokenState;
    const allDisabled = !networkState && !errorState && !tokenState;

    // Site toggle reflects the collective state:
    // - ON when all 3 individual toggles are ON
    // - OFF when all 3 individual toggles are OFF
    // - OFF when mixed states (some on, some off) - this makes the site toggle a true "all or nothing" indicator
    if (allEnabled) {
      // setSiteSpecificEnabled(true); // Removed - using computed three-state
      console.log('� Site toggle: ON (all individual features enabled)');
    } else {
      // setSiteSpecificEnabled(false); // Removed - using computed three-state
      if (allDisabled) {
        console.log('🔴 Site toggle: OFF (all individual features disabled)');
      } else {
        console.log('🟡 Site toggle: OFF (mixed state - some features enabled, some disabled)');
      }
    }
  };

  // Handler for three-state site toggle
  const handleSiteToggleStateChange = (newState: ThreeState) => {
    // Three-state toggle only allows off ↔ on transitions (mixed is auto-determined)
    // Clicking when off or mixed → turn all on
    // Clicking when on → turn all off
    const targetState = newState === 'on';

    console.log(`🔄 Three-state site toggle: ${newState} → Setting all individual toggles to ${targetState}`);
    toggleSiteSpecificToState(targetState);
  };

  // Helper to set all individual toggles to a specific state
  const toggleSiteSpecificToState = async (enabled: boolean) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id || !tabs[0]?.url) return;

      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;

      console.log(`🔄 Site toggle: ${enabled ? 'Enabling' : 'Disabling'} all 3 individual features`);

      // Update all 3 individual toggle states to match target state
      setTabLoggingActive(enabled);
      setTabErrorLoggingActive(enabled);
      setTabTokenLoggingActive(enabled);

      // Save all preferences to Chrome sync
      await chromeSyncService.setTabPreferencesForUrl(tabUrl, {
        network: enabled,
        errors: enabled,
        tokens: enabled
      });

      // Update all backend states via individual messages
      const promises = [
        sendChromeMessage({ action: 'setTabNetworkState', tabId, active: enabled }),
        sendChromeMessage({ action: 'setTabErrorState', tabId, active: enabled }),
        sendChromeMessage({ action: 'setTabTokenState', tabId, active: enabled })
      ];

      const responses = await Promise.all(promises);
      const allSucceeded = responses.every(response => response && !response.error);

      if (allSucceeded) {
        // Send messages to content script for network and error logging
        try {
          await Promise.all([
            chrome.tabs.sendMessage(tabId, { action: 'toggleLogging', enabled }),
            chrome.tabs.sendMessage(tabId, { action: 'toggleErrorLogging', enabled })
          ]);
        } catch (error) {
          console.log('Could not send messages to tab (may not have content script):', error);
        }

        if (enabled) {
          // If enabling, retry script injection
          try {
            await chrome.tabs.sendMessage(tabId, { action: 'retryScriptInjection' });
            console.log('Sent script injection retry request to content script');
          } catch (error) {
            console.log('Could not send injection retry message to tab:', error);
          }
        }

        console.log(`✅ Site toggle complete: All features ${enabled ? 'enabled' : 'disabled'} for this tab`);
      } else {
        console.error('Some backend updates failed, reverting states');
        // Revert all states if any failed
        setTabLoggingActive(!enabled);
        setTabErrorLoggingActive(!enabled);
        setTabTokenLoggingActive(!enabled);
      }
    } catch (error) {
      console.error('Error in site toggle:', error);
    }
  };

  // Note: toggleSiteSpecific removed - now using handleSiteToggleStateChange with three-state toggle

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

        // Update site toggle to reflect new state of all 3 toggles
        updateSiteToggleFromIndividualStates(newState, tabErrorLoggingActive, tabTokenLoggingActive);
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

        // Update site toggle to reflect new state of all 3 toggles
        updateSiteToggleFromIndividualStates(tabLoggingActive, newState, tabTokenLoggingActive);
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
      } else {
        // Update site toggle to reflect new state of all 3 toggles
        updateSiteToggleFromIndividualStates(tabLoggingActive, tabErrorLoggingActive, newState);
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

  if (loading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gradient-to-br from-slate-50 to-gray-100 min-h-[400px]">
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="text-center bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg p-3 shadow-xl border border-slate-600/30">
          <h1 className="text-lg font-bold tracking-tight">
            Web App Monitor
          </h1>
          <p className="text-slate-300 text-xs mt-1 font-medium">
            v1.0.0 • {tabInfo.title ? tabInfo.title.substring(0, 30) + (tabInfo.title.length > 30 ? '...' : '') : 'Current Site'}
          </p>
        </div>

        {/* Extension Control */}
        <Card className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-all duration-300 rounded-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${globalPowerEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Extension Status</p>
                  <p className="text-xs text-slate-600">{globalPowerEnabled ? 'Active' : 'Disabled'}</p>
                </div>
              </div>
              <Switch
                checked={globalPowerEnabled}
                onChange={() => toggleGlobalPower()}
                className={globalPowerEnabled ? 'accent-green-500' : 'accent-red-500'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Site Control */}
        {globalPowerEnabled && (
          <Card className="border border-slate-200 bg-white shadow-md hover:shadow-lg transition-all duration-300 rounded-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    siteToggleState === 'on' ? 'bg-green-500' : 
                    siteToggleState === 'mixed' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Site Logging</p>
                    <p className="text-xs text-slate-600">
                      {siteToggleState === 'on' ? 'All features enabled' : 
                       siteToggleState === 'mixed' ? 'Partial features enabled' : 
                       'All features disabled'}
                    </p>
                  </div>
                </div>
                <ThreeStateToggle
                  state={siteToggleState}
                  onStateChange={handleSiteToggleStateChange}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Controls */}
        {globalPowerEnabled && (
          <div className="space-y-2">
            {/* Network Logging */}
            {settings?.networkInterception?.tabSpecific?.enabled && (
              <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-lg">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${tabLoggingActive ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Network Requests</p>
                        <p className="text-xs text-slate-500">{tabLoggingActive ? 'Capturing' : 'Paused'}</p>
                      </div>
                    </div>
                    <Switch
                      checked={tabLoggingActive}
                      onChange={() => toggleTabLogging()}
                      className={tabLoggingActive ? 'accent-blue-500' : 'accent-gray-400'}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Logging */}
            {settings?.errorLogging?.tabSpecific?.enabled && (
              <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-lg">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${tabErrorLoggingActive ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Console Errors</p>
                        <p className="text-xs text-slate-500">{tabErrorLoggingActive ? 'Capturing' : 'Paused'}</p>
                      </div>
                    </div>
                    <Switch
                      checked={tabErrorLoggingActive}
                      onChange={() => toggleTabErrorLogging()}
                      className={tabErrorLoggingActive ? 'accent-red-500' : 'accent-gray-400'}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Token Logging */}
            {settings?.tokenLogging?.tabSpecific?.enabled && (
              <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-lg">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${tabTokenLoggingActive ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Auth Tokens</p>
                        <p className="text-xs text-slate-500">{tabTokenLoggingActive ? 'Capturing' : 'Paused'}</p>
                      </div>
                    </div>
                    <Switch
                      checked={tabTokenLoggingActive}
                      onChange={() => toggleTabTokenLogging()}
                      className={tabTokenLoggingActive ? 'accent-yellow-500' : 'accent-gray-400'}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dashboard Button */}
        <Button
          onClick={openDashboard}
          className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg font-semibold"
          size="default"
        >
          Open Dashboard
        </Button>

        {/* Footer */}
        <div className="text-center border-t border-slate-200 pt-2">
          <p className="text-xs text-slate-500 font-medium">
            TypeScript • React • Vite
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
