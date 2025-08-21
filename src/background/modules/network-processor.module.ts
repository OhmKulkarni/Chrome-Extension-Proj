/**
 * Network Processor Module - Network Request Handling and Processing
 *
 * Handles network request processing, filtering, and storage with comprehensive
 * validation and safety measures. Extracted from the original background script's
 * network handling functionality.
 */

import { ChromeApiModule } from '../shared/chrome-api.module';
import { StorageManagerModule } from '../shared/storage-manager.module';
import { TokenTrackerModule } from './token-tracker.module';
import { EnvironmentStorageManager } from '../environment-storage-manager';
import {
  NetworkRequestData,
  SafetyConfig
} from '../types/background-types';

export class NetworkProcessorModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly storageManager: StorageManagerModule;
  private readonly tokenTracker: TokenTrackerModule;
  private readonly indexedDbStorage: EnvironmentStorageManager;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private processedCount = 0;

  constructor(
    chromeApi: ChromeApiModule,
    storageManager: StorageManagerModule,
    tokenTracker: TokenTrackerModule,
    indexedDbStorage: EnvironmentStorageManager,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
    this.storageManager = storageManager;
    this.tokenTracker = tokenTracker;
    this.indexedDbStorage = indexedDbStorage;
    this.config = {
      enableAbortController: true,
      maxRetries: 3,
      timeoutMs: 5000,
      enableRaceConditionProtection: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.abortController = new AbortController();
    console.log('🌐 NetworkProcessorModule: Initialized with IndexedDB storage for all interceptions');
  }

  /**
   * Initialize network processor module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('NetworkProcessorModule: Already initialized');
      return;
    }

    try {
      // Verify dependencies are initialized
      if (!this.chromeApi.isExtensionContextValid()) {
        throw new Error('Chrome API module not properly initialized');
      }

      this.isInitialized = true;
      console.log('✅ NetworkProcessorModule: Successfully initialized');
    } catch (error) {
      console.error('❌ NetworkProcessorModule: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup(): void {
    if (this.config.enableAbortController) {
      this.abortController.abort('NetworkProcessorModule cleanup');
    }

    this.isInitialized = false;
    this.processedCount = 0;
    console.log('🧹 NetworkProcessorModule: Cleanup completed');
  }

  // ===== NETWORK REQUEST PROCESSING =====

  /**
   * Process network request data with comprehensive validation and storage
   * Handles data from both main world script and other sources
   */
  async processNetworkRequest(
    requestData: any,
    sender?: chrome.runtime.MessageSender
  ): Promise<{ success: boolean; reason?: string; tokenEvent?: any }> {
    return this.executeWithSafety('processNetworkRequest', async () => {
      // Validate input data
      if (!requestData || typeof requestData !== 'object') {
        return { success: false, reason: 'Invalid request data' };
      }

      // Handle data from main world script (different format)
      let url, method, status, headers, body, timestamp, tabId, tabUrl;

      if (requestData.type === 'fetch' || requestData.type === 'xhr') {
        // Data from main world script
        url = requestData.url;
        method = requestData.method;
        status = requestData.status;
        headers = requestData.requestHeaders || {};
        body = requestData.requestBody || '';
        timestamp = requestData.timestamp;

        // For main world data, get tab info from sender
        tabId = sender?.tab?.id;
        tabUrl = sender?.tab?.url || requestData.url;
      } else {
        // Data from other sources (direct API calls)
        ({ url, method, status, headers, body, timestamp } = requestData);
        tabId = requestData.tabId || sender?.tab?.id;
        tabUrl = requestData.source_url || sender?.tab?.url;
      }

      // Basic validation - only essential checks (matching main branch approach)
      if (!url || typeof url !== 'string') {
        return { success: false, reason: 'Invalid URL' };
      }

      if (!method || typeof method !== 'string') {
        return { success: false, reason: 'Invalid method' };
      }

      // Skip complex tab logging validation for now - let requests through
      // (Main branch handles this differently at the message routing level)

      // Get settings for body sanitization
      const settings = await this.storageManager.getSettings();
      const networkConfig = settings.networkInterception || {};

      // Extract main domain for intelligent grouping
      const mainDomain = tabUrl ? this.extractMainDomain(tabUrl) : this.extractMainDomain(url);

      // Create validated network request data with proper field mapping
      const validatedRequestData: NetworkRequestData = {
        url,
        method: method.toUpperCase(),
        status,
        headers: headers || {},
        body: this.sanitizeBody(body, networkConfig.bodyCapture?.maxBodySize || 2000),
        timestamp: timestamp || new Date().toISOString(),
        source_url: tabUrl || url,
        ...(tabId && { tabId })
      };

      // Add main-world script specific fields if available
      if (requestData.type === 'fetch' || requestData.type === 'xhr') {
        validatedRequestData.responseBody = requestData.responseBody;
        validatedRequestData.duration = requestData.duration;
        validatedRequestData.response_time = requestData.duration; // Also set alternative field name

        // For main-world data, we need to properly handle headers
        // The headers should include both request and response headers
        const combinedHeaders = {
          ...(requestData.requestHeaders || {}),
          ...(requestData.responseHeaders || {})
        };
        validatedRequestData.headers = combinedHeaders;
      }

      // Store the network request in IndexedDB using the same format as origin/main
      try {
        // Map the request data from main-world-script to storage API format (EXACT COPY FROM MAIN BRANCH)
        const apiCallData = {
          url: validatedRequestData.url,
          method: validatedRequestData.method || 'GET',
          headers: JSON.stringify({
            request: requestData.requestHeaders || {},
            response: requestData.responseHeaders || {}
          }),
          // Handle both new and old size field names
          payload_size: requestData.requestSize || requestData.responseSize ||
                       (requestData.requestBody ? requestData.requestBody.length : 0),
          status: status || 0,
          response_body: requestData.responseBody || `Status: ${status} ${requestData.statusText || ''}`,
          // Add request body if captured
          request_body: requestData.requestBody || null,
          timestamp: requestData.timestamp ? new Date(requestData.timestamp).getTime() : Date.now(),
          // Handle both new and old duration field names
          response_time: requestData.duration || requestData.response_time || null,
          // Add tab context for intelligent domain grouping
          tab_id: tabId,
          tab_url: tabUrl,
          main_domain: mainDomain, // Store the main domain directly for reliable grouping
          // Store new size fields for better data analysis
          request_size: requestData.requestSize || 0,
          response_size: requestData.responseSize || 0
        };

        // Use IndexedDB storage with race condition protection
        if (this.config.enableRaceConditionProtection) {
          await this.indexedDbStorage.insertApiCall(apiCallData);
        } else {
          // Fire and forget for performance (not recommended)
          this.indexedDbStorage.insertApiCall(apiCallData).catch(error =>
            console.warn('NetworkProcessorModule: IndexedDB storage failed:', error)
          );
        }

        console.log(`🗄️ NetworkProcessorModule: Stored network request in IndexedDB`);

        // Notify dashboard about new data
        this.sendDataUpdatedNotification('network_request');
      } catch (storageError) {
        console.error('NetworkProcessorModule: IndexedDB storage failed:', storageError);
        // Continue processing even if storage fails
      }

      // Track token events if this is a token-related request
      let tokenEvent = null;
      try {
        tokenEvent = await this.tokenTracker.detectTokenEvent(validatedRequestData);
      } catch (tokenError) {
        console.warn('NetworkProcessorModule: Token detection failed:', tokenError);
        // Don't fail the entire operation if token detection fails
      }

      this.processedCount++;

      console.log(`🌐 NetworkProcessorModule: Processed ${method} ${status} from ${mainDomain}`);

      return {
        success: true,
        ...(tokenEvent && { tokenEvent })
      };
    });
  }

  // ===== DATA RETRIEVAL =====

  /**
   * Get network requests with pagination (from IndexedDB)
   */
  async getNetworkRequests(limit = 50, offset = 0): Promise<NetworkRequestData[]> {
    return this.executeWithSafety('getNetworkRequests', async () => {
      // Get data from IndexedDB instead of Chrome storage
      const apiCalls = await this.indexedDbStorage.getApiCalls(limit, offset);

      // Transform IndexedDB ApiCall format to NetworkRequestData format for compatibility
      return apiCalls.map(apiCall => ({
        url: apiCall.url,
        method: apiCall.method,
        status: apiCall.status,
        headers: typeof apiCall.headers === 'string' ? JSON.parse(apiCall.headers || '{}') : apiCall.headers,
        body: apiCall.request_body || '',
        timestamp: new Date(apiCall.timestamp).toISOString(),
        source_url: apiCall.tab_url || apiCall.url,
        tabId: apiCall.tab_id
      }));
    });
  }

  /**
   * Get total count of network requests
   */
  async getNetworkRequestsCount(): Promise<number> {
    return this.executeWithSafety('getNetworkRequestsCount', async () => {
      const counts = await this.indexedDbStorage.getTableCounts();
      return counts.apiCalls || 0;
    });
  }

  /**
   * Send DATA_UPDATED notification to dashboard
   */
  private sendDataUpdatedNotification(dataType: string): void {
    try {
      // Use chrome.runtime.sendMessage to notify dashboard
      (globalThis as any).chrome?.runtime?.sendMessage({
        type: 'DATA_UPDATED',
        dataType: dataType
      });
    } catch (error) {
      // Dashboard might not be open, ignore error
      console.log('📡 NetworkProcessorModule: Could not notify dashboard (dashboard closed?):', error);
    }
  }

  // ===== TAB STATE MANAGEMENT =====

  /**
   * Toggle network logging for a specific tab
   */
  async toggleTabLogging(tabId: number): Promise<{ success: boolean; newState: boolean }> {
    return this.executeWithSafety('toggleTabLogging', async () => {
      // Get current state
      const currentState = await this.storageManager.getTabNetworkState(tabId);
      const newState = !currentState;

      // Set new state
      await this.storageManager.setTabNetworkState(tabId, newState);

      console.log(`🌐 NetworkProcessorModule: Tab ${tabId} network logging ${newState ? 'enabled' : 'disabled'}`);

      return { success: true, newState };
    });
  }

  /**
   * Get network interception state for a tab
   */
  async getInterceptionState(tabId: number): Promise<{
    success: boolean;
    networkLogging?: boolean;
    settings?: any;
  }> {
    return this.executeWithSafety('getInterceptionState', async () => {
      // Get current settings
      const settings = await this.storageManager.getSettings();

      // Get tab-specific network logging state
      const networkLogging = tabId ? await this.storageManager.getTabNetworkState(tabId) : false;

      return {
        success: true,
        networkLogging,
        settings: settings.networkInterception || {}
      };
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if request should be filtered as noise
   */
  /* TEMPORARILY DISABLED FOR DEBUGGING
  private isNoiseRequest(url: string, method: string): boolean {
    const urlLower = url.toLowerCase();

    // Filter out common noise patterns (matching original background script)
    const noisePatterns = [
      'favicon.ico',
      'google-analytics',
      'googletagmanager',
      'doubleclick.net',
      'googlesyndication',
      'adsystem.google',
      'amazon-adsystem',
      'facebook.com/tr',
      'connect.facebook.net',
      'analytics.twitter.com',
      'ping.chartbeat.net',
      'quantserve.com',
      'scorecardresearch.com',
      'outbrain.com',
      'taboola.com',
      '.css',
      '.js',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot'
    ];

    // Filter GET requests to static resources
    if (method === 'GET') {
      if (noisePatterns.some(pattern => urlLower.includes(pattern))) {
        return true;
      }
    }

    // Filter HEAD and OPTIONS requests (usually preflight)
    if (method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    return false;
  }
  */ // END TEMPORARY DISABLE

  /**
   * Extract main domain from URL
   */
  private extractMainDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Remove 'www.' prefix if present
      const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

      // For most cases, return the base domain
      const parts = withoutWww.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }

      return withoutWww;
    } catch (error) {
      console.warn('NetworkProcessorModule: Failed to extract main domain from URL:', url, error);
      return 'unknown';
    }
  }

  /**
   * Sanitize request body to prevent memory issues
   */
  private sanitizeBody(body: any, maxSize: number): string | undefined {
    if (!body) return undefined;

    let bodyStr: string;

    if (typeof body === 'string') {
      bodyStr = body;
    } else if (typeof body === 'object') {
      try {
        bodyStr = JSON.stringify(body);
      } catch {
        bodyStr = '[Object - JSON stringify failed]';
      }
    } else {
      bodyStr = String(body);
    }

    // Truncate if too large
    if (bodyStr.length > maxSize) {
      return bodyStr.substring(0, maxSize) + `... [truncated, original size: ${bodyStr.length}]`;
    }

    return bodyStr;
  }

  // ===== ANALYTICS AND MONITORING =====

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    processedCount: number;
    initialized: boolean;
    memoryUsage?: any;
  } {
    return {
      processedCount: this.processedCount,
      initialized: this.isInitialized,
      ...(this.config.enableMemoryMonitoring && {
        memoryUsage: this.chromeApi.getMemoryUsage()
      })
    };
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute operation with comprehensive safety measures
   */
  private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`NetworkProcessorModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`NetworkProcessorModule: Operation aborted (${operation})`);
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
        if (duration > 500 && attempt === 0) {
          console.warn(`🐌 NetworkProcessorModule: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ NetworkProcessorModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        console.warn(`⚠️ NetworkProcessorModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`NetworkProcessorModule: Unknown error in ${operation}`);
  }

  /**
   * Get module status for debugging
   */
  getStatus(): {
    initialized: boolean;
    processedCount: number;
    aborted: boolean;
    memoryUsage?: any;
  } {
    return {
      initialized: this.isInitialized,
      processedCount: this.processedCount,
      aborted: this.abortController.signal.aborted,
      ...(this.config.enableMemoryMonitoring && {
        memoryUsage: this.chromeApi.getMemoryUsage()
      })
    };
  }
}
