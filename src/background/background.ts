// src/background/background.ts
console.log('Background service worker started');

// --- Environment-Aware Storage System ---
import { EnvironmentStorageManager } from './environment-storage-manager';

// Initialize environment-aware storage system
const storageManager = new EnvironmentStorageManager();

// --- Token Event Tracking ---
interface TokenEvent {
  type: 'acquire' | 'refresh' | 'expired' | 'refresh_error';
  url: string;
  method: string;
  status: number;
  timestamp: string;
  source_url: string;
  expiry?: number;
  value_hash?: string;
}

// Token-related endpoint patterns
const TOKEN_ENDPOINTS = {
  acquire: [
    '/auth', '/login', '/token', '/signin', '/authenticate', '/oauth', 
    '/api/auth', '/api/login', '/api/token', '/api/signin', '/api/authenticate',
    '/v1/auth', '/v2/auth', '/session', '/sso', '/connect'
  ],
  refresh: [
    '/refresh', '/renew', '/reauth', '/token/refresh', '/auth/refresh',
    '/api/refresh', '/api/renew', '/api/reauth', '/api/token/refresh',
    '/v1/refresh', '/v2/refresh', '/session/refresh'
  ]
};

// Utility function to check if URL matches token patterns
function isTokenEndpoint(url: string, type: 'acquire' | 'refresh'): boolean {
  const patterns = TOKEN_ENDPOINTS[type];
  return patterns.some(pattern => url.toLowerCase().includes(pattern));
}

// Enhanced token type detection based on headers and context
function detectTokenTypeFromHeaders(headers: any, url: string): string {
  if (!headers || typeof headers !== 'object') return 'Unknown';
  
  // Parse headers if they're stored as JSON string
  let headersObj = headers;
  if (typeof headers === 'string') {
    try {
      headersObj = JSON.parse(headers);
    } catch {
      return 'Unknown';
    }
  }
  
  const authHeader = headersObj.authorization || headersObj.Authorization || '';
  const cookieHeader = headersObj.cookie || headersObj.Cookie || '';
  const csrfHeader = headersObj['x-csrf-token'] || headersObj['X-CSRF-Token'] || '';
  const apiKeyHeader = headersObj['x-api-key'] || headersObj['X-API-Key'] || headersObj['api-key'] || '';
  
  // Helper to check JWT format
  const isJwt = (token: string): boolean => token.split('.').length === 3;
  
  // Helper to get JWT payload for analysis
  const getJwtPayload = (token: string): any => {
    try {
      if (!isJwt(token)) return null;
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  };
  
  // 1. Bearer Token Analysis
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    if (isJwt(token)) {
      const payload = getJwtPayload(token);
      
      // ID Token detection (OIDC)
      if (payload && ('sub' in payload && 'email' in payload || 'aud' in payload)) {
        return 'ID Token (JWT)';
      }
      
      // Refresh Token (JWT format but used for refresh)
      if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
        return 'Refresh Token (JWT)';
      }
      
      return 'Access Token (JWT)';
    } else {
      // Opaque Bearer tokens
      if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
        return 'Refresh Token (Opaque)';
      }
      return 'Access Token (Opaque)';
    }
  }
  
  // 2. Basic Authentication
  if (authHeader.startsWith('Basic ')) {
    return 'Basic Auth';
  }
  
  // 3. API Key Authentication
  if (authHeader.startsWith('ApiKey ') || authHeader.startsWith('API-Key ')) {
    return 'API Key';
  }
  
  // 4. Custom API Key Headers
  if (apiKeyHeader) {
    return 'API Key';
  }
  
  // 5. CSRF Token Detection
  if (csrfHeader) {
    return 'CSRF Token';
  }
  
  // 6. Session Token Detection (Cookies)
  if (cookieHeader) {
    if (cookieHeader.includes('sessionid=') || 
        cookieHeader.includes('session=') || 
        cookieHeader.includes('JSESSIONID=') ||
        cookieHeader.includes('PHPSESSID=') ||
        cookieHeader.includes('ASP.NET_SessionId=')) {
      return 'Session Token';
    }
    
    if (cookieHeader.includes('access_token=')) {
      return 'Access Token (Cookie)';
    }
  }
  
  // 7. State Token Detection
  if (url.includes('state=') || headersObj['x-state-token']) {
    return 'State Token';
  }
  
  // 8. Custom Authorization schemes
  if (authHeader && !authHeader.startsWith('Bearer ') && !authHeader.startsWith('Basic ')) {
    const scheme = authHeader.split(' ')[0];
    return `${scheme} Token`;
  }
  
  return 'Unknown';
}

