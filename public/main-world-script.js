// Main world injection script - runs in the same context as the page
console.log('MAIN-WORLD: Script injected into main world');

// Prevent duplicate injection
if (typeof window._extensionInjected !== 'undefined') {
  console.log('MAIN-WORLD: Already injected, skipping...');
} else {
  // Mark as injected and continue initialization
  window._extensionInjected = true;

// Performance monitoring state (prevent duplicate declarations)
if (typeof performanceMetricsState === 'undefined') {
  var performanceMetricsState = {
    observer: null,
    pendingRequests: new Map(),
    isObserving: false,
    maxPendingRequests: 1000, // Memory leak protection
    cleanupInterval: null
  };
}

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
// FIX: Start with disabled defaults to prevent inappropriate logging on tab reactivation
let mainWorldState = {
  extensionEnabled: true,
  networkLoggingEnabled: false,  // Start disabled, will be enabled by content script if needed
  consoleLoggingEnabled: false   // Start disabled, will be enabled by content script if needed
};

// Error statistics tracking
let errorStats = {
  crossOriginErrors: 0,
  regularErrors: 0,
  unhandledRejections: 0,
  consoleErrors: 0,
  consoleWarns: 0,
  consoleInfos: 0,
  consoleLogs: 0,
  startTime: Date.now()
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

// Performance Metrics Collection Functions
const extractPerformanceMetrics = (url, requestStartTime, manualDuration) => {
  try {
    // Get all resource entries for this URL
    const entries = performance.getEntriesByName(url, 'resource');
    if (entries.length === 0) return null;

    // Find the entry closest to our request start time
    const targetEntry = entries.find(entry => {
      const timeDiff = Math.abs(entry.startTime - (requestStartTime - performance.timeOrigin));
      return timeDiff < 100; // Within 100ms tolerance
    }) || entries[entries.length - 1]; // Fallback to latest entry

    // Check if we have detailed timing data (not restricted by cross-origin policies)
    const hasDetailedTiming = targetEntry.domainLookupStart > 0 &&
                             targetEntry.connectStart > 0 &&
                             targetEntry.requestStart > 0 &&
                             targetEntry.responseStart > 0;

    // Extract timing metrics with safety checks
    const metrics = {
      dnsLookup: hasDetailedTiming && targetEntry.domainLookupEnd && targetEntry.domainLookupStart ?
        Math.max(0, targetEntry.domainLookupEnd - targetEntry.domainLookupStart) : 0,

      tcpConnect: hasDetailedTiming && targetEntry.connectEnd && targetEntry.connectStart ?
        Math.max(0, targetEntry.connectEnd - targetEntry.connectStart) : 0,

      sslHandshake: hasDetailedTiming && targetEntry.secureConnectionStart > 0 && targetEntry.connectEnd ?
        Math.max(0, targetEntry.connectEnd - targetEntry.secureConnectionStart) : 0,

      // NEW: Request queuing/waiting time (from connection ready to request start)
      requestWaiting: hasDetailedTiming && targetEntry.requestStart && targetEntry.connectEnd ?
        Math.max(0, targetEntry.requestStart - targetEntry.connectEnd) : 0,

      timeToFirstByte: hasDetailedTiming && targetEntry.responseStart && targetEntry.requestStart ?
        Math.max(0, targetEntry.responseStart - targetEntry.requestStart) : 0,

      contentDownload: hasDetailedTiming && targetEntry.responseEnd && targetEntry.responseStart ?
        Math.max(0, targetEntry.responseEnd - targetEntry.responseStart) : 0,

      // Use Resource Timing total if available and reasonable, otherwise use manual timing
      totalTime: (() => {
        const resourceTotal = targetEntry.responseEnd && targetEntry.startTime ?
          Math.max(0, targetEntry.responseEnd - targetEntry.startTime) : 0;

        // If Resource Timing total seems unreasonable (too far from manual), use manual
        if (resourceTotal > 0 && manualDuration > 0) {
          const difference = Math.abs(resourceTotal - manualDuration);
          const percentDiff = difference / Math.max(resourceTotal, manualDuration);

          // If difference is > 50%, prefer manual timing (more reliable)
          return percentDiff > 0.5 ? manualDuration : resourceTotal;
        }

        return resourceTotal > 0 ? resourceTotal : (manualDuration || 0);
      })(),

      redirectTime: hasDetailedTiming && targetEntry.redirectEnd && targetEntry.redirectStart ?
        Math.max(0, targetEntry.redirectEnd - targetEntry.redirectStart) : 0,

      requestTime: hasDetailedTiming && targetEntry.responseStart && targetEntry.requestStart ?
        Math.max(0, targetEntry.responseStart - targetEntry.requestStart) : 0,

      // Additional useful metrics
      transferSize: targetEntry.transferSize || 0,
      encodedBodySize: targetEntry.encodedBodySize || 0,
      decodedBodySize: targetEntry.decodedBodySize || 0,

      // Add manual duration as backup reference
      manualDuration: manualDuration || 0,

      // Enhanced cache status detection
      cacheStatus: (() => {
        if (targetEntry.transferSize === 0 && targetEntry.encodedBodySize > 0) return 'hit';
        if (targetEntry.transferSize > 0) return 'miss';
        return 'unknown';
      })(),

      // Add timing data quality indicator
      timingDataQuality: hasDetailedTiming ? 'full' : 'limited'
    };

    // Round to 2 decimal places for cleaner data
    Object.keys(metrics).forEach(key => {
      if (typeof metrics[key] === 'number' &&
          !['transferSize', 'encodedBodySize', 'decodedBodySize', 'manualDuration'].includes(key)) {
        metrics[key] = Math.round(metrics[key] * 100) / 100;
      }
    });

    return metrics;
  } catch (error) {
    originalConsoleWarn.call(console, 'MAIN-WORLD: Performance metrics extraction failed:', error);
    return null;
  }
};

const initializePerformanceMonitoring = () => {
  if (!window.PerformanceObserver || performanceMetricsState.isObserving) return;

  try {
    // Set up PerformanceObserver for real-time resource timing
    performanceMetricsState.observer = new PerformanceObserver((list) => {
      try {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            // Check if we have pending requests for this URL
            const pendingKey = `${entry.name}:${Math.floor(entry.startTime)}`;
            const approximateKeys = Array.from(performanceMetricsState.pendingRequests.keys())
              .filter(key => key.startsWith(entry.name));

            // If we have pending requests, extract metrics for the closest match
            approximateKeys.forEach(key => {
              const pendingData = performanceMetricsState.pendingRequests.get(key);
              if (pendingData && Math.abs(entry.startTime - pendingData.startTime) < 200) {
                const metrics = extractPerformanceMetrics(entry.name, pendingData.startTime, pendingData.manualDuration);
                if (metrics) {
                  pendingData.performanceMetrics = metrics;
                }
                // Don't remove yet - let the cleanup handle it
              }
            });
          }
        }
      } catch (error) {
        originalConsoleWarn.call(console, 'MAIN-WORLD: PerformanceObserver error:', error);
      }
    });

    performanceMetricsState.observer.observe({ entryTypes: ['resource'] });
    performanceMetricsState.isObserving = true;

    // Set up cleanup interval to prevent memory leaks
    performanceMetricsState.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const pendingRequests = performanceMetricsState.pendingRequests;

      // Remove entries older than 30 seconds
      for (const [key, data] of pendingRequests.entries()) {
        if (now - data.timestamp > 30000) {
          pendingRequests.delete(key);
        }
      }

      // If we have too many pending requests, clean up oldest ones
      if (pendingRequests.size > performanceMetricsState.maxPendingRequests) {
        const sortedEntries = Array.from(pendingRequests.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = sortedEntries.slice(0, pendingRequests.size - performanceMetricsState.maxPendingRequests);
        toRemove.forEach(([key]) => pendingRequests.delete(key));

        originalConsoleWarn.call(console, 'MAIN-WORLD: Cleaned up', toRemove.length, 'old performance requests');
      }

      // Clean up performance buffer periodically
      if (performance.getEntriesByType('resource').length > 500) {
        try {
          performance.clearResourceTimings();
        } catch (error) {
          originalConsoleWarn.call(console, 'MAIN-WORLD: Performance buffer cleanup failed:', error);
        }
      }
    }, 10000); // Cleanup every 10 seconds

    originalConsoleLog.call(console, 'MAIN-WORLD: Performance monitoring initialized');
  } catch (error) {
    originalConsoleWarn.call(console, 'MAIN-WORLD: Performance monitoring initialization failed:', error);
  }
};

