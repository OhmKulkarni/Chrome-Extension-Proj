import React, { useState, useCallback, useRef, useEffect } from 'react'
import { TimelineEvent, TimelineCluster, SwimLaneConfig, DensityCluster, ViewportEventData, TimeScope, ViewedTrackingSettings } from '../types/timeline.types'
import { viewedStateService } from '../services/ViewedStateService'
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
import { ViewedStateSettings } from './ViewedStateSettings'
import { SlotSelectionModal } from './SlotSelectionModal'

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
  const [showViewedSettings, setShowViewedSettings] = useState(false)
  const [showSlotSelection, setShowSlotSelection] = useState(false)
  const [queuedEventForSlotSelection, setQueuedEventForSlotSelection] = useState<TimelineEvent | null>(null)

  // Viewed state tracking
  const [viewedTrackingSettings, setViewedTrackingSettings] = useState<ViewedTrackingSettings>(() =>
    viewedStateService.loadSettings()
  )
  const [viewedEvents, setViewedEvents] = useState<Map<string, number>>(new Map()) // Session-only events
  const [sessionViewedEvents, setSessionViewedEvents] = useState<Set<string>>(new Set()) // Session tracking

  const containerRef = useRef<HTMLDivElement>(null)

  // Load viewed events on component mount
  useEffect(() => {
    const loadViewedState = async () => {
      const persistentViewed = viewedStateService.loadViewedEvents()
      setViewedEvents(persistentViewed)
    }
    loadViewedState()
  }, [])

  // Save settings when they change
  useEffect(() => {
    viewedStateService.saveSettings(viewedTrackingSettings)
  }, [viewedTrackingSettings])



  // Cleanup expired events periodically
  useEffect(() => {
    if (!viewedTrackingSettings.enabled || viewedTrackingSettings.persistenceLevel === 'session') {
      return
    }

    const interval = setInterval(() => {
      viewedStateService.cleanupExpiredEvents(viewedTrackingSettings)
      // Refresh local state
      const updatedViewed = viewedStateService.loadViewedEvents()
      setViewedEvents(updatedViewed)
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [viewedTrackingSettings])

  // Enrich events with viewed state
  const enrichEventsWithViewedState = useCallback((events: TimelineEvent[]): TimelineEvent[] => {
    if (!viewedTrackingSettings.enabled) return events

    return events.map(event => {
      const isViewed = viewedTrackingSettings.persistenceLevel === 'session'
        ? sessionViewedEvents.has(event.id)
        : viewedStateService.isEventViewed(event.id, viewedTrackingSettings)

      return {
        ...event,
        isViewed,
        viewedAt: isViewed ? (viewedEvents.get(event.id) || Date.now()) : undefined
      }
    })
  }, [viewedTrackingSettings, sessionViewedEvents, viewedEvents])

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
      if (viewedTrackingSettings.persistenceLevel === 'session') {
        // Session-only: store in memory
        setSessionViewedEvents(prev => new Set([...prev, event.id]))
      } else {
        // Persistent: use service
        viewedStateService.markEventAsViewed(event.id, viewedTrackingSettings)
        // Refresh local state for immediate UI update
        const updatedViewed = viewedStateService.loadViewedEvents()
        setViewedEvents(updatedViewed)
      }
    }

    // Always show the detailed modal for any clicked event
    setSelectedEvent(event)
  }, [viewedTrackingSettings])

  const handleViewedSettingsChange = useCallback((newSettings: ViewedTrackingSettings) => {
    setViewedTrackingSettings(newSettings)
    viewedStateService.saveSettings(newSettings)
  }, [])

  const handleSidebarEventClick = useCallback((event: TimelineEvent) => {
    // Open the event detail modal, same as clicking a minicard
    handleEventClick(event)
  }, [handleEventClick])

  const handleNavigateToEvent = useCallback((event: TimelineEvent) => {
    // Navigate to the event's position on the timeline
    if (onJumpToTime) {
      onJumpToTime(event.timestamp)
    }
  }, [onJumpToTime])

  const handleSlotSelection = useCallback(async (targetSlot: number) => {
    if (!queuedEventForSlotSelection) return

    // Get slot range for this event type
    const getSlotRange = (eventType: string) => {
      switch (eventType) {
        case 'network': return { start: 0, end: 3 }
        case 'console': return { start: 10, end: 13 }
        case 'token': return { start: 20, end: 23 }
        default: return { start: 0, end: 3 }
      }
    }

    const slotRange = getSlotRange(queuedEventForSlotSelection.type)
    const actualSlot = slotRange.start + targetSlot // Convert 0-3 UI slot to actual slot number

    // Get current events to find what needs to be replaced
    const viewportEvents = visualizationData.shouldShowCards ?
      visualizationData.individualEvents :
      visualizationData.densityClusters.flatMap(cluster => cluster.events)

    const eventToReplace = viewportEvents.find(e => e.compareSlot === actualSlot)

    if (eventToReplace) {
      // Move the replaced event to the queue (it will get compareSlot = -1)
      await onSetCompareSlot(eventToReplace.id, -1)
    }

    // Move the queued event to the selected slot
    await onSetCompareSlot(queuedEventForSlotSelection.id, actualSlot)

    // Close modal
    setShowSlotSelection(false)
    setQueuedEventForSlotSelection(null)
  }, [queuedEventForSlotSelection, visualizationData, onSetCompareSlot])

  const handleMoveToQueue = useCallback(async (event: TimelineEvent) => {
    // Move an active compare event to the queue
    if (event.compareSlot !== undefined && event.compareSlot >= 0) {
      await onSetCompareSlot(event.id, -1)

      // Compact remaining slots to remove gaps
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

      // If there are queued events, promote the first one to fill the gap
      const queuedEvents = events.filter(e => e.compareSlot === -1)
      if (queuedEvents.length > 0) {
        const nextInQueue = queuedEvents[0] // Get first in queue
        const newSlot = remainingCompareEvents.length
        if (newSlot < 4) {
          await onSetCompareSlot(nextInQueue.id, newSlot)
        }
      }
    }
  }, [visualizationData, onSetCompareSlot, events])

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

      // If it was in an active slot, compact remaining slots to remove gaps
      if (removedSlot >= 0) {
        const viewportEvents = visualizationData.shouldShowCards ?
          visualizationData.individualEvents :
          visualizationData.densityClusters.flatMap(cluster => cluster.events)

        // Get slot range for this event type
        const getSlotRange = (eventType: string) => {
          switch (eventType) {
            case 'network': return { start: 0, end: 3 }
            case 'console': return { start: 10, end: 13 }
            case 'token': return { start: 20, end: 23 }
            default: return { start: 0, end: 3 }
          }
        }

        const slotRange = getSlotRange(event.type)

        const remainingCompareEvents = viewportEvents.filter(e =>
          e.compareSlot !== undefined &&
          e.compareSlot >= slotRange.start &&
          e.compareSlot <= slotRange.end &&
          e.id !== event.id
        ).sort((a, b) => (a.compareSlot || 0) - (b.compareSlot || 0))

        // Reassign consecutive slot numbers within the type's range
        for (let i = 0; i < remainingCompareEvents.length; i++) {
          const expectedSlot = slotRange.start + i
          if (remainingCompareEvents[i].compareSlot !== expectedSlot) {
            await onSetCompareSlot(remainingCompareEvents[i].id, expectedSlot)
          }
        }

        // If there are queued events of the same type, promote the first one to fill the gap
        const queuedEventsOfType = events.filter(e => e.compareSlot === -1 && e.type === event.type)
        if (queuedEventsOfType.length > 0) {
          const nextInQueue = queuedEventsOfType[0] // Get first in queue of same type
          const newSlot = slotRange.start + remainingCompareEvents.length
          if (newSlot <= slotRange.end) {
            await onSetCompareSlot(nextInQueue.id, newSlot)
          }
        }
      }
      return
    }

    // Get slot range for this event type
    const getSlotRange = (eventType: string) => {
      switch (eventType) {
        case 'network': return { start: 0, end: 3 }
        case 'console': return { start: 10, end: 13 }
        case 'token': return { start: 20, end: 23 }
        default: return { start: 0, end: 3 }
      }
    }

    const slotRange = getSlotRange(event.type)

    // Check how many active slots are currently occupied for this event type
    const currentTypeCompareEvents = events.filter(e =>
      e.compareSlot !== undefined &&
      e.compareSlot >= slotRange.start &&
      e.compareSlot <= slotRange.end
    )

    if (currentTypeCompareEvents.length < 4) {
      // There's space in active slots for this type - add directly to next available slot
      const occupiedSlots = new Set(currentTypeCompareEvents.map(e => e.compareSlot))
      let targetSlot = slotRange.start
      while (occupiedSlots.has(targetSlot) && targetSlot <= slotRange.end) {
        targetSlot++
      }
      await onSetCompareSlot(event.id, targetSlot)
    } else {
      // All 4 slots for this type are full - add to queue
      await onSetCompareSlot(event.id, -1)
    }
  }, [visualizationData, onSetCompareSlot, events])

  const handleMoveFromQueue = useCallback(async (event: TimelineEvent) => {
    // Get slot range for this event type
    const getSlotRange = (eventType: string) => {
      switch (eventType) {
        case 'network': return { start: 0, end: 3 }
        case 'console': return { start: 10, end: 13 }
        case 'token': return { start: 20, end: 23 }
        default: return { start: 0, end: 3 }
      }
    }

    const slotRange = getSlotRange(event.type)

    // Check if there are available slots for this event type
    const currentTypeCompareEvents = events.filter(e =>
      e.compareSlot !== undefined &&
      e.compareSlot >= slotRange.start &&
      e.compareSlot <= slotRange.end
    )

    if (currentTypeCompareEvents.length < 4) {
      // There's space for this type - add directly to next available slot
      const occupiedSlots = new Set(currentTypeCompareEvents.map(e => e.compareSlot))
      let targetSlot = slotRange.start
      while (occupiedSlots.has(targetSlot) && targetSlot <= slotRange.end) {
        targetSlot++
      }
      await onSetCompareSlot(event.id, targetSlot)
    } else {
      // All slots for this type are full - show slot selection modal for replacement
      setQueuedEventForSlotSelection(event)
      setShowSlotSelection(true)
    }
  }, [events, onSetCompareSlot])

  // Get bookmarked events for sidebar
  const bookmarkedEvents = events.filter(e => e.isBookmarked)

  // Get compare events (both active and queued) - includes all event types with their slots
  const activeCompareEvents = events.filter(e => {
    if (e.compareSlot === undefined) return false
    // Network: slots 0-3, Console: slots 10-13, Token: slots 20-23
    return (e.compareSlot >= 0 && e.compareSlot <= 3) ||
           (e.compareSlot >= 10 && e.compareSlot <= 13) ||
           (e.compareSlot >= 20 && e.compareSlot <= 23)
  }).sort((a, b) => (a.compareSlot || 0) - (b.compareSlot || 0))

  const queuedCompareEvents = events.filter(e => e.compareSlot === -1)

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Timeline Area */}
      <div className="flex-1 flex flex-col" ref={containerRef}>
        {/* Timeline Header with Sticky Date Indicators and Settings */}
        <div className="relative h-6 mb-1">
          <StickyDateIndicator viewport={viewport} zoomLevel={zoomLevel} />

          {/* Settings Button - High z-index to ensure visibility */}
          <button
            onClick={() => setShowViewedSettings(true)}
            className="absolute top-0 right-2 z-50 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md shadow-md border border-blue-200 bg-white transition-all"
            title="Viewed State Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
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
        onMoveToQueue={handleMoveToQueue}
        onShowCompareView={() => setShowCompareView(true)}
        onEventClick={handleSidebarEventClick}
        onNavigateToEvent={handleNavigateToEvent}
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

      {/* Viewed State Settings Modal */}
      <ViewedStateSettings
        settings={viewedTrackingSettings}
        onSettingsChange={handleViewedSettingsChange}
        isOpen={showViewedSettings}
        onClose={() => setShowViewedSettings(false)}
      />

      {/* Slot Selection Modal */}
      <SlotSelectionModal
        isOpen={showSlotSelection}
        onClose={() => {
          setShowSlotSelection(false)
          setQueuedEventForSlotSelection(null)
        }}
        onSelectSlot={handleSlotSelection}
        queuedEvent={queuedEventForSlotSelection}
        activeCompareEvents={activeCompareEvents}
      />
    </div>
  )
}
