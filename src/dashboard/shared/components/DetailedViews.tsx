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

  const formatRequestDetailsOnly = (request: any) => {
    const parseSize = (value: any): number => {
      if (value === null || value === undefined) return 0;
      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    const formatSize = (bytes: number): string =>
      bytes > 0 ? `${(bytes / 1024).toFixed(2)}KB (${bytes} bytes)` : '0KB (0 bytes)';

    // Calculate sizes the same way as displayed
    const payloadSize = parseSize(request.payload_size);
    const requestSize = parseSize(request.requestSize || request.request_size);
    const responseSize = parseSize(request.responseSize || request.response_size);

    // Calculate stored sizes (same logic as UI)
    const calculateStoredSize = () => {
      let storedRequestSize = 0;
      let storedResponseSize = 0;
      let storedHeaderSize = 0;

      const requestBody = request.requestBody || request.request_body;
      const responseBody = request.responseBody || request.response_body;

      if (requestBody && typeof requestBody === 'string') {
        storedRequestSize = new Blob([requestBody]).size;
      }

      if (responseBody && typeof responseBody === 'string') {
        storedResponseSize = new Blob([responseBody]).size;
      }

      // Add header size (same calculation as stored size column)
      if (request.headers) {
        try {
          const headerStr = typeof request.headers === 'string' ? request.headers : JSON.stringify(request.headers);
          storedHeaderSize = new Blob([headerStr]).size;
        } catch (e) {
          // Ignore header size calculation errors
        }
      }

      return {
        storedRequestSize,
        storedResponseSize,
        storedHeaderSize,
        totalStored: storedRequestSize + storedResponseSize + storedHeaderSize
      };
    };

    const { storedRequestSize, storedResponseSize, storedHeaderSize, totalStored } = calculateStoredSize();

    const details = {
      method: request.method || 'N/A',
      url: request.url || 'N/A',
      status: request.status || 'N/A',

      // Size breakdown (only if available) - matching the exact display logic
      ...(payloadSize > 0 || requestSize > 0 || responseSize > 0) && {
        sizeBreakdown: {
          // Original size section
          originalSize: {
            ...(payloadSize > 0) && { total: formatSize(payloadSize) },
            ...(requestSize > 0) && { request: formatSize(requestSize) },
            ...(responseSize > 0) && { response: formatSize(responseSize) }
          },
          // Stored size section (only if there's stored data)
          ...(totalStored > 0) && {
            storedSize: {
              totalStored: formatSize(totalStored),
              ...(storedRequestSize > 0) && { requestStored: formatSize(storedRequestSize) },
              ...(storedResponseSize > 0) && { responseStored: formatSize(storedResponseSize) },
              ...(storedHeaderSize > 0) && { headersStored: formatSize(storedHeaderSize) }
            }
          },
          // Include the tip message that appears in the UI
          ...(totalStored > 0) && {
            tip: "Bodies are truncated to prevent memory issues. Default limit is 50KB per request/response."
          }
        }
      },

      // Response time (only if available)
      ...(request.response_time) && { responseTime: `${request.response_time}ms` },

      // Timestamp (formatted as displayed)
      timestamp: new Date(request.timestamp).toLocaleString(),

      // Tab ID (only if available)
      ...(request.tab_id) && { tabId: request.tab_id }
    };

    return JSON.stringify(details, null, 2);
  };

  if (selectedField === 'details') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Request Details</h3>
            <button
              onClick={() => copyToClipboard(formatRequestDetailsOnly(request))}
              className="copy-button text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Method:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.method || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">URL:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1 break-all">{request.url || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                request.status >= 200 && request.status < 300 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                request.status >= 300 && request.status < 400 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                request.status >= 400 ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                {request.status || 'N/A'}
              </span>
            </div>
            {(request.payload_size || request.request_size || request.response_size || request.requestSize || request.responseSize || request.requestBody || request.request_body || request.responseBody || request.response_body) && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Size Breakdown:</span>
                <div className="mt-1 space-y-2">
                  {(() => {
                    const parseSize = (value: any): number => {
                      if (value === null || value === undefined) return 0;
                      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
                      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
                    };

                    const formatSize = (bytes: number): string =>
                      bytes > 0 ? `${(bytes / 1024).toFixed(2)}KB (${bytes} bytes)` : '0KB (0 bytes)';

                    const payloadSize = parseSize(request.payload_size);
                    const requestSize = parseSize(request.requestSize || request.request_size);
                    const responseSize = parseSize(request.responseSize || request.response_size);

                    // Calculate stored sizes (size of truncated bodies actually stored)
                    const calculateStoredSize = () => {
                      let storedRequestSize = 0;
                      let storedResponseSize = 0;
                      let storedHeaderSize = 0;

                      const requestBody = request.requestBody || request.request_body;
                      const responseBody = request.responseBody || request.response_body;

                      if (requestBody && typeof requestBody === 'string') {
                        storedRequestSize = new Blob([requestBody]).size;
                      }

                      if (responseBody && typeof responseBody === 'string') {
                        storedResponseSize = new Blob([responseBody]).size;
                      }

                      // Add header size (same calculation as stored size column)
                      if (request.headers) {
                        try {
                          const headerStr = typeof request.headers === 'string' ? request.headers : JSON.stringify(request.headers);
                          storedHeaderSize = new Blob([headerStr]).size;
                        } catch (e) {
                          // Ignore header size calculation errors
                        }
                      }

                      return {
                        storedRequestSize,
                        storedResponseSize,
                        storedHeaderSize,
                        totalStored: storedRequestSize + storedResponseSize + storedHeaderSize
                      };
                    };

                    const { storedRequestSize, storedResponseSize, storedHeaderSize, totalStored } = calculateStoredSize();

                    // Logic matching the tooltip
                    if (payloadSize > 0) {
                      return (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-900 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2"><strong>Original Size (before truncation):</strong></div>
                            <div><strong>Total:</strong> {formatSize(payloadSize)}</div>
                            {(requestSize > 0 || responseSize > 0) && (
                              <>
                                <div><strong>Request:</strong> {formatSize(requestSize)}</div>
                                <div><strong>Response:</strong> {formatSize(responseSize)}</div>
                              </>
                            )}
                          </div>
                          {totalStored > 0 && (
                            <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1 bg-blue-50 dark:bg-blue-900/50 p-3 rounded border border-blue-200 dark:border-blue-700">
                              <div className="text-xs text-blue-700 dark:text-blue-300 mb-2"><strong>Stored Size (after truncation):</strong></div>
                              <div><strong>Total Stored:</strong> {formatSize(totalStored)}</div>
                              {storedRequestSize > 0 && <div><strong>Request Stored:</strong> {formatSize(storedRequestSize)}</div>}
                              {storedResponseSize > 0 && <div><strong>Response Stored:</strong> {formatSize(storedResponseSize)}</div>}
                              {storedHeaderSize > 0 && <div><strong>Headers Stored:</strong> {formatSize(storedHeaderSize)}</div>}
                              {(payloadSize - totalStored > 0) && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                  <strong>Truncated:</strong> {formatSize(payloadSize - totalStored)} saved
                                </div>
                              )}
                              <div className="text-xs text-blue-600 dark:text-blue-300 mt-2 bg-blue-100 dark:bg-blue-900/50 p-2 rounded">
                                💡 <strong>Tip:</strong> Bodies are truncated to prevent memory issues. Default limit is 50KB per request/response.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else if (requestSize > 0 || responseSize > 0) {
                      return (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-900 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2"><strong>Original Size (before truncation):</strong></div>
                            <div><strong>Request:</strong> {formatSize(requestSize)}</div>
                            <div><strong>Response:</strong> {formatSize(responseSize)}</div>
                            <div><strong>Total:</strong> {formatSize(requestSize + responseSize)}</div>
                          </div>
                          {totalStored > 0 && (
                            <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1 bg-blue-50 dark:bg-blue-900/50 p-3 rounded border border-blue-200 dark:border-blue-700">
                              <div className="text-xs text-blue-700 dark:text-blue-300 mb-2"><strong>Stored Size (after truncation):</strong></div>
                              <div><strong>Total Stored:</strong> {formatSize(totalStored)}</div>
                              {storedRequestSize > 0 && <div><strong>Request Stored:</strong> {formatSize(storedRequestSize)}</div>}
                              {storedResponseSize > 0 && <div><strong>Response Stored:</strong> {formatSize(storedResponseSize)}</div>}
                              {storedHeaderSize > 0 && <div><strong>Headers Stored:</strong> {formatSize(storedHeaderSize)}</div>}
                              {((requestSize + responseSize) - totalStored > 0) && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                  <strong>Truncated:</strong> {formatSize((requestSize + responseSize) - totalStored)} saved
                                </div>
                              )}
                              <div className="text-xs text-blue-600 dark:text-blue-300 mt-2 bg-blue-100 dark:bg-blue-900/50 p-2 rounded">
                                💡 <strong>Tip:</strong> Bodies are truncated to prevent memory issues. Default limit is 50KB per request/response.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Try to estimate from body content
                      const requestBody = request.requestBody || request.request_body;
                      const responseBody = request.responseBody || request.response_body;

                      let estimatedRequest = 0;
                      let estimatedResponse = 0;

                      if (requestBody) estimatedRequest = new Blob([requestBody]).size;
                      if (responseBody) estimatedResponse = new Blob([responseBody]).size;

                      if (estimatedRequest > 0 || estimatedResponse > 0) {
                        return (
                          <div className="text-sm text-gray-900 dark:text-gray-300 space-y-1 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded border border-yellow-200 dark:border-yellow-700">
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-2"><strong>Stored Size (calculated from body content):</strong></div>
                            <div><strong>Request:</strong> {formatSize(estimatedRequest)}</div>
                            <div><strong>Response:</strong> {formatSize(estimatedResponse)}</div>
                            <div><strong>Total:</strong> {formatSize(estimatedRequest + estimatedResponse)}</div>
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                              Note: Bodies may have been truncated during capture
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            No size data available
                          </div>
                        );
                      }
                    }
                  })()}
                </div>
              </div>
            )}
            {request.response_time && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Time:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.response_time}ms</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{new Date(request.timestamp).toLocaleString()}</p>
            </div>
            {request.tab_id && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tab ID:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.tab_id}</p>
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
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {shouldTruncate && !expanded ? (
              <>
                {stringValue.substring(0, 50)}...
                <button
                  onClick={() => setExpanded(true)}
                  className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
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
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Request Headers ({Object.keys(requestHeaders).length})</h3>
              <button
                onClick={() => copyToClipboard(formatJSON(requestHeaders))}
                className="copy-button text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-x-auto">
              <table className="w-full detail-table table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="w-1/4 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Header</th>
                    <th className="w-1/2 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                    <th className="w-1/4 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(requestHeaders).map(([key, value]) => (
                    <tr key={key} className="table-row-hover hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-300 truncate">{key}</td>
                      <td className="px-4 py-2 max-w-0">
                        <div className="break-all">
                          <ExpandableHeaderValue value={String(value)} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => copyToClipboard(`${key}: ${value}`)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-left"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => copyToClipboard(String(value))}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-left"
                          >
                            Copy Value
                          </button>
                        </div>
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Response Headers ({Object.keys(responseHeaders).length})</h3>
              <button
                onClick={() => copyToClipboard(formatJSON(responseHeaders))}
                className="copy-button text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-x-auto">
              <table className="w-full detail-table table-fixed">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="w-1/4 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Header</th>
                    <th className="w-1/2 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                    <th className="w-1/4 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(responseHeaders).map(([key, value]) => (
                    <tr key={key} className="table-row-hover hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-300 truncate">{key}</td>
                      <td className="px-4 py-2 max-w-0">
                        <div className="break-all">
                          <ExpandableHeaderValue value={String(value)} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => copyToClipboard(`${key}: ${value}`)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-left"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => copyToClipboard(String(value))}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 text-left"
                          >
                            Copy Value
                          </button>
                        </div>
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

    // Get context-specific common reasons for status-only responses
    const getCommonReasons = (body: any, status?: number): string[] => {
      // Check if it's an 'ok' response
      if (typeof body === 'string' && body.trim().toLowerCase() === 'ok') {
        return [
          "Simple confirmation of successful operation",
          "API designed for minimal response payloads",
          "Action completed without needing to return data",
          "Lightweight response to reduce bandwidth usage",
          "Server acknowledges request completion"
        ];
      }

      // Status code specific reasons
      if (status) {
        if (status >= 200 && status < 300) {
          return [
            "Successful operation with minimal response data",
            "Server confirmation without detailed payload",
            "Action completed successfully",
            "Empty response body by design",
            "Status confirmation only"
          ];
        }

        if (status >= 400 && status < 500) {
          return [
            "Error details may be in HTML format",
            "Authentication or authorization failure",
            "Client request validation error",
            "Protected error information",
            "Custom error response format"
          ];
        }

        if (status >= 500) {
          return [
            "Server error with minimal details",
            "Internal processing failure",
            "Error response may be encrypted",
            "Server-side exception occurred",
            "System error with limited information"
          ];
        }
      }

      // Default reasons for other status-only responses
      return [
        "HTTPS encrypted responses",
        "Binary content (images, files, etc.)",
        "Compressed responses (gzip, deflate)",
        "Protected API endpoints",
        "Non-text content types"
      ];
    };
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
        // Simple success responses
        /^(ok|OK|Ok)\s*$/,
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
        // Special handling for 'ok' response
        if (typeof body === 'string' && body.trim().toLowerCase() === 'ok') {
          return "👌 Simple Success Response - Server returned 'ok' indicating successful operation without additional data";
        }

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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Request Body</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(typeof requestBody === 'string' ? prettyPrintIfJson(requestBody) : formatJSON(requestBody))}
                  className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Copy
                </button>

              </div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-auto max-h-96">{typeof requestBody === 'string' ? prettyPrintIfJson(requestBody) : formatJSON(requestBody)}</pre>
            </div>
          </div>
        )}

        {/* Response Body */}
        {responseBody && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Response Body</h3>
                {isStatusOnlyResponse(responseBody) && (
                  <div className="relative group">
                    <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-800 border border-yellow-300 dark:border-yellow-600 rounded-full flex items-center justify-center cursor-help">
                      <span className="text-yellow-600 dark:text-yellow-300 text-xs font-bold">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                      <div className="text-center">
                        <p className="font-medium mb-1">Why can't I see the response content?</p>
                        <p className="text-gray-300 dark:text-gray-400">{getBodyExplanation(responseBody, request.status)}</p>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 dark:bg-gray-700 rotate-45"></div>
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

              </div>
            </div>

            {/* Enhanced response body display with status explanation */}
            {isStatusOnlyResponse(responseBody) ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 dark:text-yellow-300 text-sm">📄</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Response Content Not Available</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">{getBodyExplanation(responseBody, request.status)}</p>
                    <div className="bg-yellow-100 dark:bg-yellow-800/50 rounded p-2 text-xs font-mono text-yellow-800 dark:text-yellow-200">
                      {responseBody}
                    </div>
                    <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                      <p><strong>Common reasons:</strong></p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {getCommonReasons(responseBody, request.status).map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4">
                <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-auto max-h-96">{typeof responseBody === 'string' ? prettyPrintIfJson(responseBody) : formatJSON(responseBody)}</pre>
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

  if (selectedField === 'performance') {
    const metrics = request.performanceMetrics;

    if (!metrics) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500">No performance timing data available for this request</div>
          <div className="text-sm text-gray-400 mt-2">
            Performance metrics are captured from the Resource Timing API and may not be available for all requests.
          </div>
        </div>
      );
    }

    // Calculate percentages for visualization - now includes requestWaiting
    const total = metrics.totalTime || (
      metrics.dnsLookup +
      metrics.tcpConnect +
      metrics.sslHandshake +
      (metrics.requestWaiting || 0) +
      metrics.timeToFirstByte +
      metrics.contentDownload
    );

    // Helper to format size with proper units
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Helper to create progress bars
    const ProgressBar: React.FC<{ value: number; total: number; color: string; label: string }> = ({ value, total, color, label }) => {
      const percentage = total > 0 ? (value / total) * 100 : 0;
      return (
        <div className="flex items-center space-x-3">
          <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">{label}:</div>
          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4 relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${color}`}
              style={{ width: `${Math.max(percentage, 2)}%` }}
            ></div>
          </div>
          <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right">
            {value > 0 ? `${value}ms` : '-'}
          </div>
          <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right">
            {percentage > 0 ? `${Math.round(percentage)}%` : '-'}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Performance Timing Breakdown</h3>
            <button
              onClick={() => copyToClipboard(formatJSON(metrics))}
              className="copy-button text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Copy Metrics
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <ProgressBar value={metrics.dnsLookup} total={total} color="bg-blue-500" label="DNS Lookup" />
            <ProgressBar value={metrics.tcpConnect} total={total} color="bg-green-500" label="TCP Connect" />
            <ProgressBar value={metrics.sslHandshake} total={total} color="bg-yellow-500" label="SSL Handshake" />
            <ProgressBar value={metrics.requestWaiting} total={total} color="bg-indigo-500" label="Request Waiting" />
            <ProgressBar value={metrics.timeToFirstByte} total={total} color="bg-orange-500" label="Time to First Byte" />
            <ProgressBar value={metrics.contentDownload} total={total} color="bg-purple-500" label="Content Download" />
            <ProgressBar value={metrics.redirectTime} total={total} color="bg-gray-500" label="Redirect Time" />

            <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-4">
              <div className="flex items-center space-x-3">
                <div className="w-32 text-sm font-bold text-gray-900 dark:text-gray-300">Total Time:</div>
                <div className="flex-1 bg-gray-300 dark:bg-gray-600 rounded-full h-5 relative overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 via-indigo-500 via-orange-500 to-purple-500 rounded-full"></div>
                </div>
                <div className="w-16 text-sm font-bold text-gray-900 dark:text-gray-300 text-right">
                  {total > 0 ? `${total}ms` : '-'}
                </div>
                <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right">100%</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Transfer Information</h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">

            {/* Size Breakdown Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-400 p-3 mb-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">📊 Size Breakdown</h4>
              <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <div><strong>Transfer Size:</strong> Total bytes over network (headers + compressed body)</div>
                <div><strong>Encoded Body:</strong> Response body size (compressed/as-received)</div>
                <div><strong>Decoded Body:</strong> Response body size (uncompressed/final)</div>
                <div className="mt-2 text-blue-600 dark:text-blue-400">
                  <strong>Why Transfer Size is larger:</strong> Includes HTTP headers (~200-400 bytes)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Transfer Size:</span>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatSize(metrics.transferSize)}</p>
                  <span className="text-xs text-gray-500">(headers + body)</span>
                </div>
                {metrics.transferSize > 0 && metrics.encodedBodySize >= 0 && (
                  <div className="text-xs text-gray-500">
                    Headers: ~{formatSize(Math.max(0, metrics.transferSize - metrics.encodedBodySize))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Encoded Body Size:</span>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatSize(metrics.encodedBodySize)}</p>
                  <span className="text-xs text-gray-500">(compressed)</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Decoded Body Size:</span>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{formatSize(metrics.decodedBodySize)}</p>
                  <span className="text-xs text-gray-500">(uncompressed)</span>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Cache Status:</span>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    metrics.cacheStatus === 'hit' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    metrics.cacheStatus === 'miss' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {metrics.cacheStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Compression Analysis */}
            {metrics.encodedBodySize > 0 && metrics.decodedBodySize > 0 && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">🗜️ Compression Analysis</h4>
                {metrics.encodedBodySize < metrics.decodedBodySize ? (
                  <div className="space-y-1">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      <strong>{Math.round((1 - metrics.encodedBodySize / metrics.decodedBodySize) * 100)}% compression savings</strong>
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Saved {formatSize(metrics.decodedBodySize - metrics.encodedBodySize)} through compression
                    </p>
                  </div>
                ) : metrics.encodedBodySize === metrics.decodedBodySize ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No compression applied (sizes match)</p>
                ) : (
                  <p className="text-sm text-orange-600 dark:text-orange-400">Encoded size larger than decoded (unusual)</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Size Metrics Comparison */}
        {(() => {
          const parseSize = (value: any): number => {
            if (value === null || value === undefined) return 0;
            const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(parsed) || parsed < 0 ? 0 : parsed;
          };

          const payloadSize = parseSize(request.payload_size);
          const requestSize = parseSize(request.requestSize || request.request_size);
          const responseSize = parseSize(request.responseSize || request.response_size);
          const transferSize = metrics.transferSize || 0;
          const encodedBodySize = metrics.encodedBodySize || 0;
          const decodedBodySize = metrics.decodedBodySize || 0;

          // Show section if we have any size data
          if (payloadSize > 0 || requestSize > 0 || responseSize > 0 || transferSize > 0 || encodedBodySize > 0 || decodedBodySize > 0) {
            const maxSize = Math.max(payloadSize, requestSize, responseSize, transferSize, encodedBodySize, decodedBodySize);

            const SizeBar: React.FC<{ value: number; label: string; color: string; tooltip: string }> = ({ value, label, color, tooltip }) => {
              const percentage = maxSize > 0 ? (value / maxSize) * 100 : 0;
              return (
                <div className="flex items-center space-x-3" title={tooltip}>
                  <div className="w-32 text-sm font-medium text-gray-700">{label}:</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${color}`}
                      style={{ width: `${Math.max(percentage, value > 0 ? 2 : 0)}%` }}
                    ></div>
                  </div>
                  <div className="w-16 text-sm text-gray-600 text-right">
                    {value > 0 ? formatSize(value) : '-'}
                  </div>
                  <div className="w-12 text-xs text-gray-500 text-right">
                    {percentage > 0 ? `${Math.round(percentage)}%` : '-'}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Size Metrics Comparison</h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  {/* Application-level sizes */}
                  {payloadSize > 0 && (
                    <SizeBar
                      value={payloadSize}
                      label="Total Size"
                      color="bg-blue-500"
                      tooltip="Total payload size calculated by our extension from intercepted request/response bodies"
                    />
                  )}
                  {requestSize > 0 && (
                    <SizeBar
                      value={requestSize}
                      label="Request Size"
                      color="bg-green-500"
                      tooltip="Size of request body data captured by our extension"
                    />
                  )}
                  {responseSize > 0 && (
                    <SizeBar
                      value={responseSize}
                      label="Response Size"
                      color="bg-purple-500"
                      tooltip="Size of response body data captured by our extension"
                    />
                  )}

                  {/* Browser Resource Timing API sizes */}
                  {transferSize > 0 && (
                    <SizeBar
                      value={transferSize}
                      label="Transfer Size"
                      color="bg-orange-500"
                      tooltip="Total bytes transferred over the network including headers and compression (from Resource Timing API)"
                    />
                  )}
                  {encodedBodySize > 0 && (
                    <SizeBar
                      value={encodedBodySize}
                      label="Encoded Body"
                      color="bg-yellow-500"
                      tooltip="Size of response body after compression/encoding but before decompression (from Resource Timing API)"
                    />
                  )}
                  {decodedBodySize > 0 && (
                    <SizeBar
                      value={decodedBodySize}
                      label="Decoded Body"
                      color="bg-red-500"
                      tooltip="Size of response body after decompression/decoding (from Resource Timing API)"
                    />
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3">
                  <p><strong>Size Metrics Info:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>Transfer Size</strong> includes headers and represents actual network bytes</li>
                    <li><strong>Encoded vs Decoded</strong> shows compression effectiveness (gzip, deflate, etc.)</li>
                  </ul>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="text-xs text-gray-500">
          <p><strong>Note:</strong> Performance metrics are captured using the Resource Timing API.</p>
          <p>Some values may be zero for cross-origin requests without proper CORS timing headers.</p>
        </div>
      </div>
    );
  }

  // Response field - focused on response data
  if (selectedField === 'response') {
    const responseBody = request.response_body || request.responseBody || request.response_data;
    let responseHeaders = {};

    try {
      // Parse response headers
      if (request.headers) {
        const headerData = typeof request.headers === 'string' ? JSON.parse(request.headers) : request.headers;
        responseHeaders = headerData.response || {};
      } else if (request.response_headers) {
        responseHeaders = typeof request.response_headers === 'string' ? JSON.parse(request.response_headers) : request.response_headers;
      }
    } catch (e) {
      console.error('Error parsing response headers:', e);
      responseHeaders = {};
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Response Data</h3>
          <button
            onClick={() => copyToClipboard(responseBody || 'No response body')}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy Response
          </button>
        </div>

        {/* Response Status */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
              request.status >= 200 && request.status < 300 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
              request.status >= 300 && request.status < 400 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
              request.status >= 400 ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {request.status || 'N/A'}
            </span>
          </div>

          {/* Response Size */}
          {(request.responseSize || request.response_size) && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Size:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">
                {(() => {
                  const size = request.responseSize || request.response_size;
                  return typeof size === 'number' ? `${(size / 1024).toFixed(2)}KB (${size} bytes)` : size;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* Response Headers */}
        {Object.keys(responseHeaders).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Response Headers</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto">
              {Object.entries(responseHeaders).map(([key, value]) => (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-400">{key}:</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 break-all ml-2">{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response Body */}
        {responseBody && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Response Body</h4>
            <div className="bg-gray-900 rounded-lg p-3">
              <pre className="text-xs text-green-400 whitespace-pre-wrap overflow-auto max-h-64">
                {(() => {
                  try {
                    // Try to pretty-print JSON
                    const parsed = JSON.parse(responseBody);
                    return JSON.stringify(parsed, null, 2);
                  } catch {
                    // Return as-is if not JSON
                    return responseBody;
                  }
                })()}
              </pre>
            </div>
          </div>
        )}

        {!responseBody && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No response body data available
          </div>
        )}
      </div>
    );
  }

  // Timing field - simplified timing information
  if (selectedField === 'timing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Timing Information</h3>
          <button
            onClick={() => copyToClipboard(JSON.stringify({
              response_time: request.response_time,
              duration: request.duration,
              time_taken: request.time_taken,
              timestamp: request.timestamp
            }, null, 2))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy Timing
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          {/* Response Time */}
          {request.response_time && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Time:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.response_time}ms</p>
            </div>
          )}

          {/* Duration */}
          {request.duration && request.duration !== request.response_time && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.duration}ms</p>
            </div>
          )}

          {/* Time Taken */}
          {request.time_taken && request.time_taken !== request.response_time && request.time_taken !== request.duration && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Taken:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{request.time_taken}ms</p>
            </div>
          )}

          {/* Timestamp */}
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Request Time:</span>
            <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{new Date(request.timestamp).toLocaleString()}</p>
          </div>

          {/* Performance Metrics Summary (if available) */}
          {request.performanceMetrics && (
            <div className="border-t border-gray-200 pt-3">
              <span className="text-sm font-medium text-gray-700">Performance Summary:</span>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                {request.performanceMetrics.totalTime && (
                  <div>Total: {request.performanceMetrics.totalTime}ms</div>
                )}
                {request.performanceMetrics.timeToFirstByte && (
                  <div>TTFB: {request.performanceMetrics.timeToFirstByte}ms</div>
                )}
                {request.performanceMetrics.contentDownload && (
                  <div>Download: {request.performanceMetrics.contentDownload}ms</div>
                )}
                <div className="text-xs text-blue-600 mt-1">
                  <em>See "Performance" tab for detailed breakdown</em>
                </div>
              </div>
            </div>
          )}

          {!request.response_time && !request.duration && !request.time_taken && (
            <div className="text-sm text-gray-500 italic">
              No timing data available for this request
            </div>
          )}
        </div>
      </div>
    );
  }

  // Raw JSON field
  if (selectedField === 'rawjson') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Raw JSON Data</h3>
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

  const formatConsoleErrorDetailsOnly = (error: any) => {
    const details = {
      message: error.message || 'N/A',
      ...(error.url) && { url: error.url },
      ...(error.line) && { line: error.line },
      ...(error.column) && { column: error.column },
      ...(error.severity) && { severity: error.severity },
      timestamp: new Date(error.timestamp).toLocaleString()
    };

    return JSON.stringify(details, null, 2);
  };

  if (selectedField === 'details') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Error Details</h3>
            <button
              onClick={() => copyToClipboard(formatConsoleErrorDetailsOnly(error))}
              className="text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Message:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{error.message}</p>
            </div>
            {error.url && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">URL:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1 break-all">{error.url}</p>
              </div>
            )}
            {error.line && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Line:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{error.line}</p>
              </div>
            )}
            {error.column && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Column:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{error.column}</p>
              </div>
            )}
            {error.severity && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity:</span>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                  error.severity === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                  error.severity === 'warn' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                  'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                }`}>
                  {error.severity}
                </span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp:</span>
              <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{new Date(error.timestamp).toLocaleString()}</p>
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Stack Trace</h3>
          <button
            onClick={() => copyToClipboard(error.stack_trace || error.stack || 'No stack trace available')}
            className="copy-button text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
          >
            Copy
          </button>
        </div>

        {(error.stack_trace || error.stack) ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <details className="cursor-pointer" open>
              <summary className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium mb-2">
                View Full Stack Trace
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-96 font-mono text-gray-800 dark:text-gray-300">
                {error.stack_trace || error.stack}
              </pre>
            </details>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">No stack trace available</div>
          </div>
        )}
      </div>
    );
  }

  if (selectedField === 'message') {
    const formatJSON = (obj: any) => {
      try {
        const maxDisplaySize = 10000; // 10KB limit for console error message display
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
        return jsonString.length > maxDisplaySize ?
          jsonString.substring(0, maxDisplaySize) + '...\n[Truncated for display]' :
          jsonString;
      } catch (e) {
        return String(obj);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Console Error Message & Data</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(error))}
            className="copy-button text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
          >
            Copy Full Error Data
          </button>
        </div>

        <div className="space-y-4">
          {/* Primary Message */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Error Message</h4>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 border border-red-200 dark:border-red-700">
              <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap font-mono">{error.message || 'No message available'}</pre>
            </div>
          </div>

          {/* Raw Error Object */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Complete Error Object</h4>
            <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4">
              <pre className="text-sm text-green-400 dark:text-green-300 whitespace-pre-wrap overflow-auto max-h-96">{formatJSON(error)}</pre>
            </div>
          </div>

          {/* Additional Context if Available */}
          {error.url && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Context</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-sm">
                  <span className="font-medium dark:text-gray-300">URL:</span> <span className="text-blue-600 dark:text-blue-400 break-all">{error.url}</span>
                </div>
                {error.line && (
                  <div className="text-sm dark:text-gray-300 mt-1">
                    <span className="font-medium">Location:</span> Line {error.line}{error.column ? `:${error.column}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
  networkRequests?: any[];
}> = ({ tokenEvent, selectedField, showFullTokenHash = false, settings, networkRequests = [] }) => {
  const [activeNetworkView, setActiveNetworkView] = useState<string>('details');

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

  const formatTokenEventDetailsOnly = (tokenEvent: any) => {
    const details = {
      ...(tokenEvent.url) && { url: tokenEvent.url },
      ...(tokenEvent.method || tokenEvent.request_method) && {
        method: tokenEvent.method || tokenEvent.request_method
      },
      ...(tokenEvent.status || tokenEvent.response_status) && {
        status: tokenEvent.status || tokenEvent.response_status
      },
      ...(tokenEvent.valueHash || tokenEvent.value_hash) && {
        valueHash: tokenEvent.valueHash || tokenEvent.value_hash
      },
      ...(tokenEvent.timestamp) && {
        timestamp: new Date(tokenEvent.timestamp).toLocaleString()
      }
    };

    return JSON.stringify(details, null, 2);
  };

  // Enhanced matching logic for finding related network request
  const findMatchingNetworkRequest = (tokenEvent: any) => {
    if (!networkRequests || networkRequests.length === 0) return null;

    const tokenUrl = tokenEvent.url;
    const tokenMethod = (tokenEvent.method || tokenEvent.request_method || '').toUpperCase();
    const tokenStatus = tokenEvent.status || tokenEvent.response_status;
    const tokenTimestamp = new Date(tokenEvent.timestamp).getTime();

    // Enhanced matching with multiple strategies
    const candidates = networkRequests.filter(req => {
      // Must have same URL (exact match)
      if (req.url !== tokenUrl) return false;

      // Must have same method (case-insensitive)
      const reqMethod = (req.method || '').toUpperCase();
      if (reqMethod !== tokenMethod) return false;

      return true;
    });

    if (candidates.length === 0) return null;

    // Strategy 1: Find exact timestamp + status match (within 2 seconds)
    let match = candidates.find(req => {
      const reqTimestamp = new Date(req.timestamp).getTime();
      const timeDiff = Math.abs(reqTimestamp - tokenTimestamp);
      const statusMatch = req.status === tokenStatus || req.response_status === tokenStatus;

      return timeDiff <= 2000 && statusMatch; // 2 second tolerance + status match
    });

    if (match) return match;

    // Strategy 2: Find closest timestamp match (within 10 seconds)
    const closeMatches = candidates.filter(req => {
      const reqTimestamp = new Date(req.timestamp).getTime();
      const timeDiff = Math.abs(reqTimestamp - tokenTimestamp);
      return timeDiff <= 10000; // 10 second tolerance
    });

    if (closeMatches.length === 1) return closeMatches[0];

    // Strategy 3: Find best timestamp match with status preference
    if (closeMatches.length > 1) {
      // Prefer status matches
      const statusMatches = closeMatches.filter(req =>
        req.status === tokenStatus || req.response_status === tokenStatus
      );

      if (statusMatches.length > 0) {
        // Return closest timestamp among status matches
        return statusMatches.reduce((closest, req) => {
          const reqTime = new Date(req.timestamp).getTime();
          const closestTime = new Date(closest.timestamp).getTime();
          const reqDiff = Math.abs(reqTime - tokenTimestamp);
          const closestDiff = Math.abs(closestTime - tokenTimestamp);

          return reqDiff < closestDiff ? req : closest;
        });
      }

      // No status matches, return closest by time
      return closeMatches.reduce((closest, req) => {
        const reqTime = new Date(req.timestamp).getTime();
        const closestTime = new Date(closest.timestamp).getTime();
        const reqDiff = Math.abs(reqTime - tokenTimestamp);
        const closestDiff = Math.abs(closestTime - tokenTimestamp);

        return reqDiff < closestDiff ? req : closest;
      });
    }

    // Strategy 4: Last resort - any URL/method match (expand tolerance to 30 seconds)
    const anyMatch = candidates.find(req => {
      const reqTimestamp = new Date(req.timestamp).getTime();
      const timeDiff = Math.abs(reqTimestamp - tokenTimestamp);
      return timeDiff <= 30000; // 30 second tolerance
    });

    return anyMatch || null;
  };  if (selectedField === 'details') {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Token Event Details</h3>
            <button
              onClick={() => copyToClipboard(formatTokenEventDetailsOnly(tokenEvent))}
              className="text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            {tokenEvent.url && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">URL:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1 break-all">{tokenEvent.url}</p>
              </div>
            )}
            {(tokenEvent.method || tokenEvent.request_method) && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Method:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{tokenEvent.method || tokenEvent.request_method}</p>
              </div>
            )}
            {(tokenEvent.status || tokenEvent.response_status) && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Status:</span>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                  (tokenEvent.status || tokenEvent.response_status) >= 200 && (tokenEvent.status || tokenEvent.response_status) < 300 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                  (tokenEvent.status || tokenEvent.response_status) >= 300 && (tokenEvent.status || tokenEvent.response_status) < 400 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                  (tokenEvent.status || tokenEvent.response_status) >= 400 ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {tokenEvent.status || tokenEvent.response_status}
                </span>
              </div>
            )}
            {(tokenEvent.valueHash || tokenEvent.value_hash) && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Value Hash:</span>
                <div className="mt-1 flex items-center space-x-2">
                  <p className="text-sm text-gray-900 dark:text-gray-300 font-mono">
                    {formatHashValue(tokenEvent.valueHash || tokenEvent.value_hash)}
                  </p>
                  {!showFullTokenHash && (tokenEvent.valueHash || tokenEvent.value_hash) &&
                   (tokenEvent.valueHash || tokenEvent.value_hash).length > 16 &&
                   /^[a-fA-F0-9]+$/.test(tokenEvent.valueHash || tokenEvent.value_hash) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 italic">(truncated - see Raw JSON for full value)</span>
                  )}
                </div>
              </div>
            )}
            {tokenEvent.timestamp && (
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Timestamp:</span>
                <p className="text-sm text-gray-900 dark:text-gray-300 mt-1">{new Date(tokenEvent.timestamp).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Related Network Request Section */}
        {(() => {
          const matchingRequest = findMatchingNetworkRequest(tokenEvent);
          return matchingRequest ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">🔗 Related Network Request</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs font-medium text-green-800 dark:text-green-400">Match found</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(matchingRequest, null, 2))}
                    className="text-xs bg-green-500 dark:bg-green-600 text-white px-2 py-1 rounded hover:bg-green-600 dark:hover:bg-green-700"
                  >
                    Copy Full Data
                  </button>
                </div>
              </div>

              {/* Network Request Detail Tabs */}
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                {/* Tab Navigation */}
                <div className="flex border-b border-green-200 dark:border-green-700">
                  {['details', 'headers', 'request', 'response'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveNetworkView(tab)}
                      className={`px-4 py-2 text-sm font-medium capitalize ${
                        activeNetworkView === tab
                          ? 'text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-800 border-b-2 border-green-500'
                          : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-800/50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  <RequestDetailContent
                    request={matchingRequest}
                    selectedField={activeNetworkView}
                    settings={settings}
                  />
                </div>

                <div className="px-4 pb-3">
                  <div className="text-xs text-green-700 dark:text-green-300 italic bg-green-100 dark:bg-green-800/50 rounded p-2">
                    💡 <strong>Complete Network Request Details:</strong> This shows the full network request data
                    that corresponds to this token event, including all headers, request/response bodies, and metadata.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">🔗 Related Network Request</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">No matching network request found</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The related network request data is not available. This could happen if:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-4 space-y-1">
                  <li>• The request was processed before network interception was enabled</li>
                  <li>• The network request has been cleaned up from storage</li>
                  <li>• There's a timing mismatch between token and network data</li>
                  <li>• The enhanced matching algorithm couldn't find a suitable match</li>
                </ul>
                <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-800/50 rounded text-xs text-yellow-800 dark:text-yellow-300">
                  <strong>Enhanced Matching:</strong> URL + Method + Status + Timestamp with multi-strategy fallback
                </div>
              </div>
            </div>
          );
        })()}
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Headers ({Object.keys(headers).length})</h3>
              <button
                onClick={() => copyToClipboard(JSON.stringify(headers, null, 2))}
                className="copy-button text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
              <table className="min-w-full detail-table">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Header</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(headers).map(([key, value]) => (
                    <tr key={key} className="table-row-hover">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-300">{key}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 break-all">{String(value)}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => copyToClipboard(`${key}: ${value}`)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => copyToClipboard(String(value))}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
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
            <div className="text-gray-500 dark:text-gray-400">No header data available for this token event</div>
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Raw Token Event Data</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(tokenEvent))}
            className="text-xs bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-600 dark:hover:bg-blue-700"
          >
            Copy JSON
          </button>
        </div>
        <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4">
          <pre className="text-sm text-green-400 dark:text-green-300 whitespace-pre-wrap overflow-auto max-h-96">
            {formatJSON(tokenEvent)}
          </pre>
        </div>
        {settings?.networkInterception?.bodyCapture?.maxBodySize !== 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Display limited by settings (max: {settings?.networkInterception?.bodyCapture?.maxBodySize || 5000} chars)
          </p>
        )}
      </div>
    );
  }

  return <div className="text-gray-500 dark:text-gray-400">No data available for selected field.</div>;
};
