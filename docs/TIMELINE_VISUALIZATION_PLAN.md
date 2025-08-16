# Timeline Visualization Component Plan

## Overview
A multi-swimlane timeline visualization for network requests, console errors, and token events with progressive zoom levels, clustering, and interactive features.

## Core Features

### 1. Time Scopes & Navigation
- **Default View**: Last 5 minutes
- **Preset Buttons**: 5m, 30m, 1h, 6h, All
- **Zoom Levels**: 
  - Out: 24h → 6h → 1h → 30m → 15m → 5m → 1m
  - In: 1m → 30s → 10s → 5s (minimum)
- **Scroll Navigation**: Left/Right buttons (50% viewport shift)
- **Date Picker**: Jump to specific date + 24h zoom out option

### 2. Swimlanes
- **Three lanes**: Network Requests, Console Errors, Token Events
- **Dynamic Heights**: Even by default, expand when others hidden
- **Draggable Splitters**: Adjust lane heights manually
- **Lane Toggle**: Show/hide individual lanes

### 3. Event Representation
- **Clustering (wide scopes)**: Circles sized by event count
  - Multiple circles per time period for spatial distribution
  - Click to unstack → popup list for dense clusters
- **Individual Events (narrow scopes)**: Mini cards
  - Overlap handling with stacking
  - Click to separate overlapped items
- **Transition**: Smooth morphing from circles to cards on zoom

### 4. Interactions
- **Bookmarking**: Persistent flag in database
- **Compare Mode**: 2x2 grid, max 4 items, queue overflow
- **Ghost Markers**: Different styles for bookmarks vs compare items
- **Popup Lists**: For dense event clusters

### 5. Sidebar
- **Fixed Size**: Right-side panel
- **Mini Cards Display**: Bookmarked and compare items
- **Queue Management**: Manual compare queue manipulation

### 6. Performance
- **Progressive Loading**: Load data as user scrolls/zooms
- **Viewport Culling**: Only keep visible range + buffer in memory
- **New Update Indicator**: Show available updates without auto-refresh
- **Memory Limit**: Handle up to 15k records efficiently

## Technical Implementation

### Data Layer
```typescript
interface TimelineEvent {
  id: string
  timestamp: number // Unix timestamp in milliseconds
  type: 'network' | 'console' | 'token'
  data: any // Original event data
  isBookmarked?: boolean
  compareSlot?: number // 0-3 for compare grid, -1 for queue
}

interface TimelineCluster {
  startTime: number
  endTime: number
  events: TimelineEvent[]
  centerTime: number
  density: number
}
```

### Component Architecture
