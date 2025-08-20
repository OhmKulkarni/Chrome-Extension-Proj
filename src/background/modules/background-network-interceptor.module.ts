/**
 * Enhanced Background Network Interceptor
 *
 * Solves navigation issues by using Chrome's webRequest API to capture
 * ALL network requests at the background level, regardless of content
 * script lifecycle or page navigation.
 */

import { NetworkProcessorModule } from './network-processor.module';
import { TokenTrackerModule } from './token-tracker.module';
import { StorageManagerModule } from '../shared/storage-manager.module';
import { ChromeSyncService } from '../../services/chrome-sync-service';

export interface WebRequestDetails {
  requestId: string;
  url: string;
  method: string;
  type: chrome.webRequest.ResourceType;
  timeStamp: number;
  tabId: number;
  frameId: number;
  requestHeaders?: chrome.webRequest.HttpHeader[];
  requestBody?: any;
  responseHeaders?: chrome.webRequest.HttpHeader[];
  statusCode?: number;
  statusText?: string;
}

export class BackgroundNetworkInterceptor {
  private networkProcessor: NetworkProcessorModule;
  private tokenTracker: TokenTrackerModule;
  private storageManager: StorageManagerModule;
  private chromeSyncService: ChromeSyncService;
  private isInitialized = false;
  private activeRequests: Map<string, WebRequestDetails> = new Map();

  constructor(
    networkProcessor: NetworkProcessorModule,
    tokenTracker: TokenTrackerModule,
    storageManager: StorageManagerModule
  ) {
    this.networkProcessor = networkProcessor;
    this.tokenTracker = tokenTracker;
    this.storageManager = storageManager;
    this.chromeSyncService = ChromeSyncService.getInstance();
  }

  /**
   * Initialize background network interception using Chrome webRequest API
   * This works regardless of content script status or page navigation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('BackgroundNetworkInterceptor: Already initialized');
      return;
    }

    try {
      // Check if webRequest API is available in this context
      if (!this.isWebRequestAvailable()) {
        console.log('🌐 BackgroundNetworkInterceptor: webRequest API not available');
        console.log('📋 BackgroundNetworkInterceptor: Falling back to content script-only mode');
        console.log('💡 BackgroundNetworkInterceptor: Network interception will rely on content script injection');

        // Still set up tab management for content script coordination
        this.setupTabManagement();
        this.isInitialized = true;

        console.log('🌐 BackgroundNetworkInterceptor: Initialized in content script coordination mode');
        return;
      }

      // Set up webRequest listeners for comprehensive network capture
      this.setupWebRequestListeners();

      // Set up tab management for navigation handling
      this.setupTabManagement();

      this.isInitialized = true;
      console.log('🌐 BackgroundNetworkInterceptor: Initialized with persistent network capture');
    } catch (error) {
      console.error('❌ BackgroundNetworkInterceptor: Initialization failed:', error);
      // Don't throw error - try to initialize in fallback mode
      try {
        console.log('🔄 BackgroundNetworkInterceptor: Attempting fallback initialization');
        this.setupTabManagement();
        this.isInitialized = true;
        console.log('🌐 BackgroundNetworkInterceptor: Initialized in fallback mode');
      } catch (fallbackError) {
        console.error('❌ BackgroundNetworkInterceptor: Fallback initialization failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Check if webRequest API is available
   */
  private isWebRequestAvailable(): boolean {
    try {
      // Check if Chrome runtime is available
      if (typeof chrome === 'undefined') {
        console.log('BackgroundNetworkInterceptor: Chrome runtime not available');
        return false;
      }

      // Check if webRequest API exists
      if (!chrome.webRequest) {
        console.log('BackgroundNetworkInterceptor: webRequest API not available (Manifest V3 restriction)');
        return false;
      }

      // Check if specific webRequest methods exist
      if (!chrome.webRequest.onBeforeRequest) {
        console.log('BackgroundNetworkInterceptor: webRequest.onBeforeRequest not available');
        return false;
      }

      // Additional permission check - in Manifest V3, webRequest might exist but be restricted
      const manifest = chrome.runtime.getManifest();
      if (manifest.manifest_version === 3) {
        console.log('BackgroundNetworkInterceptor: Detected Manifest V3 - webRequest API has limitations');
        // In MV3, webRequest is generally not available for content blocking extensions
        // Only enterprise extensions can use it
        return false;
      }

      return true;
    } catch (error) {
      console.warn('BackgroundNetworkInterceptor: Error checking webRequest availability:', error);
      return false;
    }
  }

