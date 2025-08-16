import React, { lazy, Suspense } from 'react';

// Lazy load individual chart components to reduce bundle size
const HttpMethodDistributionChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.HttpMethodDistributionChart }))
);

const AvgResponseTimePerRouteChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.AvgResponseTimePerRouteChart }))
);

const AuthFailuresVsSuccessChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.AuthFailuresVsSuccessChart }))
);

const TopFrequentErrorsChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.TopFrequentErrorsChart }))
);

const RequestsOverTimeChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.RequestsOverTimeChart }))
);

const ErrorFrequencyOverTimeChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.ErrorFrequencyOverTimeChart }))
);

const LatencyOverTimeChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.LatencyOverTimeChart }))
);

const TrafficByEndpointChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.TrafficByEndpointChart }))
);

const StatusCodeBreakdownChartNew = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.StatusCodeBreakdownChartNew }))
);

const PayloadSizeDistributionChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.PayloadSizeDistributionChart }))
);

const RequestsByTimeOfDayChart = lazy(() => 
  import('./ChartComponents').then(module => ({ default: module.RequestsByTimeOfDayChart }))
);

// Loading component for chart suspense fallback
const ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-sm text-gray-600">Loading chart...</span>
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
