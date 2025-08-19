/**
 * Service Worker Compatible Storage Manager Module
 *
 * Minimal version without DOM/window dependencies for service worker context
 */

export class ServiceWorkerStorageModule {
  private isInitialized = false;

  constructor() {
    console.log('🔧 ServiceWorkerStorageModule: Initialized');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ServiceWorkerStorageModule: Already initialized');
      return;
    }

    try {
      // Test basic Chrome storage API access
      if (!chrome || !chrome.storage) {
        throw new Error('Chrome storage API not available');
      }

      console.log('✅ ServiceWorkerStorageModule: Chrome storage APIs available');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ ServiceWorkerStorageModule: Initialization failed:', error);
      throw error;
    }
  }

  async getData<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error('ServiceWorkerStorageModule not initialized');
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key] || null);
        }
      });
    });
  }

  async setData<T>(key: string, value: T): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ServiceWorkerStorageModule not initialized');
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  cleanup(): void {
    console.log('🧹 ServiceWorkerStorageModule: Cleaning up...');
    this.isInitialized = false;
  }
}
