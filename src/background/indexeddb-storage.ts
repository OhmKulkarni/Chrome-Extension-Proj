// IndexedDB implementation as fallback storage
import type { StorageOperations, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary, StorageConfig } from './storage-types'

export class IndexedDBStorage implements StorageOperations {
  private db: IDBDatabase | null = null
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DevToolsExtension', 2)
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'))
      
      request.onsuccess = () => {
        this.db = request.result
        this.startAutoPruning()
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores with indexes
        if (!db.objectStoreNames.contains('apiCalls')) {
          const apiStore = db.createObjectStore('apiCalls', { keyPath: 'id', autoIncrement: true })
          apiStore.createIndex('timestamp', 'timestamp')
          apiStore.createIndex('url', 'url')
          // Add compound index for better query performance
          apiStore.createIndex('timestamp_url', ['timestamp', 'url'])
        }
        
        if (!db.objectStoreNames.contains('consoleErrors')) {
          const errorStore = db.createObjectStore('consoleErrors', { keyPath: 'id', autoIncrement: true })
          errorStore.createIndex('timestamp', 'timestamp')
          errorStore.createIndex('severity', 'severity')
        }
        
        if (!db.objectStoreNames.contains('tokenEvents')) {
          const tokenStore = db.createObjectStore('tokenEvents', { keyPath: 'id', autoIncrement: true })
          tokenStore.createIndex('timestamp', 'timestamp')
          tokenStore.createIndex('source_url', 'source_url')
        }
        
        if (!db.objectStoreNames.contains('minifiedLibraries')) {
          const libStore = db.createObjectStore('minifiedLibraries', { keyPath: 'id', autoIncrement: true })
          libStore.createIndex('timestamp', 'timestamp')
          libStore.createIndex('domain', 'domain')
        }
      }
    })
  }

  private startAutoPruning() {
    const intervalMs = this.config.pruneIntervalHours * 60 * 60 * 1000
    setInterval(() => {
      this.pruneOldData().catch(console.error)
    }, intervalMs)
  }

  private async performTransaction<T>(
    storeName: string, 
    mode: IDBTransactionMode, 
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    if (!this.db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], mode)
      const store = transaction.objectStore(storeName)
      const request = operation(store)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error(`Transaction failed: ${request.error?.message}`))
    })
  }

  // API Calls
  async insertApiCall(data: Omit<ApiCall, 'id'>): Promise<number> {
    const result = await this.performTransaction('apiCalls', 'readwrite', 
      (store) => store.add(data)
    )
    return result as number
  }

  async getApiCalls(limit = 100, offset = 0): Promise<ApiCall[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apiCalls'], 'readonly')
      const store = transaction.objectStore('apiCalls')
      const index = store.index('timestamp')
      
      // Use getAll for much faster retrieval when limit is reasonable
      if (limit <= 1000 && offset === 0) {
        // Fast path: get all recent records at once
        const request = index.getAll(null, limit)
        
        request.onsuccess = () => {
          // Results come in ascending order, reverse for latest first
          const results = request.result.reverse()
          resolve(results)
        }
        
        request.onerror = () => reject(new Error('Failed to get API calls'))
        return
      }
      
      // Fallback to cursor for large offsets or very large limits
      const request = index.openCursor(null, 'prev') // Latest first
      const results: ApiCall[] = []
      let count = 0
      
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < offset + limit) {
          if (count >= offset) {
            results.push(cursor.value)
          }
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to get API calls'))
    })
  }

  async deleteApiCall(id: number): Promise<void> {
    await this.performTransaction('apiCalls', 'readwrite', 
      (store) => store.delete(id)
    )
  }

  // Fast query method optimized for performance testing
  async getApiCallsFast(limit = 10): Promise<ApiCall[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apiCalls'], 'readonly')
      const store = transaction.objectStore('apiCalls')
      
      // First get the highest key to determine range
      const countRequest = store.count()
      
      countRequest.onsuccess = () => {
        const totalCount = countRequest.result
        if (totalCount === 0) {
          resolve([])
          return
        }
        
        // Calculate key range for most recent records
        const startKey = Math.max(1, totalCount - limit + 1)
        const keyRange = IDBKeyRange.lowerBound(startKey)
        
        // Get records using key range on primary key for maximum speed
        const request = store.getAll(keyRange)
        
        request.onsuccess = () => {
          const results = request.result
            .sort((a, b) => (b.id || 0) - (a.id || 0)) // Sort by ID descending
            .slice(0, limit)
          
          resolve(results)
        }
        
        request.onerror = () => reject(new Error('Failed to get API calls'))
      }
      
      countRequest.onerror = () => reject(new Error('Failed to count records'))
    })
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
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['consoleErrors'], 'readonly')
      const store = transaction.objectStore('consoleErrors')
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev') // Latest first
      
      const results: ConsoleError[] = []
      let count = 0
      
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < offset + limit) {
          if (count >= offset) {
            results.push(cursor.value)
          }
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to get console errors'))
    })
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
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tokenEvents'], 'readonly')
      const store = transaction.objectStore('tokenEvents')
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev') // Latest first
      
      const results: TokenEvent[] = []
      let count = 0
      
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < offset + limit) {
          if (count >= offset) {
            results.push(cursor.value)
          }
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to get token events'))
    })
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
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['minifiedLibraries'], 'readonly')
      const store = transaction.objectStore('minifiedLibraries')
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev') // Latest first
      
      const results: MinifiedLibrary[] = []
      let count = 0
      
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < offset + limit) {
          if (count >= offset) {
            results.push(cursor.value)
          }
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(new Error('Failed to get minified libraries'))
    })
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
    
    for (const storeName of stores) {
      await this.clearStore(storeName)
    }
  }

  private async pruneStore(storeName: string, cutoffTime: number): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index('timestamp')
      
      // Delete old records
      const deleteRange = IDBKeyRange.upperBound(cutoffTime)
      const deleteRequest = index.openCursor(deleteRange)
      
      deleteRequest.onsuccess = () => {
        const cursor = deleteRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      
      transaction.oncomplete = () => {
        // Check if we need to prune by count
        this.pruneStoreByCount(storeName).then(resolve).catch(reject)
      }
      
      transaction.onerror = () => reject(new Error(`Failed to prune ${storeName}`))
    })
  }

  private async pruneStoreByCount(storeName: string): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const countRequest = store.count()
      
      countRequest.onsuccess = () => {
        const count = countRequest.result
        if (count > this.config.maxRecordsPerTable) {
          const excess = count - this.config.maxRecordsPerTable
          const index = store.index('timestamp')
          const request = index.openCursor(null, 'next') // Oldest first
          
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
        } else {
          resolve()
        }
      }
      
      countRequest.onerror = () => reject(new Error(`Failed to count ${storeName}`))
    })
  }

  private async clearStore(storeName: string): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      const clearRequest = store.clear()
      
      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(new Error(`Failed to clear ${storeName}`))
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

  async getStorageInfo(): Promise<{type: 'sqlite' | 'indexeddb', size?: number}> {
    // IndexedDB doesn't provide easy size calculation, but we can estimate
    let estimatedSize = 0
    const counts = await this.getTableCounts()
    
    // Rough estimation: each record is approximately 1KB
    for (const count of Object.values(counts)) {
      estimatedSize += count * 1024
    }
    
    return { type: 'indexeddb', size: estimatedSize }
  }
}
