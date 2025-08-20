import React, { useState } from 'react'

// Detail Content Components
export const RequestDetailContent: React.FC<{
  request: any;
  selectedField: string;
  settings?: any;
}> = ({ request, selectedField, settings }) => {
  const copyToClipboard = (text: string) => {
    // Use settings-based limit or fallback to 10KB
    const maxClipboardSize = settings?.networkInterception?.bodyCapture?.maxBodySize || 10000;
    const safeSize = maxClipboardSize === 0 ? 50000 : maxClipboardSize; // 0 means no limit, but use 50KB safety

    const copyText = text.length > safeSize ?
      text.substring(0, safeSize) + '\n[Truncated for clipboard - check settings to adjust limit]' :
      text;

    navigator.clipboard.writeText(copyText).catch(error => {
      console.warn('Failed to copy to clipboard:', error);
    });
  };

  const formatJSON = (obj: any) => {
    try {
      // Use settings-based safety limits
      const maxDisplaySize = settings?.networkInterception?.bodyCapture?.maxBodySize || 5000;
      const safeSize = maxDisplaySize === 0 ? 50000 : maxDisplaySize; // 0 means no limit, but use 50KB safety

      const seen = new WeakSet();
      const safeStringify = (_key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      };

      // Enhanced JSON formatting with proper indentation
      const jsonString = JSON.stringify(obj, safeStringify, 2);
      return jsonString.length > safeSize ? jsonString.substring(0, safeSize) + '...\n[Truncated - check settings to adjust limit]' : jsonString;
    } catch (e) {
      // If JSON.stringify fails, return a readable string representation
      return String(obj);
    }
  };

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

    // Enhanced JSON pretty-printing with better formatting
    const prettyPrintIfJson = (str: any) => {
      if (typeof str !== 'string') {
        // If it's already an object, stringify it with proper formatting
        try {
          return JSON.stringify(str, null, 2);
        } catch {
          return String(str);
        }
      }

      // If it's a string, try to parse and reformat it
      try {
        const obj = JSON.parse(str);
        return JSON.stringify(obj, null, 2);
      } catch {
        // If parsing fails, check if it's a formatted JSON string that just needs cleaning
        const cleaned = str.trim();
        if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
          try {
            // Try to parse after some basic cleanup
            const obj = JSON.parse(cleaned);
            return JSON.stringify(obj, null, 2);
          } catch {
            return str; // Return original if all parsing attempts fail
          }
        }
        return str;
      }
    };

    // Check if response body looks like a status-only response (encrypted/non-JSON content)
    const isStatusOnlyResponse = (body: any): boolean => {
      if (!body || typeof body !== 'string') return false;

      const trimmedBody = body.trim();

      // If it's empty or very short, it might be a status response
      if (trimmedBody.length === 0 || trimmedBody.length > 200) {
        return false; // Empty or very long content is probably not a simple status
      }

      // First check if it's valid JSON - if so, it's not a status-only response
      try {
        JSON.parse(trimmedBody);
        // If it successfully parses as JSON, it's not a status-only response
        return false;
      } catch {
        // Not valid JSON, continue with status pattern checks
      }

      // Check if the entire body is just a status message (no additional content)
      const statusOnlyPatterns = [
        // Exact status format matches (entire string)
        /^Status:\s*\d+\s*$/i,
        /^status:\s*\d+\s*$/i, // lowercase variant
        /^\d+\s+(OK|Created|Accepted|No Content|Not Found|Unauthorized|Forbidden|Internal Server Error)\s*$/i,
        /^HTTP\/\d\.\d\s+\d+\s+(OK|Created|Accepted|No Content|Not Found|Unauthorized|Forbidden|Internal Server Error)?\s*$/i,
        /^Response Code:\s*\d+\s*$/i,
        // Simple numeric status
        /^\d{3}\s*$/,
        // Common error messages that indicate encrypted/binary content
        /^(Error|Failed|Unauthorized|Forbidden|Not Found|Internal Server Error)\s*$/i,
        // Browser/network generated messages
        /^(net::|ERR_|NETWORK_|Connection)/i
      ];

      // More specific JSON indicator check - look for actual JSON structure, not just colons
      const hasActualJsonStructure = /^[\s]*[{\[].*[}\]][\s]*$/.test(trimmedBody) ||
                                   /^[\s]*".*"[\s]*$/.test(trimmedBody) ||
                                   /[{}\[\]]/.test(trimmedBody);

      if (hasActualJsonStructure) {
        return false; // Contains actual JSON structure, not a status-only response
      }

      // Check if it matches our strict status-only patterns
      return statusOnlyPatterns.some(pattern => pattern.test(trimmedBody));
    };

    // Get explanation for why we can't show JSON content
    const getBodyExplanation = (body: any, status?: number): string => {
      if (isStatusOnlyResponse(body)) {
        if (status) {
          // Special case for status code 0 (network/connection errors)
          if (status === 0) {
            return "🔌 Network Error - Connection failed, request was blocked, or network is unreachable";
          }

          // 2xx Success responses
          if (status >= 200 && status < 300) {
            if (status === 200) return "✅ Success - Response body is empty or contains non-JSON data";
            if (status === 201) return "✅ Created successfully - Response may contain status confirmation only";
            if (status === 202) return "✅ Request accepted - Processing in background, minimal response body";
            if (status === 204) return "✅ No Content - Request successful but no response body to display";
            if (status === 206) return "✅ Partial Content - Response contains binary or encrypted data";
            return "✅ Success - Response body contains non-displayable content";
          }

          // 3xx Redirection responses
          if (status >= 300 && status < 400) {
            if (status === 301) return "↪️ Moved Permanently - Response body contains minimal redirect information";
            if (status === 302) return "↪️ Found - Temporary redirect with minimal response body";
            if (status === 304) return "📦 Not Modified - Browser used cached version, no response body";
            return "↪️ Redirect - Response body contains location/redirect information";
          }

          // 4xx Client Error responses
          if (status >= 400 && status < 500) {
            if (status === 400) return "❌ Bad Request - Error details may be encrypted or in HTML format";
            if (status === 401) return "� Unauthorized - Authentication error, response may contain encrypted data";
            if (status === 403) return "🚫 Forbidden - Access denied, error details may be protected";
            if (status === 404) return "🔍 Not Found - Resource doesn't exist, minimal error response";
            if (status === 429) return "⏳ Too Many Requests - Rate limited, simple status response";
            return "❌ Client Error - Error details may be in HTML/XML format rather than JSON";
          }

          // 5xx Server Error responses
          if (status >= 500) {
            if (status === 500) return "💥 Internal Server Error - Server error, response may be encrypted/compressed";
            if (status === 502) return "🔧 Bad Gateway - Proxy error, minimal response content";
            if (status === 503) return "⚠️ Service Unavailable - Server down, simple status message";
            if (status === 504) return "⏰ Gateway Timeout - Request timed out, minimal response";
            return "💥 Server Error - Error response may be in non-JSON format";
          }
        }

        // Generic explanations for status-only responses without status code
        const explanations = [
          "🔒 Response content may be encrypted, compressed, or binary",
          "📄 Server returned content in HTML, XML, or other non-JSON format",
          "📡 Content-Type indicates binary or encoded response",
          "🛡️ Response body was compressed with gzip/deflate encoding",
          "🚫 Binary content (images, files, etc.) cannot be displayed as text",
          "🗜️ Response was compressed and requires decompression to view",
          "🎭 Content is protected or obfuscated by the server",
          "📋 Response is in a proprietary format that requires special parsing"
        ];

        return explanations[Math.floor(Math.random() * explanations.length)];
      }
      return "";
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
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-gray-900">Response Body</h3>
                {isStatusOnlyResponse(responseBody) && (
                  <div className="relative group">
                    <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded-full flex items-center justify-center cursor-help">
                      <span className="text-yellow-600 text-xs font-bold">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                      <div className="text-center">
                        <p className="font-medium mb-1">Why can't I see the response content?</p>
                        <p className="text-gray-300">{getBodyExplanation(responseBody, request.status)}</p>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(typeof responseBody === 'string' ? prettyPrintIfJson(responseBody) : formatJSON(responseBody))}
                  className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Copy
                </button>
                {responseBody && (typeof responseBody === 'string' ? responseBody.length : JSON.stringify(responseBody).length) > 1000 && (
                  <button
                    onClick={() => {
                      const content = typeof responseBody === 'string' ? prettyPrintIfJson(responseBody) : formatJSON(responseBody);
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

            {/* Enhanced response body display with status explanation */}
            {isStatusOnlyResponse(responseBody) ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-sm">📄</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Response Content Not Available</h4>
                    <p className="text-sm text-yellow-700 mb-2">{getBodyExplanation(responseBody, request.status)}</p>
                    <div className="bg-yellow-100 rounded p-2 text-xs font-mono text-yellow-800">
                      {responseBody}
                    </div>
                    <div className="mt-2 text-xs text-yellow-600">
                      <p><strong>Common reasons:</strong></p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        <li>HTTPS encrypted responses</li>
                        <li>Binary content (images, files, etc.)</li>
                        <li>Compressed responses (gzip, deflate)</li>
                        <li>Protected API endpoints</li>
                        <li>Non-text content types</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="code-block bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm font-mono max-h-96">
                <pre className="whitespace-pre-wrap break-words">{typeof responseBody === 'string' ? prettyPrintIfJson(responseBody) : formatJSON(responseBody)}</pre>
              </div>
            )}
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

  // Raw JSON field
  if (selectedField === 'rawjson') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Raw JSON Data</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(request))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy JSON
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-auto max-h-96">
            {formatJSON(request)}
          </pre>
        </div>
        {settings?.networkInterception?.bodyCapture?.maxBodySize !== 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Display limited by settings (max: {settings?.networkInterception?.bodyCapture?.maxBodySize || 5000} chars)
          </p>
        )}
      </div>
    );
  }

  // Fallback for unknown fields
  return <div className="text-gray-500">No data available for selected field: {selectedField}</div>;
};

