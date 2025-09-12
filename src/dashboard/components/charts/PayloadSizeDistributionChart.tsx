import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PayloadSizeDistributionChartProps {
  data: any[];
}

const PayloadSizeDistributionChart: React.FC<PayloadSizeDistributionChartProps> = ({ _data }) => {
  const _sizeRanges = {
    'Small (0-1KB)': 0,
    'Medium (1-10KB)': 0,
    'Large (10-100KB)': 0,
    'Extra Large (>100KB)': 0
  };

  data.forEach(req => {
    const _size = req.payload_size || 0;
    if (size <= 1024) sizeRanges['Small (0-1KB)']++;
    else if (size <= 10240) sizeRanges['Medium (1-10KB)']++;
    else if (size <= 102400) sizeRanges['Large (10-100KB)']++;
    else sizeRanges['Extra Large (>100KB)']++;
  });

  const _chartData = Object.entries(sizeRanges).map(([range, count]) => ({
    range,
    count
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8B5CF6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PayloadSizeDistributionChart;
