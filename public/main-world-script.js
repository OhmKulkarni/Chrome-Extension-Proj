// Main world script for network interception
console.log('🌍 MAIN-WORLD: External script loaded into main world');

// Prevent double injection
if (!window.__extensionNetworkInterceptionActive) {
  window.__extensionNetworkInterceptionActive = true;
  window.__extensionNetworkActive = true; // For debug script compatibility
  
  // Store the original fetch before any page scripts can override it
  const originalFetch = window.fetch;
  console.log('🌍 MAIN-WORLD: Original fetch captured:', typeof originalFetch);

  // Create our main world interception
  window.fetch = function(input, init) {
    const startTime = Date.now();
    let url;
    try {
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.href;
      } else if (input && typeof input === 'object' && input.url) {
        url = input.url;
      } else {
        url = String(input || '');
      }
    } catch (e) {
      console.log('🌍 MAIN-WORLD: Error extracting URL from input:', e);
      url = '';
    }
    
    console.log('🌍 MAIN-WORLD: Intercepted fetch request:', url);
    
    // Call the original fetch
    return originalFetch.call(this, input, init).then(async response => {
      const endTime = Date.now();
      console.log('🌍 MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
      
      // Create request data
      let domain;
      try {
        // Handle both absolute and relative URLs
        if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
          domain = new URL(url).hostname;
        } else {
          // For relative URLs, use the current page's hostname
          domain = window.location.hostname;
        }
      } catch (e) {
        console.log('🌍 MAIN-WORLD: Fetch URL parsing error for URL:', url, 'Error:', e);
        domain = window.location.hostname;
      }
      
      const requestData = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: url,
        method: init?.method || 'GET',
        timestamp: new Date().toISOString(),
        domain: domain,
        status: response.status,
        statusText: response.statusText,
        duration: endTime - startTime,
        type: 'main-world-fetch',
        headers: {
          request: init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {},
          response: Object.fromEntries(response.headers.entries())
        },
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
    this._interceptData = { method, url, startTime: Date.now(), requestHeaders: {} };
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  // Intercept setRequestHeader to capture request headers
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (this._interceptData) {
      this._interceptData.requestHeaders = this._interceptData.requestHeaders || {};
      this._interceptData.requestHeaders[name.toLowerCase()] = value;
    }
    return originalSetRequestHeader.apply(this, [name, value]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._interceptData) {
      this.addEventListener('loadend', () => {
        try {
          const endTime = Date.now();
          
          // Extract response headers
          const responseHeaders = {};
          const headerString = this.getAllResponseHeaders();
          if (headerString) {
            headerString.split('\r\n').forEach(line => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0].toLowerCase()] = parts[1];
              }
            });
          }
          
          // Safe URL parsing
          let domain;
          try {
            if (this._interceptData.url && typeof this._interceptData.url === 'string' && 
                (this._interceptData.url.startsWith('http://') || this._interceptData.url.startsWith('https://'))) {
              domain = new URL(this._interceptData.url).hostname;
            } else {
              // Handle relative URLs or invalid URLs
              domain = window.location.hostname;
            }
          } catch (urlError) {
            console.log('🌍 MAIN-WORLD: URL parsing error for URL:', this._interceptData.url, 'Error:', urlError);
            domain = window.location.hostname;
          }
          
          // Safe response body extraction
          let responseBody = null;
          try {
            if (this.responseType === '' || this.responseType === 'text') {
              responseBody = this.responseText ? this.responseText.substring(0, 1000) : null;
            }
          } catch (responseError) {
            console.log('🌍 MAIN-WORLD: Response text access error:', responseError);
            responseBody = null;
          }
          
          const requestData = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: this._interceptData.url,
            method: this._interceptData.method,
            timestamp: new Date().toISOString(),
            domain: domain,
            status: this.status,
            statusText: this.statusText,
            duration: endTime - this._interceptData.startTime,
            type: 'main-world-xhr',
            headers: {
              request: this._interceptData.requestHeaders || {},
              response: responseHeaders
            },
            requestBody: body ? body.toString().substring(0, 1000) : null,
            responseBody: responseBody
          };
          
          // Send to content script using custom event
          window.dispatchEvent(new CustomEvent('networkRequestIntercepted', {
            detail: requestData
          }));
        } catch (error) {
          console.log('🌍 MAIN-WORLD: Error processing XHR response:', error);
        }
      });
    }
    
    return originalXHRSend.apply(this, [body]);
  };

  console.log('🌍 MAIN-WORLD: Network interception active in main world');
  
  // Console error/warning interception
  if (!window.__consoleInterceptionActive) {
    window.__consoleInterceptionActive = true;
    
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

    console.log('🌍 MAIN-WORLD: Console error/warning interception active');
  } else {
    console.log('🌍 MAIN-WORLD: Console error interception already active, skipping');
  }
} else {
  console.log('🌍 MAIN-WORLD: Network interception already active, skipping');
}
