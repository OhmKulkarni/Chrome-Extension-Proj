import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Download, BarChart3, Activity, Clock, CheckCircle, XCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
}

// Error Boundary Component for Charts
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-64 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Chart Error</p>
            <p className="text-sm">Unable to render chart</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Tier 3: Full Modal Experience
 * Complete domain analysis interface with advanced features
 * PERFORMANCE: Lazy loading and efficient data processing
 */
const DomainModal: React.FC<DomainModalProps> = ({
  isOpen,
  onClose,
  domain,
  networkRequests,
  consoleErrors,
  tokenEvents
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'errors' | 'security'>('overview');

  // PERFORMANCE: Early exit if data is too large
  const totalDataSize = (networkRequests?.length || 0) + (consoleErrors?.length || 0) + (tokenEvents?.length || 0);
  if (totalDataSize > 5000) {
    console.warn(`[DomainModal] Dataset too large (${totalDataSize}), showing limited view`);
  }

  // Filter data for this specific domain - PERFORMANCE: Memoized with aggressive limits
  const domainData = useMemo(() => {
    console.log(`[DomainModal] Processing data for domain: ${domain}`, {
      requests: networkRequests?.length || 0,
      errors: consoleErrors?.length || 0,
      tokens: tokenEvents?.length || 0,
      totalSize: totalDataSize
    });

    // PERFORMANCE: Very aggressive limits for large datasets  
    const maxItems = totalDataSize > 3000 ? 200 : totalDataSize > 1000 ? 500 : 1000;
    
    console.log(`[DomainModal] Using limit: ${maxItems} items for processing`);

    // SAFETY: Ensure arrays exist and are valid
    const safeNetworkRequests = Array.isArray(networkRequests) ? networkRequests.slice(0, maxItems) : [];
    const safeConsoleErrors = Array.isArray(consoleErrors) ? consoleErrors.slice(0, maxItems) : [];
    const safeTokenEvents = Array.isArray(tokenEvents) ? tokenEvents.slice(0, maxItems) : [];

    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    const cutoff = now - timeRanges[selectedTimeRange];

    // Enhanced domain matching function with safety checks
    const matchesDomain = (itemDomain: string) => {
      if (!itemDomain || typeof itemDomain !== 'string') return false;

      // Normalize domain for comparison (remove www, convert to lowercase)
      const normalizeForComparison = (d: string) => d.toLowerCase().replace(/^www\./, '');
      const normalizedTarget = normalizeForComparison(domain);
      const normalizedItem = normalizeForComparison(itemDomain);

      // Direct match
      if (normalizedItem === normalizedTarget) return true;

      // Check if one is a subdomain of the other
      return normalizedItem.endsWith('.' + normalizedTarget) || normalizedTarget.endsWith('.' + normalizedItem);
    };

    // Filter using safe limited data arrays
    const filteredRequests = safeNetworkRequests.filter((req: any) => {
      if (!req || typeof req !== 'object') return false;

      const reqDomain = req.main_domain ||
                       (req.url ? req.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') ||
                       req.domain || '';
      const timestamp = req.timestamp || Date.now();

      try {
        return matchesDomain(reqDomain) && timestamp >= cutoff;
      } catch (e) {
        return false;
      }
    });

    const filteredErrors = safeConsoleErrors.filter((error: any) => {
      if (!error || typeof error !== 'object') return false;

      const errorDomain = error.main_domain ||
                         (error.url ? error.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') ||
                         error.domain || '';
      const timestamp = error.timestamp || Date.now();

      try {
        return matchesDomain(errorDomain) && timestamp >= cutoff;
      } catch (e) {
        return false;
      }
    });

    const filteredTokens = safeTokenEvents.filter((token: any) => {
      if (!token || typeof token !== 'object') return false;

      const tokenDomain = token.main_domain ||
                         (token.url ? token.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') ||
                         token.domain || '';
      const timestamp = token.timestamp || Date.now();

      try {
        return matchesDomain(tokenDomain) && timestamp >= cutoff;
      } catch (e) {
        return false;
      }
    });

    // Debug logging for domain filtering
    console.log('🔍 DomainModal: Domain filtering results', {
      targetDomain: domain,
      timeRange: selectedTimeRange,
      totalData: {
        requests: networkRequests.length,
        errors: consoleErrors.length,
        tokens: tokenEvents.length
      },
      filteredData: {
        requests: filteredRequests.length,
        errors: filteredErrors.length,
        tokens: filteredTokens.length
      },
      sampleRequests: filteredRequests.slice(0, 3).map(req => ({
        domain: req.main_domain || req.domain,
        url: req.url,
        method: req.method,
        status: req.status
      }))
    });

    return {
      requests: filteredRequests,
      errors: filteredErrors,
      tokens: filteredTokens
    };
  }, [domain, networkRequests, consoleErrors, tokenEvents, selectedTimeRange]);

  // Advanced analytics - PERFORMANCE: Memoized calculations with error handling
  const analytics = useMemo(() => {
    try {
      console.log(`[DomainModal] Computing analytics for ${domain}...`);

      const { requests, errors, tokens } = domainData;

      // SAFETY: Validate data arrays
      const safeRequests = Array.isArray(requests) ? requests : [];
      const safeErrors = Array.isArray(errors) ? errors : [];
      const safeTokens = Array.isArray(tokens) ? tokens : [];

      // Performance metrics with error handling
      const responseTimes = safeRequests
        .map(req => {
          const time = req?.response_time || req?.responseTime || 0;
          return typeof time === 'number' && time > 0 ? time : 0;
        })
        .filter(t => t > 0);

      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      const p95ResponseTime = responseTimes.length > 0
        ? (responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] || 0)
        : 0;

      // Error analysis with safety checks
      const errorRequests = safeRequests.filter(req => {
        try {
          const status = req?.status || req?.response_status || req?.statusCode || 200;
          return typeof status === 'number' && status >= 400;
        } catch (e) {
          return false;
        }
      });
      const errorRate = safeRequests.length > 0 ? (errorRequests.length / safeRequests.length) * 100 : 0;

      // Traffic patterns - method distribution with safety
      const methodDistribution = safeRequests.reduce((acc, req) => {
        try {
          const method = req?.method || req?.requestMethod || 'GET';
          if (typeof method === 'string') {
            acc[method] = (acc[method] || 0) + 1;
          }
        } catch (e) {
          // Skip invalid requests
        }
        return acc;
      }, {} as Record<string, number>);

      // Status code distribution with safety
      const statusDistribution = safeRequests.reduce((acc, req) => {
        try {
          const status = req?.status || req?.response_status || req?.statusCode || 200;
          if (typeof status === 'number') {
            const statusGroup = status < 300 ? '2xx' :
                               status < 400 ? '3xx' :
                               status < 500 ? '4xx' : '5xx';
            acc[statusGroup] = (acc[statusGroup] || 0) + 1;
          }
        } catch (e) {
          // Skip invalid requests
        }
        return acc;
      }, {} as Record<string, number>);

      // Timeline data (hourly buckets) with error handling
      const timelineData = [];
      const now = Date.now();
      const hourMs = 60 * 60 * 1000;
      const hours = selectedTimeRange === '1h' ? 1 :
                    selectedTimeRange === '6h' ? 6 :
                    selectedTimeRange === '24h' ? 24 : 168; // 7 days

      // PERFORMANCE: Limit timeline processing to prevent crashes
      const maxHours = Math.min(hours, 168); // Max 7 days

      for (let i = maxHours - 1; i >= 0; i--) {
        try {
          const hourStart = now - (i * hourMs);
          const hourEnd = hourStart + hourMs;

          const hourRequests = safeRequests.filter(req => {
            try {
              const timestamp = req?.timestamp || req?.time || Date.now();
              return typeof timestamp === 'number' && timestamp >= hourStart && timestamp < hourEnd;
            } catch (e) {
              return false;
            }
          });

          const hourErrors = hourRequests.filter(req => {
            try {
              const status = req?.status || req?.response_status || req?.statusCode || 200;
              return typeof status === 'number' && status >= 400;
            } catch (e) {
              return false;
            }
          });

          timelineData.push({
            time: new Date(hourStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requests: hourRequests.length,
            errors: hourErrors.length,
            avgResponseTime: hourRequests.length > 0
              ? Math.round(hourRequests.reduce((sum, req) => {
                  try {
                    return sum + (req?.response_time || req?.responseTime || 0);
                  } catch (e) {
                    return sum;
                  }
                }, 0) / hourRequests.length)
              : 0
          });
        } catch (e) {
          console.warn(`[DomainModal] Error processing hour ${i}:`, e);
          // Add empty data point to maintain timeline structure
          timelineData.push({
            time: new Date(now - (i * hourMs)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requests: 0,
            errors: 0,
            avgResponseTime: 0
          });
        }
      }

      // Security insights with error handling
      const securityInsights = {
        httpsRatio: safeRequests.length > 0
          ? Math.round((safeRequests.filter(req => {
              try {
                return req?.url?.startsWith('https');
              } catch (e) {
                return false;
              }
            }).length / safeRequests.length) * 100)
          : 100,
        suspiciousTokens: safeTokens.filter(token => {
          try {
            return token?.type === 'session' || token?.type === 'auth' || token?.value?.includes('token');
          } catch (e) {
            return false;
          }
        }).length,
        errorTypes: safeErrors.reduce((acc, error) => {
          try {
            const type = error?.type || error?.level || 'unknown';
            if (typeof type === 'string') {
              acc[type] = (acc[type] || 0) + 1;
            }
          } catch (e) {
            // Skip invalid errors
          }
          return acc;
        }, {} as Record<string, number>)
      };

      // Debug logging for analytics
      console.log('📊 DomainModal: Analytics calculated', {
        domain,
        dataStats: {
          requests: safeRequests.length,
          errors: safeErrors.length,
          tokens: safeTokens.length
        },
        metrics: {
          avgResponseTime: Math.round(avgResponseTime),
          p95ResponseTime: Math.round(p95ResponseTime),
          errorRate: Math.round(errorRate * 100) / 100,
          totalRequests: safeRequests.length
        },
        timelinePoints: timelineData.length
      });

      return {
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        totalRequests: safeRequests.length,
        methodDistribution,
        statusDistribution,
        timelineData,
        securityInsights
      };

    } catch (error) {
      console.error('🚨 DomainModal: Analytics computation failed:', error);

      // Return safe fallback data to prevent crashes
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        totalRequests: 0,
        methodDistribution: {},
        statusDistribution: {},
        timelineData: [],
        securityInsights: {
          httpsRatio: 100,
          suspiciousTokens: 0,
          errorTypes: {}
        }
      };
    }
  }, [domainData, selectedTimeRange, domain]);

  if (!isOpen) return null;

  // PERFORMANCE: Show simplified view for large datasets to prevent crashes
  if (totalDataSize > 3000) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Dataset Too Large
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-gray-600">
              This domain has {totalDataSize.toLocaleString()} data points, which is too large to display safely.
            </p>
            <p className="text-sm text-gray-500">
              Try selecting a smaller record limit (1000 or less) in the main dashboard to view domain details.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#6B7280'
  };

  const statusColors: Record<string, string> = {
    '2xx': colors.success,
    '3xx': colors.warning,
    '4xx': colors.error,
    '5xx': colors.error
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <DialogTitle className="text-xl font-bold">Domain Analysis</DialogTitle>
              </div>
              <Badge variant="secondary" className="text-sm">
                {domain}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-900">{analytics.totalRequests}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600 opacity-60" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Avg Response</p>
                  <p className="text-2xl font-bold text-green-900">{analytics.avgResponseTime}ms</p>
                </div>
                <Clock className="h-8 w-8 text-green-600 opacity-60" />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">P95 Response</p>
                  <p className="text-2xl font-bold text-yellow-900">{analytics.p95ResponseTime}ms</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600 opacity-60" />
              </div>
            </div>

            <div className={`${analytics.errorRate > 5 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${analytics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>Error Rate</p>
                  <p className={`text-2xl font-bold ${analytics.errorRate > 5 ? 'text-red-900' : 'text-green-900'}`}>{analytics.errorRate}%</p>
                </div>
                {analytics.errorRate > 5 ?
                  <XCircle className="h-8 w-8 text-red-600 opacity-60" /> :
                  <CheckCircle className="h-8 w-8 text-green-600 opacity-60" />
                }
              </div>
            </div>
          </div>

          {/* Detailed Analytics Tabs */}
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Timeline */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Traffic Over Time</h3>
                  <div className="h-64">
                    {analytics.timelineData.length > 0 ? (
                      <ChartErrorBoundary>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.timelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="requests" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
                            <Area type="monotone" dataKey="errors" stroke={colors.error} fill={colors.error} fillOpacity={0.3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartErrorBoundary>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No traffic data available for this time range</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Status Code Distribution</h3>
                  <div className="h-64">
                    {Object.keys(analytics.statusDistribution).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={Object.entries(analytics.statusDistribution).map(([status, count]) => ({ status, count }))}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {Object.entries(analytics.statusDistribution).map(([status], index) => (
                              <Cell key={`cell-${index}`} fill={statusColors[status] || colors.info} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No status code data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* HTTP Methods */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">HTTP Methods</h3>
                  <div className="h-64">
                    {Object.keys(analytics.methodDistribution).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(analytics.methodDistribution).map(([method, count]) => ({ method, count }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="method" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill={colors.primary} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No HTTP method data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Response Time Trend */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Response Time Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={analytics.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avgResponseTime" stroke={colors.success} strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-900">{analytics.avgResponseTime}ms</p>
                    <p className="text-blue-600 font-medium">Average Response Time</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-900">{analytics.p95ResponseTime}ms</p>
                    <p className="text-green-600 font-medium">95th Percentile</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-900">{Math.round(analytics.totalRequests / (parseInt(selectedTimeRange) || 24))}req/h</p>
                    <p className="text-purple-600 font-medium">Requests per Hour</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="errors" className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Error Analysis</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">Error Rate</p>
                      <p className="text-sm text-red-600">Percentage of requests that failed</p>
                    </div>
                    <div className="text-2xl font-bold text-red-900">{analytics.errorRate}%</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Total failed requests: {domainData.requests.filter(req => (req.status || 200) >= 400).length}</p>
                    <p>Console errors: {domainData.errors.length}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Security Analysis</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-900">Token Events</p>
                      <p className="text-sm text-yellow-600">Authentication tokens detected</p>
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">{domainData.tokens.length}</div>
                  </div>
                  {domainData.tokens.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <p>⚠️ Authentication activity detected on this domain</p>
                      <p>Review token usage for security compliance</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DomainModal;
