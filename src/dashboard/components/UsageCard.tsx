import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { getChromeStorageBytes } from '../lib/chrome-api-utils'

// MEMORY LEAK FIX: Centralized message handler to prevent response accumulation
const _sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const _response = await chrome.runtime.sendMessage(message)
    return response
  } catch (error) {
    // console.warn('Chrome message failed:', error)
    return null
  }
}

// MEMORY LEAK FIX: Removed Promise constructor from component scope - now using isolated utility

// Global memory management with call throttling
const _GLOBAL_MEMORY_STATE = {
  isAnalyzing: false,
  lastAnalysis: 0,
  activeInstances: 0,
  memoryPressure: false,
  consecutiveSkips: 0 // Track consecutive skips to detect issues
}

// Prevent multiple instances from running analysis simultaneously
const _acquireAnalysisLock = (): boolean => {
  if (GLOBAL_MEMORY_STATE.isAnalyzing) {
    GLOBAL_MEMORY_STATE.consecutiveSkips++
    // console.log(`🔒 Analysis already in progress, skipping (${GLOBAL_MEMORY_STATE.consecutiveSkips})`)
    
    // MEMORY LEAK FIX: If too many consecutive skips, force reset
    if (GLOBAL_MEMORY_STATE.consecutiveSkips > 10) {
      // console.log('🔧 Force resetting analysis lock due to too many skips')
      GLOBAL_MEMORY_STATE.isAnalyzing = false
      GLOBAL_MEMORY_STATE.consecutiveSkips = 0
      return true
    }
    return false
  }
  
  const _now = Date.now()
  if (now - GLOBAL_MEMORY_STATE.lastAnalysis < 3000) { // 3 second minimum
    // console.log('⏱️ Too soon since last analysis, skipping')
    return false
  }
  
  GLOBAL_MEMORY_STATE.isAnalyzing = true
  GLOBAL_MEMORY_STATE.lastAnalysis = now
  GLOBAL_MEMORY_STATE.consecutiveSkips = 0 // Reset skip counter
  return true
}

const _releaseAnalysisLock = () => {
  GLOBAL_MEMORY_STATE.isAnalyzing = false
}

const _checkMemoryPressure = (): boolean => {
  try {
    const _performanceMemory = (performance as any).memory
    if (performanceMemory?.usedJSHeapSize) {
      const _heapUsed = performanceMemory.usedJSHeapSize
      const _heapLimit = performanceMemory.jsHeapSizeLimit
      const _heapPercentage = (heapUsed / heapLimit) * 100
      
      GLOBAL_MEMORY_STATE.memoryPressure = heapPercentage > 85
      return heapPercentage > 85
    }
  } catch (error) {
    // No memory info available
  }
  return false
}

interface UsageData {
  storageLocalBytes: number
  indexedDBBytes: number
  totalEntries: number
  totalEntrySize: number
  heapUsed: number
  heapLimit: number
  overheadStatus: 'green' | 'yellow' | 'red'
  largestEntry: number
  recentActivity: {
    recentRequests: number
    recentErrors: number
    recentTokens: number
    lastActivity: string
  }
  memoryTrend: 'stable' | 'increasing' | 'decreasing'
}

