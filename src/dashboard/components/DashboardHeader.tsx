import React from 'react';
import { Trash2, BarChart3 } from 'lucide-react';

interface DashboardHeaderProps {
  onClearData?: () => void;
  isLoading?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onClearData,
  isLoading = false
}) => {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 px-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Icon and Title Section */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg shadow-sm">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">Extension Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Monitor network requests, console errors, and system performance</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {onClearData && (
            <button
              onClick={onClearData}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
              title="Clear all stored data"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Clear Data
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
