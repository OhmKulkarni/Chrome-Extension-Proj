import React, { useEffect } from 'react'
import { TimelineHeader } from './components/TimelineHeader'
import { SwimlanesContainer } from './components/SwimlanesContainer'
import { useTimelineData } from './hooks/useTimelineData'
import { useViewport } from './hooks/useViewport'

export const TimelineVisualization: React.FC = () => {
  const viewport = useViewport({ initialScope: '5m' })
  const timelineData = useTimelineData({
    viewport: viewport.viewport,
    swimlanes: ['network', 'console', 'token'],
    zoomLevel: viewport.zoomLevel
  })

  // Check for updates periodically
  useEffect(() => {
    const interval = setInterval(() => {
      timelineData.checkForUpdates()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [timelineData.checkForUpdates])

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
            <div className="text-gray-500">Loading timeline data...</div>
          </div>
        ) : timelineData.error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">Error: {timelineData.error}</div>
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
