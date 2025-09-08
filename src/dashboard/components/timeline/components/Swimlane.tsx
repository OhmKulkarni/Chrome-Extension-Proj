import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { TimelineEvent, TimelineCluster, SwimLaneConfig } from '../types/timeline.types'
import { EventCluster } from './EventCluster'
import { EventCard } from './EventCard'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'

interface SwimlaneProps {
  config: SwimLaneConfig
  events: TimelineEvent[]
  clusters: TimelineCluster[]
  shouldCluster: boolean
  height: number
  onToggle: () => void
  onResize: (newHeight: number) => void
  onClusterClick: (cluster: TimelineCluster) => void
  onEventClick: (event: TimelineEvent) => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
  zoomLevel: number
  isLast: boolean
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
  onResize,
  onClusterClick,
  onEventClick,
  onBookmark,
  onAddToCompare,
  zoomLevel,
  isLast
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [showScrollControls, setShowScrollControls] = useState(false)
  const [showResizeHelper, setShowResizeHelper] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const startHeightRef = useRef<number>(0)

  // Enhanced overlap detection and layering with smart sizing
  const { eventLayers, heightAnalysis } = useMemo(() => {
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

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (!contentRef.current) return
    
    const scrollAmount = 50
    const newPosition = direction === 'down' 
      ? scrollPosition + scrollAmount 
      : Math.max(0, scrollPosition - scrollAmount)
    
    setScrollPosition(newPosition)
    contentRef.current.style.transform = `translateY(-${newPosition}px)`
  }, [scrollPosition])

  // Quick resize functions
  const handleQuickResize = useCallback((action: 'optimal' | 'expand' | 'compact') => {
    let newHeight: number
    
    switch (action) {
      case 'optimal':
        newHeight = heightAnalysis.recommendedHeight
        break
      case 'expand':
        newHeight = Math.min(80, height + 15)
        break
      case 'compact':
        newHeight = Math.max(15, height - 15)
        break
      default:
        return
    }
    
    onResize(newHeight)
    setShowResizeHelper(false)
  }, [heightAnalysis.recommendedHeight, height, onResize])

  const handleMouseEnter = useCallback(() => {
    if (!isLast && heightAnalysis.layerCount > 1) {
      setShowResizeHelper(true)
    }
  }, [isLast, heightAnalysis.layerCount])

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setShowResizeHelper(false)
    }
  }, [isDragging])

  const handleHelperClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLast) return // Can't resize the last visible swimlane
    
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = height
  }, [height, isLast])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const deltaY = e.clientY - startYRef.current
    // Convert pixel delta to percentage (assuming parent is viewport height)
    const deltaPercent = (deltaY / window.innerHeight) * 100
    const newHeight = Math.max(15, Math.min(80, startHeightRef.current + deltaPercent))
    
    onResize(newHeight)
  }, [isDragging, onResize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setShowResizeHelper(false)
  }, [])

  // Set up mouse event listeners when dragging starts
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent) => handleMouseMove(e)
      const handleUp = () => {
        handleMouseUp()
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
      }

      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)

      return () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

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
        <div className="relative h-full"
             onMouseEnter={handleMouseEnter}
             onMouseLeave={handleMouseLeave}>
          {/* Resize Helper Overlay */}
          {showResizeHelper && heightAnalysis.layerCount > 1 && (
            <div className={`absolute z-50 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-3 min-w-48 ${
              showScrollControls ? 'top-2 right-20' : 'top-2 right-2'
            }`}
            onClick={handleHelperClick}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-medium text-gray-700">Layer Analysis</span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-600 mb-3">
                <div className="flex justify-between">
                  <span>Layers:</span>
                  <span className="font-medium">{heightAnalysis.layerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Efficiency:</span>
                  <span className={`font-medium ${
                    ('efficiency' in heightAnalysis && heightAnalysis.efficiency >= 0.8) ? 'text-green-600' : 
                    ('efficiency' in heightAnalysis && heightAnalysis.efficiency >= 0.6) ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {'efficiency' in heightAnalysis ? Math.round(heightAnalysis.efficiency * 100) : 50}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recommended:</span>
                  <span className="font-medium">{heightAnalysis.recommendedHeight}px</span>
                </div>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => handleQuickResize('optimal')}
                  className="flex-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                  title="Resize to optimal height for all layers"
                >
                  Optimal
                </button>
                <button
                  onClick={() => handleQuickResize('expand')}
                  className="flex-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                  title="Expand swimlane height"
                >
                  Expand
                </button>
                <button
                  onClick={() => handleQuickResize('compact')}
                  className="flex-1 px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                  title="Make swimlane more compact"
                >
                  Compact
                </button>
              </div>
              
              {heightAnalysis.needsScrolling && (
                <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Content requires scrolling
                </div>
              )}
            </div>
          )}

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
                  className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors"
                  title="Scroll up"
                >
                  <ChevronLeft className="w-3 h-3 transform rotate-90" />
                </button>
                <button
                  onClick={() => handleScroll('down')}
                  className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors"
                  title="Scroll down"
                >
                  <ChevronRight className="w-3 h-3 transform rotate-90" />
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

      {/* Resize Handle */}
      {!isLast && (
        <div
          className={`absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-colors ${
            isDragging ? 'bg-blue-500' : 'bg-transparent hover:bg-gray-300'
          }`}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  )
}
