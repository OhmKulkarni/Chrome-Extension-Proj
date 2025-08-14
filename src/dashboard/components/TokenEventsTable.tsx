import React from 'react';

interface TokenEvent {
  type: string;
  tokenType: string;
  url?: string;
  method?: string;
  status?: number;
  valueHash?: string;
  expiry?: string;
  timestamp: string;
}

interface TokenEventsTableProps {
  events: TokenEvent[];
  totalEvents: number;
  totalFilteredEvents: number;
  currentPage: number;
  totalPages: number;
  eventsPerPage: number;
  onPageChange: (page: number) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterType: string;
  onTypeFilterChange: (type: string) => void;
  onDetailClick: (event: TokenEvent) => void;
  showFullTokenHash: boolean;
  onToggleTokenHash: () => void;
}

export const TokenEventsTable: React.FC<TokenEventsTableProps> = ({
  events,
  totalEvents,
  totalFilteredEvents,
  currentPage,
  totalPages,
  eventsPerPage,
  onPageChange,
  onSort,
  sortConfig,
  searchTerm,
  onSearchChange,
  filterType,
  onTypeFilterChange,
  onDetailClick,
  showFullTokenHash,
  onToggleTokenHash
}) => {
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;

  const clearFilters = () => {
    onSearchChange('');
    onTypeFilterChange('all');
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'acquire': return 'bg-green-100 text-green-800';
      case 'use': return 'bg-blue-100 text-blue-800';
      case 'refresh': return 'bg-yellow-100 text-yellow-800';
      case 'expire': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatHash = (hash: string): string => {
    if (!hash) return 'N/A';
    if (showFullTokenHash) return hash;
    return hash.length > 12 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}` : hash;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Token Events</h2>
          <p className="text-xs text-gray-500 mt-1">Authentication token lifecycle events from all tabs</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {totalFilteredEvents > 0 && (
              `Showing ${indexOfFirstEvent + 1}-${Math.min(indexOfLastEvent, totalFilteredEvents)} of ${totalFilteredEvents}`
            )}
            {totalEvents > 0 && totalFilteredEvents !== totalEvents && (
              ` (filtered from ${totalEvents})`
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
              placeholder="Search by URL or token type..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        
        {/* Type Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <select
            value={filterType}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Types</option>
            <option value="acquire">Acquire</option>
            <option value="use">Use</option>
            <option value="refresh">Refresh</option>
            <option value="expire">Expire</option>
          </select>
        </div>

        {/* Token Hash Toggle */}
        <button
          onClick={onToggleTokenHash}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {showFullTokenHash ? 'Hide Full Hash' : 'Show Full Hash'}
        </button>
        
        {/* Clear Filters */}
        {(searchTerm || filterType !== 'all') && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {/* Table */}
      {events.length > 0 ? (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => onSort('type')}
                  >
                    <div className="flex items-center">
                      Event Type
                      {sortConfig.key === 'type' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => onSort('tokenType')}
                  >
                    <div className="flex items-center">
                      Token Type
                      {sortConfig.key === 'tokenType' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value Hash
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onDoubleClick={() => onDetailClick(event)}
                    title="Double-click to view detailed information"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(event.type)}`}>
                        {event.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.tokenType || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-xs" title={event.url}>
                        {event.url || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {formatHash(event.valueHash || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstEvent + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastEvent, totalFilteredEvents)}</span> of{' '}
                  <span className="font-medium">{totalFilteredEvents}</span> results
                  {totalEvents > 0 && totalFilteredEvents !== totalEvents && (
                    <span className="text-gray-500"> (filtered from {totalEvents})</span>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No token events found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search criteria or filters'
              : 'Token events will appear here when they are captured'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenEventsTable;
