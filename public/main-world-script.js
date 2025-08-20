// Main world injection script - runs in the same context as the page
console.log('MAIN-WORLD: Script injected into main world');

// Prevent duplicate injection
if (typeof window._extensionInjected !== 'undefined') {
  console.log('MAIN-WORLD: Already injected, skipping...');
} else {
  // Mark as injected and continue initialization
  window._extensionInjected = true;

// Prevent duplicate variable declarations
if (typeof extensionSettings === 'undefined') {
  // Default settings
  var extensionSettings = {
    maxBodySize: 2000 // Default truncation limit
  };
}

// Track original functions and interception state (only if not already declared)
if (typeof originalFetch === 'undefined') {
  var originalFetch = window.fetch;
  var originalXhrOpen = XMLHttpRequest.prototype.open;
  var originalXhrSend = XMLHttpRequest.prototype.send;
  var originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  var originalConsoleError = console.error;
  var originalConsoleWarn = console.warn;
  var originalConsoleInfo = console.info;
  var originalConsoleLog = console.log;
}
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

    originalConsoleLog.call(console, 'MAIN-WORLD: Requesting from content script:', action, 'ID:', requestId);

    const responseHandler = (event) => {
      if (event.detail?.requestId === requestId && !resolved) {
        resolved = true;
        window.removeEventListener('contentScriptResponse', responseHandler);
        originalConsoleLog.call(console, 'MAIN-WORLD: Received response for:', action, 'Response:', event.detail.response);
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
        originalConsoleLog.call(console, 'MAIN-WORLD: Request timeout for:', action);
        resolve(null);
      }
    }, 1000);
  });
};

// Check if logging is enabled for current tab
const isLoggingEnabled = async () => {
  try {
    originalConsoleLog.call(console, 'MAIN-WORLD: Checking if logging is enabled...');
    const result = await requestFromContentScript('checkNetworkLogging');
    originalConsoleLog.call(console, 'MAIN-WORLD: Network logging check result:', result);
    return result?.enabled ?? mainWorldState.networkLoggingEnabled;
  } catch (error) {
    originalConsoleWarn.call(console, 'MAIN-WORLD: Error checking logging state:', error);
    return mainWorldState.networkLoggingEnabled;
  }
};

// Check if console error logging is enabled for current tab
const isConsoleLoggingEnabled = async () => {
  try {
    originalConsoleLog.call(console, 'MAIN-WORLD: Checking if console logging is enabled...');
    const result = await requestFromContentScript('checkConsoleLogging');
    originalConsoleLog.call(console, 'MAIN-WORLD: Console logging check result:', result);
    return result?.enabled ?? mainWorldState.consoleLoggingEnabled;
  } catch (error) {
    originalConsoleWarn.call(console, 'MAIN-WORLD: Error checking console logging state:', error);
    return mainWorldState.consoleLoggingEnabled;
  }
};

// Helper function to safely extract domain from URL
function getSafeDomain(url) {
  try {
    // Handle relative URLs by resolving against current origin
    const resolvedUrl = url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
      ? new URL(url, window.location.origin)
      : new URL(url);
    return resolvedUrl.hostname;
  } catch (error) {
    originalConsoleLog.call(console, 'MAIN-WORLD: Could not parse URL, using fallback domain:', url);
    // Extract domain from URL string manually for absolute URLs
    if (typeof url === 'string') {
      const match = url.match(/^https?:\/\/([^\/]+)/);
      if (match) {
        return match[1];
      }
      // For relative URLs that couldn't be resolved, use current hostname
      if (url.startsWith('/')) {
        return window.location.hostname;
      }
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
    originalConsoleLog.call(console, `MAIN-WORLD: MAIN-WORLD: Truncating body from ${text.length} to ${effectiveMaxSize} characters (user limit: ${maxSize})`);
    return text.substring(0, effectiveMaxSize) + '... [TRUNCATED]';
  }

  return text;
}

// Create our main world interception
const interceptFetch = (originalFetch, input, init) => {
  const startTime = Date.now();
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // CRITICAL: Resolve relative URLs to absolute URLs for proper database storage
  try {
    if (url && (url.startsWith('/') || url.startsWith('./') || url.startsWith('../'))) {
      url = new URL(url, window.location.origin).href;
    }
  } catch (error) {
    originalConsoleLog.call(console, 'MAIN-WORLD: URL resolution failed:', url, error);
  }

  // Log intercept (reduced for performance)
  if (Math.random() < 0.1) { // Only log 10% of requests
    originalConsoleLog.call(console, 'MAIN-WORLD: Intercepted fetch request:', url);
  }

  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = Date.now();
    // Log response (reduced for performance)
    if (Math.random() < 0.1) { // Only log 10% of responses
      originalConsoleLog.call(console, 'MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
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
          originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Could not read response body:', e);
        }
      }
    } catch (e) {
      originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Error capturing fetch body:', e);
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

    // DEBUG: Log every 10th request to track what's being sent
    if (Math.random() < 0.1) {
      originalConsoleLog.call(console, 'MAIN-WORLD: Sending fetch data to content script:', {
        url: capturedData.url,
        domain: capturedData.domain,
        status: capturedData.status,
        method: capturedData.method
      });
    }

    // Send to content script
    window.postMessage({
      source: 'main-world-network-interceptor',
      data: capturedData
    }, '*');

    return response;
  }).catch(error => {
    originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Fetch error:', error);
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
      originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Could not get XHR response headers:', e);
    }

    // Capture response body
    let responseBody = '';
    try {
      if (xhr.responseText) {
        responseBody = truncateBody(xhr.responseText, extensionSettings.maxBodySize);
      }
    } catch (e) {
      originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Could not get XHR response body:', e);
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

    // Debug logging for XHR requests
    console.log(`MAIN-WORLD XHR: Sending data for ${xhr._url}:`, {
      url: capturedData.url,
      domain: capturedData.domain,
      method: capturedData.method,
      status: capturedData.status,
      hasRequestBody: !!capturedData.requestBody,
      hasResponseBody: !!capturedData.responseBody,
      requestHeaders: Object.keys(capturedData.requestHeaders).length,
      responseHeaders: Object.keys(capturedData.responseHeaders).length
    });

    // Send to content script
    window.postMessage({
      source: 'main-world-network-interceptor',
      data: capturedData
    }, '*');
  });

  return originalXhrSend.call(xhr, data);
};

