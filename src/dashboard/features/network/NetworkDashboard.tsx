import React from 'react'
import { useNetworkData } from './hooks/useNetworkData'
import { NetworkTable } from './components/NetworkTable'
import { NetworkFilters } from './components/NetworkFilters'
import { Pagination } from '../../shared/components/Pagination'

interface NetworkDashboardProps {
  onRequestDetail?: (request: any) => void
}

export const NetworkDashboard: React.FC<NetworkDashboardProps> = ({ onRequestDetail }) => {
  const {
    requests,
    totalRequests,
    loading,
    error,
    pagination,
    sortConfig,
    filters,
    actions
  } = useNetworkData()

  const handleRowDoubleClick = (request: any) => {
    if (onRequestDetail) {
      onRequestDetail(request)
    }
  }

  const handleClearFilters = () => {
    actions.setFilters({ searchTerm: '', method: 'all' })
  }

  const handlePageChange = (page: number) => {
    actions.loadPage(page)
  }

  const handlePrevious = () => {
    if (pagination.currentPage > 1) {
      actions.loadPage(pagination.currentPage - 1)
    }
  }

  const handleNext = () => {
    if (pagination.currentPage < pagination.totalPages) {
      actions.loadPage(pagination.currentPage + 1)
    }
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Network Requests</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={actions.refresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
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
            <h2 className="text-lg font-semibold text-gray-900">Network Requests</h2>
            <p className="text-xs text-gray-500 mt-1">
              Real-time network monitoring from all tabs
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {totalRequests > 0 && (
                `Total: ${totalRequests.toLocaleString()} requests`
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

        {/* Filters */}
        <NetworkFilters
          searchTerm={filters.searchTerm}
          methodFilter={filters.method}
          onSearchChange={(term) => actions.setFilters({ searchTerm: term })}
          onMethodFilterChange={(method) => actions.setFilters({ method })}
          onClearFilters={handleClearFilters}
          totalItems={totalRequests}
          filteredItems={requests.length}
        />

        {/* Table */}
        <NetworkTable
          requests={requests}
          sortConfig={sortConfig}
          onSort={actions.setSort}
          onRowDoubleClick={handleRowDoubleClick}
          loading={loading}
        />

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={totalRequests}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          loading={loading}
        />
      </div>
    </div>
  )
}
