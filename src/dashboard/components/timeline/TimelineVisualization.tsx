import React, { useEffect, useState, useMemo } from 'react'
import TimelineHeaderNew from './components/TimelineHeaderNew'
import { SwimlanesContainer } from './components/SwimlanesContainer'
import { useTimelineData } from './hooks/useTimelineData'
import { useViewport } from './hooks/useViewport'
import { useTimelineVisualization } from './hooks/useTimelineVisualization'
import { SwimLaneConfig, DEFAULT_SWIMLANES } from './types/timeline.types'
export const TimelineVisualization: React.FC = () => {
  const [swimlanes, setSwimlanes] = useState<SwimLaneConfig[]>(DEFAULT_SWIMLANES)

  // Initialize viewport with default settings first
  const viewport = useViewport({ initialScope: '1-hour' })

  const timelineData = useTimelineData({
    swimlanes: ['network', 'console', 'token'],
    zoomLevel: viewport.zoomLevel
  })

  // Calculate earliest timestamp from timeline data for "first-" scopes
  const earliestTimestamp = useMemo(() => {
    if (!timelineData.events || timelineData.events.length === 0) {
      return Date.now() - (24 * 60 * 60 * 1000) // Default fallback
    }
    return Math.min(...timelineData.events.map(event => event.timestamp))
  }, [timelineData.events])

  // Update viewport hook with earliest timestamp when data changes
  React.useEffect(() => {
    viewport.setEarliestDataTimestamp(earliestTimestamp)
  }, [earliestTimestamp, viewport])

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

  // Check for updates periodically - TEMPORARILY DISABLED
  useEffect(() => {
    // const interval = setInterval(() => {
    //   timelineData.checkForUpdates()
    // }, 30000) // Check every 30 seconds

    // return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TimelineHeaderNew
        currentScope={viewport.currentScope}
        centerTime={viewport.centerTime}
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
    </div>
  )
}
