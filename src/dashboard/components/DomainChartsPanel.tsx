import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, BarChart3, Clock } from 'lucide-react';

interface DomainChartsPanelProps {
  domain: string;
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  className?: string;
}

const DomainChartsPanel: React.FC<DomainChartsPanelProps> = ({
  domain,
  networkRequests,
  consoleErrors,
  tokenEvents,
  className = ''
}) => {
  // Helper function to create time buckets (same as global chart)
  const getTimeKey = (timestamp: Date, interval: 'hour' | 'day' | 'minute'): number => {
    if (interval === 'minute') {
      return new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(),
                      timestamp.getHours(), timestamp.getMinutes()).getTime();
    } else if (interval === 'hour') {
      return new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(),
                      timestamp.getHours()).getTime();
    } else { // day
      return new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()).getTime();
    }
  };
  // Filter data for this specific domain - IMPROVED FILTERING LOGIC
  const domainData = useMemo(() => {
    console.log(`[DomainChartsPanel] Filtering data for domain: ${domain}`);

    const matchesDomain = (itemDomain: string) => {
      if (!itemDomain) return false;

      const normalizeForComparison = (d: string) => d.toLowerCase().replace(/^www\./, '');
      const normalizedTarget = normalizeForComparison(domain);
      const normalizedItem = normalizeForComparison(itemDomain);

      return normalizedItem === normalizedTarget ||
             normalizedItem.endsWith('.' + normalizedTarget) ||
             normalizedTarget.endsWith('.' + normalizedItem);
    };

    const filteredRequests = networkRequests.filter(req => {
      const reqDomain = req.main_domain ||
                       req.domain ||
                       (req.url ? req.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') || '';
      return matchesDomain(reqDomain);
    });

    const filteredErrors = consoleErrors.filter(error => {
      const errorDomain = error.main_domain ||
                         error.domain ||
                         (error.url ? error.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') || '';
      return matchesDomain(errorDomain);
    });

    const filteredTokens = tokenEvents.filter(token => {
      const tokenDomain = token.main_domain ||
                         token.domain ||
                         (token.url ? token.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') || '';
      return matchesDomain(tokenDomain);
    });

    console.log(`[DomainChartsPanel] Filtered results - Requests: ${filteredRequests.length}, Errors: ${filteredErrors.length}, Tokens: ${filteredTokens.length}`);

    return {
      requests: filteredRequests,
      errors: filteredErrors,
      tokens: filteredTokens
    };
  }, [domain, networkRequests, consoleErrors, tokenEvents]);

  // Chart data preparation - PERFORMANCE: Memoized calculations
  const chartData = useMemo(() => {
    const { requests } = domainData;

    if (requests.length === 0) {
      return {
        timeline: [],
        responseTime: [],
        status: [],
        endpoints: [],
        successRate: 0,
        avgResponseTime: 0,
        responseTimeStats: {
          total: 0,
          average: '0',
          min: 0,
          max: 0
        }
      };
    }

    // Calculate success rate - FIXED CALCULATION to match column value
    const successfulRequests = requests.filter(req => {
      const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 200;
      return status >= 200 && status < 400;
    }).length;
    const successRate = (successfulRequests / requests.length) * 100;

    // Calculate average response time
    const responseTimes = requests
      .map(req => req.response_time || req.responseTime || 0)
      .filter(time => time > 0);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // 1. Requests Over Time - SPAN ALL RECORDS (like global chart)
    // Collect ALL timestamps from requests, errors, and tokens
    const allTimestamps = [
      ...requests.map(req => req.timestamp ? new Date(req.timestamp).getTime() : Date.now()),
      ...domainData.errors.map(error => error.timestamp ? new Date(error.timestamp).getTime() : Date.now()),
      ...domainData.tokens.map(token => token.timestamp ? new Date(token.timestamp).getTime() : Date.now())
    ].sort((a, b) => a - b);

    let timelineData: Array<{
      time: string;
      timestamp: number;
      requests: number;
      errors: number;
      tokens: number;
      total: number;
    }> = [];

    if (allTimestamps.length > 0) {
      const oldestTime = allTimestamps[0];
      const newestTime = allTimestamps[allTimestamps.length - 1];
      const timeSpan = newestTime - oldestTime;

      // Choose appropriate time interval (same logic as global chart)
      let interval: 'hour' | 'day' | 'minute' = 'hour';
      let timeFormat: Intl.DateTimeFormatOptions;

      if (timeSpan <= 2 * 60 * 60 * 1000) { // Less than 2 hours
        interval = 'minute';
        timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
      } else if (timeSpan <= 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
        interval = 'hour';
        timeFormat = { month: 'short', day: 'numeric', hour: 'numeric', hour12: true };
      } else {
        interval = 'day';
        timeFormat = { month: 'short', day: 'numeric' };
      }

      // Group ALL data by time intervals
      const timeGroups = {} as { [key: number]: {
        timestamp: number;
        requests: number;
        errors: number;
        tokens: number;
        total: number;
      }};

      // Process requests
      requests.forEach(req => {
        const timestamp = req.timestamp ? new Date(req.timestamp) : new Date();
        const timeKey = getTimeKey(timestamp, interval);

        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = { timestamp: timeKey, requests: 0, errors: 0, tokens: 0, total: 0 };
        }
        timeGroups[timeKey].requests += 1;
        timeGroups[timeKey].total += 1;
      });

      // Process errors
      domainData.errors.forEach(error => {
        const timestamp = error.timestamp ? new Date(error.timestamp) : new Date();
        const timeKey = getTimeKey(timestamp, interval);

        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = { timestamp: timeKey, requests: 0, errors: 0, tokens: 0, total: 0 };
        }
        timeGroups[timeKey].errors += 1;
        timeGroups[timeKey].total += 1;
      });

      // Process tokens
      domainData.tokens.forEach(token => {
        const timestamp = token.timestamp ? new Date(token.timestamp) : new Date();
        const timeKey = getTimeKey(timestamp, interval);

        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = { timestamp: timeKey, requests: 0, errors: 0, tokens: 0, total: 0 };
        }
        timeGroups[timeKey].tokens += 1;
        timeGroups[timeKey].total += 1;
      });

      // Convert to chart data and sort by time
      timelineData = Object.values(timeGroups)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(group => ({
          time: new Date(group.timestamp).toLocaleString('en-US', timeFormat),
          timestamp: group.timestamp,
          requests: group.requests,
          errors: group.errors,
          tokens: group.tokens,
          total: group.total
        }));
    }

    // 2. Status Code Distribution - Using proven chart patterns
    const statusCounts: { [status: string]: number } = {};
    requests.forEach(req => {
      const status = req.status ?? req.response_status ?? 200;
      const statusGroup = status < 300 ? '2xx Success' :
                         status < 400 ? '3xx Redirect' :
                         status < 500 ? '4xx Client Error' : '5xx Server Error';
      statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      percentage: ((count / requests.length) * 100).toFixed(1)
    }));

    // 3. Response Time Breakdown - More granular histogram for better accuracy
    const responseTimeBuckets = {
      '0-50ms': 0,
      '50-100ms': 0,
      '100-200ms': 0,
      '200-300ms': 0,
      '300-500ms': 0,
      '500-1000ms': 0,
      '1000-2000ms': 0,
      '2000ms+': 0
    };

    let totalResponseTimes = 0;
    let sumResponseTimes = 0;
    let minResponseTime = Infinity;
    let maxResponseTime = 0;
    
    requests.forEach(req => {
      const responseTime = req.response_time || req.responseTime || 0;
      if (responseTime > 0) {
        totalResponseTimes++;
        sumResponseTimes += responseTime;
        minResponseTime = Math.min(minResponseTime, responseTime);
        maxResponseTime = Math.max(maxResponseTime, responseTime);
        
        if (responseTime <= 50) {
          responseTimeBuckets['0-50ms']++;
        } else if (responseTime <= 100) {
          responseTimeBuckets['50-100ms']++;
        } else if (responseTime <= 200) {
          responseTimeBuckets['100-200ms']++;
        } else if (responseTime <= 300) {
          responseTimeBuckets['200-300ms']++;
        } else if (responseTime <= 500) {
          responseTimeBuckets['300-500ms']++;
        } else if (responseTime <= 1000) {
          responseTimeBuckets['500-1000ms']++;
        } else if (responseTime <= 2000) {
          responseTimeBuckets['1000-2000ms']++;
        } else {
          responseTimeBuckets['2000ms+']++;
        }
      }
    });

    const chartAvgResponseTime = totalResponseTimes > 0 ? (sumResponseTimes / totalResponseTimes).toFixed(1) : '0';
    const minTime = minResponseTime === Infinity ? 0 : minResponseTime;

    const responseTimeData = Object.entries(responseTimeBuckets)
      .map(([range, count]) => ({
        name: range,
        count,
        percentage: totalResponseTimes > 0 ? ((count / totalResponseTimes) * 100).toFixed(1) : '0.0',
        // Color coding for performance assessment
        performance: range.includes('0-50ms') || range.includes('50-100ms') ? 'excellent' :
                    range.includes('100-200ms') || range.includes('200-300ms') ? 'good' :
                    range.includes('300-500ms') || range.includes('500-1000ms') ? 'slow' : 'critical'
      }))
      .filter(item => item.count > 0); // Only show ranges with data

    // 4. Top Endpoints - Vertical bars instead of horizontal
    const endpointCounts: { [endpoint: string]: number } = {};
    requests.forEach(req => {
      try {
        const endpoint = new URL(req.url || '').pathname || '/';
        const shortEndpoint = endpoint.length > 20 ? endpoint.substring(0, 17) + '...' : endpoint;
        endpointCounts[shortEndpoint] = (endpointCounts[shortEndpoint] || 0) + 1;
      } catch {
        endpointCounts['/'] = (endpointCounts['/'] || 0) + 1;
      }
    });

    const endpointsData = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({
        name: endpoint,
        count,
        percentage: ((count / requests.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 endpoints only

    return {
      timeline: timelineData,
      responseTime: responseTimeData,
      status: statusData,
      endpoints: endpointsData,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      // Response time statistics for display
      responseTimeStats: {
        total: totalResponseTimes,
        average: chartAvgResponseTime,
        min: minTime,
        max: maxResponseTime
      }
    };
  }, [domainData]);

  // PERFORMANCE: Return early if no data with enhanced empty state
  if (domainData.requests.length === 0 && domainData.errors.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200 rounded-xl shadow-lg ${className}`}>
        <div className="text-center py-16 px-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
            <BarChart3 className="h-12 w-12 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-1">No activity detected for <span className="font-mono font-semibold">{domain}</span></p>
          <p className="text-sm text-gray-500">Charts will appear when domain activity is detected</p>
          
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-blue-300 mx-auto mb-1"></div>
              <div className="text-xs text-gray-500">0 Requests</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-red-300 mx-auto mb-1"></div>
              <div className="text-xs text-gray-500">0 Errors</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-amber-300 mx-auto mb-1"></div>
              <div className="text-xs text-gray-500">0 Tokens</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Color schemes for consistency
  const colors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    methods: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'],
    status: {
      '2xx Success': '#10B981',
      '3xx Redirect': '#F59E0B',
      '4xx Client Error': '#F97316',
      '5xx Server Error': '#EF4444'
    } as Record<string, string>
  };

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-lg ${className}`}>
      {/* Enhanced Header with Visual Indicators */}
      <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Domain Analysis</h3>
              <p className="text-sm text-gray-600 font-mono">{domain}</p>
            </div>
          </div>
          
          {/* Performance Badge */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              chartData.successRate >= 95 ? 'bg-green-100 text-green-800' :
              chartData.successRate >= 85 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {chartData.successRate >= 95 ? '✅ Excellent' :
               chartData.successRate >= 85 ? '⚠️ Good' : '🚨 Poor'} Performance
            </div>
          </div>
        </div>
        
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-600">Requests</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{domainData.requests.length}</p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-gray-600">Errors</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{domainData.errors.length}</p>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm font-medium text-gray-600">Tokens</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{domainData.tokens.length}</p>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Grid - Better Visual Hierarchy */}
      <div className="p-6 space-y-6">
        
        {/* Primary Chart - Activity Timeline (Full Width) */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h4 className="text-lg font-semibold text-gray-800">Activity Timeline</h4>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                All Records
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Showing {chartData.timeline.length} time periods
            </div>
          </div>
          <div className="h-48 bg-gradient-to-br from-gray-50 to-white rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.timeline}>
                <defs>
                  <linearGradient id="gradientRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.danger} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={colors.danger} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                  labelStyle={{
                    color: 'white'
                  }}
                  itemStyle={{
                    color: 'white'
                  }}
                  formatter={(value: any, name: string) => [
                    value,
                    name === 'requests' ? '🌐 Network Requests' :
                    name === 'errors' ? '❌ Console Errors' :
                    name === 'tokens' ? '🔑 Token Events' : 'Total'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke={colors.primary}
                  strokeWidth={3}
                  dot={{ fill: colors.primary, r: 4, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2, fill: 'white' }}
                  name="requests"
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke={colors.danger}
                  strokeWidth={3}
                  dot={{ fill: colors.danger, r: 3, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 6, stroke: colors.danger, strokeWidth: 2, fill: 'white' }}
                  name="errors"
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke={colors.accent}
                  strokeWidth={3}
                  dot={{ fill: colors.accent, r: 3, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 6, stroke: colors.accent, strokeWidth: 2, fill: 'white' }}
                  name="tokens"
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Charts Grid - 3 columns on large screens, responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Status Code Distribution */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-800">Status Codes</h4>
            </div>
            <div className="h-48">
              {chartData.status && chartData.status.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.status}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="white"
                      strokeWidth={2}
                    >
                      {chartData.status.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={colors.status[entry.name] || colors.primary} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                      labelStyle={{
                        color: 'white'
                      }}
                      itemStyle={{
                        color: 'white'
                      }}
                      formatter={(value: any, name: string) => [
                        `${value} (${chartData.status.find(s => s.name === name)?.percentage}%)`,
                        name
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No status data
                </div>
              )}
            </div>
          </div>

          {/* Response Time Distribution */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-800">Response Times</h4>
            </div>
            {chartData.responseTimeStats && chartData.responseTimeStats.total > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="bg-purple-50 rounded p-2">
                  <span className="text-purple-600 font-medium">Avg:</span> {chartData.responseTimeStats.average}ms
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-gray-600 font-medium">Total:</span> {chartData.responseTimeStats.total}
                </div>
              </div>
            )}
            <div className="h-48">
              {chartData.responseTime && chartData.responseTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.responseTime}>
                    <defs>
                      <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                      labelStyle={{
                        color: 'white'
                      }}
                      itemStyle={{
                        color: 'white'
                      }}
                      formatter={(value: any, _name: string, props: any) => [
                        `${value} requests (${props.payload.percentage}%)`,
                        'Distribution'
                      ]}
                      labelFormatter={(label) => `Response Time: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      fill="url(#responseTimeGradient)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No response time data
                </div>
              )}
            </div>
          </div>

          {/* Top URL Paths/Endpoints */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <h4 className="text-lg font-semibold text-gray-800">Top URL Paths</h4>
            </div>
            <div className="h-48">
              {chartData.endpoints && chartData.endpoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.endpoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '12px'
                      }}
                      labelStyle={{
                        color: 'white'
                      }}
                      itemStyle={{
                        color: 'white'
                      }}
                      formatter={(value: any, _name: string, props: any) => [
                        `${value} requests (${props.payload.percentage}%)`,
                        'Endpoint Traffic'
                      ]}
                    />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                    >
                      {chartData.endpoints.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={colors.methods[index % colors.methods.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No endpoint data
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer with Key Metrics */}
      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 rounded-b-xl">
        <div className="px-6 py-4">
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Performance Summary</h5>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{chartData.avgResponseTime}ms</div>
              <div className="text-xs text-gray-600 font-medium">Avg Response Time</div>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${chartData.successRate >= 95 ? 'text-green-600' : chartData.successRate >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                {chartData.successRate}%
              </div>
              <div className="text-xs text-gray-600 font-medium">Success Rate</div>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {domainData.requests.length + domainData.errors.length + domainData.tokens.length}
              </div>
              <div className="text-xs text-gray-600 font-medium">Total Events</div>
            </div>
            
            <div className="bg-white/80 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {chartData.endpoints?.length || 0}
              </div>
              <div className="text-xs text-gray-600 font-medium">Unique URL Paths</div>
              <div className="text-xs text-gray-400 mt-1">
                (endpoints on this domain)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainChartsPanel;
