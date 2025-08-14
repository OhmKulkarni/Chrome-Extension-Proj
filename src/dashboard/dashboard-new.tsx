import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'

// Lazy load feature modules for code splitting
const NetworkDashboard = lazy(() => import('./features/network/NetworkDashboard').then(module => ({ default: module.NetworkDashboard })))
const ErrorDashboard = lazy(() => import('./features/errors/ErrorDashboard').then(module => ({ default: module.ErrorDashboard })))
const TokenDashboard = lazy(() => import('./features/tokens/TokenDashboard').then(module => ({ default: module.TokenDashboard })))

// Import existing components that don't need restructuring yet
import { PerformanceMonitoringDashboard } from './components/PerformanceMonitoringDashboard'

// Import detailed view components
import { RequestDetailContent, ErrorDetailContent, TokenDetailContent } from './shared/components/DetailedViews'

// Centralized Chrome message handler
const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    console.error('Chrome message failed:', error)
    return null
  }
}

interface DashboardData {
  totalTabs: number
  extensionEnabled: boolean
  lastActivity: string
  totalRequests: number
  totalErrors: number
  totalTokenEvents: number
}

interface TabLoggingStatus {
  tabId: number
  url: string
  title: string
  domain: string
  networkLogging: boolean
  errorLogging: boolean
  tokenLogging: boolean
  favicon?: string
}

// Detail viewer state types
interface DetailViewerState {
  open: boolean
  item: any
  type: 'request' | 'error' | 'token'
  field: string
}

