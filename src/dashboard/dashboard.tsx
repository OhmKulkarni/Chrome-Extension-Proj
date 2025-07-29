// src/dashboard/dashboard.tsx
// This file contains the React component for the Chrome extension dashboard.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface DashboardData {
  totalTabs: number;
  extensionEnabled: boolean;
  lastActivity: string;
  networkRequests: any[];
  totalRequests: number;
  consoleErrors: any[];
  totalErrors: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    totalTabs: 0,
    extensionEnabled: true,
    lastActivity: 'Never',
    networkRequests: [],
    totalRequests: 0,
    consoleErrors: [],
    totalErrors: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Console errors state
  const [currentErrorPage, setCurrentErrorPage] = useState(1);
  const [errorsPerPage] = useState(10);
  const [errorSortConfig, setErrorSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [errorSearchTerm, setErrorSearchTerm] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get tabs count
      const tabs = await chrome.tabs.query({});
      
      // Get storage data
      const storageData = await chrome.storage.sync.get(['extensionEnabled', 'lastActivity']);
      
      // Get network requests from background storage - request more for pagination
      const networkData = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getNetworkRequests', limit: 100 }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Dashboard: Error getting network requests:', chrome.runtime.lastError);
            resolve({ requests: [], total: 0 });
          } else {
            resolve(response || { requests: [], total: 0 });
          }
        });
      });

      // Get console errors from background storage
      const errorData = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getConsoleErrors', limit: 100 }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Dashboard: Error getting console errors:', chrome.runtime.lastError);
            resolve({ errors: [], total: 0 });
          } else {
            resolve(response || { errors: [], total: 0 });
          }
        });
      });
      
      // Calculate pagination
      const totalRequests = networkData.total || 0;
      const totalErrors = errorData.total || 0;
      
      setData({
        totalTabs: tabs.length,
        extensionEnabled: storageData.extensionEnabled ?? true,
        lastActivity: storageData.lastActivity 
          ? new Date(storageData.lastActivity).toLocaleString()
          : 'Never',
        networkRequests: networkData.requests || [],
        totalRequests: totalRequests,
        consoleErrors: errorData.errors || [],
        totalErrors: totalErrors
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    loadDashboardData();
  };

  const clearData = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete all recorded network requests and reset all tab counters.\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (confirmed) {
      try {
        setLoading(true);
        
        // Send message to background script to clear all data
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'clearAllData' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Dashboard: Error clearing data:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else if (response?.success) {
              console.log('Dashboard: Data cleared successfully');
              resolve();
            } else {
              reject(new Error('Failed to clear data'));
            }
          });
        });
        
        // Reset local state
        setData({
          totalTabs: data.totalTabs,
          extensionEnabled: data.extensionEnabled,
          lastActivity: data.lastActivity,
          networkRequests: [],
          totalRequests: 0,
          consoleErrors: [],
          totalErrors: 0
        });
        
        setCurrentPage(1);
        
        // Show success message
        alert('✅ All network request data and popup counters have been cleared successfully.');
        
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('❌ Failed to clear data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Pagination functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredPages) {
      setCurrentPage(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalFilteredPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Calculate current page data with sorting and filtering
  const getFilteredAndSortedRequests = () => {
    let filteredRequests = [...data.networkRequests];
    
    // Apply search filter
    if (searchTerm) {
      filteredRequests = filteredRequests.filter(request =>
        request.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.method && request.method.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply method filter
    if (filterMethod !== 'all') {
      filteredRequests = filteredRequests.filter(request => 
        request.method && request.method.toLowerCase() === filterMethod.toLowerCase()
      );
    }
    
    // Apply sorting
    filteredRequests.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'timestamp') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      if (sortConfig.key === 'status' || sortConfig.key === 'payload_size') {
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String comparison
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredRequests;
  };

  const filteredAndSortedRequests = getFilteredAndSortedRequests();
  const totalFilteredRequests = filteredAndSortedRequests.length;
  const totalFilteredPages = Math.ceil(totalFilteredRequests / requestsPerPage);
  
  // Calculate current page data
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredAndSortedRequests.slice(indexOfFirstRequest, indexOfLastRequest);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMethod, totalFilteredPages]);

  // Generate page numbers for pagination (Google-style)
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 7;
    const totalPages = totalFilteredPages;
    
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

  // Console Errors filtering and sorting
  const getFilteredAndSortedErrors = () => {
    let filteredErrors = [...data.consoleErrors];
    
    // Apply search filter
    if (errorSearchTerm) {
      filteredErrors = filteredErrors.filter(error =>
        error.message.toLowerCase().includes(errorSearchTerm.toLowerCase()) ||
        (error.url && error.url.toLowerCase().includes(errorSearchTerm.toLowerCase()))
      );
    }
    
    // Apply severity filter
    if (filterSeverity !== 'all') {
      filteredErrors = filteredErrors.filter(error => 
        error.severity && error.severity.toLowerCase() === filterSeverity.toLowerCase()
      );
    }
    
    // Apply sorting
    filteredErrors.sort((a, b) => {
      const aValue = a[errorSortConfig.key];
      const bValue = b[errorSortConfig.key];
      
      if (errorSortConfig.key === 'timestamp') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return errorSortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return errorSortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return errorSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredErrors;
  };

  const filteredAndSortedErrors = getFilteredAndSortedErrors();
  const totalFilteredErrors = filteredAndSortedErrors.length;
  const totalFilteredErrorPages = Math.ceil(totalFilteredErrors / errorsPerPage);
  
  // Calculate current page data for errors
  const indexOfLastError = currentErrorPage * errorsPerPage;
  const indexOfFirstError = indexOfLastError - errorsPerPage;
  const currentErrors = filteredAndSortedErrors.slice(indexOfFirstError, indexOfLastError);

  // Handle error sorting
  const handleErrorSort = (key: string) => {
    setErrorSortConfig({
      key,
      direction: errorSortConfig.key === key && errorSortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    setCurrentErrorPage(1); // Reset to first page when sorting
  };

  // Error pagination functions
  const handleErrorPageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredErrorPages) {
      setCurrentErrorPage(page);
    }
  };

  const handleErrorPrevious = () => {
    if (currentErrorPage > 1) {
      setCurrentErrorPage(currentErrorPage - 1);
    }
  };

  const handleErrorNext = () => {
    if (currentErrorPage < totalFilteredErrorPages) {
      setCurrentErrorPage(currentErrorPage + 1);
    }
  };

  // Reset error pagination when filters change
  useEffect(() => {
    setCurrentErrorPage(1);
  }, [errorSearchTerm, filterSeverity, totalFilteredErrorPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Web App Monitor Dashboard</h1>
              <p className="text-gray-600">Monitor and analyze your client-side web applications</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refreshData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Refresh Data
              </button>
              <button
                onClick={clearData}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tabs</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalTabs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  data.extensionEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white font-bold">
                    {data.extensionEnabled ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Extension Status</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.extensionEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🕒</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Last Activity</p>
                <p className="text-sm font-semibold text-gray-900">{data.lastActivity}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🌐</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Network Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">⚠️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Console Errors</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalErrors}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Requests Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Network Requests</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {totalFilteredRequests > 0 && (
                    `Showing ${indexOfFirstRequest + 1}-${Math.min(indexOfLastRequest, totalFilteredRequests)} of ${totalFilteredRequests}`
                  )}
                  {totalFilteredRequests !== data.totalRequests && (
                    ` (filtered from ${data.totalRequests})`
                  )}
                </span>
                {totalFilteredPages > 1 && (
                  <span className="text-sm text-gray-500">Page {currentPage} of {totalFilteredPages}</span>
                )}
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Method Filter */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Method:</label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
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
                  onClick={() => {
                    setSearchTerm('');
                    setFilterMethod('all');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {data.networkRequests.length > 0 ? (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('method')}
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
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('url')}
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
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('status')}
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
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('payload_size')}
                        >
                          <div className="flex items-center">
                            Size
                            {sortConfig.key === 'payload_size' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('timestamp')}
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
                      {currentRequests.map((request, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={request.url}>
                              {request.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-800' :
                              request.status >= 300 && request.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                              request.status >= 400 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.payload_size ? `${Math.round(request.payload_size / 1024)}KB` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalFilteredPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstRequest + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(indexOfLastRequest, totalFilteredRequests)}</span> of{' '}
                        <span className="font-medium">{totalFilteredRequests}</span> results
                        {totalFilteredRequests !== data.totalRequests && (
                          <span className="text-gray-500"> (filtered from {data.totalRequests})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {getPageNumbers().map((pageNum, index) => (
                          <button
                            key={index}
                            onClick={() => typeof pageNum === 'number' ? handlePageChange(pageNum) : undefined}
                            disabled={pageNum === '...'}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              pageNum === currentPage
                                ? 'bg-blue-500 text-white'
                                : pageNum === '...'
                                ? 'text-gray-500 cursor-default'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={handleNext}
                        disabled={currentPage === totalFilteredPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === totalFilteredPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🌐</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No network requests yet</h3>
                <p className="text-gray-500">Network requests will appear here as they are captured.</p>
              </div>
            )}
          </div>
        </div>

        {/* Console Errors Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Console Errors</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {totalFilteredErrors > 0 && (
                    `Showing ${indexOfFirstError + 1}-${Math.min(indexOfLastError, totalFilteredErrors)} of ${totalFilteredErrors}`
                  )}
                  {totalFilteredErrors !== data.totalErrors && (
                    ` (filtered from ${data.totalErrors})`
                  )}
                </span>
                {totalFilteredErrorPages > 1 && (
                  <span className="text-sm text-gray-500">Page {currentErrorPage} of {totalFilteredErrorPages}</span>
                )}
              </div>
            </div>

            {/* Search and Filter Controls for Errors */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
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
                    value={errorSearchTerm}
                    onChange={(e) => setErrorSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Severity Filter */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Severity:</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Severities</option>
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              
              {/* Clear Filters */}
              {(errorSearchTerm || filterSeverity !== 'all') && (
                <button
                  onClick={() => {
                    setErrorSearchTerm('');
                    setFilterSeverity('all');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {data.consoleErrors.length > 0 ? (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('severity')}
                        >
                          <div className="flex items-center">
                            Severity
                            {errorSortConfig.key === 'severity' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('message')}
                        >
                          <div className="flex items-center">
                            Message
                            {errorSortConfig.key === 'message' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('url')}
                        >
                          <div className="flex items-center">
                            URL
                            {errorSortConfig.key === 'url' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('timestamp')}
                        >
                          <div className="flex items-center">
                            Time
                            {errorSortConfig.key === 'timestamp' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentErrors.map((error, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              error.severity === 'error' ? 'bg-red-100 text-red-800' :
                              error.severity === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                              error.severity === 'info' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {error.severity || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-md" title={error.message}>
                              {error.message}
                            </div>
                            {error.stack_trace && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-md" title={error.stack_trace}>
                                Stack: {error.stack_trace.split('\n')[0]}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={error.url}>
                              {error.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls for Errors */}
                {totalFilteredErrorPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstError + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(indexOfLastError, totalFilteredErrors)}</span> of{' '}
                        <span className="font-medium">{totalFilteredErrors}</span> results
                        {totalFilteredErrors !== data.totalErrors && (
                          <span className="text-gray-500"> (filtered from {data.totalErrors})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={handleErrorPrevious}
                        disabled={currentErrorPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentErrorPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(5, totalFilteredErrorPages))].map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleErrorPageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                pageNum === currentErrorPage
                                  ? 'bg-blue-500 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={handleErrorNext}
                        disabled={currentErrorPage === totalFilteredErrorPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentErrorPage === totalFilteredErrorPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No console errors yet</h3>
                <p className="text-gray-500">Console errors will appear here as they are captured.</p>
              </div>
            )}
          </div>
        </div>

        {/* Feature Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Analyze Current Tab
                </button>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Export Data
                </button>
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Clear Cache
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Extension activated</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Settings updated</p>
                    <p className="text-xs text-gray-500">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Data exported</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const container = document.getElementById('dashboard-root');
if (container) {
  const root = createRoot(container);
  root.render(<Dashboard />);
}