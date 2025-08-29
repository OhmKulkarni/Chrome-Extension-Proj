import React from 'react'

import { getStandardizedSize } from '../../../utils/sizeUtils';

// Type definitions
interface NetworkRequest {
  id?: string;
  method: string;
  url: string;
  status: number;
  timestamp: string;
  payload_size?: number;
  response_time?: number;
  time_taken?: number;
  headers?: string | object;
  request_headers?: string | object;
  response_headers?: string | object;
  request_body?: string | object;
  response_body?: string | object;
  tab_id?: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface NetworkTableProps {
  requests: NetworkRequest[]
  sortConfig: SortConfig
  onSort: (key: string) => void
  onRowDoubleClick: (request: NetworkRequest) => void
  loading?: boolean
}

const SortIcon: React.FC<{ column: string; sortConfig: SortConfig }> = ({ column, sortConfig }) => {
  if (sortConfig.key !== column) return null
  return (
    <span className="ml-1">
      {sortConfig.direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

const StatusBadge: React.FC<{ status: number }> = ({ status }) => {
  const getStatusColor = () => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800'
    if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-800'
    if (status >= 400) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
      {status}
    </span>
  )
}

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const getMethodColor = () => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800'
      case 'POST': return 'bg-green-100 text-green-800'
      case 'PUT': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'PATCH': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMethodColor()}`}>
      {method}
    </span>
  )
}

export const NetworkTable: React.FC<NetworkTableProps> = ({ 
  requests, 
  sortConfig, 
  onSort, 
  onRowDoubleClick, 
  loading = false 
}) => {
  const parseHeaders = (headers: string | object | undefined) => {
    try {
      if (typeof headers === 'string') {
        const parsed = JSON.parse(headers)
        return { ...parsed.request, ...parsed.response }
      }
      return headers || {}
    } catch {
      return {}
    }
  }

  const getHeaderPreview = (request: NetworkRequest) => {
    try {
      const allHeaders = parseHeaders(request.headers)
      const priorityHeaders = ['content-type', 'authorization', 'accept', 'user-agent', 'x-api-key']
      
      for (const priority of priorityHeaders) {
        if (allHeaders[priority]) {
          const value = String(allHeaders[priority])
          return `${priority}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`
        }
      }
      
      const firstHeader = Object.entries(allHeaders)[0]
      if (firstHeader) {
        const value = String(firstHeader[1])
        return `${firstHeader[0]}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`
      }
      
      return 'No headers'
    } catch {
      return 'Invalid headers'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading network requests...</span>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">🌐</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No network requests yet</h3>
        <p className="text-gray-500">Network requests will appear here once you enable logging on specific tabs.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('method')}
              >
                <div className="flex items-center">
                  Method
                  <SortIcon column="method" sortConfig={sortConfig} />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('url')}
              >
                <div className="flex items-center">
                  URL
                  <SortIcon column="url" sortConfig={sortConfig} />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon column="status" sortConfig={sortConfig} />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('payload_size')}
              >
                <div className="flex items-center">
                  Size
                  <SortIcon column="payload_size" sortConfig={sortConfig} />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('timestamp')}
              >
                <div className="flex items-center">
                  Time
                  <SortIcon column="timestamp" sortConfig={sortConfig} />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Headers Preview
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('response_time')}
              >
                <div className="flex items-center">
                  Response Time
                  <SortIcon column="response_time" sortConfig={sortConfig} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request, index) => (
              <tr 
                key={index} 
                className="hover:bg-gray-50 cursor-pointer" 
                onDoubleClick={() => onRowDoubleClick(request)}
                title="Double-click to view detailed information"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <MethodBadge method={request.method} />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-xs" title={request.url}>
                    {request.url}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(() => {
                    const size = getStandardizedSize(request);
                    return size > 0 ? `${Math.round(size / 1024)}KB` : '-';
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(request.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="truncate max-w-xs">
                    {getHeaderPreview(request)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.response_time ? `${request.response_time}ms` : 
                   request.time_taken ? `${request.time_taken}ms` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
