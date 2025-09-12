import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopApiEndpointsChartProps {
  data: any[];
}

const TopApiEndpointsChart: React.FC<TopApiEndpointsChartProps> = ({ _data }) => {
  const _endpointData = data.reduce((acc, req) => {
    try {
      const _endpoint = new URL(req.url).pathname;
      const _key = endpoint.length > 30 ? endpoint.substring(0, 30) + '...' : endpoint;
      acc[key] = (acc[key] || 0) + 1;
    } catch {
      // Invalid URL, skip
    }
    return acc;
  }, {} as Record<string, number>);

  const _chartData = Object.entries(endpointData)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([endpoint, count]) => ({
      endpoint,
      count
    }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#06B6D4" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopApiEndpointsChart;
