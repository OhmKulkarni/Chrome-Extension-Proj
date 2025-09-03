/**
 * Shared Chart Data Processing Hook
 * Centralizes data processing to eliminate duplication across charts
 * and provides granular dependencies for optimal memoization
 */

import { useMemo } from 'react';

// Type definitions for processed data
export interface NetworkMetrics {
  totalRequests: number;
  methodCounts: Record<string, number>;
  statusCodeCounts: Record<string, number>;
  sizeDistribution: {
    range: string;
    count: number;
    minSize: number;
    maxSize: number;
  }[];
  avgResponseTime: number;
  successRate: number;
  domains: Record<string, number>;
  endpoints: Record<string, number>;
}

export interface ErrorMetrics {
  totalErrors: number;
  severityCounts: Record<string, number>;
  timelineCounts: Record<string, { timestamp: number; count: number; severity: Record<string, number> }>;
  frequentErrors: { message: string; count: number }[];
}

export interface TokenMetrics {
  totalTokens: number;
  typeCounts: Record<string, number>;
  timelineCounts: Record<string, { timestamp: number; count: number }>;
}

export interface ProcessedChartData {
  networkMetrics: NetworkMetrics;
  errorMetrics: ErrorMetrics;
  tokenMetrics: TokenMetrics;
  lastProcessed: number; // timestamp for staleness tracking
}

// Input data interface
export interface AnalysisData {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  loaded: boolean;
}

/**
 * Shared data processing hook
 * Processes raw analysis data once and provides it to all charts
 */
export const useSharedChartData = (analysisData: AnalysisData): ProcessedChartData => {
  return useMemo(() => {
    const startTime = performance.now();
    console.log('🔄 Processing shared chart data...', {
      networkRequests: analysisData.networkRequests?.length || 0,
      consoleErrors: analysisData.consoleErrors?.length || 0,
      tokenEvents: analysisData.tokenEvents?.length || 0,
      loaded: analysisData.loaded
    });

    // Process network requests
    const networkMetrics = processNetworkMetrics(analysisData.networkRequests || []);

    // Process console errors
    const errorMetrics = processErrorMetrics(analysisData.consoleErrors || []);

    // Process token events
    const tokenMetrics = processTokenMetrics(analysisData.tokenEvents || []);

    const processed: ProcessedChartData = {
      networkMetrics,
      errorMetrics,
      tokenMetrics,
      lastProcessed: Date.now()
    };

    const endTime = performance.now();
    console.log('✅ Shared chart data processed:', {
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      networkMetrics: Object.keys(networkMetrics).length,
      errorMetrics: Object.keys(errorMetrics).length,
      tokenMetrics: Object.keys(tokenMetrics).length
    });

    return processed;
  }, [analysisData]); // Only recalculates when raw data changes
};

/**
 * Process network request data for all charts
 */
function processNetworkMetrics(networkRequests: any[]): NetworkMetrics {
  const methodCounts: Record<string, number> = {};
  const statusCodeCounts: Record<string, number> = {};
  const domains: Record<string, number> = {};
  const endpoints: Record<string, number> = {};
  const responseTimes: number[] = [];
  const sizes: number[] = [];
  let successCount = 0;

  networkRequests.forEach(req => {
    // Method counting
    const method = req.method || req.request_method || 'GET';
    methodCounts[method] = (methodCounts[method] || 0) + 1;

    // Status code counting
    const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 0;
    if (status > 0) {
      const statusRange = getStatusRange(status);
      statusCodeCounts[statusRange] = (statusCodeCounts[statusRange] || 0) + 1;

      // Success rate (2xx and 3xx)
      if (status >= 200 && status < 400) {
        successCount++;
      }
    }

    // Domain counting
    if (req.url) {
      try {
        const url = new URL(req.url);
        const domain = req.main_domain || url.hostname;
        if (domain && domain !== 'unknown') {
          domains[domain] = (domains[domain] || 0) + 1;
        }

        // Endpoint counting
        const endpoint = url.pathname || '/';
        endpoints[endpoint] = (endpoints[endpoint] || 0) + 1;
      } catch (e) {
        // Invalid URL, skip domain/endpoint extraction
      }
    }

    // Response time collection
    const responseTime = req.response_time || req.responseTime || 0;
    if (responseTime > 0) {
      responseTimes.push(responseTime);
    }

    // Size collection (use existing size utilities logic)
    const size = getRequestSize(req);
    if (size > 0) {
      sizes.push(size);
    }
  });

  // Calculate size distribution
  const sizeDistribution = calculateSizeDistribution(sizes);

  // Calculate average response time
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
    : 0;

  // Calculate success rate
  const successRate = networkRequests.length > 0
    ? Math.round((successCount / networkRequests.length) * 100)
    : 0;

  return {
    totalRequests: networkRequests.length,
    methodCounts,
    statusCodeCounts,
    sizeDistribution,
    avgResponseTime,
    successRate,
    domains,
    endpoints
  };
}

