/**
 * Token Tracker Module - Advanced Token Detection and Management
 *
 * Handles comprehensive token detection, classification, and event tracking.
 * Extracted from the original background script's complex token detection system
 * with enhanced safety and modular architecture.
 */

import { ChromeApiModule } from '../shared/chrome-api.module';
import { EnvironmentStorageManager } from '../environment-storage-manager';
import {
  TokenEvent,
  NetworkRequestData,
  SafetyConfig,
  TokenEndpoints
} from '../types/background-types';

export class TokenTrackerModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly indexedDbStorage: EnvironmentStorageManager;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;

  // Enhanced token endpoint patterns from original background script
  private readonly TOKEN_ENDPOINTS: TokenEndpoints = {
    acquire: [
      '/auth', '/login', '/token', '/signin', '/authenticate', '/oauth',
      '/api/auth', '/api/login', '/api/token', '/api/signin', '/api/authenticate',
      '/v1/auth', '/v2/auth', '/v3/auth', '/session', '/sso', '/connect',
      '/security/token', '/identity/token', '/oidc/token', '/oauth2/token',
      '/auth/callback', '/saml/sso', '/cas/login', '/ldap/auth',
      '/api/v1/auth', '/api/v2/auth', '/graphql/auth', '/rest/auth',
      '/mobile/auth', '/web/auth', '/client/auth', '/service/auth'
    ],
    refresh: [
      '/refresh', '/renew', '/reauth', '/token/refresh', '/auth/refresh',
      '/api/refresh', '/api/renew', '/api/reauth', '/api/token/refresh',
      '/v1/refresh', '/v2/refresh', '/v3/refresh', '/session/refresh',
      '/oauth/refresh', '/oauth2/refresh', '/oidc/refresh', '/jwt/refresh',
      '/security/refresh', '/identity/refresh', '/auth/renew',
      '/api/v1/refresh', '/api/v2/refresh', '/token/renew'
    ]
  };

  constructor(
    chromeApi: ChromeApiModule,
    indexedDbStorage: EnvironmentStorageManager,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
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
    console.log('🔐 TokenTrackerModule: Initialized with IndexedDB storage for token events');
  }

  /**
   * Initialize token tracker module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('TokenTrackerModule: Already initialized');
      return;
    }

    try {
      // Verify dependencies are initialized
      if (!this.chromeApi.isExtensionContextValid()) {
        throw new Error('Chrome API module not properly initialized');
      }

      this.isInitialized = true;
      console.log('✅ TokenTrackerModule: Successfully initialized');
    } catch (error) {
      console.error('❌ TokenTrackerModule: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup(): void {
    if (this.config.enableAbortController) {
      this.abortController.abort('TokenTrackerModule cleanup');
    }

    this.isInitialized = false;
    console.log('🧹 TokenTrackerModule: Cleanup completed');
  }

  // ===== TOKEN DETECTION =====

  /**
   * Detect token events from network requests
   */
  async detectTokenEvent(requestData: NetworkRequestData): Promise<TokenEvent | null> {
    return this.executeWithSafety('detectTokenEvent', async () => {
      const { url, method, status, headers, timestamp } = requestData;

      if (!url || !method || status === undefined) {
        return null;
      }

      // Check if this is a token-related endpoint
      const isAcquireEndpoint = this.isTokenEndpoint(url, 'acquire');
      const isRefreshEndpoint = this.isTokenEndpoint(url, 'refresh');

      if (!isAcquireEndpoint && !isRefreshEndpoint) {
        return null;
      }

      // Determine token event type based on endpoint and response status
      let eventType: TokenEvent['type'];

      if (isRefreshEndpoint) {
        if (status >= 200 && status < 300) {
          eventType = 'refresh';
        } else if (status === 401 || status === 403) {
          eventType = 'refresh_error';
        } else {
          eventType = 'expired';
        }
      } else if (isAcquireEndpoint) {
        if (status >= 200 && status < 300) {
          eventType = 'acquire';
        } else if (status === 401 || status === 403) {
          eventType = 'validation_failed';
        } else {
          return null; // Don't track failed acquisition attempts as token events
        }
      } else {
        return null;
      }

      // Extract token expiry if available
      const expiry = this.extractTokenExpiry(headers);

      // Generate token hash for identification
      const valueHash = await this.generateTokenHash(url, timestamp, eventType, method);

      const tokenEvent: TokenEvent = {
        type: eventType,
        url,
        method,
        status,
        timestamp: timestamp || new Date().toISOString(),
        source_url: requestData.source_url || url,
        valueHash,
        ...(expiry && { expiry })
      };

      console.log(`🔐 TokenTrackerModule: Detected ${eventType} event for ${this.extractDomain(url)}`);

      // Store the token event in IndexedDB using the same format as origin/main
      try {
        // Convert eventType to match IndexedDB TokenEvent schema
        const tokenType = this.mapEventTypeToTokenType(eventType);

        // Extract tab information (if available from requestData)
        const tabId = requestData.tabId;
        const tabUrl = requestData.source_url;
        const mainDomain = tabUrl ? this.extractDomain(tabUrl) : this.extractDomain(url);

        const tokenEventData = {
          type: tokenType as 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token',
          valueHash,
          timestamp: timestamp ? new Date(timestamp).getTime() : Date.now(),
          source_url: requestData.source_url || url,
          expiry: expiry ? new Date(expiry).getTime() : undefined,
          status,
          method,
          url,
          tab_id: tabId,
          tab_url: tabUrl,
          main_domain: mainDomain
        };

        // Use IndexedDB storage with race condition protection
        if (this.config.enableRaceConditionProtection) {
          await this.indexedDbStorage.insertTokenEvent(tokenEventData);
        } else {
          // Fire and forget for performance (not recommended)
          this.indexedDbStorage.insertTokenEvent(tokenEventData).catch(error =>
            console.warn('TokenTrackerModule: IndexedDB storage failed:', error)
          );
        }

        console.log(`🗄️ TokenTrackerModule: Stored token event in IndexedDB`);

        // Notify dashboard about new data
        this.sendDataUpdatedNotification('token_event');
      } catch (storageError) {
        console.error('TokenTrackerModule: IndexedDB storage failed:', storageError);
        // Continue processing even if storage fails
      }

      return tokenEvent;
    });
  }

  // ===== TOKEN TYPE DETECTION =====

  /**
   * Enhanced token type detection based on headers and context
   */
  detectTokenTypeFromHeaders(headers: any, url: string): string {
    if (!headers || typeof headers !== 'object') return 'Unknown';

    // Parse headers if they're stored as JSON string
    let headersObj = headers;
    if (typeof headers === 'string') {
      try {
        headersObj = JSON.parse(headers);
      } catch {
        return 'Unknown';
      }
    }

    const authHeader = headersObj.authorization || headersObj.Authorization || '';
    const cookieHeader = headersObj.cookie || headersObj.Cookie || '';
    const csrfHeader = headersObj['x-csrf-token'] || headersObj['X-CSRF-Token'] ||
                       headersObj['csrf-token'] || headersObj['CSRF-Token'] || '';
    const apiKeyHeader = headersObj['x-api-key'] || headersObj['X-API-Key'] ||
                         headersObj['api-key'] || headersObj['API-Key'] ||
                         headersObj['apikey'] || headersObj['ApiKey'] || '';

    // Enhanced Bearer Token Analysis
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (this.isJwt(token)) {
        const payload = this.getJwtPayload(token);

        if (payload) {
          // Enhanced ID Token detection (OpenID Connect)
          if (payload.sub && (payload.email || payload.name || payload.preferred_username) &&
              (payload.aud || payload.azp)) {
            return 'ID Token (JWT)';
          }

          // Enhanced Access Token detection
          if (payload.scope || payload.scp || payload.permissions ||
              (payload.aud && !payload.email && !payload.name)) {
            return 'Access Token (JWT)';
          }

          // Refresh Token detection
          if (payload.use === 'refresh' || payload.token_use === 'refresh' ||
              url.includes('/refresh') || url.includes('/renew')) {
            return 'Refresh Token (JWT)';
          }

          // Role-based tokens
          if (payload.roles || payload.groups || payload.authorities) {
            return 'Role Token (JWT)';
          }

          // Service-to-service tokens
          if (payload.client_id && !payload.sub) {
            return 'Service Token (JWT)';
          }
        }

        // Fallback for JWT tokens
        if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
          return 'Refresh Token (JWT)';
        }

        return 'Access Token (JWT)';
      } else {
        // Enhanced Opaque Bearer tokens analysis
        if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
          return 'Refresh Token (Opaque)';
        }

        // Check token length patterns for classification
        if (token.length > 200) {
          return 'Long-lived Token (Opaque)';
        } else if (token.length < 50) {
          return 'Short Token (Opaque)';
        }

        return 'Access Token (Opaque)';
      }
    }

    // Enhanced Basic Authentication
    if (authHeader.startsWith('Basic ')) {
      return 'Basic Auth';
    }

    // Enhanced API Key Authentication
    if (authHeader.startsWith('ApiKey ') || authHeader.startsWith('API-Key ') ||
        authHeader.startsWith('X-API-Key ')) {
      return 'API Key (Header)';
    }

    // Custom API Key Headers
    if (apiKeyHeader) {
      return 'API Key (Custom)';
    }

    // Enhanced CSRF Token Detection
    if (csrfHeader) {
      return 'CSRF Token';
    }

    // Enhanced Session Token Detection (Cookies)
    if (cookieHeader) {
      const sessionPatterns = [
        'sessionid=', 'session=', 'JSESSIONID=', 'PHPSESSID=',
        'ASP.NET_SessionId=', 'connect.sid=', 'express:sess=',
        'laravel_session=', 'django_session=', 'flask.session='
      ];

      if (sessionPatterns.some(pattern => cookieHeader.includes(pattern))) {
        return 'Session Token (Cookie)';
      }

      if (cookieHeader.includes('access_token=')) {
        return 'Access Token (Cookie)';
      }

      if (cookieHeader.includes('refresh_token=')) {
        return 'Refresh Token (Cookie)';
      }

      // JWT in cookies
      const jwtPattern = /[=\s]([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/;
      const jwtMatch = cookieHeader.match(jwtPattern);
      if (jwtMatch) {
        return 'JWT Token (Cookie)';
      }
    }

    // Enhanced State Token Detection
    if (url.includes('state=') || headersObj['x-state-token'] || headersObj['X-State-Token']) {
      return 'State Token (OAuth)';
    }

    // Enhanced Custom Authorization schemes
    if (authHeader && !authHeader.startsWith('Bearer ') && !authHeader.startsWith('Basic ')) {
      const scheme = authHeader.split(' ')[0];

      // Common custom schemes
      const knownSchemes: { [key: string]: string } = {
        'Digest': 'Digest Auth',
        'OAuth': 'OAuth Token',
        'MAC': 'MAC Token',
        'HMAC': 'HMAC Token',
        'Signature': 'Signature Auth',
        'Token': 'Custom Token'
      };

      return knownSchemes[scheme] || `${scheme} Token`;
    }

    // Response body token detection
    if (headersObj['content-type']?.includes('application/json')) {
      return 'Response Token (JSON)';
    }

    return 'Unknown';
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if URL matches token endpoint patterns
   */
  private isTokenEndpoint(url: string, type: 'acquire' | 'refresh'): boolean {
    const patterns = this.TOKEN_ENDPOINTS[type];
    return patterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  /**
   * Check if token is a JWT (3 parts separated by dots)
   */
  private isJwt(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Enhanced JWT payload analysis
   */
  private getJwtPayload(token: string): any {
    try {
      if (!this.isJwt(token)) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Extract token expiry from headers
   */
  private extractTokenExpiry(headers: any): number | undefined {
    if (!headers || typeof headers !== 'object') return undefined;

    // Parse headers if they're stored as JSON string
    let headersObj = headers;
    if (typeof headers === 'string') {
      try {
        headersObj = JSON.parse(headers);
      } catch {
        return undefined;
      }
    }

    // Check multiple possible authorization header variations
    const authHeaders = [
      headersObj.authorization,
      headersObj.Authorization,
      headersObj['Authorization'],
      headersObj['authorization']
    ].filter(Boolean);

    for (const authHeader of authHeaders) {
      if (typeof authHeader === 'string') {
        // Check for Bearer token (most common for JWT)
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const expiry = this.extractJwtExpiry(token);
          if (expiry) return expiry;
        }

        // Check for other token formats that might contain JWT
        if (authHeader.includes('.') && authHeader.split('.').length === 3) {
          const expiry = this.extractJwtExpiry(authHeader);
          if (expiry) return expiry;
        }
      }
    }

    // Also check cookies for JWT tokens
    const cookieHeader = headersObj.cookie || headersObj.Cookie || '';
    if (cookieHeader) {
      // Look for JWT patterns in cookies
      const jwtPattern = /[=\s]([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g;
      let match;
      while ((match = jwtPattern.exec(cookieHeader)) !== null) {
        const expiry = this.extractJwtExpiry(match[1]);
        if (expiry) return expiry;
      }
    }

    return undefined;
  }

  /**
   * Helper to extract expiry from JWT token string
   */
  private extractJwtExpiry(token: string): number | undefined {
    try {
      // Check if it's a JWT (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3 || parts.some(part => part.length === 0)) {
        return undefined;
      }

      // Decode JWT payload (second part)
      const payload = JSON.parse(atob(parts[1]));

      // Extract expiry timestamp (standard 'exp' claim)
      if (payload.exp && typeof payload.exp === 'number') {
        console.log('🔐 JWT expiry extracted:', new Date(payload.exp * 1000));
        return payload.exp; // JWT exp is in seconds since epoch
      }

      // Also check for other expiry claims
      if (payload.expires_at && typeof payload.expires_at === 'number') {
        return payload.expires_at;
      }

      if (payload.expiry && typeof payload.expiry === 'number') {
        return payload.expiry;
      }

    } catch (error) {
      console.log('🔐 Failed to decode JWT for expiry:', error);
    }

    return undefined;
  }

  /**
   * Generate deterministic hash for token identification
   */
  private async generateTokenHash(url: string, timestamp: string, tokenType: string, method: string): Promise<string> {
    // Create a deterministic string from metadata
    const dataToHash = `${url}-${timestamp}-${tokenType}-${method}`;

    // Simple deterministic hash for display purposes
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to hex and create a realistic looking hash
    const simpleHash = Math.abs(hash).toString(16).padStart(8, '0');
    const longHash = simpleHash + (hash * 7).toString(16).slice(-8).padStart(8, '0') +
                     (hash * 13).toString(16).slice(-8).padStart(8, '0') +
                     (hash * 17).toString(16).slice(-8).padStart(8, '0');

    return longHash.slice(0, 40); // Return a 40-character hex string like SHA-1
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Map event type to IndexedDB TokenEvent type format
   */
  private mapEventTypeToTokenType(eventType: string): string {
    switch (eventType) {
      case 'acquire':
      case 'refresh':
        return 'jwt_token'; // Most common token type
      case 'expired':
      case 'validation_failed':
        return 'session_token'; // Expired tokens are often session tokens
      default:
        return 'api_key'; // Default fallback
    }
  }

  // ===== DATA RETRIEVAL =====

  /**
   * Map IndexedDB token type back to event type
   */
  private mapTokenTypeToEventType(tokenType: string): 'acquire' | 'refresh' | 'expired' | 'refresh_error' | 'verified' | 'validation_failed' | 'revoked' {
    switch (tokenType) {
      case 'jwt_token':
        return 'acquire';
      case 'session_token':
        return 'expired';
      case 'api_key':
        return 'acquire';
      case 'oauth_token':
        return 'refresh';
      default:
        return 'acquire';
    }
  }

  /**
   * Get token events with pagination (from IndexedDB)
   */
  async getTokenEvents(limit = 50, offset = 0): Promise<TokenEvent[]> {
    return this.executeWithSafety('getTokenEvents', async () => {
      // Get data from IndexedDB instead of Chrome storage
      const tokenEvents = await this.indexedDbStorage.getTokenEvents(limit, offset);

      // Transform IndexedDB TokenEvent format to module TokenEvent format for compatibility
      return tokenEvents.map(event => ({
        type: this.mapTokenTypeToEventType(event.type),
        url: event.url || '',
        method: event.method || '',
        status: event.status || 0,
        timestamp: new Date(event.timestamp).toISOString(),
        source_url: event.source_url || event.url || '',
        expiry: event.expiry ? new Date(event.expiry).getTime() : undefined,
        value_hash: event.valueHash
      }));
    });
  }

  /**
   * Get total count of token events
   */
  async getTokenEventsCount(): Promise<number> {
    return this.executeWithSafety('getTokenEventsCount', async () => {
      const counts = await this.indexedDbStorage.getTableCounts();
      return counts.tokenEvents || 0;
    });
  }

  /**
   * Send notification to dashboard about data updates
   */
  private sendDataUpdatedNotification(type: string) {
    try {
      chrome.runtime.sendMessage({ action: 'DATA_UPDATED', type });
    } catch (error) {
      // This will fail if no dashboard is open, which is normal
      console.debug('TokenTrackerModule: Failed to send data update notification:', error);
    }
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute operation with comprehensive safety measures
   */
  private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`TokenTrackerModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`TokenTrackerModule: Operation aborted (${operation})`);
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
          console.warn(`🐌 TokenTrackerModule: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ TokenTrackerModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        console.warn(`⚠️ TokenTrackerModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`TokenTrackerModule: Unknown error in ${operation}`);
  }

  /**
   * Get module status for debugging
   */
  getStatus(): {
    initialized: boolean;
    endpointPatternsLoaded: boolean;
    aborted: boolean;
  } {
    return {
      initialized: this.isInitialized,
      endpointPatternsLoaded: this.TOKEN_ENDPOINTS.acquire.length > 0 && this.TOKEN_ENDPOINTS.refresh.length > 0,
      aborted: this.abortController.signal.aborted
    };
  }
}
