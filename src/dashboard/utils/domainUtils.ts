import { NetworkRequestV1, ConsoleErrorV1, TokenEventV1, DataAdapters } from '../../shared/contracts/data.contract';

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
  networkRequests: NetworkRequestV1[];
  consoleErrors: ConsoleErrorV1[];
  tokenEvents: TokenEventV1[];
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
    // console.warn('Failed to extract main domain from URL:', url, error);
    return 'unknown';
  }
};

// Group data by domain
export const groupDataByDomain = (
  networkRequests: NetworkRequestV1[],
  consoleErrors: ConsoleErrorV1[],
  tokenEvents: TokenEventV1[]
): DomainGroup[] => {
  // console.log('🔧 Starting domain grouping with data contract transformation...');

  // Log raw data first
  // console.log('📥 Raw data sample (first 3 requests):', networkRequests.slice(0, 3).map(req => ({
  //   url: req.url?.substring(0, 60),
  //   rawMainDomain: req.mainDomain,
  //   rawMain_domain: (req as any).main_domain,
  //   hasMainDomainField: 'mainDomain' in req,
  //   hasMain_domainField: 'main_domain' in req
  // })));

  // Transform raw data to ensure proper field mapping (main_domain -> mainDomain)
  const transformedRequests = networkRequests.map(req => DataAdapters.networkRequestToV1(req));
  const transformedErrors = consoleErrors.map(err => DataAdapters.consoleErrorToV1(err));
  const transformedTokens = tokenEvents.map(token => DataAdapters.tokenEventToV1(token));

  // Log transformed data
  // console.log('📤 Transformed data sample (first 3 requests):', transformedRequests.slice(0, 3).map(req => ({
  //   url: req.url?.substring(0, 60),
  //   transformedMainDomain: req.mainDomain,
  //   extractedFromUrl: extractMainDomain(req.url),
  //   wasTransformed: req.mainDomain !== extractMainDomain(req.url)
  // })));

  // console.log('📊 Transformed data counts:', {
  //   requests: transformedRequests.length,
  //   errors: transformedErrors.length,
  //   tokens: transformedTokens.length
  // });

  const domainMap = new Map<string, DomainGroup>();

  // Process network requests
  transformedRequests.forEach(request => {
    const domain = request.mainDomain || extractMainDomain(request.url);

    // DEBUG: Log domain grouping decisions
    if (request.mainDomain !== extractMainDomain(request.url)) {
      // console.log('🎯 Dashboard Domain Grouping:', {
      //   originalUrl: request.url?.substring(0, 60),
      //   extractedFromUrl: extractMainDomain(request.url),
      //   mainDomainField: request.mainDomain,
      //   finalDomain: domain,
      //   wasSmartGrouped: !!request.mainDomain
      // });
    }

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
    group.analysis.lastActivity = Math.max(group.analysis.lastActivity, new Date(request.timestamp).getTime());

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
  transformedErrors.forEach(error => {
    const domain = extractMainDomain(error.url);

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
    group.analysis.lastActivity = Math.max(group.analysis.lastActivity, new Date(error.timestamp).getTime());

    // Track error types by level instead of severity
    if (error.level) {
      group.analysis.errorTypes[error.level] = (group.analysis.errorTypes[error.level] || 0) + 1;
    }
  });

  // Process token events
  transformedTokens.forEach(event => {
    const domain = extractMainDomain(event.url);

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
    group.analysis.lastActivity = Math.max(group.analysis.lastActivity, new Date(event.timestamp).getTime());

    // Track token types
    if (event.type) {
      group.analysis.tokenTypes[event.type] = (group.analysis.tokenTypes[event.type] || 0) + 1;
    }
  });

  // Calculate average response times (not available in V1 contract)
  domainMap.forEach(group => {
    // Response time calculation removed as field doesn't exist in NetworkRequestV1
    group.analysis.avgResponseTime = 0;
  });

  // Convert to array and sort by activity
  return Array.from(domainMap.values()).sort((a, b) => b.analysis.lastActivity - a.analysis.lastActivity);
};
