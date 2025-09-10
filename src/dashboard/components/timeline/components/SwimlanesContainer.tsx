import React, { useState, useCallback, useRef, useEffect } from 'react'
import { TimelineEvent, TimelineCluster, SwimLaneConfig, DensityCluster, ViewportEventData, TimeScope, ViewedTrackingSettings, DEFAULT_VIEWED_TRACKING } from '../types/timeline.types'
import { Swimlane } from './Swimlane'
import { EventPopup } from './EventPopup'
import { EventDetailModal } from './EventDetailModal'
import { TimelineSidebar } from './TimelineSidebar'
import { CompareView } from './CompareView'
import { DensityClusterComponent } from './DensityCluster'
import { EventListPopup } from './EventListPopup'
import { TimeMarkers } from './TimeMarkers'
import { AllTimeViewDemo } from './AllTimeViewDemo'
import { StickyDateIndicator } from './StickyDateIndicator'

interface SwimlanesContainerProps {
  events: TimelineEvent[]
  clusters: TimelineCluster[]
  visualizationData: ViewportEventData
  viewport: any // ViewportRange from viewport hook
  currentScope: TimeScope // For "All Time" optimization demo
  shouldCluster: boolean
  onBookmarkEvent: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onSetCompareSlot: (eventId: string, slot: number | undefined) => Promise<boolean>
  onZoomIn: () => void
  onJumpToTime?: (timestamp: number, scope?: string) => void
  zoomLevel: number
  swimlanes: SwimLaneConfig[]
  onUpdateSwimlanes: (swimlanes: SwimLaneConfig[]) => void
  debugMode?: boolean
  isAnimating?: boolean
  sidebarCollapsed?: boolean
  onToggleSidebarCollapsed?: () => void
}

