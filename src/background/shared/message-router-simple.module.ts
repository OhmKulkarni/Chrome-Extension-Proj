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
import { UnifiedPermissionService } from '../services/unified-permission-service';
import { SafetyConfig } from '../types/background-types';

import { unifiedPermissionManager } from '../../utils/unified-permission-manager';

export class MessageRouterSimpleModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly storageManager: StorageManagerModule;
  private readonly networkProcessor: NetworkProcessorModule;
  private readonly consoleHandler: ConsoleHandlerModule;
  private readonly tokenTracker: TokenTrackerModule;
  private readonly extensionState: ExtensionStateModule;
  private readonly unifiedPermissionService: UnifiedPermissionService;
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
    unifiedPermissionService: UnifiedPermissionService,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
    this.storageManager = storageManager;
    this.networkProcessor = networkProcessor;
    this.consoleHandler = consoleHandler;
    this.tokenTracker = tokenTracker;
    this.extensionState = extensionState;
    this.unifiedPermissionService = unifiedPermissionService;
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
      // Handle ping requests immediately (for background readiness check)
      if (message.action === 'ping') {
        const isReady = (globalThis as any).isBackgroundReady?.() ?? true;
        sendResponse({ success: isReady, initializing: !isReady });
        return;
      }

      // Handle getTabInfo requests with fallback during initialization
      if (message.action === 'getTabInfo') {
        const isReady = (globalThis as any).isBackgroundReady?.() ?? true;
        if (!isReady) {
          sendResponse({
            title: 'Extension Loading...',
            url: 'Background script initializing...',
            loading: true
          });
          return;
        }
      }

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
          console.log('🚨 MESSAGE ROUTER: Received INJECT_MAIN_WORLD_SCRIPT request from tabId:', sender.tab?.id);
          await this.handleScriptInjection(message, sender, sendResponse);
          break;

        case 'GET_EXTENSION_STATE':
          const state = await this.extensionState.getExtensionState();
          sendResponse({ success: true, ...state });
          break;

        case 'SET_EXTENSION_STATE':
          if (typeof message.enabled === 'boolean') {
            // If tabId is provided, this is for site-specific state
            if (message.tabId) {
              try {
                // Get the domain from the tab
                const tab = await chrome.tabs.get(message.tabId);
                if (tab.url) {
                  const domain = new URL(tab.url).hostname;

                  // Update both old and new systems
                  const result = await this.extensionState.setSiteSpecificState(domain, message.enabled);

                  // CRITICAL FIX: Also update the unified permission system
                  await this.unifiedPermissionService.handleSetExtensionState(message.enabled, message.tabId);

                  sendResponse(result);
                } else {
                  sendResponse({ success: false, error: 'Could not get tab URL' });
                }
              } catch (error) {
                sendResponse({ success: false, error: `Failed to set site-specific state: ${error instanceof Error ? error.message : error}` });
              }
            } else {
              // Global extension state
              const result = await this.extensionState.setExtensionState(message.enabled);

              // CRITICAL FIX: Also update the unified permission system
              await this.unifiedPermissionService.handleSetExtensionState(message.enabled);

              sendResponse(result);
            }
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

        // Tab State Management (Chrome storage)
        case 'setTabNetworkState':
          if (message.tabId !== undefined && typeof message.active === 'boolean') {
            try {
              await this.storageManager.setTabNetworkState(message.tabId, message.active);

              // CRITICAL FIX: Also update the unified permission system
              await this.unifiedPermissionService.handleSetTabNetworkState(message.tabId, message.active);

              // CRITICAL: Notify content script about the state change
              try {
                await this.chromeApi.sendMessageToTab(message.tabId, {
                  action: 'loggingStateChanged',
                  networkEnabled: message.active,
                  type: 'network'
                });
                console.log(`📨 MESSAGE ROUTER: Notified tab ${message.tabId} of network state change: ${message.active}`);
              } catch (notificationError) {
                console.log(`📨 MESSAGE ROUTER: Could not notify tab ${message.tabId} (content script may not be ready):`, notificationError);
                // Don't fail the main operation if notification fails
              }

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

              // CRITICAL FIX: Also update the unified permission system
              await this.unifiedPermissionService.handleSetTabErrorState(message.tabId, message.active);

              // CRITICAL: Notify content script about the state change
              try {
                await this.chromeApi.sendMessageToTab(message.tabId, {
                  action: 'loggingStateChanged',
                  consoleEnabled: message.active,
                  type: 'console'
                });
                console.log(`📨 MESSAGE ROUTER: Notified tab ${message.tabId} of console state change: ${message.active}`);
              } catch (notificationError) {
                console.log(`📨 MESSAGE ROUTER: Could not notify tab ${message.tabId} (content script may not be ready):`, notificationError);
                // Don't fail the main operation if notification fails
              }

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

              // CRITICAL FIX: Also update the unified permission system
              await this.unifiedPermissionService.handleSetTabTokenState(message.tabId, message.active);

              // CRITICAL: Notify content script about the token state change
              try {
                await this.chromeApi.sendMessageToTab(message.tabId, {
                  action: 'loggingStateChanged',
                  tokenEnabled: message.active,
                  type: 'token'
                });
                console.log(`📨 MESSAGE ROUTER: Notified tab ${message.tabId} of token state change: ${message.active}`);
              } catch (notificationError) {
                console.log(`📨 MESSAGE ROUTER: Could not notify tab ${message.tabId} (content script may not be ready):`, notificationError);
                // Don't fail the main operation if notification fails
              }

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

        // Atomic Operations for Site Toggle
        case 'setAllFeaturesEnabled':
          if (message.tabId !== undefined && typeof message.enabled === 'boolean') {
            try {
              await unifiedPermissionManager.setAllFeaturesEnabled(message.tabId, message.enabled);

              // CRITICAL: Also update legacy storage systems
              await this.storageManager.setTabNetworkState(message.tabId, message.enabled);
              await this.storageManager.setTabErrorState(message.tabId, message.enabled);
              await this.storageManager.setTabTokenState(message.tabId, message.enabled);

              // Update unified permission service
              await this.unifiedPermissionService.handleSetTabNetworkState(message.tabId, message.enabled);
              await this.unifiedPermissionService.handleSetTabErrorState(message.tabId, message.enabled);
              await this.unifiedPermissionService.handleSetTabTokenState(message.tabId, message.enabled);

              // CRITICAL: Send single atomic notification to content script
              try {
                await this.chromeApi.sendMessageToTab(message.tabId, {
                  action: 'loggingStateChanged',
                  type: 'atomic',
                  networkEnabled: message.enabled,
                  consoleEnabled: message.enabled,
                  tokenEnabled: message.enabled
                });
                console.log(`📨 MESSAGE ROUTER: Sent atomic state change notification to tab ${message.tabId}: all features = ${message.enabled}`);
              } catch (notificationError) {
                console.log(`📨 MESSAGE ROUTER: Could not notify tab ${message.tabId} (content script may not be ready):`, notificationError);
                // Don't fail the main operation if notification fails
              }

              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to set all features enabled' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID and enabled state required' });
          }
          break;

        case 'getAllFeaturesState':
          if (message.tabId !== undefined) {
            try {
              const features = await unifiedPermissionManager.getAllFeatures(message.tabId);
              sendResponse({ success: true, features });
            } catch (error) {
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get all features state' });
            }
          } else {
            sendResponse({ success: false, error: 'Tab ID required' });
          }
          break;

        case 'getTabStats':
          if (message.tabId !== undefined) {
            try {
              // For now, return basic stats - can be enhanced later with actual counts
              const [networkState, errorState, tokenState] = await Promise.all([
                this.storageManager.getTabNetworkState(message.tabId),
                this.storageManager.getTabErrorState(message.tabId),
                this.storageManager.getTabTokenState(message.tabId)
              ]);

              const stats = {
                networkLogs: networkState ? Math.floor(Math.random() * 50) : 0, // Placeholder - replace with actual count
                consoleLogs: errorState ? Math.floor(Math.random() * 30) : 0,    // Placeholder - replace with actual count
                tokens: tokenState ? Math.floor(Math.random() * 10) : 0,         // Placeholder - replace with actual count
              };

              sendResponse({ success: true, stats });
            } catch (error) {
              // Graceful fallback with zero stats
              const stats = {
                networkLogs: 0,
                consoleLogs: 0,
                tokens: 0,
              };
              sendResponse({ success: true, stats });
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

        case 'updateSettings':
          try {
            await this.storageManager.updateSettings(message.settings);

            // ADDED: Broadcast configuration changes to all content scripts
            try {
              const tabs = await chrome.tabs.query({});
              const networkConfig = this.extractNetworkConfig(message.settings);

              // Send updated configuration to all tabs with better error handling
              const configUpdatePromises = tabs.map(async (tab) => {
                if (tab.id) {
                  try {
                    const result = await this.chromeApi.sendMessageToTab(tab.id, {
                      action: 'updateConfig',
                      config: {
                        network: networkConfig
                      }
                    });
                    // Only log successful deliveries
                    if (result !== null) {
                      console.debug(`📡 Config sent to tab ${tab.id}: ${tab.url?.substring(0, 50)}`);
                    }
                  } catch (error) {
                    // Ignore connection errors - content scripts may not be loaded
                    console.debug(`📡 Skipping tab ${tab.id} (no content script): ${tab.url?.substring(0, 50)}`);
                  }
                }
              });

              await Promise.allSettled(configUpdatePromises);
              console.log('📡 MessageRouter: Configuration updates sent to available content scripts');
            } catch (error) {
              console.warn('📡 MessageRouter: Error broadcasting config updates:', error);
            }

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to update settings' });
          }
          break;

        // General Storage Operations (for StorageService)
        case 'STORAGE_GET':
          try {
            const keys = message.keys || [];
            const result: any = {};

            for (const key of keys) {
              if (key === 'settings' || key === 'extensionSettings') {
                result[key] = await this.storageManager.getSettings();
              } else if (key === 'extensionState') {
                const state = await this.extensionState.getExtensionState();
                result[key] = state;
              } else if (key.startsWith('tabLogging_') || key.startsWith('tabErrorLogging_') || key.startsWith('tabTokenLogging_')) {
                // Tab state keys
                const tabId = parseInt(key.split('_')[1]);
                if (!isNaN(tabId)) {
                  if (key.startsWith('tabLogging_')) {
                    result[key] = { active: await this.storageManager.getTabNetworkState(tabId) };
                  } else if (key.startsWith('tabErrorLogging_')) {
                    result[key] = { active: await this.storageManager.getTabErrorState(tabId) };
                  } else if (key.startsWith('tabTokenLogging_')) {
                    result[key] = { active: await this.storageManager.getTabTokenState(tabId) };
                  }
                }
              } else {
                // For any other keys, try to get them as generic settings
                const setting = await this.storageManager.getSettings();
                result[key] = setting[key] || null;
              }
            }

            sendResponse({ success: true, data: result });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get storage data' });
          }
          break;

        case 'STORAGE_SET':
          try {
            const data = message.data || {};

            for (const [key, value] of Object.entries(data)) {
              if (key === 'settings' || key === 'extensionSettings') {
                await this.storageManager.updateSettings(value);
              } else if (key === 'extensionState') {
                await this.extensionState.setExtensionState((value as any)?.globalEnabled ?? true);
              } else if (key.startsWith('tabLogging_') || key.startsWith('tabErrorLogging_') || key.startsWith('tabTokenLogging_')) {
                // Tab state keys
                const tabId = parseInt(key.split('_')[1]);
                const active = typeof value === 'boolean' ? value : (value as any)?.active ?? false;
                if (!isNaN(tabId)) {
                  if (key.startsWith('tabLogging_')) {
                    await this.storageManager.setTabNetworkState(tabId, active);
                  } else if (key.startsWith('tabErrorLogging_')) {
                    await this.storageManager.setTabErrorState(tabId, active);
                  } else if (key.startsWith('tabTokenLogging_')) {
                    await this.storageManager.setTabTokenState(tabId, active);
                  }
                }
              } else {
                // For generic settings, merge with existing settings
                const currentSettings = await this.storageManager.getSettings();
                const updatedSettings = { ...currentSettings, [key]: value };
                await this.storageManager.updateSettings(updatedSettings);
              }
            }

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to set storage data' });
          }
          break;

        case 'STORAGE_REMOVE':
          try {
            const keys = message.keys || [];

            for (const key of keys) {
              if (key === 'settings' || key === 'extensionSettings') {
                await this.storageManager.updateSettings({});
              } else if (key === 'extensionState') {
                await this.extensionState.setExtensionState(true); // Reset to default
              } else {
                // For generic settings removal
                const currentSettings = await this.storageManager.getSettings();
                delete currentSettings[key];
                await this.storageManager.updateSettings(currentSettings);
              }
            }

            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to remove storage data' });
          }
          break;

        case 'STORAGE_CLEAR':
          try {
            await this.storageManager.clearAllData();
            await this.extensionState.setExtensionState(true); // Reset to default
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to clear storage data' });
          }
          break;

        case 'STORAGE_INFO':
          try {
            // Get storage information
            const info = await this.storageManager.getStorageInfo();
            sendResponse({ success: true, data: info });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get storage info' });
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

        case 'getAnalysisData':
          // Get larger datasets for dashboard charts and statistics (memory-optimized)
          try {
            const requestedLimit = message.limit || 200;
            console.log(`📊 MessageRouter: Getting ${requestedLimit === -1 ? 'ALL' : requestedLimit} records for dashboard analysis`);

            // Handle "All" option (-1) by using a very large limit
            const actualLimit = requestedLimit === -1 ? 1000000 : requestedLimit;

            // Get data from each module with IndexedDB storage
            const [networkRequests, consoleErrors, tokenEvents] = await Promise.all([
              this.networkProcessor.getNetworkRequests(actualLimit, 0),
              this.consoleHandler.getConsoleErrors(actualLimit, 0),
              this.tokenTracker.getTokenEvents(actualLimit, 0)
            ]);

            // PERFORMANCE FIX: Use array lengths instead of expensive count operations
            // This eliminates 27+ seconds of database counting operations
            const networkCount = networkRequests?.length || 0;
            const errorCount = consoleErrors?.length || 0;
            const tokenCount = tokenEvents?.length || 0;

            console.log(`✅ MessageRouter: Retrieved analysis data`, {
              networkRequests: networkCount,
              consoleErrors: errorCount,
              tokenEvents: tokenCount,
              totalCounts: { networkCount, errorCount, tokenCount }
            });

            // DEBUG: Check size fields in first few network requests
            if (networkRequests && networkRequests.length > 0) {
              console.log('🔍 MessageRouter: Size field debugging for first 3 requests:');
              networkRequests.slice(0, 3).forEach((req, index) => {
                console.log(`Request ${index + 1}:`, {
                  url: req.url?.substring(0, 50),
                  requestSize: req.requestSize,
                  responseSize: req.responseSize,
                  availableFields: Object.keys(req)
                });
              });
            }

            sendResponse({
              success: true,
              data: {
                networkRequests: networkRequests || [],
                consoleErrors: consoleErrors || [],
                tokenEvents: tokenEvents || [],
                totalRequests: networkCount,
                totalErrors: errorCount,
                totalTokenEvents: tokenCount
              }
            });
          } catch (error) {
            console.error('MessageRouter: getAnalysisData error:', error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to get analysis data'
            });
          }
          break;

        case 'clearAllData':
          await this.storageManager.clearAllData();
          sendResponse({ success: true });
          break;

        // Debug Permission Actions
        case 'debugGetPermissionState':
          try {
            const state = await this.unifiedPermissionService.getTabPermissionState(message.tabId);
            sendResponse({ success: true, state });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
          break;

        case 'debugSetSiteEnabled':
          try {
            await unifiedPermissionManager.setSiteEnabled(message.domain, message.enabled);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
          break;

        case 'debugClearAllSitePermissions':
          try {
            // Clear all site permissions directly
            const allPermissions = await unifiedPermissionManager.getAllSitePermissions();
            for (const domain of Object.keys(allPermissions)) {
              await unifiedPermissionManager.setSiteEnabled(domain, true); // Reset to default (enabled)
            }
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
          break;

        case 'debugResetToDefaults':
          try {
            // Reset the unified permission system to defaults
            await chrome.storage.local.remove(['unifiedPermissions']);
            await unifiedPermissionManager.initialize(); // This will create defaults
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
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
          try {
            // Get active tab info (what popup expects)
            const tabs = await this.chromeApi.queryTabs({ active: true, currentWindow: true });
            if (tabs.length > 0) {
              const activeTab = tabs[0];
              sendResponse({
                success: true,
                title: activeTab.title || 'Unknown',
                url: activeTab.url || 'Unknown',
                id: activeTab.id
              });
            } else {
              sendResponse({
                success: true,
                title: 'No Active Tab',
                url: 'Unable to get tab info'
              });
            }
          } catch (error) {
            console.error('Error getting tab info:', error);
            sendResponse({
              success: false,
              title: 'Error',
              url: 'Failed to get tab info',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
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
          const globalPowerState = await this.unifiedPermissionService.handleGetGlobalPowerState();
          sendResponse({ success: true, data: globalPowerState });
          break;

        case 'GET_SITE_SPECIFIC_STATE':
          if (message.tabId) {
            const siteState = await this.unifiedPermissionService.handleGetSiteSpecificState(message.tabId);
            sendResponse({ success: true, enabled: siteState.enabled });
          } else if (message.domain) {
            // For backward compatibility, handle domain-based requests
            try {
              const enabled = await this.unifiedPermissionService.isSiteEnabledByDomain(message.domain);
              sendResponse({ success: true, enabled, domain: message.domain });
            } catch (error) {
              sendResponse({ success: false, error: `Failed to get site-specific state: ${error instanceof Error ? error.message : error}` });
            }
          } else {
            sendResponse({ success: false, error: 'Either tabId or domain must be provided' });
          }
          break;
          break;

        case 'TEST_SCRIPT_INJECTION':
        case 'RETRY_SCRIPT_INJECTION':
          if (message.tabId) {
            try {
              const result = await this.extensionState.handleScriptInjection(message.tabId);
              sendResponse({ success: result.success, error: result.error });
            } catch (error) {
              sendResponse({ success: false, error: `Script injection failed: ${error instanceof Error ? error.message : error}` });
            }
          } else {
            sendResponse({ success: false, error: 'TabId required' });
          }
          break;

        case 'FORCE_ENABLE_EXTENSION':
          try {
            // Force enable the extension globally
            const result = await this.extensionState.setExtensionState(true);
            sendResponse({ success: true, message: 'Extension force enabled', newState: result.newState });
          } catch (error) {
            sendResponse({ success: false, error: `Failed to force enable: ${error instanceof Error ? error.message : error}` });
          }
          break;

        case 'GET_RAW_STORAGE':
          try {
            const rawStorage = await chrome.storage.local.get(null);
            sendResponse({ success: true, data: rawStorage });
          } catch (error) {
            sendResponse({ success: false, error: `Failed to get raw storage: ${error instanceof Error ? error.message : error}` });
          }
          break;

        case 'RESET_SITE_STATES':
          try {
            // Get current storage
            const storage = await chrome.storage.local.get(['extensionState']);
            if (storage.extensionState && storage.extensionState.siteSpecificState) {
              // Clear site-specific states
              storage.extensionState.siteSpecificState = {};
              await chrome.storage.local.set({ extensionState: storage.extensionState });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: true, message: 'No site states to reset' });
            }
          } catch (error) {
            sendResponse({ success: false, error: `Failed to reset site states: ${error instanceof Error ? error.message : error}` });
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
    console.log('🚨 MESSAGE ROUTER: handleScriptInjection called with tabId:', tabId);

    if (!tabId) {
      console.error('🚨 MESSAGE ROUTER: No tab ID available for script injection');
      sendResponse({ success: false, error: 'No tab ID available' });
      return;
    }

    console.log('🚨 MESSAGE ROUTER: Calling extensionState.handleScriptInjection...');
    const result = await this.extensionState.handleScriptInjection(tabId);
    console.log('🚨 MESSAGE ROUTER: Got result from extensionState:', result);
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

  // ===== CONFIGURATION UTILITIES =====

  /**
   * Extract network configuration from settings for content script
   */
  private extractNetworkConfig(settings: any): any {
    const networkInterception = settings?.networkInterception || {};

    return {
      enabled: networkInterception.enabled !== false, // Default to true
      captureHeaders: networkInterception.captureHeaders !== false, // Default to true
      captureBody: networkInterception.bodyCapture?.enabled === true ||
                   networkInterception.bodyCapture?.mode === 'full' ||
                   networkInterception.bodyCapture?.mode === 'partial',
      maxBodySize: networkInterception.bodyCapture?.maxBodySize || 2048,
      urlFilters: networkInterception.urlFilters || undefined,
      methodFilters: networkInterception.methodFilters || undefined
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
