import React, { useState } from 'react'
import { ViewedTrackingSettings } from '../types/timeline.types'
import { viewedStateService } from '../services/ViewedStateService'
import { Settings, X, Eye, EyeOff, Clock, Database, Timer, Trash2 } from 'lucide-react'

interface ViewedStateSettingsProps {
  settings: ViewedTrackingSettings
  onSettingsChange: (settings: ViewedTrackingSettings) => void
  isOpen: boolean
  onClose: () => void
}

export const ViewedStateSettings: React.FC<ViewedStateSettingsProps> = ({
  settings,
  onSettingsChange,
  isOpen,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState<ViewedTrackingSettings>(settings)
  const [viewedEventsCount, setViewedEventsCount] = useState<number>(0)

  // Load viewed events count when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setViewedEventsCount(viewedStateService.getViewedEventsCount())
    }
  }, [isOpen])

  const handleSave = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const handleCancel = () => {
    setLocalSettings(settings) // Reset to original
    onClose()
  }

  const handleClearViewedEvents = () => {
    if (window.confirm('Are you sure you want to clear all viewed event history? This action cannot be undone.')) {
      viewedStateService.clearAllViewedEvents()
      setViewedEventsCount(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Viewed State Settings
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="p-4 space-y-6">
          {/* Enable/Disable Tracking */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {localSettings.enabled ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
              <label className="text-sm font-medium text-gray-700">
                Enable Viewed Tracking
              </label>
            </div>
            <button
              onClick={() => setLocalSettings({
                ...localSettings,
                enabled: !localSettings.enabled
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Persistence Level */}
          {localSettings.enabled && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Persistence Level
              </label>
              <div className="space-y-2">
                {/* Session */}
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="persistenceLevel"
                    value="session"
                    checked={localSettings.persistenceLevel === 'session'}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      persistenceLevel: e.target.value as 'session' | 'medium' | 'permanent'
                    })}
                    className="text-blue-600"
                  />
                  <Timer className="w-4 h-4 text-orange-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Session Only</div>
                    <div className="text-xs text-gray-500">Cleared when you navigate away</div>
                  </div>
                </label>

                {/* Medium */}
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="persistenceLevel"
                    value="medium"
                    checked={localSettings.persistenceLevel === 'medium'}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      persistenceLevel: e.target.value as 'session' | 'medium' | 'permanent'
                    })}
                    className="text-blue-600"
                  />
                  <Clock className="w-4 h-4 text-blue-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">24 Hours</div>
                    <div className="text-xs text-gray-500">Survives browser restarts for 1 day</div>
                  </div>
                </label>

                {/* Permanent */}
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="persistenceLevel"
                    value="permanent"
                    checked={localSettings.persistenceLevel === 'permanent'}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      persistenceLevel: e.target.value as 'session' | 'medium' | 'permanent'
                    })}
                    className="text-blue-600"
                  />
                  <Database className="w-4 h-4 text-green-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Permanent</div>
                    <div className="text-xs text-gray-500">Saved until manually cleared</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Visual Settings */}
          {localSettings.enabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Show Visual Indicators
                </label>
                <button
                  onClick={() => setLocalSettings({
                    ...localSettings,
                    showIndicators: !localSettings.showIndicators
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSettings.showIndicators ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.showIndicators ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Opacity Slider */}
              {localSettings.showIndicators && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Viewed Card Opacity: {Math.round(localSettings.viewedOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={localSettings.viewedOpacity}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      viewedOpacity: parseFloat(e.target.value)
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Faded</span>
                    <span>Visible</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Clear Section - Only show for permanent storage */}
          {localSettings.enabled && localSettings.persistenceLevel === 'permanent' && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <label className="text-sm font-medium text-gray-700">
                Data Management
              </label>
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Clear Viewed History</div>
                  <div className="text-xs text-gray-500">
                    {viewedEventsCount} events stored permanently
                  </div>
                </div>
                <button
                  onClick={handleClearViewedEvents}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded border border-red-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
