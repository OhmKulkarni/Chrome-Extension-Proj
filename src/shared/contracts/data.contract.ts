/**
 * PHASE 1: Data Contract Isolation
 *
 * This file defines stable data interfaces that components depend on.
 * Adapters handle any internal storage changes without breaking components.
 *
 * SAFETY: Never modify V1 interfaces - create V2 if needed
 */

// Network Request Data Contract - What components expect
export interface NetworkRequestV1 {
  readonly id: string;
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly timestamp: string;
  readonly headers: {
    readonly request: Record<string, string>;
    readonly response: Record<string, string>;
  };
  readonly requestBody?: string;
  readonly responseBody?: string;
  readonly payloadSize: number;
  readonly tabId?: number;
  readonly mainDomain: string;
  readonly tokenType?: string;
  readonly detectedLibraries?: LibraryInfoV1[];
}

// Library Information Data Contract
export interface LibraryInfoV1 {
  readonly name: string;
  readonly version?: string;
  readonly type: 'framework' | 'utility' | 'ui' | 'analytics' | 'cdn' | 'polyfill' | 'unknown';
  readonly confidence: 'high' | 'medium' | 'low';
  readonly source: 'url' | 'content' | 'headers';
  readonly cdnProvider?: string;
  readonly minified: boolean;
  readonly size?: number;
  readonly url: string;
}

// Console Error Data Contract - What components expect
export interface ConsoleErrorV1 {
  readonly id: string;
  readonly message: string;
  readonly level: 'error' | 'warn' | 'info' | 'log';
  readonly stack?: string;
  readonly timestamp: string;
  readonly url: string;
  readonly lineNumber?: number;
  readonly columnNumber?: number;
  readonly tabId?: number;
  readonly source: string;
}

// Token Event Data Contract - What components expect
export interface TokenEventV1 {
  readonly id: string;
  readonly type: 'acquire' | 'refresh' | 'expired' | 'refresh_error' | 'verified' | 'validation_failed' | 'revoked';
  readonly token_type: string;
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly timestamp: string;
  readonly value_hash: string;
  readonly expiry?: string;
  readonly headers?: Record<string, string>;
  readonly tabId?: number;
  readonly mainDomain: string;
}

// Settings Data Contract - What components expect
export interface SettingsV1 {
  readonly networkInterception: {
    readonly enabled: boolean;
    readonly bodyCapture: {
      readonly enabled: boolean;
      readonly mode: 'status_only' | 'full';
      readonly maxBodySize: number;
    };
    readonly tabSpecific: {
      readonly enabled: boolean;
      readonly defaultState: 'active' | 'paused';
    };
  };
  readonly consoleLogging: {
    readonly enabled: boolean;
    readonly severityFilter: {
      readonly error: boolean;
      readonly warn: boolean;
      readonly info: boolean;
      readonly log: boolean;
    };
  };
  readonly tokenLogging: {
    readonly enabled: boolean;
    readonly tabSpecific: {
      readonly enabled: boolean;
      readonly defaultState: 'active' | 'paused';
    };
    readonly eventTypes: {
      readonly acquire: boolean;
      readonly refresh: boolean;
      readonly expired: boolean;
      readonly refresh_error: boolean;
    };
  };
}

// Extension State Data Contract - What components expect
export interface ExtensionStateV1 {
  readonly globalEnabled: boolean;
  readonly siteStates: Record<string, boolean>;
  readonly tabStates: Record<number, {
    readonly enabled: boolean;
    readonly url: string;
    readonly networkLogging: boolean;
    readonly consoleLogging: boolean;
    readonly tokenLogging: boolean;
  }>;
}

// Data transformation types for safe conversion
export type DataTransformer<TSource, TTarget> = (source: TSource) => TTarget;
export type DataValidator<T> = (data: any) => data is T;