const Dashboard: React.FC = () => {
  // Core dashboard state
  const [data, setData] = useState<DashboardData>({
    totalTabs: 0,
    extensionEnabled: true,
    lastActivity: 'Never',
    totalRequests: 0,
    totalErrors: 0,
    totalTokenEvents: 0
  })
  
  const [globalPowerEnabled, setGlobalPowerEnabled] = useState(true)
  
  // Current active feature - using table icons and descriptions like original
  const [currentFeature, setCurrentFeature] = useState(0)
  const featureNames = ['Network Requests', 'Console Errors', 'Token Events', 'Performance Monitoring']
  const featureIcons = ['🌐', '❌', '🔑', '📊']
  const featureDescriptions = [
    'Global requests from all tabs (Popup shows current tab only)',
    'JavaScript errors and warnings from monitored tabs',
    'Token detection and authentication events',
    'Real-time performance metrics and analytics'
  ]
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tabsLoggingStatus, setTabsLoggingStatus] = useState<TabLoggingStatus[]>([])
  const [tabSearchTerm, setTabSearchTerm] = useState('')
  
  // Detail viewer state
  const [detailViewer, setDetailViewer] = useState<DetailViewerState>({
    open: false,
    item: null,
    type: 'request',
    field: 'details'
  })
  
  // Drag functionality for resizing detail viewer
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartHeight, setDragStartHeight] = useState(0)
  const [detailViewerHeight, setDetailViewerHeight] = useState(400)

  // Carousel navigation functions
  const nextFeature = () => {
    setCurrentFeature((prev) => (prev + 1) % featureNames.length)
  }

  const prevFeature = () => {
    setCurrentFeature((prev) => (prev - 1 + featureNames.length) % featureNames.length)
  }

  // Drag functionality for resizing detail viewer
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStartY(e.clientY)
    setDragStartHeight(detailViewerHeight)
    e.preventDefault()
    
    // Add cursor style to body to show dragging state
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    // Calculate the delta from the initial drag position
    const deltaY = dragStartY - e.clientY // Inverted because we want upward drag to increase height
    const newHeight = dragStartHeight + deltaY
    
    const minHeight = 200
    const maxHeight = window.innerHeight * 0.8
    
    setDetailViewerHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)))
  }, [isDragging, dragStartY, dragStartHeight])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      
      // Reset cursor styles
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Ensure minimum and maximum bounds are enforced smoothly
      const minHeight = 200
      const maxHeight = window.innerHeight * 0.8
      
      if (detailViewerHeight < minHeight) {
        setDetailViewerHeight(minHeight)
      } else if (detailViewerHeight > maxHeight) {
        setDetailViewerHeight(maxHeight)
      }
    }
  }, [isDragging, detailViewerHeight])

  // Mouse event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Detail viewer functions
  const openDetailViewer = (item: any, type: 'request' | 'error' | 'token') => {
    setDetailViewer({
      open: true,
      item,
      type,
      field: 'details'
    })
  }

  const closeDetailViewer = () => {
    setDetailViewer(prev => ({
      ...prev,
      open: false
    }))
  }

  const setDetailField = (field: string) => {
    setDetailViewer(prev => ({
      ...prev,
      field
    }))
  }

  // Load dashboard metadata (counts and tab info)
  const loadDashboardData = useCallback(async () => {
    try {
      const tabs = await chrome.tabs.query({})
      const storageData = await chrome.storage.sync.get(['extensionEnabled', 'lastActivity'])
      
      console.log('🔄 Dashboard: Loading metadata...')
      
      const countsResponse = await sendChromeMessage({ action: 'getTableCounts' })
      
      setData(prevData => ({
        ...prevData,
        totalTabs: tabs.length,
        extensionEnabled: storageData.extensionEnabled ?? true,
        lastActivity: storageData.lastActivity 
          ? new Date(storageData.lastActivity).toLocaleString()
          : 'Never',
        totalRequests: countsResponse?.requests || 0,
        totalErrors: countsResponse?.errors || 0,
        totalTokenEvents: countsResponse?.tokenEvents || 0
      }))
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }, [])

  // Load tabs logging status
  const loadTabsLoggingStatus = useCallback(async () => {
    try {
      const tabs = await chrome.tabs.query({})
      const tabStatusPromises = tabs.map(async (tab) => {
        if (!tab.id || !tab.url) return null
        
        const domain = (() => {
          try {
            return new URL(tab.url).hostname
          } catch {
            return tab.url || 'Unknown'
          }
        })()
        
        const [networkLogging, errorLogging, tokenLogging] = await Promise.all([
          chrome.storage.local.get(`tabLogging_${tab.id}`),
          chrome.storage.local.get(`tabErrorLogging_${tab.id}`),
          chrome.storage.local.get(`tabTokenLogging_${tab.id}`)
        ])
        
        return {
          tabId: tab.id,
          url: tab.url,
          title: tab.title || 'Untitled',
          domain,
          networkLogging: networkLogging[`tabLogging_${tab.id}`] ?? true,
          errorLogging: errorLogging[`tabErrorLogging_${tab.id}`] ?? true,
          tokenLogging: tokenLogging[`tabTokenLogging_${tab.id}`] ?? true,
          favicon: tab.favIconUrl
        }
      })
      
      const statuses = await Promise.all(tabStatusPromises)
      setTabsLoggingStatus(statuses.filter(Boolean) as TabLoggingStatus[])
    } catch (error) {
      console.error('Failed to load tabs status:', error)
    }
  }, [])

  // Load global power state
  const loadGlobalPowerState = useCallback(async () => {
    try {
      const result = await chrome.storage.sync.get(['extensionEnabled'])
      setGlobalPowerEnabled(result.extensionEnabled ?? true)
    } catch (error) {
      console.error('Failed to load global power state:', error)
    }
  }, [])

  // Global power toggle
  const toggleGlobalPower = async () => {
    try {
      const newState = !globalPowerEnabled
      await chrome.storage.sync.set({ extensionEnabled: newState })
      setGlobalPowerEnabled(newState)
      
      // Broadcast the change to background script
      await sendChromeMessage({ 
        action: 'updateExtensionState', 
        enabled: newState 
      })
      
      // Update last activity
      await chrome.storage.sync.set({ lastActivity: new Date().toISOString() })
      
      // Reload data
      loadDashboardData()
    } catch (error) {
      console.error('Failed to toggle global power:', error)
    }
  }

  // Toggle individual tab logging
  const toggleTabLogging = async (tabId: number, type: 'network' | 'error' | 'token') => {
    try {
      const storageKey = type === 'network' ? `tabLogging_${tabId}` :
                        type === 'error' ? `tabErrorLogging_${tabId}` :
                        `tabTokenLogging_${tabId}`
      
      const currentData = await chrome.storage.local.get(storageKey)
      const currentValue = currentData[storageKey] ?? true
      const newValue = !currentValue
      
      await chrome.storage.local.set({ [storageKey]: newValue })
      
      // Update local state
      setTabsLoggingStatus(prev => prev.map(tab => 
        tab.tabId === tabId 
          ? { 
              ...tab, 
              [type === 'network' ? 'networkLogging' : 
               type === 'error' ? 'errorLogging' : 'tokenLogging']: newValue 
            }
          : tab
      ))
      
      // Notify background script
      await sendChromeMessage({
        action: 'updateTabLogging',
        tabId,
        type,
        enabled: newValue
      })
    } catch (error) {
      console.error('Failed to toggle tab logging:', error)
    }
  }

  // Initial data loading
  useEffect(() => {
    loadDashboardData()
    loadTabsLoggingStatus()
    loadGlobalPowerState()
  }, [loadDashboardData, loadTabsLoggingStatus, loadGlobalPowerState])

  // Storage change listeners
  useEffect(() => {
    const handleStorageChanges = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        const hasTabLoggingChanges = Object.keys(changes).some(key => 
          key.startsWith('tabLogging_') || 
          key.startsWith('tabErrorLogging_') || 
          key.startsWith('tabTokenLogging_')
        )
        
        if (hasTabLoggingChanges) {
          loadTabsLoggingStatus()
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChanges)
    return () => chrome.storage.onChanged.removeListener(handleStorageChanges)
  }, [loadTabsLoggingStatus])

  // Real-time refresh
  useEffect(() => {
    let isActive = true
    let refreshInterval: number | null = null
    
    const startPeriodicRefresh = () => {
      if (!isActive) return
      
      refreshInterval = window.setTimeout(() => {
        if (!isActive) return
        loadDashboardData()
        startPeriodicRefresh()
      }, 10000) // 10 second intervals
    }

    // Listen for background script notifications
    const handleBackgroundMessages = (message: any) => {
      if (message.type === 'DATA_UPDATED') {
        loadDashboardData()
      }
    }

    chrome.runtime.onMessage.addListener(handleBackgroundMessages)
    startPeriodicRefresh()

    return () => {
      isActive = false
      if (refreshInterval) {
        clearTimeout(refreshInterval)
      }
      chrome.runtime.onMessage.removeListener(handleBackgroundMessages)
    }
  }, [loadDashboardData])

  // Filter tabs for search
  const filteredTabs = tabsLoggingStatus.filter(tab =>
    tab.title.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.domain.toLowerCase().includes(tabSearchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Web App Monitor Dashboard</h1>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                globalPowerEnabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {globalPowerEnabled ? 'Active' : 'Disabled'}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Global Power Toggle */}
              <button
                onClick={toggleGlobalPower}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  globalPowerEnabled
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {globalPowerEnabled ? 'Disable Extension' : 'Enable Extension'}
              </button>
              
              {/* Sidebar Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-80' : ''}`}>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">🖥️</span>
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
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-lg">🌐</span>
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
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-lg">❌</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Console Errors</p>
                    <p className="text-2xl font-semibold text-gray-900">{data.totalErrors}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">🔑</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Token Events</p>
                    <p className="text-2xl font-semibold text-gray-900">{data.totalTokenEvents}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Navigation */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {featureNames.map((featureName, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentFeature(index)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentFeature === index
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        <span className="flex items-center space-x-2">
                          <span>{featureIcons[index]}</span>
                          <span>{featureName}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Carousel Navigation Arrows */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={prevFeature}
                      className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextFeature}
                      className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Feature Description */}
                <div className="mt-3 text-sm text-gray-600">
                  {featureDescriptions[currentFeature]}
                </div>
              </div>
            </div>

            {/* Feature Content with Lazy Loading */}
            <Suspense fallback={
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">Loading...</span>
                </div>
              </div>
            }>
              {currentFeature === 0 && (
                <NetworkDashboard onRequestDetail={(request) => openDetailViewer(request, 'request')} />
              )}
              {currentFeature === 1 && (
                <ErrorDashboard onErrorDetail={(error) => openDetailViewer(error, 'error')} />
              )}
              {currentFeature === 2 && (
                <TokenDashboard onTokenDetail={(token) => openDetailViewer(token, 'token')} />
              )}
              {currentFeature === 3 && (
                <div className="bg-white rounded-lg shadow">
                  <PerformanceMonitoringDashboard />
                </div>
              )}
            </Suspense>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg z-50 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Tab Logging Controls</h3>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search tabs..."
                    value={tabSearchTerm}
                    onChange={(e) => setTabSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Tab List */}
                <div className="space-y-3">
                  {filteredTabs.map((tab) => (
                    <div key={tab.tabId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start space-x-3">
                        {tab.favicon && (
                          <img
                            src={tab.favicon}
                            alt=""
                            className="w-4 h-4 mt-1 flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{tab.title}</p>
                          <p className="text-xs text-gray-500 truncate">{tab.domain}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Network</span>
                          <button
                            onClick={() => toggleTabLogging(tab.tabId, 'network')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              tab.networkLogging ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                tab.networkLogging ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Errors</span>
                          <button
                            onClick={() => toggleTabLogging(tab.tabId, 'error')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              tab.errorLogging ? 'bg-red-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                tab.errorLogging ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Tokens</span>
                          <button
                            onClick={() => toggleTabLogging(tab.tabId, 'token')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              tab.tokenLogging ? 'bg-yellow-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                tab.tokenLogging ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Viewer */}
      {detailViewer.open && (
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-lg z-40"
             style={{ height: `${detailViewerHeight}px` }}>
          {/* Drag Handle */}
          <div
            className="w-full h-2 bg-gray-100 cursor-ns-resize flex items-center justify-center hover:bg-gray-200"
            onMouseDown={handleMouseDown}
          >
            <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
          </div>
          
          {/* Detail Content */}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {detailViewer.type === 'request' ? 'Request Details' :
                   detailViewer.type === 'error' ? 'Error Details' :
                   'Token Event Details'}
                </h3>
                
                {/* Field Selector */}
                <div className="flex space-x-1">
                  {(detailViewer.type === 'request' ? ['details', 'headers', 'body'] :
                    detailViewer.type === 'error' ? ['details', 'stack'] :
                    ['details', 'headers']).map((field) => (
                    <button
                      key={field}
                      onClick={() => setDetailField(field)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        detailViewer.field === field
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {field.charAt(0).toUpperCase() + field.slice(1)}
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
            <div className="flex-1 overflow-auto p-4">
              {detailViewer.type === 'request' && (
                <RequestDetailContent request={detailViewer.item} selectedField={detailViewer.field} />
              )}
              {detailViewer.type === 'error' && (
                <ErrorDetailContent error={detailViewer.item} selectedField={detailViewer.field} />
              )}
              {detailViewer.type === 'token' && (
                <TokenDetailContent tokenEvent={detailViewer.item} selectedField={detailViewer.field} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Mount the dashboard
const rootElement = document.getElementById('dashboard-root')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(<Dashboard />)
} else {
  console.error('Dashboard root element not found')
}

export default Dashboard
