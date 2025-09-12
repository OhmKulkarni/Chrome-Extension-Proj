/**
 * Demo Popup Component - Shows Unified Permission System in Action
 *
 * This is a demonstration of how the unified permission system works.
 * It shows the consolidation of all permission states into chrome.storage.local
 * and provides a clean, consistent interface.
 */

import React, { useState, useEffect } from 'react';
import { unifiedPermissionManager } from '../../utils/unified-permission-manager';

interface UnifiedPermissionDemoProps {}

export const UnifiedPermissionDemo: React.FC<UnifiedPermissionDemoProps> = () => {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [siteEnabled, setSiteEnabled] = useState(true);
  const [features, setFeatures] = useState({
    network: false,
    console: false,
    tokens: false
  });
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [permissionData, setPermissionData] = useState<any>(null);

  // Load current state
  useEffect(() => {
    const loadPermissionState = async () => {
      try {
        // Initialize unified manager
        await unifiedPermissionManager.initialize();

        // Get current tab info
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (currentTab?.id && currentTab?.url) {
          setCurrentTabId(currentTab.id);

          const domain = new URL(currentTab.url).hostname;
          setCurrentDomain(domain);

          // Get complete permission state for this tab
          const state = await unifiedPermissionManager.getTabPermissionState(currentTab.id, currentTab.url);

          setGlobalEnabled(state.global);
          setSiteEnabled(state.site);
          setFeatures(state.features);

          // Get raw permission data for display
          const rawData = await chrome.storage.local.get(['unifiedPermissions']);
          setPermissionData(rawData.unifiedPermissions);
        }

        setLoading(false);
      } catch (error) {
        // console.error('Error loading permission state:', error);
        setLoading(false);
      }
    };

    loadPermissionState();
  }, []);

  // Handle global power toggle
  const handleGlobalToggle = async () => {
    try {
      const newState = !globalEnabled;
      await unifiedPermissionManager.setGlobalEnabled(newState);
      setGlobalEnabled(newState);

      // Refresh permission data
      const rawData = await chrome.storage.local.get(['unifiedPermissions']);
      setPermissionData(rawData.unifiedPermissions);
    } catch (error) {
      // console.error('Error toggling global state:', error);
    }
  };

  // Handle site-specific toggle
  const handleSiteToggle = async () => {
    try {
      if (!currentDomain) return;

      const newState = !siteEnabled;
      await unifiedPermissionManager.setSiteEnabled(currentDomain, newState);
      setSiteEnabled(newState);

      // Refresh permission data
      const rawData = await chrome.storage.local.get(['unifiedPermissions']);
      setPermissionData(rawData.unifiedPermissions);
    } catch (error) {
      // console.error('Error toggling site state:', error);
    }
  };

  // Handle feature toggle
  const handleFeatureToggle = async (feature: 'network' | 'console' | 'tokens') => {
    try {
      if (!currentTabId) return;

      const newState = !features[feature];
      await unifiedPermissionManager.setFeatureEnabled(currentTabId, feature, newState);

      setFeatures(prev => ({
        ...prev,
        [feature]: newState
      }));

      // Refresh permission data
      const rawData = await chrome.storage.local.get(['unifiedPermissions']);
      setPermissionData(rawData.unifiedPermissions);
    } catch (error) {
      // console.error(`Error toggling ${feature} feature:`, error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading unified permission system...</p>
      </div>
    );
  }

  return (
    <div className="w-96 p-4 bg-white">
      <h2 className="text-lg font-bold mb-4 text-center text-blue-800">
        🔧 Unified Permission System Demo
      </h2>

      {/* Current Tab Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Current Tab</h3>
        <p className="text-xs text-gray-600">
          <strong>Domain:</strong> {currentDomain || 'Unknown'}
        </p>
        <p className="text-xs text-gray-600">
          <strong>Tab ID:</strong> {currentTabId || 'Unknown'}
        </p>
      </div>

      {/* Permission Controls */}
      <div className="space-y-4">

        {/* Global Power */}
        <div className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">⚡ Global Power</h4>
              <p className="text-xs text-gray-600">Master switch for entire extension</p>
            </div>
            <button
              onClick={handleGlobalToggle}
              className={`w-12 h-6 rounded-full transition-colors ${
                globalEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                globalEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Site-Specific */}
        <div className={`p-3 border rounded-lg ${!globalEnabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">🌐 This Site</h4>
              <p className="text-xs text-gray-600">Control for {currentDomain}</p>
            </div>
            <button
              onClick={handleSiteToggle}
              disabled={!globalEnabled}
              className={`w-12 h-6 rounded-full transition-colors ${
                siteEnabled && globalEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                siteEnabled && globalEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Individual Features */}
        <div className={`p-3 border rounded-lg ${!globalEnabled || !siteEnabled ? 'opacity-50' : ''}`}>
          <h4 className="font-semibold text-sm mb-3">🎛️ Individual Features</h4>

          {Object.entries(features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm capitalize">{feature === 'console' ? 'Console Errors' : feature}</span>
              </div>
              <button
                onClick={() => handleFeatureToggle(feature as any)}
                disabled={!globalEnabled || !siteEnabled}
                className={`w-10 h-5 rounded-full transition-colors ${
                  enabled && globalEnabled && siteEnabled ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  enabled && globalEnabled && siteEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}
        </div>

      </div>

      {/* Raw Storage Data */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">📊 Raw Storage Data</h4>
        <details className="text-xs">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
            Show chrome.storage.local data
          </summary>
          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(permissionData, null, 2)}
          </pre>
        </details>
      </div>

      {/* Migration Info */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
        <h4 className="font-semibold text-sm text-yellow-800 mb-1">🔄 Migration Status</h4>
        <p className="text-xs text-yellow-700">
          This demo shows the unified permission system storing all data in chrome.storage.local
          instead of the complex multi-layer system (IndexedDB + chrome.storage.local + chrome.storage.sync).
        </p>
      </div>

    </div>
  );
};
