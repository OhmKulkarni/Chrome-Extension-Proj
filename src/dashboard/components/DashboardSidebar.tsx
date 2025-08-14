import React from 'react';

interface DashboardSidebarProps {
  tabLoggingEnabled: boolean;
  onTabLoggingToggle: (enabled: boolean) => void;
  currentDomain?: string;
  stats?: {
    totalRequests: number;
    totalErrors: number;
    totalTokens: number;
    activeConnections: number;
  };
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  tabLoggingEnabled,
  onTabLoggingToggle,
  currentDomain,
  stats = {
    totalRequests: 0,
    totalErrors: 0,
    totalTokens: 0,
    activeConnections: 0
  }
}) => {
  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 space-y-6">
      {/* Tab Logging Control */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Tab Monitoring
        </h3>
        <div className="flex items-center justify-between">
          <label htmlFor="tab-logging" className="text-sm font-medium">
            Enable Tab Logging
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="tab-logging"
              checked={tabLoggingEnabled}
              onChange={(e) => onTabLoggingToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {currentDomain && (
          <div className="mt-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
            </svg>
            <span className="text-sm text-gray-600">{currentDomain}</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Quick Stats
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Network Requests</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{stats.totalRequests}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Console Errors</span>
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">{stats.totalErrors}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Token Events</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{stats.totalTokens}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Connections</span>
            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{stats.activeConnections}</span>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          System Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Extension Active</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span className="text-sm text-gray-600">Storage Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span className="text-sm text-gray-600">Background Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