// Memory-safe data adapters that prevent leaks during transformation
export class DataAdapters {
  // Network Request Adapter - handles any storage format changes
  static networkRequestToV1: DataTransformer<any, NetworkRequestV1> = (data: any): NetworkRequestV1 => {
    // Parse headers safely
    let headers = { request: {}, response: {} };
    try {
      if (typeof data.headers === 'string') {
        const parsed = JSON.parse(data.headers);
        headers = {
          request: parsed.request || {},
          response: parsed.response || {}
        };
      } else if (data.headers && typeof data.headers === 'object') {
        headers = {
          request: data.headers.request || data.requestHeaders || {},
          response: data.headers.response || data.responseHeaders || {}
        };
      }
    } catch (error) {
      console.warn('Failed to parse headers:', error);
    }

    // Handle different storage schemas
    return {
      id: data.id || data._id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: data.url || data.source_url || '',
      method: data.method || data.request_method || 'GET',
      status: data.status || data.response_status || 0,
      timestamp: data.timestamp || data.created_at || new Date().toISOString(),
      headers,
      requestBody: data.requestBody || data.request_body || data.payload,
      responseBody: data.responseBody || data.response_body || data.response,
      payloadSize: data.payload_size || data.payloadSize || (data.requestBody?.length || 0),
      tabId: data.tabId || data.tab_id,
      mainDomain: data.mainDomain || data.main_domain || data.domain || 'unknown',
      tokenType: data.tokenType || data.token_type
    };
  };

  // Console Error Adapter - handles any storage format changes
  static consoleErrorToV1: DataTransformer<any, ConsoleErrorV1> = (data: any): ConsoleErrorV1 => {
    return {
      id: data.id || data._id || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: data.message || data.error_message || '',
      level: data.level || data.severity || 'error',
      stack: data.stack || data.stack_trace,
      timestamp: data.timestamp || data.created_at || new Date().toISOString(),
      url: data.url || data.source_url || '',
      lineNumber: data.lineNumber || data.line_number || data.lineno,
      columnNumber: data.columnNumber || data.column_number || data.colno,
      tabId: data.tabId || data.tab_id,
      source: data.source || data.origin || 'console'
    };
  };

