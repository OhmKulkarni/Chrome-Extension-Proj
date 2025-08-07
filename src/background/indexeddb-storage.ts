// IndexedDB implementation with performance monitoring
import type { StorageOperations, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary, StorageConfig, PerformanceStats } from './storage-types'

// Simple performance tracking for background context
class BackgroundPerformanceTracker {
  private operationCounts: Record<string, number> = {}
  private operationTimes: Record<string, number[]> = {}
  private startTime = Date.now()
  private memoryPeak = 0

  trackOperation(operation: string, duration: number): void {
    this.operationCounts[operation] = (this.operationCounts[operation] || 0) + 1
    if (!this.operationTimes[operation]) {
      this.operationTimes[operation] = []
    }
    this.operationTimes[operation].push(duration)
    
    // Keep only recent measurements (last 100)
    if (this.operationTimes[operation].length > 100) {
      this.operationTimes[operation].shift()
    }

    // Track memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory
      if (memory.usedJSHeapSize > this.memoryPeak) {
        this.memoryPeak = memory.usedJSHeapSize
      }
    }

    // Log performance for monitoring
    if (this.operationCounts[operation] % 10 === 0) {
      const times = this.operationTimes[operation]
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      console.log(`[IndexedDB-Perf] ${operation}: ${avg.toFixed(2)}ms avg (${this.operationCounts[operation]} ops)`)
    }
  }

  getStats(): PerformanceStats {
    const totalOperations = Object.values(this.operationCounts).reduce((a, b) => a + b, 0)
    const allTimes = Object.values(this.operationTimes).flat()
    const averageOperationTime = allTimes.length > 0 ? 
      allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0

    // Get current memory usage if available
    let currentMemory = 0
    let averageMemory = 0
    if ('memory' in performance) {
      const memory = (performance as any).memory
      currentMemory = memory.usedJSHeapSize
      averageMemory = Math.min(currentMemory, this.memoryPeak / 2) // Simple estimation
    }

    return {
      totalOperations,
      averageOperationTime,
      operationCounts: { ...this.operationCounts },
      operationTimes: { ...this.operationTimes },
      memoryUsage: {
        current: currentMemory,
        peak: this.memoryPeak,
        average: averageMemory
      },
      storageSize: {
        total: 0, // Will be filled by getStorageInfo
        byTable: {}
      },
      lastReset: this.startTime,
      uptime: Date.now() - this.startTime
    }
  }
}

const perfTracker = new BackgroundPerformanceTracker()

export class IndexedDBStorage implements StorageOperations {
  private db: IDBDatabase | null = null
  private config: StorageConfig
  private initPromise: Promise<void> | null = null

  constructor(config: StorageConfig) {
    this.config = config
  }

