// Domain intelligence utilities - SIMPLIFIED VERSION with main_domain field approach

export interface DomainInfo {
  fullDomain: string;
  baseDomain: string;
  subdomain?: string;
  category: 'main' | 'api' | 'cdn' | 'static' | 'auth' | 'analytics' | 'other';
  isGrouped: boolean;
}

export interface TabContext {
  tabId: number;
  tabUrl?: string;
}

export interface DomainStats {
  domain: string;
  fullDomain: string;
  baseDomain: string;
  subdomain?: string;
  category: string;
  isGrouped: boolean;
  totalRequests: number;
  errors: number;
  tokens: number;
  avgResponseTime: number;
  successRate: number;
  lastSeen: number;
  subdomains: string[];
  groupedDomains: string[];
  ungroupedRequests: number;
  subdomainStats: Array<{
    domain: string;
    requests: number;
    errors: number;
    tokens: number;
    avgResponseTime: number;
    successRate: number;
  }>;
  tabContext: {
    tabIds: number[];
    primaryTabUrl?: string;
    isMainDomain: boolean;
    relatedDomains: string[];
  };
}



// Helper function to extract base domain from URL (fallback for legacy data)
function extractBaseDomain(url: string): string {
  try {
    // Handle relative URLs (they start with /)
    if (!url || url.startsWith('/')) {
      return 'localhost';
    }
    
    // Handle URLs that don't have a protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
      // Try to add https:// if it looks like a domain
      if (url.includes('.') && !url.includes('/')) {
        fullUrl = 'https://' + url;
      } else {
        return 'unknown';
      }
    }
    
    const urlObj = new URL(fullUrl);
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
    console.warn('Failed to extract base domain from URL:', url, error);
    return 'unknown';
  }
}



// Parse domain information from URL
function parseDomainInfo(url: string, _tabContext?: TabContext): DomainInfo {
  try {
    // Skip if URL is invalid or unknown
    if (!url || url === 'unknown' || url === 'Unknown' || url === 'Unknown URL') {
      return {
        fullDomain: 'unknown',
        baseDomain: 'unknown',
        category: 'other',
        isGrouped: false
      };
    }
    
    // Handle relative URLs (they start with /)
    if (url.startsWith('/')) {
      return {
        fullDomain: 'localhost', // or use a generic identifier
        baseDomain: 'localhost',
        category: 'other',
        isGrouped: false
      };
    }
    
    // Handle URLs that don't have a protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
      // Try to add https:// if it looks like a domain
      if (url.includes('.') && !url.includes('/')) {
        fullUrl = 'https://' + url;
      } else {
        // Skip malformed URLs
        return {
          fullDomain: 'unknown',
          baseDomain: 'unknown',
          category: 'other',
          isGrouped: false
        };
      }
    }
    
    const urlObj = new URL(fullUrl);
    const hostname = urlObj.hostname;
    
    // Skip if hostname is empty or invalid
    if (!hostname || hostname === 'unknown') {
      return {
        fullDomain: 'unknown',
        baseDomain: 'unknown',
        category: 'other',
        isGrouped: false
      };
    }
    
    // Remove www prefix
    const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    
    // Extract base domain (last two parts for most TLDs)
    const parts = withoutWww.split('.');
    const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : withoutWww;
    
    // Extract subdomain if present
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join('.') : undefined;
    
    // Categorize domain type
    let category: DomainInfo['category'] = 'other';
    const lowerHostname = hostname.toLowerCase();
    
    if (lowerHostname.includes('api.') || lowerHostname.includes('/api/')) category = 'api';
    else if (lowerHostname.includes('cdn.') || lowerHostname.includes('static.')) category = 'cdn';
    else if (lowerHostname.includes('assets.') || lowerHostname.includes('img.')) category = 'static';
    else if (lowerHostname.includes('auth.') || lowerHostname.includes('login.') || lowerHostname.includes('oauth.')) category = 'auth';
    else if (lowerHostname.includes('analytics.') || lowerHostname.includes('tracking.')) category = 'analytics';
    else if (!subdomain) category = 'main';
    
    return {
      fullDomain: hostname,
      baseDomain,
      subdomain,
      category,
      isGrouped: !!subdomain
    };
  } catch (error) {
    console.warn('Failed to parse domain info:', url, error);
    return {
      fullDomain: 'unknown',
      baseDomain: 'unknown',
      category: 'other',
      isGrouped: false
    };
  }
}

