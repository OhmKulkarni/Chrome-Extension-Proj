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
        return event.data.url || 'Network Request'
      case 'console':
        return event.data.message || 'Console Error'
      case 'token':
        return event.data.token_type || 'Token Event'
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
    network: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    console: 'bg-red-50 border-red-200 hover:bg-red-100',
    token: 'bg-green-50 border-green-200 hover:bg-green-100'
  }

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 ${
        cardColors[event.type]
      } border rounded shadow-sm hover:shadow-md hover:z-10`}
      style={{
        left: `${position}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: isCompact ? '120px' : '150px',
        minHeight: isCompact ? '40px' : '60px'
      }}
      onClick={() => onClick(event)}
    >
      <div className="p-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            {getIcon()}
            <span className="text-xs font-medium truncate">
              {getEventTitle()}
            </span>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleBookmarkClick}
              className={`p-1 rounded transition-colors ${
                event.isBookmarked
                  ? 'text-yellow-600 hover:text-yellow-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title={event.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className="w-3 h-3" fill={event.isBookmarked ? 'currentColor' : 'none'} />
            </button>
            
            <button
              onClick={handleCompareClick}
              className={`p-1 rounded transition-colors ${
                event.compareSlot !== undefined
                  ? 'text-purple-600 hover:text-purple-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Compare"
            >
              <GitCompare className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {!isCompact && (
          <div className="mt-1 text-xs text-gray-500">
            {new Date(event.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Compare slot indicator */}
      {event.compareSlot !== undefined && event.compareSlot >= 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
          {event.compareSlot + 1}
        </div>
      )}
    </div>
  )
}
