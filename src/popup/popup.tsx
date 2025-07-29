// src/popup/popup.tsx
// This file serves as the popup UI for the Chrome extension.
import './popup.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

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
  };
}

const Popup: React.FC = () => {
  const [tabInfo, setTabInfo] = useState<TabInfo>({});
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StorageData['extensionSettings']>({});
  const [tabLoggingActive, setTabLoggingActive] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    // Get current tab info
    chrome.runtime.sendMessage({ action: 'getTabInfo' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting tab info:', chrome.runtime.lastError);
        setTabInfo({ title: 'Error', url: 'Failed to get tab info' });
      } else if (response && !response.error) {
        console.log('Tab info received:', response);
        setTabInfo(response);
      } else {
        console.warn('Invalid response for tab info:', response);
        setTabInfo({ title: 'Unknown', url: 'Unknown' });
      }
    });

    // Get extension settings and tab-specific state
    chrome.storage.sync.get(['extensionEnabled', 'extensionSettings'], (result) => {
      const data = result as Partial<StorageData>;
      setExtensionEnabled(data.extensionEnabled ?? true);
      setSettings(data.extensionSettings || {});
      setLoading(false);
    });

    // Get current tab's logging state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.storage.local.get([`tabLogging_${tabs[0].id}`], (result) => {
          const tabState = result[`tabLogging_${tabs[0].id}`];
          if (tabState) {
            setTabLoggingActive(tabState.active);
            setRequestCount(tabState.requestCount || 0);
          }
        });
      }
    });
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
          active: newState,
          startTime: newState ? Date.now() : undefined,
          requestCount: newState ? 0 : requestCount
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

  const openDashboard = () => {
    chrome.runtime.sendMessage({ action: 'openDashboard' });
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
                {tabLoggingActive ? `Active (${requestCount} requests)` : 'Paused'}
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