import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { UsageCard } from './UsageCard'

interface PerformanceStats {
  totalOperations: number
  memoryUsage: { current: number, peak: number, average: number }
  storageSize: { total: number, available: number }
  operationCounts: Record<string, number>
  operationTimes: Record<string, number[]>
}

interface StorageStressTestResult {
  operation: string
  recordCount: number
  totalTime: number
  avgTimePerRecord: number
  memoryBefore: number
  memoryAfter: number
  memoryIncrease: number
}

export // Centralized Chrome message handler to prevent response accumulation
const sendChromeMessage = async (message: any) => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    // Immediately nullify response object references to prevent accumulation
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    console.error('Chrome message failed:', error)
    return null
  }
}

export const PerformanceMonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [stressTestResults, setStressTestResults] = useState<StorageStressTestResult[]>([])
  const [isRunningStressTest, setIsRunningStressTest] = useState(false)

  // Load current performance stats
  const loadStats = async () => {
    try {
      // Get stats from background script
      const response = await sendChromeMessage({ 
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
          await sendChromeMessage({
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
      await sendChromeMessage({ action: 'clearAllData' })
      setStressTestResults([])
      loadStats()
    } catch (error) {
      console.error('Failed to clear test data:', error)
    }
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000) // Refresh every 5 seconds
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
      {/* New Usage Card - Lightweight and Fast */}
      <UsageCard />

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
                      <td className="p-2 text-right">{formatBytes(result.memoryIncrease)}</td>
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