import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface MiniChartProps {
  data: any[];
  type: 'timeline' | 'requests' | 'errors';
  height?: number;
  className?: string;
}

interface DomainMiniChartsProps {
  domain: string;
  allData: any[];
  className?: string;
}

/**
 * Tier 1: Inline Mini-Charts (Sparklines)
 * Lightweight chart components that appear inline in table cells
 * PERFORMANCE: Minimal DOM impact with SVG-based rendering
 */
const MiniChart: React.FC<MiniChartProps> = ({
  data,
  type,
  height = 30,
  className = ''
}) => {
  // PERFORMANCE: Memoized chart data to prevent recalculation
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    switch (type) {
      case 'timeline': {
        // Create hourly buckets for last 12 hours (compact)
        const buckets = [];
        const now = Date.now();
        const hourMs = 60 * 60 * 1000;

        for (let i = 11; i >= 0; i--) {
          const hourStart = now - (i * hourMs);
          const hourEnd = hourStart + hourMs;

          const requests = data.filter(req => {
            const timestamp = req.timestamp || req.time || Date.now();
            return timestamp >= hourStart && timestamp < hourEnd;
          });

          buckets.push({
            hour: i,
            value: requests.length
          });
        }
        return buckets;
      }

      case 'requests': {
        // Group by status code (success vs error)
        const successCount = data.filter(req => {
          const status = req.status || req.response_status || req.statusCode || 200;
          return status < 400;
        }).length;

        const errorCount = data.filter(req => {
          const status = req.status || req.response_status || req.statusCode || 200;
          return status >= 400;
        }).length;

        return [
          { name: 'Success', value: successCount },
          { name: 'Errors', value: errorCount }
        ];
      }

      case 'errors': {
        // Create simple error trend (last 6 hours)
        const buckets = [];
        const now = Date.now();
        const hourMs = 60 * 60 * 1000;

        for (let i = 5; i >= 0; i--) {
          const hourStart = now - (i * hourMs);
          const hourEnd = hourStart + hourMs;

          const errors = data.filter(error => {
            const timestamp = error.timestamp || error.time || Date.now();
            return timestamp >= hourStart && timestamp < hourEnd;
          });

          buckets.push({
            hour: i,
            value: errors.length
          });
        }
        return buckets;
      }

      default:
        return [];
    }
  }, [data, type]);

  // PERFORMANCE: Early return if no data
  if (!chartData || chartData.length === 0) {
    return (
      <div className={`w-20 flex items-center justify-center text-gray-400 ${className}`} style={{ height }}>
        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  // Render appropriate chart type
  switch (type) {
    case 'timeline':
    case 'errors':
      return (
        <div className={`w-20 ${className}`} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'requests':
      return (
        <div className={`w-20 ${className}`} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar
                dataKey="value"
                fill="#10B981"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    default:
      return <div className={`w-20 ${className}`} style={{ height }}></div>;
  }
};

/**
 * Domain-specific Mini Charts Container
 * Filters data for a specific domain and shows relevant mini-charts
 */
export const DomainMiniCharts: React.FC<DomainMiniChartsProps> = ({
  domain,
  allData,
  className = ''
}) => {
  // Filter data for this domain
  const domainData = useMemo(() => {
    const matchesDomain = (itemDomain: string) => {
      if (!itemDomain) return false;

      const normalizeForComparison = (d: string) => d.toLowerCase().replace(/^www\./, '');
      const normalizedTarget = normalizeForComparison(domain);
      const normalizedItem = normalizeForComparison(itemDomain);

      return normalizedItem === normalizedTarget ||
             normalizedItem.endsWith('.' + normalizedTarget) ||
             normalizedTarget.endsWith('.' + normalizedItem);
    };

    return allData.filter(item => {
      const itemDomain = item.main_domain ||
                        item.url?.match(/https?:\/\/([^\/]+)/)?.[1] ||
                        item.domain || '';
      return matchesDomain(itemDomain);
    });
  }, [domain, allData]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MiniChart
        data={domainData}
        type="timeline"
        height={24}
        className="w-16 opacity-60 hover:opacity-100 transition-opacity"
      />
      <span className="text-xs text-gray-400 font-mono">
        {domainData.length > 0 ? `${domainData.length}` : '―'}
      </span>
    </div>
  );
};

export default MiniChart;
