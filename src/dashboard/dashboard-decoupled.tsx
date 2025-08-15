import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardHeader from './components/DashboardHeader';
import TableCarousel from './components/TableCarousel';
import NetworkRequestsTable from './components/NetworkRequestsTable';
import ConsoleErrorsTable from './components/ConsoleErrorsTable';
import TokenEventsTable from './components/TokenEventsTable';
import LazyStatisticsCard from './components/LazyStatisticsCard';
import LeftSidebar from './components/LeftSidebar';
import { PerformanceMonitoringDashboard } from './components/PerformanceMonitoringDashboard';
import { RequestDetailContent, ErrorDetailContent, TokenDetailContent } from './shared/components/DetailedViews';

// Import our decoupled architecture
import { initializeExtensionController } from './lib/DecoupledExtensionController';
import type { DashboardState } from './lib/DashboardUpdateManager';

// Interface definitions
interface DashboardData {
  totalTabs: number;
  extensionEnabled: boolean;
  lastActivity: string;
  networkRequests: any[];
  totalRequests: number;
  consoleErrors: any[];
  totalErrors: number;
  tokenEvents: any[];
  totalTokenEvents: number;
}

interface TabLoggingStatus {
  tabId: number;
  url: string;
  title: string;
  domain: string;
  networkLogging: boolean;
  errorLogging: boolean;
  tokenLogging: boolean;
  favicon?: string;
}

