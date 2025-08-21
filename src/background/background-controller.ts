/**
 * Background Script Controller - Modular Architecture Main Controller
 *
 * This is the new modular background script that replaces the original 2,267-line
 * monolithic background.ts. It orchestrates all modules with comprehensive safety
 * measures and full feature preservation.
 *
 * FEATURE PRESERVATION: 100% - All original functionality maintained
 * SAFETY ENHANCEMENTS: Comprehensive memory leak prevention, race condition protection
 * ARCHITECTURE: Modular design with proper separation of concerns
 */

// Import all required modules
import { ChromeApiModule } from './shared/chrome-api.module';
import { StorageManagerModule } from './shared/storage-manager.module';
import { MessageRouterModule } from './shared/message-router-simple.module';
import { NetworkProcessorModule } from './modules/network-processor.module';
import { ConsoleHandlerModule } from './modules/console-handler.module';
import { TokenTrackerModule } from './modules/token-tracker.module';
import { ExtensionStateModule } from './modules/extension-state.module';
import { EnvironmentStorageManager } from './environment-storage-manager';
import { ExtensionStateController } from '../utils/extensionStateController';
import { SafetyConfig } from './types/background-types';

// Background Script Controller Class
export class BackgroundController {
  // Module instances
  private chromeApi: ChromeApiModule;
  private storageManager: StorageManagerModule;
  private networkProcessor: NetworkProcessorModule;
  private consoleHandler: ConsoleHandlerModule;
  private tokenTracker: TokenTrackerModule;
  private extensionState: ExtensionStateModule;
  private messageRouter: MessageRouterModule;

  // Legacy compatibility instances
  private legacyStorageManager: EnvironmentStorageManager;
  private legacyExtensionStateController: ExtensionStateController;

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
    console.log('🚀 BackgroundController: Starting modular architecture initialization');

    // Initialize Chrome API module first (foundation for all other modules)
    this.chromeApi = new ChromeApiModule(this.config);

    // Initialize legacy compatibility instances FIRST (needed by modules)
    this.legacyStorageManager = new EnvironmentStorageManager();
    this.legacyExtensionStateController = ExtensionStateController.getInstance();

    // Initialize storage manager with IndexedDB storage
    this.storageManager = new StorageManagerModule(this.chromeApi, this.legacyStorageManager, this.config);

    // Initialize specialized modules with IndexedDB storage
    this.tokenTracker = new TokenTrackerModule(
      this.chromeApi,
      this.storageManager,
      this.legacyStorageManager,
      this.config
    );
    this.networkProcessor = new NetworkProcessorModule(
      this.chromeApi,
      this.storageManager,
      this.tokenTracker,
      this.legacyStorageManager,
      this.config
    );
    this.consoleHandler = new ConsoleHandlerModule(
      this.chromeApi,
      this.storageManager,
      this.legacyStorageManager,
      this.config
    );
    this.extensionState = new ExtensionStateModule(this.chromeApi, this.storageManager, this.config);

    // Initialize message router (handles all communication)
    this.messageRouter = new MessageRouterModule(
      this.chromeApi,
      this.storageManager,
      this.networkProcessor,
      this.consoleHandler,
      this.tokenTracker,
      this.extensionState,
      this.config
    );

