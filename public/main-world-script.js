// Main world injection script - runs in the same context as the page
(function() {
console.log('🌍 MAIN-WORLD: Script injected into main world');

// Prevent duplicate injections - check if we're already active
if (window.__networkInterceptorActive) {
  console.log('⚠️ MAIN-WORLD: Network interceptor already active, skipping duplicate injection');
  
  // Still respond to activity checks
  window.addEventListener('checkMainWorldActive', (event) => {
    if (event.detail?.checkId) {
      window.dispatchEvent(new CustomEvent('mainWorldActiveResponse', {
        detail: { checkId: event.detail.checkId, isActive: true }
      }));
    }
  });
  
  // Exit early to prevent duplicate setup
  return;
}

// Mark as active to prevent future duplicates
window.__networkInterceptorActive = true;
console.log('✅ MAIN-WORLD: Marked network interceptor as active');

// Respond to activity checks from content script
window.addEventListener('checkMainWorldActive', (event) => {
  if (event.detail?.checkId) {
    window.dispatchEvent(new CustomEvent('mainWorldActiveResponse', {
      detail: { checkId: event.detail.checkId, isActive: window.__networkInterceptorActive === true }
    }));
  }
});

// Default settings (only declare if not already declared)
if (typeof window.extensionSettings === 'undefined') {
  window.extensionSettings = {
    maxBodySize: 2000 // Default truncation limit
  };
}
let extensionSettings = window.extensionSettings;

// Try to get settings from extension storage
try {
  // Request settings from the content script via custom event
  window.dispatchEvent(new CustomEvent('extensionRequestSettings'));
  
  // Listen for settings response
  window.addEventListener('extensionSettingsResponse', (event) => {
    if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
      extensionSettings.maxBodySize = event.detail.networkInterception.bodyCapture.maxBodySize || 2000;
      console.log('🌍 MAIN-WORLD: Settings updated, maxBodySize:', extensionSettings.maxBodySize);
    }
  });
} catch (error) {
  console.log('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
}

// Helper function to safely extract domain from URL
function getSafeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.log('🌍 MAIN-WORLD: Invalid URL, using fallback domain:', url);
    return window.location.hostname || 'unknown';
  }
}

// Helper function to truncate body based on settings
function truncateBody(text, maxSize = extensionSettings.maxBodySize) {
  if (!text) return null;
  if (maxSize === 0) return text; // No limit
  return text.substring(0, maxSize);
}

// Store the original fetch before any page scripts can override it
const originalFetch = window.fetch;
console.log('🌍 MAIN-WORLD: Original fetch captured:', typeof originalFetch);

// Create our main world interception
window.fetch = function(input, init) {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  console.log('🌍 MAIN-WORLD: Intercepted fetch request:', url);
  
  // Call the original fetch
  return originalFetch.call(this, input, init).then(async response => {
    const endTime = Date.now();
    console.log('🌍 MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
    
    // Try to capture response body
    let responseBody = null;
    try {
      const responseClone = response.clone();
      const text = await responseClone.text();
      responseBody = truncateBody(text); // Use dynamic truncation
    } catch (error) {
      console.log('🌍 MAIN-WORLD: Could not capture response body:', error);
    }
    
    // Capture request headers
    let requestHeaders = {};
    if (init?.headers) {
      if (typeof init.headers.forEach === 'function') {
        // Headers object
        init.headers.forEach((value, name) => {
          requestHeaders[name] = value;
        });
      } else if (typeof init.headers === 'object') {
        // Plain object
        requestHeaders = { ...init.headers };
      }
    }
    
    // Capture response headers
    let responseHeaders = {};
    try {
      response.headers.forEach((value, name) => {
        responseHeaders[name] = value;
      });
    } catch (error) {
      console.log('🌍 MAIN-WORLD: Could not capture response headers:', error);
    }
    
    // Create request data
    const requestData = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: url,
      method: (init?.method || 'GET').toUpperCase(),
      timestamp: new Date().toISOString(),
      domain: getSafeDomain(url),
      status: response.status,
      statusText: response.statusText,
      duration: endTime - startTime,
      type: 'main-world-fetch',
      headers: {
        request: requestHeaders,
        response: responseHeaders
      },
      requestBody: init?.body ? truncateBody(init.body.toString()) : null,
      responseBody: responseBody
    };
    
    // Send to content script using custom event
    window.dispatchEvent(new CustomEvent('networkRequestIntercepted', {
      detail: requestData
    }));
    
    return response;
  }).catch(error => {
    console.log('🌍 MAIN-WORLD: Fetch error:', error);
    throw error;
  });
};

// Also intercept XMLHttpRequest in main world
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

XMLHttpRequest.prototype.open = function(method, url, ...args) {
  console.log('🌍 MAIN-WORLD: XHR opened:', method, url);
  this._interceptData = { 
    method, 
    url, 
    startTime: Date.now(),
    requestHeaders: {}
  };
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
  if (this._interceptData) {
    this._interceptData.requestHeaders[name] = value;
  }
  return originalXHRSetRequestHeader.apply(this, [name, value]);
};

