/**
 * PHASE 3: Console Feature Isolation
 *
 * This file isolates all console-related functionality to prevent it from breaking
 * other features when changes are made to console error handling.
 *
 * SAFETY: Changes to console handling won't affect network or token features
 */

import { ConsoleErrorV1, DataAdapters, SafeTransformers } from '../../shared/contracts/data.contract';
import { ConsoleMessageBus } from '../../shared/messaging/message-bus';

// Console-specific settings type
export interface ConsoleSettings {
  enabled: boolean;
  severityFilter: {
    error: boolean;
    warn: boolean;
    info: boolean;
    log: boolean;
  };
  tabSpecific: {
    enabled: boolean;
    defaultState: 'active' | 'paused';
  };
  formatting: {
    maxMessageLength: number;
    stackTraceDepth: number;
    timestampFormat: 'iso' | 'relative' | 'timestamp';
  };
}

// Console data provider with isolated state management
export class ConsoleDataProvider {
  private static instance: ConsoleDataProvider | null = null;
  private cache = new Map<string, ConsoleErrorV1[]>();
  private listeners = new Set<(data: ConsoleErrorV1[]) => void>();
  private cleanupListener: (() => void) | null = null;

  private constructor() {
    // Set up message listener for console updates
    this.cleanupListener = ConsoleMessageBus.listen(async (message) => {
      try {
        await this.handleConsoleMessage(message);
        return {
          success: true,
          timestamp: new Date().toISOString(),
          messageId: message.id || 'unknown'
        };
      } catch (error) {
        // console.error('Console message handler error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Console handler error',
          timestamp: new Date().toISOString(),
          messageId: message.id || 'unknown'
        };
      }
    });
  }

  static getInstance(): ConsoleDataProvider {
    if (!ConsoleDataProvider.instance) {
      ConsoleDataProvider.instance = new ConsoleDataProvider();
    }
    return ConsoleDataProvider.instance;
  }

  // Handle incoming console messages
  private async handleConsoleMessage(message: any): Promise<void> {
    // Transform raw message data to V1 contract
    const consoleError = DataAdapters.consoleErrorToV1(message.data);

    // Update cache
    const cacheKey = `tab_${consoleError.tabId || 'global'}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, []);
    }

    const tabErrors = this.cache.get(cacheKey)!;
    tabErrors.unshift(consoleError); // Add to beginning for recency

    // Limit cache size to prevent memory leaks (keep last 50 errors per tab)
    if (tabErrors.length > 50) {
      tabErrors.splice(50);
    }

    // Notify listeners
    this.notifyListeners(cacheKey);
  }

  // Get console errors with pagination and filtering
  async getConsoleErrors(options: {
    tabId?: number;
    limit?: number;
    offset?: number;
    filters?: {
      level?: 'error' | 'warn' | 'info' | 'log';
      source?: string;
      message?: string;
      timeRange?: { start: string; end: string };
    };
  } = {}): Promise<ConsoleErrorV1[]> {
    try {
      // Get from cache first
      const cacheKey = `tab_${options.tabId || 'global'}`;
      let errors = this.cache.get(cacheKey) || [];

      // If cache is empty, fetch from background
      if (errors.length === 0) {
        const response = await chrome.runtime.sendMessage({
          action: 'getConsoleErrors',
          limit: options.limit || 50,
          offset: options.offset || 0,
          tabId: options.tabId
        });

        if (response?.success && response.data) {
          // Transform raw data to V1 contracts
          errors = SafeTransformers.transformConsoleErrors(response.data);
          this.cache.set(cacheKey, errors);
        }
      }

      // Apply filters
      if (options.filters) {
        errors = this.applyFilters(errors, options.filters);
      }

      // Apply pagination
      const start = options.offset || 0;
      const end = start + (options.limit || 50);

      return errors.slice(start, end);
    } catch (error) {
      // console.error('Failed to get console errors:', error);
      return [];
    }
  }

  // Apply filters to console errors
  private applyFilters(
    errors: ConsoleErrorV1[],
    filters: {
      level?: 'error' | 'warn' | 'info' | 'log';
      source?: string;
      message?: string;
      timeRange?: { start: string; end: string };
    }
  ): ConsoleErrorV1[] {
    return errors.filter(error => {
      // Level filter
      if (filters.level && error.level !== filters.level) {
        return false;
      }

      // Source filter
      if (filters.source && !error.source.toLowerCase().includes(filters.source.toLowerCase())) {
        return false;
      }

      // Message filter
      if (filters.message && !error.message.toLowerCase().includes(filters.message.toLowerCase())) {
        return false;
      }

      // Time range filter
      if (filters.timeRange) {
        const errorTime = new Date(error.timestamp);
        const startTime = new Date(filters.timeRange.start);
        const endTime = new Date(filters.timeRange.end);

        if (errorTime < startTime || errorTime > endTime) {
          return false;
        }
      }

      return true;
    });
  }

  // Store new console error
  async storeConsoleError(error: Partial<ConsoleErrorV1>): Promise<boolean> {
    try {
      const response = await ConsoleMessageBus.sendConsoleError(error);
      return response.success;
    } catch (error) {
      // console.error('Failed to store console error:', error);
      return false;
    }
  }

  // Clear console errors
  async clearConsoleErrors(tabId?: number): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearConsoleErrors',
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
      // console.error('Failed to clear console errors:', error);
      return false;
    }
  }

  // Subscribe to console data updates
  subscribe(listener: (data: ConsoleErrorV1[]) => void): () => void {
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
        // console.error('Console listener error:', error);
      }
    });
  }

  // Notify all listeners
  private notifyAllListeners(): void {
    this.listeners.forEach(listener => {
      try {
        // Combine all cached data
        const allData: ConsoleErrorV1[] = [];
        this.cache.forEach(tabData => {
          allData.push(...tabData);
        });
        listener(allData);
      } catch (error) {
        // console.error('Console listener error:', error);
      }
    });
  }

  // Get console error statistics
  getConsoleStats(tabId?: number): {
    totalErrors: number;
    errorsByLevel: Record<string, number>;
    topSources: Array<{ source: string; count: number }>;
    recentErrorRate: number; // errors per minute in last hour
    criticalErrorCount: number;
  } {
    const cacheKey = tabId ? `tab_${tabId}` : null;
    let errors: ConsoleErrorV1[] = [];

    if (cacheKey) {
      errors = this.cache.get(cacheKey) || [];
    } else {
      // Combine all tabs
      this.cache.forEach(tabData => {
        errors.push(...tabData);
      });
    }

    // Calculate statistics
    const totalErrors = errors.length;

    // Errors by level
    const errorsByLevel: Record<string, number> = {};
    errors.forEach(e => {
      errorsByLevel[e.level] = (errorsByLevel[e.level] || 0) + 1;
    });

    // Top sources
    const sourceCounts: Record<string, number> = {};
    errors.forEach(e => {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent error rate (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = errors.filter(e => new Date(e.timestamp) > oneHourAgo);
    const recentErrorRate = recentErrors.length; // errors per hour

    // Critical error count (errors with stack traces)
    const criticalErrorCount = errors.filter(e => e.level === 'error' && e.stack).length;

    return {
      totalErrors,
      errorsByLevel,
      topSources,
      recentErrorRate,
      criticalErrorCount
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
    if (ConsoleDataProvider.instance) {
      ConsoleDataProvider.instance.cleanup();
      ConsoleDataProvider.instance = null;
    }
  }
}

// Export singleton instance
export const consoleDataProvider = ConsoleDataProvider.getInstance();

// Console utility functions isolated from other features
export class ConsoleUtils {
  // Format console message for display
  static formatMessage(message: string, maxLength: number = 500): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength) + '...[truncated]';
  }

  // Parse stack trace
  static parseStackTrace(stack: string | undefined): Array<{
    function: string;
    file: string;
    line: number;
    column: number;
  }> {
    if (!stack) return [];

    const lines = stack.split('\n');
    const parsed: Array<{ function: string; file: string; line: number; column: number }> = [];

    for (const line of lines) {
      // Parse different stack trace formats
      const match = line.match(/at\s+([^(]+)\s+\(([^:]+):(\d+):(\d+)\)/) ||
                   line.match(/([^@]+)@([^:]+):(\d+):(\d+)/);

      if (match) {
        parsed.push({
          function: (match[1] || 'anonymous').trim(),
          file: match[2] || 'unknown',
          line: parseInt(match[3]) || 0,
          column: parseInt(match[4]) || 0
        });
      }
    }

    return parsed.slice(0, 10); // Limit to 10 stack frames
  }

  // Determine error severity
  static getErrorSeverity(error: ConsoleErrorV1): 'critical' | 'high' | 'medium' | 'low' {
    // Critical: JavaScript errors with stack traces
    if (error.level === 'error' && error.stack) {
      return 'critical';
    }

    // High: Any error level
    if (error.level === 'error') {
      return 'high';
    }

    // Medium: Warnings
    if (error.level === 'warn') {
      return 'medium';
    }

    // Low: Info and log
    return 'low';
  }

  // Check if error should be logged based on settings
  static shouldLogError(error: Partial<ConsoleErrorV1>, settings: ConsoleSettings): boolean {
    if (!settings.enabled) {
      return false;
    }

    // Check severity filter
    const level = error.level || 'log';
    return settings.severityFilter[level] !== false;
  }

  // Sanitize error message
  static sanitizeMessage(message: string): string {
    // Remove potential sensitive information
    return message
      .replace(/password\s*[:=]\s*[^\s]+/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*[^\s]+/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*[^\s]+/gi, 'key: [REDACTED]');
  }
}

// Cleanup function for extension lifecycle
export function cleanupConsoleFeature(): void {
  ConsoleDataProvider.cleanup();
}