  /**
   * Set up Chrome webRequest listeners for persistent network interception
   */
  private setupWebRequestListeners(): void {
    if (!this.isWebRequestAvailable()) {
      console.warn('BackgroundNetworkInterceptor: webRequest API not available, skipping listener setup');
      return;
    }

    try {
      // Capture request initiation - get headers and body
      chrome.webRequest.onBeforeRequest.addListener(
        (details) => {
          this.handleBeforeRequest(details);
        },
        { urls: ["<all_urls>"] },
        ["requestBody"]
      );

      // Capture request headers including Authorization tokens
      chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          this.handleBeforeSendHeaders(details);
        },
        { urls: ["<all_urls>"] },
        ["requestHeaders"]
      );

      // Capture response headers
      chrome.webRequest.onHeadersReceived.addListener(
        (details) => {
          this.handleHeadersReceived(details);
        },
        { urls: ["<all_urls>"] },
        ["responseHeaders"]
      );

      // Capture final response completion
      chrome.webRequest.onCompleted.addListener(
        (details) => {
          this.handleCompleted(details);
        },
        { urls: ["<all_urls>"] }
      );

      // Capture network errors
      chrome.webRequest.onErrorOccurred.addListener(
        (details) => {
          this.handleError(details);
        },
        { urls: ["<all_urls>"] }
      );

