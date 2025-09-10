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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-100">
                <GitCompare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select Compare Slot</h3>
                <p className="text-sm text-gray-600">Choose which event to replace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 p-3 bg-blue-50 rounded-2xl border border-blue-200">
            <div className="flex items-center space-x-3">
              <span className="text-lg flex-shrink-0">{getEventIcon(queuedEvent)}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-blue-900 truncate">{getEventTitle(queuedEvent)}</div>
                <div className="text-xs text-blue-600 truncate">
                  {new Date(queuedEvent.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Replace which {queuedEvent.type} compare slot?</h4>
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
                  className="w-full p-3 text-left border border-gray-200 rounded-2xl hover:bg-purple-50 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center justify-between min-w-0">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {slot + 1}
                      </div>
                      {eventInSlot ? (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="flex-shrink-0">{getEventIcon(eventInSlot)}</span>
                            <span className="font-medium text-gray-900 truncate">
                              {getEventTitle(eventInSlot)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {new Date(eventInSlot.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic flex-1">Empty slot</span>
                      )}
                    </div>
                    <div className="text-xs text-purple-600 font-medium ml-3 flex-shrink-0">
                      Replace →
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