/**
 * Process console error data for all charts
 */
function processErrorMetrics(consoleErrors: any[]): ErrorMetrics {
  const severityCounts: Record<string, number> = {};
  const timelineCounts: Record<string, { timestamp: number; count: number; severity: Record<string, number> }> = {};
  const errorMessages: Record<string, number> = {};

  consoleErrors.forEach(error => {
    // Severity counting
    const severity = (error.severity || error.level || 'error').toLowerCase();
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;

    // Timeline counting (group by hour)
    const timestamp = error.timestamp ? new Date(error.timestamp) : new Date();
    const timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).getTime().toString();

    if (!timelineCounts[timeKey]) {
      timelineCounts[timeKey] = {
        timestamp: parseInt(timeKey),
        count: 0,
        severity: {}
      };
    }
    timelineCounts[timeKey].count += 1;
    timelineCounts[timeKey].severity[severity] = (timelineCounts[timeKey].severity[severity] || 0) + 1;

    // Frequent error messages
    const message = error.message || error.error_message || 'Unknown error';
    if (message.length < 100) { // Only track short messages
      errorMessages[message] = (errorMessages[message] || 0) + 1;
    }
  });

  // Get top frequent errors
  const frequentErrors = Object.entries(errorMessages)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalErrors: consoleErrors.length,
    severityCounts,
    timelineCounts,
    frequentErrors
  };
}

/**
 * Process token event data for all charts
 */
function processTokenMetrics(tokenEvents: any[]): TokenMetrics {
  const typeCounts: Record<string, number> = {};
  const timelineCounts: Record<string, { timestamp: number; count: number }> = {};

  tokenEvents.forEach(token => {
    // Type counting
    const type = token.type || token.token_type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Timeline counting (group by hour)
    const timestamp = token.timestamp ? new Date(token.timestamp) : new Date();
    const timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).getTime().toString();

    if (!timelineCounts[timeKey]) {
      timelineCounts[timeKey] = {
        timestamp: parseInt(timeKey),
        count: 0
      };
    }
    timelineCounts[timeKey].count += 1;
  });

  return {
    totalTokens: tokenEvents.length,
    typeCounts,
    timelineCounts
  };
}

// Helper functions
function getStatusRange(status: number): string {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500) return '5xx';
  return 'other';
}

function getRequestSize(req: any): number {
  // Use priority order: payload_size -> calculated -> estimated
  if (req.payload_size && req.payload_size > 0) {
    return req.payload_size;
  }

  const requestSize = req.requestSize || req.request_size || 0;
  const responseSize = req.responseSize || req.response_size || 0;
  const totalSize = requestSize + responseSize;

  if (totalSize > 0) {
    return totalSize;
  }

  // Estimate from body content
  let estimatedSize = 0;
  const requestBody = req.requestBody || req.request_body;
  const responseBody = req.responseBody || req.response_body;

  if (requestBody && typeof requestBody === 'string') {
    estimatedSize += new Blob([requestBody]).size;
  }
  if (responseBody && typeof responseBody === 'string') {
    estimatedSize += new Blob([responseBody]).size;
  }

  return estimatedSize;
}

function calculateSizeDistribution(sizes: number[]): NetworkMetrics['sizeDistribution'] {
  if (sizes.length === 0) return [];

  const ranges = [
    { min: 0, max: 1024, label: '0-1KB' },
    { min: 1024, max: 5 * 1024, label: '1-5KB' },
    { min: 5 * 1024, max: 10 * 1024, label: '5-10KB' },
    { min: 10 * 1024, max: 50 * 1024, label: '10-50KB' },
    { min: 50 * 1024, max: 100 * 1024, label: '50-100KB' },
    { min: 100 * 1024, max: Infinity, label: '100KB+' }
  ];

  return ranges.map(range => {
    const sizesInRange = sizes.filter(size => size >= range.min && size < range.max);
    return {
      range: range.label,
      count: sizesInRange.length,
      minSize: sizesInRange.length > 0 ? Math.min(...sizesInRange) : 0,
      maxSize: sizesInRange.length > 0 ? Math.max(...sizesInRange) : 0
    };
  });
}
