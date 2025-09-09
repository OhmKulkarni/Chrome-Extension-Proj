import React, { useState } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { Bookmark, GitCompare, ChevronRight, ChevronLeft, Grid2X2 } from 'lucide-react'

interface TimelineSidebarProps {
  bookmarkedEvents: TimelineEvent[]
  compareEvents: TimelineEvent[]
  compareQueue: TimelineEvent[]
  onBookmarkRemove: (eventId: string) => void
  onCompareRemove: (eventId: string) => void
  onMoveFromQueue: (event: TimelineEvent) => void
  onShowCompareView: () => void
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
  onShowCompareView,
  isCollapsed = false,
  onToggleCollapsed
}) => {
  // Fallback to local state if parent doesn't manage collapsed state
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const collapsed = onToggleCollapsed ? isCollapsed : localCollapsed
  const toggleCollapsed = onToggleCollapsed || (() => setLocalCollapsed(!localCollapsed))
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
        className={`p-2 border rounded-md ${config.color} text-xs`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span>{config.icon}</span>
              <span className="font-medium truncate">
                {event.type === 'network' && (event.data.url?.split('/').pop() || 'Request')}
                {event.type === 'console' && (event.data.message?.substring(0, 50) || 'Error')}
                {event.type === 'token' && (event.data.token_type || 'Token')}
              </span>
            </div>
            <div className="text-gray-500 mt-1">
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          </div>

          <div className="ml-2">
            {type === 'bookmark' && (
              <button
                onClick={() => onBookmarkRemove(event.id)}
                className="text-gray-400 hover:text-gray-600"
                title="Remove bookmark"
              >
                ×
              </button>
            )}
            {type === 'compare' && (
              <button
                onClick={() => onCompareRemove(event.id)}
                className="text-gray-400 hover:text-gray-600"
                title="Remove from compare"
              >
                ×
              </button>
            )}
            {type === 'queue' && (
              <button
                onClick={() => onMoveFromQueue(event)}
                className="text-blue-500 hover:text-blue-700"
                title="Move to compare"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Compare slot indicator */}
        {event.compareSlot !== undefined && event.compareSlot >= 0 && (
          <div className="mt-1 text-xs text-purple-600 font-medium">
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
          <div className="border-b border-gray-200 overflow-hidden flex flex-col" style={{ height: '350px' }}>
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
      <div className="overflow-hidden flex flex-col" style={{ height: '350px' }}>
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
        <div className="flex flex-col" style={{ height: '700px' }}>
          {/* Bookmarks section placeholder - 350px */}
          <div className="flex items-center justify-center border-b border-gray-200" style={{ height: '350px' }}>
            <div className="text-center">
              <Bookmark className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-600">{bookmarkedEvents.length}</div>
            </div>
          </div>

          {/* Compare section placeholder - 350px */}
          <div className="flex items-center justify-center" style={{ height: '350px' }}>
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