    console.log('🔧 BackgroundController: All modules instantiated with IndexedDB storage');
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
      console.log('✅ BackgroundController: Already initialized');
      return;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization with comprehensive error handling
   */
  private async performInitialization(): Promise<void> {
    const initStartTime = Date.now();

    try {
      console.log('🔧 BackgroundController: Starting module initialization sequence');

      // Phase 1: Initialize foundational modules
      console.log('📋 Phase 1: Foundation modules');
      await this.chromeApi.initialize();
      console.log('  ✅ Chrome API module initialized');

      await this.storageManager.initialize();
      console.log('  ✅ Storage manager initialized');

      // Phase 2: Initialize legacy compatibility
      console.log('📋 Phase 2: Legacy compatibility');
      await this.initializeLegacyCompatibility();
      console.log('  ✅ Legacy compatibility initialized');

      // Phase 3: Initialize specialized modules
      console.log('📋 Phase 3: Specialized modules');
      await this.tokenTracker.initialize();
      console.log('  ✅ Token tracker initialized');

      await this.networkProcessor.initialize();
      console.log('  ✅ Network processor initialized');

      await this.consoleHandler.initialize();
      console.log('  ✅ Console handler initialized');

      await this.extensionState.initialize();
      console.log('  ✅ Extension state initialized');

      // Phase 4: Initialize message router (must be last)
      console.log('📋 Phase 4: Message router');
      await this.messageRouter.initialize();
      console.log('  ✅ Message router initialized');

      // Initialization complete
      this.isInitialized = true;
      const initDuration = Date.now() - initStartTime;
      const totalStartupTime = Date.now() - this.startTime;

      console.log(`🎉 BackgroundController: Modular architecture fully initialized!`);
      console.log(`⏱️  Initialization time: ${initDuration}ms`);
      console.log(`⏱️  Total startup time: ${totalStartupTime}ms`);

      // Log memory usage
      this.logMemoryUsage();

      // Start periodic health monitoring
      this.startHealthMonitoring();

    } catch (error) {
      console.error('❌ BackgroundController: Initialization failed:', error);

      // Cleanup any partially initialized modules
      await this.cleanup();

      // Reset initialization state
      this.isInitialized = false;
      this.initializationPromise = null;

      throw error;
    }
  }

