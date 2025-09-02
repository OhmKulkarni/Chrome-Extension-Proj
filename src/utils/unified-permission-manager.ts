/**
 * Unified Permission Manager - Single Source of Truth for Extension Permissions
 *
 * Consolidates all permission states into chrome.storage.local for:
 * - Global extension power (master switch)
 * - Site-specific permissions (per domain)
 * - Tab-specific logging controls (network, console, tokens)
 * - Feature-specific settings
 *
 * Replaces the complex multi-layer system with a single, fast, consistent store.
 */

export interface PermissionState {
  // Global master switch
  globalEnabled: boolean;

  // Site-specific permissions (domain-based)
  sitePermissions: {
    [domain: string]: {
      enabled: boolean;
      lastUpdated: number;
    };
  };

  // Tab-specific logging controls
  tabControls: {
    [tabId: number]: {
      network: boolean;
      console: boolean;
      tokens: boolean;
      url: string;
      domain: string;
      lastUpdated: number;
    };
  };

  // Feature defaults (when no tab-specific setting exists)
  featureDefaults: {
    network: boolean;
    console: boolean;
    tokens: boolean;
  };

  // Metadata
  version: string;
  lastUpdated: number;
}

export class UnifiedPermissionManager {
  private static instance: UnifiedPermissionManager | null = null;
  private state: PermissionState | null = null;
  private readonly STORAGE_KEY = 'unifiedPermissions';
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly TAB_TTL = 60 * 60 * 1000; // 1 hour
  private cleanupTimer: number | null = null;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  // Event listeners for state changes
  private eventListeners: Array<(event: PermissionEvent) => void> = [];
  private readonly maxEventListeners = 10; // Prevent listener accumulation

  private constructor() {
    this.startPeriodicCleanup();
  }

  static getInstance(): UnifiedPermissionManager {
    if (!this.instance) {
      this.instance = new UnifiedPermissionManager();
    }
    return this.instance;
  }

  static destroyInstance(): void {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }

