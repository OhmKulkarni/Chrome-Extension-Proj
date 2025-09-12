// src/popup/components/UnifiedPopup.tsx
// Enhanced popup component using the Unified Permission System
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { UnifiedPermissionManager } from '../../utils/unified-permission-manager';

// Get unified permission manager singleton
const _unifiedPermissionManager = UnifiedPermissionManager.getInstance();

interface TabInfo {
  id: number;
  url: string;
  domain: string;
}

interface PermissionState {
  globalEnabled: boolean;
  siteEnabled: boolean;
  networkEnabled: boolean;
  consoleEnabled: boolean;
  tokensEnabled: boolean;
}

interface UnifiedPopupProps {
  className?: string;
}

const UnifiedPopup: React.FC<UnifiedPopupProps> = ({ className }) => {
  // State management
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({
    globalEnabled: true,
    siteEnabled: true,
    networkEnabled: true,
    consoleEnabled: true,
    tokensEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    networkLogs: 0,
    consoleLogs: 0,
    tokens: 0,
  });

  // Get current tab information
  const _getCurrentTab = useCallback(async (): Promise<TabInfo | null> => {
    try {
      const _tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const _tab = tabs[0];

      if (!tab?.id || !tab?.url) return null;

      const _url = new URL(tab.url);
      return {
        id: tab.id,
        url: tab.url,
        domain: url.hostname,
      };
    } catch (error) {
      // console.error('Error getting current tab:', error);
      return null;
    }
  }, []);

  // Load all permission states
  const _loadPermissions = useCallback(async () => {
    try {
      setLoading(true);

      const _tab = await getCurrentTab();
      if (!tab) return;

      setCurrentTab(tab);

      // Load all permissions using unified system
      const [globalEnabled, siteEnabled, networkEnabled, consoleEnabled, tokensEnabled] = await Promise.all([
        unifiedPermissionManager.isGlobalEnabled(),
        unifiedPermissionManager.isSiteEnabled(tab.domain),
        unifiedPermissionManager.isFeatureEnabled(tab.id, 'network'),
        unifiedPermissionManager.isFeatureEnabled(tab.id, 'console'),
        unifiedPermissionManager.isFeatureEnabled(tab.id, 'tokens'),
      ]);

      setPermissions({
        globalEnabled,
        siteEnabled,
        networkEnabled,
        consoleEnabled,
        tokensEnabled,
      });

      // Load statistics
      await loadStats(tab.id);

    } catch (error) {
      // console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentTab]);

  // Load statistics for current tab
  const _loadStats = useCallback(async (tabId: number) => {
    try {
      // Send message to background to get current stats
      const _response = await chrome.runtime.sendMessage({
        action: 'getTabStats',
        tabId,
      });

      if (response?.success) {
        setStats({
          networkLogs: response.stats.networkLogs || 0,
          consoleLogs: response.stats.consoleLogs || 0,
          tokens: response.stats.tokens || 0,
        });
      }
    } catch (error) {
      // console.log('Could not load stats:', error);
    }
  }, []);

  // Toggle global power
  const _toggleGlobalPower = useCallback(async () => {
    if (!currentTab) return;

    const _newState = !permissions.globalEnabled;

    // Update state immediately for responsive UI
    setPermissions(prev => ({ ...prev, globalEnabled: newState }));

    try {
      await unifiedPermissionManager.setGlobalEnabled(newState);

      // If disabling globally, all other permissions become inactive
      if (!newState) {
        setPermissions(prev => ({
          ...prev,
          siteEnabled: false,
          networkEnabled: false,
          consoleEnabled: false,
          tokensEnabled: false,
        }));
      } else {
        // If enabling globally, reload all permissions
        await loadPermissions();
      }
    } catch (error) {
      // console.error('Error toggling global power:', error);
      // Revert on error
      setPermissions(prev => ({ ...prev, globalEnabled: !newState }));
    }
  }, [currentTab, permissions.globalEnabled, loadPermissions]);

  // Toggle site-specific enable
  const _toggleSiteEnable = useCallback(async () => {
    if (!currentTab) return;

    const _newState = !permissions.siteEnabled;

    // Update state immediately for responsive UI
    setPermissions(prev => ({ ...prev, siteEnabled: newState }));

    try {
      await unifiedPermissionManager.setSiteEnabled(currentTab.domain, newState);

      // Update all feature permissions based on site state
      if (newState) {
        // Site enabled - reload individual feature states
        const [networkEnabled, consoleEnabled, tokensEnabled] = await Promise.all([
          unifiedPermissionManager.isFeatureEnabled(currentTab.id, 'network'),
          unifiedPermissionManager.isFeatureEnabled(currentTab.id, 'console'),
          unifiedPermissionManager.isFeatureEnabled(currentTab.id, 'tokens'),
        ]);

        setPermissions(prev => ({
          ...prev,
          networkEnabled,
          consoleEnabled,
          tokensEnabled,
        }));
      } else {
        // Site disabled - turn off all features
        setPermissions(prev => ({
          ...prev,
          networkEnabled: false,
          consoleEnabled: false,
          tokensEnabled: false,
        }));

        // Also disable features in unified system
        await Promise.all([
          unifiedPermissionManager.setFeatureEnabled(currentTab.id, 'network', false),
          unifiedPermissionManager.setFeatureEnabled(currentTab.id, 'console', false),
          unifiedPermissionManager.setFeatureEnabled(currentTab.id, 'tokens', false),
        ]);
      }

      // Notify content script of site state change
      try {
        await chrome.tabs.sendMessage(currentTab.id, {
          action: 'siteStateChanged',
          enabled: newState,
        });
      } catch (error) {
        // console.log('Could not notify content script:', error);
      }

    } catch (error) {
      // console.error('Error toggling site enable:', error);
      // Revert on error
      setPermissions(prev => ({ ...prev, siteEnabled: !newState }));
    }
  }, [currentTab, permissions.siteEnabled]);

  // Toggle individual features
  const _toggleFeature = useCallback(async (feature: 'network' | 'console' | 'tokens') => {
    if (!currentTab) return;

    const _currentState = permissions[`${ feature }Enabled` as keyof PermissionState] as boolean;
    const _newState = !currentState;

    // Update state immediately for responsive UI
    setPermissions(prev => ({ ...prev, [`${feature}Enabled`]: newState }));

    try {
      await unifiedPermissionManager.setFeatureEnabled(currentTab.id, feature, newState);

      // Notify content script of feature state change
      try {
        await chrome.tabs.sendMessage(currentTab.id, {
          action: 'featureStateChanged',
          feature,
          enabled: newState,
        });
      } catch (error) {
        // console.log('Could not notify content script:', error);
      }

      // Refresh stats after toggle
      await loadStats(currentTab.id);

    } catch (error) {
      // console.error(`Error toggling ${feature}:`, error);
      // Revert on error
      setPermissions(prev => ({ ...prev, [`${feature}Enabled`]: !newState }));
    }
  }, [currentTab, permissions, loadStats]);

  // Initialize on mount
  useEffect(() => {
    let _mounted = true;

    const _loadInitialData = async () => {
      if (mounted) {
        await loadPermissions();
      }
    };

    loadInitialData();

    // Set up permission change listener
    const _handlePermissionChange = () => {
      if (mounted) {
        loadPermissions();
      }
    };

    unifiedPermissionManager.addEventListener(handlePermissionChange);

    return () => {
      mounted = false;
      unifiedPermissionManager.removeEventListener(handlePermissionChange);
    };
  }, [loadPermissions]);

  // Periodically refresh stats (with cleanup)
  useEffect(() => {
    if (!currentTab) return;

    let _mounted = true;
    const _interval = setInterval(() => {
      if (mounted && currentTab) {
        loadStats(currentTab.id);
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentTab, loadStats]);

  if (loading) {
    return (
      <div className={`w-80 p-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Network Request Monitor</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentTab) {
    return (
      <div className={`w-80 p-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle>Network Request Monitor</CardTitle>
            <CardDescription>Unable to access current tab</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate effective states (hierarchical logic)
  const _effectiveGlobalEnabled = permissions.globalEnabled;
  const _effectiveSiteEnabled = effectiveGlobalEnabled && permissions.siteEnabled;
  const _effectiveNetworkEnabled = effectiveSiteEnabled && permissions.networkEnabled;
  const _effectiveConsoleEnabled = effectiveSiteEnabled && permissions.consoleEnabled;
  const _effectiveTokensEnabled = effectiveSiteEnabled && permissions.tokensEnabled;

  return (
    <div className={`w-80 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Network Request Monitor</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {currentTab.domain}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Power Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Extension Power</h3>
              <p className="text-sm text-gray-500">Master switch for entire extension</p>
            </div>
            <Switch
              checked={effectiveGlobalEnabled}
              onChange={toggleGlobalPower}
              disabled={loading}
            />
          </div>

          {/* Site-Specific Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Site Monitoring</h3>
              <p className="text-sm text-gray-500">Enable for {currentTab.domain}</p>
            </div>
            <Switch
              checked={effectiveSiteEnabled}
              onChange={toggleSiteEnable}
              disabled={loading || !effectiveGlobalEnabled}
            />
          </div>

          {/* Individual Feature Toggles */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700 text-sm">Feature Controls</h4>

            {/* Network Monitoring */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Network Requests</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {stats.networkLogs}
                </span>
              </div>
              <Switch
                checked={effectiveNetworkEnabled}
                onChange={() => toggleFeature('network')}
                disabled={loading || !effectiveSiteEnabled}
              />
            </div>

            {/* Console Monitoring */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Console Logs</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {stats.consoleLogs}
                </span>
              </div>
              <Switch
                checked={effectiveConsoleEnabled}
                onChange={() => toggleFeature('console')}
                disabled={loading || !effectiveSiteEnabled}
              />
            </div>

            {/* Token Detection */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Token Detection</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  {stats.tokens}
                </span>
              </div>
              <Switch
                checked={effectiveTokensEnabled}
                onChange={() => toggleFeature('tokens')}
                disabled={loading || !effectiveSiteEnabled}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => chrome.tabs.create({ url: '/src/dashboard/dashboard.html' })}
                className="flex-1"
              >
                Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadPermissions}
                disabled={loading}
                className="flex-1"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="text-center">
            <span className={`text-xs px-3 py-1 rounded-full ${
              effectiveGlobalEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {effectiveGlobalEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedPopup;
