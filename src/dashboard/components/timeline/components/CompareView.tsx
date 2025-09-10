import React, { useState } from 'react'
import { TimelineEvent } from '../types/timeline.types'
import { X, Network, AlertTriangle, Key, Copy } from 'lucide-react'
import { RequestDetailContent, ErrorDetailContent, TokenDetailContent } from '../../../shared/components/DetailedViews'

interface CompareViewProps {
  events: TimelineEvent[]
  onClose: () => void
  onRemoveFromCompare: (eventId: string) => void
}

type EventType = 'network' | 'console' | 'token'

export const CompareView: React.FC<CompareViewProps> = ({
  events,
  onClose,
  onRemoveFromCompare
}) => {
  const [syncScroll, setSyncScroll] = useState(true)
  const [selectedEventType, setSelectedEventType] = useState<EventType>('network')
  const [selectedFields, setSelectedFields] = useState<Record<EventType, string[]>>({
    network: ['details', 'details', 'details', 'details'],
    console: ['details', 'details', 'details', 'details'],
    token: ['details', 'details', 'details', 'details']
  })
  const scrollRefs = React.useRef<Record<EventType, (HTMLDivElement | null)[]>>({
    network: [],
    console: [],
    token: []
  })

  const handleScroll = (index: number, eventType: EventType) => {
    if (!syncScroll) return

    const scrollTop = scrollRefs.current[eventType][index]?.scrollTop || 0
    scrollRefs.current[eventType].forEach((ref, i) => {
      if (ref && i !== index) {
        ref.scrollTop = scrollTop
      }
    })
  }

  // Group events by type
  const eventsByType: Record<EventType, TimelineEvent[]> = {
    network: events.filter(e => e.type === 'network'),
    console: events.filter(e => e.type === 'console'),
    token: events.filter(e => e.type === 'token')
  }

  const currentEvents = eventsByType[selectedEventType]

  const getIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'network':
        return <Network className="w-4 h-4 text-blue-600" />
      case 'console':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'token':
        return <Key className="w-4 h-4 text-green-600" />
      default:
        return null
    }
  }

  const getTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'network':
        return event.data.url || 'Network Request'
      case 'console':
        return event.data.message || 'Console Error'
      case 'token':
        return `${event.data.token_type || 'Token'} Event`
      default:
        return 'Event'
    }
  }

  const getAvailableFields = (event: TimelineEvent) => {
    const baseFields = ['details']

    switch (event.type) {
      case 'network':
        return [...baseFields, 'headers', 'request', 'response', 'timing']
      case 'console':
        return [...baseFields, 'stack', 'context']
      case 'token':
        return [...baseFields, 'security', 'metadata']
      default:
        return baseFields
    }
  }

  const getFieldDisplayName = (field: string) => {
    const fieldNames: { [key: string]: string } = {
      details: 'Overview',
      headers: 'Headers',
      request: 'Request',
      response: 'Response',
      timing: 'Timing',
      stack: 'Stack Trace',
      context: 'Context',
      security: 'Security',
      metadata: 'Metadata'
    }
    return fieldNames[field] || field
  }

  const renderDetailedContent = (event: TimelineEvent, selectedField: string) => {
    switch (event.type) {
      case 'network':
        return (
          <RequestDetailContent
            request={event.data}
            selectedField={selectedField}
            settings={{}}
          />
        )
      case 'console':
        return (
          <ErrorDetailContent
            error={event.data}
            selectedField={selectedField}
          />
        )
      case 'token':
        return (
          <TokenDetailContent
            tokenEvent={event.data}
            selectedField={selectedField}
            showFullTokenHash={true}
            settings={{}}
          />
        )
      default:
        return (
          <div className="p-4 text-gray-500 text-sm">
            No detailed view available for this event type.
          </div>
        )
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(error => {
      console.warn('Failed to copy to clipboard:', error)
    })
  }

  const renderEventPanel = (event: TimelineEvent, index: number) => {
    const selectedField = selectedFields[selectedEventType][index]
    const availableFields = getAvailableFields(event)

    return (
      <div className="h-full flex flex-col min-h-0">
        {/* Event Header */}
        <div className="flex-shrink-0 p-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              {getIcon(event)}
              <span className="text-xs font-medium text-gray-900">
                Slot {index + 1}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => copyToClipboard(JSON.stringify(event.data, null, 2))}
                className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Copy event data"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => onRemoveFromCompare(event.id)}
                className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                title="Remove from compare"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="mb-1">
            <h3 className="text-xs font-medium text-gray-900 truncate" title={getTitle(event)}>
              {getTitle(event)}
            </h3>
            <div className="text-xs text-gray-500">
              {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Field Selection Tabs */}
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => (
              <button
                key={field}
                onClick={() => {
                  const newSelectedFields = { ...selectedFields }
                  newSelectedFields[selectedEventType][index] = field
                  setSelectedFields(newSelectedFields)
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedField === field
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getFieldDisplayName(field)}
              </button>
            ))}
          </div>
        </div>

        {/* Event Content */}
        <div
          ref={el => scrollRefs.current[selectedEventType][index] = el}
          className="flex-1 overflow-y-auto min-h-0 p-2"
          onScroll={() => handleScroll(index, selectedEventType)}
        >
          {renderDetailedContent(event, selectedField)}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-[98%] h-[95%] flex flex-col max-w-none border border-gray-200">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-bold text-gray-900">Compare Events</h2>

              {/* Event Type Selector */}
              <div className="flex items-center space-x-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                {(['network', 'console', 'token'] as EventType[]).map((eventType) => (
                  <button
                    key={eventType}
                    onClick={() => setSelectedEventType(eventType)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedEventType === eventType
                        ? eventType === 'network' ? 'bg-blue-100 text-blue-700'
                        : eventType === 'console' ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {eventType === 'network' && <Network className="w-4 h-4" />}
                    {eventType === 'console' && <AlertTriangle className="w-4 h-4" />}
                    {eventType === 'token' && <Key className="w-4 h-4" />}
                    <span className="capitalize">{eventType}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {eventsByType[eventType].length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSyncScroll(!syncScroll)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    syncScroll
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Sync Scroll</span>
                </button>
                <div className="text-sm text-gray-500">
                  {currentEvents.length} of 4 slots filled
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 p-2 bg-gray-100 min-h-0">
          {Array.from({ length: 4 }, (_, index) => {
            const event = currentEvents[index]
            if (event) {
              return (
                <div key={event.id} className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white min-h-0 h-full">
                  {renderEventPanel(event, index)}
                </div>
              )
            } else {
              return (
                <div key={`empty-${selectedEventType}-${index}`} className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center min-h-0 h-full">
                  <div className="text-center text-gray-400">
                    <div className="text-sm font-medium">Slot {index + 1}</div>
                    <div className="text-xs">
                      {selectedEventType === 'network' && 'Network'}
                      {selectedEventType === 'console' && 'Console'}
                      {selectedEventType === 'token' && 'Token'}
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}
