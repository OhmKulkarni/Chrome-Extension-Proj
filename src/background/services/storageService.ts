/**
 * Storage Service - Handles persistent data storage for the extension
 * Manages IndexedDB operations and data synchronization
 */

import { NetworkRequest } from '../types/network'

export interface StorageConfig {
  maxRequests: number
  maxAge: number // milliseconds
  compressionEnabled: boolean
}

export class StorageService {
  private static instance: StorageService | null = null
  private config: StorageConfig
  private dbName = 'ChromeExtensionDB'
  private version = 1
  private db: IDBDatabase | null = null

  private constructor() {
    this.config = {
      maxRequests: 10000,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      compressionEnabled: false
    }
    this.initializeDatabase()
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Network requests store
        if (!db.objectStoreNames.contains('networkRequests')) {
          const store = db.createObjectStore('networkRequests', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('domain', 'domain', { unique: false })
          store.createIndex('method', 'method', { unique: false })
        }
        
        // Console errors store
        if (!db.objectStoreNames.contains('consoleErrors')) {
          const store = db.createObjectStore('consoleErrors', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('level', 'level', { unique: false })
        }
        
        // Token events store
        if (!db.objectStoreNames.contains('tokenEvents')) {
          const store = db.createObjectStore('tokenEvents', { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
        }
      }
    })
  }

  public async addNetworkRequest(request: NetworkRequest): Promise<void> {
    if (!this.db) {
      console.warn('Database not initialized')
      return
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['networkRequests'], 'readwrite')
      const store = transaction.objectStore('networkRequests')
      
      const addRequest = store.add(request)
      addRequest.onsuccess = () => resolve()
      addRequest.onerror = () => reject(addRequest.error)
      
      // Cleanup old requests after adding
      transaction.oncomplete = () => {
        this.cleanupOldRequests()
      }
    })
  }

  public async getNetworkRequests(limit = 1000): Promise<NetworkRequest[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['networkRequests'], 'readonly')
      const store = transaction.objectStore('networkRequests')
      const index = store.index('timestamp')
      
      const requests: NetworkRequest[] = []
      const request = index.openCursor(null, 'prev') // Most recent first
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor && requests.length < limit) {
          requests.push(cursor.value)
          cursor.continue()
        } else {
          resolve(requests)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  public async clearNetworkRequests(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['networkRequests'], 'readwrite')
      const store = transaction.objectStore('networkRequests')
      
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async cleanupOldRequests(): Promise<void> {
    if (!this.db) return

    const cutoffTime = Date.now() - this.config.maxAge
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['networkRequests'], 'readwrite')
      const store = transaction.objectStore('networkRequests')
      const index = store.index('timestamp')
      
      const range = IDBKeyRange.upperBound(cutoffTime)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  public async getStorageStats(): Promise<any> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['networkRequests'], 'readonly')
      const store = transaction.objectStore('networkRequests')
      
      const countRequest = store.count()
      countRequest.onsuccess = () => {
        resolve({
          networkRequests: countRequest.result,
          maxRequests: this.config.maxRequests,
          maxAge: this.config.maxAge
        })
      }
      
      countRequest.onerror = () => reject(countRequest.error)
    })
  }

  public updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  public getConfig(): StorageConfig {
    return { ...this.config }
  }

  public destroy(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    StorageService.instance = null
  }
}

export default StorageService
