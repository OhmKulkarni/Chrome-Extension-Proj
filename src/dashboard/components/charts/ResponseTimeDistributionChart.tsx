import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResponseTimeDistributionChartProps {
  data: any[];
}

const ResponseTimeDistributionChart: React.FC<ResponseTimeDistributionChartProps> = ({ data }) => {
  const timeRanges = {
    'Fast (<100ms)': 0,
    'Good (100-500ms)': 0,
    'Slow (500ms-2s)': 0,
    'Very Slow (>2s)': 0
  };

  data.filter(req => req.response_time && req.response_time > 0).forEach(req => {
    const time = req.response_time;
    if (time < 100) timeRanges['Fast (<100ms)']++;
    else if (time < 500) timeRanges['Good (100-500ms)']++;
    else if (time < 2000) timeRanges['Slow (500ms-2s)']++;
    else timeRanges['Very Slow (>2s)']++;
  });

  const chartData = Object.entries(timeRanges).map(([range, count]) => ({
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
        <Bar dataKey="count" fill="#F59E0B" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ResponseTimeDistributionChart;
