import React from 'react'
import { ViewportRange } from '../types/timeline.types'

interface EventLayerDebug {
  events: Array<{
    event: { id: string; timestamp: number }
    position: number
    opacity: number
  }>
  yOffset: number
}

interface DebugInfo {
  totalEvents: number
  sameTimestampGroups: Map<number, number>
  layerDistribution: number[]
  visibleEvents: number
  fadedEvents: number
}

interface TimelineDebugOverlayProps {
  enabled: boolean
  debugInfo: DebugInfo | null
  viewport: ViewportRange
  eventLayers: EventLayerDebug[]
  swimlaneName: string
}

export const TimelineDebugOverlay: React.FC<TimelineDebugOverlayProps> = ({
  enabled,
  debugInfo,
  viewport,
  eventLayers,
  swimlaneName
}) => {
  if (!enabled || !debugInfo) return null

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
      {/* Grid overlay showing percentage positions */}
      <div className="absolute inset-0">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(percentage => (
          <div
            key={percentage}
            className="absolute top-0 bottom-0 border-l border-purple-500/20"
            style={{ left: `${percentage}%` }}
          >
            <span className="absolute -top-6 -left-4 text-xs text-purple-600 bg-white/90 px-1 rounded">
              {percentage}%
            </span>
          </div>
        ))}

        {/* Fade zones visualization */}
        <div
          className="absolute top-0 bottom-0 bg-gradient-to-r from-transparent to-purple-500/10"
          style={{ left: 0, width: '5%' }}
        />
        <div
          className="absolute top-0 bottom-0 bg-gradient-to-l from-transparent to-purple-500/10"
          style={{ right: 0, width: '5%' }}
        />
      </div>

      {/* Debug info panel */}
      <div className="absolute top-2 right-2 bg-black/90 text-white p-3 rounded-lg text-xs max-w-xs">
        <div className="font-bold mb-2 text-green-400">
          {swimlaneName.toUpperCase()} Debug
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Total Events:</span>
            <span className="font-mono text-yellow-300">{debugInfo.totalEvents}</span>
          </div>
          <div className="flex justify-between">
            <span>Visible:</span>
            <span className="font-mono text-green-300">{debugInfo.visibleEvents}</span>
          </div>
          <div className="flex justify-between">
            <span>Fading:</span>
            <span className="font-mono text-orange-300">{debugInfo.fadedEvents}</span>
          </div>
          <div className="flex justify-between">
            <span>Layers Used:</span>
            <span className="font-mono text-blue-300">{eventLayers.length}</span>
          </div>
        </div>

        {debugInfo.sameTimestampGroups.size > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="font-bold text-yellow-400 mb-1">Same Timestamp Groups:</div>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {Array.from(debugInfo.sameTimestampGroups.entries())
                .filter(([_, count]) => count > 1)
                .slice(0, 5)
                .map(([timestamp, count]) => (
                  <div key={timestamp} className="flex justify-between">
                    <span className="text-gray-300">{formatTime(timestamp)}:</span>
                    <span className="font-mono text-orange-300">{count} events</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {debugInfo.layerDistribution.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="font-bold text-blue-400 mb-1">Layer Distribution:</div>
            <div className="space-y-0.5">
              {debugInfo.layerDistribution.slice(0, 5).map((count, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-300">Layer {index + 1}:</span>
                  <span className="font-mono text-blue-300">{count} events</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="font-bold text-purple-400 mb-1">Viewport:</div>
          <div className="space-y-0.5 text-gray-300">
            <div>Start: {formatTime(viewport.startTime)}</div>
            <div>End: {formatTime(viewport.endTime)}</div>
            <div>Duration: {(viewport.duration / 60000).toFixed(1)} min</div>
          </div>
        </div>
      </div>

      {/* Position dots for each event */}
      {eventLayers.map((layer, layerIndex) => (
        <div key={layerIndex}>
          {layer.events.map(({ event, position, opacity }) => (
            <div
              key={event.id}
              className="absolute w-2 h-2 bg-red-500 rounded-full border border-white"
              style={{
                left: `${position}%`,
                top: `${layer.yOffset + 17}px`,
                transform: 'translate(-50%, -50%)',
                opacity: Math.max(0.3, opacity)
              }}
              title={`ID: ${event.id}\nTime: ${formatTime(event.timestamp)}\nPos: ${position.toFixed(2)}%\nOpacity: ${opacity.toFixed(2)}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
