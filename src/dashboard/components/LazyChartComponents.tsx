import React, { lazy, Suspense } from 'react';

// Lazy load individual chart components to reduce bundle size
const _HttpMethodDistributionChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.HttpMethodDistributionChart }))
);

const _AvgResponseTimePerRouteChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.AvgResponseTimePerRouteChart }))
);

const _AuthFailuresVsSuccessChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.AuthFailuresVsSuccessChart }))
);

const _TopFrequentErrorsChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.TopFrequentErrorsChart }))
);

const _RequestsOverTimeChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.RequestsOverTimeChart }))
);

const _ErrorFrequencyOverTimeChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.ErrorFrequencyOverTimeChart }))
);

const _LatencyOverTimeChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.LatencyOverTimeChart }))
);

const _TrafficByEndpointChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.TrafficByEndpointChart }))
);

const _StatusCodeBreakdownChartNew = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.StatusCodeBreakdownChartNew }))
);

const _PayloadSizeDistributionChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.PayloadSizeDistributionChart }))
);

const _RequestsByTimeOfDayChart = lazy(() =>
  import('./ChartComponents').then(module => ({ default: module.RequestsByTimeOfDayChart }))
);

// Loading component for chart suspense fallback
const _ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading chart...</span>
  </div>
);

// Wrapper component that provides suspense boundary for each chart
interface LazyChartWrapperProps {
  children: React.ReactNode;
}

const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({ children }) => (
  <Suspense fallback={<ChartLoadingSpinner />}>
    {children}
  </Suspense>
);

// Export lazy-loaded chart components with suspense wrappers
export {
  HttpMethodDistributionChart,
  AvgResponseTimePerRouteChart,
  AuthFailuresVsSuccessChart,
  TopFrequentErrorsChart,
  RequestsOverTimeChart,
  ErrorFrequencyOverTimeChart,
  LatencyOverTimeChart,
  TrafficByEndpointChart,
  StatusCodeBreakdownChartNew,
  PayloadSizeDistributionChart,
  RequestsByTimeOfDayChart,
  LazyChartWrapper,
  ChartLoadingSpinner
};
