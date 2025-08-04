// Domain intelligence utilities - SIMPLIFIED VERSION with main_domain field approach

export interface DomainInfo {
  fullDomain: string;
  baseDomain: string;
  subdomain?: string;
  category: 'main' | 'api' | 'cdn' | 'static' | 'auth' | 'analytics' | 'other';
  serviceGroup?: string;
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
  serviceGroup?: string;
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
  tabContext: {
    tabIds: number[];
    primaryTabUrl?: string;
    isMainDomain: boolean;
    relatedDomains: string[];
  };
}

// Known service groups for better organization
const SERVICE_GROUPS: Record<string, string[]> = {
  reddit: ['reddit.com', 'www.reddit.com', 'oauth.reddit.com', 'accounts.reddit.com', 'svc.reddit.com', 'shreddit.events'],
  github: ['github.com', 'www.github.com', 'api.github.com', 'raw.githubusercontent.com', 'avatars.githubusercontent.com', 'codeload.github.com', 'github.dev'],
  anthropic: ['claude.ai', 'www.claude.ai', 'api.anthropic.com', 'anthropic.com'],
  google: ['google.com', 'www.google.com', 'apis.google.com', 'accounts.google.com', 'drive.google.com', 'docs.google.com', 'sheets.google.com'],
  microsoft: ['microsoft.com', 'login.microsoftonline.com', 'graph.microsoft.com', 'outlook.office365.com', 'teams.microsoft.com'],
  meta: ['facebook.com', 'www.facebook.com', 'graph.facebook.com', 'connect.facebook.net', 'instagram.com'],
  twitter: ['twitter.com', 'x.com', 'api.twitter.com', 'abs.twimg.com', 'pbs.twimg.com'],
  linkedin: ['linkedin.com', 'www.linkedin.com', 'api.linkedin.com', 'static.licdn.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'i.ytimg.com', 'ytimg.com'],
  amazon: ['amazon.com', 'www.amazon.com', 'images-amazon.com', 'ssl-images-amazon.com', 'amazonaws.com'],
  netflix: ['netflix.com', 'www.netflix.com', 'assets.nflxext.com', 'nflximg.net'],
  stripe: ['stripe.com', 'api.stripe.com', 'js.stripe.com', 'checkout.stripe.com'],
  paypal: ['paypal.com', 'www.paypal.com', 'api.paypal.com', 'checkout.paypal.com'],
  spotify: ['spotify.com', 'accounts.spotify.com', 'api.spotify.com', 'i.scdn.co'],
  discord: ['discord.com', 'discordapp.com', 'cdn.discordapp.com', 'gateway.discord.gg']
};

// Helper function to extract base domain from URL (fallback for legacy data)
function extractBaseDomain(url: string): string {
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
    console.warn('Failed to extract base domain from URL:', url, error);
    return 'unknown';
  }
}

// Get service group name for a domain
function getServiceGroup(domain: string): string | undefined {
  for (const [serviceKey, domains] of Object.entries(SERVICE_GROUPS)) {
    if (domains.includes(domain)) {
      return serviceKey;
    }
  }
  return undefined;
}

// Parse domain information from URL
function parseDomainInfo(url: string, tabContext?: TabContext): DomainInfo {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
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
    
    // Check if this domain belongs to a known service group
    const serviceGroup = getServiceGroup(baseDomain);
    
    return {
      fullDomain: hostname,
      baseDomain,
      subdomain,
      category,
      serviceGroup,
      isGrouped: !!serviceGroup || !!subdomain
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
  }>();
  
  // Process each data item and group by the main_domain field
  data.forEach(item => {
    const itemUrl = item.url || item.request?.url || item.details?.url || item.source_url || '';
    if (!itemUrl) return;
    
    const tabId = item.tab_id;
    const tabUrl = item.tab_url;
    
    // Use the main_domain field if available, otherwise fall back to domain parsing
    const mainDomain = item.main_domain || extractBaseDomain(itemUrl);
    
    const domainInfo = parseDomainInfo(itemUrl, tabId ? { tabId, tabUrl } : undefined);
    
    if (!domainMap.has(mainDomain)) {
      // Determine if this is a known service group
      const serviceGroup = getServiceGroup(mainDomain);
      
      domainMap.set(mainDomain, {
        info: {
          ...domainInfo,
          baseDomain: mainDomain,
          serviceGroup: serviceGroup,
          isGrouped: false
        },
        requests: [],
        errors: [],
        tokens: [],
        subdomains: new Set(),
        responseTimes: [],
        tabIds: new Set(),
        relatedDomains: new Set(),
        allGroupedDomains: new Set()
      });
    }
    
    const group = domainMap.get(mainDomain)!;
    
    // Track all domains that are part of this main domain group
    group.allGroupedDomains.add(domainInfo.baseDomain);
    if (domainInfo.fullDomain !== domainInfo.baseDomain) {
      group.allGroupedDomains.add(domainInfo.fullDomain);
    }
    
    // Add subdomain tracking
    if (domainInfo.subdomain) {
      group.subdomains.add(domainInfo.fullDomain);
    }
    
    // Add tab context
    if (tabId) {
      group.tabIds.add(tabId);
    }
    
    // Categorize the data item
    if (item.type === 'error' || item.level === 'error' || item.source === 'console' || item.severity) {
      group.errors.push(item);
    } else if (item.type === 'token' || item.token || item.tokenType || item.value_hash) {
      group.tokens.push(item);
    } else {
      group.requests.push(item);
      
      const responseTime = item.response_time || item.responseTime || item.duration || item.time;
      if (typeof responseTime === 'number' && responseTime > 0) {
        group.responseTimes.push(responseTime);
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
    
    const isGrouped = group.subdomains.size > 1 || group.allGroupedDomains.size > 1;
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
    
    return {
      domain: mainDomain,
      fullDomain: group.info.fullDomain,
      baseDomain: mainDomain, // This is now the main domain
      subdomain: group.info.subdomain,
      category: group.info.category,
      serviceGroup: group.info.serviceGroup,
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
