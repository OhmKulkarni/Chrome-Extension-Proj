/**
 * Chrome API Module - Centralized Chrome Extension API Wrapper
 *
 * Provides centralized access to Chrome extension APIs with comprehensive error handling,
 * retry logic, and memory leak prevention. Extracted from original background script
 * to eliminate the 64+ scattered Chrome API calls.
 */

import { ChromeTabInfo, SafetyConfig } from '../types/background-types';

export class ChromeApiModule {
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private retryCount = 0;

  constructor(config: Partial<SafetyConfig> = {}) {
    this.config = {
      enableAbortController: true,
      maxRetries: 3,
      timeoutMs: 5000,
      enableRaceConditionProtection: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.abortController = new AbortController();
    // console.log('🔧 ChromeApiModule: Initialized with safety config');
  }

  /**
   * Initialize the Chrome API module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      // console.warn('ChromeApiModule: Already initialized');
      return;
    }

    try {
      // Verify Chrome extension context
      if (!chrome?.runtime?.id) {
        throw new Error('Chrome extension context not available');
      }

      this.isInitialized = true;
      // console.log('✅ ChromeApiModule: Successfully initialized');
    } catch (error) {
      console.error('❌ ChromeApiModule: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup(): void {
    if (this.config.enableAbortController) {
      this.abortController.abort('ChromeApiModule cleanup');
    }
    this.isInitialized = false;
    // console.log('🧹 ChromeApiModule: Cleanup completed');
  }

  // ===== STORAGE API WRAPPERS =====

  /**
   * Get data from Chrome local storage with error handling
   */
  async getFromStorage(keys: string | string[] | null = null): Promise<any> {
    return this.executeWithSafety('storage.local.get', async () => {
      const _result = await chrome.storage.local.get(keys);

      if (chrome.runtime.lastError) {
        throw new Error(`Storage get error: ${chrome.runtime.lastError.message}`);
      }

      return result;
    });
  }

  /**
   * Set data in Chrome local storage with error handling
   */
  async setInStorage(items: { [key: string]: any }): Promise<void> {
    return this.executeWithSafety('storage.local.set', async () => {
      await chrome.storage.local.set(items);

      if (chrome.runtime.lastError) {
        throw new Error(`Storage set error: ${chrome.runtime.lastError.message}`);
      }
    });
  }

  /**
   * Remove data from Chrome local storage with error handling
   */
  async removeFromStorage(keys: string | string[]): Promise<void> {
    return this.executeWithSafety('storage.local.remove', async () => {
      await chrome.storage.local.remove(keys);

      if (chrome.runtime.lastError) {
        throw new Error(`Storage remove error: ${chrome.runtime.lastError.message}`);
      }
    });
  }

  /**
   * Clear all data from Chrome local storage with error handling
   */
  async clearStorage(): Promise<void> {
    return this.executeWithSafety('storage.local.clear', async () => {
      await chrome.storage.local.clear();

      if (chrome.runtime.lastError) {
        throw new Error(`Storage clear error: ${chrome.runtime.lastError.message}`);
      }
    });
  }

  // ===== TAB API WRAPPERS =====

  /**
   * Query tabs with error handling and filtering
   */
  async queryTabs(queryInfo: chrome.tabs.QueryInfo = {}): Promise<ChromeTabInfo[]> {
    return this.executeWithSafety('tabs.query', async () => {
      const _tabs = await chrome.tabs.query(queryInfo);

      if (chrome.runtime.lastError) {
        throw new Error(`Tab query error: ${chrome.runtime.lastError.message}`);
      }

      // Filter out Chrome internal tabs
      return tabs
        .filter(tab =>
          tab.id && tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://')
        )
        .map(tab => ({
          id: tab.id,
          url: tab.url,
          title: tab.title,
          active: tab.active
        }));
    });
  }

  /**
   * Get current active tab
   */
  async getCurrentTab(): Promise<ChromeTabInfo | null> {
    const _tabs = await this.queryTabs({ active: true, currentWindow: true });
    return tabs.length > 0 ? tabs[0] : null;
  }

  /**
   * Send message to a specific tab
   */
  async sendMessageToTab(tabId: number, message: any): Promise<any> {
    return this.executeWithSafety('tabs.sendMessage', async () => {
      try {
        const _response = await chrome.tabs.sendMessage(tabId, message);

        if (chrome.runtime.lastError) {
          const _errorMessage = chrome.runtime.lastError.message;

          // Handle specific connection errors gracefully
          if (errorMessage?.includes('Could not establish connection')) {
            // This is expected when content scripts are not loaded or tabs are inactive
            // console.debug(`ChromeApiModule: No content script available for tab ${tabId}`);
            return null;
          }

          throw new Error(`Tab message error: ${errorMessage}`);
        }

        return response;
      } catch (error) {
        // Check if it's a connection error
        if (error instanceof Error && error.message.includes('Could not establish connection')) {
          // console.debug(`ChromeApiModule: No content script available for tab ${tabId}`);
          return null;
        }
        throw error;
      }
    });
  }

  // ===== RUNTIME API WRAPPERS =====

  /**
   * Send message within extension
   */
  async sendRuntimeMessage(message: any): Promise<any> {
    return this.executeWithSafety('runtime.sendMessage', async () => {
      const _response = await chrome.runtime.sendMessage(message);

      if (chrome.runtime.lastError) {
        throw new Error(`Runtime message error: ${chrome.runtime.lastError.message}`);
      }

      return response;
    });
  }

  /**
   * Get extension manifest
   */
  getManifest(): chrome.runtime.Manifest {
    try {
      return chrome.runtime.getManifest();
    } catch (error) {
      console.error('ChromeApiModule: Failed to get manifest:', error);
      throw error;
    }
  }

  // ===== SCRIPTING API WRAPPERS =====

  /**
   * Execute script in tab with error handling
   */
  async executeScript(tabId: number, options: chrome.scripting.ScriptInjection<any[], any>): Promise<any> {
    return this.executeWithSafety('scripting.executeScript', async () => {
      const _result = await chrome.scripting.executeScript({
        ...options,
        target: { tabId }
      });

      if (chrome.runtime.lastError) {
        throw new Error(`Script execution error: ${chrome.runtime.lastError.message}`);
      }

      return result;
    });
  }

  // ===== MEMORY MONITORING =====

  /**
   * Get memory usage information
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number; percentage: number } {
    if (!this.config.enableMemoryMonitoring) {
      return { heapUsed: 0, heapTotal: 0, percentage: 0 };
    }

    try {
      if ('memory' in performance) {
        const _memory = (performance as any).memory;
        const _heapUsed = memory.usedJSHeapSize || 0;
        const _heapTotal = memory.jsHeapSizeLimit || 1;
        const _percentage = (heapUsed / heapTotal) * 100;

        return {
          heapUsed,
          heapTotal,
          percentage
        };
      }
    } catch (error) {
      // console.warn('ChromeApiModule: Memory monitoring failed:', error);
    }

    return { heapUsed: 0, heapTotal: 0, percentage: 0 };
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute function with comprehensive safety measures
   */
  private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`ChromeApiModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`ChromeApiModule: Operation aborted (${operation})`);
    }

    const _startTime = Date.now();
    let lastError: Error | null = null;

    for (let _attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Race condition protection
        if (this.config.enableRaceConditionProtection && attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }

        // Timeout protection
        const _timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timeout: ${operation}`)), this.config.timeoutMs);
        });

        const _result = await Promise.race([fn(), timeoutPromise]);

        // Log successful execution
        const _duration = Date.now() - startTime;
        if (attempt > 0) {
          // console.log(`✅ ChromeApiModule: ${operation} succeeded on retry ${attempt} (${duration}ms)`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ ChromeApiModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        // console.warn(`⚠️ ChromeApiModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`ChromeApiModule: Unknown error in ${operation}`);
  }

  /**
   * Check if Chrome extension context is valid
   */
  isExtensionContextValid(): boolean {
    try {
      return !!(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  /**
   * Get module status for debugging
   */
  getStatus(): {
    initialized: boolean;
    contextValid: boolean;
    retryCount: number;
    aborted: boolean;
    memoryUsage: any;
  } {
    return {
      initialized: this.isInitialized,
      contextValid: this.isExtensionContextValid(),
      retryCount: this.retryCount,
      aborted: this.abortController.signal.aborted,
      memoryUsage: this.getMemoryUsage()
    };
  }
}
