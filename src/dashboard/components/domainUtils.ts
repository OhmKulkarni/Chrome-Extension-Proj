// Tab-Context Domain Intelligence System for Chrome Extension Analytics
// Dynamically groups domains based on actual tab relationships and URL patterns
// Eliminates hardcoded domain lists for local testing compatibility

// Basic TLD handling for accurate domain extraction
const TLD_OVERRIDES: Record<string, boolean> = {
  'co.uk': true, 'co.jp': true, 'co.kr': true, 'co.in': true, 'co.za': true,
  'com.au': true, 'com.br': true, 'com.mx': true, 'com.ar': true,
  'gov.uk': true, 'ac.uk': true, 'org.uk': true, 'net.uk': true,
  'edu.au': true, 'gov.au': true, 'asn.au': true, 'id.au': true
};

// Functional subdomain patterns for categorization (not domain-specific)
const SUBDOMAIN_PATTERNS = {
  api: /^(api|rest|graphql|service|services|gateway|v\d+)/,
  cdn: /^(cdn|static|assets|media|images?|img|js|css|files?)/,
  auth: /^(auth|login|sso|oauth|accounts?|secure|signin)/,
  mobile: /^(m|mobile|app|apps|touch)/,
  regional: /^(www|en|us|uk|de|fr|es|it|jp|cn|ca|au)/,
  dev: /^(dev|test|staging|beta|alpha|preview|demo|localhost)/,
  analytics: /^(analytics|tracking|metrics|stats|monitor|telemetry)/,
  support: /^(help|support|docs?|documentation|kb|wiki)/,
  mail: /^(mail|email|smtp|imap|webmail)/,
  search: /^(search|find|query)/
};

// Domain information interface
export interface DomainInfo {
  fullDomain: string;
  baseDomain: string;
  subdomain: string;
  category: string;
  isGrouped: boolean;
  tabContext?: {
    tabId: number;
    tabUrl: string;
    isMainDomain: boolean; // True if this domain matches the tab's main domain
  };
}

// Enhanced statistics interface with tab context
export interface DomainStats {
  domain: string;
  fullDomain: string;
  baseDomain: string;
  subdomain: string;
  category: string;
  isGrouped: boolean;
  totalRequests: number;
  errors: number;
  tokens: number;
  avgResponseTime: number;
  successRate: number;
  lastSeen: number;
  subdomains: string[];
  tabContext: {
    tabIds: number[];           // All tabs that accessed this domain
    primaryTabUrl?: string;     // The main tab URL if this is a subdomain
    isMainDomain: boolean;      // True if this is the primary domain for a tab
    relatedDomains: string[];   // Other domains accessed from the same tab
  };
}

// Tab-Domain mapping for intelligent grouping
interface TabDomainMap {
  [tabId: number]: {
    mainDomain: string;
    allDomains: Set<string>;
    tabUrl: string;
  };
}

/**
 * Extract TLD considering 2-level TLDs like co.uk, com.au
 */
function extractTLD(hostname: string): { tld: string; domainWithoutTLD: string } {
  const parts = hostname.split('.');
  
  if (parts.length >= 3) {
    const potential2LevelTLD = parts.slice(-2).join('.');
    if (TLD_OVERRIDES[potential2LevelTLD]) {
      return {
        tld: potential2LevelTLD,
        domainWithoutTLD: parts.slice(0, -2).join('.')
      };
    }
  }
  
  return {
    tld: parts[parts.length - 1] || '',
    domainWithoutTLD: parts.slice(0, -1).join('.')
  };
}

/**
 * Parse domain information with pattern-based categorization
 */
export function parseDomainInfo(url: string, tabContext?: { tabId: number; tabUrl: string }): DomainInfo {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    const { tld, domainWithoutTLD } = extractTLD(hostname);
    const parts = domainWithoutTLD.split('.');
    
    if (parts.length === 0 || !parts[0]) {
      return {
        fullDomain: hostname,
        baseDomain: hostname,
        subdomain: '',
        category: 'regional',
        isGrouped: false,
        tabContext: tabContext ? { ...tabContext, isMainDomain: true } : undefined
      };
    }
    
    if (parts.length === 1) {
      const baseDomain = `${parts[0]}.${tld}`;
      return {
        fullDomain: baseDomain,
        baseDomain,
        subdomain: '',
        category: 'regional',
        isGrouped: false,
        tabContext: tabContext ? { ...tabContext, isMainDomain: true } : undefined
      };
    }
    
    const baseDomain = `${parts[parts.length - 1]}.${tld}`;
    const subdomain = parts.slice(0, -1).join('.');
    
    // Categorize based on subdomain patterns (not hardcoded domains)
    let category = 'other';
    const firstSubdomain = parts[0];
    
    for (const [cat, pattern] of Object.entries(SUBDOMAIN_PATTERNS)) {
      if (pattern.test(firstSubdomain)) {
        category = cat;
        break;
      }
    }
    
    // Determine if this is the main domain for the tab
    let isMainDomain = false;
    if (tabContext?.tabUrl) {
      try {
        const tabUrlObj = new URL(tabContext.tabUrl);
        const tabHostname = tabUrlObj.hostname.toLowerCase();
        isMainDomain = baseDomain === extractBaseDomain(tabHostname);
      } catch (e) {
        // Ignore tab URL parsing errors
      }
    }
    
    return {
      fullDomain: hostname,
      baseDomain,
      subdomain,
      category,
      isGrouped: false,
      tabContext: tabContext ? { ...tabContext, isMainDomain } : undefined
    };
  } catch (error) {
    return {
      fullDomain: url,
      baseDomain: url,
      subdomain: '',
      category: 'other',
      isGrouped: false,
      tabContext: tabContext ? { ...tabContext, isMainDomain: false } : undefined
    };
  }
}

