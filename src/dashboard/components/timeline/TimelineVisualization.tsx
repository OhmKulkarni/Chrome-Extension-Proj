import React, { useEffect, useState, useMemo } from 'react'
import TimelineHeaderNew from './components/TimelineHeaderNew'
import { SwimlanesContainer } from './components/SwimlanesContainer'
import { useTimelineData } from './hooks/useTimelineData'
import { useViewport } from './hooks/useViewport'
import { useTimelineVisualization } from './hooks/useTimelineVisualization'
import { SwimLaneConfig, DEFAULT_SWIMLANES, TimelineEvent } from './types/timeline.types'
import { Bookmark, GitCompare, Lock, Unlock } from 'lucide-react'

// Inline Bookmark Compare Panel Component with Full Functionality
const BookmarkComparePanelInline: React.FC<{
  bookmarkedEvents: TimelineEvent[]
  compareEvents: TimelineEvent[]
  onRemoveBookmark?: (eventId: string) => void
  onRemoveFromCompare?: (eventId: string) => void
  onEventClick?: (event: TimelineEvent) => void
}> = ({
  bookmarkedEvents,
  compareEvents,
  onRemoveBookmark,
  onRemoveFromCompare,
  onEventClick
}) => {
  const [isLocked, setIsLocked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'compare'>('bookmarks')

  return (
    <div
      className="relative"
      onMouseEnter={() => !isLocked && setIsHovered(true)}
      onMouseLeave={() => !isLocked && setIsHovered(false)}
    >
      {/* Hover Trigger Bar - only show when not locked */}
      {!isLocked && (
        <div className="fixed right-0 bottom-0 h-4 w-full z-30 cursor-pointer group">
          <div className="h-1 w-full bg-purple-500 opacity-30 group-hover:opacity-70 transition-opacity duration-200" />
          <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 h-3 w-12 bg-purple-500 opacity-50 group-hover:opacity-80 transition-opacity duration-200 rounded-t-md" />
          <div className="absolute bottom-1 right-4 flex items-center gap-2 text-xs text-gray-600 bg-white/90 rounded px-2 py-1">
            <Bookmark className="w-3 h-3" />
            <span>{bookmarkedEvents.length}</span>
            <GitCompare className="w-3 h-3" />
            <span>{compareEvents.length}</span>
          </div>
        </div>
      )}

      {/* Control Panel - slides up on hover or stays visible when locked */}
      <div className={`fixed right-0 bottom-0 w-80 bg-gray-50 border-l border-t border-gray-200 z-40 transition-transform duration-300 ease-in-out shadow-lg max-h-96 ${
        isLocked || isHovered ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="h-full overflow-hidden">
          {/* Header with lock button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Timeline Bookmarks</h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {isLocked ? 'Panel locked' : 'Hover to keep open'}
              </div>
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  isLocked
                    ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isLocked ? 'Unlock panel' : 'Lock panel open'}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
            {/* Tab Selector */}
            <div className="flex bg-gray-200 rounded-lg p-1 m-4 mb-2">
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 justify-center ${
                  activeTab === 'bookmarks'
                    ? 'bg-white text-yellow-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Bookmarks ({bookmarkedEvents.length})
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 justify-center ${
                  activeTab === 'compare'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                Compare ({compareEvents.length})
              </button>
            </div>

            {/* Content Area */}
            <div className="px-4 pb-4 space-y-2">
              {activeTab === 'bookmarks' && (
                <>
                  {bookmarkedEvents.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                      <Bookmark className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No bookmarked events</p>
                      <p className="text-xs mt-1">Click the bookmark icon on events to save them here</p>
                    </div>
                  ) : (
                    bookmarkedEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 p-3 bg-white border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-50 transition-colors shadow-sm"
                        onClick={() => onEventClick?.(event)}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: event.type === 'network' ? '#3b82f6' :
                                           event.type === 'console' ? '#ef4444' : '#f59e0b'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.type.toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {event.data?.url || event.data?.message || event.data?.description || 'Event details'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {onRemoveBookmark && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemoveBookmark(event.id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Remove bookmark"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === 'compare' && (
                <>
                  {compareEvents.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                      <GitCompare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No events in compare</p>
                      <p className="text-xs mt-1">Click the compare icon on events to add them for comparison</p>
                    </div>
                  ) : (
                    compareEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 p-3 bg-white border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors shadow-sm"
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: event.type === 'network' ? '#3b82f6' :
                                             event.type === 'console' ? '#ef4444' : '#f59e0b'
                            }}
                          />
                          {event.compareSlot !== undefined && event.compareSlot >= 0 && (
                            <span className="text-xs font-bold text-purple-600 bg-purple-200 rounded-full w-4 h-4 flex items-center justify-center">
                              {event.compareSlot + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.type.toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {event.data?.url || event.data?.message || event.data?.description || 'Event details'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        {onRemoveFromCompare && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemoveFromCompare(event.id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Remove from compare"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Footer with quick actions */}
              {(bookmarkedEvents.length > 0 || compareEvents.length > 0) && (
                <div className="pt-3 border-t border-gray-200 mt-4">
                  <div className="flex gap-2 text-xs">
                    {activeTab === 'bookmarks' && bookmarkedEvents.length > 0 && onRemoveBookmark && (
                      <button
                        onClick={() => bookmarkedEvents.forEach(event => onRemoveBookmark(event.id))}
                        className="flex-1 px-3 py-2 bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-md transition-colors"
                      >
                        Clear All Bookmarks
                      </button>
                    )}
                    {activeTab === 'compare' && compareEvents.length > 0 && onRemoveFromCompare && (
                      <button
                        onClick={() => compareEvents.forEach(event => onRemoveFromCompare(event.id))}
                        className="flex-1 px-3 py-2 bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-md transition-colors"
                      >
                        Clear Compare Queue
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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

        {/* Bookmark & Compare Panel - Inline implementation */}
        <BookmarkComparePanelInline
          bookmarkedEvents={timelineData.events.filter(event => event.isBookmarked)}
          compareEvents={timelineData.events.filter(event => event.compareSlot !== undefined)}
        />
      </div>
    </div>
  )
}
