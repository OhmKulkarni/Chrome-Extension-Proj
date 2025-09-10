import React, { useEffect, useState, useMemo } from 'react'
import TimelineHeaderNew from './components/TimelineHeaderNew'
import { SwimlanesContainer } from './components/SwimlanesContainer'
import { AllTimeModal } from './components/AllTimeModal'
import { useTimelineData } from './hooks/useTimelineData'
import { useViewport } from './hooks/useViewport'
import { useTimelineVisualization } from './hooks/useTimelineVisualization'
import { SwimLaneConfig, DEFAULT_SWIMLANES } from './types/timeline.types'

interface TimelineVisualizationProps {
  focusedEventId?: string;
}

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ focusedEventId }) => {
  // State to track highlighted event (glowing until clicked)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [swimlanes, setSwimlanes] = useState<SwimLaneConfig[]>(DEFAULT_SWIMLANES)
  const [debugMode, setDebugMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showAllTimeModal, setShowAllTimeModal] = useState(false)

  // Track the last processed focusedEventId to prevent infinite loops
  const lastProcessedEventIdRef = React.useRef<string | null>(null)

  // Initialize viewport with default settings first
  const viewport = useViewport({ initialScope: '1-hour' })

  const timelineData = useTimelineData({
    swimlanes: ['network', 'console', 'token'],
    zoomLevel: viewport.zoomLevel
  })

  // Calculate earliest and latest timestamps from timeline data for "first-" and "last-" scopes
  const earliestTimestamp = useMemo(() => {
    if (!timelineData.events || timelineData.events.length === 0) {
      return Date.now() - (24 * 60 * 60 * 1000) // Default fallback
    }
    return Math.min(...timelineData.events.map(event => event.timestamp))
  }, [timelineData.events])

  const latestTimestamp = useMemo(() => {
    if (!timelineData.events || timelineData.events.length === 0) {
      return Date.now() // Default fallback to current time
    }
    return Math.max(...timelineData.events.map(event => event.timestamp))
  }, [timelineData.events])

  // Update viewport hook with timestamp boundaries when data changes
  React.useEffect(() => {
    viewport.setEarliestDataTimestamp(earliestTimestamp)
    viewport.setLatestDataTimestamp(latestTimestamp)
  }, [earliestTimestamp, latestTimestamp, viewport])

  // Use the new density-based visualization
  const visualizationData = useTimelineVisualization({
    events: timelineData.events,
    viewport: viewport.viewport,
    zoomLevel: viewport.zoomLevel
  })

  const hiddenSwimlanes = swimlanes.filter(lane => !lane.isVisible).map(lane => lane.id)

  const handleShowSwimlane = (laneId: string) => {
    setSwimlanes(prev => prev.map(lane =>
      lane.id === laneId ? { ...lane, isVisible: true } : lane
    ))
  }

  // Handle focusing on a specific event when navigated from data tables
  useEffect(() => {
    // Only proceed if we have a new focusedEventId that we haven't processed yet
    if (focusedEventId && 
        focusedEventId !== lastProcessedEventIdRef.current && 
        !timelineData.loading && 
        timelineData.events && 
        timelineData.events.length > 0) {
      
      // Mark this event ID as being processed
      lastProcessedEventIdRef.current = focusedEventId

      // First try exact ID match
      let targetEvent = timelineData.events.find(event => event.id === focusedEventId)

      if (!targetEvent) {
        // If no exact match, try to find by timestamp and type
        const idParts = focusedEventId.split('_')
        if (idParts.length >= 3) {
          const eventType = idParts[0]
          const timestamp = parseInt(idParts[idParts.length - 1])

          if (!isNaN(timestamp)) {
            // Find event by type and timestamp (within 100ms tolerance)
            targetEvent = timelineData.events.find(event =>
              event.type === eventType &&
              Math.abs(event.timestamp - timestamp) <= 100
            )
          }
        }
      }

      if (targetEvent) {
        const targetTime = targetEvent.timestamp

        // Set timeline to 1-minute scope and center on the event in one smooth operation
        // Use jumpToTime which handles both scope and timing properly
        viewport.jumpToTime(targetTime, '1-minute')

        // Set the event to be highlighted after a short delay to ensure viewport has settled
        setTimeout(() => {
          setHighlightedEventId(focusedEventId)
        }, 150)

        console.log(`Timeline focused on event: ${focusedEventId} at ${new Date(targetTime).toLocaleString()}`)
      } else {
        console.warn(`Timeline could not find event with ID: ${focusedEventId}`)
        console.log('Available events:', timelineData.events.map(e => ({ id: e.id, type: e.type, timestamp: e.timestamp })))
      }
    } else if (focusedEventId && timelineData.loading) {
      console.log('Timeline waiting for data to load before focusing...')
    }
  }, [focusedEventId, timelineData.events, timelineData.loading])  // Check for updates periodically - TEMPORARILY DISABLED
  useEffect(() => {
    // const interval = setInterval(() => {
    //   timelineData.checkForUpdates()
    // }, 30000) // Check every 30 seconds

    // return () => clearInterval(interval)
  }, [])

  // Add keyboard shortcut for debug mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setDebugMode(prev => !prev)
        console.log(`🐛 Timeline Debug Mode: ${!debugMode ? 'ON' : 'OFF'}`)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [debugMode])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TimelineHeaderNew
        currentScope={viewport.currentScope}
        centerTime={viewport.centerTime}
        viewport={viewport.viewport}
        canZoomIn={viewport.canZoomIn}
        canZoomOut={viewport.canZoomOut}
        isAnimating={viewport.isAnimating}
        hasNewUpdates={timelineData.hasNewUpdates}
        hiddenSwimlanes={hiddenSwimlanes}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onPanLeft={viewport.panLeft}
        onPanRight={viewport.panRight}
        onJumpToPreset={viewport.jumpToPreset}
        onJumpToTime={viewport.jumpToTime}
        onRefresh={timelineData.refreshData}
        onAcknowledgeUpdates={timelineData.acknowledgeUpdates}
        onShowSwimlane={handleShowSwimlane}
        onShowAllTimeModal={() => setShowAllTimeModal(true)}
      />

      <div className="flex-1 overflow-hidden">
        {timelineData.loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-gray-500">Loading timeline data...</div>
            </div>
          </div>
        ) : timelineData.error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 mb-2">Error: {timelineData.error}</div>
              <button
                onClick={() => timelineData.refreshData()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex-1">
            <SwimlanesContainer
              events={timelineData.events}
              clusters={timelineData.clusters}
              visualizationData={visualizationData}
              viewport={viewport.viewport}
              currentScope={viewport.scopeConfig}
              shouldCluster={!visualizationData.shouldShowCards}
              onBookmarkEvent={timelineData.bookmarkEvent}
              onSetCompareSlot={timelineData.setCompareSlot}
              onZoomIn={viewport.zoomIn}
              onJumpToTime={viewport.jumpToTime}
              zoomLevel={viewport.zoomLevel}
              swimlanes={swimlanes}
              onUpdateSwimlanes={setSwimlanes}
              debugMode={debugMode}
              isAnimating={viewport.isAnimating}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebarCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
              highlightedEventId={highlightedEventId}
              onEventClick={(_eventId: string) => setHighlightedEventId(null)}
            />

            {/* Subtle overlay message when no events are visible */}
            {visualizationData.totalEventCount === 0 && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 px-6 py-4 shadow-sm max-w-md mx-4">
                    <div className="text-center">
                      <div className="text-gray-600 text-sm mb-1">No events in this time range</div>
                      <div className="text-xs text-gray-500">
                        Try adjusting the time range or check if data capture is enabled
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Time Modal */}
      <AllTimeModal
        isOpen={showAllTimeModal}
        events={timelineData.events}
        earliestTimestamp={earliestTimestamp}
        latestTimestamp={latestTimestamp}
        onClose={() => setShowAllTimeModal(false)}
        onJumpToTime={(timestamp, scope) => {
          viewport.jumpToTime(timestamp)
          if (scope) {
            viewport.jumpToPreset(scope)
          }
          setShowAllTimeModal(false)
        }}
      />
    </div>
  )
}
