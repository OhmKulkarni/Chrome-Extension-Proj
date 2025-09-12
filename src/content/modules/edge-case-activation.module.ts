/**
 * Edge Case Detection and Activation System
 *
 * Analyzes the current page environment and activates content script interceptors
 * only when they can handle edge cases that the main-world script cannot.
 *
 * EDGE CASES WHERE CONTENT SCRIPT INTERCEPTORS ARE SUPERIOR:
 * 1. Cross-origin iframe requests (different origin than main frame)
 * 2. Service worker/web worker contexts
 * 3. Extension popup/options page requests
 * 4. Blob URL and Data URL requests
 * 5. Pages with strict CSP that blocks main-world script
 * 6. Dynamic script injection that bypasses main-world interception
 */

export interface EdgeCaseAnalysis {
  hasIframes: boolean;
  hasServiceWorkers: boolean;
  hasWebWorkers: boolean;
  isExtensionPage: boolean;
  hasStrictCSP: boolean;
  hasDynamicScripts: boolean;
  recommendContentInterception: boolean;
  reasons: string[];
}

export class EdgeCaseActivationSystem {
  private analysis: EdgeCaseAnalysis | null = null;
  private observers: MutationObserver[] = [];

  /**
   * Analyze the current page for edge cases
   */
  async analyzeEnvironment(): Promise<EdgeCaseAnalysis> {
    const reasons: string[] = [];

    // Check for cross-origin iframes
    const _hasIframes = this.detectCrossOriginIframes();
    if (hasIframes) {
      reasons.push('Cross-origin iframes detected - content script needed for iframe requests');
    }

    // Check for service workers
    const _hasServiceWorkers = await this.detectServiceWorkers();
    if (hasServiceWorkers) {
      reasons.push('Service workers detected - may need content script for worker context');
    }

    // Check for web workers
    const _hasWebWorkers = this.detectWebWorkers();
    if (hasWebWorkers) {
      reasons.push('Web workers detected - content script better for worker requests');
    }

    // Check if we're in an extension page
    const _isExtensionPage = this.isExtensionEnvironment();
    if (isExtensionPage) {
      reasons.push('Extension page context - content script required');
    }

    // Check for strict CSP
    const _hasStrictCSP = this.detectStrictCSP();
    if (hasStrictCSP) {
      reasons.push('Strict CSP detected - main-world script may be blocked');
    }

    // Check for dynamic script injection
    const _hasDynamicScripts = this.detectDynamicScripts();
    if (hasDynamicScripts) {
      reasons.push('Dynamic script injection detected - content script provides better coverage');
    }

    const _recommendContentInterception =
      hasIframes || hasServiceWorkers || hasWebWorkers ||
      isExtensionPage || hasStrictCSP || hasDynamicScripts;

    this.analysis = {
      hasIframes,
      hasServiceWorkers,
      hasWebWorkers,
      isExtensionPage,
      hasStrictCSP,
      hasDynamicScripts,
      recommendContentInterception,
      reasons
    };

    return this.analysis;
  }

  /**
   * Get activation configuration based on edge case analysis
   */
  getActivationConfig(): {
    network: { enabled: boolean; reason?: string };
    console: { enabled: boolean; reason?: string };
  } {
    if (!this.analysis) {
      throw new Error('Must call analyzeEnvironment() first');
    }

    const _networkConfig = {
      enabled: this.analysis.recommendContentInterception,
      reason: this.analysis.reasons.length > 0 ? this.analysis.reasons.join(', ') : undefined
    };

    const _consoleConfig = {
      enabled: this.analysis.hasServiceWorkers || this.analysis.hasWebWorkers || this.analysis.isExtensionPage,
      reason: this.analysis.hasServiceWorkers || this.analysis.hasWebWorkers || this.analysis.isExtensionPage
        ? 'Worker contexts or extension pages benefit from content script console interception'
        : undefined
    };

    return {
      network: networkConfig,
      console: consoleConfig
    };
  }

  // Private detection methods

  private detectCrossOriginIframes(): boolean {
    const _iframes = document.querySelectorAll('iframe');
    const _currentOrigin = window.location.origin;

    for (const iframe of iframes) {
      try {
        const _src = iframe.src;
        if (src && src.startsWith('http')) {
          const _iframeOrigin = new URL(src).origin;
          if (iframeOrigin !== currentOrigin) {
            return true;
          }
        }
      } catch (error) {
        // Cross-origin access blocked - likely cross-origin
        return true;
      }
    }
    return false;
  }

  private async detectServiceWorkers(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const _registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    } catch (error) {
      return false;
    }
  }

  private detectWebWorkers(): boolean {
    // Check if page creates web workers
    const _originalWorker = window.Worker;
    let _workerDetected = false;

    if (originalWorker) {
      // Override Worker constructor to detect usage
      window.Worker = function(scriptURL: string | URL, options?: WorkerOptions) {
        workerDetected = true;
        return new originalWorker(scriptURL, options);
      } as any;

      // Restore after short delay
      setTimeout(() => {
        window.Worker = originalWorker;
      }, 1000);
    }

    return workerDetected;
  }

  private isExtensionEnvironment(): boolean {
    return window.location.protocol === 'chrome-extension:' ||
           window.location.protocol === 'moz-extension:' ||
           window.location.protocol === 'ms-browser-extension:';
  }

  private detectStrictCSP(): boolean {
    const _metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    for (const meta of metaTags) {
      const _content = meta.getAttribute('content');
      if (content && (content.includes("'none'") || content.includes("'self'"))) {
        return true;
      }
    }
    return false;
  }

  private detectDynamicScripts(): boolean {
    // Set up mutation observer to detect script injection
    let _dynamicScripts = false;
    const _observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'SCRIPT') {
            dynamicScripts = true;
          }
        });
      });
    });

    observer.observe(document.head || document.documentElement, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);

    return dynamicScripts;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}
