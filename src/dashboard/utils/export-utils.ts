// Export utility functions for data tables
export interface ExportOptions {
  tables: ('network' | 'errors' | 'tokens')[];
  format: 'csv' | 'pdf' | 'docx';
  includeDetails: { [key: string]: boolean }; // Per-table detail inclusion
  pageSelection: 'current' | 'all' | 'range';
  pageRanges?: { [key: string]: { from: number; to: number } }; // e.g., { network: { from: 1, to: 5 }, errors: { from: 1, to: 3 } }
}

export interface NetworkRequest {
  id?: string;
  method: string;
  url: string;
  status: number;
  payload_size?: number;
  requestSize?: number;
  responseSize?: number;
  request_size?: number;
  response_size?: number;
  timestamp: string;
  headers?: any;
  request_headers?: any;
  response_headers?: any;
  requestBody?: string;
  responseBody?: string;
  request_body?: string;
  response_body?: string;
  response_time?: number;
  time_taken?: number;
  duration?: number;
  performanceMetrics?: any;
}

export interface ConsoleError {
  id: string;
  message: string;
  url?: string;
  line?: number;
  column?: number;
  severity: string;
  timestamp: string;
  stack?: string;
  stack_trace?: string;
}

export interface TokenEvent {
  id?: string;
  type: string;
  tokenType?: string;
  token_type?: string;
  url?: string;
  method?: string;
  status?: number;
  valueHash?: string;
  value_hash?: string;
  expiry?: string;
  timestamp: string;
}

