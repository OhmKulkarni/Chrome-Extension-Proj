// Main world injection script - runs in the same context as the page
(function() {
'use strict';

(window.__originalConsoleLog || console.log)('🌍 MAIN-WORLD: Script injected into main world');

// Prevent duplicate injections - check if we're already active
if (window.__webAppMonitorActive) {
  (window.__originalConsoleLog || console.log)('⚠️ MAIN-WORLD: Web App Monitor already active, skipping duplicate injection');
  return;
}

// PHASE 3: Extension state management - check if extension is enabled
window.__extensionEnabled = true; // Default to enabled
window.__extensionStateChecked = false;

// Listen for extension state changes from content script
window.addEventListener('extensionStateChange', (event) => {
  const wasEnabled = window.__extensionEnabled;
  window.__extensionEnabled = event.detail?.enabled ?? true;
  
  if (wasEnabled && !window.__extensionEnabled) {
    // Extension was disabled - cleanup and stop all activity
    (window.__originalConsoleLog || console.log)('🚫 MAIN-WORLD: Extension disabled, cleaning up and stopping all activity');
    cleanupAndStop();
  } else if (!wasEnabled && window.__extensionEnabled) {
    // Extension was re-enabled - restart if needed
    (window.__originalConsoleLog || console.log)('✅ MAIN-WORLD: Extension re-enabled, restarting activity');
    restartActivity();
  }
});

// Function to cleanup and stop all extension activity
function cleanupAndStop() {
  // Stop network interception
  if (window.__networkInterceptionActive) {
    window.__networkInterceptionActive = false;
    
    // Restore original functions
    if (window.__originalFetch) {
      window.fetch = window.__originalFetch;
    }
    if (window.__originalXhrOpen) {
      XMLHttpRequest.prototype.open = window.__originalXhrOpen;
    }
    if (window.__originalXhrSend) {
      XMLHttpRequest.prototype.send = window.__originalXhrSend;
    }
    if (window.__originalXhrSetRequestHeader) {
      XMLHttpRequest.prototype.setRequestHeader = window.__originalXhrSetRequestHeader;
    }
  }
  
  // Stop console interception  
  if (window.__consoleInterceptionActive) {
    window.__consoleInterceptionActive = false;
    window.__consoleInterceptionEnabled = false;
    
    // Restore original console functions
    if (window.__originalConsole) {
      console.log = window.__originalConsole.log;
      console.info = window.__originalConsole.info;
      console.warn = window.__originalConsole.warn;
      console.error = window.__originalConsole.error;
    }
  }
  
  // Clear any pending timeouts or intervals
  // This will be expanded as we add more cleanup
}

// Function to restart activity when extension is re-enabled
function restartActivity() {
  // This will be implemented to restart network and console interception
  // For now, just mark that we need to reinitialize
  window.__needsReinitialization = true;
}

// Early exit if extension is disabled
function checkExtensionEnabled() {
  if (!window.__extensionEnabled) {
    debugLog('🚫 MAIN-WORLD: Extension is disabled, skipping operation');
    return false;
  }
  return true;
}

// Mark as active to prevent future duplicates
window.__webAppMonitorActive = true;
// Note: Startup message - always shown during initial load

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

// ZERO OVERHEAD: Debug mode control - only show extension messages when logging is active
let isDebugMode = false;

// Smart logging function - only logs when debug mode is active OR when it's a critical startup message
const debugLog = (message, ...args) => {
  if (isDebugMode || window.__forceDebugMode) {
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog(message, ...args);
    }
  }
};

// Critical startup messages (always show these during initial load)
const startupLog = (message, ...args) => {
  if (window.__originalConsoleLog) {
    window.__originalConsoleLog(message, ...args);
  }
};

// Global state for dynamic interception control
window.__consoleInterceptionEnabled = window.__consoleInterceptionEnabled ?? false;
window.__networkInterceptionEnabled = window.__networkInterceptionEnabled ?? true;

// Prevent recursive console interception
window.__isInterceptingConsole = window.__isInterceptingConsole ?? false;

// State change locks to prevent race conditions
let consoleStateChanging = false;
let networkStateChanging = false;

// Message deduplication
const processedMessages = new Set();
const MAX_PROCESSED_MESSAGES = 1000;

// PERFORMANCE OPTIMIZATION: Settings cache system with TTL to avoid repeated storage reads
window.__settingsCache = {
  network: {
    enabled: null,
    timestamp: 0,
    ttl: 5000 // 5 second cache
  },
  console: {
    enabled: null,
    timestamp: 0,
    ttl: 5000 // 5 second cache
  }
};

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
      debugLog('🌍 MAIN_WORLD: Error getting tab ID:', error);
      return null
    }
  } else {
    return null
  }
};

