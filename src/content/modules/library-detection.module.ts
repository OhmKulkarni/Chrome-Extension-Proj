/**
 * 🚀 Advanced Library Detection Module for Content Script
 * This module provides comprehensive library detection capabilities beyond network monitoring
 *
 * Detection Methods:
 * 1. DOM Global Analysis - Detects libraries from window objects
 * 2. DOM Structure Analysis - Identifies UI frameworks from CSS/DOM patterns
 * 3. Script Bundle Analysis - Analyzes loaded script content for library signatures
 * 4. Source Map Analysis - Extracts library info from source maps
 */

import { LibraryDetector, LibraryInfo } from '../../background/utils/library-detector';

export class ContentLibraryDetectionModule {
  private static isInitialized = false;
  private static detectionResults: LibraryInfo[] = [];

  /**
   * Initialize the library detection module
   */
  static initialize(): void {
    if (this.isInitialized) return;

    console.log('📚 [ContentLibraryDetection] Initializing advanced library detection...');

    // Start detection immediately for already loaded content
    this.performInitialDetection();

    // Set up ongoing detection for dynamically loaded content
    this.setupDynamicDetection();

    this.isInitialized = true;
  }

  /**
   * Perform comprehensive library detection on the current page
   */
  private static async performInitialDetection(): Promise<void> {
    try {
      // Check if any logging is enabled before proceeding with library detection
      const hasLoggingPermission = await this.checkLoggingPermissions();
      if (!hasLoggingPermission) {
        console.log('🚫 [ContentLibraryDetection] Skipping detection - no logging enabled for this tab');
        return;
      }

      // DOMAIN CONSISTENCY FIX: Use same domain extraction logic as network processor
      // This ensures libraries are grouped under the same main domain (e.g., yahoo.com instead of finance.yahoo.com)
      const mainDomain = this.extractMainDomain(window.location.href);
      
      const detectedLibraries: LibraryInfo[] = [];

      // 1. 🌍 DOM Global Detection - Check window objects
      console.log('🌍 [ContentLibraryDetection] Analyzing global objects...');
      const globalLibraries = LibraryDetector.detectFromDOMGlobals(window as any, mainDomain);
      detectedLibraries.push(...globalLibraries);

      // 2. Wait a bit for inline scripts to execute and create global objects
      console.log('⏳ [ContentLibraryDetection] Waiting for inline scripts to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Re-run DOM global detection to catch dynamically created libraries
      console.log('🔄 [ContentLibraryDetection] Re-analyzing globals for inline libraries...');
      const delayedGlobalLibraries = LibraryDetector.detectFromDOMGlobals(window as any, mainDomain);
      detectedLibraries.push(...delayedGlobalLibraries);

      // 4. 🎨 DOM Structure Detection - Check DOM patterns
      console.log('🎨 [ContentLibraryDetection] Analyzing DOM structure...');
      const domLibraries = LibraryDetector.detectFromDOMStructure(document, mainDomain);
      detectedLibraries.push(...domLibraries);

      // 5. 📦 Script Analysis - Analyze existing script tags
      console.log('📦 [ContentLibraryDetection] Analyzing script content...');
      this.analyzeExistingScripts(mainDomain, detectedLibraries);

      // 6. 🗺️ Source Map Analysis - Check for source maps
      console.log('🗺️ [ContentLibraryDetection] Checking for source maps...');
      this.analyzeSourceMaps(mainDomain, detectedLibraries);

      // Store results and send to background
      this.detectionResults = detectedLibraries;
      this.sendDetectionResults(detectedLibraries);

      console.log(`📚 [ContentLibraryDetection] Initial detection complete: ${detectedLibraries.length} libraries found`);

    } catch (error) {
      console.error('❌ [ContentLibraryDetection] Error during initial detection:', error);
    }
  }

  /**
   * Check if any logging is enabled for the current tab
   */
  private static async checkLoggingPermissions(): Promise<boolean> {
    try {
      // In content script context, we can't access chrome.tabs.query
      // Instead, send a message to background script to check permissions
      const response = await chrome.runtime.sendMessage({
        action: 'CHECK_LOGGING_PERMISSIONS',
        url: window.location.href
      });

      if (response?.hasLogging) {
        console.log('✅ [ContentLibraryDetection] Logging enabled - proceeding with detection');
        return true;
      } else {
        console.log('🚫 [ContentLibraryDetection] No logging enabled - skipping detection');
        return false;
      }

    } catch (error) {
      console.warn('⚠️ [ContentLibraryDetection] Error checking permissions:', error);
      return false; // If we can't check, don't run library detection
    }
  }

  /**
   * Extract main domain from URL (consistent with network processor)
   */
  private static extractMainDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Remove 'www.' prefix if present
      const withoutWww = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

      // For most cases, return the base domain
      const parts = withoutWww.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }

