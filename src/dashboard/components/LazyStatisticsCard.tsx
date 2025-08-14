import React, { lazy, Suspense } from 'react';

const StatisticsCard = lazy(() => import('./StatisticsCard'));

interface LazyStatisticsCardProps {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  totalRequests?: number;
  totalErrors?: number;
  totalTokenEvents?: number;
  onRefreshAnalysisData?: () => Promise<void>;
}

export const LazyStatisticsCard: React.FC<LazyStatisticsCardProps> = ({ 
  networkRequests,
  consoleErrors,
  tokenEvents,
  totalRequests,
  totalErrors,
  totalTokenEvents,
  onRefreshAnalysisData
}) => {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading statistics...</span>
        </div>
      </div>
    }>
      <StatisticsCard 
        networkRequests={networkRequests}
        consoleErrors={consoleErrors}
        tokenEvents={tokenEvents}
        totalRequests={totalRequests}
        totalErrors={totalErrors}
        totalTokenEvents={totalTokenEvents}
        onRefreshAnalysisData={onRefreshAnalysisData}
      />
    </Suspense>
  );
};

export default LazyStatisticsCard;
