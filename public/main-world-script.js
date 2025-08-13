// Main world injection script - runs in the same context as the page
console.log('🌍 MAIN-WORLD: Script injected into main world');

// Default settings
let extensionSettings = {
  maxBodySize: 2000 // Default truncation limit
};

// Track original functions and interception state
let originalFetch = window.fetch;
let originalXhrOpen = XMLHttpRequest.prototype.open;
let originalXhrSend = XMLHttpRequest.prototype.send;
let originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
let originalConsoleError = console.error;
let originalConsoleWarn = console.warn;
let originalConsoleInfo = console.info;
let originalConsoleLog = console.log;
let isIntercepting = false;
let isConsoleIntercepting = false;

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
    
    console.log('🌍 MAIN_WORLD: Requesting from content script:', action, 'ID:', requestId);
    
    const responseHandler = (event) => {
      if (event.detail?.requestId === requestId && !resolved) {
        resolved = true;
        window.removeEventListener('contentScriptResponse', responseHandler);
        console.log('🌍 MAIN_WORLD: Received response for:', action, 'Response:', event.detail.response);
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
        console.log('🌍 MAIN_WORLD: Request timeout for:', action);
        resolve(null);
      }
    }, 1000);
  });
};

// Check if logging is enabled for current tab
const isLoggingEnabled = async () => {
  try {
    console.log('🌍 MAIN_WORLD: Checking if logging is enabled...');
    const result = await requestFromContentScript('checkNetworkLogging');
    console.log('🌍 MAIN_WORLD: Network logging check result:', result);
    return result?.enabled ?? mainWorldState.networkLoggingEnabled;
  } catch (error) {
    console.warn('🌍 MAIN_WORLD: Error checking logging state:', error);
    return mainWorldState.networkLoggingEnabled;
  }
};

// Check if console error logging is enabled for current tab
const isConsoleLoggingEnabled = async () => {
  try {
    console.log('🌍 MAIN_WORLD: Checking if console logging is enabled...');
    const result = await requestFromContentScript('checkConsoleLogging');
    console.log('🌍 MAIN_WORLD: Console logging check result:', result);
    return result?.enabled ?? mainWorldState.consoleLoggingEnabled;
  } catch (error) {
    console.warn('🌍 MAIN_WORLD: Error checking console logging state:', error);
    return mainWorldState.consoleLoggingEnabled;
  }
};

// Helper function to safely extract domain from URL
function getSafeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.log('🌍 MAIN-WORLD: Invalid URL, using fallback domain:', url);
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
    console.log(`🌍 MAIN-WORLD: Truncating body from ${text.length} to ${effectiveMaxSize} characters (user limit: ${maxSize})`);
    return text.substring(0, effectiveMaxSize) + '... [TRUNCATED]';
  }
  
  return text;
}

// Create our main world interception
const interceptFetch = (originalFetch, input, init) => {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  console.log('🌍 MAIN-WORLD: Intercepted fetch request:', url);
  
  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = Date.now();
    console.log('🌍 MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
    
    // Try to capture response body
    let responseBody = '';
    let requestBody = '';
    
    try {
      // Capture request body
      if (init && init.body) {
        requestBody = truncateBody(String(init.body), extensionSettings.maxBodySize);
      }
      
      // Clone response to capture body
      const responseClone = response.clone();
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        try {
          responseBody = await responseClone.text();
          responseBody = truncateBody(responseBody, extensionSettings.maxBodySize);
        } catch (e) {
          console.log('🌍 MAIN-WORLD: Could not read response body:', e);
        }
      }
    } catch (e) {
      console.log('🌍 MAIN-WORLD: Error capturing fetch body:', e);
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

    console.log('🌍 MAIN-WORLD: Sending fetch data:', capturedData);
    
    // Send to content script
    window.postMessage({
      source: 'main-world-network-interceptor',
      data: capturedData
    }, '*');
    
    return response;
  }).catch(error => {
    console.log('🌍 MAIN-WORLD: Fetch error:', error);
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
      console.log('🌍 MAIN-WORLD: Could not get XHR response headers:', e);
    }

    // Capture response body  
    let responseBody = '';
    try {
      if (xhr.responseText) {
        responseBody = truncateBody(xhr.responseText, extensionSettings.maxBodySize);
      }
    } catch (e) {
      console.log('🌍 MAIN-WORLD: Could not get XHR response body:', e);
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
      requestBody: data ? truncateBody(String(data), extensionSettings.maxBodySize) : '',
      responseBody,
      timestamp: new Date().toISOString()
    };

    console.log('🌍 MAIN-WORLD: Sending XHR data:', capturedData);
    
    // Send to content script
    window.postMessage({
      source: 'main-world-network-interceptor',
      data: capturedData
    }, '*');
  });
  
  return originalXhrSend.call(xhr, data);
};

