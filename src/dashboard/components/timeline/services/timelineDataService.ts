import { TimelineEventSummary, TimelineEventDetails, TimelineViewport } from '../types/timeline.types';

/**
 * Timeline Data Service - Handles lazy loading and data optimization for large datasets
 */
export class TimelineDataService {
  private cache = new Map<string, TimelineEventSummary[]>();
  private detailsCache = new Map<string, TimelineEventDetails>();

  /**
   * Get timeline event summaries for a specific viewport and zoom level
   * Uses intelligent sampling based on zoom level and viewport density
   */
  async getEventSummaries(
    viewport: TimelineViewport,
    zoomLevel: number,
    totalEvents: number
  ): Promise<TimelineEventSummary[]> {
    const cacheKey = this.getCacheKey(viewport, zoomLevel);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Calculate sampling strategy based on zoom level and event density
    const samplingStrategy = this.calculateSamplingStrategy(viewport, zoomLevel, totalEvents);
    const summaries = await this.sampleEvents(viewport, samplingStrategy);
    
    this.cache.set(cacheKey, summaries);
    return summaries;
  }

  /**
   * Get full details for a specific event (lazy loaded on demand)
   */
  async getEventDetails(eventId: string): Promise<TimelineEventDetails | null> {
    if (this.detailsCache.has(eventId)) {
      return this.detailsCache.get(eventId)!;
    }

    // In a real implementation, this would fetch from your data store
    // For now, we'll simulate the data structure
    const details = await this.fetchEventDetails(eventId);
    
    if (details) {
      this.detailsCache.set(eventId, details);
    }
    
    return details;
  }

  /**
   * Special handling for "All Time" view - shows temporal distribution
   */
  async getAllTimeDistribution(totalEvents: number): Promise<TimelineEventSummary[]> {
    // For "All Time", we want to show the temporal spread, not cluster everything
    // Get first and last events, then sample representative events throughout the timeline
    
    const distribution: TimelineEventSummary[] = [];
    
    // Always include first and last events
    const firstEvent = await this.getFirstEvent();
    const lastEvent = await this.getLastEvent();
    
    if (firstEvent) distribution.push(firstEvent);
    
    // Calculate time span and create representative samples
    if (firstEvent && lastEvent && firstEvent.timestamp !== lastEvent.timestamp) {
      const timeSpan = lastEvent.timestamp - firstEvent.timestamp;
      const samplePoints = this.calculateAllTimeSamplePoints(timeSpan, totalEvents);
      
      for (const sampleTime of samplePoints) {
        const event = await this.getRepresentativeEventAt(sampleTime);
        if (event && event.id !== firstEvent.id && event.id !== lastEvent.id) {
          distribution.push(event);
        }
      }
      
      if (lastEvent.id !== firstEvent.id) {
        distribution.push(lastEvent);
      }
    }
    
    return distribution.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear cache when data changes
   */
  clearCache(): void {
    this.cache.clear();
    this.detailsCache.clear();
  }

  // Private helper methods

  private getCacheKey(viewport: TimelineViewport, zoomLevel: number): string {
    return `${viewport.startTime}-${viewport.endTime}-${zoomLevel}`;
  }

  private calculateSamplingStrategy(
    viewport: TimelineViewport,
    zoomLevel: number,
    totalEvents: number
  ): SamplingStrategy {
    const viewportDuration = viewport.endTime - viewport.startTime;
    const eventsPerMs = totalEvents / viewportDuration;
    
    // Determine optimal sample size based on zoom level
    let targetSampleSize: number;
    
    if (zoomLevel >= 7) {
      // High zoom - show individual events (up to 50 per viewport)
      targetSampleSize = Math.min(50, totalEvents);
    } else if (zoomLevel >= 3) {
      // Medium zoom - moderate clustering (up to 20 per viewport)
      targetSampleSize = Math.min(20, totalEvents);
    } else {
      // Low zoom - heavy clustering (up to 10 per viewport)
      targetSampleSize = Math.min(10, totalEvents);
    }
    
    return {
      targetCount: targetSampleSize,
      strategy: eventsPerMs > 0.1 ? 'dense' : 'sparse',
      includeEdges: true
    };
  }

  private async sampleEvents(
    viewport: TimelineViewport,
    strategy: SamplingStrategy
  ): Promise<TimelineEventSummary[]> {
    // This would be implemented based on your actual data store
    // For now, return a mock structure
    const mockEvents: TimelineEventSummary[] = [];
    
    const timeStep = (viewport.endTime - viewport.startTime) / strategy.targetCount;
    
    for (let i = 0; i < strategy.targetCount; i++) {
      const timestamp = viewport.startTime + (i * timeStep);
      mockEvents.push({
        id: `event-${i}-${timestamp}`,
        timestamp,
        type: 'network',
        swimlane: 'network',
        domain: `example${i % 3}.com`,
        eventCount: strategy.strategy === 'dense' ? Math.floor(Math.random() * 20) + 1 : 1
      });
    }
    
    return mockEvents;
  }

  private async fetchEventDetails(eventId: string): Promise<TimelineEventDetails | null> {
    // Mock implementation - replace with actual data fetching
    return {
      id: eventId,
      timestamp: Date.now(),
      type: 'network',
      swimlane: 'network',
      data: {},
      domain: 'example.com',
      url: 'https://example.com/api/data',
      method: 'GET',
      statusCode: 200,
      responseTime: 150,
      requestHeaders: { 'Content-Type': 'application/json' },
      responseHeaders: { 'Content-Type': 'application/json' },
      requestBody: null,
      responseBody: '{"data": "example"}',
      stackTrace: []
    };
  }

  private async getFirstEvent(): Promise<TimelineEventSummary | null> {
    // Mock implementation
    return {
      id: 'first-event',
      timestamp: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
      type: 'network',
      swimlane: 'network',
      domain: 'first.com',
      eventCount: 1
    };
  }

  private async getLastEvent(): Promise<TimelineEventSummary | null> {
    // Mock implementation
    return {
      id: 'last-event',
      timestamp: Date.now(),
      type: 'network',
      swimlane: 'network',
      domain: 'last.com',
      eventCount: 1
    };
  }

  private calculateAllTimeSamplePoints(timeSpan: number, totalEvents: number): number[] {
    // Create 8-12 representative time points across the full timeline
    const sampleCount = Math.min(10, Math.max(8, Math.floor(totalEvents / 200)));
    const points: number[] = [];
    
    const step = timeSpan / (sampleCount + 1);
    for (let i = 1; i <= sampleCount; i++) {
      points.push(step * i);
    }
    
    return points;
  }

  private async getRepresentativeEventAt(relativeTime: number): Promise<TimelineEventSummary | null> {
    // Mock implementation - find event closest to the target time
    return {
      id: `sample-${relativeTime}`,
      timestamp: Date.now() - relativeTime,
      type: 'network',
      swimlane: 'network',
      domain: 'sample.com',
      eventCount: Math.floor(Math.random() * 5) + 1
    };
  }
}

interface SamplingStrategy {
  targetCount: number;
  strategy: 'dense' | 'sparse';
  includeEdges: boolean;
}

// Singleton instance
export const timelineDataService = new TimelineDataService();
