import { NetworkRequest, ConsoleError, TokenEvent } from './types';

export interface DomainAnalysis {
  domain: string;
  requestCount: number;
  errorCount: number;
  tokenEventCount: number;
  avgResponseTime: number;
  statusCodes: { [code: string]: number };
  lastActivity: number;
  methods: { [method: string]: number };
  endpoints: string[];
  errorTypes: { [severity: string]: number };
  tokenTypes: { [type: string]: number };
}

export interface DomainGroup {
  domain: string;
  analysis: DomainAnalysis;
  networkRequests: NetworkRequest[];
  consoleErrors: ConsoleError[];
  tokenEvents: TokenEvent[];
}

// Extract main domain from URL
export const extractMainDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Remove 'www.' prefix if present
    const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    
    // For most cases, return the base domain (e.g., 'reddit.com' from 'api.reddit.com')
    const parts = withoutWww.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return withoutWww;
  } catch (error) {
    console.warn('Failed to extract main domain from URL:', url, error);
    return 'unknown';
  }
};

// Group data by domain
export const groupDataByDomain = (
  networkRequests: NetworkRequest[],
  consoleErrors: ConsoleError[],
  tokenEvents: TokenEvent[]
): DomainGroup[] => {
  const domainMap = new Map<string, DomainGroup>();

  // Process network requests
  networkRequests.forEach(request => {
    const domain = request.main_domain || extractMainDomain(request.url);
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        analysis: {
          domain,
          requestCount: 0,
          errorCount: 0,
          tokenEventCount: 0,
          avgResponseTime: 0,
          statusCodes: {},
          lastActivity: 0,
          methods: {},
          endpoints: [],
          errorTypes: {},
          tokenTypes: {}
        },
        networkRequests: [],
        consoleErrors: [],
        tokenEvents: []
      });
    }

    const group = domainMap.get(domain)!;
    group.networkRequests.push(request);
    group.analysis.requestCount++;
    group.analysis.lastActivity = Math.max(group.analysis.lastActivity, request.timestamp);
    
    // Track status codes
    if (request.status) {
      group.analysis.statusCodes[request.status] = (group.analysis.statusCodes[request.status] || 0) + 1;
    }
    
    // Track methods
    if (request.method) {
      group.analysis.methods[request.method] = (group.analysis.methods[request.method] || 0) + 1;
    }
    
    // Track unique endpoints
    try {
      const endpoint = new URL(request.url).pathname;
      if (!group.analysis.endpoints.includes(endpoint)) {
        group.analysis.endpoints.push(endpoint);
      }
    } catch {
      // Ignore invalid URLs
    }
  });

  // Process console errors
  consoleErrors.forEach(error => {
    const domain = error.main_domain || extractMainDomain(error.url);
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        analysis: {
          domain,
          requestCount: 0,
          errorCount: 0,
          tokenEventCount: 0,
          avgResponseTime: 0,
          statusCodes: {},
          lastActivity: 0,
          methods: {},
          endpoints: [],
          errorTypes: {},
          tokenTypes: {}
        },
        networkRequests: [],
        consoleErrors: [],
        tokenEvents: []
      });
    }

    const group = domainMap.get(domain)!;
    group.consoleErrors.push(error);
    group.analysis.errorCount++;
    group.analysis.lastActivity = Math.max(group.analysis.lastActivity, error.timestamp);
    
    // Track error types
    if (error.severity) {
      group.analysis.errorTypes[error.severity] = (group.analysis.errorTypes[error.severity] || 0) + 1;
    }
  });

  // Process token events
  tokenEvents.forEach(event => {
    const domain = event.main_domain || extractMainDomain(event.source_url);
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        analysis: {
          domain,
          requestCount: 0,
          errorCount: 0,
          tokenEventCount: 0,
          avgResponseTime: 0,
          statusCodes: {},
          lastActivity: 0,
          methods: {},
          endpoints: [],
          errorTypes: {},
          tokenTypes: {}
        },
        networkRequests: [],
        consoleErrors: [],
        tokenEvents: []
      });
    }

    const group = domainMap.get(domain)!;
    group.tokenEvents.push(event);
    group.analysis.tokenEventCount++;
    group.analysis.lastActivity = Math.max(group.analysis.lastActivity, event.timestamp);
    
    // Track token types
    if (event.type) {
      group.analysis.tokenTypes[event.type] = (group.analysis.tokenTypes[event.type] || 0) + 1;
    }
  });

  // Calculate average response times
  domainMap.forEach(group => {
    const responseTimes = group.networkRequests
      .filter(req => req.response_time && req.response_time > 0)
      .map(req => req.response_time!);
    
    if (responseTimes.length > 0) {
      group.analysis.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }
  });

  // Convert to array and sort by activity
  return Array.from(domainMap.values()).sort((a, b) => b.analysis.lastActivity - a.analysis.lastActivity);
};