  /**
   * Initialize the permission manager and load current state
   */
  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      if (this.initializationPromise) {
        return this.initializationPromise;
      }
    }

    if (this.state) {
      console.log('✅ UnifiedPermissionManager: Already initialized');
      return;
    }

    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      await this.loadState();
      console.log('✅ UnifiedPermissionManager: Initialized successfully');
    } catch (error) {
      console.error('❌ UnifiedPermissionManager: Initialization failed:', error);
      await this.resetToDefaults();
    }
  }

  /**
   * Load state from chrome.storage.local (cached)
   */
  private async loadState(): Promise<void> {
    // Use cached state if available and fresh
    if (this.state) {
      return;
    }

    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);

      if (result[this.STORAGE_KEY]) {
        this.state = result[this.STORAGE_KEY];

        // MIGRATION: Check if this is an old version with disabled defaults
        await this.migrateFeatureDefaults();

        // Clean up old tabs
        await this.cleanupOldTabs();
      } else {
        await this.resetToDefaults();
      }
    } catch (error) {
      console.error('UnifiedPermissionManager: Failed to load state:', error);
      await this.resetToDefaults();
    }
  }

  /**
   * Ensure state is loaded (with caching)
   */
  private async ensureState(): Promise<void> {
    if (!this.state) {
      await this.loadState();
    }
  }

  /**
   * Save state to chrome.storage.local
   */
  private async saveState(): Promise<void> {
    if (!this.state) return;

    try {
      this.state.lastUpdated = Date.now();
      await chrome.storage.local.set({ [this.STORAGE_KEY]: this.state });
    } catch (error) {
      console.error('UnifiedPermissionManager: Failed to save state:', error);
      throw error;
    }
  }

  /**
   * Migrate feature defaults from old disabled-by-default to enabled-by-default
   */
  private async migrateFeatureDefaults(): Promise<void> {
    if (!this.state) return;

    // Check if migration is needed (version < 1.1.0 or wrong defaults)
    const needsMigration = !this.state.version ||
                          this.state.version === '1.0.0' ||
                          this.state.featureDefaults.network === true ||
                          this.state.featureDefaults.tokens === true;

    if (needsMigration) {
      console.log('🔄 UnifiedPermissionManager: Migrating permission defaults to correct values');

      // Fix defaults to match expected behavior
      this.state.featureDefaults = {
        network: false, // Disabled by default
        console: true,  // Enabled by default - console errors are important
        tokens: false   // Disabled by default
      };

      // Update version
      this.state.version = '1.1.0';
      this.state.lastUpdated = Date.now();

      // Save migrated state
      await this.saveState();

      console.log('✅ UnifiedPermissionManager: Default values migration completed');
    }
  }  /**
   * Reset to safe defaults
   */
  private async resetToDefaults(): Promise<void> {
    this.state = {
      globalEnabled: true, // Safe default - extension enabled
      sitePermissions: {},
      tabControls: {},
      featureDefaults: {
        network: false, // Disabled by default - user must opt-in for network logging
        console: false, // FIXED: Disabled by default - consistent with other systems
        tokens: false   // Disabled by default - user must opt-in for token logging
      },
      version: '1.1.0', // Updated version with enabled-by-default features
      lastUpdated: Date.now()
    };

    await this.saveState();
    console.log('🔄 UnifiedPermissionManager: Reset to defaults (features enabled by default)');
  }

  // ===== GLOBAL PERMISSION METHODS =====

  /**
   * Check if extension is globally enabled (master switch)
   */
  async isGlobalEnabled(): Promise<boolean> {
    await this.ensureState();
    return this.state?.globalEnabled ?? true;
  }

  /**
   * Set global extension state (master switch)
   */
  async setGlobalEnabled(enabled: boolean): Promise<void> {
    await this.ensureState();
    if (!this.state) return;

    const wasEnabled = this.state.globalEnabled;
    this.state.globalEnabled = enabled;

    await this.saveState();

    // Emit event
    this.emitEvent({
      type: 'globalToggled',
      data: { enabled, wasEnabled }
    });

    console.log(`🔌 UnifiedPermissionManager: Global extension ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ===== SITE-SPECIFIC PERMISSION METHODS =====

  /**
   * Check if extension is enabled for a specific domain
   */
  async isSiteEnabled(domain: string): Promise<boolean> {
    await this.ensureState();
    if (!this.state) return true;

    // If no site-specific setting, default to enabled
    const sitePermission = this.state.sitePermissions[domain];
    return sitePermission ? sitePermission.enabled : true;
  }

  /**
   * Set site-specific permission
   */
  async setSiteEnabled(domain: string, enabled: boolean): Promise<void> {
    await this.ensureState();
    if (!this.state) return;

    const wasEnabled = await this.isSiteEnabled(domain);

    this.state.sitePermissions[domain] = {
      enabled,
      lastUpdated: Date.now()
    };

    await this.saveState();

    // Emit event
    this.emitEvent({
      type: 'siteToggled',
      data: { domain, enabled, wasEnabled }
    });

    console.log(`🌐 UnifiedPermissionManager: Site ${domain} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all site permissions
   */
  async getAllSitePermissions(): Promise<{ [domain: string]: { enabled: boolean; lastUpdated: number } }> {
    await this.ensureState();
    if (!this.state) return {};
    return { ...this.state.sitePermissions };
  }

  // ===== TAB-SPECIFIC CONTROL METHODS =====

  /**
   * Check if a specific feature is enabled for a tab
   * Uses simple fallback: tab-specific > feature defaults
   */
  async isFeatureEnabled(tabId: number, feature: 'network' | 'console' | 'tokens'): Promise<boolean> {
    await this.ensureState();
    if (!this.state) return true; // Safe fallback during initialization

    // FIXED: Simple tab-based check, no site-level overrides
    // Each tab has independent settings
    const tabControl = this.state.tabControls[tabId];
    if (tabControl && tabControl[feature] !== undefined) {
      return tabControl[feature];
    }

    // Fallback to feature default
    return this.state.featureDefaults[feature];
  }  /**
   * Initialize tab permissions from existing popup preferences
   * This ensures new tabs respect user's previously set preferences
   */
  async initializeTabFromExistingPreferences(
    tabId: number,
    tabUrl: string
  ): Promise<void> {
    await this.ensureState();
    if (!this.state) return;

    // Skip if tab already has explicit settings
    if (this.state.tabControls[tabId]) {
      return;
    }

    try {
      console.log(`🔄 UnifiedPermissionManager: Initializing tab ${tabId} with fresh defaults`);

      const domain = this.extractDomain(tabUrl);

      // FIXED: Each tab starts fresh with defaults, not domain-based inheritance
      // This ensures each tab has independent settings
      const networkEnabled = this.state.featureDefaults.network;
      const consoleEnabled = this.state.featureDefaults.console;
      const tokensEnabled = this.state.featureDefaults.tokens;

      console.log(`🔄 UnifiedPermissionManager: Tab ${tabId} starting fresh with defaults for ${domain}`);

      // Initialize tab control with fresh default preferences
      this.state.tabControls[tabId] = {
        network: networkEnabled,
        console: consoleEnabled,
        tokens: tokensEnabled,
        url: tabUrl,
        domain,
        lastUpdated: Date.now()
      };      await this.saveState();

      console.log(`✅ UnifiedPermissionManager: Initialized tab ${tabId} permissions:`, {
        network: this.state.tabControls[tabId].network,
        console: this.state.tabControls[tabId].console,
        tokens: this.state.tabControls[tabId].tokens
      });

    } catch (error) {
      console.error(`❌ UnifiedPermissionManager: Failed to initialize tab ${tabId}:`, error);
      // Fall back to defaults if initialization fails
    }
  }

  /**
   * Set tab-specific feature control
   */
  async setFeatureEnabled(
    tabId: number,
    feature: 'network' | 'console' | 'tokens',
    enabled: boolean
  ): Promise<void> {
    await this.ensureState();
    if (!this.state) return;

    const wasEnabled = await this.isFeatureEnabled(tabId, feature);

    // Get or create tab control
    if (!this.state.tabControls[tabId]) {
      this.state.tabControls[tabId] = {
        network: this.state.featureDefaults.network,
        console: this.state.featureDefaults.console,
        tokens: this.state.featureDefaults.tokens,
        url: '', // Will be updated when tab info is available
        domain: 'unknown', // Will be updated when tab info is available
        lastUpdated: Date.now()
      };
    }

    // Update specific feature
    this.state.tabControls[tabId][feature] = enabled;
    this.state.tabControls[tabId].lastUpdated = Date.now();

    await this.saveState();

    // Emit event
    this.emitEvent({
      type: 'featureToggled',
      data: { tabId, feature, enabled, wasEnabled }
    });

    console.log(`🎛️ UnifiedPermissionManager: Tab ${tabId} ${feature} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set all features at once for a tab (site toggle functionality)
   */
  async setAllFeaturesEnabled(
    tabId: number,
    enabled: boolean,
    tabUrl?: string
  ): Promise<void> {
    await this.ensureState();
    if (!this.state) return;

    const domain = tabUrl ? this.extractDomain(tabUrl) : 'unknown';

    // Get or create tab control
    if (!this.state.tabControls[tabId]) {
      this.state.tabControls[tabId] = {
        network: this.state.featureDefaults.network,
        console: this.state.featureDefaults.console,
        tokens: this.state.featureDefaults.tokens,
        url: tabUrl || '',
        domain: domain,
        lastUpdated: Date.now()
      };
    }

    // Store previous state for event emission
    const wasAllEnabled = this.state.tabControls[tabId].network &&
                         this.state.tabControls[tabId].console &&
                         this.state.tabControls[tabId].tokens;

    // Update all features atomically
    this.state.tabControls[tabId].network = enabled;
    this.state.tabControls[tabId].console = enabled;
    this.state.tabControls[tabId].tokens = enabled;
    this.state.tabControls[tabId].lastUpdated = Date.now();

    // Update URL and domain if provided
    if (tabUrl) {
      this.state.tabControls[tabId].url = tabUrl;
      this.state.tabControls[tabId].domain = domain;
    }

    await this.saveState();

    // Emit unified site toggle event
    this.emitEvent({
      type: 'siteToggled',
      data: {
        tabId,
        domain,
        enabled,
        wasEnabled: wasAllEnabled,
        features: { network: enabled, console: enabled, tokens: enabled }
      }
    });

    console.log(`🌐 UnifiedPermissionManager: Tab ${tabId} all features ${enabled ? 'enabled' : 'disabled'} for ${domain}`);
  }

  /**
   * Get all feature states for a tab
   */
  async getAllFeatures(tabId: number): Promise<{
    network: boolean;
    console: boolean;
    tokens: boolean;
  }> {
    const network = await this.isFeatureEnabled(tabId, 'network');
    const console = await this.isFeatureEnabled(tabId, 'console');
    const tokens = await this.isFeatureEnabled(tabId, 'tokens');

    return { network, console, tokens };
  }

  // ===== UNIFIED PERMISSION CHECK =====

  /**
   * Master permission check - simplified to global + feature only
   */
  async canIntercept(
    tabId: number,
    feature: 'network' | 'console' | 'tokens'
  ): Promise<boolean> {
    // 1. Global power check (master switch)
    const globalEnabled = await this.isGlobalEnabled();
    if (!globalEnabled) return false;

    // 2. Feature-specific check (tab-based only)
    const featureEnabled = await this.isFeatureEnabled(tabId, feature);
    return featureEnabled;
  }

  // ===== UTILITY METHODS =====

  /**
   * Get complete state for a tab (for UI display)
   */
  async getTabPermissionState(tabId: number, tabUrl?: string): Promise<{
    global: boolean;
    site: boolean;
    features: { network: boolean; console: boolean; tokens: boolean };
    domain?: string;
  }> {
    const global = await this.isGlobalEnabled();

    const features = {
      network: await this.isFeatureEnabled(tabId, 'network'),
      console: await this.isFeatureEnabled(tabId, 'console'),
      tokens: await this.isFeatureEnabled(tabId, 'tokens')
    };

    // FIXED: Site state is derived from whether all features are enabled
    const site = features.network && features.console && features.tokens;

    let domain: string | undefined;
    if (tabUrl) {
      domain = this.extractDomain(tabUrl);
    }

    return { global, site, features, domain };
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Clean up old tab entries
   */
  private async cleanupOldTabs(): Promise<void> {
    if (!this.state) return;

    const now = Date.now();
    const tabIds = Object.keys(this.state.tabControls);
    let cleaned = 0;

    for (const tabIdStr of tabIds) {
      const tabId = parseInt(tabIdStr);
      const tabControl = this.state.tabControls[tabId];

      if (now - tabControl.lastUpdated > this.TAB_TTL) {
        delete this.state.tabControls[tabId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveState();
      console.log(`🧹 UnifiedPermissionManager: Cleaned up ${cleaned} old tabs`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldTabs().catch(console.error);
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Event system for state changes
   */
  addEventListener(listener: (event: PermissionEvent) => void): void {
    // Prevent listener accumulation
    if (this.eventListeners.length >= this.maxEventListeners) {
      console.warn('UnifiedPermissionManager: Maximum event listeners reached, removing oldest');
      this.eventListeners.shift();
    }

    // Prevent duplicate listeners
    if (!this.eventListeners.includes(listener)) {
      this.eventListeners.push(listener);
    }
  }

  removeEventListener(listener: (event: PermissionEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: PermissionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in permission event listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.eventListeners = [];
    this.state = null;

    console.log('🧹 UnifiedPermissionManager: Cleanup completed');
  }
}

// Event types
export interface PermissionEvent {
  type: 'globalToggled' | 'siteToggled' | 'featureToggled';
  data: any;
}

// Singleton instance for easy access
export const unifiedPermissionManager = UnifiedPermissionManager.getInstance();
