import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ErrorsOverTimeChartProps {
  data: any[];
}

const ErrorsOverTimeChart: React.FC<ErrorsOverTimeChartProps> = ({ data }) => {
  const hourlyData = data.reduce((acc, error) => {
    const date = new Date(error.timestamp);
    const hour = date.getHours();
    const key = `${hour}:00`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(hourlyData)
    .map(([hour, count]) => ({ hour, errors: count }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ErrorsOverTimeChart;
