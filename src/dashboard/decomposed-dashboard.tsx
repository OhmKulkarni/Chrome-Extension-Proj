import React, { useState, useEffect, useCallback } from 'react';
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

// Chrome data clearing function
const clearChromeData = async (): Promise<void> => {
  const sendChromeMessage = (message: any): Promise<any> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  };

  const response = await sendChromeMessage({ action: 'clearAllData' })
  if (chrome.runtime.lastError) {
    console.error('Dashboard: Error clearing data:', chrome.runtime.lastError)
    throw chrome.runtime.lastError
  } else if (response?.success) {
    console.log('Dashboard: Data cleared successfully')
    return
  } else {
    throw new Error('Failed to clear data')
  }
};

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

  // Settings state for safety limits and configurations
  const [settings, setSettings] = useState<any>(null);

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

  // Clear data function with proper error handling
  const clearData = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete all recorded network requests, console errors, token events, and reset all tab counters.\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (confirmed) {
      try {
        setLoading(true);
        
        // Use the clearChromeData function
        await clearChromeData()
        
        // Reset local state
        setData({
          totalTabs: data.totalTabs,
          extensionEnabled: data.extensionEnabled,
          lastActivity: data.lastActivity,
          networkRequests: [],
          totalRequests: 0,
          consoleErrors: [],
          totalErrors: 0,
          tokenEvents: [],
          totalTokenEvents: 0
        });

        setCurrentPage(1);
        setCurrentErrorPage(1);
        setCurrentTokenPage(1);
        
        // Reload data from database to confirm it's actually cleared
        await loadDashboardData();
        
        // Trigger refresh of all dashboard components
        window.dispatchEvent(new CustomEvent('dataCleared'));

        // Show success message
        alert('✅ All network request, console error, and token event data have been cleared successfully.');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('❌ Failed to clear data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Load settings - using same logic as original
  const loadSettings = useCallback(async () => {
    try {
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(['extensionSettings']),
        chrome.storage.local.get(['settings'])
      ]);
      
      // Store the full settings for use in detail viewers
      const fullSettings = localResult.settings || syncResult.extensionSettings || {};
      setSettings(fullSettings);
      
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

  // Enhanced detail viewer functions for drag-up modal
  const openDetailViewer = useCallback((item: any, type: 'request' | 'error' | 'token') => {
    setExpandedItem(item);
    setExpandedItemType(type);
    setDetailViewerOpen(true);
    setSelectedField('details'); // Reset to default field
  }, []);

  const closeDetailViewer = useCallback(() => {
    setDetailViewerOpen(false);
    setExpandedItem(null);
    setExpandedItemType(null);
  }, []);

  // Drag functionality for resizing detail viewer
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartHeight(detailViewerHeight);
    e.preventDefault();
    
    // Add cursor style to body to show dragging state
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [detailViewerHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate the delta from the initial drag position
    const deltaY = dragStartY - e.clientY; // Inverted because we want upward drag to increase height
    const newHeight = dragStartHeight + deltaY;
    
    const minHeight = 200;
    const maxHeight = window.innerHeight * 0.8;
    
    setDetailViewerHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
  }, [isDragging, dragStartY, dragStartHeight]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Reset cursor styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isDragging]);

  // Mouse event listeners for drag functionality
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

  // Add sophisticated real-time data refresh - enhanced version from main branch
  useEffect(() => {
    let refreshInterval: number | null = null
    let isActive = true
    
    // MEMORY LEAK FIX: Memory-aware interval with exponential backoff
    const startPeriodicRefresh = () => {
      if (!isActive) return
      
      // Clear any existing interval
      if (refreshInterval) {
        clearTimeout(refreshInterval)
      }
      
      // Start with 10 second intervals (slower than before)
      let currentInterval = 10000
      const maxInterval = 60000 // Cap at 60 seconds
      
      const scheduleNextRefresh = () => {
        if (!isActive) return
        
        refreshInterval = window.setTimeout(() => {
          if (!isActive) return
          
          try {
            // Check memory pressure before refreshing
            const performanceMemory = (performance as any).memory
            if (performanceMemory?.usedJSHeapSize) {
              const heapUsed = performanceMemory.usedJSHeapSize
              const heapLimit = performanceMemory.jsHeapSizeLimit
              const heapPercentage = (heapUsed / heapLimit) * 100
              
              if (heapPercentage > 85) {
                // Skip refresh under high memory pressure
                console.log('� Skipping dashboard refresh - high memory pressure')
                currentInterval = Math.min(currentInterval * 1.5, maxInterval)
                scheduleNextRefresh()
                return
              } else if (heapPercentage > 70) {
                // Slow down refresh rate
                currentInterval = Math.min(currentInterval * 1.2, maxInterval)
              } else {
                // Reset to normal interval
                currentInterval = 10000
              }
            }
            
            console.log('�🔄 DASHBOARD: Periodic data refresh...')
            loadDashboardData()
          } catch (error) {
            console.error('Dashboard refresh error:', error)
          }
          
          // Schedule next refresh
          scheduleNextRefresh()
        }, currentInterval)
      }
      
      scheduleNextRefresh()
    }

    // Listen for background script notifications about new data
    const handleBackgroundMessages = (message: any, _sender: any, _sendResponse: any) => {
      if (!isActive) return
      
      if (message.type === 'DATA_UPDATED') {
        console.log('📡 DASHBOARD: Received data update notification:', message.dataType);
        
        // Update counts AND refresh current page data
        loadDashboardData();
        
        // Also refresh the current page data to show new entries immediately
        if (message.dataType === 'network_request' && activeTable === 'network') {
          console.log('🔄 DASHBOARD: Refreshing network requests page');
          loadNetworkRequestsPage(currentPage, requestsPerPage);
        } else if (message.dataType === 'console_error' && activeTable === 'errors') {
          console.log('🔄 DASHBOARD: Refreshing console errors page');
          loadConsoleErrorsPage(currentErrorPage, errorsPerPage);
        } else if (message.dataType === 'token_event' && activeTable === 'tokens') {
          console.log('🔄 DASHBOARD: Refreshing token events page');
          loadTokenEventsPage(currentTokenPage, tokenEventsPerPage);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleBackgroundMessages);

    // Start refresh after initial load
    if (!loading) {
      startPeriodicRefresh();
    }

    return () => {
      isActive = false
      if (refreshInterval) {
        clearTimeout(refreshInterval)
        refreshInterval = null
      }
      chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
    };
  }, [loading, loadDashboardData, activeTable, currentPage, requestsPerPage, loadNetworkRequestsPage, currentErrorPage, errorsPerPage, loadConsoleErrorsPage, currentTokenPage, tokenEventsPerPage, loadTokenEventsPage]);

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

      case 'performance':
        return (
          <PerformanceMonitoringDashboard />
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
                  expandedItemType === 'error' ? ['details', 'stack'] :
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
                settings={settings}
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
                showFullTokenHash={showFullTokenHash}
                settings={settings}
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
  root.render(<DecomposedDashboard />);
}
