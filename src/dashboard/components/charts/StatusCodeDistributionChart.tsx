import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface StatusCodeDistributionChartProps {
  data: any[];
}

const StatusCodeDistributionChart: React.FC<StatusCodeDistributionChartProps> = ({ data }) => {
  const statusData = data.reduce((acc, req) => {
    const status = req.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusData).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusCodeDistributionChart;