  async init(): Promise<void> {
    // Prevent concurrent initialization
    if (this.initPromise) {
      console.log('🔄 IndexedDB: Initialization already in progress, waiting...')
      return this.initPromise
    }
    
    // If database is already initialized and healthy, return early
    if (this.db) {
      try {
        // Quick health check
        if (this.db.objectStoreNames.length > 0) {
          console.log('✅ IndexedDB: Database already initialized and healthy')
          return Promise.resolve()
        }
      } catch (error) {
        console.warn('🔄 IndexedDB: Health check failed, reinitializing...')
        this.db = null
      }
    }

    // MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
    this.initPromise = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      console.log('🔧 IndexedDB: Starting database initialization...')
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('DevToolsExtension', 2)
        
        request.onerror = () => {
          console.error('❌ IndexedDB: Failed to open database:', request.error)
          reject(new Error('Failed to open IndexedDB'))
        }
        
        request.onsuccess = () => {
          resolve(request.result)
        }
        
        request.onupgradeneeded = () => {
          const db = request.result
          console.log('🔄 IndexedDB: Database upgrade needed')
          
          // Create object stores
          if (!db.objectStoreNames.contains('apiCalls')) {
            const apiStore = db.createObjectStore('apiCalls', { keyPath: 'id' })
            apiStore.createIndex('timestamp', 'timestamp', { unique: false })
            apiStore.createIndex('domain', 'domain', { unique: false })
            console.log('📦 IndexedDB: Created apiCalls store')
          }
          
          if (!db.objectStoreNames.contains('consoleErrors')) {
            const errorStore = db.createObjectStore('consoleErrors', { keyPath: 'id' })
            errorStore.createIndex('timestamp', 'timestamp', { unique: false })
            errorStore.createIndex('domain', 'domain', { unique: false })
            console.log('📦 IndexedDB: Created consoleErrors store')
          }
          
          if (!db.objectStoreNames.contains('tokenEvents')) {
            const tokenStore = db.createObjectStore('tokenEvents', { keyPath: 'id' })
            tokenStore.createIndex('timestamp', 'timestamp', { unique: false })
            tokenStore.createIndex('domain', 'domain', { unique: false })
            console.log('📦 IndexedDB: Created tokenEvents store')
          }
          
          if (!db.objectStoreNames.contains('minifiedLibraries')) {
            const libraryStore = db.createObjectStore('minifiedLibraries', { keyPath: 'id' })
            libraryStore.createIndex('domain', 'domain', { unique: false })
            console.log('📦 IndexedDB: Created minifiedLibraries store')
          }
        }
      })
      
      this.db = db
      console.log('✅ IndexedDB: Database opened successfully')
      console.log('📊 IndexedDB: Available stores:', Array.from(this.db.objectStoreNames))
      this.startAutoPruning()
      this.initPromise = null
    } catch (error) {
      console.error('❌ IndexedDB: Database initialization failed:', error)
      this.initPromise = null
      throw error
    }
  }

  // MEMORY LEAK FIX: Helper method to avoid Promise constructor pattern
  private async promiseFromRequest<T>(request: IDBRequest<T>, transaction: IDBTransaction): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Handle transaction errors
      transaction.onerror = () => {
        const error = transaction.error?.message || 'Transaction failed'
        console.error(`IndexedDB transaction error: ${error}`)
        reject(new Error(`Transaction failed: ${error}`))
      }
      
      transaction.onabort = () => {
        console.error('IndexedDB transaction aborted')
        reject(new Error('Transaction aborted'))
      }
      
      // Handle request success/error
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        const error = request.error?.message || 'Request failed'
        console.error(`IndexedDB request error: ${error}`)
        reject(new Error(`Request failed: ${error}`))
      }
    })
  }

  // MEMORY LEAK FIX: Helper method for cursor-based Promise handling
  private async promiseFromCursor<T extends any[]>(
    request: IDBRequest<IDBCursorWithValue | null>, 
    transaction: IDBTransaction,
    limit: number,
    offset: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const results: any[] = []
      let count = 0
      
      // Handle transaction errors
      transaction.onerror = () => {
        const error = transaction.error?.message || 'Transaction failed'
        console.error(`IndexedDB transaction error: ${error}`)
        reject(new Error(`Transaction failed: ${error}`))
      }
      
      transaction.onabort = () => {
        console.error('IndexedDB transaction aborted')
        reject(new Error('Transaction aborted'))
      }
      
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < offset + limit) {
          if (count >= offset) {
            results.push(cursor.value)
          }
          count++
          cursor.continue()
        } else {
          resolve(results as T)
        }
      }
      
      request.onerror = () => {
        const error = request.error?.message || 'Cursor request failed'
        console.error(`IndexedDB cursor error: ${error}`)
        reject(new Error(`Cursor failed: ${error}`))
      }
    })
  }

  private autoPruneInterval: number | null = null;

  private startAutoPruning() {
    // MEMORY LEAK FIX: Clear existing interval before setting new one
    if (this.autoPruneInterval) {
      clearInterval(this.autoPruneInterval);
    }
    
    const intervalMs = this.config.pruneIntervalHours * 60 * 60 * 1000
    this.autoPruneInterval = setInterval(() => {
      this.pruneOldData().catch(console.error)
    }, intervalMs)
  }

  // MEMORY LEAK FIX: Method to stop auto-pruning and clear interval
  public stopAutoPruning() {
    if (this.autoPruneInterval) {
      clearInterval(this.autoPruneInterval);
      this.autoPruneInterval = null;
    }
  }

  private async performTransaction<T>(
    storeName: string, 
    mode: IDBTransactionMode, 
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) throw new Error('Database not initialized')
    
    // Check if database connection is healthy
    try {
      // Test if we can access basic database properties
      if (!this.db.objectStoreNames || this.db.objectStoreNames.length === 0) {
        console.warn('🔄 Database appears to be in invalid state, reinitializing...')
        await this.init()
      }
    } catch (error) {
      console.warn('🔄 Database connection test failed, reinitializing...', error)
      await this.init()
    }
    
    // Check if database connection is still valid by checking if it has the expected store
    if (!this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Database missing expected store '${storeName}', reinitializing...`)
      await this.init()
      if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
        throw new Error(`Database initialization failed - store '${storeName}' not found`)
      }
    }
    
    // MEMORY LEAK FIX: Convert Promise constructor to helper method
    try {
      const transaction = this.db!.transaction([storeName], mode)
      const store = transaction.objectStore(storeName)
      const request = operation(store)
      
      return await this.promiseFromRequest<T>(request, transaction)
      
    } catch (error) {
      console.error('Error creating IndexedDB transaction:', error)
      throw error
    }
  }

  // API Calls
  async insertApiCall(data: Omit<ApiCall, 'id'>): Promise<number> {
    const startTime = performance.now()
    try {
      const result = await this.performTransaction('apiCalls', 'readwrite', 
        (store) => store.add(data)
      )
      perfTracker.trackOperation('insertApiCall', performance.now() - startTime)
      return result as number
    } catch (error) {
      perfTracker.trackOperation('insertApiCall_error', performance.now() - startTime)
      throw error
    }
  }

  async getApiCalls(limit = 100, offset = 0): Promise<ApiCall[]> {
    const startTime = performance.now()
    if (!this.db) throw new Error('Database not initialized')
    
    // MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
    try {
      const transaction = this.db!.transaction(['apiCalls'], 'readonly')
      const store = transaction.objectStore('apiCalls')
      const index = store.index('timestamp')
      
      // Use getAll for much faster retrieval when limit is reasonable
      if (limit <= 1000 && offset === 0) {
        // Fast path: get all recent records at once
        const request = index.getAll(null, limit)
        
        // MEMORY LEAK FIX: Use helper method instead of Promise constructor
        const results = await this.promiseFromRequest<ApiCall[]>(request, transaction)
        
        perfTracker.trackOperation('getApiCalls_fast', performance.now() - startTime)
        // Results come in ascending order, reverse for latest first
        return results.reverse()
      }
      
      // Fallback to cursor for large offsets or very large limits
      const request = index.openCursor(null, 'prev') // Latest first
      
      // MEMORY LEAK FIX: Use helper method for cursor Promise
      const results = await this.promiseFromCursor<ApiCall[]>(request, transaction, limit, offset)
      
      perfTracker.trackOperation('getApiCalls_cursor', performance.now() - startTime)
      return results
      
    } catch (error) {
      perfTracker.trackOperation('getApiCalls_error', performance.now() - startTime)
      throw error
    }
  }

  async deleteApiCall(id: number): Promise<void> {
    await this.performTransaction('apiCalls', 'readwrite', 
      (store) => store.delete(id)
    )
  }

  // Fast query method optimized for performance testing
  async getApiCallsFast(limit = 10): Promise<ApiCall[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    // MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
    try {
      const transaction = this.db!.transaction(['apiCalls'], 'readonly')
      const store = transaction.objectStore('apiCalls')
      
      // First get the highest key to determine range
      const countRequest = store.count()
      
      // MEMORY LEAK FIX: Use helper method instead of Promise constructor
      const totalCount = await this.promiseFromRequest<number>(countRequest, transaction)
      
      if (totalCount === 0) {
        return []
      }
      
      // Calculate key range for most recent records
      const startKey = Math.max(1, totalCount - limit + 1)
      const keyRange = IDBKeyRange.lowerBound(startKey)
      
      // Get records using key range on primary key for maximum speed
      const request = store.getAll(keyRange)
      
      // MEMORY LEAK FIX: Use helper method instead of Promise constructor
      const results = await this.promiseFromRequest<ApiCall[]>(request, transaction)
      
      // Sort by ID descending and limit
      return results
        .sort((a, b) => (b.id || 0) - (a.id || 0))
        .slice(0, limit)
      
    } catch (error) {
      throw error
    }
  }

  // Console Errors
  async insertConsoleError(data: Omit<ConsoleError, 'id'>): Promise<number> {
    const result = await this.performTransaction('consoleErrors', 'readwrite', 
      (store) => store.add(data)
    )
    return result as number
  }

  async getConsoleErrors(limit = 100, offset = 0): Promise<ConsoleError[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    // MEMORY LEAK FIX: Convert Promise constructor to helper method
    const transaction = this.db!.transaction(['consoleErrors'], 'readonly')
    const store = transaction.objectStore('consoleErrors')
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev') // Latest first
    
    return await this.promiseFromCursor<ConsoleError[]>(request, transaction, limit, offset)
  }

  async deleteConsoleError(id: number): Promise<void> {
    await this.performTransaction('consoleErrors', 'readwrite', 
      (store) => store.delete(id)
    )
  }

  // Token Events
  async insertTokenEvent(data: Omit<TokenEvent, 'id'>): Promise<number> {
    const result = await this.performTransaction('tokenEvents', 'readwrite', 
      (store) => store.add(data)
    )
    return result as number
  }

  async getTokenEvents(limit = 100, offset = 0): Promise<TokenEvent[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    // MEMORY LEAK FIX: Convert Promise constructor to helper method
    const transaction = this.db!.transaction(['tokenEvents'], 'readonly')
    const store = transaction.objectStore('tokenEvents')
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev') // Latest first
    
    return await this.promiseFromCursor<TokenEvent[]>(request, transaction, limit, offset)
  }

  async deleteTokenEvent(id: number): Promise<void> {
    await this.performTransaction('tokenEvents', 'readwrite', 
      (store) => store.delete(id)
    )
  }

  // Minified Libraries
  async insertMinifiedLibrary(data: Omit<MinifiedLibrary, 'id'>): Promise<number> {
    const result = await this.performTransaction('minifiedLibraries', 'readwrite', 
      (store) => store.add(data)
    )
    return result as number
  }

  async getMinifiedLibraries(limit = 100, offset = 0): Promise<MinifiedLibrary[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    // MEMORY LEAK FIX: Convert Promise constructor to helper method
    const transaction = this.db!.transaction(['minifiedLibraries'], 'readonly')
    const store = transaction.objectStore('minifiedLibraries')
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev') // Latest first
    
    return await this.promiseFromCursor<MinifiedLibrary[]>(request, transaction, limit, offset)
  }

  async deleteMinifiedLibrary(id: number): Promise<void> {
    await this.performTransaction('minifiedLibraries', 'readwrite', 
      (store) => store.delete(id)
    )
  }

  // Data pruning
  async pruneOldData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const cutoffTime = Date.now() - (this.config.maxAgeInDays * 24 * 60 * 60 * 1000)
    const stores = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries']
    
    for (const storeName of stores) {
      await this.pruneStore(storeName, cutoffTime)
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const stores = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries']
    console.log('🧹 Starting clearAllData operation for stores:', stores)
    
    // Get initial counts for logging
    try {
      const initialCounts = await this.getTableCounts()
      console.log('📊 Initial store counts:', initialCounts)
    } catch (error) {
      console.warn('Could not get initial counts:', error)
    }
    
    for (const storeName of stores) {
      console.log(`🧹 Clearing store: ${storeName}`)
      await this.clearStore(storeName)
      console.log(`✅ Cleared store: ${storeName}`)
    }
    
    // Get final counts for verification
    try {
      const finalCounts = await this.getTableCounts()
      console.log('📊 Final store counts after clear:', finalCounts)
    } catch (error) {
      console.warn('Could not get final counts:', error)
    }
    
    console.log('✅ clearAllData operation completed')
  }

  private async pruneStore(storeName: string, cutoffTime: number): Promise<void> {
    if (!this.db) return
    
    // MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
    try {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index('timestamp')
      
      // Delete old records using simple Promise pattern
      const deleteRange = IDBKeyRange.upperBound(cutoffTime)
      const deleteRequest = index.openCursor(deleteRange)
      
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          const cursor = deleteRequest.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }
        deleteRequest.onerror = () => reject(new Error('Delete cursor failed'))
      })
      
      // Check if we need to prune by count
      await this.pruneStoreByCount(storeName)
    } catch (error) {
      throw new Error(`Failed to prune ${storeName}: ${error}`)
    }
  }

  private async pruneStoreByCount(storeName: string): Promise<void> {
    if (!this.db) return
    
    // MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
    try {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const countRequest = store.count()
      
      const count = await this.promiseFromRequest<number>(countRequest, transaction)
      
      if (count > this.config.maxRecordsPerTable) {
        const excess = count - this.config.maxRecordsPerTable
        const index = store.index('timestamp')
        const request = index.openCursor(null, 'next') // Oldest first
        
        await new Promise<void>((resolve, reject) => {
          let deleted = 0
          request.onsuccess = () => {
            const cursor = request.result
            if (cursor && deleted < excess) {
              cursor.delete()
              deleted++
              cursor.continue()
            } else {
              resolve()
            }
          }
          
          request.onerror = () => reject(new Error(`Failed to prune ${storeName} by count`))
        })
      }
    } catch (error) {
      throw new Error(`Failed to count/prune ${storeName}: ${error}`)
    }
  }

  private async clearStore(storeName: string): Promise<void> {
    if (!this.db) return
    
    return this.performTransaction(storeName, 'readwrite', (store) => {
      return store.clear()
    })
  }

  async getTableCounts(): Promise<{[table: string]: number}> {
    if (!this.db) throw new Error('Database not initialized')
    
    const stores = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries']
    const counts: {[table: string]: number} = {}
    
    for (const storeName of stores) {
      counts[storeName] = await this.performTransaction(storeName, 'readonly', 
        (store) => store.count()
      )
    }
    
    return counts
  }

  async getStorageInfo(): Promise<{type: 'indexeddb', size?: number}> {
    // IndexedDB doesn't provide easy size calculation, but we can estimate
    let estimatedSize = 0
    const counts = await this.getTableCounts()
    
    // Rough estimation: each record is approximately 1KB
    for (const count of Object.values(counts)) {
      estimatedSize += count * 1024
    }
    
    return { type: 'indexeddb', size: estimatedSize }
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    try {
      const stats = perfTracker.getStats()
      
      // Add storage size information with error handling
      try {
        const storageInfo = await this.getStorageInfo()
        const tableCounts = await this.getTableCounts()
        
        stats.storageSize = {
          total: storageInfo.size || 0,
          byTable: tableCounts
        }
      } catch (storageError) {
        console.warn('Failed to get storage info for performance stats:', storageError)
        // Provide fallback storage info
        stats.storageSize = {
          total: 0,
          byTable: {}
        }
      }
      
      return stats
      
    } catch (error) {
      console.error('Failed to get performance stats:', error)
      // Return minimal stats if everything fails
      return {
        totalOperations: 0,
        averageOperationTime: 0,
        memoryUsage: { current: 0, peak: 0, average: 0 },
        operationCounts: {},
        operationTimes: {},
        storageSize: { total: 0, byTable: {} },
        lastReset: Date.now(),
        uptime: 0
      }
    }
  }
}
