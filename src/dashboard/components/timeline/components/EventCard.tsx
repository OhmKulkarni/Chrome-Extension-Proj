import React, { useMemo, useState } from 'react'
import { TimelineEvent, ViewedTrackingSettings } from '../types/timeline.types'
import { Bookmark, GitCompare, Network, AlertTriangle, Key } from 'lucide-react'

interface EventCardProps {
  event: TimelineEvent
  onClick: (event: TimelineEvent) => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
  zoomLevel: number
  layerIndex?: number
  isStacked?: boolean
  onHoverChange?: (eventId: string, isHovered: boolean) => void
  viewedTrackingSettings?: ViewedTrackingSettings
  isHighlighted?: boolean
  onHighlightClick?: (eventId: string) => void
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  onBookmark,
  onAddToCompare,
  zoomLevel,
  layerIndex = 0,
  isStacked = false,
  onHoverChange,
  viewedTrackingSettings,
  isHighlighted = false,
  onHighlightClick
}) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    onHoverChange?.(event.id, true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    onHoverChange?.(event.id, false)
  }
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
        try {
          const urlObj = new URL(url)
          return urlObj.pathname + urlObj.search || url
        } catch {
          return url
        }
      case 'console':
        const message = event.data.message || 'Console Error'
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

  // Enhanced card size calculation for stacking mode
  const cardDimensions = useMemo(() => {
    const baseWidth = zoomLevel > 8 ? 180 : (zoomLevel > 4 ? 160 : 140)
    const baseHeight = zoomLevel > 8 ? 70 : (zoomLevel > 4 ? 60 : 50)

    // Slightly smaller cards when stacked to fit better
    const width = isStacked ? Math.max(120, baseWidth - 20) : baseWidth
    const height = isStacked ? Math.max(40, baseHeight - 10) : baseHeight

    return { width, height }
  }, [zoomLevel, isStacked])

  const isCompact = cardDimensions.height < 60 || zoomLevel > 5

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

  // Enhanced shadow for stacked cards
  const cardShadow = isStacked
    ? `shadow-sm hover:shadow-md ${layerIndex > 0 ? 'shadow-lg' : ''}`
    : 'shadow-sm hover:shadow-lg'

  return (
    <div
      className={`cursor-pointer transition-all duration-200 ${
        cardColors[event.type]
      } border rounded-lg ${cardShadow} group ${
        isStacked ? 'hover:scale-105' : ''
      } ${
        isHighlighted ? 'ring-4 ring-blue-400 ring-opacity-75 animate-pulse shadow-xl' : ''
      }`}
      style={{
        width: `${cardDimensions.width}px`,
        height: `${cardDimensions.height}px`,
        // Dynamic z-index: bring hovered cards to absolute front
        zIndex: isHovered
          ? 1000 // Absolute front when hovered
          : 10 + layerIndex + (event.isBookmarked ? 5 : 0) + (event.compareSlot !== undefined ? 3 : 0),
        // Apply viewed state opacity if tracking is enabled
        opacity: (viewedTrackingSettings?.enabled && viewedTrackingSettings?.showIndicators && event.isViewed)
          ? viewedTrackingSettings.viewedOpacity
          : 1.0
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        // If this event is highlighted, clear the highlight when clicked
        if (isHighlighted && onHighlightClick) {
          onHighlightClick(event.id)
        }
        onClick(event)
      }}
    >
      <div className="p-3 h-full flex flex-col relative">
        <div className="flex items-start justify-between flex-1">
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
                  ? 'text-yellow-600 hover:text-yellow-700'
                  : 'text-gray-400 hover:text-yellow-600'
              }`}
              title={event.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className={`w-3 h-3 ${event.isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCompareClick}
              className={`p-1 rounded transition-colors ${
                event.compareSlot !== undefined
                  ? 'text-purple-600 hover:text-purple-700'
                  : 'text-gray-400 hover:text-purple-600'
              }`}
              title="Add to compare"
            >
              <GitCompare className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Layer indicator for stacked cards */}
        {isStacked && layerIndex > 0 && (
          <div className="text-xs text-gray-400 mt-1 text-center">
            Layer {layerIndex + 1}
          </div>
        )}

        {/* Compare slot indicator */}
        {event.compareSlot !== undefined && event.compareSlot >= 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
            {(() => {
              // Convert actual slot number to display slot number (1-4 for each type)
              if (event.compareSlot >= 0 && event.compareSlot <= 3) return event.compareSlot + 1 // Network: 0-3 → 1-4
              if (event.compareSlot >= 10 && event.compareSlot <= 13) return event.compareSlot - 9 // Console: 10-13 → 1-4
              if (event.compareSlot >= 20 && event.compareSlot <= 23) return event.compareSlot - 19 // Token: 20-23 → 1-4
              return event.compareSlot + 1 // Fallback
            })()}
          </div>
        )}

        {/* Bookmark indicator */}
        {event.isBookmarked && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-yellow-600 rounded-full" />
          </div>
        )}

        {/* Viewed indicator - only show for unviewed events when tracking is enabled */}
        {viewedTrackingSettings?.enabled && viewedTrackingSettings?.showIndicators && !event.isViewed && (
          <div className={`absolute w-2 h-2 bg-blue-500 rounded-full ${
            event.compareSlot !== undefined && event.compareSlot >= 0
              ? 'top-1 right-7' // Offset when compare indicator is present
              : 'top-1 right-1'  // Normal position
          }`}
               title="New - not yet viewed" />
        )}
      </div>
    </div>
  )
}
