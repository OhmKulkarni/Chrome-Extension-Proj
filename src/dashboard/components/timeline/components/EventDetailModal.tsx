import React, { useState, useEffect } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { X, Bookmark, GitCompare, Copy, Network, AlertTriangle, Key } from 'lucide-react'
import { RequestDetailContent, ErrorDetailContent, TokenDetailContent } from '../../../shared/components/DetailedViews'

interface EventDetailModalProps {
  event: TimelineEvent | null
  onClose: () => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onBookmark,
  onAddToCompare
}) => {
  const [selectedField, setSelectedField] = useState('details')

  // Keyboard shortcuts
  useEffect(() => {
    const _handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!event) return null

  const _getIcon = () => {
    switch (event.type) {
      case 'network':
        return <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'console':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'token':
        return <Key className="w-5 h-5 text-green-600 dark:text-green-400" />
    }
  }

  const _getTitle = () => {
    switch (event.type) {
      case 'network':
        return event.data.url || 'Network Request'
      case 'console':
        return event.data.message || 'Console Error'
      case 'token':
        return `${event.data.token_type || 'Token'} Event`
    }
  }

  const _handleBookmarkClick = async () => {
    await onBookmark(event.id, !event.isBookmarked)
  }

  const _handleCompareClick = () => {
    onAddToCompare(event)
  }

  const _copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(error => {
      // console.warn('Failed to copy to clipboard:', error)
    })
  }

  const _renderDetailedContent = () => {
    switch (event.type) {
      case 'network':
        return (
          <RequestDetailContent
            request={event.data}
            selectedField={selectedField}
            settings={{}}
          />
        )
      case 'console':
        return (
          <ErrorDetailContent
            error={event.data}
            selectedField={selectedField}
          />
        )
      case 'token':
        return (
          <TokenDetailContent
            tokenEvent={event.data}
            selectedField={selectedField}
            showFullTokenHash={true}
            settings={{}}
          />
        )
      default:
        return (
          <div className="p-4 text-gray-500">
            No detailed view available for this event type.
          </div>
        )
    }
  }

  const _getAvailableFields = () => {
    switch (event.type) {
      case 'network':
        return ['details', 'headers', 'body', 'response', 'timing', 'performance', 'rawjson']
      case 'console':
        return ['details', 'stack', 'message']
      case 'token':
        return ['details', 'rawjson']
      default:
        return ['details']
    }
  }

  const _getFieldDisplayName = (field: string) => {
    switch (field) {
      case 'rawjson':
        return 'Raw JSON'
      case 'body':
        return 'Body'
      case 'headers':
        return 'Headers'
      case 'response':
        return 'Response'
      case 'timing':
        return 'Timing'
      case 'stack':
        return 'Stack'
      case 'message':
        return 'Message'
      case 'performance':
        return 'Performance'
      case 'details':
        return 'Details'
      default:
        return field.charAt(0).toUpperCase() + field.slice(1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {getIcon()}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {getTitle()}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-300">
                <span>{new Date(event.timestamp).toLocaleString()}</span>
                {event.swimlane && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-xs dark:text-gray-200">
                    {event.swimlane.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleBookmarkClick}
              className={`p-2 rounded-lg transition-colors ${
                event.isBookmarked
                  ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 bg-yellow-100 dark:bg-yellow-900/40'
                  : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={event.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className={`w-4 h-4 ${event.isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCompareClick}
              className={`p-2 rounded-lg transition-colors ${
                event.compareSlot !== undefined
                  ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-purple-100 dark:bg-purple-900/40'
                  : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="Add to compare"
            >
              <GitCompare className="w-4 h-4" />
            </button>

            <button
              onClick={() => copyToClipboard(JSON.stringify(event.data, null, 2))}
              className="p-2 rounded-lg text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              title="Copy event data"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Field Selection */}
          <div className="w-48 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Sections</h4>
            <nav className="space-y-1">
              {getAvailableFields().map((field) => (
                <button
                  key={field}
                  onClick={() => setSelectedField(field)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedField === field
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {getFieldDisplayName(field)}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
            {renderDetailedContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-300">
            <span>Press ESC to close</span>
          </div>
          <div className="flex items-center space-x-2">
            {event.compareSlot !== undefined && event.compareSlot >= 0 && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                Compare Slot {(() => {
                  // Convert actual slot number to display slot number (1-4 for each type)
                  if (event.compareSlot >= 0 && event.compareSlot <= 3) return event.compareSlot + 1 // Network: 0-3 → 1-4
                  if (event.compareSlot >= 10 && event.compareSlot <= 13) return event.compareSlot - 9 // Console: 10-13 → 1-4
                  if (event.compareSlot >= 20 && event.compareSlot <= 23) return event.compareSlot - 19 // Token: 20-23 → 1-4
                  return event.compareSlot + 1 // Fallback
                })()}
              </span>
            )}
            {event.isBookmarked && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                Bookmarked
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
