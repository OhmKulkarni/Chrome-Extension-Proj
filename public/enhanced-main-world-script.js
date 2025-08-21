/**
 * Enhanced Main World Network & Token Interception Script
 * Combines features from main branch with current modular architecture
 * Provides accurate body capture, size calculation, timing, and token hash extraction
 */

console.log('🌍 ENHANCED MAIN-WORLD: Script injected for network & token interception');

// Extension settings with enhanced defaults
let extensionSettings = {
  maxBodySize: 2000,
  bodyCapture: {
    enabled: true,
    mode: 'full', // 'partial' | 'full'
    autoRedact: false,
    filterNoise: true
  },
  tokenHashing: {
    enabled: true,
    algorithm: 'SHA-256'
  }
};

// Store original functions
let originalFetch = window.fetch;
let originalXhrOpen = XMLHttpRequest.prototype.open;
let originalXhrSend = XMLHttpRequest.prototype.send;
let originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

let isIntercepting = false;

// Enhanced body truncation with safety limits
function truncateBody(text, maxSize = extensionSettings.maxBodySize) {
  if (!text || typeof text !== 'string') return '';

  const SAFETY_MAX_SIZE = 50000; // 50KB safety limit
  let effectiveMaxSize;

  if (maxSize === 0) {
    effectiveMaxSize = SAFETY_MAX_SIZE;
  } else {
    effectiveMaxSize = Math.min(maxSize, SAFETY_MAX_SIZE);
  }

  if (text.length > effectiveMaxSize) {
    console.log(`🌍 ENHANCED: Truncating body from ${text.length} to ${effectiveMaxSize} chars`);
    return text.substring(0, effectiveMaxSize) + '... [TRUNCATED]';
  }

  return text;
}

// Calculate accurate byte size including headers
function calculateAccurateSize(data, headers = {}) {
  let size = 0;

  // Calculate headers size
  Object.entries(headers).forEach(([key, value]) => {
    size += key.length + value.length + 4; // +4 for ': \r\n'
  });

  // Calculate body size
  if (data) {
    if (typeof data === 'string') {
      size += new Blob([data]).size;
    } else if (data instanceof Blob) {
      size += data.size;
    } else if (data instanceof ArrayBuffer) {
      size += data.byteLength;
    } else if (data instanceof FormData) {
      // Approximate FormData size
      let formDataSize = 0;
      try {
        data.forEach((value) => {
          if (typeof value === 'string') {
            formDataSize += new Blob([value]).size;
          } else if (value instanceof File) {
            formDataSize += value.size;
          }
        });
      } catch (e) {
        formDataSize = 0;
      }
      size += formDataSize;
    } else {
      size += new Blob([String(data)]).size;
    }
  }

  return size;
}

// Enhanced token hash extraction
async function extractTokenHashes(requestBody, responseBody, headers) {
  const tokens = [];

  try {
    // Extract from Authorization header
    if (headers.authorization || headers.Authorization) {
      const authHeader = headers.authorization || headers.Authorization;
      if (authHeader.startsWith('Bearer ')) {
        const tokenValue = authHeader.substring(7);
        const hash = await generateTokenHash(tokenValue);
        tokens.push({
          type: 'bearer',
          location: 'header',
          hash,
          format: isJwtFormat(tokenValue) ? 'jwt' : 'opaque',
          length: tokenValue.length
        });
      }
    }

    // Extract from request body JSON
    if (requestBody && isJsonContent(requestBody)) {
      try {
        const bodyData = JSON.parse(requestBody);
        extractTokensFromObject(bodyData, 'request').forEach(token => {
          tokens.push(token);
        });
      } catch (e) {
        // Silent fail for malformed JSON
      }
    }

    // Extract from response body JSON
    if (responseBody && isJsonContent(responseBody)) {
      try {
        const bodyData = JSON.parse(responseBody);
        extractTokensFromObject(bodyData, 'response').forEach(token => {
          tokens.push(token);
        });
      } catch (e) {
        // Silent fail for malformed JSON
      }
    }
  } catch (error) {
    console.warn('🌍 ENHANCED: Token hash extraction error:', error);
  }

  return tokens;
}

// Generate SHA-256 hash for token values
async function generateTokenHash(tokenValue) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenValue);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
  } catch (error) {
    console.warn('🌍 ENHANCED: Hash generation failed:', error);
    return 'hash-error';
  }
}

