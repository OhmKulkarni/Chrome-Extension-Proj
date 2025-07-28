// Environment-aware storage manager that reads configuration from .env file
import type { StorageOperations, StorageConfig, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary } from './storage-types'
import { SQLiteStorage } from './sqlite-storage'
import { IndexedDBStorage } from './indexeddb-storage'

export type StorageType = 'sqlite' | 'indexeddb' | 'auto'

export class EnvironmentStorageManager implements StorageOperations {
  private storage: StorageOperations | null = null
  private config: StorageConfig
  private storageType: 'sqlite' | 'indexeddb' | null = null
  private primaryType: StorageType
  private enableFallback: boolean
  private enableLogs: boolean
  private enableMetrics: boolean

  constructor() {
    // Read configuration from environment variables - default to IndexedDB primary
    this.primaryType = (import.meta.env.VITE_PRIMARY_STORAGE as StorageType) || 'indexeddb'
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
      console.log(`[EnvironmentStorageManager] Initializing with primary storage: ${this.primaryType}`)
    }

    if (this.primaryType === 'sqlite') {
      await this.initWithSQLitePrimary()
    } else if (this.primaryType === 'indexeddb') {
      await this.initWithIndexedDBPrimary()
    } else {
      // Auto mode - try IndexedDB first, fallback to SQLite
      await this.initWithAutomaticDetection()
    }

    if (this.enableLogs && this.storage) {
      console.log(`[EnvironmentStorageManager] ✅ Initialized successfully with ${this.storageType}`)
    }

    if (this.enableMetrics) {
      await this.logPerformanceInfo()
    }
  }

  private async initWithSQLitePrimary(): Promise<void> {
    try {
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] Attempting SQLite initialization (primary)...')
      }
      
      const sqliteStorage = new SQLiteStorage(this.config)
      await sqliteStorage.init()
      this.storage = sqliteStorage
      this.storageType = 'sqlite'
      
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] ✅ SQLite initialized successfully')
      }
    } catch (error) {
      if (this.enableLogs) {
        console.warn('[EnvironmentStorageManager] SQLite initialization failed:', error instanceof Error ? error.message : String(error))
      }

      if (this.enableFallback) {
        if (this.enableLogs) {
          console.log('[EnvironmentStorageManager] Falling back to IndexedDB...')
        }
        await this.initIndexedDBFallback()
      } else {
        throw new Error('SQLite storage initialization failed and fallback is disabled')
      }
    }
  }

  private async initWithIndexedDBPrimary(): Promise<void> {
    try {
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] Attempting IndexedDB initialization (primary)...')
      }
      
      const indexedDBStorage = new IndexedDBStorage(this.config)
      await indexedDBStorage.init()
      this.storage = indexedDBStorage
      this.storageType = 'indexeddb'
      
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] ✅ IndexedDB initialized successfully')
      }
    } catch (error) {
      if (this.enableLogs) {
        console.warn('[EnvironmentStorageManager] IndexedDB initialization failed:', error instanceof Error ? error.message : String(error))
      }

      if (this.enableFallback) {
        if (this.enableLogs) {
          console.log('[EnvironmentStorageManager] Falling back to SQLite...')
        }
        await this.initSQLiteFallback()
      } else {
        throw new Error('IndexedDB storage initialization failed and fallback is disabled')
      }
    }
  }

  private async initWithAutomaticDetection(): Promise<void> {
    // Auto mode: Try IndexedDB first (native browser support), fallback to SQLite
    try {
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] Auto-detection: Attempting IndexedDB first...')
      }
      
      const indexedDBStorage = new IndexedDBStorage(this.config)
      await indexedDBStorage.init()
      this.storage = indexedDBStorage
      this.storageType = 'indexeddb'
      
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] ✅ Auto-detection: IndexedDB initialized successfully')
      }
    } catch (error) {
      if (this.enableLogs) {
        console.warn('[EnvironmentStorageManager] Auto-detection: IndexedDB failed, trying SQLite...', error instanceof Error ? error.message : String(error))
      }

      try {
        const sqliteStorage = new SQLiteStorage(this.config)
        await sqliteStorage.init()
        this.storage = sqliteStorage
        this.storageType = 'sqlite'
        
        if (this.enableLogs) {
          console.log('[EnvironmentStorageManager] ✅ Auto-detection: SQLite fallback initialized successfully')
        }
      } catch (sqliteError) {
        if (this.enableLogs) {
          console.error('[EnvironmentStorageManager] Auto-detection: Both storage systems failed')
        }
        throw new Error('Both IndexedDB and SQLite storage initialization failed')
      }
    }
  }

  private async initIndexedDBFallback(): Promise<void> {
    try {
      const indexedDBStorage = new IndexedDBStorage(this.config)
      await indexedDBStorage.init()
      this.storage = indexedDBStorage
      this.storageType = 'indexeddb'
      
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] ✅ IndexedDB fallback initialized successfully')
      }
    } catch (error) {
      throw new Error('IndexedDB fallback initialization failed')
    }
  }

  private async initSQLiteFallback(): Promise<void> {
    try {
      const sqliteStorage = new SQLiteStorage(this.config)
      await sqliteStorage.init()
      this.storage = sqliteStorage
      this.storageType = 'sqlite'
      
      if (this.enableLogs) {
        console.log('[EnvironmentStorageManager] ✅ SQLite fallback initialized successfully')
      }
    } catch (error) {
      throw new Error('SQLite fallback initialization failed')
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

  async getStorageInfo(): Promise<{ type: 'sqlite' | 'indexeddb'; size?: number }> {
    return this.ensureInitialized().getStorageInfo()
  }

  async getTableCounts(): Promise<Record<string, number>> {
    return this.ensureInitialized().getTableCounts()
  }
}
