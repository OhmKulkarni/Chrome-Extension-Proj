/**
 * Service Worker Compatible Background Controller
 * 
 * Minimal version using only service worker compatible modules
 */

import { ServiceWorkerChromeApiModule } from './shared/service-worker-chrome-api.module';
import { ServiceWorkerStorageModule } from './shared/service-worker-storage.module';

export class ServiceWorkerBackgroundController {
  private chromeApi: ServiceWorkerChromeApiModule;
  private storage: ServiceWorkerStorageModule;
  private isInitialized = false;

  constructor() {
    console.log('🔧 ServiceWorkerBackgroundController: Starting initialization...');
    
    this.chromeApi = new ServiceWorkerChromeApiModule();
    this.storage = new ServiceWorkerStorageModule();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ServiceWorkerBackgroundController: Already initialized');
      return;
    }

    try {
      console.log('🔧 ServiceWorkerBackgroundController: Initializing modules...');
      
      // Initialize core modules
      await this.chromeApi.initialize();
      await this.storage.initialize();
      
      console.log('✅ ServiceWorkerBackgroundController: All modules initialized');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async handleMessage(message: any, _sender: chrome.runtime.MessageSender): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('ServiceWorkerBackgroundController not initialized');
    }

    console.log('📨 ServiceWorkerBackgroundController: Handling message:', message.action || message.type);

    switch (message.action || message.type) {
      case 'GET_EXTENSION_STATE':
        // Basic extension state - always enabled for now
        return { success: true, enabled: true };

      case 'GET_GLOBAL_POWER_STATE':
        // Global power state - always enabled for now
        return { success: true, enabled: true };

      case 'GET_SITE_SPECIFIC_STATE':
        // Site-specific state - always enabled for now  
        return { success: true, enabled: true };

      case 'getCurrentTabId':
        const tabs = await this.chromeApi.queryTabs({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          return { success: true, tabId: tabs[0].id };
        } else {
          return { success: false, error: 'No active tab found' };
        }

      case 'getTabInfo':
        const allTabs = await this.chromeApi.queryTabs({ active: true, currentWindow: true });
        if (allTabs.length > 0) {
          const activeTab = allTabs[0];
          return {
            success: true,
            tabs: [{
              id: activeTab.id,
              url: activeTab.url,
              title: activeTab.title,
              active: activeTab.active
            }]
          };
        } else {
          return { success: true, tabs: [] };
        }

      default:
        console.log('❓ ServiceWorkerBackgroundController: Unknown message type:', message.action || message.type);
        return { success: false, error: 'Unknown message type' };
    }
  }

  cleanup(): void {
    console.log('🧹 ServiceWorkerBackgroundController: Cleaning up...');
    this.chromeApi.cleanup();
    this.storage.cleanup();
    this.isInitialized = false;
  }
}
