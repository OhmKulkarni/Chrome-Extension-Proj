import React, { useState } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { Bookmark, GitCompare, ChevronRight, ChevronLeft, Grid2X2, Navigation, Eye, ArrowDown, Network, AlertTriangle, Key } from 'lucide-react'

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

  // Selected queue type for filtering
  const [selectedQueueType, setSelectedQueueType] = useState<'network' | 'console' | 'token'>('network')

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

  // Group queue events by type
  const queueEventsByType = {
    network: compareQueue.filter(e => e.type === 'network'),
    console: compareQueue.filter(e => e.type === 'console'),
    token: compareQueue.filter(e => e.type === 'token')
  }

  // Get icon for event type
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'network': return <Network className="w-3 h-3 text-blue-600 dark:text-blue-400" />
      case 'console': return <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
      case 'token': return <Key className="w-3 h-3 text-green-600 dark:text-green-400" />
      default: return null
    }
  }

  const renderEventCard = (event: TimelineEvent, type: 'bookmark' | 'compare' | 'queue') => {
    const typeConfig = {
      network: { color: 'bg-blue-50 dark:bg-blue-900/80 border-blue-200 dark:border-blue-700', icon: '🌐' },
      console: { color: 'bg-red-50 dark:bg-red-900/80 border-red-200 dark:border-red-700', icon: '⚠️' },
      token: { color: 'bg-green-50 dark:bg-green-900/80 border-green-200 dark:border-green-700', icon: '🔑' }
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
              <span className="font-medium truncate text-gray-900 dark:text-gray-100">
                {event.type === 'network' && (event.data.url?.split('/').pop() || 'Request')}
                {event.type === 'console' && (event.data.message?.substring(0, 40) || 'Error')}
                {event.type === 'token' && (event.data.token_type || 'Token')}
              </span>
            </div>

            {/* Domain information */}
            {getDomainFromEvent(event) && (
              <div className="text-gray-400 dark:text-gray-400 mt-1 text-xs truncate">
                🌐 {getDomainFromEvent(event)}
              </div>
            )}

            <div className="text-gray-500 dark:text-gray-300 mt-1 flex items-center justify-between">
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
              className="p-1 text-gray-400 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
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
              className="p-1 text-gray-400 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
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
                className="p-1 text-gray-400 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
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
                  className="p-1 text-gray-400 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors"
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
                  className="p-1 text-gray-400 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
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
                className="p-1 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
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
            Compare Slot {(() => {
              // Convert actual slot number to display slot number (1-4 for each type)
              if (event.compareSlot >= 0 && event.compareSlot <= 3) return event.compareSlot + 1 // Network: 0-3 → 1-4
              if (event.compareSlot >= 10 && event.compareSlot <= 13) return event.compareSlot - 9 // Console: 10-13 → 1-4
              if (event.compareSlot >= 20 && event.compareSlot <= 23) return event.compareSlot - 19 // Token: 20-23 → 1-4
              return event.compareSlot + 1 // Fallback
            })()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${collapsed ? 'w-12' : 'w-80'} bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 flex flex-col h-full transition-all duration-300 ease-in-out`}>
      {/* Toggle Button */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-600 flex justify-center bg-white dark:bg-gray-800">
        <button
          onClick={toggleCollapsed}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Bookmarks Section - Fixed height */}
          <div className="border-b border-gray-200 dark:border-gray-600 overflow-hidden flex flex-col bg-white dark:bg-gray-800" style={{ height: '280px' }}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex-shrink-0 bg-white dark:bg-gray-800">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Bookmarks ({bookmarkedEvents.length})</h3>
              </div>
            </div>
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
          {bookmarkedEvents.length > 0 ? (
            <div className="space-y-2">
              {bookmarkedEvents.map(event => renderEventCard(event, 'bookmark'))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
              No bookmarked events
            </div>
          )}
        </div>
      </div>

      {/* Compare Section - Fixed height */}
      <div className="overflow-hidden flex flex-col bg-white dark:bg-gray-800" style={{ height: '280px' }}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex-shrink-0 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Compare ({compareEvents.filter(e => e.type === selectedQueueType).length + queueEventsByType[selectedQueueType].length})
              </h3>
            </div>
            <div className="flex items-center space-x-1">
              {/* Queue Type Selector */}
              {(compareQueue.length > 0 || compareEvents.length > 0) && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                  {(['network', 'console', 'token'] as const).map(type => {
                    const queueCount = queueEventsByType[type].length
                    const compareCount = compareEvents.filter(e => e.type === type).length
                    const totalCount = queueCount + compareCount
                    const isSelected = selectedQueueType === type
                    const typeConfig = {
                      network: { icon: <Network className="w-3 h-3" />, color: 'text-blue-600 dark:text-blue-400', label: 'Network' },
                      console: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-600 dark:text-red-400', label: 'Console' },
                      token: { icon: <Key className="w-3 h-3" />, color: 'text-green-600 dark:text-green-400', label: 'Token' }
                    }

                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedQueueType(type)}
                        className={`relative flex items-center justify-center w-7 h-7 rounded transition-colors ${
                          isSelected
                            ? 'bg-white dark:bg-gray-600 shadow-sm border border-gray-200 dark:border-gray-500'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                        } ${totalCount === 0 ? 'opacity-50' : ''}`}
                        disabled={totalCount === 0}
                        title={`${typeConfig[type].label} (${compareCount} slots, ${queueCount} queued)`}
                      >
                        <span className={typeConfig[type].color}>
                          {typeConfig[type].icon}
                        </span>
                        {totalCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                            {totalCount > 9 ? '9+' : totalCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              {compareEvents.length > 0 && (
                <button
                  onClick={onShowCompareView}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-600 dark:text-gray-300"
                  title="Show compare view"
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
          {(() => {
            // Filter compare events by selected type
            const filteredCompareEvents = compareEvents.filter(event => event.type === selectedQueueType)
            const queueEvents = queueEventsByType[selectedQueueType]
            const hasAnyEvents = filteredCompareEvents.length > 0 || queueEvents.length > 0

            if (!hasAnyEvents) {
              return (
                <div className="text-center text-gray-500 text-sm py-8">
                  No {selectedQueueType} events to compare
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {/* Active compare slots for selected type */}
                {filteredCompareEvents.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 text-xs font-medium text-gray-500 mb-2">
                      <span>Active Slots ({filteredCompareEvents.length}/4)</span>
                    </div>
                    <div className="space-y-2">
                      {filteredCompareEvents.map(event => renderEventCard(event, 'compare'))}
                    </div>
                  </div>
                )}

                {/* Queue for selected type */}
                {queueEvents.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 text-xs font-medium text-gray-500 mb-2">
                      {getEventTypeIcon(selectedQueueType)}
                      <span className="capitalize">{selectedQueueType} Queue ({queueEvents.length})</span>
                    </div>
                    <div className="space-y-2">
                      {queueEvents.map(event => renderEventCard(event, 'queue'))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
        </>
      )}

      {/* Collapsed State - Show counts only */}
      {collapsed && (
        <div className="flex flex-col bg-white dark:bg-gray-800" style={{ height: '560px' }}>
          {/* Bookmarks section placeholder - 280px */}
          <div className="flex items-center justify-center border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800" style={{ height: '280px' }}>
            <div className="text-center">
              <Bookmark className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{bookmarkedEvents.length}</div>
            </div>
          </div>

          {/* Compare section placeholder - 280px */}
          <div className="flex items-center justify-center bg-white dark:bg-gray-800" style={{ height: '280px' }}>
            <div className="text-center space-y-2">
              <GitCompare className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {compareEvents.filter(e => e.type === selectedQueueType).length + queueEventsByType[selectedQueueType].length}
              </div>
              {(compareQueue.length > 0 || compareEvents.length > 0) && (
                <div className="space-y-1">
                  {/* Show selected queue type */}
                  <div className="flex items-center justify-center space-x-1">
                    {getEventTypeIcon(selectedQueueType)}
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedQueueType}</span>
                  </div>
                  {/* Show other queue types with smaller indicators */}
                  <div className="flex items-center justify-center space-x-2">
                    {(['network', 'console', 'token'] as const).map(eventType => {
                      if (eventType === selectedQueueType) return null
                      const queueCount = queueEventsByType[eventType].length
                      const compareCount = compareEvents.filter(e => e.type === eventType).length
                      const totalCount = queueCount + compareCount
                      if (totalCount === 0) return null
                      return (
                        <div key={eventType} className="flex items-center space-x-1 opacity-50">
                          {getEventTypeIcon(eventType)}
                          <span className="text-xs text-gray-400">{totalCount}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
