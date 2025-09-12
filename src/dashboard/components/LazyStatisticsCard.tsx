import React, { lazy, Suspense } from 'react';

const _StatisticsCard = lazy(() => import('./StatisticsCard'));

interface LazyStatisticsCardProps {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  totalRequests?: number;
  totalErrors?: number;
  totalTokenEvents?: number;
  // REMOVED: onRefreshAnalysisData to eliminate infinite loops
}

export const LazyStatisticsCard: React.FC<LazyStatisticsCardProps> = ({
  networkRequests,
  consoleErrors,
  tokenEvents,
  totalRequests,
  totalErrors,
  totalTokenEvents
  // REMOVED: onRefreshAnalysisData to eliminate infinite loops
}) => {
  return (
    <Suspense fallback={
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
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
        // REMOVED: onRefreshAnalysisData to eliminate infinite loops
      />
    </Suspense>
  );
};

export default LazyStatisticsCard;
