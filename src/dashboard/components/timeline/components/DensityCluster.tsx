import React, { useState, useRef, useCallback } from 'react'
import { DensityCluster } from '../types/timeline.types'

interface DensityClusterProps {
  cluster: DensityCluster
  onZoomIn: (cluster: DensityCluster) => void
  onShowEventList: (cluster: DensityCluster) => void
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
  onShowEventList
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    cluster: null
  })
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

  const getClusterSize = (size: number) => {
    // Size ranges from 1-5, map to pixel sizes
    const sizeMap = { 1: 8, 2: 12, 3: 16, 4: 20, 5: 24 }
    return sizeMap[size as keyof typeof sizeMap] || 12
  }

  const clusterSize = getClusterSize(cluster.size)
  const clusterColor = getClusterColor(cluster.swimlane)

  return (
    <>
      <div
        ref={clusterRef}
        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110"
        style={{
          left: `${cluster.position.x}%`,
          top: `${cluster.position.y}%`,
          width: `${clusterSize}px`,
          height: `${clusterSize}px`,
        }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
        title={`${cluster.density} events (${cluster.swimlane})`}
      >
        <div
          className="w-full h-full rounded-full border-2 border-white shadow-lg"
          style={{
            backgroundColor: clusterColor,
            opacity: 0.8
          }}
        />
        
        {/* Event count label for larger clusters */}
        {cluster.size >= 3 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontSize: '10px' }}>
              {cluster.density}
            </span>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => handleContextMenuAction('zoom')}
          >
            Zoom In
          </button>
          <button
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => handleContextMenuAction('list')}
          >
            Show Event List
          </button>
        </div>
      )}
    </>
  )
}
