import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HttpMethodDistributionChartProps {
  data: any[];
}

const HttpMethodDistributionChart: React.FC<HttpMethodDistributionChartProps> = ({ _data }) => {
  // Group data by HTTP method
  const _methodData = data.reduce((acc, req) => {
    const _method = req.method || 'Unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const _chartData = Object.entries(methodData).map(([method, count]) => ({
    method,
    count
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="method" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3B82F6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HttpMethodDistributionChart;
