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

  constructor(private enableLogging: boolean = true) {}

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

    this.metrics.push(metric)

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
