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
import { UnifiedPermissionService } from '../services/unified-permission-service';
import { LibraryDetector } from '../utils/library-detector';
import {
  NetworkRequestData,
  SafetyConfig
} from '../types/background-types';

export class NetworkProcessorModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly storageManager: StorageManagerModule;
  private readonly tokenTracker: TokenTrackerModule;
  private readonly indexedDbStorage: EnvironmentStorageManager;
  private readonly unifiedPermissionService: UnifiedPermissionService;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private processedCount = 0;

  constructor(
    chromeApi: ChromeApiModule,
    storageManager: StorageManagerModule,
    tokenTracker: TokenTrackerModule,
    indexedDbStorage: EnvironmentStorageManager,
    unifiedPermissionService: UnifiedPermissionService,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
    this.storageManager = storageManager;
    this.tokenTracker = tokenTracker;
    this.indexedDbStorage = indexedDbStorage;
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

      // CHECK PERMISSIONS: Use unified permission system to check if network logging is allowed
      if (tabId && tabUrl) {
        // CRITICAL FIX: Initialize tab permissions from existing user preferences before checking
        // This ensures new tabs respect previously set user preferences instead of defaulting to enabled
        await this.unifiedPermissionService.initializeTabPermissions(tabId, tabUrl);

        const permissionCheck = await this.unifiedPermissionService.canInterceptOnTab(tabId, 'network');
        if (!permissionCheck.canIntercept) {
          console.log(`🚫 NetworkProcessor: Request blocked - ${permissionCheck.reason}`);
          return {
            success: false,
            reason: permissionCheck.reason || 'Network logging disabled',
            blocked: true  // Flag to indicate this was blocked by permissions
          };
        }
      }

      // Get settings for filtering and body sanitization
      const settings = await this.storageManager.getSettings();
      const networkConfig = settings.networkInterception || {};

      // Check if request should be filtered as noise (with backward compatibility)
      const privacyConfig = networkConfig.privacy || {};

      // Debug logging to see what settings we have
      if (url.includes('awswaf') || url.includes('edge.sdk')) {
        console.log('🔍 AWS WAF REQUEST DEBUG:', {
          url: url.substring(0, 80),
          privacyConfig,
          hasNoiseFilters: !!privacyConfig.noiseFilters,
          hasOldFilterNoise: !!(privacyConfig as any).filterNoise
        });
      }

      // Backward compatibility: support old filterNoise setting
      let shouldFilter = false;
      if (privacyConfig.noiseFilters) {
        // New granular filtering system
        shouldFilter = this.isNoiseRequest(url, method, privacyConfig.noiseFilters);
      } else if ((privacyConfig as any).filterNoise) {
        // Old simple filtering system - apply all filters
        const defaultFilters = {
          analytics: true,
          advertising: true,
          socialMedia: true,
          telemetry: true,
          staticAssets: true,
          preflight: true
        };
        shouldFilter = this.isNoiseRequest(url, method, defaultFilters);
      }

      if (shouldFilter) {
        if (url.includes('awswaf') || url.includes('edge.sdk')) {
          console.log('🔇 FILTERED AWS WAF REQUEST:', url.substring(0, 80));
        }
        return { success: false, reason: 'Request filtered as noise' };
      }

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
        // DEBUG: Log size data being processed (remove after debugging)
        if (Math.random() < 0.1) {
          console.log('🔍 BACKGROUND SIZE DEBUG for', validatedRequestData.url?.substring(0, 50), {
            requestData_requestSize: requestData.requestSize,
            requestData_responseSize: requestData.responseSize,
            calculated_payload_size: (requestData.requestSize || 0) + (requestData.responseSize || 0),
            requestData_keys: Object.keys(requestData)
          });
        }

        // Map the request data from main-world-script to storage API format (EXACT COPY FROM MAIN BRANCH)
        // Get body truncation limits from config
        const maxBodySize = networkConfig.bodyCapture?.maxBodySize || 50000; // Default 50KB

        // Truncate bodies during storage to prevent memory issues
        const originalRequestBodySize = requestData.requestBody ? new Blob([requestData.requestBody]).size : 0;
        const originalResponseBodySize = requestData.responseBody ? new Blob([requestData.responseBody]).size : 0;

        const truncatedRequestBody = this.sanitizeBody(requestData.requestBody, maxBodySize) || '';
        const truncatedResponseBody = this.sanitizeBody(
          requestData.responseBody || `Status: ${status} ${requestData.statusText || ''}`,
          maxBodySize
        ) || `Status: ${status} ${requestData.statusText || ''}`;

        const storedRequestBodySize = truncatedRequestBody ? new Blob([truncatedRequestBody]).size : 0;
        const storedResponseBodySize = truncatedResponseBody ? new Blob([truncatedResponseBody]).size : 0;

        // Debug logging for size verification
        if (Math.random() < 0.1) { // Log 10% of requests for debugging
          console.log('🔍 TRUNCATION DEBUG for', validatedRequestData.url?.substring(0, 50), {
            originalSizes: { request: originalRequestBodySize, response: originalResponseBodySize, total: originalRequestBodySize + originalResponseBodySize },
            storedSizes: { request: storedRequestBodySize, response: storedResponseBodySize, total: storedRequestBodySize + storedResponseBodySize },
            payloadSizeField: (requestData.requestSize || 0) + (requestData.responseSize || 0),
            truncationSavings: (originalRequestBodySize + originalResponseBodySize) - (storedRequestBodySize + storedResponseBodySize)
          });
        }

        const apiCallData = {
          url: validatedRequestData.url,
          method: validatedRequestData.method || 'GET',
          headers: JSON.stringify({
            request: requestData.requestHeaders || {},
            response: requestData.responseHeaders || {}
          }),
          // Calculate total payload size properly (ORIGINAL SIZE before truncation)
          payload_size: (requestData.requestSize || 0) + (requestData.responseSize || 0),
          status: status || 0,
          response_body: truncatedResponseBody,
          // Add request body if captured (TRUNCATED for storage)
          request_body: truncatedRequestBody,
          timestamp: requestData.timestamp ? new Date(requestData.timestamp).getTime() : Date.now(),
          // Handle both new and old duration field names
          response_time: requestData.duration || requestData.response_time || null,
          // Add tab context for intelligent domain grouping
          tab_id: tabId,
          tab_url: tabUrl,
          main_domain: mainDomain, // Store the main domain directly for reliable grouping
          // Store new size fields for better data analysis
          request_size: requestData.requestSize || 0,
          response_size: requestData.responseSize || 0,
          // NEW: Store performance metrics if available
          performance_metrics: requestData.performanceMetrics ? JSON.stringify(requestData.performanceMetrics) : undefined
        };

        // LIBRARY DETECTION: Detect libraries asynchronously without blocking storage
        // This runs in parallel with storage to avoid performance impact
        this.detectAndStoreLibraries(validatedRequestData, requestData).catch(error => {
          console.warn('NetworkProcessorModule: Library detection failed (non-blocking):', error);
        });

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
        responseBody: apiCall.response_body || '',
        // Also include frontend-expected field names
        request_body: apiCall.request_body || '',
        response_body: apiCall.response_body || '',
        requestBody: apiCall.request_body || '',
        timestamp: new Date(apiCall.timestamp).toISOString(),
        source_url: apiCall.tab_url || apiCall.url,
        tabId: apiCall.tab_id,
        duration: apiCall.response_time,
        response_time: apiCall.response_time,
        // ADD MISSING SIZE FIELDS
        requestSize: apiCall.request_size || 0,
        responseSize: apiCall.response_size || 0,
        payload_size: apiCall.payload_size || 0,
        request_size: apiCall.request_size || 0,
        response_size: apiCall.response_size || 0,
        performanceMetrics: apiCall.performance_metrics ? JSON.parse(apiCall.performance_metrics) : undefined
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
   * Check if request should be filtered as noise based on enabled filter categories
   */
  private isNoiseRequest(url: string, method: string, noiseFilters: any): boolean {
    const urlLower = url.toLowerCase();

    // Define patterns by category
    const patternCategories = {
      analytics: [
        'google-analytics',
        'googletagmanager',
        'mixpanel.com',
        'amplitude.com',
        'segment.com',
        'hotjar.com',
        'fullstory.com'
      ],
      advertising: [
        'doubleclick.net',
        'googlesyndication',
        'adsystem.google',
        'amazon-adsystem',
        'facebook.com/tr',
        'connect.facebook.net',
        'outbrain.com',
        'taboola.com',
        'adsystem.amazon.com'
      ],
      socialMedia: [
        'analytics.twitter.com',
        'facebook.com/tr',
        'connect.facebook.net',
        'linkedin.com/li',
        'pinterest.com/ct'
      ],
      telemetry: [
        '/telemetry',
        '/ping',
        '/health',
        'telemetry/',
        'awswaf.com',
        'edge.sdk.awswaf',
        'gcprivacy.com',
        'p2.gcprivacy.com',
        'sentry.io',
        'bugsnag.com',
        'rollbar.com',
        'ping.chartbeat.net',
        'quantserve.com',
        'scorecardresearch.com'
      ],
      staticAssets: [
        'favicon.ico',
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
        '.eot',
        '.webp',
        '.ico'
      ],
      preflight: [] // Handled separately by method check
    };

    // Check each enabled filter category
    for (const [category, patterns] of Object.entries(patternCategories)) {
      if (noiseFilters[category] === true) {
        if (patterns.some((pattern: string) => urlLower.includes(pattern))) {
          // Debug logging for AWS WAF specifically
          if (urlLower.includes('awswaf') || urlLower.includes('edge.sdk')) {
            console.log(`🔇 FILTER DEBUG: Blocking ${category} request:`, {
              url: url.substring(0, 80),
              matchedPattern: patterns.find(p => urlLower.includes(p)),
              category
            });
          }
          return true;
        }
      }
    }

    // Handle preflight requests separately (method-based)
    if (noiseFilters.preflight === true && (method === 'HEAD' || method === 'OPTIONS')) {
      return true;
    }

    return false;
  }

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
   * Detect libraries from network request (async, non-blocking)
   * This method runs independently to avoid impacting main request processing
   */
  private async detectAndStoreLibraries(
    validatedRequestData: NetworkRequestData,
    requestData: any
  ): Promise<void> {
    try {
      // Only process JavaScript files to avoid unnecessary processing
      const url = validatedRequestData.url;
      if (!url.toLowerCase().includes('.js') &&
          !url.toLowerCase().includes('javascript') &&
          !url.toLowerCase().includes('application/javascript')) {
        return;
      }

      // Extract headers for library detection
      const headers = validatedRequestData.headers || {};
      const responseBody = requestData.responseBody;

      // Detect libraries using our detection utility
      const detectedLibraries = LibraryDetector.detectFromRequest(url, headers, responseBody);

      // Only store if libraries were detected
      if (detectedLibraries.length > 0) {
        // Log detected libraries (with sampling to avoid spam)
        if (Math.random() < 0.1) { // Log 10% of detections
          console.log(`📚 LibraryDetector: Found ${detectedLibraries.length} libraries in ${url.substring(0, 50)}...`,
            detectedLibraries.map(lib => `${lib.name}${lib.version ? `@${lib.version}` : ''}`));
        }

        // Store each detected library in IndexedDB
        for (const library of detectedLibraries) {
          try {
            await this.indexedDbStorage.insertMinifiedLibrary({
              name: library.name,
              version: library.version || 'unknown',
              size: library.size || 0,
              source_map_available: false, // We don't detect source maps in this context
              url: url,
              timestamp: Date.now()
            });
          } catch (storageError) {
            console.warn('Failed to store library detection:', library.name, storageError);
          }
        }

        console.log(`📚 LibraryDetector: Stored ${detectedLibraries.length} libraries for ${this.extractMainDomain(validatedRequestData.source_url || url)}`);
      }
    } catch (error) {
      // Fail silently to avoid impacting main request processing
      console.warn('NetworkProcessorModule: Library detection error (non-critical):', error);
    }
  }

  /**
   * Get minified libraries from storage
   */
  async getMinifiedLibraries(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      return await this.indexedDbStorage.getMinifiedLibraries(limit, offset);
    } catch (error) {
      console.error('NetworkProcessorModule: Failed to get minified libraries:', error);
      return [];
    }
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
