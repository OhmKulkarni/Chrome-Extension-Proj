import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface NetworkRequest {
  url?: string;
  method?: string;
  status?: number;
  response_status?: number;
  response?: { status?: number };
  statusCode?: number;
  response_time?: number;
  timestamp?: string | number;
}

interface ChartProps {
  networkRequests?: NetworkRequest[];
}

// Simple Status Code Chart
export const SimpleStatusCodeChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('SimpleStatusCodeChart - input:', networkRequests?.length);

  if (!networkRequests || networkRequests.length === 0) {
    return <div className="p-4 text-center text-gray-500">No data available</div>;
  }

  // Count status codes
  const statusCounts: { [key: string]: number } = {};
  
  networkRequests.forEach(req => {
    const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 'Unknown';
    const key = String(status);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  console.log('SimpleStatusCodeChart - statusCounts:', statusCounts);

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const colors = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#9CA3AF'];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Status Code Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Simple Traffic by Endpoint Chart
export const SimpleTrafficChart: React.FC<ChartProps> = ({ networkRequests }) => {
  console.log('SimpleTrafficChart - input:', networkRequests?.length);

  if (!networkRequests || networkRequests.length === 0) {
    return <div className="p-4 text-center text-gray-500">No data available</div>;
  }

  // Extract endpoints and count them
  const endpointCounts: { [key: string]: number } = {};
  
  networkRequests.forEach(req => {
    if (req.url) {
      try {
        const url = new URL(req.url);
        const endpoint = url.pathname || '/';
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      } catch {
        endpointCounts['invalid-url'] = (endpointCounts['invalid-url'] || 0) + 1;
      }
    }
  });

  console.log('SimpleTrafficChart - endpointCounts:', endpointCounts);

  const data = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({
      name: endpoint.length > 20 ? endpoint.substring(0, 20) + '...' : endpoint,
      value: count
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  console.log('SimpleTrafficChart - chart data:', data);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Traffic by Endpoint</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
