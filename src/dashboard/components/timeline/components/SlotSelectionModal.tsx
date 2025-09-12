import React from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { X, GitCompare } from 'lucide-react'

interface SlotSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectSlot: (slot: number) => void
  queuedEvent: TimelineEvent | null
  activeCompareEvents: TimelineEvent[]
}

export const SlotSelectionModal: React.FC<SlotSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectSlot,
  queuedEvent,
  activeCompareEvents
}) => {
  if (!isOpen || !queuedEvent) return null

  const getEventTitle = (event: TimelineEvent) => {
    let title = ''
    switch (event.type) {
      case 'network':
        title = event.data.url?.split('/').pop() || 'Network Request'
        break
      case 'console':
        title = event.data.message || 'Console Error'
        break
      case 'token':
        title = `${event.data.token_type || 'Token'} Event`
        break
      default:
        title = 'Event'
    }
    // Truncate very long titles but let CSS handle the rest
    return title.length > 80 ? title.substring(0, 80) + '...' : title
  }

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'network':
        return '🌐'
      case 'console':
        return '⚠️'
      case 'token':
        return '🔑'
      default:
        return '📄'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-600">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-purple-50 dark:from-purple-900/30 to-white dark:to-gray-800 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50">
                <GitCompare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Select Compare Slot</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Choose which event to replace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-700">
            <div className="flex items-center space-x-3">
              <span className="text-lg flex-shrink-0">{getEventIcon(queuedEvent)}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-blue-900 dark:text-blue-200 truncate">{getEventTitle(queuedEvent)}</div>
                <div className="text-xs text-blue-600 dark:text-blue-300 truncate">
                  {new Date(queuedEvent.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Replace which {queuedEvent.type} compare slot?</h4>
            {[0, 1, 2, 3].map((slot) => {
              // Get slot range for the queued event type
              const getSlotRange = (eventType: string) => {
                switch (eventType) {
                  case 'network': return { start: 0, end: 3 }
                  case 'console': return { start: 10, end: 13 }
                  case 'token': return { start: 20, end: 23 }
                  default: return { start: 0, end: 3 }
                }
              }

              const slotRange = getSlotRange(queuedEvent.type)
              const actualSlot = slotRange.start + slot
              const eventInSlot = activeCompareEvents.find(e => e.compareSlot === actualSlot)

              return (
                <button
                  key={slot}
                  onClick={() => onSelectSlot(slot)}
                  className="w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                >
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {slot + 1}
                      </div>
                      {eventInSlot ? (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="flex-shrink-0">{getEventIcon(eventInSlot)}</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {getEventTitle(eventInSlot)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300 truncate">
                            {new Date(eventInSlot.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 italic flex-1">Empty slot</span>
                      )}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium ml-3 flex-shrink-0">
                      Replace →
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
