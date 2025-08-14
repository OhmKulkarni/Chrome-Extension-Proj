import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardHeader from './components/DashboardHeader';
import TableCarousel from './components/TableCarousel';
import NetworkRequestsTable from './components/NetworkRequestsTable';
import ConsoleErrorsTable from './components/ConsoleErrorsTable';
import TokenEventsTable from './components/TokenEventsTable';
import LazyStatisticsCard from './components/LazyStatisticsCard';
import LeftSidebar from './components/LeftSidebar';

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

const DecomposedDashboard: React.FC = () => {
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

  // Sidebar state
  const [tabsLoggingStatus, setTabsLoggingStatus] = useState<TabLoggingStatus[]>([]);
  const [sidebarMode, setSidebarMode] = useState<'logging' | 'settings' | 'base'>('base');

  // Table carousel state
  const [activeTable, setActiveTable] = useState<'network' | 'errors' | 'tokens'>('network');

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

  // Detail viewer state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailViewerType, setDetailViewerType] = useState<'request' | 'error' | 'token'>('request');

  // MEMORY LEAK FIX: Copy exact data loading logic from original dashboard
  const loadNetworkRequestsPage = useCallback(async (page: number, limit: number = 10) => {
    try {
      console.log(`🔄 Loading network requests page ${page} with limit ${limit}`)
      const offset = (page - 1) * limit
      const response = await sendChromeMessage({ 
        action: 'getNetworkRequests', 
        limit, 
        offset 
      })
      
      console.log('📊 Network requests response:', response)
      
      if (response?.success && response?.requests) {
        setData(prevData => ({
          ...prevData,
          networkRequests: response.requests,
          totalRequests: response.total || 0
        }))
        console.log(`✅ Loaded ${response.requests.length} network requests, total: ${response.total}`)
      } else {
        console.warn('⚠️ Network requests response missing success/requests:', response)
      }
    } catch (error) {
      console.error('❌ Error loading network requests page:', error)
    }
  }, [])

  const loadConsoleErrorsPage = useCallback(async (page: number, limit: number = 10) => {
    try {
      console.log(`🔄 Loading console errors page ${page} with limit ${limit}`)
      const offset = (page - 1) * limit
      const response = await sendChromeMessage({ 
        action: 'getConsoleErrors', 
        limit, 
        offset 
      })
      
      console.log('📊 Console errors response:', response)
      
      if (response?.success && response?.errors) {
        setData(prevData => ({
          ...prevData,
          consoleErrors: response.errors,
          totalErrors: response.total || 0
        }))
        console.log(`✅ Loaded ${response.errors.length} console errors, total: ${response.total}`)
      } else {
        console.warn('⚠️ Console errors response missing success/errors:', response)
      }
    } catch (error) {
      console.error('❌ Error loading console errors page:', error)
    }
  }, [])

  const loadTokenEventsPage = useCallback(async (page: number, limit: number = 10) => {
    try {
      console.log(`🔄 Loading token events page ${page} with limit ${limit}`)
      const offset = (page - 1) * limit
      const response = await sendChromeMessage({ 
        action: 'getTokenEvents', 
        limit, 
        offset 
      })
      
      console.log('📊 Token events response:', response)
      
      if (response?.success && response?.events) {
        setData(prevData => ({
          ...prevData,
          tokenEvents: response.events,
          totalTokenEvents: response.total || 0
        }))
        console.log(`✅ Loaded ${response.events.length} token events, total: ${response.total}`)
      } else {
        console.warn('⚠️ Token events response missing success/events:', response)
      }
    } catch (error) {
      console.error('❌ Error loading token events page:', error)
    }
  }, [])

  // Load tab logging status - using same logic as original dashboard
  const loadTabsLoggingStatus = useCallback(async () => {
    try {
      // Get all tabs and global settings
      const tabs = await chrome.tabs.query({});
      const settingsResult = await chrome.storage.local.get(['settings']);
      const settings = settingsResult.settings || {};
      
      const tabStatuses: TabLoggingStatus[] = [];

      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          // Get logging status for this tab
          const result = await chrome.storage.local.get([`tabLogging_${tab.id}`, `tabErrorLogging_${tab.id}`, `tabTokenLogging_${tab.id}`]);
          const networkState = result[`tabLogging_${tab.id}`];
          const errorState = result[`tabErrorLogging_${tab.id}`];
          const tokenState = result[`tabTokenLogging_${tab.id}`];
          
          // Get domain from URL
          let domain = '';
          try {
            domain = new URL(tab.url).hostname;
          } catch (e) {
            domain = 'unknown';
          }

          // Determine logging status with proper defaults
          let networkLogging = false;
          let errorLogging = false;
          let tokenLogging = false;

          // Network logging status
          if (networkState) {
            // Check both 'status' and 'active' properties for compatibility
            if (networkState.status !== undefined) {
              networkLogging = networkState.status === 'active';
            } else {
              networkLogging = typeof networkState === 'boolean' ? networkState : networkState.active;
            }
          } else {
            // Use default from settings if no tab state exists
            const defaultActive = settings.networkInterception?.tabSpecific?.defaultState === 'active';
            networkLogging = defaultActive;
          }

          // Error logging status
          if (errorState) {
            errorLogging = typeof errorState === 'boolean' ? errorState : errorState.active;
          } else {
            // Use default from settings if no tab state exists - should be paused by default
            const defaultActive = settings.errorLogging?.tabSpecific?.defaultState === 'active';
            errorLogging = defaultActive; // This will be false when defaultState is 'paused'
          }

          // Token logging status
          if (tokenState) {
            tokenLogging = typeof tokenState === 'boolean' ? tokenState : tokenState.active;
          } else {
            // Use default from settings if no tab state exists - should be paused by default
            const defaultActive = settings.tokenLogging?.tabSpecific?.defaultState === 'active';
            tokenLogging = defaultActive; // This will be false when defaultState is 'paused'
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

  // Toggle network logging for a specific tab
  const toggleTabNetworkLogging = async (tabId: number) => {
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.networkLogging;
      
      // Get current tab state to preserve counter when disabling
      const tabStorageData = await chrome.storage.local.get([`tabLogging_${tabId}`]);
      const currentTabState = tabStorageData[`tabLogging_${tabId}`];
      const currentCount = currentTabState?.requestCount || 0;
      
      const tabState = {
        active: newState,
        startTime: newState ? Date.now() : undefined,
        requestCount: newState ? 0 : currentCount  // Reset only when enabling, preserve when disabling
      };
      
      await chrome.storage.local.set({ [`tabLogging_${tabId}`]: tabState });
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'toggleLogging',
          enabled: newState
        });
      } catch (error) {
        console.log('Could not send message to tab (may not have content script):', error);
      }
      
      // Update local state
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, networkLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling network logging:', error);
    }
  };

  // Toggle error logging for a specific tab
  const toggleTabErrorLogging = async (tabId: number) => {
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.errorLogging;
      
      // Get current tab state to preserve counter when disabling
      const tabStorageData = await chrome.storage.local.get([`tabErrorLogging_${tabId}`]);
      const currentTabState = tabStorageData[`tabErrorLogging_${tabId}`];
      const currentCount = currentTabState?.errorCount || 0;
      
      const tabState = {
        active: newState,
        startTime: newState ? Date.now() : undefined,
        errorCount: newState ? 0 : currentCount  // Reset only when enabling, preserve when disabling
      };
      
      await chrome.storage.local.set({ [`tabErrorLogging_${tabId}`]: tabState });
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'toggleErrorLogging',
          enabled: newState
        });
      } catch (error) {
        console.log('Could not send message to tab (may not have content script):', error);
      }
      
      // Update local state
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, errorLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling error logging:', error);
    }
  };

  // Toggle token logging for a specific tab
  const toggleTabTokenLogging = async (tabId: number) => {
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.tokenLogging;
      
      // Get current tab state to preserve counter when disabling
      const tabStorageData = await chrome.storage.local.get([`tabTokenLogging_${tabId}`]);
      const currentTabState = tabStorageData[`tabTokenLogging_${tabId}`];
      const currentCount = currentTabState?.tokenCount || 0;
      
      const tabState = {
        active: newState,
        startTime: newState ? Date.now() : undefined,
        tokenCount: newState ? 0 : currentCount  // Reset only when enabling, preserve when disabling
      };
      
      await chrome.storage.local.set({ [`tabTokenLogging_${tabId}`]: tabState });
      
      // Note: Token logging doesn't require content script communication
      // as it's handled purely in the background script via network interception
      
      // Update local state
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, tokenLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling token logging:', error);
    }
  };

  // Load dashboard data - using same logic as original
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get tabs count - same as original
      const tabs = await chrome.tabs.query({});
      
      // Load initial data for current pages
      await Promise.all([
        loadNetworkRequestsPage(currentPage, requestsPerPage),
        loadConsoleErrorsPage(currentErrorPage, errorsPerPage), 
        loadTokenEventsPage(currentTokenPage, tokenEventsPerPage),
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
  }, [currentPage, requestsPerPage, currentErrorPage, errorsPerPage, currentTokenPage, tokenEventsPerPage, loadNetworkRequestsPage, loadConsoleErrorsPage, loadTokenEventsPage, loadTabsLoggingStatus]);

  // Load settings - using same logic as original
  const loadSettings = useCallback(async () => {
    try {
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(['extensionSettings']),
        chrome.storage.local.get(['settings'])
      ]);
      
      let tokenSettings = { showFullHash: false };
      
      if (localResult.settings?.tokenLogging) {
        tokenSettings = {
          showFullHash: localResult.settings.tokenLogging.showFullHash || false
        };
      } else if (syncResult.extensionSettings?.tokenLogging) {
        tokenSettings = {
          showFullHash: syncResult.extensionSettings.tokenLogging.showFullHash || false
        };
      }
      
      setShowFullTokenHash(tokenSettings.showFullHash);

      // Load global power state
      const response = await sendChromeMessage({ action: 'getSettings' });
      if (response?.success) {
        setData(prevData => ({ ...prevData, extensionEnabled: response.settings?.extensionEnabled ?? true }));
        setData(prevData => ({
          ...prevData,
          extensionEnabled: response.settings?.extensionEnabled ?? true
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Toggle extension - using same logic as original
  const handleExtensionToggle = useCallback(async (enabled: boolean) => {
    try {
      setData(prevData => ({ ...prevData, extensionEnabled: enabled }));
      const response = await sendChromeMessage({ 
        action: 'toggleExtension', 
        enabled 
      });
      
      if (!response?.success) {
        setData(prevData => ({ ...prevData, extensionEnabled: !enabled })); // Revert on failure
        console.error('Failed to toggle extension:', response?.error);
      }
    } catch (error) {
      console.error('Error toggling extension:', error);
      setData(prevData => ({ ...prevData, extensionEnabled: !enabled })); // Revert on error
    }
  }, []);

  // Handle sorting - using same logic as original
  const handleNetworkSort = useCallback((key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1); // Reset to first page when sorting
  }, []);

  const handleErrorSort = useCallback((key: string) => {
    setErrorSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentErrorPage(1); // Reset to first page when sorting
  }, []);

  const handleTokenSort = useCallback((key: string) => {
    setTokenSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentTokenPage(1); // Reset to first page when sorting
  }, []);

  // Handle detail view
  const openDetailViewer = useCallback((item: any, type: 'request' | 'error' | 'token') => {
    setSelectedItem(item);
    setDetailViewerType(type);
  }, []);

  const closeDetailViewer = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Handle page changes - using same logic as original
  const handleNetworkPageChange = useCallback((page: number) => {
    setCurrentPage(page);
    loadNetworkRequestsPage(page, requestsPerPage);
  }, [loadNetworkRequestsPage, requestsPerPage]);

  const handleErrorPageChange = useCallback((page: number) => {
    setCurrentErrorPage(page);
    loadConsoleErrorsPage(page, errorsPerPage);
  }, [loadConsoleErrorsPage, errorsPerPage]);

  const handleTokenPageChange = useCallback((page: number) => {
    setCurrentTokenPage(page);
    loadTokenEventsPage(page, tokenEventsPerPage);
  }, [loadTokenEventsPage, tokenEventsPerPage]);

  // Calculate stats for sidebar
  const sidebarStats = {
    totalRequests: data.totalRequests || data.networkRequests.length,
    totalErrors: data.totalErrors || data.consoleErrors.length,
    totalTokenEvents: data.totalTokenEvents || data.tokenEvents.length,
    activeLoggingTabs: tabsLoggingStatus.filter(tab => 
      tab.networkLogging || tab.errorLogging || tab.tokenLogging
    ).length
  };

  // Calculate pagination for each table
  const networkTotalPages = Math.ceil((data.totalRequests || data.networkRequests.length) / requestsPerPage);
  const errorsTotalPages = Math.ceil((data.totalErrors || data.consoleErrors.length) / errorsPerPage);
  const tokensTotalPages = Math.ceil((data.totalTokenEvents || data.tokenEvents.length) / tokenEventsPerPage);

  // Initialize on mount - using same logic as original
  useEffect(() => {
    loadDashboardData();
    loadSettings();
    loadTabsLoggingStatus();
  }, [loadDashboardData, loadSettings, loadTabsLoggingStatus]);

  // Add real-time updates when pages change
  useEffect(() => {
    loadNetworkRequestsPage(currentPage, requestsPerPage);
  }, [currentPage, requestsPerPage, loadNetworkRequestsPage]);

  useEffect(() => {
    loadConsoleErrorsPage(currentErrorPage, errorsPerPage);
  }, [currentErrorPage, errorsPerPage, loadConsoleErrorsPage]);

  useEffect(() => {
    loadTokenEventsPage(currentTokenPage, tokenEventsPerPage);
  }, [currentTokenPage, tokenEventsPerPage, loadTokenEventsPage]);

  // Listen for storage changes - using same logic as original
  useEffect(() => {
    const handleStorageChanges = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        const hasTabLoggingChanges = Object.keys(changes).some(key => 
          key.startsWith('tabLogging_') || 
          key.startsWith('tabErrorLogging_') || 
          key.startsWith('tabTokenLogging_')
        );
        
        if (hasTabLoggingChanges) {
          console.log('📡 DASHBOARD: Tab logging states changed, updating sidebar...');
          loadTabsLoggingStatus();
        }

        if (changes.settings && changes.settings.newValue?.tokenLogging) {
          console.log('⚙️ DASHBOARD: Token settings changed, updating display...');
          loadSettings();
        }
      }

      if (namespace === 'sync') {
        if (changes.extensionSettings && changes.extensionSettings.newValue?.tokenLogging) {
          console.log('⚙️ DASHBOARD: Extension token settings changed, updating display...');
          loadSettings();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanges);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanges);
    };
  }, [loadTabsLoggingStatus, loadSettings]);

  // Add periodic refresh - using same logic as original
  useEffect(() => {
    let refreshInterval: number | null = null;
    let isActive = true;
    
    const startPeriodicRefresh = () => {
      if (!isActive) return;
      
      if (refreshInterval) {
        clearTimeout(refreshInterval);
      }
      
      let currentInterval = 10000; // 10 seconds
      
      const scheduleNextRefresh = () => {
        if (!isActive) return;
        
        refreshInterval = window.setTimeout(() => {
          if (!isActive) return;
          
          try {
            console.log('🔄 DASHBOARD: Periodic data refresh...');
            loadDashboardData();
          } catch (error) {
            console.error('Dashboard refresh error:', error);
          }
          
          scheduleNextRefresh();
        }, currentInterval);
      };
      
      scheduleNextRefresh();
    };

    // Start refresh after initial load
    if (!loading) {
      startPeriodicRefresh();
    }

    return () => {
      isActive = false;
      if (refreshInterval) {
        clearTimeout(refreshInterval);
      }
    };
  }, [loading, loadDashboardData]);

  // Calculate if there's any active logging
  const hasActiveLogging = tabsLoggingStatus.some(tab => 
    tab.networkLogging || tab.errorLogging || tab.tokenLogging
  );

  // Sidebar handlers
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

      default:
        return null;
    }
  };

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
