/**
 * Chart Staleness Indicator Component
 * Shows visual indicators when chart data becomes outdated
 */

import React from 'react';
import { Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { isFeatureEnabled } from '../utils/featureFlags';

interface StalenessIndicatorProps {
  lastProcessed: number;
  refreshInterval: number; // in seconds
  onRefresh?: () => void;
  className?: string;
}

export const StalenessIndicator: React.FC<StalenessIndicatorProps> = ({
  lastProcessed,
  refreshInterval,
  onRefresh,
  className = ''
}) => {
  if (!isFeatureEnabled('enableStalenessTracking')) {
    return null;
  }

  const _now = Date.now();
  const _ageMs = now - lastProcessed;
  const _ageSeconds = ageMs / 1000;

  // Calculate staleness level
  const _refreshIntervalMs = refreshInterval * 1000;
  const _staleness = ageMs / refreshIntervalMs;

  // Determine status
  let status: 'fresh' | 'aging' | 'stale' | 'very-stale';
  let icon;
  let color;
  let bgColor;

  if (staleness < 0.5) {
    status = 'fresh';
    icon = <CheckCircle className="h-3 w-3" />;
    color = 'text-green-600';
    bgColor = 'bg-green-50 border-green-200';
  } else if (staleness < 1) {
    status = 'aging';
    icon = <Clock className="h-3 w-3" />;
    color = 'text-yellow-600';
    bgColor = 'bg-yellow-50 border-yellow-200';
  } else if (staleness < 2) {
    status = 'stale';
    icon = <AlertCircle className="h-3 w-3" />;
    color = 'text-orange-600';
    bgColor = 'bg-orange-50 border-orange-200';
  } else {
    status = 'very-stale';
    icon = <AlertCircle className="h-3 w-3" />;
    color = 'text-red-600';
    bgColor = 'bg-red-50 border-red-200';
  }

  const _formatAge = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s ago`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m ago`;
    } else {
      return `${Math.round(seconds / 3600)}h ago`;
    }
  };

  const _getStatusText = (status: string): string => {
    switch (status) {
      case 'fresh': return 'Data is fresh';
      case 'aging': return 'Data is aging';
      case 'stale': return 'Data is stale';
      case 'very-stale': return 'Data is very stale';
      default: return 'Unknown status';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${bgColor} ${color} ${className}`}>
      {icon}
      <span className="font-medium">{getStatusText(status)}</span>
      <span className="opacity-80">({formatAge(ageSeconds)})</span>

      {onRefresh && staleness > 1 && (
        <button
          onClick={onRefresh}
          className="ml-1 p-0.5 hover:bg-white/50 rounded"
          title="Refresh now"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

/**
 * Chart Data Freshness Badge
 * Simpler version for chart headers
 */
interface DataFreshnessBadgeProps {
  lastProcessed: number;
  className?: string;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  lastProcessed,
  className = ''
}) => {
  if (!isFeatureEnabled('enableStalenessTracking')) {
    return null;
  }

  const _ageMs = Date.now() - lastProcessed;
  const _ageMinutes = ageMs / (1000 * 60);

  if (ageMinutes < 1) {
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-green-600 bg-green-50 ${className}`}>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        Live
      </div>
    );
  }

  if (ageMinutes < 5) {
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-blue-600 bg-blue-50 ${className}`}>
        <Clock className="h-3 w-3" />
        Recent
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-gray-600 bg-gray-50 ${className}`}>
      <Clock className="h-3 w-3" />
      {Math.round(ageMinutes)}m old
    </div>
  );
};

/**
 * Chart Container with Staleness Indicator
 * Wraps charts with staleness indicators
 */
interface ChartContainerProps {
  children: React.ReactNode;
  title: string;
  lastProcessed?: number;
  refreshInterval?: number;
  onRefresh?: () => void;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  title,
  lastProcessed,
  refreshInterval = 10,
  onRefresh,
  className = ''
}) => {
  return (
    <div className={`border rounded-lg p-4 bg-white ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          {lastProcessed && (
            <>
              <DataFreshnessBadge lastProcessed={lastProcessed} />
              <StalenessIndicator
                lastProcessed={lastProcessed}
                refreshInterval={refreshInterval}
                onRefresh={onRefresh}
              />
            </>
          )}
        </div>
      </div>
      <div className="relative">
        {children}

        {/* Overlay for very stale data */}
        {lastProcessed && isFeatureEnabled('enableStalenessTracking') &&
         (Date.now() - lastProcessed) > (refreshInterval * 2000) && (
          <div className="absolute inset-0 bg-gray-500/10 flex items-center justify-center rounded">
            <div className="bg-white/90 p-4 rounded-lg shadow-lg border border-orange-200">
              <div className="flex items-center gap-2 text-orange-600 font-medium">
                <AlertCircle className="h-5 w-5" />
                Data may be outdated
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-2 px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm"
                >
                  Refresh Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
