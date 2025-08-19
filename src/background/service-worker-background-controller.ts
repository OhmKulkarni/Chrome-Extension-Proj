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

      case 'openDashboard':
        // Handle dashboard opening requests
        const dashboardTab = await this.chromeApi.createTab({
          url: chrome.runtime.getURL('src/dashboard/dashboard.html')
        });
        return { success: true, tabId: dashboardTab.id };

      case 'GET_NETWORK_REQUESTS':
        // Return stored network requests (empty for now, but will be populated by data collection)
        const networkRequests = await this.storage.getData<any[]>('networkRequests') || [];
        return { success: true, requests: networkRequests };

      case 'GET_CONSOLE_ERRORS':
        // Return stored console errors (empty for now, but will be populated by data collection)
        const consoleErrors = await this.storage.getData<any[]>('consoleErrors') || [];
        return { success: true, errors: consoleErrors };

      case 'GET_TOKEN_EVENTS':
        // Return stored token events (empty for now, but will be populated by data collection)
        const tokenEvents = await this.storage.getData<any[]>('tokenEvents') || [];
        return { success: true, events: tokenEvents };

      case 'GET_ANALYSIS_DATA':
        // Return comprehensive analysis data for dashboard
        const networkData = await this.storage.getData<any[]>('networkRequests') || [];
        const errorData = await this.storage.getData<any[]>('consoleErrors') || [];
        const tokenData = await this.storage.getData<any[]>('tokenEvents') || [];

        return {
          success: true,
          networkRequests: networkData,
          consoleErrors: errorData,
          tokenEvents: tokenData,
          totalRequests: networkData.length,
          totalErrors: errorData.length,
          totalTokenEvents: tokenData.length
        };

      case 'STORE_NETWORK_REQUEST':
        // Store network request data
        try {
          const existingRequests = await this.storage.getData<any[]>('networkRequests') || [];
          existingRequests.push({
            ...message.data,
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
          });

          // Keep only last 1000 requests to prevent memory issues
          const trimmedRequests = existingRequests.slice(-1000);
          await this.storage.setData('networkRequests', trimmedRequests);

          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }

      case 'STORE_CONSOLE_ERROR':
        // Store console error data
        try {
          const existingErrors = await this.storage.getData<any[]>('consoleErrors') || [];
          existingErrors.push({
            ...message.data,
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
          });

          // Keep only last 500 errors to prevent memory issues
          const trimmedErrors = existingErrors.slice(-500);
          await this.storage.setData('consoleErrors', trimmedErrors);

          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }

      case 'STORE_TOKEN_EVENT':
        // Store token event data
        try {
          const existingTokens = await this.storage.getData<any[]>('tokenEvents') || [];
          existingTokens.push({
            ...message.data,
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
          });

          // Keep only last 200 token events to prevent memory issues
          const trimmedTokens = existingTokens.slice(-200);
          await this.storage.setData('tokenEvents', trimmedTokens);

          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }

      case 'CLEAR_DATA':
        // Clear stored data based on type
        try {
          const dataType = message.dataType;
          if (dataType === 'all') {
            await this.storage.setData('networkRequests', []);
            await this.storage.setData('consoleErrors', []);
            await this.storage.setData('tokenEvents', []);
          } else if (dataType === 'network') {
            await this.storage.setData('networkRequests', []);
          } else if (dataType === 'errors') {
            await this.storage.setData('consoleErrors', []);
          } else if (dataType === 'tokens') {
            await this.storage.setData('tokenEvents', []);
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }

      case 'GET_EXTENSION_SETTINGS':
        // Return extension settings
        const settings = await this.storage.getData<any>('extensionSettings') || {
          networkLogging: true,
          consoleLogging: true,
          tokenTracking: true,
          maxBodySize: 2000
        };
        return { success: true, settings };

      case 'UPDATE_EXTENSION_SETTINGS':
        // Update extension settings
        try {
          await this.storage.setData('extensionSettings', message.settings);
          return { success: true };
        } catch (error) {
          return { success: false, error: (error as Error).message };
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

  // Data collection methods for content script integration

  async collectNetworkRequest(requestData: any): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const existingRequests = await this.storage.getData<any[]>('networkRequests') || [];
      existingRequests.push({
        ...requestData,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      });

      // Keep only last 1000 requests
      const trimmedRequests = existingRequests.slice(-1000);
      await this.storage.setData('networkRequests', trimmedRequests);

      console.log('📡 ServiceWorkerBackgroundController: Network request stored');
    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Failed to store network request:', error);
    }
  }

  async collectConsoleError(errorData: any): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const existingErrors = await this.storage.getData<any[]>('consoleErrors') || [];
      existingErrors.push({
        ...errorData,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      });

      // Keep only last 500 errors
      const trimmedErrors = existingErrors.slice(-500);
      await this.storage.setData('consoleErrors', trimmedErrors);

      console.log('🔍 ServiceWorkerBackgroundController: Console error stored');
    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Failed to store console error:', error);
    }
  }

  async collectTokenEvent(tokenData: any): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const existingTokens = await this.storage.getData<any[]>('tokenEvents') || [];
      existingTokens.push({
        ...tokenData,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      });

      // Keep only last 200 token events
      const trimmedTokens = existingTokens.slice(-200);
      await this.storage.setData('tokenEvents', trimmedTokens);

      console.log('🔑 ServiceWorkerBackgroundController: Token event stored');
    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Failed to store token event:', error);
    }
  }

  // Statistics and monitoring methods

  async getStatistics(): Promise<any> {
    if (!this.isInitialized) return null;

    try {
      const networkRequests = await this.storage.getData<any[]>('networkRequests') || [];
      const consoleErrors = await this.storage.getData<any[]>('consoleErrors') || [];
      const tokenEvents = await this.storage.getData<any[]>('tokenEvents') || [];

      return {
        networkRequests: networkRequests.length,
        consoleErrors: consoleErrors.length,
        tokenEvents: tokenEvents.length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Failed to get statistics:', error);
      return null;
    }
  }
}
