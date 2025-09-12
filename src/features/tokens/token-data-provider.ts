/**
 * PHASE 3: Token Feature Isolation
 *
 * This file isolates all token-related functionality to prevent it from breaking
 * other features when changes are made to token detection and analysis.
 *
 * SAFETY: Changes to token handling won't affect network or console features
 */

import { TokenEventV1, DataAdapters, SafeTransformers } from '../../shared/contracts/data.contract';
import { TokenMessageBus } from '../../shared/messaging/message-bus';

// Token-specific settings type
export interface TokenSettings {
  enabled: boolean;
  tabSpecific: {
    enabled: boolean;
    defaultState: 'active' | 'paused';
  };
  eventTypes: {
    acquire: boolean;
    refresh: boolean;
    expired: boolean;
    refresh_error: boolean;
    verified: boolean;
    validation_failed: boolean;
    revoked: boolean;
  };
  analysis: {
    enableJwtDecoding: boolean;
    trackExpirationTimes: boolean;
    detectTokenRotation: boolean;
  };
}

// Token analysis result type
export interface TokenAnalysisResult {
  isJwt: boolean;
  algorithm?: string;
  issuer?: string;
  subject?: string;
  audience?: string;
  expiresAt?: string;
  issuedAt?: string;
  notBefore?: string;
  jwtId?: string;
  customClaims?: Record<string, any>;
  securityScore: number; // 0-100 score based on token characteristics
  recommendations: string[];
}

// Token data provider with isolated state management
export class TokenDataProvider {
  private static instance: TokenDataProvider | null = null;
  private cache = new Map<string, TokenEventV1[]>();
  private listeners = new Set<(data: TokenEventV1[]) => void>();
  private cleanupListener: (() => void) | null = null;
  private analysisCache = new Map<string, TokenAnalysisResult>();

