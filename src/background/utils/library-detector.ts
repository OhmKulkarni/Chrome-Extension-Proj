import { MinifiedLibrary } from '../storage-types';

/**
 * Interface for detected web resource information
 * Covers libraries, services, APIs, endpoints, and other web resources
 */
export interface LibraryInfo {
  name: string;
  version?: string;
  type: 'framework' | 'utility' | 'ui' | 'analytics' | 'polyfill' | 'privacy-tools' | 'tracking-tools' | 'site-tools' | 'media-tools' | 'performance-tools' | 'advertising-service' | 'api-endpoint' | 'streaming-service' | 'data-collector' | 'web-service' | 'build-artifact' | 'websocket' | 'graphql' | 'service-worker' | 'web-font' | 'config-file';
  url: string;
  cdnProvider?: string;
  isMinified: boolean;
  confidence: number;
  domain: string;
  detectionMethod: 'url-pattern' | 'content-analysis' | 'header-analysis' | 'cdn-detection' | 'dom-global' | 'script-analysis' | 'source-map';
  description?: string; // Human-readable description of what this tool does
  serviceType?: 'library' | 'service' | 'endpoint' | 'api' | 'stream' | 'collector' | 'build-artifact' | 'communication' | 'worker' | 'asset' | 'config'; // New field to distinguish resource types
}

export interface DomainLibraryStats {
  domain: string;
  libraries: LibraryInfo[];
  totalLibraries: number;
  frameworksCount: number;
  utilitiesCount: number;
  uiLibrariesCount: number;
  analyticsCount: number;
  polyfillsCount: number;
  privacyToolsCount: number;
  trackingToolsCount: number;
  siteToolsCount: number;
  mediaToolsCount: number;
  performanceToolsCount: number;
  // Service counts
  advertisingServicesCount: number;
  apiEndpointsCount: number;
  streamingServicesCount: number;
  dataCollectorsCount: number;
  webServicesCount: number;
  buildArtifactsCount: number;
  // New resource type counts
  websocketCount: number;
  graphqlCount: number;
  serviceWorkerCount: number;
  webFontCount: number;
  configFileCount: number;
}

// Library detection patterns with DOM signatures
const LIBRARY_PATTERNS = {
  // Major Frameworks
  react: {
    patterns: [/react(?:[-.](\d+\.\d+\.\d+))?/i, /react-dom/i, /react\.production/i, /react\.development/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/],
    globalSignatures: ['React', 'ReactDOM', '__REACT_DEVTOOLS_GLOBAL_HOOK__'],
    domSignatures: ['[data-reactroot]', '[data-react-helmet]', '._react'],
    bundleSignatures: ['react/lib/', 'react-dom/lib/', 'scheduler/lib/']
  },
  vue: {
    patterns: [/vue(?:[-.](\d+\.\d+\.\d+))?/i, /vue\.js/i, /vue\.min/i, /vue\.runtime/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/],
    globalSignatures: ['Vue', '__VUE__', '$vue'],
    domSignatures: ['[data-v-]', 'v-if', 'v-for', 'v-model'],
    bundleSignatures: ['vue/dist/', 'vue-router/', 'vuex/']
  },
  angular: {
    patterns: [/angular(?:[-.](\d+\.\d+\.\d+))?/i, /@angular/i, /angular\.min/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/],
    globalSignatures: ['angular', 'ng', '__NG_ELEMENTS__'],
    domSignatures: ['[ng-app]', '[ng-controller]', 'ng-scope', '_ngcontent'],
    bundleSignatures: ['@angular/', 'angular/core', 'angular/common']
  },

  // Utilities
  jquery: {
    patterns: [/jquery(?:[-.](\d+\.\d+\.\d+))?/i, /jquery\.min/i, /jquery\.slim/i],
    type: 'utility' as const,
    cdnPatterns: [/ajax\.googleapis\.com/, /code\.jquery\.com/, /cdnjs\.cloudflare\.com/],
    globalSignatures: ['jQuery', '$', '__jquery'],
    domSignatures: ['jquery-', '.ui-'],
    bundleSignatures: ['jquery/dist/', 'jquery.min']
  },
  lodash: {
    patterns: [/lodash(?:[-.](\d+\.\d+\.\d+))?/i, /lodash\.min/i],
    type: 'utility' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/],
    globalSignatures: ['_', 'lodash'],
    domSignatures: [],
    bundleSignatures: ['lodash/']
  },
  axios: {
    patterns: [/axios(?:[-.](\d+\.\d+\.\d+))?/i, /axios\.min/i],
    type: 'utility' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/],
    globalSignatures: ['axios'],
    domSignatures: [],
    bundleSignatures: ['axios/dist/', 'axios/lib/']
  },

  // Data Visualization
  d3: {
    patterns: [/d3(?:[-.](\d+\.\d+\.\d+))?/i, /d3\.min/i, /d3\.v[4-7]/i],
    type: 'utility' as const,
    cdnPatterns: [/d3js\.org/, /unpkg\.com/, /cdnjs\.cloudflare\.com/],
    globalSignatures: ['d3'],
    domSignatures: ['d3-', '[data-d3]'],
    bundleSignatures: ['d3-', 'd3/dist/']
  },

  // Analytics & Tracking
  gtag: {
    patterns: [/gtag/i, /google-analytics/i, /googletagmanager/i, /analytics\.js/i, /ga\.js/i],
    type: 'analytics' as const,
    cdnPatterns: [/googletagmanager\.com/, /google-analytics\.com/],
    globalSignatures: ['gtag', 'ga', 'GoogleAnalyticsObject'],
    domSignatures: [],
    bundleSignatures: ['gtag/', 'google-analytics']
  },

  // UI Libraries
  bootstrap: {
    patterns: [/bootstrap(?:[-.](\d+\.\d+\.\d+))?/i, /bootstrap\.min/i],
    type: 'ui' as const,
    cdnPatterns: [/maxcdn\.bootstrapcdn\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/],
    globalSignatures: ['bootstrap'],
    domSignatures: ['btn-', 'col-', 'row', 'container-', 'modal-'],
    bundleSignatures: ['bootstrap/dist/', 'bootstrap/scss/']
  },

  // Privacy & Consent Tools
  onetrust: {
    patterns: [/onetrust/i, /otgpp/i, /otbannersdk/i, /otsdkstub/i, /optanon/i],
    type: 'privacy-tools' as const,
    cdnPatterns: [/onetrust\.com/, /cookielaw\.org/],
    globalSignatures: ['OneTrust', 'OptanonWrapper', 'OT'],
    domSignatures: ['onetrust-', 'optanon-', 'ot-'],
    bundleSignatures: ['onetrust', 'optanon'],
    description: 'GDPR/Privacy compliance and cookie consent management'
  },
  cookiebot: {
    patterns: [/cookiebot/i, /cookiebanner/i],
    type: 'privacy-tools' as const,
    cdnPatterns: [/consent\.cookiebot\.com/],
    globalSignatures: ['Cookiebot'],
    domSignatures: ['cookiebot-', 'cb-'],
    bundleSignatures: ['cookiebot'],
    description: 'Cookie consent and privacy compliance'
  },

  // Identity & Tracking Tools
  universalid: {
    patterns: [/universalid/i, /iiquniversalid/i, /id-sync/i, /identity.*sync/i],
    type: 'tracking-tools' as const,
    cdnPatterns: [/adsystem\.amazon/, /liveramp\.com/],
    globalSignatures: ['universalId', 'iiq'],
    domSignatures: [],
    bundleSignatures: ['universalid', 'identity'],
    description: 'Cross-site user identification and audience synchronization'
  },
  trackingpixel: {
    patterns: [/pixel/i, /beacon/i, /collect/i, /track(?:ing)?/i],
    type: 'tracking-tools' as const,
    cdnPatterns: [/facebook\.com/, /google-analytics\.com/, /doubleclick\.net/],
    globalSignatures: ['fbq', '_gaq', 'gtag'],
    domSignatures: [],
    bundleSignatures: ['pixel', 'tracking'],
    description: 'User behavior tracking and analytics collection'
  },

  // Site-Specific Tools
  authentication: {
    patterns: [/auth(?:entication)?/i, /login/i, /oauth/i, /sso/i],
    type: 'site-tools' as const,
    cdnPatterns: [/auth0\.com/, /okta\.com/],
    globalSignatures: ['Auth0', 'okta'],
    domSignatures: ['auth-', 'login-'],
    bundleSignatures: ['auth', 'login'],
    description: 'User authentication and access control'
  },
  sitefeatures: {
    patterns: [/landing/i, /freeview/i, /zion/i, /paywall/i],
    type: 'site-tools' as const,
    cdnPatterns: [],
    globalSignatures: [],
    domSignatures: [],
    bundleSignatures: ['landing', 'freeview', 'zion'],
    description: 'Site-specific features and business logic'
  },

  // Media & Performance Tools
  videotools: {
    patterns: [/video/i, /player/i, /stream/i, /jwplayer/i, /videojs/i],
    type: 'media-tools' as const,
    cdnPatterns: [/jwplatform\.com/, /vimeo\.com/, /youtube\.com/],
    globalSignatures: ['jwplayer', 'videojs', 'Vimeo'],
    domSignatures: ['video-', 'player-'],
    bundleSignatures: ['video', 'player'],
    description: 'Video streaming and media playback'
  },
  loadingtools: {
    patterns: [/load(?:er)?/i, /lazy/i, /defer/i, /preload/i],
    type: 'performance-tools' as const,
    cdnPatterns: [],
    globalSignatures: ['LazyLoad', 'IntersectionObserver'],
    domSignatures: ['lazy-', 'loading-'],
    bundleSignatures: ['lazy', 'loader'],
    description: 'Content loading optimization and lazy loading'
  }
};

