import React from 'react'

// Type definitions
interface ConsoleError {
  id?: string;
  message: string;
  url?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warn' | 'info';
  timestamp: string;
  stack_trace?: string;
  stack?: string;
  tab_id?: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface ErrorTableProps {
  errors: ConsoleError[]
  sortConfig: SortConfig
  onSort: (key: string) => void
  onRowDoubleClick: (error: ConsoleError) => void
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

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const getSeverityColor = () => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800'
      case 'warn': return 'bg-yellow-100 text-yellow-800'
      case 'info': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor()}`}>
      {severity || 'unknown'}
    </span>
  )
}

export const ErrorTable: React.FC<ErrorTableProps> = ({ 
  errors, 
  sortConfig, 
  onSort, 
  onRowDoubleClick, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        <span className="ml-2 text-gray-600">Loading console errors...</span>
      </div>
    )
  }

  if (errors.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No console errors yet</h3>
        <p className="text-gray-500">Console errors will appear here once you enable error logging on specific tabs.</p>
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
                onClick={() => onSort('severity')}
              >
                <div className="flex items-center">
                  Severity
                  <SortIcon column="severity" sortConfig={sortConfig} />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('message')}
              >
                <div className="flex items-center">
                  Message
                  <SortIcon column="message" sortConfig={sortConfig} />
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
                onClick={() => onSort('line')}
              >
                <div className="flex items-center">
                  Line:Column
                  <SortIcon column="line" sortConfig={sortConfig} />
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {errors.map((error, index) => (
              <tr 
                key={index} 
                className="hover:bg-gray-50 cursor-pointer"
                onDoubleClick={() => onRowDoubleClick(error)}
                title="Double-click to view detailed information"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <SeverityBadge severity={error.severity} />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-md" title={error.message}>
                    {error.message}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-xs" title={error.url}>
                    {error.url || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {error.line ? `${error.line}:${error.column || 0}` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
