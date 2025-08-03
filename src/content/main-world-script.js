// Main world injection script - runs in the same context as the page
console.log('🌍 MAIN-WORLD: Script injected into main world');

// Default settings
let extensionSettings = {
  maxBodySize: 2000 // Default truncation limit
};

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
      method: init?.method || 'GET',
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
        method: this._interceptData.method,
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

console.log('🌍 MAIN-WORLD: Network interception active in main world');