// CDN provider detection
const CDN_PROVIDERS = {
  'cdnjs.cloudflare.com': 'Cloudflare',
  'unpkg.com': 'UNPKG',
  'jsdelivr.net': 'jsDelivr',
  'ajax.googleapis.com': 'Google Hosted Libraries',
  'code.jquery.com': 'jQuery CDN',
  'maxcdn.bootstrapcdn.com': 'Bootstrap CDN',
  'static.hotjar.com': 'Hotjar',
  'cdn.segment.com': 'Segment',
  'googletagmanager.com': 'Google Tag Manager',
  'polyfill.io': 'Polyfill.io'
};

export class LibraryDetector {
  /**
   * Classify the type of 3rd party domain for UI indicators
   */
  static classifyThirdPartyDomain(domain: string): { isThirdParty: boolean; thirdPartyType?: 'advertising' | 'tracking' | 'cdn' | 'analytics' | 'social' | 'other' } {
    // CDN domains
    const cdnDomains = [
      'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'ajax.googleapis.com',
      'code.jquery.com', 'stackpath.bootstrapcdn.com', 'maxcdn.bootstrapcdn.com',
      'use.fontawesome.com', 'fonts.googleapis.com', 'fonts.gstatic.com'
    ];

    // Analytics domains
    const analyticsDomains = [
      'google-analytics.com', 'googletagmanager.com', 'hotjar.com', 'mixpanel.com',
      'segment.com', 'amplitude.com', 'browser-intake-datadoghq.com'
    ];

    // Social media domains
    const socialDomains = [
      'facebook.net', 'twitter.com', 'linkedin.com', 'pinterest.com',
      'instagram.com', 'snapchat.com', 'tiktok.com'
    ];

    // Ad/tracking domains
    const adTrackingDomains = [
      'casalemedia.com', 'criteo.com', 'adsrvr.org', 'pubmatic.com', 'doubleclick.net',
      'googlesyndication.com', 'googleadservices.com', 'amazon-adsystem.com'
    ];

    // Check CDN
    if (cdnDomains.some(cdn => domain.includes(cdn)) || /cdn|static|assets/.test(domain)) {
      return { isThirdParty: true, thirdPartyType: 'cdn' };
    }

    // Check analytics
    if (analyticsDomains.some(analytics => domain.includes(analytics))) {
      return { isThirdParty: true, thirdPartyType: 'analytics' };
    }

    // Check social
    if (socialDomains.some(social => domain.includes(social))) {
      return { isThirdParty: true, thirdPartyType: 'social' };
    }

    // Check advertising/tracking
    if (adTrackingDomains.some(ad => domain.includes(ad))) {
      return { isThirdParty: true, thirdPartyType: 'advertising' };
    }

    // Default: not identified as 3rd party
    return { isThirdParty: false };
  }

