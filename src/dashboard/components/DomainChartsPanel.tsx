import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        methods: [],
        status: [],
        endpoints: [],
        successRate: 0,
        avgResponseTime: 0
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

    // 3. HTTP Methods Distribution - Vertical bars work better
    const methodCounts: { [method: string]: number } = {};
    requests.forEach(req => {
      const method = req.method || 'GET';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    const methodsData = Object.entries(methodCounts).map(([method, count]) => ({
      name: method,
      count,
      percentage: ((count / requests.length) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count).slice(0, 6); // Top 6 methods

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
      methods: methodsData,
      status: statusData,
      endpoints: endpointsData,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime)
    };
  }, [domainData]);

  // PERFORMANCE: Return early if no data
  if (domainData.requests.length === 0 && domainData.errors.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500 py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No data available for {domain}</p>
          <p className="text-xs mt-1">Charts will appear when domain activity is detected</p>
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
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Domain Analysis: {domain}</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{domainData.requests.length} requests</span>
            <span>{domainData.errors.length} errors</span>
            <span>{domainData.tokens.length} tokens</span>
          </div>
        </div>
      </div>

      {/* Charts Grid - 2x2 layout */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. Activity Timeline - SPANS ALL RECORDS (requests, errors, tokens) */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activity Timeline (All Records)
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    value, 
                    name === 'requests' ? 'Network Requests' : 
                    name === 'errors' ? 'Console Errors' : 
                    name === 'tokens' ? 'Token Events' : 'Total'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke={colors.primary}
                  strokeWidth={2}
                  dot={{ fill: colors.primary, r: 3 }}
                  name="Requests"
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke={colors.danger}
                  strokeWidth={2}
                  dot={{ fill: colors.danger, r: 2 }}
                  name="Errors"
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke={colors.accent}
                  strokeWidth={2}
                  dot={{ fill: colors.accent, r: 2 }}
                  name="Tokens"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>        {/* 2. Status Code Distribution - Fixed data structure */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Status Code Distribution
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.status}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {chartData.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors.status[entry.name] || colors.primary} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value} (${chartData.status.find(s => s.name === name)?.percentage}%)`,
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. HTTP Methods - Vertical Bar Chart (proven successful) */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">HTTP Methods</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.methods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, _name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    'Requests'
                  ]}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.methods.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors.methods[index % colors.methods.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Top Endpoints - Vertical Bar Chart (proven successful) */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top Endpoints</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.endpoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, _name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    'Requests'
                  ]}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.endpoints.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors.methods[index % colors.methods.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Footer with summary stats - CORRECTED SUCCESS RATE */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 rounded-b-lg">
        <div className="flex justify-between">
          <span>
            Avg Response Time: {chartData.avgResponseTime}ms
          </span>
          <span>
            Success Rate: {chartData.successRate}%
          </span>
          <span>
            Total Activity: {domainData.requests.length + domainData.errors.length + domainData.tokens.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DomainChartsPanel;