XMLHttpRequest.prototype.send = function(body) {
  if (this._interceptData) {
    this.addEventListener('loadend', () => {
      const endTime = Date.now();
      
      // Capture response headers
      let responseHeaders = {};
      try {
        const responseHeadersStr = this.getAllResponseHeaders();
        if (responseHeadersStr) {
          responseHeadersStr.split('\r\n').forEach(line => {
            if (line.includes(':')) {
              const [name, ...value] = line.split(':');
              responseHeaders[name.trim()] = value.join(':').trim();
            }
          });
        }
      } catch (error) {
        console.log('🌍 MAIN-WORLD: Could not capture XHR response headers:', error);
      }
      
      const requestData = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: this._interceptData.url,
        method: (this._interceptData.method || 'GET').toUpperCase(),
        timestamp: new Date().toISOString(),
        domain: getSafeDomain(this._interceptData.url),
        status: this.status,
        statusText: this.statusText,
        duration: endTime - this._interceptData.startTime,
        type: 'main-world-xhr',
        headers: {
          request: this._interceptData.requestHeaders || {},
          response: responseHeaders
        },
        requestBody: body ? truncateBody(body.toString()) : null,
        responseBody: this.responseText ? truncateBody(this.responseText) : null
      };
      
      // Send to content script using custom event
      window.dispatchEvent(new CustomEvent('networkRequestIntercepted', {
        detail: requestData
      }));
    });
  }
  
  return originalXHRSend.apply(this, [body]);
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  console.log('🌍 MAIN-WORLD: Page unloading, cleaning up network interceptor');
  window.__networkInterceptorActive = false;
});

console.log('🌍 MAIN-WORLD: Network interception active in main world');

// =============================================================================
// CONSOLE ERROR INTERCEPTION
// =============================================================================

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Override console.error
console.error = function(...args) {
  // Call original method first
  originalConsoleError.apply(console, args);
  
  // Capture and send to extension
  try {
    // Extract stack trace from Error objects
    let stackTrace = null;
    let errorObject = null;
    
    // Look for Error objects in the arguments
    for (const arg of args) {
      if (arg instanceof Error) {
        errorObject = {
          name: arg.name,
          message: arg.message,
          stack: arg.stack
        };
        stackTrace = arg.stack;
        break;
      }
    }
    
    // If no Error object found, try to generate a stack trace
    if (!stackTrace) {
      try {
        throw new Error();
      } catch (e) {
        stackTrace = e.stack;
      }
    }
    
    const errorData = {
      type: 'console.error',
      timestamp: Date.now(),
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      stack: stackTrace,
      error: errorObject,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
      detail: errorData
    }));
  } catch (e) {
    originalConsoleError('🌍 MAIN-WORLD: Failed to capture console.error:', e);
  }
};

// Override console.warn  
console.warn = function(...args) {
  // Call original method first
  originalConsoleWarn.apply(console, args);
  
  // Capture and send to extension
  try {
    // Extract stack trace from Error objects
    let stackTrace = null;
    let errorObject = null;
    
    // Look for Error objects in the arguments
    for (const arg of args) {
      if (arg instanceof Error) {
        errorObject = {
          name: arg.name,
          message: arg.message,
          stack: arg.stack
        };
        stackTrace = arg.stack;
        break;
      }
    }
    
    // If no Error object found, try to generate a stack trace
    if (!stackTrace) {
      try {
        throw new Error();
      } catch (e) {
        stackTrace = e.stack;
      }
    }
    
    const warnData = {
      type: 'console.warn',
      timestamp: Date.now(),
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      stack: stackTrace,
      error: errorObject,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
      detail: warnData
    }));
  } catch (e) {
    originalConsoleError('🌍 MAIN-WORLD: Failed to capture console.warn:', e);
  }
};

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  try {
    const errorData = {
      type: 'error',
      timestamp: Date.now(),
      message: event.message || 'Unknown error',
      stack: event.error ? event.error.stack : null,
      filename: event.filename || window.location.href,
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      error: event.error ? {
        name: event.error.name,
        message: event.error.message,
        stack: event.error.stack
      } : null,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
      detail: errorData
    }));
  } catch (e) {
    originalConsoleError('🌍 MAIN-WORLD: Failed to capture global error:', e);
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  try {
    // Extract stack trace and error details from rejection reason
    let stackTrace = null;
    let errorObject = null;
    let message = 'Unhandled Promise Rejection';
    
    if (event.reason) {
      if (event.reason instanceof Error) {
        // If the reason is an Error object, extract its details
        errorObject = {
          name: event.reason.name,
          message: event.reason.message,
          stack: event.reason.stack
        };
        stackTrace = event.reason.stack;
        message = `${event.reason.name}: ${event.reason.message}`;
      } else {
        // If reason is not an Error, convert to string and try to generate stack
        message = String(event.reason);
        try {
          throw new Error();
        } catch (e) {
          stackTrace = e.stack;
        }
      }
    } else {
      // No reason provided, generate a stack trace
      try {
        throw new Error();
      } catch (e) {
        stackTrace = e.stack;
      }
    }
    
    const rejectionData = {
      type: 'unhandledrejection',
      timestamp: Date.now(),
      message: message,
      stack: stackTrace,
      error: errorObject,
      reason: event.reason,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
      detail: rejectionData
    }));
  } catch (e) {
    originalConsoleError('🌍 MAIN-WORLD: Failed to capture promise rejection:', e);
  }
});

console.log('🌍 MAIN-WORLD: Console error interception active');

})(); // End of IIFE