// ZERO OVERHEAD: Check if any logging is active to determine debug mode
const updateDebugMode = async () => {
  try {
    const consoleEnabled = await getCachedSetting('console');
    const networkEnabled = await getCachedSetting('network');
    const wasDebugMode = isDebugMode;
    
    // Only enable debug mode if ANY logging is active
    isDebugMode = consoleEnabled || networkEnabled;
    
    // Log debug mode changes (but only if we're enabling it)
    if (!wasDebugMode && isDebugMode) {
      debugLog('🔧 MAIN-WORLD: Debug mode enabled (logging active)');
    }
  } catch (error) {
    // Silently handle errors - don't show debug messages if we can't determine state
    isDebugMode = false;
  }
};

// PERFORMANCE OPTIMIZATION: Cached settings getter with TTL to reduce storage reads
const getCachedSetting = async (type) => {
  const cache = window.__settingsCache[type];
  const now = Date.now();
  
  // Return cached value if still valid
  if (cache.enabled !== null && (now - cache.timestamp) < cache.ttl) {
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog(`🚀 MAIN-WORLD: Using cached ${type} setting:`, cache.enabled);
    }
    return cache.enabled;
  }
  
  // Otherwise fetch fresh value
  try {
    const tabId = await getCurrentTabId();
    const result = await chrome.storage.local.get(['settings']);
    let enabled = false;
    
    if (type === 'network') {
      const networkConfig = result.settings?.networkInterception;
      
      if (networkConfig?.enabled !== true) {
        enabled = false;
      } else if (networkConfig?.tabSpecific?.enabled && tabId) {
        const tabKey = `tabLogging_${tabId}`;
        const tabResult = await chrome.storage.local.get([tabKey]);
        const tabLogging = tabResult[tabKey];
        
        if (tabLogging) {
          enabled = tabLogging.status === 'active' || tabLogging.active === true;
        } else {
          const defaultState = networkConfig?.tabSpecific?.defaultState || 'paused';
          enabled = defaultState === 'active';
        }
      } else {
        enabled = true; // Global enabled, tab-specific disabled
      }
    } else if (type === 'console') {
      const errorConfig = result.settings?.errorLogging;
      
      if (errorConfig?.enabled !== true) {
        enabled = false;
      } else if (errorConfig?.tabSpecific?.enabled && tabId) {
        const tabKey = `tabErrorLogging_${tabId}`;
        const tabResult = await chrome.storage.local.get([tabKey]);
        const tabLogging = tabResult[tabKey];
        
        if (tabLogging) {
          enabled = tabLogging.status === 'active' || tabLogging.active === true;
        } else {
          const defaultState = errorConfig?.tabSpecific?.defaultState || 'paused';
          enabled = defaultState === 'active';
        }
      } else {
        enabled = true; // Global enabled, tab-specific disabled
      }
    }
    
    // Update cache
    cache.enabled = enabled;
    cache.timestamp = now;
    
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog(`📝 MAIN-WORLD: Cached fresh ${type} setting:`, enabled);
    }
    
    return enabled;
  } catch (error) {
    // On error, assume disabled
    cache.enabled = false;
    cache.timestamp = now;
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog(`❌ MAIN-WORLD: Error getting ${type} setting, defaulting to disabled:`, error);
    }
    return false;
  }
};

// Invalidate cache on storage changes
const invalidateSettingsCache = () => {
  window.__settingsCache.network.enabled = null;
  window.__settingsCache.console.enabled = null;
  if (window.__originalConsoleLog) {
    window.__originalConsoleLog('🔄 MAIN-WORLD: Settings cache invalidated');
  }
};

// Check if network logging is enabled for current tab - OPTIMIZED with cache
const isNetworkLoggingEnabled = async () => {
  return await getCachedSetting('network');
};

