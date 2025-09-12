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
  shouldStick: 'left' | 'none'
  isCurrentTimeMarker: boolean
}

export const StickyDateIndicator: React.FC<StickyDateIndicatorProps> = ({
  viewport,
  zoomLevel
}) => {
  const _dateMarkers = useMemo(() => {
    // Show date indicators for all zoom levels - dates provide important context even for short periods
    // No filtering by zoom level - dates are always useful for temporal context

    const markers: DateMarker[] = []

    // Find all midnight (00:00) timestamps within and around the viewport
    const _startDate = new Date(viewport.startTime)
    const _endDate = new Date(viewport.endTime)

    // Start from the day before viewport start to catch sticky dates
    const _searchStart = new Date(startDate)
    searchStart.setDate(searchStart.getDate() - 1)
    searchStart.setHours(0, 0, 0, 0)

    // End a day after viewport end
    const _searchEnd = new Date(endDate)
    searchEnd.setDate(searchEnd.getDate() + 2)

    // Iterate through each day to find midnight markers
    const _currentDate = new Date(searchStart)
    while (currentDate <= searchEnd) {
      const _timestamp = currentDate.getTime()
      const _relativeTime = timestamp - viewport.startTime
      const _position = (relativeTime / viewport.duration) * 100

      // Determine if this date should be visible and where
      let _isVisible = false
      let shouldStick: 'left' | 'none' = 'none'
      let _isCurrentTimeMarker = false

      if (position >= 0 && position <= 100) {
        // Date is within viewport - show normally
        isVisible = true
        // Check if this is the leftmost date marker (represents current time)
        isCurrentTimeMarker = position <= 15 // Within first 15% of viewport
      } else if (position < 0 && position > -20) {
        // Date is to the left of viewport - this should stick to left as it represents current time
        isVisible = true
        shouldStick = 'left'
        isCurrentTimeMarker = true
      }
      // Note: Right-side dates don't stick to right; they become left-sticky when they move past

      if (isVisible) {
        markers.push({
          timestamp,
          date: formatDateLabel(timestamp),
          isVisible,
          position: Math.max(0, Math.min(100, position)),
          shouldStick,
          isCurrentTimeMarker
        })
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // If no markers found (happens when zoomed into short periods),
    // create a synthetic marker for the viewport start time
    if (markers.length === 0) {
      markers.push({
        timestamp: viewport.startTime,
        date: formatDateLabel(viewport.startTime),
        isVisible: true,
        position: 0,
        shouldStick: 'left',
        isCurrentTimeMarker: true
      })
    } else {
      // If we have markers but no current time marker visible, ensure there's always one sticky on the left
      const _hasCurrentTimeMarker = markers.some(m => m.isCurrentTimeMarker)
      if (!hasCurrentTimeMarker) {
        // Create a synthetic current time marker for the viewport start
        markers.unshift({
          timestamp: viewport.startTime,
          date: formatDateLabel(viewport.startTime),
          isVisible: true,
          position: 0,
          shouldStick: 'left',
          isCurrentTimeMarker: true
        })
      }
    }

    return markers
  }, [viewport, zoomLevel])

  if (dateMarkers.length === 0) return null

  return (
    <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-30 bg-gradient-to-b from-gray-50 to-transparent border-b border-gray-100">
      {dateMarkers.map((marker) => (
        <div
          key={marker.timestamp}
          className={`absolute top-0 flex items-center ${
            marker.shouldStick !== 'none' ? 'z-40' : 'z-30'
          }`}
          style={{
            left: marker.shouldStick === 'left' ? '8px' : `${marker.position}%`,
            transform: marker.shouldStick === 'none' ? 'translateX(-50%)' : 'none'
          }}
        >
          {/* Date badge */}
          <div
            className={`px-2 py-0.5 rounded-full text-xs font-medium shadow-sm transition-all duration-300 ${
              marker.isCurrentTimeMarker
                ? 'bg-blue-600 text-white border border-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
            style={{
              minWidth: '70px',
              textAlign: 'center'
            }}
          >
            {marker.date}
          </div>

          {/* Sticky indicator arrow for current time marker */}
          {marker.shouldStick === 'left' && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-0.5">
              <div className="w-0 h-0 border-t-1 border-b-1 border-r-1 border-transparent border-r-blue-600" style={{
                borderTopWidth: '3px',
                borderBottomWidth: '3px',
                borderRightWidth: '4px'
              }}></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function formatDateLabel(timestamp: number): string {
  const _date = new Date(timestamp)
  const _today = new Date()

  // Always show the actual date, not relative terms
  const _isCurrentYear = date.getFullYear() === today.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: isCurrentYear ? undefined : 'numeric'
  })
}