      return withoutWww;
    } catch (error) {
      console.warn('[ContentLibraryDetection] Failed to extract main domain from URL:', url, error);
      return 'unknown';
    }
  }

  /**
   * Analyze existing script tags for library signatures
   */
  private static analyzeExistingScripts(domain: string, results: LibraryInfo[]): void {
    const scripts = document.querySelectorAll('script[src]');

    for (const script of scripts) {
      const src = (script as HTMLScriptElement).src;
      if (!src || src.startsWith('chrome-extension:') || src.startsWith('moz-extension:')) continue;

      try {
        console.log('📄 [ContentLibraryDetection] Found script:', src.substring(0, 100));

        // Use LibraryDetector to analyze the script URL
        const urlLibraries = LibraryDetector.detectFromRequest(src, {});
        if (urlLibraries.length > 0) {
          console.log(`� [ContentLibraryDetection] Detected ${urlLibraries.length} libraries from URL: ${src.substring(0, 80)}`);
          results.push(...urlLibraries);
        }

        // Try to fetch and analyze script content (if same-origin)
        if (src.startsWith(window.location.origin)) {
          this.fetchAndAnalyzeScript(src, domain, results);
        }
      } catch (error) {
        console.warn('⚠️ [ContentLibraryDetection] Could not analyze script:', src, error);
      }
    }

    // Also check inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    for (const script of inlineScripts) {
      const content = script.textContent || script.innerHTML;
      if (content && content.length > 1000) { // Only analyze substantial inline scripts
        const libraries = LibraryDetector.detectFromBundleAnalysis(content, `${domain}/inline-script`, domain);
        results.push(...libraries);
      }
    }
  }

  /**
   * Fetch and analyze script content for library detection
   */
  private static async fetchAndAnalyzeScript(url: string, domain: string, results: LibraryInfo[]): Promise<void> {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const content = await response.text();
        const libraries = LibraryDetector.detectFromBundleAnalysis(content, url, domain);
        results.push(...libraries);

        if (libraries.length > 0) {
          console.log(`📦 [ContentLibraryDetection] Found ${libraries.length} libraries in ${url.substring(0, 80)}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ [ContentLibraryDetection] Failed to fetch script:', url, error);
    }
  }

  /**
   * Check for and analyze source maps
   */
  private static analyzeSourceMaps(domain: string, results: LibraryInfo[]): void {
    const scripts = document.querySelectorAll('script[src]');

    for (const script of scripts) {
      const src = (script as HTMLScriptElement).src;
      if (!src) continue;

      // Check if there's a source map reference
      const mapUrl = src + '.map';
      this.fetchSourceMap(mapUrl, domain, results);
    }
  }

  /**
   * Fetch and analyze source map data
   */
  private static async fetchSourceMap(mapUrl: string, domain: string, results: LibraryInfo[]): Promise<void> {
    try {
      const response = await fetch(mapUrl);
      if (response.ok) {
        const sourceMapData = await response.json();
        const libraries = LibraryDetector.detectFromSourceMaps(sourceMapData, domain);
        results.push(...libraries);

        if (libraries.length > 0) {
          console.log(`🗺️ [ContentLibraryDetection] Found ${libraries.length} libraries from source map: ${mapUrl.substring(0, 80)}`);
        }
      }
    } catch (error) {
      // Source maps often don't exist or are inaccessible, this is normal
      console.debug('🗺️ [ContentLibraryDetection] No source map found at:', mapUrl);
    }
  }

  /**
   * Set up detection for dynamically loaded content
   */
  private static setupDynamicDetection(): void {
    // Watch for new script elements being added
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check for new script tags
              if (element.tagName === 'SCRIPT') {
                this.handleNewScript(element as HTMLScriptElement);
              }

              // Check for scripts within added elements
              const scripts = element.querySelectorAll('script');
              for (const script of scripts) {
                this.handleNewScript(script as HTMLScriptElement);
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also watch for changes that might indicate new libraries loaded via AJAX/modules
    let lastGlobalCheck = Date.now();
    const globalCheckInterval = setInterval(async () => {
      const now = Date.now();
      if (now - lastGlobalCheck > 10000) { // Check every 10 seconds
        
        // SECURITY FIX: Check permissions before dynamic detection
        const hasLoggingPermission = await this.checkLoggingPermissions();
        if (!hasLoggingPermission) {
          console.log('🚫 [ContentLibraryDetection] Dynamic detection skipped - no logging enabled');
          lastGlobalCheck = now;
          return;
        }

        const mainDomain = this.extractMainDomain(window.location.href);
        const newGlobalLibraries = LibraryDetector.detectFromDOMGlobals(window as any, mainDomain);

        // Only send new detections
        const newLibraries = newGlobalLibraries.filter(lib =>
          !this.detectionResults.some(existing =>
            existing.name === lib.name && existing.detectionMethod === lib.detectionMethod
          )
        );

        if (newLibraries.length > 0) {
          console.log(`🔄 [ContentLibraryDetection] Detected ${newLibraries.length} new dynamically loaded libraries`);
          this.detectionResults.push(...newLibraries);
          this.sendDetectionResults(newLibraries);
        }

        lastGlobalCheck = now;
      }
    }, 5000);

    // Clean up interval when page unloads
    window.addEventListener('beforeunload', () => {
      clearInterval(globalCheckInterval);
    });
  }

  /**
   * Handle a newly detected script element
   */
  private static handleNewScript(script: HTMLScriptElement): void {
    const mainDomain = this.extractMainDomain(window.location.href);
    const src = script.src;

    if (src && !src.startsWith('chrome-extension:') && !src.startsWith('moz-extension:')) {
      console.log('📄 [ContentLibraryDetection] New script detected:', src.substring(0, 100));

      // For same-origin scripts, try to analyze content
      if (src.startsWith(window.location.origin)) {
        this.fetchAndAnalyzeScript(src, mainDomain, this.detectionResults);
      }
    } else if (script.textContent || script.innerHTML) {
      // Analyze inline script content
      const content = script.textContent || script.innerHTML;
      if (content.length > 500) { // Only analyze substantial scripts
        const libraries = LibraryDetector.detectFromBundleAnalysis(content, `${mainDomain}/dynamic-inline-script`, mainDomain);
        if (libraries.length > 0) {
          console.log(`📦 [ContentLibraryDetection] Found ${libraries.length} libraries in dynamic inline script`);
          this.detectionResults.push(...libraries);
          this.sendDetectionResults(libraries);
        }
      }
    }
  }

  /**
   * Send detection results to the background script
   */
  private static sendDetectionResults(libraries: LibraryInfo[]): void {
    if (libraries.length === 0) return;

    try {
      // Send to background script for storage
      chrome.runtime.sendMessage({
        action: 'CONTENT_LIBRARY_DETECTION',
        libraries,
        url: window.location.href,
        domain: this.extractMainDomain(window.location.href),
        timestamp: Date.now()
      }).catch(error => {
        console.warn('📚 [ContentLibraryDetection] Failed to send results to background:', error);
      });

      console.log(`📤 [ContentLibraryDetection] Sent ${libraries.length} library detections to background script`);

    } catch (error) {
      console.error('❌ [ContentLibraryDetection] Error sending detection results:', error);
    }
  }

  /**
   * Get current detection results
   */
  static getDetectionResults(): LibraryInfo[] {
    return [...this.detectionResults];
  }

  /**
   * Force a re-detection of libraries
   */
  static redetect(): void {
    console.log('🔄 [ContentLibraryDetection] Forcing re-detection...');
    this.detectionResults = [];
    this.performInitialDetection();
  }
}
