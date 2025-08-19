/**
 * Message Router Module - Simplified Message Routing
 *
 * Handles Chrome extension message routing with validation and module coordination.
 */

import { ChromeApiModule } from '../shared/chrome-api.module';
import { StorageManagerModule } from '../shared/storage-manager.module';
import { NetworkProcessorModule } from '../modules/network-processor.module';
import { ConsoleHandlerModule } from '../modules/console-handler.module';
import { TokenTrackerModule } from '../modules/token-tracker.module';
import { ExtensionStateModule } from '../modules/extension-state.module';
import { SafetyConfig } from '../types/background-types';

export class MessageRouterModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly storageManager: StorageManagerModule;
  private readonly networkProcessor: NetworkProcessorModule;
  private readonly consoleHandler: ConsoleHandlerModule;
  private readonly tokenTracker: TokenTrackerModule;
  private readonly extensionState: ExtensionStateModule;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private messageCount = 0;

  constructor(
    chromeApi: ChromeApiModule,
    storageManager: StorageManagerModule,
    networkProcessor: NetworkProcessorModule,
    consoleHandler: ConsoleHandlerModule,
    tokenTracker: TokenTrackerModule,
    extensionState: ExtensionStateModule,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
    this.storageManager = storageManager;
    this.networkProcessor = networkProcessor;
    this.consoleHandler = consoleHandler;
    this.tokenTracker = tokenTracker;
    this.extensionState = extensionState;
    this.config = {
      enableAbortController: true,
      maxRetries: 3,
      timeoutMs: 5000,
      enableRaceConditionProtection: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.abortController = new AbortController();
    console.log('📬 MessageRouterModule: Initialized with safety configuration');
  }

  /**
   * Initialize message router
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Register Chrome message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });

    this.isInitialized = true;
    console.log('✅ MessageRouterModule: Successfully initialized');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.config.enableAbortController) {
      this.abortController.abort();
    }

    this.isInitialized = false;
    this.messageCount = 0;
    console.log('🧹 MessageRouterModule: Cleanup completed');
  }

  /**
   * Main message handling
   */
  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    this.messageCount++;

    try {
      if (!message?.action && !message?.type) {
        sendResponse({ success: false, error: 'Missing action' });
        return;
      }

      const action = message.action || message.type;

      // Route messages to appropriate handlers
      switch (action) {
        // Debug/Test Messages
        case 'debugTest':
          console.log('🐛 MessageRouter: Debug test called');
          sendResponse({
            success: true,
            message: 'Debug test successful',
            timestamp: Date.now(),
            moduleStatus: 'working'
          });
          break;

        // Extension State
        case 'INJECT_MAIN_WORLD_SCRIPT':
          await this.handleScriptInjection(message, sender, sendResponse);
          break;

        case 'GET_EXTENSION_STATE':
          const state = await this.extensionState.getExtensionState();
          sendResponse({ success: true, ...state });
          break;

        case 'SET_EXTENSION_STATE':
          if (typeof message.enabled === 'boolean') {
            const result = await this.extensionState.setExtensionState(message.enabled);
            sendResponse(result);
          } else {
            sendResponse({ success: false, error: 'Enabled state must be boolean' });
          }
          break;

        // Network Processing
        case 'storeNetworkRequest':
        case 'STORE_NETWORK_REQUEST':
        case 'NETWORK_REQUEST':
          const networkResult = await this.networkProcessor.processNetworkRequest(message.data, sender);
          sendResponse(networkResult);
          break;

        case 'getNetworkRequests':
          const networkRequests = await this.networkProcessor.getNetworkRequests(
            message.limit || 50,
            message.offset || 0
          );
          const networkTotal = await this.networkProcessor.getNetworkRequestsCount();
          const networkResponse = { success: true, requests: networkRequests, total: networkTotal };
          console.log('🌐 MessageRouter: getNetworkRequests response:', { requestsCount: networkRequests.length, total: networkTotal });
          sendResponse(networkResponse);
          break;

        case 'toggleTabLogging':
          if (message.tabId) {
            const toggleResult = await this.networkProcessor.toggleTabLogging(message.tabId);
            sendResponse(toggleResult);
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        // Console Handling
        case 'CONSOLE_ERROR':
          const consoleResult = await this.consoleHandler.processConsoleError(message.data, sender);
          sendResponse(consoleResult);
          break;

        case 'getConsoleErrors':
          const consoleErrors = await this.consoleHandler.getConsoleErrors(
            message.limit || 50,
            message.offset || 0
          );
          const errorTotal = await this.consoleHandler.getConsoleErrorsCount();
          const errorResponse = { success: true, errors: consoleErrors, total: errorTotal };
          console.log('📝 MessageRouter: getConsoleErrors response:', { errorsCount: consoleErrors.length, total: errorTotal });
          sendResponse(errorResponse);
          break;

        case 'toggleTabErrorLogging':
          if (message.tabId) {
            const errorToggleResult = await this.consoleHandler.toggleTabErrorLogging(message.tabId);
            sendResponse(errorToggleResult);
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        // Tab State Management (IndexedDB)
        case 'setTabNetworkState':
          if (message.tabId !== undefined && typeof message.active === 'boolean') {
            try {
              await this.storageManager.setTabNetworkState(message.tabId, message.active);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to set tab network state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID and active state required' });
          }
          break;

        case 'setTabErrorState':
          if (message.tabId !== undefined && typeof message.active === 'boolean') {
            try {
              await this.storageManager.setTabErrorState(message.tabId, message.active);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to set tab error state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID and active state required' });
          }
          break;

        case 'setTabTokenState':
          if (message.tabId !== undefined && typeof message.active === 'boolean') {
            try {
              await this.storageManager.setTabTokenState(message.tabId, message.active);
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to set tab token state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID and active state required' });
          }
          break;

        // Get Tab States
        case 'getTabNetworkState':
          if (message.tabId !== undefined) {
            try {
              const active = await this.storageManager.getTabNetworkState(message.tabId);
              sendResponse({ success: true, active });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get tab network state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        case 'getTabErrorState':
          if (message.tabId !== undefined) {
            try {
              const active = await this.storageManager.getTabErrorState(message.tabId);
              sendResponse({ success: true, active });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get tab error state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        case 'getTabTokenState':
          if (message.tabId !== undefined) {
            try {
              const active = await this.storageManager.getTabTokenState(message.tabId);
              sendResponse({ success: true, active });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get tab token state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        case 'getSettings':
          try {
            const settingsData = await this.storageManager.getSettings();
            sendResponse({ success: true, data: settingsData });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get settings' });
          }
          break;

        // Token Events
        case 'getTokenEvents':
          const tokenEvents = await this.tokenTracker.getTokenEvents(
            message.limit || 50,
            message.offset || 0
          );
          const tokenTotal = await this.tokenTracker.getTokenEventsCount();
          const tokenResponse = { success: true, events: tokenEvents, total: tokenTotal };
          console.log('🔍 MessageRouter: getTokenEvents response:', { eventsCount: tokenEvents.length, total: tokenTotal });
          sendResponse(tokenResponse);
          break;

        // Data Management
        case 'getTableCounts':
          // Get counts from each module (which get data from IndexedDB)
          try {
            const [networkCount, errorCount, tokenCount] = await Promise.all([
              this.networkProcessor.getNetworkRequestsCount(),
              this.consoleHandler.getConsoleErrorsCount(),
              this.tokenTracker.getTokenEventsCount()
            ]);

            sendResponse({
              success: true,
              data: {
                apiCalls: networkCount,
                consoleErrors: errorCount,
                tokenEvents: tokenCount
              }
            });
          } catch (error) {
            console.error('MessageRouter: getTableCounts error:', error);
            sendResponse({ success: false, error: 'Failed to get table counts' });
          }
          break;

        case 'clearAllData':
          await this.storageManager.clearAllData();
          sendResponse({ success: true });
          break;

        // Tab Information
        case 'getCurrentTabId':
        case 'GET_CURRENT_TAB_ID':
          if (sender.tab?.id) {
            sendResponse({ success: true, tabId: sender.tab.id });
          } else {
            const currentTab = await this.chromeApi.getCurrentTab();
            sendResponse({ success: true, tabId: currentTab?.id || 0 });
          }
          break;

        case 'getInterceptionState':
          if (message.tabId) {
            const interceptionResult = await this.networkProcessor.getInterceptionState(message.tabId);
            sendResponse(interceptionResult);
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        case 'getTabInfo':
          const tabs = await this.chromeApi.queryTabs({});
          sendResponse({ success: true, tabs });
          break;

        // System Operations
        case 'openDashboard':
          try {
            const dashboardUrl = chrome.runtime.getURL('src/dashboard/dashboard.html');
            await chrome.tabs.create({ url: dashboardUrl });
            sendResponse({ success: true });
          } catch {
            sendResponse({ success: false, error: 'Failed to open dashboard' });
          }
          break;

        case 'getMemoryUsage':
          const memoryUsage = this.chromeApi.getMemoryUsage();
          sendResponse({ success: true, data: memoryUsage });
          break;

        case 'getStorageAnalysis':
          const analysis = await this.storageManager.getStorageAnalysis();
          sendResponse({ success: true, data: analysis });
          break;

        case 'ping':
          sendResponse({ success: true, message: 'Background script is active' });
          break;

        case 'getTabs':
          const allTabs = await this.chromeApi.queryTabs({});
          sendResponse({ success: true, tabs: allTabs });
          break;

        case 'getVersion':
          const versionInfo = this.extensionState.getExtensionInfo();
          sendResponse({ success: true, ...versionInfo });
          break;

        // Global Power State
        case 'GET_GLOBAL_POWER_STATE':
          const globalPowerState = await this.extensionState.getGlobalPowerState();
          sendResponse({ success: true, data: globalPowerState });
          break;

        case 'GET_SITE_SPECIFIC_STATE':
          if (message.domain) {
            const siteState = await this.extensionState.getSiteSpecificState(message.domain);
            sendResponse({ success: true, data: siteState });
          } else {
            sendResponse({ success: false, error: 'Domain required' });
          }
          break;

        default:
          console.warn(`📬 MessageRouterModule: Unknown action: ${action}`);
          sendResponse({ success: false, error: `Unknown action: ${action}` });
          break;
      }
    } catch (error) {
      console.error('MessageRouterModule: Message handling error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle script injection requests
   */
  private async handleScriptInjection(
    _message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    const tabId = sender.tab?.id;

    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return;
    }

    const result = await this.extensionState.handleScriptInjection(tabId);
    sendResponse(result);
  }

  /**
   * Get module status
   */
  getStatus(): {
    initialized: boolean;
    messageCount: number;
    aborted: boolean;
  } {
    return {
      initialized: this.isInitialized,
      messageCount: this.messageCount,
      aborted: this.abortController.signal.aborted
    };
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute operation with comprehensive safety measures
   * TODO: Wrap existing async methods with this pattern
   */
  /* private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`MessageRouterModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`MessageRouterModule: Operation aborted (${operation})`);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Race condition protection
        if (this.config.enableRaceConditionProtection && attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }

        const result = await fn();

        // Log performance for slow operations
        const duration = Date.now() - startTime;
        if (duration > 500 && attempt === 0) { // Log slow operations only on first attempt
          console.warn(`🐌 MessageRouterModule: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ MessageRouterModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        console.warn(`⚠️ MessageRouterModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`MessageRouterModule: Unknown error in ${operation}`);
  } */
}