const addRequestToPendingMetrics = (url, startTime, manualDuration) => {
  if (!performanceMetricsState.isObserving) return;

  const key = `${url}:${Math.floor(startTime)}`;
  performanceMetricsState.pendingRequests.set(key, {
    url,
    startTime,
    manualDuration: manualDuration || 0,
    timestamp: Date.now()
  });
};

const getAndRemovePendingMetrics = (url, startTime) => {
  if (!performanceMetricsState.isObserving) return null;

  const key = `${url}:${Math.floor(startTime)}`;
  const pendingData = performanceMetricsState.pendingRequests.get(key);

  if (pendingData && pendingData.performanceMetrics) {
    performanceMetricsState.pendingRequests.delete(key);
    return pendingData.performanceMetrics;
  }

  // Fallback: try to extract metrics directly
  const metrics = extractPerformanceMetrics(url, startTime);
  performanceMetricsState.pendingRequests.delete(key); // Clean up even if no metrics
  return metrics;
};

// Create our main world interception
const interceptFetch = (originalFetch, input, init) => {
  const startTime = Date.now();
  const performanceStartTime = performance.now() + performance.timeOrigin;
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // CRITICAL: Resolve relative URLs to absolute URLs for proper database storage
  try {
    if (url && (url.startsWith('/') || url.startsWith('./') || url.startsWith('../'))) {
      url = new URL(url, window.location.origin).href;
    }
  } catch (error) {
    originalConsoleLog.call(console, 'MAIN-WORLD: URL resolution failed:', url, error);
  }

  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = performance.now() + performance.timeOrigin;
    const manualDuration = endTime - performanceStartTime;

    // Add request to pending performance metrics tracking with manual duration
    addRequestToPendingMetrics(url, performanceStartTime, manualDuration);

    // Log intercept (reduced for performance)
    if (Math.random() < 0.1) { // Only log 10% of requests
      originalConsoleLog.call(console, 'MAIN-WORLD: Intercepted fetch request:', url);
    }

    const endTimeMs = Date.now();
    // Log response (reduced for performance)
    if (Math.random() < 0.1) { // Only log 10% of responses
      originalConsoleLog.call(console, 'MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
    }

    // Try to capture response body
    let responseBody = '';
    let requestBody = '';
    let originalRequestSize = 0;
    let originalResponseSize = 0;

    try {
      // Capture request body
      if (init && init.body) {
        const originalRequestBody = String(init.body);
        originalRequestSize = new Blob([originalRequestBody]).size; // Calculate size BEFORE truncation
        requestBody = truncateBody(originalRequestBody, extensionSettings.maxBodySize);
      }

      // Clone response to capture body
      const responseClone = response.clone();
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json') || contentType.includes('text/')) {
        try {
          const originalResponseBody = await responseClone.text();
          originalResponseSize = new Blob([originalResponseBody]).size; // Calculate size BEFORE truncation
          responseBody = truncateBody(originalResponseBody, extensionSettings.maxBodySize);
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

    // Extract performance metrics with a small delay to allow metrics to be available
    let performanceMetrics = null;
    setTimeout(() => {
      performanceMetrics = getAndRemovePendingMetrics(url, performanceStartTime);

      // Use the accurate sizes calculated before truncation
      const requestSize = originalRequestSize;
      const responseSize = originalResponseSize;

      // Send captured data including performance metrics and size calculations
      const capturedData = {
        type: 'fetch',
        method: (init?.method || 'GET').toUpperCase(),
        url: url,
        domain: getSafeDomain(url),
        status: response.status,
        statusText: response.statusText,
        duration: endTimeMs - startTime,
        requestHeaders,
        responseHeaders,
        requestBody,
        responseBody,
        requestSize,  // NEW: Actual byte size of request body
        responseSize, // NEW: Actual byte size of response body
        performanceMetrics, // Include performance timing metrics
        timestamp: new Date().toISOString()
      };

      // DEBUG: Log every 10th request to track what's being sent
      if (Math.random() < 0.1) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Sending fetch data to content script:', {
          url: capturedData.url,
          domain: capturedData.domain,
          status: capturedData.status,
          method: capturedData.method,
          requestSize: capturedData.requestSize,
          responseSize: capturedData.responseSize,
          hasPerformanceMetrics: !!capturedData.performanceMetrics
        });
      }

      // Send to content script
      window.postMessage({
        source: 'main-world-network-interceptor',
        data: capturedData
      }, '*');
    }, 50); // Small delay to allow Performance API entries to be available

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
    const performanceEndTime = performance.now() + performance.timeOrigin;
    const manualDuration = xhr._performanceStartTime ? performanceEndTime - xhr._performanceStartTime : 0;

    // Update pending metrics with manual duration
    if (xhr._url && xhr._performanceStartTime && manualDuration > 0) {
      addRequestToPendingMetrics(xhr._url, xhr._performanceStartTime, manualDuration);
    }

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

    // Capture response body and calculate accurate size
    let responseBody = '';
    let originalResponseSize = 0;
    try {
      if (xhr.responseText) {
        originalResponseSize = new Blob([xhr.responseText]).size; // Calculate size BEFORE truncation
        responseBody = truncateBody(xhr.responseText, extensionSettings.maxBodySize);
      }
    } catch (e) {
      originalConsoleLog.call(console, 'MAIN-WORLD: MAIN-WORLD: Could not get XHR response body:', e);
    }

    // Extract performance metrics with a small delay
    setTimeout(() => {
      const performanceMetrics = getAndRemovePendingMetrics(xhr._url, xhr._performanceStartTime);

      // Calculate accurate sizes (request size from original data, response size calculated above)
      const requestSize = data ? new Blob([String(data)]).size : 0;
      const responseSize = originalResponseSize;

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
        requestSize,  // NEW: Actual byte size of request body
        responseSize, // NEW: Actual byte size of response body
        performanceMetrics, // Include performance timing metrics
        timestamp: new Date().toISOString()
      };

      // Debug logging for XHR requests - disabled to reduce console spam
      // Enable this for detailed XHR debugging if needed:
      // isConsoleLoggingEnabled().then(isEnabled => {
      //   if (isEnabled) {
      //     console.log(`MAIN-WORLD XHR: Sending data for ${xhr._url}:`, {
      //       url: capturedData.url,
      //       domain: capturedData.domain,
      //       method: capturedData.method,
      //       status: capturedData.status,
      //       requestSize: capturedData.requestSize,
      //       responseSize: capturedData.responseSize,
      //       hasRequestBody: !!capturedData.requestBody,
      //       hasResponseBody: !!capturedData.responseBody,
      //       hasPerformanceMetrics: !!capturedData.performanceMetrics,
      //       requestHeaders: Object.keys(capturedData.requestHeaders).length,
      //       responseHeaders: Object.keys(capturedData.responseHeaders).length
      //     });
      //   }
      // }).catch(() => {
      //   // Silent fallback - don't spam console if extension context unavailable
      // });

      // Send to content script
      window.postMessage({
        source: 'main-world-network-interceptor',
        data: capturedData
      }, '*');
    }, 50); // Small delay for performance metrics
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

      // Track console statistics
      switch (severity) {
        case 'error': errorStats.consoleErrors++; break;
        case 'warn': errorStats.consoleWarns++; break;
        case 'info': errorStats.consoleInfos++; break;
        case 'log': errorStats.consoleLogs++; break;
      }

      // Send to content script using the same method as error handlers
      window.postMessage({
        source: 'main-world-console-interceptor',
        data: consoleData
      }, '*');

      // Also dispatch custom event for backward compatibility
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

    // Initialize performance monitoring
    initializePerformanceMonitoring();

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
      this._performanceStartTime = performance.now() + performance.timeOrigin;
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

  // Error event handlers (for cleanup)
  let uncaughtErrorHandler = null;
  let unhandledRejectionHandler = null;

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

    // Create uncaught error handler
    uncaughtErrorHandler = (event) => {
      try {
        originalConsoleLog.call(console, 'MAIN-WORLD: Uncaught error detected:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });

        // Detect cross-origin "Script error." and provide more context
        const isCrossOriginError = event.message === 'Script error.' && !event.filename;
        let errorMessage, stack, filename;

        if (isCrossOriginError) {
          // Cross-origin error - provide helpful context
          errorMessage = 'Cross-Origin Script Error (likely from ads, analytics, or external resources)';
          stack = 'Stack trace unavailable due to CORS policy';
          filename = `External script on ${window.location.hostname}`;
        } else {
          // Regular error with full details
          errorMessage = `${event.error?.name || 'Error'}: ${event.message}`;
          stack = event.error?.stack || `at ${event.filename}:${event.lineno}:${event.colno}`;
          filename = event.filename || window.location.href;
        }

        // Create console error data matching our format
        const consoleData = {
          message: errorMessage,
          severity: 'error',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          domain: getSafeDomain(window.location.href),
          source: isCrossOriginError ? 'cross-origin-error' : 'uncaught-error',
          stack: stack,
          lineNumber: event.lineno || null,
          columnNumber: event.colno || null,
          filename: filename
        };

        // Update error statistics
        if (isCrossOriginError) {
          errorStats.crossOriginErrors++;
        } else {
          errorStats.regularErrors++;
        }

        originalConsoleLog.call(console, 'MAIN-WORLD: Sending uncaught error to content script:', consoleData);
        originalConsoleLog.call(console, `MAIN-WORLD: Error stats - Cross-origin: ${errorStats.crossOriginErrors}, Regular: ${errorStats.regularErrors}, Rejections: ${errorStats.unhandledRejections}`);

        // Send to content script
        window.postMessage({
          source: 'main-world-console-interceptor',
          data: consoleData
        }, '*');
      } catch (err) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Error in uncaughtErrorHandler:', err);
      }
    };

    // Create unhandled rejection handler
    unhandledRejectionHandler = (event) => {
      try {
        originalConsoleLog.call(console, 'MAIN-WORLD: Unhandled rejection detected:', {
          reason: event.reason,
          promise: event.promise
        });

        // Handle unhandled promise rejections
        const errorMessage = `Unhandled Promise Rejection: ${event.reason}`;
        const stack = event.reason?.stack || 'No stack trace available';

        // Create console error data matching our format
        const consoleData = {
          message: errorMessage,
          severity: 'error',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          domain: getSafeDomain(window.location.href),
          source: 'unhandled-rejection',
          stack: stack,
          lineNumber: null,
          columnNumber: null,
          filename: window.location.href
        };

        // Update error statistics
        errorStats.unhandledRejections++;

        originalConsoleLog.call(console, 'MAIN-WORLD: Sending unhandled rejection to content script:', consoleData);
        originalConsoleLog.call(console, `MAIN-WORLD: Error stats - Cross-origin: ${errorStats.crossOriginErrors}, Regular: ${errorStats.regularErrors}, Rejections: ${errorStats.unhandledRejections}`);

        // Send to content script
        window.postMessage({
          source: 'main-world-console-interceptor',
          data: consoleData
        }, '*');
      } catch (err) {
        originalConsoleLog.call(console, 'MAIN-WORLD: Error in unhandledRejectionHandler:', err);
      }
    };

    // Add event listeners
    window.addEventListener('error', uncaughtErrorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    originalConsoleLog.call(console, 'MAIN-WORLD: Error event listeners added - uncaught errors will now be captured');

    // NOTE: Automatic test code removed to prevent spam in production
    // Test functions are still available manually: generateTestError(), generateTestRejection()
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

    // Remove error event listeners
    if (uncaughtErrorHandler) {
      window.removeEventListener('error', uncaughtErrorHandler);
      uncaughtErrorHandler = null;
    }
    if (unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      unhandledRejectionHandler = null;
    }
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

    // Wait longer for content script to be ready and properly initialized
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check initial states - with multiple retries for tab reactivation scenarios
    originalConsoleLog.call(console, ' MAIN_WORLD: Checking initial logging states...');

    let networkEnabled = false;
    let consoleEnabled = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        networkEnabled = await isLoggingEnabled();
        consoleEnabled = await isConsoleLoggingEnabled();

        originalConsoleLog.call(console, ` MAIN_WORLD: Initial states (attempt ${retryCount + 1}) - Network:`, networkEnabled, 'Console:', consoleEnabled);

        // If we got valid responses, break out of retry loop
        if (networkEnabled !== null && consoleEnabled !== null) {
          break;
        }
      } catch (error) {
        originalConsoleLog.call(console, ` MAIN_WORLD: Error getting initial states (attempt ${retryCount + 1}):`, error);
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Only start interception if explicitly enabled (conservative approach)
    if (networkEnabled === true) {
      originalConsoleLog.call(console, ' MAIN_WORLD: Network logging confirmed enabled, starting interception...');
      startInterception();
    } else {
      originalConsoleLog.call(console, ' MAIN_WORLD: Network logging disabled/unknown, not starting interception');
    }

    if (consoleEnabled === true) {
      originalConsoleLog.call(console, ' MAIN_WORLD: Console logging confirmed enabled, starting console interception...');
      startConsoleInterception();
    } else {
      originalConsoleLog.call(console, ' MAIN_WORLD: Console logging disabled/unknown, not starting console interception');
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

// Performance monitoring cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (performanceMetricsState.observer) {
    try {
      performanceMetricsState.observer.disconnect();
      performanceMetricsState.isObserving = false;
      originalConsoleLog.call(console, 'MAIN-WORLD: Performance observer disconnected');
    } catch (error) {
      originalConsoleWarn.call(console, 'MAIN-WORLD: Error disconnecting performance observer:', error);
    }
  }

  if (performanceMetricsState.cleanupInterval) {
    try {
      clearInterval(performanceMetricsState.cleanupInterval);
      performanceMetricsState.cleanupInterval = null;
      originalConsoleLog.call(console, 'MAIN-WORLD: Performance cleanup interval cleared');
    } catch (error) {
      originalConsoleWarn.call(console, 'MAIN-WORLD: Error clearing performance cleanup interval:', error);
    }
  }

  // Final cleanup of pending requests
  performanceMetricsState.pendingRequests.clear();
});

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

