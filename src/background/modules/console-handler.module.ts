/**
 * Console Handler Module - Console Error Processing and Management
 *
 * Handles console error processing, filtering, and storage with comprehensive
 * validation and safety measures. Extracted from the original background script's
 * console error handling functionality.
 */

import { ChromeApiModule } from '../shared/chrome-api.module';
import { StorageManagerModule } from '../shared/storage-manager.module';
import { EnvironmentStorageManager } from '../environment-storage-manager';
import {
  ConsoleErrorData,
  SafetyConfig
} from '../types/background-types';

export class ConsoleHandlerModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly storageManager: StorageManagerModule;
  private readonly indexedDbStorage: EnvironmentStorageManager;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private processedCount = 0;

  constructor(
    chromeApi: ChromeApiModule,
    storageManager: StorageManagerModule,
    indexedDbStorage: EnvironmentStorageManager,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
    this.storageManager = storageManager;
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
    console.log('🔥 ConsoleHandlerModule: Initialized with error processing');
  }

  /**
   * Initialize console handler module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('ConsoleHandlerModule: Already initialized');
      return;
    }

    try {
      // Verify dependencies are initialized
      if (!this.chromeApi.isExtensionContextValid()) {
        throw new Error('Chrome API module not properly initialized');
      }

      this.isInitialized = true;
      console.log('✅ ConsoleHandlerModule: Successfully initialized');
    } catch (error) {
      console.error('❌ ConsoleHandlerModule: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup(): void {
    if (this.config.enableAbortController) {
      this.abortController.abort('ConsoleHandlerModule cleanup');
    }

    this.isInitialized = false;
    this.processedCount = 0;
    console.log('🧹 ConsoleHandlerModule: Cleanup completed');
  }

  // ===== CONSOLE ERROR PROCESSING =====

  /**
   * Process console error data with comprehensive validation and storage
   * Handles data from both main world script (via content script) and other sources
   */
  async processConsoleError(
    errorData: any,
    sender?: chrome.runtime.MessageSender
  ): Promise<{ success: boolean; reason?: string }> {
    return this.executeWithSafety('processConsoleError', async () => {
      // Validate input data
      if (!errorData || typeof errorData !== 'object') {
        return { success: false, reason: 'Invalid error data' };
      }

      const { message, severity, timestamp, url, lineNumber, columnNumber, stack } = errorData;

      // Basic validation
      if (!message || typeof message !== 'string') {
        return { success: false, reason: 'Invalid message' };
      }

      // Get tab information - prioritize data from content script over sender
      const tabId = errorData.tabId || sender?.tab?.id;
      const tabUrl = errorData.tabUrl || sender?.tab?.url;

      // Check if tab error logging is active (matching original background script logic)
      if (tabId) {
        const isTabLoggingActive = await this.storageManager.getTabErrorState(tabId);
        if (!isTabLoggingActive) {
          console.log('🚫 ConsoleHandlerModule: Tab error logging is paused, rejecting error');
          return { success: false, reason: 'Tab error logging paused' };
        }
      }

      // Get current settings for validation
      const settings = await this.storageManager.getSettings();
      const errorLoggingConfig = settings.errorLogging || {};

      // Check if error logging is globally enabled
      if (errorLoggingConfig.enabled === false) {
        return { success: false, reason: 'Error logging disabled' };
      }

      // Apply severity filtering (matching original background script)
      const allowedSeverities = errorLoggingConfig.severity || ['error', 'warn', 'info'];
      const errorSeverity = this.normalizeSeverity(severity);

      if (!allowedSeverities.includes(errorSeverity)) {
        return { success: false, reason: `Severity '${errorSeverity}' filtered out` };
      }

      // Extract main domain for intelligent grouping
      const mainDomain = tabUrl ? this.extractMainDomain(tabUrl) : this.extractMainDomain(url || 'unknown');

      // Create validated console error data
      const uniqueId = `console_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const validatedErrorData: ConsoleErrorData = {
        id: uniqueId,
        message: this.sanitizeMessage(message),
        severity: errorSeverity,
        timestamp: timestamp || new Date().toISOString(),
        source_url: tabUrl || url || 'unknown',
        ...(url && { url }),
        ...(lineNumber && { lineNumber }),
        ...(columnNumber && { columnNumber }),
        ...(stack && { stack: this.sanitizeStack(stack) }),
        ...(tabId && { tabId })
      };

      // Store the console error in IndexedDB using the same format as origin/main
      try {
        const consoleErrorData = {
          message: validatedErrorData.message,
          stack_trace: validatedErrorData.stack || '',
          timestamp: new Date(validatedErrorData.timestamp).getTime(),
          severity: errorSeverity as 'error' | 'warn' | 'info',
          url: validatedErrorData.source_url || 'unknown',
          tab_id: tabId,
          tab_url: tabUrl,
          main_domain: mainDomain
        };

        // Use IndexedDB storage with race condition protection
        if (this.config.enableRaceConditionProtection) {
          await this.indexedDbStorage.insertConsoleError(consoleErrorData);
        } else {
          // Fire and forget for performance (not recommended)
          this.indexedDbStorage.insertConsoleError(consoleErrorData).catch(error =>
            console.warn('ConsoleHandlerModule: IndexedDB storage failed:', error)
          );
        }

        console.log(`🗄️ ConsoleHandlerModule: Stored console error in IndexedDB`);

        // Notify dashboard about new data
        this.sendDataUpdatedNotification('console_error');
      } catch (storageError) {
        console.error('ConsoleHandlerModule: IndexedDB storage failed:', storageError);
        // Continue processing even if storage fails
      }

      this.processedCount++;

      console.log(`🔥 ConsoleHandlerModule: Processed ${errorSeverity} error from ${mainDomain}`);

      return { success: true };
    });
  }

  // ===== DATA RETRIEVAL =====

  /**
   * Get console errors with pagination (from IndexedDB)
   */
  async getConsoleErrors(limit = 50, offset = 0): Promise<ConsoleErrorData[]> {
    return this.executeWithSafety('getConsoleErrors', async () => {
      // Get data from IndexedDB instead of Chrome storage
      const consoleErrors = await this.indexedDbStorage.getConsoleErrors(limit, offset);

      // Transform IndexedDB ConsoleError format to ConsoleErrorData format for compatibility
      return consoleErrors.map(error => ({
        id: error.id?.toString() || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: error.message,
        severity: error.severity,
        timestamp: new Date(error.timestamp).toISOString(),
        source_url: error.tab_url || error.url || 'unknown',
        url: error.url,
        stack: error.stack_trace,
        tabId: error.tab_id
      }));
    });
  }

  /**
   * Get total count of console errors
   */
  async getConsoleErrorsCount(): Promise<number> {
    return this.executeWithSafety('getConsoleErrorsCount', async () => {
      const counts = await this.indexedDbStorage.getTableCounts();
      return counts.consoleErrors || 0;
    });
  }

  /**
   * Send DATA_UPDATED notification to dashboard
   */
  private sendDataUpdatedNotification(dataType: string): void {
    try {
      // Use chrome.runtime.sendMessage to notify dashboard
      (globalThis as any).chrome?.runtime?.sendMessage({
        type: 'DATA_UPDATED',
        dataType: dataType
      });
    } catch (error) {
      // Dashboard might not be open, ignore error
      console.log('📡 ConsoleHandlerModule: Could not notify dashboard (dashboard closed?):', error);
    }
  }

  // ===== TAB STATE MANAGEMENT =====

  /**
   * Toggle error logging for a specific tab
   */
  async toggleTabErrorLogging(tabId: number): Promise<{ success: boolean; newState: boolean }> {
    return this.executeWithSafety('toggleTabErrorLogging', async () => {
      // Get current state
      const currentState = await this.storageManager.getTabErrorState(tabId);
      const newState = !currentState;

      // Set new state
      await this.storageManager.setTabErrorState(tabId, newState);

      console.log(`🔥 ConsoleHandlerModule: Tab ${tabId} error logging ${newState ? 'enabled' : 'disabled'}`);

      return { success: true, newState };
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Normalize severity levels
   */
  private normalizeSeverity(severity: any): 'error' | 'warn' | 'info' {
    const validSeverities = ['error', 'warn', 'info'] as const;

    if (typeof severity === 'string' && validSeverities.includes(severity as any)) {
      return severity as 'error' | 'warn' | 'info';
    }

    // Default to 'error' for unknown severities
    return 'error';
  }

  /**
   * Sanitize error message to prevent memory issues
   */
  private sanitizeMessage(message: any): string {
    if (typeof message !== 'string') {
      if (typeof message === 'object' && message !== null) {
        try {
          return JSON.stringify(message);
        } catch {
          return '[Object - JSON stringify failed]';
        }
      }
      return String(message);
    }

    // Limit message length to prevent memory issues
    const maxLength = 1000;
    if (message.length > maxLength) {
      return message.substring(0, maxLength) + `... [truncated, original length: ${message.length}]`;
    }

    return message;
  }

  /**
   * Sanitize stack trace to prevent memory issues
   */
  private sanitizeStack(stack: any): string | undefined {
    if (!stack) return undefined;

    const stackStr = typeof stack === 'string' ? stack : String(stack);

    // Limit stack trace length to prevent memory issues
    const maxLength = 2000;
    if (stackStr.length > maxLength) {
      return stackStr.substring(0, maxLength) + `... [truncated, original length: ${stackStr.length}]`;
    }

    return stackStr;
  }

  /**
   * Extract main domain from URL
   */
  private extractMainDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Remove 'www.' prefix if present
      const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

      // For most cases, return the base domain
      const parts = withoutWww.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }

      return withoutWww;
    } catch (error) {
      console.warn('ConsoleHandlerModule: Failed to extract main domain from URL:', url, error);
      return 'unknown';
    }
  }

  // ===== ANALYTICS AND MONITORING =====

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    processedCount: number;
    initialized: boolean;
    memoryUsage?: any;
  } {
    return {
      processedCount: this.processedCount,
      initialized: this.isInitialized,
      ...(this.config.enableMemoryMonitoring && {
        memoryUsage: this.chromeApi.getMemoryUsage()
      })
    };
  }

  // ===== SETTINGS VALIDATION =====

  /**
   * Validate and get error logging configuration
   */
  async getErrorLoggingConfig(): Promise<{
    enabled: boolean;
    severity: string[];
    tabSpecific?: {
      defaultState: 'active' | 'paused';
    };
  }> {
    return this.executeWithSafety('getErrorLoggingConfig', async () => {
      const settings = await this.storageManager.getSettings();
      const errorLoggingConfig = settings.errorLogging || {};

      return {
        enabled: errorLoggingConfig.enabled !== false, // Default to true
        severity: errorLoggingConfig.severity || ['error', 'warn', 'info'],
        tabSpecific: {
          defaultState: errorLoggingConfig.tabSpecific?.defaultState || 'paused' // Matching original background script
        }
      };
    });
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute operation with comprehensive safety measures
   */
  private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`ConsoleHandlerModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`ConsoleHandlerModule: Operation aborted (${operation})`);
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
        if (duration > 500 && attempt === 0) {
          console.warn(`🐌 ConsoleHandlerModule: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ ConsoleHandlerModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        console.warn(`⚠️ ConsoleHandlerModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`ConsoleHandlerModule: Unknown error in ${operation}`);
  }

  /**
   * Get module status for debugging
   */
  getStatus(): {
    initialized: boolean;
    processedCount: number;
    aborted: boolean;
    memoryUsage?: any;
  } {
    return {
      initialized: this.isInitialized,
      processedCount: this.processedCount,
      aborted: this.abortController.signal.aborted,
      ...(this.config.enableMemoryMonitoring && {
        memoryUsage: this.chromeApi.getMemoryUsage()
      })
    };
  }
}
