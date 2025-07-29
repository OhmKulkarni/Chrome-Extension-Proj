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
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    console.log('🌍 MAIN-WORLD: Intercepted fetch request:', url);
    
    // Call the original fetch
    return originalFetch.call(this, input, init).then(async response => {
      const endTime = Date.now();
      console.log('🌍 MAIN-WORLD: Fetch response received for:', url, 'Status:', response.status);
      
      // Create request data
      let domain;
      try {
        // Handle both absolute and relative URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
          domain = new URL(url).hostname;
        } else {
          // For relative URLs, use the current page's hostname
          domain = window.location.hostname;
        }
      } catch (e) {
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
            if (this._interceptData.url.startsWith('http')) {
              domain = new URL(this._interceptData.url).hostname;
            } else {
              // Handle relative URLs
              domain = window.location.hostname;
            }
          } catch (urlError) {
            console.log('🌍 MAIN-WORLD: URL parsing error:', urlError);
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
} else {
  console.log('🌍 MAIN-WORLD: Network interception already active, skipping');
}
