// Domain intelligence utilities - SIMPLIFIED VERSION with main_domain field approach

import { LibraryDetector, LibraryInfo } from '../../background/utils/library-detector';

// Domain affiliation mapping for related domains that should be grouped together
const DOMAIN_AFFILIATIONS: { [key: string]: string } = {
  // Yahoo family domains
  'yimg.com': 'yahoo.com',
  'yahooapis.com': 'yahoo.com',
  'ymail.com': 'yahoo.com',

  // Google family domains
  'googleapis.com': 'google.com',
  'gstatic.com': 'google.com',
  'googleusercontent.com': 'google.com',
  'googlesyndication.com': 'google.com',
  'googletagmanager.com': 'google.com',
  'googleadservices.com': 'google.com',
  'youtube.com': 'google.com',

  // Facebook/Meta family domains
  'fbcdn.net': 'facebook.com',
  'instagram.com': 'facebook.com',
  'whatsapp.com': 'facebook.com',

  // Amazon family domains
  'amazonaws.com': 'amazon.com',
  'cloudfront.net': 'amazon.com',

  // Microsoft family domains
  'live.com': 'microsoft.com',
  'outlook.com': 'microsoft.com',
  'office.com': 'microsoft.com',
  'azure.com': 'microsoft.com',
  'microsoftonline.com': 'microsoft.com',

  // Apple family domains
  'icloud.com': 'apple.com',
  'me.com': 'apple.com',
  'mac.com': 'apple.com',

  // Twitter family domains
  'twimg.com': 'twitter.com',
  't.co': 'twitter.com'
};

/**
 * Get the parent domain for affiliation grouping
 */
function getParentDomain(domain: string): string {
  return DOMAIN_AFFILIATIONS[domain] || domain;
}

/**
 * Get all affiliated domains for a parent domain
 */
function getAffiliatedDomains(parentDomain: string): string[] {
  const affiliated: string[] = [];
  for (const [child, parent] of Object.entries(DOMAIN_AFFILIATIONS)) {
    if (parent === parentDomain) {
      affiliated.push(child);
    }
  }
  return affiliated;
}

// Library information interface
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
  // NEW: Library information for this domain
  libraries: LibraryInfo[];
  libraryCount: number;
  frameworkCount: number;
  utilityCount: number;
  uiLibraryCount: number;
  analyticsCount: number;
  cdnCount: number;
  // NEW: Library source domain breakdown (for dropdowns)
  librarySourceDomains: Array<{
    domain: string;
    libraries: LibraryInfo[];
    count: number;
    isThirdParty: boolean;
    thirdPartyType?: string;
  }>;
  // NEW: 3rd party classification
  isThirdParty?: boolean;
  thirdPartyType?: 'advertising' | 'tracking' | 'cdn' | 'analytics' | 'social' | 'other';
  // NEW: Domain affiliation for grouping related domains
  affiliatedDomains?: string[];
  parentDomain?: string;
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

