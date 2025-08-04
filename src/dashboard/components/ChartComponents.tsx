import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
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

// Requests Over Time (Line Chart)
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

  // Group requests by time periods (by hour for the last 24 hours or by day)
  const timeGroups = networkRequests.reduce((acc, req) => {
    const timestamp = req.timestamp ? new Date(req.timestamp) : new Date();
    
    // Group by hour for more granular view
    const hourKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), timestamp.getHours()).getTime();
    
    if (!acc[hourKey]) {
      acc[hourKey] = {
        timestamp: hourKey,
        count: 0,
        errors: 0,
        success: 0
      };
    }
    
    acc[hourKey].count += 1;
    
    // Categorize by status
    const status = req.status || req.response_status || 200;
    if (status >= 200 && status < 400) {
      acc[hourKey].success += 1;
    } else {
      acc[hourKey].errors += 1;
    }
    
    return acc;
  }, {} as { [key: number]: { timestamp: number; count: number; errors: number; success: number } });

  console.log('RequestsOverTimeChart - timeGroups:', timeGroups);

  // Convert to chart data and sort by time
  const chartData = Object.values(timeGroups)
    .sort((a, b) => (a as any).timestamp - (b as any).timestamp)
    .map(group => {
      const g = group as any;
      return {
        time: new Date(g.timestamp).toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric',
          hour12: true 
        }),
        timestamp: g.timestamp,
        requests: g.count,
        success: g.success,
        errors: g.errors
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

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={12}
        />
        <YAxis />
        <Tooltip 
          formatter={(value, name) => [value, name === 'requests' ? 'Total Requests' : name === 'success' ? 'Successful' : 'Errors']}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        <Bar dataKey="requests" fill={COLORS.info} name="Total Requests" />
        <Bar dataKey="success" fill={COLORS.success} name="Successful" />
        <Bar dataKey="errors" fill={COLORS.error} name="Errors" />
      </BarChart>
    </ResponsiveContainer>
  );
};
