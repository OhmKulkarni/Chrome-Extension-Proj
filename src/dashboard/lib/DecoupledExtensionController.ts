// lib/DecoupledExtensionController.ts - Main orchestration layer
import {
  InterceptionEventBus,
  NetworkInterceptionManager,
  ConsoleErrorManager
} from './InterceptionManager';

import {
  UnifiedStorageManager
} from './StorageManager';

import {
  DashboardUpdateManager
} from './DashboardUpdateManager';

// Main Extension Controller - Orchestrates all decoupled systems
export class DecoupledExtensionController {
  private interceptionBus: InterceptionEventBus;
  private storageManager: UnifiedStorageManager;
  private dashboardManager: DashboardUpdateManager;

  private networkManager: NetworkInterceptionManager;
  private consoleManager: ConsoleErrorManager;

  private isInitialized: boolean = false;
  private cleanupFunctions: Array<() => void> = [];

  constructor() {
    // Initialize event bus
    this.interceptionBus = new InterceptionEventBus();

    // Initialize storage
    this.storageManager = new UnifiedStorageManager();

    // Initialize dashboard manager
    this.dashboardManager = new DashboardUpdateManager(this.interceptionBus, this.storageManager);

    // Initialize interception managers
    this.networkManager = new NetworkInterceptionManager(this.interceptionBus);
    this.consoleManager = new ConsoleErrorManager(this.interceptionBus);
    // Token detection now handled by background TokenTrackerModule via messaging
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('DecoupledExtensionController already initialized');
      return;
    }

    console.log('🚀 DecoupledExtensionController: Initializing...');

    try {
      // Set up the storage pipeline
      this.setupStoragePipeline();

      // Start interception managers (token detection handled by background)
      await Promise.all([
        this.networkManager.start(),
        this.consoleManager.start()
      ]);

      // Set up background message listener for token events
      this.setupBackgroundMessageListener();

      this.isInitialized = true;
      console.log('✅ DecoupledExtensionController: Initialization complete');

    } catch (error) {
      console.error('❌ DecoupledExtensionController: Initialization failed:', error);
      throw error;
    }
  }

  private setupStoragePipeline(): void {
    // Network requests: Interception → Storage
    const unsubscribeNetworkStorage = this.interceptionBus.subscribe(
      'network_request_captured',
      async (eventData: any) => {
        try {
          await this.storageManager.network.store(eventData.request);
        } catch (error) {
          console.error('Failed to store network request:', error);
        }
      }
    );
    this.cleanupFunctions.push(unsubscribeNetworkStorage);

    // Console errors: Interception → Storage
    const unsubscribeErrorStorage = this.interceptionBus.subscribe(
      'console_error_captured',
      async (eventData: any) => {
        try {
          await this.storageManager.errors.store(eventData.error);
        } catch (error) {
          console.error('Failed to store console error:', error);
        }
      }
    );
    this.cleanupFunctions.push(unsubscribeErrorStorage);

    // Token events: Detection → Storage
    const unsubscribeTokenStorage = this.interceptionBus.subscribe(
      'token_event_detected',
      async (eventData: any) => {
        try {
          await this.storageManager.tokens.store(eventData.token);
        } catch (error) {
          console.error('Failed to store token event:', error);
        }
      }
    );
    this.cleanupFunctions.push(unsubscribeTokenStorage);
  }

  private setupBackgroundMessageListener(): void {
    // Listen for token events from background service worker
    const messageListener = (message: any, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'TOKEN_EVENT' && message.data) {
        // Emit token event to dashboard system
        this.interceptionBus.emit('token_event_detected', {
          token: message.data,
          sender,
          tabId: sender.tab?.id
        });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Add cleanup function
    this.cleanupFunctions.push(() => {
      chrome.runtime.onMessage.removeListener(messageListener);
    });
  }

  // Dashboard API - Returns managers for dashboard components
  public getDashboardAPI() {
    return {
      // Subscribe to dashboard updates
      subscribeToDashboardUpdates: (callback: any) => {
        return this.dashboardManager.subscribe(callback);
      },

      // Get current dashboard state
      getCurrentState: () => {
        return this.dashboardManager.getCurrentState();
      },

      // Refresh specific page data
      refreshPage: async (page: number, limit: number, type: 'network' | 'errors' | 'tokens') => {
        return this.dashboardManager.refreshPage(page, limit, type);
      },

      // Clear all data
      clearAllData: async () => {
        return this.dashboardManager.clearAllData();
      },

      // Direct storage access for complex queries
      storage: {
        network: this.storageManager.network,
        errors: this.storageManager.errors,
        tokens: this.storageManager.tokens
      }
    };
  }

  // Settings API - Handles configuration changes
  public getSettingsAPI() {
    return {
      // Extension state management
      setExtensionEnabled: async (enabled: boolean) => {
        // This would interact with background script settings
        await this.sendChromeMessage({
          action: 'setExtensionEnabled',
          enabled
        });
      },

      // Tab-specific logging controls
      setTabLogging: async (tabId: number, type: 'network' | 'errors' | 'tokens', enabled: boolean) => {
        await this.sendChromeMessage({
          action: 'setTabLogging',
          tabId,
          type,
          enabled
        });
      },

      // Get current settings
      getSettings: async () => {
        return this.sendChromeMessage({
          action: 'getSettings'
        });
      }
    };
  }

  private async sendChromeMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  // Health check for all systems
  public async healthCheck(): Promise<{
    network: boolean;
    console: boolean;
    token: boolean;
    storage: boolean;
    dashboard: boolean
  }> {
    try {
      // Test storage
      const storageTest = await this.storageManager.network.getPage(1, 1);

      return {
        network: true, // Network manager is running if no errors
        console: true, // Console manager is running if no errors
        token: true,   // Token manager is running if no errors
        storage: storageTest !== null,
        dashboard: this.dashboardManager.getCurrentState() !== null
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        network: false,
        console: false,
        token: false,
        storage: false,
        dashboard: false
      };
    }
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    console.log('🛑 DecoupledExtensionController: Shutting down...');

    try {
      // Stop interception managers (token detection handled by background)
      this.networkManager.stop();
      this.consoleManager.stop();

      // Clean up event listeners
      this.cleanupFunctions.forEach(cleanup => cleanup());
      this.cleanupFunctions = [];

      // Clear event buses
      this.interceptionBus.clear();

      // Destroy dashboard manager
      this.dashboardManager.destroy();

      this.isInitialized = false;
      console.log('✅ DecoupledExtensionController: Shutdown complete');

    } catch (error) {
      console.error('❌ DecoupledExtensionController: Shutdown error:', error);
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance for global access
let controllerInstance: DecoupledExtensionController | null = null;

export function getExtensionController(): DecoupledExtensionController {
  if (!controllerInstance) {
    controllerInstance = new DecoupledExtensionController();
  }
  return controllerInstance;
}

export async function initializeExtensionController(): Promise<DecoupledExtensionController> {
  const controller = getExtensionController();
  await controller.initialize();
  return controller;
}
