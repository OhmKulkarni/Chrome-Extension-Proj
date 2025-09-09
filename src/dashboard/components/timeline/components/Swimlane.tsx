import React, { useRef, useState, useCallback, useMemo } from 'react'
import { TimelineEvent, TimelineCluster, SwimLaneConfig } from '../types/timeline.types'
import { EventCluster } from './EventCluster'
import { EventCard } from './EventCard'
import { Eye, EyeOff } from 'lucide-react'

interface SwimlaneProps {
  config: SwimLaneConfig
  events: TimelineEvent[]
  clusters: TimelineCluster[]
  shouldCluster: boolean
  height: number
  onToggle: () => void
  onClusterClick: (cluster: TimelineCluster) => void
  onEventClick: (event: TimelineEvent) => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
  zoomLevel: number
  viewport: any
}

interface EventLayer {
  events: TimelineEvent[]
  yOffset: number
}

export const Swimlane: React.FC<SwimlaneProps> = ({
  config,
  events,
  clusters,
  shouldCluster,
  height,
  onToggle,
  onClusterClick,
  onEventClick,
  onBookmark,
  onAddToCompare,
  zoomLevel,
  viewport
}) => {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [showScrollControls, setShowScrollControls] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Enhanced overlap detection and layering with smart sizing
  const { eventLayers } = useMemo(() => {
    if (shouldCluster || events.length === 0) {
      return {
        eventLayers: [],
        heightAnalysis: { totalHeight: 0, recommendedHeight: height, needsScrolling: false, layerCount: 0 }
      }
    }

    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp)
    const layers: EventLayer[] = []
    const CARD_WIDTH_PERCENT = 8 // Estimated card width as percentage
    const LAYER_HEIGHT = 35 // Height of each layer in pixels

    sortedEvents.forEach(event => {
      const position = (event.timestamp % 100) // Simplified positioning
      let layerIndex = 0

      // Find the first layer where this event doesn't overlap
      while (layerIndex < layers.length) {
        const layer = layers[layerIndex]
        const hasOverlap = layer.events.some(existingEvent => {
          const existingPosition = (existingEvent.timestamp % 100)
          return Math.abs(position - existingPosition) < CARD_WIDTH_PERCENT
        })

        if (!hasOverlap) {
          break
        }
        layerIndex++
      }

      // Create new layer if needed
      if (layerIndex >= layers.length) {
        layers.push({
          events: [],
          yOffset: layerIndex * LAYER_HEIGHT
        })
      }

      layers[layerIndex].events.push(event)
    })

    // Enhanced height analysis for smart resizing
    const totalContentHeight = layers.length * LAYER_HEIGHT + 40 // layers + header + padding
    const currentContainerHeight = (height / 100) * window.innerHeight
    const needsScrolling = totalContentHeight > currentContainerHeight - 50

    // Calculate optimal height recommendation
    const optimalHeightPx = Math.min(totalContentHeight + 60, window.innerHeight * 0.6) // Max 60% of screen
    const recommendedHeightPercent = Math.max(20, Math.min(80, (optimalHeightPx / window.innerHeight) * 100))

    const heightAnalysis = {
      totalHeight: totalContentHeight,
      recommendedHeight: recommendedHeightPercent,
      needsScrolling,
      layerCount: layers.length,
      isOptimal: Math.abs(height - recommendedHeightPercent) < 5,
      efficiency: currentContainerHeight > 0 ? Math.min(100, Math.max(0, (totalContentHeight / currentContainerHeight) * 100)) : 50
    }

    setShowScrollControls(needsScrolling)

    return { eventLayers: layers, heightAnalysis }
  }, [events, shouldCluster, height])

  // Time markers for this swimlane
  const timeMarkers = useMemo(() => {
    if (!viewport) return []
    
    const getMarkerCount = (zoomLevel: number): number => {
      if (zoomLevel >= 8) return 8
      if (zoomLevel >= 5) return 6
      if (zoomLevel >= 2) return 5
      if (zoomLevel >= 0) return 4
      return 3
    }

    const formatTimeLabel = (timestamp: number, zoomLevel: number): string => {
      const date = new Date(timestamp)
      
      if (zoomLevel >= 8) {
        return date.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      } else if (zoomLevel >= 5) {
        return date.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        })
      } else if (zoomLevel >= 2) {
        return date.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        })
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }
    
    const markerCount = getMarkerCount(zoomLevel)
    const timeInterval = viewport.duration / markerCount
    
    const markerData = []
    for (let i = 0; i <= markerCount; i++) {
      const timestamp = viewport.startTime + (i * timeInterval)
      const position = (i / markerCount) * 100
      
      markerData.push({
        id: i,
        timestamp,
        position,
        label: formatTimeLabel(timestamp, zoomLevel)
      })
    }
    
    return markerData
  }, [viewport, zoomLevel])

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (!contentRef.current) return

    const scrollAmount = 50
    const newPosition = direction === 'down'
      ? scrollPosition + scrollAmount
      : Math.max(0, scrollPosition - scrollAmount)

    setScrollPosition(newPosition)
    contentRef.current.style.transform = `translateY(-${newPosition}px)`
  }, [scrollPosition])



  if (!config.isVisible) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="relative border-b border-gray-200"
      style={{ height: `${height}%` }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-medium text-gray-700">{config.label}</span>
          <span className="text-xs text-gray-500">
            ({shouldCluster ? clusters.length : events.length})
          </span>
        </div>

        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={config.isVisible ? 'Hide lane' : 'Show lane'}
        >
          {config.isVisible ? (
            <EyeOff className="w-4 h-4 text-gray-500" />
          ) : (
            <Eye className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Timeline Content */}
      <div className="absolute top-8 left-0 right-0 bottom-0 overflow-hidden">
        <div className="relative h-full">

          {/* Time Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {[0, 25, 50, 75, 100].map(percent => (
              <div
                key={percent}
                className="absolute top-0 bottom-0 w-px bg-gray-200"
                style={{ left: `${percent}%` }}
              />
            ))}
          </div>

          {/* Time Markers for this swimlane */}
          <div className="absolute inset-0 pointer-events-none">
            {timeMarkers.map((marker) => (
              <div
                key={`time-${marker.id}`}
                className="absolute bottom-2"
                style={{ left: `${marker.position}%` }}
              >
                <div className="transform -translate-x-1/2 bg-white px-1 py-0.5 text-xs text-gray-600 border rounded shadow-sm opacity-80">
                  {marker.label}
                </div>
              </div>
            ))}
          </div>

          {/* Events/Clusters with Enhanced Overlap Handling */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              ref={contentRef}
              className="relative h-full transition-transform duration-200 ease-out"
              style={{
                minHeight: shouldCluster ? '100%' : `${Math.max(100, eventLayers.length * 35 + 20)}px`
              }}
            >
              {shouldCluster ? (
                // Render clusters (existing logic)
                clusters.map(cluster => (
                  <EventCluster
                    key={cluster.id}
                    cluster={cluster}
                    onClusterClick={onClusterClick}
                  />
                ))
              ) : (
                // Render layered events to prevent overlap
                eventLayers.map((layer, layerIndex) => (
                  <div
                    key={`layer-${layerIndex}`}
                    className="absolute inset-x-0"
                    style={{
                      top: `${layer.yOffset}px`,
                      height: '35px'
                    }}
                  >
                    {layer.events.map(event => (
                      <div
                        key={event.id}
                        className="absolute"
                        style={{
                          left: `${(event.timestamp % 100)}%`,
                          transform: 'translateX(-50%)',
                          zIndex: 10 + layerIndex
                        }}
                      >
                        <EventCard
                          event={event}
                          onClick={onEventClick}
                          onBookmark={onBookmark}
                          onAddToCompare={onAddToCompare}
                          zoomLevel={zoomLevel}
                          layerIndex={layerIndex}
                          isStacked={eventLayers.length > 1}
                        />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Scroll Controls */}
            {showScrollControls && !shouldCluster && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-1 z-20">
                <button
                  onClick={() => handleScroll('up')}
                  className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors text-xs"
                  title="Scroll up"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleScroll('down')}
                  className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors text-xs"
                  title="Scroll down"
                >
                  ↓
                </button>
              </div>
            )}
          </div>

          {/* Ghost markers for bookmarked/compare events */}
          {events
            .filter(e => e.isBookmarked || e.compareSlot !== undefined)
            .map(event => {
              const isCompare = event.compareSlot !== undefined
              return (
                <div
                  key={`ghost_${event.id}`}
                  className={`absolute w-1 top-0 bottom-0 opacity-30 pointer-events-none ${
                    isCompare ? 'bg-purple-400' : 'bg-yellow-400'
                  }`}
                  style={{
                    left: `${(event.timestamp % 100)}%` // Simplified positioning
                  }}
                />
              )
            })}
        </div>
      </div>

    </div>
  )
}
