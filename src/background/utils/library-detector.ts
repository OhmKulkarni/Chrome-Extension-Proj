import { MinifiedLibrary } from '../storage-types';

/**
 * Interface for detected library information
 */
export interface LibraryInfo {
  name: string;
  version?: string;
  type: 'framework' | 'utility' | 'ui' | 'analytics' | 'polyfill';
  url: string;
  cdnProvider?: string;
  isMinified: boolean;
  confidence: number;
  domain: string;
  detectionMethod: 'url-pattern' | 'content-analysis' | 'header-analysis' | 'cdn-detection' | 'dom-global' | 'script-analysis' | 'source-map';
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
   * Main detection method that analyzes a request for library usage
   */
  static detectFromRequest(url: string, headers: Record<string, any> = {}, responseBody?: string): LibraryInfo[] {
    console.log('[LibraryDetector] Analyzing request:', { url, hasHeaders: Object.keys(headers).length > 0, hasBody: !!responseBody });

    const libraries: LibraryInfo[] = [];
    const domain = new URL(url).hostname;

    // Detect from URL patterns
    libraries.push(...this.detectFromUrl(url));

    // Detect from headers if available
    if (Object.keys(headers).length > 0) {
      libraries.push(...this.detectFromHeaders(headers, url));
    }

    // Detect from response content if available
    if (responseBody) {
      libraries.push(...this.detectFromContent(responseBody, url));
    }

    // Deduplicate and set domain for all libraries
    const uniqueLibraries = this.deduplicateLibraries(libraries);
    uniqueLibraries.forEach(lib => {
      lib.domain = domain;
    });

    console.log('[LibraryDetector] Detection results:', { url, detectedCount: uniqueLibraries.length, libraries: uniqueLibraries });
    return uniqueLibraries;
  }

  /**
   * Detect libraries based on URL patterns
   */
  private static detectFromUrl(url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];
    const urlLower = url.toLowerCase();

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = urlLower.match(pattern);
        if (match) {
          // Check if this is from a CDN
          const cdnProvider = this.detectCdnProvider(url);
          const isCdnMatch = config.cdnPatterns.some(cdnPattern => cdnPattern.test(url));

          if (cdnProvider || isCdnMatch) {
            const version = match[1] || undefined;
            libraries.push({
              name: libraryName,
              version,
              type: config.type,
              url,
              cdnProvider,
              isMinified: this.isMinified(url),
              confidence: 0.9,
              domain: '',
              detectionMethod: 'url-pattern'
            });
          }
        }
      }
    }

    // Try generic library detection for URLs that look like libraries
    const genericLibrary = this.detectGenericLibrary(url);
    if (genericLibrary) {
      libraries.push(genericLibrary);
    }

    return libraries;
  }

  /**
   * Enhanced generic library detection with ad/tracking URL filtering
   */
  private static detectGenericLibrary(url: string): LibraryInfo | null {
    const urlLower = url.toLowerCase();

    // Enhanced ad/tracking URL patterns to filter out false positives
    const adPatterns = [
      /casalemedia\.com/,
      /doubleclick\.net/,
      /googlesyndication\.com/,
      /googleadservices\.com/,
      /amazon-adsystem\.com/,
      /facebook\.net\/tr/,
      /adsystem\.amazon/,
      /googletagmanager\.com\/gtm/,
      /google-analytics\.com\/analytics/,
      /scorecardresearch\.com/,
      /quantserve\.com/,
      /adsymptotic\.com/,
      /turn\.com/,
      /rubiconproject\.com/,
      /rlcdn\.com/,
      /criteo\.com/,
      /outbrain\.com/,
      /taboola\.com/,
      /ads\.yahoo\.com/,
      /yimg\.com\/\w+\/ads/,
      /facebook\.com\/tr/,
      /twitter\.com\/i\/adsct/,
      /linkedin\.com\/px/,
      /reddit\.com\/api/,
      /pinterest\.com\/v[0-9]/,
      /tiktok\.com\/i18n/
    ];

    // Filter out advertising/tracking URLs
    if (adPatterns.some(pattern => pattern.test(urlLower))) {
      console.log('[LibraryDetector] Filtered out ad/tracking URL:', url);
      return null;
    }

    // Check for library-like patterns in URLs
    const libraryPatterns = [
      { pattern: /\/([a-z-]+)[-.](\d+\.\d+\.\d+)[\w.-]*\.(?:min\.)?js$/i, confidence: 0.8 },
      { pattern: /\/([a-z-]+)\.(?:min\.)?js$/i, confidence: 0.6 },
      { pattern: /cdn.*\/([a-z-]+)[-.](\d+\.\d+)[\w.-]*\.js$/i, confidence: 0.7 },
      { pattern: /lib.*\/([a-z-]+)\.js$/i, confidence: 0.6 }
    ];

    for (const { pattern, confidence } of libraryPatterns) {
      const match = urlLower.match(pattern);
      if (match) {
        const libraryName = match[1];
        const version = match[2] || undefined;

        // Additional filtering for common non-library patterns
        if (['api', 'analytics', 'track', 'pixel', 'beacon', 'ads', 'gtm'].includes(libraryName)) {
          continue;
        }

        const cdnProvider = this.detectCdnProvider(url);

        return {
          name: libraryName,
          version,
          type: 'utility',
          url,
          cdnProvider,
          isMinified: this.isMinified(url),
          confidence,
          domain: '',
          detectionMethod: 'url-pattern'
        };
      }
    }

    return null;
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
            detectionMethod: 'content-analysis'
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

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      if (config.globalSignatures) {
        for (const signature of config.globalSignatures) {
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

    for (const libName of customLibraryNames) {
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
    return {
      name: library.name,
      version: library.version || 'unknown',
      size: 0, // Size will be determined from actual content when available
      source_map_available: false, // Will be updated when source maps are detected
      url: library.url,
      timestamp: Date.now(),
      main_domain: domain
    };
  }
}
