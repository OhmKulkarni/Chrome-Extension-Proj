import React from 'react';
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
  ResponsiveContainer
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

// Average Response Time per Route (Horizontal Bar Chart)
export const AvgResponseTimePerRouteChart: React.FC<ChartProps> = ({ networkRequests }) => {
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

  const routeGroups = networkRequests.reduce((acc, req) => {
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
      return acc; // Skip requests without response times
    }
    
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
    
    if (!acc[route]) {
      acc[route] = { total: 0, count: 0 };
    }
    acc[route].total += responseTime;
    acc[route].count += 1;
    
    console.log('Added response time', responseTime, 'for route', route);
    
    return acc;
  }, {} as { [key: string]: { total: number; count: number } });

  console.log('AvgResponseTimePerRouteChart - routeGroups:', routeGroups);

  const chartData = Object.entries(routeGroups)
    .map(([route, data]) => ({
      route,
      avgTime: (data as any).count > 0 ? Math.round((data as any).total / (data as any).count) : 0,
      requests: (data as any).count
    }))
    .filter(item => item.avgTime > 0)
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10); // Top 10 slowest

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

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="route" type="category" width={90} fontSize={12} />
        <Tooltip formatter={(value) => [`${value}ms`, 'Avg Response Time']} />
        <Bar dataKey="avgTime" fill={COLORS.warning} />
      </BarChart>
    </ResponsiveContainer>
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

  const errorGroups = consoleErrors.reduce((acc, error) => {
    let errorType = error.message || error.error || 'Unknown Error';
    
    // Extract error type from message
    if (errorType.includes('TypeError')) errorType = 'TypeError';
    else if (errorType.includes('ReferenceError')) errorType = 'ReferenceError';
    else if (errorType.includes('SyntaxError')) errorType = 'SyntaxError';
    else if (errorType.includes('NetworkError')) errorType = 'NetworkError';
    else if (errorType.includes('SecurityError')) errorType = 'SecurityError';
    else if (errorType.length > 30) errorType = errorType.substring(0, 27) + '...';
    
    acc[errorType] = (acc[errorType] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  console.log('TopFrequentErrorsChart - errorGroups:', errorGroups);

  const chartData = Object.entries(errorGroups)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5) // Top 5
    .map(([errorType, count]) => ({
      errorType,
      count: count as number
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
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="errorType" type="category" width={110} fontSize={12} />
        <Tooltip formatter={(value) => [value, 'Occurrences']} />
        <Bar dataKey="count" fill={COLORS.error} />
      </BarChart>
    </ResponsiveContainer>
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

// Traffic by Endpoint (Horizontal Bar Chart)
export const TrafficByEndpointChart: React.FC<ChartProps> = ({ networkRequests }) => {
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

  // State for filtering and limiting
  const [topN, setTopN] = React.useState(10);
  const [selectedMethod, setSelectedMethod] = React.useState<string>('ALL');
  const [showAll, setShowAll] = React.useState(false);

  // Function to normalize endpoints (group dynamic segments)
  const normalizeEndpoint = (url: string): string => {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Common dynamic segment patterns
      pathname = pathname
        .replace(/\/\d+/g, '/:id')           // /user/123 -> /user/:id
        .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUIDs
        .replace(/\/[a-f0-9]{24}/g, '/:objectId') // MongoDB ObjectIds
        .replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:token') // Long tokens/hashes
        .replace(/\/$/, '') || '/'; // Remove trailing slash
      
      return pathname;
    } catch (e) {
      // Handle relative URLs or malformed URLs
      let pathname = url.startsWith('/') ? url : `/${url}`;
      return pathname
        .replace(/\/\d+/g, '/:id')
        .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
        .replace(/\/[a-f0-9]{24}/g, '/:objectId')
        .replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:token')
        .replace(/\/$/, '') || '/';
    }
  };

  // Filter by method if selected
  const filteredRequests = selectedMethod === 'ALL' 
    ? networkRequests 
    : networkRequests.filter(req => (req.method || 'GET').toUpperCase() === selectedMethod);

  console.log('TrafficByEndpointChart - filteredRequests:', filteredRequests.length, 'method:', selectedMethod);

  // Group by normalized endpoint
  const endpointCounts = filteredRequests.reduce((acc, req) => {
    const url = req.url || req.request?.url || 'Unknown Endpoint';
    const normalizedEndpoint = normalizeEndpoint(url);
    const method = (req.method || 'GET').toUpperCase();
    
    const key = `${method} ${normalizedEndpoint}`;
    
    if (!acc[key]) {
      acc[key] = {
        endpoint: normalizedEndpoint,
        method: method,
        count: 0,
        fullKey: key,
        originalUrls: new Set()
      };
    }
    
    acc[key].count += 1;
    acc[key].originalUrls.add(url);
    
    return acc;
  }, {} as { [key: string]: { 
    endpoint: string; 
    method: string; 
    count: number; 
    fullKey: string;
    originalUrls: Set<string>;
  } });

  console.log('TrafficByEndpointChart - endpointCounts:', Object.keys(endpointCounts).length, 'unique endpoints');
  console.log('TrafficByEndpointChart - sample endpointCounts:', Object.entries(endpointCounts).slice(0, 3));

  // Convert to array and sort by count
  const sortedEndpoints = Object.values(endpointCounts)
    .sort((a, b) => (b as any).count - (a as any).count);

  // Get available methods for filter
  const availableMethods = ['ALL', ...new Set(networkRequests.map(req => (req.method || 'GET').toUpperCase()))];

  // Determine how many to show
  const endpointsToShow = showAll ? sortedEndpoints : sortedEndpoints.slice(0, topN);

  console.log('TrafficByEndpointChart - endpointsToShow:', endpointsToShow.length, 'total:', sortedEndpoints.length);

  if (sortedEndpoints.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No endpoint data available</p>
          <p className="text-xs mt-2">No valid URLs found in requests</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = endpointsToShow.map((item: any) => ({
    endpoint: item.endpoint.length > 30 ? `${item.endpoint.substring(0, 30)}...` : item.endpoint,
    fullEndpoint: item.endpoint,
    method: item.method,
    count: item.count,
    fullKey: item.fullKey,
    originalCount: item.originalUrls.size
  }));

  console.log('TrafficByEndpointChart - chartData sample:', chartData.slice(0, 3));
  console.log('TrafficByEndpointChart - chartData structure check:', {
    hasData: chartData.length > 0,
    firstItem: chartData[0],
    dataKeys: chartData[0] ? Object.keys(chartData[0]) : []
  });

  // Method colors
  const methodColors = {
    'GET': '#10B981',     // Green
    'POST': '#3B82F6',    // Blue
    'PUT': '#F59E0B',     // Amber
    'DELETE': '#EF4444',  // Red
    'PATCH': '#8B5CF6',   // Purple
    'OPTIONS': '#6B7280', // Gray
    'HEAD': '#EC4899',    // Pink
    'ALL': '#1F2937'      // Dark Gray
  };

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
          {!showAll && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Show Top:</label>
              <select 
                value={topN} 
                onChange={(e) => setTopN(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}

          {/* Show All Toggle */}
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            {showAll ? 'Show Top N' : 'Show All'}
          </button>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">Showing:</span> {endpointsToShow.length} of {sortedEndpoints.length} endpoints
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(400, endpointsToShow.length * 25 + 100)}>
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="endpoint" 
            width={120}
            fontSize={11}
            interval={0}
          />
          <Tooltip 
            formatter={(value, _name) => [`${value} requests`, 'Traffic']}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.endpoint === label);
              return `${item?.method} ${item?.fullEndpoint}`;
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-medium">{data.method} {data.fullEndpoint}</p>
                    <p className="text-blue-600">{data.count} requests</p>
                    <p className="text-xs text-gray-500">{data.originalCount} unique URLs</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={methodColors[entry.method as keyof typeof methodColors] || methodColors.ALL} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        {availableMethods.filter(m => m !== 'ALL').map(method => (
          <div key={method} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: methodColors[method as keyof typeof methodColors] }}
            />
            <span>{method}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Method Usage Daily (Stacked Bar Chart)
export const MethodUsageDailyChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('MethodUsageDailyChart - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No daily method usage data to display</p>
        </div>
      </div>
    );
  }

  // State for chart type toggle
  const [chartType, setChartType] = React.useState<'stacked' | 'line'>('stacked');

  // Group requests by day and method
  const dailyMethodData = networkRequests.reduce((acc, req) => {
    const timestamp = req.timestamp ? new Date(req.timestamp) : new Date();
    const method = (req.method || 'GET').toUpperCase();
    
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

  // Convert to chart data and sort by date
  const chartData = Object.values(dailyMethodData)
    .sort((a, b) => (a as any).timestamp - (b as any).timestamp)
    .map((day: any) => ({
      date: new Date(day.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      fullDate: day.date,
      GET: day.GET,
      POST: day.POST,
      PUT: day.PUT,
      DELETE: day.DELETE,
      PATCH: day.PATCH,
      OPTIONS: day.OPTIONS,
      HEAD: day.HEAD,
      OTHER: day.OTHER,
      total: day.total
    }));

  console.log('MethodUsageDailyChart - chartData:', chartData.length, 'days');

  // Determine which methods are actually used
  const activeMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'OTHER']
    .filter(method => chartData.some(day => (day as any)[method] > 0));

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

  if (chartData.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No daily method data available</p>
          <p className="text-xs mt-2">Request timestamps may be missing</p>
        </div>
      </div>
    );
  }

  return (
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
                fill={methodColors[method as keyof typeof methodColors]}
                name={method}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Line Chart */}
      {chartType === 'line' && (
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
                stroke={methodColors[method as keyof typeof methodColors]}
                strokeWidth={2}
                name={method}
                dot={{ fill: methodColors[method as keyof typeof methodColors], strokeWidth: 2, r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {activeMethods.slice(0, 4).map(method => {
          const total = chartData.reduce((sum, day) => sum + (day as any)[method], 0);
          const percentage = ((total / networkRequests.length) * 100).toFixed(1);
          
          return (
            <div key={method} className="bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: methodColors[method as keyof typeof methodColors] }}
                />
                <span className="font-medium">{method}</span>
              </div>
              <div className="text-gray-600">
                {total} requests ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Status Code Breakdown (Enhanced)
export const StatusCodeBreakdownChartNew: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('StatusCodeBreakdownChartNew - networkRequests:', networkRequests?.length || 0);

  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No status code data to display</p>
        </div>
      </div>
    );
  }

  // State for grouping toggle
  const [groupByClass, setGroupByClass] = React.useState(true);

  // Filter requests with valid status codes (including 0 for failed requests)
  const requestsWithStatus = networkRequests.filter(req => {
    const status = req.status || req.response?.status || req.statusCode;
    return status !== undefined && status !== null && typeof status === 'number' && status >= 0 && status < 600;
  });

  console.log('StatusCodeBreakdownChartNew - requestsWithStatus:', requestsWithStatus.length);

  if (requestsWithStatus.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No status code data available</p>
          <p className="text-xs mt-2">Status codes not captured or missing</p>
        </div>
      </div>
    );
  }

  // Group by status codes
  const statusCounts = requestsWithStatus.reduce((acc, req) => {
    const status = req.status || req.response?.status || req.statusCode;
    const statusStr = String(status);
    
    if (!acc[statusStr]) {
      acc[statusStr] = {
        code: statusStr,
        count: 0,
        class: status === 0 ? '0xx' : Math.floor(status / 100) + 'xx'
      };
    }
    
    acc[statusStr].count += 1;
    
    return acc;
  }, {} as { [key: string]: { code: string; count: number; class: string; } });

  // Prepare data based on grouping preference
  const chartData = groupByClass 
    ? // Group by class (2xx, 3xx, 4xx, 5xx)
      Object.values(statusCounts).reduce((acc: any, item: any) => {
        const className = item.class;
        if (!acc[className]) {
          acc[className] = {
            name: className,
            value: 0,
            percentage: 0
          };
        }
        acc[className].value += item.count;
        return acc;
      }, {} as { [key: string]: { name: string; value: number; percentage: number; } })
    : // Individual status codes
      Object.values(statusCounts).reduce((acc: any, item: any) => {
        acc[item.code] = {
          name: item.code,
          value: item.count,
          percentage: 0
        };
        return acc;
      }, {} as { [key: string]: { name: string; value: number; percentage: number; } });

  // Convert to array and calculate percentages
  const finalData = Object.values(chartData as any)
    .map((item: any) => ({
      ...item,
      percentage: ((item.value / requestsWithStatus.length) * 100)
    }))
    .sort((a, b) => b.value - a.value);

  console.log('StatusCodeBreakdownChartNew - finalData:', finalData);

  // Status class colors
  const statusColors = {
    '0xx': '#374151',  // Gray-700 - Network/Connection Errors
    '1xx': '#6B7280',  // Gray - Informational
    '2xx': '#10B981',  // Green - Success
    '3xx': '#3B82F6',  // Blue - Redirection  
    '4xx': '#F59E0B',  // Amber - Client Error
    '5xx': '#EF4444',  // Red - Server Error
    // Individual status code colors
    '0': '#374151',    // Network failure
    '200': '#10B981',
    '201': '#059669',
    '204': '#047857',
    '301': '#3B82F6',
    '302': '#2563EB',
    '304': '#1D4ED8',
    '400': '#F59E0B',
    '401': '#D97706',
    '403': '#B45309',
    '404': '#92400E',
    '500': '#EF4444',
    '502': '#DC2626',
    '503': '#B91C1C'
  };

  // Get color for status
  const getColor = (name: string): string => {
    if (groupByClass) {
      return statusColors[name as keyof typeof statusColors] || '#6B7280';
    } else {
      // For individual codes, try exact match first, then class
      const exactColor = statusColors[name as keyof typeof statusColors];
      if (exactColor) return exactColor;
      
      const status = parseInt(name);
      const statusClass = status === 0 ? '0xx' : Math.floor(status / 100) + 'xx';
      return statusColors[statusClass as keyof typeof statusColors] || '#6B7280';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setGroupByClass(true)}
            className={`px-3 py-1 text-sm rounded ${
              groupByClass 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Class (2xx, 4xx, 5xx)
          </button>
          <button
            onClick={() => setGroupByClass(false)}
            className={`px-3 py-1 text-sm rounded ${
              !groupByClass 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Exact Codes (200, 404, 500)
          </button>
        </div>
        
        <div className="text-sm text-gray-600">
          <span className="font-medium">Requests with Status:</span> {requestsWithStatus.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={finalData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
              >
                {finalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} requests (${((value as number / requestsWithStatus.length) * 100).toFixed(1)}%)`, `Status ${name}`]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart Alternative */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Status Counts</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={finalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, _name) => [`${value} requests`, 'Count']}
                labelFormatter={(label) => `Status: ${label}`}
              />
              <Bar dataKey="value">
                {finalData.map((entry, index) => (
                  <Bar key={`bar-${index}`} fill={getColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {finalData.slice(0, 4).map(item => (
          <div key={item.name} className="bg-gray-50 p-3 rounded">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: getColor(item.name) }}
              />
              <span className="font-medium">{groupByClass ? `${item.name} Status` : `HTTP ${item.name}`}</span>
            </div>
            <div className="text-gray-600">
              {item.value} requests ({item.percentage.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
