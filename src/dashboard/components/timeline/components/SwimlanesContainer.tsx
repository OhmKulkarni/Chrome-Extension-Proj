import React, { useState, useCallback, useRef } from 'react'
import { TimelineEvent, TimelineCluster, SwimLaneConfig } from '../types/timeline.types'
import { Swimlane } from './Swimlane'
import { EventPopup } from './EventPopup'
import { TimelineSidebar } from './TimelineSidebar'
import { CompareView } from './CompareView'

interface SwimlanesContainerProps {
  events: TimelineEvent[]
  clusters: TimelineCluster[]
  shouldCluster: boolean
  onBookmarkEvent: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onSetCompareSlot: (eventId: string, slot: number | undefined) => Promise<boolean>
  zoomLevel: number
  swimlanes: SwimLaneConfig[]
  onUpdateSwimlanes: (swimlanes: SwimLaneConfig[]) => void
}

export const SwimlanesContainer: React.FC<SwimlanesContainerProps> = ({
  events,
  clusters,
  shouldCluster,
  onBookmarkEvent,
  onSetCompareSlot,
  zoomLevel,
  swimlanes,
  onUpdateSwimlanes
}) => {
  const [selectedCluster, setSelectedCluster] = useState<TimelineCluster | null>(null)
  const [showCompareView, setShowCompareView] = useState(false)
  const [compareQueue, setCompareQueue] = useState<TimelineEvent[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleResizeSwimlane = useCallback((laneId: string, newHeight: number) => {
    const lanes = [...swimlanes]
    const laneIndex = lanes.findIndex(l => l.id === laneId)
    if (laneIndex === -1) return

    // Adjust this lane and redistribute remaining height
    const oldHeight = lanes[laneIndex].height
    const heightDiff = newHeight - oldHeight
    lanes[laneIndex].height = newHeight

    // Redistribute the difference among other visible lanes
    const otherVisibleLanes = lanes.filter((l, i) => i !== laneIndex && l.isVisible)
    if (otherVisibleLanes.length > 0) {
      const adjustmentPerLane = -heightDiff / otherVisibleLanes.length
      lanes.forEach((lane, i) => {
        if (i !== laneIndex && lane.isVisible) {
          lane.height = Math.max(10, lane.height + adjustmentPerLane) // Min 10% height
        }
      })
    }

    onUpdateSwimlanes(lanes)
  }, [swimlanes, onUpdateSwimlanes])

  const handleClusterClick = useCallback((cluster: TimelineCluster) => {
    setSelectedCluster(cluster)
  }, [])

  const handleEventClick = useCallback((event: TimelineEvent) => {
    // If it's a dense stack, show popup
    const samePositionEvents = events.filter(e => 
      Math.abs(e.timestamp - event.timestamp) < 1000 && 
      e.swimlane === event.swimlane
    )
    
    if (samePositionEvents.length > 1) {
      setSelectedCluster({
        id: `stack_${event.id}`,
        events: samePositionEvents,
        startTime: event.timestamp - 500,
        endTime: event.timestamp + 500,
        centerTime: event.timestamp,
        density: samePositionEvents.length,
        swimlane: event.swimlane,
        x: 0,
        y: 0
      })
    }
  }, [events])

  const handleAddToCompare = useCallback(async (event: TimelineEvent) => {
    const currentCompareEvents = events.filter(e => 
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
  }, [events, compareQueue, onSetCompareSlot])

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
        {/* Swimlanes */}
        <div className="flex-1 relative">
          {adjustedSwimlanes().map((swimlane, index) => (
            <Swimlane
              key={swimlane.id}
              config={swimlane}
              events={events.filter(e => e.swimlane === swimlane.id)}
              clusters={clusters.filter(c => c.swimlane === swimlane.id)}
              shouldCluster={shouldCluster}
              height={swimlane.height}
              onToggle={() => handleToggleSwimlane(swimlane.id)}
              onResize={(newHeight: number) => handleResizeSwimlane(swimlane.id, newHeight)}
              onClusterClick={handleClusterClick}
              onEventClick={handleEventClick}
              onBookmark={onBookmarkEvent}
              onAddToCompare={handleAddToCompare}
              zoomLevel={zoomLevel}
              isLast={index === visibleSwimlanes.length - 1}
            />
          ))}
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
    </div>
  )
}