// CSV Export Functions
export const _exportNetworkRequestsToCSV = (requests: NetworkRequest[], includeDetails: boolean = false): string => {
  if (!requests || requests.length === 0) {
    return 'No network requests to export\n';
  }

  // Basic headers
  const _headers = ['Method', 'URL', 'Status', 'Size (KB)', 'Response Time (ms)', 'Timestamp'];

  // Add detailed headers matching what's shown in the actual detailed view
  if (includeDetails) {
    headers.push(
      'Tab-ID', 'Request-Headers', 'Response-Headers', 'Request-Body', 'Response-Body'
    );
  }

  // Helper function to get size in KB
  const _getSize = (request: NetworkRequest): string => {
    const _size = request.payload_size || request.requestSize || request.request_size || 0;
    return size > 0 ? (size / 1024).toFixed(2) : '0';
  };

  // Helper function to get response time
  const _getResponseTime = (request: NetworkRequest): string => {
    return String(request.response_time || request.time_taken || request.duration || 0);
  };

  // Generate CSV rows
  const _rows = requests.map(request => {
    const _basicRow = [
      request.method || '',
      request.url || '',
      String(request.status || ''),
      getSize(request),
      getResponseTime(request),
      new Date(request.timestamp).toLocaleString()
    ];

    if (includeDetails) {
      // Include only fields that are actually shown in the detailed view
      const _tabId = (request as any).tab_id || '';

      // Headers as JSON strings (as shown in detailed view)
      let _reqHeadersStr = '';
      let _respHeadersStr = '';
      try {
        if (request.headers) {
          const _headerData = typeof request.headers === 'string' ? JSON.parse(request.headers) : request.headers;
          reqHeadersStr = JSON.stringify(headerData.request || {});
          respHeadersStr = JSON.stringify(headerData.response || {});
        } else {
          reqHeadersStr = JSON.stringify(request.request_headers || {});
          respHeadersStr = JSON.stringify(request.response_headers || {});
        }
      } catch (e) {
        reqHeadersStr = '{}';
        respHeadersStr = '{}';
      }

      // Body content (as shown in detailed view)
      const _reqBody = request.request_body || request.requestBody || '';
      const _respBody = request.response_body || request.responseBody || '';

      basicRow.push(tabId, reqHeadersStr, respHeadersStr, reqBody, respBody);
    }

    // Wrap each field in quotes and escape internal quotes
    return basicRow.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [
    '# Network Requests Export',
    `# Generated: ${new Date().toLocaleString()}`,
    `# Total Records: ${requests.length}`,
    '',
    headers.map(h => `"${h}"`).join(','),
    ...rows
  ].join('\n');
};

export const _exportConsoleErrorsToCSV = (errors: ConsoleError[], includeDetails: boolean = false): string => {
  if (!errors || errors.length === 0) {
    return 'No console errors to export\n';
  }

  // Basic headers
  const _headers = ['Severity', 'Message', 'URL', 'Line', 'Column', 'Timestamp'];

  // Add detailed headers matching what's shown in the actual detailed view
  if (includeDetails) {
    headers.push('Stack-Trace');
  }  // Helper function to truncate long messages
  const _truncateMessage = (message: string, maxLength: number = 500): string => {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };



  // Generate CSV rows
  const _rows = errors.map(error => {
    const _basicRow = [
      error.severity || '',
      truncateMessage(error.message || ''),
      error.url || '',
      String(error.line || ''),
      String(error.column || ''),
      new Date(error.timestamp).toLocaleString()
    ];

    if (includeDetails) {
      // Include only the stack trace as shown in detailed view
      const _stackTrace = error.stack_trace || error.stack || 'No stack trace available';
      basicRow.push(stackTrace);
    }

    // Wrap each field in quotes and escape internal quotes
    return basicRow.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [
    '# Console Errors Export',
    `# Generated: ${new Date().toLocaleString()}`,
    `# Total Records: ${errors.length}`,
    '',
    headers.map(h => `"${h}"`).join(','),
    ...rows
  ].join('\n');
};

export const _exportTokenEventsToCSV = (events: TokenEvent[], includeDetails: boolean = false): string => {
  if (!events || events.length === 0) {
    return 'No token events to export\n';
  }

  // Basic headers
  const _headers = ['Event Type', 'URL', 'Method', 'Value Hash', 'Token Type', 'Timestamp'];

  // Add detailed headers matching what's shown in the actual detailed view
  if (includeDetails) {
    headers.push('Status', 'Expiry');
  }  // Generate CSV rows
  const _rows = events.map(event => {
    const _basicRow = [
      event.type || '',
      event.url || '',
      event.method || '',
      event.valueHash || event.value_hash || '',
      event.tokenType || event.token_type || '',
      new Date(event.timestamp).toLocaleString()
    ];

    if (includeDetails) {
      // Include only fields that are actually shown in the detailed view
      basicRow.push(
        String(event.status || ''),
        event.expiry || ''
      );
    }    // Wrap each field in quotes and escape internal quotes
    return basicRow.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  return [
    '# Token Events Export',
    `# Generated: ${new Date().toLocaleString()}`,
    `# Total Records: ${events.length}`,
    '',
    headers.map(h => `"${h}"`).join(','),
    ...rows
  ].join('\n');
};

// Combined export function
export const _generateCombinedCSV = (data: {
  network?: NetworkRequest[];
  errors?: ConsoleError[];
  tokens?: TokenEvent[];
}, includeDetails: { [key: string]: boolean }): string => {
  const sections: string[] = [];

  if (data.network && data.network.length > 0) {
    sections.push(exportNetworkRequestsToCSV(data.network, includeDetails.network || false));
  }

  if (data.errors && data.errors.length > 0) {
    sections.push('\n\n' + exportConsoleErrorsToCSV(data.errors, includeDetails.errors || false));
  }

  if (data.tokens && data.tokens.length > 0) {
    sections.push('\n\n' + exportTokenEventsToCSV(data.tokens, includeDetails.tokens || false));
  }

  if (sections.length === 0) {
    return 'No data available for export\n';
  }

  return sections.join('\n');
};

// File download utility
export const _downloadCSVFile = (csvContent: string, filename: string): void => {
  const _blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const _link = document.createElement('a');

  if (link.download !== undefined) {
    const _url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Generate filename with timestamp
export const _generateExportFilename = (tables: string[], format: string = 'csv'): string => {
  const _timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const _tableNames = tables.join('-');
  return `chrome-extension-data-${tableNames}-${timestamp}.${format}`;
};