/**
 * Extract base domain from hostname
 */
function extractBaseDomain(hostname: string): string {
  const { tld, domainWithoutTLD } = extractTLD(hostname);
  const parts = domainWithoutTLD.split('.');
  
  if (parts.length === 0) return hostname;
  if (parts.length === 1) return `${parts[0]}.${tld}`;
  
  return `${parts[parts.length - 1]}.${tld}`;
}

/**
 * Build tab-domain mapping from data with tab context
 */
function buildTabDomainMap(data: any[]): TabDomainMap {
  const tabMap: TabDomainMap = {};
  
  data.forEach(item => {
    const tabId = item.tab_id;
    const tabUrl = item.tab_url;
    const itemUrl = item.url || item.request?.url || item.details?.url || item.source_url || '';
    
    if (!tabId || !itemUrl) return;
    
    if (!tabMap[tabId]) {
      // Initialize tab entry
      const mainDomain = tabUrl ? extractBaseDomain(new URL(tabUrl).hostname) : '';
      tabMap[tabId] = {
        mainDomain,
        allDomains: new Set(),
        tabUrl: tabUrl || ''
      };
    }
    
    try {
      const urlObj = new URL(itemUrl);
      const baseDomain = extractBaseDomain(urlObj.hostname);
      tabMap[tabId].allDomains.add(baseDomain);
    } catch (e) {
      // Ignore invalid URLs
    }
  });
  
  return tabMap;
}

/**
 * Group data by domain with intelligent tab-context based aggregation
 */