export const ErrorDetailContent: React.FC<{
  error: any;
  selectedField: string;
}> = ({ error, selectedField }) => {
  const copyToClipboard = (text: string) => {
    // For errors, use smaller limits since raw JSON is not as useful
    const maxClipboardSize = 5000;
    const copyText = text.length > maxClipboardSize ?
      text.substring(0, maxClipboardSize) + '\n[Truncated for clipboard]' :
      text;

    navigator.clipboard.writeText(copyText).catch(error => {
      console.warn('Failed to copy to clipboard:', error);
    });
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
export const analyzeTokenEvent = (event: any) => {
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

export const TokenDetailContent: React.FC<{
  tokenEvent: any;
  selectedField: string;
  showFullTokenHash?: boolean;
  settings?: any;
}> = ({ tokenEvent, selectedField, showFullTokenHash = false, settings }) => {
  const copyToClipboard = (text: string) => {
    // Use settings-based limit for tokens
    const maxClipboardSize = settings?.networkInterception?.bodyCapture?.maxBodySize || 10000;
    const safeSize = maxClipboardSize === 0 ? 50000 : maxClipboardSize;

    const copyText = text.length > safeSize ?
      text.substring(0, safeSize) + '\n[Truncated for clipboard - check settings]' :
      text;

    navigator.clipboard.writeText(copyText).catch(error => {
      console.warn('Failed to copy to clipboard:', error);
    });
  };

  const formatJSON = (obj: any) => {
    try {
      const maxDisplaySize = settings?.networkInterception?.bodyCapture?.maxBodySize || 5000;
      const safeSize = maxDisplaySize === 0 ? 50000 : maxDisplaySize;

      const seen = new WeakSet();
      const safeStringify = (_key: string, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      };

      const jsonString = JSON.stringify(obj, safeStringify, 2);
      return jsonString.length > safeSize ?
        jsonString.substring(0, safeSize) + '...[Truncated - check settings]' :
        jsonString;
    } catch {
      return String(obj);
    }
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
      // Use showFullTokenHash setting to determine display format
      return showFullTokenHash ? hash : formatGitStyleHash(hash);
    }

    // For other values, return as-is
    return hash;
  };

  const formatGitStyleHash = (hash: string): string => {
    if (hash.length < 8) return hash; // If hash is too short, return as-is
    return hash.substring(0, 8); // Show first 8 characters like git
  };

  if (selectedField === 'details') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Token Event Details</h3>
            <button
              onClick={() => copyToClipboard(JSON.stringify(tokenEvent, null, 2))}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {tokenEvent.url && (
              <div>
                <span className="text-sm font-medium text-gray-700">URL:</span>
                <p className="text-sm text-gray-900 mt-1 break-all">{tokenEvent.url}</p>
              </div>
            )}
            {(tokenEvent.method || tokenEvent.request_method) && (
              <div>
                <span className="text-sm font-medium text-gray-700">Method:</span>
                <p className="text-sm text-gray-900 mt-1">{tokenEvent.method || tokenEvent.request_method}</p>
              </div>
            )}
            {(tokenEvent.status || tokenEvent.response_status) && (
              <div>
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                  (tokenEvent.status || tokenEvent.response_status) >= 200 && (tokenEvent.status || tokenEvent.response_status) < 300 ? 'bg-green-100 text-green-800' :
                  (tokenEvent.status || tokenEvent.response_status) >= 300 && (tokenEvent.status || tokenEvent.response_status) < 400 ? 'bg-yellow-100 text-yellow-800' :
                  (tokenEvent.status || tokenEvent.response_status) >= 400 ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tokenEvent.status || tokenEvent.response_status}
                </span>
              </div>
            )}
            {(tokenEvent.valueHash || tokenEvent.value_hash) && (
              <div>
                <span className="text-sm font-medium text-gray-700">Value Hash:</span>
                <p className="text-sm text-gray-900 mt-1 font-mono">{formatHashValue(tokenEvent.valueHash || tokenEvent.value_hash)}</p>
              </div>
            )}
            {tokenEvent.timestamp && (
              <div>
                <span className="text-sm font-medium text-gray-700">Timestamp:</span>
                <p className="text-sm text-gray-900 mt-1">{new Date(tokenEvent.timestamp).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedField === 'headers') {
    // Get headers from various possible locations in the token event
    const headers = tokenEvent.headers ||
                   tokenEvent.request_headers ||
                   tokenEvent.response_headers ||
                   {};

    return (
      <div className="space-y-6">
        {Object.keys(headers).length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Headers ({Object.keys(headers).length})</h3>
              <button
                onClick={() => copyToClipboard(JSON.stringify(headers, null, 2))}
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
                  {Object.entries(headers).map(([key, value]) => (
                    <tr key={key} className="table-row-hover">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{key}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 break-all">{String(value)}</td>
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
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">No header data available for this token event</div>
          </div>
        )}
      </div>
    );
  }

  // Raw JSON field for tokens
  if (selectedField === 'rawjson') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Raw Token Event Data</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(tokenEvent))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy JSON
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-auto max-h-96">
            {formatJSON(tokenEvent)}
          </pre>
        </div>
        {settings?.networkInterception?.bodyCapture?.maxBodySize !== 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Display limited by settings (max: {settings?.networkInterception?.bodyCapture?.maxBodySize || 5000} chars)
          </p>
        )}
      </div>
    );
  }

  return <div className="text-gray-500">No data available for selected field.</div>;
};