// Utility function to detect token events from network requests
function detectTokenEvent(requestData: any): TokenEvent | null {
  const { url, method, status } = requestData;
  
  if (!url || !method || status === undefined) {
    return null;
  }
  
  const timestamp = new Date().toISOString();
  const source_url = requestData.tabUrl || requestData.source_url || url;
  
  // Log all requests for debugging
  if (url.toLowerCase().includes('auth') || url.toLowerCase().includes('token') || url.toLowerCase().includes('login')) {
    console.log('🔍 Potential token endpoint detected:', {
      url,
      method,
      status,
      isAcquireEndpoint: isTokenEndpoint(url, 'acquire'),
      isRefreshEndpoint: isTokenEndpoint(url, 'refresh')
    });
  }
  
  // Detect token acquisition (successful auth requests)
  if (method === 'POST' && status >= 200 && status < 300 && isTokenEndpoint(url, 'acquire')) {
    console.log('✅ Token acquisition detected:', url);
    const detectedTokenType = detectTokenTypeFromHeaders(requestData.headers, url);
    return {
      type: 'acquire',
      url,
      method,
      status,
      timestamp,
      source_url,
      value_hash: `[REDACTED - token acquired: ${detectedTokenType}]`
    };
  }
  
  // Detect token refresh attempts
  if ((method === 'POST' || method === 'GET') && isTokenEndpoint(url, 'refresh')) {
    if (status >= 200 && status < 300) {
      console.log('✅ Token refresh detected:', url);
      const detectedTokenType = detectTokenTypeFromHeaders(requestData.headers, url);
      return {
        type: 'refresh',
        url,
        method,
        status,
        timestamp,
        source_url,
        value_hash: `[REDACTED - token refreshed: ${detectedTokenType}]`
      };
    } else if (status >= 400) {
      console.log('❌ Token refresh error detected:', url);
      const detectedTokenType = detectTokenTypeFromHeaders(requestData.headers, url);
      return {
        type: 'refresh_error',
        url,
        method,
        status,
        timestamp,
        source_url,
        value_hash: `[REFRESH ERROR - ${detectedTokenType}]`
      };
    }
  }
  
  // Detect token expiration (401/403 responses)
  if (status === 401 || status === 403) {
    const detectedTokenType = detectTokenTypeFromHeaders(requestData.headers, url);
    return {
      type: 'expired',
      url,
      method,
      status,
      timestamp,
      source_url,
      value_hash: `[EXPIRED TOKEN - ${detectedTokenType}]`
    };
  }
  
  return null;
}

// Function to store token events
async function storeTokenEvent(tokenEvent: TokenEvent): Promise<void> {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Prepare token event data for storage
    const tokenEventData = {
      type: tokenEvent.type as 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token',
      value_hash: tokenEvent.value_hash || `[${tokenEvent.type.toUpperCase()}]`,
      timestamp: new Date(tokenEvent.timestamp).getTime(),
      source_url: tokenEvent.source_url,
      expiry: tokenEvent.expiry,
      status: tokenEvent.status,
      method: tokenEvent.method,
      url: tokenEvent.url
    };
    
    await storageManager.insertTokenEvent(tokenEventData);
    console.log(`[Token Tracker] ✅ Stored ${tokenEvent.type} event:`, {
      type: tokenEvent.type,
      url: tokenEvent.url,
      status: tokenEvent.status,
      timestamp: tokenEvent.timestamp
    });
  } catch (error) {
    console.error('[Token Tracker] ❌ Failed to store token event:', error);
  }
}

const initializeStorage = async () => {
  try {
    await storageManager.init();
    
    const config = storageManager.getConfiguration();
    console.log('[Web App Monitor] ✅ Environment storage system initialized successfully');
    console.log('[Web App Monitor] Configuration:', config);
    console.log('[Web App Monitor] Active storage type:', storageManager.getStorageType());
    
    return storageManager;
  } catch (error) {
    console.error('[Web App Monitor] ❌ Storage system initialization failed:', error);
    throw error;
  }
};

// Initialize the storage system on service worker load
initializeStorage()
  .then(() => {
    console.log('[Web App Monitor] Storage system ready for use');
    
    // Also initialize Chrome storage with proper settings structure
    initializeChromeStorageSettings();
  })
  .catch((err) => {
    console.error('[Web App Monitor] Failed to initialize storage system:', err);
  });

// Initialize Chrome storage with the settings structure expected by content script
const initializeChromeStorageSettings = () => {
  chrome.storage.sync.get(['extensionSettings'], (result) => {
    if (!result.extensionSettings || !result.extensionSettings.networkInterception) {
      console.log('[Web App Monitor] Initializing Chrome storage settings...');
      
      const defaultSettings = {
        notifications: true,
        autoSync: true,
        theme: 'system',
        language: 'en',
        updateFrequency: 5,
        privacyMode: false,
        dataCollection: true,
        networkInterception: {
          enabled: true, // Permission-based: enabled in settings
          bodyCapture: {
            mode: 'partial',
            captureRequests: false,
            captureResponses: false,
          },
          privacy: {
            autoRedact: true,
            filterNoise: true,
          },
          urlPatterns: {
            enabled: false,
            patterns: []
          },
          tabSpecific: {
            enabled: true,
            defaultState: 'paused' // Per-tab: starts paused, user must enable
          },
          requestFilters: {
            enabled: false,
            filters: []
          },
          profiles: []
        },
        errorLogging: {
          enabled: true, // Permission-based: enabled in settings
          severityFilter: {
            enabled: false,
            allowed: ['error', 'warn', 'info']
          },
          tabSpecific: {
            enabled: true,
            defaultState: 'paused' // Per-tab: starts paused, user must enable
          }
        },
      };
      
      chrome.storage.local.set({ settings: defaultSettings }, () => {
        console.log('[Web App Monitor] ✅ Chrome storage settings initialized');
        console.log('[Web App Monitor] Permission-based logging enabled: Network & Error logging capabilities enabled');
        console.log('[Web App Monitor] Per-tab defaults: Both start paused, user must manually enable per tab');
      });
    } else {
      console.log('[Web App Monitor] Chrome storage settings already exist');
    }
  });
};

