/**
 * PHASE 1: Message Contract Isolation
 * 
 * This file defines versioned message contracts to prevent features from breaking each other.
 * Changes to these interfaces require explicit versioning to maintain compatibility.
 * 
 * SAFETY: Never modify V1 interfaces - create V2 if needed
 */

// Prevent memory leaks with proper message typing
export const MESSAGE_TYPES = {
  // Network feature messages - isolated channel
  NETWORK_REQUEST: 'NETWORK_REQUEST_V1',
  NETWORK_RESPONSE: 'NETWORK_RESPONSE_V1',
  STORE_NETWORK_REQUEST: 'STORE_NETWORK_REQUEST_V1',
  
  // Console feature messages - isolated channel
  CONSOLE_ERROR: 'CONSOLE_ERROR_V1',
  CONSOLE_LOG: 'CONSOLE_LOG_V1',
  CONSOLE_WARN: 'CONSOLE_WARN_V1',
  
  // Token feature messages - isolated channel
  TOKEN_DETECTED: 'TOKEN_DETECTED_V1',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED_V1',
  TOKEN_EVENT: 'TOKEN_EVENT_V1',
  
  // Extension control messages - isolated channel
  EXTENSION_STATE_CHANGED: 'EXTENSION_STATE_CHANGED_V1',
  SITE_SPECIFIC_STATE_CHANGED: 'SITE_SPECIFIC_STATE_CHANGED_V1',
  
  // Dashboard communication - isolated channel
  DATA_UPDATED: 'DATA_UPDATED_V1',
  GET_TAB_INFO: 'GET_TAB_INFO_V1',
  
  // Legacy compatibility (to be phased out)
  INJECT_MAIN_WORLD_SCRIPT: 'INJECT_MAIN_WORLD_SCRIPT',
  PING: 'PING'
} as const;

// Base message structure with version tracking
interface BaseMessageV1 {
  readonly version: 'v1';
  readonly type: string;
  readonly timestamp: string;
  readonly id: string; // Unique message ID for tracking
}

// Network message contracts - frozen structure
export interface NetworkRequestMessageV1 extends BaseMessageV1 {
  readonly type: typeof MESSAGE_TYPES.NETWORK_REQUEST;
  readonly data: {
    readonly url: string;
    readonly method: string;
    readonly headers: string; // JSON string
    readonly requestBody?: string;
    readonly responseBody?: string;
    readonly status: number;
    readonly timestamp: string;
    readonly tabId?: number;
    readonly mainDomain?: string;
  };
}

export interface NetworkResponseMessageV1 extends BaseMessageV1 {
  readonly type: typeof MESSAGE_TYPES.NETWORK_RESPONSE;
  readonly data: {
    readonly url: string;
    readonly status: number;
    readonly headers: string; // JSON string
    readonly responseBody?: string;
    readonly timestamp: string;
  };
}

// Console message contracts - frozen structure
export interface ConsoleErrorMessageV1 extends BaseMessageV1 {
  readonly type: typeof MESSAGE_TYPES.CONSOLE_ERROR;
  readonly data: {
    readonly message: string;
    readonly level: 'error' | 'warn' | 'info' | 'log';
    readonly stack?: string;
    readonly timestamp: string;
    readonly url: string;
    readonly lineNumber?: number;
    readonly columnNumber?: number;
    readonly tabId?: number;
  };
}

// Token message contracts - frozen structure
export interface TokenEventMessageV1 extends BaseMessageV1 {
  readonly type: typeof MESSAGE_TYPES.TOKEN_EVENT;
  readonly data: {
    readonly type: 'acquire' | 'refresh' | 'expired' | 'refresh_error' | 'verified' | 'validation_failed' | 'revoked';
    readonly token_type: string;
    readonly url: string;
    readonly method: string;
    readonly status: number;
    readonly timestamp: string;
    readonly value_hash: string;
    readonly expiry?: string;
    readonly headers?: string; // JSON string
    readonly tabId?: number;
    readonly mainDomain?: string;
  };
}

// Extension state messages - frozen structure
export interface ExtensionStateMessageV1 extends BaseMessageV1 {
  readonly type: typeof MESSAGE_TYPES.EXTENSION_STATE_CHANGED;
  readonly data: {
    readonly enabled: boolean;
    readonly tabId?: number;
    readonly url?: string;
    readonly timestamp: string;
  };
}