const DecoupledDashboard: React.FC = () => {
  // Main state - using the same structure as original dashboard
  const [data, setData] = useState<DashboardData>({
    totalTabs: 0,
    extensionEnabled: true,
    lastActivity: 'Never',
    networkRequests: [],
    totalRequests: 0,
    consoleErrors: [],
    totalErrors: 0,
    tokenEvents: [],
    totalTokenEvents: 0
  });
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Sidebar state
  const [tabsLoggingStatus, setTabsLoggingStatus] = useState<TabLoggingStatus[]>([]);
  const [sidebarMode, setSidebarMode] = useState<'logging' | 'settings' | 'base'>('base');

  // Table carousel state
  const [activeTable, setActiveTable] = useState<'network' | 'errors' | 'tokens' | 'performance'>('network');

  // Network requests state - using same pagination as original
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(10);
  const [networkSearchTerm, setNetworkSearchTerm] = useState('');
  const [networkFilterMethod, setNetworkFilterMethod] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });

  // Console errors state - using same pagination as original
  const [currentErrorPage, setCurrentErrorPage] = useState(1);
  const [errorsPerPage] = useState(10);
  const [errorSearchTerm, setErrorSearchTerm] = useState('');
  const [errorFilterSeverity, setErrorFilterSeverity] = useState('all');
  const [errorSortConfig, setErrorSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });

  // Token events state - using same pagination as original
  const [currentTokenPage, setCurrentTokenPage] = useState(1);
  const [tokenEventsPerPage] = useState(10);
  const [tokenSearchTerm, setTokenSearchTerm] = useState('');
  const [tokenFilterType, setTokenFilterType] = useState('all');
  const [tokenSortConfig, setTokenSortConfig] = useState({ key: 'timestamp', direction: 'desc' as 'asc' | 'desc' });
  const [showFullTokenHash, setShowFullTokenHash] = useState(false);

  // Detail viewer state for drag-up modal
  const [detailViewerOpen, setDetailViewerOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<any>(null);
  const [expandedItemType, setExpandedItemType] = useState<'request' | 'error' | 'token' | null>(null);
  const [selectedField, setSelectedField] = useState('details');
  
  // Drag functionality for detail viewer
  const [detailViewerHeight, setDetailViewerHeight] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);

  // Decoupled architecture refs
  const controllerRef = useRef<any>(null);
  const dashboardAPIRef = useRef<any>(null);
  const settingsAPIRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize decoupled architecture
  useEffect(() => {
    let mounted = true;

    const initializeDecoupledSystems = async () => {
      try {
        console.log('🚀 Dashboard: Initializing decoupled systems...');
        
        // Initialize controller
        const controller = await initializeExtensionController();
        if (!mounted) return;

        controllerRef.current = controller;
        dashboardAPIRef.current = controller.getDashboardAPI();
        settingsAPIRef.current = controller.getSettingsAPI();

        // Subscribe to dashboard updates
        const unsubscribe = dashboardAPIRef.current.subscribeToDashboardUpdates(
          (updates: Partial<DashboardState>) => {
            if (!mounted) return;
            
            console.log('📊 Dashboard: Received updates:', updates);
            
            setData(prevData => ({
              ...prevData,
              ...updates,
              lastActivity: updates.lastUpdate || prevData.lastActivity
            }));

            if (updates.loading !== undefined) {
              setLoading(updates.loading);
            }
          }
        );
        unsubscribeRef.current = unsubscribe;

        // Initial load
        await loadInitialData();
        
        setInitializationError(null);
        console.log('✅ Dashboard: Decoupled systems initialized successfully');
        
      } catch (error) {
        console.error('❌ Dashboard: Failed to initialize decoupled systems:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown initialization error');
        setLoading(false);
      }
    };

    initializeDecoupledSystems();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Load initial data using decoupled API
  const loadInitialData = useCallback(async () => {
    if (!dashboardAPIRef.current) return;

    try {
      setLoading(true);

      // Load specific page data
      await Promise.all([
        dashboardAPIRef.current.refreshPage(currentPage, requestsPerPage, 'network'),
        dashboardAPIRef.current.refreshPage(currentErrorPage, errorsPerPage, 'errors'),
        dashboardAPIRef.current.refreshPage(currentTokenPage, tokenEventsPerPage, 'tokens')
      ]);

      // Load tab data and settings
      await Promise.all([
        loadTabsLoggingStatus(),
        loadSettings()
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setLoading(false);
    }
  }, [currentPage, requestsPerPage, currentErrorPage, errorsPerPage, currentTokenPage, tokenEventsPerPage]);

  // Load dashboard data using decoupled API
  const loadDashboardData = useCallback(async () => {
    if (!dashboardAPIRef.current) return;

    try {
      setLoading(true);
      
      // Get tabs count - keep original logic for non-data operations
      const tabs = await chrome.tabs.query({});
      
      // Load current pages using decoupled API
      await Promise.all([
        dashboardAPIRef.current.refreshPage(currentPage, requestsPerPage, 'network'),
        dashboardAPIRef.current.refreshPage(currentErrorPage, errorsPerPage, 'errors'),
        dashboardAPIRef.current.refreshPage(currentTokenPage, tokenEventsPerPage, 'tokens'),
        loadTabsLoggingStatus()
      ]);

      // Update basic dashboard info
      setData(prevData => ({
        ...prevData,
        totalTabs: tabs.length,
        lastActivity: new Date().toLocaleString()
      }));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, requestsPerPage, currentErrorPage, errorsPerPage, currentTokenPage, tokenEventsPerPage]);

  // Clear data using decoupled API
  const clearData = async () => {
    if (!dashboardAPIRef.current) return;

    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete all recorded network requests, console errors, token events, and reset all tab counters.\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (confirmed) {
      try {
        setLoading(true);
        
        // Use decoupled API for clearing data
        const result = await dashboardAPIRef.current.clearAllData();
        
        if (result.success) {
          // Reset pagination
          setCurrentPage(1);
          setCurrentErrorPage(1);
          setCurrentTokenPage(1);
          
          // Show success message
          alert('✅ All network request, console error, and token event data have been cleared successfully.');
        } else {
          alert(`❌ Failed to clear some data: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('❌ Failed to clear data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Load settings - keep original implementation for now
  const loadSettings = useCallback(async () => {
    if (!settingsAPIRef.current) return;

    try {
      const settings = await settingsAPIRef.current.getSettings();
      
      // Extract token settings
      let tokenSettings = { showFullHash: false };
      
      if (settings?.extensionSettings?.tokenLogging) {
        tokenSettings = {
          showFullHash: settings.extensionSettings.tokenLogging.showFullHash || false
        };
      }
      
      setShowFullTokenHash(tokenSettings.showFullHash);

      // Update extension enabled state
      setData(prevData => ({ 
        ...prevData, 
        extensionEnabled: settings?.extensionEnabled ?? true 
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Extension toggle using decoupled API
  const handleExtensionToggle = useCallback(async (enabled: boolean) => {
    if (!settingsAPIRef.current) return;

    try {
      setData(prevData => ({ ...prevData, extensionEnabled: enabled }));
      await settingsAPIRef.current.setExtensionEnabled(enabled);
    } catch (error) {
      console.error('Error toggling extension:', error);
      setData(prevData => ({ ...prevData, extensionEnabled: !enabled })); // Revert on error
    }
  }, []);

  // Page change handlers using decoupled API
  const handleNetworkPageChange = useCallback(async (page: number) => {
    if (!dashboardAPIRef.current) return;
    
    setCurrentPage(page);
    try {
      await dashboardAPIRef.current.refreshPage(page, requestsPerPage, 'network');
    } catch (error) {
      console.error('Error changing network page:', error);
    }
  }, [requestsPerPage]);

  const handleErrorPageChange = useCallback(async (page: number) => {
    if (!dashboardAPIRef.current) return;
    
    setCurrentErrorPage(page);
    try {
      await dashboardAPIRef.current.refreshPage(page, errorsPerPage, 'errors');
    } catch (error) {
      console.error('Error changing error page:', error);
    }
  }, [errorsPerPage]);

  const handleTokenPageChange = useCallback(async (page: number) => {
    if (!dashboardAPIRef.current) return;
    
    setCurrentTokenPage(page);
    try {
      await dashboardAPIRef.current.refreshPage(page, tokenEventsPerPage, 'tokens');
    } catch (error) {
      console.error('Error changing token page:', error);
    }
  }, [tokenEventsPerPage]);

  // Keep original tab logging functions for now - these could be decoupled later
  const loadTabsLoggingStatus = useCallback(async () => {
    // Keep original implementation for now
    try {
      const tabs = await chrome.tabs.query({});
      const settingsResult = await chrome.storage.local.get(['settings']);
      const settings = settingsResult.settings || {};
      
      const tabStatuses: TabLoggingStatus[] = [];

      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          const result = await chrome.storage.local.get([`tabLogging_${tab.id}`, `tabErrorLogging_${tab.id}`, `tabTokenLogging_${tab.id}`]);
          const networkState = result[`tabLogging_${tab.id}`];
          const errorState = result[`tabErrorLogging_${tab.id}`];
          const tokenState = result[`tabTokenLogging_${tab.id}`];
          
          let domain = '';
          try {
            domain = new URL(tab.url).hostname;
          } catch (e) {
            domain = 'unknown';
          }

          let networkLogging = false;
          let errorLogging = false;
          let tokenLogging = false;

          if (networkState) {
            if (networkState.status !== undefined) {
              networkLogging = networkState.status === 'active';
            } else {
              networkLogging = typeof networkState === 'boolean' ? networkState : networkState.active;
            }
          } else {
            const defaultActive = settings.networkInterception?.tabSpecific?.defaultState === 'active';
            networkLogging = defaultActive;
          }

          if (errorState) {
            errorLogging = typeof errorState === 'boolean' ? errorState : errorState.active;
          } else {
            const defaultActive = settings.errorLogging?.tabSpecific?.defaultState === 'active';
            errorLogging = defaultActive;
          }

          if (tokenState) {
            tokenLogging = typeof tokenState === 'boolean' ? tokenState : tokenState.active;
          } else {
            const defaultActive = settings.tokenLogging?.tabSpecific?.defaultState === 'active';
            tokenLogging = defaultActive;
          }

          tabStatuses.push({
            tabId: tab.id,
            url: tab.url,
            title: tab.title || 'Untitled',
            domain: domain,
            networkLogging,
            errorLogging,
            tokenLogging,
            favicon: tab.favIconUrl
          });
        }
      }

      setTabsLoggingStatus(tabStatuses);
    } catch (error) {
      console.error('Error loading tabs logging status:', error);
      setTabsLoggingStatus([]);
    }
  }, []);

  // Keep original tab toggle functions for now
  const toggleTabNetworkLogging = async (tabId: number) => {
    if (!settingsAPIRef.current) return;
    
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.networkLogging;
      await settingsAPIRef.current.setTabLogging(tabId, 'network', newState);
      
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, networkLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling network logging:', error);
    }
  };

  const toggleTabErrorLogging = async (tabId: number) => {
    if (!settingsAPIRef.current) return;
    
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.errorLogging;
      await settingsAPIRef.current.setTabLogging(tabId, 'errors', newState);
      
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, errorLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling error logging:', error);
    }
  };

  const toggleTabTokenLogging = async (tabId: number) => {
    if (!settingsAPIRef.current) return;
    
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.tokenLogging;
      await settingsAPIRef.current.setTabLogging(tabId, 'tokens', newState);
      
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, tokenLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling token logging:', error);
    }
  };

  // Keep original sorting and detail viewer functions
  const handleNetworkSort = useCallback((key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  }, []);

  const handleErrorSort = useCallback((key: string) => {
    setErrorSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentErrorPage(1);
  }, []);

  const handleTokenSort = useCallback((key: string) => {
    setTokenSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentTokenPage(1);
  }, []);

  const openDetailViewer = useCallback((item: any, type: 'request' | 'error' | 'token') => {
    setExpandedItem(item);
    setExpandedItemType(type);
    setDetailViewerOpen(true);
    setSelectedField('details');
  }, []);

  const closeDetailViewer = useCallback(() => {
    setDetailViewerOpen(false);
    setExpandedItem(null);
    setExpandedItemType(null);
  }, []);

  // Keep original drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartHeight(detailViewerHeight);
    e.preventDefault();
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [detailViewerHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = dragStartY - e.clientY;
    const newHeight = dragStartHeight + deltaY;
    
    const minHeight = 200;
    const maxHeight = window.innerHeight * 0.8;
    
    setDetailViewerHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
  }, [isDragging, dragStartY, dragStartHeight]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate stats and pagination
  const sidebarStats = {
    totalRequests: data.totalRequests || data.networkRequests.length,
    totalErrors: data.totalErrors || data.consoleErrors.length,
    totalTokenEvents: data.totalTokenEvents || data.tokenEvents.length,
    activeLoggingTabs: tabsLoggingStatus.filter(tab => 
      tab.networkLogging || tab.errorLogging || tab.tokenLogging
    ).length
  };

  const networkTotalPages = Math.ceil((data.totalRequests || data.networkRequests.length) / requestsPerPage);
  const errorsTotalPages = Math.ceil((data.totalErrors || data.consoleErrors.length) / errorsPerPage);
  const tokensTotalPages = Math.ceil((data.totalTokenEvents || data.tokenEvents.length) / tokenEventsPerPage);

  const hasActiveLogging = tabsLoggingStatus.some(tab => 
    tab.networkLogging || tab.errorLogging || tab.tokenLogging
  );

  const handleSidebarModeChange = (mode: 'logging' | 'settings' | 'base') => {
    setSidebarMode(mode);
  };

  // Render current table content
  const renderTableContent = () => {
    switch (activeTable) {
      case 'network':
        return (
          <NetworkRequestsTable
            requests={data.networkRequests}
            totalRequests={data.totalRequests || data.networkRequests.length}
            totalFilteredRequests={data.totalRequests || data.networkRequests.length}
            currentPage={currentPage}
            totalPages={networkTotalPages}
            requestsPerPage={requestsPerPage}
            onPageChange={handleNetworkPageChange}
            onSort={handleNetworkSort}
            sortConfig={sortConfig}
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
            currentPage={currentErrorPage}
            totalPages={errorsTotalPages}
            errorsPerPage={errorsPerPage}
            onPageChange={handleErrorPageChange}
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
            currentPage={currentTokenPage}
            totalPages={tokensTotalPages}
            eventsPerPage={tokenEventsPerPage}
            onPageChange={handleTokenPageChange}
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
        return (
          <PerformanceMonitoringDashboard />
        );

      default:
        return null;
    }
  };

  // Show initialization error if systems failed to load
  if (initializationError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-bold mb-4">Initialization Error</h2>
            <p className="text-sm text-gray-600 mb-4">{initializationError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar */}
      <LeftSidebar
        sidebarMode={sidebarMode}
        onModeChange={handleSidebarModeChange}
        tabsLoggingStatus={tabsLoggingStatus}
        onTabNetworkLoggingToggle={toggleTabNetworkLogging}
        onTabErrorLoggingToggle={toggleTabErrorLogging}
        onTabTokenLoggingToggle={toggleTabTokenLogging}
        onRefreshTabStatus={loadTabsLoggingStatus}
        stats={sidebarStats}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader
          extensionEnabled={data.extensionEnabled}
          onExtensionToggle={handleExtensionToggle}
          isLoading={loading}
          hasActiveLogging={hasActiveLogging}
        />

        {/* Control Buttons */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {data.lastActivity}
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Data
                  </>
                )}
              </button>
              <button
                onClick={clearData}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Data
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 space-y-6 overflow-hidden">
          {/* Table Carousel */}
          <div className="w-full">
            <TableCarousel
              activeTable={activeTable}
              onTableChange={setActiveTable}
            >
              {renderTableContent()}
            </TableCarousel>
          </div>

          {/* Statistics Card - Lazy Loaded */}
          <div className="w-full">
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

      {/* Enhanced Drag-Up Detail Viewer */}
      {detailViewerOpen && expandedItem && (
        <div 
          className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${
            isDragging ? 'transition-none' : 'transition-all duration-200'
          }`}
          style={{ height: `${detailViewerHeight}px` }}
        >
          {/* Drag Handle */}
          <div 
            className={`w-full h-3 cursor-ns-resize transition-all duration-150 flex items-center justify-center ${
              isDragging 
                ? 'bg-blue-200 border-t border-blue-300' 
                : 'bg-gray-100 hover:bg-gray-200 border-t border-gray-200'
            }`}
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          >
            <div className={`transition-all duration-150 rounded-full ${
              isDragging 
                ? 'w-16 h-1.5 bg-blue-500' 
                : 'w-12 h-1 bg-gray-400 hover:bg-gray-500'
            }`}></div>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {expandedItemType === 'request' ? 'Request Details' :
                 expandedItemType === 'error' ? 'Error Details' : 'Token Event Details'}
              </h3>
              
              {/* Side-by-side Field Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(expandedItemType === 'request' ? ['details', 'headers', 'body', 'rawjson'] :
                  expandedItemType === 'error' ? ['details', 'stack', 'rawjson'] :
                  ['details', 'rawjson']).map((field) => (
                  <button
                    key={field}
                    onClick={() => setSelectedField(field)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                      selectedField === field
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {field === 'rawjson' ? 'Raw JSON' : 
                     field === 'body' ? 'Body' :
                     field === 'headers' ? 'Headers' :
                     field === 'stack' ? 'Stack' :
                     field === 'analysis' ? 'Analysis' :
                     'Details'}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={closeDetailViewer}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4" style={{ height: `${detailViewerHeight - 120}px` }}>
            {expandedItemType === 'request' && (
              <RequestDetailContent 
                request={expandedItem} 
                selectedField={selectedField}
              />
            )}
            {expandedItemType === 'error' && (
              <ErrorDetailContent 
                error={expandedItem} 
                selectedField={selectedField}
              />
            )}
            {expandedItemType === 'token' && (
              <TokenDetailContent 
                tokenEvent={expandedItem} 
                selectedField={selectedField}
              />
            )}
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
  root.render(<DecoupledDashboard />);
}