// Check if token is JWT format
function isJwtFormat(tokenValue) {
  if (!tokenValue || typeof tokenValue !== 'string') return false;
  const parts = tokenValue.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

// Check if content is JSON
function isJsonContent(content) {
  if (!content || typeof content !== 'string') return false;
  return content.trim().startsWith('{') || content.trim().startsWith('[');
}

// Extract tokens from object recursively
function extractTokensFromObject(obj, location) {
  const tokens = [];
  const tokenKeys = ['token', 'access_token', 'accessToken', 'refresh_token', 'refreshToken', 'id_token', 'idToken', 'jwt', 'bearer'];

  function traverse(current, path = '') {
    if (typeof current === 'object' && current !== null) {
      Object.keys(current).forEach(key => {
        const value = current[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (tokenKeys.some(tokenKey => key.toLowerCase().includes(tokenKey.toLowerCase()))) {
          if (typeof value === 'string' && value.length > 10) {
            generateTokenHash(value).then(hash => {
              tokens.push({
                type: key,
                location,
                hash,
                format: isJwtFormat(value) ? 'jwt' : 'opaque',
                length: value.length,
                path: currentPath
              });
            });
          }
        }

        if (typeof value === 'object') {
          traverse(value, currentPath);
        }
      });
    }
  }

  traverse(obj);
  return tokens;
}

// Enhanced fetch interception with timing and body capture
const interceptFetch = (originalFetch, input, init) => {
  const startTime = performance.now();
  const realStartTime = Date.now();
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  console.log('🌍 ENHANCED: Intercepted fetch request:', url);

  return originalFetch.call(this, input, init).then(async response => {
    const endTime = performance.now();

    try {
      // Capture request data
      let requestBody = '';
      let requestHeaders = {};

      if (init?.body && extensionSettings.bodyCapture.enabled) {
        if (typeof init.body === 'string') {
          requestBody = truncateBody(init.body);
        } else if (init.body instanceof FormData) {
          requestBody = '[FormData - see Network tab for details]';
        } else if (init.body instanceof Blob) {
          requestBody = `[Blob: ${init.body.type || 'unknown'} - ${init.body.size} bytes]`;
        } else {
          requestBody = truncateBody(String(init.body));
        }
      }

      // Capture request headers
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          for (const [key, value] of init.headers.entries()) {
            requestHeaders[key] = value;
          }
        } else if (typeof init.headers === 'object') {
          requestHeaders = { ...init.headers };
        }
      }

      // Clone response to capture body without consuming it
      const responseClone = response.clone();
      let responseBody = '';
      let responseHeaders = {};

      // Capture response headers
      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key] = value;
      }

      // Capture response body
      if (extensionSettings.bodyCapture.enabled) {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('text/')) {
          try {
            responseBody = await responseClone.text();
            responseBody = truncateBody(responseBody);
          } catch (e) {
            console.warn('🌍 ENHANCED: Could not read response body:', e);
            responseBody = '[Response body read error]';
          }
        } else {
          responseBody = `[${contentType || 'Binary'} content - ${response.headers.get('content-length') || 'unknown'} bytes]`;
        }
      }

      // Calculate accurate sizes
      const requestSize = calculateAccurateSize(init?.body, requestHeaders);
      const responseSize = response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length'))
        : calculateAccurateSize(responseBody, responseHeaders);

      // Extract token hashes
      const tokenHashes = await extractTokenHashes(requestBody, responseBody, {...requestHeaders, ...responseHeaders});

      // Create enhanced capture data
      const capturedData = {
        type: 'fetch',
        method: (init?.method || 'GET').toUpperCase(),
        url: url,
        domain: new URL(url).hostname,
        status: response.status,
        statusText: response.statusText,
        duration: Math.round((endTime - startTime) * 100) / 100, // ms with 2 decimal precision
        timestamp: new Date(realStartTime).toISOString(),
        requestHeaders,
        responseHeaders,
        requestBody,
        responseBody,
        requestSize,
        responseSize,
        tokenHashes: tokenHashes.length > 0 ? tokenHashes : undefined
      };

      console.log('🌍 ENHANCED: Sending enhanced fetch data:', capturedData);

      // Send to content script
      window.postMessage({
        source: 'enhanced-main-world-network-interceptor',
        data: capturedData
      }, '*');

    } catch (error) {
      console.error('🌍 ENHANCED: Error capturing fetch data:', error);
    }

    return response;
  }).catch(error => {
    console.error('🌍 ENHANCED: Fetch error:', error);
    throw error;
  });
};

