import React from 'react'
import { TimelineCluster, TimelineEvent } from '../types/timeline.types'
import { X, Bookmark, GitCompare } from 'lucide-react'

interface EventPopupProps {
  cluster: TimelineCluster
  onClose: () => void
  onBookmark: (eventId: string, isBookmarked: boolean) => Promise<boolean>
  onAddToCompare: (event: TimelineEvent) => void
}

export const EventPopup: React.FC<EventPopupProps> = ({
  cluster,
  onClose,
  onBookmark,
  onAddToCompare
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {cluster.events.length} Events at {new Date(cluster.centerTime).toLocaleTimeString()}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-gray-500 dark:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {cluster.events.map((event) => (
              <div
                key={event.id}
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors bg-white dark:bg-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {event.type === 'network' && event.data.url}
                      {event.type === 'console' && event.data.message}
                      {event.type === 'token' && `${event.data.token_type} Token`}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    {event.type === 'network' && (
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        {event.data.method} - Status: {event.data.status}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onBookmark(event.id, !event.isBookmarked)}
                      className={`p-2 rounded transition-colors ${
                        event.isBookmarked
                          ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                          : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      title={event.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <Bookmark 
                        className="w-4 h-4" 
                        fill={event.isBookmarked ? 'currentColor' : 'none'} 
                      />
                    </button>

                    <button
                      onClick={() => onAddToCompare(event)}
                      className={`p-2 rounded transition-colors ${
                        event.compareSlot !== undefined
                          ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                          : 'text-gray-400 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      title="Add to compare"
                    >
                      <GitCompare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
