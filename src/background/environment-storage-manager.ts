// Environment-aware storage manager using IndexedDB only (SQLite removed for optimization)
import type { StorageOperations, StorageConfig, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary, PerformanceStats } from './storage-types'
import { IndexedDBStorage } from './indexeddb-storage'

export type StorageType = 'indexeddb'

export class EnvironmentStorageManager implements StorageOperations {
  private storage: StorageOperations | null = null
  private config: StorageConfig
  private storageType: 'indexeddb' | null = null
  private primaryType: StorageType
  private enableFallback: boolean
  private enableLogs: boolean
  private enableMetrics: boolean

  constructor() {
    // IndexedDB-only configuration (SQLite removed for optimization)
    this.primaryType = 'indexeddb'
    this.enableFallback = import.meta.env.VITE_ENABLE_STORAGE_FALLBACK !== 'false'
    this.enableLogs = import.meta.env.VITE_ENABLE_STORAGE_LOGS === 'true'
    this.enableMetrics = import.meta.env.VITE_ENABLE_PERFORMANCE_METRICS === 'true'
    
    this.config = {
      maxRecordsPerTable: parseInt(import.meta.env.VITE_MAX_RECORDS_PER_TABLE) || 10000,
      maxAgeInDays: parseInt(import.meta.env.VITE_MAX_AGE_DAYS) || 30,
      pruneIntervalHours: parseInt(import.meta.env.VITE_PRUNE_INTERVAL_HOURS) || 24
    }

    if (this.enableLogs) {
      console.log('[EnvironmentStorageManager] Configuration loaded:', {
        primaryType: this.primaryType,
        enableFallback: this.enableFallback,
        config: this.config
      })
    }
  }

  async init(): Promise<void> {
    if (this.enableLogs) {
      console.log('[EnvironmentStorageManager] Initializing IndexedDB-only storage (SQLite removed for optimization)')
    }

    await this.initIndexedDB()

    if (this.enableLogs && this.storage) {
      console.log('[EnvironmentStorageManager] ✅ IndexedDB initialized successfully')
    }

    if (this.enableMetrics) {
      await this.logPerformanceInfo()
    }
  }

  private async initIndexedDB(): Promise<void> {
    try {
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] Initializing IndexedDB...')
      }
      
      const indexedDBStorage = new IndexedDBStorage(this.config)
      await indexedDBStorage.init()
      this.storage = indexedDBStorage
      this.storageType = 'indexeddb'
      
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] ✅ IndexedDB initialized successfully')
      }
    } catch (error) {
      const errorMessage = `IndexedDB storage initialization failed: ${error instanceof Error ? error.message : String(error)}`
      if (this.enableLogs) {
        console.error('[EnvironmentStorageManager]', errorMessage)
      }
      throw new Error(errorMessage)
    }
  }

  private async logPerformanceInfo(): Promise<void> {
    if (!this.storage) return

    try {
      const storageInfo = await this.storage.getStorageInfo()
      const tableCounts = await this.storage.getTableCounts()
      
      console.log('[EnvironmentStorageManager] 📊 Performance Info:', {
        storageType: this.storageType,
        storageInfo,
        tableCounts,
        config: this.config
      })
    } catch (error) {
      if (this.enableLogs) {
        console.warn('[EnvironmentStorageManager] Failed to get performance info:', error)
      }
    }
  }

  private ensureInitialized(): StorageOperations {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call init() first.')
    }
    return this.storage
  }

  // Public configuration accessors
  getStorageType(): string {
    return this.storageType || 'unknown'
  }

  isInitialized(): boolean {
    return this.storage !== null
  }

  getPrimaryType(): StorageType {
    return this.primaryType
  }

  isFallbackEnabled(): boolean {
    return this.enableFallback
  }

  getConfiguration(): StorageConfig & { 
    primaryType: StorageType, 
    enableFallback: boolean,
    enableLogs: boolean,
    enableMetrics: boolean
  } {
    return {
      ...this.config,
      primaryType: this.primaryType,
      enableFallback: this.enableFallback,
      enableLogs: this.enableLogs,
      enableMetrics: this.enableMetrics
    }
  }

  // Get underlying storage for direct access (use carefully)
  getUnderlyingStorage(): StorageOperations {
    return this.ensureInitialized()
  }

  // Delegate all storage operations to the active storage
  async insertApiCall(data: Omit<ApiCall, 'id'>): Promise<number> {
    return this.ensureInitialized().insertApiCall(data)
  }

  async insertConsoleError(data: Omit<ConsoleError, 'id'>): Promise<number> {
    return this.ensureInitialized().insertConsoleError(data)
  }

  async insertTokenEvent(data: Omit<TokenEvent, 'id'>): Promise<number> {
    return this.ensureInitialized().insertTokenEvent(data)
  }

  async insertMinifiedLibrary(data: Omit<MinifiedLibrary, 'id'>): Promise<number> {
    return this.ensureInitialized().insertMinifiedLibrary(data)
  }

  async getApiCalls(limit: number = 100, offset?: number): Promise<ApiCall[]> {
    return this.ensureInitialized().getApiCalls(limit, offset)
  }

  async deleteApiCall(id: number): Promise<void> {
    return this.ensureInitialized().deleteApiCall(id)
  }

  async getConsoleErrors(limit: number = 100, offset?: number): Promise<ConsoleError[]> {
    return this.ensureInitialized().getConsoleErrors(limit, offset)
  }

  async deleteConsoleError(id: number): Promise<void> {
    return this.ensureInitialized().deleteConsoleError(id)
  }

  async getTokenEvents(limit: number = 100, offset?: number): Promise<TokenEvent[]> {
    return this.ensureInitialized().getTokenEvents(limit, offset)
  }

  async deleteTokenEvent(id: number): Promise<void> {
    return this.ensureInitialized().deleteTokenEvent(id)
  }

  async getMinifiedLibraries(limit: number = 100, offset?: number): Promise<MinifiedLibrary[]> {
    return this.ensureInitialized().getMinifiedLibraries(limit, offset)
  }

  async deleteMinifiedLibrary(id: number): Promise<void> {
    return this.ensureInitialized().deleteMinifiedLibrary(id)
  }

  async pruneOldData(): Promise<void> {
    return this.ensureInitialized().pruneOldData()
  }

  async clearAllData(): Promise<void> {
    return this.ensureInitialized().clearAllData()
  }

  async getStorageInfo(): Promise<{ type: 'indexeddb'; size?: number }> {
    return this.ensureInitialized().getStorageInfo()
  }

  async getTableCounts(): Promise<Record<string, number>> {
    return this.ensureInitialized().getTableCounts()
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    return this.ensureInitialized().getPerformanceStats()
  }

  // MEMORY LEAK FIX: Add cleanup method to properly close storage connections
  async cleanup(): Promise<void> {
    if (this.storage && 'cleanup' in this.storage) {
      await (this.storage as any).cleanup()
    }
    this.storage = null
    this.storageType = null
  }

  // MEMORY LEAK FIX: Check if underlying storage is connected
  isConnected(): boolean {
    if (this.storage && 'isConnected' in this.storage) {
      return (this.storage as any).isConnected()
    }
    return this.storage !== null
  }
}
