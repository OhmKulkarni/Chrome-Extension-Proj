// IndexedDB-only data storage system (SQLite removed for optimization)
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
  response_time?: number // Response time in milliseconds
  tab_id?: number // Track which tab this request came from
  tab_url?: string // Track the main tab URL for context
  main_domain?: string // The main domain this request is associated with
  request_body?: string // Request body for analysis
  request_size?: number // Request size in bytes
  response_size?: number // Response size in bytes
}

export interface ConsoleError {
  id?: number
  message: string
  stack_trace?: string
  timestamp: number
  severity: 'error' | 'warn' | 'info'
  url: string
  tab_id?: number // Track which tab this error came from
  tab_url?: string // Track the main tab URL for context
  main_domain?: string // The main domain this error is associated with
}

export interface TokenEvent {
  id?: number
  type: 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token'
  valueHash: string // Hash of token value for privacy
  timestamp: number
  source_url: string
  expiry?: number
  status?: number
  method?: string
  url?: string
  tab_id?: number // Track which tab this token came from
  tab_url?: string // Track the main tab URL for context
  main_domain?: string // The main domain this token is associated with
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

// Performance monitoring interfaces
export interface PerformanceStats {
  totalOperations: number
  averageOperationTime: number
  operationCounts: Record<string, number>
  operationTimes: Record<string, number[]>
  memoryUsage: {
    current: number
    peak: number
    average: number
  }
  storageSize: {
    total: number
    byTable: Record<string, number>
  }
  lastReset: number
  uptime: number
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
  getApiCallsFast?(limit?: number): Promise<ApiCall[]> // Optimized for performance testing
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
  clearAllData(): Promise<void>
  getTableCounts(): Promise<{[table: string]: number}>

  // Storage info
  getStorageInfo(): Promise<{type: 'indexeddb', size?: number}>

  // Settings operations
  setSetting(key: string, value: any, type?: string): Promise<void>
  getSetting(key: string): Promise<any>
  getAllSettings(): Promise<SettingsData[]>
  deleteSetting(key: string): Promise<void>

  // Tab state operations
  setTabState(tabId: number, state: Omit<TabState, 'tabId' | 'lastUpdated'>): Promise<void>
  getTabState(tabId: number): Promise<TabState | null>
  getAllTabStates(): Promise<TabState[]>
  deleteTabState(tabId: number): Promise<void>

  // Performance monitoring
  getPerformanceStats(): Promise<PerformanceStats>
}

// Settings storage interface
export interface SettingsData {
  key: string
  value: any
  timestamp: number
  type: 'extension' | 'network' | 'console' | 'tokens' | 'ui'
}

// Tab state storage interface
export interface TabState {
  tabId: number
  networkActive: boolean
  errorActive: boolean
  tokenActive?: boolean // Optional for backward compatibility
  networkStartTime?: number
  errorStartTime?: number
  tokenStartTime?: number
  networkRequestCount: number
  errorCount: number
  tokenCount?: number // Optional for backward compatibility
  lastUpdated: number
  url?: string
}
