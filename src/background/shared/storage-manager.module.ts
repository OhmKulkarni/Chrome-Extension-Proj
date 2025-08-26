/**
 * Storage Manager Module - Centralized Storage Operations
 *
 * Handles all Chrome storage operations with data integrity, batch processing,
 * and memory leak prevention. Extracted from the original background script's
 * scattered storage operations to provide centralized, safe storage management.
 */

import { ChromeApiModule } from './chrome-api.module';
import { EnvironmentStorageManager } from '../environment-storage-manager';
import {
  NetworkRequestData,
  ConsoleErrorData,
  TokenEvent,
  SafetyConfig
} from '../types/background-types';

export class StorageManagerModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly indexedDbStorage: EnvironmentStorageManager;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private batchQueue: { [key: string]: any[] } = {};
  private batchTimer: number | null = null;

  // Storage keys matching original background script
  private readonly STORAGE_KEYS = {
    NETWORK_REQUESTS: 'networkRequests',
    CONSOLE_ERRORS: 'consoleErrors',
    TOKEN_EVENTS: 'tokenEvents',
    SETTINGS: 'settings',
    TAB_STATES: 'tabStates',
    TAB_NETWORK_LOGGING: 'tabLogging', // Fixed to match UI
    TAB_ERROR_LOGGING: 'tabErrorLogging',
    TAB_TOKEN_LOGGING: 'tabTokenLogging'
  } as const;

  constructor(chromeApi: ChromeApiModule, indexedDbStorage: EnvironmentStorageManager, config: Partial<SafetyConfig> = {}) {
    this.chromeApi = chromeApi;
    this.indexedDbStorage = indexedDbStorage;
    this.config = {
      enableAbortController: true,
      maxRetries: 3,
      timeoutMs: 5000,
      enableRaceConditionProtection: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.abortController = new AbortController();
    console.log('🗄️ StorageManagerModule: Initialized with batch processing and IndexedDB storage');
  }

  /**
   * Initialize storage manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('StorageManagerModule: Already initialized');
      return;
    }

    try {
      // Verify Chrome API module is initialized
      if (!this.chromeApi.isExtensionContextValid()) {
        throw new Error('Chrome API module not properly initialized');
      }

      // Initialize batch processing if needed
      this.startBatchProcessor();

      this.isInitialized = true;
      console.log('✅ StorageManagerModule: Successfully initialized');
    } catch (error) {
      console.error('❌ StorageManagerModule: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.config.enableAbortController) {
      this.abortController.abort('StorageManagerModule cleanup');
    }

    this.batchQueue = {};
    this.isInitialized = false;
    console.log('🧹 StorageManagerModule: Cleanup completed');
  }

  // ===== NETWORK REQUEST STORAGE =====

  /**
   * Store network request data - Uses IndexedDB
   */
  async storeNetworkRequest(requestData: NetworkRequestData): Promise<void> {
    return this.executeWithSafety('storeNetworkRequest', async () => {
      // Add timestamp if not present
      if (!requestData.timestamp) {
        requestData.timestamp = new Date().toISOString();
      }

      // Store in IndexedDB as primary storage
      try {
        // Convert NetworkRequestData to ApiCall format
        const apiCallData = {
          url: requestData.url,
          method: requestData.method,
          headers: JSON.stringify(requestData.headers || {}),
          payload_size: requestData.body ? requestData.body.length : 0,
          status: requestData.status,
          response_body: requestData.body || '',
          timestamp: new Date(requestData.timestamp).getTime(),
          tab_id: requestData.tabId,
          tab_url: requestData.source_url,
          main_domain: new URL(requestData.url).hostname
        };

        await this.indexedDbStorage.insertApiCall(apiCallData);
        console.log('✅ StorageManagerModule: Network request stored in IndexedDB');
      } catch (error) {
        console.warn('StorageManagerModule: Failed to store network request in IndexedDB, falling back to Chrome storage:', error);

        // Fallback to Chrome storage for backward compatibility
        const existing = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.NETWORK_REQUESTS);
        const requests = existing[this.STORAGE_KEYS.NETWORK_REQUESTS] || [];
        requests.unshift(requestData);

        // Limit array size to prevent memory issues
        const maxRequests = 1000;
        if (requests.length > maxRequests) {
          requests.splice(maxRequests);
        }

        await this.chromeApi.setInStorage({
          [this.STORAGE_KEYS.NETWORK_REQUESTS]: requests
        });
      }
    });
  }

  /**
   * Get paginated network requests - Uses IndexedDB
   */
  async getNetworkRequests(limit = 50, offset = 0): Promise<NetworkRequestData[]> {
    return this.executeWithSafety('getNetworkRequests', async () => {
      // Try IndexedDB first
      try {
        const apiCalls = await this.indexedDbStorage.getApiCalls(limit, offset);

        // Convert ApiCall format back to NetworkRequestData format
        return apiCalls.map(apiCall => ({
          url: apiCall.url,
          method: apiCall.method,
          status: apiCall.status,
          headers: apiCall.headers ? JSON.parse(apiCall.headers) : undefined,
          body: apiCall.response_body || apiCall.request_body,
          requestBody: apiCall.request_body,
          responseBody: apiCall.response_body,
          timestamp: new Date(apiCall.timestamp).toISOString(),
          tabId: apiCall.tab_id,
          source_url: apiCall.tab_url,
          // Map size fields (both old and new format support)
          payload_size: apiCall.payload_size || ((apiCall.request_size || 0) + (apiCall.response_size || 0)),
          requestSize: apiCall.request_size || 0,
          responseSize: apiCall.response_size || 0,
          // Map duration fields (both old and new format support)
          response_time: apiCall.response_time,
          duration: apiCall.response_time,
          // Include additional fields
          request_headers: typeof apiCall.headers === 'string' && apiCall.headers ? JSON.parse(apiCall.headers).request : undefined,
          response_headers: typeof apiCall.headers === 'string' && apiCall.headers ? JSON.parse(apiCall.headers).response : undefined
        } as NetworkRequestData));
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get network requests from IndexedDB, falling back to Chrome storage:', error);

        // Fallback to Chrome storage
        const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.NETWORK_REQUESTS);
        const requests = result[this.STORAGE_KEYS.NETWORK_REQUESTS] || [];
        return requests.slice(offset, offset + limit);
      }
    });
  }

  // ===== CONSOLE ERROR STORAGE =====

  /**
   * Store console error data - Uses IndexedDB
   */
  async storeConsoleError(errorData: ConsoleErrorData): Promise<void> {
    return this.executeWithSafety('storeConsoleError', async () => {
      // Add timestamp if not present
      if (!errorData.timestamp) {
        errorData.timestamp = new Date().toISOString();
      }

      // Store in IndexedDB as primary storage
      try {
        // Convert ConsoleErrorData to ConsoleError format
        const consoleErrorData = {
          message: errorData.message,
          stack_trace: errorData.stack,
          timestamp: new Date(errorData.timestamp).getTime(),
          severity: errorData.severity as 'error' | 'warn' | 'info',
          url: errorData.url || '',
          tab_id: errorData.tabId,
          tab_url: errorData.source_url,
          main_domain: errorData.url ? new URL(errorData.url).hostname : ''
        };

        await this.indexedDbStorage.insertConsoleError(consoleErrorData);
        console.log('✅ StorageManagerModule: Console error stored in IndexedDB');
      } catch (error) {
        console.warn('StorageManagerModule: Failed to store console error in IndexedDB, falling back to Chrome storage:', error);

        // Fallback to Chrome storage for backward compatibility
        const existing = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.CONSOLE_ERRORS);
        const errors = existing[this.STORAGE_KEYS.CONSOLE_ERRORS] || [];
        errors.unshift(errorData);

        // Limit array size to prevent memory issues
        const maxErrors = 1000;
        if (errors.length > maxErrors) {
          errors.splice(maxErrors);
        }

        await this.chromeApi.setInStorage({
          [this.STORAGE_KEYS.CONSOLE_ERRORS]: errors
        });
      }
    });
  }

  /**
   * Get paginated console errors - Uses IndexedDB
   */
  async getConsoleErrors(limit = 50, offset = 0): Promise<ConsoleErrorData[]> {
    return this.executeWithSafety('getConsoleErrors', async () => {
      // Try IndexedDB first
      try {
        const consoleErrors = await this.indexedDbStorage.getConsoleErrors(limit, offset);

        // Convert ConsoleError format back to ConsoleErrorData format
        return consoleErrors.map(error => ({
          message: error.message,
          severity: error.severity,
          timestamp: new Date(error.timestamp).toISOString(),
          url: error.url,
          stack: error.stack_trace,
          source_url: error.tab_url,
          tabId: error.tab_id
        } as ConsoleErrorData));
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get console errors from IndexedDB, falling back to Chrome storage:', error);

        // Fallback to Chrome storage
        const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.CONSOLE_ERRORS);
        const errors = result[this.STORAGE_KEYS.CONSOLE_ERRORS] || [];
        return errors.slice(offset, offset + limit);
      }
    });
  }

  // ===== TOKEN EVENT STORAGE =====

  /**
   * Store token event data - Uses IndexedDB
   */
  async storeTokenEvent(tokenEvent: TokenEvent): Promise<void> {
    return this.executeWithSafety('storeTokenEvent', async () => {
      // Add timestamp if not present
      if (!tokenEvent.timestamp) {
        tokenEvent.timestamp = new Date().toISOString();
      }

      // Store in IndexedDB as primary storage
      try {
        // Convert background TokenEvent to storage TokenEvent format
        const storageTokenEvent = {
          type: this.mapTokenEventType(tokenEvent.type),
          valueHash: tokenEvent.valueHash || '',
          timestamp: new Date(tokenEvent.timestamp).getTime(),
          source_url: tokenEvent.source_url,
          expiry: tokenEvent.expiry,
          status: tokenEvent.status,
          method: tokenEvent.method,
          url: tokenEvent.url,
          main_domain: tokenEvent.url ? new URL(tokenEvent.url).hostname : ''
        };

        await this.indexedDbStorage.insertTokenEvent(storageTokenEvent);
        console.log('✅ StorageManagerModule: Token event stored in IndexedDB');
      } catch (error) {
        console.warn('StorageManagerModule: Failed to store token event in IndexedDB, falling back to Chrome storage:', error);

        // Fallback to Chrome storage for backward compatibility
        const existing = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.TOKEN_EVENTS);
        const events = existing[this.STORAGE_KEYS.TOKEN_EVENTS] || [];
        events.unshift(tokenEvent);

        // Limit array size to prevent memory issues
        const maxEvents = 1000;
        if (events.length > maxEvents) {
          events.splice(maxEvents);
        }

        await this.chromeApi.setInStorage({
          [this.STORAGE_KEYS.TOKEN_EVENTS]: events
        });
      }
    });
  }

  /**
   * Map background token event types to storage token event types
   */
  private mapTokenEventType(type: string): 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token' {
    // Simple mapping - could be improved based on actual token detection logic
    switch (type) {
      case 'acquire':
      case 'refresh':
      case 'verified':
        return 'jwt_token';
      case 'expired':
      case 'refresh_error':
        return 'session_token';
      case 'validation_failed':
        return 'api_key';
      case 'revoked':
        return 'oauth_token';
      default:
        return 'jwt_token';
    }
  }

  /**
   * Get paginated token events - Uses IndexedDB
   */
  async getTokenEvents(limit = 50, offset = 0): Promise<TokenEvent[]> {
    return this.executeWithSafety('getTokenEvents', async () => {
      // Try IndexedDB first
      try {
        const storageTokenEvents = await this.indexedDbStorage.getTokenEvents(limit, offset);

        // Convert storage TokenEvent format back to background TokenEvent format
        return storageTokenEvents.map(event => ({
          type: this.mapStorageTokenEventType(event.type),
          url: event.url || '',
          method: event.method || 'GET',
          status: event.status || 0,
          timestamp: new Date(event.timestamp).toISOString(),
          source_url: event.source_url,
          expiry: event.expiry,
          valueHash: event.valueHash
        } as TokenEvent));
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get token events from IndexedDB, falling back to Chrome storage:', error);

        // Fallback to Chrome storage
        const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.TOKEN_EVENTS);
        const events = result[this.STORAGE_KEYS.TOKEN_EVENTS] || [];
        return events.slice(offset, offset + limit);
      }
    });
  }

  /**
   * Map storage token event types back to background token event types
   */
  private mapStorageTokenEventType(type: 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token'): string {
    // Simple reverse mapping
    switch (type) {
      case 'jwt_token':
        return 'acquire';
      case 'session_token':
        return 'expired';
      case 'api_key':
        return 'validation_failed';
      case 'oauth_token':
        return 'revoked';
      default:
        return 'acquire';
    }
  }

  // ===== TAB STATE MANAGEMENT =====

  /**
   * Get tab logging state (network) - Uses IndexedDB
   */
  async getTabNetworkState(tabId: number): Promise<boolean> {
    return this.executeWithSafety('getTabNetworkState', async () => {
      // Try IndexedDB first
      try {
        const tabState = await this.indexedDbStorage.getTabState(tabId);
        if (tabState) {
          return tabState.networkActive;
        }
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get tab state from IndexedDB, falling back to Chrome storage:', error);
      }

      // Fallback to Chrome storage for backward compatibility
      const key = `${this.STORAGE_KEYS.TAB_NETWORK_LOGGING}_${tabId}`;
      const result = await this.chromeApi.getFromStorage(key);
      const tabState = result[key];

      if (typeof tabState === 'boolean') {
        return tabState;
      } else if (tabState && typeof tabState === 'object') {
        return tabState.active || false;
      }

      // If no specific tab state exists, check global settings for default behavior
      const settings = await this.getSettings();
      const defaultState = settings.networkInterception?.tabSpecific?.defaultState || 'paused';
      return defaultState === 'active';
    });
  }

  /**
   * Set tab logging state (network) - Uses IndexedDB
   */
  async setTabNetworkState(tabId: number, active: boolean): Promise<void> {
    return this.executeWithSafety('setTabNetworkState', async () => {
      // Get existing tab state or create new one
      let existingState;
      try {
        existingState = await this.indexedDbStorage.getTabState(tabId);
      } catch (error) {
        existingState = null;
      }

      const tabState = {
        networkActive: active,
        errorActive: existingState?.errorActive || false,
        networkStartTime: active ? Date.now() : undefined,
        errorStartTime: existingState?.errorStartTime,
        networkRequestCount: active ? 0 : existingState?.networkRequestCount || 0,
        errorCount: existingState?.errorCount || 0
      };

      // Save to IndexedDB as primary storage
      await this.indexedDbStorage.setTabState(tabId, tabState);

      // Also save to Chrome storage for backward compatibility
      const chromeKey = `${this.STORAGE_KEYS.TAB_NETWORK_LOGGING}_${tabId}`;
      await this.chromeApi.setInStorage({
        [chromeKey]: {
          active,
          startTime: Date.now(),
          requestCount: 0
        }
      });
    });
  }

  /**
   * Get tab error logging state - Uses IndexedDB
   */
  async getTabErrorState(tabId: number): Promise<boolean> {
    return this.executeWithSafety('getTabErrorState', async () => {
      // Try IndexedDB first
      try {
        const tabState = await this.indexedDbStorage.getTabState(tabId);
        if (tabState) {
          return tabState.errorActive;
        }
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get error tab state from IndexedDB, falling back to Chrome storage:', error);
      }

      // Fallback to Chrome storage for backward compatibility
      const key = `${this.STORAGE_KEYS.TAB_ERROR_LOGGING}_${tabId}`;
      const result = await this.chromeApi.getFromStorage(key);
      const tabState = result[key];

      if (typeof tabState === 'boolean') {
        return tabState;
      } else if (tabState && typeof tabState === 'object') {
        return tabState.active || false;
      }

      // Check global settings for default behavior
      const settings = await this.getSettings();
      const defaultState = settings.errorLogging?.tabSpecific?.defaultState || 'paused';
      return defaultState === 'active';
    });
  }

  /**
   * Set tab error logging state - Uses IndexedDB
   */
  async setTabErrorState(tabId: number, active: boolean): Promise<void> {
    return this.executeWithSafety('setTabErrorState', async () => {
      // Get existing tab state or create new one
      let existingState;
      try {
        existingState = await this.indexedDbStorage.getTabState(tabId);
      } catch (error) {
        existingState = null;
      }

      const tabState = {
        networkActive: existingState?.networkActive || false,
        errorActive: active,
        networkStartTime: existingState?.networkStartTime,
        errorStartTime: active ? Date.now() : undefined,
        networkRequestCount: existingState?.networkRequestCount || 0,
        errorCount: active ? 0 : existingState?.errorCount || 0
      };

      // Save to IndexedDB as primary storage
      await this.indexedDbStorage.setTabState(tabId, tabState);

      // Also save to Chrome storage for backward compatibility
      const chromeKey = `${this.STORAGE_KEYS.TAB_ERROR_LOGGING}_${tabId}`;
      await this.chromeApi.setInStorage({
        [chromeKey]: {
          active,
          startTime: Date.now(),
          errorCount: 0
        }
      });
    });
  }

  // ===== TAB TOKEN STATE MANAGEMENT =====

  /**
   * Get tab token logging state - Uses IndexedDB with Chrome storage fallback
   */
  async getTabTokenState(tabId: number): Promise<boolean> {
    return this.executeWithSafety('getTabTokenState', async () => {
      // Try to get from IndexedDB first
      try {
        const tabState = await this.indexedDbStorage.getTabState(tabId);
        if (tabState && typeof tabState.tokenActive === 'boolean') {
          return tabState.tokenActive;
        }
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get token tab state from IndexedDB, falling back to Chrome storage:', error);
      }

      // Fallback to Chrome storage for backward compatibility
      const key = `${this.STORAGE_KEYS.TAB_TOKEN_LOGGING}_${tabId}`;
      const result = await this.chromeApi.getFromStorage(key);
      const tabState = result[key];

      if (typeof tabState === 'boolean') {
        return tabState;
      } else if (tabState && typeof tabState === 'object') {
        return tabState.active || false;
      }

      return false; // Default to false for token logging
    });
  }

  /**
   * Set tab token logging state - Uses IndexedDB
   */
  async setTabTokenState(tabId: number, active: boolean): Promise<void> {
    return this.executeWithSafety('setTabTokenState', async () => {
      // Get existing tab state or create new one
      let existingState;
      try {
        existingState = await this.indexedDbStorage.getTabState(tabId);
      } catch (error) {
        existingState = null;
      }

      const tabState = {
        networkActive: existingState?.networkActive || false,
        errorActive: existingState?.errorActive || false,
        tokenActive: active,
        networkStartTime: existingState?.networkStartTime,
        errorStartTime: existingState?.errorStartTime,
        tokenStartTime: active ? Date.now() : undefined,
        networkRequestCount: existingState?.networkRequestCount || 0,
        errorCount: existingState?.errorCount || 0,
        tokenCount: active ? 0 : existingState?.tokenCount || 0
      };

      // Save to IndexedDB as primary storage
      await this.indexedDbStorage.setTabState(tabId, tabState);

      // Also save to Chrome storage for backward compatibility
      const chromeKey = `${this.STORAGE_KEYS.TAB_TOKEN_LOGGING}_${tabId}`;
      await this.chromeApi.setInStorage({
        [chromeKey]: {
          active,
          startTime: Date.now(),
          tokenCount: 0
        }
      });
    });
  }

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Get extension settings (from IndexedDB)
   */
  async getSettings(): Promise<any> {
    return this.executeWithSafety('getSettings', async () => {
      // Try to get settings from IndexedDB first
      try {
        const settings = await this.indexedDbStorage.getSetting('extensionSettings');
        if (settings) {
          return settings;
        }
      } catch (error) {
        console.warn('StorageManagerModule: Failed to get settings from IndexedDB, falling back to Chrome storage:', error);
      }

      // Fallback to Chrome storage for backward compatibility
      const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.SETTINGS);
      return result[this.STORAGE_KEYS.SETTINGS] || {};
    });
  }

  /**
   * Update extension settings (to IndexedDB)
   */
  async updateSettings(settings: any): Promise<void> {
    return this.executeWithSafety('updateSettings', async () => {
      // Save to IndexedDB as primary storage
      await this.indexedDbStorage.setSetting('extensionSettings', settings, 'extension');

      // Also save to Chrome storage for backward compatibility during migration
      await this.chromeApi.setInStorage({
        [this.STORAGE_KEYS.SETTINGS]: settings
      });
    });
  }

  // ===== BULK OPERATIONS =====

  /**
   * Clear all data (matching original background script functionality)
   */
  async clearAllData(): Promise<void> {
    return this.executeWithSafety('clearAllData', async () => {
      // Get all current storage data
      const allStorage = await this.chromeApi.getFromStorage(null);

      // Prepare updates object for batch operation
      const updates: { [key: string]: any } = {};

      // Clear main data arrays
      updates[this.STORAGE_KEYS.NETWORK_REQUESTS] = [];
      updates[this.STORAGE_KEYS.CONSOLE_ERRORS] = [];
      updates[this.STORAGE_KEYS.TOKEN_EVENTS] = [];

      // Reset tab network logging counts while preserving states
      const tabNetworkLoggingKeys = Object.keys(allStorage).filter(key =>
        key.startsWith(this.STORAGE_KEYS.TAB_NETWORK_LOGGING)
      );

      for (const key of tabNetworkLoggingKeys) {
        const tabState = allStorage[key];
        if (tabState && typeof tabState === 'object') {
          updates[key] = {
            ...tabState,
            requestCount: 0
          };
        } else if (typeof tabState === 'boolean') {
          // Convert old boolean format to new object format
          updates[key] = {
            active: tabState,
            startTime: Date.now(),
            requestCount: 0
          };
        }
      }

      // Reset tab error logging counts while preserving states
      const tabErrorLoggingKeys = Object.keys(allStorage).filter(key =>
        key.startsWith(this.STORAGE_KEYS.TAB_ERROR_LOGGING)
      );

      for (const key of tabErrorLoggingKeys) {
        const tabState = allStorage[key];
        if (tabState && typeof tabState === 'object') {
          updates[key] = {
            ...tabState,
            errorCount: 0
          };
        } else if (typeof tabState === 'boolean') {
          // Convert old boolean format to new object format
          updates[key] = {
            active: tabState,
            startTime: Date.now(),
            errorCount: 0
          };
        }
      }

      // Apply all updates in batch
      if (Object.keys(updates).length > 0) {
        await this.chromeApi.setInStorage(updates);
      }
    });
  }

  /**
   * Get storage analysis data
   */
  async getStorageAnalysis(): Promise<{
    networkRequests: number;
    consoleErrors: number;
    tokenEvents: number;
    totalStorageKeys: number;
    activeTabStates: number;
  }> {
    return this.executeWithSafety('getStorageAnalysis', async () => {
      const allStorage = await this.chromeApi.getFromStorage(null);

      const networkRequests = (allStorage[this.STORAGE_KEYS.NETWORK_REQUESTS] || []).length;
      const consoleErrors = (allStorage[this.STORAGE_KEYS.CONSOLE_ERRORS] || []).length;
      const tokenEvents = (allStorage[this.STORAGE_KEYS.TOKEN_EVENTS] || []).length;
      const totalStorageKeys = Object.keys(allStorage).length;

      // Count active tab states
      const activeTabStates = Object.keys(allStorage).filter(key =>
        (key.startsWith(this.STORAGE_KEYS.TAB_NETWORK_LOGGING) ||
         key.startsWith(this.STORAGE_KEYS.TAB_ERROR_LOGGING)) &&
        ((typeof allStorage[key] === 'boolean' && allStorage[key]) ||
         (typeof allStorage[key] === 'object' && allStorage[key]?.active))
      ).length;

      return {
        networkRequests,
        consoleErrors,
        tokenEvents,
        totalStorageKeys,
        activeTabStates
      };
    });
  }

  // ===== BATCH PROCESSING =====

  /**
   * Start batch processor for improved performance
   */
  private startBatchProcessor(): void {
    if (this.batchTimer) {
      return; // Already started
    }

    this.batchTimer = setInterval(async () => {
      await this.processBatch();
    }, 1000); // Process batches every second

    console.log('🔄 StorageManagerModule: Batch processor started');
  }

  /**
   * Process queued batch operations
   */
  private async processBatch(): Promise<void> {
    if (Object.keys(this.batchQueue).length === 0) {
      return;
    }

    const currentBatch = { ...this.batchQueue };
    this.batchQueue = {}; // Clear queue

    try {
      // Process each batch type
      for (const [operation, items] of Object.entries(currentBatch)) {
        if (items.length === 0) continue;

        switch (operation) {
          case 'networkRequests':
            for (const item of items) {
              await this.storeNetworkRequest(item);
            }
            break;
          case 'consoleErrors':
            for (const item of items) {
              await this.storeConsoleError(item);
            }
            break;
          case 'tokenEvents':
            for (const item of items) {
              await this.storeTokenEvent(item);
            }
            break;
        }
      }
    } catch (error) {
      console.error('StorageManagerModule: Batch processing failed:', error);
    }
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute operation with comprehensive safety measures
   */
  private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`StorageManagerModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`StorageManagerModule: Operation aborted (${operation})`);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Race condition protection
        if (this.config.enableRaceConditionProtection && attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }

        const result = await fn();

        // Log performance for slow operations
        const duration = Date.now() - startTime;
        if (duration > 1000) { // Log operations taking more than 1 second
          console.warn(`🐌 StorageManagerModule: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ StorageManagerModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        console.warn(`⚠️ StorageManagerModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`StorageManagerModule: Unknown error in ${operation}`);
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<{
    networkRequests: number;
    consoleErrors: number;
    tokenEvents: number;
    tabStates: number;
  }> {
    try {
      // Get counts by retrieving data and counting items
      // We'll use a large limit to get accurate counts
      const [networkData, errorData, tokenData] = await Promise.all([
        this.getNetworkRequests(10000, 0),
        this.getConsoleErrors(10000, 0),
        this.getTokenEvents(10000, 0)
      ]);

      // Count tab states by checking settings or using a default
      const settings = await this.getSettings();
      const tabStatesCount = Object.keys(settings).filter(key =>
        key.startsWith('tabLogging_') ||
        key.startsWith('tabErrorLogging_') ||
        key.startsWith('tabTokenLogging_')
      ).length;

      return {
        networkRequests: networkData.length,
        consoleErrors: errorData.length,
        tokenEvents: tokenData.length,
        tabStates: tabStatesCount
      };
    } catch (error) {
      console.error('StorageManagerModule: Error getting storage info:', error);
      return {
        networkRequests: 0,
        consoleErrors: 0,
        tokenEvents: 0,
        tabStates: 0
      };
    }
  }

  /**
   * Get module status for debugging
   */
  getStatus(): {
    initialized: boolean;
    batchQueueSize: number;
    batchProcessorActive: boolean;
    aborted: boolean;
  } {
    return {
      initialized: this.isInitialized,
      batchQueueSize: Object.values(this.batchQueue).reduce((total, queue) => total + queue.length, 0),
      batchProcessorActive: !!this.batchTimer,
      aborted: this.abortController.signal.aborted
    };
  }
}
