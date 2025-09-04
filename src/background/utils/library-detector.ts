/**
 * Library Detection Utility
 *
 * Detects minified libraries from JavaScript URLs and content analysis
 * Provides advanced library information including versions, CDN sources, etc.
 */

export interface LibraryInfo {
  name: string;
  version?: string;
  type: 'framework' | 'utility' | 'ui' | 'analytics' | 'cdn' | 'polyfill' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  source: 'url' | 'content' | 'headers';
  cdnProvider?: string;
  minified: boolean;
  size?: number;
  url: string;
}

export interface DomainLibraryStats {
  domain: string;
  libraries: LibraryInfo[];
  totalLibraries: number;
  frameworkCount: number;
  utilityCount: number;
  cdnCount: number;
  totalSize: number;
  lastDetected: string;
}

// Library detection patterns
const LIBRARY_PATTERNS = {
  // Major Frameworks
  react: {
    patterns: [/react(?:[-.](\d+\.\d+\.\d+))?/i, /react-dom/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  vue: {
    patterns: [/vue(?:[-.](\d+\.\d+\.\d+))?/i, /vue\.js/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  angular: {
    patterns: [/angular(?:[-.](\d+\.\d+\.\d+))?/i, /@angular/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  svelte: {
    patterns: [/svelte(?:[-.](\d+\.\d+\.\d+))?/i],
    type: 'framework' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },

  // Utility Libraries
  jquery: {
    patterns: [/jquery(?:[-.](\d+\.\d+\.\d+))?/i, /jquery\.min\.js/i],
    type: 'utility' as const,
    cdnPatterns: [/code\.jquery\.com/, /cdnjs\.cloudflare\.com/, /ajax\.googleapis\.com/]
  },
  lodash: {
    patterns: [/lodash(?:[-.](\d+\.\d+\.\d+))?/i, /underscore/i],
    type: 'utility' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  axios: {
    patterns: [/axios(?:[-.](\d+\.\d+\.\d+))?/i],
    type: 'utility' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  moment: {
    patterns: [/moment(?:[-.](\d+\.\d+\.\d+))?/i],
    type: 'utility' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /momentjs\.com/]
  },

  // UI Libraries
  bootstrap: {
    patterns: [/bootstrap(?:[-.](\d+\.\d+\.\d+))?/i],
    type: 'ui' as const,
    cdnPatterns: [/maxcdn\.bootstrapcdn\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  materialui: {
    patterns: [/material-ui/i, /@mui/i],
    type: 'ui' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },
  tailwind: {
    patterns: [/tailwindcss/i, /tailwind/i],
    type: 'ui' as const,
    cdnPatterns: [/unpkg\.com/, /cdnjs\.cloudflare\.com/, /jsdelivr\.net/]
  },

  // Analytics & Tracking
  gtag: {
    patterns: [/gtag/i, /google-analytics/i, /googletagmanager/i],
    type: 'analytics' as const,
    cdnPatterns: [/googletagmanager\.com/, /google-analytics\.com/]
  },
  hotjar: {
    patterns: [/hotjar/i],
    type: 'analytics' as const,
    cdnPatterns: [/static\.hotjar\.com/]
  },
  segment: {
    patterns: [/segment/i, /analytics\.js/i],
    type: 'analytics' as const,
    cdnPatterns: [/cdn\.segment\.com/]
  },

  // Polyfills
  polyfill: {
    patterns: [/polyfill/i, /core-js/i],
    type: 'polyfill' as const,
    cdnPatterns: [/polyfill\.io/, /unpkg\.com/, /cdnjs\.cloudflare\.com/]
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
   * Detect libraries from a network request
   */
  static detectFromRequest(url: string, headers: Record<string, any> = {}, responseBody?: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    // Detect from URL
    const urlLibraries = this.detectFromUrl(url);
    libraries.push(...urlLibraries);

    // Detect from response body if available (with size limits for performance)
    if (responseBody && responseBody.length < 100000) { // Only analyze smaller files
      const contentLibraries = this.detectFromContent(responseBody, url);
      libraries.push(...contentLibraries);
    }

    // Detect from headers
    const headerLibraries = this.detectFromHeaders(headers, url);
    libraries.push(...headerLibraries);

    // Remove duplicates and return
    return this.deduplicateLibraries(libraries);
  }

  /**
   * Detect libraries from URL patterns
   */
  private static detectFromUrl(url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];
    const urlLower = url.toLowerCase();

    // Check if it's a JavaScript file
    if (!urlLower.includes('.js') && !urlLower.includes('javascript')) {
      return libraries;
    }

    for (const [libraryName, config] of Object.entries(LIBRARY_PATTERNS)) {
      for (const pattern of config.patterns) {
        const match = url.match(pattern);
        if (match) {
          const version = match[1] || undefined;
          const cdnProvider = this.detectCdnProvider(url);

          libraries.push({
            name: libraryName,
            version,
            type: config.type,
            confidence: 'high',
            source: 'url',
            cdnProvider,
            minified: this.isMinified(url),
            url
          });
          break; // Don't match multiple patterns for same library
        }
      }
    }

    return libraries;
  }

  /**
   * Detect libraries from response content (lightweight analysis)
   */
  private static detectFromContent(content: string, url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    // Only do content analysis for small files to avoid performance issues
    if (content.length > 50000) {
      return libraries;
    }

    // Look for library signatures in the first 2000 characters
    const sample = content.substring(0, 2000);

    // Common library signatures
    const signatures = {
      react: [/React\.version/, /ReactDOM\.render/],
      vue: [/Vue\.version/, /new Vue\(/],
      jquery: [/jQuery\.fn\.jquery/, /\$\.fn\.jquery/],
      lodash: [/_.VERSION/, /lodash\.com/],
      moment: [/moment\.version/, /moment\.js/],
      bootstrap: [/Bootstrap v\d/, /\.bootstrap/],
    };

    for (const [libraryName, patterns] of Object.entries(signatures)) {
      for (const pattern of patterns) {
        if (pattern.test(sample)) {
          const config = LIBRARY_PATTERNS[libraryName as keyof typeof LIBRARY_PATTERNS];
          if (config) {
            libraries.push({
              name: libraryName,
              type: config.type,
              confidence: 'medium',
              source: 'content',
              minified: this.isMinified(url),
              size: content.length,
              url
            });
            break;
          }
        }
      }
    }

    return libraries;
  }

  /**
   * Detect libraries from response headers
   */
  private static detectFromHeaders(headers: Record<string, any>, url: string): LibraryInfo[] {
    const libraries: LibraryInfo[] = [];

    // Check server headers for library indicators
    const serverHeader = headers['server'] || headers['x-powered-by'] || '';
    if (typeof serverHeader === 'string') {
      const serverLower = serverHeader.toLowerCase();

      // Common server-side library indicators
      if (serverLower.includes('express')) {
        libraries.push({
          name: 'express',
          type: 'framework',
          confidence: 'medium',
          source: 'headers',
          minified: false,
          url
        });
      }
    }

    return libraries;
  }

  /**
   * Detect CDN provider from URL
   */
  private static detectCdnProvider(url: string): string | undefined {
    for (const [domain, provider] of Object.entries(CDN_PROVIDERS)) {
      if (url.includes(domain)) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Check if a file is minified based on URL patterns
   */
  private static isMinified(url: string): boolean {
    return /\.min\.js|\.min\.css|-min\.|\.bundle\.|\.chunk\./i.test(url) ||
           url.includes('minified') ||
           url.includes('compressed');
  }

  /**
   * Remove duplicate libraries and merge information
   */
  private static deduplicateLibraries(libraries: LibraryInfo[]): LibraryInfo[] {
    const libraryMap = new Map<string, LibraryInfo>();

    for (const library of libraries) {
      const key = library.name;
      const existing = libraryMap.get(key);

      if (!existing) {
        libraryMap.set(key, library);
      } else {
        // Merge information, preferring higher confidence
        const merged: LibraryInfo = {
          ...existing,
          version: library.version || existing.version,
          confidence: library.confidence === 'high' ? 'high' : existing.confidence,
          cdnProvider: library.cdnProvider || existing.cdnProvider,
          size: library.size || existing.size
        };
        libraryMap.set(key, merged);
      }
    }

    return Array.from(libraryMap.values());
  }

  /**
   * Aggregate library statistics for a domain
   */
  static aggregateForDomain(domain: string, libraries: LibraryInfo[]): DomainLibraryStats {
    const frameworkCount = libraries.filter(lib => lib.type === 'framework').length;
    const utilityCount = libraries.filter(lib => lib.type === 'utility').length;
    const cdnCount = libraries.filter(lib => lib.cdnProvider).length;
    const totalSize = libraries.reduce((sum, lib) => sum + (lib.size || 0), 0);

    return {
      domain,
      libraries,
      totalLibraries: libraries.length,
      frameworkCount,
      utilityCount,
      cdnCount,
      totalSize,
      lastDetected: new Date().toISOString()
    };
  }
}
