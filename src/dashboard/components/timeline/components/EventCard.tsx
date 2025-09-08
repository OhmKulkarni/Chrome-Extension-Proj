import React, { useMemo } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { Bookmark, GitCompare, Network, AlertTriangle, Key } from 'lucide-react'

interface EventCardProps {
  event: TimelineEvent
  onClick: (event: TimelineEvent) => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
  zoomLevel: number
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  onBookmark,
  onAddToCompare,
  zoomLevel
}) => {
  // Position calculation based on viewport
  const position = useMemo(() => {
    // Simplified positioning - in real implementation would use viewport calculations
    return (event.timestamp % 100)
  }, [event.timestamp])

  const getIcon = () => {
    switch (event.type) {
      case 'network':
        return <Network className="w-3 h-3" />
      case 'console':
        return <AlertTriangle className="w-3 h-3" />
      case 'token':
        return <Key className="w-3 h-3" />
    }
  }

  const getEventTitle = () => {
    switch (event.type) {
      case 'network':
        const url = event.data.url || 'Network Request'
        // Extract just the endpoint path for better readability
        try {
          const urlObj = new URL(url)
          return urlObj.pathname + urlObj.search || url
        } catch {
          return url
        }
      case 'console':
        const message = event.data.message || 'Console Error'
        // Truncate long error messages for card display
        return message.length > 50 ? message.substring(0, 50) + '...' : message
      case 'token':
        const tokenType = event.data.token_type || event.data.type || 'Token Event'
        return `${tokenType} Token`
    }
  }

  const getEventSubtitle = () => {
    switch (event.type) {
      case 'network':
        const method = event.data.method || 'GET'
        const status = event.data.statusCode || event.data.status
        return status ? `${method} • ${status}` : method
      case 'console':
        const level = event.data.level || event.data.severity || 'error'
        return level.toUpperCase()
      case 'token':
        const domain = event.data.domain || event.data.url
        if (domain) {
          try {
            return new URL(domain).hostname
          } catch {
            return domain
          }
        }
        return 'Token'
    }
  }

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onBookmark(event.id, !event.isBookmarked)
  }

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCompare(event)
  }

  // Determine card size based on zoom level
  const isCompact = zoomLevel > 5 // Show compact cards for detailed views

  const cardColors = {
    network: 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    console: 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300',
    token: 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
  }

  const iconColors = {
    network: 'text-blue-600',
    console: 'text-red-600',
    token: 'text-green-600'
  }

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 ${
        cardColors[event.type]
      } border rounded-lg shadow-sm hover:shadow-lg hover:z-20 group`}
      style={{
        left: `${position}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: isCompact ? '140px' : '180px',
        minHeight: isCompact ? '45px' : '70px'
      }}
      onClick={() => onClick(event)}
    >
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <div className={iconColors[event.type]}>
                {getIcon()}
              </div>
              <span className="text-xs font-medium text-gray-700 truncate">
                {getEventTitle()}
              </span>
            </div>

            {!isCompact && (
              <div className="text-xs text-gray-500 mb-1">
                {getEventSubtitle()}
              </div>
            )}

            <div className="text-xs text-gray-400">
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          </div>

          <div className="flex flex-col items-center space-y-1 ml-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleBookmarkClick}
              className={`p-1 rounded transition-colors ${
                event.isBookmarked
                  ? 'text-yellow-600 hover:text-yellow-700 bg-yellow-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={event.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className="w-3 h-3" fill={event.isBookmarked ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleCompareClick}
              className={`p-1 rounded transition-colors ${
                event.compareSlot !== undefined
                  ? 'text-purple-600 hover:text-purple-700 bg-purple-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Compare"
            >
              <GitCompare className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Compare slot indicator */}
      {event.compareSlot !== undefined && event.compareSlot >= 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
          {event.compareSlot + 1}
        </div>
      )}

      {/* Bookmark indicator */}
      {event.isBookmarked && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 text-white rounded-full flex items-center justify-center">
          <Bookmark className="w-2 h-2" fill="currentColor" />
        </div>
      )}
    </div>
  )
}
