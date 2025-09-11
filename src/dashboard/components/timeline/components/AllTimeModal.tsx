import React, { useMemo, useState } from 'react'
import { X, Calendar, Activity, TrendingUp, Clock } from 'lucide-react'
import { TimelineEvent } from '../types/timeline.types'

interface AllTimeModalProps {
  isOpen: boolean
  onClose: () => void
  events: TimelineEvent[]
  onJumpToTime: (timestamp: number, scope: string) => void
  earliestTimestamp: number
  latestTimestamp: number
}

interface TimeCluster {
  id: string
  startTime: number
  endTime: number
  centerTime: number
  eventCount: number
  label: string
  scope: string
  color: string
}

export const AllTimeModal: React.FC<AllTimeModalProps> = ({
  isOpen,
  onClose,
  events,
  onJumpToTime,
  earliestTimestamp,
  latestTimestamp
}) => {
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null)

  // Calculate time clusters for visualization
  const timeClusters = useMemo(() => {
    if (!events || events.length === 0) return []

    const dataSpan = latestTimestamp - earliestTimestamp
    const clusters: TimeCluster[] = []

    // Choose appropriate clustering based on data span
    let clusterDuration: number
    let scope: string
    let clusterCount: number

    if (dataSpan <= 7 * 24 * 60 * 60 * 1000) { // 1 week or less
      clusterDuration = 24 * 60 * 60 * 1000 // 1 day clusters
      scope = '24-hours'
      clusterCount = Math.ceil(dataSpan / clusterDuration)
    } else if (dataSpan <= 30 * 24 * 60 * 60 * 1000) { // 1 month or less
      clusterDuration = 7 * 24 * 60 * 60 * 1000 // 1 week clusters
      scope = '1-week'
      clusterCount = Math.ceil(dataSpan / clusterDuration)
    } else if (dataSpan <= 180 * 24 * 60 * 60 * 1000) { // 6 months or less
      clusterDuration = 30 * 24 * 60 * 60 * 1000 // 1 month clusters
      scope = '1-month'
      clusterCount = Math.ceil(dataSpan / clusterDuration)
    } else { // More than 6 months
      clusterDuration = 90 * 24 * 60 * 60 * 1000 // 3 month clusters
      scope = '3-months'
      clusterCount = Math.ceil(dataSpan / clusterDuration)
    }

    // Create clusters
    for (let i = 0; i < clusterCount; i++) {
      const startTime = earliestTimestamp + (i * clusterDuration)
      const endTime = Math.min(startTime + clusterDuration, latestTimestamp)
      const centerTime = startTime + (endTime - startTime) / 2

      // Count events in this cluster
      const eventsInCluster = events.filter(event =>
        event.timestamp >= startTime && event.timestamp < endTime
      )

      if (eventsInCluster.length > 0) {
        const date = new Date(centerTime)
        let label: string

        if (clusterDuration === 24 * 60 * 60 * 1000) {
          // Daily clusters
          label = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          })
        } else if (clusterDuration === 7 * 24 * 60 * 60 * 1000) {
          // Weekly clusters
          const weekStart = new Date(startTime)
          label = `Week of ${weekStart.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}`
        } else {
          // Monthly/quarterly clusters
          label = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })
        }

        // Color based on activity level
        const maxEvents = Math.max(...Array.from({length: clusterCount}, (_, idx) => {
          const clusterStart = earliestTimestamp + (idx * clusterDuration)
          const clusterEnd = Math.min(clusterStart + clusterDuration, latestTimestamp)
          return events.filter(e => e.timestamp >= clusterStart && e.timestamp < clusterEnd).length
        }))

        const intensity = eventsInCluster.length / maxEvents
        let color: string
        if (intensity > 0.7) color = 'bg-blue-600'
        else if (intensity > 0.4) color = 'bg-blue-500'
        else if (intensity > 0.2) color = 'bg-blue-400'
        else color = 'bg-blue-300'

        clusters.push({
          id: `cluster-${i}`,
          startTime,
          endTime,
          centerTime,
          eventCount: eventsInCluster.length,
          label,
          scope,
          color
        })
      }
    }

    return clusters
  }, [events, earliestTimestamp, latestTimestamp])

  const totalEvents = events.length
  const dataSpanDays = Math.ceil((latestTimestamp - earliestTimestamp) / (24 * 60 * 60 * 1000))

  const handleClusterClick = (cluster: TimeCluster) => {
    onJumpToTime(cluster.centerTime, cluster.scope)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">All Time Overview</h2>
              <p className="text-sm text-gray-500">
                Complete timeline spanning {dataSpanDays} days with {totalEvents.toLocaleString()} events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {timeClusters.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No timeline data available</p>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total Events</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">
                    {totalEvents.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-200">Time Span</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">
                    {dataSpanDays} days
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-200">First Event</span>
                  </div>
                  <div className="text-sm font-bold text-purple-900 dark:text-purple-200 mt-1">
                    {new Date(earliestTimestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-200">Latest Event</span>
                  </div>
                  <div className="text-sm font-bold text-orange-900 dark:text-orange-200 mt-1">
                    {new Date(latestTimestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Time Clusters Visualization */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">
                  Activity Timeline - Click to Jump to Period
                </h3>

                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {timeClusters.map((cluster) => (
                    <button
                      key={cluster.id}
                      onClick={() => handleClusterClick(cluster)}
                      onMouseEnter={() => setHoveredCluster(cluster.id)}
                      onMouseLeave={() => setHoveredCluster(null)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left bg-white dark:bg-gray-700 ${
                        hoveredCluster === cluster.id
                          ? 'border-blue-500 shadow-lg transform scale-105'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-3 h-3 rounded-full ${cluster.color}`}></div>
                        <span className="text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                          {cluster.scope}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {cluster.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-200">
                        {cluster.eventCount} events
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-2">
                        Click to view in timeline
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-200">
            💡 Click on any time period above to jump to that section in the main timeline view
          </p>
        </div>
      </div>
    </div>
  )
}
