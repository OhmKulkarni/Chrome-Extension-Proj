import React, { useState, useEffect } from 'react';

interface TabLoggingStatus {
  tabId: number;
  url: string;
  title: string;
  domain: string;
  networkLogging: boolean;
  errorLogging: boolean;
  tokenLogging: boolean;
  favicon?: string;
}

interface SidebarStats {
  totalRequests: number;
  totalErrors: number;
  totalTokenEvents: number;
  activeLoggingTabs: number;
}

interface LeftSidebarProps {
  sidebarMode: 'logging' | 'settings' | 'base';
  onModeChange: (mode: 'logging' | 'settings' | 'base') => void;
  tabsLoggingStatus: TabLoggingStatus[];
  onTabNetworkLoggingToggle: (tabId: number) => void;
  onTabErrorLoggingToggle: (tabId: number) => void;
  onTabTokenLoggingToggle: (tabId: number) => void;
  onRefreshTabStatus: () => void;
  stats: SidebarStats;
  onMainViewChange: (view: 'dataTables' | 'statisticsDashboard' | 'settings' | 'timeline') => void;
  currentMainView: 'dataTables' | 'statisticsDashboard' | 'settings' | 'timeline';
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  sidebarMode,
  onModeChange,
  tabsLoggingStatus,
  onTabNetworkLoggingToggle,
  onTabErrorLoggingToggle,
  onTabTokenLoggingToggle,
  onRefreshTabStatus,
  stats,
  onMainViewChange,
  currentMainView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });

  // Load storage usage
  useEffect(() => {
    loadStorageUsage();
    const interval = setInterval(loadStorageUsage, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadStorageUsage = async () => {
    try {
      // Get Chrome storage usage
      const chromeUsage = await chrome.storage.local.getBytesInUse();
      
      // Get IndexedDB usage (estimate)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageUsage({
          used: (estimate.usage || 0) + chromeUsage,
          quota: estimate.quota || 0
        });
      } else {
        setStorageUsage({
          used: chromeUsage,
          quota: 1024 * 1024 * 1024 // 1GB fallback
        });
      }
    } catch (error) {
      console.error('Failed to load storage usage:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = (): number => {
    if (storageUsage.quota === 0) return 0;
    return (storageUsage.used / storageUsage.quota) * 100;
  };

  const filteredTabs = tabsLoggingStatus.filter(tab =>
    tab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tab.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html') });
  };

  const renderModeSelector = () => (
    <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
      <button
        onClick={() => onModeChange('base')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          sidebarMode === 'base'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => onModeChange('logging')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          sidebarMode === 'logging'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Logging
      </button>
      <button
        onClick={() => onModeChange('settings')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          sidebarMode === 'settings'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Settings
      </button>
    </div>
  );

  const renderBaseMode = () => (
    <div className="space-y-6">
      {/* Quick Analysis Card */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Analysis</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Network Requests</span>
            <span className="font-medium text-blue-600">{stats.totalRequests}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Console Errors</span>
            <span className="font-medium text-red-600">{stats.totalErrors}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Token Events</span>
            <span className="font-medium text-green-600">{stats.totalTokenEvents}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Active Logging</span>
            <span className="font-medium text-purple-600">{stats.activeLoggingTabs} tabs</span>
          </div>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => onMainViewChange('dataTables')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
              currentMainView === 'dataTables'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            📊 Data Tables
          </button>
          <button
            onClick={() => onMainViewChange('timeline')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
              currentMainView === 'timeline'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            📈 Timeline View
          </button>
          <button
            onClick={() => onMainViewChange('statisticsDashboard')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
              currentMainView === 'statisticsDashboard'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            � Statistics Dashboard
          </button>
          <button
            onClick={() => onMainViewChange('settings')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
              currentMainView === 'settings'
                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            ⚙️ Settings
          </button>
          <div className="border-t border-gray-200 my-3"></div>
          <button
            onClick={() => onModeChange('logging')}
            className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            🔧 Manage Tab Logging
          </button>
          <button
            onClick={openSettings}
            className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            🔗 Open Settings Page
          </button>
          <button
            onClick={onRefreshTabStatus}
            className="w-full px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderLoggingMode = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tabs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefreshTabStatus}
        className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Refresh Tab Status
      </button>

      {/* Tab List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTabs.map((tab) => (
          <div key={tab.tabId} className="bg-white rounded-lg p-3 shadow-sm border">
            <div className="flex items-start space-x-3">
              {tab.favicon && (
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-4 h-4 mt-1 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate" title={tab.title}>
                  {tab.title}
                </p>
                <p className="text-xs text-gray-500 truncate" title={tab.domain}>
                  {tab.domain}
                </p>
                
                {/* Logging Controls */}
                <div className="mt-2 space-y-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tab.networkLogging}
                      onChange={() => onTabNetworkLoggingToggle(tab.tabId)}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700">Network</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tab.errorLogging}
                      onChange={() => onTabErrorLoggingToggle(tab.tabId)}
                      className="h-3 w-3 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700">Errors</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tab.tokenLogging}
                      onChange={() => onTabTokenLoggingToggle(tab.tabId)}
                      className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700">Tokens</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsMode = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Settings Access</h3>
        <p className="text-sm text-gray-600 mb-3">
          Access full extension settings including data management, performance monitoring, and advanced configuration.
        </p>
        <button
          onClick={openSettings}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Open Settings Page
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Control Panel</h2>
        </div>

        {/* Mode Selector */}
        {renderModeSelector()}

        {/* Mode Content */}
        {sidebarMode === 'base' && renderBaseMode()}
        {sidebarMode === 'logging' && renderLoggingMode()}
        {sidebarMode === 'settings' && renderSettingsMode()}

        {/* Storage Usage Bar - Always at bottom */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Storage Usage</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Used: {formatBytes(storageUsage.used)}</span>
                <span>Total: {formatBytes(storageUsage.quota)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getStoragePercentage() > 80 ? 'bg-red-500' :
                    getStoragePercentage() > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                {getStoragePercentage().toFixed(1)}% used
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
