import React, { useState } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { Bookmark, GitCompare, ChevronRight, ChevronLeft, Grid2X2, Navigation, Eye, ArrowDown } from 'lucide-react'

interface TimelineSidebarProps {
  bookmarkedEvents: TimelineEvent[]
  compareEvents: TimelineEvent[]
  compareQueue: TimelineEvent[]
  onBookmarkRemove: (eventId: string) => void
  onCompareRemove: (eventId: string) => void
  onMoveFromQueue: (event: TimelineEvent) => void
  onMoveToQueue?: (event: TimelineEvent) => void
  onShowCompareView: () => void
  onEventClick?: (event: TimelineEvent) => void
  onNavigateToEvent?: (event: TimelineEvent) => void
  isCollapsed?: boolean
  onToggleCollapsed?: () => void
}

export const TimelineSidebar: React.FC<TimelineSidebarProps> = ({
  bookmarkedEvents,
  compareEvents,
  compareQueue,
  onBookmarkRemove,
  onCompareRemove,
  onMoveFromQueue,
  onMoveToQueue,
  onShowCompareView,
  onEventClick,
  onNavigateToEvent,
  isCollapsed = false,
  onToggleCollapsed
}) => {
  // Fallback to local state if parent doesn't manage collapsed state
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const collapsed = onToggleCollapsed ? isCollapsed : localCollapsed
  const toggleCollapsed = onToggleCollapsed || (() => setLocalCollapsed(!localCollapsed))

  // Helper function to extract domain from URL
  const getDomainFromEvent = (event: TimelineEvent): string | null => {
    try {
      if (event.type === 'network' && event.data.url) {
        const url = new URL(event.data.url)
        return url.hostname
      }
      if (event.type === 'console' && event.data.source) {
        const url = new URL(event.data.source)
        return url.hostname
      }
      if (event.type === 'token' && event.data.origin) {
        const url = new URL(event.data.origin)
        return url.hostname
      }
    } catch (error) {
      // Invalid URL, return null
    }
    return null
  }

  const renderEventCard = (event: TimelineEvent, type: 'bookmark' | 'compare' | 'queue') => {
    const typeConfig = {
      network: { color: 'bg-blue-50 border-blue-200', icon: '🌐' },
      console: { color: 'bg-red-50 border-red-200', icon: '⚠️' },
      token: { color: 'bg-green-50 border-green-200', icon: '🔑' }
    }

    const config = typeConfig[event.type]

    return (
      <div
        key={event.id}
        className={`p-3 border rounded-lg ${config.color} text-xs hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => onEventClick?.(event)}
        title="Click to view details"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-base">{config.icon}</span>
              <span className="font-medium truncate">
                {event.type === 'network' && (event.data.url?.split('/').pop() || 'Request')}
                {event.type === 'console' && (event.data.message?.substring(0, 40) || 'Error')}
                {event.type === 'token' && (event.data.token_type || 'Token')}
              </span>
            </div>

            {/* Domain information */}
            {getDomainFromEvent(event) && (
              <div className="text-gray-400 mt-1 text-xs truncate">
                🌐 {getDomainFromEvent(event)}
              </div>
            )}

            <div className="text-gray-500 mt-1 flex items-center justify-between">
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="ml-2 flex items-center space-x-1">
            {/* Navigate to timeline button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigateToEvent?.(event)
              }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Navigate to timeline position"
            >
              <Navigation className="w-3 h-3" />
            </button>

            {/* View details button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEventClick?.(event)
              }}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
              title="View details"
            >
              <Eye className="w-3 h-3" />
            </button>

            {/* Remove/action buttons */}
            {type === 'bookmark' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onBookmarkRemove(event.id)
                }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove bookmark"
              >
                ×
              </button>
            )}
            {type === 'compare' && (
              <>
                {/* Move to Queue button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoveToQueue?.(event)
                  }}
                  className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Move to queue"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCompareRemove(event.id)
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove from compare"
                >
                  ×
                </button>
              </>
            )}
            {type === 'queue' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveFromQueue(event)
                }}
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Move to compare"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Compare slot indicator */}
        {event.compareSlot !== undefined && event.compareSlot >= 0 && (
          <div className="mt-2 text-xs text-purple-600 font-medium">
            Compare Slot {event.compareSlot + 1}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${collapsed ? 'w-12' : 'w-80'} bg-white border-l border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out`}>
      {/* Toggle Button */}
      <div className="p-2 border-b border-gray-200 flex justify-center">
        <button
          onClick={toggleCollapsed}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Bookmarks Section - Fixed height */}
          <div className="border-b border-gray-200 overflow-hidden flex flex-col" style={{ height: '280px' }}>
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-yellow-600" />
                <h3 className="font-medium">Bookmarks ({bookmarkedEvents.length})</h3>
              </div>
            </div>
        <div className="flex-1 overflow-y-auto p-4">
          {bookmarkedEvents.length > 0 ? (
            <div className="space-y-2">
              {bookmarkedEvents.map(event => renderEventCard(event, 'bookmark'))}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">
              No bookmarked events
            </div>
          )}
        </div>
      </div>

      {/* Compare Section - Fixed height */}
      <div className="overflow-hidden flex flex-col" style={{ height: '280px' }}>
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-purple-600" />
              <h3 className="font-medium">Compare ({compareEvents.length}/4)</h3>
            </div>
            {compareEvents.length > 0 && (
              <button
                onClick={onShowCompareView}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Show compare view"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {compareEvents.length > 0 || compareQueue.length > 0 ? (
            <div className="space-y-4">
              {/* Active compare slots */}
              {compareEvents.length > 0 && (
                <div className="space-y-2">
                  {compareEvents.map(event => renderEventCard(event, 'compare'))}
                </div>
              )}

              {/* Queue */}
              {compareQueue.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Queue ({compareQueue.length})
                  </div>
                  <div className="space-y-2">
                    {compareQueue.map(event => renderEventCard(event, 'queue'))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">
              No events to compare
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Collapsed State - Show counts only */}
      {collapsed && (
        <div className="flex flex-col" style={{ height: '560px' }}>
          {/* Bookmarks section placeholder - 280px */}
          <div className="flex items-center justify-center border-b border-gray-200" style={{ height: '280px' }}>
            <div className="text-center">
              <Bookmark className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-600">{bookmarkedEvents.length}</div>
            </div>
          </div>

          {/* Compare section placeholder - 280px */}
          <div className="flex items-center justify-center" style={{ height: '280px' }}>
            <div className="text-center">
              <GitCompare className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-600">{compareEvents.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
