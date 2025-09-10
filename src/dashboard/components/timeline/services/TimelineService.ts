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
      console.log('TimelineService: Fetching timeline events via getAnalysisData', { swimlanes })

      // Use the working getAnalysisData endpoint instead of non-existent getTimelineData
      const response = await chrome.runtime.sendMessage({
        action: 'getAnalysisData',
        data: {
          includeNetworkRequests: swimlanes.includes('network'),
          includeConsoleErrors: swimlanes.includes('console'),
          includeLibraryData: false, // Timeline doesn't need library data
          includeTokenData: swimlanes.includes('token'),
          timeRange: 'all' // Get all data, let timeline filter client-side
        }
      })

      console.log('TimelineService: Received response from getAnalysisData', response)

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to fetch timeline data')
      }

      // Check if no data exists - getAnalysisData returns different structure
      const hasNetworkData = response.data?.networkRequests?.length > 0
      const hasConsoleData = response.data?.consoleErrors?.length > 0
      const hasTokenData = response.data?.tokenEvents?.length > 0

      if (!hasNetworkData && !hasConsoleData && !hasTokenData) {
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

      // Restore bookmarks and compare slots from local storage
      this.restoreLocalEventData(events)

      return {
        events,
        metadata: {
          isEmpty: false,
          timeRange: {
            start: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : Date.now(),
            end: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : Date.now()
          },
          latestTimestamp: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : Date.now(),
          totalRecords: {
            network: response.data?.networkRequests?.length || 0,
            console: response.data?.consoleErrors?.length || 0,
            token: response.data?.tokenEvents?.length || 0
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

    console.log('TimelineService: Normalizing getAnalysisData response', rawData)

    // Process network requests from getAnalysisData format
    if (rawData.networkRequests && Array.isArray(rawData.networkRequests)) {
      rawData.networkRequests.forEach((req: any) => {
        try {
          // Handle timestamp - getAnalysisData stores timestamp in different formats
          let timestamp: number
          if (typeof req.timestamp === 'number') {
            timestamp = req.timestamp
          } else if (typeof req.timestamp === 'string') {
            timestamp = new Date(req.timestamp).getTime()
          } else if (req.timestamp instanceof Date) {
            timestamp = req.timestamp.getTime()
          } else {
            // Fallback to current time if no valid timestamp
            timestamp = Date.now()
            console.warn('NetworkRequest missing valid timestamp:', req)
          }

          events.push({
            id: `network_${req.id || req.url || Date.now()}_${timestamp}`,
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

    // Process console errors from getAnalysisData format
    if (rawData.consoleErrors && Array.isArray(rawData.consoleErrors)) {
      rawData.consoleErrors.forEach((error: any) => {
        try {
          // Handle timestamp
          let timestamp: number
          if (typeof error.timestamp === 'number') {
            timestamp = error.timestamp
          } else if (typeof error.timestamp === 'string') {
            timestamp = new Date(error.timestamp).getTime()
          } else if (error.timestamp instanceof Date) {
            timestamp = error.timestamp.getTime()
          } else {
            timestamp = Date.now()
            console.warn('ConsoleError missing valid timestamp:', error)
          }
          events.push({
            id: `console_${error.id || error.message || Date.now()}_${timestamp}`,
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

    // Process token events from getAnalysisData format
    if (rawData.tokenEvents && Array.isArray(rawData.tokenEvents)) {
      rawData.tokenEvents.forEach((token: any) => {
        try {
          // Handle timestamp
          let timestamp: number
          if (typeof token.timestamp === 'number') {
            timestamp = token.timestamp
          } else if (typeof token.timestamp === 'string') {
            timestamp = new Date(token.timestamp).getTime()
          } else if (token.timestamp instanceof Date) {
            timestamp = token.timestamp.getTime()
          } else {
            timestamp = Date.now()
            console.warn('TokenEvent missing valid timestamp:', token)
          }

          events.push({
            id: `token_${token.id || token.type || Date.now()}_${timestamp}`,
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
      // TODO: Implement backend bookmark storage
      // For now, store bookmarks in local storage as temporary solution
      const bookmarks = JSON.parse(localStorage.getItem('timeline-bookmarks') || '{}')
      if (isBookmarked) {
        bookmarks[eventId] = { timestamp: Date.now(), isBookmarked: true }
      } else {
        delete bookmarks[eventId]
      }
      localStorage.setItem('timeline-bookmarks', JSON.stringify(bookmarks))

      console.log('TimelineService: Bookmark updated locally', { eventId, isBookmarked })
      return true
    } catch (error) {
      console.error('TimelineService: Failed to bookmark event:', error)
      return false
    }
  }

  async setCompareSlot(eventId: string, slot: number | undefined): Promise<boolean> {
    try {
      // TODO: Implement backend compare slot storage
      // For now, store compare slots in local storage as temporary solution
      const compareSlots = JSON.parse(localStorage.getItem('timeline-compare-slots') || '{}')
      if (slot !== undefined) {
        compareSlots[eventId] = { slot, timestamp: Date.now() }
      } else {
        delete compareSlots[eventId]
      }
      localStorage.setItem('timeline-compare-slots', JSON.stringify(compareSlots))

      console.log('TimelineService: Compare slot updated locally', { eventId, slot })
      return true
    } catch (error) {
      console.error('TimelineService: Failed to set compare slot:', error)
      return false
    }
  }

  /**
   * Restore bookmark and compare slot data from local storage
   * TODO: Replace with backend implementation when available
   */
  private restoreLocalEventData(events: TimelineEvent[]): void {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('timeline-bookmarks') || '{}')
      const compareSlots = JSON.parse(localStorage.getItem('timeline-compare-slots') || '{}')

      events.forEach(event => {
        // Restore bookmark status
        if (bookmarks[event.id]) {
          event.isBookmarked = bookmarks[event.id].isBookmarked
        }

        // Restore compare slot
        if (compareSlots[event.id]) {
          event.compareSlot = compareSlots[event.id].slot
        }
      })

      console.log('TimelineService: Restored local event data', {
        bookmarks: Object.keys(bookmarks).length,
        compareSlots: Object.keys(compareSlots).length
      })
    } catch (error) {
      console.warn('TimelineService: Failed to restore local event data:', error)
    }
  }
}
