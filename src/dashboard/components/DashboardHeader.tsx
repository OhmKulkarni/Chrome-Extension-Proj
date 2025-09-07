import React from 'react';

interface DashboardHeaderProps {
  // Simplified interface - no longer needs extension toggle props
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = () => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extension Dashboard</h1>
          <p className="text-gray-600">Monitor network requests, console errors, and system performance</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