// Dashboard communication messages - frozen structure
export interface DataUpdatedMessageV1 extends BaseMessageV1 {
  readonly type: typeof MESSAGE_TYPES.DATA_UPDATED;
  readonly data: {
    readonly dataType: 'network_request' | 'console_error' | 'token_event';
    readonly id: string;
    readonly timestamp: string;
    readonly count?: number;
  };
}

// Union type for all message contracts
export type MessageContractV1 = 
  | NetworkRequestMessageV1
  | NetworkResponseMessageV1
  | ConsoleErrorMessageV1
  | TokenEventMessageV1
  | ExtensionStateMessageV1
  | DataUpdatedMessageV1;

// Message factory functions to ensure proper structure
export class MessageFactory {
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  // Network message factory
  static createNetworkRequest(data: Omit<NetworkRequestMessageV1['data'], 'timestamp'>): NetworkRequestMessageV1 {
    return {
      version: 'v1',
      type: MESSAGE_TYPES.NETWORK_REQUEST,
      timestamp: this.getTimestamp(),
      id: this.generateId(),
      data: {
        ...data,
        timestamp: this.getTimestamp()
      }
    };
  }

  // Console message factory
  static createConsoleError(data: Omit<ConsoleErrorMessageV1['data'], 'timestamp'>): ConsoleErrorMessageV1 {
    return {
      version: 'v1',
      type: MESSAGE_TYPES.CONSOLE_ERROR,
      timestamp: this.getTimestamp(),
      id: this.generateId(),
      data: {
        ...data,
        timestamp: this.getTimestamp()
      }
    };
  }

  // Token message factory
  static createTokenEvent(data: Omit<TokenEventMessageV1['data'], 'timestamp'>): TokenEventMessageV1 {
    return {
      version: 'v1',
      type: MESSAGE_TYPES.TOKEN_EVENT,
      timestamp: this.getTimestamp(),
      id: this.generateId(),
      data: {
        ...data,
        timestamp: this.getTimestamp()
      }
    };
  }

  // Extension state message factory
  static createExtensionState(data: Omit<ExtensionStateMessageV1['data'], 'timestamp'>): ExtensionStateMessageV1 {
    return {
      version: 'v1',
      type: MESSAGE_TYPES.EXTENSION_STATE_CHANGED,
      timestamp: this.getTimestamp(),
      id: this.generateId(),
      data: {
        ...data,
        timestamp: this.getTimestamp()
      }
    };
  }

  // Dashboard message factory
  static createDataUpdated(data: Omit<DataUpdatedMessageV1['data'], 'timestamp'>): DataUpdatedMessageV1 {
    return {
      version: 'v1',
      type: MESSAGE_TYPES.DATA_UPDATED,
      timestamp: this.getTimestamp(),
      id: this.generateId(),
      data: {
        ...data,
        timestamp: this.getTimestamp()
      }
    };
  }
}

// Message validation functions to prevent runtime errors
export class MessageValidator {
  static isValidMessageV1(message: any): message is MessageContractV1 {
    return message &&
           message.version === 'v1' &&
           typeof message.type === 'string' &&
           typeof message.timestamp === 'string' &&
           typeof message.id === 'string' &&
           message.data &&
           typeof message.data === 'object';
  }

  static isNetworkMessage(message: MessageContractV1): message is NetworkRequestMessageV1 | NetworkResponseMessageV1 {
    return message.type === MESSAGE_TYPES.NETWORK_REQUEST || 
           message.type === MESSAGE_TYPES.NETWORK_RESPONSE;
  }

  static isConsoleMessage(message: MessageContractV1): message is ConsoleErrorMessageV1 {
    return message.type === MESSAGE_TYPES.CONSOLE_ERROR;
  }

  static isTokenMessage(message: MessageContractV1): message is TokenEventMessageV1 {
    return message.type === MESSAGE_TYPES.TOKEN_EVENT;
  }

  static isExtensionStateMessage(message: MessageContractV1): message is ExtensionStateMessageV1 {
    return message.type === MESSAGE_TYPES.EXTENSION_STATE_CHANGED;
  }
}