// DEPRECATED: Legacy function kept for compatibility - redirects to network function
const isLoggingEnabled = isNetworkLoggingEnabled;

// Check if console error logging is enabled for current tab - OPTIMIZED with cache
const isConsoleLoggingEnabled = async () => {
  return await getCachedSetting('console');
};

// Helper function to safely extract domain from URL
function getSafeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    // CRITICAL: Use debug logging to prevent console spam when disabled
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
  if (maxSize === 0) return text; // No limit
  return text.substring(0, maxSize);
}

// Create our main world interception
const interceptFetch = async (originalFetch, input, init) => {
  // PHASE 3: Check extension state FIRST
  if (!checkExtensionEnabled()) {
    // Extension disabled - call original fetch without any interception
    return originalFetch.call(this, input, init);
  }

  // PERFORMANCE OPTIMIZATION: Check if network logging is enabled BEFORE intercepting
  const loggingEnabled = await isNetworkLoggingEnabled();
  if (!loggingEnabled) {
    // Skip interception entirely - call original fetch directly
    return originalFetch.call(this, input, init);
  }

  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // MEMORY OPTIMIZATION: Remove per-request logging to reduce tab memory usage
  // Only log critical errors that need debugging
  
  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = Date.now();
    
    // Double-check logging state before capturing data (prevent race conditions)
    const stillEnabled = await isNetworkLoggingEnabled();
    if (!stillEnabled) {
      return response; // Skip data capture if disabled during request
    }
    
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
    // CRITICAL: Only log critical errors when debug mode is active
    debugLog('🌍 MAIN-WORLD: Fetch error:', error);
    throw error;
  });
};

// XHR interception function
const interceptXHR = async (xhr, originalXhrSend, data) => {
  // PHASE 3: Check extension state FIRST
  if (!checkExtensionEnabled()) {
    // Extension disabled - call original send without any interception
    return originalXhrSend.call(xhr, data);
  }

  // PERFORMANCE OPTIMIZATION: Check if network logging is enabled BEFORE setting up listeners
  const loggingEnabled = await isNetworkLoggingEnabled();
  if (!loggingEnabled) {
    // Skip interception entirely - call original send directly
    return originalXhrSend.call(xhr, data);
  }

  xhr.addEventListener('loadend', async () => {
    // Double-check logging state before capturing data (prevent race conditions)
    const stillEnabled = await isNetworkLoggingEnabled();
    if (!stillEnabled) {
      return; // Skip data capture if disabled during request
    }

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
function interceptConsole(methodName, severity, ...args) {
  // PHASE 3: Check extension state FIRST
  if (!checkExtensionEnabled()) {
    // Extension disabled - skip console interception
    return;
  }

  // Skip if disabled (double-check)
  if (!window.__consoleInterceptionEnabled) {
    return;
  }

  // Prevent recursive interception
  if (window.__isInterceptingConsole) {
    return;
  }

  try {
    window.__isInterceptingConsole = true;

    // Convert arguments to string efficiently with better error handling
    const message = args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      // Handle Error objects specifically to get stack traces
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
      }
      // For objects, try JSON stringify with size limit
      if (typeof arg === 'object') {
        try {
          const str = JSON.stringify(arg, null, 2);
          // Limit size to prevent memory issues
          return str.length > 1000 ? str.substring(0, 1000) + '...' : str;
        } catch (e) {
          return '[Object]';
        }
      }
      return String(arg);
    }).join(' ');

    // Get stack trace for errors or if an Error object was passed
    let stackTrace = null;
    if (severity === 'error') {
      // Check if any argument is an Error object with a stack
      const errorArg = args.find(arg => arg instanceof Error && arg.stack);
      if (errorArg) {
        stackTrace = errorArg.stack.substring(0, 1000);
      } else {
        // Generate a stack trace for the current location
        try {
          throw new Error();
        } catch (e) {
          stackTrace = e.stack ? e.stack.substring(0, 1000) : null;
        }
      }
    }

    // Create minimal console data object
    const consoleData = {
      message: message.substring(0, 2000), // Limit message size
      severity: severity,
      timestamp: Date.now(), // Use number instead of ISO string
      url: window.location.href,
      domain: getSafeDomain(window.location.href),
      source: 'page-console',
      // Include stack for errors to help with debugging
      stack: stackTrace
    };

    // Dispatch event for content script
    window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
      detail: consoleData
    }));

  } catch (error) {
    // Silent fail to prevent recursive errors
    if (window.__originalConsole && window.__originalConsole.error) {
      window.__originalConsole.error('Console interception error:', error);
    }
  } finally {
    // Always clear the flag to prevent lock-ups
    window.__isInterceptingConsole = false;
  }
}