  /**
   * Main detection method that analyzes a request for library usage
   */
  static detectFromRequest(url: string, headers: Record<string, any> = {}, responseBody?: string): LibraryInfo[] {
    console.log('[LibraryDetector] Analyzing request:', { url, hasHeaders: Object.keys(headers).length > 0, hasBody: !!responseBody });

    const libraries: LibraryInfo[] = [];
    const domain = new URL(url).hostname;

    // Detect from URL patterns
    const urlLibraries = this.detectFromUrl(url);
    console.log('[LibraryDetector] URL pattern detection:', { url, found: urlLibraries.length, libraries: urlLibraries });
    libraries.push(...urlLibraries);

    // Detect from headers if available
    if (Object.keys(headers).length > 0) {
      const headerLibraries = this.detectFromHeaders(headers, url);
      console.log('[LibraryDetector] Header detection:', { url, found: headerLibraries.length, libraries: headerLibraries });
      libraries.push(...headerLibraries);
    }

    // Detect from response content if available
    if (responseBody) {
      const contentLibraries = this.detectFromContent(responseBody, url);
      console.log('[LibraryDetector] Content detection:', { url, found: contentLibraries.length, libraries: contentLibraries });
      libraries.push(...contentLibraries);
    }

    // Deduplicate and set domain for all libraries
    const uniqueLibraries = this.deduplicateLibraries(libraries);
    uniqueLibraries.forEach(lib => {
      lib.domain = domain;
    });

    console.log('[LibraryDetector] Final detection results:', { url, detectedCount: uniqueLibraries.length, libraries: uniqueLibraries });
    return uniqueLibraries;
  }

  /**
   * Detect libraries based on URL patterns
   */
  private static detectFromUrl(url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];
    const urlLower = url.toLowerCase();

    console.log('[LibraryDetector] detectFromUrl starting:', { url, urlLower });

    // 🚨 PRIORITY CHECK: Build artifacts (source maps) should be detected FIRST
    // This prevents them from being misclassified as API endpoints or other types
    const filename = url.split('/').pop() || '';
    const buildArtifactInfo = this.detectBuildArtifact(url, filename);
    if (buildArtifactInfo) {
      console.log('[LibraryDetector] Build artifact detected early:', buildArtifactInfo);
      return [buildArtifactInfo]; // Return immediately - no need for further processing
    }

