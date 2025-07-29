// Main world injection script - runs in the same context as the page
console.log('🌍 MAIN-WORLD: Script injected into main world');

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
    
    // Create request data
    const requestData = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: url,
      method: init?.method || 'GET',
      timestamp: new Date().toISOString(),
      domain: new URL(url).hostname,
      status: response.status,
      statusText: response.statusText,
      duration: endTime - startTime,
      type: 'main-world-fetch',
      headers: {},
      requestBody: null,
      responseBody: null
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

XMLHttpRequest.prototype.open = function(method, url, ...args) {
  console.log('🌍 MAIN-WORLD: XHR opened:', method, url);
  this._interceptData = { method, url, startTime: Date.now() };
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function(body) {
  if (this._interceptData) {
    this.addEventListener('loadend', () => {
      const endTime = Date.now();
      const requestData = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: this._interceptData.url,
        method: this._interceptData.method,
        timestamp: new Date().toISOString(),
        domain: new URL(this._interceptData.url).hostname,
        status: this.status,
        statusText: this.statusText,
        duration: endTime - this._interceptData.startTime,
        type: 'main-world-xhr',
        headers: {},
        requestBody: body ? body.toString().substring(0, 1000) : null,
        responseBody: this.responseText ? this.responseText.substring(0, 1000) : null
      };
      
      // Send to content script using custom event
      window.dispatchEvent(new CustomEvent('networkRequestIntercepted', {
        detail: requestData
      }));
    });
  }
  
  return originalXHRSend.apply(this, [body]);
};

// Console error/warning interception
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function(...args) {
  console.log('🌍 MAIN-WORLD: Console error intercepted:', args);
  
  // Create error data
  const errorData = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
    stack: new Error().stack || 'No stack trace available',
    timestamp: new Date().toISOString(),
    severity: 'error',
    url: window.location.href,
    userAgent: navigator.userAgent,
    type: 'console-error'
  };
  
  // Send to content script using custom event
  window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
    detail: errorData
  }));
  
  // Call original console.error
  return originalConsoleError.apply(this, args);
};

console.warn = function(...args) {
  console.log('🌍 MAIN-WORLD: Console warning intercepted:', args);
  
  // Create warning data
  const warningData = {
    id: `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
    stack: new Error().stack || 'No stack trace available',
    timestamp: new Date().toISOString(),
    severity: 'warn',
    url: window.location.href,
    userAgent: navigator.userAgent,
    type: 'console-warn'
  };
  
  // Send to content script using custom event
  window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
    detail: warningData
  }));
  
  // Call original console.warn
  return originalConsoleWarn.apply(this, args);
};

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.log('🌍 MAIN-WORLD: Uncaught error intercepted:', event);
  
  const errorData = {
    id: `uncaught_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: event.message || 'Uncaught error',
    stack: event.error ? event.error.stack : `at ${event.filename}:${event.lineno}:${event.colno}`,
    timestamp: new Date().toISOString(),
    severity: 'error',
    url: window.location.href,
    userAgent: navigator.userAgent,
    type: 'uncaught-error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  };
  
  // Send to content script using custom event
  window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
    detail: errorData
  }));
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.log('🌍 MAIN-WORLD: Unhandled promise rejection intercepted:', event);
  
  const errorData = {
    id: `rejection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: event.reason ? String(event.reason) : 'Unhandled promise rejection',
    stack: event.reason && event.reason.stack ? event.reason.stack : 'No stack trace available',
    timestamp: new Date().toISOString(),
    severity: 'error',
    url: window.location.href,
    userAgent: navigator.userAgent,
    type: 'unhandled-rejection'
  };
  
  // Send to content script using custom event
  window.dispatchEvent(new CustomEvent('consoleErrorIntercepted', {
    detail: errorData
  }));
});

console.log('🌍 MAIN-WORLD: Network interception active in main world');
console.log('🌍 MAIN-WORLD: Console error/warning interception active in main world');
