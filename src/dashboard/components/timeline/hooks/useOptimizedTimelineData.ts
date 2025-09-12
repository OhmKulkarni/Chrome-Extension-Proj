import { useState, useEffect, useMemo } from 'react';
import { TimelineEventSummary, TimelineViewport, TimeScope } from '../types/timeline.types';
import { timelineDataService } from '../services/timelineDataService';

interface UseOptimizedTimelineDataOptions {
  viewport: TimelineViewport;
  currentScope: TimeScope;
  totalEvents: number;
}

export function useOptimizedTimelineData({ viewport, currentScope, totalEvents }: UseOptimizedTimelineDataOptions) {
  const [events, setEvents] = useState<TimelineEventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is an "All Time" view
  const _isAllTimeView = currentScope.key === 'all-time';

  // Memoized viewport to prevent unnecessary re-fetches
  const _memoizedViewport = useMemo(() => viewport, [
    viewport.startTime,
    viewport.endTime,
    viewport.centerTime,
    viewport.duration
  ]);

  useEffect(() => {
    let _isCancelled = false;

    const _fetchTimelineData = async () => {
      if (totalEvents === 0) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let eventData: TimelineEventSummary[];

        if (isAllTimeView) {
          // Special handling for "All Time" - show temporal distribution
          eventData = await timelineDataService.getAllTimeDistribution(totalEvents);
        } else {
          // Regular viewport-based loading with zoom level optimization
          eventData = await timelineDataService.getEventSummaries(
            memoizedViewport,
            currentScope.zoomLevel,
            totalEvents
          );
        }

        if (!isCancelled) {
          setEvents(eventData);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load timeline data');
          setEvents([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchTimelineData();

    return () => {
      isCancelled = true;
    };
  }, [memoizedViewport, currentScope.zoomLevel, currentScope.key, totalEvents, isAllTimeView]);

  // Clear cache when total events change (data refresh)
  useEffect(() => {
    timelineDataService.clearCache();
  }, [totalEvents]);

  const _metrics = useMemo(() => ({
    totalEvents,
    loadedEvents: events.length,
    clusteredEvents: events.reduce((sum, event) => sum + (event.eventCount || 1), 0),
    compressionRatio: totalEvents > 0 ? events.length / totalEvents : 0,
    isOptimized: events.length < totalEvents
  }), [events, totalEvents]);

  return {
    events,
    isLoading,
    error,
    metrics,
    isAllTimeView,
    // Helper function to get event details on-demand
    getEventDetails: (eventId: string) => timelineDataService.getEventDetails(eventId)
  };
}
