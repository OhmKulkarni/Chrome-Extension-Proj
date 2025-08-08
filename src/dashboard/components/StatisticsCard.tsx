import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowUpDown, BarChart3, TrendingUp, Layers, Monitor, ChevronDown, ChevronRight, List, LineChart, Search, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { groupDataByDomain, DomainStats } from './domainUtils';
import { 
  HttpMethodDistributionChart,
  TopEndpointsByVolumeChart,
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
  RequestsByDomainChart
} from './ChartComponents';
import { SimpleTestChart } from './SimpleTestChart';

interface StatisticsCardProps {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  totalRequests?: number;
  totalErrors?: number;
  totalTokenEvents?: number;
  onRefreshAnalysisData?: () => Promise<void>;
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
  totalTokenEvents,
  onRefreshAnalysisData
}) => {
  // Debug mode: Add mock data for testing charts
  const DEBUG_MODE = false; // Set to false to disable debug data
  
  const mockNetworkRequests = [
    { method: 'GET', url: 'https://api.example.com/users', status: 200, response_status: 200, response_time: 150 },
    { method: 'POST', url: 'https://api.example.com/login', status: 401, response_status: 401, response_time: 200 },
    { method: 'GET', url: 'https://api.example.com/products', status: 200, response_status: 200, response_time: 100 },
    { method: 'PUT', url: 'https://api.example.com/users/123', status: 500, response_status: 500, response_time: 300 },
    { method: 'DELETE', url: 'https://api.example.com/users/456', status: 404, response_status: 404, response_time: 80 },
    { method: 'GET', url: 'https://api.example.com/orders', status: 200, response_status: 200, response_time: 120 },
    { method: 'POST', url: 'https://api.example.com/register', status: 400, response_status: 400, response_time: 180 }
  ];

  const mockConsoleErrors = [
    { message: 'TypeError: Cannot read property of undefined', error: 'TypeError' },
    { message: 'ReferenceError: variable is not defined', error: 'ReferenceError' },
    { message: 'NetworkError: Failed to fetch', error: 'NetworkError' },
    { message: 'TypeError: null is not an object', error: 'TypeError' },
    { message: 'SyntaxError: Unexpected token', error: 'SyntaxError' }
  ];

  const mockTokenEvents = [
    { type: 'token_validated', success: true },
    { type: 'token_expired', success: false },
    { type: 'token_validated', success: true },
    { type: 'token_validation_failed', success: false },
    { type: 'token_validated', success: true }
  ];

  // Use mock data in debug mode, otherwise use real data
  const debugNetworkRequests = DEBUG_MODE && (!networkRequests || networkRequests.length === 0) ? mockNetworkRequests : networkRequests;
  const debugConsoleErrors = DEBUG_MODE && (!consoleErrors || consoleErrors.length === 0) ? mockConsoleErrors : consoleErrors;
  const debugTokenEvents = DEBUG_MODE && (!tokenEvents || tokenEvents.length === 0) ? mockTokenEvents : tokenEvents;

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

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Chart system state
  const [viewMode, setViewMode] = useState<'list' | 'charts'>('list');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [showAllCharts, setShowAllCharts] = useState(false);
  const [chartSearch, setChartSearch] = useState('');

  // Analysis data state - larger dataset for accurate statistics
  const [analysisData, setAnalysisData] = useState<{
    networkRequests: any[];
    consoleErrors: any[];
    tokenEvents: any[];
    loaded: boolean;
  }>({
    networkRequests: [],
    consoleErrors: [],
    tokenEvents: [],
    loaded: false
  });
  
  // User-selected analysis sample size (number of records to consider for stats)
  const [analysisLimit, setAnalysisLimit] = useState<number>(200);

  // Load analysis data for statistics calculations (uses selectable limit)
  const loadAnalysisData = useCallback(async (limitOverride?: number) => {
    const limit = typeof limitOverride === 'number' ? limitOverride : analysisLimit;
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'getAnalysisData',
        limit
      });
      
      if (response?.success && response?.data) {
        setAnalysisData({
          networkRequests: response.data.networkRequests || [],
          consoleErrors: response.data.consoleErrors || [],
          tokenEvents: response.data.tokenEvents || [],
          loaded: true
        });
        console.log('✅ Analysis data loaded:', {
          limit,
          networkRequests: response.data.networkRequests?.length || 0,
          consoleErrors: response.data.consoleErrors?.length || 0,
          tokenEvents: response.data.tokenEvents?.length || 0
        });
      } else {
        console.warn('⚠️ Failed to load analysis data:', response);
      }
    } catch (error) {
      console.error('❌ Error loading analysis data:', error);
    }
  }, [analysisLimit]);

  // Load analysis data on component mount and when limit changes
  useEffect(() => {
    loadAnalysisData();
  }, [loadAnalysisData]);

  // Refresh analysis data when parent requests it
  useEffect(() => {
    if (onRefreshAnalysisData) {
      // Refresh analysis data when requested
      loadAnalysisData();
    }
  }, [onRefreshAnalysisData, loadAnalysisData]);

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
    'auth-failures-vs-success': {
      name: 'Auth Failures vs Success',
      type: 'pie' as const,
      category: 'Distributions', 
      description: 'Token expired vs invalid vs success',
      tooltip: 'Authentication success/failure analysis'
    },
    'top-endpoints-by-volume': {
      name: 'Top Endpoints by Volume',
      type: 'bar' as const,
      category: 'Distributions',
      description: 'Which routes get the most hits',
      tooltip: 'Most frequently accessed endpoints'
    },
    
    // Performance & Experience Charts  
    'avg-response-time-per-route': {
      name: 'Avg Response Time (per route)',
      type: 'horizontalBar' as const,
      category: 'Performance',
      description: 'Sorted by slowest endpoints',
      tooltip: 'Identify performance bottlenecks by endpoint'
    },
    'payload-size-distribution': {
      name: 'Payload Size Distribution',
      type: 'histogram' as const,
      category: 'Performance', 
      description: 'Frequency of different response sizes',
      tooltip: 'Understand typical response payload sizes'
    },
    'requests-by-time-of-day': {
      name: 'Requests by Time of Day',
      type: 'area' as const,
      category: 'Performance',
      description: 'Peak traffic hours',
      tooltip: 'Identify peak usage times and traffic patterns'
    },
    'requests-by-domain': {
      name: 'Requests by Domain',
      type: 'pie' as const,
      category: 'Performance',
      description: 'Traffic distribution across domains',
      tooltip: 'See which domains generate the most traffic'
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
        tokenEvents: effectiveTokenEvents
      };

      console.log('Rendering chart:', chartKey, 'with data:', {
        useAnalysisData,
        networkRequests: effectiveNetworkRequests?.length || 0,
        consoleErrors: effectiveConsoleErrors?.length || 0,
        tokenEvents: effectiveTokenEvents?.length || 0,
        dataSource: useAnalysisData ? 'analysis (200 records)' : 'current page (10 records)'
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
          return <RequestsOverTimeChart {...chartData} />;
        case 'http-method-distribution':
          return <HttpMethodDistributionChart {...chartData} />;
        case 'status-code-breakdown':
          return <StatusCodeBreakdownChartNew {...chartData} />;
        case 'top-endpoints-by-volume':
          return <TopEndpointsByVolumeChart {...chartData} />;
        case 'avg-response-time-per-route':
          return <AvgResponseTimePerRouteChart {...chartData} />;
        case 'auth-failures-vs-success':
          return <AuthFailuresVsSuccessChart {...chartData} />;
        case 'top-frequent-errors':
          return <TopFrequentErrorsChart {...chartData} />;
        case 'error-frequency-over-time':
          return <ErrorFrequencyOverTimeChart {...chartData} />;
        case 'latency-over-time':
          return <LatencyOverTimeChart {...chartData} />;
        case 'traffic-by-endpoint':
          return <TrafficByEndpointChart {...chartData} />;
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
          return <PayloadSizeDistributionChart {...chartData} />;
        case 'requests-by-time-of-day':
          return <RequestsByTimeOfDayChart {...chartData} />;
        case 'requests-by-domain':
          return <RequestsByDomainChart {...chartData} />;
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

  // Calculate global statistics
  const globalStats: GlobalStats = useMemo(() => {
    // Use analysis data for statistics calculations if available, otherwise fall back to current page data
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

    console.log('GlobalStats calculation with data:', {
      useAnalysisData,
      networkRequests: effectiveNetworkRequests?.length || 0,
      consoleErrors: effectiveConsoleErrors?.length || 0, 
      tokenEvents: effectiveTokenEvents?.length || 0,
      dataSource: useAnalysisData ? 'analysis (last 200 records)' : 'current page (10 records)'
    });

    const calculatedTotalRequests = effectiveNetworkRequests.length;
    const calculatedTotalErrors = effectiveConsoleErrors.length;
    const calculatedTotalTokenEvents = effectiveTokenEvents.length;

    // Use provided totals if available, otherwise use calculated totals from current data
    const finalTotalRequests = totalRequests ?? calculatedTotalRequests;
    const finalTotalErrors = totalErrors ?? calculatedTotalErrors;
    const finalTotalTokenEvents = totalTokenEvents ?? calculatedTotalTokenEvents;

    // Calculate unique domains
    const allData = [...effectiveNetworkRequests, ...effectiveConsoleErrors, ...effectiveTokenEvents];
    const uniqueDomainsSet = new Set();
    allData.forEach(item => {
      const itemUrl = item.url || item.request?.url || item.details?.url || item.source_url || '';
      if (itemUrl && itemUrl !== 'unknown' && itemUrl !== 'Unknown' && itemUrl !== 'Unknown URL') {
        try {
          const hostname = new URL(itemUrl).hostname;
          // Extract main domain (e.g., reddit.com from www.reddit.com)
          const mainDomain = item.main_domain || hostname.replace(/^www\./, '').toLowerCase();
          if (mainDomain && mainDomain !== 'unknown') {
            uniqueDomainsSet.add(mainDomain);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    const uniqueDomains = uniqueDomainsSet.size;

    // Requests by method
    const requestsByMethod = effectiveNetworkRequests.reduce((acc, req) => {
      const method = req.method || req.request_method || 'GET';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as { [method: string]: number });

    // Errors by severity
    const errorsBySeverity = effectiveConsoleErrors.reduce((acc, error) => {
      const severity = error.level || error.severity || 'error';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as { [severity: string]: number });

    // Tokens by type
    const tokensByType = effectiveTokenEvents.reduce((acc, token) => {
      // Analyze token event to determine type
      const url = (token.url || token.source_url || '').toLowerCase();
      const method = (token.method || token.request_method || '').toUpperCase();
      
      let type = 'Access Token';
      if (url.includes('/refresh') || method === 'POST' && url.includes('/token')) {
        type = 'Refresh Token';
      } else if (url.includes('/login') || url.includes('/signin')) {
        type = 'Login Token';
      } else if (token.headers && (token.headers['x-api-key'] || token.headers['X-API-Key'])) {
        type = 'API Key';
      }
      
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as { [type: string]: number });

    // Calculate average and max response time
    const responseTimes = effectiveNetworkRequests
      .map(req => req.response_time || req.responseTime)
      .filter(time => time && typeof time === 'number');
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0;
    const maxResponseTime = responseTimes.length > 0 
      ? Math.max(...responseTimes)
      : 0;

    // Calculate success rate
    const successfulRequests = effectiveNetworkRequests.filter(req => {
      const status = req.status || req.response_status;
      return status >= 200 && status < 400;
    }).length;
    const successRate = finalTotalRequests > 0 ? Math.round((successfulRequests / finalTotalRequests) * 100) : 0;

    return {
      totalRequests: finalTotalRequests,
      totalErrors: finalTotalErrors,
      totalTokenEvents: finalTotalTokenEvents,
      uniqueDomains,
      maxResponseTime,
      requestsByMethod,
      errorsBySeverity,
      tokensByType,
      avgResponseTime,
      successRate
    };
  }, [analysisData, networkRequests, consoleErrors, tokenEvents, totalRequests, totalErrors, totalTokenEvents]);

  // Calculate domain-specific statistics with enhanced grouping
  const domainStats: DomainStats[] = useMemo(() => {
    // Use analysis data for more accurate domain statistics
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
    
    const allData = [...effectiveNetworkRequests, ...effectiveConsoleErrors, ...effectiveTokenEvents];
    return groupDataByDomain(allData);
  }, [analysisData, networkRequests, consoleErrors, tokenEvents]);

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

  // Toggle expanded state for grouped domains
  const toggleDomainExpansion = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (expandedDomains.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
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
                  {/* Chart Search + Analysis Limit */}
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
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Records considered</label>
                      <select
                        value={analysisLimit}
                        onChange={(e) => setAnalysisLimit(parseInt(e.target.value, 10) || 200)}
                        className="border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Number of most recent records used to compute statistics and charts"
                      >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                        <option value={2000}>2000</option>
                      </select>
                      <span className="hidden md:inline text-xs text-gray-500">Larger samples may increase memory usage</span>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Layers className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Smart Domain Grouping</h4>
                  <p className="text-xs text-blue-700">
                    Domains are intelligently grouped by tab context and subdomain patterns. 
                    <Layers className="h-3 w-3 inline mx-1" /> indicates grouped subdomains, 
                    <Monitor className="h-3 w-3 inline mx-1" /> shows main tab domains.
                    Hover for details.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Domain
                        <SortButton column="domain" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Requests
                        <SortButton column="totalRequests" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Errors
                        <SortButton column="errors" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Tokens
                        <SortButton column="tokens" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Success Rate
                        <SortButton column="successRate" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Avg Response
                        <SortButton column="avgResponseTime" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Last Activity
                        <SortButton column="lastSeen" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDomainStats.map((stat, index) => (
                    <React.Fragment key={index}>
                      <TableRow className="hover:bg-blue-50/50">
                        <TableCell className="font-medium max-w-[300px]" title={
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
                                  title={expandedDomains.has(stat.domain) ? "Collapse grouped domains" : "Expand grouped domains"}
                                >
                                  {expandedDomains.has(stat.domain) ? 
                                    <ChevronDown className="h-3 w-3" /> : 
                                    <ChevronRight className="h-3 w-3" />
                                  }
                                </button>
                              )}
                              <span className="truncate font-semibold">{stat.domain}</span>
                              {stat.tabContext?.isMainDomain && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Primary domain for tab">
                                  <Monitor className="h-3 w-3 mr-1" />
                                  Main
                                </span>
                              )}
                              {stat.isGrouped && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={`Grouped from: ${stat.groupedDomains.join(', ')}`}>
                                  <Layers className="h-3 w-3 mr-1" />
                                  {stat.groupedDomains.length}
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
                      <TableCell className="font-semibold text-green-700">{stat.totalRequests}</TableCell>
                      <TableCell className="font-semibold text-red-700">{stat.errors}</TableCell>
                      <TableCell className="font-semibold text-yellow-700">{stat.tokens}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          stat.successRate >= 90 ? 'bg-green-100 text-green-800' :
                          stat.successRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stat.successRate}%
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700">
                        {stat.avgResponseTime > 0 ? `${stat.avgResponseTime}ms` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[150px] truncate" title={new Date(stat.lastSeen).toLocaleString()}>
                        {new Date(stat.lastSeen).toLocaleString()}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded grouped domains with stats */}
                    {stat.isGrouped && expandedDomains.has(stat.domain) && stat.subdomainStats.map((subStat, subIndex: number) => (
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
                        <TableCell className="text-sm text-gray-400">-</TableCell>
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;
