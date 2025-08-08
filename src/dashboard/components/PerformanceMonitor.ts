// Performance monitoring utilities for IndexedDB storage optimization testing
// This helps us measure the real-world impact of removing SQLite WASM

export interface PerformanceMetrics {
  timestamp: number
  operation: string
  duration: number
  memoryUsage?: number
  recordCount?: number
  storageSize?: number
  error?: string
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private startTimes: Map<string, number> = new Map()
  private static readonly MAX_METRICS = 1000 // Limit metrics array size
  private static readonly MAX_START_TIMES = 100 // Limit startTimes Map size
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private cleanupTimer: number | null = null

  constructor(private enableLogging: boolean = true) {
    // Start automatic cleanup
    this.startAutoCleanup()
  }

  // MEMORY LEAK FIX: Automatic cleanup to prevent unbounded growth
  private startAutoCleanup(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.performCleanup()
    }, PerformanceMonitor.CLEANUP_INTERVAL)
  }

  // MEMORY LEAK FIX: Comprehensive cleanup method
  private performCleanup(): void {
    // Limit metrics array size
    if (this.metrics.length > PerformanceMonitor.MAX_METRICS) {
      this.metrics = this.metrics.slice(-PerformanceMonitor.MAX_METRICS / 2) // Keep newest half
    }

    // Clean up orphaned start times (operations that never ended)
    const now = performance.now()
    const orphanThreshold = 10 * 60 * 1000 // 10 minutes
    const toDelete: string[] = []
    
    this.startTimes.forEach((startTime, operation) => {
      if (now - startTime > orphanThreshold) {
        toDelete.push(operation)
      }
    })
    
    toDelete.forEach(operation => {
      this.startTimes.delete(operation)
      if (this.enableLogging) {
        console.warn(`[PerfMonitor] 🧹 Cleaned up orphaned operation: ${operation}`)
      }
    })

    // Limit startTimes Map size
    if (this.startTimes.size > PerformanceMonitor.MAX_START_TIMES) {
      const operations = Array.from(this.startTimes.keys())
      operations.slice(0, this.startTimes.size - PerformanceMonitor.MAX_START_TIMES / 2)
        .forEach(op => this.startTimes.delete(op))
    }

    // Auto-prune old metrics
    this.pruneMetrics()
  }

  // MEMORY LEAK FIX: Cleanup method for component unmount
  destroy(): void {
    if (this.cleanupTimer !== null) {
      window.clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.metrics = []
    this.startTimes.clear()
  }

  // Start timing an operation
  startOperation(operation: string): void {
    this.startTimes.set(operation, performance.now())
    if (this.enableLogging) {
      console.log(`[PerfMonitor] 🚀 Starting: ${operation}`)
    }
  }

  // End timing and record metrics
  async endOperation(operation: string, additionalData?: {
    recordCount?: number
    error?: string
  }): Promise<void> {
    const startTime = this.startTimes.get(operation)
    if (!startTime) {
      console.warn(`[PerfMonitor] ⚠️  No start time found for: ${operation}`)
      return
    }

    const duration = performance.now() - startTime
    this.startTimes.delete(operation)

    // Get memory usage if available
    let memoryUsage: number | undefined
    try {
      // @ts-ignore - performance.memory is not always available
      if (performance.memory) {
        // @ts-ignore
        memoryUsage = performance.memory.usedJSHeapSize
      }
    } catch (e) {
      // Ignore memory access errors
    }

    // Get storage size
    let storageSize: number | undefined
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        storageSize = estimate.usage
      }
    } catch (e) {
      // Ignore storage estimate errors
    }

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation,
      duration,
      memoryUsage,
      storageSize,
      ...additionalData
    }

    // MEMORY LEAK FIX: Prevent unbounded growth
    this.metrics.push(metric)
    if (this.metrics.length > PerformanceMonitor.MAX_METRICS) {
      this.metrics = this.metrics.slice(-PerformanceMonitor.MAX_METRICS / 2) // Keep newest half
    }

    if (this.enableLogging) {
      console.log(`[PerfMonitor] ✅ ${operation}: ${duration.toFixed(2)}ms`, {
        memory: memoryUsage ? `${(memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        storage: storageSize ? `${(storageSize / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        records: additionalData?.recordCount || 'N/A'
      })
    }
  }

  // Get performance summary
  getSummary(): {
    totalOperations: number
    averageMemoryUsage: number
    currentStorageSize: number
    operationStats: Record<string, {
      count: number
      avgDuration: number
      minDuration: number
      maxDuration: number
      totalRecords?: number
    }>
  } {
    const operationStats: Record<string, any> = {}
    let totalMemory = 0
    let memoryReadings = 0
    let currentStorageSize = 0

    for (const metric of this.metrics) {
      const { operation, duration, memoryUsage, recordCount, storageSize } = metric

      if (!operationStats[operation]) {
        operationStats[operation] = {
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          totalRecords: 0
        }
      }

      const stats = operationStats[operation]
      stats.count++
      stats.totalDuration += duration
      stats.minDuration = Math.min(stats.minDuration, duration)
      stats.maxDuration = Math.max(stats.maxDuration, duration)
      
      if (recordCount) {
        stats.totalRecords += recordCount
      }

      if (memoryUsage) {
        totalMemory += memoryUsage
        memoryReadings++
      }

      if (storageSize) {
        currentStorageSize = storageSize
      }
    }

    // Calculate averages
    for (const operation in operationStats) {
      const stats = operationStats[operation]
      stats.avgDuration = stats.totalDuration / stats.count
      delete stats.totalDuration
    }

    return {
      totalOperations: this.metrics.length,
      averageMemoryUsage: memoryReadings > 0 ? totalMemory / memoryReadings : 0,
      currentStorageSize,
      operationStats
    }
  }

  // Export metrics for analysis
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  // Clear old metrics (keep only recent)
  pruneMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff)
  }

  // Memory pressure detection
  detectMemoryPressure(): {
    isHighMemory: boolean
    memoryUsage: number
    recommendation: string
  } {
    let memoryUsage = 0
    try {
      // @ts-ignore
      if (performance.memory) {
        // @ts-ignore
        memoryUsage = performance.memory.usedJSHeapSize
      }
    } catch (e) {
      return {
        isHighMemory: false,
        memoryUsage: 0,
        recommendation: 'Memory monitoring not available'
      }
    }

    const memoryMB = memoryUsage / 1024 / 1024
    const isHighMemory = memoryMB > 100 // 100MB threshold

    return {
      isHighMemory,
      memoryUsage,
      recommendation: isHighMemory 
        ? 'Consider running storage cleanup or reducing cache size'
        : 'Memory usage is normal'
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// MEMORY LEAK FIX: Cleanup global instance on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.destroy()
  })
}