export const SwimlanesContainer: React.FC<SwimlanesContainerProps> = ({
  events,
  clusters,
  visualizationData,
  viewport,
  currentScope,
  shouldCluster,
  onBookmarkEvent,
  onSetCompareSlot,
  onZoomIn,
  onJumpToTime,
  zoomLevel,
  swimlanes,
  onUpdateSwimlanes,
  debugMode = false,
  isAnimating = false,
  sidebarCollapsed = false,
  onToggleSidebarCollapsed
}) => {
  const [selectedCluster, setSelectedCluster] = useState<TimelineCluster | null>(null)
  const [selectedDensityCluster, setSelectedDensityCluster] = useState<DensityCluster | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [showCompareView, setShowCompareView] = useState(false)
  const [compareQueue, setCompareQueue] = useState<TimelineEvent[]>([])

  // Viewed state tracking
  const [viewedTrackingSettings] = useState<ViewedTrackingSettings>(DEFAULT_VIEWED_TRACKING)
  const [viewedEvents, setViewedEvents] = useState<Map<string, number>>(new Map()) // eventId -> timestamp

  const containerRef = useRef<HTMLDivElement>(null)

  // Utility function to check if event should be considered viewed
  const isEventViewed = useCallback((eventId: string): boolean => {
    if (!viewedTrackingSettings.enabled) return false

    const viewedTime = viewedEvents.get(eventId)
    if (!viewedTime) return false

    const now = Date.now()
    switch (viewedTrackingSettings.persistenceMode) {
      case 'session':
        return true // Always viewed during session
      case 'minutes':
        return now - viewedTime < (viewedTrackingSettings.persistenceDuration || 30) * 60 * 1000
      case 'hours':
        return now - viewedTime < (viewedTrackingSettings.persistenceDuration || 2) * 60 * 60 * 1000
      case 'days':
        return now - viewedTime < (viewedTrackingSettings.persistenceDuration || 1) * 24 * 60 * 60 * 1000
      case 'permanent':
        return true
      default:
        return true
    }
  }, [viewedTrackingSettings, viewedEvents])

  // Clean up expired viewed events
  useEffect(() => {
    if (!viewedTrackingSettings.enabled || viewedTrackingSettings.persistenceMode === 'session' || viewedTrackingSettings.persistenceMode === 'permanent') {
      return
    }

    const interval = setInterval(() => {
      setViewedEvents(prev => {
        const updated = new Map(prev)
        for (const [eventId] of prev.entries()) {
          if (!isEventViewed(eventId)) {
            updated.delete(eventId)
          }
        }
        return updated
      })
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [viewedTrackingSettings, isEventViewed])

  // Enrich events with viewed state
  const enrichEventsWithViewedState = useCallback((events: TimelineEvent[]): TimelineEvent[] => {
    if (!viewedTrackingSettings.enabled) return events

    return events.map(event => ({
      ...event,
      isViewed: isEventViewed(event.id),
      viewedAt: viewedEvents.get(event.id)
    }))
  }, [viewedTrackingSettings.enabled, isEventViewed, viewedEvents])

  // Calculate visible swimlane heights
  const visibleSwimlanes = swimlanes.filter(lane => lane.isVisible)
  const adjustedSwimlanes = useCallback(() => {
    const totalHeight = 100
    const visibleCount = visibleSwimlanes.length
    if (visibleCount === 0) return []

    const heightPerLane = totalHeight / visibleCount
    return swimlanes.map(lane => ({
      ...lane,
      height: lane.isVisible ? heightPerLane : 0
    }))
  }, [swimlanes, visibleSwimlanes.length])

  const handleToggleSwimlane = useCallback((laneId: string) => {
    onUpdateSwimlanes(swimlanes.map(lane =>
      lane.id === laneId ? { ...lane, isVisible: !lane.isVisible } : lane
    ))
  }, [swimlanes, onUpdateSwimlanes])



  const handleClusterClick = useCallback((cluster: TimelineCluster) => {
    setSelectedCluster(cluster)
  }, [])

  const handleEventClick = useCallback((event: TimelineEvent) => {
    // Mark event as viewed if tracking is enabled
    if (viewedTrackingSettings.enabled) {
      setViewedEvents(prev => new Map(prev).set(event.id, Date.now()))
    }

    // Always show the detailed modal for any clicked event
    setSelectedEvent(event)
  }, [viewedTrackingSettings.enabled])

  const handleDensityClusterZoom = useCallback((cluster: DensityCluster) => {
    // Center viewport on the cluster's center time when zooming in
    const clusterCenterTime = cluster.startTime + (cluster.endTime - cluster.startTime) / 2

    // First zoom in to get more detailed view
    onZoomIn()

    // Then center on the cluster time if jumpToTime is available
    if (onJumpToTime) {
      // Use a small timeout to ensure zoom happens first
      setTimeout(() => {
        onJumpToTime(clusterCenterTime)
      }, 100)
    }

    console.log('Zooming in on cluster at time:', new Date(clusterCenterTime))
  }, [onZoomIn, onJumpToTime])

  const handleDensityClusterList = useCallback((cluster: DensityCluster) => {
    // Show event list popup for density cluster
    setSelectedDensityCluster(cluster)
  }, [])

  const handleCloseDensityClusterList = useCallback(() => {
    setSelectedDensityCluster(null)
  }, [])

  const handleAddToCompare = useCallback(async (event: TimelineEvent) => {
    // Check if event is already in compare (either in active slots or queued)
    if (event.compareSlot !== undefined && event.compareSlot >= -1) {
      // Event is already in compare, remove it
      const removedSlot = event.compareSlot
      await onSetCompareSlot(event.id, undefined)

      // If it was queued, also remove from queue state
      if (event.compareSlot === -1) {
        setCompareQueue(prev => prev.filter(e => e.id !== event.id))
        return
      }

      // Compact slots to remove gaps (e.g., if slot 1 is removed, move slot 2->1, slot 3->2)
      if (removedSlot >= 0) {
        const viewportEvents = visualizationData.shouldShowCards ?
          visualizationData.individualEvents :
          visualizationData.densityClusters.flatMap(cluster => cluster.events)

        const remainingCompareEvents = viewportEvents.filter(e =>
          e.compareSlot !== undefined && e.compareSlot >= 0 && e.compareSlot <= 3 && e.id !== event.id
        ).sort((a, b) => (a.compareSlot || 0) - (b.compareSlot || 0))

        // Reassign consecutive slot numbers
        for (let i = 0; i < remainingCompareEvents.length; i++) {
          if (remainingCompareEvents[i].compareSlot !== i) {
            await onSetCompareSlot(remainingCompareEvents[i].id, i)
          }
        }
      }
      return
    }

    // Get the viewport-filtered events for compare calculation
    const viewportEvents = visualizationData.shouldShowCards ?
      visualizationData.individualEvents :
      visualizationData.densityClusters.flatMap(cluster => cluster.events)

    const currentCompareEvents = viewportEvents.filter(e =>
      e.compareSlot !== undefined && e.compareSlot >= 0 && e.compareSlot <= 3
    ).sort((a, b) => (a.compareSlot || 0) - (b.compareSlot || 0))

    if (currentCompareEvents.length < 4) {
      // Add to next available slot
      const nextSlot = currentCompareEvents.length
      await onSetCompareSlot(event.id, nextSlot)
    } else {
      // Queue overflow - move oldest to queue
      const oldest = currentCompareEvents[0]
      await onSetCompareSlot(oldest.id, -1)
      await onSetCompareSlot(event.id, 0)

      setCompareQueue([...compareQueue, oldest])
    }
  }, [visualizationData, compareQueue, onSetCompareSlot])

  const handleMoveFromQueue = useCallback(async (event: TimelineEvent) => {
    await handleAddToCompare(event)
    setCompareQueue(prev => prev.filter(e => e.id !== event.id))
  }, [handleAddToCompare])

  // Get bookmarked events for sidebar
  const bookmarkedEvents = events.filter(e => e.isBookmarked)

  // Get compare events (both active and queued)
  const activeCompareEvents = events.filter(e =>
    e.compareSlot !== undefined && e.compareSlot >= 0 && e.compareSlot <= 3
  ).sort((a, b) => (a.compareSlot || 0) - (b.compareSlot || 0))

  const queuedCompareEvents = events.filter(e => e.compareSlot === -1)

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Timeline Area */}
      <div className="flex-1 flex flex-col" ref={containerRef}>
        {/* Sticky Date Indicators - positioned at the top with spacing */}
        <div className="relative h-6 mb-1">
          <StickyDateIndicator viewport={viewport} zoomLevel={zoomLevel} />
        </div>

        {/* Swimlanes */}
        <div className="flex-1 relative">
          {/* Time Markers */}
          <TimeMarkers viewport={viewport} zoomLevel={zoomLevel} />

          {adjustedSwimlanes().map((swimlane) => (
            <Swimlane
              key={swimlane.id}
              config={swimlane}
              events={visualizationData.shouldShowCards ?
                enrichEventsWithViewedState(visualizationData.individualEvents.filter(e => e.swimlane === swimlane.id)) : []}
              clusters={visualizationData.shouldShowCards ?
                clusters.filter(c => c.swimlane === swimlane.id) : []}
              shouldCluster={shouldCluster}
              height={swimlane.height}
              onToggle={() => handleToggleSwimlane(swimlane.id)}
              onClusterClick={handleClusterClick}
              onEventClick={handleEventClick}
              onBookmark={onBookmarkEvent}
              onAddToCompare={handleAddToCompare}
              zoomLevel={zoomLevel}
              viewport={viewport}
              debugMode={debugMode}
              viewedTrackingSettings={viewedTrackingSettings}
            />
          ))}

          {/* Density Clusters Overlay - shown when event count >= 10 */}
          {!visualizationData.shouldShowCards && visualizationData.densityClusters.map((cluster) => (
            <DensityClusterComponent
              key={cluster.id}
              cluster={cluster}
              onZoomIn={handleDensityClusterZoom}
              onShowEventList={handleDensityClusterList}
              isAnimating={isAnimating}
            />
          ))}

          {/* All Time View Performance Demo */}
          <AllTimeViewDemo currentScope={currentScope} viewport={viewport} />
        </div>

        {/* Compare View Modal */}
        {showCompareView && activeCompareEvents.length > 0 && (
          <CompareView
            events={activeCompareEvents}
            onClose={() => setShowCompareView(false)}
            onRemoveFromCompare={(eventId: string) => onSetCompareSlot(eventId, undefined)}
          />
        )}
      </div>

      {/* Sidebar */}
      <TimelineSidebar
        bookmarkedEvents={bookmarkedEvents}
        compareEvents={activeCompareEvents}
        compareQueue={queuedCompareEvents}
        onBookmarkRemove={(eventId: string) => onBookmarkEvent(eventId, false)}
        onCompareRemove={(eventId: string) => onSetCompareSlot(eventId, undefined)}
        onMoveFromQueue={handleMoveFromQueue}
        onShowCompareView={() => setShowCompareView(true)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapsed={onToggleSidebarCollapsed}
      />

      {/* Event Popup */}
      {selectedCluster && (
        <EventPopup
          cluster={selectedCluster}
          onClose={() => setSelectedCluster(null)}
          onBookmark={onBookmarkEvent}
          onAddToCompare={handleAddToCompare}
        />
      )}

      {/* Density Cluster Event List Popup */}
      {selectedDensityCluster && (
        <EventListPopup
          cluster={selectedDensityCluster}
          onClose={handleCloseDensityClusterList}
          onBookmarkEvent={onBookmarkEvent}
          onSetCompareSlot={onSetCompareSlot}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onBookmark={onBookmarkEvent}
          onAddToCompare={handleAddToCompare}
        />
      )}
    </div>
  )
}
