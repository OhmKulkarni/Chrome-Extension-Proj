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

// MEMORY LEAK FIX: Convert Promise constructor to async/await pattern
const getCurrentTabId = async () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCurrentTabId' })
      return response?.tabId || null
    } catch (error) {
      console.warn('🌍 MAIN_WORLD: Error getting tab ID:', error)
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
  
  // Listen for settings response
  window.addEventListener('extensionSettingsResponse', (event) => {
    if (event.detail && event.detail.networkInterception && event.detail.networkInterception.bodyCapture) {
      extensionSettings.maxBodySize = event.detail.networkInterception.bodyCapture.maxBodySize || 2000;
      console.log('🌍 MAIN_WORLD: Updated settings - maxBodySize:', extensionSettings.maxBodySize);
    }
  });
  
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
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === 'local' || namespace === 'sync') {
        const enabled = await isLoggingEnabled();
        if (enabled && !isIntercepting) {
          startInterception();
        } else if (!enabled && isIntercepting) {
          stopInterception();
        }
      }
    });
  }
  
} catch (error) {
  console.log('🌍 MAIN-WORLD: Could not get settings, using defaults:', error);
}

console.log('🌍 MAIN-WORLD: Network interception script loaded and ready');
