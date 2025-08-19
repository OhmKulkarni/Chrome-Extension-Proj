/**
 * Service Worker Compatible Chrome API Module
 *
 * Minimal version without DOM/window dependencies for service worker context
 */

export class ServiceWorkerChromeApiModule {
  private isInitialized = false;

  constructor() {
    console.log('🔧 ServiceWorkerChromeApiModule: Initialized');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ServiceWorkerChromeApiModule: Already initialized');
      return;
    }

    try {
      // Test basic Chrome API access
      if (!chrome || !chrome.runtime) {
        throw new Error('Chrome runtime API not available');
      }

      console.log('✅ ServiceWorkerChromeApiModule: Chrome APIs available');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ ServiceWorkerChromeApiModule: Initialization failed:', error);
      throw error;
    }
  }

  async queryTabs(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    if (!this.isInitialized) {
      throw new Error('ServiceWorkerChromeApiModule not initialized');
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tabs);
        }
      });
    });
  }

  async createTab(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
    if (!this.isInitialized) {
      throw new Error('ServiceWorkerChromeApiModule not initialized');
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.create(createProperties, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab!);
        }
      });
    });
  }

  cleanup(): void {
    console.log('🧹 ServiceWorkerChromeApiModule: Cleaning up...');
    this.isInitialized = false;
  }
}
