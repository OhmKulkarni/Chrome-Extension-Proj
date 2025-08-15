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
    
    console.log('🔗 NetworkInterceptionManager: Starting network interception');
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
    
    console.log('🔗 NetworkInterceptionManager: Stopping network interception');
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
    
    console.log('📝 ConsoleErrorManager: Starting console error interception');
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
    
    console.log('📝 ConsoleErrorManager: Stopping console error interception');
    this.isActive = false;
    chrome.runtime.onMessage.removeListener(this.handleConsoleMessage.bind(this));
  }
}

// Token Detection Manager - Independent token analysis
export class TokenDetectionManager {
  private eventBus: InterceptionEventBus;
  private isActive: boolean = false;
  private tokenIdCounter: number = 0;
  private unsubscribeFromNetwork?: () => void;

  constructor(eventBus: InterceptionEventBus) {
    this.eventBus = eventBus;
  }

  async start(): Promise<void> {
    if (this.isActive) return;
    
    console.log('🔐 TokenDetectionManager: Starting token detection');
    this.isActive = true;

    // Listen to network requests for token analysis
    this.unsubscribeFromNetwork = this.eventBus.subscribe('network_request_captured', 
      this.analyzeNetworkRequestForTokens.bind(this)
    );
  }

  private async analyzeNetworkRequestForTokens(eventData: any): Promise<void> {
    const { request, sender, tabId } = eventData;
    
    try {
      const tokenEvent = await this.detectTokenFromRequest(request);
      if (tokenEvent) {
        // Emit token event
        this.eventBus.emit('token_event_detected', {
          token: tokenEvent,
          sender,
          tabId,
          originalRequest: request
        });
      }
    } catch (error) {
      console.error('Error analyzing request for tokens:', error);
    }
  }

  private async detectTokenFromRequest(request: NetworkRequest): Promise<TokenEvent | null> {
    const { url, method, status } = request;
    
    // Token endpoint detection
    const isTokenEndpoint = (urlStr: string, type: 'acquire' | 'refresh'): boolean => {
      const lowerUrl = urlStr.toLowerCase();
      if (type === 'acquire') {
        return lowerUrl.includes('/auth') || lowerUrl.includes('/login') || lowerUrl.includes('/token');
      } else {
        return lowerUrl.includes('/refresh') || lowerUrl.includes('/renew');
      }
    };

    const generateTokenHash = async (url: string, timestamp: string, tokenType: string, method: string): Promise<string> => {
      const data = `${url}:${timestamp}:${tokenType}:${method}`;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    };

    // Token acquisition detection
    if (method === 'POST' && status >= 200 && status < 300 && isTokenEndpoint(url, 'acquire')) {
      const valueHash = await generateTokenHash(url, request.timestamp, 'acquire', method);
      return {
        id: this.generateTokenId(),
        type: 'acquire',
        url,
        method,
        status,
        timestamp: request.timestamp,
        source_url: url,
        valueHash: valueHash,
        domain: request.domain
      };
    }

    // Token refresh detection
    if ((method === 'POST' || method === 'GET') && isTokenEndpoint(url, 'refresh')) {
      if (status >= 200 && status < 300) {
        const valueHash = await generateTokenHash(url, request.timestamp, 'refresh', method);
        return {
          id: this.generateTokenId(),
          type: 'refresh',
          url,
          method,
          status,
          timestamp: request.timestamp,
          source_url: url,
          valueHash: valueHash,
          domain: request.domain
        };
      } else if (status >= 400) {
        return {
          id: this.generateTokenId(),
          type: 'refresh_error',
          url,
          method,
          status,
          timestamp: request.timestamp,
          source_url: url,
          valueHash: 'refresh_error',
          domain: request.domain
        };
      }
    }

    // Token expiration detection
    if (status === 401 || status === 403) {
      return {
        id: this.generateTokenId(),
        type: 'expired',
        url,
        method,
        status,
        timestamp: request.timestamp,
        source_url: url,
        valueHash: 'expired',
        domain: request.domain
      };
    }

    return null;
  }

  private generateTokenId(): string {
    return `token_${Date.now()}_${++this.tokenIdCounter}`;
  }

  stop(): void {
    if (!this.isActive) return;
    
    console.log('🔐 TokenDetectionManager: Stopping token detection');
    this.isActive = false;
    
    if (this.unsubscribeFromNetwork) {
      this.unsubscribeFromNetwork();
      this.unsubscribeFromNetwork = undefined;
    }
  }
}
