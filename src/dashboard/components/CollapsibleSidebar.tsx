import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

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

interface StorageUsage {
  bytes: number;
  percentage: number;
  isLoading: boolean;
}

interface CollapsibleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarMode: 'logging' | 'settings' | 'base';
  onModeChange: (mode: 'logging' | 'settings' | 'base') => void;

  // Logging props
  tabsLoggingStatus: TabLoggingStatus[];
  onTabNetworkLoggingToggle: (tabId: number) => void;
  onTabErrorLoggingToggle: (tabId: number) => void;
  onTabTokenLoggingToggle: (tabId: number) => void;
  onRefreshTabStatus: () => void;

  // Stats props
  stats: {
    totalRequests: number;
    totalErrors: number;
    totalTokens: number;
    activeConnections: number;
  };
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  isOpen,
  onClose,
  sidebarMode,
  onModeChange,
  tabsLoggingStatus,
  onTabNetworkLoggingToggle,
  onTabErrorLoggingToggle,
  onTabTokenLoggingToggle,
  onRefreshTabStatus,
  stats
}) => {
  const [tabSearchTerm, setTabSearchTerm] = useState<string>('');
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    bytes: 0,
    percentage: 0,
    isLoading: true
  });

  // Load storage usage when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadStorageUsage();
    }
  }, [isOpen]);

  // Load storage usage function from settings
  const loadStorageUsage = async () => {
    try {
      setStorageUsage(prev => ({ ...prev, isLoading: true }));

      // Get table counts for storage estimation
      const response = await chrome.runtime.sendMessage({
        action: 'getTableCounts'
      });

      if (response && response.success && response.data) {
        const tableCounts = response.data;
        let estimatedBytes = 0;

        // Calculate estimated size based on table counts
        if (tableCounts.apiCalls) {
          estimatedBytes += tableCounts.apiCalls * 9500; // ~9.5KB average
        }
        if (tableCounts.consoleErrors) {
          estimatedBytes += tableCounts.consoleErrors * 3200; // ~3.2KB average
        }
        if (tableCounts.tokenEvents) {
          estimatedBytes += tableCounts.tokenEvents * 1800; // ~1.8KB average
        }
        if (tableCounts.minifiedLibraries) {
          estimatedBytes += tableCounts.minifiedLibraries * 15000; // ~15KB average
        }

        const STORAGE_LIMIT = 100 * 1024 * 1024; // 100MB limit
        const percentage = (estimatedBytes / STORAGE_LIMIT) * 100;

        setStorageUsage({
          bytes: estimatedBytes,
          percentage: Math.min(percentage, 100),
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Failed to load storage usage:', error);
      setStorageUsage({ bytes: 0, percentage: 0, isLoading: false });
    }
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter tabs based on search term (only when in logging mode)
  const filteredTabs = sidebarMode === 'logging' ? tabsLoggingStatus.filter(tab =>
    tab.title.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.domain.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.url.toLowerCase().includes(tabSearchTerm.toLowerCase())
  ) : [];

  const renderBaseContent = () => (
    <div className="flex-1 p-4 space-y-4">
      {/* Mode Selector */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Controls</h3>
        <div className="space-y-1">
          <button
            onClick={() => onModeChange('logging')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Tab Logging
          </button>
          <button
            onClick={() => onModeChange('settings')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Network Requests</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{stats.totalRequests}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Console Errors</span>
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">{stats.totalErrors}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Token Events</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{stats.totalTokens}</span>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Storage Usage</h3>
        {storageUsage.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span className="text-xs text-gray-500">Loading...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">
                {formatBytes(storageUsage.bytes)} / 100 MB
              </span>
              <span className="font-medium">{storageUsage.percentage.toFixed(1)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  storageUsage.percentage < 50 ? 'bg-green-500' :
                  storageUsage.percentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
              ></div>
            </div>

            {storageUsage.percentage > 80 && (
              <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                ⚠️ High storage usage ({storageUsage.percentage.toFixed(1)}%)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderLoggingContent = () => (
    <>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search tabs..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={tabSearchTerm}
            onChange={(e) => setTabSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTabs.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredTabs.map((tab) => (
              <div key={tab.tabId} className="p-4 hover:bg-gray-50">
                {/* Tab Info */}
                <div className="flex items-center mb-3">
                  {tab.favicon && (
                    <img
                      src={tab.favicon}
                      alt=""
                      className="w-4 h-4 mr-2 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
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
                  </div>
                </div>

                {/* Toggle Controls */}
                <div className="space-y-2">
                  {/* Network Logging Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Network</span>
                    <button
                      onClick={() => onTabNetworkLoggingToggle(tab.tabId)}
                      className={`relative inline-flex flex-shrink-0 h-5 w-9 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        tab.networkLogging ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          tab.networkLogging ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Error Logging Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Errors</span>
                    <button
                      onClick={() => onTabErrorLoggingToggle(tab.tabId)}
                      className={`relative inline-flex flex-shrink-0 h-5 w-9 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        tab.errorLogging ? 'bg-red-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          tab.errorLogging ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Token Logging Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Tokens</span>
                    <button
                      onClick={() => onTabTokenLoggingToggle(tab.tabId)}
                      className={`relative inline-flex flex-shrink-0 h-5 w-9 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                        tab.tokenLogging ? 'bg-yellow-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          tab.tokenLogging ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center">
            <div className="text-gray-500 text-sm">
              {tabSearchTerm ? 'No tabs match your search' : 'No tabs available'}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onRefreshTabStatus}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-md transition-colors"
        >
          Refresh Status
        </button>
      </div>
    </>
  );

  const renderSettingsContent = () => (
    <div className="flex-1 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Settings</h3>
      <div className="text-sm text-gray-600">
        Use the main Settings panel for full configuration.
      </div>
      <button
        onClick={() => {/* TODO: Navigate to inline settings if integrated */}}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-4 rounded-md transition-colors flex items-center gap-2"
        disabled
      >
        <Settings size={16} />
        Settings Panel
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {sidebarMode === 'logging' ? 'Tab Logging' :
               sidebarMode === 'settings' ? 'Settings' : 'Dashboard Controls'}
            </h2>
            <div className="flex items-center gap-2">
              {(sidebarMode === 'logging' || sidebarMode === 'settings') && (
                <button
                  onClick={() => onModeChange('base')}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Back"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {sidebarMode === 'base' && renderBaseContent()}
          {sidebarMode === 'logging' && renderLoggingContent()}
          {sidebarMode === 'settings' && renderSettingsContent()}
        </div>
      </div>
    </>
  );
};

export default CollapsibleSidebar;
