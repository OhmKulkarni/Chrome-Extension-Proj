// Main world injection script - runs in the same context as the page
(function() {
'use strict';

(window.__originalConsoleLog || console.log)('🌍 MAIN-WORLD: Script injected into main world');

// Prevent duplicate injections - check if we're already active
if (window.__webAppMonitorActive) {
  (window.__originalConsoleLog || console.log)('⚠️ MAIN-WORLD: Web App Monitor already active, skipping duplicate injection');
  return;
}

// Mark as active to prevent future duplicates
window.__webAppMonitorActive = true;
if (window.__originalConsoleLog) {
  window.__originalConsoleLog('✅ MAIN-WORLD: Marked Web App Monitor as active');
}

// Respond to activity checks from content script
window.addEventListener('checkMainWorldActive', (event) => {
  if (event.detail?.checkId) {
    window.dispatchEvent(new CustomEvent('mainWorldActiveResponse', {
      detail: { checkId: event.detail.checkId, isActive: true }
    }));
  }
});

// Default settings
let extensionSettings = {
  maxBodySize: 2000 // Default truncation limit
};

// Global state for dynamic interception control
window.__consoleInterceptionEnabled = window.__consoleInterceptionEnabled ?? true;
window.__networkInterceptionEnabled = window.__networkInterceptionEnabled ?? true;

// State change locks to prevent race conditions
let consoleStateChanging = false;
let networkStateChanging = false;

// Message deduplication
const processedMessages = new Set();
const MAX_PROCESSED_MESSAGES = 1000;

// Store both original AND intercepted methods for proper state management
window.__originalConsole = window.__originalConsole || {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

window.__interceptedConsole = null; // Will store our custom versions

// Track original functions and interception state using window properties to prevent memory leaks
window.__originalFetch = window.__originalFetch || window.fetch;
window.__originalXhrOpen = window.__originalXhrOpen || XMLHttpRequest.prototype.open;
window.__originalXhrSend = window.__originalXhrSend || XMLHttpRequest.prototype.send;
window.__originalXhrSetRequestHeader = window.__originalXhrSetRequestHeader || XMLHttpRequest.prototype.setRequestHeader;
window.__originalConsoleError = window.__originalConsoleError || console.error;
window.__originalConsoleWarn = window.__originalConsoleWarn || console.warn;
window.__originalConsoleInfo = window.__originalConsoleInfo || console.info;
window.__originalConsoleLog = window.__originalConsoleLog || console.log;

// Use window properties for state to prevent variable redeclaration issues
let originalFetch = window.__originalFetch;
let originalXhrOpen = window.__originalXhrOpen;
let originalXhrSend = window.__originalXhrSend;
let originalXhrSetRequestHeader = window.__originalXhrSetRequestHeader;
let originalConsoleError = window.__originalConsoleError;
let originalConsoleWarn = window.__originalConsoleWarn;
let originalConsoleInfo = window.__originalConsoleInfo;
let originalConsoleLog = window.__originalConsoleLog;
let isIntercepting = false;
let isConsoleIntercepting = false;

// MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
const getCurrentTabId = async () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCurrentTabId' })
      return response?.tabId || null
    } catch (error) {
      // CRITICAL: Use original console to prevent infinite recursion
      if (window.__originalConsoleWarn) {
        window.__originalConsoleWarn('🌍 MAIN_WORLD: Error getting tab ID:', error);
      }
      return null
    }
  } else {
    return null
  }
};

// Check if logging is enabled for current tab - MEMORY LEAK FIX: Convert Promise constructor
const isLoggingEnabled = async () => {
  try {
    const tabId = await getCurrentTabId();
    if (!tabId) return false;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await chrome.storage.local.get([`tabLogging_${tabId}`, 'extensionEnabled'])
        const globalEnabled = result.extensionEnabled !== false; // default true
        const tabLogging = result[`tabLogging_${tabId}`];
        const tabEnabled = !tabLogging || tabLogging.status === 'active'; // default true
        return globalEnabled && tabEnabled;
      } catch (error) {
        // CRITICAL: Use original console to prevent infinite recursion
        if (window.__originalConsoleWarn) {
          window.__originalConsoleWarn('🌍 MAIN_WORLD: Error checking logging state:', error);
        }
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    // CRITICAL: Use original console to prevent infinite recursion
    if (window.__originalConsoleWarn) {
      window.__originalConsoleWarn('🌍 MAIN_WORLD: Error in isLoggingEnabled:', error);
    }
    return false;
  }
};

