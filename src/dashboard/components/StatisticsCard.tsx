import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowUpDown, BarChart3, TrendingUp, Layers, Monitor, ChevronDown, ChevronRight, List, LineChart, Search, Eye, EyeOff, RefreshCw, Activity, BookOpen, Megaphone, BarChart, Video, Shield, Library, Target, Settings, Film, Zap, Wrench, Globe, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { groupDataByDomain, DomainStats } from './domainUtils';
// Import the new shared data processing system
import { useSharedChartData } from '../hooks/useSharedChartData';
import { useChartSettingsRead } from '../hooks/useChartSettings';
import { isFeatureEnabled, withPerformanceMonitoring } from '../utils/featureFlags';
// Import domain chart components
import DomainChartsPanel from './DomainChartsPanel';
import LibraryModal from './LibraryModal';
import { useExpandedRows } from '../hooks/useExpandedRows';
// Import LibraryDetector for smart name truncation
import { LibraryDetector } from '../../background/utils/library-detector';
import {
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
  LazyChartWrapper
} from './LazyChartComponents';
import { SimpleTestChart } from './SimpleTestChart';

interface StatisticsCardProps {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  totalRequests?: number;
  totalErrors?: number;
  totalTokenEvents?: number;
  // REMOVED: onRefreshAnalysisData to eliminate infinite loops
}

interface GlobalStats {
  totalRequests: number;
  totalErrors: number;
  totalTokenEvents: number;
  uniqueDomains: number;
  maxResponseTime: number;
  requestsByMethod: { [method: string]: number };
  errorsBySeverity: { [severity: string]: number };
  tokensByType: { [type: string]: number };
  avgResponseTime: number;
  successRate: number;
}

interface ChartDefinition {
  name: string;
  type: 'line' | 'area' | 'bar' | 'stackedBar' | 'pie' | 'donut' | 'horizontalBar' | 'histogram';
  category: string;
  description: string;
  tooltip: string;
}

