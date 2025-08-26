/**
 * Extension State Module - Extension Power and State Management
 *
 * Handles extension enable/disable functionality, global power state management,
 * and site-specific control. Extracted from the original background script's
 * extension state management functionality.
 */

import { ChromeApiModule } from '../shared/chrome-api.module';
import { StorageManagerModule } from '../shared/storage-manager.module';
import {
  ExtensionStateData,
  SafetyConfig
} from '../types/background-types';

export class ExtensionStateModule {
  private readonly chromeApi: ChromeApiModule;
  private readonly storageManager: StorageManagerModule;
  private readonly config: SafetyConfig;
  private readonly abortController: AbortController;
  private isInitialized = false;
  private currentState: ExtensionStateData = { enabled: true };

  constructor(
    chromeApi: ChromeApiModule,
    storageManager: StorageManagerModule,
    config: Partial<SafetyConfig> = {}
  ) {
    this.chromeApi = chromeApi;
    this.storageManager = storageManager;
    this.config = {
      enableAbortController: true,
      maxRetries: 3,
      timeoutMs: 5000,
      enableRaceConditionProtection: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.abortController = new AbortController();
    console.log('🔌 ExtensionStateModule: Initialized with power management');
  }

  /**
   * Initialize extension state module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('ExtensionStateModule: Already initialized');
      return;
    }

    // Failsafe: Start with enabled state
    if (!this.currentState) {
      this.currentState = { enabled: true };
      console.log('🔍 ExtensionStateModule: Initialized with failsafe enabled state');
    }

    try {
      // Verify dependencies are initialized
      if (!this.chromeApi.isExtensionContextValid()) {
        throw new Error('Chrome API module not properly initialized');
      }

      // Load current extension state
      await this.loadExtensionState();

      // Double-check state is valid after loading
      if (!this.currentState || this.currentState.enabled === undefined) {
        console.warn('ExtensionStateModule: State invalid after loading, resetting to enabled');
        this.currentState = { enabled: true };
      }

      // Set up storage change listener to reload state when storage changes
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && (changes.extensionEnabled || changes.extensionState)) {
          console.log('🔄 ExtensionStateModule: Storage changed, reloading state...', changes);
          this.loadExtensionState().catch(error => {
            console.error('ExtensionStateModule: Failed to reload state after storage change:', error);
          });
        }
      });

      this.isInitialized = true;
      console.log('✅ ExtensionStateModule: Successfully initialized with state:', this.currentState);
    } catch (error) {
      console.error('❌ ExtensionStateModule: Initialization failed, using enabled fallback:', error);
      this.currentState = { enabled: true };
      this.isInitialized = true; // Still mark as initialized with fallback
    }
  }

  /**
   * Cleanup resources to prevent memory leaks
   */
  cleanup(): void {
    if (this.config.enableAbortController) {
      this.abortController.abort('ExtensionStateModule cleanup');
    }

    this.isInitialized = false;
    this.currentState = { enabled: true };
    console.log('🧹 ExtensionStateModule: Cleanup completed');
  }

  // ===== EXTENSION STATE MANAGEMENT =====

  /**
   * Get current extension state
   */
  async getExtensionState(): Promise<ExtensionStateData> {
    return this.executeWithSafety('getExtensionState', async () => {
      return { ...this.currentState };
    });
  }

  /**
   * Set extension enabled/disabled state
   */
  async setExtensionState(enabled: boolean): Promise<{ success: boolean; newState: ExtensionStateData }> {
    return this.executeWithSafety('setExtensionState', async () => {
      // Update current state
      this.currentState.enabled = enabled;

      // Persist state to storage
      await this.saveExtensionState();

      console.log(`🔌 ExtensionStateModule: Extension ${enabled ? 'enabled' : 'disabled'}`);

      return {
        success: true,
        newState: { ...this.currentState }
      };
    });
  }

  /**
   * Get global power state (for backward compatibility with original background script)
   */
  async getGlobalPowerState(): Promise<{ enabled: boolean }> {
    return this.executeWithSafety('getGlobalPowerState', async () => {
      return { enabled: this.currentState.enabled };
    });
  }

  /**
   * Get site-specific state for a domain (simplified with safe fallbacks)
   */
  async getSiteSpecificState(domain: string): Promise<{ enabled: boolean }> {
    return this.executeWithSafety('getSiteSpecificState', async () => {
      try {
        // Safe fallback: if no domain, assume enabled (like main branch)
        if (!domain) {
          console.log('ExtensionStateModule: No domain provided, defaulting to enabled');
          return { enabled: true };
        }

        // Safe fallback: if current state not initialized, assume enabled
        if (!this.currentState || this.currentState.enabled === undefined) {
          console.log('ExtensionStateModule: State not initialized, defaulting to enabled');
          return { enabled: true };
        }

        const siteSpecificState = this.currentState.siteSpecificState || {};
        const siteEnabled = siteSpecificState[domain];

        // Key change: Default to enabled unless explicitly disabled
        // This prevents the "Extension disabled for yahoo.com" trap
        const result = { enabled: siteEnabled !== false };

        // Enhanced debugging for yahoo.com specifically
        if (domain.includes('yahoo.com') || domain.includes('finance.yahoo.com')) {
          console.log(`🔍 ExtensionStateModule: Yahoo Finance debug - domain: ${domain}`);
          console.log(`🔍 ExtensionStateModule: Site-specific value: ${siteEnabled}`);
          console.log(`🔍 ExtensionStateModule: Result (defaulting to enabled): ${result.enabled}`);
          console.log(`🔍 ExtensionStateModule: All site states:`, siteSpecificState);
        }

        console.log(`ExtensionStateModule: Site-specific state for ${domain}: ${result.enabled} (stored: ${siteEnabled}, defaulting to enabled)`);
        return result;
      } catch (error) {
        console.error(`ExtensionStateModule: Error getting site-specific state for ${domain}:`, error);
        // Safe fallback: always default to enabled on error
        return { enabled: true };
      }
    });
  }

  /**
   * Set site-specific state for a domain
   */
  async setSiteSpecificState(domain: string, enabled: boolean): Promise<{ success: boolean }> {
    return this.executeWithSafety('setSiteSpecificState', async () => {
      if (!domain) {
        throw new Error('Domain is required for site-specific state');
      }

      // Initialize site-specific state if not exists
      if (!this.currentState.siteSpecificState) {
        this.currentState.siteSpecificState = {};
      }

      // Update site-specific state
      this.currentState.siteSpecificState[domain] = enabled;

      // Persist state to storage
      await this.saveExtensionState();

      console.log(`🔌 ExtensionStateModule: Site ${domain} ${enabled ? 'enabled' : 'disabled'}`);

      return { success: true };
    });
  }

  // ===== TAB AND DOMAIN UTILITIES =====

  /**
   * Get extension state for a specific tab
   */
  async getTabExtensionState(tabId: number): Promise<{ enabled: boolean; domain?: string }> {
    return this.executeWithSafety('getTabExtensionState', async () => {
      try {
        // Defensive check: ensure we have a valid current state
        if (!this.currentState || this.currentState.enabled === undefined) {
          console.warn('ExtensionStateModule: Current state not properly initialized, using defaults');
          this.currentState = { enabled: true };
        }

        // Get tab information with better error handling
        let tabs;
        try {
          tabs = await this.chromeApi.queryTabs({});
        } catch (error) {
          console.warn('ExtensionStateModule: Failed to query tabs, using global state:', error);
          return { enabled: this.currentState.enabled };
        }

        const tab = tabs.find(t => t.id === tabId);
        if (!tab?.url) {
          console.warn(`ExtensionStateModule: Tab ${tabId} not found or has no URL, using global state`);
          return { enabled: this.currentState.enabled };
        }

        // Extract domain from tab URL
        const domain = this.extractDomain(tab.url);
        if (!domain) {
          console.warn(`ExtensionStateModule: Could not extract domain from ${tab.url}, using global state`);
          return { enabled: this.currentState.enabled };
        }

        // Get site-specific state with fallback
        let siteState;
        try {
          siteState = await this.getSiteSpecificState(domain);
        } catch (error) {
          console.warn(`ExtensionStateModule: Failed to get site-specific state for ${domain}, using global state:`, error);
          return { enabled: this.currentState.enabled, domain };
        }

        console.log(`ExtensionStateModule: Tab ${tabId} (${domain}) state: enabled=${siteState.enabled}`);
        return {
          enabled: siteState.enabled,
          domain
        };
      } catch (error) {
        console.error('ExtensionStateModule: Error in getTabExtensionState, using global fallback:', error);
        return { enabled: this.currentState?.enabled ?? true };
      }
    });
  }

  /**
   * Toggle extension state for current active tab's domain
   */
  async toggleCurrentSite(): Promise<{ success: boolean; domain: string; newState: boolean }> {
    return this.executeWithSafety('toggleCurrentSite', async () => {
      // Get current active tab
      const currentTab = await this.chromeApi.getCurrentTab();

      if (!currentTab?.url) {
        throw new Error('No active tab found');
      }

      const domain = this.extractDomain(currentTab.url);

      // Get current site-specific state
      const currentSiteState = await this.getSiteSpecificState(domain);
      const newState = !currentSiteState.enabled;

      // Set new site-specific state
      await this.setSiteSpecificState(domain, newState);

      return {
        success: true,
        domain,
        newState
      };
    });
  }

  // ===== SCRIPT INJECTION MANAGEMENT =====

  /**
   * Handle main world script injection (from original background script)
   */
  /**
   * Handle script injection with simplified logic (like main branch)
   */
  async handleScriptInjection(tabId: number): Promise<{ success: boolean; error?: string }> {
    console.log('🚀 SCRIPT INJECTION REQUEST for tabId:', tabId);
    console.log('🚀 Current state before injection:', this.currentState);

    return this.executeWithSafety('handleScriptInjection', async () => {
      try {
        // Ensure state is loaded
        if (!this.currentState) {
          console.log('⚠️ INJECTION: No current state, loading...');
          await this.loadExtensionState();
          console.log('✅ INJECTION: State loaded:', this.currentState);
        }

        // Simple check: use global state (like main branch)
        // Default to enabled if state is undefined/null for reliability
        console.log('🔍 INJECTION CHECK: currentState =', this.currentState);
        console.log('🔍 INJECTION CHECK: currentState?.enabled =', this.currentState?.enabled);

        const isEnabled = this.currentState?.enabled !== false;
        console.log('🔍 INJECTION CHECK: isEnabled =', isEnabled);

        if (!isEnabled) {
          console.error('❌ INJECTION FAILED: Extension globally disabled - currentState:', this.currentState);
          return {
            success: false,
            error: 'Extension globally disabled'
          };
        }        // Direct injection without complex validation (like main branch)
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN' as any,
          files: ['main-world-script.js']
        });

        console.log(`✅ ExtensionStateModule: Script injected into tab ${tabId}`);
        return { success: true };
      } catch (error) {
        console.error('ExtensionStateModule: Script injection failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Script injection failed'
        };
      }
    });
  }

  // ===== CHROME API INTEGRATION =====

  /**
   * Get extension version and manifest information
   */
  getExtensionInfo(): {
    version: string;
    name: string;
    backgroundScriptActive: boolean;
    toggleHandlersAvailable: boolean;
  } {
    try {
      const manifest = this.chromeApi.getManifest();

      return {
        version: manifest.version,
        name: manifest.name,
        backgroundScriptActive: true,
        toggleHandlersAvailable: true
      };
    } catch (error) {
      console.error('ExtensionStateModule: Failed to get extension info:', error);
      return {
        version: '0.0.0',
        name: 'Unknown Extension',
        backgroundScriptActive: false,
        toggleHandlersAvailable: false
      };
    }
  }

  // ===== STORAGE OPERATIONS =====

  /**
   * Load extension state from storage
   */
  private async loadExtensionState(): Promise<void> {
    try {
      const settings = await this.storageManager.getSettings();

      // Debug: Log what we actually found in storage
      console.log('🔍 ExtensionStateModule: Raw storage data:', {
        extensionEnabled: settings.extensionEnabled,
        extensionState: settings.extensionState,
        hasExtensionEnabled: settings.extensionEnabled !== undefined,
        hasExtensionState: !!(settings.extensionState && typeof settings.extensionState === 'object')
      });

      // Check both locations for extension enabled state
      // Primary: extensionEnabled (used by popup)
      // Fallback: settings.extensionState.enabled (legacy)
      let enabledValue = true; // Default to enabled

      if (settings.extensionEnabled !== undefined) {
        // Use the popup's storage format
        enabledValue = settings.extensionEnabled !== false;
        console.log('🔌 ExtensionStateModule: Using extensionEnabled:', enabledValue);
      } else if (settings.extensionState && typeof settings.extensionState === 'object') {
        // Fallback to legacy format
        enabledValue = settings.extensionState.enabled !== false;
        console.log('🔌 ExtensionStateModule: Using extensionState.enabled:', enabledValue);
      } else {
        console.log('🔌 ExtensionStateModule: No stored state found, defaulting to enabled');
      }

      this.currentState = {
        enabled: enabledValue,
        globalPowerState: settings.extensionState?.globalPowerState,
        siteSpecificState: settings.extensionState?.siteSpecificState || {}
      };

      // Minimal logging for production
      console.log('🔌 ExtensionStateModule: State loaded, enabled:', this.currentState.enabled);
    } catch (error) {
      console.warn('ExtensionStateModule: Failed to load state, using defaults:', error);
      this.currentState = { enabled: true };
    }
  }  /**
   * Save extension state to storage
   */
  private async saveExtensionState(): Promise<void> {
    const settings = await this.storageManager.getSettings();

    const updatedSettings = {
      ...settings,
      // Save to both locations for compatibility
      extensionEnabled: this.currentState.enabled, // Primary location (popup uses this)
      extensionState: this.currentState            // Legacy location
    };

    await this.storageManager.updateSettings(updatedSettings);
    console.log('🔌 ExtensionStateModule: State saved to storage');
  }

  // ===== UTILITY METHODS =====

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
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
      console.warn('ExtensionStateModule: Failed to extract domain from URL:', url, error);
      return 'unknown';
    }
  }

  // ===== SAFETY UTILITIES =====

  /**
   * Execute operation with comprehensive safety measures
   */
  private async executeWithSafety<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      throw new Error(`ExtensionStateModule: Not initialized (${operation})`);
    }

    if (this.config.enableAbortController && this.abortController.signal.aborted) {
      throw new Error(`ExtensionStateModule: Operation aborted (${operation})`);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Race condition protection
        if (this.config.enableRaceConditionProtection && attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }

        const result = await fn();

        // Log performance for slow operations
        const duration = Date.now() - startTime;
        if (duration > 500 && attempt === 0) {
          console.warn(`🐌 ExtensionStateModule: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.maxRetries) {
          console.error(`❌ ExtensionStateModule: ${operation} failed after ${this.config.maxRetries} retries:`, lastError);
          break;
        }

        console.warn(`⚠️ ExtensionStateModule: ${operation} failed, retrying (${attempt + 1}/${this.config.maxRetries}):`, lastError);
      }
    }

    throw lastError || new Error(`ExtensionStateModule: Unknown error in ${operation}`);
  }

  /**
   * Get module status for debugging
   */
  getStatus(): {
    initialized: boolean;
    currentState: ExtensionStateData;
    aborted: boolean;
    memoryUsage?: any;
  } {
    return {
      initialized: this.isInitialized,
      currentState: { ...this.currentState },
      aborted: this.abortController.signal.aborted,
      ...(this.config.enableMemoryMonitoring && {
        memoryUsage: this.chromeApi.getMemoryUsage()
      })
    };
  }
}
