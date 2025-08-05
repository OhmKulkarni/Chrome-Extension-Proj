// Clean Traffic by Endpoint (Vertical Bar Chart)
export const TrafficByEndpointChartTreemap: React.FC<ChartProps> = ({ networkRequests }) => {
  if (!networkRequests || networkRequests.length === 0) {
    return (
      <div className="h-96 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No network requests data available</p>
          <p className="text-xs mt-2">No endpoint traffic data to display</p>
        </div>
      </div>
    );
  }

  // Group requests by endpoint URL pathname
  const endpointCounts: { [key: string]: number } = {};
  
  networkRequests.forEach(req => {
    if (req.url) {
      try {
        const url = new URL(req.url);
        const endpoint = url.pathname || '/';
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      } catch (error) {
        // Skip invalid URLs
      }
    }
  });

  // Convert to chart data format and sort by request count
  const chartData = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({
      endpoint: endpoint.length > 30 ? `${endpoint.substring(0, 27)}...` : endpoint,
      fullEndpoint: endpoint,
      requests: count
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10); // Show top 10 endpoints

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 text-center">
        Showing top {chartData.length} endpoints by request volume
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="endpoint"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={11}
            interval={0}
          />
          <YAxis 
            label={{ value: 'Request Count', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value, name) => [value, 'Requests']}
            labelFormatter={(label) => `Endpoint: ${chartData.find(d => d.endpoint === label)?.fullEndpoint || label}`}
          />
          <Bar 
            dataKey="requests" 
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
