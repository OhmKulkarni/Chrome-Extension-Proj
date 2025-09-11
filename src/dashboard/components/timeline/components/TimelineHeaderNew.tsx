import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Eye } from 'lucide-react'
import { ViewportRange } from '../types/timeline.types'

interface TimelineHeaderNewProps {
  currentScope: string
  centerTime: number
  viewport: ViewportRange
  canZoomIn: boolean
  canZoomOut: boolean
  isAnimating?: boolean
  hasNewUpdates: boolean
  hiddenSwimlanes: string[]
  onZoomIn: () => void
  onZoomOut: () => void
  onPanLeft: () => void
  onPanRight: () => void
  onJumpToPreset: (scope: string) => void
  onJumpToTime: (timestamp: number, scope?: string) => void
  onRefresh: () => void
  onAcknowledgeUpdates: () => void
  onShowSwimlane: (laneId: string) => void
  onShowAllTimeModal: () => void
}

const TimelineHeaderNew: React.FC<TimelineHeaderNewProps> = ({
  currentScope,
  viewport,
  canZoomIn,
  canZoomOut,
  isAnimating = false,
  hasNewUpdates,
  hiddenSwimlanes,
  onZoomIn,
  onZoomOut,
  onPanLeft,
  onPanRight,
  onJumpToPreset,
  onJumpToTime,
  onRefresh,
  onAcknowledgeUpdates,
  onShowSwimlane,
  onShowAllTimeModal
}) => {
  // State for dropdown visibility
  const [showLastDropdown, setShowLastDropdown] = useState(false)
  const [showFirstDropdown, setShowFirstDropdown] = useState(false)
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false)

  // State for time selection mode
  const [timeSelectionMode, setTimeSelectionMode] = useState<'last' | 'first' | 'all-time' | 'custom'>('last')

  // State for custom time settings
  const [customStartDate, setCustomStartDate] = useState('')
  const [customStartTime, setCustomStartTime] = useState('')
  const [customScope, setCustomScope] = useState('1-hour')
  const [customLabel, setCustomLabel] = useState('')

  // Refs for click outside handling
  const headerRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowLastDropdown(false)
        setShowFirstDropdown(false)
        setShowTimeRangeSelector(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Initialize custom time values if not set
  useEffect(() => {
    if (!customStartDate || !customStartTime) {
      const now = new Date()
      if (!customStartDate) {
        setCustomStartDate(now.toISOString().split('T')[0])
      }
      if (!customStartTime) {
        setCustomStartTime(now.toTimeString().slice(0, 5))
      }
    }
  }, [customStartDate, customStartTime])

  // Dropdown options
  const timeIntervals = [
    { value: '1-minute', label: '1 Minute' },
    { value: '5-minutes', label: '5 Minutes' },
    { value: '10-minutes', label: '10 Minutes' },
    { value: '15-minutes', label: '15 Minutes' },
    { value: '30-minutes', label: '30 Minutes' },
    { value: '1-hour', label: '1 Hour' },
    { value: '2-hours', label: '2 Hours' },
    { value: '6-hours', label: '6 Hours' },
    { value: '12-hours', label: '12 Hours' },
    { value: '24-hours', label: '24 Hours' },
    { value: '2-days', label: '2 Days' },
    { value: '3-days', label: '3 Days' },
    { value: '4-days', label: '4 Days' },
    { value: '5-days', label: '5 Days' },
    { value: '6-days', label: '6 Days' },
    { value: '1-week', label: '1 Week' },
    { value: '2-weeks', label: '2 Weeks' },
    { value: '3-weeks', label: '3 Weeks' },
    { value: '1-month', label: '1 Month' },
    { value: '3-months', label: '3 Months' },
    { value: '6-months', label: '6 Months' },
    { value: '12-months', label: '12 Months' }
  ]

  const lastOptions = timeIntervals.map(interval => ({
    value: `last-${interval.value}`,
    label: `Last ${interval.label}`
  }))

  const firstOptions = timeIntervals.map(interval => ({
    value: `first-${interval.value}`,
    label: `First ${interval.label}`
  }))

  const handleTimeSelectionModeChange = (mode: 'last' | 'first' | 'all-time' | 'custom') => {
    // Close all dropdowns
    setShowLastDropdown(false)
    setShowFirstDropdown(false)
    setShowTimeRangeSelector(false)

    setTimeSelectionMode(mode)

    // Open the appropriate dropdown/selector
    if (mode === 'last') {
      setShowLastDropdown(true)
    } else if (mode === 'first') {
      setShowFirstDropdown(true)
    } else if (mode === 'all-time') {
      // All time doesn't need a dropdown, just apply immediately
      onJumpToPreset('all-time')
    } else if (mode === 'custom') {
      setShowTimeRangeSelector(true)
    }
  }
  return (
    <div ref={headerRef} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 shadow-sm relative">
      {/* Time Selection Controls */}
      <div className="flex items-center space-x-4">
        {/* Mutually exclusive time selection buttons */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => handleTimeSelectionModeChange('last')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              timeSelectionMode === 'last'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-200 dark:ring-blue-500'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Last
          </button>
          <button
            onClick={() => handleTimeSelectionModeChange('first')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              timeSelectionMode === 'first'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-200 dark:ring-blue-500'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            First
          </button>
          <button
            onClick={() => onShowAllTimeModal()}
            className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            All Time
          </button>
          <button
            onClick={() => handleTimeSelectionModeChange('custom')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              timeSelectionMode === 'custom'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-200 dark:ring-blue-500'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Current scope and viewport time display */}
        <div className="flex items-center space-x-4">
          {/* Scope Display */}
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">Scope:</div>
            <div className={`bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
              isAnimating ? 'animate-pulse' : ''
            }`}>
              {timeSelectionMode === 'custom' && customLabel ? customLabel.split(' from ')[0] : currentScope}
            </div>
          </div>

          {/* Current Viewport Time Display */}
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">Showing:</div>
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-medium">
              {(() => {
                const startTime = new Date(viewport.startTime)
                const endTime = new Date(viewport.endTime)
                const duration = viewport.duration

                // Format based on duration
                if (duration <= 60 * 60 * 1000) { // 1 hour or less
                  return `${startTime.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - ${endTime.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                  })}`
                } else if (duration <= 24 * 60 * 60 * 1000) { // 1 day or less
                  const isSameDay = startTime.toDateString() === endTime.toDateString()
                  if (isSameDay) {
                    return `${startTime.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })} ${startTime.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit'
                    })}-${endTime.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  } else {
                    return `${startTime.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })} - ${endTime.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}`
                  }
                } else {
                  // More than 1 day
                  return `${startTime.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: startTime.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  })} - ${endTime.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: endTime.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  })}`
                }
              })()}
            </div>
          </div>

          {isAnimating && (
            <div className="flex items-center text-xs text-gray-400">
              <div className="animate-spin w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full mr-1"></div>
              Moving...
            </div>
          )}
        </div>

        {/* Last Dropdown */}
        {timeSelectionMode === 'last' && showLastDropdown && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] max-h-64 overflow-y-auto">
            {lastOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onJumpToPreset(option.value)
                  setShowLastDropdown(false)
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* First Dropdown */}
        {timeSelectionMode === 'first' && showFirstDropdown && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] max-h-64 overflow-y-auto">
            {firstOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onJumpToPreset(option.value)
                  setShowFirstDropdown(false)
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Custom Time Range Selector */}
        {timeSelectionMode === 'custom' && showTimeRangeSelector && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[400px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Custom Time Range</h3>
                <button
                  onClick={() => {
                    setShowTimeRangeSelector(false)
                    setTimeSelectionMode('last')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time Scope</label>
                  <select
                    value={customScope}
                    onChange={(e) => setCustomScope(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-h-32"
                  >
                    {timeIntervals.map(interval => (
                      <option key={interval.value} value={interval.value}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-500">
                  Shows data from start time for the selected duration
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowTimeRangeSelector(false)
                      setTimeSelectionMode('last')
                    }}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Create a custom label from the settings
                      const scopeLabel = timeIntervals.find(t => t.value === customScope)?.label || customScope
                      let dateLabel = ''

                      if (customStartDate) {
                        const date = new Date(customStartDate)
                        dateLabel = date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })
                      }

                      const timeLabel = customStartTime ? ` at ${customStartTime}` : ''
                      const label = `${scopeLabel}${dateLabel ? ` from ${dateLabel}` : ''}${timeLabel}`
                      setCustomLabel(label)

                      // Calculate actual timestamp from custom inputs
                      let targetTimestamp = Date.now() // Default to now

                      if (customStartDate && customStartTime) {
                        // Both date and time specified - use explicit date construction
                        const [year, month, day] = customStartDate.split('-').map(Number)
                        const [hours, minutes] = customStartTime.split(':').map(Number)
                        const dateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
                        targetTimestamp = dateTime.getTime()
                        console.log(`🕐 Custom time: ${customStartDate} ${customStartTime} -> ${dateTime.toISOString()} (${targetTimestamp})`)
                      } else if (customStartDate) {
                        // Only date specified, use start of day
                        const [year, month, day] = customStartDate.split('-').map(Number)
                        const date = new Date(year, month - 1, day, 0, 0, 0, 0)
                        targetTimestamp = date.getTime()
                        console.log(`📅 Custom date: ${customStartDate} -> ${date.toISOString()} (${targetTimestamp})`)
                      } else if (customStartTime) {
                        // Only time specified, use today's date
                        const today = new Date()
                        const [hours, minutes] = customStartTime.split(':').map(Number)
                        today.setHours(hours, minutes, 0, 0)
                        targetTimestamp = today.getTime()
                        console.log(`⏰ Custom time today: ${customStartTime} -> ${today.toISOString()} (${targetTimestamp})`)
                      }

                      // Jump to the calculated time with the selected scope
                      onJumpToTime(targetTimestamp, customScope)

                      setShowTimeRangeSelector(false)
                    }}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onPanLeft}
          disabled={isAnimating}
          className={`p-2 rounded-lg transition-colors ${
            isAnimating
              ? 'bg-gray-100 cursor-not-allowed opacity-50'
              : 'hover:bg-gray-100'
          }`}
          title="Pan Left"
        >
          <ChevronLeft className={`w-5 h-5 ${isAnimating ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>

        <button
          onClick={onPanRight}
          disabled={isAnimating}
          className={`p-2 rounded-lg transition-colors ${
            isAnimating
              ? 'bg-gray-100 cursor-not-allowed opacity-50'
              : 'hover:bg-gray-100'
          }`}
          title="Pan Right"
        >
          <ChevronRight className={`w-5 h-5 ${isAnimating ? 'text-gray-400' : 'text-gray-600'}`} />
        </button>

        <div className="w-px h-6 bg-gray-300" />

        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={canZoomOut ? "Zoom Out (Show density view)" : "Already at maximum zoom out"}
        >
          <ZoomOut className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={canZoomIn ? "Zoom In (Show individual cards)" : "Already at maximum zoom in"}
        >
          <ZoomIn className="w-5 h-5 text-gray-600" />
        </button>

        <div className="w-px h-6 bg-gray-300" />

        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh Timeline"
        >
          <RotateCcw className="w-5 h-5 text-gray-600" />
        </button>

        {hasNewUpdates && (
          <button
            onClick={onAcknowledgeUpdates}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            title="New updates available"
          >
            Updates
          </button>
        )}
      </div>

      {/* Swimlane Visibility */}
      {hiddenSwimlanes.length > 0 && (
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Eye className="w-4 h-4" />
            <span>Show:</span>
          </div>
          <div className="flex space-x-2">
            {hiddenSwimlanes.map((swimlane) => (
              <button
                key={swimlane}
                onClick={() => onShowSwimlane(swimlane)}
                className="px-3 py-1 text-xs rounded-full transition-colors bg-gray-200 text-gray-600 hover:bg-gray-300"
                title={`Show ${swimlane} swimlane`}
              >
                {swimlane}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimelineHeaderNew
