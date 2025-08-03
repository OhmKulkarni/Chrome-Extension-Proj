// src/dashboard/dashboard.tsx
// This file contains the React component for the Chrome extension dashboard.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface DashboardData {
  totalTabs: number;
  extensionEnabled: boolean;
  lastActivity: string;
  networkRequests: any[];
  totalRequests: number;
  consoleErrors: any[];
  totalErrors: number;
  tokenEvents: any[];
  totalTokenEvents: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface TabLoggingStatus {
  tabId: number;
  url: string;
  title: string;
  domain: string;
  networkLogging: boolean;
  errorLogging: boolean;
  tokenLogging: boolean;
  favicon?: string;
}

// Detail Content Components
const RequestDetailContent: React.FC<{ request: any; selectedField: string }> = ({ request, selectedField }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj;
    }
  };

  // Debug info
  console.log('RequestDetailContent - Request data:', request);
  console.log('RequestDetailContent - Selected field:', selectedField);
  console.log('RequestDetailContent - Available keys:', Object.keys(request));

  if (selectedField === 'details') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Request Details</h3>
            <button
              onClick={() => copyToClipboard(JSON.stringify(request, null, 2))}
              className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Method:</span>
              <p className="text-sm text-gray-900 mt-1">{request.method || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">URL:</span>
              <p className="text-sm text-gray-900 mt-1 break-all">{request.url || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-800' :
                request.status >= 300 && request.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                request.status >= 400 ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {request.status || 'N/A'}
              </span>
            </div>
            {request.payload_size && (
              <div>
                <span className="text-sm font-medium text-gray-700">Payload Size:</span>
                <p className="text-sm text-gray-900 mt-1">{Math.round(request.payload_size / 1024)}KB</p>
              </div>
            )}
            {request.response_time && (
              <div>
                <span className="text-sm font-medium text-gray-700">Response Time:</span>
                <p className="text-sm text-gray-900 mt-1">{request.response_time}ms</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700">Timestamp:</span>
              <p className="text-sm text-gray-900 mt-1">{new Date(request.timestamp).toLocaleString()}</p>
            </div>
            {request.tab_id && (
              <div>
                <span className="text-sm font-medium text-gray-700">Tab ID:</span>
                <p className="text-sm text-gray-900 mt-1">{request.tab_id}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedField === 'headers') {
    let requestHeaders = {};
    let responseHeaders = {};
    
    try {
      // Try the new unified format first
      if (request.headers) {
        const headerData = typeof request.headers === 'string' ? JSON.parse(request.headers) : request.headers;
        requestHeaders = headerData.request || {};
        responseHeaders = headerData.response || {};
      }
      // Fallback to old format
      else {
        if (request.request_headers) {
          requestHeaders = typeof request.request_headers === 'string' ? JSON.parse(request.request_headers) : request.request_headers;
        }
        if (request.response_headers) {
          responseHeaders = typeof request.response_headers === 'string' ? JSON.parse(request.response_headers) : request.response_headers;
        }
      }
    } catch (e) {
      console.error('Error parsing headers:', e);
      requestHeaders = {};
      responseHeaders = {};
    }

    // Component for expandable header values
    const ExpandableHeaderValue: React.FC<{ value: string }> = ({ value }) => {
      const [expanded, setExpanded] = useState(false);
      const stringValue = String(value);
      const shouldTruncate = stringValue.length > 50;
      
      return (
        <div className="space-y-1">
          <div className="text-sm text-gray-600">
            {shouldTruncate && !expanded ? (
              <>
                {stringValue.substring(0, 50)}...
                <button
                  onClick={() => setExpanded(true)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Expand
                </button>
              </>
            ) : (
              <>
                <div className="break-all">{stringValue}</div>
                {shouldTruncate && expanded && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Collapse
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    };
    
    return (
      <div className="space-y-6">
        {/* Request Headers */}
        {Object.keys(requestHeaders).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Request Headers ({Object.keys(requestHeaders).length})</h3>
              <button
                onClick={() => copyToClipboard(formatJSON(requestHeaders))}
                className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full detail-table">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Header</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(requestHeaders).map(([key, value]) => (
                    <tr key={key} className="table-row-hover">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{key}</td>
                      <td className="px-4 py-2">
                        <ExpandableHeaderValue value={String(value)} />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => copyToClipboard(`${key}: ${value}`)}
                          className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => copyToClipboard(String(value))}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Copy Value
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Response Headers */}
        {Object.keys(responseHeaders).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Response Headers ({Object.keys(responseHeaders).length})</h3>
              <button
                onClick={() => copyToClipboard(formatJSON(responseHeaders))}
                className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full detail-table">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Header</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(responseHeaders).map(([key, value]) => (
                    <tr key={key} className="table-row-hover">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{key}</td>
                      <td className="px-4 py-2">
                        <ExpandableHeaderValue value={String(value)} />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => copyToClipboard(`${key}: ${value}`)}
                          className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => copyToClipboard(String(value))}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Copy Value
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show message if no headers */}
        {Object.keys(requestHeaders).length === 0 && Object.keys(responseHeaders).length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No header data available for this request</div>
          </div>
        )}
      </div>
    );
  }

  if (selectedField === 'body') {
    const requestBody = request.request_body || request.requestBody;
    const responseBody = request.response_body || request.responseBody || request.response_data;

    // Pretty-print JSON string bodies
    const prettyPrintIfJson = (str: any) => {
      if (typeof str !== 'string') return str;
      try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj, null, 2);
      } catch {
        return str;
      }
    };

    return (
      <div className="space-y-6">
        {/* Request Body */}
        {requestBody && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Request Body</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(typeof requestBody === 'string' ? prettyPrintIfJson(requestBody) : formatJSON(requestBody))}
                  className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Copy
                </button>
                {requestBody && (typeof requestBody === 'string' ? requestBody.length : JSON.stringify(requestBody).length) > 1000 && (
                  <button
                    onClick={() => {
                      const content = typeof requestBody === 'string' ? prettyPrintIfJson(requestBody) : formatJSON(requestBody);
                      const newWindow = window.open('', '_blank');
                      if (newWindow) {
                        newWindow.document.write(`<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; padding: 20px;">${content}</pre>`);
                      }
                    }}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    View Full
                  </button>
                )}
              </div>
            </div>
            <div className="code-block bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96">
              <pre className="whitespace-pre-wrap break-words">{typeof requestBody === 'string' ? prettyPrintIfJson(requestBody) : formatJSON(requestBody)}</pre>
            </div>
          </div>
        )}

        {/* Response Body */}
        {responseBody && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Response Body</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(typeof responseBody === 'string' ? responseBody : formatJSON(responseBody))}
                  className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Copy
                </button>
                {responseBody && (typeof responseBody === 'string' ? responseBody.length : JSON.stringify(responseBody).length) > 1000 && (
                  <button
                    onClick={() => {
                      const content = typeof responseBody === 'string' ? responseBody : formatJSON(responseBody);
                      const newWindow = window.open('', '_blank');
                      if (newWindow) {
                        newWindow.document.write(`<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; padding: 20px;">${content}</pre>`);
                      }
                    }}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  >
                    View Full
                  </button>
                )}
              </div>
            </div>
            <div className="code-block bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96">
              <pre className="whitespace-pre-wrap break-words">{typeof responseBody === 'string' ? responseBody : formatJSON(responseBody)}</pre>
            </div>
          </div>
        )}
        
        {/* Show message if no body data */}
        {!requestBody && !responseBody && (
          <div className="text-center py-8">
            <div className="text-gray-500">No request or response body data available</div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: show all request data
  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">Debug: Full Request Data</h3>
        <p className="text-xs text-yellow-700 mb-3">Selected field "{selectedField}" - showing all available data:</p>
        <div className="code-block bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm font-mono">
          <pre>{formatJSON(request)}</pre>
        </div>
        <button
          onClick={() => copyToClipboard(formatJSON(request))}
          className="copy-button mt-3 text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
        >
          Copy All Data
        </button>
      </div>
    </div>
  );
};

const ErrorDetailContent: React.FC<{ error: any; selectedField: string }> = ({ error, selectedField }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (selectedField === 'details') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Error Details</h3>
            <button
              onClick={() => copyToClipboard(JSON.stringify(error, null, 2))}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Message:</span>
              <p className="text-sm text-gray-900 mt-1">{error.message}</p>
            </div>
            {error.url && (
              <div>
                <span className="text-sm font-medium text-gray-700">URL:</span>
                <p className="text-sm text-gray-900 mt-1 break-all">{error.url}</p>
              </div>
            )}
            {error.line && (
              <div>
                <span className="text-sm font-medium text-gray-700">Line:</span>
                <p className="text-sm text-gray-900 mt-1">{error.line}</p>
              </div>
            )}
            {error.column && (
              <div>
                <span className="text-sm font-medium text-gray-700">Column:</span>
                <p className="text-sm text-gray-900 mt-1">{error.column}</p>
              </div>
            )}
            {error.severity && (
              <div>
                <span className="text-sm font-medium text-gray-700">Severity:</span>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                  error.severity === 'error' ? 'bg-red-100 text-red-800' :
                  error.severity === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {error.severity}
                </span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700">Timestamp:</span>
              <p className="text-sm text-gray-900 mt-1">{new Date(error.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedField === 'stack') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Stack Trace</h3>
          <button
            onClick={() => copyToClipboard(error.stack_trace || error.stack || 'No stack trace available')}
            className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy
          </button>
        </div>
        
        {(error.stack_trace || error.stack) ? (
          <div className="text-sm text-gray-500">
            <details className="cursor-pointer" open>
              <summary className="text-blue-600 hover:text-blue-800 font-medium mb-2">
                View Full Stack Trace
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 p-4 rounded border overflow-y-auto max-h-96 font-mono">
                {error.stack_trace || error.stack}
              </pre>
            </details>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">No stack trace available</div>
          </div>
        )}
      </div>
    );
  }

  return <div className="text-gray-500">No data available for selected field.</div>;
};

// Enhanced token event analysis utilities
const analyzeTokenEvent = (event: any) => {
  const url = (event.url || event.source_url || '').toLowerCase();
  const headers = (() => {
    try {
      if (event.headers) {
        const parsed = JSON.parse(event.headers);
        return parsed.request || parsed.response || parsed;
      }
      return {};
    } catch {
      return {};
    }
  })();
  
  // Enhanced event type detection based on comprehensive analysis
  const getEventType = (): string => {
    const method = (event.method || event.request_method || '').toUpperCase();
    const status = event.status || event.response_status;
    const responseBody = event.response_body || event.responseBody || '';
    const requestBody = event.request_body || event.requestBody || '';
    
    // Check for Login events
    if (method === 'POST' && (url.includes('/auth/login') || url.includes('/login') || url.includes('/signin'))) {
      // Successful login (200) or token acquisition
      if (status >= 200 && status < 300) {
        return 'Login';
      }
    }
    
    // Check for Logout events
    if ((method === 'POST' || method === 'DELETE') && (url.includes('/auth/logout') || url.includes('/logout') || url.includes('/signout'))) {
      return 'Logout';
    }
    
    // Check for Token Refresh events
    if (method === 'POST' && (url.includes('/auth/refresh') || url.includes('/refresh') || url.includes('/token'))) {
      // Check if request body contains refresh_token grant type
      if (requestBody.includes('grant_type') && requestBody.includes('refresh_token')) {
        return 'Token Refresh';
      }
      // Or if it's a refresh endpoint
      if (url.includes('refresh')) {
        return 'Token Refresh';
      }
    }
    
    // Check for Expiry Check events
    if (status === 401) {
      // If there's a token present but request failed with 401
      if (hasToken(headers)) {
        return 'Expiry Check';
      }
    }
    
    // Check for silent token validation endpoints
    if (method === 'GET' && (url.includes('/auth/validate') || url.includes('/auth/verify') || url.includes('/token/verify'))) {
      return 'Expiry Check';
    }
    
    // Check for token acquisition (successful auth responses with tokens)
    if (event.type === 'acquire' || (status >= 200 && status < 300 && (
      url.includes('/auth') || url.includes('/login') || url.includes('/token')
    ))) {
      // If response likely contains a token
      if (responseBody.includes('token') || responseBody.includes('access_token') || responseBody.includes('jwt')) {
        return 'Login';
      }
      return 'Login';
    }
    
    // Check for Access events (using token to access protected routes)
    if (hasToken(headers) && status >= 200 && status < 300) {
      // If it's not an auth endpoint, it's likely accessing a protected resource
      if (!url.includes('/auth') && !url.includes('/login') && !url.includes('/logout')) {
        return 'Access';
      }
    }
    
    // Legacy fallbacks for backward compatibility
    if (event.type === 'refresh_error') return 'Token Refresh';
    if (url.includes('/auth/login') || url.includes('/login')) return 'Login';
    if (url.includes('/auth/logout') || url.includes('/logout')) return 'Logout';
    if (url.includes('/auth/refresh') || url.includes('/refresh')) return 'Token Refresh';
    
    // Default to Access if token is present, otherwise generic
    return hasToken(headers) ? 'Access' : 'Token Event';
  };

  // Enhanced token type detection based on comprehensive analysis
  const getTokenType = (): string => {
    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    const cookieHeader = headers['cookie'] || headers['Cookie'] || '';
    const csrfHeader = headers['x-csrf-token'] || headers['X-CSRF-Token'] || '';
    const apiKeyHeader = headers['x-api-key'] || headers['X-API-Key'] || headers['api-key'] || '';
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    
    // Helper function to check if token is JWT format
    const isJwt = (token: string): boolean => token.split('.').length === 3;
    
    // Helper function to decode JWT header for additional analysis
    const getJwtInfo = (token: string): any => {
      try {
        if (!isJwt(token)) return null;
        const header = JSON.parse(atob(token.split('.')[0]));
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { header, payload };
      } catch {
        return null;
      }
    };
    
    // 0. Token Acquisition Analysis (for events where tokens are being acquired/issued)
    if (event.type === 'acquire' || url.includes('/auth') || url.includes('/login') || url.includes('/signin') || url.includes('/token')) {
      // Check for refresh token acquisition
      if (url.includes('/refresh') || url.includes('/renew')) {
        return 'Refresh Token (Acquired)';
      }
      
      // Check for OAuth/OIDC endpoints
      if (url.includes('/oauth') || url.includes('/oidc') || url.includes('/openid')) {
        return 'OAuth Token (Acquired)';
      }
      
      // Check for API key endpoints
      if (url.includes('/api-key') || url.includes('/apikey') || url.includes('/key')) {
        return 'API Key (Acquired)';
      }
      
      // General authentication endpoint - likely access token
      if (url.includes('/auth') || url.includes('/login') || url.includes('/signin')) {
        // If response is JSON, likely JWT or structured token
        if (contentType.includes('application/json')) {
          return 'Access Token (Acquired)';
        }
        return 'Auth Token (Acquired)';
      }
      
      // Generic token endpoint
      if (url.includes('/token')) {
        return 'Access Token (Acquired)';
      }
    }
    
    // 1. Bearer Token Analysis (for existing tokens in requests)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (isJwt(token)) {
        const jwtInfo = getJwtInfo(token);
        
        // ID Token detection (OIDC)
        if (jwtInfo?.payload && ('sub' in jwtInfo.payload && 'email' in jwtInfo.payload || 'aud' in jwtInfo.payload)) {
          return 'ID Token (JWT)';
        }
        
        // Refresh Token (JWT format but used for refresh)
        if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
          return 'Refresh Token (JWT)';
        }
        
        // Access Token (JWT)
        return 'Access Token (JWT)';
      } else {
        // Opaque Bearer tokens
        if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
          return 'Refresh Token (Opaque)';
        }
        return 'Access Token (Opaque)';
      }
    }
    
    // 2. Basic Authentication
    if (authHeader.startsWith('Basic ')) {
      return 'Basic Auth';
    }
    
    // 3. API Key Authentication
    if (authHeader.startsWith('ApiKey ') || authHeader.startsWith('API-Key ')) {
      return 'API Key';
    }
    
    // 4. Custom API Key Headers
    if (apiKeyHeader) {
      const key = apiKeyHeader;
      if (key.startsWith('sk_') || key.includes('proj_') || key.includes('key_')) {
        return 'API Key';
      }
      return 'API Key';
    }
    
    // 5. CSRF Token Detection
    if (csrfHeader) {
      return 'CSRF Token';
    }
    
    // 6. Session Token Detection (Cookies)
    if (cookieHeader) {
      if (cookieHeader.includes('sessionid=') || 
          cookieHeader.includes('session=') || 
          cookieHeader.includes('JSESSIONID=') ||
          cookieHeader.includes('PHPSESSID=') ||
          cookieHeader.includes('ASP.NET_SessionId=')) {
        return 'Session Token';
      }
      
      // Access token in cookie
      if (cookieHeader.includes('access_token=')) {
        return 'Access Token (Cookie)';
      }
    }
    
    // 7. State Token Detection (usually in OAuth flows)
    if (url.includes('state=') || headers['x-state-token']) {
      return 'State Token';
    }
    
    // 8. Custom Authorization schemes
    if (authHeader && !authHeader.startsWith('Bearer ') && !authHeader.startsWith('Basic ')) {
      const scheme = authHeader.split(' ')[0];
      return `${scheme} Token`;
    }
    
    // 9. Fallback for acquisition events without clear patterns
    if (event.type === 'acquire') {
      return 'Token (Acquired)';
    }
    
    // Final fallback to event type or unknown
    return event.token_type || 'Unknown';
  };

  // Check if token is present in headers
  const hasToken = (headers: any): boolean => {
    const authHeader = headers['authorization'] || headers['Authorization'] || '';
    const cookieHeader = headers['cookie'] || headers['Cookie'] || '';
    return !!(authHeader || cookieHeader || headers['x-api-key'] || headers['X-API-Key']);
  };

  return {
    type: getEventType(),
    tokenType: getTokenType(),
    url: event.url || event.source_url,
    method: event.method || event.request_method || 'GET',
    status: event.status || event.response_status,
    valueHash: event.value_hash,
    expiry: event.expiry,
    timestamp: event.timestamp,
    headers
  };
};

const TokenDetailContent: React.FC<{ tokenEvent: any; selectedField: string }> = ({ tokenEvent, selectedField }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Helper function to format hash values in git-style
  const formatHashValue = (hash: string | null | undefined): string => {
    if (!hash) return 'N/A';
    
    // Handle special status cases - keep them as-is
    if (hash === 'expired' || hash === 'redacted' || hash === 'N/A') {
      return hash;
    }
    
    // For actual hash values (typically long hex strings), use git-style format
    // Only apply git-style formatting if it looks like a hash (long string, mostly hex characters)
    if (hash.length > 16 && /^[a-fA-F0-9]+$/.test(hash)) {
      return formatGitStyleHash(hash);
    }
    
    // For other values, return as-is
    return hash;
  };

  const formatGitStyleHash = (hash: string): string => {
    if (hash.length < 8) return hash; // If hash is too short, return as-is
    return hash.slice(0, 4) + "…" + hash.slice(-4);
  };

  if (selectedField === 'details') {
    const analysis = analyzeTokenEvent(tokenEvent);
    
    return (
      <div className="space-y-4">
        {/* Token Event Details Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Token Event Details</h3>
            <button
              onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2))}
              className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Copy Analysis
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {/* Event Classification */}
            <div className="border-b border-gray-200 pb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Event Classification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Detected Type:</span>
                  <p className="text-sm font-medium text-gray-900">{analysis.type}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Token Format:</span>
                  <p className="text-sm font-medium text-gray-900">{analysis.tokenType}</p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="border-b border-gray-200 pb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Request Details</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">URL Pattern:</span>
                  <p className="text-sm text-gray-900 break-all">{analysis.url}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">HTTP Method:</span>
                    <p className="text-sm font-medium text-gray-900">{analysis.method}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Response Status:</span>
                    <p className="text-sm font-medium text-gray-900">{analysis.status || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Information */}
            {analysis.valueHash && (
              <div className="border-b border-gray-200 pb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Token Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Value Hash:</span>
                    <p className="text-xs text-gray-900 font-mono break-all bg-gray-100 p-2 rounded">{formatHashValue(analysis.valueHash)}</p>
                  </div>
                  {analysis.expiry && (
                    <div>
                      <span className="text-xs text-gray-500">Expiry:</span>
                      <p className="text-sm text-gray-900">{new Date(analysis.expiry * 1000).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Authentication Context */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Authentication Context</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {analysis.headers.authorization && (
                  <p><strong>Authorization Header:</strong> Present ({analysis.headers.authorization.split(' ')[0]})</p>
                )}
                {analysis.headers.cookie && (
                  <p><strong>Cookies:</strong> Present</p>
                )}
                {(analysis.headers['x-api-key'] || analysis.headers['X-API-Key']) && (
                  <p><strong>API Key:</strong> Present</p>
                )}
                <p><strong>Timestamp:</strong> {new Date(analysis.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Headers section removed as requested

  return <div className="text-gray-500">No data available for selected field.</div>;
};

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    totalTabs: 0,
    extensionEnabled: true,
    lastActivity: 'Never',
    networkRequests: [],
    totalRequests: 0,
    consoleErrors: [],
    totalErrors: 0,
    tokenEvents: [],
    totalTokenEvents: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Console errors state
  const [currentErrorPage, setCurrentErrorPage] = useState(1);
  const [errorsPerPage] = useState(10);
  const [errorSortConfig, setErrorSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [errorSearchTerm, setErrorSearchTerm] = useState<string>('');

  // Token events state
  const [currentTokenPage, setCurrentTokenPage] = useState(1);
  const [tokenEventsPerPage] = useState(10);
  const [tokenSortConfig, setTokenSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [filterTokenType, setFilterTokenType] = useState<string>('all');
  const [tokenSearchTerm, setTokenSearchTerm] = useState<string>('');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabsLoggingStatus, setTabsLoggingStatus] = useState<TabLoggingStatus[]>([]);
  const [tabSearchTerm, setTabSearchTerm] = useState<string>('');

  // Detail viewer state
  const [detailViewerOpen, setDetailViewerOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<any>(null);
  const [expandedItemType, setExpandedItemType] = useState<'request' | 'error' | 'token'>('request');
  const [selectedField, setSelectedField] = useState<string>('details');
  const [detailViewerHeight, setDetailViewerHeight] = useState(300); // Default height in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);

  // Carousel state for table navigation
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const tableNames = ['Network Requests', 'Console Errors', 'Token Events'];
  const tableIcons = ['🌐', '❌', '🔑'];
  const tableDescriptions = [
    'Global requests from all tabs (Popup shows current tab only)',
    'JavaScript errors and warnings from monitored tabs',
    'Token detection and authentication events'
  ];

  // Carousel navigation functions
  const nextTable = () => {
    setCurrentTableIndex((prev) => (prev + 1) % tableNames.length);
  };

  const prevTable = () => {
    setCurrentTableIndex((prev) => (prev - 1 + tableNames.length) % tableNames.length);
  };

  const goToTable = (index: number) => {
    setCurrentTableIndex(index);
  };

  // Helper function to format hash values in git-style
  const formatHashValue = (hash: string | null | undefined): string => {
    if (!hash) return 'N/A';
    
    // Handle special status cases - keep them as-is
    if (hash === 'expired' || hash === 'redacted' || hash === 'N/A') {
      return hash;
    }
    
    // For actual hash values (typically long hex strings), use git-style format
    // Only apply git-style formatting if it looks like a hash (long string, mostly hex characters)
    if (hash.length > 16 && /^[a-fA-F0-9]+$/.test(hash)) {
      return formatGitStyleHash(hash);
    }
    
    // For other values, return as-is
    return hash;
  };

  const formatGitStyleHash = (hash: string): string => {
    if (hash.length < 8) return hash; // If hash is too short, return as-is
    return hash.slice(0, 4) + "…" + hash.slice(-4);
  };

  useEffect(() => {
    loadDashboardData();
    loadTabsLoggingStatus();
  }, []);

  // Listen for storage changes to update tab statuses in real-time
  useEffect(() => {
    const handleStorageChanges = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        // Check if any tab logging states changed
        const hasTabLoggingChanges = Object.keys(changes).some(key => 
          key.startsWith('tabLogging_') || 
          key.startsWith('tabErrorLogging_') || 
          key.startsWith('tabTokenLogging_')
        );
        
        if (hasTabLoggingChanges) {
          console.log('📡 DASHBOARD: Tab logging states changed, updating sidebar...');
          loadTabsLoggingStatus(); // Refresh the tab statuses
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanges);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChanges);
    };
  }, []);

  // Add real-time data refresh for network requests, errors, and tokens
  useEffect(() => {
    // Set up periodic refresh every 5 seconds when dashboard is active
    const refreshInterval = setInterval(() => {
      console.log('🔄 DASHBOARD: Periodic data refresh...');
      loadDashboardData();
    }, 5000);

    // Listen for background script notifications about new data
    const handleBackgroundMessages = (message: any, _sender: any, _sendResponse: any) => {
      if (message.type === 'DATA_UPDATED') {
        console.log('📡 DASHBOARD: Received data update notification:', message.dataType);
        loadDashboardData();
      }
    };

    chrome.runtime.onMessage.addListener(handleBackgroundMessages);

    return () => {
      clearInterval(refreshInterval);
      chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get tabs count and current active tab
      const tabs = await chrome.tabs.query({});
      
      // Get storage data
      const storageData = await chrome.storage.sync.get(['extensionEnabled', 'lastActivity']);
      
      // Get network requests from background storage - request more for pagination
      const networkData = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getNetworkRequests', limit: 1000 }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Dashboard: Error getting network requests:', chrome.runtime.lastError);
            resolve({ requests: [], total: 0 });
          } else {
            resolve(response || { requests: [], total: 0 });
          }
        });
      });

      // Get console errors from background storage - request more for pagination
      const errorData = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getConsoleErrors', limit: 1000 }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Dashboard: Error getting console errors:', chrome.runtime.lastError);
            resolve({ errors: [], total: 0 });
          } else {
            resolve(response || { errors: [], total: 0 });
          }
        });
      });

      // Get token events from background storage
      const tokenData = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getTokenEvents', limit: 1000 }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Dashboard: Error getting token events:', chrome.runtime.lastError);
            resolve({ events: [], total: 0 });
          } else {
            resolve(response || { events: [], total: 0 });
          }
        });
      });
      
      // Calculate pagination
      const totalRequests = networkData.total || 0;
      const totalErrors = errorData.total || 0;
      const totalTokenEvents = tokenData.total || 0;
      
      setData({
        totalTabs: tabs.length,
        extensionEnabled: storageData.extensionEnabled ?? true,
        lastActivity: storageData.lastActivity 
          ? new Date(storageData.lastActivity).toLocaleString()
          : 'Never',
        networkRequests: networkData.requests || [],
        totalRequests: totalRequests,
        consoleErrors: errorData.errors || [],
        totalErrors: totalErrors,
        tokenEvents: tokenData.events || [],
        totalTokenEvents: totalTokenEvents
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTabsLoggingStatus = async () => {
    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      const tabStatuses: TabLoggingStatus[] = [];

      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          // Get logging status for this tab
          const result = await chrome.storage.local.get([`tabLogging_${tab.id}`, `tabErrorLogging_${tab.id}`, `tabTokenLogging_${tab.id}`, 'settings']);
          const networkState = result[`tabLogging_${tab.id}`];
          const errorState = result[`tabErrorLogging_${tab.id}`];
          const tokenState = result[`tabTokenLogging_${tab.id}`];
          const settings = result.settings || {};
          
          // Get domain from URL
          let domain = '';
          try {
            domain = new URL(tab.url).hostname;
          } catch (e) {
            domain = tab.url;
          }

          // Determine logging status (same logic as popup)
          const networkConfig = settings.networkInterception || {};
          const errorConfig = settings.errorLogging || {};
          const tokenConfig = settings.tokenLogging || {};
          
          let networkLogging = false;
          let errorLogging = false;
          let tokenLogging = false;

          if (networkState) {
            // Check both 'status' and 'active' properties for compatibility
            if (networkState.status !== undefined) {
              networkLogging = networkState.status === 'active';
            } else {
              networkLogging = typeof networkState === 'boolean' ? networkState : networkState.active;
            }
          } else {
            networkLogging = networkConfig.tabSpecific?.defaultState === 'active';
          }

          if (errorState) {
            errorLogging = typeof errorState === 'boolean' ? errorState : errorState.active;
          } else {
            errorLogging = errorConfig.tabSpecific?.defaultState === 'active';
          }

          if (tokenState) {
            tokenLogging = typeof tokenState === 'boolean' ? tokenState : tokenState.active;
          } else {
            tokenLogging = tokenConfig.tabSpecific?.defaultState === 'active';
          }

          tabStatuses.push({
            tabId: tab.id,
            url: tab.url,
            title: tab.title || 'Untitled',
            domain,
            networkLogging,
            errorLogging,
            tokenLogging,
            favicon: tab.favIconUrl
          });
        }
      }

      setTabsLoggingStatus(tabStatuses);
    } catch (error) {
      console.error('Error loading tabs logging status:', error);
    }
  };

  const refreshData = () => {
    setLoading(true);
    loadDashboardData();
  };

  const clearData = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete all recorded network requests, console errors, token events, and reset all tab counters.\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (confirmed) {
      try {
        setLoading(true);
        
        // Send message to background script to clear all data
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'clearAllData' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Dashboard: Error clearing data:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else if (response?.success) {
              console.log('Dashboard: Data cleared successfully');
              resolve();
            } else {
              reject(new Error('Failed to clear data'));
            }
          });
        });
        
        // Reset local state
        setData({
          totalTabs: data.totalTabs,
          extensionEnabled: data.extensionEnabled,
          lastActivity: data.lastActivity,
          networkRequests: [],
          totalRequests: 0,
          consoleErrors: [],
          totalErrors: 0,
          tokenEvents: [],
          totalTokenEvents: 0
        });
        
        setCurrentPage(1);
        
        // Show success message
        alert('✅ All network request, console error, and token event data have been cleared successfully.');
        
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('❌ Failed to clear data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Pagination functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredPages) {
      setCurrentPage(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalFilteredPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Calculate current page data with sorting and filtering
  const getFilteredAndSortedRequests = () => {
    let filteredRequests = [...data.networkRequests];
    
    // Apply search filter
    if (searchTerm) {
      filteredRequests = filteredRequests.filter(request =>
        request.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.method && request.method.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply method filter
    if (filterMethod !== 'all') {
      filteredRequests = filteredRequests.filter(request => 
        request.method && request.method.toLowerCase() === filterMethod.toLowerCase()
      );
    }
    
    // Apply sorting
    filteredRequests.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'timestamp') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      if (sortConfig.key === 'status' || sortConfig.key === 'payload_size' || sortConfig.key === 'response_time') {
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String comparison
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredRequests;
  };

  const filteredAndSortedRequests = getFilteredAndSortedRequests();
  const totalFilteredRequests = filteredAndSortedRequests.length;
  const totalFilteredPages = Math.ceil(totalFilteredRequests / requestsPerPage);
  
  // Calculate current page data
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredAndSortedRequests.slice(indexOfFirstRequest, indexOfLastRequest);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMethod, totalFilteredPages]);

  // Generate page numbers for pagination (Google-style)
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 7;
    const totalPages = totalFilteredPages;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Google-style pagination logic
      if (currentPage <= 4) {
        // Show 1-5 ... totalPages
        for (let i = 1; i <= 5; i++) {
          pageNumbers.push(i);
        }
        if (totalPages > 5) {
          pageNumbers.push('...');
          pageNumbers.push(totalPages);
        }
      } else if (currentPage >= totalPages - 3) {
        // Show 1 ... (totalPages-4)-totalPages
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Show 1 ... (currentPage-1) currentPage (currentPage+1) ... totalPages
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Console Errors filtering and sorting
  const getFilteredAndSortedErrors = () => {
    let filteredErrors = [...data.consoleErrors];
    
    // Apply search filter
    if (errorSearchTerm) {
      filteredErrors = filteredErrors.filter(error =>
        error.message.toLowerCase().includes(errorSearchTerm.toLowerCase()) ||
        (error.url && error.url.toLowerCase().includes(errorSearchTerm.toLowerCase()))
      );
    }
    
    // Apply severity filter
    if (filterSeverity !== 'all') {
      filteredErrors = filteredErrors.filter(error => 
        error.severity && error.severity.toLowerCase() === filterSeverity.toLowerCase()
      );
    }
    
    // Apply sorting
    filteredErrors.sort((a, b) => {
      const aValue = a[errorSortConfig.key];
      const bValue = b[errorSortConfig.key];
      
      if (errorSortConfig.key === 'timestamp') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return errorSortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return errorSortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return errorSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredErrors;
  };

  const filteredAndSortedErrors = getFilteredAndSortedErrors();
  const totalFilteredErrors = filteredAndSortedErrors.length;
  const totalFilteredErrorPages = Math.ceil(totalFilteredErrors / errorsPerPage);
  
  // Calculate current page data for errors
  const indexOfLastError = currentErrorPage * errorsPerPage;
  const indexOfFirstError = indexOfLastError - errorsPerPage;
  const currentErrors = filteredAndSortedErrors.slice(indexOfFirstError, indexOfLastError);

  // Handle error sorting
  const handleErrorSort = (key: string) => {
    setErrorSortConfig({
      key,
      direction: errorSortConfig.key === key && errorSortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    setCurrentErrorPage(1); // Reset to first page when sorting
  };

  // Error pagination functions
  const handleErrorPageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredErrorPages) {
      setCurrentErrorPage(page);
    }
  };

  const handleErrorPrevious = () => {
    if (currentErrorPage > 1) {
      setCurrentErrorPage(currentErrorPage - 1);
    }
  };

  const handleErrorNext = () => {
    if (currentErrorPage < totalFilteredErrorPages) {
      setCurrentErrorPage(currentErrorPage + 1);
    }
  };

  // Reset error pagination when filters change
  useEffect(() => {
    setCurrentErrorPage(1);
  }, [errorSearchTerm, filterSeverity, totalFilteredErrorPages]);

  // Token Events filtering and sorting
  const getFilteredAndSortedTokenEvents = () => {
    let filteredTokenEvents = [...data.tokenEvents];
    
    // Apply search filter
    if (tokenSearchTerm) {
      filteredTokenEvents = filteredTokenEvents.filter(event =>
        event.url.toLowerCase().includes(tokenSearchTerm.toLowerCase()) ||
        (event.type && event.type.toLowerCase().includes(tokenSearchTerm.toLowerCase()))
      );
    }
    
    // Apply token type filter
    if (filterTokenType !== 'all') {
      filteredTokenEvents = filteredTokenEvents.filter(event => 
        event.type && event.type.toLowerCase() === filterTokenType.toLowerCase()
      );
    }
    
    // Apply sorting
    filteredTokenEvents.sort((a, b) => {
      const aValue = a[tokenSortConfig.key];
      const bValue = b[tokenSortConfig.key];
      
      if (tokenSortConfig.key === 'timestamp') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return tokenSortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      if (tokenSortConfig.key === 'status') {
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;
        return tokenSortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      if (aStr < bStr) return tokenSortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return tokenSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredTokenEvents;
  };

  const filteredAndSortedTokenEvents = getFilteredAndSortedTokenEvents();
  const totalFilteredTokenEvents = filteredAndSortedTokenEvents.length;
  const totalFilteredTokenPages = Math.ceil(totalFilteredTokenEvents / tokenEventsPerPage);
  
  // Calculate current page data for token events
  const indexOfLastTokenEvent = currentTokenPage * tokenEventsPerPage;
  const indexOfFirstTokenEvent = indexOfLastTokenEvent - tokenEventsPerPage;
  const currentTokenEvents = filteredAndSortedTokenEvents.slice(indexOfFirstTokenEvent, indexOfLastTokenEvent);

  // Handle token events sorting
  const handleTokenSort = (key: string) => {
    setTokenSortConfig({
      key,
      direction: tokenSortConfig.key === key && tokenSortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    setCurrentTokenPage(1); // Reset to first page when sorting
  };

  // Token events pagination functions
  const handleTokenPageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredTokenPages) {
      setCurrentTokenPage(page);
    }
  };

  const handleTokenPrevious = () => {
    if (currentTokenPage > 1) {
      setCurrentTokenPage(currentTokenPage - 1);
    }
  };

  const handleTokenNext = () => {
    if (currentTokenPage < totalFilteredTokenPages) {
      setCurrentTokenPage(currentTokenPage + 1);
    }
  };

  // Reset token pagination when filters change
  useEffect(() => {
    setCurrentTokenPage(1);
  }, [tokenSearchTerm, filterTokenType, totalFilteredTokenPages]);

  // Toggle network logging for a specific tab
  const toggleTabNetworkLogging = async (tabId: number) => {
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.networkLogging;
      
      // Get current tab state to preserve counter when disabling
      const tabStorageData = await chrome.storage.local.get([`tabLogging_${tabId}`]);
      const currentTabState = tabStorageData[`tabLogging_${tabId}`];
      const currentCount = currentTabState?.requestCount || 0;
      
      const tabState = {
        active: newState,
        startTime: newState ? Date.now() : undefined,
        requestCount: newState ? 0 : currentCount  // Reset only when enabling, preserve when disabling
      };
      
      await chrome.storage.local.set({ [`tabLogging_${tabId}`]: tabState });
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'toggleLogging',
          enabled: newState
        });
      } catch (error) {
        console.log('Could not send message to tab (may not have content script):', error);
      }
      
      // Update local state
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, networkLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling network logging:', error);
    }
  };

  // Toggle error logging for a specific tab
  const toggleTabErrorLogging = async (tabId: number) => {
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.errorLogging;
      
      // Get current tab state to preserve counter when disabling
      const tabStorageData = await chrome.storage.local.get([`tabErrorLogging_${tabId}`]);
      const currentTabState = tabStorageData[`tabErrorLogging_${tabId}`];
      const currentCount = currentTabState?.errorCount || 0;
      
      const tabState = {
        active: newState,
        startTime: newState ? Date.now() : undefined,
        errorCount: newState ? 0 : currentCount  // Reset only when enabling, preserve when disabling
      };
      
      await chrome.storage.local.set({ [`tabErrorLogging_${tabId}`]: tabState });
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'toggleErrorLogging',
          enabled: newState
        });
      } catch (error) {
        console.log('Could not send message to tab (may not have content script):', error);
      }
      
      // Update local state
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, errorLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling error logging:', error);
    }
  };

  // Toggle token logging for a specific tab
  const toggleTabTokenLogging = async (tabId: number) => {
    try {
      const currentTab = tabsLoggingStatus.find(tab => tab.tabId === tabId);
      if (!currentTab) return;

      const newState = !currentTab.tokenLogging;
      
      // Get current tab state to preserve counter when disabling
      const tabStorageData = await chrome.storage.local.get([`tabTokenLogging_${tabId}`]);
      const currentTabState = tabStorageData[`tabTokenLogging_${tabId}`];
      const currentCount = currentTabState?.tokenCount || 0;
      
      const tabState = {
        active: newState,
        startTime: newState ? Date.now() : undefined,
        tokenCount: newState ? 0 : currentCount  // Reset only when enabling, preserve when disabling
      };
      
      await chrome.storage.local.set({ [`tabTokenLogging_${tabId}`]: tabState });
      
      // Note: Token logging doesn't require content script communication
      // as it's handled purely in the background script via network interception
      
      // Update local state
      setTabsLoggingStatus(prev => 
        prev.map(tab => 
          tab.tabId === tabId ? { ...tab, tokenLogging: newState } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling token logging:', error);
    }
  };

  // Filter tabs based on search term
  const filteredTabs = tabsLoggingStatus.filter(tab => 
    tab.title.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.domain.toLowerCase().includes(tabSearchTerm.toLowerCase()) ||
    tab.url.toLowerCase().includes(tabSearchTerm.toLowerCase())
  );

  // Detail viewer functions
  const openDetailViewer = (item: any, type: 'request' | 'error' | 'token') => {
    setExpandedItem(item);
    setExpandedItemType(type);
    setDetailViewerOpen(true);
    
    // Set default field based on item type
    if (type === 'request') {
      setSelectedField('details');
    } else if (type === 'error') {
      setSelectedField('details');
    } else if (type === 'token') {
      setSelectedField('details');
    }
    
    // Scroll to bottom after a brief delay to ensure the component renders
    setTimeout(() => {
      const detailElement = document.getElementById('detail-viewer');
      if (detailElement) {
        detailElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const closeDetailViewer = () => {
    setDetailViewerOpen(false);
    setExpandedItem(null);
  };

  // Drag functionality for resizing detail viewer
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartHeight(detailViewerHeight);
    e.preventDefault();
    
    // Add cursor style to body to show dragging state
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate the delta from the initial drag position
    const deltaY = dragStartY - e.clientY; // Inverted because we want upward drag to increase height
    const newHeight = dragStartHeight + deltaY;
    
    const minHeight = 200;
    const maxHeight = window.innerHeight * 0.8;
    
    setDetailViewerHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      
      // Reset cursor styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Ensure minimum and maximum bounds are enforced smoothly
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.8;
      
      if (detailViewerHeight < minHeight) {
        setDetailViewerHeight(minHeight);
      } else if (detailViewerHeight > maxHeight) {
        setDetailViewerHeight(maxHeight);
      }
    }
  };

  // Add event listeners for drag functionality
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Get available fields for the expanded item
  const getAvailableFields = () => {
    if (!expandedItem) return [];
    
    switch (expandedItemType) {
      case 'request':
        // Always show these 3 options for network requests
        return ['details', 'body', 'headers'];
        
      case 'error':
        return ['details', 'stack'];
      case 'token':
        return ['details'];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Page Logging Status</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search pages, domains, URLs..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={tabSearchTerm}
                onChange={(e) => setTabSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs List */}
          <div className="flex-1 overflow-y-auto">
            {filteredTabs.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredTabs.map((tab) => (
                  <div key={tab.tabId} className="p-4 hover:bg-gray-50">
                    {/* Tab Info */}
                    <div className="flex items-center mb-3">
                      {tab.favicon && (
                        <img
                          src={tab.favicon}
                          alt=""
                          className="w-4 h-4 mr-2 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={tab.title}>
                          {tab.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={tab.domain}>
                          {tab.domain}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Controls */}
                    <div className="space-y-2">
                      {/* Network Logging Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Network Requests</span>
                        <button
                          onClick={() => toggleTabNetworkLogging(tab.tabId)}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            tab.networkLogging ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                              tab.networkLogging ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Error Logging Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Console Errors</span>
                        <button
                          onClick={() => toggleTabErrorLogging(tab.tabId)}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                            tab.errorLogging ? 'bg-red-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                              tab.errorLogging ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Token Logging Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Token Events</span>
                        <button
                          onClick={() => toggleTabTokenLogging(tab.tabId)}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                            tab.tokenLogging ? 'bg-yellow-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                              tab.tokenLogging ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <div className="text-gray-500 text-sm">
                  {tabSearchTerm ? 'No tabs match your search' : 'No tabs available'}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={loadTabsLoggingStatus}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-md transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              {/* Sidebar Toggle Button with Indicator */}
              <div className="relative mr-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 relative"
                  title="Open Logging Status Panel"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {/* Notification dot for active tabs */}
                  {tabsLoggingStatus.some(tab => tab.networkLogging || tab.errorLogging) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse"></span>
                  )}
                </button>
                {/* Helper tooltip */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                  View and control logging for all tabs
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Web App Monitor Dashboard</h1>
                    <p className="text-gray-600">Monitor and analyze your client-side web applications</p>
                  </div>
                  
                  {/* Sidebar Discovery Hint */}
                  <div className="hidden lg:flex items-center bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm border border-blue-200">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Click the menu icon to control logging for all tabs</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refreshData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Refresh Data
              </button>
              <button
                onClick={clearData}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tabs</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalTabs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  data.extensionEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white font-bold">
                    {data.extensionEnabled ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Extension Status</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.extensionEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🕒</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Last Activity</p>
                <p className="text-sm font-semibold text-gray-900">{data.lastActivity}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🌐</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Network Requests
                  {data.totalRequests > 0 && totalFilteredRequests !== data.totalRequests && (
                    <span className="text-xs text-gray-400 ml-1">(filtered)</span>
                  )}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{totalFilteredRequests}</p>
                {data.totalRequests > 0 && totalFilteredRequests !== data.totalRequests && (
                  <p className="text-xs text-gray-500">of {data.totalRequests} total</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">⚠️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Console Errors
                  {data.totalErrors > 0 && totalFilteredErrors !== data.totalErrors && (
                    <span className="text-xs text-gray-400 ml-1">(filtered)</span>
                  )}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{totalFilteredErrors}</p>
                {data.totalErrors > 0 && totalFilteredErrors !== data.totalErrors && (
                  <p className="text-xs text-gray-500">of {data.totalErrors} total</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🔐</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Token Events</p>
                <p className="text-2xl font-semibold text-gray-900">{totalFilteredTokenEvents}</p>
                {data.totalTokenEvents > 0 && totalFilteredTokenEvents !== data.totalTokenEvents && (
                  <p className="text-xs text-gray-500">Filtered from {data.totalTokenEvents}</p>
                )}
                {totalFilteredTokenEvents === data.totalTokenEvents && data.totalTokenEvents > 0 && (
                  <p className="text-xs text-gray-500">Auth acquire & refresh events</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Navigation Tabs */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {tableNames.map((tableName, index) => (
                    <button
                      key={index}
                      onClick={() => goToTable(index)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentTableIndex === index
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span>{tableIcons[index]}</span>
                        <span>{tableName}</span>
                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full ${
                          currentTableIndex === index
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index === 0 ? (data.networkRequests?.length || 0) : 
                           index === 1 ? (data.consoleErrors?.length || 0) : 
                           (data.tokenEvents?.length || 0)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                
                {/* Arrow Navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevTable}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    title="Previous table"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextTable}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    title="Next table"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Current Table Info */}
              <div className="text-right">
                <h2 className="text-lg font-semibold text-gray-900">{tableNames[currentTableIndex]}</h2>
                <p className="text-xs text-gray-500 mt-1">{tableDescriptions[currentTableIndex]}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Requests Section */}
        <div className={`bg-white rounded-lg shadow mb-8 ${currentTableIndex === 0 ? 'block' : 'hidden'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Network Requests</h2>
                <p className="text-xs text-gray-500 mt-1">Global requests from all tabs (Popup shows current tab only)</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {totalFilteredRequests > 0 && (
                    `Showing ${indexOfFirstRequest + 1}-${Math.min(indexOfLastRequest, totalFilteredRequests)} of ${totalFilteredRequests}`
                  )}
                  {data.totalRequests > 0 && totalFilteredRequests !== data.totalRequests && (
                    ` (filtered from ${data.totalRequests})`
                  )}
                </span>
                {totalFilteredPages > 1 && (
                  <span className="text-sm text-gray-500">Page {currentPage} of {totalFilteredPages}</span>
                )}
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by URL or method..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Method Filter */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Method:</label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
              </div>
              
              {/* Clear Filters */}
              {(searchTerm || filterMethod !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterMethod('all');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {data.networkRequests.length > 0 ? (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('method')}
                        >
                          <div className="flex items-center">
                            Method
                            {sortConfig.key === 'method' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('url')}
                        >
                          <div className="flex items-center">
                            URL
                            {sortConfig.key === 'url' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center">
                            Status
                            {sortConfig.key === 'status' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('payload_size')}
                        >
                          <div className="flex items-center">
                            Size
                            {sortConfig.key === 'payload_size' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('timestamp')}
                        >
                          <div className="flex items-center">
                            Time
                            {sortConfig.key === 'timestamp' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Headers Preview
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('response_time')}
                        >
                          <div className="flex items-center">
                            Response Time
                            {sortConfig.key === 'response_time' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentRequests.map((request, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 cursor-pointer" 
                          onDoubleClick={() => openDetailViewer(request, 'request')}
                          title="Double-click to view detailed information"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                              request.method === 'POST' ? 'bg-green-100 text-green-800' :
                              request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.method}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={request.url}>
                              {request.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-800' :
                              request.status >= 300 && request.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                              request.status >= 400 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.payload_size ? `${Math.round(request.payload_size / 1024)}KB` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="truncate max-w-xs">
                              {(() => {
                                try {
                                  const headerData = request.headers ? JSON.parse(request.headers) : {};
                                  const requestHeaders = headerData.request || {};
                                  
                                  // Priority headers to show in preview
                                  const priorityHeaders = ['content-type', 'authorization', 'accept', 'user-agent', 'x-api-key'];
                                  
                                  for (const priority of priorityHeaders) {
                                    if (requestHeaders[priority]) {
                                      const value = String(requestHeaders[priority]);
                                      return `${priority}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`;
                                    }
                                  }
                                  
                                  // If no priority headers, show first available header
                                  const firstHeader = Object.entries(requestHeaders)[0];
                                  if (firstHeader) {
                                    const value = String(firstHeader[1]);
                                    return `${firstHeader[0]}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`;
                                  }
                                  
                                  return 'No headers';
                                } catch {
                                  return 'Invalid headers';
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.response_time ? `${request.response_time}ms` : 
                             request.time_taken ? `${request.time_taken}ms` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalFilteredPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstRequest + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(indexOfLastRequest, totalFilteredRequests)}</span> of{' '}
                        <span className="font-medium">{totalFilteredRequests}</span> results
                        {data.totalRequests > 0 && totalFilteredRequests !== data.totalRequests && (
                          <span className="text-gray-500"> (filtered from {data.totalRequests})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={handlePrevious}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {getPageNumbers().map((pageNum, index) => (
                          <button
                            key={index}
                            onClick={() => typeof pageNum === 'number' ? handlePageChange(pageNum) : undefined}
                            disabled={pageNum === '...'}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              pageNum === currentPage
                                ? 'bg-blue-500 text-white'
                                : pageNum === '...'
                                ? 'text-gray-500 cursor-default'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={handleNext}
                        disabled={currentPage === totalFilteredPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === totalFilteredPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🌐</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No network requests yet</h3>
                <p className="text-gray-500">Network requests will appear here once you enable logging on specific tabs via the popup.</p>
              </div>
            )}
          </div>
        </div>

        {/* Console Errors Section */}
        <div className={`bg-white rounded-lg shadow mb-8 ${currentTableIndex === 1 ? 'block' : 'hidden'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Console Errors</h2>
                <p className="text-xs text-gray-500 mt-1">Global errors from all tabs (Popup shows current tab only)</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {totalFilteredErrors > 0 && (
                    `Showing ${indexOfFirstError + 1}-${Math.min(indexOfLastError, totalFilteredErrors)} of ${totalFilteredErrors}`
                  )}
                  {data.totalErrors > 0 && totalFilteredErrors !== data.totalErrors && (
                    ` (filtered from ${data.totalErrors})`
                  )}
                </span>
                {totalFilteredErrorPages > 1 && (
                  <span className="text-sm text-gray-500">Page {currentErrorPage} of {totalFilteredErrorPages}</span>
                )}
              </div>
            </div>

            {/* Search and Filter Controls for Errors */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by message or URL..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={errorSearchTerm}
                    onChange={(e) => setErrorSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Severity Filter */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Severity:</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Severities</option>
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              
              {/* Clear Filters */}
              {(errorSearchTerm || filterSeverity !== 'all') && (
                <button
                  onClick={() => {
                    setErrorSearchTerm('');
                    setFilterSeverity('all');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {data.consoleErrors.length > 0 ? (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('severity')}
                        >
                          <div className="flex items-center">
                            Severity
                            {errorSortConfig.key === 'severity' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('message')}
                        >
                          <div className="flex items-center">
                            Message
                            {errorSortConfig.key === 'message' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('url')}
                        >
                          <div className="flex items-center">
                            URL
                            {errorSortConfig.key === 'url' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleErrorSort('timestamp')}
                        >
                          <div className="flex items-center">
                            Time
                            {errorSortConfig.key === 'timestamp' && (
                              <span className="ml-1">
                                {errorSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentErrors.map((error, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onDoubleClick={() => openDetailViewer(error, 'error')}
                          title="Double-click to view detailed information"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              error.severity === 'error' ? 'bg-red-100 text-red-800' :
                              error.severity === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                              error.severity === 'info' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {error.severity || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-md" title={error.message}>
                              {error.message}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={error.url}>
                              {error.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls for Errors */}
                {totalFilteredErrorPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstError + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(indexOfLastError, totalFilteredErrors)}</span> of{' '}
                        <span className="font-medium">{totalFilteredErrors}</span> results
                        {data.totalErrors > 0 && totalFilteredErrors !== data.totalErrors && (
                          <span className="text-gray-500"> (filtered from {data.totalErrors})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={handleErrorPrevious}
                        disabled={currentErrorPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentErrorPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(5, totalFilteredErrorPages))].map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleErrorPageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                pageNum === currentErrorPage
                                  ? 'bg-blue-500 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={handleErrorNext}
                        disabled={currentErrorPage === totalFilteredErrorPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentErrorPage === totalFilteredErrorPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No console errors yet</h3>
                <p className="text-gray-500">Console errors will appear here once you enable error logging on specific tabs via the popup.</p>
              </div>
            )}
          </div>
        </div>

        {/* Token Events Section */}
        <div className={`bg-white rounded-lg shadow mb-8 ${currentTableIndex === 2 ? 'block' : 'hidden'}`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Token Events</h2>
                <p className="text-xs text-gray-500 mt-1">Authentication events from all tabs (auth, login, refresh)</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {totalFilteredTokenEvents > 0 && (
                    `Showing ${indexOfFirstTokenEvent + 1}-${Math.min(indexOfLastTokenEvent, totalFilteredTokenEvents)} of ${totalFilteredTokenEvents}`
                  )}
                  {data.totalTokenEvents > 0 && totalFilteredTokenEvents !== data.totalTokenEvents && (
                    ` (filtered from ${data.totalTokenEvents})`
                  )}
                </span>
                {totalFilteredTokenPages > 1 && (
                  <span className="text-sm text-gray-500">Page {currentTokenPage} of {totalFilteredTokenPages}</span>
                )}
              </div>
            </div>

            {/* Search and Filter Controls for Token Events */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by URL or event type..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={tokenSearchTerm}
                    onChange={(e) => setTokenSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Event Type Filter */}
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={filterTokenType}
                  onChange={(e) => setFilterTokenType(e.target.value)}
                  className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Types</option>
                  <option value="acquire">Token Acquire</option>
                  <option value="refresh">Token Refresh</option>
                  <option value="refresh_error">Refresh Error</option>
                </select>
              </div>
              
              {/* Clear Filters */}
              {(tokenSearchTerm || filterTokenType !== 'all') && (
                <button
                  onClick={() => {
                    setTokenSearchTerm('');
                    setFilterTokenType('all');
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            {data.tokenEvents.length > 0 ? (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('type')}
                        >
                          <div className="flex items-center">
                            Event Type
                            {tokenSortConfig.key === 'type' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('token_type')}
                        >
                          <div className="flex items-center">
                            Token Type
                            {tokenSortConfig.key === 'token_type' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('url')}
                        >
                          <div className="flex items-center">
                            URL
                            {tokenSortConfig.key === 'url' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('status')}
                        >
                          <div className="flex items-center">
                            Status
                            {tokenSortConfig.key === 'status' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('method')}
                        >
                          <div className="flex items-center">
                            Method
                            {tokenSortConfig.key === 'method' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('value_hash')}
                        >
                          <div className="flex items-center">
                            Value Hash
                            {tokenSortConfig.key === 'value_hash' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('expiry')}
                        >
                          <div className="flex items-center">
                            Expiry
                            {tokenSortConfig.key === 'expiry' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleTokenSort('timestamp')}
                        >
                          <div className="flex items-center">
                            Time
                            {tokenSortConfig.key === 'timestamp' && (
                              <span className="ml-1">
                                {tokenSortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTokenEvents.map((event, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onDoubleClick={() => openDetailViewer(event, 'token')}
                          title="Double-click to view detailed information"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (() => {
                                const analysis = analyzeTokenEvent(event);
                                const type = analysis.type;
                                if (type === 'login') return 'bg-green-100 text-green-800';
                                if (type === 'logout') return 'bg-gray-100 text-gray-800';
                                if (type === 'refresh') return 'bg-blue-100 text-blue-800';
                                if (type === 'expired') return 'bg-red-100 text-red-800';
                                if (type === 'acquire') return 'bg-purple-100 text-purple-800';
                                if (type === 'refresh_error') return 'bg-red-100 text-red-800';
                                if (type === 'api_call') return 'bg-yellow-100 text-yellow-800';
                                return 'bg-gray-100 text-gray-800';
                              })()
                            }`}>
                              {(() => {
                                const analysis = analyzeTokenEvent(event);
                                const type = analysis.type;
                                if (type === 'login') return '� Login';
                                if (type === 'logout') return '🔒 Logout';
                                if (type === 'refresh') return '🔄 Refresh';
                                if (type === 'expired') return '⏰ Expired';
                                if (type === 'acquire') return '🔐 Acquire';
                                if (type === 'refresh_error') return '❌ Refresh Error';
                                if (type === 'api_call') return '📡 API Call';
                                return `🔐 ${type}`;
                              })()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (() => {
                                const analysis = analyzeTokenEvent(event);
                                const tokenType = analysis.tokenType;
                                
                                // JWT-based tokens
                                if (tokenType.includes('JWT')) return 'bg-purple-100 text-purple-800';
                                // Access tokens
                                if (tokenType.includes('Access Token')) return 'bg-blue-100 text-blue-800';
                                // Refresh tokens
                                if (tokenType.includes('Refresh Token')) return 'bg-cyan-100 text-cyan-800';
                                // ID tokens
                                if (tokenType.includes('ID Token')) return 'bg-emerald-100 text-emerald-800';
                                // Authentication types
                                if (tokenType === 'Basic Auth') return 'bg-orange-100 text-orange-800';
                                if (tokenType === 'API Key') return 'bg-indigo-100 text-indigo-800';
                                // Session and security tokens
                                if (tokenType === 'Session Token') return 'bg-green-100 text-green-800';
                                if (tokenType === 'CSRF Token') return 'bg-red-100 text-red-800';
                                if (tokenType === 'State Token') return 'bg-yellow-100 text-yellow-800';
                                // Custom schemes
                                if (tokenType.includes('Token') && !tokenType.includes('Unknown')) return 'bg-teal-100 text-teal-800';
                                
                                // Legacy compatibility
                                if (tokenType === 'JWT') return 'bg-purple-100 text-purple-800';
                                if (tokenType === 'Bearer') return 'bg-blue-100 text-blue-800';
                                if (tokenType === 'Basic') return 'bg-orange-100 text-orange-800';
                                if (tokenType === 'Session') return 'bg-green-100 text-green-800';
                                
                                return 'bg-gray-100 text-gray-800';
                              })()
                            }`}>
                              {(() => {
                                const analysis = analyzeTokenEvent(event);
                                const tokenType = analysis.tokenType;
                                if (tokenType === 'JWT') return '🎫 JWT';
                                if (tokenType === 'Bearer') return '🔐 Bearer';
                                if (tokenType === 'Basic') return '� Basic';
                                if (tokenType === 'Session') return '🍪 Session';
                                if (tokenType === 'API Key') return '�️ API Key';
                                return tokenType || 'Unknown';
                              })()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={analyzeTokenEvent(event).url}>
                              {analyzeTokenEvent(event).url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              analyzeTokenEvent(event).status >= 200 && analyzeTokenEvent(event).status < 300 ? 'bg-green-100 text-green-800' :
                              analyzeTokenEvent(event).status >= 300 && analyzeTokenEvent(event).status < 400 ? 'bg-yellow-100 text-yellow-800' :
                              analyzeTokenEvent(event).status >= 400 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {analyzeTokenEvent(event).status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              analyzeTokenEvent(event).method === 'GET' ? 'bg-blue-100 text-blue-800' :
                              analyzeTokenEvent(event).method === 'POST' ? 'bg-green-100 text-green-800' :
                              analyzeTokenEvent(event).method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              analyzeTokenEvent(event).method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {analyzeTokenEvent(event).method}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-gray-600 font-mono truncate max-w-xs" title={event.value_hash}>
                              {formatHashValue(event.value_hash)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {event.expiry ? 
                              new Date(event.expiry * 1000).toLocaleString() : 
                              'No expiry'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls for Token Events */}
                {totalFilteredTokenPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstTokenEvent + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(indexOfLastTokenEvent, totalFilteredTokenEvents)}</span> of{' '}
                        <span className="font-medium">{totalFilteredTokenEvents}</span> results
                        {data.totalTokenEvents > 0 && totalFilteredTokenEvents !== data.totalTokenEvents && (
                          <span className="text-gray-500"> (filtered from {data.totalTokenEvents})</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Previous Button */}
                      <button
                        onClick={handleTokenPrevious}
                        disabled={currentTokenPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentTokenPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalFilteredTokenPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleTokenPageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                pageNum === currentTokenPage
                                  ? 'bg-blue-500 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Next Button */}
                      <button
                        onClick={handleTokenNext}
                        disabled={currentTokenPage === totalFilteredTokenPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentTokenPage === totalFilteredTokenPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No token events yet</h3>
                <p className="text-gray-500">Token events will appear here when authentication, login, or token refresh activities are detected.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>

      {/* Detail Viewer Component */}
      {detailViewerOpen && expandedItem && (
        <div 
          id="detail-viewer"
          className={`detail-viewer fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${
            isDragging ? 'dragging' : ''
          }`}
          style={{ height: `${detailViewerHeight}px` }}
        >
          {/* Drag Handle */}
          <div 
            className={`detail-viewer-drag-handle w-full h-3 cursor-ns-resize transition-all duration-150 flex items-center justify-center ${
              isDragging 
                ? 'bg-blue-200 border-t border-blue-300' 
                : 'bg-gray-100 hover:bg-gray-200 border-t border-gray-200'
            }`}
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          >
            <div className={`transition-all duration-150 rounded-full ${
              isDragging 
                ? 'w-16 h-1.5 bg-blue-500' 
                : 'w-12 h-1 bg-gray-400 hover:bg-gray-500'
            }`}></div>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              <button
                onClick={closeDetailViewer}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Collapse Detail View
              </button>
              
              {/* Field Selector */}
              {getAvailableFields().length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Viewing:</span>
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                  >
                    {getAvailableFields().map((field) => (
                      <option key={field} value={field}>
                        {field === 'details' && '� Details'}
                        {field === 'body' && '📦 Body'}
                        {field === 'headers' && '� Headers'}
                        {field === 'stack' && '📚 Stack Trace'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {expandedItemType === 'request' && 'Network Request Details'}
                {expandedItemType === 'error' && 'Console Error Details'}
                {expandedItemType === 'token' && 'Token Event Details'}
              </span>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4" style={{ height: `${detailViewerHeight - 120}px` }}>
            {expandedItemType === 'request' && (
              <RequestDetailContent 
                request={expandedItem} 
                selectedField={selectedField}
              />
            )}
            {expandedItemType === 'error' && (
              <ErrorDetailContent 
                error={expandedItem} 
                selectedField={selectedField}
              />
            )}
            {expandedItemType === 'token' && (
              <TokenDetailContent 
                tokenEvent={expandedItem} 
                selectedField={selectedField}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

const container = document.getElementById('dashboard-root');
if (container) {
  const root = createRoot(container);
  root.render(<Dashboard />);
}
