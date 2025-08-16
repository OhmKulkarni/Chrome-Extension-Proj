import React, { useState } from 'react';

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

interface DashboardSidebarProps {
  tabsLoggingStatus: TabLoggingStatus[];
  onTabNetworkLoggingToggle: (tabId: number) => void;
  onTabErrorLoggingToggle: (tabId: number) => void;
  onTabTokenLoggingToggle: (tabId: number) => void;
  onRefreshTabStatus: () => void;
  currentDomain?: string;
  stats?: {
    totalRequests: number;
    totalErrors: number;
    totalTokens: number;
    activeConnections: number;
  };
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  tabsLoggingStatus,
  onTabNetworkLoggingToggle,
  onTabErrorLoggingToggle,
  onTabTokenLoggingToggle,
  onRefreshTabStatus,
  stats = {
    totalRequests: 0,
    totalErrors: 0,
    totalTokens: 0,
    activeConnections: 0
  }
}) => {
  const [tabSearchTerm, setTabSearchTerm] = useState<string>('');

  // Filter tabs based on search term
  const filteredTabs = tabsLoggingStatus.filter(tab => 
    tab.title.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.domain.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.url.toLowerCase().includes(tabSearchTerm.toLowerCase())
  );

  return (
    <div className="w-80 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Page Logging Status</h2>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search pages, domains, URLs..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    <span className="text-sm text-gray-700">Network Requests</span>
                    <button
                      onClick={() => onTabNetworkLoggingToggle(tab.tabId)}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        tab.networkLogging ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          tab.networkLogging ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Error Logging Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Console Errors</span>
                    <button
                      onClick={() => onTabErrorLoggingToggle(tab.tabId)}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        tab.errorLogging ? 'bg-red-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          tab.errorLogging ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Token Logging Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Token Events</span>
                    <button
                      onClick={() => onTabTokenLoggingToggle(tab.tabId)}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                        tab.tokenLogging ? 'bg-yellow-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          tab.tokenLogging ? 'translate-x-5' : 'translate-x-0'
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

      {/* Quick Stats Section */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Quick Stats
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Network Requests</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{stats.totalRequests}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Console Errors</span>
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">{stats.totalErrors}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Token Events</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{stats.totalTokens}</span>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onRefreshTabStatus}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-md transition-colors"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default DashboardSidebar;
