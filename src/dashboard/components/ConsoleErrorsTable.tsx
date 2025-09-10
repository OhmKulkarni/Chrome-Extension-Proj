import React from 'react';

interface ConsoleError {
  id: string;
  message: string;
  url?: string;
  line?: number;
  column?: number;
  severity: string;
  timestamp: string;
  stack?: string;
}

interface ConsoleErrorsTableProps {
  errors: ConsoleError[];
  totalErrors: number;
  totalFilteredErrors: number;
  currentPage: number;
  totalPages: number;
  errorsPerPage: number;
  onPageChange: (page: number) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterSeverity: string;
  onSeverityFilterChange: (severity: string) => void;
  onDetailClick: (error: ConsoleError) => void;
  selectedError?: ConsoleError | null;
  onViewInTimeline?: (error: ConsoleError) => void;
}

export const ConsoleErrorsTable: React.FC<ConsoleErrorsTableProps> = ({
  errors,
  totalErrors,
  totalFilteredErrors,
  currentPage,
  totalPages,
  errorsPerPage,
  onPageChange,
  onSort,
  sortConfig,
  searchTerm,
  onSearchChange,
  filterSeverity,
  onSeverityFilterChange,
  onDetailClick,
  selectedError,
  onViewInTimeline
}) => {
  const indexOfLastError = currentPage * errorsPerPage;
  const indexOfFirstError = indexOfLastError - errorsPerPage;

  const clearFilters = () => {
    onSearchChange('');
    onSeverityFilterChange('all');
  };

  // Helper function to check if an error is selected
  const isErrorSelected = (error: ConsoleError): boolean => {
    if (!selectedError) return false;

    // Compare key properties to determine if it's the same error
    return (
      error.message === selectedError.message &&
      error.timestamp === selectedError.timestamp &&
      error.url === selectedError.url &&
      error.line === selectedError.line
    );
  };

  const generatePageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Google-style pagination logic
      if (currentPage <= 4) {
        // Show 1-5 ... totalPages
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
        if (totalPages > 5) {
          pageNumbers.push('...');
          pageNumbers.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        // Show 1 ... (totalPages-4)-totalPages
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Show 1 ... (currentPage-1) currentPage (currentPage+1) ... totalPages
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'debug': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Console Errors</h2>
          <p className="text-xs text-gray-500 mt-1">JavaScript errors and console messages from all tabs</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalFilteredErrors > 0 && (
              `Showing ${indexOfFirstError + 1}-${Math.min(indexOfLastError, totalFilteredErrors)} of ${totalFilteredErrors}`
            )}
            {totalErrors > 0 && totalFilteredErrors !== totalErrors && (
              ` (filtered from ${totalErrors})`
            )}
          </span>
          {totalPages > 1 && (
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Severity:</label>
          <select
            value={filterSeverity}
            onChange={(e) => onSeverityFilterChange(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Severities</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(searchTerm || filterSeverity !== 'all') && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      {errors.length > 0 ? (
        <div className="overflow-hidden">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => onSort('severity')}
                  >
                    <div className="flex items-center">
                      Severity
                      {sortConfig.key === 'severity' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => onSort('message')}
                  >
                    <div className="flex items-center">
                      Message
                      {sortConfig.key === 'message' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => onSort('url')}
                  >
                    <div className="flex items-center">
                      URL
                      {sortConfig.key === 'url' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => onSort('timestamp')}
                  >
                    <div className="flex items-center">
                      Time
                      {sortConfig.key === 'timestamp' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="w-24 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {errors.map((error) => {
                  const isSelected = isErrorSelected(error);
                  return (
                    <tr
                      key={error.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100 shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                      onDoubleClick={() => onDetailClick(error)}
                      title={isSelected ? "Currently viewing in detail panel - Double-click to refresh" : "Double-click to view detailed information"}
                    >
                    <td className="w-24 px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(error.severity)}`}>
                        {error.severity || 'unknown'}
                      </span>
                    </td>
                    <td className="w-2/5 px-6 py-4">
                      <div className={`text-sm truncate flex items-center ${isSelected ? 'text-red-900 font-medium' : 'text-gray-900'}`} title={error.message}>
                        {isSelected && (
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                        )}
                        {error.message}
                      </div>
                    </td>
                    <td className="w-1/4 px-6 py-4">
                      <div className="text-sm text-gray-900 truncate" title={error.url}>
                        {error.url}
                      </div>
                    </td>
                    <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="w-24 px-6 py-4 whitespace-nowrap text-center">
                      {onViewInTimeline && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewInTimeline(error);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
                          title="View this error in the timeline"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstError + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastError, totalFilteredErrors)}</span> of{' '}
                  <span className="font-medium">{totalFilteredErrors}</span> results
                  {totalErrors > 0 && totalFilteredErrors !== totalErrors && (
                    <span className="text-gray-500"> (filtered from {totalErrors})</span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'text-gray-300 cursor-not-allowed bg-gray-100'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {generatePageNumbers().map((pageNumber, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNumber === 'number' ? onPageChange(pageNumber) : undefined}
                    disabled={typeof pageNumber === 'string'}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      pageNumber === currentPage
                        ? 'bg-blue-600 text-white'
                        : typeof pageNumber === 'string'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? 'text-gray-300 cursor-not-allowed bg-gray-100'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No errors found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterSeverity !== 'all'
              ? 'Try adjusting your search criteria or filters'
              : 'Console errors will appear here when they are captured'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsoleErrorsTable;
