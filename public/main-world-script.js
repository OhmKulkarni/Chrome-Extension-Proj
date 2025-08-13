// Main world injection script - runs in the same context as the page
// Use original console.log for the initial message before interception starts
(console.log || function(){})('🌍 MAIN-WORLD: Script injected into main world');

// Default settings - complete structure
let extensionSettings = {
  maxBodySize: 2000, // Default truncation limit
  captureRequests: false, // Default: don't capture request bodies
  captureResponses: false // Default: don't capture response bodies
};

// Track original functions and interception state
let originalFetch = window.fetch;
let originalXhrOpen = XMLHttpRequest.prototype.open;
let originalXhrSend = XMLHttpRequest.prototype.send;
let originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

// Store original console methods properly to prevent recursive calls
if (!window.__originalConsole) {
  window.__originalConsole = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log
  };
}

let originalConsoleError = window.__originalConsole.error;
let originalConsoleWarn = window.__originalConsole.warn;
let originalConsoleInfo = window.__originalConsole.info;
let originalConsoleLog = window.__originalConsole.log;
let isIntercepting = false;
let isConsoleIntercepting = false;

// Prevent recursive console interception
window.__isInterceptingConsole = window.__isInterceptingConsole ?? false;

// Debug logging function that won't cause recursion
const debugLog = (message, ...args) => {
  if (window.__originalConsole && window.__originalConsole.log) {
    window.__originalConsole.log(message, ...args);
  }
};

// State tracking for main-world context (no direct Chrome API access)
let mainWorldState = {
  extensionEnabled: true,
  networkLoggingEnabled: true,
  consoleLoggingEnabled: true
};

// Communication with content script for Chrome API access
const requestFromContentScript = (action, data = {}) => {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36);
    let resolved = false;
    
    debugLog('🌍 MAIN_WORLD: Requesting from content script:', action, 'ID:', requestId);
    
    const responseHandler = (event) => {
      if (event.detail?.requestId === requestId && !resolved) {
        resolved = true;
        window.removeEventListener('contentScriptResponse', responseHandler);
        debugLog('🌍 MAIN_WORLD: Received response for:', action, 'Response:', event.detail.response);
        resolve(event.detail.response);
      }
    };
    
    window.addEventListener('contentScriptResponse', responseHandler);
    window.dispatchEvent(new CustomEvent('contentScriptRequest', {
      detail: { action, data, requestId }
    }));
    
    // Cleanup timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('contentScriptResponse', responseHandler);
        debugLog('🌍 MAIN_WORLD: Request timeout for:', action);
        resolve(null);
      }
    }, 1000);
  });
};

// Check if logging is enabled for current tab
const isLoggingEnabled = async () => {
  try {
    debugLog('🌍 MAIN_WORLD: Checking if logging is enabled...');
    const result = await requestFromContentScript('checkNetworkLogging');
    debugLog('🌍 MAIN_WORLD: Network logging check result:', result);
    return result?.enabled ?? mainWorldState.networkLoggingEnabled;
  } catch (error) {
    debugLog('🌍 MAIN_WORLD: Error checking logging state:', error);
    return mainWorldState.networkLoggingEnabled;
  }
};

// Check if console error logging is enabled for current tab
const isConsoleLoggingEnabled = async () => {
  try {
    debugLog('🌍 MAIN_WORLD: Checking if console logging is enabled...');
    const result = await requestFromContentScript('checkConsoleLogging');
    debugLog('🌍 MAIN_WORLD: Console logging check result:', result);
    return result?.enabled ?? mainWorldState.consoleLoggingEnabled;
  } catch (error) {
    debugLog('🌍 MAIN_WORLD: Error checking console logging state:', error);
    return mainWorldState.consoleLoggingEnabled;
  }
};

// Helper function to safely extract domain from URL
function getSafeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    debugLog('🌍 MAIN-WORLD: Invalid URL, using fallback domain:', url);
    // Extract domain from URL string manually
    if (typeof url === 'string') {
      const match = url.match(/^https?:\/\/([^\/]+)/);
      return match ? match[1] : 'unknown';
    }
    return 'unknown';
  }
}

