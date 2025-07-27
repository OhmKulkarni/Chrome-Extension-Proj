// Comprehensive data storage system with SQLite WASM and IndexedDB fallback
// Schema definitions for all data types

export interface ApiCall {
  id?: number
  url: string
  method: string
  headers: string // JSON string
  payload_size: number
  status: number
  response_body: string
  timestamp: number
}

export interface ConsoleError {
  id?: number
  message: string
  stack_trace?: string
  timestamp: number
  severity: 'error' | 'warn' | 'info'
  url: string
}

export interface TokenEvent {
  id?: number
  type: 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token'
  value_hash: string // Hash of token value for privacy
  timestamp: number
  source_url: string
  expiry?: number
}

export interface MinifiedLibrary {
  id?: number
  name: string
  version: string
  size: number
  source_map_available: boolean
  url: string
  timestamp: number
}

export interface StorageConfig {
  maxRecordsPerTable: number
  maxAgeInDays: number
  pruneIntervalHours: number
}

export const DEFAULT_CONFIG: StorageConfig = {
  maxRecordsPerTable: 10000,
  maxAgeInDays: 30,
  pruneIntervalHours: 24
}

// Common CRUD operations interface
export interface StorageOperations {
  // Initialize storage
  init(): Promise<void>
  
  // API Calls
  insertApiCall(data: Omit<ApiCall, 'id'>): Promise<number>
  getApiCalls(limit?: number, offset?: number): Promise<ApiCall[]>
  deleteApiCall(id: number): Promise<void>
  
  // Console Errors
  insertConsoleError(data: Omit<ConsoleError, 'id'>): Promise<number>
  getConsoleErrors(limit?: number, offset?: number): Promise<ConsoleError[]>
  deleteConsoleError(id: number): Promise<void>
  
  // Token Events
  insertTokenEvent(data: Omit<TokenEvent, 'id'>): Promise<number>
  getTokenEvents(limit?: number, offset?: number): Promise<TokenEvent[]>
  deleteTokenEvent(id: number): Promise<void>
  
  // Minified Libraries
  insertMinifiedLibrary(data: Omit<MinifiedLibrary, 'id'>): Promise<number>
  getMinifiedLibraries(limit?: number, offset?: number): Promise<MinifiedLibrary[]>
  deleteMinifiedLibrary(id: number): Promise<void>
  
  // Data pruning
  pruneOldData(): Promise<void>
  getTableCounts(): Promise<{[table: string]: number}>
  
  // Storage info
  getStorageInfo(): Promise<{type: 'sqlite' | 'indexeddb', size?: number}>
}