// Console interception functions
const interceptConsole = (originalMethod, methodName, severity, ...args) => {
  // Call original method first to maintain normal console behavior
  originalMethod.apply(console, args);
  
  // Check if we should capture this log level
  const shouldCapture = async () => {
    try {
      const tabId = await getCurrentTabId();
      if (!tabId) return false;
      
      const result = await chrome.storage.local.get(['extensionSettings']);
      const settings = result.extensionSettings;
      
      if (!settings?.errorLogging?.enabled) return false;
      
      // Check severity filter
      if (settings.errorLogging.severityFilter?.enabled) {
        const allowedSeverities = settings.errorLogging.severityFilter.allowed || [];
        return allowedSeverities.includes(severity);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Capture the console output
  shouldCapture().then(capture => {
    if (!capture) return;
    
    try {
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
      
      // Dispatch custom event for content script to catch
      window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
        detail: consoleData
      }));
      
    } catch (error) {
      // Silently fail to avoid recursive console calls
    }
  });
};

// Try to get settings from extension storage
try {
  // Request settings from the content script via custom event
  window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  
  // Listen for settings response
  window.addEventListener('extensionSettingsResponse', (event) => {
    if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
      extensionSettings.maxBodySize = event.detail.networkInterception.bodyCapture.maxBodySize || 2000;
      console.log('🌍 MAIN_WORLD: Updated settings - maxBodySize:', extensionSettings.maxBodySize);
    }
  });
  
  // Start interception
  const startInterception = () => {
    if (isIntercepting) return;
    
    console.log('🚀 MAIN_WORLD: Starting network interception...');
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
    
    console.log('🚀 MAIN_WORLD: Starting console interception...');
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
    
    console.log('🛑 MAIN_WORLD: Stopping network interception...');
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
    
    console.log('🛑 MAIN_WORLD: Stopping console interception...');
    isConsoleIntercepting = false;
    
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.log = originalConsoleLog;
  };
  
  // Initial setup - check if we should start intercepting
  (async () => {
    console.log('🌍 MAIN_WORLD: Initializing network interception...');
    
    // Request initial settings
    window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
    
    // Wait a bit for content script to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check initial states
    console.log('🌍 MAIN_WORLD: Checking initial logging states...');
    const networkEnabled = await isLoggingEnabled();
    const consoleEnabled = await isConsoleLoggingEnabled();
    
    console.log('🌍 MAIN_WORLD: Initial states - Network:', networkEnabled, 'Console:', consoleEnabled);
    
    if (networkEnabled) {
      console.log('🌍 MAIN_WORLD: Network logging enabled, starting interception...');
      startInterception();
    } else {
      console.log('🌍 MAIN_WORLD: Network logging disabled, not starting interception');
    }
    
    if (consoleEnabled) {
      console.log('🌍 MAIN_WORLD: Console logging enabled, starting console interception...');
      startConsoleInterception();
    } else {
      console.log('🌍 MAIN_WORLD: Console logging disabled, not starting console interception');
    }
  })();
  
  // Listen for extension state changes from content script
  window.addEventListener('extensionStateChange', (event) => {
    if (event.detail?.enabled !== undefined) {
      mainWorldState.extensionEnabled = event.detail.enabled;
      console.log('🌍 MAIN_WORLD: Extension enabled state changed:', mainWorldState.extensionEnabled);
      
      if (!mainWorldState.extensionEnabled) {
        stopInterception();
        stopConsoleInterception();
      }
    }
  });
  
  // Listen for tab logging state changes
  window.addEventListener('tabLoggingStateChange', async (event) => {
    console.log('🌍 MAIN_WORLD: Tab logging state change received:', event.detail);
    
    if (event.detail?.networkEnabled !== undefined) {
      const networkEnabled = event.detail.networkEnabled && mainWorldState.extensionEnabled;
      
      if (networkEnabled && !isIntercepting) {
        console.log('🌍 MAIN_WORLD: Starting network interception due to state change');
        startInterception();
      } else if (!networkEnabled && isIntercepting) {
        console.log('🌍 MAIN_WORLD: Stopping network interception due to state change');
        stopInterception();
      }
    }
    
    if (event.detail?.consoleEnabled !== undefined) {
      const consoleEnabled = event.detail.consoleEnabled && mainWorldState.extensionEnabled;
      
      if (consoleEnabled && !isConsoleIntercepting) {
        console.log('🌍 MAIN_WORLD: Starting console interception due to state change');
        startConsoleInterception();
      } else if (!consoleEnabled && isConsoleIntercepting) {
        console.log('🌍 MAIN_WORLD: Stopping console interception due to state change');
        stopConsoleInterception();
      }
    }
  });
  
} catch (error) {
  console.log('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
}

// Add activity check response handler
window.addEventListener('checkMainWorldActive', (event) => {
  console.log('🌍 MAIN-WORLD: Activity check received');
  window.dispatchEvent(new CustomEvent('mainWorldActiveResponse', {
    detail: { 
      checkId: event.detail?.checkId,
      isActive: true 
    }
  }));
});

console.log('🌍 MAIN-WORLD: Network interception script loaded and ready');