// Helper function to truncate body content based on settings
function truncateBody(text, maxSize = extensionSettings.maxBodySize) {
  if (!text || typeof text !== 'string') return '';
  
  // Safety: Even if user sets 0 (no limit), apply a reasonable safety limit to prevent memory issues
  const SAFETY_MAX_SIZE = 50000; // 50KB safety limit
  let effectiveMaxSize;
  
  if (maxSize === 0) {
    // User wants no limit, but apply safety limit to prevent memory bloat
    effectiveMaxSize = SAFETY_MAX_SIZE;
  } else {
    // User specified a limit, respect it but cap at safety limit
    effectiveMaxSize = Math.min(maxSize, SAFETY_MAX_SIZE);
  }
  
  if (text.length > effectiveMaxSize) {
    debugLog(`🌍 MAIN-WORLD: Truncating body from ${text.length} to ${effectiveMaxSize} characters (user limit: ${maxSize})`);
    return text.substring(0, effectiveMaxSize) + '... [TRUNCATED]';
  }
  
  return text;
}

// Create our main world interception
const interceptFetch = (originalFetch, input, init) => {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  debugLog('🌍 MAIN-WORLD: Intercepted fetch request:', url);
  
  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = Date.now();
    debugLog('🌍 MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
    
    // Try to capture response body
    let responseBody = '';
    let requestBody = '';
    
    try {
      // Capture request body ONLY if enabled in settings
      if (extensionSettings.captureRequests && init && init.body) {
        requestBody = truncateBody(String(init.body), extensionSettings.maxBodySize);
        debugLog('🌍 MAIN-WORLD: Request body capture enabled, captured', requestBody.length, 'chars');
      } else if (init && init.body) {
        requestBody = '[Body capture disabled in settings]';
      }
      
      // Capture response body ONLY if enabled in settings
      if (extensionSettings.captureResponses) {
        const responseClone = response.clone();
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json') || contentType.includes('text/')) {
          try {
            responseBody = await responseClone.text();
            responseBody = truncateBody(responseBody, extensionSettings.maxBodySize);
            debugLog('🌍 MAIN-WORLD: Response body capture enabled, captured', responseBody.length, 'chars');
          } catch (e) {
            debugLog('🌍 MAIN-WORLD: Could not read response body:', e);
          }
        }
      } else {
        responseBody = '[Body capture disabled in settings]';
      }
    } catch (e) {
      debugLog('🌍 MAIN-WORLD: Error capturing fetch body:', e);
    }
    
    // Capture request headers
    let requestHeaders = {};
    if (init && init.headers) {
      if (init.headers instanceof Headers) {
        for (const [key, value] of init.headers.entries()) {
          requestHeaders[key] = value;
        }
      } else if (typeof init.headers === 'object') {
        requestHeaders = { ...init.headers };
      }
    }
    
    // Capture response headers
    let responseHeaders = {};
    for (const [key, value] of response.headers.entries()) {
      responseHeaders[key] = value;
    }
    
    // Send captured data
    const capturedData = {
      type: 'fetch',
      method: (init?.method || 'GET').toUpperCase(),
      url: url,
      domain: getSafeDomain(url),
      status: response.status,
      statusText: response.statusText,
      duration: endTime - startTime,
      requestHeaders,
      responseHeaders,
      requestBody,
      responseBody,
      timestamp: new Date().toISOString()
    };

    debugLog('🌍 MAIN-WORLD: Sending fetch data:', capturedData);
    
    // Send to content script
    window.postMessage({
      source: 'main-world-network-interceptor',
      data: capturedData
    }, '*');
    
    return response;
  }).catch(error => {
    debugLog('🌍 MAIN-WORLD: Fetch error:', error);
    throw error;
  });
};

// XHR interception function
const interceptXHR = (xhr, originalXhrSend, data) => {
  xhr.addEventListener('loadend', () => {
    const endTime = Date.now();
    
    // Capture response headers
    let responseHeaders = {};
    try {
      const headerString = xhr.getAllResponseHeaders();
      if (headerString) {
        headerString.split('\r\n').forEach(line => {
          if (line.includes(':')) {
            const [name, ...value] = line.split(':');
            responseHeaders[name.trim()] = value.join(':').trim();
          }
        });
      }
    } catch (e) {
      debugLog('🌍 MAIN-WORLD: Could not get XHR response headers:', e);
    }

    // Capture response body ONLY if enabled
    let responseBody = '';
    try {
      if (extensionSettings.captureResponses && xhr.responseText) {
        responseBody = truncateBody(xhr.responseText, extensionSettings.maxBodySize);
        debugLog('🌍 MAIN-WORLD: XHR response body capture enabled, captured', responseBody.length, 'chars');
      } else if (xhr.responseText) {
        responseBody = '[Body capture disabled in settings]';
      }
    } catch (e) {
      debugLog('🌍 MAIN-WORLD: Could not get XHR response body:', e);
    }

    // Send captured data
    const capturedData = {
      type: 'xhr',
      method: xhr._method || 'GET',
      url: xhr._url,
      domain: getSafeDomain(xhr._url),
      status: xhr.status,
      statusText: xhr.statusText,
      duration: endTime - xhr._startTime,
      requestHeaders: xhr._requestHeaders || {},
      responseHeaders,
      requestBody: extensionSettings.captureRequests && data ? 
        truncateBody(String(data), extensionSettings.maxBodySize) : 
        (data ? '[Body capture disabled in settings]' : ''),
      responseBody,
      timestamp: new Date().toISOString()
    };

    debugLog('🌍 MAIN-WORLD: Sending XHR data:', capturedData);
    
    // Send to content script
    window.postMessage({
      source: 'main-world-network-interceptor',
      data: capturedData
    }, '*');
  });
  
  return originalXhrSend.call(xhr, data);
};

