import React, { useState } from 'react';

interface DetailViewerProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  type: 'request' | 'error' | 'token';
  showFullTokenHash?: boolean;
}

const EnhancedDetailViewer: React.FC<DetailViewerProps> = ({
  isOpen,
  onClose,
  item,
  type,
  showFullTokenHash = false
}) => {
  const [selectedField, setSelectedField] = useState('details');

  if (!isOpen || !item) return null;

  const copyToClipboard = (text: string) => {
    // MEMORY LEAK PREVENTION: Limit clipboard data size
    const maxClipboardSize = 10000;
    const copyText = text.length > maxClipboardSize ? 
      text.substring(0, maxClipboardSize) + '\n[Truncated for clipboard]' : 
      text;
    
    navigator.clipboard.writeText(copyText).catch(error => {
      console.warn('Failed to copy to clipboard:', error);
    });
  };

  const formatJSON = (obj: any) => {
    try {
      // MEMORY LEAK PREVENTION: Safe JSON formatting with size limits
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
      return jsonString.length > 5000 ? jsonString.substring(0, 5000) + '...' : jsonString;
    } catch {
      return obj;
    }
  };

  const getAvailableFields = () => {
    // For errors: show details and stack only (raw JSON not useful for debugging)
    // For requests: show details, headers, body, and raw JSON (all relevant)
    // For tokens: show details and raw JSON (for advanced debugging)
    
    if (type === 'error') {
      const fields = ['details'];
      if (item.stack || item.stackTrace) fields.push('stack');
      return fields; // No raw JSON for errors - it's redundant
    }
    
    if (type === 'request') {
      const fields = ['details'];
      const hasHeaders = item.headers || item.request_headers || item.response_headers;
      const hasBody = item.request_body || item.response_body || item.requestBody || item.responseBody;
      
      if (hasHeaders) fields.push('headers');
      if (hasBody) fields.push('body');
      fields.push('raw'); // Keep raw JSON for requests - useful for API debugging
      return fields;
    }
    
    if (type === 'token') {
      return ['details', 'raw']; // Keep raw JSON for tokens - useful for advanced debugging
    }
    
    return ['details', 'raw']; // Default fallback
  };

  const renderFieldSelector = () => {
    const fields = getAvailableFields();
    
    return (
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        {fields.map((field) => (
          <button
            key={field}
            onClick={() => setSelectedField(field)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedField === field
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {field === 'details' && '📋 Details'}
            {field === 'headers' && '🏷️ Headers'}
            {field === 'body' && '📄 Body'}
            {field === 'stack' && '📚 Stack'}
            {field === 'raw' && '🔍 Raw JSON'}
          </button>
        ))}
      </div>
    );
  };

  const renderRequestDetails = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Request Details</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(item))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy All
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Method:</span>
            <p className="text-sm text-gray-900 mt-1">{item.method || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">URL:</span>
            <p className="text-sm text-gray-900 mt-1 break-all">{item.url || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
              item.status >= 200 && item.status < 300 ? 'bg-green-100 text-green-800' :
              item.status >= 300 && item.status < 400 ? 'bg-yellow-100 text-yellow-800' :
              item.status >= 400 ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {item.status || 'N/A'}
            </span>
          </div>
          {item.payload_size && (
            <div>
              <span className="text-sm font-medium text-gray-700">Payload Size:</span>
              <p className="text-sm text-gray-900 mt-1">{Math.round(item.payload_size / 1024)}KB</p>
            </div>
          )}
          {(item.response_time || item.time_taken) && (
            <div>
              <span className="text-sm font-medium text-gray-700">Response Time:</span>
              <p className="text-sm text-gray-900 mt-1">{item.response_time || item.time_taken}ms</p>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-700">Timestamp:</span>
            <p className="text-sm text-gray-900 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
          </div>
          {item.tab_id && (
            <div>
              <span className="text-sm font-medium text-gray-700">Tab ID:</span>
              <p className="text-sm text-gray-900 mt-1">{item.tab_id}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderErrorDetails = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Error Details</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(item))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy All
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Severity:</span>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
              item.severity === 'error' ? 'bg-red-100 text-red-800' :
              item.severity === 'warn' ? 'bg-yellow-100 text-yellow-800' :
              item.severity === 'info' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {item.severity?.toUpperCase() || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Message:</span>
            <p className="text-sm text-gray-900 mt-1 break-words">{item.message || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">URL:</span>
            <p className="text-sm text-gray-900 mt-1 break-all">{item.url || 'N/A'}</p>
          </div>
          {(item.line || item.column) && (
            <div>
              <span className="text-sm font-medium text-gray-700">Location:</span>
              <p className="text-sm text-gray-900 mt-1">
                Line {item.line || 'N/A'}, Column {item.column || 'N/A'}
              </p>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-700">Timestamp:</span>
            <p className="text-sm text-gray-900 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
          </div>
          {item.tab_id && (
            <div>
              <span className="text-sm font-medium text-gray-700">Tab ID:</span>
              <p className="text-sm text-gray-900 mt-1">{item.tab_id}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTokenDetails = () => {
    const formatHash = (hash: string) => {
      if (!hash) return 'N/A';
      if (showFullTokenHash) return hash;
      return hash.length > 16 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Token Event Details</h3>
          <button
            onClick={() => copyToClipboard(formatJSON(item))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy All
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Event Type:</span>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
              item.type === 'acquire' ? 'bg-green-100 text-green-800' :
              item.type === 'use' ? 'bg-blue-100 text-blue-800' :
              item.type === 'refresh' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {item.type?.toUpperCase() || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Token Type:</span>
            <p className="text-sm text-gray-900 mt-1">{item.tokenType || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">URL:</span>
            <p className="text-sm text-gray-900 mt-1 break-all">{item.url || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Method:</span>
            <p className="text-sm text-gray-900 mt-1">{item.method || 'N/A'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Value Hash:</span>
            <p className="text-sm text-gray-900 mt-1 font-mono">{formatHash(item.valueHash)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Timestamp:</span>
            <p className="text-sm text-gray-900 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
          </div>
          {item.tab_id && (
            <div>
              <span className="text-sm font-medium text-gray-700">Tab ID:</span>
              <p className="text-sm text-gray-900 mt-1">{item.tab_id}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHeaders = () => {
    let requestHeaders = {};
    let responseHeaders = {};
    
    try {
      if (item.headers) {
        const headerData = typeof item.headers === 'string' ? JSON.parse(item.headers) : item.headers;
        requestHeaders = headerData.request || {};
        responseHeaders = headerData.response || {};
      } else {
        if (item.request_headers) {
          requestHeaders = typeof item.request_headers === 'string' ? JSON.parse(item.request_headers) : item.request_headers;
        }
        if (item.response_headers) {
          responseHeaders = typeof item.response_headers === 'string' ? JSON.parse(item.response_headers) : item.response_headers;
        }
      }
    } catch (e) {
      console.error('Error parsing headers:', e);
    }

    return (
      <div className="space-y-6">
        {Object.keys(requestHeaders).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Request Headers ({Object.keys(requestHeaders).length})</h3>
              <button
                onClick={() => copyToClipboard(formatJSON(requestHeaders))}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(requestHeaders).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">{key}</div>
                    <div className="text-sm text-gray-600 mt-1 break-all">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {Object.keys(responseHeaders).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Response Headers ({Object.keys(responseHeaders).length})</h3>
              <button
                onClick={() => copyToClipboard(formatJSON(responseHeaders))}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(responseHeaders).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">{key}</div>
                    <div className="text-sm text-gray-600 mt-1 break-all">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {Object.keys(requestHeaders).length === 0 && Object.keys(responseHeaders).length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No header data available for this request</div>
          </div>
        )}
      </div>
    );
  };

  const renderBody = () => {
    const requestBody = item.request_body || item.requestBody;
    const responseBody = item.response_body || item.responseBody || item.response_data;

    return (
      <div className="space-y-6">
        {requestBody && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Request Body</h3>
              <button
                onClick={() => copyToClipboard(String(requestBody))}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Copy
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap overflow-auto max-h-64">
                {typeof requestBody === 'string' ? requestBody : formatJSON(requestBody)}
              </pre>
            </div>
          </div>
        )}

        {responseBody && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Response Body</h3>
              <button
                onClick={() => copyToClipboard(String(responseBody))}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Copy
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap overflow-auto max-h-64">
                {typeof responseBody === 'string' ? responseBody : formatJSON(responseBody)}
              </pre>
            </div>
          </div>
        )}

        {!requestBody && !responseBody && (
          <div className="text-center py-8">
            <div className="text-gray-500">No body data available for this request</div>
          </div>
        )}
      </div>
    );
  };

  const renderStack = () => {
    const stack = item.stack || item.stackTrace;
    
    if (!stack) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500">No stack trace available for this error</div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Stack Trace</h3>
          <button
            onClick={() => copyToClipboard(String(stack))}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-900 whitespace-pre-wrap overflow-auto max-h-96">
            {String(stack)}
          </pre>
        </div>
      </div>
    );
  };

  const renderRawJSON = () => {
    // MEMORY LEAK PREVENTION: Create safe JSON with size limits
    const createSafeJSON = (obj: any) => {
      try {
        // Handle circular references and limit depth
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
        
        // Limit size to prevent memory issues (max 50KB)
        if (jsonString.length > 50000) {
          return jsonString.substring(0, 50000) + '\n\n... [Truncated - JSON too large]';
        }
        
        return jsonString;
      } catch (error) {
        return `Error serializing object: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    };

    const safeJSON = createSafeJSON(item);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Raw JSON Data</h3>
          <button
            onClick={() => {
              // MEMORY LEAK PREVENTION: Copy limited JSON to prevent clipboard issues
              const copyText = safeJSON.length > 10000 ? 
                safeJSON.substring(0, 10000) + '\n\n[Truncated for clipboard]' : 
                safeJSON;
              copyToClipboard(copyText);
            }}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Copy
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-auto max-h-96">
            {safeJSON}
          </pre>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (selectedField) {
      case 'details':
        if (type === 'request') return renderRequestDetails();
        if (type === 'error') return renderErrorDetails();
        if (type === 'token') return renderTokenDetails();
        break;
      case 'headers':
        return renderHeaders();
      case 'body':
        return renderBody();
      case 'stack':
        return renderStack();
      case 'raw':
        return renderRawJSON();
      default:
        return renderRawJSON();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-[90vw] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {type === 'request' ? 'Request Details' :
               type === 'error' ? 'Error Details' : 'Token Event Details'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Field Selector */}
          {renderFieldSelector()}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDetailViewer;