  // Token Event Adapter - handles any storage format changes
  static tokenEventToV1: DataTransformer<any, TokenEventV1> = (data: any): TokenEventV1 => {
    // Parse headers safely
    let headers: Record<string, string> | undefined;
    try {
      if (typeof data.headers === 'string') {
        headers = JSON.parse(data.headers);
      } else if (data.headers && typeof data.headers === 'object') {
        headers = data.headers;
      }
    } catch (error) {
      console.warn('Failed to parse token headers:', error);
    }

    return {
      id: data.id || data._id || `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type || 'acquire',
      token_type: data.token_type || data.tokenType || 'unknown',
      url: data.url || '',
      method: data.method || 'GET',
      status: data.status || 0,
      timestamp: data.timestamp || data.created_at || new Date().toISOString(),
      value_hash: data.value_hash || data.valueHash || data.hash || '',
      expiry: data.expiry || data.expires_at,
      headers,
      tabId: data.tabId || data.tab_id,
      mainDomain: data.mainDomain || data.main_domain || data.domain || 'unknown'
    };
  };

  // Settings Adapter - handles any storage format changes
  static settingsToV1: DataTransformer<any, SettingsV1> = (data: any): SettingsV1 => {
    const settings = data || {};

    return {
      networkInterception: {
        enabled: settings.networkInterception?.enabled !== false,
        bodyCapture: {
          enabled: settings.networkInterception?.bodyCapture?.enabled !== false,
          mode: settings.networkInterception?.bodyCapture?.mode || 'status_only',
          maxBodySize: settings.networkInterception?.bodyCapture?.maxBodySize || 2000
        },
        tabSpecific: {
          enabled: settings.networkInterception?.tabSpecific?.enabled !== false,
          defaultState: settings.networkInterception?.tabSpecific?.defaultState || 'paused'
        }
      },
      consoleLogging: {
        enabled: settings.consoleLogging?.enabled !== false,
        severityFilter: {
          error: settings.consoleLogging?.severityFilter?.error !== false,
          warn: settings.consoleLogging?.severityFilter?.warn !== false,
          info: settings.consoleLogging?.severityFilter?.info !== false,
          log: settings.consoleLogging?.severityFilter?.log !== false
        }
      },
      tokenLogging: {
        enabled: settings.tokenLogging?.enabled !== false,
        tabSpecific: {
          enabled: settings.tokenLogging?.tabSpecific?.enabled !== false,
          defaultState: settings.tokenLogging?.tabSpecific?.defaultState || 'paused'
        },
        eventTypes: {
          acquire: settings.tokenLogging?.eventTypes?.acquire !== false,
          refresh: settings.tokenLogging?.eventTypes?.refresh !== false,
          expired: settings.tokenLogging?.eventTypes?.expired !== false,
          refresh_error: settings.tokenLogging?.eventTypes?.refresh_error !== false
        }
      }
    };
  };
}

// Validators to ensure data integrity
export class DataValidators {
  static isNetworkRequestV1: DataValidator<NetworkRequestV1> = (data: any): data is NetworkRequestV1 => {
    return data &&
           typeof data.id === 'string' &&
           typeof data.url === 'string' &&
           typeof data.method === 'string' &&
           typeof data.status === 'number' &&
           typeof data.timestamp === 'string' &&
           data.headers &&
           typeof data.headers.request === 'object' &&
           typeof data.headers.response === 'object';
  };

  static isConsoleErrorV1: DataValidator<ConsoleErrorV1> = (data: any): data is ConsoleErrorV1 => {
    return data &&
           typeof data.id === 'string' &&
           typeof data.message === 'string' &&
           typeof data.level === 'string' &&
           typeof data.timestamp === 'string' &&
           typeof data.url === 'string';
  };

  static isTokenEventV1: DataValidator<TokenEventV1> = (data: any): data is TokenEventV1 => {
    return data &&
           typeof data.id === 'string' &&
           typeof data.type === 'string' &&
           typeof data.token_type === 'string' &&
           typeof data.url === 'string' &&
           typeof data.timestamp === 'string' &&
           typeof data.value_hash === 'string';
  };

  static isSettingsV1: DataValidator<SettingsV1> = (data: any): data is SettingsV1 => {
    return data &&
           data.networkInterception &&
           data.consoleLogging &&
           data.tokenLogging &&
           typeof data.networkInterception.enabled === 'boolean' &&
           typeof data.consoleLogging.enabled === 'boolean' &&
           typeof data.tokenLogging.enabled === 'boolean';
  };
}

// Safe array transformations to prevent memory leaks
export class SafeTransformers {
  // Transform array of raw data to V1 contracts with memory cleanup
  static transformNetworkRequests(rawData: any[]): NetworkRequestV1[] {
    if (!Array.isArray(rawData)) return [];

    return rawData.map(item => {
      try {
        const transformed = DataAdapters.networkRequestToV1(item);
        // Clear reference to raw item to prevent memory retention
        item = null;
        return transformed;
      } catch (error) {
        console.warn('Failed to transform network request:', error);
        return null;
      }
    }).filter((item): item is NetworkRequestV1 => item !== null);
  }

  static transformConsoleErrors(rawData: any[]): ConsoleErrorV1[] {
    if (!Array.isArray(rawData)) return [];

    return rawData.map(item => {
      try {
        const transformed = DataAdapters.consoleErrorToV1(item);
        // Clear reference to raw item to prevent memory retention
        item = null;
        return transformed;
      } catch (error) {
        console.warn('Failed to transform console error:', error);
        return null;
      }
    }).filter((item): item is ConsoleErrorV1 => item !== null);
  }

  static transformTokenEvents(rawData: any[]): TokenEventV1[] {
    if (!Array.isArray(rawData)) return [];

    return rawData.map(item => {
      try {
        const transformed = DataAdapters.tokenEventToV1(item);
        // Clear reference to raw item to prevent memory retention
        item = null;
        return transformed;
      } catch (error) {
        console.warn('Failed to transform token event:', error);
        return null;
      }
    }).filter((item): item is TokenEventV1 => item !== null);
  }
}