// Console interception functions
const interceptConsole = (originalMethod, methodName, severity, callSiteStack, ...args) => {
  // Call original method first to maintain normal console behavior
  try {
    originalMethod.apply(console, args);
  } catch (error) {
    // If original method fails, continue with capture anyway
    originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Error calling original console method:', error);
  }

  // Check if we should capture this log level
  const shouldCapture = async () => {
    try {
      const isEnabled = await isConsoleLoggingEnabled();
      if (!isEnabled) return false;

      // For now, capture all console calls when enabled
      // TODO: Add severity filtering through content script bridge
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

      // STACK TRACE FIX: Use pre-captured stack from call site with defensive handling
      let stack;
      try {
        stack = callSiteStack || (new Error().stack) || 'No stack trace available';
      } catch (stackError) {
        stack = 'Error capturing stack trace';
      }

      // Create console error data that matches main branch format
      const consoleData = {
        message: message,
        severity: severity,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        domain: getSafeDomain(window.location.href),
        source: 'page-console',
        stack: stack,
        // Add line/column info if available from stack
        lineNumber: null,
        columnNumber: null,
        filename: window.location.href
      };

      // Try to parse stack trace for line/column info and clean it
      if (stack) {
        const stackLines = stack.split('\n');

        // STACK TRACE FIX: Clean the stack to remove interceptor frames
        // Remove: Error constructor, console override function, and interceptConsole function
        // Find the first frame that's not from the extension
        let cleanedStackLines = [];
        let foundUserCode = false;

        for (let i = 0; i < stackLines.length; i++) {
          const line = stackLines[i];

          // Skip extension frames (contains chrome-extension://)
          if (line.includes('chrome-extension://') ||
              line.includes('main-world-script.js') ||
              line.trim().startsWith('at console.') ||
              line.trim().startsWith('at interceptConsole')) {
            continue;
          }

          // This is user code, keep it
          cleanedStackLines.push(line);
          if (!foundUserCode) {
            foundUserCode = true;
            // Extract line/column from first user code frame
            const match = line.match(/:(\d+):(\d+)\)?$/);
            if (match) {
              consoleData.lineNumber = parseInt(match[1], 10);
              consoleData.columnNumber = parseInt(match[2], 10);
            }
          }
        }

        // Update the stack in consoleData with cleaned version
        if (cleanedStackLines.length > 0) {
          consoleData.stack = cleanedStackLines.join('\n');
        }
      }

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
      originalConsoleLog.call(console, 'MAIN-WORLD: Updated settings - maxBodySize:', extensionSettings.maxBodySize);
    }
  });

  // Start interception
  const startInterception = () => {
    if (isIntercepting) return;

    originalConsoleLog.call(console, 'MAIN-WORLD: Starting network interception...');
    isIntercepting = true;

    // Set up fetch interception
    window.fetch = function(input, init) {
      return interceptFetch(originalFetch, input, init);
    };

    // Set up XHR interception
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      this._method = method;

      // CRITICAL: Resolve relative URLs to absolute URLs for proper database storage
      try {
        if (url && (url.startsWith('/') || url.startsWith('./') || url.startsWith('../'))) {
          this._url = new URL(url, window.location.origin).href;
        } else {
          this._url = url;
        }
      } catch (error) {
        originalConsoleLog.call(console, 'MAIN-WORLD: XHR URL resolution failed:', url, error);
        this._url = url; // Fallback to original URL
      }

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

    originalConsoleLog.call(console, 'MAIN-WORLD: Starting console interception...');
    isConsoleIntercepting = true;

    // Override console methods
    console.error = function(...args) {
      // STACK TRACE FIX: Capture stack trace immediately at console call site
      const callSiteStack = (new Error().stack) || 'No stack trace available';
      interceptConsole(originalConsoleError, 'error', 'error', callSiteStack, ...args);
    };

    console.warn = function(...args) {
      // STACK TRACE FIX: Capture stack trace immediately at console call site
      const callSiteStack = (new Error().stack) || 'No stack trace available';
      interceptConsole(originalConsoleWarn, 'warn', 'warn', callSiteStack, ...args);
    };

    console.info = function(...args) {
      // STACK TRACE FIX: Capture stack trace immediately at console call site
      const callSiteStack = (new Error().stack) || 'No stack trace available';
      interceptConsole(originalConsoleInfo, 'info', 'info', callSiteStack, ...args);
    };

    console.log = function(...args) {
      // STACK TRACE FIX: Capture stack trace immediately at console call site
      const callSiteStack = (new Error().stack) || 'No stack trace available';
      interceptConsole(originalConsoleLog, 'log', 'info', callSiteStack, ...args);
    };
  };

  // Stop interception
  const stopInterception = () => {
    if (!isIntercepting) return;

    originalConsoleLog.call(console, ' MAIN_WORLD: Stopping network interception...');
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

    originalConsoleLog.call(console, ' MAIN_WORLD: Stopping console interception...');
    isConsoleIntercepting = false;

    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.log = originalConsoleLog;
  };

  // Initial setup - check if we should start intercepting
  (async () => {
    // Prevent duplicate initialization
    if (window.mainWorldInitialized) {
      originalConsoleLog.call(console, ' MAIN_WORLD: Already initialized, skipping duplicate setup');
      return;
    }
    window.mainWorldInitialized = true;

    originalConsoleLog.call(console, ' MAIN_WORLD: Initializing network interception...');

    // Request initial settings
    window.dispatchEvent(new CustomEvent('extensionRequestSettings'));

    // Wait a bit for content script to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check initial states
    originalConsoleLog.call(console, ' MAIN_WORLD: Checking initial logging states...');
    const networkEnabled = await isLoggingEnabled();
    const consoleEnabled = await isConsoleLoggingEnabled();

    originalConsoleLog.call(console, ' MAIN_WORLD: Initial states - Network:', networkEnabled, 'Console:', consoleEnabled);

    if (networkEnabled) {
      originalConsoleLog.call(console, ' MAIN_WORLD: Network logging enabled, starting interception...');
      startInterception();
    } else {
      originalConsoleLog.call(console, ' MAIN_WORLD: Network logging disabled, not starting interception');
    }

    if (consoleEnabled) {
      originalConsoleLog.call(console, ' MAIN_WORLD: Console logging enabled, starting console interception...');
      startConsoleInterception();
    } else {
      originalConsoleLog.call(console, ' MAIN_WORLD: Console logging disabled, not starting console interception');
    }
  })();

  // Listen for extension state changes from content script
  window.addEventListener('extensionStateChange', (event) => {
    if (event.detail?.enabled !== undefined) {
      mainWorldState.extensionEnabled = event.detail.enabled;
      originalConsoleLog.call(console, 'MAIN-WORLD: Extension enabled state changed:', mainWorldState.extensionEnabled);

      if (!mainWorldState.extensionEnabled) {
        stopInterception();
        stopConsoleInterception();
      }
    }
  });

  // Listen for tab logging state changes
  window.addEventListener('tabLoggingStateChange', async (event) => {
    originalConsoleLog.call(console, 'MAIN-WORLD: Tab logging state change received:', event.detail);

    if (event.detail?.networkEnabled !== undefined) {
      const networkEnabled = event.detail.networkEnabled && mainWorldState.extensionEnabled;

      if (networkEnabled && !isIntercepting) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Starting network interception due to state change');
        startInterception();
      } else if (!networkEnabled && isIntercepting) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Stopping network interception due to state change');
        stopInterception();
      }
    }

    if (event.detail?.consoleEnabled !== undefined) {
      const consoleEnabled = event.detail.consoleEnabled && mainWorldState.extensionEnabled;

      if (consoleEnabled && !isConsoleIntercepting) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Starting console interception due to state change');
        startConsoleInterception();
      } else if (!consoleEnabled && isConsoleIntercepting) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Stopping console interception due to state change');
        stopConsoleInterception();
      }
    }
  });

} catch (error) {
  originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Could not get settings, using defaults:', error);
}

// Add activity check response handler
window.addEventListener('checkMainWorldActive', (event) => {
  originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Activity check received');
  window.dispatchEvent(new CustomEvent('mainWorldActiveResponse', {
    detail: {
      checkId: event.detail?.checkId,
      isActive: true
    }
  }));
});

originalConsoleLog.call(console, 'MAIN-WORLD: Network interception script loaded and ready');

} // End of main initialization block
