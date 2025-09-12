// lib/InterceptionManager.ts - Decoupled network and console interception
export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  domain: string;
  status: number;
  statusText: string;
  duration: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
  timestamp: string;
  type: 'fetch' | 'xhr';
}

export interface ConsoleError {
  id: string;
  message: string;
  level: 'error' | 'warn' | 'info' | 'log';
  source: string;
  line?: number;
  column?: number;
  stack?: string;
  timestamp: string;
  tabId?: number;
  url?: string;
}

export interface TokenEvent {
  id: string;
  type: 'acquire' | 'refresh' | 'expired' | 'refresh_error';
  url: string;
  method: string;
  status: number;
  timestamp: string;
  source_url: string;
  valueHash: string;
  expiry?: number;
  domain: string;
}

// Event Bus for decoupled communication
export class InterceptionEventBus {
  private listeners: Map<string, Set<Function>> = new Map();

  subscribe(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
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
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Network Interception Manager - Isolated from other systems
export class NetworkInterceptionManager {
  private eventBus: InterceptionEventBus;
  private isActive: boolean = false;
  private requestIdCounter: number = 0;

  constructor(eventBus: InterceptionEventBus) {
    this.eventBus = eventBus;
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    // console.log('🔗 NetworkInterceptionManager: Starting network interception');
    this.isActive = true;

    // Listen for network events from content script
    chrome.runtime.onMessage.addListener(this.handleNetworkMessage.bind(this));
  }

  private handleNetworkMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean {
    if (message.action === 'captureNetworkRequest') {
      this.processNetworkRequest(message.data, sender)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('NetworkInterceptionManager error:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        });
      return true; // Indicates async response
    }
    return false;
  }

  private async processNetworkRequest(requestData: any, sender: chrome.runtime.MessageSender): Promise<any> {
    try {
      // Create standardized network request object
      const networkRequest: NetworkRequest = {
        id: this.generateRequestId(),
        method: requestData.method || 'GET',
        url: requestData.url,
        domain: this.extractDomain(requestData.url),
        status: requestData.status || 0,
        statusText: requestData.statusText || '',
        duration: requestData.duration || 0,
        requestHeaders: requestData.requestHeaders || {},
        responseHeaders: requestData.responseHeaders || {},
        requestBody: requestData.requestBody || '',
        responseBody: requestData.responseBody || '',
        timestamp: requestData.timestamp || new Date().toISOString(),
        type: requestData.type as 'fetch' | 'xhr'
      };

      // Emit network request event - other systems can listen independently
      this.eventBus.emit('network_request_captured', {
        request: networkRequest,
        sender,
        tabId: sender.tab?.id
      });

      return { success: true, requestId: networkRequest.id };
    } catch (error) {
      console.error('Error processing network request:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  stop(): void {
    if (!this.isActive) return;

    // console.log('🔗 NetworkInterceptionManager: Stopping network interception');
    this.isActive = false;
    chrome.runtime.onMessage.removeListener(this.handleNetworkMessage.bind(this));
  }
}

// Console Error Manager - Completely independent
export class ConsoleErrorManager {
  private eventBus: InterceptionEventBus;
  private isActive: boolean = false;
  private errorIdCounter: number = 0;

  constructor(eventBus: InterceptionEventBus) {
    this.eventBus = eventBus;
  }

  async start(): Promise<void> {
    if (this.isActive) return;

    // console.log('📝 ConsoleErrorManager: Starting console error interception');
    this.isActive = true;

    chrome.runtime.onMessage.addListener(this.handleConsoleMessage.bind(this));
  }

  private handleConsoleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): boolean {
    if (message.action === 'captureConsoleError') {
      this.processConsoleError(message.data, sender)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('ConsoleErrorManager error:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        });
      return true;
    }
    return false;
  }

  private async processConsoleError(errorData: any, sender: chrome.runtime.MessageSender): Promise<any> {
    try {
      const consoleError: ConsoleError = {
        id: this.generateErrorId(),
        message: errorData.message || 'Unknown error',
        level: errorData.level || 'error',
        source: errorData.source || sender.tab?.url || 'unknown',
        line: errorData.line,
        column: errorData.column,
        stack: errorData.stack,
        timestamp: errorData.timestamp || new Date().toISOString(),
        tabId: sender.tab?.id,
        url: sender.tab?.url
      };

      // Emit console error event
      this.eventBus.emit('console_error_captured', {
        error: consoleError,
        sender,
        tabId: sender.tab?.id
      });

      return { success: true, errorId: consoleError.id };
    } catch (error) {
      console.error('Error processing console error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${++this.errorIdCounter}`;
  }

  stop(): void {
    if (!this.isActive) return;

    // console.log('📝 ConsoleErrorManager: Stopping console error interception');
    this.isActive = false;
    chrome.runtime.onMessage.removeListener(this.handleConsoleMessage.bind(this));
  }
}