// Helper function to infer library type from name and URL patterns
function inferLibraryType(name: string, url: string): LibraryInfo['type'] {
  const nameLower = name.toLowerCase();
  const urlLower = url.toLowerCase();

  // 🎯 ADVERTISING & MARKETING SERVICES
  if (/(?:casalemedia|criteo|adsrvr|pubmatic|doubleclick|adsystem|bidder|cdb|translator|hbopenbid|wunderkind|magnite|sodar|rid)/i.test(nameLower + urlLower)) {
    return 'service';
  }

  // 🎯 ANALYTICS & DATA COLLECTION SERVICES
  if (/(?:collector|logs|analytics|browser-intake|optimizely|events|datadog|segment|amplitude|hotjar|gtag|ga)/i.test(nameLower + urlLower)) {
    return 'data-collector';
  }

  // 🎯 MEDIA & STREAMING SERVICES
  if (/(?:livestream|manifests|streaming|warnermediacdn|live-manifests|video|player|stream|media|jwplayer|cygnus)/i.test(nameLower + urlLower)) {
    return 'streaming-service';
  }

  // 🎯 API ENDPOINTS & WEB SERVICES
  if (/(?:api|endpoint|service|reg|segments|desktop|pub|v2|receive|wmcdp|zetaglobal|lijit|direct|ssp|wknd)/i.test(nameLower + urlLower)) {
    return 'service';
  }

  // 🎯 PRIVACY & COMPLIANCE SERVICES
  if (/(?:onetrust|otgpp|otbanner|otsdkstub|cookiebot|consent|privacy|gdpr|ccpa|optanon|adsafeprotected|adtrafficquality)/i.test(nameLower + urlLower)) {
    return 'privacy-tools';
  }

  // 🎯 TRACKING & IDENTITY SERVICES
  if (/(?:universalid|iiquniversalid|identity|sync|track|pixel|beacon|collect|tag|trackingpixel)/i.test(nameLower + urlLower)) {
    return 'tracking-tools';
  }

  // 🎯 SITE-SPECIFIC FEATURES
  if (/(?:auth|login|landing|landingprod|freeview|zion|web-client|mb|paywall|checkout|cart|alerts|sitefeatures)/i.test(nameLower + urlLower)) {
    return 'site-tools';
  }

  // 🎯 MEDIA LIBRARIES
  if (/(?:videotools|d3|player)/i.test(nameLower)) {
    return 'media-tools';
  }

  // 🎯 PERFORMANCE LIBRARIES
  if (/(?:loadingtools|load|loader|lazy|defer|preload|cache|optimize|compress|psm|taglw)/i.test(nameLower + urlLower)) {
    return 'performance-tools';
  }

  // 🎯 TRADITIONAL JAVASCRIPT LIBRARIES
  if (/(?:react|vue|angular|ember|backbone)/i.test(nameLower)) {
    return 'framework';
  }

  if (/(?:bootstrap|material|semantic|foundation|bulma|tailwind)/i.test(nameLower)) {
    return 'framework';
  }

  // Fallback
  return 'utility';
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

export async function groupDataByDomain(data: any[]): Promise<DomainStats[]> {
  // Simple and reliable grouping based on the main_domain field recorded at capture time
  console.log('🎯 Using simplified domain grouping with main_domain field approach');

  // Fetch library data from background script
  let libraryData: any[] = [];
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const response = await chrome.runtime.sendMessage({ action: 'getMinifiedLibraries', limit: 1000 });
      if (response && response.success && response.libraries) {
        libraryData = response.libraries;
        console.log('📚 domainUtils: Loaded', libraryData.length, 'libraries from storage');
      }
    }
  } catch (error) {
    console.warn('📚 domainUtils: Failed to load library data:', error);
  }

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
    let mainDomain = item.main_domain || extractBaseDomain(itemUrl);

    // DOMAIN AFFILIATION: Group affiliated domains under their parent domain
    const parentDomain = getParentDomain(mainDomain);
    if (parentDomain !== mainDomain) {
      console.log(`🔗 [DomainAffiliation] Grouping ${mainDomain} under parent domain ${parentDomain}`);
      mainDomain = parentDomain;
    }

    // DEBUG: Log every item to see what's being processed
    console.log('🔍 Processing item:', {
      itemUrl: itemUrl.substring(0, 80) + '...',
      storedMainDomain: item.main_domain,
      extractedMainDomain: extractBaseDomain(itemUrl),
      parentDomain: parentDomain,
      finalMainDomain: mainDomain,
      hasMainDomainField: 'main_domain' in item,
      itemKeys: Object.keys(item)
    });

    // DEBUG: Log domain grouping for problematic domains
    if (itemUrl.includes('dianomi.com') || itemUrl.includes('dataviz.cnn.io')) {
      console.log('🎯 Dashboard Domain Grouping:', {
        itemUrl: itemUrl.substring(0, 80) + '...',
        storedMainDomain: item.main_domain,
        extractedMainDomain: extractBaseDomain(itemUrl),
        parentDomain: parentDomain,
        finalMainDomain: mainDomain,
        tabUrl: tabUrl ? tabUrl.substring(0, 80) + '...' : 'MISSING',
        hasMainDomainField: !!item.main_domain
      });
    }

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

  // LIBRARY-ONLY DOMAINS: Add domains that only have library data (no network events)
  console.log('📚 Processing library-only domains...');
  const existingDomains = new Set(domainMap.keys());

  // Group libraries by main_domain to find domains with libraries but no events
  const libraryDomains = new Set<string>();
  libraryData.forEach(lib => {
    if (lib.main_domain) {
      // Apply domain affiliation to library domains too
      let mainDomain = lib.main_domain;
      const parentDomain = getParentDomain(mainDomain);
      if (parentDomain !== mainDomain) {
        console.log(`🔗 [LibraryAffiliation] Grouping library domain ${mainDomain} under parent ${parentDomain}`);
        mainDomain = parentDomain;
      }

      if (!existingDomains.has(mainDomain)) {
        libraryDomains.add(mainDomain);
      }
    }
  });

  // Create domain entries for library-only domains
  libraryDomains.forEach(domain => {
    console.log(`📚 Adding library-only domain: ${domain}`);

    // Create a minimal domain info for library-only domains
    const domainInfo: DomainInfo = {
      fullDomain: domain,
      baseDomain: domain,
      category: 'main',
      isGrouped: false
    };

    domainMap.set(domain, {
      info: domainInfo,
      requests: [],
      errors: [],
      tokens: [],
      subdomains: new Set<string>([domain]),
      responseTimes: [],
      tabIds: new Set<number>(),
      relatedDomains: new Set<string>(),
      allGroupedDomains: new Set<string>([domain]),
      subdomainStats: new Map()
    });
  });

  console.log(`📚 Added ${libraryDomains.size} library-only domains to stats`);

  // Convert to DomainStats array
  const results = Array.from(domainMap.entries()).map(([mainDomain, group]) => {
    const totalRequests = group.requests.length;
    const errors = group.errors.length;
    const tokens = group.tokens.length;

    const avgResponseTime = group.responseTimes.length > 0
      ? group.responseTimes.reduce((sum, time) => sum + time, 0) / group.responseTimes.length
      : 0;

    const successfulRequests = group.requests.filter(req => {
      // Use same success criteria as global stats: status 200-399
      const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 0;
      return status >= 200 && status < 400;
    }).length;
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

      const subSuccessfulRequests = stats.requests.filter(req => {
        // Use same success criteria as global stats: status 200-399
        const status = req.status ?? req.response_status ?? req.response?.status ?? req.statusCode ?? 0;
        return status >= 200 && status < 400;
      }).length;
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

    // Filter libraries for this domain based on main_domain field
    const domainLibraries = libraryData.filter(lib => {
      // Match libraries that were loaded by this main domain OR its affiliated domains
      if (lib.main_domain === mainDomain) {
        return true;
      }

      // Also include libraries from affiliated domains
      const libParentDomain = getParentDomain(lib.main_domain);
      return libParentDomain === mainDomain;
    });

    // Group libraries by their source domain
    const librarySourceMap = new Map<string, any[]>();
    domainLibraries.forEach(lib => {
      const sourceDomain = lib.source_domain || 'unknown';
      if (!librarySourceMap.has(sourceDomain)) {
        librarySourceMap.set(sourceDomain, []);
      }
      librarySourceMap.get(sourceDomain)!.push(lib);
    });

    // Create library source domain breakdown
    const librarySourceDomains = Array.from(librarySourceMap.entries()).map(([sourceDomain, libs]) => {
      const thirdPartyInfo = LibraryDetector.classifyThirdPartyDomain(sourceDomain);
      return {
        domain: sourceDomain,
        libraries: libs.map(lib => ({
          name: lib.name,
          version: lib.version,
          type: inferLibraryType(lib.name, lib.url),
          confidence: 0.9,
          detectionMethod: 'url-pattern' as const,
          isMinified: true,
          domain: sourceDomain,
          url: lib.url,
          cdnProvider: undefined,
          description: undefined,
          serviceType: 'library' as const
        } as LibraryInfo)),
        count: libs.length,
        isThirdParty: thirdPartyInfo.isThirdParty,
        thirdPartyType: thirdPartyInfo.thirdPartyType
      };
    }).sort((a, b) => b.count - a.count);

    // Convert MinifiedLibrary to LibraryInfo format - preserve original types when possible
    const librariesForDomain: LibraryInfo[] = domainLibraries.map(lib => ({
      name: lib.name,
      version: lib.version,
      type: inferLibraryType(lib.name, lib.url),
      confidence: 0.9, // High confidence for detected libraries
      detectionMethod: 'url-pattern' as const,
      isMinified: true,
      domain: mainDomain,
      url: lib.url,
      cdnProvider: undefined,
      description: undefined,
      serviceType: 'library' as const
    }));

    // Calculate library counts by type
    const frameworkCount = librariesForDomain.filter(lib =>
      ['react', 'vue', 'angular', 'svelte', 'ember'].some(fw => lib.name.toLowerCase().includes(fw))
    ).length;

    const utilityCount = librariesForDomain.filter(lib =>
      ['lodash', 'underscore', 'moment', 'axios', 'fetch'].some(util => lib.name.toLowerCase().includes(util))
    ).length;

    const uiLibraryCount = librariesForDomain.filter(lib =>
      ['bootstrap', 'material', 'antd', 'chakra', 'semantic'].some(ui => lib.name.toLowerCase().includes(ui))
    ).length;

    const analyticsCount = librariesForDomain.filter(lib =>
      ['analytics', 'gtag', 'google', 'mixpanel', 'segment'].some(analytics => lib.name.toLowerCase().includes(analytics))
    ).length;

    const cdnCount = librariesForDomain.filter(lib =>
      ['cdn', 'jsdelivr', 'unpkg', 'cdnjs'].some(cdn => lib.url.toLowerCase().includes(cdn))
    ).length;

    // Classify domain as 3rd party
    const thirdPartyClassification = LibraryDetector.classifyThirdPartyDomain(mainDomain);

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
      },
      // Library information with actual data
      libraries: librariesForDomain,
      libraryCount: librariesForDomain.length,
      librarySourceDomains,
      frameworkCount,
      utilityCount,
      uiLibraryCount,
      analyticsCount,
      cdnCount,
      // 3rd party classification
      isThirdParty: thirdPartyClassification.isThirdParty,
      thirdPartyType: thirdPartyClassification.thirdPartyType,
      // Domain affiliation information
      affiliatedDomains: getAffiliatedDomains(mainDomain),
      parentDomain: mainDomain !== getParentDomain(mainDomain) ? undefined : mainDomain
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
