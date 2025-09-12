import React from 'react'
import { useTokenData } from './hooks/useTokenData'
import { Pagination } from '../../shared/components/Pagination'

interface TokenDashboardProps {
  onTokenDetail?: (token: any) => void
}

export const TokenDashboard: React.FC<TokenDashboardProps> = ({ onTokenDetail }) => {
  const {
    tokens,
    totalTokens,
    loading,
    error,
    pagination,
    actions
  } = useTokenData()

  const _handleRowDoubleClick = (token: any) => {
    if (onTokenDetail) {
      onTokenDetail(token)
    }
  }

  const _handlePageChange = (page: number) => {
    actions.loadPage(page)
  }

  const _handlePrevious = () => {
    if (pagination.currentPage > 1) {
      actions.loadPage(pagination.currentPage - 1)
    }
  }

  const _handleNext = () => {
    if (pagination.currentPage < pagination.totalPages) {
      actions.loadPage(pagination.currentPage + 1)
    }
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔑</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Token Events</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={actions.refresh}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          <span className="ml-2 text-gray-600">Loading token events...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Token Events</h2>
            <p className="text-xs text-gray-500 mt-1">
              Authentication events from all tabs (auth, login, refresh)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {totalTokens > 0 && (
                `Total: ${totalTokens.toLocaleString()} events`
              )}
            </span>
            {pagination.totalPages > 1 && (
              <span className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            )}
            <button
              onClick={actions.refresh}
              disabled={loading}
              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                loading
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Simple Table */}
        {tokens.length > 0 ? (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tokens.map((token, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onDoubleClick={() => handleRowDoubleClick(token)}
                      title="Double-click to view detailed information"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          🔑 {token.type || 'Token Event'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs" title={token.url}>
                          {token.url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {token.method || 'GET'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (token.status || 0) >= 200 && (token.status || 0) < 300 ? 'bg-green-100 text-green-800' :
                          (token.status || 0) >= 300 && (token.status || 0) < 400 ? 'bg-yellow-100 text-yellow-800' :
                          (token.status || 0) >= 400 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {token.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(token.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={totalTokens}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={handlePageChange}
              onPrevious={handlePrevious}
              onNext={handleNext}
              loading={loading}
            />
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No token events yet</h3>
            <p className="text-gray-500">Token events will appear here when authentication activities are detected.</p>
          </div>
        )}
      </div>
    </div>
  )
}
