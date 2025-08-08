// IndexedDB implementation with performance monitoring
import type { StorageOperations, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary, StorageConfig, PerformanceStats } from './storage-types'

// MEMORY LEAK FIX: Extract Promise constructor functions outside class to prevent context capture
function createOpenRequestPromise(request: IDBOpenDBRequest): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let resolved = false
    
    const handleError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        console.error('❌ IndexedDB: Failed to open database:', request.error)
        reject(new Error('Failed to open IndexedDB'))
      }
    }
    
    const handleSuccess = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve(request.result)
      }
    }
    
    const cleanup = () => {
      try {
        request.removeEventListener('error', handleError)
        request.removeEventListener('success', handleSuccess)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    request.addEventListener('error', handleError)
    request.addEventListener('success', handleSuccess)
  })
}

function createRequestPromise<T>(request: IDBRequest<T>, transaction: IDBTransaction): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let resolved = false
    
    const handleTransactionError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        const error = transaction.error?.message || 'Transaction failed'
        console.error(`IndexedDB transaction error: ${error}`)
        reject(new Error(`Transaction failed: ${error}`))
      }
    }
    
    const handleTransactionAbort = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        console.error('IndexedDB transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    }
    
    const handleRequestSuccess = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve(request.result)
      }
    }
    
    const handleRequestError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        const error = request.error?.message || 'Request failed'
        console.error(`IndexedDB request error: ${error}`)
        reject(new Error(`Request failed: ${error}`))
      }
    }
    
    const cleanup = () => {
      try {
        transaction.removeEventListener('error', handleTransactionError)
        transaction.removeEventListener('abort', handleTransactionAbort)
        request.removeEventListener('success', handleRequestSuccess)
        request.removeEventListener('error', handleRequestError)
      } catch (err) {
        // Ignore cleanup errors - transaction may already be completed
      }
    }
    
    transaction.addEventListener('error', handleTransactionError)
    transaction.addEventListener('abort', handleTransactionAbort)
    request.addEventListener('success', handleRequestSuccess)
    request.addEventListener('error', handleRequestError)
  })
}

function createCursorPromise<T extends any[]>(
  request: IDBRequest<IDBCursorWithValue | null>, 
  transaction: IDBTransaction,
  limit: number,
  offset: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const results: any[] = []
    let collected = 0
    let resolved = false
    let skipCompleted = false
    
    console.log(`📖 Cursor: Starting pagination - offset=${offset}, limit=${limit}`)
    
    const handleTransactionError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        const error = transaction.error?.message || 'Transaction failed'
        console.error(`IndexedDB transaction error: ${error}`)
        reject(new Error(`Transaction failed: ${error}`))
      }
    }
    
    const handleTransactionAbort = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        console.error('IndexedDB transaction aborted')
        reject(new Error('Transaction aborted'))
      }
    }
    
    const handleRequestSuccess = () => {
      if (!resolved) {
        const cursor = request.result
        
        if (!cursor) {
          // No more records
          resolved = true
          cleanup()
          console.log(`📖 Cursor: Finished - collected ${results.length} results`)
          resolve(results as T)
          return
        }
        
        // First time: skip to the offset position using advance()
        if (!skipCompleted && offset > 0) {
          skipCompleted = true
          console.log(`📖 Cursor: Skipping ${offset} records using advance()`)
          cursor.advance(offset)
          return
        }
        
        // Now we're at the right position, collect records
        if (collected < limit) {
          results.push(cursor.value)
          collected++
          console.log(`📖 Cursor: Collected record ${collected}/${limit} (id: ${cursor.value.id})`)
          
          if (collected < limit) {
            cursor.continue()
          } else {
            // We have enough records
            resolved = true
            cleanup()
            console.log(`📖 Cursor: Completed - collected ${results.length} results`)
            resolve(results as T)
          }
        } else {
          // Should not reach here, but safety check
          resolved = true
          cleanup()
          resolve(results as T)
        }
      }
    }
    
    const handleRequestError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        const error = request.error?.message || 'Cursor request failed'
        console.error(`IndexedDB cursor error: ${error}`)
        reject(new Error(`Cursor failed: ${error}`))
      }
    }
    
    const cleanup = () => {
      try {
        transaction.removeEventListener('error', handleTransactionError)
        transaction.removeEventListener('abort', handleTransactionAbort)
        request.removeEventListener('success', handleRequestSuccess)
        request.removeEventListener('error', handleRequestError)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    transaction.addEventListener('error', handleTransactionError)
    transaction.addEventListener('abort', handleTransactionAbort)
    request.addEventListener('success', handleRequestSuccess)
    request.addEventListener('error', handleRequestError)
  })
}

