import React from 'react';
import { Trash2 } from 'lucide-react';

interface DashboardHeaderProps {
  onClearData?: () => void;
  isLoading?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onClearData,
  isLoading = false
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extension Dashboard</h1>
          <p className="text-gray-600">Monitor network requests, console errors, and system performance</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {onClearData && (
            <button
              onClick={onClearData}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
              title="Clear all stored data"
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
