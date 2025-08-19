/**
 * Storage Manager Module - Centralized Storage Operations
 *
 * Handles all Chrome storage operations with data integrity, batch processing,
 * and memory leak prevention. Extracted from the original background script's
 * scattered storage operations to provide centralized, safe storage management.
 */

import { ChromeApiModule } from './chrome-api.module';
import {
  NetworkRequestData,
  ConsoleErrorData,
  TokenEvent,
  SafetyConfig
} from '../types/background-types';

export class StorageManagerModule {
  private readonly chromeApi: ChromeApiModule;
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
    TAB_ERROR_LOGGING: 'tabErrorLogging'
  } as const;

  constructor(chromeApi: ChromeApiModule, config: Partial<SafetyConfig> = {}) {
    this.chromeApi = chromeApi;
    this.config = {
      enableAbortController: true,
      maxRetries: 3,
      timeoutMs: 5000,
      enableRaceConditionProtection: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.abortController = new AbortController();
    console.log('🗄️ StorageManagerModule: Initialized with batch processing');
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
   * Store network request data
   */
  async storeNetworkRequest(requestData: NetworkRequestData): Promise<void> {
    return this.executeWithSafety('storeNetworkRequest', async () => {
      const existing = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.NETWORK_REQUESTS);
      const requests = existing[this.STORAGE_KEYS.NETWORK_REQUESTS] || [];

      // Add timestamp if not present
      if (!requestData.timestamp) {
        requestData.timestamp = new Date().toISOString();
      }

      requests.unshift(requestData); // Add to beginning for latest-first order

      // Limit array size to prevent memory issues (same as original)
      const maxRequests = 1000;
      if (requests.length > maxRequests) {
        requests.splice(maxRequests);
      }

      await this.chromeApi.setInStorage({
        [this.STORAGE_KEYS.NETWORK_REQUESTS]: requests
      });
    });
  }

  /**
   * Get paginated network requests
   */
  async getNetworkRequests(limit = 50, offset = 0): Promise<NetworkRequestData[]> {
    return this.executeWithSafety('getNetworkRequests', async () => {
      const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.NETWORK_REQUESTS);
      const requests = result[this.STORAGE_KEYS.NETWORK_REQUESTS] || [];

      return requests.slice(offset, offset + limit);
    });
  }

  // ===== CONSOLE ERROR STORAGE =====

  /**
   * Store console error data
   */
  async storeConsoleError(errorData: ConsoleErrorData): Promise<void> {
    return this.executeWithSafety('storeConsoleError', async () => {
      const existing = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.CONSOLE_ERRORS);
      const errors = existing[this.STORAGE_KEYS.CONSOLE_ERRORS] || [];

      // Add timestamp if not present
      if (!errorData.timestamp) {
        errorData.timestamp = new Date().toISOString();
      }

      errors.unshift(errorData); // Add to beginning for latest-first order

      // Limit array size to prevent memory issues (same as original)
      const maxErrors = 1000;
      if (errors.length > maxErrors) {
        errors.splice(maxErrors);
      }

      await this.chromeApi.setInStorage({
        [this.STORAGE_KEYS.CONSOLE_ERRORS]: errors
      });
    });
  }

  /**
   * Get paginated console errors
   */
  async getConsoleErrors(limit = 50, offset = 0): Promise<ConsoleErrorData[]> {
    return this.executeWithSafety('getConsoleErrors', async () => {
      const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.CONSOLE_ERRORS);
      const errors = result[this.STORAGE_KEYS.CONSOLE_ERRORS] || [];

      return errors.slice(offset, offset + limit);
    });
  }

  // ===== TOKEN EVENT STORAGE =====

  /**
   * Store token event data
   */
  async storeTokenEvent(tokenEvent: TokenEvent): Promise<void> {
    return this.executeWithSafety('storeTokenEvent', async () => {
      const existing = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.TOKEN_EVENTS);
      const events = existing[this.STORAGE_KEYS.TOKEN_EVENTS] || [];

      // Add timestamp if not present
      if (!tokenEvent.timestamp) {
        tokenEvent.timestamp = new Date().toISOString();
      }

      events.unshift(tokenEvent); // Add to beginning for latest-first order

      // Limit array size to prevent memory issues (same as original)
      const maxEvents = 1000;
      if (events.length > maxEvents) {
        events.splice(maxEvents);
      }

      await this.chromeApi.setInStorage({
        [this.STORAGE_KEYS.TOKEN_EVENTS]: events
      });
    });
  }

  /**
   * Get paginated token events
   */
  async getTokenEvents(limit = 50, offset = 0): Promise<TokenEvent[]> {
    return this.executeWithSafety('getTokenEvents', async () => {
      const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.TOKEN_EVENTS);
      const events = result[this.STORAGE_KEYS.TOKEN_EVENTS] || [];

      return events.slice(offset, offset + limit);
    });
  }

  // ===== TAB STATE MANAGEMENT =====

  /**
   * Get tab logging state (network)
   */
  async getTabNetworkState(tabId: number): Promise<boolean> {
    return this.executeWithSafety('getTabNetworkState', async () => {
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
   * Set tab logging state (network)
   */
  async setTabNetworkState(tabId: number, active: boolean): Promise<void> {
    return this.executeWithSafety('setTabNetworkState', async () => {
      const key = `${this.STORAGE_KEYS.TAB_NETWORK_LOGGING}_${tabId}`;
      const tabState = {
        active,
        startTime: Date.now(),
        requestCount: 0
      };

      await this.chromeApi.setInStorage({ [key]: tabState });
    });
  }

  /**
   * Get tab error logging state
   */
  async getTabErrorState(tabId: number): Promise<boolean> {
    return this.executeWithSafety('getTabErrorState', async () => {
      const key = `${this.STORAGE_KEYS.TAB_ERROR_LOGGING}_${tabId}`;
      const result = await this.chromeApi.getFromStorage(key);
      const tabState = result[key];

      if (typeof tabState === 'boolean') {
        return tabState;
      } else if (tabState && typeof tabState === 'object') {
        return tabState.active || false;
      }

      // Default state (matching original background script)
      return false; // Default to paused for error logging
    });
  }

  /**
   * Set tab error logging state
   */
  async setTabErrorState(tabId: number, active: boolean): Promise<void> {
    return this.executeWithSafety('setTabErrorState', async () => {
      const key = `${this.STORAGE_KEYS.TAB_ERROR_LOGGING}_${tabId}`;
      const tabState = {
        active,
        startTime: Date.now(),
        errorCount: 0
      };

      await this.chromeApi.setInStorage({ [key]: tabState });
    });
  }

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Get extension settings
   */
  async getSettings(): Promise<any> {
    return this.executeWithSafety('getSettings', async () => {
      const result = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.SETTINGS);
      return result[this.STORAGE_KEYS.SETTINGS] || {};
    });
  }

  /**
   * Update extension settings
   */
  async updateSettings(settings: any): Promise<void> {
    return this.executeWithSafety('updateSettings', async () => {
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
