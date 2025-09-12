/**
 * PHASE 3: Network Feature Isolation
 *
 * This file isolates all network-related functionality to prevent it from breaking
 * other features when changes are made to network interception logic.
 *
 * SAFETY: Changes to network handling won't affect console or token features
 */

import { NetworkRequestV1, DataAdapters, SafeTransformers } from '../../shared/contracts/data.contract';
import { NetworkMessageBus } from '../../shared/messaging/message-bus';

// Network-specific settings type
export interface NetworkSettings {
  enabled: boolean;
  bodyCapture: {
    enabled: boolean;
    mode: 'status_only' | 'full';
    maxBodySize: number;
  };
  tabSpecific: {
    enabled: boolean;
    defaultState: 'active' | 'paused';
  };
  filtering: {
    domainWhitelist: string[];
    domainBlacklist: string[];
    pathFilters: string[];
  };
}

// Network data provider with isolated state management
export class NetworkDataProvider {
  private static instance: NetworkDataProvider | null = null;
  private cache = new Map<string, NetworkRequestV1[]>();
  private listeners = new Set<(data: NetworkRequestV1[]) => void>();
  private cleanupListener: (() => void) | null = null;

  private constructor() {
    // Set up message listener for network updates
    this.cleanupListener = NetworkMessageBus.listen(async (message) => {
      try {
        await this.handleNetworkMessage(message);
        return {
          success: true,
          timestamp: new Date().toISOString(),
          messageId: message.id || 'unknown'
        };
      } catch (error) {
        // console.error('Network message handler error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network handler error',
          timestamp: new Date().toISOString(),
          messageId: message.id || 'unknown'
        };
      }
    });
  }

  static getInstance(): NetworkDataProvider {
    if (!NetworkDataProvider.instance) {
      NetworkDataProvider.instance = new NetworkDataProvider();
    }
    return NetworkDataProvider.instance;
  }

  // Handle incoming network messages
  private async handleNetworkMessage(message: any): Promise<void> {
    // Transform raw message data to V1 contract
    const _networkRequest = DataAdapters.networkRequestToV1(message.data);

    // Update cache
    const _cacheKey = `tab_${ networkRequest.tabId || 'global' }`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, []);
    }

    const _tabRequests = this.cache.get(cacheKey)!;
    tabRequests.unshift(networkRequest); // Add to beginning for recency

    // Limit cache size to prevent memory leaks (keep last 100 requests per tab)
    if (tabRequests.length > 100) {
      tabRequests.splice(100);
    }

    // Notify listeners
    this.notifyListeners(cacheKey);
  }

  // Get network requests with pagination and filtering
  async getNetworkRequests(options: {
    tabId?: number;
    limit?: number;
    offset?: number;
    filters?: {
      domain?: string;
      method?: string;
      status?: number;
      timeRange?: { start: string; end: string };
    };
  } = {}): Promise<NetworkRequestV1[]> {
    try {
      // Get from cache first
      const _cacheKey = `tab_${ options.tabId || 'global' }`;
      let _requests = this.cache.get(cacheKey) || [];

      // If cache is empty, fetch from background
      if (requests.length === 0) {
        const _response = await chrome.runtime.sendMessage({
          action: 'getNetworkRequests',
          limit: options.limit || 50,
          offset: options.offset || 0,
          tabId: options.tabId
        });

        if (response?.success && response.data) {
          // Transform raw data to V1 contracts
          requests = SafeTransformers.transformNetworkRequests(response.data);
          this.cache.set(cacheKey, requests);
        }
      }

      // Apply filters
      if (options.filters) {
        requests = this.applyFilters(requests, options.filters);
      }

      // Apply pagination
      const _start = options.offset || 0;
      const _end = start + (options.limit || 50);

      return requests.slice(start, end);
    } catch (error) {
      // console.error('Failed to get network requests:', error);
      return [];
    }
  }

  // Apply filters to network requests
  private applyFilters(
    requests: NetworkRequestV1[],
    filters: {
      domain?: string;
      method?: string;
      status?: number;
      timeRange?: { start: string; end: string };
    }
  ): NetworkRequestV1[] {
    return requests.filter(request => {
      // Domain filter
      if (filters.domain && !request.url.toLowerCase().includes(filters.domain.toLowerCase())) {
        return false;
      }

      // Method filter
      if (filters.method && request.method !== filters.method) {
        return false;
      }

      // Status filter
      if (filters.status && request.status !== filters.status) {
        return false;
      }

      // Time range filter
      if (filters.timeRange) {
        const _requestTime = new Date(request.timestamp);
        const _startTime = new Date(filters.timeRange.start);
        const _endTime = new Date(filters.timeRange.end);

        if (requestTime < startTime || requestTime > endTime) {
          return false;
        }
      }

      return true;
    });
  }

  // Store new network request
  async storeNetworkRequest(request: Partial<NetworkRequestV1>): Promise<boolean> {
    try {
      const _response = await NetworkMessageBus.sendNetworkRequest(request);
      return response.success;
    } catch (error) {
      // console.error('Failed to store network request:', error);
      return false;
    }
  }

  // Clear network requests
  async clearNetworkRequests(tabId?: number): Promise<boolean> {
    try {
      const _response = await chrome.runtime.sendMessage({
        action: 'clearNetworkRequests',
        tabId
      });

      if (response?.success) {
        // Clear cache
        if (tabId) {
          this.cache.delete(`tab_${tabId}`);
        } else {
          this.cache.clear();
        }

        // Notify listeners
        this.notifyAllListeners();
        return true;
      }

      return false;
    } catch (error) {
      // console.error('Failed to clear network requests:', error);
      return false;
    }
  }

  // Subscribe to network data updates
  subscribe(listener: (data: NetworkRequestV1[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify specific tab listeners
  private notifyListeners(cacheKey: string): void {
    const _data = this.cache.get(cacheKey) || [];
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        // console.error('Network listener error:', error);
      }
    });
  }

  // Notify all listeners
  private notifyAllListeners(): void {
    this.listeners.forEach(listener => {
      try {
        // Combine all cached data
        const allData: NetworkRequestV1[] = [];
        this.cache.forEach(tabData => {
          allData.push(...tabData);
        });
        listener(allData);
      } catch (error) {
        // console.error('Network listener error:', error);
      }
    });
  }

  // Get network statistics
  getNetworkStats(tabId?: number): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    topDomains: Array<{ domain: string; count: number }>;
    methodDistribution: Record<string, number>;
    statusDistribution: Record<number, number>;
  } {
    const _cacheKey = tabId ? `tab_${ tabId }` : null;
    let requests: NetworkRequestV1[] = [];

    if (cacheKey) {
      requests = this.cache.get(cacheKey) || [];
    } else {
      // Combine all tabs
      this.cache.forEach(tabData => {
        requests.push(...tabData);
      });
    }

    // Calculate statistics
    const _totalRequests = requests.length;
    const _successfulRequests = requests.filter(r => r.status >= 200 && r.status < 400).length;
    const _successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Method distribution
    const methodDistribution: Record<string, number> = {};
    requests.forEach(r => {
      methodDistribution[r.method] = (methodDistribution[r.method] || 0) + 1;
    });

    // Status distribution
    const statusDistribution: Record<number, number> = {};
    requests.forEach(r => {
      statusDistribution[r.status] = (statusDistribution[r.status] || 0) + 1;
    });

    // Top domains
    const domainCounts: Record<string, number> = {};
    requests.forEach(r => {
      domainCounts[r.mainDomain] = (domainCounts[r.mainDomain] || 0) + 1;
    });

    const _topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      successRate,
      averageResponseTime: 0, // Would need response time data
      topDomains,
      methodDistribution,
      statusDistribution
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
  }

  // Static cleanup for extension unload
  static cleanup(): void {
    if (NetworkDataProvider.instance) {
      NetworkDataProvider.instance.cleanup();
      NetworkDataProvider.instance = null;
    }
  }
}