// Expose storage system for debugging in DevTools (service worker context)
(self as any).storageManager = storageManager;

// Core performance testing functions
(self as any).insertTestApiCall = async () => {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    const startTime = performance.now();
    
    const testData = {
      url: 'https://api.test.com/debug',
      method: 'GET',
      headers: JSON.stringify({ 'authorization': 'Bearer test-token' }),
      payload_size: 128,
      status: 200,
      response_body: '{"status": "test successful"}',
      timestamp: Date.now()
    };
    
    const id = await storageManager.insertApiCall(testData);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('✅ Test API call inserted with ID:', id);
    console.log('⚡ Insert performance:', duration.toFixed(3) + 'ms');
    console.log('📊 Estimated insert rate:', Math.round(1000 / duration) + '/sec');
    
    return { id, duration, estimatedRate: Math.round(1000 / duration) };
  } catch (error) {
    console.error('Failed to insert test API call:', error);
  }
};

(self as any).queryApiCalls = async () => {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    const startTime = performance.now();
    
    // Use fast query method if available, fallback to regular method
    const storage = storageManager.getUnderlyingStorage();
    let results;
    
    if (storage && 'getApiCallsFast' in storage && typeof storage.getApiCallsFast === 'function') {
      results = await storage.getApiCallsFast(10);
    } else {
      results = await storageManager.getApiCalls(10, 0);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('✅ API calls queried:', results.length, 'records');
    console.log('⚡ Query performance:', duration.toFixed(3) + 'ms');
    console.log('📊 Estimated query rate:', Math.round(1000 / duration) + '/sec');
    
    return { results, duration, estimatedRate: Math.round(1000 / duration) };
  } catch (error) {
    console.error('Failed to query API calls:', error);
  }
};

