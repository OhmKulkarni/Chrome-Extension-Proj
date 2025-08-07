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
let isIntercepting = false;

// MEMORY LEAK FIX: Helper function to avoid Promise constructor pattern
const sendMessage = async (message) => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.warn('Chrome message failed:', error);
      return null;
    }
  }
  return null;
};

// Get current tab ID and check if logging is enabled for this tab
const getCurrentTabId = async () => {
  try {
    const response = await sendMessage({ action: 'getCurrentTabId' });
    return response?.tabId || null;
  } catch (error) {
    console.warn('🌍 MAIN_WORLD: Error getting tab ID:', error);
    return null;
  }
};

// Check if logging is enabled for current tab
const isLoggingEnabled = async () => {
  try {
    const tabId = await getCurrentTabId();
    if (!tabId) return false;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        // MEMORY LEAK FIX: Use async chrome.storage API directly instead of Promise constructor
        const result = await chrome.storage.local.get([`tabLogging_${tabId}`, 'extensionEnabled']);
        
        const globalEnabled = result.extensionEnabled !== false; // default true
        const tabLogging = result[`tabLogging_${tabId}`];
        const tabEnabled = !tabLogging || 
                          tabLogging.status === 'active' || 
                          (tabLogging.status === undefined && tabLogging.active !== false); // default true
        return globalEnabled && tabEnabled;
      } catch (error) {
        console.warn('🌍 MAIN_WORLD: Error checking logging state:', error);
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    console.warn('🌍 MAIN_WORLD: Error in isLoggingEnabled:', error);
    return false;
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
  if (maxSize === 0) return text; // No limit
  return text.substring(0, maxSize);
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
      method: (xhr._method || 'GET').toUpperCase(),
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

// Try to get settings from extension storage
try {
  // Request settings from the content script via custom event
  window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  
  // Settings response handler is managed below for proper cleanup
  
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
      interceptXHR(this, originalXhrSend, data);
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
  
  // Initial setup - check if we should start intercepting
  (async () => {
    const enabled = await isLoggingEnabled();
    if (enabled) {
      startInterception();
    }
  })();
  
  // Listen for storage changes to start/stop interception
  if (typeof chrome !== 'undefined' && chrome.storage) {
    // MEMORY LEAK FIX: Store handler for cleanup
    eventHandlers.storageChangeHandler1 = async (changes, namespace) => {
      if (namespace === 'local' || namespace === 'sync') {
        const enabled = await isLoggingEnabled();
        if (enabled && !isIntercepting) {
          startInterception();
        } else if (!enabled && isIntercepting) {
          stopInterception();
        }
      }
    };
    chrome.storage.onChanged.addListener(eventHandlers.storageChangeHandler1);
  }
  
} catch (error) {
  console.log('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
}

console.log('🌍 MAIN-WORLD: Network interception script loaded and ready');

// === Console Error Interception ===

// Track original console methods
let originalConsoleError = console.error;
let originalConsoleWarn = console.warn;
let isErrorIntercepting = false;

// Check if error logging is enabled for current tab
const isErrorLoggingEnabled = async () => {
  try {
    const tabId = await getCurrentTabId();
    if (!tabId) return false;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        // MEMORY LEAK FIX: Use chrome.storage directly instead of Promise constructor
        const result = await chrome.storage.local.get([`tabErrorLogging_${tabId}`, 'settings']);
        
        // Check global error logging setting
        const settings = result.settings || {};
        const errorLoggingConfig = settings.errorLogging || {};
        
        if (!errorLoggingConfig.enabled) {
          return false;
        }
        
        // Check tab-specific setting if enabled
        if (errorLoggingConfig.tabSpecific?.enabled) {
          const tabErrorLogging = result[`tabErrorLogging_${tabId}`];
          const tabEnabled = tabErrorLogging?.active === true;
          return tabEnabled;
        } else {
          // Global error logging for all tabs
          return true;
        }
      } catch (error) {
        console.warn('🌍 MAIN_WORLD: Error checking error logging state:', error);
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    console.warn('🌍 MAIN_WORLD: Error in isErrorLoggingEnabled:', error);
    return false;
  }
};

// Function to capture and dispatch console errors
const captureConsoleError = (originalMethod, severity) => {
  return function(...args) {
    // Call the original method first
    originalMethod.apply(console, args);
    
    // Only capture if error logging is enabled
    isErrorLoggingEnabled().then(enabled => {
      if (enabled) {
        try {
          // Extract error information
          const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg instanceof Error) return arg.message;
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }).join(' ');
          
          // Get stack trace if available
          let stack = '';
          if (args[0] instanceof Error) {
            stack = args[0].stack || '';
          } else {
            // Create a dummy error to get current stack
            const dummyError = new Error();
            if (dummyError.stack) {
              const stackLines = dummyError.stack.split('\n');
              // Remove the first few lines that are from this function
              stack = stackLines.slice(3).join('\n');
            }
          }
          
          const errorData = {
            message: message || 'Unknown error',
            stack: stack,
            severity: severity,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            source: 'console'
          };
          
          console.log('🌍 MAIN-WORLD: Dispatching console error:', errorData.message);
          
          // Dispatch custom event to content script
          window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
            detail: errorData
          }));
        } catch (error) {
          console.warn('🌍 MAIN-WORLD: Error capturing console error:', error);
        }
      }
    });
  };
};

