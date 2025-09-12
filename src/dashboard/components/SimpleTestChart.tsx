import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface SimpleTestChartProps {
  networkRequests: any[];
}

export const SimpleTestChart: React.FC<SimpleTestChartProps> = ({ networkRequests }) => {
  console.log('SimpleTestChart - Input:', networkRequests?.length || 0);

  // Create minimal test data
  const testData = [
    { date: 'Day 1', GET: 5, POST: 3 },
    { date: 'Day 2', GET: 8, POST: 2 },
    { date: 'Day 3', GET: 4, POST: 6 }
  ];

  console.log('SimpleTestChart - Test data:', testData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Simple Test Chart</h3>
      <div className="text-sm text-gray-600">
        Input data: {networkRequests?.length || 0} requests
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={testData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="GET" fill="#10B981" />
          <Bar dataKey="POST" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
