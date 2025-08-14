import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import TableCarousel from './components/TableCarousel';
import NetworkRequestsTable from './components/NetworkRequestsTable';
import ConsoleErrorsTable from './components/ConsoleErrorsTable';
import TokenEventsTable from './components/TokenEventsTable';
import PerformanceTable from './components/PerformanceTable';
import LazyStatisticsCard from './components/LazyStatisticsCard';

// MEMORY LEAK FIX: Centralized Chrome message handler to prevent response accumulation
const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    // Immediately copy and nullify response to prevent accumulation
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    console.error('Chrome message failed:', error)
    return null
  }
}

const DecomposedDashboard: React.FC = () => {
  // Main state
  const [data, setData] = useState<any>({
    networkRequests: [],
    consoleErrors: [],
    tokenEvents: [],
    totalRequests: 0,
    totalErrors: 0,
    totalTokenEvents: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [tabLoggingEnabled, setTabLoggingEnabled] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string>('');

  // Table carousel state
  const [activeTable, setActiveTable] = useState<'network' | 'errors' | 'tokens' | 'performance'>('network');

  // Network requests state
  const [networkCurrentPage, setNetworkCurrentPage] = useState(1);
  const [networkRequestsPerPage] = useState(50);
  const [networkSearchTerm, setNetworkSearchTerm] = useState('');
  const [networkFilterMethod, setNetworkFilterMethod] = useState('all');
  const [networkSortConfig, setNetworkSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });

  // Console errors state
  const [errorsCurrentPage, setErrorsCurrentPage] = useState(1);
  const [errorsPerPage] = useState(50);
  const [errorSearchTerm, setErrorSearchTerm] = useState('');
  const [errorFilterSeverity, setErrorFilterSeverity] = useState('all');
  const [errorSortConfig, setErrorSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });

  // Token events state
  const [tokenCurrentPage, setTokenCurrentPage] = useState(1);
  const [tokenEventsPerPage] = useState(50);
  const [tokenSearchTerm, setTokenSearchTerm] = useState('');
  const [tokenFilterType, setTokenFilterType] = useState('all');
  const [tokenSortConfig, setTokenSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });
  const [showFullTokenHash, setShowFullTokenHash] = useState(false);

  // Detail viewer state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailViewerType, setDetailViewerType] = useState<'request' | 'error' | 'token'>('request');

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await sendChromeMessage({ action: 'getDashboardData' });
      
      if (response?.success) {
        setData(response.data || {
          networkRequests: [],
          consoleErrors: [],
          tokenEvents: [],
          totalRequests: 0,
          totalErrors: 0,
          totalTokenEvents: 0
        });
      } else {
        console.error('Failed to load dashboard data:', response?.error);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const response = await sendChromeMessage({ action: 'getSettings' });
      if (response?.success) {
        setExtensionEnabled(response.settings?.extensionEnabled ?? true);
        setTabLoggingEnabled(response.settings?.tabLoggingEnabled ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Toggle extension
  const handleExtensionToggle = useCallback(async (enabled: boolean) => {
    try {
      setExtensionEnabled(enabled);
      const response = await sendChromeMessage({ 
        action: 'toggleExtension', 
        enabled 
      });
      
      if (!response?.success) {
        setExtensionEnabled(!enabled); // Revert on failure
        console.error('Failed to toggle extension:', response?.error);
      }
    } catch (error) {
      console.error('Error toggling extension:', error);
      setExtensionEnabled(!enabled); // Revert on error
    }
  }, []);

  // Toggle tab logging
  const handleTabLoggingToggle = useCallback(async (enabled: boolean) => {
    try {
      setTabLoggingEnabled(enabled);
      const response = await sendChromeMessage({
        action: 'updateSetting',
        key: 'tabLoggingEnabled',
        value: enabled
      });

      if (!response?.success) {
        setTabLoggingEnabled(!enabled); // Revert on failure
        console.error('Failed to toggle tab logging:', response?.error);
      }
    } catch (error) {
      console.error('Error toggling tab logging:', error);
      setTabLoggingEnabled(!enabled); // Revert on error
    }
  }, []);

  // Get current domain
  const getCurrentDomain = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        setCurrentDomain(url.hostname);
      }
    } catch (error) {
      console.error('Error getting current domain:', error);
    }
  }, []);

  // Handle sorting for different tables
  const handleNetworkSort = useCallback((key: string) => {
    setNetworkSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setNetworkCurrentPage(1); // Reset to first page when sorting
  }, []);

  const handleErrorSort = useCallback((key: string) => {
    setErrorSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setErrorsCurrentPage(1); // Reset to first page when sorting
  }, []);

  const handleTokenSort = useCallback((key: string) => {
    setTokenSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setTokenCurrentPage(1); // Reset to first page when sorting
  }, []);

  // Handle detail view
  const openDetailViewer = useCallback((item: any, type: 'request' | 'error' | 'token') => {
    setSelectedItem(item);
    setDetailViewerType(type);
  }, []);

  const closeDetailViewer = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Calculate stats for sidebar
  const sidebarStats = {
    totalRequests: data.totalRequests || data.networkRequests.length,
    totalErrors: data.totalErrors || data.consoleErrors.length,
    totalTokens: data.totalTokenEvents || data.tokenEvents.length,
    activeConnections: extensionEnabled ? 1 : 0
  };

  // Calculate pagination for each table
  const networkTotalPages = Math.ceil((data.totalRequests || data.networkRequests.length) / networkRequestsPerPage);
  const errorsTotalPages = Math.ceil((data.totalErrors || data.consoleErrors.length) / errorsPerPage);
  const tokensTotalPages = Math.ceil((data.totalTokenEvents || data.tokenEvents.length) / tokenEventsPerPage);

  // Initialize on mount
  useEffect(() => {
    loadDashboardData();
    loadSettings();
    getCurrentDomain();
  }, [loadDashboardData, loadSettings, getCurrentDomain]);

  // Render current table content
  const renderTableContent = () => {
    switch (activeTable) {
      case 'network':
        return (
          <NetworkRequestsTable
            requests={data.networkRequests}
            totalRequests={data.totalRequests || data.networkRequests.length}
            totalFilteredRequests={data.totalRequests || data.networkRequests.length}
            currentPage={networkCurrentPage}
            totalPages={networkTotalPages}
            requestsPerPage={networkRequestsPerPage}
            onPageChange={setNetworkCurrentPage}
            onSort={handleNetworkSort}
            sortConfig={networkSortConfig}
            searchTerm={networkSearchTerm}
            onSearchChange={setNetworkSearchTerm}
            filterMethod={networkFilterMethod}
            onMethodFilterChange={setNetworkFilterMethod}
            onDetailClick={(request) => openDetailViewer(request, 'request')}
          />
        );

      case 'errors':
        return (
          <ConsoleErrorsTable
            errors={data.consoleErrors}
            totalErrors={data.totalErrors || data.consoleErrors.length}
            totalFilteredErrors={data.totalErrors || data.consoleErrors.length}
            currentPage={errorsCurrentPage}
            totalPages={errorsTotalPages}
            errorsPerPage={errorsPerPage}
            onPageChange={setErrorsCurrentPage}
            onSort={handleErrorSort}
            sortConfig={errorSortConfig}
            searchTerm={errorSearchTerm}
            onSearchChange={setErrorSearchTerm}
            filterSeverity={errorFilterSeverity}
            onSeverityFilterChange={setErrorFilterSeverity}
            onDetailClick={(error) => openDetailViewer(error, 'error')}
          />
        );

      case 'tokens':
        return (
          <TokenEventsTable
            events={data.tokenEvents}
            totalEvents={data.totalTokenEvents || data.tokenEvents.length}
            totalFilteredEvents={data.totalTokenEvents || data.tokenEvents.length}
            currentPage={tokenCurrentPage}
            totalPages={tokensTotalPages}
            eventsPerPage={tokenEventsPerPage}
            onPageChange={setTokenCurrentPage}
            onSort={handleTokenSort}
            sortConfig={tokenSortConfig}
            searchTerm={tokenSearchTerm}
            onSearchChange={setTokenSearchTerm}
            filterType={tokenFilterType}
            onTypeFilterChange={setTokenFilterType}
            onDetailClick={(event) => openDetailViewer(event, 'token')}
            showFullTokenHash={showFullTokenHash}
            onToggleTokenHash={() => setShowFullTokenHash(!showFullTokenHash)}
          />
        );

      case 'performance':
        return <PerformanceTable />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <DashboardSidebar
          tabLoggingEnabled={tabLoggingEnabled}
          onTabLoggingToggle={handleTabLoggingToggle}
          currentDomain={currentDomain}
          stats={sidebarStats}
        />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <DashboardHeader
            extensionEnabled={extensionEnabled}
            onExtensionToggle={handleExtensionToggle}
            isLoading={isLoading}
          />

          {/* Main Content Area */}
          <div className="p-6 space-y-6">
            {/* Table Carousel */}
            <TableCarousel
              activeTable={activeTable}
              onTableChange={setActiveTable}
            >
              {renderTableContent()}
            </TableCarousel>

            {/* Statistics Card - Lazy Loaded */}
            <LazyStatisticsCard
              networkRequests={data.networkRequests}
              consoleErrors={data.consoleErrors}
              tokenEvents={data.tokenEvents}
              totalRequests={data.totalRequests}
              totalErrors={data.totalErrors}
              totalTokenEvents={data.totalTokenEvents}
              onRefreshAnalysisData={loadDashboardData}
            />
          </div>
        </div>
      </div>

      {/* Detail Viewer Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {detailViewerType === 'request' ? 'Request Details' :
                   detailViewerType === 'error' ? 'Error Details' : 'Token Event Details'}
                </h3>
                <button
                  onClick={closeDetailViewer}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(selectedItem, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mount the component
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DecomposedDashboard />);
}
