import { useMemo } from 'react'
import { TimelineEvent, DensityCluster, ViewportEventData, ViewportRange } from '../types/timeline.types'

interface UseTimelineVisualizationProps {
  events: TimelineEvent[]
  viewport: ViewportRange
  zoomLevel: number
}

export const useTimelineVisualization = ({
  events,
  viewport,
  zoomLevel
}: UseTimelineVisualizationProps): ViewportEventData => {

  return useMemo(() => {
    // Filter events within current viewport
    const viewportEvents = events.filter(event =>
      event.timestamp >= viewport.startTime &&
      event.timestamp <= viewport.endTime
    )

    const totalEventCount = viewportEvents.length

    // Two conditions for showing mini cards:
    // 1. If we're at the most detailed zoom level (1-minute scope, zoomLevel 10)
    // 2. If there are 10 or fewer events in the current viewport
    const isAtMostDetailedLevel = zoomLevel >= 10 // 1-minute scope
    const hasFewEvents = totalEventCount <= 10

    const shouldShowCards = isAtMostDetailedLevel || hasFewEvents

    console.log('Timeline Visualization Decision:', {
      zoomLevel,
      totalEventCount,
      isAtMostDetailedLevel,
      hasFewEvents,
      shouldShowCards,
      scope: zoomLevel >= 10 ? '1-minute' : zoomLevel >= 9 ? '5-minutes' : 'other'
    })

    if (shouldShowCards) {
      // Show individual event cards
      return {
        individualEvents: viewportEvents,
        densityClusters: [],
        totalEventCount,
        shouldShowCards: true
      }
    }

    // Create density clusters for high event counts at broader zoom levels
    const densityClusters = createDensityClusters(viewportEvents, viewport, zoomLevel)

    return {
      individualEvents: [],
      densityClusters,
      totalEventCount,
      shouldShowCards: false
    }
  }, [events, viewport, zoomLevel])
}

function createDensityClusters(
  events: TimelineEvent[],
  viewport: ViewportRange,
  zoomLevel: number
): DensityCluster[] {
  // Group events by swimlane
  const eventsBySwimlane = events.reduce((acc, event) => {
    if (!acc[event.swimlane]) acc[event.swimlane] = []
    acc[event.swimlane].push(event)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  const clusters: DensityCluster[] = []

  // Calculate cluster granularity based on zoom level
  const clusterCount = Math.min(20, Math.max(5, Math.floor(viewport.duration / getClusterInterval(zoomLevel))))
  const timeSlotDuration = viewport.duration / clusterCount

  Object.entries(eventsBySwimlane).forEach(([swimlane, swimlaneEvents]) => {
    // Create time slots
    for (let i = 0; i < clusterCount; i++) {
      const slotStartTime = viewport.startTime + (i * timeSlotDuration)
      const slotEndTime = slotStartTime + timeSlotDuration

      const slotEvents = swimlaneEvents.filter(event =>
        event.timestamp >= slotStartTime && event.timestamp < slotEndTime
      )

      if (slotEvents.length > 0) {
        const density = slotEvents.length
        const size = Math.min(5, Math.max(1, Math.ceil(density / 5))) // Size 1-5

        // Calculate viewport-relative position for smooth panning
        const clusterCenterTime = slotStartTime + (timeSlotDuration / 2)
        const relativeTime = clusterCenterTime - viewport.startTime
        const xPosition = (relativeTime / viewport.duration) * 100

        clusters.push({
          id: `${swimlane}-${i}`,
          startTime: slotStartTime,
          endTime: slotEndTime,
          events: slotEvents,
          swimlane: swimlane as 'network' | 'console' | 'token',
          density,
          size,
          position: {
            x: xPosition, // Viewport-relative position for smooth animation
            y: getSwimlaneYPosition(swimlane as 'network' | 'console' | 'token')
          }
        })
      }
    }
  })

  return clusters
}

function getClusterInterval(zoomLevel: number): number {
  // Higher zoom levels need finer granularity
  if (zoomLevel >= 8) return 5000 // 5 seconds
  if (zoomLevel >= 5) return 30000 // 30 seconds
  if (zoomLevel >= 2) return 300000 // 5 minutes
  if (zoomLevel >= 0) return 3600000 // 1 hour
  return 86400000 // 1 day
}

function getSwimlaneYPosition(swimlane: 'network' | 'console' | 'token'): number {
  switch (swimlane) {
    case 'network': return 16.67 // Center of top third
    case 'console': return 50    // Center of middle third
    case 'token': return 83.33   // Center of bottom third
    default: return 50
  }
}
