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

  // Add meaningful detailed headers if requested
  if (includeDetails) {
    headers.push(
      // Request details
      'Content-Type', 'User-Agent', 'Authorization', 'Accept',
      // Response details  
      'Server', 'Cache-Control', 'Content-Encoding', 'Response-Content-Type',
      // Performance details
      'DNS-Lookup-Time', 'Connection-Time', 'SSL-Time', 'Wait-Time', 'Download-Time',
      // Body information
      'Request-Body-Type', 'Request-Body-Size', 'Response-Body-Type', 'Response-Body-Size',
      'Has-Error-Response', 'Response-Error-Message'
    );
  }



  // Helper function to get size in KB
  const getSize = (request: NetworkRequest): string => {
    const size = request.payload_size || request.requestSize || request.request_size || 0;
    return size > 0 ? (size / 1024).toFixed(2) : '0';
  };

  // Helper function to get response time
  const getResponseTime = (request: NetworkRequest): string => {
    return String(request.response_time || request.time_taken || request.duration || 0);
  };

  // Helper function to extract header value safely
  const getHeaderValue = (headers: any, key: string): string => {
    if (!headers) return '';
    if (typeof headers === 'string') {
      try {
        headers = JSON.parse(headers);
      } catch {
        return '';
      }
    }
    // Check various case variations of header names
    const variations = [key, key.toLowerCase(), key.toUpperCase()];
    for (const variation of variations) {
      if (headers[variation]) {
        return String(headers[variation]).substring(0, 100); // Limit length but keep meaningful data
      }
    }
    return '';
  };

  // Helper function to analyze body content
  const analyzeBody = (body: any): { type: string; size: string; hasError: boolean; errorMsg: string } => {
    if (!body) return { type: '', size: '0', hasError: false, errorMsg: '' };
    
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const size = new Blob([bodyStr]).size.toString();
    
    // Determine content type
    let type = 'text';
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (typeof parsed === 'object') {
        type = Array.isArray(parsed) ? 'json-array' : 'json-object';
        // Check for error indicators
        const hasError = !!(parsed.error || parsed.errors || parsed.message?.includes('error'));
        const errorMsg = parsed.error || parsed.message || '';
        return { type, size, hasError, errorMsg: String(errorMsg).substring(0, 200) };
      }
    } catch {
      // Not JSON, check other patterns
      if (bodyStr.startsWith('<')) type = 'html';
      else if (bodyStr.includes('=') && bodyStr.includes('&')) type = 'form-data';
    }
    
    return { type, size, hasError: false, errorMsg: '' };
  };

  // Helper function to extract performance timings
  const getPerformanceTiming = (metrics: any, key: string): string => {
    if (!metrics) return '';
    if (typeof metrics === 'string') {
      try {
        metrics = JSON.parse(metrics);
      } catch {
        return '';
      }
    }
    const value = metrics[key] || metrics[key.toLowerCase()] || '';
    return value ? Math.round(Number(value)).toString() : '';
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
      // Extract meaningful request headers
      const reqHeaders = request.request_headers || request.headers;
      const respHeaders = request.response_headers;
      
      // Request header details
      const contentType = getHeaderValue(reqHeaders, 'content-type');
      const userAgent = getHeaderValue(reqHeaders, 'user-agent');
      const authorization = getHeaderValue(reqHeaders, 'authorization') ? 'Present' : '';
      const accept = getHeaderValue(reqHeaders, 'accept');
      
      // Response header details
      const server = getHeaderValue(respHeaders, 'server');
      const cacheControl = getHeaderValue(respHeaders, 'cache-control');
      const contentEncoding = getHeaderValue(respHeaders, 'content-encoding');
      const responseContentType = getHeaderValue(respHeaders, 'content-type');
      
      // Performance details
      const metrics = request.performanceMetrics;
      const dnsTime = getPerformanceTiming(metrics, 'dnsLookup');
      const connectionTime = getPerformanceTiming(metrics, 'connection');
      const sslTime = getPerformanceTiming(metrics, 'ssl');
      const waitTime = getPerformanceTiming(metrics, 'wait');
      const downloadTime = getPerformanceTiming(metrics, 'download');
      
      // Body analysis
      const reqBodyAnalysis = analyzeBody(request.request_body || request.requestBody);
      const respBodyAnalysis = analyzeBody(request.response_body || request.responseBody);
      
      basicRow.push(
        contentType, userAgent, authorization, accept,
        server, cacheControl, contentEncoding, responseContentType,
        dnsTime, connectionTime, sslTime, waitTime, downloadTime,
        reqBodyAnalysis.type, reqBodyAnalysis.size, respBodyAnalysis.type, respBodyAnalysis.size,
        respBodyAnalysis.hasError ? 'Yes' : 'No', respBodyAnalysis.errorMsg
      );
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

  // Add meaningful detailed headers if requested
  if (includeDetails) {
    headers.push(
      'Error-Type', 'Function-Name', 'File-Name', 'Stack-Depth', 
      'Is-CORS-Error', 'Is-Network-Error', 'Error-Category', 'First-Stack-Line'
    );
  }

  // Helper function to truncate long messages
  const truncateMessage = (message: string, maxLength: number = 500): string => {
    if (!message) return '';
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  // Helper function to analyze stack trace
  const analyzeStackTrace = (stack: string): { 
    errorType: string; 
    functionName: string; 
    fileName: string; 
    stackDepth: number;
    isCorsError: boolean;
    isNetworkError: boolean;
    category: string;
    firstLine: string;
  } => {
    if (!stack) return {
      errorType: '', functionName: '', fileName: '', stackDepth: 0,
      isCorsError: false, isNetworkError: false, category: '', firstLine: ''
    };

    const lines = stack.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    
    // Extract error type from first line
    const errorTypeMatch = firstLine.match(/^(\w+Error):/);
    const errorType = errorTypeMatch ? errorTypeMatch[1] : '';
    
    // Look for function name in stack trace
    const functionMatch = stack.match(/at\s+([^\s(]+)/);
    const functionName = functionMatch ? functionMatch[1] : '';
    
    // Extract file name
    const fileMatch = stack.match(/\/([^\/]+\.js)/);
    const fileName = fileMatch ? fileMatch[1] : '';
    
    // Calculate stack depth
    const stackDepth = (stack.match(/at\s+/g) || []).length;
    
    // Check for specific error types
    const isCorsError = stack.includes('CORS') || stack.includes('cross-origin');
    const isNetworkError = stack.includes('network') || stack.includes('fetch') || stack.includes('XMLHttpRequest');
    
    // Categorize error
    let category = 'Runtime';
    if (isCorsError) category = 'CORS';
    else if (isNetworkError) category = 'Network';
    else if (stack.includes('ReferenceError')) category = 'Reference';
    else if (stack.includes('TypeError')) category = 'Type';
    else if (stack.includes('SyntaxError')) category = 'Syntax';
    
    return {
      errorType, functionName, fileName, stackDepth,
      isCorsError, isNetworkError, category,
      firstLine: firstLine.substring(0, 200)
    };
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
      const stackAnalysis = analyzeStackTrace(error.stack_trace || error.stack || '');
      
      basicRow.push(
        stackAnalysis.errorType,
        stackAnalysis.functionName,
        stackAnalysis.fileName,
        stackAnalysis.stackDepth.toString(),
        stackAnalysis.isCorsError ? 'Yes' : 'No',
        stackAnalysis.isNetworkError ? 'Yes' : 'No',
        stackAnalysis.category,
        stackAnalysis.firstLine
      );
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

  // Add meaningful detailed headers if requested
  if (includeDetails) {
    headers.push(
      'Status', 'Expiry-Date', 'Days-Until-Expiry', 'Is-Expired', 
      'Hash-Algorithm', 'URL-Domain', 'Is-Secure-Context', 'Event-Category'
    );
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
      // Enhanced token analysis
      const expiry = event.expiry || '';
      const expiryDate = expiry ? new Date(expiry) : null;
      const now = new Date();
      const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : '';
      const isExpired = expiryDate ? expiryDate < now : false;
      
      // Analyze hash (common patterns: JWT, session, etc.)
      const hash = event.valueHash || event.value_hash || '';
      let hashAlgorithm = '';
      if (hash.length === 32) hashAlgorithm = 'MD5';
      else if (hash.length === 40) hashAlgorithm = 'SHA1';
      else if (hash.length === 64) hashAlgorithm = 'SHA256';
      else if (hash.includes('.')) hashAlgorithm = 'JWT';
      
      // Extract domain from URL
      const urlDomain = event.url ? new URL(event.url).hostname : '';
      const isSecureContext = event.url ? event.url.startsWith('https') : false;
      
      // Categorize event type
      let eventCategory = 'Other';
      const eventType = (event.type || '').toLowerCase();
      if (eventType.includes('auth') || eventType.includes('login')) eventCategory = 'Authentication';
      else if (eventType.includes('session')) eventCategory = 'Session';
      else if (eventType.includes('csrf') || eventType.includes('xsrf')) eventCategory = 'CSRF';
      else if (eventType.includes('api')) eventCategory = 'API';
      
      basicRow.push(
        String(event.status || ''),
        expiryDate ? expiryDate.toLocaleDateString() : '',
        daysUntilExpiry.toString(),
        isExpired ? 'Yes' : 'No',
        hashAlgorithm,
        urlDomain,
        isSecureContext ? 'Yes' : 'No',
        eventCategory
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
