import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ErrorSeverityDistributionChartProps {
  data: any[];
}

const ErrorSeverityDistributionChart: React.FC<ErrorSeverityDistributionChartProps> = ({ _data }) => {
  const _severityData = data.reduce((acc, error) => {
    const _severity = error.severity || 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const _chartData = Object.entries(severityData).map(([severity, count]) => ({
    name: severity,
    value: count
  }));

  const _colors = {
    error: '#EF4444',
    warn: '#F59E0B',
    info: '#3B82F6',
    unknown: '#9CA3AF'
  };

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
          {chartData.map((entry, index) => (
            <Cell key={index} fill={colors[entry.name as keyof typeof colors] || '#9CA3AF'} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ErrorSeverityDistributionChart;
