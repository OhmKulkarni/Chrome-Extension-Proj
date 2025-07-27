// Main storage manager with SQLite/IndexedDB fallback
import type { StorageOperations, StorageConfig, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary } from './storage-types'
import { DEFAULT_CONFIG } from './storage-types'
// import { SQLiteStorage } from './sqlite-storage' // Temporarily disabled
import { IndexedDBStorage } from './indexeddb-storage'

export class StorageManager implements StorageOperations {
  private storage: StorageOperations | null = null
  private config: StorageConfig
  private storageType: 'sqlite' | 'indexeddb' | null = null

  constructor(config: StorageConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  async init(): Promise<void> {
    // Temporarily disable SQLite while debugging offscreen document issues
    // TODO: Re-enable once offscreen document creation is resolved
    console.log('Skipping SQLite initialization, using IndexedDB directly')

    // Use IndexedDB as primary storage
    try {
      const indexedDBStorage = new IndexedDBStorage(this.config)
      await indexedDBStorage.init()
      this.storage = indexedDBStorage
      this.storageType = 'indexeddb'
      console.log('Storage: IndexedDB initialized successfully')
      return
    } catch (error) {
      console.error('IndexedDB initialization failed:', error instanceof Error ? error.message : String(error))
      throw new Error('Both SQLite and IndexedDB storage initialization failed')
    }
  }

  private ensureInitialized(): StorageOperations {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call init() first.')
    }
    return this.storage
  }

  // API Calls
  async insertApiCall(data: Parameters<StorageOperations['insertApiCall']>[0]): Promise<number> {
    return this.ensureInitialized().insertApiCall(data)
  }

  async getApiCalls(limit?: number, offset?: number): Promise<ApiCall[]> {
    return this.ensureInitialized().getApiCalls(limit, offset)
  }

  async deleteApiCall(id: number): Promise<void> {
    return this.ensureInitialized().deleteApiCall(id)
  }

  // Console Errors
  async insertConsoleError(data: Parameters<StorageOperations['insertConsoleError']>[0]): Promise<number> {
    return this.ensureInitialized().insertConsoleError(data)
  }

  async getConsoleErrors(limit?: number, offset?: number): Promise<ConsoleError[]> {
    return this.ensureInitialized().getConsoleErrors(limit, offset)
  }

  async deleteConsoleError(id: number): Promise<void> {
    return this.ensureInitialized().deleteConsoleError(id)
  }

  // Token Events
  async insertTokenEvent(data: Parameters<StorageOperations['insertTokenEvent']>[0]): Promise<number> {
    return this.ensureInitialized().insertTokenEvent(data)
  }

  async getTokenEvents(limit?: number, offset?: number): Promise<TokenEvent[]> {
    return this.ensureInitialized().getTokenEvents(limit, offset)
  }

  async deleteTokenEvent(id: number): Promise<void> {
    return this.ensureInitialized().deleteTokenEvent(id)
  }

  // Minified Libraries
  async insertMinifiedLibrary(data: Parameters<StorageOperations['insertMinifiedLibrary']>[0]): Promise<number> {
    return this.ensureInitialized().insertMinifiedLibrary(data)
  }

  async getMinifiedLibraries(limit?: number, offset?: number): Promise<MinifiedLibrary[]> {
    return this.ensureInitialized().getMinifiedLibraries(limit, offset)
  }

  async deleteMinifiedLibrary(id: number): Promise<void> {
    return this.ensureInitialized().deleteMinifiedLibrary(id)
  }

  // Data management
  async pruneOldData(): Promise<void> {
    return this.ensureInitialized().pruneOldData()
  }

  async getTableCounts(): Promise<{[table: string]: number}> {
    return this.ensureInitialized().getTableCounts()
  }

  async getStorageInfo(): Promise<{type: 'sqlite' | 'indexeddb', size?: number}> {
    return this.ensureInitialized().getStorageInfo()
  }

  // Additional utility methods
  getStorageType(): 'sqlite' | 'indexeddb' | null {
    return this.storageType
  }

  isInitialized(): boolean {
    return this.storage !== null
  }

  // Batch operations for better performance
  async insertApiCallsBatch(data: Array<Parameters<StorageOperations['insertApiCall']>[0]>): Promise<number[]> {
    const ids: number[] = []
    for (const item of data) {
      ids.push(await this.insertApiCall(item))
    }
    return ids
  }

  async insertConsoleErrorsBatch(data: Array<Parameters<StorageOperations['insertConsoleError']>[0]>): Promise<number[]> {
    const ids: number[] = []
    for (const item of data) {
      ids.push(await this.insertConsoleError(item))
    }
    return ids
  }

  async insertTokenEventsBatch(data: Array<Parameters<StorageOperations['insertTokenEvent']>[0]>): Promise<number[]> {
    const ids: number[] = []
    for (const item of data) {
      ids.push(await this.insertTokenEvent(item))
    }
    return ids
  }

  async insertMinifiedLibrariesBatch(data: Array<Parameters<StorageOperations['insertMinifiedLibrary']>[0]>): Promise<number[]> {
    const ids: number[] = []
    for (const item of data) {
      ids.push(await this.insertMinifiedLibrary(item))
    }
    return ids
  }
}

// Export singleton instance
export const storageManager = new StorageManager()
