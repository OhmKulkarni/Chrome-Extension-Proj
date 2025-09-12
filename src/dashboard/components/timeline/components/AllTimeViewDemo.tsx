import React, { useMemo } from 'react'
import { TimeScope, TimelineViewport } from '../types/timeline.types'
import { useOptimizedTimelineData } from '../hooks/useOptimizedTimelineData'

interface AllTimeViewDemoProps {
  currentScope: TimeScope
  viewport: any // Using 'any' to match the existing viewport type
}

export const AllTimeViewDemo: React.FC<AllTimeViewDemoProps> = ({
  currentScope,
  viewport
}) => {
  // Mock total events count - in production, this would come from your data store
  const _mockTotalEvents = 2400

  // Convert viewport to TimelineViewport interface
  const timelineViewport: TimelineViewport = useMemo(() => ({
    startTime: viewport.startTime,
    endTime: viewport.endTime,
    centerTime: viewport.centerTime,
    duration: viewport.duration
  }), [viewport])

  const _optimizedData = useOptimizedTimelineData({
    viewport: timelineViewport,
    currentScope,
    totalEvents: mockTotalEvents
  })

  if (currentScope.key !== 'all-time') {
    return null // Only render for All Time view
  }

  return (
    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10 max-w-xs">
      <div className="text-sm">
        <div className="font-medium text-gray-900 mb-2">All Time Performance</div>
        
        {optimizedData.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-gray-600">Loading temporal distribution...</span>
          </div>
        ) : optimizedData.error ? (
          <div className="text-red-600">Error: {optimizedData.error}</div>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Events:</span>
              <span className="font-mono font-medium">{optimizedData.metrics.totalEvents.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Loaded:</span>
              <span className="font-mono font-medium">{optimizedData.metrics.loadedEvents}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Represented:</span>
              <span className="font-mono font-medium">{optimizedData.metrics.clusteredEvents.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Compression:</span>
              <span className="font-mono font-medium">
                {(optimizedData.metrics.compressionRatio * 100).toFixed(1)}%
              </span>
            </div>
            
            {optimizedData.metrics.isOptimized && (
              <div className="mt-2 p-2 bg-green-50 rounded text-green-700 text-xs">
                ⚡ Optimized for {optimizedData.metrics.totalEvents.toLocaleString()} events
              </div>
            )}
            
            {optimizedData.isAllTimeView && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700 text-xs">
                📊 Showing temporal distribution across entire dataset
              </div>
            )}
          </div>
        )}
        
        {optimizedData.events.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <div className="text-xs text-gray-500 mb-1">Timeline Spread:</div>
            <div className="space-y-1">
              {optimizedData.events.slice(0, 3).map((event, index) => (
                <div key={event.id} className="flex justify-between text-xs">
                  <span className="text-gray-600">
                    {index === 0 ? 'First' : index === optimizedData.events.length - 1 ? 'Last' : 'Sample'}:
                  </span>
                  <span className="font-mono">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {optimizedData.events.length > 3 && (
                <div className="text-xs text-gray-400 text-center">
                  ... and {optimizedData.events.length - 3} more time points
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
