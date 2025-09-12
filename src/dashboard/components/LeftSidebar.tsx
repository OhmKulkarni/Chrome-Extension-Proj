import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  BarChart3,
  TrendingUp,
  PieChart,
  Settings,
  MonitorSpeaker,
  Lock,
  Unlock
} from 'lucide-react';

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
  sidebarMode: 'logging' | 'base';
  onModeChange: (mode: 'logging' | 'base') => void;
  tabsLoggingStatus: TabLoggingStatus[];
  onTabNetworkLoggingToggle: (tabId: number) => void;
  onTabErrorLoggingToggle: (tabId: number) => void;
  onTabTokenLoggingToggle: (tabId: number) => void;
  stats: SidebarStats;
  onMainViewChange: (view: 'dataTables' | 'statisticsDashboard' | 'settings' | 'timeline') => void;
  currentMainView: 'dataTables' | 'statisticsDashboard' | 'settings' | 'timeline';
  onLockStateChange?: (isLocked: boolean) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  sidebarMode,
  onModeChange,
  tabsLoggingStatus,
  onTabNetworkLoggingToggle,
  onTabErrorLoggingToggle,
  onTabTokenLoggingToggle,
  stats,
  onMainViewChange,
  currentMainView,
  onLockStateChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const _handleLockToggle = () => {
    const _newLockState = !isLocked;
    setIsLocked(newLockState);
    if (onLockStateChange) {
      onLockStateChange(newLockState);
    }
  };

  const _filteredTabs = tabsLoggingStatus.filter(tab =>
    tab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tab.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const _renderModeSelector = () => (
    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-4">
      <button
        onClick={() => onModeChange('base')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          sidebarMode === 'base'
            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => onModeChange('logging')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          sidebarMode === 'logging'
            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        Logging
      </button>
    </div>
  );

  const _renderBaseMode = () => (
    <div className="space-y-6">
      {/* Quick Analysis Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Analysis</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Network Requests</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{stats.totalRequests}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Console Errors</span>
            <span className="font-medium text-red-600 dark:text-red-400">{stats.totalErrors}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Token Events</span>
            <span className="font-medium text-green-600 dark:text-green-400">{stats.totalTokenEvents}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Active Logging</span>
            <span className="font-medium text-purple-600 dark:text-purple-400">{stats.activeLoggingTabs} tabs</span>
          </div>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => onMainViewChange('dataTables')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
              currentMainView === 'dataTables'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Data Tables
          </button>
          <button
            onClick={() => onMainViewChange('timeline')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
              currentMainView === 'timeline'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Timeline View
          </button>
          <button
            onClick={() => onMainViewChange('statisticsDashboard')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
              currentMainView === 'statisticsDashboard'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Statistics Dashboard
          </button>
          <button
            onClick={() => onMainViewChange('settings')}
            className={`w-full px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
              currentMainView === 'settings'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <div className="border-t border-gray-200 dark:border-gray-600 my-3"></div>
          <button
            onClick={() => onModeChange('logging')}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <MonitorSpeaker className="w-4 h-4" />
            Manage Tab Logging
          </button>
        </div>
      </div>
    </div>
  );

  const _renderLoggingMode = () => (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={() => onModeChange('base')}
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Overview
      </button>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tabs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* Tab List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTabs.map((tab) => (
          <div key={tab.tabId} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
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
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={tab.title}>
                  {tab.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={tab.domain}>
                  {tab.domain}
                </p>

                {/* Logging Controls */}
                <div className="mt-2 space-y-1">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tab.networkLogging}
                      onChange={() => onTabNetworkLoggingToggle(tab.tabId)}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">Network</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tab.errorLogging}
                      onChange={() => onTabErrorLoggingToggle(tab.tabId)}
                      className="h-3 w-3 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">Errors</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={tab.tokenLogging}
                      onChange={() => onTabTokenLoggingToggle(tab.tabId)}
                      className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <span className="ml-2 text-xs text-gray-700 dark:text-gray-300">Tokens</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="relative"
      onMouseEnter={() => !isLocked && setIsHovered(true)}
      onMouseLeave={() => !isLocked && setIsHovered(false)}
    >
      {/* Hover Trigger Bar with Visual Indicator - only show when not locked */}
      {!isLocked && (
        <div className="fixed left-0 top-0 w-4 h-full z-30 cursor-pointer group">
          <div className="w-1 h-full bg-blue-500 opacity-30 group-hover:opacity-70 transition-opacity duration-200" />
          <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-3 h-12 bg-blue-500 opacity-50 group-hover:opacity-80 transition-opacity duration-200 rounded-r-md" />
        </div>
      )}

      {/* Control Panel - slides out on hover or stays visible when locked */}
      <div className={`fixed left-0 top-0 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-40 transition-transform duration-300 ease-in-out ${
        isLocked || isHovered ? 'translate-x-0' : '-translate-x-full'
      } w-80 shadow-lg`}>

        {/* Content */}
        <div className="h-full overflow-hidden">
          {/* Header with lock button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Control Panel</h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {isLocked ? 'Panel locked' : 'Hover to keep open'}
              </div>
              <button
                onClick={handleLockToggle}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  isLocked
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={isLocked ? 'Unlock panel' : 'Lock panel in place'}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="px-4 py-4 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Mode Selector */}
            {renderModeSelector()}

            {/* Mode Content */}
            {sidebarMode === 'base' && renderBaseMode()}
            {sidebarMode === 'logging' && renderLoggingMode()}
          </div>
        </div>
      </div>

      {/* Spacer for main content when panel is locked open */}
      <div className={`${isLocked ? 'w-80' : 'w-4'} transition-all duration-300`} />
    </div>
  );
};

export default LeftSidebar;