// Real-time performance testing function
(self as any).runPerformanceTest = async (iterations = 10) => {
  console.log('🚀 Running Real-Time Performance Test (' + iterations + ' iterations)...');
  
  const insertTimes = [];
  const queryTimes = [];
  
  try {
    for (let i = 0; i < iterations; i++) {
      // Test insert
      const insertResult = await (self as any).insertTestApiCall();
      if (insertResult?.duration) {
        insertTimes.push(insertResult.duration);
      }
      
      // Test query
      const queryResult = await (self as any).queryApiCalls();
      if (queryResult?.duration) {
        queryTimes.push(queryResult.duration);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const avgInsertTime = insertTimes.reduce((a, b) => a + b, 0) / insertTimes.length;
    const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
    
    const insertRate = Math.round(1000 / avgInsertTime);
    const queryRate = Math.round(1000 / avgQueryTime);
    
    const results = {
      iterations,
      insertPerformance: {
        averageTime: parseFloat(avgInsertTime.toFixed(3)),
        rate: insertRate,
        grade: insertRate >= 3000 ? 'A+' : insertRate >= 1000 ? 'A' : insertRate >= 500 ? 'B' : 'C'
      },
      queryPerformance: {
        averageTime: parseFloat(avgQueryTime.toFixed(3)),
        rate: queryRate,
        grade: queryRate >= 20000 ? 'A+' : queryRate >= 10000 ? 'A' : queryRate >= 5000 ? 'B' : 'C'
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('');
    console.log('📊 REAL-TIME PERFORMANCE RESULTS');
    console.log('================================');
    console.log('Insert Rate:', results.insertPerformance.rate + '/sec (' + results.insertPerformance.grade + ')');
    console.log('Query Rate:', results.queryPerformance.rate + '/sec (' + results.queryPerformance.grade + ')');
    console.log('Average Insert Time:', results.insertPerformance.averageTime + 'ms');
    console.log('Average Query Time:', results.queryPerformance.averageTime + 'ms');
    console.log('Test Timestamp:', results.timestamp);
    console.log('');
    
    return results;
  } catch (error) {
    console.error('Performance test failed:', error);
  }
};

// Generate README metrics from real results
(self as any).generateReadmeMetrics = async () => {
  const perfResults = await (self as any).runPerformanceTest(20);
  if (!perfResults) return 'Performance test failed';
  
  const readmeSnippet = `
## 📊 Performance Metrics (Real-Time Tested - ${new Date().toLocaleDateString()})

### Current Performance - Actual Chrome Extension Results! 🚀
- **Insert Rate**: ${perfResults.insertPerformance.rate.toLocaleString()} records/second (${perfResults.insertPerformance.grade} Grade)
- **Query Rate**: ${perfResults.queryPerformance.rate.toLocaleString()} records/second (${perfResults.queryPerformance.grade} Grade)
- **Average Insert Time**: ${perfResults.insertPerformance.averageTime}ms
- **Average Query Time**: ${perfResults.queryPerformance.averageTime}ms
- **Test Method**: Real Chrome Extension operations (${perfResults.iterations} iterations)

### Performance Breakdown
| Metric | Current Value | Performance Grade | Target Status |
|--------|---------------|-------------------|---------------|
| **Insert Rate** | ${perfResults.insertPerformance.rate.toLocaleString()}/sec | **${perfResults.insertPerformance.grade}** | ${perfResults.insertPerformance.rate >= 1000 ? '✅ Exceeded' : '❌ Below'} |
| **Query Rate** | ${perfResults.queryPerformance.rate.toLocaleString()}/sec | **${perfResults.queryPerformance.grade}** | ${perfResults.queryPerformance.rate >= 10000 ? '✅ Exceeded' : '❌ Below'} |

*Tested on actual ${storageManager.getStorageType()} storage - ${perfResults.timestamp}*
`;
  
  console.log(readmeSnippet);
  return readmeSnippet;
};

// --- Message Handlers for Popup Communication ---

// Network request handler
async function handleNetworkRequest(requestData: any, sendResponse: (response: any) => void, sender?: chrome.runtime.MessageSender) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Get current settings to check filtering rules
    const settingsResult = await chrome.storage.local.get(['settings']);
    const settings = settingsResult.settings || {};
    const networkConfig = settings.networkInterception || {};
    
    // Ensure we have default token logging settings if they don't exist
    const tokenLoggingDefaults = {
      enabled: true,
      tabSpecific: {
        enabled: true,
        defaultState: 'paused'
      },
      eventTypes: {
        acquire: true,
        refresh: true,
        expired: true,
        refresh_error: true
      }
    };
    
    // Use default settings if tokenLogging config doesn't exist
    if (!settings.tokenLogging) {
      settings.tokenLogging = tokenLoggingDefaults;
      // Save the default settings
      await chrome.storage.local.set({ settings });
    }
    
    // Check if network interception is enabled
    if (!networkConfig.enabled) {
      sendResponse({ success: false, reason: 'Network interception disabled' });
      return;
    }
    
    // Check tab-specific control (ALWAYS check if enabled, regardless of default)
    if (networkConfig.tabSpecific?.enabled) {
      // Get the sender tab ID from the message
      const tabId = sender?.tab?.id;
      
      if (tabId) {
        try {
          const tabStateResult = await chrome.storage.local.get([`tabLogging_${tabId}`]);
          const tabState = tabStateResult[`tabLogging_${tabId}`];
          
          // Start with the default state from settings
          let tabLoggingEnabled = networkConfig.tabSpecific?.defaultState === 'active';
          
          if (tabState !== undefined) {
            // Override with actual tab state if it exists
            if (typeof tabState === 'boolean') {
              tabLoggingEnabled = tabState;
            } else if (tabState && typeof tabState === 'object' && 'active' in tabState) {
              tabLoggingEnabled = tabState.active;
            }
          }
          
          if (!tabLoggingEnabled) {
            sendResponse({ success: false, reason: 'Tab logging disabled' });
            return;
          }
        } catch (tabError) {
          console.warn('Could not determine tab logging state, using default:', tabError);
          // Use default state from settings
          if (networkConfig.tabSpecific?.defaultState === 'paused') {
            sendResponse({ success: false, reason: 'Tab logging disabled (default)' });
            return;
          }
        }
      } else {
        console.warn('No tab ID available for tab-specific filtering');
        // If we can't get tab ID, use default state
        if (networkConfig.tabSpecific?.defaultState === 'paused') {
          sendResponse({ success: false, reason: 'Tab logging disabled (no tab ID)' });
          return;
        }
      }
    }
    
    // Filter out common noise/telemetry requests (if enabled)
    if (networkConfig.privacy?.filterNoise && isNoiseRequest(requestData.url)) {
      console.log('🔇 BACKGROUND: Filtered noise request:', requestData.url);
      sendResponse({ success: false, reason: 'Filtered out noise/telemetry request' });
      return;
    }
    
    // Check URL pattern filtering (if enabled)
    if (networkConfig.urlPatterns?.enabled && networkConfig.urlPatterns?.patterns?.length > 0) {
      const activePatterns = networkConfig.urlPatterns.patterns.filter((p: any) => p.active);
      
      if (activePatterns.length > 0) {
        const matchesPattern = activePatterns.some((pattern: any) => {
          return matchesUrlPattern(requestData.url, pattern.pattern);
        });
        
        if (!matchesPattern) {
          sendResponse({ success: false, reason: 'URL does not match any active patterns' });
          return;
        }
      }
    }
    
    // All filters passed - check if this is a token-related request
    // and if token logging is disabled, skip storing this request entirely
    
    // First, detect if this is a token event BEFORE storing
    const tokenEvent = detectTokenEvent(requestData);
    console.log('🔐 Pre-storage Token Event Detection:', {
      tokenEvent,
      url: requestData.url,
      method: requestData.method,
      status: requestData.status
    });
    
    // If this is a token-related request, check if token logging is enabled
    if (tokenEvent) {
      const tokenConfig = settings.tokenLogging || {};
      console.log('🔐 Token Config Check (before storage):', tokenConfig);
      
      let shouldAllowTokenRequest = false;
      
      if (tokenConfig.enabled) {
        console.log('🔐 Global token logging is enabled');
        // Check tab-specific token logging (ONLY if tab-specific is enabled)
        if (tokenConfig.tabSpecific?.enabled && sender?.tab?.id) {
          console.log('🔐 Tab-specific token logging is enabled, checking tab state...');
          const tabId = sender.tab.id;
          try {
            const tokenTabStateResult = await chrome.storage.local.get([`tabTokenLogging_${tabId}`]);
            const tokenTabState = tokenTabStateResult[`tabTokenLogging_${tabId}`];
            console.log('🔐 Tab Token State (pre-storage):', { tabId, tokenTabState });
            
            // Start with the default state from settings
            let tabTokenLoggingEnabled = tokenConfig.tabSpecific?.defaultState === 'active';
            console.log('🔐 Default state from settings (pre-storage):', tokenConfig.tabSpecific?.defaultState, 'enabled:', tabTokenLoggingEnabled);
            
            if (tokenTabState !== undefined) {
              console.log('🔐 Tab state exists (pre-storage), checking value...');
              // Override with actual tab state if it exists
              if (typeof tokenTabState === 'boolean') {
                tabTokenLoggingEnabled = tokenTabState;
                console.log('🔐 Tab state is boolean (pre-storage):', tabTokenLoggingEnabled);
              } else if (tokenTabState && typeof tokenTabState === 'object' && 'active' in tokenTabState) {
                tabTokenLoggingEnabled = tokenTabState.active;
                console.log('🔐 Tab state is object with active property (pre-storage):', tabTokenLoggingEnabled);
              }
            } else {
              console.log('🔐 Tab state does not exist (pre-storage), using default');
            }
            
            shouldAllowTokenRequest = tabTokenLoggingEnabled;
            console.log('🔐 Final decision - Should Allow Token Request:', { shouldAllowTokenRequest, tabTokenLoggingEnabled });
          } catch (tokenTabError) {
            console.warn('Could not determine tab token logging state (pre-storage), using default:', tokenTabError);
            // Use default state from settings
            shouldAllowTokenRequest = tokenConfig.tabSpecific?.defaultState === 'active';
          }
        } else if (!tokenConfig.tabSpecific?.enabled) {
          console.log('🔐 Tab-specific token logging is disabled, using global setting');
          shouldAllowTokenRequest = true; // If tab-specific is disabled, use global setting
        } else {
          console.log('🔐 No tab ID available, using default');
          shouldAllowTokenRequest = tokenConfig.tabSpecific?.defaultState === 'active';
        }
      } else {
        console.log('🔐 Token logging globally disabled');
        shouldAllowTokenRequest = false;
      }
      
      // If token logging is disabled, don't store this request at all
      if (!shouldAllowTokenRequest) {
        console.log('🔐 Token logging disabled - skipping storage of auth request:', requestData.url);
        sendResponse({ success: false, reason: 'Token logging disabled - auth request filtered' });
        return;
      }
    }
    
    // Store the request (either non-token request or token request with logging enabled)
    
    // Map the request data from main-world-script to storage API format
    const storageData = {
      url: requestData.url,
      method: requestData.method || 'GET',
      headers: JSON.stringify({
        request: requestData.headers?.request || {},
        response: requestData.headers?.response || {}
      }),
      payload_size: requestData.requestBody ? requestData.requestBody.length : 0,
      status: requestData.status || 0,
      response_body: requestData.responseBody || `Status: ${requestData.status} ${requestData.statusText}`,
      // Add request body if captured
      request_body: requestData.requestBody || null,
      timestamp: requestData.timestamp ? new Date(requestData.timestamp).getTime() : Date.now(),
      response_time: requestData.duration || null
    };
    
    // Store the network request using the existing API call storage
    const id = await storageManager.insertApiCall(storageData);
    
    // --- Token Event Tracking (for requests that made it through filtering) ---
    // We already know this is a token event if we got here and tokenEvent is truthy
    if (tokenEvent) {
      console.log('🔐 STORING TOKEN EVENT (post-storage):', tokenEvent);
      await storeTokenEvent(tokenEvent);
      
      // Update tab token count if we have a tab ID
      if (sender?.tab?.id) {
        const tabId = sender.tab.id;
        try {
          const tokenTabStateResult = await chrome.storage.local.get([`tabTokenLogging_${tabId}`]);
          const currentTokenTabState = tokenTabStateResult[`tabTokenLogging_${tabId}`];
          
          if (currentTokenTabState && typeof currentTokenTabState === 'object') {
            const updatedTokenTabState = {
              ...currentTokenTabState,
              tokenCount: (currentTokenTabState.tokenCount || 0) + 1
            };
            await chrome.storage.local.set({ [`tabTokenLogging_${tabId}`]: updatedTokenTabState });
            console.log('🔐 Updated tab token count:', updatedTokenTabState.tokenCount);
          }
        } catch (tokenTabUpdateError) {
          console.warn('Failed to update tab token count:', tokenTabUpdateError);
        }
      }
    }
    
    // ALWAYS update tab request count (regardless of tab-specific setting)
    // This ensures popup shows accurate count matching the dashboard
    if (sender?.tab?.id) {
      const tabId = sender.tab.id;
      try {
        const tabStateResult = await chrome.storage.local.get([`tabLogging_${tabId}`]);
        const currentTabState = tabStateResult[`tabLogging_${tabId}`];
        
        if (currentTabState && typeof currentTabState === 'object') {
          const updatedTabState = {
            ...currentTabState,
            requestCount: (currentTabState.requestCount || 0) + 1
          };
          await chrome.storage.local.set({ [`tabLogging_${tabId}`]: updatedTabState });
        } else {
          // Create tab state if it doesn't exist (for accurate counting)
          const newTabState = {
            active: networkConfig.tabSpecific?.defaultState === 'active',
            startTime: Date.now(),
            requestCount: 1
          };
          await chrome.storage.local.set({ [`tabLogging_${tabId}`]: newTabState });
        }
      } catch (tabUpdateError) {
        console.warn('Failed to update tab request count:', tabUpdateError);
      }
    }
    
    sendResponse({ success: true, id });
  } catch (error) {
    console.error('[Web App Monitor] Failed to store network request:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Storage failed' });
  }
}

// Console error handler
async function handleConsoleError(errorData: any, sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }

    // Check if error logging is enabled globally
    const settings = await chrome.storage.local.get(['settings']);
    const errorLoggingConfig = settings.settings?.errorLogging || {};
    
    if (!errorLoggingConfig.enabled) {
      sendResponse({ success: false, reason: 'Error logging disabled' });
      return;
    }

    // Check tab-specific error logging ONLY if tab-specific is enabled
    if (errorLoggingConfig.tabSpecific?.enabled) {
      if (errorData.tabId) {
        try {
          const tabData = await chrome.storage.local.get([`tabErrorLogging_${errorData.tabId}`]);
          const tabState = tabData[`tabErrorLogging_${errorData.tabId}`];
          
          let isTabLoggingActive = false;
          if (tabState) {
            isTabLoggingActive = typeof tabState === 'boolean' ? tabState : tabState.active;
          } else {
            // No tab state exists, use default
            isTabLoggingActive = errorLoggingConfig.tabSpecific?.defaultState === 'active';
          }
          
          if (!isTabLoggingActive) {
            sendResponse({ success: false, reason: 'Tab error logging paused' });
            return;
          }
        } catch (tabError) {
          console.warn('Could not determine tab error logging state, using default:', tabError);
        }
      } else {
        // No tab ID provided but tab-specific is enabled - use default behavior
        const defaultActive = errorLoggingConfig.tabSpecific?.defaultState === 'active';
        if (!defaultActive) {
          sendResponse({ success: false, reason: 'No tab ID and default state is paused' });
          return;
        }
      }
    }
    // If tab-specific is disabled, log globally for all tabs (no additional checks needed)

    // Check severity filtering if enabled
    if (errorLoggingConfig.severityFilter?.enabled) {
      const allowedSeverities = errorLoggingConfig.severityFilter.allowed || [];
      const errorSeverity = errorData.severity || 'error';
      
      if (!allowedSeverities.includes(errorSeverity)) {
        sendResponse({ success: false, reason: `Severity '${errorSeverity}' filtered out` });
        return;
      }
    }
    
    // Map the error data from main-world-script to storage API format
    const storageData = {
      message: errorData.message || 'Unknown error',
      stack_trace: errorData.stack || 'No stack trace available',
      timestamp: errorData.timestamp ? new Date(errorData.timestamp).getTime() : Date.now(),
      severity: errorData.severity || 'error',
      url: errorData.url || 'Unknown URL'
    };
    
    // Store the console error
    const id = await storageManager.insertConsoleError(storageData);

    // ALWAYS update tab error count (regardless of tab-specific setting)
    // This ensures popup shows accurate count matching the dashboard
    if (errorData.tabId) {
      try {
        const tabData = await chrome.storage.local.get([`tabErrorLogging_${errorData.tabId}`]);
        const tabState = tabData[`tabErrorLogging_${errorData.tabId}`];
        
        if (tabState && typeof tabState === 'object') {
          const updatedState = {
            ...tabState,
            errorCount: (tabState.errorCount || 0) + 1,
            lastErrorTime: Date.now()
          };
          await chrome.storage.local.set({ [`tabErrorLogging_${errorData.tabId}`]: updatedState });
        } else {
          // Create tab state if it doesn't exist (for accurate counting)
          const newTabState = {
            active: errorLoggingConfig.tabSpecific?.defaultState === 'active',
            startTime: Date.now(),
            errorCount: 1,
            lastErrorTime: Date.now()
          };
          await chrome.storage.local.set({ [`tabErrorLogging_${errorData.tabId}`]: newTabState });
        }
      } catch (tabUpdateError) {
        console.warn('Failed to update tab error count:', tabUpdateError);
      }
    }
    
    // Update last activity timestamp
    await chrome.storage.sync.set({ lastActivity: Date.now() });

    sendResponse({ success: true, id });
  } catch (error) {
    console.error('[Web App Monitor] Failed to store console error:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Storage failed' });
  }
}

