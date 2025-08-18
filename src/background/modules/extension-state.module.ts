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

    try {
      // Verify dependencies are initialized
      if (!this.chromeApi.isExtensionContextValid()) {
        throw new Error('Chrome API module not properly initialized');
      }

      // Load current extension state
      await this.loadExtensionState();

      this.isInitialized = true;
      console.log('✅ ExtensionStateModule: Successfully initialized');
    } catch (error) {
      console.error('❌ ExtensionStateModule: Initialization failed:', error);
      throw error;
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
   * Get site-specific state for a domain
   */
  async getSiteSpecificState(domain: string): Promise<{ enabled: boolean }> {
    return this.executeWithSafety('getSiteSpecificState', async () => {
      if (!domain) {
        return { enabled: this.currentState.enabled };
      }

      const siteSpecificState = this.currentState.siteSpecificState || {};
      const siteEnabled = siteSpecificState[domain];

      // If no site-specific setting, fall back to global state
      return { enabled: siteEnabled !== undefined ? siteEnabled : this.currentState.enabled };
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
      // Get tab information
      const tabs = await this.chromeApi.queryTabs({});
      const tab = tabs.find(t => t.id === tabId);

      if (!tab?.url) {
        return { enabled: this.currentState.enabled };
      }

      // Extract domain from tab URL
      const domain = this.extractDomain(tab.url);

      // Get site-specific state
      const siteState = await this.getSiteSpecificState(domain);

      return {
        enabled: siteState.enabled,
        domain
      };
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
  async handleScriptInjection(tabId: number): Promise<{ success: boolean; error?: string }> {
    return this.executeWithSafety('handleScriptInjection', async () => {
      try {
        // Check if extension is enabled for this tab
        const tabState = await this.getTabExtensionState(tabId);

        if (!tabState.enabled) {
          return {
            success: false,
            error: `Extension disabled for ${tabState.domain || 'this site'}`
          };
        }

        // Inject main world script using chrome.scripting API directly
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN' as any,
          files: ['assets/main-world-network-interceptor-BFD3WDcJ.js'] // Use the built file name
        });

        console.log(`🔌 ExtensionStateModule: Script injected into tab ${tabId}`);

        return { success: true };
      } catch (error) {
        console.error('ExtensionStateModule: Script injection failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
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
      const extensionState = settings.extensionState;

      if (extensionState && typeof extensionState === 'object') {
        this.currentState = {
          enabled: extensionState.enabled !== false, // Default to true
          globalPowerState: extensionState.globalPowerState,
          siteSpecificState: extensionState.siteSpecificState || {}
        };
      } else {
        // Initialize with default state
        this.currentState = { enabled: true };
      }

      console.log('🔌 ExtensionStateModule: State loaded from storage');
    } catch (error) {
      console.warn('ExtensionStateModule: Failed to load state, using defaults:', error);
      this.currentState = { enabled: true };
    }
  }

  /**
   * Save extension state to storage
   */
  private async saveExtensionState(): Promise<void> {
    const settings = await this.storageManager.getSettings();

    const updatedSettings = {
      ...settings,
      extensionState: this.currentState
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
