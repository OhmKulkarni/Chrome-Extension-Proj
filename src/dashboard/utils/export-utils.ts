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
export const exportNetworkRequestsToCSV = (requests: NetworkRequest[], includeDetails: boolean = false): string => {
  if (!requests || requests.length === 0) {
    return 'No network requests to export\n';
  }

  // Basic headers
  const headers = ['Method', 'URL', 'Status', 'Size (KB)', 'Response Time (ms)', 'Timestamp'];

  // Add detailed headers if requested
  if (includeDetails) {
    headers.push(
      'Request Headers',
      'Response Headers',
      'Request Body Preview',
      'Response Body Preview',
      'Performance Metrics'
    );
  }

  // Helper function to safely stringify objects
  const safeStringify = (obj: any): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    try {
      return JSON.stringify(obj).replace(/"/g, '""'); // Escape quotes for CSV
    } catch {
      return String(obj);
    }
  };

  // Helper function to get size in KB
  const getSize = (request: NetworkRequest): string => {
    const size = request.payload_size || request.requestSize || request.request_size || 0;
    return size > 0 ? (size / 1024).toFixed(2) : '0';
  };

  // Helper function to get response time
  const getResponseTime = (request: NetworkRequest): string => {
    return String(request.response_time || request.time_taken || request.duration || 0);
  };

  // Helper function to truncate content for preview
  const truncateContent = (content: string, maxLength: number = 200): string => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // Generate CSV rows
  const rows = requests.map(request => {
    const basicRow = [
      request.method || '',
      request.url || '',
      String(request.status || ''),
      getSize(request),
      getResponseTime(request),
      new Date(request.timestamp).toLocaleString()
    ];

    if (includeDetails) {
      const requestHeaders = safeStringify(request.request_headers || request.headers);
      const responseHeaders = safeStringify(request.response_headers);
      const requestBody = truncateContent(safeStringify(request.request_body || request.requestBody));
      const responseBody = truncateContent(safeStringify(request.response_body || request.responseBody));
      const performanceMetrics = safeStringify(request.performanceMetrics);

      basicRow.push(requestHeaders, responseHeaders, requestBody, responseBody, performanceMetrics);
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

export const exportConsoleErrorsToCSV = (errors: ConsoleError[], includeDetails: boolean = false): string => {
  if (!errors || errors.length === 0) {
    return 'No console errors to export\n';
  }

  // Basic headers
  const headers = ['Severity', 'Message', 'URL', 'Line', 'Column', 'Timestamp'];

  // Add detailed headers if requested
  if (includeDetails) {
    headers.push('Stack Trace');
  }

  // Helper function to truncate long messages
  const truncateMessage = (message: string, maxLength: number = 500): string => {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  // Generate CSV rows
  const rows = errors.map(error => {
    const basicRow = [
      error.severity || '',
      truncateMessage(error.message || ''),
      error.url || '',
      String(error.line || ''),
      String(error.column || ''),
      new Date(error.timestamp).toLocaleString()
    ];

    if (includeDetails) {
      const stackTrace = (error.stack_trace || error.stack || '').replace(/\n/g, ' | '); // Replace newlines with separators
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

export const exportTokenEventsToCSV = (events: TokenEvent[], includeDetails: boolean = false): string => {
  if (!events || events.length === 0) {
    return 'No token events to export\n';
  }

  // Basic headers
  const headers = ['Event Type', 'URL', 'Method', 'Value Hash', 'Token Type', 'Timestamp'];

  // Add detailed headers if requested
  if (includeDetails) {
    headers.push('Status', 'Expiry');
  }

  // Generate CSV rows
  const rows = events.map(event => {
    const basicRow = [
      event.type || '',
      event.url || '',
      event.method || '',
      event.valueHash || event.value_hash || '',
      event.tokenType || event.token_type || '',
      new Date(event.timestamp).toLocaleString()
    ];

    if (includeDetails) {
      basicRow.push(
        String(event.status || ''),
        event.expiry || ''
      );
    }

    // Wrap each field in quotes and escape internal quotes
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
export const generateCombinedCSV = (data: {
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
export const downloadCSVFile = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
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
export const generateExportFilename = (tables: string[], format: string = 'csv'): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const tableNames = tables.join('-');
  return `chrome-extension-data-${tableNames}-${timestamp}.${format}`;
};
