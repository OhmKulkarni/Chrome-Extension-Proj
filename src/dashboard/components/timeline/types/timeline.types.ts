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
  size: number // Visual size based on density
  visualType: 'card' | 'circle' // Display type based on event count
}

export interface DensityCluster {
  id: string
  startTime: number
  endTime: number
  events: TimelineEvent[]
  swimlane: 'network' | 'console' | 'token'
  density: number
  size: number // 1-5 scale for visual size
  position: { x: number; y: number }
}

export interface ViewportEventData {
  individualEvents: TimelineEvent[] // Events shown as cards (< 10 events)
  densityClusters: DensityCluster[] // Events shown as circles (>= 10 events)
  totalEventCount: number
  shouldShowCards: boolean // True if total events < 10
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
  // Minutes - High zoom levels (individual events visible)
  { key: '1-minute', label: '1 Minute', duration: 1 * 60 * 1000, zoomLevel: 10 },
  { key: '5-minutes', label: '5 Minutes', duration: 5 * 60 * 1000, zoomLevel: 9 },
  { key: '10-minutes', label: '10 Minutes', duration: 10 * 60 * 1000, zoomLevel: 8 },
  { key: '15-minutes', label: '15 Minutes', duration: 15 * 60 * 1000, zoomLevel: 7 },
  { key: '30-minutes', label: '30 Minutes', duration: 30 * 60 * 1000, zoomLevel: 6 },
  
  // Hours - Medium zoom levels (some clustering)
  { key: '1-hour', label: '1 Hour', duration: 60 * 60 * 1000, zoomLevel: 5 },
  { key: '2-hours', label: '2 Hours', duration: 2 * 60 * 60 * 1000, zoomLevel: 4 },
  { key: '6-hours', label: '6 Hours', duration: 6 * 60 * 60 * 1000, zoomLevel: 3 },
  { key: '12-hours', label: '12 Hours', duration: 12 * 60 * 60 * 1000, zoomLevel: 2 },
  { key: '24-hours', label: '24 Hours', duration: 24 * 60 * 60 * 1000, zoomLevel: 1 },
  
  // Days - Low zoom levels (heavy clustering)
  { key: '2-days', label: '2 Days', duration: 2 * 24 * 60 * 60 * 1000, zoomLevel: 0 },
  { key: '3-days', label: '3 Days', duration: 3 * 24 * 60 * 60 * 1000, zoomLevel: -1 },
  { key: '4-days', label: '4 Days', duration: 4 * 24 * 60 * 60 * 1000, zoomLevel: -2 },
  { key: '5-days', label: '5 Days', duration: 5 * 24 * 60 * 60 * 1000, zoomLevel: -3 },
  { key: '6-days', label: '6 Days', duration: 6 * 24 * 60 * 60 * 1000, zoomLevel: -4 },
  { key: '1-week', label: '1 Week', duration: 7 * 24 * 60 * 60 * 1000, zoomLevel: -5 },
  
  // Special all-time scope
  { key: 'all-time', label: 'All Time', duration: 365 * 24 * 60 * 60 * 1000, zoomLevel: -10 }
]

export const DEFAULT_SWIMLANES: SwimLaneConfig[] = [
  { id: 'network', label: 'Network Requests', color: '#3B82F6', isVisible: true, height: 33.33 },
  { id: 'console', label: 'Console Errors', color: '#EF4444', isVisible: true, height: 33.33 },
  { id: 'token', label: 'Token Events', color: '#10B981', isVisible: true, height: 33.33 }
]