// Global debugging functions for developers
window.getErrorStats = () => {
  const runtime = Date.now() - errorStats.startTime;
  const runtimeMinutes = Math.round(runtime / 60000 * 10) / 10;

  const totalErrors = errorStats.crossOriginErrors + errorStats.regularErrors + errorStats.unhandledRejections;
  const totalConsole = errorStats.consoleErrors + errorStats.consoleWarns + errorStats.consoleInfos + errorStats.consoleLogs;

  originalConsoleLog.call(console, `📊 Error & Console Statistics (${runtimeMinutes} min runtime):`);
  originalConsoleLog.call(console, `  🚨 JavaScript Errors:`);
  originalConsoleLog.call(console, `    • Cross-origin errors: ${errorStats.crossOriginErrors}`);
  originalConsoleLog.call(console, `    • Regular JavaScript errors: ${errorStats.regularErrors}`);
  originalConsoleLog.call(console, `    • Unhandled promise rejections: ${errorStats.unhandledRejections}`);
  originalConsoleLog.call(console, `    • Total errors captured: ${totalErrors}`);

  originalConsoleLog.call(console, `  📝 Console Messages:`);
  originalConsoleLog.call(console, `    • console.error(): ${errorStats.consoleErrors}`);
  originalConsoleLog.call(console, `    • console.warn(): ${errorStats.consoleWarns}`);
  originalConsoleLog.call(console, `    • console.info(): ${errorStats.consoleInfos}`);
  originalConsoleLog.call(console, `    • console.log(): ${errorStats.consoleLogs}`);
  originalConsoleLog.call(console, `    • Total console messages: ${totalConsole}`);

  if (errorStats.crossOriginErrors > 0) {
    originalConsoleLog.call(console, `  ℹ️  Cross-origin errors are "Script error." messages from external resources (ads, analytics, etc.)`);
  }

  if (totalConsole === 0) {
    originalConsoleLog.call(console, `  ⚠️  No console messages captured - browser warnings bypass console method interception`);
  }

  return errorStats;
};

