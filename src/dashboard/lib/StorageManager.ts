// lib/StorageManager.ts - Decoupled storage handling
import { NetworkRequest, ConsoleError, TokenEvent } from './InterceptionManager';

export interface StorageOperationResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// Storage Event Bus for real-time updates
export class StorageEventBus {
  private listeners: Map<string, Set<Function>> = new Map();

  subscribe(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Storage event error for ${event}:`, error);
        }
      });
    }
  }
}

// Network Requests Storage Manager
export class NetworkRequestsStorage {
  private eventBus: StorageEventBus;

  constructor(eventBus: StorageEventBus) {
    this.eventBus = eventBus;
  }

  async store(request: NetworkRequest): Promise<StorageOperationResult> {
    try {
      // Send to background storage
      const response = await this.sendChromeMessage({
        action: 'storeNetworkRequest',
        data: request
      });

      if (response?.success) {
        // Emit storage event for real-time updates
        this.eventBus.emit('network_request_stored', {
          request,
          id: request.id
        });

        return { success: true, id: request.id };
      } else {
        return { success: false, error: response?.error || 'Failed to store request' };
      }
    } catch (error) {
      console.error('Error storing network request:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getPage(page: number, limit: number = 10): Promise<PaginatedResult<NetworkRequest>> {
    try {
      const response = await this.sendChromeMessage({
        action: 'getNetworkRequests',
        limit,
        offset: (page - 1) * limit
      });

      if (response?.success) {
        return {
          items: response.requests || [],
          total: response.total || 0,
          hasMore: (response.total || 0) > page * limit
        };
      } else {
        return { items: [], total: 0, hasMore: false };
      }
    } catch (error) {
      console.error('Error fetching network requests:', error);
      return { items: [], total: 0, hasMore: false };
    }
  }

  async clear(): Promise<StorageOperationResult> {
    try {
      const response = await this.sendChromeMessage({
        action: 'clearNetworkRequests'
      });

      if (response?.success) {
        this.eventBus.emit('network_requests_cleared', {});
        return { success: true };
      } else {
        return { success: false, error: response?.error || 'Failed to clear requests' };
      }
    } catch (error) {
      console.error('Error clearing network requests:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendChromeMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
}

// Console Errors Storage Manager
export class ConsoleErrorsStorage {
  private eventBus: StorageEventBus;

  constructor(eventBus: StorageEventBus) {
    this.eventBus = eventBus;
  }

  async store(error: ConsoleError): Promise<StorageOperationResult> {
    try {
      const response = await this.sendChromeMessage({
        action: 'storeConsoleError',
        data: error
      });

      if (response?.success) {
        this.eventBus.emit('console_error_stored', {
          error,
          id: error.id
        });

        return { success: true, id: error.id };
      } else {
        return { success: false, error: response?.error || 'Failed to store error' };
      }
    } catch (error) {
      console.error('Error storing console error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getPage(page: number, limit: number = 10): Promise<PaginatedResult<ConsoleError>> {
    try {
      const response = await this.sendChromeMessage({
        action: 'getConsoleErrors',
        limit,
        offset: (page - 1) * limit
      });

      if (response?.success) {
        return {
          items: response.errors || [],
          total: response.total || 0,
          hasMore: (response.total || 0) > page * limit
        };
      } else {
        return { items: [], total: 0, hasMore: false };
      }
    } catch (error) {
      console.error('Error fetching console errors:', error);
      return { items: [], total: 0, hasMore: false };
    }
  }

  async clear(): Promise<StorageOperationResult> {
    try {
      const response = await this.sendChromeMessage({
        action: 'clearConsoleErrors'
      });

      if (response?.success) {
        this.eventBus.emit('console_errors_cleared', {});
        return { success: true };
      } else {
        return { success: false, error: response?.error || 'Failed to clear errors' };
      }
    } catch (error) {
      console.error('Error clearing console errors:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendChromeMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
}

// Token Events Storage Manager
export class TokenEventsStorage {
  private eventBus: StorageEventBus;

  constructor(eventBus: StorageEventBus) {
    this.eventBus = eventBus;
  }

  async store(token: TokenEvent): Promise<StorageOperationResult> {
    try {
      const response = await this.sendChromeMessage({
        action: 'storeTokenEvent',
        data: token
      });

      if (response?.success) {
        this.eventBus.emit('token_event_stored', {
          token,
          id: token.id
        });

        return { success: true, id: token.id };
      } else {
        return { success: false, error: response?.error || 'Failed to store token event' };
      }
    } catch (error) {
      console.error('Error storing token event:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getPage(page: number, limit: number = 10): Promise<PaginatedResult<TokenEvent>> {
    try {
      const response = await this.sendChromeMessage({
        action: 'getTokenEvents',
        limit,
        offset: (page - 1) * limit
      });

      if (response?.success) {
        return {
          items: response.events || [],
          total: response.total || 0,
          hasMore: (response.total || 0) > page * limit
        };
      } else {
        return { items: [], total: 0, hasMore: false };
      }
    } catch (error) {
      console.error('Error fetching token events:', error);
      return { items: [], total: 0, hasMore: false };
    }
  }

  async clear(): Promise<StorageOperationResult> {
    try {
      const response = await this.sendChromeMessage({
        action: 'clearTokenEvents'
      });

      if (response?.success) {
        this.eventBus.emit('token_events_cleared', {});
        return { success: true };
      } else {
        return { success: false, error: response?.error || 'Failed to clear token events' };
      }
    } catch (error) {
      console.error('Error clearing token events:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendChromeMessage(message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
}

// Unified Storage Manager - Orchestrates all storage operations
export class UnifiedStorageManager {
  private networkStorage: NetworkRequestsStorage;
  private errorsStorage: ConsoleErrorsStorage;
  private tokensStorage: TokenEventsStorage;
  private eventBus: StorageEventBus;

  constructor() {
    this.eventBus = new StorageEventBus();
    this.networkStorage = new NetworkRequestsStorage(this.eventBus);
    this.errorsStorage = new ConsoleErrorsStorage(this.eventBus);
    this.tokensStorage = new TokenEventsStorage(this.eventBus);
  }

  get network(): NetworkRequestsStorage {
    return this.networkStorage;
  }

  get errors(): ConsoleErrorsStorage {
    return this.errorsStorage;
  }

  get tokens(): TokenEventsStorage {
    return this.tokensStorage;
  }

  get events(): StorageEventBus {
    return this.eventBus;
  }

  async clearAll(): Promise<{ success: boolean; errors: string[] }> {
    const results = await Promise.allSettled([
      this.networkStorage.clear(),
      this.errorsStorage.clear(),
      this.tokensStorage.clear()
    ]);

    const errors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push(`Failed to clear ${['network', 'errors', 'tokens'][index]}: ${result.reason}`);
      } else if (!result.value.success) {
        errors.push(`Failed to clear ${['network', 'errors', 'tokens'][index]}: ${result.value.error}`);
      }
    });

    const success = errors.length === 0;
    if (success) {
      this.eventBus.emit('all_data_cleared', {});
    }

    return { success, errors };
  }
}