function createDeleteCursorPromise(request: IDBRequest<IDBCursorWithValue | null>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let resolved = false
    
    const handleSuccess = () => {
      if (!resolved) {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolved = true
          cleanup()
          resolve()
        }
      }
    }
    
    const handleError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        reject(new Error('Delete cursor failed'))
      }
    }
    
    const cleanup = () => {
      try {
        request.removeEventListener('success', handleSuccess)
        request.removeEventListener('error', handleError)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    request.addEventListener('success', handleSuccess)
    request.addEventListener('error', handleError)
  })
}

function createPruneCursorPromise(request: IDBRequest<IDBCursorWithValue | null>, maxDeletes: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let deleted = 0
    let resolved = false
    
    const handleSuccess = () => {
      if (!resolved) {
        const cursor = request.result
        if (cursor && deleted < maxDeletes) {
          cursor.delete()
          deleted++
          cursor.continue()
        } else {
          resolved = true
          cleanup()
          resolve()
        }
      }
    }
    
    const handleError = () => {
      if (!resolved) {
        resolved = true
        cleanup()
        reject(new Error('Failed to prune by count'))
      }
    }
    
    const cleanup = () => {
      try {
        request.removeEventListener('success', handleSuccess)
        request.removeEventListener('error', handleError)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    
    request.addEventListener('success', handleSuccess)
    request.addEventListener('error', handleError)
  })
}

// MEMORY LEAK FIX: Ultra-lightweight performance tracking with extreme cleanup
class BackgroundPerformanceTracker {
  private operationCounts: Record<string, number> = {}
  private operationTimes: Record<string, number[]> = {}
  private startTime = Date.now()
  private memoryPeak = 0
  private lastCleanup = Date.now()
  
  // MEMORY LEAK FIX: Cap in-memory buffers to prevent unbounded growth
  private static readonly MAX_OPERATIONS = 3 // Ultra-reduced from 10 to 3
  private static readonly MAX_OPERATION_TYPES = 3 // Ultra-reduced from 5 to 3
  private static readonly CLEANUP_INTERVAL = 15000 // 15 seconds instead of 30

  trackOperation(operation: string, duration: number): void {
    // MEMORY LEAK FIX: Aggressive cleanup every 15 seconds
    const now = Date.now()
    if (now - this.lastCleanup > BackgroundPerformanceTracker.CLEANUP_INTERVAL) {
      this.performCleanup()
      this.lastCleanup = now
    }

    // MEMORY LEAK FIX: Cap in-memory buffers to prevent unbounded growth
    const operationKeys = Object.keys(this.operationCounts)
    if (operationKeys.length >= BackgroundPerformanceTracker.MAX_OPERATION_TYPES) {
      // Immediately clear everything and start fresh - drop oldest
      this.operationCounts = {}
      this.operationTimes = {}
    }

    // MEMORY LEAK FIX: Only track if under limits
    if (operationKeys.length < BackgroundPerformanceTracker.MAX_OPERATION_TYPES) {
      this.operationCounts[operation] = (this.operationCounts[operation] || 0) + 1
      if (!this.operationTimes[operation]) {
        this.operationTimes[operation] = []
      }
      this.operationTimes[operation].push(duration)
      
      // MEMORY LEAK FIX: Cap in-memory buffers - drop oldest entries
      if (this.operationTimes[operation].length > BackgroundPerformanceTracker.MAX_OPERATIONS) {
        this.operationTimes[operation].shift() // Drop oldest instead of slice
      }
    }

    // MEMORY LEAK FIX: Lightweight memory monitoring with heap size tracking
    if (Object.values(this.operationCounts).reduce((a, b) => a + b, 0) % 10 === 0) {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const heapUsed = memory.usedJSHeapSize
        const heapLimit = memory.jsHeapSizeLimit
        const heapPercentage = (heapUsed / heapLimit) * 100
        
        // Log current heap usage for monitoring
        console.log(`📊 JS Heap Used: ${(heapUsed / 1024 / 1024).toFixed(1)} MB (${heapPercentage.toFixed(1)}%)`)
        
        // MEMORY LEAK FIX: Emergency cleanup at 70% instead of 80%
        if (heapPercentage > 70) {
          console.log(`🚨 Memory pressure at ${heapPercentage.toFixed(1)}% - emergency cleanup`)
          this.emergencyReset()
        }
        
        if (heapUsed > this.memoryPeak) {
          this.memoryPeak = heapUsed
        }
      }
    }

