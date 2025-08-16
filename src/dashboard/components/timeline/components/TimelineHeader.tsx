import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar, RotateCcw } from 'lucide-react'
import { TIME_SCOPES } from '../types/timeline.types'

interface TimelineHeaderProps {
  currentScope: string
  centerTime: number
  canZoomIn: boolean
  canZoomOut: boolean
  hasNewUpdates: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onPanLeft: () => void
  onPanRight: () => void
  onJumpToPreset: (scope: string) => void
  onJumpToTime: (timestamp: number, scope?: string) => void
  onRefresh: () => void
  onAcknowledgeUpdates: () => void
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  currentScope,
  centerTime,
  canZoomIn,
  canZoomOut,
  hasNewUpdates,
  onZoomIn,
  onZoomOut,
  onPanLeft,
  onPanRight,
  onJumpToPreset,
  onJumpToTime,
  onRefresh,
  onAcknowledgeUpdates
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date(centerTime).toISOString().split('T')[0]
  )

  const presetButtons = ['5m', '30m', '1h', '6h', 'All']
  const currentScopeLabel = TIME_SCOPES.find(s => s.key === currentScope)?.label || currentScope

  const formatCenterTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const handleDateSelect = () => {
    const selectedTimestamp = new Date(selectedDate).getTime()
    onJumpToTime(selectedTimestamp, '24h')
    setShowDatePicker(false)
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      {/* Left Side: Navigation Controls */}
      <div className="flex items-center space-x-2">
        {/* Pan Controls */}
        <button
          onClick={onPanLeft}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Pan left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <button
          onClick={onPanRight}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Pan right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Zoom Controls */}
        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Date Picker */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Jump to date"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {showDatePicker && (
            <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={handleDateSelect}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Go
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Current Time and Scope */}
      <div className="flex flex-col items-center">
        <div className="text-sm font-medium text-gray-900">
          {formatCenterTime(centerTime)}
        </div>
        <div className="text-xs text-gray-500">
          Viewing {currentScopeLabel}
        </div>
      </div>

      {/* Right Side: Presets and Updates */}
      <div className="flex items-center space-x-2">
        {/* Preset Buttons */}
        <div className="flex items-center space-x-1">
          {presetButtons.map((preset) => (
            <button
              key={preset}
              onClick={() => onJumpToPreset(preset)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                preset === currentScope
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Refresh Controls */}
        {hasNewUpdates && (
          <button
            onClick={onAcknowledgeUpdates}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
          >
            New Updates Available
          </button>
        )}

        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Refresh data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
