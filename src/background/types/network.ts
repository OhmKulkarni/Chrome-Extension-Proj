/**
 * Network Types - Core data structures for network request tracking
 */

export interface NetworkRequest {
  id: string
  url: string
  method: string
  timestamp: number
  endTimestamp?: number
  duration?: number
  tabId: number
  frameId: number
  type: chrome.webRequest.ResourceType
  headers: Record<string, string>
  body?: string
  domain: string
  mainFrame: boolean
  response?: NetworkResponse
  error?: string
  completed?: boolean
}

export interface NetworkResponse {
  requestId: string
  statusCode: number
  statusLine?: string
  headers: Record<string, string>
  timestamp: number
  body?: string
}

export interface NetworkEvent {
  type: 'request_started' | 'response_received' | 'request_completed' | 'request_error'
  request: NetworkRequest
  response?: NetworkResponse
  error?: string
}

export interface NetworkStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  domains: Record<string, number>
  methods: Record<string, number>
  statusCodes: Record<number, number>
}

export interface NetworkFilter {
  domain?: string
  method?: string
  statusCode?: number
  timeRange?: {
    start: number
    end: number
  }
  search?: string
}