// Console interception functions
const interceptConsole = async (originalMethod, methodName, severity, ...args) => {
  // Call original method first to maintain normal console behavior
  originalMethod.apply(console, args);
  
  // Prevent recursive interception
  if (window.__isInterceptingConsole) {
    return;
  }
  
  window.__isInterceptingConsole = true;
  
  try {
    // Check if we should capture this log level using content script communication
    debugLog('🌍 MAIN_WORLD: Checking console severity capture for:', severity);
    const result = await requestFromContentScript('checkConsoleSeverity', { severity });
    
    if (!result?.enabled) {
      debugLog('🌍 MAIN_WORLD: Console severity not enabled for:', severity);
      return;
    }
    
    debugLog('🌍 MAIN_WORLD: Console severity enabled, capturing:', severity);
    
    // Convert arguments to strings
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    // Create console error data
    const consoleData = {
      message: message,
      severity: severity,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      domain: getSafeDomain(window.location.href),
      source: 'page-console',
      stack: severity === 'error' ? (new Error().stack) : null
    };
    
    debugLog('🌍 MAIN_WORLD: Dispatching console error event:', consoleData);
    
    // Dispatch custom event for content script to catch
    window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
      detail: consoleData
    }));
    
  } catch (error) {
    debugLog('🌍 MAIN_WORLD: Error in console interception:', error);
    // Silently fail to avoid recursive console calls
  } finally {
    // Always clear the flag to prevent lock-ups
    window.__isInterceptingConsole = false;
  }
};

