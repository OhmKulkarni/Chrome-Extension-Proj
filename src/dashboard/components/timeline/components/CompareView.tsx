import React, { useState } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { X, LinkIcon } from 'lucide-react'

interface CompareViewProps {
  events: TimelineEvent[]
  onClose: () => void
  onRemoveFromCompare: (eventId: string) => void
}

export const CompareView: React.FC<CompareViewProps> = ({
  events,
  onClose,
  onRemoveFromCompare
}) => {
  const [syncScroll, setSyncScroll] = useState(false)
  const scrollRefs = React.useRef<(HTMLDivElement | null)[]>([])

  const handleScroll = (index: number) => {
    if (!syncScroll) return

    const scrollTop = scrollRefs.current[index]?.scrollTop || 0
    scrollRefs.current.forEach((ref, i) => {
      if (ref && i !== index) {
        ref.scrollTop = scrollTop
      }
    })
  }

  const renderEventDetails = (event: TimelineEvent, index: number) => {
    const getDetails = () => {
      switch (event.type) {
        case 'network':
          return {
            title: event.data.url,
            details: [
              { label: 'Method', value: event.data.method },
              { label: 'Status', value: event.data.status },
              { label: 'Response Time', value: `${event.data.response_time}ms` },
              { label: 'Size', value: `${event.data.payload_size} bytes` }
            ],
            headers: event.data.headers,
            body: event.data.response_body
          }
        case 'console':
          return {
            title: event.data.message,
            details: [
              { label: 'Severity', value: event.data.severity },
              { label: 'Source', value: event.data.url },
              { label: 'Line', value: event.data.line }
            ],
            stack: event.data.stack_trace
          }
        case 'token':
          return {
            title: `${event.data.token_type} Token`,
            details: [
              { label: 'Type', value: event.data.token_type },
              { label: 'Source', value: event.data.source_url },
              { label: 'Value Hash', value: event.data.value_hash }
            ]
          }
        default:
          return { title: 'Unknown Event', details: [] }
      }
    }

    const eventInfo = getDetails()

    return (
      <div 
        ref={el => scrollRefs.current[index] = el}
        className="h-full overflow-y-auto p-4"
        onScroll={() => handleScroll(index)}
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-sm mb-2">{eventInfo.title}</h3>
            <div className="space-y-1">
              {eventInfo.details.map((detail, i) => (
                <div key={i} className="flex text-xs">
                  <span className="font-medium text-gray-600 w-24">{detail.label}:</span>
                  <span className="text-gray-800">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>

          {eventInfo.headers && (
            <div>
              <h4 className="font-medium text-xs mb-1">Headers</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(eventInfo.headers, null, 2)}
              </pre>
            </div>
          )}

          {eventInfo.body && (
            <div>
              <h4 className="font-medium text-xs mb-1">Response Body</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {typeof eventInfo.body === 'string' 
                  ? eventInfo.body 
                  : JSON.stringify(eventInfo.body, null, 2)}
              </pre>
            </div>
          )}

          {eventInfo.stack && (
            <div>
              <h4 className="font-medium text-xs mb-1">Stack Trace</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {eventInfo.stack}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90%] h-[80%] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">Compare Events</h2>
            <button
              onClick={() => setSyncScroll(!syncScroll)}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${
                syncScroll 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LinkIcon className="w-3 h-3" />
              <span>Sync Scroll</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-px bg-gray-200 p-px">
          {events.slice(0, 4).map((event, index) => (
            <div key={event.id} className="bg-white relative">
              {/* Event header */}
              <div className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-200 p-2 flex items-center justify-between">
                <span className="text-xs font-medium">
                  Slot {index + 1}: {event.type}
                </span>
                <button
                  onClick={() => onRemoveFromCompare(event.id)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  Remove
                </button>
              </div>
              
              {/* Event content */}
              <div className="pt-8 h-full">
                {renderEventDetails(event, index)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