    // Check against known library patterns
    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = urlLower.match(pattern);
        if (match) {
          console.log('[LibraryDetector] Pattern match found:', { libraryName, pattern: pattern.source, url });
          const version = match[1] || undefined;
          const cdnProvider = this.detectCdnProvider(url);

          libraries.push({
            name: libraryName,
            version,
            type: config.type,
            url,
            cdnProvider,
            isMinified: this.isMinified(url),
            confidence: cdnProvider ? 0.9 : 0.7, // Higher confidence for CDN sources
            domain: '',
            detectionMethod: 'url-pattern'
          });
        }
      }
    }

    // Try generic library detection for URLs that look like libraries
    console.log('[LibraryDetector] Attempting generic detection for:', url);
    const genericLibrary = this.detectGenericLibrary(url);
    if (genericLibrary) {
      console.log('[LibraryDetector] Generic detection success:', genericLibrary);
      libraries.push(genericLibrary);
    } else {
      console.log('[LibraryDetector] Generic detection failed for:', url);
    }

    console.log('[LibraryDetector] detectFromUrl finished:', { url, foundCount: libraries.length, libraries });
    return libraries;
  }

  /**
   * Enhanced generic tool detection with intelligent categorization
   */
  private static detectGenericLibrary(url: string): LibraryInfo | null {
    const filename = url.split('/').pop() || '';

    // Only filter out obvious non-JavaScript resources
    const nonJavaScriptPatterns = [
      /\.(css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|xml|json)(\?|$)/i,
      /\/images\//, /\/img\//, /\/css\//, /\/fonts\//
    ];

    if (nonJavaScriptPatterns.some(pattern => pattern.test(url))) {
      return null;
    }

    // Note: Build artifact detection is now handled earlier in detectFromUrl for priority

    // Extract tool name from URL - be more flexible about file extensions
    let toolName = '';

    // First try to get name from filename
    if (filename) {
      // Remove common JavaScript extensions and query parameters
      toolName = filename
        .replace(/\.(?:min\.)?js(\?.*)?$/i, '') // Remove .js, .min.js with query params
        .replace(/\?.*$/, '') // Remove any remaining query parameters
        .toLowerCase();
    }

    // If no good filename, try to get name from path
    if (!toolName || toolName.length < 1) {
      const pathParts = url.split('/').filter(part => part && !part.includes('.') && part.length > 0);
      toolName = pathParts[pathParts.length - 1] || '';
    }

    // If still no name, try to extract from URL path more aggressively
    if (!toolName || toolName.length < 1) {
      try {
        const urlPath = new URL(url, 'https://example.com').pathname;
        const pathSegments = urlPath.split('/').filter(segment => segment.length > 0);
        toolName = pathSegments[pathSegments.length - 1] || 'unknown-script';

        // Clean up the tool name
        toolName = toolName
          .replace(/\?.*$/, '') // Remove query params
          .replace(/\.(min\.)?js$/i, '') // Remove JS extensions
          .toLowerCase();
      } catch (e) {
        // Fallback for invalid URLs
        toolName = 'unknown-script';
      }
    }

    // Skip if tool name is too short or generic
    if (!toolName || toolName.length < 2 || toolName === 'unknown-script') {
      return null;
    }

    console.log('[LibraryDetector] Generic detection for:', { url, filename, toolName });

    // Intelligent categorization based on patterns
    const categorization = this.categorizeWebTool(toolName, url);

    // Extract version if available
    const versionMatch = url.match(/(\d+\.\d+(?:\.\d+)?)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    return {
      name: toolName,
      version,
      type: categorization.type,
      url,
      cdnProvider: this.detectCdnProvider(url),
      isMinified: /\.min\.js/i.test(filename),
      confidence: version ? 0.8 : 0.6, // Higher confidence if versioned
      domain: '',
      detectionMethod: 'url-pattern',
      description: categorization.description,
      serviceType: categorization.serviceType as 'library' | 'service' | 'endpoint' | 'api' | 'stream' | 'collector' | 'build-artifact'
    };
  }

  /**
   * 🏗️ NEW: Detect Build Artifacts (webpack bundles, minified builds, etc.)
   * These are NOT libraries but bundled/compiled assets from build tools
   */
  private static detectBuildArtifact(url: string, filename: string): LibraryInfo | null {
    const urlLower = url.toLowerCase();
    const filenameLower = filename.toLowerCase();

    // 🚨 PRIORITY: Source Maps (highest priority for build artifacts)
    // Enhanced detection for source maps including query parameters
    // Multiple robust detection patterns for source maps
    const isSourceMap = 
      /\.map(\?|$|&)/i.test(url) ||           // .map followed by query, end, or &
      /\.map$/i.test(filename) ||             // filename ends with .map
      /\.map\?/i.test(url) ||                 // .map followed by query params
      url.endsWith('.map') ||                 // URL ends with .map
      filename.endsWith('.map') ||            // filename ends with .map
      /[?&]\w+\.map($|&)/i.test(url) ||      // .map in query parameters
      /\.map[?&]/i.test(url);                 // .map followed by query params

    if (isSourceMap) {
      let baseName = filename.replace(/\.map$/i, '').replace(/\?.*$/, '');

      // Handle source maps in query parameters like "tag?...&upapi=true.map"
      if (!baseName || baseName.includes('?')) {
        try {
          // Try to parse as full URL first
          let urlObj;
          if (url.startsWith('http')) {
            urlObj = new URL(url);
          } else {
            // Handle relative URLs by adding a dummy base
            urlObj = new URL(url, 'https://example.com/');
          }
          
          let potentialName = urlObj.pathname.split('/').pop() || '';
          
          // Check if .map appears in query parameters
          if (urlObj.search.includes('.map')) {
            const queryMatch = urlObj.search.match(/(\w+)\.map/);
            if (queryMatch) {
              potentialName = queryMatch[1];
            }
          }
          
          // Fallback to path-based name
          if (!potentialName || potentialName.includes('?')) {
            potentialName = urlObj.pathname.split('/').pop()?.split('?')[0] || 'source-map';
          }
          
          baseName = potentialName.replace(/\.map.*$/, '') || 'source-map';
        } catch (e) {
          // Fallback parsing for problematic URLs
          const parts = url.split(/[?&]/);
          for (const part of parts) {
            if (part.includes('.map')) {
              const mapMatch = part.match(/(\w+)\.map/);
              if (mapMatch) {
                baseName = mapMatch[1];
                break;
              }
            }
          }
          if (!baseName) {
            baseName = 'source-map';
          }
        }
      }

      return {
        name: baseName || 'source-map',
        version: undefined,
        type: 'build-artifact',
        url,
        cdnProvider: this.detectCdnProvider(url),
        isMinified: false,
        confidence: 0.99, // Very high confidence for source maps
        domain: '',
        detectionMethod: 'source-map',
        description: 'Source map for debugging',
        serviceType: 'build-artifact'
      };
    }

    // Build artifact patterns - files generated by build tools, not actual libraries
    const buildArtifactPatterns = [
      // Webpack/Bundle patterns with content hashes
      /^[a-zA-Z0-9_-]*[-_]?v?\d*[-_]?[a-f0-9]{8,}(\.min)?\.(js|br\.js|gz\.js)$/i, // main-v2_59e560d0d47d739292b20b3756404e4f.br.js
      /^[a-zA-Z0-9_-]*[-_]?[a-f0-9]{32,}(\.min)?\.(js|br\.js|gz\.js)$/i, // content hashes
      /^[a-zA-Z0-9_-]*[-_]?[a-f0-9]{8,16}(\.min)?\.(js|br\.js|gz\.js)$/i, // shorter hashes

      // Common build tool output patterns
      /^(main|app|bundle|chunk|vendor|runtime|commons?|manifest|polyfills?)[-_.]?[a-f0-9]{6,}(\.min)?\.(js|br\.js|gz\.js)$/i,
      /^[a-f0-9]{6,}\.(js|br\.js|gz\.js)$/i, // Pure hash filenames

      // Build tool specific patterns
      /webpack[-_.]?[a-f0-9]/i, // webpack outputs
      /rollup[-_.]?[a-f0-9]/i,  // rollup outputs
      /vite[-_.]?[a-f0-9]/i,    // vite outputs
      /parcel[-_.]?[a-f0-9]/i,  // parcel outputs

      // Compressed bundle indicators
      /\.(br|brotli|gz|gzip)\.js$/i, // Brotli/gzip compressed bundles

      // Module/chunk patterns
      /^(esm|cjs|umd|iife)[-_.]?[a-f0-9]/i, // module format with hash
      /^[0-9]+\.[a-f0-9]{6,}\.js$/i, // numbered chunks with hashes
    ];

    // URL-based build artifact detection
    const urlBuildPatterns = [
      /\/_next\//i,           // Next.js builds
      /\/_nuxt\//i,           // Nuxt.js builds
      /\/build\//i,           // Generic build directories
      /\/dist\//i,            // Distribution directories
      /\/assets\//i,          // Asset directories
      /\/static\/js\//i,      // Static JavaScript assets
      /\/chunks?\//i,         // Chunk directories
      /\/bundles?\//i,        // Bundle directories
    ];

    // Check filename patterns
    const hasContentHash = /[a-f0-9]{8,}/.test(filenameLower);
    const isCompressed = /\.(br|brotli|gz|gzip)\.js$/i.test(filenameLower);
    const matchesBuildPattern = buildArtifactPatterns.some(pattern => pattern.test(filenameLower));
    const matchesUrlPattern = urlBuildPatterns.some(pattern => pattern.test(urlLower));

    if (matchesBuildPattern || (hasContentHash && (isCompressed || matchesUrlPattern))) {
      console.log('[LibraryDetector] Build artifact detected:', {
        filename: filenameLower,
        hasContentHash,
        isCompressed,
        matchesBuildPattern,
        matchesUrlPattern
      });

      // Extract meaningful name from build artifact
      let displayName = filename;

      // Try to extract base name before hash/version
      const hashMatch = filenameLower.match(/^([a-zA-Z0-9_-]+?)[-_.]+[a-f0-9]{6,}/i);
      if (hashMatch) {
        displayName = hashMatch[1];
      }

      // Clean up common build prefixes/suffixes
      displayName = displayName
        .replace(/\.(min\.)?js$/i, '')
        .replace(/^(main|app|bundle|chunk|vendor|runtime|commons?|manifest|polyfills?)[-_.]?/i, '')
        .replace(/[-_.]?(min|minified)$/i, '');

      // If name becomes too generic, use more descriptive naming
      if (!displayName || displayName.length < 2 || /^[a-f0-9]+$/i.test(displayName)) {
        if (filenameLower.includes('main')) displayName = 'main-bundle';
        else if (filenameLower.includes('vendor')) displayName = 'vendor-bundle';
        else if (filenameLower.includes('chunk')) displayName = 'chunk-bundle';
        else if (filenameLower.includes('runtime')) displayName = 'runtime-bundle';
        else if (isCompressed) displayName = 'compressed-bundle';
        else displayName = 'build-bundle';
      }

      // Detect build tool if possible
      let buildTool = 'unknown';
      if (urlLower.includes('webpack')) buildTool = 'webpack';
      else if (urlLower.includes('rollup')) buildTool = 'rollup';
      else if (urlLower.includes('vite')) buildTool = 'vite';
      else if (urlLower.includes('parcel')) buildTool = 'parcel';
      else if (urlLower.includes('_next')) buildTool = 'next.js';
      else if (urlLower.includes('_nuxt')) buildTool = 'nuxt.js';

      return {
        name: displayName,
        version: buildTool !== 'unknown' ? buildTool : undefined,
        type: 'build-artifact',
        url,
        cdnProvider: this.detectCdnProvider(url),
        isMinified: /\.min\./i.test(filename) || isCompressed,
        confidence: 0.95, // High confidence for build artifacts
        domain: '',
        detectionMethod: 'url-pattern',
        description: `Build tool output${buildTool !== 'unknown' ? ` (${buildTool})` : ''}${isCompressed ? ' - compressed' : ''}`,
        serviceType: 'build-artifact'
      };
    }

    return null;
  }

  /**
   * Categorize web tools based on name and URL patterns
   */
  private static categorizeWebTool(name: string, url: string): { type: LibraryInfo['type']; description: string; serviceType?: string } {
    const nameLower = name.toLowerCase();
    const urlLower = url.toLowerCase();

    // 🚨 PRIORITY 1: TRACKING & SYNC SERVICES (very specific patterns first)
    if (/(?:sync\?|trackingpixel|beacon|universalid-sync|track\?|pixel\?|collect\?)/i.test(urlLower) ||
        /(?:universalid|iiquniversalid|sync|trackingpixel|beacon)/i.test(nameLower)) {
      return {
        type: 'tracking-tools',
        description: 'User tracking and identity synchronization',
        serviceType: 'tracking'
      };
    }

    // 🎯 PRIORITY 1.5: DATA VISUALIZATION LIBRARIES (D3.js specifically - before advertising check)
    if (/\bd3(?:\.min)?\.js\b/i.test(urlLower) || (/\bd3\b/i.test(nameLower) && /\.js$/i.test(urlLower))) {
      return {
        type: 'media-tools',
        description: 'Data visualization library (D3.js)',
        serviceType: 'library'
      };
    }

    // 🚨 PRIORITY 2: ADVERTISING & MARKETING SERVICES (include AdFuel + enhanced patterns)
    // Note: D3.js is handled above, so we can include 'd3' in ad patterns for other contexts
    if (/(?:casalemedia|criteo|adsrvr|pubmatic|doubleclick|adsystem|bidder|cdb|translator|hbopenbid|wunderkind|magnite|sodar|rid|adfuel|gpt|apstag|pubads|cygnus|videotools|3159)/i.test(nameLower + urlLower) ||
        /(?:dfp_premium|instream|video_ad|video-ad)/i.test(urlLower)) {
      return {
        type: 'advertising-service',
        description: 'Advertising and marketing service',
        serviceType: 'service'
      };
    }

    // 🚨 PRIORITY 3: ANALYTICS & DATA COLLECTION (include chartbeat_video + enhanced patterns)
    if (/(?:collector|logs|analytics|browser-intake|optimizely|events|datadog|segment|amplitude|hotjar|gtag|ga|chartbeat|streamsense|tp2|trackingpixel|turner|geo4)/i.test(nameLower + urlLower)) {
      return {
        type: 'data-collector',
        description: 'Analytics and data collection service',
        serviceType: 'collector'
      };
    }

    // 🚨 PRIORITY 4: TAG MANAGEMENT & LAUNCH TOOLS (include Adobe Launch + enhanced patterns)
    if (/(?:launch[-_.]|adobe|tag|gtm|googletagmanager|tealium|launch-[a-f0-9]{10,})/i.test(nameLower + urlLower)) {
      return {
        type: 'site-tools',
        description: 'Tag management and site optimization',
        serviceType: 'library'
      };
    }

    // 🚨 PRIORITY 5: MEDIA & STREAMING SERVICES (more restrictive now)
    if (/(?:livestream|manifests|streaming|warnermediacdn|live-manifests|jwplayer|media-stream|cnn-adfuel)/i.test(nameLower + urlLower) &&
        !(/(?:chartbeat|analytics|track|collect|cygnus|d3|videotools)/i.test(nameLower + urlLower))) {
      return {
        type: 'streaming-service',
        description: 'Media streaming and content delivery service',
        serviceType: 'stream'
      };
    }

    // 🎯 PRIVACY & COMPLIANCE SERVICES (enhanced patterns)
    if (/(?:onetrust|otgpp|otbanner|otsdkstub|cookiebot|consent|privacy|gdpr|ccpa|optanon|adsafeprotected|adtrafficquality|iaspet|sitefeatures)/i.test(nameLower + urlLower)) {
      return {
        type: 'privacy-tools',
        description: 'Privacy compliance and security service',
        serviceType: 'service'
      };
    }

    // 🎯 SITE-SPECIFIC FEATURES (Traditional Libraries)
    if (/(?:auth|login|landing|landingprod|freeview|zion|web-client|mb|paywall|checkout|cart|alerts|authentication|reg)/i.test(nameLower + urlLower)) {
      return {
        type: 'site-tools',
        description: 'Site-specific functionality and features',
        serviceType: 'library'
      };
    }

    // 🎯 PERFORMANCE LIBRARIES (Traditional Libraries)
    if (/(?:loadingtools|load|loader|lazy|defer|preload|cache|optimize|compress|psm|taglw|campaign-index|website|build-bundle)/i.test(nameLower + urlLower)) {
      return {
        type: 'performance-tools',
        description: 'Performance optimization and loading libraries',
        serviceType: 'library'
      };
    }

    // 🎯 NEW RESOURCE TYPES

    // WebSocket and Real-time Communication
    if (/(?:websocket|ws|socket\.io|sockjs|realtime|sse|server-sent|push-notifications)/i.test(nameLower + urlLower)) {
      return {
        type: 'websocket',
        description: 'Real-time communication and WebSocket connection',
        serviceType: 'communication'
      };
    }

    // GraphQL APIs
    if (/(?:graphql|gql|apollo|relay|query|mutation|subscription)/i.test(nameLower + urlLower)) {
      return {
        type: 'graphql',
        description: 'GraphQL API endpoint and query service',
        serviceType: 'api'
      };
    }

    // Service Workers and Background Scripts
    if (/(?:service-worker|serviceworker|sw\.js|worker|webworker|background)/i.test(nameLower + urlLower)) {
      return {
        type: 'service-worker',
        description: 'Background worker or service worker script',
        serviceType: 'worker'
      };
    }

    // Web Fonts
    if (/(?:font|typeface|typography|woff|woff2|ttf|otf|eot|webfont)/i.test(nameLower + urlLower)) {
      return {
        type: 'web-font',
        description: 'Web font and typography resource',
        serviceType: 'asset'
      };
    }

    // Configuration and Manifest Files
    if (/(?:config|manifest|settings|env|environment|\.json|\.xml|\.yaml|\.yml)/i.test(nameLower + urlLower)) {
      return {
        type: 'config-file',
        description: 'Configuration or application manifest file',
        serviceType: 'config'
      };
    }

    // 🎯 API ENDPOINTS & WEB SERVICES (more restrictive now - LOWER PRIORITY)
    // Exclude source maps and build artifacts explicitly
    if (/(?:api\/|endpoint|service|reg|segments|desktop|pub\/|v2\/|receive|wmcdp|zetaglobal|lijit|direct|ssp|wknd)/i.test(urlLower) &&
        !(/(?:sync|track|collect|analytics|logs|stream|video|auth|tag|launch|\.map)/i.test(nameLower + urlLower))) {
      return {
        type: 'api-endpoint',
        description: 'API endpoint or web service',
        serviceType: 'api'
      };
    }

    // 🎯 TRADITIONAL JAVASCRIPT LIBRARIES
    // Framework Detection
    if (/(?:react|vue|angular|ember|backbone)/i.test(nameLower)) {
      return {
        type: 'framework',
        description: 'JavaScript framework',
        serviceType: 'library'
      };
    }

    // UI Libraries (distinguished from utilities)
    if (/(?:bootstrap|material|semantic|foundation|bulma|tailwind)/i.test(nameLower)) {
      return {
        type: 'ui',
        description: 'User interface library',
        serviceType: 'library'
      };
    }

    // Utility Libraries (DOM manipulation, HTTP, general-purpose)
    if (/(?:jquery|lodash|underscore|axios|fetch|polyfill|moment|dayjs|uuid|validator|ramda|rxjs|immutable)/i.test(nameLower)) {
      return {
        type: 'utility',
        description: 'JavaScript utility library',
        serviceType: 'library'
      };
    }

    // Resource Collections (multiple mixed tools/libraries from CDNs)
    if (/(?:rc[a-f0-9]{32}|ex[a-f0-9]{32}|zfh-\d+)/i.test(nameLower)) {
      return {
        type: 'utility',
        description: 'Resource collection or mixed utility bundle',
        serviceType: 'library'
      };
    }

    // Generic utilities (fallback)
    return {
      type: 'utility',
      description: 'JavaScript utility or web resource',
      serviceType: 'library'
    };
  }

  /**
   * Detect libraries from response content
   */
  private static detectFromContent(content: string, url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    // Look for library signatures in the content
    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          libraries.push({
            name: libraryName,
            version: undefined,
            type: config.type,
            url,
            cdnProvider: this.detectCdnProvider(url),
            isMinified: this.isMinified(url),
            confidence: 0.7,
            domain: '',
            detectionMethod: 'content-analysis',
            description: this.getDefaultDescription(config.type)
          });
          break; // Avoid duplicates for the same library
        }
      }
    }

    return libraries;
  }

  /**
   * Detect libraries from HTTP headers
   */
  private static detectFromHeaders(headers: Record<string, any>, url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    // Check common headers that might indicate library usage
    const headerString = JSON.stringify(headers).toLowerCase();

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(headerString)) {
          libraries.push({
            name: libraryName,
            version: undefined,
            type: config.type,
            url,
            cdnProvider: this.detectCdnProvider(url),
            isMinified: this.isMinified(url),
            confidence: 0.6,
            domain: '',
            detectionMethod: 'header-analysis'
          });
          break;
        }
      }
    }

    return libraries;
  }

  /**
   * Detect CDN provider from URL
   */
  private static detectCdnProvider(url: string): string | undefined {
    for (const [cdnPattern, cdnName] of Object.entries(CDN_PROVIDERS)) {
      if (url.includes(cdnPattern)) {
        return cdnName;
      }
    }
    return undefined;
  }

  /**
   * Check if a JavaScript file is minified
   */
  private static isMinified(url: string): boolean {
    return /\.min\.js$/i.test(url) || url.includes('minified');
  }

  /**
   * Remove duplicate libraries based on name and domain
   */
  private static deduplicateLibraries(libraries: LibraryInfo[]): LibraryInfo[] {
    const seen = new Set<string>();
    return libraries.filter(lib => {
      const key = `${lib.name}-${lib.domain}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 🚀 ADVANCED: Detect libraries from DOM globals and window objects
   * This can detect libraries that were loaded before network monitoring started
   */
  static detectFromDOMGlobals(windowObj: any, domain: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    // Native browser APIs that should NOT be detected as libraries
    const NATIVE_BROWSER_APIS = new Set([
      'IntersectionObserver', 'MutationObserver', 'ResizeObserver', 'PerformanceObserver',
      'AbortController', 'AbortSignal', 'Blob', 'URL', 'URLSearchParams',
      'FormData', 'Headers', 'Request', 'Response', 'fetch',
      'XMLHttpRequest', 'EventSource', 'WebSocket',
      'localStorage', 'sessionStorage', 'indexedDB',
      'crypto', 'console', 'navigator', 'location', 'history',
      'document', 'window', 'screen', 'performance'
    ]);

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      if (config.globalSignatures) {
        for (const signature of config.globalSignatures) {
          // Skip native browser APIs
          if (NATIVE_BROWSER_APIS.has(signature)) {
            console.log(`🚫 [LibraryDetector] Skipping native API: ${signature}`);
            continue;
          }

          if (windowObj[signature]) {
            const globalObj = windowObj[signature];
            let version: string | undefined;

            // Try to extract version from common version properties
            if (globalObj.version) version = globalObj.version;
            else if (globalObj.VERSION) version = globalObj.VERSION;
            else if (globalObj.fn && globalObj.fn.jquery) version = globalObj.fn.jquery; // jQuery specific
            else if (globalObj.VERSION_INFO) version = globalObj.VERSION_INFO;

            libraries.push({
              name: libraryName,
              version,
              type: config.type,
              url: `${domain}/detected-from-global`,
              isMinified: false, // Can't determine from global
              confidence: 0.9,
              domain,
              detectionMethod: 'dom-global'
            });

            console.log(`🌍 [LibraryDetector] Detected ${libraryName} from global:`, signature, version ? `v${version}` : 'unknown version');
            break; // Found one signature, don't need to check others
          }
        }
      }
    }

    // ENHANCED: Also check for custom/unknown libraries with version properties
    console.log('🔍 [LibraryDetector] Scanning for custom libraries with version properties...');

    // Look for objects on window that have version properties (common library pattern)
    const customLibraryNames = [
      'MyCustomFramework', 'AnalyticsSDK', 'UIComponents', 'TestFramework',
      'fakeAnalytics', 'customLibrary', 'myLibrary'
    ];

    // DEBUG: Log what's actually on the window object
    console.log('🔍 [LibraryDetector] Window object inspection:', {
      MyCustomFramework: !!windowObj.MyCustomFramework,
      AnalyticsSDK: !!windowObj.AnalyticsSDK,
      UIComponents: !!windowObj.UIComponents,
      React: !!windowObj.React,
      _: !!windowObj._,
      jQuery: !!windowObj.jQuery,
      $: !!windowObj.$
    });

    for (const libName of customLibraryNames) {
      console.log(`🔍 [LibraryDetector] Checking ${libName}:`, {
        exists: !!windowObj[libName],
        type: typeof windowObj[libName],
        hasVersion: windowObj[libName]?.version,
        hasVERSION: windowObj[libName]?.VERSION
      });

      if (windowObj[libName] && typeof windowObj[libName] === 'object') {
        const libObj = windowObj[libName];
        if (libObj.version || libObj.VERSION) {
          const version = libObj.version || libObj.VERSION;

          // Determine library type from name patterns
          let type: 'framework' | 'utility' | 'ui' | 'analytics' | 'polyfill' = 'utility';
          if (libName.toLowerCase().includes('framework')) type = 'framework';
          else if (libName.toLowerCase().includes('analytics') || libName.toLowerCase().includes('tracking')) type = 'analytics';
          else if (libName.toLowerCase().includes('ui') || libName.toLowerCase().includes('component')) type = 'ui';

          libraries.push({
            name: libName,
            version: String(version),
            type,
            url: `${domain}/custom-library`,
            isMinified: false,
            confidence: 0.8, // Slightly lower confidence for custom detection
            domain,
            detectionMethod: 'dom-global'
          });

          console.log(`🌟 [LibraryDetector] Detected custom library ${libName} v${version}`);
        }
      }
    }

    return libraries;
  }

  /**
   * 🚀 ADVANCED: Detect libraries from DOM structure and CSS classes
   * This can identify UI frameworks by their CSS patterns and DOM attributes
   */
  static detectFromDOMStructure(documentObj: Document, domain: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      if (config.domSignatures && config.domSignatures.length > 0) {
        let foundSignatures = 0;

        for (const signature of config.domSignatures) {
          try {
            // Check if it's an attribute selector
            if (signature.startsWith('[') && signature.endsWith(']')) {
              if (documentObj.querySelector(signature)) {
                foundSignatures++;
              }
            } else {
              // Check for CSS classes or element names
              const elements = documentObj.querySelectorAll(`[class*="${signature}"], [id*="${signature}"]`);
              if (elements.length > 0) {
                foundSignatures++;
              }
            }
          } catch (e) {
            // Invalid selector, skip
          }
        }

        // If we found multiple signatures, it's likely this library
        if (foundSignatures >= Math.min(2, config.domSignatures.length)) {
          libraries.push({
            name: libraryName,
            version: undefined,
            type: config.type,
            url: `${domain}/detected-from-dom`,
            isMinified: false,
            confidence: 0.8,
            domain,
            detectionMethod: 'dom-global'
          });

          console.log(`🎨 [LibraryDetector] Detected ${libraryName} from DOM structure:`, `${foundSignatures}/${config.domSignatures.length} signatures found`);
        }
      }
    }

    return libraries;
  }

  /**
   * 🚀 ADVANCED: Analyze bundled JavaScript for library signatures
   * This can detect minified/bundled libraries by analyzing source code patterns
   */
  static detectFromBundleAnalysis(scriptContent: string, scriptUrl: string, domain: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      if (config.bundleSignatures) {
        let confidence = 0;
        let detectedSignatures: string[] = [];

        for (const signature of config.bundleSignatures) {
          if (scriptContent.includes(signature)) {
            confidence += 0.3;
            detectedSignatures.push(signature);
          }
        }

        // Additional pattern checks for more confidence
        for (const pattern of config.patterns) {
          if (pattern.test(scriptContent)) {
            confidence += 0.4;
          }
        }

        // If confidence is high enough, consider it detected
        if (confidence >= 0.6) {
          libraries.push({
            name: libraryName,
            version: undefined, // Hard to extract from minified code
            type: config.type,
            url: scriptUrl,
            isMinified: this.isMinified(scriptUrl) || scriptContent.length > 50000, // Large files likely minified
            confidence: Math.min(confidence, 1.0),
            domain,
            detectionMethod: 'script-analysis'
          });

          console.log(`📦 [LibraryDetector] Detected ${libraryName} from bundle analysis:`, {
            url: scriptUrl.substring(0, 80),
            signatures: detectedSignatures,
            confidence: confidence.toFixed(2)
          });
        }
      }
    }

    return libraries;
  }

  /**
   * 🚀 ADVANCED: Detect libraries from source maps
   * This can identify original library sources even in production builds
   */
  static detectFromSourceMaps(sourceMapData: any, domain: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    if (!sourceMapData || !sourceMapData.sources) return libraries;

    const sources = sourceMapData.sources || [];

    for (const source of sources) {
      const sourceLower = source.toLowerCase();

      for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
        if (config.bundleSignatures) {
          for (const signature of config.bundleSignatures) {
            if (sourceLower.includes(signature.toLowerCase())) {
              // Try to extract version from source path
              const versionMatch = source.match(/(\d+\.\d+\.\d+)/);

              libraries.push({
                name: libraryName,
                version: versionMatch ? versionMatch[1] : undefined,
                type: config.type,
                url: `${domain}/source-map-detected`,
                isMinified: true, // Source maps typically indicate minified builds
                confidence: 0.95, // Very high confidence from source maps
                domain,
                detectionMethod: 'source-map'
              });

              console.log(`🗺️ [LibraryDetector] Detected ${libraryName} from source map:`, {
                source,
                version: versionMatch ? versionMatch[1] : 'unknown'
              });

              break;
            }
          }
        }
      }
    }

    return this.deduplicateLibraries(libraries);
  }

  /**
   * Convert LibraryInfo to MinifiedLibrary for storage
   */
  static toMinifiedLibrary(library: LibraryInfo, domain: string): MinifiedLibrary {
    // Extract source domain from the library URL
    let sourceDomain = '';
    try {
      const urlObj = new URL(library.url);
      sourceDomain = urlObj.hostname;

      // Validate that we have a proper domain
      if (!sourceDomain || sourceDomain === 'localhost' || sourceDomain.length < 3) {
        console.warn('[LibraryDetector] Invalid source domain for library:', { url: library.url, domain: sourceDomain });
        sourceDomain = 'unknown';
      }
    } catch (error) {
      console.warn('[LibraryDetector] Failed to parse library URL:', { url: library.url, error: String(error) });
      sourceDomain = 'unknown';
    }

    // Get third-party classification
    const thirdPartyInfo = this.classifyThirdPartyDomain(sourceDomain);

    return {
      name: library.name,
      version: library.version || 'unknown',
      size: 0, // Size will be determined from actual content when available
      source_map_available: false, // Will be updated when source maps are detected
      url: library.url,
      timestamp: Date.now(),
      main_domain: domain,
      source_domain: sourceDomain,
      third_party_info: thirdPartyInfo.isThirdParty ? {
        type: thirdPartyInfo.thirdPartyType as 'cdn' | 'analytics' | 'advertising' | 'social' | 'unknown',
        classification: thirdPartyInfo.thirdPartyType || 'unknown'
      } : undefined
    };
  }

  /**
   * Get default description for resource types
   */
  private static getDefaultDescription(type: LibraryInfo['type']): string {
    const descriptions = {
      'framework': 'JavaScript framework',
      'utility': 'JavaScript utility library',
      'ui': 'User interface library',
      'analytics': 'Analytics and tracking tool',
      'polyfill': 'Browser compatibility polyfill',
      'privacy-tools': 'Privacy and consent management',
      'tracking-tools': 'User tracking and identification',
      'site-tools': 'Site-specific functionality',
      'media-tools': 'Media and content tools',
      'performance-tools': 'Performance optimization tools',
      'advertising-service': 'Advertising and marketing service',
      'api-endpoint': 'API endpoint or web service',
      'streaming-service': 'Media streaming service',
      'data-collector': 'Data collection and analytics service',
      'web-service': 'Web service or external API',
      'build-artifact': 'Build tool output or bundled asset',
      'websocket': 'Real-time communication channel',
      'graphql': 'GraphQL API endpoint',
      'service-worker': 'Background worker script',
      'web-font': 'Typography and font resource',
      'config-file': 'Configuration or manifest file'
    };
    return descriptions[type] || 'Web resource';
  }

  /**
   * 🎯 Smart library name truncation for better UI display
   * Intelligently shortens long library names while preserving meaningful information
   */
  static truncateLibraryName(originalName: string, maxLength: number = 30): string {
    // If already short enough, return as-is
    if (originalName.length <= maxLength) {
      return originalName;
    }

    // Pattern 1: Random hash-like strings (e.g., "p8dn7fp1liosd47cq1r3sb455.litix.io")
    if (/^[a-z0-9]{20,}\./.test(originalName)) {
      const parts = originalName.split('.');
      if (parts.length >= 2) {
        const hash = parts[0];
        const domain = parts.slice(1).join('.');
        // Keep first 8 chars of hash + "..." + domain
        return `${hash.substring(0, 8)}...${domain}`;
      }
    }

    // Pattern 2: Query parameter heavy URLs (like the livestream example)
    if (originalName.includes('&') && originalName.includes('=')) {
      // Extract meaningful parts from query string
      const parts = originalName.split('&');
      const meaningfulParams = [];

      // Look for key parameters that give context
      const keyParams = ['cid', 'conf_csid', 'platform', 'playername', 'tenant', 'device_type'];

      for (const part of parts) {
        const [key, value] = part.split('=');
        if (keyParams.includes(key) && value) {
          meaningfulParams.push(`${key}=${value}`);
        }
      }

      if (meaningfulParams.length > 0) {
        let result = meaningfulParams.join('&');
        if (result.length > maxLength) {
          // Take first meaningful param and add "..."
          result = meaningfulParams[0] + '&...';
        }
        return result;
      }
    }

    // Pattern 3: Base64 or encoded content
    if (/^[A-Za-z0-9+/=]{50,}$/.test(originalName)) {
      return `${originalName.substring(0, 12)}...[encoded]`;
    }

    // Pattern 4: Version-like patterns (keep version info)
    const versionMatch = originalName.match(/(\d+\.\d+(?:\.\d+)?)/);
    if (versionMatch) {
      const version = versionMatch[1];
      const baseName = originalName.substring(0, originalName.indexOf(version));
      if (baseName.length > 0) {
        const maxBaseLength = maxLength - version.length - 1; // -1 for separator
        if (baseName.length > maxBaseLength) {
          return `${baseName.substring(0, maxBaseLength)}...v${version}`;
        }
        return `${baseName}v${version}`;
      }
    }

    // Pattern 5: Domain-like structures
    if (originalName.includes('.') && !originalName.includes('/')) {
      const parts = originalName.split('.');
      if (parts.length > 2) {
        // Keep first and last part for context
        const first = parts[0];
        const last = parts[parts.length - 1];
        const maxFirstLength = Math.floor((maxLength - last.length - 3) / 2); // -3 for "..."

        if (first.length > maxFirstLength) {
          return `${first.substring(0, maxFirstLength)}...${last}`;
        }
        return `${first}...${last}`;
      }
    }

    // Pattern 6: URL paths (extract meaningful directory/file names)
    if (originalName.includes('/')) {
      const pathParts = originalName.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // If filename is meaningful and not too long
      if (fileName && fileName.length <= maxLength && !fileName.includes('?')) {
        return fileName;
      }

      // Otherwise, take first part + "..." + filename
      if (pathParts.length > 1) {
        const firstPart = pathParts[0];
        const maxFirstLength = maxLength - fileName.length - 3; // -3 for "..."

        if (maxFirstLength > 5) {
          return `${firstPart.substring(0, maxFirstLength)}.../${fileName}`;
        }
      }
    }

    // Pattern 7: Camelcase or underscore separated (extract key words)
    const words = originalName.split(/[_\-\.]+/);
    if (words.length > 1) {
      // Take first meaningful word and last word
      const meaningfulWords = words.filter(word => word.length > 2);
      if (meaningfulWords.length >= 2) {
        const first = meaningfulWords[0];
        const last = meaningfulWords[meaningfulWords.length - 1];
        const combined = `${first}...${last}`;

        if (combined.length <= maxLength) {
          return combined;
        }
      }
    }

    // Fallback: Simple truncation with ellipsis
    return `${originalName.substring(0, maxLength - 3)}...`;
  }

  /**
   * 🎯 Get display name for library (combines truncation with meaningful context)
   */
  static getDisplayName(library: MinifiedLibrary | { name: string; version?: string; third_party_info?: any }, maxLength: number = 30): string {
    // For known library types, try to extract more meaningful info
    const truncatedName = this.truncateLibraryName(library.name, maxLength);

    // Add context based on third-party info (if available)
    if (library.third_party_info?.type) {
      const typeIndicators: Record<string, string> = {
        'analytics': '📊',
        'advertising': '📱',
        'cdn': '🌐',
        'social': '🔗',
        'unknown': '🔧'
      };

      const indicator = typeIndicators[library.third_party_info.type] || '🔧';

      // If name is very short after truncation, add type context
      if (truncatedName.length < 15) {
        return `${indicator} ${truncatedName}`;
      }
    }

    return truncatedName;
  }
}
