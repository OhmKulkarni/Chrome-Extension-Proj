import { useState, useEffect, useCallback, useRef } from 'react'
import { TimelineEvent, TimelineCluster, ViewportRange } from '../types/timeline.types'
import { TimelineService } from '../services/TimelineService'

interface UseTimelineDataProps {
  viewport: ViewportRange
  swimlanes: string[]
  zoomLevel: number
}

interface TimelineDataState {
  events: TimelineEvent[]
  clusters: TimelineCluster[]
  loading: boolean
  error: string | null
  hasNewUpdates: boolean
}

export const useTimelineData = ({ viewport, swimlanes, zoomLevel }: UseTimelineDataProps) => {
  const [data, setData] = useState<TimelineDataState>({
    events: [],
    clusters: [],
    loading: true, // Start with loading true since we load immediately
    error: null,
    hasNewUpdates: false
  })

  const service = useRef(TimelineService.getInstance())
  const loadingRef = useRef(false)

  // Determine if we should use clustering based on zoom level
  const shouldCluster = zoomLevel <= 3 // Cluster for 30m, 1h, 6h, 24h views

  const loadData = useCallback(async (force: boolean = false) => {
    if (loadingRef.current && !force) return
    
    loadingRef.current = true
    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Add buffer to viewport for smooth scrolling
      const bufferTime = viewport.duration * 0.5 // 50% buffer
      const bufferedStart = viewport.startTime - bufferTime
      const bufferedEnd = viewport.endTime + bufferTime

      console.log('useTimelineData: Loading data for viewport', { 
        startTime: new Date(viewport.startTime).toISOString(),
        endTime: new Date(viewport.endTime).toISOString(),
        swimlanes 
      })

      const events = await service.current.fetchTimelineEvents(
        bufferedStart,
        bufferedEnd,
        swimlanes
      )

      // Filter to visible viewport for display
      const visibleEvents = events.filter(
        event => event.timestamp >= viewport.startTime && event.timestamp <= viewport.endTime
      )

      let clusters: TimelineCluster[] = []
      if (shouldCluster) {
        // Cluster threshold based on zoom level
        const thresholds = {
          0: 30 * 60 * 1000, // 6h view: 30min clusters
          1: 10 * 60 * 1000, // 1h view: 10min clusters
          2: 5 * 60 * 1000,  // 30m view: 5min clusters
          3: 2 * 60 * 1000   // 15m view: 2min clusters
        }
        
        const threshold = thresholds[zoomLevel as keyof typeof thresholds] || 60 * 1000
        clusters = service.current.createClusters(visibleEvents, viewport, threshold)
      }

      setData(prev => ({
        ...prev,
        events: visibleEvents,
        clusters,
        loading: false,
        error: null
      }))
    } catch (error) {
      console.error('useTimelineData: Failed to load data:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    } finally {
      loadingRef.current = false
    }
  }, [viewport, swimlanes, zoomLevel, shouldCluster])

  // Load data when dependencies change
  useEffect(() => {
    loadData()
  }, [loadData])

  const bookmarkEvent = useCallback(async (eventId: string, isBookmarked: boolean) => {
    const success = await service.current.bookmarkEvent(eventId, isBookmarked)
    if (success) {
      setData(prev => ({
        ...prev,
        events: prev.events.map(event => 
          event.id === eventId ? { ...event, isBookmarked } : event
        )
      }))
    }
    return success
  }, [])

  const setCompareSlot = useCallback(async (eventId: string, slot: number | undefined) => {
    const success = await service.current.setCompareSlot(eventId, slot)
    if (success) {
      setData(prev => ({
        ...prev,
        events: prev.events.map(event => 
          event.id === eventId ? { ...event, compareSlot: slot } : event
        )
      }))
    }
    return success
  }, [])

  const refreshData = useCallback(() => {
    loadData(true)
  }, [loadData])

  const checkForUpdates = useCallback(async () => {
    // Check if there are new events since last load
    const latestEvent = data.events[data.events.length - 1]
    if (!latestEvent) return

    try {
      const recentEvents = await service.current.fetchTimelineEvents(
        latestEvent.timestamp,
        Date.now(),
        swimlanes
      )
      
      if (recentEvents.length > 1) { // More than just the latest event
        setData(prev => ({ ...prev, hasNewUpdates: true }))
      }
    } catch (error) {
      console.error('useTimelineData: Failed to check for updates:', error)
    }
  }, [data.events, swimlanes])

  const acknowledgeUpdates = useCallback(() => {
    setData(prev => ({ ...prev, hasNewUpdates: false }))
    refreshData()
  }, [refreshData])

  return {
    ...data,
    shouldCluster,
    bookmarkEvent,
    setCompareSlot,
    refreshData,
    checkForUpdates,
    acknowledgeUpdates
  }
}