// Check if console error logging is enabled for current tab
const isConsoleLoggingEnabled = async () => {
  try {
    const tabId = await getCurrentTabId();
    if (!tabId) return false;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await chrome.storage.local.get([
          `tabLogging_${tabId}`, 
          'extensionEnabled',
          'extensionSettings'
        ]);
        
        const globalEnabled = result.extensionEnabled !== false;
        const tabLogging = result[`tabLogging_${tabId}`];
        const tabEnabled = !tabLogging || tabLogging.status === 'active';
        
        // Check if error logging is enabled in settings
        const settings = result.extensionSettings;
        const errorLoggingEnabled = settings?.errorLogging?.enabled !== false; // default true
        
        return globalEnabled && tabEnabled && errorLoggingEnabled;
      } catch (error) {
        // CRITICAL: Use original console to prevent infinite recursion
        if (window.__originalConsoleWarn) {
          window.__originalConsoleWarn('🌍 MAIN_WORLD: Error checking console logging state:', error);
        }
        return false;
      }
    } else {
      return false;
    }
  } catch (error) {
    // CRITICAL: Use original console to prevent infinite recursion
    if (window.__originalConsoleWarn) {
      window.__originalConsoleWarn('🌍 MAIN_WORLD: Error in isConsoleLoggingEnabled:', error);
    }
    return false;
  }
};

// Helper function to safely extract domain from URL
function getSafeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    // CRITICAL: Use original console to prevent infinite recursion
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog('🌍 MAIN-WORLD: Invalid URL, using fallback domain:', url);
    }
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
  
  // MEMORY OPTIMIZATION: Remove per-request logging to reduce tab memory usage
  // Only log critical errors that need debugging
  
  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = Date.now();
    
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
          // MEMORY OPTIMIZATION: Only log critical errors
        }
      }
    } catch (e) {
      // MEMORY OPTIMIZATION: Silent error handling to reduce memory usage
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

    // MEMORY OPTIMIZATION: Remove detailed logging to reduce tab memory usage
    // Send to content script using custom event (consistent with console interception)
    window.dispatchEvent(new CustomEvent('networkRequestIntercepted', {
      detail: capturedData
    }));
    
    return response;
  }).catch(error => {
    // CRITICAL: Only log critical errors that need debugging
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog('🌍 MAIN-WORLD: Fetch error:', error);
    }
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
      // MEMORY OPTIMIZATION: Silent error handling to reduce memory usage
    }

    // Capture response body  
    let responseBody = '';
    try {
      if (xhr.responseText) {
        responseBody = truncateBody(xhr.responseText, extensionSettings.maxBodySize);
      }
    } catch (e) {
      // MEMORY OPTIMIZATION: Silent error handling to reduce memory usage
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

    // MEMORY OPTIMIZATION: Remove detailed logging to reduce tab memory usage
    // Send to content script using custom event (consistent with console interception)
    window.dispatchEvent(new CustomEvent('networkRequestIntercepted', {
      detail: capturedData
    }));
  });
  
  return originalXhrSend.call(xhr, data);
};

// Console interception functions
const interceptConsole = (originalMethod, methodName, severity, ...args) => {
  // Call original method first to maintain normal console behavior
  originalMethod.apply(console, args);
  
  // PERFORMANCE OPTIMIZATION: Early exit if interception is disabled
  if (!window.__consoleInterceptionEnabled) {
    return; // Zero overhead when disabled
  }
  
  // MEMORY OPTIMIZATION: Reduce per-console-call logging
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
    
    // Create console error data immediately
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
    // MEMORY OPTIMIZATION: Only log critical errors
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog('🌍 MAIN-WORLD: Console interception error:', error);
    }
  }
};

