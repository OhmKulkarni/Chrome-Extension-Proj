import React from 'react'
import { useErrorData } from './hooks/useErrorData'
import { ErrorTable } from './components/ErrorTable'
import { ErrorFilters } from './components/ErrorFilters'
import { Pagination } from '../../shared/components/Pagination'

interface ErrorDashboardProps {
  onErrorDetail?: (error: any) => void
}

export const ErrorDashboard: React.FC<ErrorDashboardProps> = ({ onErrorDetail }) => {
  const {
    errors,
    totalErrors,
    loading,
    error,
    pagination,
    sortConfig,
    filters,
    actions
  } = useErrorData()

  const _handleRowDoubleClick = (errorItem: any) => {
    if (onErrorDetail) {
      onErrorDetail(errorItem)
    }
  }

  const _handleClearFilters = () => {
    actions.setFilters({ searchTerm: '', severity: 'all' })
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
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Console Errors</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={actions.refresh}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
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
            <h2 className="text-lg font-semibold text-gray-900">Console Errors</h2>
            <p className="text-xs text-gray-500 mt-1">
              JavaScript errors and warnings from monitored tabs
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {totalErrors > 0 && (
                `Total: ${totalErrors.toLocaleString()} errors`
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
        <ErrorFilters
          searchTerm={filters.searchTerm}
          severityFilter={filters.severity}
          onSearchChange={(term) => actions.setFilters({ searchTerm: term })}
          onSeverityFilterChange={(severity) => actions.setFilters({ severity })}
          onClearFilters={handleClearFilters}
          totalItems={totalErrors}
          filteredItems={errors.length}
        />

        {/* Table */}
        <ErrorTable
          errors={errors}
          sortConfig={sortConfig}
          onSort={actions.setSort}
          onRowDoubleClick={handleRowDoubleClick}
          loading={loading}
        />

        {/* Pagination */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={totalErrors}
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