// Helper function to match URL patterns (supports wildcards)
function matchesUrlPattern(url: string, pattern: string): boolean {
  try {
    // Convert pattern to regex
    // Replace * with .* and escape other regex special characters
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\\\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(url);
  } catch (error) {
    console.error('Invalid URL pattern:', pattern, error);
    return false;
  }
}

// Helper function to filter out noise/telemetry requests
function isNoiseRequest(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Specific telemetry and tracking domains (exact matches or specific subdomains)
    const noiseDomains = [
      'edge.sdk.awswaf.com',        // AWS WAF telemetry
      'waf.amazonaws.com',          // AWS WAF
      'googletagmanager.com',       // Google Tag Manager
      'google-analytics.com',       // Google Analytics
      'www.google-analytics.com',   // Google Analytics www
      'doubleclick.net',            // Google Ads
      'connect.facebook.net',       // Facebook Connect/Pixel
      'hotjar.com',                 // Hotjar tracking
      'fullstory.com',              // FullStory tracking
      'intercom.io',                // Intercom tracking
      'mixpanel.com',               // Mixpanel analytics
      'segment.com',                // Segment analytics
      'amplitude.com',              // Amplitude analytics
      'bugsnag.com',                // Error tracking
      'sentry.io',                  // Error tracking
      'rollbar.com',                // Error tracking
      'newrelic.com',               // Performance monitoring
      'datadog.com',                // Performance monitoring
      'telemetry.mozilla.org',      // Mozilla telemetry
      'stats.wp.com',               // WordPress stats
      'quantcast.com',              // Quantcast tracking
      'scorecardresearch.com'       // ComScore tracking
    ];
    
    // More specific telemetry paths - avoid catching legitimate API endpoints
    const noisePaths = [
      '/telemetry',
      '/analytics',
      '/tracking',
      '/beacon',
      '/collect',
      '/pixel',
      '/impression'
    ];
    
    // Specific tracking endpoints that are commonly noise
    const noisePathPatterns = [
      '/google-analytics',
      '/gtag/',
      '/ga/',
      '/facebook-pixel',
      '/fb-pixel',
      '/_tracking',
      '/_analytics',
      '/_telemetry'
    ];
    
    // Check if hostname exactly matches any noise domains
    const domainMatch = noiseDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    if (domainMatch) {
      return true;
    }
    
    // Check for specific Google services that are typically noise
    if (hostname.includes('googleapis.com')) {
      // Only filter specific Google services, not all googleapis.com
      const googleNoiseServices = [
        '/pagespeedonline',
        '/analytics',
        '/adsense',
        '/doubleclick'
      ];
      if (googleNoiseServices.some(service => pathname.includes(service))) {
        return true;
      }
    }
    
    // Check if path matches any noise patterns (exact matches for common paths)
    const pathMatch = noisePaths.some(path => pathname === path || pathname.startsWith(path + '/'));
    if (pathMatch) {
      return true;
    }
    
    // Check for specific tracking path patterns
    const patternMatch = noisePathPatterns.some(pattern => pathname.includes(pattern));
    if (patternMatch) {
      return true;
    }
    
    // Filter out common tracking query parameters (but be specific)
    const search = urlObj.search.toLowerCase();
    if (search.includes('utm_source=') || search.includes('fbclid=') || search.includes('gclid=')) {
      return true;
    }
    
    return false;
  } catch (error) {
    // If URL parsing fails, don't filter it out
    return false;
  }
}