// Try to get settings from extension storage
try {
  // Request settings from the content script via custom event
  window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  
  // Listen for settings response
  window.addEventListener('extensionSettingsResponse', (event) => {
    if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
      extensionSettings.maxBodySize = event.detail.networkInterception.bodyCapture.maxBodySize || 2000;
      // CRITICAL: Use original console to prevent infinite recursion
      if (window.__originalConsoleLog) {
        window.__originalConsoleLog('🌍 MAIN_WORLD: Updated settings - maxBodySize:', extensionSettings.maxBodySize);
      }
    }
  });
  
  // Start interception
  const startInterception = () => {
    if (isIntercepting) return;
    
    // MEMORY OPTIMIZATION: Keep only essential startup logging
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
  
  // Start console interception
  const startConsoleInterception = () => {
    if (isConsoleIntercepting) return;
    
    // Use the new dynamic control system
    enableConsoleInterception();
  };
  
  // Stop interception
  const stopInterception = () => {
    if (!isIntercepting) return;
    
    // MEMORY OPTIMIZATION: Keep only essential logging
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
    
    // Use the new dynamic control system
    disableConsoleInterception();
  };

  // === DYNAMIC INTERCEPTION CONTROL SYSTEM ===
  
  // Create intercepted console methods (only when needed)
  function createInterceptedConsoleMethods() {
    if (!window.__interceptedConsole) {
      window.__interceptedConsole = {
        log: function(...args) {
          if (window.__consoleInterceptionEnabled) {
            interceptConsole(originalConsoleLog, 'log', 'info', ...args);
          } else {
            return window.__originalConsole.log.apply(console, arguments);
          }
        },
        error: function(...args) {
          if (window.__consoleInterceptionEnabled) {
            interceptConsole(originalConsoleError, 'error', 'error', ...args);
          } else {
            return window.__originalConsole.error.apply(console, arguments);
          }
        },
        warn: function(...args) {
          if (window.__consoleInterceptionEnabled) {
            interceptConsole(originalConsoleWarn, 'warn', 'warn', ...args);
          } else {
            return window.__originalConsole.warn.apply(console, arguments);
          }
        },
        info: function(...args) {
          if (window.__consoleInterceptionEnabled) {
            interceptConsole(originalConsoleInfo, 'info', 'info', ...args);
          } else {
            return window.__originalConsole.info.apply(console, arguments);
          }
        }
      };
    }
  }

  // Enable console interception
  function enableConsoleInterception() {
    if (window.__consoleInterceptionEnabled || consoleStateChanging) return; // Already enabled or changing
    
    consoleStateChanging = true;
    
    try {
      window.__consoleInterceptionEnabled = true;
      createInterceptedConsoleMethods();
      
      // Apply intercepted methods
      console.log = window.__interceptedConsole.log;
      console.error = window.__interceptedConsole.error;
      console.warn = window.__interceptedConsole.warn;
      console.info = window.__interceptedConsole.info;
      
      isConsoleIntercepting = true;
      
      if (window.__originalConsole.log) {
        window.__originalConsole.log('🎛️ MAIN-WORLD: Console interception ENABLED');
      }
    } finally {
      consoleStateChanging = false;
    }
  }

  // Disable console interception (zero overhead)
  function disableConsoleInterception() {
    if (!window.__consoleInterceptionEnabled || consoleStateChanging) return; // Already disabled or changing
    
    consoleStateChanging = true;
    
    try {
      window.__consoleInterceptionEnabled = false;
      
      // Restore original methods for zero overhead
      console.log = window.__originalConsole.log;
      console.error = window.__originalConsole.error;
      console.warn = window.__originalConsole.warn;
      console.info = window.__originalConsole.info;
      
      isConsoleIntercepting = false;
      
      // Clear any pending events to free memory
      if (window.__pendingConsoleEvents) {
        window.__pendingConsoleEvents.length = 0;
        window.__pendingConsoleEvents = null;
      }
      
      // Clear intercepted methods to free memory
      if (window.__interceptedConsole) {
        window.__interceptedConsole = null;
      }
      
      // Force garbage collection if available
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
        } catch (e) {
          // Ignore errors
        }
      }
      
      if (window.__originalConsole.log) {
        window.__originalConsole.log('🎛️ MAIN-WORLD: Console interception DISABLED (zero overhead)');
      }
    } finally {
      consoleStateChanging = false;
    }
  }

  // Enable network interception
  function enableNetworkInterception() {
    if ((window.__networkInterceptionEnabled && isIntercepting) || networkStateChanging) return; // Already enabled or changing
    
    networkStateChanging = true;
    
    try {
      window.__networkInterceptionEnabled = true;
      startInterception();
      
      if (window.__originalConsole.log) {
        window.__originalConsole.log('🎛️ MAIN-WORLD: Network interception ENABLED');
      }
    } finally {
      networkStateChanging = false;
    }
  }

  // Disable network interception
  function disableNetworkInterception() {
    if (!window.__networkInterceptionEnabled || networkStateChanging) return; // Already disabled or changing
    
    networkStateChanging = true;
    
    try {
      window.__networkInterceptionEnabled = false;
      stopInterception();
      
      if (window.__originalConsole.log) {
        window.__originalConsole.log('🎛️ MAIN-WORLD: Network interception DISABLED');
      }
    } finally {
      networkStateChanging = false;
    }
  }

  // Listen for control messages from content script
  window.addEventListener('message', (event) => {
    // Only process messages from the same origin (security)
    if (event.source !== window) return;
    
    if (event.data.type === 'CONTROL_INTERCEPTION') {
      // Message deduplication
      const messageId = `${event.data.type}-${event.data.target}-${event.data.enabled}-${event.data.timestamp || Date.now()}`;
      if (processedMessages.has(messageId)) {
        return; // Already processed
      }
      
      processedMessages.add(messageId);
      
      // Clean up old message IDs to prevent memory growth
      if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
        const messagesToKeep = Array.from(processedMessages).slice(-MAX_PROCESSED_MESSAGES / 2);
        processedMessages.clear();
        messagesToKeep.forEach(msg => processedMessages.add(msg));
      }
      
      const { target, enabled } = event.data;
      
      if (target === 'console') {
        enabled ? enableConsoleInterception() : disableConsoleInterception();
      } else if (target === 'network') {
        enabled ? enableNetworkInterception() : disableNetworkInterception();
      }
      
      // Send confirmation back
      window.postMessage({
        type: 'INTERCEPTION_STATE_CHANGED',
        target: target,
        enabled: enabled,
        timestamp: Date.now()
      }, '*');
    }
  });

  // === DEBUGGING AND TESTING FUNCTIONS ===
  
  // Expose debugging functions for testing
  window.__webAppMonitorDebug = {
    // State inspection
    getInterceptionState: () => ({
      consoleEnabled: window.__consoleInterceptionEnabled,
      networkEnabled: window.__networkInterceptionEnabled,
      isConsoleIntercepting,
      isIntercepting,
      stateChanging: { console: consoleStateChanging, network: networkStateChanging },
      processedMessages: processedMessages.size
    }),
    
    // Manual control for testing
    enableConsole: enableConsoleInterception,
    disableConsole: disableConsoleInterception,
    enableNetwork: enableNetworkInterception,
    disableNetwork: disableNetworkInterception,
    
    // Performance testing
    testConsolePerformance: (iterations = 1000) => {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        console.log(`Performance test ${i}`);
      }
      const end = performance.now();
      return {
        iterations,
        totalTime: end - start,
        avgTime: (end - start) / iterations,
        callsPerSecond: Math.round(1000 / ((end - start) / iterations))
      };
    },
    
    // Memory testing
    clearMemory: () => {
      if (window.__pendingConsoleEvents) {
        window.__pendingConsoleEvents.length = 0;
        window.__pendingConsoleEvents = null;
      }
      if (window.__interceptedConsole) {
        window.__interceptedConsole = null;
      }
      processedMessages.clear();
      if (window.gc) window.gc();
    }
  };

  // Initial setup - start both interceptions immediately for maximum compatibility
  (() => {
    try {
      // Always start console interception immediately
      startConsoleInterception();
      
      // Always start network interception immediately  
      startInterception();
      
      // MEMORY OPTIMIZATION: Keep only essential success logging
      if (window.__originalConsoleLog) {
        window.__originalConsoleLog('✅ MAIN-WORLD: Interceptions started');
      }
    } catch (error) {
      if (window.__originalConsoleLog) {
        window.__originalConsoleLog('🌍 MAIN-WORLD: Error during initial setup:', error);
      }
    }
  })();
  
  // Listen for storage changes to start/stop interception
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      try {
        if (namespace === 'local' || namespace === 'sync') {
          const networkEnabled = await isLoggingEnabled();
          const consoleEnabled = await isConsoleLoggingEnabled();
          
          // MEMORY OPTIMIZATION: Keep only essential storage change logging
          
          // Handle network interception - but don't stop if it was manually started
          if (networkEnabled && !isIntercepting) {
            startInterception();
          } else if (!networkEnabled && isIntercepting) {
            // Only stop if explicitly disabled in settings
            stopInterception();
          }
          
          // Handle console interception  
          if (consoleEnabled && !isConsoleIntercepting) {
            startConsoleInterception();
          } else if (!consoleEnabled && isConsoleIntercepting) {
            stopConsoleInterception();
          }
        }
      } catch (error) {
        if (window.__originalConsoleLog) {
          window.__originalConsoleLog('🌍 MAIN-WORLD: Storage change error:', error);
        }
      }
    });
  }

} catch (error) {
  if (window.__originalConsoleLog) {
    window.__originalConsoleLog('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
  }
}

if (window.__originalConsoleLog) {
  window.__originalConsoleLog('🌍 MAIN-WORLD: Network interception script loaded and ready');
}

})(); // End IIFE
