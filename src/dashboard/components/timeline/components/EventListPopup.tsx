import React from 'react'
import { DensityCluster } from '../types/timeline.types'
import { X } from 'lucide-react'

interface EventListPopupProps {
  cluster: DensityCluster
  onClose: () => void
  onBookmarkEvent: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onSetCompareSlot: (eventId: string, slot: number | undefined) => Promise<boolean>
}

export const EventListPopup: React.FC<EventListPopupProps> = ({
  cluster,
  onClose,
  onBookmarkEvent,
  onSetCompareSlot
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'network': return 'bg-blue-100 text-blue-800'
      case 'console': return 'bg-red-100 text-red-800'  
      case 'token': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'network': return '🌐'
      case 'console': return '⚠️'
      case 'token': return '🔑'
      default: return '📄'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Event Cluster Details
            </h3>
            <p className="text-sm text-gray-500">
              {cluster.density} events in {cluster.swimlane} swimlane
            </p>
            <p className="text-xs text-gray-400">
              {formatTime(cluster.startTime)} - {formatTime(cluster.endTime)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Event List */}
        <div className="p-4 overflow-y-auto max-h-96">
          <div className="space-y-3">
            {cluster.events
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700">
                      {/* Event summary based on type */}
                      {event.type === 'network' && (
                        <div>
                          <span className="font-medium">
                            {event.data?.method || 'GET'} {event.data?.url || 'Unknown URL'}
                          </span>
                          {event.data?.status && (
                            <span className={`ml-2 px-1 py-0.5 text-xs rounded ${
                              event.data.status >= 400 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {event.data.status}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {event.type === 'console' && (
                        <div>
                          <span className="font-medium">Console {event.data?.level || 'log'}</span>
                          <div className="text-xs text-gray-600 mt-1 truncate">
                            {event.data?.message || 'No message'}
                          </div>
                        </div>
                      )}
                      
                      {event.type === 'token' && (
                        <div>
                          <span className="font-medium">Token Event</span>
                          <div className="text-xs text-gray-600 mt-1">
                            {event.data?.action || 'Token activity detected'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onBookmarkEvent(event.id, !event.isBookmarked)}
                      className={`px-2 py-1 text-xs rounded ${
                        event.isBookmarked 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'
                      }`}
                    >
                      {event.isBookmarked ? '⭐' : '☆'}
                    </button>
                    <button
                      onClick={() => onSetCompareSlot(event.id, event.compareSlot === undefined ? 0 : undefined)}
                      className={`px-2 py-1 text-xs rounded ${
                        event.compareSlot !== undefined
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                      }`}
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Showing {cluster.events.length} events
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
