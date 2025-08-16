import React, { useRef, useState, useCallback } from 'react'
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
  onResize: (newHeight: number) => void
  onClusterClick: (cluster: TimelineCluster) => void
  onEventClick: (event: TimelineEvent) => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
  zoomLevel: number
  isLast: boolean
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
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const startHeightRef = useRef<number>(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLast) return // Can't resize the last visible swimlane
    
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = height
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [height, isLast])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerHeight = containerRef.current.parentElement?.offsetHeight || 100
    const deltaY = e.clientY - startYRef.current
    const deltaPercent = (deltaY / containerHeight) * 100
    const newHeight = Math.max(10, Math.min(90, startHeightRef.current + deltaPercent))
    
    onResize(newHeight)
  }, [isDragging, onResize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

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

          {/* Events/Clusters */}
          <div className="absolute inset-0">
            {shouldCluster ? (
              // Render clusters
              clusters.map(cluster => (
                <EventCluster
                  key={cluster.id}
                  cluster={cluster}
                  onClusterClick={onClusterClick}
                />
              ))
            ) : (
              // Render individual events as cards
              events.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                  onBookmark={onBookmark}
                  onAddToCompare={onAddToCompare}
                  zoomLevel={zoomLevel}
                />
              ))
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
