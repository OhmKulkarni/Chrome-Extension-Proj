/**
 * Unified Permission Service - Background Script Integration
 *
 * Integrates the unified permission manager with the background script
 * message router and provides backward compatibility with existing APIs.
 */

import { unifiedPermissionManager } from '../../utils/unified-permission-manager';
import { permissionMigrationUtility } from '../../utils/permission-migration-utility';

export class UnifiedPermissionService {
  private isInitialized = false;

  /**
   * Initialize the unified permission service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('UnifiedPermissionService: Already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing unified permission service...');

      // Check if we need to migrate from old system
      await this.checkAndMigrate();

      // Initialize the unified manager
      await unifiedPermissionManager.initialize();
      
      // CRITICAL FIX: Sync with existing popup/storage system preferences
      await this.syncWithExistingPreferences();

      // Set up Chrome storage change listeners
      this.setupStorageListeners();

      this.isInitialized = true;
      console.log('✅ UnifiedPermissionService: Successfully initialized');

    } catch (error) {
      console.error('❌ UnifiedPermissionService: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if migration is needed and perform it
   */
  private async checkAndMigrate(): Promise<void> {
    try {
      // Check if unified system already exists
      const result = await chrome.storage.local.get(['unifiedPermissions']);
      if (result.unifiedPermissions) {
        console.log('✅ Unified permission system already exists, skipping migration');
        return;
      }

      // Check if old system data exists
      const oldDataCheck = await chrome.storage.local.get([
        'extensionEnabled',
        'extensionState'
      ]);

      const hasOldData = oldDataCheck.extensionEnabled !== undefined ||
                         oldDataCheck.extensionState !== undefined;

      if (hasOldData) {
        console.log('🔄 Old permission system detected, starting migration...');

        // Create backup first
        const backup = await permissionMigrationUtility.createBackup();
        if (!backup.success) {
          console.warn('⚠️ Failed to create backup, continuing without backup');
        }

        // Perform migration
        const migration = await permissionMigrationUtility.migrateToUnifiedSystem();
        if (migration.success) {
          console.log('✅ Permission migration completed successfully');
        } else {
          console.error('❌ Permission migration failed:', migration.errors);
          // Continue with defaults rather than failing
        }
      } else {
        console.log('📋 No existing permission data found, starting with defaults');
      }

    } catch (error) {
      console.error('❌ Migration check failed:', error);
      // Continue with defaults rather than failing
    }
  }

  /**
   * Sync with existing popup/storage system preferences
   * This ensures the unified system matches what users have already configured
   */
  private async syncWithExistingPreferences(): Promise<void> {
    try {
      console.log('🔄 UnifiedPermissionService: Syncing with existing preferences...');

      // Read existing global state from chrome.storage.local
      const globalResult = await chrome.storage.local.get(['extensionEnabled']);
      const globalEnabled = globalResult.extensionEnabled ?? true;
      
      // Update unified system with global state
      await unifiedPermissionManager.setGlobalEnabled(globalEnabled);

      console.log(`✅ UnifiedPermissionService: Synced global state: ${globalEnabled}`);

    } catch (error) {
      console.error('❌ UnifiedPermissionService: Failed to sync existing preferences:', error);
      // Don't fail initialization, just log the error
    }
  }

