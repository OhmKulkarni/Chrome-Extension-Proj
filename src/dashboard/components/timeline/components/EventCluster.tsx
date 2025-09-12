import React from 'react'
import { TimelineCluster } from '../types/timeline.types'

interface EventClusterProps {
  cluster: TimelineCluster
  onClusterClick: (cluster: TimelineCluster) => void
  isSelected?: boolean
}

export const EventCluster: React.FC<EventClusterProps> = ({
  cluster,
  onClusterClick,
  isSelected = false
}) => {
  // Calculate circle size based on event count
  // Min size: 8px, Max size: 32px, with logarithmic scaling
  const minSize = 8
  const maxSize = 32
  const size = Math.max(
    minSize,
    Math.min(maxSize, minSize + Math.log2(cluster.density) * 4)
  )

  // Color intensity based on density
  const getOpacity = (density: number) => {
    return Math.max(0.3, Math.min(1, 0.3 + (density / 20) * 0.7))
  }

  const swimlaneColors = {
    network: '#3B82F6',
    console: '#EF4444',
    token: '#10B981'
  }

  const color = swimlaneColors[cluster.swimlane]

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 hover:scale-110 ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      }`}
      style={{
        left: `${cluster.x}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`
      }}
      onClick={() => onClusterClick(cluster)}
      title={`${cluster.events.length} events`}
    >
      <div
        className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-lg"
        style={{
          backgroundColor: color,
          opacity: getOpacity(cluster.density)
        }}
      >
        {cluster.events.length > 99 ? '99+' : cluster.events.length}
      </div>
      
      {/* Bookmark indicator */}
      {cluster.events.some(event => event.isBookmarked) && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
      )}

      {/* Compare indicator */}
      {cluster.events.some(event => event.compareSlot !== undefined) && (
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-white" />
      )}
    </div>
  )
}