// Try to get settings from extension storage
try {
  // Request settings from the content script via custom event
  window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  
  // Listen for settings response - complete update
  window.addEventListener('extensionSettingsResponse', (event) => {
    if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
      const bodyCapture = event.detail.networkInterception.bodyCapture;
      extensionSettings.maxBodySize = bodyCapture.maxBodySize || 2000;
      extensionSettings.captureRequests = bodyCapture.captureRequests || false;
      extensionSettings.captureResponses = bodyCapture.captureResponses || false;
      debugLog('🌍 MAIN_WORLD: Updated settings:', extensionSettings);
    }
  });

  // Periodically request settings updates to ensure sync
  setInterval(() => {
    if (mainWorldState.extensionEnabled) {
      window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
    }
  }, 30000); // Check every 30 seconds

  // Listen for storage changes notification from content script
  window.addEventListener('settingsUpdated', (event) => {
    debugLog('🌍 MAIN_WORLD: Settings update notification received');
    window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  });
  
  // Start interception
  const startInterception = () => {
    if (isIntercepting) return;
    
    debugLog('🚀 MAIN_WORLD: Starting network interception...');
    isIntercepting = true;
    
    // Set up fetch interception
    window.fetch = function(input, init) {
      return interceptFetch(originalFetch, input, init);
    };
    
    // Set up XHR interception
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      this._method = method;
      this._url = url;
      this._startTime = Date.now();
      this._requestHeaders = {};
      return originalXhrOpen.call(this, method, url, async, user, password);
    };
    
    XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
      if (this._requestHeaders) {
        this._requestHeaders[name] = value;
      }
      return originalXhrSetRequestHeader.call(this, name, value);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      // Set up the interception listener and call original send
      interceptXHR(this, originalXhrSend, data);
      return originalXhrSend.call(this, data);
    };
  };
  
  // Start console interception
  const startConsoleInterception = () => {
    if (isConsoleIntercepting) return;
    
    debugLog('🚀 MAIN_WORLD: Starting console interception...');
    isConsoleIntercepting = true;
    
    // Override console methods
    console.error = function(...args) {
      interceptConsole(originalConsoleError, 'error', 'error', ...args);
    };
    
    console.warn = function(...args) {
      interceptConsole(originalConsoleWarn, 'warn', 'warn', ...args);
    };
    
    console.info = function(...args) {
      interceptConsole(originalConsoleInfo, 'info', 'info', ...args);
    };
    
    console.log = function(...args) {
      interceptConsole(originalConsoleLog, 'log', 'info', ...args);
    };
  };
  
  // Stop interception
  const stopInterception = () => {
    if (!isIntercepting) return;
    
    debugLog('🛑 MAIN_WORLD: Stopping network interception...');
    isIntercepting = false;
    
    // Restore original functions
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.send = originalXhrSend;
    XMLHttpRequest.prototype.setRequestHeader = originalXhrSetRequestHeader;
  };
  
  // Stop console interception
  const stopConsoleInterception = () => {
    if (!isConsoleIntercepting) return;
    
    debugLog('🛑 MAIN_WORLD: Stopping console interception...');
    isConsoleIntercepting = false;
    
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.log = originalConsoleLog;
  };
  
  // Initial setup - check if we should start intercepting
  (async () => {
    debugLog('🌍 MAIN_WORLD: Initializing network interception...');
    
    // Request initial settings
    window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
    
    // Wait a bit for content script to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check initial states
    debugLog('🌍 MAIN_WORLD: Checking initial logging states...');
    const networkEnabled = await isLoggingEnabled();
    const consoleEnabled = await isConsoleLoggingEnabled();
    
    debugLog('🌍 MAIN_WORLD: Initial states - Network:', networkEnabled, 'Console:', consoleEnabled);
    
    if (networkEnabled) {
      debugLog('🌍 MAIN_WORLD: Network logging enabled, starting interception...');
      startInterception();
    } else {
      debugLog('🌍 MAIN_WORLD: Network logging disabled, not starting interception');
    }
    
    if (consoleEnabled) {
      debugLog('🌍 MAIN_WORLD: Console logging enabled, starting console interception...');
      startConsoleInterception();
    } else {
      debugLog('🌍 MAIN_WORLD: Console logging disabled, not starting console interception');
    }
  })();
  
  // Listen for extension state changes from content script
  window.addEventListener('extensionStateChange', (event) => {
    if (event.detail?.enabled !== undefined) {
      mainWorldState.extensionEnabled = event.detail.enabled;
      debugLog('🌍 MAIN_WORLD: Extension enabled state changed:', mainWorldState.extensionEnabled);
      
      if (!mainWorldState.extensionEnabled) {
        stopInterception();
        stopConsoleInterception();
      }
    }
  });
  
  // Listen for tab logging state changes
  window.addEventListener('tabLoggingStateChange', async (event) => {
    debugLog('🌍 MAIN_WORLD: Tab logging state change received:', event.detail);
    
    if (event.detail?.networkEnabled !== undefined) {
      const networkEnabled = event.detail.networkEnabled && mainWorldState.extensionEnabled;
      
      if (networkEnabled && !isIntercepting) {
        debugLog('🌍 MAIN_WORLD: Starting network interception due to state change');
        startInterception();
      } else if (!networkEnabled && isIntercepting) {
        debugLog('🌍 MAIN_WORLD: Stopping network interception due to state change');
        stopInterception();
      }
    }
    
    if (event.detail?.consoleEnabled !== undefined) {
      const consoleEnabled = event.detail.consoleEnabled && mainWorldState.extensionEnabled;
      
      if (consoleEnabled && !isConsoleIntercepting) {
        debugLog('🌍 MAIN_WORLD: Starting console interception due to state change');
        startConsoleInterception();
      } else if (!consoleEnabled && isConsoleIntercepting) {
        debugLog('🌍 MAIN_WORLD: Stopping console interception due to state change');
        stopConsoleInterception();
      }
    }
  });
  
} catch (error) {
  debugLog('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
}

// Add activity check response handler
window.addEventListener('checkMainWorldActive', (event) => {
  debugLog('🌍 MAIN-WORLD: Activity check received');
  window.dispatchEvent(new CustomEvent('mainWorldActiveResponse', {
    detail: { 
      checkId: event.detail?.checkId,
      isActive: true 
    }
  }));
});

// Use original console for final load message to avoid interception
if (window.__originalConsole && window.__originalConsole.log) {
  window.__originalConsole.log('🌍 MAIN-WORLD: Network interception script loaded and ready');
}