// Enhanced XHR interception
const interceptXHR = (xhr, originalXhrSend, data) => {
  xhr.addEventListener('loadend', async () => {
    const endTime = performance.now();

    try {
      // Capture response headers
      let responseHeaders = {};
      const headerString = xhr.getAllResponseHeaders();
      if (headerString) {
        headerString.split('\r\n').forEach(line => {
          if (line.includes(':')) {
            const [name, ...value] = line.split(':');
            responseHeaders[name.trim()] = value.join(':').trim();
          }
        });
      }

      // Capture response body
      let responseBody = '';
      if (extensionSettings.bodyCapture.enabled && xhr.responseText) {
        responseBody = truncateBody(xhr.responseText);
      }

      // Process request body
      let requestBody = '';
      if (data && extensionSettings.bodyCapture.enabled) {
        if (typeof data === 'string') {
          requestBody = truncateBody(data);
        } else if (data instanceof FormData) {
          requestBody = '[FormData - see Network tab for details]';
        } else {
          requestBody = truncateBody(String(data));
        }
      }

      // Calculate accurate sizes
      const requestSize = calculateAccurateSize(data, xhr._requestHeaders || {});
      const responseSize = calculateAccurateSize(xhr.responseText, responseHeaders);

      // Extract token hashes
      const tokenHashes = await extractTokenHashes(requestBody, responseBody, {
        ...(xhr._requestHeaders || {}),
        ...responseHeaders
      });

      // Create enhanced capture data
      const capturedData = {
        type: 'xhr',
        method: xhr._method || 'GET',
        url: xhr._url,
        domain: new URL(xhr._url).hostname,
        status: xhr.status,
        statusText: xhr.statusText,
        duration: Math.round((endTime - xhr._startTime) * 100) / 100,
        timestamp: new Date(xhr._realStartTime || Date.now()).toISOString(),
        requestHeaders: xhr._requestHeaders || {},
        responseHeaders,
        requestBody,
        responseBody,
        requestSize,
        responseSize,
        tokenHashes: tokenHashes.length > 0 ? tokenHashes : undefined
      };

      console.log('🌍 ENHANCED: Sending enhanced XHR data:', capturedData);

      // Send to content script
      window.postMessage({
        source: 'enhanced-main-world-network-interceptor',
        data: capturedData
      }, '*');

    } catch (error) {
      console.error('🌍 ENHANCED: Error capturing XHR data:', error);
    }
  });

  return originalXhrSend.call(xhr, data);
};

// Communication with content script for settings updates
window.addEventListener('extensionSettingsUpdate', (event) => {
  if (event.detail) {
    console.log('🌍 ENHANCED: Settings updated:', event.detail);

    if (event.detail.networkInterception?.bodyCapture) {
      Object.assign(extensionSettings.bodyCapture, event.detail.networkInterception.bodyCapture);
    }

    if (event.detail.networkInterception?.maxBodySize !== undefined) {
      extensionSettings.maxBodySize = event.detail.networkInterception.maxBodySize;
    }

    if (event.detail.tokenHashing) {
      Object.assign(extensionSettings.tokenHashing, event.detail.tokenHashing);
    }
  }
});

// Start interception
function startEnhancedInterception() {
  if (isIntercepting) return;

  console.log('🚀 ENHANCED: Starting enhanced network interception...');
  isIntercepting = true;

  // Fetch interception
  window.fetch = function(input, init) {
    return interceptFetch(originalFetch, input, init);
  };

  // XHR interception
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._method = method;
    this._url = url;
    this._startTime = performance.now();
    this._realStartTime = Date.now();
    this._requestHeaders = {};
    return originalXhrOpen.call(this, method, url, async ?? true, user, password);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (this._requestHeaders) {
      this._requestHeaders[name] = value;
    }
    return originalXhrSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function(data) {
    return interceptXHR(this, originalXhrSend, data);
  };
}

// Auto-start enhanced interception
try {
  startEnhancedInterception();
  console.log('✅ ENHANCED MAIN-WORLD: Enhanced network & token interception ready');
} catch (error) {
  console.error('❌ ENHANCED MAIN-WORLD: Initialization failed:', error);
}

// Respond to activity checks
window.addEventListener('checkEnhancedMainWorldActive', (event) => {
  console.log('🌍 ENHANCED: Activity check received');
  window.dispatchEvent(new CustomEvent('enhancedMainWorldActiveResponse', {
    detail: {
      checkId: event.detail?.checkId,
      isActive: true,
      features: {
        bodyCapture: extensionSettings.bodyCapture.enabled,
        tokenHashing: extensionSettings.tokenHashing.enabled,
        accurateSize: true,
        precisionTiming: true
      }
    }
  }));
});

console.log('🌍 ENHANCED MAIN-WORLD: Enhanced interception script loaded and ready');
