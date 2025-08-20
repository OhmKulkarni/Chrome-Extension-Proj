/**
 * Enhanced Network Interception Strategy
 *
 * CURRENT ISSUES:
 * - Content scripts die on page navigation
 * - Network interception stops when changing sites
 * - Inconsistent capture across different site architectures
 *
 * PROPOSED SOLUTIONS:
 * 1. Background-only interception for critical data
 * 2. Smart content script re-injection
 * 3. Persistent state management
 * 4. Better SPA navigation handling
 */

// ===========================================
// STRATEGY 1: BACKGROUND-FIRST INTERCEPTION
// ===========================================

class EnhancedNetworkInterception {
  constructor() {
    this.setupBackgroundInterception();
    this.setupContentScriptManagement();
  }

  /**
   * Background script can intercept ALL network requests using Chrome APIs
   * This works regardless of page navigation or content script status
   */
  setupBackgroundInterception() {
    // Chrome's webRequest API - catches everything before it hits the page
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        // This fires for EVERY request, regardless of page state
        this.processNetworkRequest(details, 'onBeforeRequest');
      },
      { urls: ["<all_urls>"] },
      ['requestBody']
    );

    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        // Capture request headers including Authorization tokens
        this.processNetworkRequest(details, 'onBeforeSendHeaders');
      },
      { urls: ["<all_urls>"] },
      ['requestHeaders']
    );

    chrome.webRequest.onCompleted.addListener(
      (details) => {
        // Capture response data
        this.processNetworkRequest(details, 'onCompleted');
      },
      { urls: ["<all_urls>"] },
      ['responseHeaders']
    );
  }

  /**
   * Smart content script management - re-inject when needed
   */
  setupContentScriptManagement() {
    // Listen for tab navigation
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        // Page fully loaded - re-inject content script if needed
        this.ensureContentScriptInjected(tabId, tab.url);
      }
    });

    // Listen for new tabs
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id) {
        this.prepareTabForInterception(tab.id);
      }
    });
  }

  /**
   * Ensure content script is active on navigation
   */
  async ensureContentScriptInjected(tabId, url) {
    try {
      // Check if our content script is already running
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });

      if (!response) {
        // Content script not responding - inject it
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-modular.js']
        });
        console.log(`Content script re-injected for tab ${tabId}`);
      }
    } catch (error) {
      // Content script not available - inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-modular.js']
        });
        console.log(`Content script injected for new page: ${url}`);
      } catch (injectionError) {
        console.warn(`Failed to inject content script: ${injectionError.message}`);
      }
    }
  }
}

// ===========================================
// STRATEGY 2: SMART SPA NAVIGATION DETECTION
// ===========================================

class SPANavigationHandler {
  constructor() {
    this.setupSPADetection();
  }

  setupSPADetection() {
    // Monitor URL changes without page reloads (SPA navigation)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url && !changeInfo.status) {
        // URL changed but page didn't reload - SPA navigation
        this.handleSPANavigation(tabId, changeInfo.url);
      }
    });
  }

  async handleSPANavigation(tabId, newUrl) {
    try {
      // Notify content script about URL change
      await chrome.tabs.sendMessage(tabId, {
        action: 'urlChanged',
        newUrl: newUrl,
        timestamp: Date.now()
      });

      // Update tab preferences based on new domain
      const domain = new URL(newUrl).hostname;
      const preferences = await this.getTabPreferencesForDomain(domain);

      // Apply new preferences
      await chrome.tabs.sendMessage(tabId, {
        action: 'updatePreferences',
        preferences: preferences
      });

    } catch (error) {
      console.warn(`SPA navigation handling failed: ${error.message}`);
    }
  }
}

// ===========================================
// STRATEGY 3: HYBRID INTERCEPTION MODEL
// ===========================================

class HybridInterceptionModel {
  constructor() {
    this.backgroundCapture = new Set(['network', 'tokens']); // Always captured in background
    this.contentCapture = new Set(['console', 'dom']); // Requires content script
  }

  /**
   * Background script handles network requests and token extraction
   * Content script handles console errors and DOM events
   * Both sync to the same storage system
   */
  async processRequest(details, source) {
    const tabId = details.tabId;

    // Check if logging is enabled for this tab/domain
    const isEnabled = await this.isLoggingEnabled(tabId, details.url);
    if (!isEnabled) return;

    // Background processing (always works)
    if (this.backgroundCapture.has('network')) {
      await this.processNetworkRequest(details);
    }

    if (this.backgroundCapture.has('tokens')) {
      await this.extractTokens(details);
    }

    // Content script processing (may fail on navigation)
    try {
      if (this.contentCapture.has('console')) {
        await chrome.tabs.sendMessage(tabId, {
          action: 'captureConsoleErrors'
        });
      }
    } catch (error) {
      // Content script unavailable - try to re-inject
      await this.ensureContentScriptInjected(tabId);
    }
  }
}

// ===========================================
// STRATEGY 4: PERSISTENT STATE MANAGEMENT
// ===========================================

class PersistentStateManager {
  constructor() {
    this.tabStates = new Map(); // In-memory tab state
    this.setupStateSync();
  }

  setupStateSync() {
    // Sync state between background and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'syncState') {
        const tabId = sender.tab?.id;
        if (tabId) {
          sendResponse({
            state: this.tabStates.get(tabId) || {},
            preferences: this.getTabPreferences(tabId)
          });
        }
      }
    });
  }

  /**
   * Maintain state across navigation
   */
  async preserveStateOnNavigation(tabId, oldUrl, newUrl) {
    const oldState = this.tabStates.get(tabId);
    const oldDomain = new URL(oldUrl).hostname;
    const newDomain = new URL(newUrl).hostname;

    if (oldDomain !== newDomain) {
      // Domain changed - save old domain preferences
      await this.saveTabPreferences(oldDomain, oldState);

      // Load new domain preferences
      const newPreferences = await this.loadTabPreferences(newDomain);
      this.tabStates.set(tabId, newPreferences);
    }
    // Same domain - keep existing state
  }
}

export {
  EnhancedNetworkInterception,
  SPANavigationHandler,
  HybridInterceptionModel,
  PersistentStateManager
};
