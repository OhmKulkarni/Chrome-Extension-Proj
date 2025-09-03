import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
  // Filter data for this specific domain - IMPROVED FILTERING LOGIC
  const domainData = useMemo(() => {
    console.log(`[DomainChartsPanel] Filtering data for domain: ${domain}`);
    console.log(`[DomainChartsPanel] Network requests: ${networkRequests.length}, Console errors: ${consoleErrors.length}, Token events: ${tokenEvents.length}`);

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
      const matches = matchesDomain(reqDomain);
      if (matches) console.log(`[DomainChartsPanel] Matched request:`, { reqDomain, req });
      return matches;
    });

    const filteredErrors = consoleErrors.filter(error => {
      const errorDomain = error.main_domain ||
                         error.domain ||
                         (error.url ? error.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') || '';
      const matches = matchesDomain(errorDomain);
      if (matches) console.log(`[DomainChartsPanel] Matched error:`, { errorDomain, error });
      return matches;
    });

    const filteredTokens = tokenEvents.filter(token => {
      const tokenDomain = token.main_domain ||
                         token.domain ||
                         (token.url ? token.url.match(/https?:\/\/([^\/]+)/)?.[1] : '') || '';
      const matches = matchesDomain(tokenDomain);
      if (matches) console.log(`[DomainChartsPanel] Matched token:`, { tokenDomain, token });
      return matches;
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

    // 1. Requests Over Time (last 24 hours, hourly buckets)
    const timelineData = [];
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i * hourMs);
      const hourEnd = hourStart + hourMs;

      const hourRequests = requests.filter(req => {
        const timestamp = req.timestamp || Date.now();
        return timestamp >= hourStart && timestamp < hourEnd;
      });

      timelineData.push({
        hour: new Date(hourStart).getHours(),
        requests: hourRequests.length,
        errors: hourRequests.filter(req => (req.status || 200) >= 400).length
      });
    }

    // 2. HTTP Methods Distribution
    const methodCounts: { [method: string]: number } = {};
    requests.forEach(req => {
      const method = req.method || 'GET';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    const methodsData = Object.entries(methodCounts).map(([method, count]) => ({
      method,
      count,
      percentage: ((count / requests.length) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    // 3. Status Code Distribution
    const statusCounts: { [status: string]: number } = {};
    requests.forEach(req => {
      const status = req.status || 200;
      const statusGroup = status < 300 ? '2xx Success' :
                         status < 400 ? '3xx Redirect' :
                         status < 500 ? '4xx Client Error' : '5xx Server Error';
      statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: ((count / requests.length) * 100).toFixed(1)
    }));

    // 4. Top Endpoints
    const endpointCounts: { [endpoint: string]: number } = {};
    requests.forEach(req => {
      try {
        const endpoint = new URL(req.url || '').pathname || '/';
        const shortEndpoint = endpoint.length > 30 ? endpoint.substring(0, 30) + '...' : endpoint;
        endpointCounts[shortEndpoint] = (endpointCounts[shortEndpoint] || 0) + 1;
      } catch {
        endpointCounts['/'] = (endpointCounts['/'] || 0) + 1;
      }
    });

    const endpointsData = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 endpoints only

    return {
      timeline: timelineData,
      methods: methodsData.slice(0, 6), // Top 6 methods
      status: statusData,
      endpoints: endpointsData
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

        {/* 1. Requests Timeline */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Requests Over Time (24h)
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.timeline}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(hour) => `${hour}:00 - ${hour + 1}:00`}
                  formatter={(value: any, name: string) => [value, name === 'requests' ? 'Requests' : 'Errors']}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke={colors.primary}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="errors"
                  stroke={colors.danger}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Status Code Distribution */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Status Code Distribution
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={50}
                  paddingAngle={2}
                >
                  {chartData.status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors.status[entry.status] || colors.primary} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: string) => [`${value} (${chartData.status.find(s => s.status === name)?.percentage}%)`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. HTTP Methods */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">HTTP Methods</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.methods} layout="horizontal">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="method" tick={{ fontSize: 12 }} width={50} />
                <Tooltip formatter={(value: any, _name: string, props: any) => [`${value} (${props.payload.percentage}%)`, 'Requests']} />
                <Bar dataKey="count" fill={colors.secondary} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Top Endpoints */}
        <div className="bg-white border border-gray-100 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top Endpoints</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.endpoints} layout="horizontal">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="endpoint"
                  tick={{ fontSize: 10 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="count" fill={colors.accent} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Footer with summary stats */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 rounded-b-lg">
        <div className="flex justify-between">
          <span>
            Avg Response Time: {domainData.requests.length > 0 ?
              Math.round(domainData.requests.reduce((sum, req) => sum + (req.response_time || 0), 0) / domainData.requests.length)
              : 0}ms
          </span>
          <span>
            Error Rate: {domainData.requests.length > 0 ?
              (((domainData.requests.filter(req => (req.status || 200) >= 400).length / domainData.requests.length) * 100).toFixed(1))
              : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default DomainChartsPanel;
