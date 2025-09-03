import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Download, BarChart3, Activity, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
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

  // Filter data for this specific domain - PERFORMANCE: Memoized
  const domainData = useMemo(() => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    const cutoff = now - timeRanges[selectedTimeRange];

    // Enhanced domain matching function
    const matchesDomain = (itemDomain: string) => {
      if (!itemDomain) return false;

      // Normalize domain for comparison (remove www, convert to lowercase)
      const normalizeForComparison = (d: string) => d.toLowerCase().replace(/^www\./, '');
      const normalizedTarget = normalizeForComparison(domain);
      const normalizedItem = normalizeForComparison(itemDomain);

      // Direct match
      if (normalizedItem === normalizedTarget) return true;

      // Check if one is a subdomain of the other
      return normalizedItem.endsWith('.' + normalizedTarget) || normalizedTarget.endsWith('.' + normalizedItem);
    };

    const filteredRequests = networkRequests.filter(req => {
      const reqDomain = req.main_domain ||
                       req.url?.match(/https?:\/\/([^\/]+)/)?.[1] ||
                       req.domain || '';
      const timestamp = req.timestamp || Date.now();
      return matchesDomain(reqDomain) && timestamp >= cutoff;
    });

    const filteredErrors = consoleErrors.filter(error => {
      const errorDomain = error.main_domain ||
                         error.url?.match(/https?:\/\/([^\/]+)/)?.[1] ||
                         error.domain || '';
      const timestamp = error.timestamp || Date.now();
      return matchesDomain(errorDomain) && timestamp >= cutoff;
    });

    const filteredTokens = tokenEvents.filter(token => {
      const tokenDomain = token.main_domain ||
                         token.url?.match(/https?:\/\/([^\/]+)/)?.[1] ||
                         token.domain || '';
      const timestamp = token.timestamp || Date.now();
      return matchesDomain(tokenDomain) && timestamp >= cutoff;
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

  // Advanced analytics - PERFORMANCE: Memoized calculations
  const analytics = useMemo(() => {
    const { requests, errors, tokens } = domainData;

    // Performance metrics
    const responseTimes = requests
      .map(req => req.response_time || req.responseTime || 0)
      .filter(t => t > 0);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const p95ResponseTime = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] || 0
      : 0;

    // Error analysis - check multiple status fields
    const errorRequests = requests.filter(req => {
      const status = req.status || req.response_status || req.statusCode || 200;
      return status >= 400;
    });
    const errorRate = requests.length > 0 ? (errorRequests.length / requests.length) * 100 : 0;

    // Traffic patterns - method distribution
    const methodDistribution = requests.reduce((acc, req) => {
      const method = req.method || req.requestMethod || 'GET';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status code distribution
    const statusDistribution = requests.reduce((acc, req) => {
      const status = req.status || req.response_status || req.statusCode || 200;
      const statusGroup = status < 300 ? '2xx' :
                         status < 400 ? '3xx' :
                         status < 500 ? '4xx' : '5xx';
      acc[statusGroup] = (acc[statusGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Timeline data (hourly buckets)
    const timelineData = [];
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const hours = selectedTimeRange === '1h' ? 1 :
                  selectedTimeRange === '6h' ? 6 :
                  selectedTimeRange === '24h' ? 24 : 168; // 7 days

    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = now - (i * hourMs);
      const hourEnd = hourStart + hourMs;

      const hourRequests = requests.filter(req => {
        const timestamp = req.timestamp || req.time || Date.now();
        return timestamp >= hourStart && timestamp < hourEnd;
      });

      const hourErrors = hourRequests.filter(req => {
        const status = req.status || req.response_status || req.statusCode || 200;
        return status >= 400;
      });

      timelineData.push({
        time: new Date(hourStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requests: hourRequests.length,
        errors: hourErrors.length,
        avgResponseTime: hourRequests.length > 0
          ? Math.round(hourRequests.reduce((sum, req) => sum + (req.response_time || req.responseTime || 0), 0) / hourRequests.length)
          : 0
      });
    }

    // Security insights
    const securityInsights = {
      httpsRatio: requests.length > 0
        ? Math.round((requests.filter(req => req.url?.startsWith('https')).length / requests.length) * 100)
        : 100,
      suspiciousTokens: tokens.filter(token =>
        token.type === 'session' || token.type === 'auth' || token.value?.includes('token')
      ).length,
      errorTypes: errors.reduce((acc, error) => {
        const type = error.type || error.level || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Debug logging for analytics
    console.log('📊 DomainModal: Analytics calculated', {
      domain,
      dataStats: {
        requests: requests.length,
        errors: errors.length,
        tokens: tokens.length
      },
      metrics: {
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        totalRequests: requests.length
      },
      timelinePoints: timelineData.length
    });

    return {
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests: requests.length,
      methodDistribution,
      statusDistribution,
      timelineData,
      securityInsights
    };
  }, [domainData, selectedTimeRange, domain]);

  if (!isOpen) return null;

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