  private constructor() {
    // Set up message listener for token updates
    this.cleanupListener = TokenMessageBus.listen(async (message) => {
      try {
        await this.handleTokenMessage(message);
        return {
          success: true,
          timestamp: new Date().toISOString(),
          messageId: message.id || 'unknown'
        };
      } catch (error) {
        // console.error('Token message handler error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Token handler error',
          timestamp: new Date().toISOString(),
          messageId: message.id || 'unknown'
        };
      }
    });
  }

  static getInstance(): TokenDataProvider {
    if (!TokenDataProvider.instance) {
      TokenDataProvider.instance = new TokenDataProvider();
    }
    return TokenDataProvider.instance;
  }

  // Handle incoming token messages
  private async handleTokenMessage(message: any): Promise<void> {
    // Transform raw message data to V1 contract
    const tokenEvent = DataAdapters.tokenEventToV1(message.data);

    // Update cache
    const cacheKey = `tab_${tokenEvent.tabId || 'global'}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, []);
    }

    const tabTokens = this.cache.get(cacheKey)!;
    tabTokens.unshift(tokenEvent); // Add to beginning for recency

    // Limit cache size to prevent memory leaks (keep last 100 token events per tab)
    if (tabTokens.length > 100) {
      tabTokens.splice(100);
    }

    // Notify listeners
    this.notifyListeners(cacheKey);
  }

  // Get token events with pagination and filtering
  async getTokenEvents(options: {
    tabId?: number;
    limit?: number;
    offset?: number;
    filters?: {
      type?: TokenEventV1['type'];
      token_type?: string;
      domain?: string;
      status?: number;
      timeRange?: { start: string; end: string };
    };
  } = {}): Promise<TokenEventV1[]> {
    try {
      // Get from cache first
      const cacheKey = `tab_${options.tabId || 'global'}`;
      let tokens = this.cache.get(cacheKey) || [];

      // If cache is empty, fetch from background
      if (tokens.length === 0) {
        const response = await chrome.runtime.sendMessage({
          action: 'getTokenEvents',
          limit: options.limit || 50,
          offset: options.offset || 0,
          tabId: options.tabId
        });

        if (response?.success && response.data) {
          // Transform raw data to V1 contracts
          tokens = SafeTransformers.transformTokenEvents(response.data);
          this.cache.set(cacheKey, tokens);
        }
      }

      // Apply filters
      if (options.filters) {
        tokens = this.applyFilters(tokens, options.filters);
      }

      // Apply pagination
      const start = options.offset || 0;
      const end = start + (options.limit || 50);

      return tokens.slice(start, end);
    } catch (error) {
      // console.error('Failed to get token events:', error);
      return [];
    }
  }

  // Apply filters to token events
  private applyFilters(
    tokens: TokenEventV1[],
    filters: {
      type?: TokenEventV1['type'];
      token_type?: string;
      domain?: string;
      status?: number;
      timeRange?: { start: string; end: string };
    }
  ): TokenEventV1[] {
    return tokens.filter(token => {
      // Type filter
      if (filters.type && token.type !== filters.type) {
        return false;
      }

      // Token type filter
      if (filters.token_type && token.token_type !== filters.token_type) {
        return false;
      }

      // Domain filter
      if (filters.domain && !token.mainDomain.toLowerCase().includes(filters.domain.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status && token.status !== filters.status) {
        return false;
      }

      // Time range filter
      if (filters.timeRange) {
        const tokenTime = new Date(token.timestamp);
        const startTime = new Date(filters.timeRange.start);
        const endTime = new Date(filters.timeRange.end);

        if (tokenTime < startTime || tokenTime > endTime) {
          return false;
        }
      }

      return true;
    });
  }

  // Store new token event
  async storeTokenEvent(token: Partial<TokenEventV1>): Promise<boolean> {
    try {
      const response = await TokenMessageBus.sendTokenEvent(token);
      return response.success;
    } catch (error) {
      // console.error('Failed to store token event:', error);
      return false;
    }
  }

  // Clear token events
  async clearTokenEvents(tabId?: number): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearTokenEvents',
        tabId
      });

      if (response?.success) {
        // Clear cache
        if (tabId) {
          this.cache.delete(`tab_${tabId}`);
          this.analysisCache.clear(); // Clear analysis cache too
        } else {
          this.cache.clear();
          this.analysisCache.clear();
        }

        // Notify listeners
        this.notifyAllListeners();
        return true;
      }

      return false;
    } catch (error) {
      // console.error('Failed to clear token events:', error);
      return false;
    }
  }

  // Analyze token (JWT decoding, security analysis)
  async analyzeToken(tokenEvent: TokenEventV1): Promise<TokenAnalysisResult> {
    // Check cache first
    const cacheKey = `${tokenEvent.value_hash}_${tokenEvent.token_type}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const analysis = await this.performTokenAnalysis(tokenEvent);

    // Cache result (limit cache size)
    if (this.analysisCache.size > 100) {
      const firstKey = this.analysisCache.keys().next().value;
      if (firstKey) {
        this.analysisCache.delete(firstKey);
      }
    }
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  // Perform detailed token analysis
  private async performTokenAnalysis(tokenEvent: TokenEventV1): Promise<TokenAnalysisResult> {
    const analysis: TokenAnalysisResult = {
      isJwt: false,
      securityScore: 50,
      recommendations: []
    };

    try {
      // Check if it's a JWT token
      if (tokenEvent.token_type.toLowerCase().includes('jwt') || tokenEvent.token_type.toLowerCase().includes('bearer')) {
        analysis.isJwt = true;

        // For JWT analysis, we'd need the actual token value, not just the hash
        // Since we only have the hash, we can make educated guesses based on other data

        // Analyze expiration
        if (tokenEvent.expiry) {
          const expiryDate = new Date(tokenEvent.expiry);
          const now = new Date();
          const timeToExpiry = expiryDate.getTime() - now.getTime();

          analysis.expiresAt = tokenEvent.expiry;

          if (timeToExpiry < 0) {
            analysis.recommendations.push('Token has expired');
            analysis.securityScore -= 20;
          } else if (timeToExpiry < 5 * 60 * 1000) { // 5 minutes
            analysis.recommendations.push('Token expires soon');
            analysis.securityScore -= 10;
          }
        }

        // Analyze URL patterns for issuer hints
        const url = tokenEvent.url.toLowerCase();
        if (url.includes('auth0')) {
          analysis.issuer = 'Auth0';
        } else if (url.includes('okta')) {
          analysis.issuer = 'Okta';
        } else if (url.includes('firebase')) {
          analysis.issuer = 'Firebase';
        } else if (url.includes('cognito')) {
          analysis.issuer = 'AWS Cognito';
        }
      }

      // Analyze token security based on event type
      switch (tokenEvent.type) {
        case 'acquire':
          analysis.securityScore += 10;
          break;
        case 'refresh':
          analysis.securityScore += 5;
          analysis.recommendations.push('Token refresh detected - good security practice');
          break;
        case 'expired':
          analysis.securityScore -= 15;
          analysis.recommendations.push('Token expiration handled properly');
          break;
        case 'refresh_error':
          analysis.securityScore -= 10;
          analysis.recommendations.push('Token refresh failed - check authentication flow');
          break;
        case 'revoked':
          analysis.securityScore -= 5;
          analysis.recommendations.push('Token revoked - security measure activated');
          break;
      }

      // Analyze HTTP method and status
      if (tokenEvent.method === 'POST' && tokenEvent.status >= 200 && tokenEvent.status < 300) {
        analysis.securityScore += 5;
      } else if (tokenEvent.status >= 400) {
        analysis.securityScore -= 10;
        analysis.recommendations.push('Authentication request failed');
      }

      // Domain-based analysis
      if (tokenEvent.url.startsWith('https://')) {
        analysis.securityScore += 10;
      } else {
        analysis.securityScore -= 20;
        analysis.recommendations.push('Token transmitted over insecure connection');
      }

      // Ensure score is within bounds
      analysis.securityScore = Math.max(0, Math.min(100, analysis.securityScore));

    } catch (error) {
      // console.error('Token analysis error:', error);
      analysis.recommendations.push('Analysis failed - token format may be invalid');
    }

    return analysis;
  }

  // Subscribe to token data updates
  subscribe(listener: (data: TokenEventV1[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify specific tab listeners
  private notifyListeners(cacheKey: string): void {
    const data = this.cache.get(cacheKey) || [];
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        // console.error('Token listener error:', error);
      }
    });
  }

  // Notify all listeners
  private notifyAllListeners(): void {
    this.listeners.forEach(listener => {
      try {
        // Combine all cached data
        const allData: TokenEventV1[] = [];
        this.cache.forEach(tabData => {
          allData.push(...tabData);
        });
        listener(allData);
      } catch (error) {
        // console.error('Token listener error:', error);
      }
    });
  }

  // Get token statistics
  getTokenStats(tabId?: number): {
    totalTokenEvents: number;
    eventsByType: Record<string, number>;
    tokensByType: Record<string, number>;
    topDomains: Array<{ domain: string; count: number }>;
    securityScore: number;
    activeTokens: number;
    expiredTokens: number;
  } {
    const cacheKey = tabId ? `tab_${tabId}` : null;
    let tokens: TokenEventV1[] = [];

    if (cacheKey) {
      tokens = this.cache.get(cacheKey) || [];
    } else {
      // Combine all tabs
      this.cache.forEach(tabData => {
        tokens.push(...tabData);
      });
    }

    // Calculate statistics
    const totalTokenEvents = tokens.length;

    // Events by type
    const eventsByType: Record<string, number> = {};
    tokens.forEach(t => {
      eventsByType[t.type] = (eventsByType[t.type] || 0) + 1;
    });

    // Tokens by type
    const tokensByType: Record<string, number> = {};
    tokens.forEach(t => {
      tokensByType[t.token_type] = (tokensByType[t.token_type] || 0) + 1;
    });

    // Top domains
    const domainCounts: Record<string, number> = {};
    tokens.forEach(t => {
      domainCounts[t.mainDomain] = (domainCounts[t.mainDomain] || 0) + 1;
    });

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Security score (average of recent tokens)
    const recentTokens = tokens.slice(0, 20); // Last 20 tokens
    let totalSecurityScore = 0;
    let analyzedCount = 0;

    for (const token of recentTokens) {
      const cacheKey = `${token.value_hash}_${token.token_type}`;
      if (this.analysisCache.has(cacheKey)) {
        totalSecurityScore += this.analysisCache.get(cacheKey)!.securityScore;
        analyzedCount++;
      }
    }

    const securityScore = analyzedCount > 0 ? Math.round(totalSecurityScore / analyzedCount) : 50;

    // Active vs expired tokens
    const now = new Date();
    let activeTokens = 0;
    let expiredTokens = 0;

    tokens.forEach(t => {
      if (t.expiry) {
        const expiryDate = new Date(t.expiry);
        if (expiryDate > now) {
          activeTokens++;
        } else {
          expiredTokens++;
        }
      }
    });

    return {
      totalTokenEvents,
      eventsByType,
      tokensByType,
      topDomains,
      securityScore,
      activeTokens,
      expiredTokens
    };
  }

  // Cleanup resources
  cleanup(): void {
    if (this.cleanupListener) {
      this.cleanupListener();
      this.cleanupListener = null;
    }
    this.cache.clear();
    this.listeners.clear();
    this.analysisCache.clear();
  }

  // Static cleanup for extension unload
  static cleanup(): void {
    if (TokenDataProvider.instance) {
      TokenDataProvider.instance.cleanup();
      TokenDataProvider.instance = null;
    }
  }
}

