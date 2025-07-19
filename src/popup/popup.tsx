// src/popup/popup.tsx
// This file serves as the popup UI for the Chrome extension.
import './popup.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface TabInfo {
  url?: string;
  title?: string;
}

interface StorageData {
  extensionEnabled: boolean;
}

const Popup: React.FC = () => {
  const [tabInfo, setTabInfo] = useState<TabInfo>({});
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current tab info
    chrome.runtime.sendMessage({ action: 'getTabInfo' }, (response) => {
      if (response && !response.error) {
        setTabInfo(response);
      }
    });

    // Get extension settings
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      const data = result as Partial<StorageData>;
      setExtensionEnabled(data.extensionEnabled ?? true);
      setLoading(false);
    });
  }, []);

  const toggleExtension = () => {
    const newState = !extensionEnabled;
    setExtensionEnabled(newState);
    chrome.storage.sync.set({ extensionEnabled: newState });
  };

  const openDashboard = () => {
    chrome.runtime.sendMessage({ action: 'openDashboard' });
  };

  const openSettings = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/settings/settings.html')
    });
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
        <h1 className="text-lg font-bold">Chrome Extension</h1>
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