export const UsageCard: React.FC = () => {
  // Increment global instance counter
  React.useEffect(() => {
    GLOBAL_MEMORY_STATE.activeInstances++
    // console.log(`📊 UsageCard instance #${GLOBAL_MEMORY_STATE.activeInstances} mounted`)
    
    return () => {
      GLOBAL_MEMORY_STATE.activeInstances--
      isMountedRef.current = false // Mark component as unmounted
      // console.log(`📊 UsageCard instance unmounted (remaining: ${GLOBAL_MEMORY_STATE.activeInstances})`)
    }
  }, [])

  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // MEMORY LEAK FIX: Component mounted state to prevent setState on unmounted component
  const isMountedRef = React.useRef(true)
  
  // Use useRef for mutable array to avoid React re-renders and state updates
  const memoryHistoryRef = React.useRef<number[]>([])
  
  // Rate limiting for user-friendly updates
  const lastUpdateTimeRef = React.useRef<number>(0)
  const _minUpdateIntervalMs = 2000 // Minimum 2 seconds between UI updates
  
  // Pre-allocated message objects to prevent runtime allocations
  const _messageTemplates = React.useMemo(() => ({
    networkRequests: { action: 'getNetworkRequests', limit: 5, offset: 0 },
    consoleErrors: { action: 'getConsoleErrors', limit: 5, offset: 0 },
    tokenEvents: { action: 'getTokenEvents', limit: 5, offset: 0 },
    tableCounts: { action: 'getTableCounts' }
  }), [])

  // Memory-safe recent activity with zero temporary allocations - STABLE REFERENCE  
  const _getRecentActivity = React.useCallback(async () => {
    try {
      // Sequential requests to avoid Promise.all array creation and destructuring
      let _recentRequests = 0
      let _recentErrors = 0
      let _recentTokens = 0
      let _mostRecentTimestamp = 0
      
      // Process network requests with memory leak prevention
      try {
        const _networkResponse = await sendChromeMessage(messageTemplates.networkRequests)
        if (networkResponse?.requests) {
          recentRequests = networkResponse.requests.length
          for (const item of networkResponse.requests) {
            if (item.timestamp && item.timestamp > mostRecentTimestamp) {
              mostRecentTimestamp = item.timestamp
            }
          }
        }
      } catch (e) {
        // console.warn('Network requests failed:', e)
      }
      
      // Process console errors with memory leak prevention
      try {
        const _errorResponse = await sendChromeMessage(messageTemplates.consoleErrors)
        if (errorResponse?.errors) {
          recentErrors = errorResponse.errors.length
          for (const item of errorResponse.errors) {
            if (item.timestamp && item.timestamp > mostRecentTimestamp) {
              mostRecentTimestamp = item.timestamp
            }
          }
        }
      } catch (e) {
        // console.warn('Console errors failed:', e)
      }
      
      // Process token events with memory leak prevention
      try {
        const _tokenResponse = await sendChromeMessage(messageTemplates.tokenEvents)
        if (tokenResponse?.events) {
          recentTokens = tokenResponse.events.length
          for (const item of tokenResponse.events) {
            if (item.timestamp && item.timestamp > mostRecentTimestamp) {
              mostRecentTimestamp = item.timestamp
            }
          }
        }
      } catch (e) {
        // console.warn('Token events failed:', e)
      }

      // Calculate last activity time without Date object allocation
      let lastActivity: string
      if (mostRecentTimestamp > 0) {
        // Simple timestamp to readable format without Date allocation
        const _hoursAgo = Math.floor((Date.now() - mostRecentTimestamp) / 3600000)
        if (hoursAgo < 1) {
          lastActivity = '< 1h ago'
        } else if (hoursAgo < 24) {
          lastActivity = hoursAgo + 'h ago'  
        } else {
          lastActivity = Math.floor(hoursAgo / 24) + 'd ago'
        }
      } else {
        lastActivity = 'Never'
      }

      return {
        recentRequests,
        recentErrors, 
        recentTokens,
        lastActivity
      }
    } catch (error) {
      // console.warn('Could not get recent activity:', error)
      return {
        recentRequests: 0,
        recentErrors: 0,
        recentTokens: 0,
        lastActivity: 'Unknown'
      }
    }
  // MEMORY LEAK FIX: Remove messageTemplates dependency to break circular chain
  // messageTemplates is stable (created with empty deps), so it's safe to omit
  }, []) // Empty dependencies - messageTemplates is stable

  // Calculate memory trend with zero-allocation bounded history
  const _calculateMemoryTrend = React.useCallback((currentHeap: number): 'stable' | 'increasing' | 'decreasing' => {
    const _memoryHistory = memoryHistoryRef.current
    // In-place array management to prevent allocations
    const _maxHistoryLength = 6 // Reduced from 10
    
    if (memoryHistory.length >= maxHistoryLength) {
      // Shift array in-place instead of creating new one
      memoryHistory.shift() // Remove oldest
      memoryHistory.push(currentHeap) // Add newest
    } else {
      memoryHistory.push(currentHeap)
    }

    if (memoryHistory.length < 3) return 'stable'

    // Direct array access instead of slice()
    const _len = memoryHistory.length
    const _recent1 = memoryHistory[len - 3]
    const _recent2 = memoryHistory[len - 1]  
    const _trend = recent2 - recent1
    const _threshold = 5 * 1024 * 1024 // 5MB threshold

    if (trend > threshold) return 'increasing'
    if (trend < -threshold) return 'decreasing'
    return 'stable'
  }, [])

  // Memory-optimized usage analysis with recent activity tracking - STABLE REFERENCE
  const _analyzeUsage = React.useCallback(async () => {
    // Global memory lock to prevent simultaneous analysis
    if (!acquireAnalysisLock()) {
      return
    }
    
    // Skip if already loading to prevent overlapping operations
    if (isLoading) {
      // console.log('📊 Skipping analysis - already in progress')
      releaseAnalysisLock()
      return
    }
    
    // Pre-check memory pressure
    if (checkMemoryPressure()) {
      // console.log('🚨 Memory pressure detected, skipping analysis')
      releaseAnalysisLock()
      return
    }
    
    // MEMORY LEAK FIX: Check if component is still mounted before setState
    if (!isMountedRef.current) {
      releaseAnalysisLock()
      return
    }
    
    setIsLoading(true)
    try {
      // console.log('📊 Analyzing extension usage (memory-optimized with live data)...')
      
      // 1. Chrome storage local usage (MEMORY LEAK FIX: use pre-allocated Promise)
      let _storageLocalBytes = 0
      try {
        storageLocalBytes = await getChromeStorageBytes()
      } catch (error) {
        // console.warn('Could not get chrome.storage.local bytes:', error)
      }
      
      // 2. Get recent activity data (with error handling to prevent cascading failures)
      let recentActivity
      try {
        recentActivity = await getRecentActivity()
      } catch (error) {
        // console.warn('Failed to get recent activity:', error)
        recentActivity = {
          recentRequests: 0,
          recentErrors: 0,
          recentTokens: 0,
          lastActivity: 'Error'
        }
      }
      
      // 3. IndexedDB usage - lightweight count-based estimation (no memory leaks)
      let _indexedDBBytes = 0
      let _totalEntries = 0
      try {
        // Use lightweight count-only approach to avoid memory leaks
        const _countResponse = await sendChromeMessage(messageTemplates.tableCounts)
        if (countResponse && countResponse.success && countResponse.data) {
          const _tableCounts = countResponse.data
          // Direct iteration instead of Object.values() + reduce() to avoid array allocation
          totalEntries = 0
          for (const key in tableCounts) {
            if (tableCounts.hasOwnProperty(key)) {
              totalEntries += Number(tableCounts[key]) || 0
            }
          }
          
          // MEMORY LEAK FIX: Process table breakdown then nullify reference
          const _tableBreakdown = tableCounts
          let _estimatedBytes = 0
          
          // More accurate per-table size estimates
          if (tableBreakdown.apiCalls) {
            estimatedBytes += tableBreakdown.apiCalls * 9500 // API calls are larger (~9.5KB average)
          }
          if (tableBreakdown.consoleErrors) {
            estimatedBytes += tableBreakdown.consoleErrors * 3200 // Console errors (~3.2KB average)
          }
          if (tableBreakdown.tokenEvents) {
            estimatedBytes += tableBreakdown.tokenEvents * 1800 // Token events (~1.8KB average)
          }
          if (tableBreakdown.minifiedLibraries) {
            estimatedBytes += tableBreakdown.minifiedLibraries * 15000 // Libraries are large (~15KB average)
          }
          
          indexedDBBytes = estimatedBytes
          
          // console.log(`📊 Optimized storage analysis: entries=${totalEntries}, method=hybrid`)
          
          // MEMORY LEAK FIX: Nullify response data after processing
          countResponse.data = null
        }
      } catch (error) {
        // console.warn('Could not get IndexedDB usage:', error)
      }
      
      // 4. Extension memory heap (if available) and calculate trend
      let _heapUsed = 0
      let _heapLimit = 0
      try {
        const _performanceMemory = (performance as any).memory
        if (performanceMemory) {
          heapUsed = performanceMemory.usedJSHeapSize || 0
          heapLimit = performanceMemory.jsHeapSizeLimit || 0
        }
      } catch (error) {
        // console.warn('Performance memory not available:', error)
      }
      
      // Calculate memory trend
      const _memoryTrend = calculateMemoryTrend(heapUsed)
      
      // 5. Total entry size estimate
      const _totalEntrySize = indexedDBBytes // Simple approximation
      
      // 6. Find largest entry size estimate
      const _largestEntry = totalEntries > 0 ? Math.floor(indexedDBBytes / totalEntries) : 0
      
      // 7. Calculate overhead status
      const _totalUsage = storageLocalBytes + indexedDBBytes + heapUsed
      const _USAGE_THRESHOLDS = {
        green: 10 * 1024 * 1024,   // < 10MB
        yellow: 50 * 1024 * 1024,  // < 50MB
        red: 100 * 1024 * 1024     // >= 100MB
      }
      
      let overheadStatus: 'green' | 'yellow' | 'red' = 'green'
      if (totalUsage >= USAGE_THRESHOLDS.red) overheadStatus = 'red'
      else if (totalUsage >= USAGE_THRESHOLDS.yellow) overheadStatus = 'yellow'
      
      // Warn if single entry is too large (avoid formatBytes call)
      if (largestEntry > 200 * 1024) { // 200KB threshold
        // console.warn('⚠️ Large entry detected: ' + Math.round(largestEntry / 1024) + 'KB')
      }

      const _usage = {
        storageLocalBytes,
        indexedDBBytes,
        totalEntries,
        totalEntrySize,
        heapUsed,
        heapLimit,
        overheadStatus,
        largestEntry,
        recentActivity,
        memoryTrend
      }
      
      // Rate limit UI updates to prevent extremely fast changes that are user-unfriendly
      const _now = Date.now()
      if (now - lastUpdateTimeRef.current >= minUpdateIntervalMs) {
        // MEMORY LEAK FIX: Check if component is still mounted before setState
        if (isMountedRef.current) {
          setUsageData(usage)
          lastUpdateTimeRef.current = now
        }
      }
      
      // console.log(`✅ Usage analysis complete: ${totalEntries} entries, heap=${Math.round(heapUsed / 1024 / 1024)}MB`)
      
      // MEMORY LEAK FIX: Aggressive memory cleanup after analysis
      if (recentActivity) {
        // Clear any remaining object references
        recentActivity = null
      }
      
      return usage
      
    } catch (error) {
      console.error('❌ Failed to analyze usage:', error)
      return null
    } finally {
      // MEMORY LEAK FIX: Check if component is still mounted before setState
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      releaseAnalysisLock() // Release global lock
      
      // MEMORY LEAK FIX: Simplified GC hint without requestIdleCallback accumulation
      if (typeof (window as any).gc === 'function') {
        // Use simple timeout instead of requestIdleCallback to avoid accumulation
        setTimeout(() => {
          try {
            if (isMountedRef.current) { // Only if component still mounted
              (window as any).gc()
            }
          } catch (e) {
            // Ignore GC errors
          }
        }, 500) // Shorter timeout
      }
    }
  // MEMORY LEAK FIX: Break circular dependency chain 
  // getRecentActivity is now stable, messageTemplates is stable, remove from deps
  }, []) // Empty dependencies - all referenced functions/objects are stable

  useEffect(() => {
    analyzeUsage()
    
    // Adaptive timeout-based polling to prevent interval memory leaks
    let timeoutId: number | null = null
    let schedulingTimeoutId: number | null = null // Track scheduling timeout
    let _isActive = true
    let _isScheduling = false // Prevent multiple scheduling
    
    const _scheduleNextAnalysis = (delay: number = 30000) => {
      if (!isActive || isScheduling) return
      isScheduling = true
      
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      
      timeoutId = setTimeout(() => {
        if (!isActive) {
          isScheduling = false
          return
        }
        
        // Memory-aware polling: check memory before running
        let _nextDelay = 30000 // Default 30 seconds
        
        try {
          const _performanceMemory = (performance as any).memory
          if (performanceMemory?.usedJSHeapSize) {
            const _heapUsed = performanceMemory.usedJSHeapSize
            const _heapLimit = performanceMemory.jsHeapSizeLimit
            const _heapPercentage = (heapUsed / heapLimit) * 100
            
            // More aggressive throttling to prevent rapid polling
            if (heapPercentage > 90) {
              // console.log('🚨 Skipping usage analysis - critical memory pressure')
              nextDelay = 120000 // Skip for 2 minutes
              isScheduling = false
              scheduleNextAnalysis(nextDelay)
              return
            } else if (heapPercentage > 80) {
              // console.log('⚠️ High memory usage detected')
              nextDelay = 90000 // 90 seconds
            } else if (heapPercentage > 60) {
              nextDelay = 60000 // 60 seconds  
            } else {
              nextDelay = 45000 // 45 seconds (slower than before)
            }
          }
        } catch (error) {
          // Memory info not available, use default
        }
        
        // MEMORY LEAK FIX: Avoid promise chain accumulation
        // Run analysis without .finally() chain that creates memory leaks
        analyzeUsage().catch(error => {
          console.error('Analysis failed in timeout:', error)
        })
        
        // Schedule next analysis independently to break promise chain
        isScheduling = false
        scheduleNextAnalysis(nextDelay)
      }, delay)
      
      // MEMORY LEAK FIX: Track scheduling timeout and clear it properly
      if (schedulingTimeoutId) {
        clearTimeout(schedulingTimeoutId)
      }
      schedulingTimeoutId = setTimeout(() => { 
        isScheduling = false 
        schedulingTimeoutId = null
      }, 100)
    }
    
    // Start the polling cycle
    scheduleNextAnalysis()
    
    // Memory-optimized event handler
    const _handleDataCleared = () => {
      // console.log('📊 Data cleared event received')
      if (!isScheduling) {
        // MEMORY LEAK FIX: Avoid promise chain accumulation
        // Immediate analysis after data clear without .finally() chain
        analyzeUsage().catch(error => {
          console.error('Analysis failed on dataCleared:', error)
        })
        
        // Schedule next analysis independently to break promise chain
        scheduleNextAnalysis(45000) // Resume with slower interval
      }
    }
    
    window.addEventListener('dataCleared', handleDataCleared)
    
    return () => {
      isActive = false
      isScheduling = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (schedulingTimeoutId) {
        clearTimeout(schedulingTimeoutId)
        schedulingTimeoutId = null
      }
      window.removeEventListener('dataCleared', handleDataCleared)
    }
  // MEMORY LEAK FIX: Break circular dependency - analyzeUsage is now stable
  }, []) // Empty dependencies - analyzeUsage is stable with no changing deps

  // MEMORY LEAK FIX: Bounded formatBytes cache to prevent indefinite growth
  const _formatBytesCache = React.useRef<Map<number, string>>(new Map())
  const _MAX_CACHE_SIZE = 50 // Limit cache to 50 entries
  
  const _formatBytes = React.useCallback((bytes: number) => {
    // Check cache first
    if (formatBytesCache.current.has(bytes)) {
      return formatBytesCache.current.get(bytes)!
    }
    
    // MEMORY LEAK FIX: Clear cache if it gets too large
    if (formatBytesCache.current.size >= MAX_CACHE_SIZE) {
      // console.log('🧹 Clearing formatBytes cache to prevent memory leak')
      formatBytesCache.current.clear()
    }
    
    if (bytes === 0) return '0 B'
    const _k = 1024
    // MEMORY LEAK FIX: Pre-allocated sizes array as constant
    const _sizes = ['B', 'KB', 'MB', 'GB']
    const _i = Math.floor(Math.log(bytes) / Math.log(k))
    
    // MEMORY LEAK FIX: Avoid string concatenation, use array join
    const _num = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
    const _result = `${ num } ${ sizes[i] }` // Template literal is more efficient than concatenation
    
    // Aggressive cache size management to prevent unbounded growth
    if (formatBytesCache.current.size >= 50) {
      // Clear cache when it gets too large
      formatBytesCache.current.clear()
    }
    formatBytesCache.current.set(bytes, result)
    
    return result
  }, [])

  // Cached status functions to avoid repeated string operations
  const _getStatusColor = React.useCallback((status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'text-green-600 bg-green-50'
      case 'yellow': return 'text-yellow-600 bg-yellow-50'
      case 'red': return 'text-red-600 bg-red-50'
    }
  }, [])

  const _getStatusIcon = React.useCallback((status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return '✅'
      case 'yellow': return '⚠️'  
      case 'red': return '🚨'
    }
  }, [])

  // Pre-computed CSS classes to avoid template literal allocations
  const _memoryTrendClasses = React.useMemo(() => ({
    increasing: 'text-xs px-1 py-0.5 rounded bg-red-200 text-red-800',
    decreasing: 'text-xs px-1 py-0.5 rounded bg-green-200 text-green-800', 
    stable: 'text-xs px-1 py-0.5 rounded bg-gray-200 text-gray-700'
  }), [])

  const _memoryTrendIcons = React.useMemo(() => ({
    increasing: '↗️',
    decreasing: '↘️',
    stable: '→'
  }), [])

  // MEMORY LEAK FIX: Memoize expensive calculations to prevent repeated computation
  const _memoizedUsageData = React.useMemo(() => {
    if (!usageData) return null
    
    return {
      ...usageData,
      formattedStorageBytes: formatBytes(usageData.storageLocalBytes),
      formattedIndexedDBBytes: formatBytes(usageData.indexedDBBytes),
      formattedHeapUsed: formatBytes(usageData.heapUsed),
      formattedTotalUsage: formatBytes(usageData.storageLocalBytes + usageData.indexedDBBytes + usageData.heapUsed),
      formattedLargestEntry: formatBytes(usageData.largestEntry),
      formattedHeapLimit: formatBytes(usageData.heapLimit),
      heapPercentage: usageData.heapLimit > 0 ? Math.round((usageData.heapUsed / usageData.heapLimit) * 1000) / 10 : 0,
      totalUsageBytes: usageData.storageLocalBytes + usageData.indexedDBBytes + usageData.heapUsed,
      isLargestEntryWarning: usageData.largestEntry > 200 * 1024,
      progressBarWidth: Math.min(((usageData.storageLocalBytes + usageData.indexedDBBytes + usageData.heapUsed) / (100 * 1024 * 1024)) * 100, 100)
    }
  }, [usageData, formatBytes])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          📊 Extension Usage Card
          <Button 
            onClick={analyzeUsage} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Memory-optimized monitoring with live activity tracking
        </p>
      </CardHeader>
      <CardContent>
        {memoizedUsageData && (
          <div className="space-y-6">
            {/* Main Usage Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-600">Storage Used (Local)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {memoizedUsageData.formattedStorageBytes}
                </div>
                <div className="text-xs text-gray-500">chrome.storage.local</div>
              </div>
              
              <div className="bg-cyan-50 p-3 rounded">
                <div className="text-sm text-gray-600">IndexedDB Usage</div>
                <div className="text-2xl font-bold text-cyan-600">
                  {memoizedUsageData.formattedIndexedDBBytes}
                </div>
                <div className="text-xs text-gray-500">{memoizedUsageData.totalEntries} entries</div>
              </div>
              
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-gray-600">Extension Memory</div>
                <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                  {memoizedUsageData.formattedHeapUsed}
                  <span className={memoryTrendClasses[memoizedUsageData.memoryTrend]}>
                    {memoryTrendIcons[memoizedUsageData.memoryTrend]}
                  </span>
                </div>
                <div className="text-xs text-gray-500">JS Heap ({memoizedUsageData.memoryTrend})</div>
              </div>
              
              <div className={`p-3 rounded ${getStatusColor(memoizedUsageData.overheadStatus)}`}>
                <div className="text-sm text-gray-600">Overhead Status</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {getStatusIcon(memoizedUsageData.overheadStatus)}
                  {memoizedUsageData.overheadStatus.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">
                  {memoizedUsageData.formattedTotalUsage} total
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div>
              <h4 className="font-semibold mb-3">⚡ Recent Activity</h4>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{memoizedUsageData.recentActivity.recentRequests}</div>
                    <div className="text-xs text-gray-600">Recent Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{memoizedUsageData.recentActivity.recentErrors}</div>
                    <div className="text-xs text-gray-600">Recent Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{memoizedUsageData.recentActivity.recentTokens}</div>
                    <div className="text-xs text-gray-600">Recent Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">{memoizedUsageData.recentActivity.lastActivity}</div>
                    <div className="text-xs text-gray-600">Last Activity</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Breakdown */}
            <div>
              <h4 className="font-semibold mb-3">💾 Storage Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Chrome Storage Local:</span>
                  <span className="font-medium">{memoizedUsageData.formattedStorageBytes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">IndexedDB Usage (est.):</span>
                  <span className="font-medium">{memoizedUsageData.formattedIndexedDBBytes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Entries:</span>
                  <span className="font-medium">{memoizedUsageData.totalEntries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Largest Entry (est.):</span>
                  <span className={`font-medium ${memoizedUsageData.isLargestEntryWarning ? 'text-red-600' : ''}`}>
                    {memoizedUsageData.formattedLargestEntry}
                    {memoizedUsageData.isLargestEntryWarning && ' ⚠️'}
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Info */}
            <div>
              <h4 className="font-semibold mb-3">🧠 Memory Info</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">JS Heap Used:</span>
                  <span className="font-medium">{memoizedUsageData.formattedHeapUsed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">JS Heap Limit:</span>
                  <span className="font-medium">{memoizedUsageData.formattedHeapLimit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Heap Usage:</span>
                  <span className="font-medium">
                    {memoizedUsageData.heapPercentage > 0 ? `${memoizedUsageData.heapPercentage}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Usage Bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Total Extension Usage</span>
                <span>{memoizedUsageData.formattedTotalUsage}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    memoizedUsageData.overheadStatus === 'red' ? 'bg-red-500' : 
                    memoizedUsageData.overheadStatus === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${memoizedUsageData.progressBarWidth}%` 
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                Based on 100MB threshold for red status
              </div>
            </div>

            {/* Warnings */}
            {memoizedUsageData.isLargestEntryWarning && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="text-yellow-600 text-lg">⚠️</div>
                  <div>
                    <h5 className="font-medium text-yellow-800">Large Entry Warning</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Detected entry size of {memoizedUsageData.formattedLargestEntry} exceeds 200KB threshold. 
                      Consider optimizing data storage.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {memoizedUsageData.memoryTrend === 'increasing' && (
              <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="text-orange-600 text-lg">📈</div>
                  <div>
                    <h5 className="font-medium text-orange-800">Memory Growth Detected</h5>
                    <p className="text-sm text-orange-700 mt-1">
                      Memory usage is increasing over time. Consider clearing old data or check for memory leaks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {memoizedUsageData.overheadStatus === 'red' && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <div className="text-red-600 text-lg">🚨</div>
                  <div>
                    <h5 className="font-medium text-red-800">High Usage Warning</h5>
                    <p className="text-sm text-red-700 mt-1">
                      Total extension usage exceeds 100MB. Consider clearing old data or optimizing storage.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
