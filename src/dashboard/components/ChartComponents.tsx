import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter
} from 'recharts';

// Color palettes for consistent chart styling
const COLORS = {
  primary: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'],
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6'
};

interface ChartProps {
  data: any;
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
}

// HTTP Method Distribution (Pie Chart)
export const HttpMethodDistributionChart: React.FC<ChartProps> = ({ data }) => {
  const chartData = Object.entries(data.requestsByMethod).map(([method, count]) => ({
    name: method,
    value: count as number,
    percentage: (((count as number) / data.totalRequests) * 100).toFixed(1)
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} (${percentage}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Requests']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Status Code Breakdown (Donut Chart)
export const StatusCodeBreakdownChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('StatusCodeBreakdownChart - networkRequests:', networkRequests.length);
  
  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
        </div>
      </div>
    );
  }

  const statusGroups = networkRequests.reduce((acc, req) => {
    // Add detailed debugging for status field
    console.log('Processing request status:', {
      url: req.url,
      status: req.status,
      response_status: req.response_status,
      statusType: typeof req.status,
      responseStatusType: typeof req.response_status
    });
    
    // Try multiple status field names and convert to number
    let status = req.status || req.response_status;
    
    // Convert string status to number if needed
    if (typeof status === 'string') {
      status = parseInt(status, 10);
    }
    
    // Default to 200 if no valid status found
    if (!status || isNaN(status)) {
      console.log('Using default status 200 for request:', req.url);
      status = 200;
    }
    
    let group = 'Unknown';
    
    if (status >= 200 && status < 300) group = '2xx Success';
    else if (status >= 300 && status < 400) group = '3xx Redirect';
    else if (status >= 400 && status < 500) group = '4xx Client Error';
    else if (status >= 500) group = '5xx Server Error';
    
    console.log('Status', status, 'mapped to group:', group);
    
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  console.log('StatusCodeBreakdownChart - statusGroups:', statusGroups);

  const chartData = Object.entries(statusGroups).map(([group, count]) => ({
    name: group,
    value: count as number,
    percentage: (((count as number) / networkRequests.length) * 100).toFixed(1)
  }));

  console.log('StatusCodeBreakdownChart - chartData:', chartData);

  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No status code data to display</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name} (${percentage}%)`}
          outerRadius={120}
          innerRadius={60}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Requests']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Top Endpoints by Volume (Bar Chart)
export const TopEndpointsByVolumeChart: React.FC<ChartProps> = ({ networkRequests }) => {
  const endpointGroups = networkRequests.reduce((acc, req) => {
    const url = req.url || req.request?.url || 'Unknown';
    let endpoint = 'Unknown';
    
    try {
      // Handle relative URLs (they start with /)
      if (url.startsWith('/')) {
        endpoint = url;
      } else {
        const urlObj = new URL(url);
        endpoint = urlObj.pathname || url;
      }
    } catch (e) {
      endpoint = url;
    }
    
    // Simplify long endpoints
    if (endpoint.length > 30) {
      endpoint = endpoint.substring(0, 27) + '...';
    }
    
    acc[endpoint] = (acc[endpoint] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.entries(endpointGroups)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10) // Top 10
    .map(([endpoint, count]) => ({
      endpoint,
      requests: count as number
    }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="endpoint" 
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={12}
        />
        <YAxis />
        <Tooltip />
        <Bar dataKey="requests" fill={COLORS.primary[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Average Response Time (Routes/Domains) - Enhanced Bar Chart with Alternative Lollipop Chart
export const AvgResponseTimePerRouteChart: React.FC<ChartProps> = ({ networkRequests }) => {
  const [topN, setTopN] = React.useState(10);
  const [viewMode, setViewMode] = React.useState<'routes' | 'domains'>('routes');
  
  console.log('AvgResponseTimePerRouteChart - networkRequests:', networkRequests.length);
  
  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
        </div>
      </div>
    );
  }

  // Helper function to extract base domain (using same logic as domain stats)
  const extractBaseDomain = (url: string): string => {
    try {
      if (!url || url.startsWith('/')) {
        return 'localhost';
      }
      
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes('/')) {
          fullUrl = 'https://' + url;
        } else {
          return 'unknown';
        }
      }
      
      const urlObj = new URL(fullUrl);
      const hostname = urlObj.hostname;
      const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
      const parts = withoutWww.split('.');
      
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      
      return withoutWww;
    } catch (error) {
      return 'unknown';
    }
  };

  const routeGroups: { [key: string]: { total: number; count: number; times: number[] } } = {};
  const domainGroups: { [key: string]: { total: number; count: number; times: number[] } } = {};

  networkRequests.forEach(req => {
    const url = req.url || req.request?.url || 'Unknown';
    const responseTime = req.response_time || req.responseTime || 0;
    
    console.log('Processing request for response time:', {
      url: url,
      response_time: req.response_time,
      responseTime: req.responseTime,
      finalResponseTime: responseTime,
      response_time_type: typeof req.response_time,
      responseTime_type: typeof req.responseTime
    });
    
    if (responseTime <= 0) {
      console.log('Skipping request with no response time:', url);
      return; // Skip requests without response times
    }
    
    // Route processing
    let route = 'Unknown';
    try {
      // Handle relative URLs (they start with /)
      if (url.startsWith('/')) {
        route = url;
      } else {
        const urlObj = new URL(url);
        route = urlObj.pathname || url;
      }
    } catch (e) {
      route = url;
    }
    
    // Simplify long routes
    if (route.length > 25) {
      route = route.substring(0, 22) + '...';
    }
    
    if (!routeGroups[route]) {
      routeGroups[route] = { total: 0, count: 0, times: [] };
    }
    routeGroups[route].total += responseTime;
    routeGroups[route].count += 1;
    routeGroups[route].times.push(responseTime);

    // Domain processing (using same logic as domain stats)
    const mainDomain = req.main_domain || extractBaseDomain(url);
    if (mainDomain && mainDomain !== 'unknown') {
      if (!domainGroups[mainDomain]) {
        domainGroups[mainDomain] = { total: 0, count: 0, times: [] };
      }
      domainGroups[mainDomain].total += responseTime;
      domainGroups[mainDomain].count += 1;
      domainGroups[mainDomain].times.push(responseTime);
    }
    
    console.log('Added response time', responseTime, 'for route', route, 'and domain', mainDomain);
  });

  console.log('AvgResponseTimePerRouteChart - routeGroups:', routeGroups);
  console.log('AvgResponseTimePerRouteChart - domainGroups:', domainGroups);

  // Process data based on view mode
  const activeGroups = viewMode === 'routes' ? routeGroups : domainGroups;
  
  const allChartData = Object.entries(activeGroups)
    .map(([name, data]) => {
      const avgTime = (data as any).count > 0 ? Math.round((data as any).total / (data as any).count) : 0;
      return {
        route: name, // Keep 'route' as dataKey for consistency
        avgTime,
        requests: (data as any).count,
        maxTime: Math.max(...(data as any).times),
        minTime: Math.min(...(data as any).times),
        // Color-code by threshold
        fill: avgTime < 100 ? '#10B981' : // Green < 100ms
              avgTime < 300 ? '#F59E0B' : // Yellow < 300ms
              '#EF4444' // Red > 300ms
      };
    })
    .filter(item => item.avgTime > 0)
    .sort((a, b) => b.avgTime - a.avgTime);

  const chartData = allChartData.slice(0, topN);

  console.log('AvgResponseTimePerRouteChart - chartData:', chartData);

  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No response time data available</p>
          <p className="text-xs mt-2">Network requests may not have response_time field</p>
        </div>
      </div>
    );
  }

  // Top N options
  const topNOptions = [5, 10, 15, 20, 25, 30];

  return (
    <div className="space-y-4">
      {/* Chart Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Response Times by {viewMode === 'routes' ? 'Routes' : 'Domains'}:</span> Top {chartData.length} of {allChartData.length}
        </div>
        <div>
          <span className="font-medium">Total Requests:</span> {viewMode === 'routes' 
            ? Object.values(routeGroups).reduce((sum, group) => sum + group.count, 0)
            : Object.values(domainGroups).reduce((sum, group) => sum + group.count, 0)}
        </div>
      </div>

      {/* Chart Info and Controls */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex gap-4 items-center">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <div className="flex border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('routes')}
                className={`px-3 py-1 text-sm rounded-l ${
                  viewMode === 'routes'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Routes
              </button>
              <button
                onClick={() => setViewMode('domains')}
                className={`px-3 py-1 text-sm rounded-r ${
                  viewMode === 'domains'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Domains
              </button>
            </div>
          </div>

          {/* Top N Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show Top:</label>
            <select 
              value={topN} 
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {topNOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div>
            <span className="font-medium">Color Key:</span>
            <span className="ml-2 text-green-600">●</span> &lt;100ms
            <span className="ml-2 text-yellow-600">●</span> &lt;300ms
            <span className="ml-2 text-red-600">●</span> &gt;300ms
          </div>
        </div>
      </div>

      {/* Main Bar Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="route"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={11}
            interval={0}
          />
          <YAxis 
            label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                    <p className="font-medium text-gray-900">{viewMode === 'routes' ? 'Route' : 'Domain'}: {data.route}</p>
                    <p className="text-blue-600 font-semibold">Average: {data.avgTime}ms</p>
                    <p className="text-xs text-gray-500">Requests: {data.requests}</p>
                    <p className="text-xs text-gray-500">Range: {data.minTime}ms - {data.maxTime}ms</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="avgTime"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Alternative View - Lollipop Chart */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Response Time Distribution (Lollipop View)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="route"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={11}
              interval={0}
            />
            <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value) => [`${value}ms`, 'Average Response Time']}
              labelFormatter={(label) => `${viewMode === 'routes' ? 'Route' : 'Domain'}: ${label}`}
            />
            {/* Vertical lines (sticks) - using thin bars from 0 to value */}
            <Bar 
              dataKey="avgTime" 
              fill="transparent" 
              stroke="#3B82F6" 
              strokeWidth={2}
              barSize={2}
            />
            {/* Dots at the top */}
            <Scatter dataKey="avgTime" fill="#3B82F6" stroke="#3B82F6" strokeWidth={2}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Auth Failures vs Success (Pie Chart)
export const AuthFailuresVsSuccessChart: React.FC<ChartProps> = ({ tokenEvents }) => {
  const authStats = tokenEvents.reduce((acc, token) => {
    const status = token.status || token.response_status || 200;
    
    if (status >= 200 && status < 400) {
      acc.success += 1;
    } else if (status === 401) {
      acc.unauthorized += 1;
    } else if (status === 403) {
      acc.forbidden += 1;
    } else if (status >= 400) {
      acc.otherErrors += 1;
    }
    
    return acc;
  }, { success: 0, unauthorized: 0, forbidden: 0, otherErrors: 0 });

  const chartData = [
    { name: 'Success', value: authStats.success, color: COLORS.success },
    { name: 'Unauthorized (401)', value: authStats.unauthorized, color: COLORS.error },
    { name: 'Forbidden (403)', value: authStats.forbidden, color: COLORS.warning },
    { name: 'Other Errors', value: authStats.otherErrors, color: COLORS.info }
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name} (${(((value || 0) / total) * 100).toFixed(1)}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Events']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Top 5 Frequent Errors (Horizontal Bar Chart)
// Top 5 Frequent Errors (Enhanced Bar Chart with Alternative Donut Chart)
export const TopFrequentErrorsChart: React.FC<ChartProps> = ({ consoleErrors }) => {
  console.log('TopFrequentErrorsChart - consoleErrors:', consoleErrors);
  console.log('TopFrequentErrorsChart - consoleErrors length:', consoleErrors?.length || 0);

  if (!consoleErrors || consoleErrors.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No console errors available</p>
          <p className="text-xs mt-2">No error data found</p>
        </div>
      </div>
    );
  }

  // Enhanced error grouping with full message tracking
  const errorGroups = consoleErrors.reduce((acc, error) => {
    const fullMessage = error.message || error.error || 'Unknown Error';
    let errorType = fullMessage;
    let severity = 'error'; // default severity
    
    // Extract error type and determine severity
    if (fullMessage.includes('TypeError')) {
      errorType = 'TypeError';
      severity = 'error';
    } else if (fullMessage.includes('ReferenceError')) {
      errorType = 'ReferenceError';
      severity = 'error';
    } else if (fullMessage.includes('SyntaxError')) {
      errorType = 'SyntaxError';
      severity = 'error';
    } else if (fullMessage.includes('NetworkError') || fullMessage.includes('Failed to fetch')) {
      errorType = 'NetworkError';
      severity = 'warning';
    } else if (fullMessage.includes('SecurityError') || fullMessage.includes('CORS')) {
      errorType = 'SecurityError';
      severity = 'error';
    } else if (fullMessage.includes('404') || fullMessage.includes('Not Found')) {
      errorType = '404 Not Found';
      severity = 'warning';
    } else if (fullMessage.includes('500') || fullMessage.includes('Internal Server')) {
      errorType = '500 Server Error';
      severity = 'error';
    } else if (errorType.length > 30) {
      errorType = errorType.substring(0, 27) + '...';
      severity = 'warning';
    }
    
    if (!acc[errorType]) {
      acc[errorType] = { count: 0, severity, fullMessages: [] };
    }
    acc[errorType].count += 1;
    acc[errorType].fullMessages.push(fullMessage);
    
    return acc;
  }, {} as { [key: string]: { count: number; severity: string; fullMessages: string[] } });

  console.log('TopFrequentErrorsChart - errorGroups:', errorGroups);

  const chartData = Object.entries(errorGroups)
    .sort(([, a], [, b]) => (b as any).count - (a as any).count)
    .slice(0, 5) // Top 5
    .map(([errorType, data]) => ({
      errorType,
      count: (data as any).count,
      severity: (data as any).severity,
      fullMessages: (data as any).fullMessages,
      // Color based on severity
      fill: (data as any).severity === 'error' ? '#EF4444' : 
            (data as any).severity === 'warning' ? '#F59E0B' : '#6B7280'
    }));

  console.log('TopFrequentErrorsChart - chartData:', chartData);

  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No error data available</p>
          <p className="text-xs mt-2">Error grouping may have failed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Top 5 Frequent Errors:</span> {chartData.length} error types
        </div>
        <div>
          <span className="font-medium">Total Errors:</span> {chartData.reduce((sum, item) => sum + item.count, 0)}
        </div>
      </div>

      {/* Main Bar Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="errorType"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={11}
            interval={0}
          />
          <YAxis 
            label={{ value: 'Error Count', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm max-w-md">
                    <p className="font-medium text-gray-900">Error Type: {data.errorType}</p>
                    <p className="text-red-600 font-semibold">{data.count} occurrences</p>
                    <p className="text-xs text-gray-500 capitalize">Severity: {data.severity}</p>
                    <div className="mt-2 max-h-20 overflow-y-auto">
                      <p className="text-xs text-gray-500">Sample messages:</p>
                      {data.fullMessages.slice(0, 3).map((msg: string, i: number) => (
                        <p key={i} className="text-xs text-gray-700 truncate">{msg}</p>
                      ))}
                      {data.fullMessages.length > 3 && (
                        <p className="text-xs text-gray-400">...and {data.fullMessages.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="count" 
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Alternative View - Donut Chart */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Error Type Distribution</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
              label={({errorType, percent}) => 
                `${errorType.length > 12 ? errorType.substring(0, 9) + '...' : errorType}: ${((percent || 0) * 100).toFixed(1)}%`
              }
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const totalErrors = chartData.reduce((sum, item) => sum + item.count, 0);
                  const percentage = ((data.count / totalErrors) * 100).toFixed(1);
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                      <p className="font-medium text-gray-900">Error Type: {data.errorType}</p>
                      <p className="text-red-600 font-semibold">{data.count} occurrences ({percentage}%)</p>
                      <p className="text-xs text-gray-500 capitalize">Severity: {data.severity}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Requests Over Time (Line/Area Chart)
export const RequestsOverTimeChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('RequestsOverTimeChart - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No timeline data to display</p>
        </div>
      </div>
    );
  }

  // Determine time range and interval based on data span
  const timestamps = networkRequests
    .map(req => req.timestamp ? new Date(req.timestamp).getTime() : Date.now())
    .sort((a, b) => a - b);
    
  const oldestTime = timestamps[0];
  const newestTime = timestamps[timestamps.length - 1];
  const timeSpan = newestTime - oldestTime;
  
  // Choose appropriate time interval
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

  console.log('RequestsOverTimeChart - Time span:', timeSpan, 'Interval:', interval);

  // Group requests by time intervals and HTTP methods
  const timeGroups = networkRequests.reduce((acc, req) => {
    const timestamp = req.timestamp ? new Date(req.timestamp) : new Date();
    const method = (req.method || 'GET').toUpperCase();
    
    let timeKey: number;
    
    // Create time bucket based on interval
    if (interval === 'minute') {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                        timestamp.getHours(), timestamp.getMinutes()).getTime();
    } else if (interval === 'hour') {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                        timestamp.getHours()).getTime();
    } else { // day
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()).getTime();
    }
    
    if (!acc[timeKey]) {
      acc[timeKey] = {
        timestamp: timeKey,
        total: 0,
        GET: 0,
        POST: 0,
        PUT: 0,
        DELETE: 0,
        PATCH: 0,
        HEAD: 0,
        OPTIONS: 0,
        other: 0
      };
    }
    
    acc[timeKey].total += 1;
    
    // Count by HTTP method
    if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method)) {
      acc[timeKey][method as keyof typeof acc[typeof timeKey]] += 1;
    } else {
      acc[timeKey].other += 1;
    }
    
    return acc;
  }, {} as { [key: number]: { 
    timestamp: number; 
    total: number; 
    GET: number; 
    POST: number; 
    PUT: number; 
    DELETE: number; 
    PATCH: number; 
    HEAD: number; 
    OPTIONS: number; 
    other: number; 
  } });

  console.log('RequestsOverTimeChart - timeGroups:', timeGroups);

  // Convert to chart data and sort by time
  const chartData = Object.values(timeGroups)
    .sort((a, b) => (a as any).timestamp - (b as any).timestamp)
    .map(group => {
      const g = group as any;
      return {
        time: new Date(g.timestamp).toLocaleString('en-US', timeFormat),
        timestamp: g.timestamp,
        total: g.total,
        GET: g.GET,
        POST: g.POST,
        PUT: g.PUT,
        DELETE: g.DELETE,
        PATCH: g.PATCH,
        HEAD: g.HEAD,
        OPTIONS: g.OPTIONS,
        other: g.other
      };
    });

  console.log('RequestsOverTimeChart - chartData:', chartData);

  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No timeline data available</p>
          <p className="text-xs mt-2">Request timestamps may be missing</p>
        </div>
      </div>
    );
  }

  // Determine which HTTP methods are actually present in the data
  const activeMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'other']
    .filter(method => chartData.some(item => (item as any)[method] > 0));

  console.log('RequestsOverTimeChart - activeMethods:', activeMethods);

  // Method colors
  const methodColors = {
    GET: '#10B981',     // Green
    POST: '#3B82F6',    // Blue  
    PUT: '#F59E0B',     // Amber
    DELETE: '#EF4444',  // Red
    PATCH: '#8B5CF6',   // Purple
    HEAD: '#06B6D4',    // Cyan
    OPTIONS: '#84CC16', // Lime
    other: '#6B7280',   // Gray
    total: '#1F2937'    // Dark gray
  };

  return (
    <div className="space-y-4">
      {/* Chart Controls/Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Time Range:</span> {interval === 'minute' ? 'By Minute' : interval === 'hour' ? 'By Hour' : 'By Day'}
        </div>
        <div>
          <span className="font-medium">Total Requests:</span> {networkRequests.length}
        </div>
      </div>

      {/* Main Timeline Chart - Area Chart for better visual impact */}
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
            interval={'preserveStartEnd'}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [value, name === 'total' ? 'Total Requests' : `${name} Requests`]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          
          {/* Show stacked areas for each HTTP method */}
          {activeMethods.includes('GET') && (
            <Area type="monotone" dataKey="GET" stackId="1" stroke={methodColors.GET} fill={methodColors.GET} fillOpacity={0.6} />
          )}
          {activeMethods.includes('POST') && (
            <Area type="monotone" dataKey="POST" stackId="1" stroke={methodColors.POST} fill={methodColors.POST} fillOpacity={0.6} />
          )}
          {activeMethods.includes('PUT') && (
            <Area type="monotone" dataKey="PUT" stackId="1" stroke={methodColors.PUT} fill={methodColors.PUT} fillOpacity={0.6} />
          )}
          {activeMethods.includes('DELETE') && (
            <Area type="monotone" dataKey="DELETE" stackId="1" stroke={methodColors.DELETE} fill={methodColors.DELETE} fillOpacity={0.6} />
          )}
          {activeMethods.includes('PATCH') && (
            <Area type="monotone" dataKey="PATCH" stackId="1" stroke={methodColors.PATCH} fill={methodColors.PATCH} fillOpacity={0.6} />
          )}
          {activeMethods.includes('HEAD') && (
            <Area type="monotone" dataKey="HEAD" stackId="1" stroke={methodColors.HEAD} fill={methodColors.HEAD} fillOpacity={0.6} />
          )}
          {activeMethods.includes('OPTIONS') && (
            <Area type="monotone" dataKey="OPTIONS" stackId="1" stroke={methodColors.OPTIONS} fill={methodColors.OPTIONS} fillOpacity={0.6} />
          )}
          {activeMethods.includes('other') && (
            <Area type="monotone" dataKey="other" stackId="1" stroke={methodColors.other} fill={methodColors.other} fillOpacity={0.6} />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Alternative: Total Requests Line Chart */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Total Requests Trend</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              fontSize={11}
              interval={'preserveStartEnd'}
            />
            <YAxis fontSize={11} />
            <Tooltip 
              formatter={(value) => [value, 'Total Requests']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke={methodColors.total} 
              strokeWidth={2}
              dot={{ fill: methodColors.total, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Error Frequency Over Time (Line Chart)
export const ErrorFrequencyOverTimeChart: React.FC<ChartProps> = ({ consoleErrors }) => {
  console.log('ErrorFrequencyOverTimeChart - consoleErrors:', consoleErrors?.length || 0);

  if (!consoleErrors || consoleErrors.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No console errors data available</p>
          <p className="text-xs mt-2">No error timeline data to display</p>
        </div>
      </div>
    );
  }

  // Determine time range and interval based on error data span
  const timestamps = consoleErrors
    .map(error => error.timestamp ? new Date(error.timestamp).getTime() : Date.now())
    .sort((a, b) => a - b);
    
  const oldestTime = timestamps[0];
  const newestTime = timestamps[timestamps.length - 1];
  const timeSpan = newestTime - oldestTime;
  
  // Choose appropriate time interval
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

  console.log('ErrorFrequencyOverTimeChart - Time span:', timeSpan, 'Interval:', interval);

  // Group errors by time intervals and severity levels
  const timeGroups = consoleErrors.reduce((acc, error) => {
    const timestamp = error.timestamp ? new Date(error.timestamp) : new Date();
    const severity = (error.severity || error.level || 'error').toLowerCase();
    
    let timeKey: number;
    
    // Create time bucket based on interval
    if (interval === 'minute') {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                        timestamp.getHours(), timestamp.getMinutes()).getTime();
    } else if (interval === 'hour') {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                        timestamp.getHours()).getTime();
    } else { // day
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()).getTime();
    }
    
    if (!acc[timeKey]) {
      acc[timeKey] = {
        timestamp: timeKey,
        total: 0,
        error: 0,
        warning: 0,
        critical: 0,
        info: 0,
        debug: 0,
        other: 0
      };
    }
    
    acc[timeKey].total += 1;
    
    // Count by severity level
    if (['error', 'warning', 'critical', 'info', 'debug'].includes(severity)) {
      acc[timeKey][severity as keyof typeof acc[typeof timeKey]] += 1;
    } else {
      acc[timeKey].other += 1;
    }
    
    return acc;
  }, {} as { [key: number]: { 
    timestamp: number; 
    total: number; 
    error: number; 
    warning: number; 
    critical: number; 
    info: number; 
    debug: number; 
    other: number; 
  } });

  console.log('ErrorFrequencyOverTimeChart - timeGroups:', timeGroups);

  // Convert to chart data and sort by time
  const chartData = Object.values(timeGroups)
    .sort((a, b) => (a as any).timestamp - (b as any).timestamp)
    .map(group => {
      const g = group as any;
      return {
        time: new Date(g.timestamp).toLocaleString('en-US', timeFormat),
        timestamp: g.timestamp,
        total: g.total,
        error: g.error,
        warning: g.warning,
        critical: g.critical,
        info: g.info,
        debug: g.debug,
        other: g.other
      };
    });

  console.log('ErrorFrequencyOverTimeChart - chartData:', chartData);

  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No error timeline data available</p>
          <p className="text-xs mt-2">Error timestamps may be missing</p>
        </div>
      </div>
    );
  }

  // Determine which severity levels are present
  const activeSeverities = ['error', 'warning', 'critical', 'info', 'debug', 'other']
    .filter(severity => chartData.some(item => (item as any)[severity] > 0));

  // Severity colors
  const severityColors = {
    critical: '#DC2626',  // Red-600
    error: '#EF4444',     // Red-500
    warning: '#F59E0B',   // Amber-500
    info: '#3B82F6',      // Blue-500
    debug: '#6B7280',     // Gray-500
    other: '#8B5CF6',     // Purple-500
    total: '#1F2937'      // Gray-800
  };

  return (
    <div className="space-y-4">
      {/* Chart Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Error Timeline:</span> {interval === 'minute' ? 'By Minute' : interval === 'hour' ? 'By Hour' : 'By Day'}
        </div>
        <div>
          <span className="font-medium">Total Errors:</span> {consoleErrors.length}
        </div>
      </div>

      {/* Main Error Timeline - Line Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
            interval={'preserveStartEnd'}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [value, name === 'total' ? 'Total Errors' : `${String(name).charAt(0).toUpperCase() + String(name).slice(1)} Errors`]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          
          {/* Show lines for each active severity level */}
          {activeSeverities.includes('critical') && (
            <Line type="monotone" dataKey="critical" stroke={severityColors.critical} strokeWidth={2} name="Critical" />
          )}
          {activeSeverities.includes('error') && (
            <Line type="monotone" dataKey="error" stroke={severityColors.error} strokeWidth={2} name="Error" />
          )}
          {activeSeverities.includes('warning') && (
            <Line type="monotone" dataKey="warning" stroke={severityColors.warning} strokeWidth={2} name="Warning" />
          )}
          {activeSeverities.includes('info') && (
            <Line type="monotone" dataKey="info" stroke={severityColors.info} strokeWidth={2} name="Info" />
          )}
          {activeSeverities.includes('debug') && (
            <Line type="monotone" dataKey="debug" stroke={severityColors.debug} strokeWidth={2} name="Debug" />
          )}
          {activeSeverities.includes('other') && (
            <Line type="monotone" dataKey="other" stroke={severityColors.other} strokeWidth={2} name="Other" />
          )}
          
          {/* Total errors line (thicker) */}
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke={severityColors.total} 
            strokeWidth={3}
            name="Total Errors"
            dot={{ fill: severityColors.total, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Alternative: Bar Chart View */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Error Frequency Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              fontSize={11}
              interval={'preserveStartEnd'}
            />
            <YAxis fontSize={11} />
            <Tooltip 
              formatter={(value, name) => [value, `${String(name).charAt(0).toUpperCase() + String(name).slice(1)} Errors`]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Bar dataKey="total" fill={severityColors.total} name="Total Errors" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Latency Over Time (Line Chart)
export const LatencyOverTimeChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('LatencyOverTimeChart - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No latency timeline data to display</p>
        </div>
      </div>
    );
  }

  // Filter requests that have response times
  const requestsWithLatency = networkRequests.filter(req => {
    const responseTime = req.response_time || req.responseTime || req.duration;
    return responseTime && typeof responseTime === 'number' && responseTime > 0;
  });

  console.log('LatencyOverTimeChart - requestsWithLatency:', requestsWithLatency.length);

  if (requestsWithLatency.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No latency data available</p>
          <p className="text-xs mt-2">Response times not captured or missing</p>
        </div>
      </div>
    );
  }

  // Determine time range and interval
  const timestamps = requestsWithLatency
    .map(req => req.timestamp ? new Date(req.timestamp).getTime() : Date.now())
    .sort((a, b) => a - b);
    
  const oldestTime = timestamps[0];
  const newestTime = timestamps[timestamps.length - 1];
  const timeSpan = newestTime - oldestTime;
  
  let interval: 'hour' | 'day' | 'minute' = 'hour';
  let timeFormat: Intl.DateTimeFormatOptions;
  
  if (timeSpan <= 2 * 60 * 60 * 1000) {
    interval = 'minute';
    timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
  } else if (timeSpan <= 7 * 24 * 60 * 60 * 1000) {
    interval = 'hour';
    timeFormat = { month: 'short', day: 'numeric', hour: 'numeric', hour12: true };
  } else {
    interval = 'day';
    timeFormat = { month: 'short', day: 'numeric' };
  }

  // Group requests by time intervals and calculate latency statistics
  const timeGroups = requestsWithLatency.reduce((acc, req) => {
    const timestamp = req.timestamp ? new Date(req.timestamp) : new Date();
    const method = (req.method || 'GET').toUpperCase();
    const responseTime = req.response_time || req.responseTime || req.duration;
    
    let timeKey: number;
    
    if (interval === 'minute') {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                        timestamp.getHours(), timestamp.getMinutes()).getTime();
    } else if (interval === 'hour') {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 
                        timestamp.getHours()).getTime();
    } else {
      timeKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()).getTime();
    }
    
    if (!acc[timeKey]) {
      acc[timeKey] = {
        timestamp: timeKey,
        latencies: [],
        getMethods: [],
        postMethods: [],
        otherMethods: [],
        count: 0
      };
    }
    
    acc[timeKey].latencies.push(responseTime);
    acc[timeKey].count += 1;
    
    // Categorize by method
    if (method === 'GET') {
      acc[timeKey].getMethods.push(responseTime);
    } else if (method === 'POST') {
      acc[timeKey].postMethods.push(responseTime);
    } else {
      acc[timeKey].otherMethods.push(responseTime);
    }
    
    return acc;
  }, {} as { [key: number]: { 
    timestamp: number; 
    latencies: number[];
    getMethods: number[];
    postMethods: number[];
    otherMethods: number[];
    count: number;
  } });

  // Calculate statistics for each time bucket
  const chartData = Object.values(timeGroups)
    .sort((a, b) => (a as any).timestamp - (b as any).timestamp)
    .map(group => {
      const g = group as any;
      const latencies = g.latencies.sort((a: number, b: number) => a - b);
      
      const avgLatency = Math.round(latencies.reduce((sum: number, val: number) => sum + val, 0) / latencies.length);
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);
      const medianLatency = latencies[Math.floor(latencies.length / 2)];
      
      // Calculate averages by method
      const avgGet = g.getMethods.length > 0 ? Math.round(g.getMethods.reduce((sum: number, val: number) => sum + val, 0) / g.getMethods.length) : 0;
      const avgPost = g.postMethods.length > 0 ? Math.round(g.postMethods.reduce((sum: number, val: number) => sum + val, 0) / g.postMethods.length) : 0;
      const avgOther = g.otherMethods.length > 0 ? Math.round(g.otherMethods.reduce((sum: number, val: number) => sum + val, 0) / g.otherMethods.length) : 0;
      
      return {
        time: new Date(g.timestamp).toLocaleString('en-US', timeFormat),
        timestamp: g.timestamp,
        avgLatency,
        minLatency,
        maxLatency,
        medianLatency,
        avgGet,
        avgPost,
        avgOther,
        sampleSize: g.count
      };
    });

  console.log('LatencyOverTimeChart - chartData:', chartData);

  // Latency colors
  const latencyColors = {
    avg: '#3B82F6',      // Blue
    min: '#10B981',      // Green
    max: '#EF4444',      // Red
    median: '#8B5CF6',   // Purple
    get: '#10B981',      // Green
    post: '#F59E0B',     // Amber
    other: '#6B7280'     // Gray
  };

  return (
    <div className="space-y-4">
      {/* Chart Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Latency Timeline:</span> {interval === 'minute' ? 'By Minute' : interval === 'hour' ? 'By Hour' : 'By Day'}
        </div>
        <div>
          <span className="font-medium">Requests with Latency:</span> {requestsWithLatency.length}
        </div>
      </div>

      {/* Main Latency Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="time" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
            interval={'preserveStartEnd'}
          />
          <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            formatter={(value, name) => [`${value}ms`, name === 'avgLatency' ? 'Average Latency' : 
                                                       name === 'maxLatency' ? 'Max Latency' :
                                                       name === 'minLatency' ? 'Min Latency' : 
                                                       name === 'medianLatency' ? 'Median Latency' : name]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          
          {/* Latency trend lines */}
          <Line 
            type="monotone" 
            dataKey="avgLatency" 
            stroke={latencyColors.avg} 
            strokeWidth={3}
            name="Average Latency"
            dot={{ fill: latencyColors.avg, strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="maxLatency" 
            stroke={latencyColors.max} 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Max Latency"
          />
          <Line 
            type="monotone" 
            dataKey="minLatency" 
            stroke={latencyColors.min} 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Min Latency"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* By Request Type */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Latency by Request Type</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              fontSize={11}
              interval={'preserveStartEnd'}
            />
            <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} fontSize={11} />
            <Tooltip 
              formatter={(value, name) => [`${value}ms`, `${String(name).toUpperCase()} Average`]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend />
            
            {chartData.some(item => item.avgGet > 0) && (
              <Line type="monotone" dataKey="avgGet" stroke={latencyColors.get} strokeWidth={2} name="GET Requests" />
            )}
            {chartData.some(item => item.avgPost > 0) && (
              <Line type="monotone" dataKey="avgPost" stroke={latencyColors.post} strokeWidth={2} name="POST Requests" />
            )}
            {chartData.some(item => item.avgOther > 0) && (
              <Line type="monotone" dataKey="avgOther" stroke={latencyColors.other} strokeWidth={2} name="Other Requests" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Traffic by Endpoints/Domains (Vertical Bar Chart with Alternative View)
export const TrafficByEndpointChart: React.FC<ChartProps> = ({ networkRequests }) => {
  const [topN, setTopN] = React.useState(10);
  const [viewMode, setViewMode] = React.useState<'endpoints' | 'domains'>('endpoints');

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No endpoint traffic data to display</p>
        </div>
      </div>
    );
  }

  // Helper function to extract base domain (using same logic as domain stats)
  const extractBaseDomain = (url: string): string => {
    try {
      if (!url || url.startsWith('/')) {
        return 'localhost';
      }
      
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes('/')) {
          fullUrl = 'https://' + url;
        } else {
          return 'unknown';
        }
      }
      
      const urlObj = new URL(fullUrl);
      const hostname = urlObj.hostname;
      const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
      const parts = withoutWww.split('.');
      
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      
      return withoutWww;
    } catch (error) {
      return 'unknown';
    }
  };

  // Group requests by endpoint URL pathname
  const endpointCounts: { [key: string]: number } = {};
  const domainCounts: { [key: string]: number } = {};
  
  networkRequests.forEach(req => {
    if (req.url) {
      try {
        // Endpoint grouping
        const url = new URL(req.url);
        const endpoint = url.pathname || '/';
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;

        // Domain grouping (using same logic as domain stats)
        const mainDomain = req.main_domain || extractBaseDomain(req.url);
        if (mainDomain && mainDomain !== 'unknown') {
          domainCounts[mainDomain] = (domainCounts[mainDomain] || 0) + 1;
        }
      } catch (error) {
        // For invalid URLs, try domain extraction anyway
        const mainDomain = req.main_domain || extractBaseDomain(req.url);
        if (mainDomain && mainDomain !== 'unknown') {
          domainCounts[mainDomain] = (domainCounts[mainDomain] || 0) + 1;
        }
      }
    }
  });

  // Helper function to create unique display names
  const createUniqueDisplayName = (items: Array<{fullName: string, requests: number}>) => {
    const nameMap = new Map<string, number>();
    
    return items.map(item => {
      let displayName = item.fullName.length > 30 ? `${item.fullName.substring(0, 27)}...` : item.fullName;
      
      // If this display name already exists, make it unique
      if (nameMap.has(displayName)) {
        const count = nameMap.get(displayName)! + 1;
        nameMap.set(displayName, count);
        // Add request count to make it unique
        displayName = `${displayName.replace('...', '')}... (${item.requests})`;
      } else {
        nameMap.set(displayName, 1);
      }
      
      return {
        name: displayName,
        fullName: item.fullName,
        requests: item.requests,
        id: `${item.fullName}_${item.requests}` // More unique ID
      };
    });
  };

  // Convert to chart data format and sort by request count
  const allEndpointsRaw = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({
      fullName: endpoint,
      requests: count
    }))
    .sort((a, b) => b.requests - a.requests);

  const allDomainsRaw = Object.entries(domainCounts)
    .map(([domain, count]) => ({
      fullName: domain,
      requests: count
    }))
    .sort((a, b) => b.requests - a.requests);

  // Create unique display names
  const allEndpoints = createUniqueDisplayName(allEndpointsRaw);
  const allDomains = createUniqueDisplayName(allDomainsRaw);

  // Apply Top N filter based on view mode
  const chartData = viewMode === 'endpoints' 
    ? allEndpoints.slice(0, topN)
    : allDomains.slice(0, topN);

  const totalItems = viewMode === 'endpoints' ? allEndpoints.length : allDomains.length;

  // Debug logging to help identify data issues
  console.log(`Traffic Chart Debug - ${viewMode} mode:`, {
    totalItems,
    chartDataLength: chartData.length,
    sampleData: chartData.slice(0, 3).map(d => ({ 
      name: d.name, 
      fullName: d.fullName, 
      requests: d.requests 
    })),
    duplicateNames: chartData.filter((item, index, arr) => 
      arr.findIndex(other => other.name === item.name) !== index
    ).map(d => ({ 
      name: d.name, 
      fullName: d.fullName, 
      requests: d.requests,
      duplicateOf: chartData.find((other, otherIndex) => 
        other.name === d.name && otherIndex < chartData.findIndex(x => x.name === d.name)
      )?.fullName
    }))
  });

  // Top N options
  const topNOptions = [5, 10, 15, 20, 25, 30];

  return (
    <div className="space-y-4">
      {/* Chart Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Traffic by {viewMode === 'endpoints' ? 'Endpoints' : 'Domains'}:</span> Top {chartData.length} of {totalItems}
        </div>
        <div>
          <span className="font-medium">Total Requests:</span> {viewMode === 'endpoints' 
            ? allEndpoints.reduce((sum, item) => sum + item.requests, 0)
            : allDomains.reduce((sum, item) => sum + item.requests, 0)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <div className="flex border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('endpoints')}
                className={`px-3 py-1 text-sm rounded-l ${
                  viewMode === 'endpoints'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Endpoints
              </button>
              <button
                onClick={() => setViewMode('domains')}
                className={`px-3 py-1 text-sm rounded-r ${
                  viewMode === 'domains'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Domains
              </button>
            </div>
          </div>

          {/* Top N Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show Top:</label>
            <select 
              value={topN} 
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {topNOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Main Bar Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={11}
            interval={0}
          />
          <YAxis 
            label={{ value: 'Request Count', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                    <p className="font-medium text-gray-900">
                      {viewMode === 'endpoints' ? 'Endpoint:' : 'Domain:'} {data.fullName}
                    </p>
                    <p className="text-blue-600 font-semibold">{data.requests} requests</p>
                    {data.name !== data.fullName && (
                      <p className="text-xs text-gray-500">Display: {data.name}</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="requests" 
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Alternative View - Pie Chart Distribution */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {viewMode === 'endpoints' ? 'Endpoint' : 'Domain'} Distribution
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="requests"
              label={({name, percent}) => 
                `${name && name.length > 15 ? name.substring(0, 12) + '...' : name}: ${((percent || 0) * 100).toFixed(1)}%`
              }
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const totalRequests = chartData.reduce((sum, item) => sum + item.requests, 0);
                  const percentage = ((data.requests / totalRequests) * 100).toFixed(1);
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                      <p className="font-medium text-gray-900">
                        {viewMode === 'endpoints' ? 'Endpoint:' : 'Domain:'} {data.fullName}
                      </p>
                      <p className="text-blue-600 font-semibold">{data.requests} requests ({percentage}%)</p>
                      {data.name !== data.fullName && (
                        <p className="text-xs text-gray-500">Display: {data.name}</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Traffic by Endpoint (Vertical Bar Chart)
export const TrafficByEndpointChartTreemap: React.FC<ChartProps> = ({ networkRequests }) => {
  try {
    const [selectedMethod, setSelectedMethod] = useState('ALL');
    const [topN, setTopN] = useState(10);
    
    console.log('TrafficByEndpointChart - networkRequests:', networkRequests?.length || 0);

    if (!networkRequests || networkRequests.length === 0) {
      return (
        <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p>No network requests data available</p>
            <p className="text-xs mt-2">No endpoint traffic data to display</p>
          </div>
        </div>
      );
    }

  // Filter by method if not 'ALL'
  const filteredRequests = selectedMethod === 'ALL' 
    ? networkRequests 
    : networkRequests.filter(req => (req.method || 'GET').toUpperCase() === selectedMethod);

  // Process endpoints - group by endpoint and count requests
  const endpointCounts = filteredRequests.reduce((acc: any, req: any) => {
    if (!req.url) return acc;
    
    try {
      const url = new URL(req.url);
      const endpoint = url.pathname;
      const method = (req.method || 'GET').toUpperCase();
      const key = `${method} ${endpoint}`;
      
      if (!acc[key]) {
        acc[key] = {
          name: endpoint,
          fullName: key,
          method: method,
          value: 0,
          urls: []
        };
      }
      
      acc[key].value++;
      acc[key].urls.push(req.url);
      
      return acc;
    } catch (error) {
      return acc;
    }
  }, {});

  // Convert to vertical bar chart data format and sort by count
  const chartData = Object.values(endpointCounts)
    .filter((item: any) => item && item.value > 0) // Filter out invalid items
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, topN) // Use topN instead of fixed 25
    .map((item: any, index) => ({
      name: item.name.length > 40 ? `${item.name.substring(0, 37)}...` : item.name,
      fullName: item.name,
      count: item.value,
      method: item.method,
      rank: index + 1
    }));

  console.log('Vertical bar chart data prepared:', {
    totalEndpoints: Object.keys(endpointCounts).length,
    displayingTop: chartData.length,
    sampleData: chartData.slice(0, 3),
    topN: topN
  });

  // Safety check for chart data
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-96 bg-yellow-50 rounded flex items-center justify-center">
        <div className="text-center text-yellow-600">
          <p>No valid endpoint data</p>
          <p className="text-xs mt-2">Try changing the method filter or check data</p>
        </div>
      </div>
    );
  }

  // Get available methods for filter
  const availableMethods = ['ALL', ...new Set(networkRequests.map(req => (req.method || 'GET').toUpperCase()))];

  // Top N options
  const topNOptions = [5, 10, 25, 50, 100];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          {/* Method Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Method:</label>
            <select 
              value={selectedMethod} 
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {availableMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Top N Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show Top:</label>
            <select 
              value={topN} 
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {topNOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">Showing:</span> Top {chartData.length} of {Object.keys(endpointCounts).length} endpoints
        </div>
      </div>

      {/* Vertical Bar Chart */}
      <div className="bg-white p-4 rounded border">
        <div className="text-xs text-gray-400 mb-2">
          Displaying {chartData.length} endpoints as vertical bars
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 40, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={10}
              interval={0}
            />
            <YAxis 
              label={{ value: 'Number of Requests', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                      <p className="font-medium text-gray-900">#{data.rank} {data.fullName}</p>
                      <p className="text-blue-600 font-semibold">{data.count} requests</p>
                      <p className="text-xs text-gray-500">Method: {data.method}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Available Methods Info */}
      <div className="text-center text-sm text-gray-600">
        <span className="font-medium">Available methods:</span> {availableMethods.filter(m => m !== 'ALL').join(', ')}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 text-center">
        � Bar height represents request count. Use controls to filter by method and adjust number shown.
      </div>
    </div>
  );
  } catch (error) {
    console.error('TrafficByEndpointChart ERROR:', error);
    return (
      <div className="h-96 bg-red-50 rounded flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error rendering traffic chart</p>
          <p className="text-xs mt-2">Check console for details</p>
        </div>
      </div>
    );
  }
};

// Method Usage Daily (Stacked Bar Chart)
export const MethodUsageDailyChart: React.FC<ChartProps> = ({ networkRequests }) => {
  try {
    console.log('MethodUsageDailyChart - networkRequests:', networkRequests?.length || 0);

    if (!networkRequests || networkRequests.length === 0) {
      console.log('MethodUsageDailyChart - No data available');
      return (
        <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p>No network requests data available</p>
            <p className="text-xs mt-2">No daily method usage data to display</p>
          </div>
        </div>
      );
    }

    // Additional safety check for array structure
    if (!Array.isArray(networkRequests)) {
      console.error('MethodUsageDailyChart - networkRequests is not an array:', typeof networkRequests);
      return (
        <div className="h-96 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-medium">Data Type Error</p>
            <p className="text-sm mt-2">Expected array but got {typeof networkRequests}</p>
          </div>
        </div>
      );
    }

    // State for chart type toggle
    const [chartType, setChartType] = React.useState<'stacked' | 'line'>('stacked');

    // Group requests by day and method with enhanced error handling
    let dailyMethodData;
    try {
      dailyMethodData = networkRequests.reduce((acc, req, index) => {
        try {
          // Additional safety checks
          if (!req) {
            console.warn(`Request ${index} is null/undefined`);
            return acc;
          }

          const timestamp = req.timestamp ? new Date(req.timestamp) : new Date();
          const method = (req.method || 'GET').toUpperCase();
          
          // Validate timestamp
          if (isNaN(timestamp.getTime())) {
            console.warn(`Invalid timestamp for request ${index}:`, req.timestamp);
            return acc;
          }
          
          // Create day key (YYYY-MM-DD)
          const dayKey = timestamp.toISOString().split('T')[0];
          
          if (!acc[dayKey]) {
            acc[dayKey] = {
              date: dayKey,
              timestamp: timestamp.getTime(),
              GET: 0,
              POST: 0,
              PUT: 0,
              DELETE: 0,
              PATCH: 0,
              OPTIONS: 0,
              HEAD: 0,
              OTHER: 0,
              total: 0
            };
          }
          
          if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(method)) {
            acc[dayKey][method as keyof typeof acc[typeof dayKey]] += 1;
          } else {
            acc[dayKey].OTHER += 1;
          }
          
          acc[dayKey].total += 1;
          
          return acc;
        } catch (error) {
          console.warn(`Error processing request ${index}:`, error, req);
          return acc;
        }
      }, {} as { [key: string]: { 
        date: string; 
        timestamp: number;
        GET: number; 
        POST: number; 
        PUT: number; 
        DELETE: number; 
        PATCH: number; 
        OPTIONS: number; 
        HEAD: number; 
        OTHER: number; 
        total: number; 
      } });
    } catch (error) {
      console.error('Error in reduce operation:', error);
      return (
        <div className="h-96 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-medium">Data Processing Error</p>
            <p className="text-sm mt-2">Failed to process network requests data</p>
            <p className="text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      );
    }

    console.log('MethodUsageDailyChart - Processed daily data:', Object.keys(dailyMethodData).length, 'days');

    // Convert to chart data and sort by date with error handling
    let chartData;
    try {
      chartData = Object.values(dailyMethodData)
        .sort((a, b) => (a as any).timestamp - (b as any).timestamp)
        .map((day: any) => {
          try {
            // Ensure all required properties exist with default values
            const processedDay = {
              date: new Date(day.timestamp).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              fullDate: day.date || '',
              GET: Number(day.GET) || 0,
              POST: Number(day.POST) || 0,
              PUT: Number(day.PUT) || 0,
              DELETE: Number(day.DELETE) || 0,
              PATCH: Number(day.PATCH) || 0,
              OPTIONS: Number(day.OPTIONS) || 0,
              HEAD: Number(day.HEAD) || 0,
              OTHER: Number(day.OTHER) || 0,
              total: Number(day.total) || 0
            };
            
            // Validate that the processed day has valid data
            if (processedDay.total === 0) {
              console.warn('Day with zero total requests:', processedDay);
            }
            
            return processedDay;
          } catch (error) {
            console.warn('Error formatting day data:', error, day);
            return null;
          }
        })
        .filter(day => day !== null && day !== undefined);

      console.log('MethodUsageDailyChart - chartData:', chartData.length, 'days');
      console.log('MethodUsageDailyChart - first chart item:', chartData[0]);
    } catch (error) {
      console.error('Error converting daily data to chart format:', error);
      return (
        <div className="h-96 bg-red-50 border border-red-200 rounded flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-medium">Chart Data Processing Error</p>
            <p className="text-sm mt-2">Failed to process daily method data</p>
            <p className="text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      );
    }

    // Determine which methods are actually used
    let activeMethods: string[];
    try {
      activeMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'OTHER']
        .filter(method => {
          try {
            return chartData && Array.isArray(chartData) && chartData.some(day => {
              return day && typeof day === 'object' && (day as any)[method] > 0;
            });
          } catch (error) {
            console.warn(`Error checking method ${method}:`, error);
            return false;
          }
        });
    } catch (error) {
      console.error('Error determining active methods:', error);
      activeMethods = [];
    }

    console.log('MethodUsageDailyChart - activeMethods:', activeMethods);
    console.log('MethodUsageDailyChart - chartData sample:', chartData.slice(0, 2));

    // Method colors (consistent with other charts)
    const methodColors = {
      GET: '#10B981',     // Green
      POST: '#3B82F6',    // Blue
      PUT: '#F59E0B',     // Amber
      DELETE: '#EF4444',  // Red
      PATCH: '#8B5CF6',   // Purple
      OPTIONS: '#6B7280', // Gray
      HEAD: '#EC4899',    // Pink
      OTHER: '#1F2937'    // Dark Gray
    };

    // Additional safety check for chart data and active methods
    if (chartData.length === 0 || activeMethods.length === 0) {
      return (
        <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p>No valid chart data available</p>
            <p className="text-xs mt-2">
              {chartData.length === 0 ? 'No processed daily data' : 'No HTTP methods found in data'}
            </p>
          </div>
        </div>
      );
    }  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('stacked')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'stacked' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Stacked Bars
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'line' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Line Chart
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="font-medium">Period:</span> {chartData.length} days
        </div>
      </div>

      {/* Stacked Bar Chart */}
      {chartType === 'stacked' && (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Debug: chartData length: {chartData.length}, activeMethods: {activeMethods.join(', ')}
          </div>
          {chartData.length > 0 && activeMethods.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [`${value} requests`, String(name)]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                
                {activeMethods.map(method => (
                  <Bar 
                    key={method}
                    dataKey={method} 
                    stackId="methods"
                    fill={methodColors[method as keyof typeof methodColors] || '#6B7280'}
                    name={method}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-center">
              <div className="text-center text-yellow-600">
                <p className="font-medium">Chart Data Issue</p>
                <p className="text-sm mt-2">chartData: {chartData.length}, activeMethods: {activeMethods.length}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Line Chart */}
      {chartType === 'line' && (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Debug: Line chart data length: {chartData.length}, activeMethods: {activeMethods.join(', ')}
          </div>
          {chartData.length > 0 && activeMethods.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [`${value} requests`, String(name)]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                
                {activeMethods.map(method => (
                  <Line 
                    key={method}
                    type="monotone" 
                    dataKey={method} 
                    stroke={methodColors[method as keyof typeof methodColors] || '#6B7280'}
                    strokeWidth={2}
                    name={method}
                    dot={{ fill: methodColors[method as keyof typeof methodColors] || '#6B7280', strokeWidth: 2, r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 bg-yellow-50 border border-yellow-200 rounded flex items-center justify-center">
              <div className="text-center text-yellow-600">
                <p className="font-medium">Line Chart Data Issue</p>
                <p className="text-sm mt-2">chartData: {chartData.length}, activeMethods: {activeMethods.length}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {activeMethods && activeMethods.length > 0 ? activeMethods.slice(0, 4).map(method => {
          const total = chartData.reduce((sum, day) => sum + ((day as any)[method] || 0), 0);
          const percentage = networkRequests.length > 0 ? ((total / networkRequests.length) * 100).toFixed(1) : '0.0';
          
          return (
            <div key={method} className="bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: methodColors[method as keyof typeof methodColors] || '#6B7280' }}
                />
                <span className="font-medium">{method}</span>
              </div>
              <div className="text-gray-600">
                {total} requests ({percentage}%)
              </div>
            </div>
          );
        }) : (
          <div className="col-span-4 text-center text-gray-400">
            <p>No method statistics available</p>
          </div>
        )}
      </div>
    </div>
  );
  } catch (error) {
    console.error('MethodUsageDailyChart - Unexpected error:', error);
    return (
      <div className="h-96 bg-red-50 border border-red-200 rounded flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="font-medium">Chart Error</p>
          <p className="text-sm mt-2">Method Usage Daily Chart failed to render</p>
          <p className="text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
};

// Status Code Breakdown (Enhanced)
export const StatusCodeBreakdownChartNew: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('StatusCodeBreakdownChartNew - received:', networkRequests?.length || 0, 'requests');
  
  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">Status codes not captured or missing</p>
        </div>
      </div>
    );
  }

  // State for grouping preference
  const [groupByClass, setGroupByClass] = React.useState(false);

  // Simple direct approach - count status codes
  const statusCounts: { [key: string]: number } = {};
  
  networkRequests.forEach(req => {
    // Try all possible status fields
    const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 'Unknown';
    const statusKey = String(status);
    statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
  });

  console.log('StatusCodeBreakdownChartNew - statusCounts:', statusCounts);

  // Convert to chart data with class information
  const statusEntries = Object.entries(statusCounts).map(([status, count]) => {
    const statusNum = parseInt(status) || 0;
    return {
      code: status,
      count,
      class: statusNum === 0 ? '0xx' : Math.floor(statusNum / 100) + 'xx'
    };
  });

  // Group by class if needed
  const chartData = groupByClass 
    ? statusEntries.reduce((acc, item) => {
        const existing = acc.find(entry => entry.name === item.class);
        if (existing) {
          existing.value += item.count;
        } else {
          acc.push({
            name: item.class,
            value: item.count
          });
        }
        return acc;
      }, [] as { name: string; value: number; }[])
    : statusEntries.map(item => ({
        name: item.code,
        value: item.count
      }));

  console.log('StatusCodeBreakdownChartNew - chartData:', chartData);

  // Color function with better color scheme
  const getStatusColor = (name: string) => {
    if (groupByClass) {
      switch (name) {
        case '0xx': return '#6B7280'; // Gray for network failures  
        case '2xx': return '#059669'; // Emerald for success
        case '3xx': return '#0891B2'; // Cyan for redirects
        case '4xx': return '#DC2626'; // Red for client errors
        case '5xx': return '#7C2D12'; // Dark red for server errors
        default: return '#9CA3AF';
      }
    } else {
      const code = parseInt(name) || 0;
      if (code === 0) return '#6B7280'; // Gray for network failures
      if (code >= 200 && code < 300) return '#059669'; // Emerald for success
      if (code >= 300 && code < 400) return '#0891B2'; // Cyan for redirects  
      if (code >= 400 && code < 500) return '#DC2626'; // Red for client errors
      if (code >= 500) return '#7C2D12'; // Dark red for server errors
      return '#9CA3AF'; // Default gray
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">View:</label>
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setGroupByClass(true)}
              className={`px-3 py-1 text-sm transition-colors ${
                groupByClass 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              By Class
            </button>
            <button
              onClick={() => setGroupByClass(false)}
              className={`px-3 py-1 text-sm transition-colors border-l border-gray-300 ${
                !groupByClass 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Individual
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="font-medium">Total Requests:</span> {networkRequests.length}
        </div>
      </div>

      <div className="space-y-6">
        {/* Donut Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} requests (${((value as number / networkRequests.length) * 100).toFixed(1)}%)`, `Status ${name}`]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart Alternative */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Status Counts</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, _name) => [`${value} requests`, 'Count']}
                labelFormatter={(label) => `Status: ${label}`}
              />
              <Bar dataKey="value" fill="#3B82F6">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Payload Size Distribution (Histogram with Alternative Box Plot)
export const PayloadSizeDistributionChart: React.FC<ChartProps> = ({ networkRequests }) => {
  const [viewMode, setViewMode] = React.useState<'histogram' | 'timeline'>('histogram');
  
  console.log('PayloadSizeDistributionChart - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No payload size data to display</p>
        </div>
      </div>
    );
  }

  // Extract payload sizes from network requests with timestamps
  const payloadSizes = networkRequests
    .map(req => {
      // Try to get payload size from various possible fields
      const requestSize = req.requestSize || req.request_size || req.payload_size || 0;
      const responseSize = req.responseSize || req.response_size || req.content_length || 0;
      const totalSize = requestSize + responseSize;
      const timestamp = req.timestamp || req.created_at;
      
      return {
        requestSize,
        responseSize,
        totalSize,
        timestamp,
        url: req.url || 'Unknown'
      };
    })
    .filter(item => item.totalSize > 0 && item.timestamp); // Only include requests with payload data and timestamps

  console.log('PayloadSizeDistributionChart - payloadSizes:', payloadSizes.length);

  if (payloadSizes.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No payload size data available</p>
          <p className="text-xs mt-2">Network requests may not have size information</p>
        </div>
      </div>
    );
  }

  // Helper function to format bytes
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Timeline data processing for area chart
  const timelineData = React.useMemo(() => {
    if (payloadSizes.length === 0) return [];

    // Group by time intervals (hourly)
    const timeGroups: { [key: string]: { sizes: number[]; timestamp: number } } = {};
    
    payloadSizes.forEach(item => {
      try {
        const date = new Date(item.timestamp);
        // Group by hour
        const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        
        if (!timeGroups[hourKey]) {
          timeGroups[hourKey] = { sizes: [], timestamp: date.getTime() };
        }
        timeGroups[hourKey].sizes.push(item.totalSize);
      } catch (error) {
        console.warn('Invalid timestamp:', item.timestamp);
      }
    });

    // Calculate average payload size for each time period
    return Object.entries(timeGroups)
      .map(([timeKey, data]) => {
        const avgSize = data.sizes.reduce((sum, size) => sum + size, 0) / data.sizes.length;
        const maxSize = Math.max(...data.sizes);
        const minSize = Math.min(...data.sizes);
        
        return {
          time: timeKey,
          timestamp: data.timestamp,
          avgSize: Math.round(avgSize),
          maxSize,
          minSize,
          requestCount: data.sizes.length
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [payloadSizes]);

  // Histogram data processing
  const sizes = payloadSizes.map(item => item.totalSize);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  // Create better histogram bins based on size ranges
  const createSizeBins = () => {
    const sizeRanges = [
      { min: 0, max: 1024, label: '0-1KB' },
      { min: 1024, max: 5 * 1024, label: '1-5KB' },
      { min: 5 * 1024, max: 10 * 1024, label: '5-10KB' },
      { min: 10 * 1024, max: 50 * 1024, label: '10-50KB' },
      { min: 50 * 1024, max: 100 * 1024, label: '50-100KB' },
      { min: 100 * 1024, max: Infinity, label: '100KB+' }
    ];

    return sizeRanges.map(range => {
      const count = payloadSizes.filter(item => 
        item.totalSize >= range.min && item.totalSize < range.max
      ).length;

      return {
        range: range.label,
        count,
        binStart: range.min,
        binEnd: range.max === Infinity ? maxSize : range.max
      };
    });
  };

  const bins = createSizeBins();

  // Calculate statistics for box plot
  const sortedSizes = [...sizes].sort((a, b) => a - b);
  const q1 = sortedSizes[Math.floor(sortedSizes.length * 0.25)];
  const median = sortedSizes[Math.floor(sortedSizes.length * 0.5)];
  const q3 = sortedSizes[Math.floor(sortedSizes.length * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  
  // Find outliers
  const outliers = sortedSizes.filter(size => size < lowerFence || size > upperFence);

  console.log('PayloadSizeDistributionChart - bins:', bins);
  console.log('PayloadSizeDistributionChart - timeline:', timelineData.slice(0, 3));
  console.log('PayloadSizeDistributionChart - stats:', { minSize, maxSize, median, q1, q3, outliers: outliers.length });

  return (
    <div className="space-y-4">
      {/* Chart Info and Controls */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Payload Size Analysis:</span> {payloadSizes.length} requests with size data
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <div className="flex border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('histogram')}
                className={`px-3 py-1 text-sm rounded-l ${
                  viewMode === 'histogram'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Histogram
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-sm rounded-r ${
                  viewMode === 'timeline'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Timeline
              </button>
            </div>
          </div>
          
          <div className="flex gap-4">
            <span><strong>Min:</strong> {formatBytes(minSize)}</span>
            <span><strong>Median:</strong> {formatBytes(median)}</span>
            <span><strong>Max:</strong> {formatBytes(maxSize)}</span>
          </div>
        </div>
      </div>

      {/* Histogram View */}
      {viewMode === 'histogram' && (
        <>
          {/* Main Histogram */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Payload Size Distribution - Histogram</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={bins}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="range"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={11}
                  interval={0}
                />
                <YAxis 
                  label={{ value: 'Number of Requests', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                          <p className="font-medium text-gray-900">Size Range: {data.range}</p>
                          <p className="text-blue-600 font-semibold">{data.count} requests</p>
                          <p className="text-xs text-gray-500">
                            {((data.count / payloadSizes.length) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                >
                  {bins.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${210 + index * 15}, 70%, ${60 - index * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Box Plot Summary */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Statistical Summary (Box Plot View)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Statistical Summary */}
              <div className="bg-gray-50 p-4 rounded">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Statistical Summary</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Minimum:</span>
                    <span className="font-medium">{formatBytes(minSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1st Quartile (Q1):</span>
                    <span className="font-medium">{formatBytes(q1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median (Q2):</span>
                    <span className="font-medium">{formatBytes(median)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3rd Quartile (Q3):</span>
                    <span className="font-medium">{formatBytes(q3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maximum:</span>
                    <span className="font-medium">{formatBytes(maxSize)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Outliers:</span>
                    <span className="font-medium text-red-600">{outliers.length}</span>
                  </div>
                </div>
              </div>

              {/* Visual Box Plot */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'Min', value: minSize, color: '#6B7280' },
                    { name: 'Q1', value: q1, color: '#3B82F6' },
                    { name: 'Median', value: median, color: '#10B981' },
                    { name: 'Q3', value: q3, color: '#3B82F6' },
                    { name: 'Max', value: maxSize, color: '#6B7280' }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis 
                    tickFormatter={(value) => formatBytes(value)}
                    fontSize={11}
                  />
                  <Tooltip 
                    formatter={(value) => [formatBytes(value as number), 'Size']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'Min', value: minSize, color: '#6B7280' },
                      { name: 'Q1', value: q1, color: '#3B82F6' },
                      { name: 'Median', value: median, color: '#10B981' },
                      { name: 'Q3', value: q3, color: '#3B82F6' },
                      { name: 'Max', value: maxSize, color: '#6B7280' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Payload Size Distribution Over Time</h3>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={timelineData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="time"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={11}
                  interval={'preserveStartEnd'}
                />
                <YAxis 
                  label={{ value: 'Average Payload Size', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => formatBytes(value)}
                  fontSize={11}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                          <p className="font-medium text-gray-900">Time: {label}</p>
                          <p className="text-blue-600 font-semibold">Average: {formatBytes(data.avgSize)}</p>
                          <p className="text-xs text-gray-500">Max: {formatBytes(data.maxSize)}</p>
                          <p className="text-xs text-gray-500">Min: {formatBytes(data.minSize)}</p>
                          <p className="text-xs text-gray-500">Requests: {data.requestCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Average payload size area */}
                <Area
                  type="monotone"
                  dataKey="avgSize"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Average Size"
                />
                {/* Max payload size line */}
                <Area
                  type="monotone"
                  dataKey="maxSize"
                  stroke="#EF4444"
                  fill="transparent"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Max Size"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <p>No timeline data available</p>
                <p className="text-xs mt-2">Requests may not have valid timestamps</p>
              </div>
            </div>
          )}
          
          {/* Timeline Summary */}
          {timelineData.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="font-medium text-blue-800">Time Periods</div>
                <div className="text-blue-600">{timelineData.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="font-medium text-green-800">Avg Size</div>
                <div className="text-green-600">
                  {formatBytes(timelineData.reduce((sum, item) => sum + item.avgSize, 0) / timelineData.length)}
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="font-medium text-yellow-800">Peak Size</div>
                <div className="text-yellow-600">
                  {formatBytes(Math.max(...timelineData.map(item => item.maxSize)))}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="font-medium text-purple-800">Total Requests</div>
                <div className="text-purple-600">
                  {timelineData.reduce((sum, item) => sum + item.requestCount, 0)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Requests by Time of Day (24-hour Area Chart)
export const RequestsByTimeOfDayChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('RequestsByTimeOfDayChart - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No time data to display</p>
        </div>
      </div>
    );
  }

  // Group requests by hour of day (0-23)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    hourLabel: `${hour.toString().padStart(2, '0')}:00`,
    requests: 0
  }));

  networkRequests.forEach(req => {
    const timestamp = req.timestamp || req.created_at;
    if (timestamp) {
      try {
        const date = new Date(timestamp);
        const hour = date.getHours();
        if (hour >= 0 && hour <= 23) {
          hourlyData[hour].requests++;
        }
      } catch (error) {
        console.warn('Invalid timestamp:', timestamp);
      }
    }
  });

  console.log('RequestsByTimeOfDayChart - hourlyData:', hourlyData.slice(0, 5));

  // Calculate peak hour and total requests
  const peakHour = hourlyData.reduce((peak, current) => 
    current.requests > peak.requests ? current : peak
  );
  const totalRequests = hourlyData.reduce((sum, hour) => sum + hour.requests, 0);

  return (
    <div className="space-y-4">
      {/* Chart Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">24-Hour Traffic Pattern:</span> {totalRequests} total requests
        </div>
        <div>
          <span className="font-medium">Peak Hour:</span> {peakHour.hourLabel} ({peakHour.requests} requests)
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Requests by Time of Day</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={hourlyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hourLabel"
              fontSize={11}
              interval={1}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              label={{ value: 'Number of Requests', angle: -90, position: 'insideLeft' }}
              fontSize={11}
            />
            <Tooltip 
              labelFormatter={(label) => `Time: ${label}`}
              formatter={(value) => [value, 'Requests']}
            />
            <Area
              dataKey="requests"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Requests by Domain (Vertical Bar Chart with Top-N Dropdown)
export const RequestsByDomainChart: React.FC<ChartProps> = ({ networkRequests }) => {
  const [topN, setTopN] = React.useState(10);
  
  console.log('RequestsByDomainChart - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No domain data to display</p>
        </div>
      </div>
    );
  }

  // Extract domain from URL helper function
  const extractDomain = (url: string): string => {
    try {
      if (!url) return 'Unknown';
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        return 'localhost';
      }
      
      // Handle URLs without protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.warn('Invalid URL:', url);
      return 'Invalid URL';
    }
  };

  // Group requests by domain
  const domainGroups: { [domain: string]: { requests: number; methods: { [method: string]: number } } } = {};

  networkRequests.forEach(req => {
    const domain = extractDomain(req.url || '');
    const method = (req.method || 'GET').toUpperCase();
    
    if (!domainGroups[domain]) {
      domainGroups[domain] = { requests: 0, methods: {} };
    }
    
    domainGroups[domain].requests++;
    domainGroups[domain].methods[method] = (domainGroups[domain].methods[method] || 0) + 1;
  });

  // Convert to array and sort by request count
  const allDomainData = Object.entries(domainGroups)
    .map(([domain, stats]) => ({
      domain,
      requests: stats.requests,
      methods: stats.methods,
      percentage: ((stats.requests / networkRequests.length) * 100).toFixed(1)
    }))
    .sort((a, b) => b.requests - a.requests);

  const chartData = allDomainData.slice(0, topN);

  console.log('RequestsByDomainChart - chartData:', chartData.slice(0, 3));

  // Color function for bars
  const getDomainColor = (index: number): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  // Top N options
  const topNOptions = [5, 10, 15, 20, 25, 30];

  return (
    <div className="space-y-4">
      {/* Chart Info and Controls */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">Requests by Domain:</span> Top {chartData.length} of {allDomainData.length}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show Top:</label>
            <select 
              value={topN} 
              onChange={(e) => setTopN(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {topNOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="font-medium">Total Requests:</span> {networkRequests.length}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Traffic Distribution by Domain</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="domain"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={11}
              interval={0}
            />
            <YAxis 
              label={{ value: 'Number of Requests', angle: -90, position: 'insideLeft' }}
              fontSize={11}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const methodsText = Object.entries(data.methods)
                    .map(([method, count]) => `${method}: ${count}`)
                    .join(', ');
                  
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow-lg text-sm">
                      <p className="font-medium text-gray-900">Domain: {data.domain}</p>
                      <p className="text-blue-600 font-semibold">Requests: {data.requests} ({data.percentage}%)</p>
                      <p className="text-xs text-gray-500">Methods: {methodsText}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="requests"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={getDomainColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
