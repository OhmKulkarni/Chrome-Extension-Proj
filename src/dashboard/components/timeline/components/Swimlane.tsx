import React, { useRef, useState, useCallback, useMemo } from 'react'
import { TimelineEvent, TimelineCluster, SwimLaneConfig } from '../types/timeline.types'
import { EventCluster } from './EventCluster'
import { EventCard } from './EventCard'
import { TimelineDebugOverlay } from './TimelineDebugOverlay'
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
  debugMode?: boolean
}

export interface EventLayerItem {
  event: TimelineEvent
  position: number
  opacity: number
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
  viewport,
  debugMode = false
}) => {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [showScrollControls, setShowScrollControls] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Positioning helper functions for proper viewport-based calculations
  const calculateEventPositionWithFade = useCallback((timestamp: number): {
    position: number,
    opacity: number,
    isVisible: boolean
  } => {
    if (!viewport) return { position: 0, opacity: 0, isVisible: false }

    const relativeTime = timestamp - viewport.startTime
    const percentage = (relativeTime / viewport.duration) * 100

    // Calculate fade based on proximity to viewport edges (5% fade zone)
    let opacity = 1
    const fadeZone = 5

    if (percentage < 0) {
      opacity = 0
    } else if (percentage < fadeZone) {
      opacity = percentage / fadeZone
    } else if (percentage > 100) {
      opacity = 0
    } else if (percentage > (100 - fadeZone)) {
      opacity = (100 - percentage) / fadeZone
    }

    // Render buffer zone for smooth transitions
    const isVisible = percentage >= -10 && percentage <= 110

    return { position: percentage, opacity, isVisible }
  }, [viewport])

  const calculateEventPosition = useCallback((timestamp: number): number => {
    if (!viewport) return 0
    const relativeTime = timestamp - viewport.startTime
    return (relativeTime / viewport.duration) * 100
  }, [viewport])

  // Enhanced overlap detection and layering with smart sizing
  const { eventLayers, debugInfo } = useMemo(() => {
    if (shouldCluster || events.length === 0) {
      return {
        eventLayers: [],
        debugInfo: null,
        heightAnalysis: { totalHeight: 0, recommendedHeight: height, needsScrolling: false, layerCount: 0 }
      }
    }

    // Sort by timestamp, then by ID for consistent ordering
    const sortedEvents = [...events].sort((a, b) => {
      const timeDiff = a.timestamp - b.timestamp
      if (timeDiff === 0) {
        // Same timestamp - use ID for consistent ordering
        return a.id.localeCompare(b.id)
      }
      return timeDiff
    })

    const layers: Array<{
      events: Array<{
        event: TimelineEvent
        position: number
        opacity: number
      }>
      yOffset: number
    }> = []
    const CARD_WIDTH_PERCENT = 8
    const LAYER_HEIGHT = 35
    const MIN_SPACING = 0.5 // Minimum spacing between cards

    // Debug information
    const debugData = {
      totalEvents: sortedEvents.length,
      sameTimestampGroups: new Map<number, number>(),
      layerDistribution: [] as number[],
      visibleEvents: 0,
      fadedEvents: 0
    }

    sortedEvents.forEach(event => {
      const { position, opacity, isVisible } = calculateEventPositionWithFade(event.timestamp)

      if (!isVisible) return // Skip events outside buffer

      debugData.visibleEvents++
      if (opacity < 1) debugData.fadedEvents++

      // Track same-timestamp events
      const timestampKey = event.timestamp
      debugData.sameTimestampGroups.set(
        timestampKey,
        (debugData.sameTimestampGroups.get(timestampKey) || 0) + 1
      )

      // Find the first layer where this event doesn't overlap
      let layerIndex = 0
      let placed = false

      while (layerIndex < layers.length && !placed) {
        const layer = layers[layerIndex]
        let hasOverlap = false

        for (const existingEvent of layer.events) {
          // Same timestamp always needs new layer (vertical stacking)
          if (event.timestamp === existingEvent.event.timestamp) {
            hasOverlap = true
            break
          }

          // Check spatial overlap
          const distance = Math.abs(position - existingEvent.position)
          if (distance < CARD_WIDTH_PERCENT + MIN_SPACING) {
            hasOverlap = true
            break
          }
        }

        if (!hasOverlap) {
          layer.events.push({ event, position, opacity })
          placed = true
        } else {
          layerIndex++
        }
      }

      // Create new layer if needed
      if (!placed) {
        layers.push({
          events: [{ event, position, opacity }],
          yOffset: layerIndex * LAYER_HEIGHT
        })
      }
    })

    debugData.layerDistribution = layers.map(l => l.events.length)

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

    return { eventLayers: layers, debugInfo: debugData, heightAnalysis }
  }, [events, shouldCluster, height, viewport, calculateEventPositionWithFade])

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
                    className="absolute w-full"
                    style={{
                      top: `${layer.yOffset}px`,
                      height: `${35}px` // Consistent layer height
                    }}
                  >
                    {layer.events.map(({ event, position, opacity }) => (
                      <div
                        key={event.id}
                        className="absolute transition-opacity duration-300"
                        style={{
                          left: `${position}%`,
                          transform: 'translateX(-50%)',
                          opacity,
                          zIndex: 10 + layerIndex,
                          // Prevent events from overflowing their layer
                          top: '50%',
                          marginTop: '-17.5px' // Half of card height
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
              const position = calculateEventPosition(event.timestamp)
              return (
                <div
                  key={`ghost_${event.id}`}
                  className={`absolute w-1 top-0 bottom-0 opacity-30 pointer-events-none ${
                    isCompare ? 'bg-purple-400' : 'bg-yellow-400'
                  }`}
                  style={{
                    left: `${position}%`
                  }}
                />
              )
            })}
        </div>
      </div>

      {/* Debug Overlay */}
      {debugMode && (
        <TimelineDebugOverlay
          enabled={debugMode}
          debugInfo={debugInfo}
          viewport={viewport}
          eventLayers={eventLayers}
          swimlaneName={config.id}
        />
      )}

    </div>
  )
}
