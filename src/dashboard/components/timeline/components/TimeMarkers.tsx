import React, { useMemo } from 'react'
import { ViewportRange } from '../types/timeline.types'

interface TimeMarkersProps {
  viewport: ViewportRange
  zoomLevel: number
}

export const TimeMarkers: React.FC<TimeMarkersProps> = ({ viewport, zoomLevel }) => {
  const markers = useMemo(() => {
    const markerCount = getMarkerCount(zoomLevel)
    const timeInterval = viewport.duration / markerCount
    
    const markerData = []
    for (let i = 0; i <= markerCount; i++) {
      const timestamp = viewport.startTime + (i * timeInterval)
      const position = (i / markerCount) * 100 // Percentage position
      
      markerData.push({
        id: i,
        timestamp,
        position,
        label: formatTimeLabel(timestamp, zoomLevel)
      })
    }
    
    return markerData
  }, [viewport, zoomLevel])

  return (
    <div className="absolute inset-0 pointer-events-none">
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute top-0 bottom-0"
          style={{ left: `${marker.position}%` }}
        >
          {/* Vertical dotted line */}
          <div 
            className="h-full border-l border-dashed border-gray-300 opacity-60"
            style={{ borderWidth: '1px' }}
          />
        </div>
      ))}
    </div>
  )
}

function getMarkerCount(zoomLevel: number): number {
  // More markers for higher zoom levels (detailed views)
  if (zoomLevel >= 8) return 8  // Very detailed (1-15 min scopes)
  if (zoomLevel >= 5) return 6  // Detailed (30min-2h scopes)
  if (zoomLevel >= 2) return 5  // Medium (6h-24h scopes) 
  if (zoomLevel >= 0) return 4  // Wide (2-6 days scopes)
  return 3 // Very wide (1 week+ scopes)
}

function formatTimeLabel(timestamp: number, zoomLevel: number): string {
  const date = new Date(timestamp)
  
  // Format based on zoom level for optimal readability
  if (zoomLevel >= 8) {
    // High zoom: show time only (e.g., "14:30:45")
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  } else if (zoomLevel >= 5) {
    // Medium zoom: show time without seconds (e.g., "14:30")
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit'
    })
  } else if (zoomLevel >= 2) {
    // Lower zoom: show date and time (e.g., "Aug 17 14:30")
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }) + ' ' + date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit'
    })
  } else {
    // Very low zoom: show date only (e.g., "Aug 17")
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }
}
