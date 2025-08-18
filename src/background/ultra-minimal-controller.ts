/**
 * Ultra-Minimal Service Worker Background Controller
 * 
 * Zero external imports - only Chrome APIs and built-in JavaScript
 */

export class UltraMinimalBackgroundController {
  private isInitialized = false;

  constructor() {
    console.log('🔧 UltraMinimalBackgroundController: Starting...');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ UltraMinimalBackgroundController: Already initialized');
      return;
    }

    try {
      // Test basic Chrome API access with no external dependencies
      if (!chrome || !chrome.runtime) {
        throw new Error('Chrome runtime API not available');
      }

      if (!chrome.tabs) {
        throw new Error('Chrome tabs API not available');
      }

      if (!chrome.storage) {
        throw new Error('Chrome storage API not available');
      }

      console.log('✅ UltraMinimalBackgroundController: All Chrome APIs available');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ UltraMinimalBackgroundController: Initialization failed:', error);
      throw error;
    }
  }

  async handleMessage(message: any): Promise<any> {
    if (!this.isInitialized) {
      return { success: false, error: 'Controller not initialized' };
    }

    console.log('📨 UltraMinimalBackgroundController: Handling:', message.action || message.type);

    switch (message.action || message.type) {
      case 'ping':
        return { success: true, message: 'Ultra-minimal controller active' };

      case 'getCurrentTabId':
        return new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else if (tabs && tabs.length > 0) {
              resolve({ success: true, tabId: tabs[0].id });
            } else {
              resolve({ success: false, error: 'No active tab found' });
            }
          });
        });

      case 'getTabInfo':
        return new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else if (tabs && tabs.length > 0) {
              const activeTab = tabs[0];
              resolve({
                success: true,
                tabs: [{
                  id: activeTab.id,
                  url: activeTab.url,
                  title: activeTab.title,
                  active: activeTab.active
                }]
              });
            } else {
              resolve({ success: true, tabs: [] });
            }
          });
        });

      case 'GET_EXTENSION_STATE':
      case 'GET_GLOBAL_POWER_STATE':  
      case 'GET_SITE_SPECIFIC_STATE':
        return { success: true, enabled: true };

      default:
        return { success: false, error: 'Unknown message type: ' + (message.action || message.type) };
    }
  }

  cleanup(): void {
    console.log('🧹 UltraMinimalBackgroundController: Cleaning up...');
    this.isInitialized = false;
  }
}