// Get network requests handler
async function handleGetNetworkRequests(limit: number, sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Get recent API calls (network requests)
    const requests = await storageManager.getApiCalls(limit);
    const counts = await storageManager.getTableCounts();
    
    sendResponse({ 
      success: true, 
      requests: requests || [], 
      total: counts?.api_calls || 0 
    });
  } catch (error) {
    console.error('[Web App Monitor] Failed to get network requests:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Query failed' });
  }
}

// Clear all data handler
async function handleClearAllData(sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Clear all stored network requests
    await storageManager.clearAllData();
    
    // Also clear all tab-specific request counters
    const allStorage = await chrome.storage.local.get(null);
    const tabLoggingKeys = Object.keys(allStorage).filter(key => key.startsWith('tabLogging_'));
    const tabErrorLoggingKeys = Object.keys(allStorage).filter(key => key.startsWith('tabErrorLogging_'));
    
    // Reset request counts for all tabs while preserving their active/paused state
    const updates: Record<string, any> = {};
    for (const key of tabLoggingKeys) {
      const tabState = allStorage[key];
      if (tabState && typeof tabState === 'object') {
        updates[key] = {
          ...tabState,
          requestCount: 0
        };
      } else if (typeof tabState === 'boolean') {
        // Convert old boolean format to new object format with counter
        updates[key] = {
          active: tabState,
          startTime: Date.now(),
          requestCount: 0
        };
      }
    }
    
    // Reset error counts for all tabs while preserving their active/paused state
    for (const key of tabErrorLoggingKeys) {
      const tabState = allStorage[key];
      if (tabState && typeof tabState === 'object') {
        updates[key] = {
          ...tabState,
          errorCount: 0
        };
      } else if (typeof tabState === 'boolean') {
        // Convert old boolean format to new object format with counter
        updates[key] = {
          active: tabState,
          startTime: Date.now(),
          errorCount: 0
        };
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
    
    sendResponse({ 
      success: true, 
      message: 'All data and tab counters cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing all data:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Get console errors handler
async function handleGetConsoleErrors(limit: number, sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Get recent console errors
    const errors = await storageManager.getConsoleErrors(limit);
    const counts = await storageManager.getTableCounts();
    
    sendResponse({ 
      success: true, 
      errors: errors || [], 
      total: counts?.console_errors || 0 
    });
  } catch (error) {
    console.error('[Web App Monitor] Failed to get console errors:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Query failed' });
  }
}

// Get token events handler
async function handleGetTokenEvents(limit: number, sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Get recent token events
    const events = await storageManager.getTokenEvents(limit);
    const counts = await storageManager.getTableCounts();
    
    sendResponse({ 
      success: true, 
      events: events || [], 
      total: counts?.token_events || 0 
    });
  } catch (error) {
    console.error('[Web App Monitor] Failed to get token events:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Query failed' });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action || message.type) {
    case 'INJECT_MAIN_WORLD_SCRIPT':
      // Handle main world script injection from content script
      if (sender.tab && sender.tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          world: 'MAIN',
          files: ['assets/main-world-network-interceptor-BFD3WDcJ.js'] // Use the built file name
        }).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          console.log('[Background] Main world injection failed:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
      } else {
        sendResponse({ success: false, error: 'No tab ID available' });
      }
      break;
      
    case 'getCurrentTabId':
    case 'GET_CURRENT_TAB_ID':
      // Get current tab ID for content script
      if (sender.tab && sender.tab.id) {
        sendResponse({ tabId: sender.tab.id });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          sendResponse({ tabId: tabs[0]?.id || 0 });
        });
        return true; // Keep message channel open for async response
      }
      break;
      
    case 'getTabInfo':
      // Get current active tab information
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          sendResponse({
            title: tab.title || 'Unknown',
            url: tab.url || 'Unknown'
          });
        } else {
          sendResponse({
            title: 'Unknown',
            url: 'Unknown'
          });
        }
      });
      return true; // Keep message channel open for async response

    case 'openDashboard':
      // Open dashboard in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/dashboard/dashboard.html')
      });
      sendResponse({ success: true });
      break;

    case 'storeNetworkRequest':
    case 'STORE_NETWORK_REQUEST':
    case 'NETWORK_REQUEST':
      // Store network request data from content script
      handleNetworkRequest(message.data, sendResponse, sender);
      return true; // Keep message channel open for async response

    case 'CONSOLE_ERROR':
      // Store console error data from content script
      handleConsoleError(message.data, sendResponse);
      return true; // Keep message channel open for async response

    case 'getNetworkRequests':
      // Get stored network requests
      handleGetNetworkRequests(message.limit || 50, sendResponse);
      return true; // Keep message channel open for async response

    case 'clearAllData':
      // Clear all stored network requests
      handleClearAllData(sendResponse);
      return true; // Keep message channel open for async response

    case 'getConsoleErrors':
      // Get stored console errors
      handleGetConsoleErrors(message.limit || 50, sendResponse);
      return true; // Keep message channel open for async response

    case 'getTokenEvents':
      // Get stored token events
      handleGetTokenEvents(message.limit || 50, sendResponse);
      return true; // Keep message channel open for async response

    default:
      // Let other messages pass through
      break;
  }
});

// No additional message interception needed - storage manager handles operations internally