// Export singleton instance
export const _networkDataProvider = NetworkDataProvider.getInstance();

// Network utility functions isolated from other features
export class NetworkUtils {
  // Parse URL safely
  static parseUrl(url: string): { protocol: string; hostname: string; pathname: string; domain: string } {
    try {
      const _urlObj = new URL(url);
      return {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        domain: this.extractDomain(urlObj.hostname)
      };
    } catch {
      return {
        protocol: '',
        hostname: '',
        pathname: '',
        domain: 'unknown'
      };
    }
  }

  // Extract main domain from hostname
  static extractDomain(hostname: string): string {
    const _parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  // Check if URL should be intercepted
  static shouldInterceptUrl(url: string, settings: NetworkSettings): boolean {
    try {
      const { hostname, protocol } = new URL(url);

      // Skip non-HTTP(S) protocols
      if (!protocol.startsWith('http')) {
        return false;
      }

      // Check blacklist first
      if (settings.filtering.domainBlacklist.some(domain => hostname.includes(domain))) {
        return false;
      }

      // If whitelist exists, check it
      if (settings.filtering.domainWhitelist.length > 0) {
        return settings.filtering.domainWhitelist.some(domain => hostname.includes(domain));
      }

      return true;
    } catch {
      return false;
    }
  }

  // Sanitize request body for storage
  static sanitizeRequestBody(body: string | undefined, maxSize: number): string | undefined {
    if (!body) return undefined;

    // Truncate if too large
    if (body.length > maxSize) {
      return body.substring(0, maxSize) + '\n[Truncated - exceeded size limit]';
    }

    return body;
  }

  // Parse headers safely
  static parseHeaders(headers: any): { request: Record<string, string>; response: Record<string, string> } {
    const _defaultHeaders = { request: { }, response: {} };

    try {
      if (typeof headers === 'string') {
        return JSON.parse(headers);
      } else if (headers && typeof headers === 'object') {
        return {
          request: headers.request || {},
          response: headers.response || {}
        };
      }
    } catch (error) {
      // console.warn('Failed to parse headers:', error);
    }

    return defaultHeaders;
  }
}

// Cleanup function for extension lifecycle
export function cleanupNetworkFeature(): void {
  NetworkDataProvider.cleanup();
}
