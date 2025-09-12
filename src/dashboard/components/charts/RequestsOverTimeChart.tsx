import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RequestsOverTimeChartProps {
  data: any[];
}

const RequestsOverTimeChart: React.FC<RequestsOverTimeChartProps> = ({ _data }) => {
  // Group requests by hour
  const _hourlyData = data.reduce((acc, req) => {
    const _date = new Date(req.timestamp);
    const _hour = date.getHours();
    const _key = `${ hour }:00`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const _chartData = Object.entries(hourlyData)
    .map(([hour, count]) => ({ hour, requests: count }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="requests" stroke="#10B981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RequestsOverTimeChart;
