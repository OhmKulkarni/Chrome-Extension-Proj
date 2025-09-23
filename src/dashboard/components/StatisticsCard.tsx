import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowUpDown, BarChart3, TrendingUp, Layers, Monitor, ChevronDown, ChevronRight, List, LineChart, Search, Eye, EyeOff, RefreshCw, Activity, BookOpen, Megaphone, BarChart, Shield, Library, Globe, Globe2, HelpCircle, Package, Wrench, Target, Database, Settings, Film, Zap, Server, Lock, Box, Puzzle, CheckCircle, Loader2, RotateCcw, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { groupDataByDomain, DomainStats } from './domainUtils';
// Import the new shared data processing system
import { useSharedChartData } from '../hooks/useSharedChartData';
import { useChartSettingsRead } from '../hooks/useChartSettings';
import { isFeatureEnabled, withPerformanceMonitoring } from '../utils/featureFlags';
// Import domain chart components
import DomainChartsPanel from './DomainChartsPanel';
import InlineResourcesSection from './InlineResourcesSection';
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

// Map detailed categories to primary categories for dashboard display
const getPrimaryCategory = (type: string): 'libraries' | 'analytics' | 'privacy' | 'services' | 'assets' => {
  switch (type) {
    case 'framework':
    case 'utility':
    case 'polyfill':
      return 'libraries';
    case 'data-collector':
    case 'tracking-tools':
      return 'analytics';
    case 'privacy-tools':
      return 'privacy';
    case 'service':
      return 'services';
    case 'site-tools':
    case 'media-tools':
    case 'performance-tools':
    case 'build-artifact':
      return 'assets';
    default:
      return 'assets';
  }
};

// Hook to detect dark mode
const useDarkMode = () => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

