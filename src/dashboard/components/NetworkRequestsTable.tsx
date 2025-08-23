import React from 'react';

interface NetworkRequest {
  method: string;
  url: string;
  status: number;
  payload_size?: number;
  requestSize?: number;
  responseSize?: number;
  request_size?: number; // Database field name
  response_size?: number; // Database field name
  timestamp: string;
  headers?: any;
  request_headers?: any;
  response_headers?: any;
  requestBody?: string;
  responseBody?: string;
  request_body?: string; // Database field name
  response_body?: string; // Database field name
  response_time?: number;
  time_taken?: number;
  duration?: number;
  performanceMetrics?: any; // Parsed performance timing data object
}

interface NetworkRequestsTableProps {
  requests: NetworkRequest[];
  totalRequests: number;
  totalFilteredRequests: number;
  currentPage: number;
  totalPages: number;
  requestsPerPage: number;
  onPageChange: (page: number) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterMethod: string;
  onMethodFilterChange: (method: string) => void;
  onDetailClick: (request: NetworkRequest) => void;
  selectedRequest?: NetworkRequest | null;
}

export const NetworkRequestsTable: React.FC<NetworkRequestsTableProps> = ({
  requests,
  totalRequests,
  totalFilteredRequests,
  currentPage,
  totalPages,
  requestsPerPage,
  onPageChange,
  onSort,
  sortConfig,
  searchTerm,
  onSearchChange,
  filterMethod,
  onMethodFilterChange,
  onDetailClick,
  selectedRequest
}) => {
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;

  const clearFilters = () => {
    onSearchChange('');
    onMethodFilterChange('all');
  };

  // Helper function to check if a request is selected
  const isRequestSelected = (request: NetworkRequest): boolean => {
    if (!selectedRequest) return false;

    // Compare key properties to determine if it's the same request
    return (
      request.url === selectedRequest.url &&
      request.method === selectedRequest.method &&
      request.timestamp === selectedRequest.timestamp &&
      request.status === selectedRequest.status
    );
  };

  // Helper function to extract response time with performance metrics as primary source
  // Helper function to get size display with multiple fallback options
  const getSizeDisplay = (request: NetworkRequest): string => {
    // Method 1: Use payload_size if available (most reliable)
    if (request.payload_size && request.payload_size > 0) {
      return `${Math.round(request.payload_size / 1024)}KB`;
    }
    
    // Method 2: Calculate from separate size fields (try both naming conventions)
    const requestSize = request.requestSize || request.request_size || 0;
    const responseSize = request.responseSize || request.response_size || 0;
    const totalSize = requestSize + responseSize;
    
    if (totalSize > 0) {
      return `${Math.round(totalSize / 1024)}KB`;
    }
    
    // Method 3: Estimate from body content if available (try both naming conventions)
    let estimatedSize = 0;
    
    const requestBody = request.requestBody || request.request_body;
    if (requestBody) {
      estimatedSize += new Blob([requestBody]).size;
    }
    
    const responseBody = request.responseBody || request.response_body;
    if (responseBody) {
      estimatedSize += new Blob([responseBody]).size;
    }
    
    if (estimatedSize > 0) {
      return `~${Math.round(estimatedSize / 1024)}KB`;
    }
    
    // Method 4: Estimate from headers if available
    if (request.headers) {
      try {
        const headerStr = typeof request.headers === 'string' ? request.headers : JSON.stringify(request.headers);
        const headerSize = new Blob([headerStr]).size;
        if (headerSize > 100) { // Only show if meaningful size
          return `~${Math.round(headerSize / 1024)}KB`;
        }
      } catch (e) {
        // Ignore header size calculation errors
      }
    }
    
    // Fallback: Show dash if no size data available
    return '-';
  };

  const getResponseTime = (request: NetworkRequest): string => {
    // First try to get performance metrics total time (already parsed object from background)
    if (request.performanceMetrics && typeof request.performanceMetrics === 'object') {
      const totalTime = request.performanceMetrics.totalTime;
      if (totalTime && typeof totalTime === 'number') {
        return `${Math.round(totalTime)}ms`;
      }
    }

    // Fallback to existing logic (Date.now() based timing)
    if (request.duration) return `${request.duration}ms`;
    if (request.response_time) return `${request.response_time}ms`;
    if (request.time_taken) return `${request.time_taken}ms`;

    return 'N/A';
  };

  const getHeaderPreview = (request: NetworkRequest): string => {
    try {
      let requestHeaders: any = {};
      let responseHeaders: any = {};

      // Use same robust header parsing logic as detail view
      if (request.headers) {
        const headerData = typeof request.headers === 'string' ? JSON.parse(request.headers) : request.headers;
        requestHeaders = headerData.request || {};
        responseHeaders = headerData.response || {};
      }
      // Fallback to old format
      else {
        if (request.request_headers) {
          requestHeaders = typeof request.request_headers === 'string' ? JSON.parse(request.request_headers) : request.request_headers;
        }
        if (request.response_headers) {
          responseHeaders = typeof request.response_headers === 'string' ? JSON.parse(request.response_headers) : request.response_headers;
        }
      }

      // Combine both request and response headers for preview
      const allHeaders: any = { ...requestHeaders, ...responseHeaders };

      // Priority headers to show in preview
      const priorityHeaders = ['content-type', 'authorization', 'accept', 'user-agent', 'x-api-key'];

      for (const priority of priorityHeaders) {
        if (allHeaders[priority]) {
          const value = String(allHeaders[priority]);
          return `${priority}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`;
        }
      }

      // If no priority headers, show first available header
      const firstHeader = Object.entries(allHeaders)[0];
      if (firstHeader) {
        const value = String(firstHeader[1]);
        return `${firstHeader[0]}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`;
      }

      return 'No headers';
    } catch (e) {
      console.error('Error parsing headers for preview:', e);
      return 'Invalid headers';
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Network Requests</h2>
          <p className="text-xs text-gray-500 mt-1">Global requests from all tabs (Popup shows current tab only)</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalFilteredRequests > 0 && (
              `Showing ${indexOfFirstRequest + 1}-${Math.min(indexOfLastRequest, totalFilteredRequests)} of ${totalFilteredRequests}`
            )}
            {totalRequests > 0 && totalFilteredRequests !== totalRequests && (
              ` (filtered from ${totalRequests})`
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
              placeholder="Search by URL or method..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Method Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Method:</label>
          <select
            value={filterMethod}
            onChange={(e) => onMethodFilterChange(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(searchTerm || filterMethod !== 'all') && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      {requests.length > 0 ? (
        <div className="overflow-hidden">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
                    onClick={() => onSort('method')}
                  >
                    <div className="flex items-center">
                      Method
                      {sortConfig.key === 'method' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-1/3"
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
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-16"
                    onClick={() => onSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortConfig.key === 'status' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-16"
                    onClick={() => onSort('requestSize')}
                  >
                    <div className="flex items-center">
                      Size
                      {(sortConfig.key === 'requestSize' || sortConfig.key === 'payload_size') && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
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
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Headers Preview
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
                    onClick={() => onSort('duration')}
                  >
                    <div className="flex items-center">
                      Response Time
                      {(sortConfig.key === 'duration' || sortConfig.key === 'response_time') && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request, index) => {
                  const isSelected = isRequestSelected(request);
                  return (
                    <tr
                      key={index}
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                      onDoubleClick={() => onDetailClick(request)}
                      title={isSelected ? "Currently viewing in detail panel - Double-click to refresh" : "Double-click to view detailed information"}
                    >
                    <td className="px-3 py-3 whitespace-nowrap w-20">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        request.method === 'POST' ? 'bg-green-100 text-green-800' :
                        request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.method}
                      </span>
                    </td>
                    <td className="px-3 py-3 w-1/3">
                      <div className={`text-sm truncate max-w-sm flex items-center ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-900'}`} title={request.url}>
                        {isSelected && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                        )}
                        {request.url}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap w-16">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-800' :
                        request.status >= 300 && request.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                        request.status >= 400 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 w-16">
                      {getSizeDisplay(request)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 w-20">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 w-1/4">
                      <div className="truncate max-w-xs">
                        {getHeaderPreview(request)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 w-20">
                      {getResponseTime(request)}
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
                  Showing <span className="font-medium">{indexOfFirstRequest + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastRequest, totalFilteredRequests)}</span> of{' '}
                  <span className="font-medium">{totalFilteredRequests}</span> results
                  {totalRequests > 0 && totalFilteredRequests !== totalRequests && (
                    <span className="text-gray-500"> (filtered from {totalRequests})</span>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterMethod !== 'all'
              ? 'Try adjusting your search criteria or filters'
              : 'Network requests will appear here when they are captured'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default NetworkRequestsTable;
