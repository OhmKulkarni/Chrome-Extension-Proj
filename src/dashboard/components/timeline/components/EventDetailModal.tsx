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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!event) return null

  const getIcon = () => {
    switch (event.type) {
      case 'network':
        return <Network className="w-5 h-5 text-blue-600" />
      case 'console':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'token':
        return <Key className="w-5 h-5 text-green-600" />
    }
  }

  const getTitle = () => {
    switch (event.type) {
      case 'network':
        return event.data.url || 'Network Request'
      case 'console':
        return event.data.message || 'Console Error'
      case 'token':
        return `${event.data.token_type || 'Token'} Event`
    }
  }

  const handleBookmarkClick = async () => {
    await onBookmark(event.id, !event.isBookmarked)
  }

  const handleCompareClick = () => {
    onAddToCompare(event)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(error => {
      console.warn('Failed to copy to clipboard:', error)
    })
  }

  const renderDetailedContent = () => {
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

  const getAvailableFields = () => {
    switch (event.type) {
      case 'network':
        return ['details', 'headers', 'body', 'rawjson']
      case 'console':
        return ['details', 'stack']
      case 'token':
        return ['details', 'rawjson']
      default:
        return ['details']
    }
  }

  const getFieldDisplayName = (field: string) => {
    switch (field) {
      case 'rawjson':
        return 'Raw JSON'
      case 'body':
        return 'Body'
      case 'headers':
        return 'Headers'
      case 'stack':
        return 'Stack'
      case 'details':
        return 'Details'
      default:
        return field.charAt(0).toUpperCase() + field.slice(1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {getIcon()}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {getTitle()}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{new Date(event.timestamp).toLocaleString()}</span>
                {event.swimlane && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
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
                  ? 'text-yellow-600 hover:bg-yellow-50 bg-yellow-100'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={event.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className={`w-4 h-4 ${event.isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCompareClick}
              className={`p-2 rounded-lg transition-colors ${
                event.compareSlot !== undefined
                  ? 'text-purple-600 hover:bg-purple-50 bg-purple-100'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title="Add to compare"
            >
              <GitCompare className="w-4 h-4" />
            </button>

            <button
              onClick={() => copyToClipboard(JSON.stringify(event.data, null, 2))}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              title="Copy event data"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Field Selection */}
          <div className="w-48 bg-gray-50 border-r border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sections</h4>
            <nav className="space-y-1">
              {getAvailableFields().map((field) => (
                <button
                  key={field}
                  onClick={() => setSelectedField(field)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedField === field
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {getFieldDisplayName(field)}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderDetailedContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Event ID: {event.id}</span>
            <span>Press ESC to close</span>
          </div>
          <div className="flex items-center space-x-2">
            {event.compareSlot !== undefined && event.compareSlot >= 0 && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Compare Slot {event.compareSlot + 1}
              </span>
            )}
            {event.isBookmarked && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                Bookmarked
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