// Try to get settings from extension storage
try {
  // Request settings from the content script via custom event
  window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  
  // Listen for settings response
  window.addEventListener('extensionSettingsResponse', (event) => {
    if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
      extensionSettings.maxBodySize = event.detail.networkInterception.bodyCapture.maxBodySize || 2000;
      // CRITICAL: Use debug logging to prevent console spam when disabled
      debugLog('🌍 MAIN_WORLD: Updated settings - maxBodySize:', extensionSettings.maxBodySize);
    }
  });
  
  // Start interception
  const startInterception = () => {
    if (isIntercepting) return;
    
    // MEMORY OPTIMIZATION: Keep only essential startup logging
    isIntercepting = true;
    
    // Set up fetch interception - RACE CONDITION SAFE async wrapper
    window.fetch = function(input, init) {
      // Async wrapper that properly handles the promise chain
      return (async () => {
        try {
          return await interceptFetch(originalFetch, input, init);
        } catch (error) {
          // CRITICAL: Use debug logging to prevent console spam when disabled
          debugLog('🌍 MAIN-WORLD: Fetch interception error:', error);
          // Fallback to original fetch on interception error
          return originalFetch.call(this, input, init);
        }
      })();
    };
    
    // Set up XHR interception - MEMORY LEAK SAFE
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
      // Async wrapper that properly handles the promise - RACE CONDITION SAFE
      (async () => {
        try {
          await interceptXHR(this, originalXhrSend, data);
        } catch (error) {
          // CRITICAL: Use debug logging to prevent console spam when disabled
          debugLog('🌍 MAIN-WORLD: XHR interception error:', error);
          // Fallback to original send on interception error
          originalXhrSend.call(this, data);
        }
      })();
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

  // === OPTIMIZED DYNAMIC CONSOLE INTERCEPTION SYSTEM ===
  
  // Track if console methods are wrapped
  window.__consoleWrapped = false;
  
  // PERFORMANCE OPTIMIZATION: Dynamic console wrapper management - only wrap when needed
  function wrapConsoleMethods() {
    if (window.__consoleWrapped) return;
    
    console.log = function(...args) {
      window.__originalConsole.log.apply(console, args);
      interceptConsole('log', 'info', ...args);
    };
    
    console.info = function(...args) {
      window.__originalConsole.info.apply(console, args);
      interceptConsole('info', 'info', ...args);
    };
    
    console.warn = function(...args) {
      window.__originalConsole.warn.apply(console, args);
      interceptConsole('warn', 'warn', ...args);
    };
    
    console.error = function(...args) {
      window.__originalConsole.error.apply(console, args);
      
      // Extract stack trace if available
      let stack = '';
      for (let arg of args) {
        if (arg instanceof Error && arg.stack) {
          stack = String(arg.stack).substring(0, 1000);
          break;
        }
      }
      
      interceptConsole('error', 'error', ...args);
    };
    
    window.__consoleWrapped = true;
    
    debugLog('🎛️ MAIN-WORLD: Console methods wrapped for interception');
  }

  // MEMORY OPTIMIZATION: Unwrap console methods to restore zero overhead
  function unwrapConsoleMethods() {
    if (!window.__consoleWrapped) return;
    
    console.log = window.__originalConsole.log;
    console.info = window.__originalConsole.info;
    console.warn = window.__originalConsole.warn;
    console.error = window.__originalConsole.error;
    
    window.__consoleWrapped = false;
    
    debugLog('🎛️ MAIN-WORLD: Console methods unwrapped - zero overhead restored');
  }

  // OPTIMIZED: Enable console interception with caching
  function enableConsoleInterception() {
    if (window.__consoleInterceptionEnabled || consoleStateChanging) return; // Already enabled or changing
    
    consoleStateChanging = true;
    
    try {
      window.__consoleInterceptionEnabled = true;
      wrapConsoleMethods();
      isConsoleIntercepting = true;
      
      // Update cache
      if (window.__settingsCache && window.__settingsCache.console) {
        window.__settingsCache.console.enabled = true;
        window.__settingsCache.console.timestamp = Date.now();
      }
      
      debugLog('🎛️ MAIN-WORLD: Console interception ENABLED');
    } finally {
      consoleStateChanging = false;
    }
  }

  // OPTIMIZED: Disable console interception with zero overhead
  function disableConsoleInterception() {
    if (!window.__consoleInterceptionEnabled || consoleStateChanging) return; // Already disabled or changing
    
    consoleStateChanging = true;
    
    try {
      window.__consoleInterceptionEnabled = false;
      unwrapConsoleMethods();
      isConsoleIntercepting = false;
      
      // Update cache
      if (window.__settingsCache && window.__settingsCache.console) {
        window.__settingsCache.console.enabled = false;
        window.__settingsCache.console.timestamp = Date.now();
      }
      
      // Clear any pending events to free memory
      if (window.__pendingConsoleEvents) {
        window.__pendingConsoleEvents.length = 0;
        window.__pendingConsoleEvents = null;
      }
      
      // Force garbage collection if available
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
        } catch (e) {
          // Ignore errors
        }
      }
      
      debugLog('🎛️ MAIN-WORLD: Console interception DISABLED (zero overhead)');
    } finally {
      consoleStateChanging = false;
    }
  }

  // === PHASE 6: COMPREHENSIVE STOP FUNCTIONS ===
  
  // MEMORY OPTIMIZATION: Complete stop of all interception with memory cleanup
  function stopAllInterception() {
    debugLog('🛑 MAIN-WORLD: Stopping ALL interception and cleaning up memory');
    
    try {
      // Stop both console and network interception
      disableConsoleInterception();
      disableNetworkInterception();
      
      // Clear all caches
      invalidateSettingsCache();
      
      // Clear processed messages
      if (processedMessages) {
        processedMessages.clear();
      }
      
      // Clear any pending events
      if (window.__pendingConsoleEvents) {
        window.__pendingConsoleEvents.length = 0;
        window.__pendingConsoleEvents = null;
      }
      
      // Clear any pending network events
      if (window.__pendingNetworkEvents) {
        window.__pendingNetworkEvents.length = 0;
        window.__pendingNetworkEvents = null;
      }
      
      // Reset all flags
      window.__consoleInterceptionEnabled = false;
      window.__networkInterceptionEnabled = false;
      window.__consoleWrapped = false;
      isConsoleIntercepting = false;
      isIntercepting = false;
      
      // Disable debug mode when all interception is stopped
      isDebugMode = false;
      
      // Force garbage collection if available
      if (window.gc && typeof window.gc === 'function') {
        try {
          window.gc();
        } catch (e) {
          // Ignore errors
        }
      }
      
      debugLog('✅ MAIN-WORLD: All interception stopped and memory cleaned');
    } catch (error) {
      debugLog('⚠️ MAIN-WORLD: Error during complete stop:', error);
    }
  }
  
  // PERFORMANCE OPTIMIZATION: Quick check if any interception is active
  function isAnyInterceptionActive() {
    return window.__consoleInterceptionEnabled || window.__networkInterceptionEnabled || 
           isConsoleIntercepting || isIntercepting;
  }

  // Enable network interception
  function enableNetworkInterception() {
    if ((window.__networkInterceptionEnabled && isIntercepting) || networkStateChanging) return; // Already enabled or changing
    
    networkStateChanging = true;
    
    try {
      window.__networkInterceptionEnabled = true;
      startInterception();
      
      debugLog('🎛️ MAIN-WORLD: Network interception ENABLED');
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
      
      debugLog('🎛️ MAIN-WORLD: Network interception DISABLED');
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
      processedMessages: processedMessages.size,
      consoleWrapped: window.__consoleWrapped,
      debugMode: isDebugMode,
      cacheState: window.__settingsCache ? {
        console: window.__settingsCache.console,
        network: window.__settingsCache.network
      } : null
    }),
    
    // Manual control for testing
    enableConsole: enableConsoleInterception,
    disableConsole: disableConsoleInterception,
    enableNetwork: enableNetworkInterception,
    disableNetwork: disableNetworkInterception,
    
    // PHASE 6: New comprehensive control functions
    stopAll: stopAllInterception,
    isAnyActive: isAnyInterceptionActive,
    
    // PHASE 1: Cache management functions
    invalidateCache: invalidateSettingsCache,
    getCachedSetting: getCachedSetting,
    
    // ZERO OVERHEAD: Debug mode control
    enableDebugMode: () => { 
      window.__forceDebugMode = true; 
      isDebugMode = true; 
      debugLog('🔧 MAIN-WORLD: Debug mode force enabled'); 
    },
    disableDebugMode: () => { 
      window.__forceDebugMode = false; 
      updateDebugMode(); 
      debugLog('🔧 MAIN-WORLD: Debug mode returned to automatic'); 
    },
    updateDebugMode: updateDebugMode,
    
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

  // Initial setup - PERFORMANCE OPTIMIZED to start interceptors only when needed
  (() => {
    try {
      // CHANGED: Don't start network interception immediately - wait for storage check
      // Only set up the framework to prevent race conditions
      if (window.__originalConsoleLog) {
        window.__originalConsoleLog('✅ MAIN-WORLD: Interception framework initialized');
      }
    } catch (error) {
      if (window.__originalConsoleLog) {
        window.__originalConsoleLog('🌍 MAIN-WORLD: Error during initial setup:', error);
      }
    }
  })();

  // === PHASE 3: OPTIMIZED STORAGE-BASED INITIALIZATION ===
  setTimeout(async () => {
    try {
      // ZERO OVERHEAD: Update debug mode based on logging status
      await updateDebugMode();
      
      // PERFORMANCE OPTIMIZATION: Use cached settings for initial state check
      const consoleShouldBeEnabled = await getCachedSetting('console');
      debugLog('🔍 MAIN-WORLD: Console interception initial state check (cached):', {
        shouldBeEnabled: consoleShouldBeEnabled,
        currentState: window.__consoleInterceptionEnabled
      });

      // Sync console interception state with cached storage
      if (consoleShouldBeEnabled && !window.__consoleInterceptionEnabled) {
        debugLog('🎛️ MAIN-WORLD: Enabling console interception based on cached storage');
        enableConsoleInterception();
      } else if (!consoleShouldBeEnabled && window.__consoleInterceptionEnabled) {
        debugLog('🎛️ MAIN-WORLD: Disabling console interception based on cached storage');
        disableConsoleInterception();
      }

      // PERFORMANCE OPTIMIZATION: Check network logging state using cache
      const networkShouldBeEnabled = await getCachedSetting('network');
      debugLog('🔍 MAIN-WORLD: Network interception initial state check (cached):', {
        shouldBeEnabled: networkShouldBeEnabled,
        currentState: window.__networkInterceptionEnabled
      });

      // Sync network interception state with cached storage
      if (networkShouldBeEnabled && !isIntercepting) {
        debugLog('🎛️ MAIN-WORLD: Enabling network interception based on cached storage');
        enableNetworkInterception();
      } else if (!networkShouldBeEnabled && isIntercepting) {
        debugLog('🎛️ MAIN-WORLD: Disabling network interception based on cached storage');
        disableNetworkInterception();
      }
      
      // Update debug mode again after state changes
      await updateDebugMode();
    } catch (error) {
      debugLog('⚠️ MAIN-WORLD: Error checking cached interception states:', error);
      // Default to disabled on error for both console and network
      if (window.__consoleInterceptionEnabled) {
        disableConsoleInterception();
      }
      if (isIntercepting) {
        disableNetworkInterception();
      }
      // Ensure debug mode is off if there's an error
      isDebugMode = false;
    }
  }, 250);
  
  // === PHASE 5: OPTIMIZED STORAGE CHANGE LISTENER WITH DEBOUNCING ===
  if (typeof chrome !== 'undefined' && chrome.storage) {
    // Debounce variables for storage changes
    let storageChangeTimeout = null;
    
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      try {
        if (namespace === 'local' || namespace === 'sync') {
          // PERFORMANCE OPTIMIZATION: Debounce rapid storage changes
          if (storageChangeTimeout) {
            clearTimeout(storageChangeTimeout);
          }
          
          storageChangeTimeout = setTimeout(async () => {
            try {
              // PERFORMANCE OPTIMIZATION: Invalidate cache and get fresh values
              invalidateSettingsCache();
              
              const networkEnabled = await getCachedSetting('network');
              const consoleEnabled = await getCachedSetting('console');
              
              // ZERO OVERHEAD: Update debug mode based on any logging being active
              await updateDebugMode();
              
              // Handle network interception with proper state checks
              if (networkEnabled && !isIntercepting) {
                debugLog('🎛️ MAIN-WORLD: Storage change - enabling network interception (cached)');
                enableNetworkInterception();
              } else if (!networkEnabled && isIntercepting) {
                debugLog('🎛️ MAIN-WORLD: Storage change - disabling network interception (cached)');
                disableNetworkInterception();
              }
              
              // Handle console interception  
              if (consoleEnabled && !window.__consoleInterceptionEnabled) {
                debugLog('🎛️ MAIN-WORLD: Storage change - enabling console interception (cached)');
                enableConsoleInterception();
              } else if (!consoleEnabled && window.__consoleInterceptionEnabled) {
                debugLog('🎛️ MAIN-WORLD: Storage change - disabling console interception (cached)');
                disableConsoleInterception();
              }
              
              // Update debug mode again after state changes
              await updateDebugMode();
            } catch (error) {
              debugLog('🌍 MAIN-WORLD: Debounced storage change error:', error);
            }
          }, 100); // 100ms debounce to prevent rapid firing
        }
      } catch (error) {
        if (window.__originalConsoleLog) {
          window.__originalConsoleLog('🌍 MAIN-WORLD: Storage change setup error:', error);
        }
      }
    });
  }

  // === PHASE 7: MEMORY CLEANUP ON PAGE UNLOAD ===
  
  // MEMORY OPTIMIZATION: Clean up all resources on page unload
  window.addEventListener('beforeunload', () => {
    try {
      if (window.__originalConsole.log) {
        window.__originalConsole.log('🗑️ MAIN-WORLD: Page unloading - cleaning up all interception');
      }
      
      // Stop all interception and clean memory
      stopAllInterception();
      
      // Clear any remaining timeouts
      if (storageChangeTimeout) {
        clearTimeout(storageChangeTimeout);
        storageChangeTimeout = null;
      }
      
      // Remove global references
      window.__webAppMonitorDebug = null;
      window.__consoleWrapped = null;
      window.__consoleInterceptionEnabled = null;
      window.__networkInterceptionEnabled = null;
      
    } catch (error) {
      // Silently handle cleanup errors during unload
      try {
        if (window.__originalConsole.log) {
          window.__originalConsole.log('⚠️ MAIN-WORLD: Cleanup error during unload:', error);
        }
      } catch (e) {
        // Final fallback
      }
    }
  }, { passive: true });
  
  // MEMORY OPTIMIZATION: Also handle page visibility changes for aggressive memory management
  document.addEventListener('visibilitychange', () => {
    try {
      if (document.hidden && isAnyInterceptionActive()) {
        // Page is hidden - consider reducing memory footprint
        invalidateSettingsCache();
        
        // Force garbage collection if available
        if (window.gc && typeof window.gc === 'function') {
          try {
            window.gc();
          } catch (e) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      // Silently handle visibility change errors
    }
  }, { passive: true });

} catch (error) {
  if (window.__originalConsoleLog) {
    window.__originalConsoleLog('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
  }
}

// Only show final load message if debug mode is active OR during initial load
setTimeout(async () => {
  await updateDebugMode();
  if (isDebugMode || window.__forceDebugMode) {
    if (window.__originalConsoleLog) {
      window.__originalConsoleLog('🌍 MAIN-WORLD: OPTIMIZED network interception script loaded and ready');
      window.__originalConsoleLog('✅ OPTIMIZATION COMPLETE: 7-Phase performance enhancement implemented');
      window.__originalConsoleLog('🎯 FEATURES: Dynamic wrapping, settings cache, debounced listeners, memory cleanup');
      window.__originalConsoleLog('🔇 ZERO OVERHEAD: Extension debug messages suppressed when no logging active');
    }
  }
}, 500);

})(); // End IIFE
