import React, { useState, useCallback } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { Bookmark, GitCompare, Lock, Unlock, ChevronRight, ChevronLeft, X } from 'lucide-react'

interface BookmarkComparePanelProps {
  bookmarkedEvents: TimelineEvent[]
  compareEvents: TimelineEvent[]
  onRemoveBookmark: (eventId: string) => void
  onRemoveFromCompare: (eventId: string) => void
  onEventClick: (event: TimelineEvent) => void
  isVisible?: boolean
}

export const BookmarkComparePanel: React.FC<BookmarkComparePanelProps> = ({
  bookmarkedEvents,
  compareEvents,
  onRemoveBookmark,
  onRemoveFromCompare,
  onEventClick,
  isVisible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'compare'>('bookmarks')

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleToggleLocked = useCallback(() => {
    setIsLocked(!isLocked)
    if (!isLocked) {
      setIsExpanded(true) // Auto-expand when locking
    }
  }, [isLocked])

  const shouldShow = isLocked || isHovered || isExpanded

  if (!isVisible) return null

  return (
    <div
      className="fixed bottom-0 right-0 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover Trigger - only show when collapsed and not locked */}
      {!shouldShow && (
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-2 cursor-pointer hover:bg-white transition-colors"
             onClick={handleToggleExpanded}>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Bookmark className="w-3 h-3" />
            <span>{bookmarkedEvents.length}</span>
            <GitCompare className="w-3 h-3" />
            <span>{compareEvents.length}</span>
            <ChevronLeft className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Main Panel */}
      {shouldShow && (
        <div className="bg-white border border-gray-300 shadow-xl rounded-tl-lg transition-all duration-300 ease-in-out w-80 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-tl-lg">
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-200 rounded p-0.5">
                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'bookmarks'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bookmark className="w-3 h-3 inline mr-1" />
                  Bookmarks ({bookmarkedEvents.length})
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'compare'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <GitCompare className="w-3 h-3 inline mr-1" />
                  Compare ({compareEvents.length})
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleLocked}
                className={`p-1 rounded transition-colors ${
                  isLocked
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isLocked ? 'Unlock panel' : 'Lock panel open'}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Unlock className="w-3 h-3" />
                )}
              </button>
              
              <button
                onClick={handleToggleExpanded}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Collapse panel"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-32 max-h-80">
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
                      className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100 transition-colors"
                      onClick={() => onEventClick(event)}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: event.type === 'network' ? '#3b82f6' : 
                                         event.type === 'console' ? '#ef4444' : '#f59e0b' 
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {event.type.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {event.data?.url || event.data?.message || event.data?.description || 'Event details'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveBookmark(event.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        title="Remove bookmark"
                      >
                        <X className="w-3 h-3" />
                      </button>
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
                      className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded cursor-pointer hover:bg-purple-100 transition-colors"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div
                          className="w-2 h-2 rounded-full"
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
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {event.type.toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {event.data?.url || event.data?.message || event.data?.description || 'Event details'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveFromCompare(event.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        title="Remove from compare"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Footer with quick actions */}
          {(bookmarkedEvents.length > 0 || compareEvents.length > 0) && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2 text-xs">
                {activeTab === 'bookmarks' && bookmarkedEvents.length > 0 && (
                  <button
                    onClick={() => bookmarkedEvents.forEach(event => onRemoveBookmark(event.id))}
                    className="flex-1 px-2 py-1 bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded transition-colors"
                  >
                    Clear All Bookmarks
                  </button>
                )}
                {activeTab === 'compare' && compareEvents.length > 0 && (
                  <button
                    onClick={() => compareEvents.forEach(event => onRemoveFromCompare(event.id))}
                    className="flex-1 px-2 py-1 bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded transition-colors"
                  >
                    Clear Compare Queue
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
