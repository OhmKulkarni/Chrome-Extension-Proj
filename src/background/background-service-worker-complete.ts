/**
 * Service Worker Compatible Background Controller
 *
 * Full-featured modular background script compatible with service worker context
 * All window/DOM dependencies removed while preserving complete functionality
 */

// Import service worker compatible modules
import { ServiceWorkerChromeApiModule } from './shared/service-worker-chrome-api.module';
import { ServiceWorkerStorageModule } from './shared/service-worker-storage.module';
import { MessageRouterModule } from './shared/message-router-simple.module';
import { NetworkProcessorModule } from './modules/network-processor.module';
import { ConsoleHandlerModule } from './modules/console-handler.module';
import { TokenTrackerModule } from './modules/token-tracker.module';
import { ExtensionStateModule } from './modules/extension-state.module';
import { SafetyConfig } from './types/background-types';

export class ServiceWorkerBackgroundController {
  // Module instances (service worker compatible)
  private chromeApi: ServiceWorkerChromeApiModule;
  private storageManager: ServiceWorkerStorageModule;
  private networkProcessor: NetworkProcessorModule;
  private consoleHandler: ConsoleHandlerModule;
  private tokenTracker: TokenTrackerModule;
  private extensionState: ExtensionStateModule;
  private messageRouter: MessageRouterModule;

  // Safety configuration
  private readonly config: SafetyConfig = {
    enableAbortController: true,
    maxRetries: 3,
    timeoutMs: 5000,
    enableRaceConditionProtection: true,
    enableMemoryMonitoring: true
  };

  // Initialization state
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private startTime = Date.now();

  constructor() {
    console.log('🚀 ServiceWorkerBackgroundController: Starting full modular architecture (SW compatible)');

    // Initialize service worker compatible Chrome API module
    this.chromeApi = new ServiceWorkerChromeApiModule();

    // Initialize service worker compatible storage manager
    this.storageManager = new ServiceWorkerStorageModule();

    // Initialize specialized modules (these should be compatible)
    this.tokenTracker = new TokenTrackerModule(this.chromeApi as any, this.storageManager as any, this.config);
    this.networkProcessor = new NetworkProcessorModule(
      this.chromeApi as any,
      this.storageManager as any,
      this.tokenTracker,
      this.config
    );
    this.consoleHandler = new ConsoleHandlerModule(this.chromeApi as any, this.storageManager as any, this.config);
    this.extensionState = new ExtensionStateModule(this.chromeApi as any, this.storageManager as any, this.config);

    // Initialize message router (handles all communication)
    this.messageRouter = new MessageRouterModule(
      this.chromeApi as any,
      this.storageManager as any,
      this.networkProcessor,
      this.consoleHandler,
      this.tokenTracker,
      this.extensionState
    );

    console.log('🔧 ServiceWorkerBackgroundController: All modules instantiated (service worker compatible)');
  }

  /**
   * Initialize all modules in proper dependency order
   */
  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      console.log('⚠️ ServiceWorkerBackgroundController: Already initialized');
      return;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🔧 ServiceWorkerBackgroundController: Beginning module initialization sequence...');

      // Step 1: Initialize Chrome API (foundation)
      await this.chromeApi.initialize();
      console.log('✅ Chrome API module initialized');

      // Step 2: Initialize storage manager
      await this.storageManager.initialize();
      console.log('✅ Storage manager initialized');

      // Step 3: Initialize token tracker
      await this.tokenTracker.initialize();
      console.log('✅ Token tracker initialized');

      // Step 4: Initialize network processor
      await this.networkProcessor.initialize();
      console.log('✅ Network processor initialized');

      // Step 5: Initialize console handler
      await this.consoleHandler.initialize();
      console.log('✅ Console handler initialized');

      // Step 6: Initialize extension state manager
      await this.extensionState.initialize();
      console.log('✅ Extension state manager initialized');

      // Step 7: Initialize message router (connects everything)
      await this.messageRouter.initialize();
      console.log('✅ Message router initialized');

      this.isInitialized = true;
      const initTime = Date.now() - this.startTime;

      console.log(`🎉 ServiceWorkerBackgroundController: Full initialization completed in ${initTime}ms`);
      console.log('📊 All modules operational with comprehensive functionality');

    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Initialization failed:', error);
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Handle messages (delegated to message router)
   */
  async handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // The message router handles all message types
    return new Promise((resolve) => {
      const mockSendResponse = (response: any) => {
        resolve(response);
      };

      // Delegate to the comprehensive message router
      this.messageRouter['handleMessage'](message, sender, mockSendResponse);
    });
  }

  /**
   * Get comprehensive system status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      uptime: Date.now() - this.startTime,
      modules: {
        chromeApi: this.chromeApi ? { initialized: true } : null,
        storageManager: this.storageManager ? { initialized: true } : null,
        networkProcessor: this.networkProcessor?.getStatus ? this.networkProcessor.getStatus() : null,
        consoleHandler: this.consoleHandler?.getStatus ? this.consoleHandler.getStatus() : null,
        tokenTracker: this.tokenTracker?.getStatus ? this.tokenTracker.getStatus() : null,
        extensionState: this.extensionState?.getStatus ? this.extensionState.getStatus() : null,
        messageRouter: this.messageRouter?.getStatus() || null
      }
    };
  }

  /**
   * Cleanup all modules
   */
  cleanup(): void {
    console.log('🧹 ServiceWorkerBackgroundController: Starting comprehensive cleanup...');

    try {
      // Cleanup in reverse dependency order
      this.messageRouter?.cleanup();
      this.extensionState?.cleanup();
      this.consoleHandler?.cleanup();
      this.networkProcessor?.cleanup();
      this.tokenTracker?.cleanup();
      this.storageManager?.cleanup();
      this.chromeApi?.cleanup();

      this.isInitialized = false;
      this.initializationPromise = null;

      console.log('✅ ServiceWorkerBackgroundController: Cleanup completed successfully');
    } catch (error) {
      console.error('❌ ServiceWorkerBackgroundController: Cleanup error:', error);
    }
  }
}

// ===== SERVICE WORKER STARTUP SEQUENCE =====

console.log('🚀 Service worker starting with full modular architecture');

// Service worker compatible error handlers (no window references)
self.addEventListener('error', (event) => {
  console.error('🚨 ServiceWorkerBackgroundController: Unhandled error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 ServiceWorkerBackgroundController: Unhandled promise rejection:', event.reason);
});

// Create and initialize the service worker background controller
const serviceWorkerController = new ServiceWorkerBackgroundController();

// Initialize with comprehensive error handling
serviceWorkerController.initialize().then(() => {
  console.log('✅ Service worker fully operational with complete modular architecture');
}).catch((error) => {
  console.error('❌ Service worker initialization failed:', error);

  // Attempt recovery after delay
  setTimeout(() => {
    console.log('🔄 Attempting service worker recovery...');
    serviceWorkerController.initialize().catch((retryError) => {
      console.error('❌ Service worker recovery failed:', retryError);
    });
  }, 5000);
});

// Service worker shutdown handler
self.addEventListener('beforeunload', () => {
  console.log('🧹 Service worker shutting down...');
  serviceWorkerController.cleanup();
});

// Export for debugging (available in Chrome DevTools)
(globalThis as any).serviceWorkerController = serviceWorkerController;

console.log('🔧 Service worker modular architecture loaded and initializing...');
