import React, { useEffect } from 'react'
import { TimelineHeader } from './components/TimelineHeader'
import { SwimlanesContainer } from './components/SwimlanesContainer'
import { useTimelineData } from './hooks/useTimelineData'
import { useViewport } from './hooks/useViewport'

export const TimelineVisualization: React.FC = () => {
  const viewport = useViewport({ initialScope: '5m' })
  const timelineData = useTimelineData({
    swimlanes: ['network', 'console', 'token'],
    zoomLevel: viewport.zoomLevel
  })

  // Check for updates periodically - TEMPORARILY DISABLED
  useEffect(() => {
    // const interval = setInterval(() => {
    //   timelineData.checkForUpdates()
    // }, 30000) // Check every 30 seconds

    // return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TimelineHeader
        currentScope={viewport.currentScope}
        centerTime={viewport.centerTime}
        canZoomIn={viewport.canZoomIn}
        canZoomOut={viewport.canZoomOut}
        hasNewUpdates={timelineData.hasNewUpdates}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onPanLeft={viewport.panLeft}
        onPanRight={viewport.panRight}
        onJumpToPreset={viewport.jumpToPreset}
        onJumpToTime={viewport.jumpToTime}
        onRefresh={timelineData.refreshData}
        onAcknowledgeUpdates={timelineData.acknowledgeUpdates}
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
        ) : timelineData.events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-2">No events found in this time range</div>
              <div className="text-sm text-gray-500">
                Try adjusting the time range or check if data capture is enabled
              </div>
            </div>
          </div>
        ) : (
          <SwimlanesContainer
            events={timelineData.events}
            clusters={timelineData.clusters}
            shouldCluster={timelineData.shouldCluster}
            onBookmarkEvent={timelineData.bookmarkEvent}
            onSetCompareSlot={timelineData.setCompareSlot}
            zoomLevel={viewport.zoomLevel}
          />
        )}
      </div>
    </div>
  )
}
