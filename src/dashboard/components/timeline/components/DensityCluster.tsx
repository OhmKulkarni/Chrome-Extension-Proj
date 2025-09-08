import React, { useState, useRef, useCallback } from 'react'
import { DensityCluster } from '../types/timeline.types'

interface DensityClusterProps {
  cluster: DensityCluster
  onZoomIn: (cluster: DensityCluster) => void
  onShowEventList: (cluster: DensityCluster) => void
  isHighlighted?: boolean
  animationDelay?: number
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  cluster: DensityCluster | null
}

export const DensityClusterComponent: React.FC<DensityClusterProps> = ({
  cluster,
  onZoomIn,
  onShowEventList,
  isHighlighted = false,
  animationDelay = 0
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    cluster: null
  })
  const [isHovered, setIsHovered] = useState(false)
  const clusterRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = useCallback(() => {
    onZoomIn(cluster)
  }, [cluster, onZoomIn])

  const handleRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      cluster
    })
  }, [cluster])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  const handleContextMenuAction = useCallback((action: 'zoom' | 'list') => {
    if (contextMenu.cluster) {
      if (action === 'zoom') {
        onZoomIn(contextMenu.cluster)
      } else {
        onShowEventList(contextMenu.cluster)
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0, cluster: null })
  }, [contextMenu.cluster, onZoomIn, onShowEventList])

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, cluster: null })
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible])

  // Calculate visual properties based on cluster size and swimlane
  const getClusterColor = (swimlane: string) => {
    switch (swimlane) {
      case 'network': return '#3B82F6' // Blue
      case 'console': return '#EF4444'  // Red  
      case 'token': return '#10B981'    // Green
      default: return '#6B7280'        // Gray
    }
  }

  const getClusterSize = () => {
    // Enhanced size calculation with smoother scaling
    const baseSize = 8
    const maxSize = 32
    const sizeMultiplier = Math.min(Math.sqrt(cluster.density) * 2, 4)
    return Math.max(baseSize, Math.min(maxSize, baseSize + sizeMultiplier * 4))
  }

  const clusterSize = getClusterSize()
  const clusterColor = getClusterColor(cluster.swimlane)
  const clusterOpacity = Math.min(0.9, 0.6 + (cluster.density / 100) * 0.3)
  const shouldPulse = cluster.density > 10
  const shouldGlow = cluster.density > 20 || isHighlighted

  return (
    <>
      <div
        ref={clusterRef}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
          isHovered ? 'scale-125 z-10' : 'hover:scale-110'
        } ${shouldPulse ? 'animate-pulse' : ''}`}
        style={{
          left: `${cluster.position.x}%`,
          top: `${cluster.position.y}%`,
          width: `${clusterSize}px`,
          height: `${clusterSize}px`,
          animationDelay: `${animationDelay}ms`,
          filter: shouldGlow ? `drop-shadow(0 0 8px ${clusterColor}40)` : undefined,
        }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={`${cluster.density} events (${cluster.swimlane})\nDouble-click to zoom in`}
      >
        {/* Main cluster bubble */}
        <div
          className="w-full h-full rounded-full border-2 border-white shadow-lg relative overflow-hidden"
          style={{
            backgroundColor: clusterColor,
            opacity: clusterOpacity,
            boxShadow: shouldGlow 
              ? `0 0 0 2px ${clusterColor}30, 0 4px 12px ${clusterColor}20, 0 0 20px ${clusterColor}15`
              : '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          {/* Shimmer effect for high-density clusters */}
          {cluster.density > 15 && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"
              style={{ animationDuration: '2s' }}
            />
          )}
          
          {/* Inner glow ring */}
          {shouldGlow && (
            <div 
              className="absolute inset-1 rounded-full border opacity-40"
              style={{ borderColor: 'white' }}
            />
          )}
        </div>
        
        {/* Enhanced event count label */}
        {cluster.density >= 3 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className={`font-bold text-white drop-shadow-sm ${
                cluster.density < 10 ? 'text-xs' : 
                cluster.density < 50 ? 'text-sm' : 'text-base'
              }`}
              style={{ 
                fontSize: clusterSize < 16 ? '9px' : clusterSize < 24 ? '11px' : '13px',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}
            >
              {cluster.density > 99 ? '99+' : cluster.density}
            </span>
          </div>
        )}

        {/* Highlight ring for important clusters */}
        {isHighlighted && (
          <div 
            className="absolute -inset-1 rounded-full border-2 animate-pulse"
            style={{ 
              borderColor: clusterColor,
              animationDuration: '1.5s'
            }}
          />
        )}
      </div>

      {/* Enhanced Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[140px] backdrop-blur-sm"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
          }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-900 capitalize">
              {cluster.swimlane} Events
            </div>
            <div className="text-xs text-gray-500">
              {cluster.density} events at this time
            </div>
          </div>
          
          <button
            className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            onClick={() => handleContextMenuAction('zoom')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Zoom In
          </button>
          
          <button
            className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
            onClick={() => handleContextMenuAction('list')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Show Event List
          </button>
        </div>
      )}
    </>
  )
}
