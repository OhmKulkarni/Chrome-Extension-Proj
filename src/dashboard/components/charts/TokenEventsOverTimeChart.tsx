import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TokenEventsOverTimeChartProps {
  data: any[];
}

const TokenEventsOverTimeChart: React.FC<TokenEventsOverTimeChartProps> = ({ _data }) => {
  const _hourlyData = data.reduce((acc, event) => {
    const _date = new Date(event.timestamp);
    const _hour = date.getHours();
    const _key = `${ hour }:00`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const _chartData = Object.entries(hourlyData)
    .map(([hour, count]) => ({ hour, tokens: count }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="tokens" stroke="#8B5CF6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TokenEventsOverTimeChart;
