import React, { useMemo } from 'react'
import { ViewportRange } from '../types/timeline.types'

interface StickyDateIndicatorProps {
  viewport: ViewportRange
  zoomLevel: number
}

interface DateMarker {
  timestamp: number
  date: string
  isVisible: boolean
  position: number
  shouldStick: 'left' | 'right' | 'none'
}

export const StickyDateIndicator: React.FC<StickyDateIndicatorProps> = ({ 
  viewport, 
  zoomLevel 
}) => {
  const dateMarkers = useMemo(() => {
    // Only show date indicators for zoom levels where dates are meaningful
    if (zoomLevel >= 5) return [] // Too detailed for date indicators

    const markers: DateMarker[] = []
    
    // Find all midnight (00:00) timestamps within and around the viewport
    const startDate = new Date(viewport.startTime)
    const endDate = new Date(viewport.endTime)
    
    // Start from the day before viewport start to catch sticky dates
    const searchStart = new Date(startDate)
    searchStart.setDate(searchStart.getDate() - 1)
    searchStart.setHours(0, 0, 0, 0)
    
    // End a day after viewport end
    const searchEnd = new Date(endDate)
    searchEnd.setDate(searchEnd.getDate() + 2)
    
    // Iterate through each day
    const currentDate = new Date(searchStart)
    while (currentDate <= searchEnd) {
      const timestamp = currentDate.getTime()
      const relativeTime = timestamp - viewport.startTime
      const position = (relativeTime / viewport.duration) * 100
      
      // Determine if this date should be visible and where
      let isVisible = false
      let shouldStick: 'left' | 'right' | 'none' = 'none'
      
      if (position >= 0 && position <= 100) {
        // Date is within viewport - show normally
        isVisible = true
      } else if (position < 0 && position > -20) {
        // Date is just to the left - stick to left edge
        isVisible = true
        shouldStick = 'left'
      } else if (position > 100 && position < 120) {
        // Date is just to the right - stick to right edge
        isVisible = true
        shouldStick = 'right'
      }
      
      if (isVisible) {
        markers.push({
          timestamp,
          date: formatDateLabel(timestamp),
          isVisible,
          position: Math.max(0, Math.min(100, position)),
          shouldStick
        })
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return markers
  }, [viewport, zoomLevel])

  if (dateMarkers.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {dateMarkers.map((marker) => (
        <div
          key={marker.timestamp}
          className={`absolute top-0 h-full flex items-start pt-2 ${
            marker.shouldStick !== 'none' ? 'z-30' : 'z-20'
          }`}
          style={{
            left: marker.shouldStick === 'left' ? '8px' : 
                  marker.shouldStick === 'right' ? 'calc(100% - 120px)' :
                  `${marker.position}%`,
            transform: marker.shouldStick === 'none' ? 'translateX(-50%)' : 'none'
          }}
        >
          {/* Date badge */}
          <div 
            className={`px-3 py-1 rounded-full text-sm font-medium shadow-md transition-all duration-300 ${
              marker.shouldStick !== 'none' 
                ? 'bg-blue-600 text-white border-2 border-white' 
                : 'bg-white text-gray-800 border border-gray-300'
            }`}
            style={{
              minWidth: '100px',
              textAlign: 'center'
            }}
          >
            {marker.date}
          </div>
          
          {/* Vertical line indicator */}
          {marker.shouldStick === 'none' && (
            <div 
              className="absolute top-8 w-px bg-blue-400"
              style={{
                height: 'calc(100% - 2rem)',
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: 0.6
              }}
            />
          )}
          
          {/* Sticky indicator arrow */}
          {marker.shouldStick === 'left' && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
              <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-blue-600"></div>
            </div>
          )}
          
          {marker.shouldStick === 'right' && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1">
              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-blue-600"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Check if it's today, yesterday, or tomorrow
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  }
  
  // For other dates, show formatted date with day of week
  const isCurrentYear = date.getFullYear() === today.getFullYear()
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: isCurrentYear ? undefined : 'numeric'
  })
}
