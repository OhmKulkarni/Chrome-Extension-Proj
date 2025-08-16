import React from 'react';

interface DashboardHeaderProps {
  extensionEnabled: boolean;
  onExtensionToggle: (enabled: boolean) => void;
  onSidebarToggle?: () => void;
  isLoading?: boolean;
  hasActiveLogging?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  extensionEnabled,
  onExtensionToggle,
  isLoading = false
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extension Dashboard</h1>
          <p className="text-gray-600">Monitor network requests, console errors, and system performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Global Power Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Extension {extensionEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={extensionEnabled}
                onChange={(e) => onExtensionToggle(e.target.checked)}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className={`w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
            </label>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${extensionEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className={`text-sm font-medium ${extensionEnabled ? 'text-green-600' : 'text-gray-500'}`}>
              {isLoading ? 'Loading...' : extensionEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