// Export singleton instance
export const tokenDataProvider = TokenDataProvider.getInstance();

// Token utility functions isolated from other features
export class TokenUtils {
  // Generate secure token hash
  static async generateTokenHash(tokenValue: string, additionalData?: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenValue + (additionalData || ''));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Check if string looks like a JWT
  static isJwtFormat(tokenValue: string): boolean {
    const parts = tokenValue.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Extract token from header
  static extractTokenFromHeader(authHeader: string): string | null {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      return bearerMatch[1];
    }

    const basicMatch = authHeader.match(/^Basic\s+(.+)$/i);
    if (basicMatch) {
      return basicMatch[1];
    }

    return null;
  }

  // Detect token type from context
  static detectTokenType(url: string, headers: Record<string, string> = {}): string {
    const authHeader = headers['authorization'] || headers['Authorization'] || '';

    if (authHeader.toLowerCase().startsWith('bearer')) {
      return 'jwt_token';
    }

    if (authHeader.toLowerCase().startsWith('basic')) {
      return 'basic_auth';
    }

    if (headers['x-api-key'] || headers['X-API-Key']) {
      return 'api_key';
    }

    if (url.includes('oauth') || url.includes('auth')) {
      return 'oauth_token';
    }

    if (headers['cookie'] || headers['Cookie']) {
      return 'session_token';
    }

    return 'unknown_token';
  }

  // Estimate token expiration from JWT
  static estimateTokenExpiration(tokenValue: string): string | null {
    if (!this.isJwtFormat(tokenValue)) {
      return null;
    }

    try {
      const [, payload] = tokenValue.split('.');
      const decodedPayload = JSON.parse(atob(payload));

      if (decodedPayload.exp) {
        return new Date(decodedPayload.exp * 1000).toISOString();
      }
    } catch (error) {
      // console.warn('Failed to decode JWT payload:', error);
    }

    return null;
  }

  // Check if token should be logged based on settings
  static shouldLogToken(tokenEvent: Partial<TokenEventV1>, settings: TokenSettings): boolean {
    if (!settings.enabled) {
      return false;
    }

    // Check event type filter
    const eventType = tokenEvent.type || 'acquire';
    return settings.eventTypes[eventType] !== false;
  }
}

// Cleanup function for extension lifecycle
export function cleanupTokenFeature(): void {
  TokenDataProvider.cleanup();
}