      console.log('🔗 BackgroundNetworkInterceptor: webRequest listeners configured');
    } catch (error) {
      console.error('BackgroundNetworkInterceptor: Failed to set up webRequest listeners:', error);
      throw error;
    }
  }

  /**
   * Set up tab management for handling navigation and preferences
   */
  private setupTabManagement(): void {
    // Handle tab navigation - maintain logging state
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        await this.handleTabNavigation(tabId, tab.url);
      }
    });

    // Handle new tabs
    chrome.tabs.onCreated.addListener(async (tab) => {
      if (tab.id && tab.url) {
        await this.prepareTabForLogging(tab.id, tab.url);
      }
    });

    // Clean up closed tabs
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.cleanupTabData(tabId);
    });

    console.log('📑 BackgroundNetworkInterceptor: Tab management configured');
  }

  /**
   * Handle request initiation - capture URL, method, body
   */
  private handleBeforeRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
    const requestData: WebRequestDetails = {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      timeStamp: details.timeStamp,
      tabId: details.tabId,
      frameId: details.frameId,
      requestBody: details.requestBody
    };

    // Store for later correlation
    this.activeRequests.set(details.requestId, requestData);

    // Process asynchronously
    this.processRequestAsync(requestData, 'request');
  }

  /**
   * Handle request headers - capture Authorization tokens
   */
  private handleBeforeSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails): void {
    const requestData = this.activeRequests.get(details.requestId);
    if (!requestData) return;

    // Add request headers
    requestData.requestHeaders = details.requestHeaders;

    // Update stored request data
    this.activeRequests.set(details.requestId, requestData);

    // Extract tokens asynchronously
    if (details.requestHeaders) {
      this.extractTokensAsync(details.requestHeaders, details);
    }
  }

  /**
   * Handle response headers
   */
  private handleHeadersReceived(details: chrome.webRequest.WebResponseHeadersDetails): void {
    const requestData = this.activeRequests.get(details.requestId);
    if (!requestData) return;

    // Add response headers and status
    requestData.responseHeaders = details.responseHeaders;
    requestData.statusCode = details.statusCode;
    requestData.statusText = details.statusLine;

    this.activeRequests.set(details.requestId, requestData);
  }

  /**
   * Handle request completion - final processing
   */
  private handleCompleted(details: chrome.webRequest.WebResponseCacheDetails): void {
    const requestData = this.activeRequests.get(details.requestId);
    if (!requestData) return;

    // Finalize request data
    if (!requestData.statusCode) {
      requestData.statusCode = details.statusCode;
    }

    // Process asynchronously
    this.processRequestAsync(requestData, 'response');

    // Clean up active request
    this.activeRequests.delete(details.requestId);
  }

  /**
   * Handle network errors
   */
  private handleError(details: chrome.webRequest.WebRequestDetails): void {
    const requestData = this.activeRequests.get(details.requestId);
    if (!requestData) return;

    // Add error information
    requestData.statusCode = 0;
    requestData.statusText = (details as any).error || 'Network Error';

    // Process error asynchronously
    this.processRequestAsync(requestData, 'error');

    // Clean up
    this.activeRequests.delete(details.requestId);
  }

  /**
   * Asynchronously process request data
   */
  private async processRequestAsync(requestData: WebRequestDetails, phase: 'request' | 'response' | 'error'): Promise<void> {
    try {
      // Check if logging is enabled for this tab/domain
      const isEnabled = await this.isLoggingEnabled(requestData.tabId, requestData.url, 'network');
      if (!isEnabled) return;

      // Convert to format expected by network processor
      const networkRequestData = {
        id: requestData.requestId,
        url: requestData.url,
        method: requestData.method,
        status: requestData.statusCode || 0,
        statusText: requestData.statusText || '',
        timestamp: requestData.timeStamp,
        tabId: requestData.tabId,
        type: requestData.type,
        requestHeaders: this.formatHeaders(requestData.requestHeaders),
        responseHeaders: this.formatHeaders(requestData.responseHeaders),
        phase: phase
      };

      // Use existing network processor
      await this.networkProcessor.processNetworkRequest(networkRequestData);
    } catch (error) {
      console.warn(`Failed to process network data for ${requestData.url}:`, error);
    }
  }

  /**
   * Asynchronously extract and track tokens
   */
  private async extractTokensAsync(headers: chrome.webRequest.HttpHeader[], details: chrome.webRequest.WebRequestHeadersDetails): Promise<void> {
    try {
      // Check if token logging is enabled
      const isEnabled = await this.isLoggingEnabled(details.tabId, details.url, 'tokens');
      if (!isEnabled) return;

      // Convert to format expected by token tracker
      const networkRequestData = {
        url: details.url,
        method: details.method,
        status: 200, // Headers stage, assume success for now
        headers: this.formatHeaders(headers),
        timestamp: details.timeStamp.toString(), // Convert to string as required
        tabId: details.tabId,
        type: details.type,
        source_url: details.url
      };

      // Use existing token tracker method
      await this.tokenTracker.detectTokenEvent(networkRequestData);
    } catch (error) {
      console.warn(`Failed to extract tokens for ${details.url}:`, error);
    }
  }

  /**
   * Check if logging is enabled for tab/domain
   */
  private async isLoggingEnabled(tabId: number, url: string, type: 'network' | 'tokens'): Promise<boolean> {
    try {
      // Get tab preferences from Chrome sync
      const syncPrefs = await this.chromeSyncService.getTabPreferencesForUrl(url);

      // Get real-time state from IndexedDB (overrides sync prefs if actively toggled)
      const tabState = await this.getTabState(tabId, type);

      // Return active state if available, otherwise use sync preference
      return tabState !== null ? tabState : syncPrefs[type] || false;
    } catch (error) {
      console.warn(`Failed to check logging state for tab ${tabId}:`, error);
      return false;
    }
  }

  /**
   * Get real-time tab state from storage
   */
  private async getTabState(tabId: number, type: 'network' | 'tokens'): Promise<boolean | null> {
    try {
      if (type === 'network') {
        return await this.storageManager.getTabNetworkState(tabId);
      } else {
        return await this.storageManager.getTabTokenState(tabId);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Format headers for storage
   */
  private formatHeaders(headers?: chrome.webRequest.HttpHeader[]): Record<string, string> | undefined {
    if (!headers) return undefined;

    const formatted: Record<string, string> = {};
    headers.forEach(header => {
      if (header.name && header.value) {
        formatted[header.name] = header.value;
      }
    });
    return formatted;
  }

  /**
   * Handle tab navigation - maintain state across navigation
   */
  private async handleTabNavigation(tabId: number, newUrl: string): Promise<void> {
    try {
      console.log(`🔄 BackgroundNetworkInterceptor: Tab ${tabId} navigated to ${newUrl}`);

      // Re-inject content script if needed
      await this.ensureContentScriptActive(tabId);

      // Update tab logging preferences based on new domain
      await this.updateTabPreferences(newUrl);
    } catch (error) {
      console.warn(`Failed to handle tab navigation for ${tabId}:`, error);
    }
  }

  /**
   * Ensure content script is active after navigation
   */
  private async ensureContentScriptActive(tabId: number): Promise<void> {
    try {
      // Try to ping the content script
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });

      if (!response) {
        // Content script not responding - re-inject
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['assets/content-modular.ts-BJupZZW8.js'] // Use the built filename
        });
        console.log(`✅ BackgroundNetworkInterceptor: Content script re-injected for tab ${tabId}`);
      }
    } catch (error) {
      // Failed to communicate - try re-injection
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['assets/content-modular.ts-BJupZZW8.js'] // Use the built filename
        });
        console.log(`✅ BackgroundNetworkInterceptor: Content script injected for tab ${tabId}`);
      } catch (injectionError) {
        console.warn(`Failed to inject content script for tab ${tabId}:`, injectionError);
      }
    }
  }

  /**
   * Update tab preferences based on domain
   */
  private async updateTabPreferences(url: string): Promise<void> {
    try {
      const domain = new URL(url).hostname;
      const preferences = await this.chromeSyncService.getTabPreferencesForUrl(url);

      console.log(`🔄 BackgroundNetworkInterceptor: Updated preferences for ${domain}:`, preferences);
    } catch (error) {
      console.warn(`Failed to update tab preferences for ${url}:`, error);
    }
  }

  /**
   * Prepare new tab for logging
   */
  private async prepareTabForLogging(tabId: number, url: string): Promise<void> {
    try {
      console.log(`🆕 BackgroundNetworkInterceptor: Preparing tab ${tabId} for logging`);
      await this.updateTabPreferences(url);
    } catch (error) {
      console.warn(`Failed to prepare tab ${tabId} for logging:`, error);
    }
  }

  /**
   * Clean up data for closed tab
   */
  private cleanupTabData(tabId: number): void {
    // Remove any active requests for this tab
    for (const [requestId, requestData] of this.activeRequests.entries()) {
      if (requestData.tabId === tabId) {
        this.activeRequests.delete(requestId);
      }
    }

    console.log(`🧹 BackgroundNetworkInterceptor: Cleaned up data for closed tab ${tabId}`);
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics(): {
    activeRequests: number;
    isInitialized: boolean;
    webRequestAvailable: boolean;
    totalIntercepted: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      isInitialized: this.isInitialized,
      webRequestAvailable: this.isWebRequestAvailable(),
      totalIntercepted: 0 // Could track this with a counter
    };
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    this.activeRequests.clear();
    this.isInitialized = false;
    console.log('🧹 BackgroundNetworkInterceptor: Cleanup completed');
  }
}
