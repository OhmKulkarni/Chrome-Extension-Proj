import React from 'react'

interface ErrorFiltersProps {
  searchTerm: string
  severityFilter: string
  onSearchChange: (term: string) => void
  onSeverityFilterChange: (severity: string) => void
  onClearFilters: () => void
  totalItems: number
  filteredItems: number
}

export const ErrorFilters: React.FC<ErrorFiltersProps> = ({
  searchTerm,
  severityFilter,
  onSearchChange,
  onSeverityFilterChange,
  onClearFilters,
  totalItems,
  filteredItems
}) => {
  const hasActiveFilters = searchTerm || severityFilter !== 'all'

  return (
    <div className="mb-4 space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by message or URL..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        {/* Severity Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => onSeverityFilterChange(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
          >
            <option value="all">All Severities</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
        
        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Filter Status */}
      {hasActiveFilters && (
        <div className="text-sm text-gray-600 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span>
              Showing {filteredItems} of {totalItems} console errors
              {searchTerm && ` matching "${searchTerm}"`}
              {severityFilter !== 'all' && ` with severity ${severityFilter}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
