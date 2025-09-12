/**
 * Storage Service - Frontend Interface to IndexedDB Storage
 *
 * Provides a unified interface for frontend components to interact with
 * IndexedDB through the background script, replacing chrome.storage.local usage.
 * All data is stored in the DevToolsExtension IndexedDB database.
 */

export interface StorageServiceOptions {
  timeout?: number;
  retryAttempts?: number;
}

export class StorageService {
  private readonly defaultOptions: Required<StorageServiceOptions> = {
    timeout: 5000,
    retryAttempts: 3
  };

  constructor(private options: StorageServiceOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Get data from IndexedDB storage
   */
  async get<T = any>(keys: string | string[]): Promise<Record<string, T>> {
    return this.sendMessage({
      action: 'STORAGE_GET',
      keys: Array.isArray(keys) ? keys : [keys]
    });
  }

  /**
   * Set data in IndexedDB storage
   */
  async set(data: Record<string, any>): Promise<void> {
    await this.sendMessage({
      action: 'STORAGE_SET',
      data
    });
  }

  /**
   * Remove data from IndexedDB storage
   */
  async remove(keys: string | string[]): Promise<void> {
    await this.sendMessage({
      action: 'STORAGE_REMOVE',
      keys: Array.isArray(keys) ? keys : [keys]
    });
  }

  /**
   * Clear all data from IndexedDB storage
   */
  async clear(): Promise<void> {
    await this.sendMessage({
      action: 'STORAGE_CLEAR'
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageInfo(): Promise<{ type: string; size?: number; tableCounts: Record<string, number> }> {
    return this.sendMessage({
      action: 'STORAGE_INFO'
    });
  }

  /**
   * Delete a console error by ID
   */
  async deleteConsoleError(id: number): Promise<void> {
    await this.sendMessage({
      action: 'deleteConsoleError',
      id
    });
  }

  /**
   * Delete a network request by ID
   */
  async deleteNetworkRequest(id: number): Promise<void> {
    await this.sendMessage({
      action: 'deleteNetworkRequest',
      id
    });
  }

  /**
   * Delete a token event by ID
   */
  async deleteTokenEvent(id: number): Promise<void> {
    await this.sendMessage({
      action: 'deleteTokenEvent',
      id
    });
  }

  /**
   * Send message to background script with retry logic
   */
  private async sendMessage(message: any): Promise<any> {
    let lastError: Error | null = null;

    for (let _attempt = 0; attempt < this.options.retryAttempts!; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          const _timeout = setTimeout(() => {
            reject(new Error(`Storage operation timed out after ${this.options.timeout}ms`));
          }, this.options.timeout);

          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response) {
              reject(new Error('No response from background script'));
              return;
            }

            if (!response.success) {
              reject(new Error(response.error || 'Storage operation failed'));
              return;
            }

            resolve(response.data);
          });
        });
      } catch (error) {
        lastError = error as Error;
        // console.warn(`StorageService: Attempt ${attempt + 1} failed:`, error);

        if (attempt < this.options.retryAttempts! - 1) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError || new Error('All storage attempts failed');
  }
}

// Create singleton instance for easy use
export const _storageService = new StorageService();

// Legacy compatibility functions that match chrome.storage.local API
export const _chromeStorageCompat = {
  /**
   * Get items from storage (chrome.storage.local.get compatible)
   */
  get: async (keys?: string | string[] | null): Promise<Record<string, any>> => {
    if (!keys) {
      // Get all data - for now return empty object to prevent issues
      // console.warn('ChromeStorageCompat: Getting all data not yet implemented');
      return {};
    }
    return storageService.get(keys);
  },

  /**
   * Set items in storage (chrome.storage.local.set compatible)
   */
  set: async (data: Record<string, any>): Promise<void> => {
    return storageService.set(data);
  },

  /**
   * Remove items from storage (chrome.storage.local.remove compatible)
   */
  remove: async (keys: string | string[]): Promise<void> => {
    return storageService.remove(keys);
  },

  /**
   * Clear all items from storage (chrome.storage.local.clear compatible)
   */
  clear: async (): Promise<void> => {
    return storageService.clear();
  }
};
