// Performance monitoring dashboard for IndexedDB optimization testing
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { StorageAnalyzer, StorageBreakdown, IndexedDBQuota } from './StorageAnalyzer'
import type { PerformanceStats as BackgroundPerformanceStats } from '../../background/storage-types'

// Use the background performance stats interface
interface PerformanceStats extends BackgroundPerformanceStats {}

interface StorageStressTestResult {
  operation: string
  recordCount: number
  totalTime: number
  avgTimePerRecord: number
  memoryBefore: number
  memoryAfter: number
  memoryIncrease: number
}

export const PerformanceMonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [stressTestResults, setStressTestResults] = useState<StorageStressTestResult[]>([])
  const [isRunningStressTest, setIsRunningStressTest] = useState(false)
  
  // Storage analysis state
  const [storageAnalyzer] = useState(() => new StorageAnalyzer())
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown | null>(null)
  const [storageQuota, setStorageQuota] = useState<IndexedDBQuota | null>(null)
  const [showPreExistingData, setShowPreExistingData] = useState(true)
  const [isAnalyzingStorage, setIsAnalyzingStorage] = useState(false)

  // Load current performance stats
  const loadStats = async () => {
    try {
      // Get stats from background script
      const response = await chrome.runtime.sendMessage({ 
        action: 'getPerformanceStats' 
      })
      if (response && response.success && response.data) {
        setStats(response.data)
        console.log('Performance stats loaded:', response.data)
      } else {
        console.error('Failed to load performance stats:', response?.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to load performance stats:', error)
    }
  }

  // Analyze storage breakdown and pre-existing data
  const analyzeStorage = async () => {
    setIsAnalyzingStorage(true)
    try {
      const [breakdown, quota] = await Promise.all([
        storageAnalyzer.getDetailedStorageBreakdown(),
        storageAnalyzer.getStorageQuota()
      ])
      
      setStorageBreakdown(breakdown)
      setStorageQuota(quota)
      
      console.log('Storage analysis completed:', {
        breakdown,
        quota,
        hasPreExistingData: breakdown.baseline.preExistingData,
        dataAge: breakdown.baseline.dataAge
      })
    } catch (error) {
      console.error('Failed to analyze storage:', error)
    } finally {
      setIsAnalyzingStorage(false)
    }
  }

  // Clear all data and reset baseline
  const clearDataAndResetBaseline = async () => {
    if (!confirm('This will permanently delete all stored data and reset the performance baseline. Continue?')) {
      return
    }
    
    try {
      // Clear data through background script
      await chrome.runtime.sendMessage({ action: 'clearAllData' })
      
      // Clear storage analyzer baseline
      await storageAnalyzer.clearAllDataAndResetBaseline()
      
      // Refresh analysis
      await analyzeStorage()
      await loadStats()
      
      alert('Data cleared and baseline reset successfully!')
    } catch (error) {
      console.error('Failed to clear data:', error)
      alert('Failed to clear data. Check console for details.')
    }
  }

  // Get storage size excluding pre-existing data
  const getNewDataOnly = async () => {
    if (!storageBreakdown) return
    
    try {
      const trackingStart = storageAnalyzer.getPerformanceTrackingStartTime()
      const newDataBreakdown = await storageAnalyzer.getNewDataSince(trackingStart)
      
      console.log('New data since performance tracking started:', newDataBreakdown)
      
      setStorageBreakdown(prev => ({
        ...newDataBreakdown,
        baseline: {
          ...newDataBreakdown.baseline,
          preExistingData: prev?.baseline.preExistingData || false
        }
      }))
    } catch (error) {
      console.error('Failed to get new data only:', error)
    }
  }

  // Run storage stress test
  const runStressTest = async () => {
    setIsRunningStressTest(true)
    const results: StorageStressTestResult[] = []

    try {
      // Test different load scenarios
      const testScenarios = [
        { name: 'Small batch', count: 10 },
        { name: 'Medium batch', count: 100 },
        { name: 'Large batch', count: 500 },
        { name: 'Very large batch', count: 1000 }
      ]

      for (const scenario of testScenarios) {
        const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0
        const startTime = performance.now()

        // Generate test data and insert
        const testData = Array.from({ length: scenario.count }, (_, i) => ({
          url: `https://test-api.example.com/endpoint/${i}`,
          method: 'GET',
          status: 200,
          timestamp: Date.now() + i,
          response_time: Math.random() * 100
        }))

        // Insert all test records
        for (const data of testData) {
          await chrome.runtime.sendMessage({
            action: 'insertApiCall',
            data
          })
        }

        const totalTime = performance.now() - startTime
        const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0

        results.push({
          operation: scenario.name,
          recordCount: scenario.count,
          totalTime,
          avgTimePerRecord: totalTime / scenario.count,
          memoryBefore,
          memoryAfter,
          memoryIncrease: memoryAfter - memoryBefore
        })

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setStressTestResults(results)
    } catch (error) {
      console.error('Stress test failed:', error)
    } finally {
      setIsRunningStressTest(false)
    }
  }

  // Clear old test data
  const clearTestData = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearAllData' })
      setStressTestResults([])
      loadStats()
    } catch (error) {
      console.error('Failed to clear test data:', error)
    }
  }

  useEffect(() => {
    loadStats()
    analyzeStorage() // Analyze storage on component mount
    const interval = setInterval(() => {
      loadStats()
      analyzeStorage() // Refresh storage analysis periodically
    }, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    return ms < 1 ? `${(ms * 1000).toFixed(1)}μs` : `${ms.toFixed(2)}ms`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🚀 IndexedDB Performance Monitor</CardTitle>
          <p className="text-sm text-gray-600">
            Real-time monitoring of IndexedDB storage performance after SQLite WASM removal
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-gray-600">Total Operations</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.totalOperations || 0}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-gray-600">Memory Usage</div>
              <div className="text-2xl font-bold text-green-600">
                {stats ? formatBytes(stats.memoryUsage.current) : 'N/A'}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-sm text-gray-600">Storage Size</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats ? formatBytes(stats.storageSize.total) : 'N/A'}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-sm text-gray-600">Operations/min</div>
              <div className="text-2xl font-bold text-orange-600">
                {stats ? Math.round(stats.totalOperations / 5) : 0}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={loadStats} variant="outline">
              Refresh Stats
            </Button>
            <Button 
              onClick={runStressTest} 
              disabled={isRunningStressTest}
              variant="default"
            >
              {isRunningStressTest ? 'Running Stress Test...' : 'Run Stress Test'}
            </Button>
            <Button onClick={clearTestData} variant="destructive">
              Clear Test Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats && Object.keys(stats.operationCounts).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Operation</th>
                    <th className="text-right p-2">Count</th>
                    <th className="text-right p-2">Avg Time</th>
                    <th className="text-right p-2">Recent Times</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.operationCounts).map(([operation, count]) => {
                    const times = stats.operationTimes[operation] || []
                    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
                    const recentTimes = times.slice(-5) // Last 5 measurements
                    
                    return (
                      <tr key={operation} className="border-b">
                        <td className="p-2 font-medium">{operation}</td>
                        <td className="p-2 text-right">{count}</td>
                        <td className="p-2 text-right">{formatTime(avgTime)}</td>
                        <td className="p-2 text-right text-xs">
                          {recentTimes.map(time => formatTime(time)).join(', ')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Storage Analysis & Baseline</CardTitle>
          <p className="text-sm text-gray-600">
            Detailed storage breakdown including pre-existing data detection
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Storage Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-indigo-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Records</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {storageBreakdown?.totalRecords || 0}
                </div>
              </div>
              <div className="bg-cyan-50 p-3 rounded">
                <div className="text-sm text-gray-600">Storage Usage</div>
                <div className="text-2xl font-bold text-cyan-600">
                  {storageBreakdown ? formatBytes(storageBreakdown.totalSize) : 'N/A'}
                </div>
              </div>
              <div className="bg-pink-50 p-3 rounded">
                <div className="text-sm text-gray-600">Browser Quota</div>
                <div className="text-2xl font-bold text-pink-600">
                  {storageQuota ? `${storageQuota.usagePercentage.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className={`p-3 rounded ${storageBreakdown?.baseline.preExistingData ? 'bg-yellow-50' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600">Data Status</div>
                <div className={`text-2xl font-bold ${storageBreakdown?.baseline.preExistingData ? 'text-yellow-600' : 'text-green-600'}`}>
                  {storageBreakdown?.baseline.preExistingData ? 'Pre-existing' : 'Clean'}
                </div>
              </div>
            </div>

            {/* Pre-existing Data Warning */}
            {storageBreakdown?.baseline.preExistingData && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-600 text-xl">⚠️</div>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Pre-existing Data Detected</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your IndexedDB contains data from before performance tracking started 
                      ({storageBreakdown.baseline.dataAge.toFixed(1)} hours ago). 
                      This may affect performance accuracy.
                    </p>
                    <div className="mt-3 space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={getNewDataOnly}
                        className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                      >
                        Show New Data Only
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={clearDataAndResetBaseline}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear All & Reset Baseline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Storage Breakdown by Table */}
            {storageBreakdown && (
              <div>
                <h4 className="font-semibold mb-3">Storage Breakdown by Table</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Table</th>
                        <th className="text-right p-2">Records</th>
                        <th className="text-right p-2">Size</th>
                        <th className="text-right p-2">Avg Record Size</th>
                        <th className="text-right p-2">Age Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(storageBreakdown.tables).map(([tableName, tableData]) => (
                        <tr key={tableName} className="border-b">
                          <td className="p-2 font-medium">{tableName}</td>
                          <td className="p-2 text-right">{tableData.recordCount}</td>
                          <td className="p-2 text-right">{formatBytes(tableData.estimatedSize)}</td>
                          <td className="p-2 text-right">{formatBytes(tableData.averageRecordSize)}</td>
                          <td className="p-2 text-right text-xs">
                            {tableData.recordCount > 0 ? (
                              <>
                                {new Date(tableData.oldestRecord).toLocaleTimeString()} - 
                                {new Date(tableData.newestRecord).toLocaleTimeString()}
                              </>
                            ) : 'No data'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Browser Storage Quota */}
            {storageQuota && (
              <div>
                <h4 className="font-semibold mb-3">Browser Storage Quota</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Used:</span>
                      <div className="font-medium">{formatBytes(storageQuota.usage)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Quota:</span>
                      <div className="font-medium">{formatBytes(storageQuota.quota)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Available:</span>
                      <div className="font-medium">{formatBytes(storageQuota.available)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Usage:</span>
                      <div className="font-medium">{storageQuota.usagePercentage.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(storageQuota.usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Controls */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button 
                onClick={analyzeStorage} 
                disabled={isAnalyzingStorage}
                variant="outline"
                size="sm"
              >
                {isAnalyzingStorage ? 'Analyzing...' : 'Refresh Analysis'}
              </Button>
              <Button 
                onClick={() => setShowPreExistingData(!showPreExistingData)}
                variant="outline"
                size="sm"
              >
                {showPreExistingData ? 'Hide' : 'Show'} Pre-existing Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {stressTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stress Test Results</CardTitle>
            <p className="text-sm text-gray-600">
              Performance under different load scenarios
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Scenario</th>
                    <th className="text-right p-2">Records</th>
                    <th className="text-right p-2">Total Time</th>
                    <th className="text-right p-2">Time/Record</th>
                    <th className="text-right p-2">Memory Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {stressTestResults.map((result, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{result.operation}</td>
                      <td className="p-2 text-right">{result.recordCount}</td>
                      <td className="p-2 text-right">{formatTime(result.totalTime)}</td>
                      <td className="p-2 text-right">{formatTime(result.avgTimePerRecord)}</td>
                      <td className="p-2 text-right">
                        <span className={result.memoryIncrease > 1024 * 1024 ? 'text-red-600' : 'text-green-600'}>
                          {formatBytes(result.memoryIncrease)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