type ChartDefinitions = {
  [key: string]: ChartDefinition;
};

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  networkRequests,
  consoleErrors,
  tokenEvents,
  totalRequests,
  totalErrors,
  totalTokenEvents
  // REMOVED: onRefreshAnalysisData to eliminate infinite loops
}) => {
  // MEMORY LEAK FIX: AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize AbortController on mount
  useEffect(() => {
    abortControllerRef.current = new AbortController();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);
  // Debug mode: Add mock data for testing charts
  const DEBUG_MODE = false; // PRODUCTION: Set to false to disable mock data - prevents phantom statistics

  const generateMockData = () => {
    const now = Date.now();
    const domains = ['api.example.com', 'cdn.example.com', 'analytics.google.com', 'github.com', 'stackoverflow.com'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const statuses = [200, 201, 400, 401, 403, 404, 500, 502];

    const mockNetworkRequests = [];
    const mockConsoleErrors = [];
    const mockTokenEvents = [];

    // Generate network requests for the last 24 hours
    for (let i = 0; i < 100; i++) {
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const timestamp = now - Math.random() * 24 * 60 * 60 * 1000; // Random time in last 24h

      mockNetworkRequests.push({
        method,
        url: `https://${domain}/api/endpoint${Math.floor(Math.random() * 100)}`,
        main_domain: domain,
        domain,
        status,
        response_status: status,
        response_time: Math.floor(Math.random() * 500) + 50, // 50-550ms
        responseTime: Math.floor(Math.random() * 500) + 50,
        timestamp
      });
    }

    // Generate console errors
    const errorTypes = ['TypeError', 'ReferenceError', 'NetworkError', 'SyntaxError'];
    for (let i = 0; i < 20; i++) {
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const timestamp = now - Math.random() * 24 * 60 * 60 * 1000;

      mockConsoleErrors.push({
        message: `${errorType}: Sample error message ${i}`,
        error: errorType,
        type: errorType.toLowerCase(),
        level: 'error',
        main_domain: domain,
        domain,
        url: `https://${domain}/page${Math.floor(Math.random() * 10)}`,
        timestamp
      });
    }

    // Generate token events
    const tokenTypes = ['session', 'auth', 'api_key', 'csrf'];
    for (let i = 0; i < 30; i++) {
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const tokenType = tokenTypes[Math.floor(Math.random() * tokenTypes.length)];
      const timestamp = now - Math.random() * 24 * 60 * 60 * 1000;

      mockTokenEvents.push({
        type: tokenType,
        success: Math.random() > 0.2, // 80% success rate
        main_domain: domain,
        domain,
        url: `https://${domain}/auth/endpoint`,
        value: `${tokenType}_token_${Math.random().toString(36).substr(2, 9)}`,
        timestamp
      });
    }

    return { mockNetworkRequests, mockConsoleErrors, mockTokenEvents };
  };

  const { mockNetworkRequests, mockConsoleErrors, mockTokenEvents } = DEBUG_MODE ? generateMockData() : {
    mockNetworkRequests: [],
    mockConsoleErrors: [],
    mockTokenEvents: []
  };

  // PRODUCTION: Always use real data or empty arrays - no mock data fallbacks
  const debugNetworkRequests = networkRequests || [];
  const debugConsoleErrors = consoleErrors || [];
  const debugTokenEvents = tokenEvents || [];

  console.log('StatisticsCard Debug Data:');
  console.log('- Network Requests:', debugNetworkRequests?.length || 0, debugNetworkRequests);
  console.log('- Console Errors:', debugConsoleErrors?.length || 0, debugConsoleErrors);
  console.log('- Token Events:', debugTokenEvents?.length || 0, debugTokenEvents);
  const [globalSortConfig, setGlobalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'value',
    direction: 'desc'
  });

  const [domainSortConfig, setDomainSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'totalRequests',
    direction: 'desc'
  });

  // PERFORMANCE: Use our optimized expansion hook with safety limits
  const {
    isExpanded: isDomainExpanded,
    toggleRow: toggleDomainExpansion
  } = useExpandedRows(2); // Limit subdomain expansion to 2 domains

  // PERFORMANCE: Separate hook for chart expansion with stricter limits
  const {
    isExpanded: isDomainChartExpanded,
    toggleRow: toggleDomainCharts
  } = useExpandedRows(3); // Allow up to 3 domain charts simultaneously

  // Library modal state
  const [libraryModalDomain, setLibraryModalDomain] = useState<string | null>(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  // Library source domain dropdown state
  const [expandedLibraryDomains, setExpandedLibraryDomains] = useState<Set<string>>(new Set());

  const toggleLibraryModal = (domain: string) => {
    if (libraryModalDomain === domain && isLibraryModalOpen) {
      setIsLibraryModalOpen(false);
      setLibraryModalDomain(null);
    } else {
      setLibraryModalDomain(domain);
      setIsLibraryModalOpen(true);
    }
  };

  const toggleLibrarySourceDomains = (domain: string) => {
    const newExpanded = new Set(expandedLibraryDomains);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedLibraryDomains(newExpanded);
  };

  // Chart system state
  const [viewMode, setViewMode] = useState<'list' | 'charts'>('list');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [showAllCharts, setShowAllCharts] = useState(false);
  const [chartSearch, setChartSearch] = useState('');

  // Domain view mode state
  const [domainViewMode, setDomainViewMode] = useState<'stats' | 'libraries'>('stats');

  // Help section visibility state
  const [showHelp, setShowHelp] = useState(false);

  // Chart settings for performance control
  const { settings: chartSettings, isLoading: chartSettingsLoading } = useChartSettingsRead();

  // Analysis data state - larger dataset for accurate statistics
  const [analysisData, setAnalysisData] = useState<{
    networkRequests: any[];
    consoleErrors: any[];
    tokenEvents: any[];
    loaded: boolean;
    loading: boolean;
  }>({
    networkRequests: [],
    consoleErrors: [],
    tokenEvents: [],
    loaded: false,
    loading: false
  });

  // Shared chart data processing (when feature flag enabled)
  const sharedChartData = useSharedChartData(
    isFeatureEnabled('enableSharedChartData') ? analysisData : {
      networkRequests: [],
      consoleErrors: [],
      tokenEvents: [],
      loaded: false
    }
  );

  // Manual refresh trigger state
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);

  // User-selected analysis sample size (number of records to consider for stats)
  const [analysisLimit, setAnalysisLimit] = useState<number>(200);

  // Track actual number of records loaded for display
  const [actualRecordCounts, setActualRecordCounts] = useState<{
    networkRequests: number;
    consoleErrors: number;
    tokenEvents: number;
  }>({ networkRequests: 0, consoleErrors: 0, tokenEvents: 0 });

  // INFINITE LOOP PROTECTION: Use ref to track loading state without causing function recreations
  const isLoadingRef = useRef<boolean>(false);

  // Load analysis data for statistics calculations (uses selectable limit) - MEMORY LEAK SAFE
  const loadAnalysisData = withPerformanceMonitoring('StatisticsCard.loadAnalysisData',
    useCallback(async (limitOverride?: number) => {
      const limit = typeof limitOverride === 'number' ? limitOverride : analysisLimit;

      // INFINITE LOOP PROTECTION: Prevent concurrent calls
      if (isLoadingRef.current) {
        console.log('📊 StatisticsCard: Skipping load - already in progress');
        return;
      }

      try {
        console.log(`📊 StatisticsCard: Loading analysis data with limit ${limit}`);

        // Set loading state in both ref and state
        isLoadingRef.current = true;
        setAnalysisData(prev => ({ ...prev, loading: true }));

        // Use the new getAnalysisData endpoint for efficient chart data loading
        const response = await chrome.runtime.sendMessage({
          action: 'getAnalysisData',
          limit
        });

        if (response?.success && response?.data) {
          // Set new data
          setAnalysisData({
            networkRequests: response.data.networkRequests || [],
            consoleErrors: response.data.consoleErrors || [],
            tokenEvents: response.data.tokenEvents || [],
            loaded: true,
            loading: false
          });

          // Track actual record counts for display
          setActualRecordCounts({
            networkRequests: response.data.networkRequests?.length || 0,
            consoleErrors: response.data.consoleErrors?.length || 0,
            tokenEvents: response.data.tokenEvents?.length || 0
          });

          console.log('✅ StatisticsCard: Analysis data loaded:', {
            limit,
            networkRequests: response.data.networkRequests?.length || 0,
            consoleErrors: response.data.consoleErrors?.length || 0,
            tokenEvents: response.data.tokenEvents?.length || 0,
            sharedProcessing: isFeatureEnabled('enableSharedChartData')
          });
        } else {
          console.warn('⚠️ StatisticsCard: Failed to load analysis data:', response);
          setAnalysisData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('❌ StatisticsCard: Error loading analysis data:', error);
        setAnalysisData(prev => ({ ...prev, loading: false }));
      } finally {
        // Always clear the loading ref
        isLoadingRef.current = false;
      }
    }, [analysisLimit])
  );

  // Smart refresh logic based on chart settings - FIXED: Remove loadAnalysisData dependency to prevent infinite loops
  useEffect(() => {
    // Always load initial data regardless of mode
    if (!analysisData.loaded) {
      console.log('📊 StatisticsCard: Loading initial data');
      loadAnalysisData(analysisLimit);
      return;
    }

    // Only setup auto-refresh if settings are loaded and auto mode is enabled
    if (chartSettingsLoading || chartSettings.refreshMode !== 'auto') {
      console.log('📊 StatisticsCard: Skipping auto-refresh setup', {
        loading: chartSettingsLoading,
        mode: chartSettings.refreshMode
      });
      return;
    }

    // Setup auto-refresh with memory leak protection
    const refreshInterval = (chartSettings.refreshInterval || 30) * 1000; // Convert to ms
    console.log(`📊 StatisticsCard: Setting up auto-refresh every ${refreshInterval}ms`);

    const intervalId = setInterval(() => {
      console.log('🔄 StatisticsCard: Auto-refresh triggered');
      loadAnalysisData(analysisLimit);
    }, refreshInterval);

    return () => {
      console.log('📊 StatisticsCard: Cleaning up auto-refresh interval');
      clearInterval(intervalId);
    };
    // CRITICAL FIX: Remove loadAnalysisData from dependencies to prevent infinite loops
    // FIXED: Added analysisLimit dependency to ensure refresh uses current limit
  }, [chartSettings.refreshMode, chartSettings.refreshInterval, chartSettingsLoading, analysisData.loaded, analysisLimit]);

  // Manual refresh effect - triggers when manual refresh is requested - FIXED: Remove loadAnalysisData dependency
  useEffect(() => {
    if (manualRefreshTrigger > 0) {
      console.log('🔄 StatisticsCard: Manual refresh effect triggered');
      loadAnalysisData(analysisLimit);
    }
    // CRITICAL FIX: Remove loadAnalysisData from dependencies to prevent infinite loops
    // FIXED: Added analysisLimit dependency to ensure manual refresh uses current limit
  }, [manualRefreshTrigger, analysisLimit]);

  // Manual refresh function
  const triggerManualRefresh = useCallback(() => {
    console.log('🔄 StatisticsCard: Manual refresh triggered by user');
    setManualRefreshTrigger(prev => prev + 1);
  }, []);

  // REMOVED: refreshAnalysisData function to eliminate infinite loops
  // Use triggerManualRefresh for all manual refresh operations

  // REMOVED: useEffect with onRefreshAnalysisData to eliminate infinite loops and circular dependencies

  // Chart definitions based on user requirements
  const chartDefinitions: ChartDefinitions = useMemo(() => ({
    // Time-Series Charts
    'requests-over-time': {
      name: 'Requests Over Time',
      type: 'line' as const,
      category: 'Time-Series',
      description: 'Track total API requests daily/hourly over time',
      tooltip: 'Shows request volume trends to identify traffic patterns'
    },
    'error-frequency-over-time': {
      name: 'Error Frequency Over Time',
      type: 'area' as const,
      category: 'Time-Series',
      description: 'Track 4xx/5xx errors over time',
      tooltip: 'Monitor error trends to identify system issues'
    },
    'latency-over-time': {
      name: 'Latency Over Time',
      type: 'line' as const,
      category: 'Time-Series',
      description: 'Response time (avg, max, min) trend',
      tooltip: 'Track performance trends and identify slow periods'
    },
    'traffic-by-endpoint': {
      name: 'Traffic by Endpoint',
      type: 'bar' as const,
      category: 'Time-Series',
      description: 'Most/least called endpoints over time',
      tooltip: 'Identify hottest endpoints and usage patterns'
    },
    'method-usage-daily': {
      name: 'Method Usage (Daily)',
      type: 'stackedBar' as const,
      category: 'Time-Series',
      description: 'How often each HTTP method is used over time',
      tooltip: 'See HTTP method distribution changes over time'
    },

    // Distribution & Count Charts
    'http-method-distribution': {
      name: 'HTTP Method Distribution',
      type: 'pie' as const,
      category: 'Distributions',
      description: 'GET vs POST vs PATCH, etc.',
      tooltip: 'Overall breakdown of HTTP methods used'
    },
    'status-code-breakdown': {
      name: 'Status Code Breakdown',
      type: 'donut' as const,
      category: 'Distributions',
      description: '2xx vs 4xx vs 5xx ratios',
      tooltip: 'Success vs error rate breakdown'
    },
    'top-frequent-errors': {
      name: 'Top 5 Frequent Errors',
      type: 'horizontalBar' as const,
      category: 'Distributions',
      description: 'Which error types are most common',
      tooltip: 'Identify the most problematic error types'
    },
    'payload-size-distribution': {
      name: 'Payload Size Distribution',
      type: 'histogram' as const,
      category: 'Distributions',
      description: 'Frequency of different response sizes',
      tooltip: 'Understand typical response payload sizes'
    },

    // Performance & Experience Charts
    'avg-response-time-per-route': {
      name: 'Avg Response Time (per route)',
      type: 'horizontalBar' as const,
      category: 'Performance',
      description: 'Sorted by slowest endpoints',
      tooltip: 'Identify performance bottlenecks by endpoint'
    },
    'auth-failures-vs-success': {
      name: 'Auth Failures vs Success',
      type: 'pie' as const,
      category: 'Performance',
      description: 'Token expired vs invalid vs success',
      tooltip: 'Authentication success/failure analysis'
    },
    'requests-by-time-of-day': {
      name: 'Requests by Time of Day',
      type: 'area' as const,
      category: 'Performance',
      description: 'Peak traffic hours',
      tooltip: 'Identify peak usage times and traffic patterns'
    }
  }), []);

  // Filtered charts based on search
  const filteredCharts = useMemo(() => {
    const charts = Object.entries(chartDefinitions);
    if (!chartSearch.trim()) return charts;

    const searchLower = chartSearch.toLowerCase();
    return charts.filter(([, chart]) =>
      chart.name.toLowerCase().includes(searchLower) ||
      chart.description.toLowerCase().includes(searchLower) ||
      chart.category.toLowerCase().includes(searchLower)
    );
  }, [chartDefinitions, chartSearch]);

  // Chart renderer function with error boundary
  const renderChart = (chartKey: string) => {
    try {
      // Use analysis data for charts when available for better accuracy
      const useAnalysisData = analysisData.loaded && analysisData.networkRequests.length > 0;

      const effectiveNetworkRequests = useAnalysisData
        ? analysisData.networkRequests
        : (DEBUG_MODE && (!networkRequests || networkRequests.length === 0) ? mockNetworkRequests : networkRequests);

      const effectiveConsoleErrors = useAnalysisData
        ? analysisData.consoleErrors
        : (DEBUG_MODE && (!consoleErrors || consoleErrors.length === 0) ? mockConsoleErrors : consoleErrors);

      const effectiveTokenEvents = useAnalysisData
        ? analysisData.tokenEvents
        : (DEBUG_MODE && (!tokenEvents || tokenEvents.length === 0) ? mockTokenEvents : tokenEvents);

      const chartData = {
        data: globalStats,
        networkRequests: effectiveNetworkRequests,
        consoleErrors: effectiveConsoleErrors,
        tokenEvents: effectiveTokenEvents,
        sharedData: isFeatureEnabled('enableSharedChartData') ? sharedChartData : undefined
      };

      console.log('Rendering chart:', chartKey, 'with data:', {
        useAnalysisData,
        networkRequests: effectiveNetworkRequests?.length || 0,
        consoleErrors: effectiveConsoleErrors?.length || 0,
        tokenEvents: effectiveTokenEvents?.length || 0,
        dataSource: useAnalysisData ? `analysis (${analysisLimit} records)` : 'current page (10 records)'
      });

      // MEMORY LEAK FIX: Add detailed logging for method-usage-daily chart
      if (chartKey === 'method-usage-daily') {
        console.log('MethodUsageDailyChart - Detailed data inspection:');
        console.log('- debugNetworkRequests type:', typeof debugNetworkRequests);
        console.log('- debugNetworkRequests isArray:', Array.isArray(debugNetworkRequests));
        console.log('- Sample request data:', debugNetworkRequests?.[0]);
        console.log('- Sample timestamp:', debugNetworkRequests?.[0]?.timestamp);
        console.log('- Sample method:', debugNetworkRequests?.[0]?.method);
      }

      // MEMORY LEAK FIX: Add null checks for chart data
      if (!chartData.networkRequests) {
        console.warn('Chart rendering skipped - no network requests data');
        return (
          <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p>No data available for chart</p>
              <p className="text-xs mt-2">Network requests data is missing</p>
            </div>
          </div>
        );
      }

      switch (chartKey) {
        case 'requests-over-time':
          return (
            <LazyChartWrapper>
              <RequestsOverTimeChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'http-method-distribution':
          return (
            <LazyChartWrapper>
              <HttpMethodDistributionChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'status-code-breakdown':
          return (
            <LazyChartWrapper>
              <StatusCodeBreakdownChartNew {...chartData} />
            </LazyChartWrapper>
          );
        case 'avg-response-time-per-route':
          return (
            <LazyChartWrapper>
              <AvgResponseTimePerRouteChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'auth-failures-vs-success':
          return (
            <LazyChartWrapper>
              <AuthFailuresVsSuccessChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'top-frequent-errors':
          return (
            <LazyChartWrapper>
              <TopFrequentErrorsChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'error-frequency-over-time':
          return (
            <LazyChartWrapper>
              <ErrorFrequencyOverTimeChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'latency-over-time':
          return (
            <LazyChartWrapper>
              <LatencyOverTimeChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'traffic-by-endpoint':
          return (
            <LazyChartWrapper>
              <TrafficByEndpointChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'method-usage-daily':
          try {
            console.log('About to render SimpleTestChart instead of MethodUsageDailyChart');
            return <SimpleTestChart networkRequests={chartData.networkRequests} />;
          } catch (chartError) {
            console.error('SimpleTestChart specific error:', chartError);
            return (
              <div className="h-96 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                <div className="text-center text-red-600">
                  <p className="font-medium">Simple Test Chart Error</p>
                  <p className="text-sm mt-2">Even the simple chart failed to render</p>
                  <p className="text-xs mt-1">{chartError instanceof Error ? chartError.message : 'Unknown error'}</p>
                </div>
              </div>
            );
          }
        case 'payload-size-distribution':
          return (
            <LazyChartWrapper>
              <PayloadSizeDistributionChart {...chartData} />
            </LazyChartWrapper>
          );
        case 'requests-by-time-of-day':
          return (
            <LazyChartWrapper>
              <RequestsByTimeOfDayChart {...chartData} />
            </LazyChartWrapper>
          );
        default:
          return (
            <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
              <div className="text-center text-gray-400">
                <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Chart Implementation Pending</p>
                <p className="text-sm">
                  {chartDefinitions[chartKey]?.name} ({chartDefinitions[chartKey]?.type})
                </p>
                <p className="text-xs mt-2 max-w-md mx-auto">
                  {chartDefinitions[chartKey]?.tooltip}
                </p>
              </div>
            </div>
          );
      }
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <div className="h-96 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-medium">Chart Error</p>
            <p className="text-sm mt-2">Failed to render {chartDefinitions[chartKey]?.name}</p>
            <p className="text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  };

  // Calculate global statistics - MEMORY LEAK FIX: Batch processing with abort signal
  const globalStats: GlobalStats = useMemo(() => {
    // Check if we should abort processing
    const isAborted = abortControllerRef.current?.signal.aborted;
    console.log('🔍 GlobalStats useMemo starting:', { isAborted, analysisDataLoaded: analysisData.loaded });

    if (isAborted) {
      console.log('⚠️ GlobalStats calculation aborted');
      return {
        totalRequests: 0,
        totalErrors: 0,
        totalTokenEvents: 0,
        uniqueDomains: 0,
        maxResponseTime: 0,
        requestsByMethod: {},
        errorsBySeverity: {},
        tokensByType: {},
        avgResponseTime: 0,
        successRate: 0
      };
    }

    // CONSISTENCY FIX: Use the exact same logic as charts for data source selection
    // FALLBACK SAFETY: Only use real data or empty arrays - no random mock data in production
    const useAnalysisData = analysisData.loaded && analysisData.networkRequests.length > 0;

    const effectiveNetworkRequests = useAnalysisData
      ? analysisData.networkRequests
      : []; // PRODUCTION: Always use empty array when no data, never mock data

    const effectiveConsoleErrors = useAnalysisData
      ? analysisData.consoleErrors
      : []; // PRODUCTION: Always use empty array when no data

    const effectiveTokenEvents = useAnalysisData
      ? analysisData.tokenEvents
      : []; // PRODUCTION: Always use empty array when no data

    console.log('GlobalStats calculation with data:', {
      useAnalysisData,
      networkRequests: effectiveNetworkRequests?.length || 0,
      consoleErrors: effectiveConsoleErrors?.length || 0,
      tokenEvents: effectiveTokenEvents?.length || 0,
      analysisLoaded: analysisData.loaded,
      analysisNetworkLength: analysisData.networkRequests?.length || 0,
      dataSource: useAnalysisData ? 'analysis (latest N records)' : 'current page'
    });

    const calculatedTotalRequests = effectiveNetworkRequests.length;
    const calculatedTotalErrors = effectiveConsoleErrors.length;
    const calculatedTotalTokenEvents = effectiveTokenEvents.length;

    // CONSISTENCY FIX: When using analysis data, use calculated totals from that data, not global props
    const finalTotalRequests = useAnalysisData ? calculatedTotalRequests : (totalRequests ?? calculatedTotalRequests);
    const finalTotalErrors = useAnalysisData ? calculatedTotalErrors : (totalErrors ?? calculatedTotalErrors);
    const finalTotalTokenEvents = useAnalysisData ? calculatedTotalTokenEvents : (totalTokenEvents ?? calculatedTotalTokenEvents);

    // MEMORY EFFICIENT: Process data in batches to avoid blocking UI
    const batchSize = 50;
    const uniqueDomainsSet = new Set();
    const requestsByMethod: { [method: string]: number } = {};
    const errorsBySeverity: { [severity: string]: number } = {};
    const tokensByType: { [type: string]: number } = {};
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let maxResponseTimeCalculated = 0;
    let successCount = 0;

    // Process network requests in batches
    for (let i = 0; i < effectiveNetworkRequests.length; i += batchSize) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = effectiveNetworkRequests.slice(i, i + batchSize);
      batch.forEach(req => {
        // Extract domains
        const itemUrl = req.url || req.request?.url || '';
        if (itemUrl && itemUrl !== 'unknown') {
          try {
            const hostname = new URL(itemUrl).hostname;
            const mainDomain = req.main_domain || hostname.replace(/^www\./, '').toLowerCase();
            if (mainDomain && mainDomain !== 'unknown') {
              uniqueDomainsSet.add(mainDomain);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }

        // Method tracking
        const method = req.method || req.request_method || 'GET';
        requestsByMethod[method] = (requestsByMethod[method] || 0) + 1;

        // Response time tracking
        const responseTime = req.response_time || req.responseTime || 0;
        if (responseTime > 0) {
          totalResponseTime += responseTime;
          responseTimeCount++;
          maxResponseTimeCalculated = Math.max(maxResponseTimeCalculated, responseTime);
        }

        // Success rate tracking - use same status field detection as chart
        const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 0;
        if (status >= 200 && status < 400) {
          successCount++;
        }
      });
    }

    // Process console errors in batches for domain and severity tracking
    for (let i = 0; i < effectiveConsoleErrors.length; i += batchSize) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = effectiveConsoleErrors.slice(i, i + batchSize);
      batch.forEach(error => {
        // Extract domains
        const itemUrl = error.url || error.details?.url || error.source_url || '';
        if (itemUrl && itemUrl !== 'unknown' && itemUrl !== 'Unknown' && itemUrl !== 'Unknown URL') {
          try {
            const hostname = new URL(itemUrl).hostname;
            const mainDomain = error.main_domain || hostname.replace(/^www\./, '').toLowerCase();
            if (mainDomain && mainDomain !== 'unknown') {
              uniqueDomainsSet.add(mainDomain);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }

        // Severity tracking
        const severity = error.severity || 'error';
        errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + 1;
      });
    }

    // Process token events in batches for domain and type tracking
    for (let i = 0; i < effectiveTokenEvents.length; i += batchSize) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = effectiveTokenEvents.slice(i, i + batchSize);
      batch.forEach(token => {
        // Extract domains
        const itemUrl = token.url || token.details?.url || token.source_url || '';
        if (itemUrl && itemUrl !== 'unknown' && itemUrl !== 'Unknown' && itemUrl !== 'Unknown URL') {
          try {
            const hostname = new URL(itemUrl).hostname;
            const mainDomain = token.main_domain || hostname.replace(/^www\./, '').toLowerCase();
            if (mainDomain && mainDomain !== 'unknown') {
              uniqueDomainsSet.add(mainDomain);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }

        // Token type tracking
        let type = 'Unknown';
        if (token.token_type) {
          type = token.token_type;
        } else if (token.type) {
          type = token.type;
        } else if (token.headers && token.headers.authorization) {
          type = 'Bearer Token';
        } else if (token.headers && (token.headers['x-api-key'] || token.headers['X-API-Key'])) {
          type = 'API Key';
        }

        tokensByType[type] = (tokensByType[type] || 0) + 1;
      });
    }

    // Calculate final statistics
    const avgResponseTime = responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0;
    const successRate = finalTotalRequests > 0 ? Math.round((successCount / finalTotalRequests) * 100) : 0;

    console.log('Success Rate Debug:', {
      successCount,
      finalTotalRequests,
      successRate,
      sampleStatuses: effectiveNetworkRequests.slice(0, 5).map(req => ({
        status: req.status,
        response_status: req.response_status,
        statusCode: req.statusCode,
        response: req.response?.status,
        finalStatus: req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 0
      }))
    });

    return {
      totalRequests: finalTotalRequests,
      totalErrors: finalTotalErrors,
      totalTokenEvents: finalTotalTokenEvents,
      uniqueDomains: uniqueDomainsSet.size,
      maxResponseTime: maxResponseTimeCalculated,
      requestsByMethod,
      errorsBySeverity,
      tokensByType,
      avgResponseTime,
      successRate
    };

  }, [analysisData]);

  // Domain statistics state
  const [domainStats, setDomainStats] = useState<DomainStats[]>([]);

  // Calculate domain-specific statistics with enhanced grouping
  useEffect(() => {
    const loadDomainStats = async () => {
      try {
        // CONSISTENCY FIX: Use the exact same logic as charts for data source selection
        const useAnalysisData = analysisData.loaded && analysisData.networkRequests.length > 0;

        const effectiveNetworkRequests = useAnalysisData
          ? analysisData.networkRequests
          : (DEBUG_MODE ? mockNetworkRequests : []);

        const effectiveConsoleErrors = useAnalysisData
          ? analysisData.consoleErrors
          : (DEBUG_MODE ? mockConsoleErrors : []);

        const effectiveTokenEvents = useAnalysisData
          ? analysisData.tokenEvents
          : (DEBUG_MODE ? mockTokenEvents : []);

        const allData = [...effectiveNetworkRequests, ...effectiveConsoleErrors, ...effectiveTokenEvents];

        // DEBUG: Very visible logging to check data structure
        console.log('🚨🚨🚨 DASHBOARD DEBUG START 🚨🚨🚨');
        console.log('📊 Analysis data loaded:', analysisData.loaded);
        console.log('📊 Use analysis data:', useAnalysisData);
        console.log('📊 Total items before domain grouping:', allData.length);
        console.log('📊 Network requests count:', effectiveNetworkRequests.length);
        console.log('📊 Analysis data network requests:', analysisData.networkRequests?.length);

        // DEBUG: Log actual URLs to see if CNN.io requests are present
        console.log('📊 Network request URLs:', effectiveNetworkRequests.map(req => req.url?.substring(0, 60)));

        console.log('🔍 BEFORE DOMAIN GROUPING - First 3 items structure:', allData.slice(0, 3).map(item => ({
          url: item.url?.substring(0, 60),
          itemKeys: Object.keys(item),
          hasMainDomain: 'mainDomain' in item,
          hasMain_domain: 'main_domain' in item,
          mainDomainValue: item.mainDomain,
          main_domainValue: (item as any).main_domain,
          type: item.type || 'unknown'
        })));
        console.log('🚨🚨🚨 DASHBOARD DEBUG END 🚨🚨🚨');

        const stats = await groupDataByDomain(allData);
        setDomainStats(stats);
      } catch (error) {
        console.error('Failed to load domain statistics:', error);
        setDomainStats([]);
      }
    };

    loadDomainStats();
  }, [analysisData]);

  // Sorting functions
  const handleGlobalSort = (key: string) => {
    setGlobalSortConfig({
      key,
      direction: globalSortConfig.key === key && globalSortConfig.direction === 'desc' ? 'asc' : 'desc'
    });
  };

  const handleDomainSort = (key: string) => {
    setDomainSortConfig({
      key,
      direction: domainSortConfig.key === key && domainSortConfig.direction === 'desc' ? 'asc' : 'desc'
    });
  };

  // Prepare sorted global stats for table
  const globalStatsTable = useMemo(() => {
    const stats = [
      // Network category metrics
      { metric: 'Total Requests', value: globalStats.totalRequests, category: 'Network' },
      { metric: 'Unique Domains', value: globalStats.uniqueDomains, category: 'Network' },
      ...Object.entries(globalStats.requestsByMethod).map(([method, count]) => ({
        metric: `${method} Requests`,
        value: count,
        category: 'Network'
      })),

      // Performance category metrics
      { metric: 'Success Rate', value: `${globalStats.successRate}%`, category: 'Performance' },
      { metric: 'Average Response Time', value: `${globalStats.avgResponseTime}ms`, category: 'Performance' },
      { metric: 'Max Response Time', value: `${globalStats.maxResponseTime}ms`, category: 'Performance' },

      // Console category metrics (Total Errors only - removed redundant ERROR Errors)
      { metric: 'Total Errors', value: globalStats.totalErrors, category: 'Console' },
      ...Object.entries(globalStats.errorsBySeverity)
        .filter(([severity]) => severity.toLowerCase() !== 'error') // Remove redundant 'error' severity to avoid duplication
        .map(([severity, count]) => ({
          metric: `${severity.toUpperCase()} Errors`,
          value: count,
          category: 'Console'
        })),

      // Auth category metrics
      { metric: 'Total Token Events', value: globalStats.totalTokenEvents, category: 'Auth' },
      ...Object.entries(globalStats.tokensByType).map(([type, count]) => ({
        metric: type,
        value: count,
        category: 'Auth'
      }))
    ];

    return stats.sort((a, b) => {
      if (globalSortConfig.key === 'metric') {
        return globalSortConfig.direction === 'asc'
          ? a.metric.localeCompare(b.metric)
          : b.metric.localeCompare(a.metric);
      } else if (globalSortConfig.key === 'value') {
        const aVal = typeof a.value === 'string' ? parseInt(a.value) || 0 : a.value;
        const bVal = typeof b.value === 'string' ? parseInt(b.value) || 0 : b.value;
        return globalSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      } else if (globalSortConfig.key === 'category') {
        return globalSortConfig.direction === 'asc'
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      return 0;
    });
  }, [globalStats, globalSortConfig]);

  // Prepare sorted domain stats
  const sortedDomainStats = useMemo(() => {
    return [...domainStats].sort((a, b) => {
      const key = domainSortConfig.key as keyof DomainStats;
      let aVal = a[key];
      let bVal = b[key];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return domainSortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        return domainSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [domainStats, domainSortConfig]);

  const SortButton: React.FC<{ column: string; currentSort: { key: string; direction: 'asc' | 'desc' }; onSort: (key: string) => void }> =
    ({ column, currentSort, onSort }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 lg:px-3"
        onClick={() => onSort(column)}
      >
        <ArrowUpDown className="h-4 w-4" />
        {currentSort.key === column && (
          <span className="ml-1">
            {currentSort.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </Button>
    );

  return (
    <Card className="w-full max-w-full mx-auto mb-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-blue-800">
          <BarChart3 className="h-6 w-6" />
          Extension Statistics Dashboard
        </CardTitle>
        <CardDescription className="text-blue-600">
          Comprehensive analytics for network requests, console errors, and authentication events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global" className="w-full">
        {/* Global Record Limit Selector and Refresh Controls */}
        <div className="flex justify-between items-center mb-4">
          {/* Manual Refresh Button (when manual mode is enabled) */}
          <div className="flex items-center gap-3">
            {/* Debug info - remove in production */}
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Mode: {chartSettings?.refreshMode || 'loading'} |
              Loading: {chartSettingsLoading ? 'yes' : 'no'}
            </div>

            {chartSettings?.refreshMode === 'manual' && (
              <Button
                onClick={triggerManualRefresh}
                variant="outline"
                size="sm"
                disabled={analysisData.loading}
                className={`flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 ${
                  analysisData.loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Manually refresh chart data"
              >
                <RefreshCw className={`h-4 w-4 ${analysisData.loading ? 'animate-spin' : ''}`} />
                {analysisData.loading ? 'Refreshing...' : 'Refresh Charts'}
              </Button>
            )}

            {/* Show button even when auto mode for testing */}
            {chartSettings?.refreshMode === 'auto' && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={triggerManualRefresh}
                  variant="outline"
                  size="sm"
                  disabled={analysisData.loading}
                  className={`flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 ${
                    analysisData.loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Force refresh (auto mode active)"
                >
                  <RefreshCw className={`h-4 w-4 ${analysisData.loading ? 'animate-spin' : ''}`} />
                  {analysisData.loading ? 'Force Refreshing...' : 'Force Refresh'}
                </Button>
                <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded font-medium">
                  🔄 Auto: {chartSettings.refreshInterval}s
                </div>
              </div>
            )}

            {/* Performance indicators */}
            {isFeatureEnabled('enableSharedChartData') && (
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                ⚡ Shared Processing Active
              </div>
            )}

            {sharedChartData.lastProcessed && isFeatureEnabled('enableStalenessTracking') && (
              <div className="text-xs text-gray-500">
                Last updated: {new Date(sharedChartData.lastProcessed).toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Records considered</label>
            <select
              value={analysisLimit}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setAnalysisLimit(isNaN(value) ? 200 : value);
              }}
              className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Number of most recent records used to compute all statistics and charts"
            >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={2000}>2000</option>
                <option value={5000}>5000</option>
                <option value={10000}>10000</option>
                <option value={-1}>All</option>
              </select>
              <span className="hidden md:inline text-xs text-gray-500">
                {actualRecordCounts.networkRequests > 0 && (
                  <span className="text-blue-600">
                    {actualRecordCounts.networkRequests} loaded
                  </span>
                )}
              </span>
            </div>
          </div>

          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Global Statistics
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Domain Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-4">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4" />
                  List View
                </Button>
                <Button
                  variant={viewMode === 'charts' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('charts')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Charts View
                </Button>
              </div>

              {viewMode === 'charts' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllCharts(!showAllCharts)}
                  className="flex items-center gap-2"
                >
                  {showAllCharts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showAllCharts ? 'Hide All Charts' : 'Show All Charts'}
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {viewMode === 'list' ? (
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-md border"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            Metric
                            <SortButton column="metric" currentSort={globalSortConfig} onSort={handleGlobalSort} />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            Value
                            <SortButton column="value" currentSort={globalSortConfig} onSort={handleGlobalSort} />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-2">
                            Category
                            <SortButton column="category" currentSort={globalSortConfig} onSort={handleGlobalSort} />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {globalStatsTable.map((stat, index) => (
                        <TableRow key={index} className="hover:bg-blue-50/50">
                          <TableCell className="font-medium">{stat.metric}</TableCell>
                          <TableCell className="font-semibold text-blue-700">{stat.value}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              stat.category === 'Network' ? 'bg-green-100 text-green-800' :
                              stat.category === 'Console' ? 'bg-red-100 text-red-800' :
                              stat.category === 'Auth' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {stat.category}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {globalStatsTable.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                            No statistics available yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </motion.div>
              ) : (
                <motion.div
                  key="charts-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Chart Search */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search charts..."
                        value={chartSearch}
                        onChange={(e) => setChartSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {showAllCharts ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredCharts.map(([chartKey, chart]) => (
                        <motion.div
                          key={chartKey}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 * filteredCharts.findIndex(([k]) => k === chartKey) }}
                          className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <h3 className="font-semibold text-lg mb-2">{chart.name}</h3>
                          <p className="text-sm text-gray-600 mb-4">{chart.description}</p>
                          <div className="bg-white rounded">
                            {renderChart(chartKey)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Selected Chart Full View - Now appears ABOVE chart options */}
                      {selectedChart && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.4 }}
                          className="bg-white border-2 border-blue-200 rounded-lg p-6 mb-6"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h2 className="text-xl font-semibold">{chartDefinitions[selectedChart].name}</h2>
                              <p className="text-gray-600">{chartDefinitions[selectedChart].description}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedChart(null)}
                            >
                              Close
                            </Button>
                          </div>
                          <div className="bg-white rounded">
                            {renderChart(selectedChart)}
                          </div>
                        </motion.div>
                      )}

                      {/* Chart Selection Cards - Now appears BELOW selected chart */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCharts.map(([chartKey, chart]) => (
                          <motion.div
                            key={chartKey}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * filteredCharts.findIndex(([k]) => k === chartKey) }}
                            className={`cursor-pointer border-2 rounded-lg p-4 transition-all hover:shadow-md ${
                              selectedChart === chartKey
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedChart(selectedChart === chartKey ? null : chartKey)}
                            title={chart.tooltip}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <LineChart className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm mb-1">{chart.name}</h3>
                                <p className="text-xs text-gray-600 mb-2">{chart.description}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {chart.category}
                                  </span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {chart.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {filteredCharts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-8 w-8 mx-auto mb-2" />
                      <p>No charts found matching "{chartSearch}"</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="domain" className="space-y-4">
            {/* Collapsible Help Section */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-200"
                title="Click to show/hide explanation of dashboard icons and features"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="font-medium">Dashboard Guide</span>
                {showHelp ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {showHelp && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 animate-in slide-in-from-top duration-200">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-blue-800">Dashboard Icons & Features Guide</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-700">
                      {/* Domain Status Icons */}
                      <div className="space-y-2">
                        <p className="font-medium text-blue-800">Domain Status Icons:</p>
                        <div className="space-y-1 ml-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3" />
                            <span>Grouped subdomains</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-3 w-3" />
                            <span>Main tab domain</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-3 w-3" />
                            <span>Open domain charts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3" />
                            <span>Show inline charts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-3 w-3" />
                            <span>Hide inline charts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChevronDown className="h-3 w-3" />
                            <span>Expand section</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-3 w-3" />
                            <span>Collapse section</span>
                          </div>
                        </div>
                      </div>

                      {/* Library Resource Type Icons */}
                      <div className="space-y-2">
                        <p className="font-medium text-blue-800">Resource Type Icons:</p>
                        <div className="space-y-1 ml-2">
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-3 w-3" />
                            <span>Advertising services</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart className="h-3 w-3" />
                            <span>Analytics tools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Video className="h-3 w-3" />
                            <span>Media/streaming</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            <span>API endpoints</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            <span>Privacy & security</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Library className="h-3 w-3" />
                            <span>Frameworks & libraries</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-3 w-3" />
                            <span>Tracking tools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Settings className="h-3 w-3" />
                            <span>Site tools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Film className="h-3 w-3" />
                            <span>Media tools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            <span>Performance tools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3 w-3" />
                            <span>Other resources</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Third Party Domain Explanation - Separate Section */}
                    <div className="pt-3 border-t border-blue-200">
                      <div className="space-y-2">
                        <p className="font-medium text-blue-800">Domain Labels:</p>
                        <div className="ml-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-teal-100 text-teal-800">3rd party domain</span>
                            <span>Indicates external/third-party domains (no icon by design - this is a classification label)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 pt-2 border-t border-blue-200 text-xs">
                      <strong>Smart Grouping:</strong> Domains are intelligently grouped by tab context and subdomain patterns. 
                      Hover over any icon or label for detailed tooltips with additional information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Domain View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={domainViewMode === 'stats' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDomainViewMode('stats')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Domain Stats
                </Button>
                <Button
                  variant={domainViewMode === 'libraries' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDomainViewMode('libraries')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Domain Libraries
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {domainViewMode === 'stats' ? (
                <motion.div
                  key="domain-stats-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Domain
                        <SortButton column="domain" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-20 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        Requests
                        <SortButton column="totalRequests" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-16 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        Errors
                        <SortButton column="errors" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-16 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        Tokens
                        <SortButton column="tokens" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-24 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        Success Rate
                        <SortButton column="successRate" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-24 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        Avg Response
                        <SortButton column="avgResponseTime" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-32 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Activity className="h-4 w-4" />
                        Analysis
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDomainStats.map((stat, index) => (
                    <React.Fragment key={index}>
                      <TableRow className="hover:bg-blue-50/50">
                        <TableCell className="font-medium w-[30%] min-w-[200px]" title={
                          stat.isGrouped ?
                            `${stat.domain} (Service group with ${stat.groupedDomains.length} domains: ${stat.groupedDomains.join(', ')})` :
                            `${stat.domain}${stat.tabContext?.primaryTabUrl ? ` - Tab: ${stat.tabContext.primaryTabUrl}` : ''}`
                        }>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {stat.isGrouped && (
                                <button
                                  onClick={() => toggleDomainExpansion(stat.domain)}
                                  className="p-0.5 hover:bg-gray-100 rounded"
                                  title={isDomainExpanded(stat.domain) ? "Collapse grouped domains" : "Expand grouped domains"}
                                >
                                  {isDomainExpanded(stat.domain) ?
                                    <ChevronDown className="h-3 w-3" /> :
                                    <ChevronRight className="h-3 w-3" />
                                  }
                                </button>
                              )}
                              <span className="truncate font-semibold">{stat.domain}</span>
                              {stat.isThirdParty && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-md bg-teal-100 text-teal-800"
                                  title={`3rd party ${stat.thirdPartyType || 'service'}`}
                                >
                                  3rd party domain
                                </span>
                              )}
                              {/* Single total event count */}
                              <div className="flex items-center ml-2">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 font-mono text-xs" title="Total Events: Requests + Errors + Tokens">
                                  {stat.totalRequests + stat.errors + stat.tokens}
                                </span>
                              </div>
                              {stat.tabContext?.isMainDomain && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Primary domain for tab">
                                  <Monitor className="h-3 w-3 mr-1" />
                                  Main
                                </span>
                              )}
                              {stat.isGrouped && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={`Grouped subdomains: ${stat.subdomainStats.map(s => s.domain).join(', ')}`}>
                                  <Layers className="h-3 w-3 mr-1" />
                                  {stat.subdomainStats.length}
                                </span>
                              )}
                              {stat.tabContext?.tabIds && stat.tabContext.tabIds.length > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title={`Active in ${stat.tabContext.tabIds.length} tabs`}>
                                  {stat.tabContext.tabIds.length}T
                                </span>
                              )}
                            </div>
                            {/* Show primary tab URL when available */}
                            {stat.tabContext?.primaryTabUrl && (
                              <div className="text-xs text-gray-500 truncate max-w-[280px]" title={stat.tabContext.primaryTabUrl}>
                                {stat.tabContext.primaryTabUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </div>
                            )}
                          </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-700 w-20 text-center">{stat.totalRequests}</TableCell>
                      <TableCell className="font-semibold text-red-700 w-16 text-center">{stat.errors}</TableCell>
                      <TableCell className="font-semibold text-yellow-700 w-16 text-center">{stat.tokens}</TableCell>
                      <TableCell className="w-24 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          stat.successRate >= 90 ? 'bg-green-100 text-green-800' :
                          stat.successRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stat.successRate}%
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700 w-24 text-center">
                        {stat.avgResponseTime > 0 ? `${stat.avgResponseTime}ms` : 'N/A'}
                      </TableCell>
                      <TableCell className="w-32 text-center">
                        <div className="w-full flex items-center justify-end pr-4">
                          {/* Tier 2: Inline expandable charts */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDomainCharts(stat.domain)}
                            className="h-6 w-6 p-0 hover:bg-blue-100"
                            title={isDomainChartExpanded(stat.domain) ? "Hide inline charts" : "Show inline charts"}
                          >
                            {isDomainChartExpanded(stat.domain) ?
                              <EyeOff className="h-3 w-3 text-blue-600" /> :
                              <BarChart3 className="h-3 w-3 text-gray-600" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Domain-specific charts panel - TIER 2 IMPLEMENTATION */}
                    {isDomainChartExpanded(stat.domain) && (
                      <TableRow key={`${index}-charts`}>
                        <TableCell colSpan={7} className="p-0 bg-gray-50">
                          <DomainChartsPanel
                            domain={stat.domain}
                            networkRequests={analysisData.loaded ? analysisData.networkRequests : []}
                            consoleErrors={analysisData.loaded ? analysisData.consoleErrors : []}
                            tokenEvents={analysisData.loaded ? analysisData.tokenEvents : []}
                            className="m-4"
                          />
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Expanded grouped domains with stats */}
                    {stat.isGrouped && isDomainExpanded(stat.domain) && stat.subdomainStats.map((subStat, subIndex: number) => (
                      <TableRow key={`${index}-${subIndex}`} className="bg-blue-50/30 border-l-2 border-l-blue-200">
                        <TableCell className="pl-8 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-500">└─</span>
                            <span>{subStat.domain}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-green-600">{subStat.requests}</TableCell>
                        <TableCell className="text-sm font-medium text-red-600">{subStat.errors}</TableCell>
                        <TableCell className="text-sm font-medium text-yellow-600">{subStat.tokens}</TableCell>
                        <TableCell className="text-sm">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            subStat.successRate >= 90 ? 'bg-green-100 text-green-700' :
                            subStat.successRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {subStat.successRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-blue-600">
                          {subStat.avgResponseTime > 0 ? `${subStat.avgResponseTime}ms` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400 text-center">-</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                  ))}
                  {sortedDomainStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No domain statistics available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
                </motion.div>
              ) : (
                <motion.div
                  key="domain-libraries-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Domain Libraries Table */}
                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold w-[40%]">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Domain
                                <SortButton column="domain" currentSort={domainSortConfig} onSort={handleDomainSort} />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <Globe className="h-3 w-3" />
                                Web Resources
                                <SortButton column="libraryCount" currentSort={domainSortConfig} onSort={handleDomainSort} />
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-center w-[80px]">
                              <div className="flex items-center gap-2 justify-center">
                                <BookOpen className="h-4 w-4" />
                                Details
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedDomainStats
                            .filter(stat => stat.libraryCount > 0) // Only show domains with libraries
                            .map((stat, index) => (
                            <TableRow key={index} className="hover:bg-purple-50/50">
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    {stat.isGrouped && <Layers className="h-3 w-3 text-blue-500" />}
                                    {stat.tabContext?.isMainDomain && <Monitor className="h-3 w-3 text-green-500" />}
                                    <span className="text-sm font-medium">{stat.domain}</span>
                                    {stat.isThirdParty && (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-md bg-teal-100 text-teal-800"
                                        title={`3rd party ${stat.thirdPartyType || 'service'}`}
                                      >
                                        3rd party domain
                                      </span>
                                    )}
                                  </div>
                                  {stat.isGrouped && (
                                    <div className="text-xs text-gray-500 pl-5">
                                      {stat.groupedDomains.length} domains: {stat.groupedDomains.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  {/* Main library count and expand button */}
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-8 h-6 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                      {stat.libraryCount}
                                    </span>
                                    {stat.librarySourceDomains.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleLibrarySourceDomains(stat.domain)}
                                        className="h-6 px-2 text-xs hover:bg-purple-50"
                                        title={`Web resources from ${stat.librarySourceDomains.length} domains`}
                                      >
                                        <ChevronDown className={`h-3 w-3 transition-transform ${
                                          expandedLibraryDomains.has(stat.domain) ? 'rotate-180' : ''
                                        }`} />
                                        {stat.librarySourceDomains.length} domains
                                      </Button>
                                    )}
                                  </div>

                                  {/* Collapsed view - show first few libraries */}
                                  {!expandedLibraryDomains.has(stat.domain) && (
                                    <div className="flex flex-wrap gap-1 max-w-md">
                                      {stat.libraries.slice(0, 4).map((lib, libIndex) => {
                                        // Apply smart truncation and categorization to main display
                                        const displayName = LibraryDetector.getDisplayName(lib, 20); // Shorter for main view
                                        const fullName = `${lib.name}${lib.version ? `@${lib.version}` : ''}`;

                                        // Get resource type info for proper styling
                                        const getResourceTypeInfo = (libType: string) => {
                                          switch (libType) {
                                            case 'advertising-service':
                                              return { icon: Megaphone, bgColor: 'bg-red-100', textColor: 'text-red-800', label: 'Ad Service' };
                                            case 'data-collector':
                                              return { icon: BarChart, bgColor: 'bg-purple-100', textColor: 'text-purple-800', label: 'Analytics' };
                                            case 'streaming-service':
                                              return { icon: Video, bgColor: 'bg-green-100', textColor: 'text-green-800', label: 'Media' };
                                            case 'api-endpoint':
                                              return { icon: Globe, bgColor: 'bg-orange-100', textColor: 'text-orange-800', label: 'API' };
                                            case 'privacy-tools':
                                              return { icon: Shield, bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: 'Privacy' };
                                            case 'framework':
                                            case 'utility':
                                            case 'ui':
                                              return { icon: Library, bgColor: 'bg-blue-100', textColor: 'text-blue-800', label: 'Library' };
                                            case 'tracking-tools':
                                              return { icon: Target, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', label: 'Tracking' };
                                            case 'site-tools':
                                              return { icon: Settings, bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', label: 'Site Tool' };
                                            case 'media-tools':
                                              return { icon: Film, bgColor: 'bg-pink-100', textColor: 'text-pink-800', label: 'Media Tool' };
                                            case 'performance-tools':
                                              return { icon: Zap, bgColor: 'bg-cyan-100', textColor: 'text-cyan-800', label: 'Performance' };
                                            default:
                                              return { icon: Wrench, bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: 'Resource' };
                                          }
                                        };

                                        const typeInfo = getResourceTypeInfo(lib.type);
                                        const IconComponent = typeInfo.icon;

                                        return (
                                          <span
                                            key={libIndex}
                                            className={`inline-flex items-center px-2 py-1 ${typeInfo.bgColor} ${typeInfo.textColor} text-xs font-medium rounded`}
                                            title={`${fullName} (${typeInfo.label})`}
                                          >
                                            <IconComponent className="h-3 w-3 mr-1" />
                                            {displayName}
                                            {lib.version && !displayName.includes('@') && (
                                              <span className="ml-1 opacity-75">@{lib.version}</span>
                                            )}
                                          </span>
                                        );
                                      })}
                                      {stat.libraries.length > 4 && (
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                                          +{stat.libraries.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Expanded view - scrollable container for library details */}
                                  {expandedLibraryDomains.has(stat.domain) && (
                                    <div className="mt-2 border rounded-md bg-gray-50/50 max-h-64 overflow-y-auto">
                                      <div className="p-3 space-y-3">
                                        {stat.librarySourceDomains.map((sourceDomain, sourceIndex) => (
                                          <div key={sourceIndex} className="border rounded p-2 bg-white shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-xs font-medium text-gray-700">
                                                {sourceDomain.domain}
                                              </span>
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {sourceDomain.count}
                                              </span>
                                              {sourceDomain.isThirdParty && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800" title="Third-party domain">
                                                  3rd party domain
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {sourceDomain.libraries.map((lib, libIndex) => {
                                                // Use smart truncation for better display
                                                const displayName = LibraryDetector.getDisplayName(lib, 25);
                                                const fullName = `${lib.name}${lib.version ? `@${lib.version}` : ''}`;

                                                // Determine resource type and styling
                                                const getResourceTypeInfo = (libType: string) => {
                                                  switch (libType) {
                                                    case 'advertising-service':
                                                      return { icon: Megaphone, bgColor: 'bg-red-100', textColor: 'text-red-800', label: 'Ad Service' };
                                                    case 'data-collector':
                                                      return { icon: BarChart, bgColor: 'bg-purple-100', textColor: 'text-purple-800', label: 'Analytics' };
                                                    case 'streaming-service':
                                                      return { icon: Video, bgColor: 'bg-green-100', textColor: 'text-green-800', label: 'Media' };
                                                    case 'api-endpoint':
                                                      return { icon: Globe, bgColor: 'bg-orange-100', textColor: 'text-orange-800', label: 'API' };
                                                    case 'privacy-tools':
                                                      return { icon: Shield, bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: 'Privacy' };
                                                    case 'framework':
                                                    case 'utility':
                                                    case 'ui':
                                                      return { icon: Library, bgColor: 'bg-blue-100', textColor: 'text-blue-800', label: 'Library' };
                                                    case 'tracking-tools':
                                                      return { icon: Target, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', label: 'Tracking' };
                                                    case 'site-tools':
                                                      return { icon: Settings, bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', label: 'Site Tool' };
                                                    case 'media-tools':
                                                      return { icon: Film, bgColor: 'bg-pink-100', textColor: 'text-pink-800', label: 'Media Tool' };
                                                    case 'performance-tools':
                                                      return { icon: Zap, bgColor: 'bg-cyan-100', textColor: 'text-cyan-800', label: 'Performance' };
                                                    default:
                                                      return { icon: Wrench, bgColor: 'bg-gray-100', textColor: 'text-gray-800', label: 'Resource' };
                                                  }
                                                };

                                                const typeInfo = getResourceTypeInfo(lib.type);
                                                const IconComponent = typeInfo.icon;

                                                return (
                                                  <span
                                                    key={libIndex}
                                                    className={`inline-flex items-center px-2 py-1 ${typeInfo.bgColor} ${typeInfo.textColor} text-xs font-medium rounded`}
                                                    title={`${fullName} (${typeInfo.label}) from ${sourceDomain.domain}`}
                                                  >
                                                    <IconComponent className="h-3 w-3 mr-1" />
                                                    {displayName}
                                                    {lib.version && !displayName.includes('@') && (
                                                      <span className="ml-1 opacity-75">@{lib.version}</span>
                                                    )}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleLibraryModal(stat.domain)}
                                  className="h-8 w-8 p-0 hover:bg-purple-100 text-purple-700 border-purple-200"
                                  title="View detailed library information"
                                >
                                  <BookOpen className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {sortedDomainStats.filter(stat => stat.libraryCount > 0).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                <div className="flex flex-col items-center gap-2">
                                  <BookOpen className="h-8 w-8 text-gray-400" />
                                  <div>No libraries detected yet</div>
                                  <div className="text-xs text-gray-400">Libraries will appear here as they are detected on visited pages</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Library Modal */}
      {libraryModalDomain && (
        <LibraryModal
          isOpen={isLibraryModalOpen}
          onClose={() => setIsLibraryModalOpen(false)}
          domain={libraryModalDomain}
          libraries={
            sortedDomainStats.find(stat => stat.domain === libraryModalDomain)?.libraries || []
          }
        />
      )}
    </Card>
  );
};

export default StatisticsCard;