    // Restored logging for debugging memory issues
    if (this.operationCounts[operation] % 50 === 0) {
      const times = this.operationTimes[operation] || []
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length
        console.log(`[IndexedDB-Perf] ${operation}: ${avg.toFixed(2)}ms avg (${this.operationCounts[operation]} ops)`)
      }
    }
  }

  // MEMORY LEAK FIX: Emergency reset method
  private emergencyReset(): void {
    this.operationCounts = {}
    this.operationTimes = {}
    this.memoryPeak = 0
    this.startTime = Date.now()
    this.lastCleanup = Date.now()
  }

  // MEMORY LEAK FIX: Aggressive cleanup method
  private performCleanup(): void {
    console.log('🧹 [IndexedDB-Perf] Performing aggressive cleanup...')
    
    // Complete reset instead of partial cleanup
    this.operationCounts = {}
    this.operationTimes = {}
    
    // Reset memory tracking
    this.memoryPeak = 0
    
    console.log(`🧹 [IndexedDB-Perf] Cleanup complete.`)
  }

  getStats(): PerformanceStats {
    // MEMORY LEAK FIX: Complete reset before generating stats to prevent accumulation
    this.performCleanup()
    
    // MEMORY LEAK FIX: Return minimal stats without calculations that could retain data
    const totalOperations = 0 // Don't calculate to avoid accessing data structures
    const averageOperationTime = 0 // Don't calculate to avoid creating arrays

    // Get current memory usage if available
    let currentMemory = 0
    if ('memory' in performance) {
      const memory = (performance as any).memory
      currentMemory = memory.usedJSHeapSize
    }

    // MEMORY LEAK FIX: Return ultra-minimal stats object
    const stats: PerformanceStats = {
      totalOperations,
      averageOperationTime,
      operationCounts: {}, // Don't copy any data
      operationTimes: {}, // Don't copy any data
      memoryUsage: {
        current: currentMemory,
        peak: currentMemory, // Don't track peak to avoid retention
        average: currentMemory
      },
      storageSize: {
        total: 0,
        byTable: {}
      },
      lastReset: this.startTime,
      uptime: Date.now() - this.startTime
    }
    
    // MEMORY LEAK FIX: Complete reset after stats generation
    this.emergencyReset()
    
    return stats
  }
  
  // MEMORY LEAK FIX: Method to completely reset tracker
  public reset(): void {
    console.log('🧹 [IndexedDB-Perf] Resetting performance tracker...')
    this.operationCounts = {}
    this.operationTimes = {}
    this.startTime = Date.now()
    this.memoryPeak = 0
    this.lastCleanup = Date.now()
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
    return this.initPromise;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      console.log('🔧 IndexedDB: Starting database initialization...')
      
      // MEMORY LEAK FIX: Replace Promise constructor with direct event-to-promise pattern
      const request = indexedDB.open('DevToolsExtension', 3) // Increment version to trigger upgrade
      
      // Handle database upgrade first
      request.onupgradeneeded = () => {
        const db = request.result
        console.log('🔄 IndexedDB: Database upgrade needed')
        
        // Create object stores
        if (!db.objectStoreNames.contains('apiCalls')) {
          const apiStore = db.createObjectStore('apiCalls', { keyPath: 'id', autoIncrement: true })
          apiStore.createIndex('timestamp', 'timestamp', { unique: false })
          apiStore.createIndex('domain', 'domain', { unique: false })
          console.log('📦 IndexedDB: Created apiCalls store with auto-increment')
        }
        
        if (!db.objectStoreNames.contains('consoleErrors')) {
          const errorStore = db.createObjectStore('consoleErrors', { keyPath: 'id', autoIncrement: true })
          errorStore.createIndex('timestamp', 'timestamp', { unique: false })
          errorStore.createIndex('domain', 'domain', { unique: false })
          console.log('📦 IndexedDB: Created consoleErrors store with auto-increment')
        }
        
        if (!db.objectStoreNames.contains('tokenEvents')) {
          const tokenStore = db.createObjectStore('tokenEvents', { keyPath: 'id', autoIncrement: true })
          tokenStore.createIndex('timestamp', 'timestamp', { unique: false })
          tokenStore.createIndex('domain', 'domain', { unique: false })
          console.log('📦 IndexedDB: Created tokenEvents store with auto-increment')
        }
        
        if (!db.objectStoreNames.contains('minifiedLibraries')) {
          const libraryStore = db.createObjectStore('minifiedLibraries', { keyPath: 'id', autoIncrement: true })
          libraryStore.createIndex('domain', 'domain', { unique: false })
          console.log('📦 IndexedDB: Created minifiedLibraries store with auto-increment')
        }
      }
      
      // MEMORY LEAK FIX: Use helper method instead of Promise constructor
      const db = await this.promiseFromOpenRequest(request)
      
      this.db = db
      console.log('✅ IndexedDB: Database opened successfully')
      console.log('📊 IndexedDB: Available stores:', Array.from(db.objectStoreNames))
      this.startAutoPruning()
      this.initPromise = null
    } catch (error) {
      console.error('❌ IndexedDB: Database initialization failed:', error)
      this.initPromise = null
      throw error
    }
  }

  // MEMORY LEAK FIX: Use external helper function instead of class method Promise constructor
  private async promiseFromOpenRequest(request: IDBOpenDBRequest): Promise<IDBDatabase> {
    return createOpenRequestPromise(request)
  }

  // MEMORY LEAK FIX: Use external helper function instead of class method Promise constructor
  private async promiseFromRequest<T>(request: IDBRequest<T>, transaction: IDBTransaction): Promise<T> {
    return createRequestPromise<T>(request, transaction)
  }

  // MEMORY LEAK FIX: Use external helper function instead of class method Promise constructor
  private async promiseFromCursor<T extends any[]>(
    request: IDBRequest<IDBCursorWithValue | null>, 
    transaction: IDBTransaction,
    limit: number,
    offset: number
  ): Promise<T> {
    return createCursorPromise<T>(request, transaction, limit, offset)
  }

  // MEMORY LEAK FIX: Use external helper function instead of class method Promise constructor
  private async promiseFromDeleteCursor(request: IDBRequest<IDBCursorWithValue | null>): Promise<void> {
    return createDeleteCursorPromise(request)
  }

  // MEMORY LEAK FIX: Use external helper function instead of class method Promise constructor
  private async promiseFromPruneCursor(request: IDBRequest<IDBCursorWithValue | null>, maxDeletes: number): Promise<void> {
    return createPruneCursorPromise(request, maxDeletes)
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
  
  // MEMORY LEAK FIX: Aggressive emergency cleanup for memory pressure
  public async emergencyCleanup(): Promise<void> {
    // MEMORY LEAK FIX: No logging to prevent string accumulation
    
    if (!this.db) return
    
    const stores = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries']
    
    for (const storeName of stores) {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        const countRequest = store.count()
        
        const count = await this.promiseFromRequest<number>(countRequest, transaction)
        
        if (count > 500) { // Ultra-aggressive - keep only 500 records max
          // Delete all but the newest 500 records
          const excess = count - 500
          const index = store.index('timestamp')
          const request = index.openCursor(null, 'next') // Oldest first
          
          await this.promiseFromPruneCursor(request, excess)
        }
      } catch (error) {
        // Ignore errors to prevent string accumulation in error messages
      }
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
      // MEMORY LEAK FIX: Check memory pressure before inserting
      await this.checkMemoryPressure()
      
      console.log('📝 InsertApiCall: Attempting to store data:', { url: data.url, method: data.method, timestamp: data.timestamp })
      
      const result = await this.performTransaction('apiCalls', 'readwrite', 
        (store) => store.add(data)
      )
      
      console.log('✅ InsertApiCall: Successfully stored with ID:', result)
      
      // MEMORY LEAK FIX: Release references after DB write
      // Clear any internal references to the data object
      Object.keys(data).forEach(key => {
        delete (data as any)[key]
      })
      
      perfTracker.trackOperation('insertApiCall', performance.now() - startTime)
      return result as number
    } catch (error) {
      console.error('❌ InsertApiCall: Failed to store data:', error)
      perfTracker.trackOperation('insertApiCall_error', performance.now() - startTime)
      throw error
    }
  }
  
  // MEMORY LEAK FIX: Ultra-aggressive memory pressure monitoring
  private async checkMemoryPressure(): Promise<void> {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const heapUsed = memory.usedJSHeapSize
      const heapLimit = memory.jsHeapSizeLimit
      const heapPercentage = (heapUsed / heapLimit) * 100
      
      if (heapPercentage > 60) { // Lowered from 80% to 60%
        await this.emergencyCleanup()
        
        // Also reset performance tracker
        perfTracker.reset()
        
        // Force garbage collection if available
        if ('gc' in window) {
          (window as any).gc()
        }
      }
    }
  }

  async getApiCalls(limit = 100, offset = 0): Promise<ApiCall[]> {
    const startTime = performance.now()
    if (!this.db) throw new Error('Database not initialized')
    
    console.log(`📖 GetApiCalls: Requesting ${limit} records with offset ${offset}`)
    
    // MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
    try {
      const transaction = this.db!.transaction(['apiCalls'], 'readonly')
      const store = transaction.objectStore('apiCalls')
      const index = store.index('timestamp')
      
      // Always use cursor for consistent latest-first ordering
      // Fast path with getAll can cause ordering issues, so use cursor consistently
      
      // Use cursor for consistent latest-first ordering
      const request = index.openCursor(null, 'prev') // Latest first
      
      // MEMORY LEAK FIX: Use helper method for cursor Promise
      const results = await this.promiseFromCursor<ApiCall[]>(request, transaction, limit, offset)
      
      perfTracker.trackOperation('getApiCalls_cursor', performance.now() - startTime)
      
      console.log(`✅ GetApiCalls (cursor): Retrieved ${results.length} records`)
      
      // MEMORY LEAK FIX: Check memory pressure after data retrieval
      await this.checkMemoryPressure()
      
      return results
      
    } catch (error) {
      console.error('❌ GetApiCalls: Failed to retrieve data:', error)
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
      const sorted = results
        .sort((a, b) => (b.id || 0) - (a.id || 0))
        .slice(0, limit)
      
      // MEMORY LEAK FIX: Check memory pressure after data retrieval
      await this.checkMemoryPressure()
      
      return sorted
      
    } catch (error) {
      throw error
    }
  }

  // Console Errors
  async insertConsoleError(data: Omit<ConsoleError, 'id'>): Promise<number> {
    // MEMORY LEAK FIX: Check memory pressure before inserting
    await this.checkMemoryPressure()
    
    const result = await this.performTransaction('consoleErrors', 'readwrite', 
      (store) => store.add(data)
    )
    
    // MEMORY LEAK FIX: Release references after DB write
    Object.keys(data).forEach(key => {
      delete (data as any)[key]
    })
    
    return result as number
  }

  async getConsoleErrors(limit = 100, offset = 0): Promise<ConsoleError[]> {
    const startTime = performance.now()
    if (!this.db) throw new Error('Database not initialized')
    
    console.log(`📖 GetConsoleErrors: Requesting ${limit} records with offset ${offset}`)
    
    // MEMORY LEAK FIX: Convert Promise constructor to helper method
    const transaction = this.db!.transaction(['consoleErrors'], 'readonly')
    const store = transaction.objectStore('consoleErrors')
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev') // Latest first
    
    const results = await this.promiseFromCursor<ConsoleError[]>(request, transaction, limit, offset)
    
    perfTracker.trackOperation('getConsoleErrors_cursor', performance.now() - startTime)
    
    console.log(`✅ GetConsoleErrors (cursor): Retrieved ${results.length} records`)
    
    // MEMORY LEAK FIX: Check memory pressure after data retrieval
    await this.checkMemoryPressure()
    
    return results
  }

  async deleteConsoleError(id: number): Promise<void> {
    await this.performTransaction('consoleErrors', 'readwrite', 
      (store) => store.delete(id)
    )
  }

  // Token Events
  async insertTokenEvent(data: Omit<TokenEvent, 'id'>): Promise<number> {
    // MEMORY LEAK FIX: Check memory pressure before inserting
    await this.checkMemoryPressure()
    
    const result = await this.performTransaction('tokenEvents', 'readwrite', 
      (store) => store.add(data)
    )
    
    // MEMORY LEAK FIX: Release references after DB write
    Object.keys(data).forEach(key => {
      delete (data as any)[key]
    })
    
    return result as number
  }

  async getTokenEvents(limit = 100, offset = 0): Promise<TokenEvent[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    // MEMORY LEAK FIX: Convert Promise constructor to helper method
    const transaction = this.db!.transaction(['tokenEvents'], 'readonly')
    const store = transaction.objectStore('tokenEvents')
    const index = store.index('timestamp')
    const request = index.openCursor(null, 'prev') // Latest first
    
    const results = await this.promiseFromCursor<TokenEvent[]>(request, transaction, limit, offset)
    
    // MEMORY LEAK FIX: Check memory pressure after data retrieval
    await this.checkMemoryPressure()
    
    return results
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
    
    const results = await this.promiseFromCursor<MinifiedLibrary[]>(request, transaction, limit, offset)
    
    // MEMORY LEAK FIX: Check memory pressure after data retrieval
    await this.checkMemoryPressure()
    
    return results
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
      
      // Delete old records using helper method instead of Promise constructor
      const deleteRange = IDBKeyRange.upperBound(cutoffTime)
      const deleteRequest = index.openCursor(deleteRange)
      
      await this.promiseFromDeleteCursor(deleteRequest)
      
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
        
        await this.promiseFromPruneCursor(request, excess)
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
      // MEMORY LEAK FIX: Get ultra-minimal stats without any data copying or calculations
      let currentMemory = 0
      if ('memory' in performance) {
        const memory = (performance as any).memory
        currentMemory = memory.usedJSHeapSize
      }

      // MEMORY LEAK FIX: Create ultra-minimal stats object without any data structures
      const stats: PerformanceStats = {
        totalOperations: 0, // Don't calculate to avoid data access
        averageOperationTime: 0, // Don't calculate to avoid array creation
        operationCounts: {}, // Empty to prevent data copying
        operationTimes: {}, // Empty to prevent array retention
        memoryUsage: {
          current: currentMemory,
          peak: 0, // Don't track to prevent retention
          average: 0 // Don't calculate to prevent retention
        },
        storageSize: {
          total: 0,
          byTable: {}
        },
        lastReset: Date.now(),
        uptime: 0 // Don't calculate to prevent retention
      }
      
      // MEMORY LEAK FIX: Don't add storage size information to prevent database queries
      // that could cause object accumulation
      
      // MEMORY LEAK FIX: Reset performance tracker after every stats call
      perfTracker.reset()
      
      return stats
      
    } catch (error) {
      // Return absolute minimal stats if everything fails
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

  // MEMORY LEAK FIX: Cleanup method to properly close database and clear resources
  public async cleanup(): Promise<void> {
    // MEMORY LEAK FIX: No logging to prevent string accumulation
    
    // Stop auto-pruning interval
    this.stopAutoPruning()
    
    // Emergency cleanup before closing
    await this.emergencyCleanup()
    
    // Reset performance tracker
    perfTracker.reset()
    
    // Close database connection
    if (this.db) {
      this.db.close()
      this.db = null
    }
    
    // Clear initialization promise
    this.initPromise = null
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc()
    }
  }

  // MEMORY LEAK FIX: Method to check if database is properly initialized and connected
  public isConnected(): boolean {
    return this.db !== null && this.db.objectStoreNames.length > 0
  }
}