export function groupDataByDomain(data: any[]): DomainStats[] {
  // First, build tab-domain relationships
  const tabMap = buildTabDomainMap(data);
  
  const domainMap = new Map<string, {
    info: DomainInfo;
    requests: any[];
    errors: any[];
    tokens: any[];
    subdomains: Set<string>;
    responseTimes: number[];
    tabIds: Set<number>;
    relatedDomains: Set<string>;
  }>();
  
  // Process each data item
  data.forEach(item => {
    const itemUrl = item.url || item.request?.url || item.details?.url || item.source_url || '';
    if (!itemUrl) return;
    
    const tabId = item.tab_id;
    const tabUrl = item.tab_url;
    
    const domainInfo = parseDomainInfo(itemUrl, tabId ? { tabId, tabUrl } : undefined);
    const key = domainInfo.baseDomain;
    
    if (!domainMap.has(key)) {
      domainMap.set(key, {
        info: domainInfo,
        requests: [],
        errors: [],
        tokens: [],
        subdomains: new Set(),
        responseTimes: [],
        tabIds: new Set(),
        relatedDomains: new Set()
      });
    }
    
    const group = domainMap.get(key)!;
    
    // Add subdomain tracking
    if (domainInfo.subdomain) {
      group.subdomains.add(domainInfo.fullDomain);
    }
    
    // Add tab context
    if (tabId) {
      group.tabIds.add(tabId);
      
      // Add related domains from the same tab
      if (tabMap[tabId]) {
        tabMap[tabId].allDomains.forEach(domain => {
          if (domain !== key) {
            group.relatedDomains.add(domain);
          }
        });
      }
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
  return Array.from(domainMap.entries()).map(([domain, group]) => {
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
    
    const isGrouped = group.subdomains.size > 1;
    const subdomainsList = Array.from(group.subdomains).sort();
    
    const allItems = [...group.requests, ...group.errors, ...group.tokens];
    const lastSeen = allItems.reduce((latest, item) => {
      const timestamp = item.timestamp || item.time || Date.now();
      return Math.max(latest, timestamp);
    }, 0);
    
    // Determine primary tab URL for context
    const primaryTabId = Array.from(group.tabIds)[0];
    const primaryTabUrl = primaryTabId ? tabMap[primaryTabId]?.tabUrl : undefined;
    const isMainDomain = primaryTabId ? tabMap[primaryTabId]?.mainDomain === domain : false;
    
    return {
      domain,
      fullDomain: group.info.fullDomain,
      baseDomain: group.info.baseDomain,
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
      tabContext: {
        tabIds: Array.from(group.tabIds),
        primaryTabUrl,
        isMainDomain,
        relatedDomains: Array.from(group.relatedDomains)
      }
    };
  }).sort((a, b) => {
    // Sort by main domains first, then by activity
    if (a.tabContext.isMainDomain && !b.tabContext.isMainDomain) return -1;
    if (!a.tabContext.isMainDomain && b.tabContext.isMainDomain) return 1;
    return b.totalRequests - a.totalRequests;
  });
}

/**
 * Advanced Tab-Domain tracking with dynamic relationship detection
 */
export class TabDomainTracker {
  private tabDomains: Map<number, {
    mainDomain: string;
    allDomains: Set<string>;
    tabUrl: string;
    startTime: number;
  }> = new Map();
  
  private domainRelationships: Map<string, {
    relatedDomains: Set<string>;
    tabOccurrences: Map<number, number>; // tabId -> count
    lastSeen: number;
  }> = new Map();
  
  constructor() {
    this.loadFromStorage();
    this.setupTabListeners();
  }
  
  /**
   * Track domain access from a specific tab
   */
  trackTabDomain(tabId: number, url: string, tabUrl?: string): void {
    try {
      const urlObj = new URL(url);
      const baseDomain = extractBaseDomain(urlObj.hostname);
      const now = Date.now();
      
      // Initialize or update tab tracking
      if (!this.tabDomains.has(tabId)) {
        const mainDomain = tabUrl ? extractBaseDomain(new URL(tabUrl).hostname) : baseDomain;
        this.tabDomains.set(tabId, {
          mainDomain,
          allDomains: new Set([baseDomain]),
          tabUrl: tabUrl || url,
          startTime: now
        });
      } else {
        this.tabDomains.get(tabId)!.allDomains.add(baseDomain);
      }
      
      // Update domain relationships
      const tabData = this.tabDomains.get(tabId)!;
      
      if (!this.domainRelationships.has(baseDomain)) {
        this.domainRelationships.set(baseDomain, {
          relatedDomains: new Set(),
          tabOccurrences: new Map(),
          lastSeen: now
        });
      }
      
      const domainData = this.domainRelationships.get(baseDomain)!;
      domainData.lastSeen = now;
      
      // Track tab occurrence
      const currentCount = domainData.tabOccurrences.get(tabId) || 0;
      domainData.tabOccurrences.set(tabId, currentCount + 1);
      
      // Add related domains from the same tab
      tabData.allDomains.forEach(otherDomain => {
        if (otherDomain !== baseDomain) {
          domainData.relatedDomains.add(otherDomain);
        }
      });
      
      this.saveToStorage();
    } catch (error) {
      console.warn('Failed to track tab domain:', error);
    }
  }
  
  /**
   * Get related domains for a given domain
   */
  getRelatedDomains(domain: string): string[] {
    const relationships = this.domainRelationships.get(domain);
    return relationships ? Array.from(relationships.relatedDomains) : [];
  }
  
  /**
   * Clean up when tab is closed
   */
  removeTab(tabId: number): void {
    this.tabDomains.delete(tabId);
    
    // Clean up old tab occurrences
    this.domainRelationships.forEach(data => {
      data.tabOccurrences.delete(tabId);
    });
    
    this.saveToStorage();
  }
  
  /**
   * Setup Chrome tab listeners for automatic cleanup
   */
  private setupTabListeners(): void {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onRemoved?.addListener((tabId) => {
        this.removeTab(tabId);
      });
    }
  }
  
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        tabDomains: Array.from(this.tabDomains.entries()),
        domainRelationships: Array.from(this.domainRelationships.entries()).map(([domain, data]) => [
          domain,
          {
            ...data,
            relatedDomains: Array.from(data.relatedDomains),
            tabOccurrences: Array.from(data.tabOccurrences.entries())
          }
        ])
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ 'tab-domain-tracker': data });
      }
    } catch (error) {
      console.warn('Failed to save tab domain tracking data:', error);
    }
  }
  
  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('tab-domain-tracker');
        const data = result['tab-domain-tracker'];
        
        if (data) {
          // Restore tab domains
          this.tabDomains = new Map(
            data.tabDomains?.map(([tabId, tabData]: [number, any]) => [
              tabId,
              {
                ...tabData,
                allDomains: new Set(tabData.allDomains || [])
              }
            ]) || []
          );
          
          // Restore domain relationships
          this.domainRelationships = new Map(
            data.domainRelationships?.map(([domain, relData]: [string, any]) => [
              domain,
              {
                ...relData,
                relatedDomains: new Set(relData.relatedDomains || []),
                tabOccurrences: new Map(relData.tabOccurrences || [])
              }
            ]) || []
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load tab domain tracking data:', error);
    }
  }
}

// Export singleton instance
export const tabDomainTracker = new TabDomainTracker();
