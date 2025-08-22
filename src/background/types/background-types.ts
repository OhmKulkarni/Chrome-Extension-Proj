/**
 * Background Script Modular Architecture - Type Definitions
 *
 * Comprehensive type definitions extracted from the original 2,267-line background script
 * to support modular architecture with full feature preservation.
 */

// ===== TOKEN SYSTEM TYPES =====

export interface TokenEvent {
  type: 'acquire' | 'refresh' | 'expired' | 'refresh_error' | 'verified' | 'validation_failed' | 'revoked';
  url: string;
  method: string;
  status: number;
  timestamp: string;
  source_url: string;
  expiry?: number;
  valueHash?: string;
}

export interface TokenEndpoints {
  acquire: string[];
  refresh: string[];
}

// ===== NETWORK SYSTEM TYPES =====

export interface NetworkRequestData {
  url: string;
  method: string;
  status: number;
  headers?: any;
  body?: string;
  timestamp: string;
  tabId?: number;
  source_url?: string;
  responseBody?: string; // Response body from main-world script
  duration?: number; // Request duration from main-world script
  response_time?: number; // Alternative field name for response time
  performanceMetrics?: PerformanceTimingMetrics; // NEW: Performance timing data
}

// ===== PERFORMANCE METRICS TYPES =====

export interface PerformanceTimingMetrics {
  dnsLookup: number;      // DNS Lookup Time (ms)
  tcpConnect: number;     // TCP Connect Time (ms)
  sslHandshake: number;   // SSL Handshake Time (ms)
  timeToFirstByte: number;// Time to First Byte (ms)
  contentDownload: number;// Content Download Time (ms)
  totalTime: number;      // Total Time (ms)
  redirectTime: number;   // Redirect Time (ms)
  requestTime: number;    // Request Time (ms)
  transferSize: number;   // Transfer Size (bytes)
  encodedBodySize: number;// Encoded Body Size (bytes)
  decodedBodySize: number;// Decoded Body Size (bytes)
  cacheStatus: 'hit' | 'miss' | 'unknown'; // Cache Status
}

// ===== CONSOLE SYSTEM TYPES =====

export interface ConsoleErrorData {
  message: string;
  severity: 'error' | 'warn' | 'info';
  timestamp: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  stack?: string;
  source_url?: string;
  tabId?: number;
}

// ===== TAB STATE TYPES =====

export interface TabState {
  active: boolean;
  startTime: number;
  requestCount?: number;
  errorCount?: number;
}

export interface TabStateMap {
  [tabId: string]: TabState;
}

// ===== EXTENSION STATE TYPES =====

export interface ExtensionStateData {
  enabled: boolean;
  globalPowerState?: boolean;
  siteSpecificState?: { [domain: string]: boolean };
}

// ===== MESSAGE SYSTEM TYPES =====

export interface BackgroundMessage {
  action: string;
  data?: any;
  tabId?: number;
  limit?: number;
  offset?: number;
  config?: any;
  [key: string]: any;
}

export interface BackgroundResponse {
  success: boolean;
  data?: any;
  error?: string;
  reason?: string;
  [key: string]: any;
}

// ===== STORAGE SYSTEM TYPES =====

export interface StorageData {
  networkRequests?: NetworkRequestData[];
  consoleErrors?: ConsoleErrorData[];
  tokenEvents?: TokenEvent[];
  settings?: any;
  tabStates?: TabStateMap;
  [key: string]: any;
}

// ===== MODULE INTERFACE TYPES =====

export interface ModuleConfig {
  enabled: boolean;
  debugMode?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

export interface ModuleStatus {
  initialized: boolean;
  enabled: boolean;
  lastActivity?: string;
  errorCount?: number;
  processedCount?: number;
}

// ===== CHROME API WRAPPER TYPES =====

export interface ChromeTabInfo {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  percentage: number;
}

// ===== ANALYTICS AND PERFORMANCE TYPES =====

export interface PerformanceStats {
  memoryUsage: MemoryUsage;
  requestCount: number;
  errorCount: number;
  tokenEventCount: number;
  uptime: number;
}

export interface AnalysisData {
  networkRequests: NetworkRequestData[];
  consoleErrors: ConsoleErrorData[];
  tokenEvents: TokenEvent[];
  metadata: {
    totalCount: number;
    timeRange: {
      start: string;
      end: string;
    };
  };
}

// ===== TIMELINE TYPES =====

export interface TimelineData {
  events: Array<{
    id: string;
    type: 'network' | 'console' | 'token';
    timestamp: string;
    data: NetworkRequestData | ConsoleErrorData | TokenEvent;
  }>;
  metadata: {
    totalEvents: number;
    timeRange: {
      start: string;
      end: string;
    };
  };
}

// ===== ERROR HANDLING TYPES =====

export interface ModuleError {
  module: string;
  error: Error;
  timestamp: string;
  context?: any;
}

export interface SafetyConfig {
  enableAbortController: boolean;
  maxRetries: number;
  timeoutMs: number;
  enableRaceConditionProtection: boolean;
  enableMemoryMonitoring: boolean;
}

// ===== UTILITY TYPES =====

export type MessageHandler = (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: BackgroundResponse) => void
) => Promise<void> | void;

export type AsyncMessageHandler = (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: BackgroundResponse) => void
) => Promise<void>;