export function groupDataByDomain(data: any[]): DomainStats[] {
  // Simple and reliable grouping based on the main_domain field recorded at capture time
  console.log('🎯 Using simplified domain grouping with main_domain field approach');
  
  const domainMap = new Map<string, {
    info: DomainInfo;
    requests: any[];
    errors: any[];
    tokens: any[];
    subdomains: Set<string>;
    responseTimes: number[];
    tabIds: Set<number>;
    relatedDomains: Set<string>;
    allGroupedDomains: Set<string>;
    subdomainStats: Map<string, {
      requests: any[];
      errors: any[];
      tokens: any[];
      responseTimes: number[];
    }>;
  }>();
  
  // Process each data item and group by the main_domain field
  data.forEach(item => {
    const itemUrl = item.url || item.request?.url || item.details?.url || item.source_url || '';
    if (!itemUrl || itemUrl === 'unknown' || itemUrl === 'Unknown' || itemUrl === 'Unknown URL') return;
    
    const tabId = item.tab_id;
    const tabUrl = item.tab_url;
    
    // Use the main_domain field if available, otherwise fall back to domain parsing
    const mainDomain = item.main_domain || extractBaseDomain(itemUrl);
    
    // Skip if we can't determine a valid main domain
    if (!mainDomain || mainDomain === 'unknown' || mainDomain === 'Unknown') return;
    
    const domainInfo = parseDomainInfo(itemUrl, tabId ? { tabId, tabUrl } : undefined);
    
    if (!domainMap.has(mainDomain)) {
      domainMap.set(mainDomain, {
        info: {
          ...domainInfo,
          baseDomain: mainDomain,
          isGrouped: false
        },
        requests: [],
        errors: [],
        tokens: [],
        subdomains: new Set(),
        responseTimes: [],
        tabIds: new Set(),
        relatedDomains: new Set(),
        allGroupedDomains: new Set(),
        subdomainStats: new Map()
      });
    }
    
    const group = domainMap.get(mainDomain)!;
    
    // Track all domains that are part of this main domain group
    // Only add valid domain names (skip 'unknown' entries)
    if (domainInfo.baseDomain && domainInfo.baseDomain !== 'unknown') {
      group.allGroupedDomains.add(domainInfo.baseDomain);
    }
    if (domainInfo.fullDomain !== domainInfo.baseDomain && domainInfo.fullDomain !== 'unknown') {
      group.allGroupedDomains.add(domainInfo.fullDomain);
    }
    
    // Add subdomain tracking
    if (domainInfo.subdomain && domainInfo.fullDomain !== 'unknown') {
      group.subdomains.add(domainInfo.fullDomain);
    }
    
    // Track stats for each individual domain (including subdomains)
    const trackingDomain = domainInfo.fullDomain;
    if (!group.subdomainStats.has(trackingDomain)) {
      group.subdomainStats.set(trackingDomain, {
        requests: [],
        errors: [],
        tokens: [],
        responseTimes: []
      });
    }
    
    const subdomainGroup = group.subdomainStats.get(trackingDomain)!;
    
    // Add tab context
    if (tabId) {
      group.tabIds.add(tabId);
    }
    
    // Categorize the data item (add to both main group and subdomain group)
    if (item.type === 'error' || item.level === 'error' || item.source === 'console' || item.severity) {
      group.errors.push(item);
      subdomainGroup.errors.push(item);
    } else if (item.type === 'token' || item.token || item.tokenType || item.value_hash) {
      group.tokens.push(item);
      subdomainGroup.tokens.push(item);
    } else {
      group.requests.push(item);
      subdomainGroup.requests.push(item);
      
      const responseTime = item.response_time || item.responseTime || item.duration || item.time;
      if (typeof responseTime === 'number' && responseTime > 0) {
        group.responseTimes.push(responseTime);
        subdomainGroup.responseTimes.push(responseTime);
      }
    }
  });
  
  // Convert to DomainStats array
  const results = Array.from(domainMap.entries()).map(([mainDomain, group]) => {
    const totalRequests = group.requests.length;
    const errors = group.errors.length;
    const tokens = group.tokens.length;
    
    const avgResponseTime = group.responseTimes.length > 0
      ? group.responseTimes.reduce((sum, time) => sum + time, 0) / group.responseTimes.length
      : 0;
    
    const successfulRequests = group.requests.filter(req => 
      !req.status || req.status < 400
    ).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
    
    const isGrouped = group.subdomains.size > 0 || group.allGroupedDomains.size > 1;
    const subdomainsList = Array.from(group.subdomains).sort();
    const groupedDomainsList = Array.from(group.allGroupedDomains).sort();
    
    const allItems = [...group.requests, ...group.errors, ...group.tokens];
    const lastSeen = allItems.reduce((latest, item) => {
      const timestamp = item.timestamp || item.time || Date.now();
      return Math.max(latest, timestamp);
    }, 0);
    
    // Determine primary tab URL for context
    const primaryTabId = Array.from(group.tabIds)[0];
    const primaryTabUrl = allItems.find(item => item.tab_id === primaryTabId)?.tab_url;
    const isMainDomain = true; // Since we're grouping by main_domain, this is always the main domain
    
    // Calculate subdomain stats
    const subdomainStatsArray = Array.from(group.subdomainStats.entries()).map(([domain, stats]) => {
      const subAvgResponseTime = stats.responseTimes.length > 0
        ? stats.responseTimes.reduce((sum, time) => sum + time, 0) / stats.responseTimes.length
        : 0;
      
      const subSuccessfulRequests = stats.requests.filter(req => 
        !req.status || req.status < 400
      ).length;
      const subSuccessRate = stats.requests.length > 0 ? (subSuccessfulRequests / stats.requests.length) * 100 : 100;
      
      return {
        domain,
        requests: stats.requests.length,
        errors: stats.errors.length,
        tokens: stats.tokens.length,
        avgResponseTime: Math.round(subAvgResponseTime),
        successRate: Math.round(subSuccessRate * 100) / 100
      };
    }).sort((a, b) => b.requests - a.requests);
    
    return {
      domain: mainDomain,
      fullDomain: group.info.fullDomain,
      baseDomain: mainDomain, // This is now the main domain
      subdomain: group.info.subdomain,
      category: group.info.category,
      isGrouped,
      totalRequests,
      errors,
      tokens,
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      lastSeen,
      subdomains: subdomainsList,
      groupedDomains: groupedDomainsList,
      ungroupedRequests: isGrouped ? totalRequests : 0,
      subdomainStats: subdomainStatsArray,
      tabContext: {
        tabIds: Array.from(group.tabIds),
        primaryTabUrl,
        isMainDomain,
        relatedDomains: Array.from(group.relatedDomains)
      }
    };
  }).sort((a, b) => {
    // Sort by activity level
    return b.totalRequests - a.totalRequests;
  });
  
  console.log(`✅ Grouped ${data.length} items into ${results.length} main domains:`, results.map(r => `${r.domain} (${r.totalRequests} requests)`));
  
  return results;
}

// Tab domain tracker for context awareness (simplified)
export const tabDomainTracker = {
  trackTabDomain: (tabId: number, requestUrl: string, tabUrl?: string) => {
    // Simplified tracking - just log for debugging
    const requestDomain = extractBaseDomain(requestUrl);
    const tabDomain = tabUrl ? extractBaseDomain(tabUrl) : 'unknown';
    console.log(`📍 Tab ${tabId}: Request from ${requestDomain} on page ${tabDomain}`);
  }
};