// Global error handlers
const handleGlobalError = (event) => {
  isErrorLoggingEnabled().then(enabled => {
    if (enabled) {
      const errorData = {
        message: event.message || 'Unknown error',
        stack: event.error?.stack || '',
        severity: 'error',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        filename: event.filename || '',
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        source: 'global'
      };
      
      console.log('🌍 MAIN-WORLD: Dispatching global error:', errorData.message);
      
      window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
        detail: errorData
      }));
    }
  });
};

const handleUnhandledRejection = (event) => {
  isErrorLoggingEnabled().then(enabled => {
    if (enabled) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : '';
      
      const errorData = {
        message: `Unhandled Promise Rejection: ${message}`,
        stack: stack,
        severity: 'error',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        source: 'promise'
      };
      
      console.log('🌍 MAIN-WORLD: Dispatching unhandled rejection:', errorData.message);
      
      window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
        detail: errorData
      }));
    }
  });
};

// Start error interception
const startErrorInterception = () => {
  if (isErrorIntercepting) return;
  
  console.log('🎯 MAIN_WORLD: Starting console error interception...');
  isErrorIntercepting = true;
  
  // Intercept console methods
  console.error = captureConsoleError(originalConsoleError, 'error');
  console.warn = captureConsoleError(originalConsoleWarn, 'warn');
  
  // Add global error handlers
  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
};

// Stop error interception
const stopErrorInterception = () => {
  if (!isErrorIntercepting) return;
  
  console.log('🛑 MAIN_WORLD: Stopping console error interception...');
  isErrorIntercepting = false;
  
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Remove global error handlers
  window.removeEventListener('error', handleGlobalError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
};

// Initial setup for error logging
(async () => {
  const errorLoggingEnabled = await isErrorLoggingEnabled();
  if (errorLoggingEnabled) {
    startErrorInterception();
  }
})();

// Listen for storage changes to start/stop error interception
if (typeof chrome !== 'undefined' && chrome.storage) {
  // MEMORY LEAK FIX: Store handler for cleanup
  eventHandlers.storageChangeHandler2 = async (changes, namespace) => {
    if (namespace === 'local' || namespace === 'sync') {
      const errorLoggingEnabled = await isErrorLoggingEnabled();
      if (errorLoggingEnabled && !isErrorIntercepting) {
        startErrorInterception();
      } else if (!errorLoggingEnabled && isErrorIntercepting) {
        stopErrorInterception();
      }
    }
  };
  chrome.storage.onChanged.addListener(eventHandlers.storageChangeHandler2);
}

console.log('🌍 MAIN-WORLD: Console error interception script loaded and ready');

// MEMORY LEAK FIX: Event listener management for cleanup
const eventHandlers = {
  settingsResponse: null,
  beforeUnload: null
};

// MEMORY LEAK FIX: Settings response handler with proper cleanup reference
eventHandlers.settingsResponse = (event) => {
  if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
    extensionSettings.maxBodySize = event.detail.networkInterception.bodyCapture.maxBodySize || 2000;
    console.log('🌍 MAIN_WORLD: Updated settings - maxBodySize:', extensionSettings.maxBodySize);
  }
};

// MEMORY LEAK FIX: Update the existing settings listener to use managed handler
window.removeEventListener('extensionSettingsResponse', eventHandlers.settingsResponse);
window.addEventListener('extensionSettingsResponse', eventHandlers.settingsResponse);

// MEMORY LEAK FIX: Comprehensive cleanup on page unload
eventHandlers.beforeUnload = () => {
  // Stop all interceptions
  if (isIntercepting) {
    isIntercepting = false;
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.send = originalXhrSend;
    XMLHttpRequest.prototype.setRequestHeader = originalXhrSetRequestHeader;
  }
  
  // Stop error interception
  stopErrorInterception();
  
  // Clean up event listeners
  if (eventHandlers.settingsResponse) {
    window.removeEventListener('extensionSettingsResponse', eventHandlers.settingsResponse);
  }
  if (eventHandlers.beforeUnload) {
    window.removeEventListener('beforeunload', eventHandlers.beforeUnload);
  }
  
  // MEMORY LEAK FIX: Clean up Chrome storage listeners
  if (typeof chrome !== 'undefined' && chrome.storage) {
    if (eventHandlers.storageChangeHandler1) {
      chrome.storage.onChanged.removeListener(eventHandlers.storageChangeHandler1);
    }
    if (eventHandlers.storageChangeHandler2) {
      chrome.storage.onChanged.removeListener(eventHandlers.storageChangeHandler2);
    }
  }
  
  // Clear references
  eventHandlers.settingsResponse = null;
  eventHandlers.beforeUnload = null;
  eventHandlers.storageChangeHandler1 = null;
  eventHandlers.storageChangeHandler2 = null;
  
  console.log('🧹 MAIN_WORLD: Cleanup completed');
};

// Register cleanup handler
window.addEventListener('beforeunload', eventHandlers.beforeUnload);
