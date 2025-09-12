import { useState, useEffect, useCallback, useRef } from 'react'
import { TimelineEvent, TimelineCluster } from '../types/timeline.types'
import { TimelineService } from '../services/TimelineService'

interface UseTimelineDataProps {
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

export const useTimelineData = ({ swimlanes, zoomLevel }: UseTimelineDataProps) => {
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
      console.log('useTimelineData: Loading data (data-driven)', { swimlanes })

      const result = await service.current.fetchTimelineEvents(swimlanes)

      // Handle empty data case
      if (result.metadata.isEmpty) {
        setData(prev => ({
          ...prev,
          events: [],
          clusters: [],
          loading: false,
          error: result.metadata.message || 'No data available'
        }))
        return
      }

      // All events are relevant - no viewport filtering needed for data-driven approach
      const events = result.events

      // Skip clustering for now in data-driven approach
      const clusters: TimelineCluster[] = []

      setData(prev => ({
        ...prev,
        events: events,
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
  }, []) // Empty dependency array - make function stable to prevent re-renders

  // Load data when dependencies change - make dependencies stable
  useEffect(() => {
    console.log('useTimelineData: Effect triggered, loading data...')
    loadData()
  }, [swimlanes.join(','), zoomLevel]) // Use stable dependencies instead of loadData function

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
      const result = await service.current.fetchTimelineEvents(swimlanes)
      
      if (result.events.length > data.events.length) {
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