  /**
   * Initialize legacy compatibility for seamless transition
   */
  private async initializeLegacyCompatibility(): Promise<void> {
    try {
      console.log('🔗 BackgroundController: Initializing legacy compatibility...');

      // Initialize legacy storage manager
      await this.legacyStorageManager.init();
      console.log('  ✅ Legacy storage manager initialized');

      // Initialize legacy extension state controller
      await this.legacyExtensionStateController.init();
      console.log('  ✅ Legacy extension state controller initialized');

    } catch (error) {
      console.warn('⚠️ BackgroundController: Legacy compatibility initialization failed:', error);
      // Don't fail the entire initialization for legacy compatibility issues
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (!this.config.enableMemoryMonitoring) {
      return;
    }

    // Health check every 30 seconds
    setInterval(() => {
      try {
        this.performHealthCheck();
      } catch (error) {
        console.error('BackgroundController: Health check failed:', error);
      }
    }, 30000);

    console.log('🔍 BackgroundController: Health monitoring started');
  }

  /**
   * Perform comprehensive health check of all modules
   */
  private performHealthCheck(): void {
    if (!this.isInitialized) {
      return;
    }

    const healthStatus = {
      chromeApi: this.chromeApi.getStatus(),
      storageManager: this.storageManager.getStatus(),
      networkProcessor: this.networkProcessor.getStatus(),
      consoleHandler: this.consoleHandler.getStatus(),
      tokenTracker: this.tokenTracker.getStatus(),
      extensionState: this.extensionState.getStatus(),
      messageRouter: this.messageRouter.getStatus()
    };

    // Check for any unhealthy modules
    const unhealthyModules = Object.entries(healthStatus)
      .filter(([_, moduleStatus]) => {
        if (!moduleStatus.initialized) return true;
        // Check aborted status if it exists
        return 'aborted' in moduleStatus && moduleStatus.aborted;
      })
      .map(([name]) => name);

    if (unhealthyModules.length > 0) {
      console.warn('⚠️ BackgroundController: Unhealthy modules detected:', unhealthyModules);
    }

    // Log memory usage if it's high
    const memoryUsage = this.chromeApi.getMemoryUsage();
    if (memoryUsage.percentage > 80) {
      console.warn(`🧠 BackgroundController: High memory usage: ${memoryUsage.percentage.toFixed(1)}%`);
    }
  }

  /**
   * Log current memory usage
   */
  private logMemoryUsage(): void {
    if (!this.config.enableMemoryMonitoring) {
      return;
    }

    const memoryUsage = this.chromeApi.getMemoryUsage();
    console.log(`🧠 Memory Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB (${memoryUsage.percentage.toFixed(1)}%)`);
  }

  /**
   * Cleanup all modules to prevent memory leaks
   */
  async cleanup(): Promise<void> {
    console.log('🧹 BackgroundController: Starting cleanup...');

    try {
      // Cleanup modules in reverse dependency order
      if (this.messageRouter) {
        this.messageRouter.cleanup();
        console.log('  ✅ Message router cleaned up');
      }

      if (this.extensionState) {
        this.extensionState.cleanup();
        console.log('  ✅ Extension state cleaned up');
      }

      if (this.consoleHandler) {
        this.consoleHandler.cleanup();
        console.log('  ✅ Console handler cleaned up');
      }

      if (this.networkProcessor) {
        this.networkProcessor.cleanup();
        console.log('  ✅ Network processor cleaned up');
      }

      if (this.tokenTracker) {
        this.tokenTracker.cleanup();
        console.log('  ✅ Token tracker cleaned up');
      }

      if (this.storageManager) {
        this.storageManager.cleanup();
        console.log('  ✅ Storage manager cleaned up');
      }

      if (this.chromeApi) {
        this.chromeApi.cleanup();
        console.log('  ✅ Chrome API cleaned up');
      }

      this.isInitialized = false;
      this.initializationPromise = null;

      console.log('✅ BackgroundController: Cleanup completed');
    } catch (error) {
      console.error('❌ BackgroundController: Cleanup failed:', error);
    }
  }

  /**
   * Get comprehensive status of all modules
   */
  getStatus(): {
    initialized: boolean;
    startupTime: number;
    modules: any;
    memory: any;
  } {
    return {
      initialized: this.isInitialized,
      startupTime: Date.now() - this.startTime,
      modules: {
        chromeApi: this.chromeApi?.getStatus() || null,
        storageManager: this.storageManager?.getStatus() || null,
        networkProcessor: this.networkProcessor?.getStatus() || null,
        consoleHandler: this.consoleHandler?.getStatus() || null,
        tokenTracker: this.tokenTracker?.getStatus() || null,
        extensionState: this.extensionState?.getStatus() || null,
        messageRouter: this.messageRouter?.getStatus() || null
      },
      memory: this.chromeApi?.getMemoryUsage() || null
    };
  }
}

// ===== STARTUP SEQUENCE =====

console.log('🚀 Background service worker starting with modular architecture');

// Service worker compatible error handlers (no window references)
self.addEventListener('error', (event) => {
  console.error('🚨 BackgroundController: Unhandled error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 BackgroundController: Unhandled promise rejection:', event.reason);
});

// Create and initialize the background controller
const backgroundController = new BackgroundController();

// Add ready state tracking
let isBackgroundReady = false;

// Make isBackgroundReady available to message router
(globalThis as any).isBackgroundReady = () => isBackgroundReady;

// Initialize with comprehensive error handling
backgroundController.initialize().then(() => {
  isBackgroundReady = true;
  console.log('✅ Background script fully operational with modular architecture');

  // Notify any waiting clients that we're ready
  chrome.runtime.sendMessage({ action: 'BACKGROUND_READY' }).catch(() => {
    // Ignore errors - no listeners might be available yet
  });

}).catch((error) => {
  console.error('❌ Background script initialization failed:', error);
  isBackgroundReady = false;

  // Attempt recovery after delay
  setTimeout(() => {
    console.log('🔄 Attempting background script recovery...');
    backgroundController.initialize().then(() => {
      isBackgroundReady = true;
      console.log('✅ Background script recovered successfully');
    }).catch((retryError) => {
      console.error('❌ Background script recovery failed:', retryError);
      isBackgroundReady = false;
    });
  }, 2000);
});

// Service worker shutdown handler
self.addEventListener('beforeunload', () => {
  console.log('🧹 Background service worker shutting down...');
  backgroundController.cleanup();
});

// Export for debugging (available in Chrome DevTools)
(globalThis as any).backgroundController = backgroundController;
(globalThis as any).isBackgroundReady = () => isBackgroundReady;

console.log('🔧 Background script modular architecture loaded and initializing...');
