import React from 'react';
import { PerformanceMonitoringDashboard } from './PerformanceMonitoringDashboard';

export const PerformanceTable: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Performance Monitoring</h2>
        <p className="text-xs text-gray-500 mt-1">Real-time performance metrics and system health indicators</p>
      </div>

      {/* Performance Dashboard */}
      <PerformanceMonitoringDashboard />
    </div>
  );
};

export default PerformanceTable;