const getPrimaryCategoryInfo = (primaryType: string, isDark: boolean = false) => {
  switch (primaryType) {
    case 'libraries':
      return {
        icon: Library,
        bgColor: isDark ? 'bg-blue-900' : 'bg-blue-100',
        textColor: isDark ? 'text-blue-200' : 'text-blue-800',
        label: 'Libraries'
      };
    case 'analytics':
      return {
        icon: BarChart,
        bgColor: isDark ? 'bg-purple-900' : 'bg-purple-100',
        textColor: isDark ? 'text-purple-200' : 'text-purple-800',
        label: 'Analytics'
      };
    case 'privacy':
      return {
        icon: Shield,
        bgColor: isDark ? 'bg-green-900' : 'bg-green-100',
        textColor: isDark ? 'text-green-200' : 'text-green-800',
        label: 'Privacy'
      };
    case 'services':
      return {
        icon: Megaphone,
        bgColor: isDark ? 'bg-red-900' : 'bg-red-100',
        textColor: isDark ? 'text-red-200' : 'text-red-800',
        label: 'Services'
      };
    case 'assets':
      return {
        icon: Package,
        bgColor: isDark ? 'bg-gray-800' : 'bg-gray-100',
        textColor: isDark ? 'text-gray-200' : 'text-gray-800',
        label: 'Assets'
      };
    default:
      return {
        icon: HelpCircle,
        bgColor: isDark ? 'bg-gray-800' : 'bg-gray-100',
        textColor: isDark ? 'text-gray-200' : 'text-gray-800',
        label: 'Unknown'
      };
  }
};

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
  const isDark = useDarkMode();

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

  // console.log('StatisticsCard Debug Data:');
  // console.log('- Network Requests:', networkRequests?.length || 0, networkRequests);
  // console.log('- Console Errors:', consoleErrors?.length || 0, consoleErrors);
  // console.log('- Token Events:', tokenEvents?.length || 0, tokenEvents);
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

  // Web resources section state
  const [expandedLibrarySections, setExpandedLibrarySections] = useState<Set<string>>(new Set());

  // Web resources source domain dropdown state
  const [expandedLibraryDomains, setExpandedLibraryDomains] = useState<Set<string>>(new Set());

  const toggleLibrarySection = (domain: string) => {
    const newExpanded = new Set(expandedLibrarySections);
    if (newExpanded.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedLibrarySections(newExpanded);
  };

  const isLibrarySectionExpanded = (domain: string) => expandedLibrarySections.has(domain);

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
  const [domainViewMode, setDomainViewMode] = useState<'stats' | 'resources'>('stats');

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
        // console.log('📊 StatisticsCard: Skipping load - already in progress');
        return;
      }

      try {
        // console.log(`📊 StatisticsCard: Loading analysis data with limit ${limit}`);

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

          // console.log('✅ StatisticsCard: Analysis data loaded:', {
          //   limit,
          //   networkRequests: response.data.networkRequests?.length || 0,
          //   consoleErrors: response.data.consoleErrors?.length || 0,
          //   tokenEvents: response.data.tokenEvents?.length || 0,
          //   sharedProcessing: isFeatureEnabled('enableSharedChartData')
          // });
        } else {
          // console.warn('⚠️ StatisticsCard: Failed to load analysis data:', response);
          setAnalysisData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        // console.error('❌ StatisticsCard: Error loading analysis data:', error);
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
      // console.log('📊 StatisticsCard: Loading initial data');
      loadAnalysisData(analysisLimit);
      return;
    }

    // Only setup auto-refresh if settings are loaded and auto mode is enabled
    if (chartSettingsLoading || chartSettings.refreshMode !== 'auto') {
      // console.log('📊 StatisticsCard: Skipping auto-refresh setup', {
      //   loading: chartSettingsLoading,
      //   mode: chartSettings.refreshMode
      // });
      return;
    }

    // Setup auto-refresh with memory leak protection
    const refreshInterval = (chartSettings.refreshInterval || 30) * 1000; // Convert to ms
    // console.log(`📊 StatisticsCard: Setting up auto-refresh every ${refreshInterval}ms`);

    const intervalId = setInterval(() => {
      // console.log('🔄 StatisticsCard: Auto-refresh triggered');
      loadAnalysisData(analysisLimit);
    }, refreshInterval);

    return () => {
      // console.log('📊 StatisticsCard: Cleaning up auto-refresh interval');
      clearInterval(intervalId);
    };
    // CRITICAL FIX: Remove loadAnalysisData from dependencies to prevent infinite loops
    // FIXED: Added analysisLimit dependency to ensure refresh uses current limit
  }, [chartSettings.refreshMode, chartSettings.refreshInterval, chartSettingsLoading, analysisData.loaded, analysisLimit]);

  // Manual refresh effect - triggers when manual refresh is requested - FIXED: Remove loadAnalysisData dependency
  useEffect(() => {
    if (manualRefreshTrigger > 0) {
      // console.log('🔄 StatisticsCard: Manual refresh effect triggered');
      loadAnalysisData(analysisLimit);
    }
    // CRITICAL FIX: Remove loadAnalysisData from dependencies to prevent infinite loops
    // FIXED: Added analysisLimit dependency to ensure manual refresh uses current limit
  }, [manualRefreshTrigger, analysisLimit]);

  // Manual refresh function
  const triggerManualRefresh = useCallback(() => {
    // console.log('🔄 StatisticsCard: Manual refresh triggered by user');
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

      // console.log('Rendering chart:', chartKey, 'with data:', {
      //   useAnalysisData,
      //   networkRequests: effectiveNetworkRequests?.length || 0,
      //   consoleErrors: effectiveConsoleErrors?.length || 0,
      //   tokenEvents: effectiveTokenEvents?.length || 0,
      //   dataSource: useAnalysisData ? `analysis (${analysisLimit} records)` : 'current page (10 records)'
      // });

      // MEMORY LEAK FIX: Add detailed logging for method-usage-daily chart
      if (chartKey === 'method-usage-daily') {
        // console.log('MethodUsageDailyChart - Detailed data inspection:');
        // console.log('- networkRequests type:', typeof effectiveNetworkRequests);
        // console.log('- networkRequests isArray:', Array.isArray(effectiveNetworkRequests));
        // console.log('- Sample request data:', effectiveNetworkRequests?.[0]);
        // console.log('- Sample timestamp:', effectiveNetworkRequests?.[0]?.timestamp);
        // console.log('- Sample method:', effectiveNetworkRequests?.[0]?.method);
      }

      // MEMORY LEAK FIX: Add null checks for chart data
      if (!chartData.networkRequests) {
        console.warn('Chart rendering skipped - no network requests data');
        return (
          <div className="h-96 bg-gray-50 dark:bg-gray-800 rounded flex items-center justify-center">
            <div className="text-center text-gray-400 dark:text-gray-500">
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
            // console.log('About to render SimpleTestChart instead of MethodUsageDailyChart');
            return <SimpleTestChart networkRequests={chartData.networkRequests} />;
          } catch (chartError) {
            console.error('SimpleTestChart specific error:', chartError);
            return (
              <div className="h-96 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex items-center justify-center">
                <div className="text-center text-red-600 dark:text-red-400">
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
            <div className="h-96 bg-gray-50 dark:bg-gray-800 rounded flex items-center justify-center">
              <div className="text-center text-gray-400 dark:text-gray-500">
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
        <div className="h-96 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex items-center justify-center">
          <div className="text-center text-red-600 dark:text-red-400">
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
    // console.log('🔍 GlobalStats useMemo starting:', { isAborted, analysisDataLoaded: analysisData.loaded });

    if (isAborted) {
      // console.log('⚠️ GlobalStats calculation aborted');
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

    // console.log('GlobalStats calculation with data:', {
    //   useAnalysisData,
    //   networkRequests: effectiveNetworkRequests?.length || 0,
    //   consoleErrors: effectiveConsoleErrors?.length || 0,
    //   tokenEvents: effectiveTokenEvents?.length || 0,
    //   analysisLoaded: analysisData.loaded,
    //   analysisNetworkLength: analysisData.networkRequests?.length || 0,
    //   dataSource: useAnalysisData ? 'analysis (latest N records)' : 'current page'
    // });

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

    // console.log('Success Rate Debug:', {
    //   successCount,
    //   finalTotalRequests,
    //   successRate,
    //   sampleStatuses: effectiveNetworkRequests.slice(0, 5).map(req => ({
    //     status: req.status,
    //     response_status: req.response_status,
    //     statusCode: req.statusCode,
    //     response: req.response?.status,
    //     finalStatus: req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 0
    //   }))
    // });

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
        // console.log('🚨🚨🚨 DASHBOARD DEBUG START 🚨🚨🚨');
        // console.log('📊 Analysis data loaded:', analysisData.loaded);
        // console.log('📊 Use analysis data:', useAnalysisData);
        // console.log('📊 Total items before domain grouping:', allData.length);
        // console.log('📊 Network requests count:', effectiveNetworkRequests.length);
        // console.log('📊 Analysis data network requests:', analysisData.networkRequests?.length);

        // DEBUG: Log actual URLs to see if CNN.io requests are present
        // console.log('📊 Network request URLs:', effectiveNetworkRequests.map(req => req.url?.substring(0, 60)));

        // console.log('🔍 BEFORE DOMAIN GROUPING - First 3 items structure:', allData.slice(0, 3).map(item => ({
        //   url: item.url?.substring(0, 60),
        //   itemKeys: Object.keys(item),
        //   hasMainDomain: 'mainDomain' in item,
        //   hasMain_domain: 'main_domain' in item,
        //   mainDomainValue: item.mainDomain,
        //   main_domainValue: (item as any).main_domain,
        //   type: item.type || 'unknown'
        // })));
        // console.log('🚨🚨🚨 DASHBOARD DEBUG END 🚨🚨🚨');

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
    <Card className="w-full max-w-full mx-auto mb-6 border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-blue-800 dark:text-blue-300">
          <BarChart3 className="h-6 w-6" />
          Extension Statistics Dashboard
        </CardTitle>
        <CardDescription className="text-blue-600 dark:text-blue-400">
          Comprehensive analytics for network requests, console errors, and authentication events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global" className="w-full">
        {/* Global Record Limit Selector and Refresh Controls */}
        <div className="flex justify-between items-center mb-4">
          {/* Manual Refresh Button (when manual mode is enabled) */}
          <div className="flex items-center gap-3">
            {/* System Status Indicators */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-xs font-medium">
                <Settings className="h-3 w-3" />
                <span>Mode: {chartSettings?.refreshMode || 'loading'}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium">
                {chartSettingsLoading ? (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-3 w-3" />
                    <span>Ready</span>
                  </div>
                )}
              </div>
            </div>

            {chartSettings?.refreshMode === 'manual' && (
              <Button
                onClick={triggerManualRefresh}
                variant="outline"
                size="sm"
                disabled={analysisData.loading}
                className={`flex items-center gap-2 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 ${
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
                  className={`flex items-center gap-2 text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900 ${
                    analysisData.loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Force refresh (auto mode active)"
                >
                  <RefreshCw className={`h-4 w-4 ${analysisData.loading ? 'animate-spin' : ''}`} />
                  {analysisData.loading ? 'Force Refreshing...' : 'Force Refresh'}
                </Button>
                <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-md text-xs font-medium">
                  <RotateCcw className="h-3 w-3" />
                  <span>Auto: {chartSettings.refreshInterval}s</span>
                </div>
              </div>
            )}

            {/* Performance indicators */}
            {isFeatureEnabled('enableSharedChartData') && (
              <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md text-xs font-medium">
                <Zap className="h-3 w-3" />
                <span>Shared Processing Active</span>
              </div>
            )}

            {sharedChartData.lastProcessed && isFeatureEnabled('enableStalenessTracking') && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                <Clock className="h-3 w-3" />
                <span>Last updated: {new Date(sharedChartData.lastProcessed).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Records considered</label>
            <select
              value={analysisLimit}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setAnalysisLimit(isNaN(value) ? 200 : value);
              }}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
                        <TableRow key={index} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/30">
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">{stat.metric}</TableCell>
                          <TableCell className="font-semibold text-blue-700 dark:text-blue-400">{stat.value}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              stat.category === 'Network' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                              stat.category === 'Console' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                              stat.category === 'Auth' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                              'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            }`}>
                              {stat.category}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {globalStatsTable.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-gray-500 dark:text-gray-400 py-8">
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search charts..."
                        value={chartSearch}
                        onChange={(e) => setChartSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
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
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">{chart.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{chart.description}</p>
                          <div className="bg-white dark:bg-gray-800 rounded">
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
                          className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{chartDefinitions[selectedChart].name}</h2>
                              <p className="text-gray-600 dark:text-gray-400">{chartDefinitions[selectedChart].description}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedChart(null)}
                            >
                              Close
                            </Button>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded">
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
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setSelectedChart(selectedChart === chartKey ? null : chartKey)}
                            title={chart.tooltip}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <LineChart className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-gray-100">{chart.name}</h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{chart.description}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                                    {chart.category}
                                  </span>
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
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
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Search className="h-8 w-8 mx-auto mb-2" />
                      <p>No charts found matching "{chartSearch}"</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="domain" className="space-y-4">
            {/* Collapsible Help Section with Smooth Animation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 rounded-lg transition-colors duration-200"
                title="Click to show/hide explanation of dashboard icons and features"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="font-medium">Dashboard Guide</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                    showHelp ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>
            </div>

            {/* Animated Help Panel - Now Scrollable */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out mb-4 ${
                showHelp
                  ? 'max-h-80 opacity-100'
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="max-h-72 overflow-y-auto custom-scrollbar pr-2">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Dashboard Icons & Features Guide</h4>

                        <div className="space-y-4 text-xs text-blue-700 dark:text-blue-300">
                          {/* Domain Status Icons */}
                          <div className="space-y-2">
                            <p className="font-medium text-blue-800 dark:text-blue-200">Domain Status Icons:</p>
                            <div className="space-y-1 ml-2">
                              <div className="flex items-start gap-2">
                                <Layers className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Grouped subdomains - Automatically identifies and groups related subdomains under a single parent domain for cleaner organization. This helps reduce clutter when websites use multiple subdomains like api.example.com, cdn.example.com, and static.example.com.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Monitor className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Main tab domain - Highlights the primary domain of the currently active browser tab, making it easy to distinguish the main website from third-party resources and embedded content.</span>
                              </div>
                            </div>
                          </div>

                          {/* Primary Resource Categories */}
                          <div className="space-y-2">
                            <p className="font-medium text-blue-800 dark:text-blue-200">Primary Resource Categories:</p>
                            <div className="space-y-1 ml-2">
                              <div className="flex items-start gap-2">
                                <Library className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Libraries - Essential JavaScript frameworks, utility libraries, and polyfills that extend browser functionality. Includes popular frameworks like React, Vue, Angular, utility libraries like Lodash, and polyfills that enable modern JavaScript features in older browsers.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <BarChart className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Analytics - Comprehensive tracking scripts, data collection tools, and user behavior analysis services. Encompasses Google Analytics, Adobe Analytics, heat mapping tools, A/B testing platforms, and conversion tracking systems that help websites understand user interactions.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Privacy - Consent management platforms, privacy protection tools, and compliance scripts essential for GDPR, CCPA, and other privacy regulations. Includes cookie consent banners, privacy policy managers, and data protection utilities.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Megaphone className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Services - Backend API endpoints, streaming services, web workers, and third-party integrations that provide core functionality. Includes payment processors, authentication services, content delivery systems, and real-time communication tools.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Package className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Assets - Static resources including images, fonts, stylesheets, configuration files, and media content that support the visual and functional aspects of websites. Also includes favicon files, web fonts, and CSS frameworks.</span>
                              </div>
                            </div>
                          </div>

                          {/* Secondary Resource Categories (Detailed Types) */}
                          <div className="space-y-2">
                            <p className="font-medium text-blue-800 dark:text-blue-200">Secondary Categories (in modal detail):</p>
                            <div className="space-y-1 ml-2">
                              <div className="flex items-start gap-2">
                                <Layers className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Framework - Core development frameworks like React, Angular, Vue, Svelte, and their associated ecosystems that provide structured approaches to building modern web applications with component-based architectures.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Wrench className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Utility - Helper libraries for common programming tasks including date manipulation (Moment.js), functional programming (Lodash), HTTP requests (Axios), and other utilities that simplify development workflows.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Puzzle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Polyfill - Code that provides modern JavaScript functionality on older browsers, ensuring compatibility across different browser versions. Includes ES6+ feature support, Web API polyfills, and CSS feature compatibility layers.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Database className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Data Collector - Scripts that systematically gather user data including form submissions, click events, scroll behavior, and interaction patterns for analytics, personalization, and business intelligence purposes.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Tracking Tools - Specialized systems for user behavior tracking, conversion tracking, marketing attribution, and analytics integration that help businesses understand customer journeys and optimize their digital strategies.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Privacy Tools - GDPR compliance tools, cookie consent management, data protection utilities, and privacy-first analytics solutions that help websites maintain regulatory compliance while respecting user privacy preferences.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Globe className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Web Service - External API calls, third-party integrations, microservices, and cloud-based services that extend website functionality through external platforms and service providers.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Settings className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Site Tools - Website functionality tools including live chat widgets, search functionality, form builders, customer support systems, and interactive components that enhance user experience and site functionality.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Film className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Media Tools - Video players (YouTube, Vimeo), image galleries, audio controls, media processing libraries, and content delivery systems that handle multimedia content presentation and manipulation.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Performance - Speed optimization tools, lazy loading libraries, image compression, caching systems, and performance monitoring tools that improve website loading times and user experience.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Box className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Build Artifact - Compiled code bundles, minified scripts, build output files, and processed assets generated by build tools like Webpack, Vite, or Rollup during the development and deployment process.</span>
                              </div>
                            </div>
                          </div>

                          {/* Resource Source Icons */}
                          <div className="space-y-2">
                            <p className="font-medium text-blue-800">Resource Source Icons:</p>
                            <div className="space-y-1 ml-2">
                              <div className="flex items-start gap-2">
                                <Globe className="h-3 w-3 mt-0.5 flex-shrink-0 text-blue-600" />
                                <span>CDN Provider - Content delivery networks like Cloudflare, unpkg, jsDelivr, and Google Fonts that provide fast global access to libraries and assets through geographically distributed servers, improving loading times worldwide.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Server className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                                <span>Self-hosted - Resources hosted on the same domain as the website, providing better control over content delivery, security, and privacy, while reducing dependencies on external services.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Package className="h-3 w-3 mt-0.5 flex-shrink-0 text-orange-600" />
                                <span>External source - Third-party resources from different domains and providers, including social media widgets, advertising networks, and specialized service providers that extend website functionality.</span>
                              </div>
                            </div>
                          </div>

                          {/* Detection Confidence Icons */}
                          <div className="space-y-2">
                            <p className="font-medium text-blue-800">Detection Confidence Icons:</p>
                            <div className="space-y-1 ml-2">
                              <div className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                                <span>High confidence - Library detection is 80%+ accurate based on strong signature matches, unique identifiers, and multiple verification points. These identifications are highly reliable and can be trusted for analysis.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-600" />
                                <span>Medium confidence - Detection is 60-80% accurate with some uncertainty in identification due to partial matches or ambiguous signatures. These may require additional verification for critical decisions.</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <Search className="h-3 w-3 mt-0.5 flex-shrink-0 text-red-600" />
                                <span>Low confidence - Possible match with limited evidence, requiring manual verification. These detections are based on weak signals and should be investigated further before making conclusions.</span>
                              </div>
                            </div>
                          </div>

                          {/* Domain Labels */}
                          <div className="space-y-2">
                            <p className="font-medium text-blue-800">Domain Labels:</p>
                            <div className="space-y-1 ml-2">
                              <div className="flex items-start gap-2">
                                <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-teal-100 text-teal-800 mt-0.5 flex-shrink-0">3rd party domain</span>
                                <span>Classification label for external domains that indicates resources loaded from outside the main website. Helps identify potential privacy implications, performance impacts, and third-party dependencies.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                  variant={domainViewMode === 'resources' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDomainViewMode('resources')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Domain Web Resources
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
                      <TableRow className="hover:bg-blue-50/50 dark:hover:bg-blue-900/30">
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
                                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
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
                                  className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-md bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200"
                                  title={`3rd party ${stat.thirdPartyType || 'service'}`}
                                >
                                  3rd party domain
                                </span>
                              )}
                              {/* Single total event count */}
                              <div className="flex items-center ml-2">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono text-xs" title="Total Events: Requests + Errors + Tokens">
                                  {stat.totalRequests + stat.errors + stat.tokens}
                                </span>
                              </div>
                              {stat.tabContext?.isMainDomain && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" title="Primary domain for tab">
                                  <Monitor className="h-3 w-3 mr-1" />
                                  Main
                                </span>
                              )}
                              {stat.isGrouped && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200" title={`Grouped subdomains: ${stat.subdomainStats.map(s => s.domain).join(', ')}`}>
                                  <Layers className="h-3 w-3 mr-1" />
                                  {stat.subdomainStats.length}
                                </span>
                              )}
                              {stat.tabContext?.tabIds && stat.tabContext.tabIds.length > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200" title={`Active in ${stat.tabContext.tabIds.length} tabs`}>
                                  {stat.tabContext.tabIds.length}T
                                </span>
                              )}
                            </div>
                            {/* Show primary tab URL when available */}
                            {stat.tabContext?.primaryTabUrl && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]" title={stat.tabContext.primaryTabUrl}>
                                {stat.tabContext.primaryTabUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </div>
                            )}
                          </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-700 dark:text-green-400 w-20 text-center">{stat.totalRequests}</TableCell>
                      <TableCell className="font-semibold text-red-700 dark:text-red-400 w-16 text-center">{stat.errors}</TableCell>
                      <TableCell className="font-semibold text-yellow-700 dark:text-yellow-400 w-16 text-center">{stat.tokens}</TableCell>
                      <TableCell className="w-24 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          stat.successRate >= 90 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          stat.successRate >= 70 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {stat.successRate}%
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700 dark:text-blue-400 w-24 text-center">
                        {stat.avgResponseTime > 0 ? `${stat.avgResponseTime}ms` : 'N/A'}
                      </TableCell>
                      <TableCell className="w-32 text-center">
                        <div className="w-full flex items-center justify-end pr-4">
                          {/* Tier 2: Inline expandable charts */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDomainCharts(stat.domain)}
                            className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                            title={isDomainChartExpanded(stat.domain) ? "Hide inline charts" : "Show inline charts"}
                          >
                            {isDomainChartExpanded(stat.domain) ?
                              <EyeOff className="h-3 w-3 text-blue-600 dark:text-blue-400" /> :
                              <BarChart3 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Domain-specific charts panel - TIER 2 IMPLEMENTATION */}
                    {isDomainChartExpanded(stat.domain) && (
                      <TableRow key={`${index}-charts`}>
                        <TableCell colSpan={7} className="p-0 bg-gray-50 dark:bg-gray-800">
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
                      <TableRow key={`${index}-${subIndex}`} className="bg-blue-50/30 dark:bg-blue-900/20 border-l-2 border-l-blue-200 dark:border-l-blue-600">
                        <TableCell className="pl-8 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-500 dark:text-blue-400">└─</span>
                            <span>{subStat.domain}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-green-600 dark:text-green-400">{subStat.requests}</TableCell>
                        <TableCell className="text-sm font-medium text-red-600 dark:text-red-400">{subStat.errors}</TableCell>
                        <TableCell className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{subStat.tokens}</TableCell>
                        <TableCell className="text-sm">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            subStat.successRate >= 90 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                            subStat.successRate >= 70 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                            'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                          }`}>
                            {subStat.successRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {subStat.avgResponseTime > 0 ? `${subStat.avgResponseTime}ms` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400 dark:text-gray-500 text-center">-</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                  ))}
                  {sortedDomainStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 dark:text-gray-400 py-8">
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
                  key="domain-resources-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Domain Web Resources Table */}
                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold w-[40%]">
                              <div className="flex items-center gap-2">
                                <Globe2 className="h-4 w-4" />
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
                            .filter(stat => stat.libraryCount > 0) // Only show domains with web resources
                            .map((stat) => (
                            <React.Fragment key={stat.domain}>
                            <TableRow className="hover:bg-purple-50/50 dark:hover:bg-purple-900/20">
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    {stat.isGrouped && <Layers className="h-3 w-3 text-blue-500" />}
                                    {stat.tabContext?.isMainDomain && <Monitor className="h-3 w-3 text-green-500" />}
                                    <span className="text-sm font-medium">{stat.domain}</span>
                                    {stat.isThirdParty && (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-md bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200"
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
                                    <span className="inline-flex items-center justify-center w-8 h-6 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                                      {stat.libraryCount}
                                    </span>
                                    {stat.librarySourceDomains.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleLibrarySourceDomains(stat.domain)}
                                        className="h-6 px-2 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/30"
                                        title={`Web resources from ${stat.librarySourceDomains.length} domains`}
                                      >
                                        <ChevronDown className={`h-3 w-3 transition-transform ${
                                          expandedLibraryDomains.has(stat.domain) ? 'rotate-180' : ''
                                        }`} />
                                        {stat.librarySourceDomains.length} domains
                                      </Button>
                                    )}
                                  </div>

                                  {/* Collapsed view - show first few web resources */}
                                  {!expandedLibraryDomains.has(stat.domain) && (
                                    <div className="flex flex-wrap gap-1 max-w-md">
                                      {stat.libraries.slice(0, 4).map((lib, libIndex) => {
                                        // Apply smart truncation and categorization to main display
                                        const displayName = LibraryDetector.getDisplayName(lib, 20); // Shorter for main view
                                        const fullName = `${lib.name}${lib.version && lib.version !== 'unknown' ? `@${lib.version}` : ''}`;

                                        // Get primary category info for dashboard display
                                        const getPrimaryResourceTypeInfo = (libType: string) => {
                                          const primaryCategory = getPrimaryCategory(libType);
                                          const primaryInfo = getPrimaryCategoryInfo(primaryCategory, isDark);

                                          // Get detailed label for tooltip
                                          const detailedLabel = (() => {
                                            switch (libType) {
                                              case 'framework': return 'Framework';
                                              case 'utility': return 'Utility';
                                              case 'polyfill': return 'Polyfill';
                                              case 'data-collector': return 'Data Collector';
                                              case 'tracking-tools': return 'Tracking';
                                              case 'privacy-tools': return 'Privacy';
                                              case 'service': return 'Service';
                                              case 'site-tools': return 'Site Tool';
                                              case 'media-tools': return 'Media Tool';
                                              case 'performance-tools': return 'Performance';
                                              case 'build-artifact': return 'Build Artifact';
                                              default: return 'Resource';
                                            }
                                          })();

                                          return {
                                            ...primaryInfo,
                                            detailedLabel
                                          };
                                        };

                                        const typeInfo = getPrimaryResourceTypeInfo(lib.type);
                                        const IconComponent = typeInfo.icon;

                                        return (
                                          <span
                                            key={libIndex}
                                            className={`inline-flex items-center px-2 py-1 ${typeInfo.bgColor} ${typeInfo.textColor} text-xs font-medium rounded`}
                                            title={`${fullName} (${typeInfo.detailedLabel})`}
                                          >
                                            <IconComponent className="h-3 w-3 mr-1" />
                                            {displayName}
                                            {lib.version && lib.version !== 'unknown' && !displayName.includes('@') && (
                                              <span className="ml-1 opacity-75">@{lib.version}</span>
                                            )}
                                          </span>
                                        );
                                      })}
                                      {stat.libraries.length > 4 && (
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded">
                                          +{stat.libraries.length - 4} more
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Expanded view - scrollable container for web resource details */}
                                  {expandedLibraryDomains.has(stat.domain) && (
                                    <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-900 max-h-64 overflow-y-auto">
                                      <div className="p-3 space-y-3">
                                        {stat.librarySourceDomains.map((sourceDomain, sourceIndex) => (
                                          <div key={sourceIndex} className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-800 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                {sourceDomain.domain}
                                              </span>
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                                {sourceDomain.count}
                                              </span>
                                              {sourceDomain.isThirdParty && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200" title="Third-party domain">
                                                  3rd party domain
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {sourceDomain.libraries.map((lib, libIndex) => {
                                                // Use smart truncation for better display
                                                const displayName = LibraryDetector.getDisplayName(lib, 25);
                                                const fullName = `${lib.name}${lib.version && lib.version !== 'unknown' ? `@${lib.version}` : ''}`;

                                                // Get primary category info for domain library display
                                                const getDomainPrimaryResourceTypeInfo = (libType: string) => {
                                                  const primaryCategory = getPrimaryCategory(libType);
                                                  const primaryInfo = getPrimaryCategoryInfo(primaryCategory, isDark);

                                                  // Get detailed label for tooltip
                                                  const detailedLabel = (() => {
                                                    switch (libType) {
                                                      case 'framework': return 'Framework';
                                                      case 'utility': return 'Utility';
                                                      case 'polyfill': return 'Polyfill';
                                                      case 'data-collector': return 'Data Collector';
                                                      case 'tracking-tools': return 'Tracking';
                                                      case 'privacy-tools': return 'Privacy';
                                                      case 'service': return 'Service';
                                                      case 'site-tools': return 'Site Tool';
                                                      case 'media-tools': return 'Media Tool';
                                                      case 'performance-tools': return 'Performance';
                                                      case 'build-artifact': return 'Build Artifact';
                                                      default: return 'Resource';
                                                    }
                                                  })();

                                                  return {
                                                    ...primaryInfo,
                                                    detailedLabel
                                                  };
                                                };

                                                const typeInfo = getDomainPrimaryResourceTypeInfo(lib.type);
                                                const IconComponent = typeInfo.icon;

                                                return (
                                                  <span
                                                    key={libIndex}
                                                    className={`inline-flex items-center px-2 py-1 ${typeInfo.bgColor} ${typeInfo.textColor} text-xs font-medium rounded`}
                                                    title={`${fullName} (${typeInfo.detailedLabel}) from ${sourceDomain.domain}`}
                                                  >
                                                    <IconComponent className="h-3 w-3 mr-1" />
                                                    {displayName}
                                                    {lib.version && lib.version !== 'unknown' && !displayName.includes('@') && (
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleLibrarySection(stat.domain)}
                                  className="h-6 w-6 p-0 hover:bg-purple-100"
                                  title={isLibrarySectionExpanded(stat.domain) ? "Hide web resource details" : "Show web resource details"}
                                >
                                  {isLibrarySectionExpanded(stat.domain) ?
                                    <EyeOff className="h-3 w-3 text-purple-600" /> :
                                    <BookOpen className="h-3 w-3 text-gray-600" />
                                  }
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Inline Web Resources Section - Similar to domain charts */}
                            {isLibrarySectionExpanded(stat.domain) && (
                              <TableRow key={`${stat.domain}-resources`}>
                                <TableCell colSpan={3} className="p-0 bg-gray-50 dark:bg-gray-900">
                                  <InlineResourcesSection
                                    domain={stat.domain}
                                    resources={stat.libraries || []}
                                    className="m-4"
                                  />
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                          ))}
                          {sortedDomainStats.filter(stat => stat.libraryCount > 0).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                <div className="flex flex-col items-center gap-2">
                                  <BookOpen className="h-8 w-8 text-gray-400" />
                                  <div>No web resources detected yet</div>
                                  <div className="text-xs text-gray-400">Web resources will appear here as they are detected on visited pages</div>
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

    </Card>
  );
};

export default StatisticsCard;
