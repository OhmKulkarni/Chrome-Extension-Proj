export interface TimelineEvent {
  id: string
  timestamp: number // Unix timestamp in milliseconds
  type: 'network' | 'console' | 'token'
  data: any // Original event data
  isBookmarked?: boolean
  compareSlot?: number // 0-3 for compare grid, -1 for queue
  swimlane: 'network' | 'console' | 'token'
}

export interface TimelineCluster {
  id: string
  startTime: number
  endTime: number
  events: TimelineEvent[]
  centerTime: number
  density: number
  swimlane: 'network' | 'console' | 'token'
  x: number // Position in timeline
  y: number // Position in swimlane
}

export interface TimeScope {
  key: string
  label: string
  duration: number // in milliseconds
  zoomLevel: number
}

export interface ViewportRange {
  startTime: number
  endTime: number
  duration: number
}

export interface SwimLaneConfig {
  id: 'network' | 'console' | 'token'
  label: string
  color: string
  isVisible: boolean
  height: number // percentage
}

export const TIME_SCOPES: TimeScope[] = [
  { key: '5s', label: '5 seconds', duration: 5 * 1000, zoomLevel: 8 },
  { key: '10s', label: '10 seconds', duration: 10 * 1000, zoomLevel: 7 },
  { key: '30s', label: '30 seconds', duration: 30 * 1000, zoomLevel: 6 },
  { key: '1m', label: '1 minute', duration: 60 * 1000, zoomLevel: 5 },
  { key: '5m', label: '5 minutes', duration: 5 * 60 * 1000, zoomLevel: 4 },
  { key: '15m', label: '15 minutes', duration: 15 * 60 * 1000, zoomLevel: 3 },
  { key: '30m', label: '30 minutes', duration: 30 * 60 * 1000, zoomLevel: 2 },
  { key: '1h', label: '1 hour', duration: 60 * 60 * 1000, zoomLevel: 1 },
  { key: '6h', label: '6 hours', duration: 6 * 60 * 60 * 1000, zoomLevel: 0 },
  { key: '24h', label: '24 hours', duration: 24 * 60 * 60 * 1000, zoomLevel: -1 }
]

export const DEFAULT_SWIMLANES: SwimLaneConfig[] = [
  { id: 'network', label: 'Network Requests', color: '#3B82F6', isVisible: true, height: 33.33 },
  { id: 'console', label: 'Console Errors', color: '#EF4444', isVisible: true, height: 33.33 },
  { id: 'token', label: 'Token Events', color: '#10B981', isVisible: true, height: 33.33 }
]