  /**
   * Set up Chrome storage change listeners for backward compatibility
   */
  private setupStorageListeners(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.unifiedPermissions) {
        console.log('🔄 Unified permissions changed, notifying components...');
        // The unified manager's event system will handle notifications
      }
    });
  }

  // ===== MESSAGE HANDLER METHODS =====
  // These provide backward compatibility with existing popup/dashboard APIs

  /**
   * Handle GET_GLOBAL_POWER_STATE message
   */
  async handleGetGlobalPowerState(): Promise<{ enabled: boolean }> {
    const enabled = await unifiedPermissionManager.isGlobalEnabled();
    return { enabled };
  }

  /**
   * Handle GET_SITE_SPECIFIC_STATE message
   */
  async handleGetSiteSpecificState(tabId: number): Promise<{ enabled: boolean }> {
    try {
      // Get tab URL first
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      if (!tab?.url) {
        return { enabled: true }; // Default to enabled if no URL
      }

      const domain = this.extractDomain(tab.url);
      const enabled = await unifiedPermissionManager.isSiteEnabled(domain);
      return { enabled };

    } catch (error) {
      console.error('Error getting site-specific state:', error);
      return { enabled: true }; // Safe fallback
    }
  }

  /**
   * Check if a site is enabled by domain (backward compatibility)
   */
  async isSiteEnabledByDomain(domain: string): Promise<boolean> {
    return await unifiedPermissionManager.isSiteEnabled(domain);
  }

  /**
   * Handle GET_EXTENSION_STATE message (backward compatibility)
   */
  async handleGetExtensionState(tabId?: number): Promise<{ enabled: boolean; domain?: string }> {
    try {
      if (!tabId) {
        // Return global state only
        const enabled = await unifiedPermissionManager.isGlobalEnabled();
        return { enabled };
      }

      // Get tab URL
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      if (!tab?.url) {
        const enabled = await unifiedPermissionManager.isGlobalEnabled();
        return { enabled };
      }

      // Use unified permission check
      const globalEnabled = await unifiedPermissionManager.isGlobalEnabled();
      if (!globalEnabled) {
        return { enabled: false, domain: this.extractDomain(tab.url) };
      }

      const domain = this.extractDomain(tab.url);
      const siteEnabled = await unifiedPermissionManager.isSiteEnabled(domain);

      return { enabled: siteEnabled, domain };

    } catch (error) {
      console.error('Error getting extension state:', error);
      return { enabled: true }; // Safe fallback
    }
  }

  /**
   * Handle SET_EXTENSION_STATE message (backward compatibility)
   */
  async handleSetExtensionState(enabled: boolean, tabId?: number): Promise<{ success: boolean; newState: any }> {
    try {
      if (!tabId) {
        // Set global state
        await unifiedPermissionManager.setGlobalEnabled(enabled);
        return {
          success: true,
          newState: { enabled }
        };
      }

      // Set site-specific state
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      if (tab?.url) {
        const domain = this.extractDomain(tab.url);
        await unifiedPermissionManager.setSiteEnabled(domain, enabled);
      }

      return {
        success: true,
        newState: { enabled }
      };

    } catch (error) {
      console.error('Error setting extension state:', error);
      return {
        success: false,
        newState: { enabled: false }
      };
    }
  }

  /**
   * Handle tab-specific logging state messages
   */
  async handleGetTabNetworkState(tabId: number): Promise<{ success: boolean; active: boolean }> {
    try {
      const active = await unifiedPermissionManager.isFeatureEnabled(tabId, 'network');
      return { success: true, active };
    } catch (error) {
      console.error('Error getting tab network state:', error);
      return { success: false, active: false };
    }
  }

  async handleSetTabNetworkState(tabId: number, active: boolean): Promise<{ success: boolean }> {
    try {
      // Get tab URL for context
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      await unifiedPermissionManager.setFeatureEnabled(tabId, 'network', active, tab?.url);
      return { success: true };
    } catch (error) {
      console.error('Error setting tab network state:', error);
      return { success: false };
    }
  }

  async handleGetTabErrorState(tabId: number): Promise<{ success: boolean; active: boolean }> {
    try {
      const active = await unifiedPermissionManager.isFeatureEnabled(tabId, 'console');
      return { success: true, active };
    } catch (error) {
      console.error('Error getting tab error state:', error);
      return { success: false, active: false };
    }
  }

  async handleSetTabErrorState(tabId: number, active: boolean): Promise<{ success: boolean }> {
    try {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      await unifiedPermissionManager.setFeatureEnabled(tabId, 'console', active, tab?.url);
      return { success: true };
    } catch (error) {
      console.error('Error setting tab error state:', error);
      return { success: false };
    }
  }

  async handleGetTabTokenState(tabId: number): Promise<{ success: boolean; active: boolean }> {
    try {
      const active = await unifiedPermissionManager.isFeatureEnabled(tabId, 'tokens');
      return { success: true, active };
    } catch (error) {
      console.error('Error getting tab token state:', error);
      return { success: false, active: false };
    }
  }

  async handleSetTabTokenState(tabId: number, active: boolean): Promise<{ success: boolean }> {
    try {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      await unifiedPermissionManager.setFeatureEnabled(tabId, 'tokens', active, tab?.url);
      return { success: true };
    } catch (error) {
      console.error('Error setting tab token state:', error);
      return { success: false };
    }
  }

  /**
   * Master permission check for content scripts
   */
  async canInterceptOnTab(
    tabId: number,
    feature: 'network' | 'console' | 'tokens'
  ): Promise<{ canIntercept: boolean; reason?: string }> {
    try {
      // Get tab URL
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      if (!tab?.url) {
        return { canIntercept: false, reason: 'No tab URL found' };
      }

      const canIntercept = await unifiedPermissionManager.canIntercept(tabId, feature, tab.url);

      if (!canIntercept) {
        // Determine reason
        const globalEnabled = await unifiedPermissionManager.isGlobalEnabled();
        if (!globalEnabled) {
          return { canIntercept: false, reason: 'Global extension disabled' };
        }

        const domain = this.extractDomain(tab.url);
        const siteEnabled = await unifiedPermissionManager.isSiteEnabled(domain);
        if (!siteEnabled) {
          return { canIntercept: false, reason: `Site ${domain} disabled` };
        }

        return { canIntercept: false, reason: `${feature} logging disabled for this tab` };
      }

      return { canIntercept: true };

    } catch (error) {
      console.error('Error checking interception permissions:', error);
      return { canIntercept: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Get complete permission state for a tab (for popup UI)
   */
  async getTabPermissionState(tabId: number): Promise<{
    global: boolean;
    site: boolean;
    features: { network: boolean; console: boolean; tokens: boolean };
    domain?: string;
  }> {
    try {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.id === tabId);

      return await unifiedPermissionManager.getTabPermissionState(tabId, tab?.url);

    } catch (error) {
      console.error('Error getting tab permission state:', error);
      return {
        global: true,
        site: true,
        features: { network: false, console: false, tokens: false }
      };
    }
  }

  // ===== UTILITY METHODS =====

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.isInitialized = false;
    console.log('🧹 UnifiedPermissionService: Cleanup completed');
  }
}

// Export singleton instance
export const unifiedPermissionService = new UnifiedPermissionService();
