// Research notes for horizontal bar charts with individual colors in Recharts
// 
// The issue: Cell components don't work well with layout="horizontal" in BarChart
// 
// Solutions:
// 1. Use multiple Bar components for different categories
// 2. Use a custom shape function
// 3. Create separate data series for each color
// 4. Use ComposedChart instead of BarChart

// Example working pattern for horizontal bars with colors:
export const WorkingHorizontalBarExample = () => {
  // Prepare data with color information
  const data = [
    { name: 'GET /api/users', value: 10, method: 'GET' },
    { name: 'POST /api/login', value: 8, method: 'POST' },
    { name: 'PUT /api/update', value: 6, method: 'PUT' }
  ];

  // Method-specific bars
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const methodColors = {
    'GET': '#10B981',
    'POST': '#3B82F6', 
    'PUT': '#F59E0B',
    'DELETE': '#EF4444'
  };

  return (
    <BarChart data={data} layout="horizontal">
      {methods.map(method => (
        <Bar
          key={method}
          dataKey={(entry) => entry.method === method ? entry.value : 0}
          fill={methodColors[method]}
        />
      ))}
    </BarChart>
  );
};
