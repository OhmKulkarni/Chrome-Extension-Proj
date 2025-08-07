/**
 * Chrome Debugger-based Body Capture Module
 * 
 * This module uses the Chrome DevTools Protocol via chrome.debugger API
 * to capture request and response bodies when full body capture mode is enabled.
 * It works alongside the existing main-world script network in        // MEMORY LEAK FIX: Truncate large request bodies to prevent memory bloat
        requestInfo.requestBody = this.truncateBodyIfNeeded((response as any).postData);
        session.requestData.set(requestId, requestInfo);
        console.log('[BodyCaptureDebugger] Captured request body for:', requestId, 'Length:', requestInfo.requestBody.length);
        
        // MEMORY LEAK FIX: Immediate cleanup if session has too many requests
        this.cleanupSessionIfNeeded(session);eption.
 */

// MEMORY LEAK FIX: External delay function to prevent closure capture
function createDelayPromise(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Use the external function
const delay = createDelayPromise

interface DebuggerSession {
  tabId: number;
  attached: boolean;
  requestData: Map<string, {
    url: string;
    method: string;
    timestamp: number;
    requestBody?: any;
    responseBody?: any;
    contentType?: string;
  }>;
  lastCleanup: number; // Track last cleanup time
}

class BodyCaptureDebugger {
  private sessions = new Map<number, DebuggerSession>();
  private enabled = false;
  private settings: any = null;
  private initialized = false;
  private apiAvailable = false;
  
  // MEMORY LEAK FIX: Aggressive memory management constants
  private static readonly MAX_REQUESTS_PER_SESSION = 10; // Max 10 requests stored per tab
  private static readonly MAX_BODY_SIZE = 50000; // Max 50KB per body to prevent huge objects
  private static readonly CLEANUP_INTERVAL = 30000; // Clean up every 30 seconds
  private static readonly MAX_REQUEST_AGE = 60000; // Keep requests for max 1 minute
  
  // MEMORY LEAK FIX: Event listener cleanup tracking
  private eventListeners: {
    storageHandler?: (changes: any) => void;
    debuggerEventHandler?: (source: any, method: string, params?: any) => void;
    debuggerDetachHandler?: (source: any, reason: string) => void;
  } = {};
  
  // MEMORY LEAK FIX: Cleanup interval tracking
  private cleanupInterval: number | null = null;

  async initialize() {
    // Wait a bit to ensure Chrome APIs are fully loaded
    await delay(100);
    
    // More comprehensive check for chrome.debugger API
    if (!chrome || !chrome.debugger || typeof chrome.debugger.attach !== 'function') {
      console.warn('[BodyCaptureDebugger] Chrome debugger API not available:', {
        hasChrome: !!chrome,
        hasDebugger: !!(chrome && chrome.debugger),
        hasAttach: !!(chrome && chrome.debugger && chrome.debugger.attach),
        chromeVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1],
        manifestVersion: chrome?.runtime?.getManifest()?.manifest_version
      });
      
      // Try to check permissions
      if (chrome?.permissions?.contains) {
        try {
          const hasPermission = await chrome.permissions.contains({ permissions: ['debugger'] });
          console.warn('[BodyCaptureDebugger] Debugger permission status:', hasPermission);
          
          if (!hasPermission) {
            console.warn('[BodyCaptureDebugger] Debugger permission not granted, trying to request it...');
            // Note: Permission requests can only be made from user actions in Manifest V3
            // We'll need to implement this in the settings page
          }
        } catch (error) {
          console.warn('[BodyCaptureDebugger] Could not check debugger permission:', error);
        }
      }
      
      return;
    }

    this.apiAvailable = true;

    // Load settings and check if full body capture is enabled
    await this.loadSettings();
    
    // Listen for settings changes
    this.eventListeners.storageHandler = (changes) => {
      if (changes.settings) {
        this.loadSettings();
      }
    };
    chrome.storage.onChanged.addListener(this.eventListeners.storageHandler);

    try {
      // Listen for debugger events - MEMORY LEAK FIX: Store handlers for cleanup
      this.eventListeners.debuggerEventHandler = this.onDebuggerEvent.bind(this);
      this.eventListeners.debuggerDetachHandler = this.onDebuggerDetach.bind(this);
      
      chrome.debugger.onEvent.addListener(this.eventListeners.debuggerEventHandler);
      chrome.debugger.onDetach.addListener(this.eventListeners.debuggerDetachHandler);
      
      // MEMORY LEAK FIX: Start aggressive cleanup interval
      this.startCleanupInterval();
      
      this.initialized = true;
      console.log('[BodyCaptureDebugger] Initialized successfully');
    } catch (error) {
      console.error('[BodyCaptureDebugger] Failed to initialize debugger listeners:', error);
    }
  }

  private async loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      this.settings = result.settings || {};
      
      const bodyCapture = this.settings.networkInterception?.bodyCapture;
      const wasEnabled = this.enabled;
      this.enabled = bodyCapture?.mode === 'full' && 
                   (bodyCapture?.captureRequests || bodyCapture?.captureResponses);
      
      // If debugger was disabled, detach from all sessions
      if (wasEnabled && !this.enabled) {
        await this.detachAllSessions();
      }
      
      console.log('[BodyCaptureDebugger] Settings updated:', { enabled: this.enabled, bodyCapture });
    } catch (error) {
      console.error('[BodyCaptureDebugger] Failed to load settings:', error);
    }
  }

  async attachToTab(tabId: number): Promise<boolean> {
    if (!this.initialized || !this.enabled) {
      return false;
    }

    // Check if chrome.debugger API is available
    if (!chrome?.debugger) {
      console.warn('[BodyCaptureDebugger] Chrome debugger API not available');
      return false;
    }

    try {
      // Check if already attached
      if (this.sessions.has(tabId)) {
        return true;
      }

      // Attach debugger
      await chrome.debugger.attach({ tabId }, '1.3');
      
      // Enable Network domain
      await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
      
      // Create session
      const session: DebuggerSession = {
        tabId,
        attached: true,
        requestData: new Map(),
        lastCleanup: Date.now()
      };
      
      this.sessions.set(tabId, session);
      console.log(`[BodyCaptureDebugger] Attached to tab ${tabId}`);
      return true;
    } catch (error) {
      console.error(`[BodyCaptureDebugger] Failed to attach to tab ${tabId}:`, error);
      return false;
    }
  }

  async detachFromTab(tabId: number) {
    const session = this.sessions.get(tabId);
    if (!session) return;

    // Check if chrome.debugger API is available
    if (!chrome?.debugger) {
      console.warn('[BodyCaptureDebugger] Chrome debugger API not available');
      this.sessions.delete(tabId);
      return;
    }

    try {
      await chrome.debugger.detach({ tabId });
      this.sessions.delete(tabId);
      console.log(`[BodyCaptureDebugger] Detached from tab ${tabId}`);
    } catch (error) {
      console.error(`[BodyCaptureDebugger] Failed to detach from tab ${tabId}:`, error);
    }
  }

  private async detachAllSessions() {
    const detachPromises = Array.from(this.sessions.keys()).map(tabId => 
      this.detachFromTab(tabId)
    );
    await Promise.allSettled(detachPromises);
  }

  private onDebuggerEvent(source: chrome.debugger.Debuggee, method: string, params?: any) {
    if (!params || !source.tabId) return;

    const session = this.sessions.get(source.tabId);
    if (!session) return;

    switch (method) {
      case 'Network.requestWillBeSent':
        this.handleRequestWillBeSent(source.tabId, params);
        break;
      case 'Network.responseReceived':
        this.handleResponseReceived(source.tabId, params);
        break;
      case 'Network.loadingFinished':
        this.handleLoadingFinished(source.tabId, params);
        break;
    }
  }

  private async handleRequestWillBeSent(tabId: number, params: any) {
    const { requestId, request } = params;
    
    console.log('[BodyCaptureDebugger] Request will be sent:', {
      requestId,
      url: request.url,
      method: request.method,
      headers: request.headers
    });
    
    // Check if debugger API is still available
    if (!chrome.debugger) {
      return;
    }
    
    // Only capture JSON content
    const contentType = request.headers['Content-Type'] || request.headers['content-type'] || '';
    if (!this.isJsonContent(contentType)) {
      console.log('[BodyCaptureDebugger] Skipping non-JSON request:', contentType);
      return;
    }

    // Check if we should capture request bodies
    if (!this.settings.networkInterception?.bodyCapture?.captureRequests) {
      console.log('[BodyCaptureDebugger] Request body capture disabled in settings');
      return;
    }

    const session = this.sessions.get(tabId);
    if (!session) return;

    // Store request info
    session.requestData.set(requestId, {
      url: request.url,
      method: request.method,
      timestamp: Date.now(),
      contentType
    });

    console.log('[BodyCaptureDebugger] Stored request info for:', requestId);

    try {
      // Get request body if available
      const response = await chrome.debugger.sendCommand(
        { tabId }, 
        'Network.getRequestPostData', 
        { requestId }
      );
      
      if ((response as any).postData) {
        const requestInfo = session.requestData.get(requestId);
        if (requestInfo) {
          // MEMORY LEAK FIX: Truncate large request bodies to prevent memory bloat
          requestInfo.requestBody = this.truncateBodyIfNeeded((response as any).postData);
          session.requestData.set(requestId, requestInfo);
          console.log('[BodyCaptureDebugger] Captured request body for:', requestId, 'Length:', requestInfo.requestBody.length);
        }
      }
    } catch (error) {
      // Request may not have body or may not be available yet
      console.debug(`[BodyCaptureDebugger] Could not get request body for ${requestId}:`, (error as Error).message);
    }
  }

  private handleResponseReceived(tabId: number, params: any) {
    const { requestId, response } = params;
    
    // Only process JSON responses
    const contentType = response.headers['Content-Type'] || response.headers['content-type'] || '';
    if (!this.isJsonContent(contentType)) {
      return;
    }

    // Check if we should capture response bodies
    if (!this.settings.networkInterception?.bodyCapture?.captureResponses) {
      return;
    }

    const session = this.sessions.get(tabId);
    if (!session) return;

    // Update or create request info
    let requestInfo = session.requestData.get(requestId);
    if (!requestInfo) {
      requestInfo = {
        url: response.url,
        method: 'GET', // Default if not captured in request phase
        timestamp: Date.now(),
        contentType
      };
    }
    
    requestInfo.contentType = contentType;
    session.requestData.set(requestId, requestInfo);
  }

  private async handleLoadingFinished(tabId: number, params: any) {
    const { requestId } = params;
    const session = this.sessions.get(tabId);
    if (!session) return;

    // Check if debugger API is still available
    if (!chrome.debugger) {
      return;
    }

    const requestInfo = session.requestData.get(requestId);
    if (!requestInfo || !this.isJsonContent(requestInfo.contentType || '')) return;

    console.log('[BodyCaptureDebugger] Loading finished for:', requestId, 'URL:', requestInfo.url);

    try {
      // Get response body
      const response = await chrome.debugger.sendCommand(
        { tabId }, 
        'Network.getResponseBody', 
        { requestId }
      );
      
      if ((response as any).body) {
        // Decode if base64 encoded
        let body = (response as any).body;
        if ((response as any).base64Encoded) {
          body = atob(body);
        }
        
        // MEMORY LEAK FIX: Truncate large response bodies to prevent memory bloat
        const truncatedBody = this.truncateBodyIfNeeded(body);
        
        // Store the response body
        requestInfo.responseBody = truncatedBody;
        session.requestData.set(requestId, requestInfo);
        console.log('[BodyCaptureDebugger] Captured response body for:', requestId, 'Length:', truncatedBody.length);
        
        // MEMORY LEAK FIX: Immediate cleanup if session has too many requests
        this.cleanupSessionIfNeeded(session);
      } else {
        console.log('[BodyCaptureDebugger] No response body available for:', requestId);
      }
    } catch (error) {
      console.debug(`[BodyCaptureDebugger] Could not get response body for ${requestId}:`, (error as Error).message);
    }
  }

  private onDebuggerDetach(source: chrome.debugger.Debuggee, reason: string) {
    if (source.tabId) {
      this.sessions.delete(source.tabId);
      console.log(`[BodyCaptureDebugger] Debugger detached from tab ${source.tabId}, reason: ${reason}`);
    }
  }

  private isJsonContent(contentType: string): boolean {
    return contentType.includes('application/json') || 
           contentType.includes('text/json') ||
           contentType.includes('+json');
  }

  // Method to get captured bodies for a request by URL and timing correlation
  getCapturedBodiesByUrl(tabId: number, url: string, timestamp: number): { requestBody?: any, responseBody?: any } {
    const session = this.sessions.get(tabId);
    if (!session) {
      console.log('[BodyCaptureDebugger] No session found for tab:', tabId);
      return {};
    }

    console.log('[BodyCaptureDebugger] Searching for bodies:', { 
      url, 
      timestamp, 
      sessionSize: session.requestData.size,
      allRequests: Array.from(session.requestData.entries()).map(([id, info]) => ({
        id, 
        url: info.url, 
        timestamp: info.timestamp,
        hasRequestBody: !!info.requestBody,
        hasResponseBody: !!info.responseBody
      }))
    });

    // Find the best matching request based on URL and timing
    let bestMatch: any = null;
    let smallestTimeDiff = Infinity;

    for (const [, requestInfo] of session.requestData.entries()) {
      if (requestInfo.url === url) {
        const timeDiff = Math.abs(requestInfo.timestamp - timestamp);
        console.log('[BodyCaptureDebugger] URL match found:', {
          debuggerTimestamp: requestInfo.timestamp,
          mainWorldTimestamp: timestamp,
          timeDiff,
          hasRequestBody: !!requestInfo.requestBody,
          hasResponseBody: !!requestInfo.responseBody
        });
        
        if (timeDiff < smallestTimeDiff && timeDiff < 5000) { // Within 5 seconds
          smallestTimeDiff = timeDiff;
          bestMatch = requestInfo;
        }
      }
    }

    if (bestMatch) {
      console.log('[BodyCaptureDebugger] Best match found:', {
        timeDiff: smallestTimeDiff,
        hasRequestBody: !!bestMatch.requestBody,
        hasResponseBody: !!bestMatch.responseBody,
        requestBodyLength: bestMatch.requestBody ? bestMatch.requestBody.length : 0,
        responseBodyLength: bestMatch.responseBody ? bestMatch.responseBody.length : 0
      });
      
      return {
        requestBody: bestMatch.requestBody,
        responseBody: bestMatch.responseBody
      };
    }

    console.log('[BodyCaptureDebugger] No matching request found for URL:', url);
    return {};
  }

  // Method to get captured bodies for a request (legacy support)
  getCapturedBodies(tabId: number, requestId: string): { requestBody?: any, responseBody?: any } {
    const session = this.sessions.get(tabId);
    if (!session) return {};

    const requestInfo = session.requestData.get(requestId);
    if (requestInfo) {
      return {
        requestBody: requestInfo.requestBody,
        responseBody: requestInfo.responseBody
      };
    }

    return {};
  }

  // Method to check if debugger API is available
  isApiAvailable(): boolean {
    return this.initialized && this.apiAvailable && !!(chrome?.debugger);
  }

  // Method to check if tab has debugger attached
  isAttachedToTab(tabId: number): boolean {
    return this.isApiAvailable() && this.sessions.has(tabId) && this.sessions.get(tabId)!.attached;
  }

  // Method to get all request IDs with captured bodies for a tab
  getCapturedRequestIds(tabId: number): string[] {
    const session = this.sessions.get(tabId);
    if (!session) return [];

    const requestIds: string[] = [];
    
    for (const [requestId, requestInfo] of session.requestData.entries()) {
      if (requestInfo.requestBody || requestInfo.responseBody) {
        requestIds.push(requestId);
      }
    }

    return requestIds;
  }
  
  // MEMORY LEAK FIX: Cleanup method to remove all event listeners
  destroy(): void {
    console.log('[BodyCaptureDebugger] Destroying and cleaning up event listeners');
    
    // Remove storage change listener
    if (this.eventListeners.storageHandler) {
      chrome.storage.onChanged.removeListener(this.eventListeners.storageHandler);
      this.eventListeners.storageHandler = undefined;
    }
    
    // Remove debugger event listeners
    if (this.eventListeners.debuggerEventHandler) {
      chrome.debugger.onEvent.removeListener(this.eventListeners.debuggerEventHandler);
      this.eventListeners.debuggerEventHandler = undefined;
    }
    
    if (this.eventListeners.debuggerDetachHandler) {
      chrome.debugger.onDetach.removeListener(this.eventListeners.debuggerDetachHandler);
      this.eventListeners.debuggerDetachHandler = undefined;
    }
    
    // MEMORY LEAK FIX: Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clean up sessions
    for (const [tabId, session] of this.sessions.entries()) {
      if (session.attached) {
        try {
          chrome.debugger.detach({ tabId });
        } catch (error) {
          console.warn(`[BodyCaptureDebugger] Failed to detach from tab ${tabId}:`, error);
        }
      }
      session.requestData.clear();
    }
    this.sessions.clear();
    
    this.initialized = false;
    this.apiAvailable = false;
  }

  // MEMORY LEAK FIX: Start aggressive cleanup interval
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.performAggressiveCleanup();
    }, BodyCaptureDebugger.CLEANUP_INTERVAL);
  }

  // MEMORY LEAK FIX: Aggressive memory cleanup method
  private performAggressiveCleanup(): void {
    const now = Date.now();
    let totalCleaned = 0;
    
    for (const [, session] of this.sessions.entries()) {
      const sizeBefore = session.requestData.size;
      
      // Remove old requests
      for (const [requestId, requestInfo] of session.requestData.entries()) {
        if (now - requestInfo.timestamp > BodyCaptureDebugger.MAX_REQUEST_AGE) {
          session.requestData.delete(requestId);
        }
      }
      
      // If still too many requests, remove oldest ones
      if (session.requestData.size > BodyCaptureDebugger.MAX_REQUESTS_PER_SESSION) {
        const sortedRequests = Array.from(session.requestData.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = sortedRequests.slice(0, session.requestData.size - BodyCaptureDebugger.MAX_REQUESTS_PER_SESSION);
        for (const [requestId] of toRemove) {
          session.requestData.delete(requestId);
        }
      }
      
      const cleaned = sizeBefore - session.requestData.size;
      totalCleaned += cleaned;
      session.lastCleanup = now;
    }
    
    if (totalCleaned > 0) {
      console.log(`[BodyCaptureDebugger] Aggressive cleanup removed ${totalCleaned} old requests`);
    }
  }

  // MEMORY LEAK FIX: Truncate large bodies to prevent memory bloat
  private truncateBodyIfNeeded(body: any): any {
    if (typeof body !== 'string') {
      return body;
    }
    
    if (body.length > BodyCaptureDebugger.MAX_BODY_SIZE) {
      const truncated = body.substring(0, BodyCaptureDebugger.MAX_BODY_SIZE);
      console.log(`[BodyCaptureDebugger] Truncated body from ${body.length} to ${truncated.length} characters`);
      return truncated + '... [TRUNCATED]';
    }
    
    return body;
  }

  // MEMORY LEAK FIX: Immediate cleanup of individual session when it gets too large
  private cleanupSessionIfNeeded(session: DebuggerSession): void {
    if (session.requestData.size > BodyCaptureDebugger.MAX_REQUESTS_PER_SESSION) {
      const sortedRequests = Array.from(session.requestData.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedRequests.slice(0, session.requestData.size - BodyCaptureDebugger.MAX_REQUESTS_PER_SESSION);
      for (const [requestId] of toRemove) {
        session.requestData.delete(requestId);
      }
      
      console.log(`[BodyCaptureDebugger] Immediate cleanup removed ${toRemove.length} old requests from session`);
    }
  }
}

// Export singleton instance
export const bodyCaptureDebugger = new BodyCaptureDebugger();
