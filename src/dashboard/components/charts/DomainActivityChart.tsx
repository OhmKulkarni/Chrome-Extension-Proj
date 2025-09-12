import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DomainActivityChartProps {
  data: any[];
}

const DomainActivityChart: React.FC<DomainActivityChartProps> = ({ _data }) => {
  const _chartData = data.slice(0, 10).map(group => ({
    domain: group.domain.length > 15 ? group.domain.substring(0, 15) + '...' : group.domain,
    requests: group.analysis.requestCount,
    errors: group.analysis.errorCount
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="domain" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="requests" fill="#3B82F6" name="Requests" />
        <Bar dataKey="errors" fill="#EF4444" name="Errors" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DomainActivityChart;