window.generateTestError = () => {
  originalConsoleLog.call(console, 'MAIN-WORLD: Generating test error...');
  setTimeout(() => {
    throw new Error('Test error generated by user - this should appear in the extension dashboard');
  }, 100);
};

window.generateTestRejection = () => {
  originalConsoleLog.call(console, 'MAIN-WORLD: Generating test promise rejection...');
  setTimeout(() => {
    Promise.reject(new Error('Test promise rejection - this should appear in the extension dashboard'));
  }, 100);
};

window.generateTestConsoleMessages = () => {
  originalConsoleLog.call(console, 'MAIN-WORLD: Generating test console messages...');

  // These should be captured by our console interception
  setTimeout(() => {
    console.error('Test console.error() message - should appear in dashboard');
  }, 100);

  setTimeout(() => {
    console.warn('Test console.warn() message - should appear in dashboard');
  }, 200);

  setTimeout(() => {
    console.info('Test console.info() message - should appear in dashboard');
  }, 300);

  setTimeout(() => {
    console.log('Test console.log() message - should appear in dashboard');
  }, 400);
};

originalConsoleLog.call(console, 'MAIN-WORLD: Network interception script loaded and ready');
originalConsoleLog.call(console, 'MAIN-WORLD: Use getErrorStats() to see error capture statistics');
originalConsoleLog.call(console, 'MAIN-WORLD: Use generateTestError() or generateTestRejection() to test error capture');
originalConsoleLog.call(console, 'MAIN-WORLD: Use generateTestConsoleMessages() to test console message capture');

// FIX: Request current logging state from content script after initialization
// This ensures the main world script gets the correct state even if it loads after state changes
setTimeout(() => {
  originalConsoleLog.call(console, 'MAIN-WORLD: Requesting current logging state...');
  window.dispatchEvent(new CustomEvent('contentScriptRequest', {
    detail: {
      action: 'getCurrentLoggingState',
      timestamp: Date.now()
    }
  }));
}, 100);

} // End of main initialization block
