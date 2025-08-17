import { TimelineEvent, TimelineCluster, ViewportRange } from '../types/timeline.types'

export class TimelineService {
  private static instance: TimelineService
  
  static getInstance(): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService()
    }
    return TimelineService.instance
  }

  async fetchTimelineEvents(
    swimlanes: string[] = ['network', 'console', 'token']
  ): Promise<{ events: TimelineEvent[], metadata: any }> {
    try {
      console.log('TimelineService: Fetching timeline events (data-driven)', { swimlanes })
      
      const response = await chrome.runtime.sendMessage({
        action: 'getTimelineData',
        data: { swimlanes } // Remove time parameters - let backend decide
      })

      console.log('TimelineService: Received response', response)

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to fetch timeline data')
      }

      // Check if no data exists
      if (response.data.isEmpty) {
        return {
          events: [],
          metadata: {
            isEmpty: true,
            message: 'No data available. Start browsing to capture network requests and console errors.'
          }
        }
      }

      const events = this.normalizeEvents(response.data)
      console.log('TimelineService: Normalized events', events.length)
      
      return {
        events,
        metadata: {
          isEmpty: false,
          timeRange: response.data.timeRange,
          latestTimestamp: response.data.latestTimestamp,
          totalRecords: {
            network: response.data.networkRequests.length,
            console: response.data.consoleErrors.length,
            token: response.data.tokenEvents.length
          }
        }
      }
    } catch (error) {
      console.error('TimelineService: Failed to fetch events:', error)
      return {
        events: [],
        metadata: {
          isEmpty: true,
          message: 'Error loading data. Please try again.',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  private normalizeEvents(rawData: any): TimelineEvent[] {
    const events: TimelineEvent[] = []

    console.log('TimelineService: Normalizing raw data', rawData)

    // Process network requests
    if (rawData.networkRequests && Array.isArray(rawData.networkRequests)) {
      rawData.networkRequests.forEach((req: any) => {
        try {
          const timestamp = typeof req.timestamp === 'number' ? req.timestamp : new Date(req.timestamp).getTime()
          events.push({
            id: `network_${req.id || Date.now()}`,
            timestamp,
            type: 'network',
            swimlane: 'network',
            data: req,
            isBookmarked: req.isBookmarked || false,
            compareSlot: req.compareSlot
          })
        } catch (error) {
          console.warn('Failed to normalize network request:', error, req)
        }
      })
    }

    // Process console errors
    if (rawData.consoleErrors && Array.isArray(rawData.consoleErrors)) {
      rawData.consoleErrors.forEach((error: any) => {
        try {
          const timestamp = typeof error.timestamp === 'number' ? error.timestamp : new Date(error.timestamp).getTime()
          events.push({
            id: `console_${error.id || Date.now()}`,
            timestamp,
            type: 'console',
            swimlane: 'console',
            data: error,
            isBookmarked: error.isBookmarked || false,
            compareSlot: error.compareSlot
          })
        } catch (error) {
          console.warn('Failed to normalize console error:', error, error)
        }
      })
    }

    // Process token events
    if (rawData.tokenEvents && Array.isArray(rawData.tokenEvents)) {
      rawData.tokenEvents.forEach((token: any) => {
        try {
          const timestamp = typeof token.timestamp === 'number' ? token.timestamp : new Date(token.timestamp).getTime()
          events.push({
            id: `token_${token.id || Date.now()}`,
            timestamp,
            type: 'token',
            swimlane: 'token',
            data: token,
            isBookmarked: token.isBookmarked || false,
            compareSlot: token.compareSlot
          })
        } catch (error) {
          console.warn('Failed to normalize token event:', error, token)
        }
      })
    }

    console.log('TimelineService: Normalized events count', events.length)
    return events.sort((a, b) => a.timestamp - b.timestamp)
  }

  createClusters(
    events: TimelineEvent[],
    viewport: ViewportRange,
    clusterThreshold: number = 1000 // ms
  ): TimelineCluster[] {
    const clusters = new Map<string, TimelineCluster>()
    
    events.forEach(event => {
      const clusterKey = this.getClusterKey(event.timestamp, event.swimlane, clusterThreshold)
      
      if (!clusters.has(clusterKey)) {
        const clusterStartTime = Math.floor(event.timestamp / clusterThreshold) * clusterThreshold
        clusters.set(clusterKey, {
          id: clusterKey,
          startTime: clusterStartTime,
          endTime: clusterStartTime + clusterThreshold,
          events: [],
          centerTime: clusterStartTime + (clusterThreshold / 2),
          density: 0,
          swimlane: event.swimlane,
          x: this.timeToX(clusterStartTime + (clusterThreshold / 2), viewport),
          y: 0,
          size: 1,
          visualType: 'circle' as const
        })
      }

      const cluster = clusters.get(clusterKey)!
      cluster.events.push(event)
      cluster.density = cluster.events.length
      cluster.size = Math.min(5, Math.max(1, Math.ceil(cluster.events.length / 5)))
      cluster.visualType = cluster.events.length > 10 ? 'circle' : 'card'
      
      // Update cluster center based on actual event distribution
      const avgTime = cluster.events.reduce((sum, e) => sum + e.timestamp, 0) / cluster.events.length
      cluster.centerTime = avgTime
      cluster.x = this.timeToX(avgTime, viewport)
    })

    return Array.from(clusters.values())
  }

  private getClusterKey(timestamp: number, swimlane: string, threshold: number): string {
    const bucket = Math.floor(timestamp / threshold)
    return `${swimlane}_${bucket}`
  }

  private timeToX(timestamp: number, viewport: ViewportRange): number {
    const relativeTime = timestamp - viewport.startTime
    const percentage = relativeTime / viewport.duration
    return Math.max(0, Math.min(100, percentage * 100))
  }

  async bookmarkEvent(eventId: string, isBookmarked: boolean): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateEventBookmark',
        data: { eventId, isBookmarked }
      })
      return response?.success || false
    } catch (error) {
      console.error('TimelineService: Failed to bookmark event:', error)
      return false
    }
  }

  async setCompareSlot(eventId: string, slot: number | undefined): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateEventCompareSlot',
        data: { eventId, slot }
      })
      return response?.success || false
    } catch (error) {
      console.error('TimelineService: Failed to set compare slot:', error)
      return false
    }
  }
}
