/**
 * Permission Migration Utility
 *
 * Migrates existing permission data from the complex multi-layer system
 * to the new unified chrome.storage.local system.
 *
 * Migration Sources:
 * - chrome.storage.local: extensionEnabled, tabLogging_*, tabErrorLogging_*, tabTokenLogging_*
 * - IndexedDB settings: networkInterception, errorLogging, tokenLogging defaults
 * - ExtensionState: site-specific permissions
 */

import { UnifiedPermissionManager } from './unified-permission-manager';
import { StorageService } from './storage-service';

export class PermissionMigrationUtility {
  private readonly storageService = new StorageService();
  private readonly unifiedManager = UnifiedPermissionManager.getInstance();
  private static migrationInProgress = false;
  private static migrationPromise: Promise<any> | null = null;

  /**
   * Perform complete migration from old system to unified system (with lock)
   */
  async migrateToUnifiedSystem(): Promise<{ success: boolean; migrated: any; errors: any[] }> {
    // Prevent concurrent migrations
    if (PermissionMigrationUtility.migrationInProgress) {
      if (PermissionMigrationUtility.migrationPromise) {
        return PermissionMigrationUtility.migrationPromise;
      }
    }

    PermissionMigrationUtility.migrationInProgress = true;
    PermissionMigrationUtility.migrationPromise = this.performMigration();

    try {
      return await PermissionMigrationUtility.migrationPromise;
    } finally {
      PermissionMigrationUtility.migrationInProgress = false;
      PermissionMigrationUtility.migrationPromise = null;
    }
  }

  private async performMigration(): Promise<{ success: boolean; migrated: any; errors: any[] }> {
    console.log('🔄 Starting permission system migration...');

    const migrated: any = {};
    const errors: any[] = [];

    try {
      // Step 1: Migrate global state
      const globalState = await this.migrateGlobalState();
      migrated.global = globalState;

      // Step 2: Migrate site-specific permissions
      const sitePermissions = await this.migrateSitePermissions();
      migrated.sites = sitePermissions;

      // Step 3: Migrate tab controls
      const tabControls = await this.migrateTabControls();
      migrated.tabs = tabControls;

      // Step 4: Migrate feature defaults
      const featureDefaults = await this.migrateFeatureDefaults();
      migrated.defaults = featureDefaults;

      // Step 5: Apply migrated data to unified manager
      await this.applyMigratedData(migrated);

      // Step 6: Verify migration
      await this.verifyMigration();

      console.log('✅ Permission migration completed successfully');
      console.log('📊 Migration summary:', migrated);

      return { success: true, migrated, errors };

    } catch (error) {
      console.error('❌ Permission migration failed:', error);
      errors.push({ step: 'migration', error: String(error) });

      return { success: false, migrated, errors };
    }
  }

  /**
   * Step 1: Migrate global extension state
   */
  private async migrateGlobalState(): Promise<boolean> {
    try {
      // Check chrome.storage.local first
      const localResult = await chrome.storage.local.get(['extensionEnabled']);
      if (localResult.extensionEnabled !== undefined) {
        console.log('📥 Found global state in chrome.storage.local:', localResult.extensionEnabled);
        return localResult.extensionEnabled;
      }

      // Check old ExtensionState system
      const stateResult = await chrome.storage.local.get(['extensionState']);
      if (stateResult.extensionState?.enabled !== undefined) {
        console.log('📥 Found global state in extensionState:', stateResult.extensionState.enabled);
        return stateResult.extensionState.enabled;
      }

      console.log('📥 No existing global state found, using default: true');
      return true; // Safe default

    } catch (error) {
      console.warn('⚠️ Error migrating global state:', error);
      return true; // Safe fallback
    }
  }

  /**
   * Step 2: Migrate site-specific permissions
   */
  private async migrateSitePermissions(): Promise<{ [domain: string]: { enabled: boolean; lastUpdated: number } }> {
    const sitePermissions: { [domain: string]: { enabled: boolean; lastUpdated: number } } = {};

    try {
      // Check ExtensionState for site-specific data
      const stateResult = await chrome.storage.local.get(['extensionState']);
      if (stateResult.extensionState?.siteSpecificState) {
        const siteState = stateResult.extensionState.siteSpecificState;

        for (const [domain, enabled] of Object.entries(siteState)) {
          sitePermissions[domain] = {
            enabled: enabled as boolean,
            lastUpdated: Date.now()
          };
        }

        console.log('📥 Migrated site permissions:', Object.keys(sitePermissions));
      }

    } catch (error) {
      console.warn('⚠️ Error migrating site permissions:', error);
    }

    return sitePermissions;
  }

  /**
   * Step 3: Migrate existing tab controls
   */
  private async migrateTabControls(): Promise<{ [tabId: number]: any }> {
    const tabControls: { [tabId: number]: any } = {};

    try {
      // Get all chrome.storage.local data to find tab-specific keys
      const allData = await chrome.storage.local.get(null);

      // Find tab logging keys
      const networkTabs = this.findTabKeys(allData, 'tabLogging_');
      const errorTabs = this.findTabKeys(allData, 'tabErrorLogging_');
      const tokenTabs = this.findTabKeys(allData, 'tabTokenLogging_');

      // Combine all tab IDs
      const allTabIds = new Set([...networkTabs.keys(), ...errorTabs.keys(), ...tokenTabs.keys()]);

      for (const tabId of allTabIds) {
        const networkData = networkTabs.get(tabId);
        const errorData = errorTabs.get(tabId);
        const tokenData = tokenTabs.get(tabId);

        tabControls[tabId] = {
          network: networkData?.active ?? false,
          console: errorData?.active ?? false,
          tokens: tokenData?.active ?? false,
          url: networkData?.url || errorData?.url || tokenData?.url || '',
          domain: this.extractDomain(networkData?.url || errorData?.url || tokenData?.url || ''),
          lastUpdated: Math.max(
            networkData?.startTime || 0,
            errorData?.startTime || 0,
            tokenData?.startTime || 0,
            Date.now()
          )
        };
      }

      console.log(`📥 Migrated ${allTabIds.size} tab controls`);

    } catch (error) {
      console.warn('⚠️ Error migrating tab controls:', error);
    }

    return tabControls;
  }

  /**
   * Step 4: Migrate feature defaults from IndexedDB settings
   */
  private async migrateFeatureDefaults(): Promise<{ network: boolean; console: boolean; tokens: boolean }> {
    const defaults = {
      network: false, // Safe defaults - start disabled
      console: false,
      tokens: false
    };

    try {
      // Try to get settings from IndexedDB via StorageService
      const settingsResult = await this.storageService.get(['settings']);
      const settings = settingsResult?.settings;

      if (settings) {
        // Extract defaults from settings
        if (settings.networkInterception?.tabSpecific?.defaultState) {
          defaults.network = settings.networkInterception.tabSpecific.defaultState === 'active';
        }

        if (settings.errorLogging?.tabSpecific?.defaultState) {
          defaults.console = settings.errorLogging.tabSpecific.defaultState === 'active';
        }

        if (settings.tokenLogging?.tabSpecific?.defaultState) {
          defaults.tokens = settings.tokenLogging.tabSpecific.defaultState === 'active';
        }

        console.log('📥 Migrated feature defaults from IndexedDB:', defaults);
      } else {
        console.log('📥 No IndexedDB settings found, using safe defaults:', defaults);
      }

    } catch (error) {
      console.warn('⚠️ Error migrating feature defaults:', error);
    }

    return defaults;
  }

  /**
   * Step 5: Apply migrated data to unified manager
   */
  private async applyMigratedData(migrated: any): Promise<void> {
    console.log('🔄 Applying migrated data to unified permission manager...');

    // Initialize unified manager
    await this.unifiedManager.initialize();

    // Set global state
    if (migrated.global !== undefined) {
      await this.unifiedManager.setGlobalEnabled(migrated.global);
    }

    // Set site permissions
    if (migrated.sites) {
      for (const [domain, siteData] of Object.entries(migrated.sites as Record<string, any>)) {
        await this.unifiedManager.setSiteEnabled(domain, siteData?.enabled ?? true);
      }
    }

    // Set tab controls
    if (migrated.tabs) {
      for (const [tabIdStr, tabData] of Object.entries(migrated.tabs as Record<string, any>)) {
        const tabId = parseInt(tabIdStr);

        // Set each feature individually
        await this.unifiedManager.setFeatureEnabled(tabId, 'network', tabData?.network ?? false);
        await this.unifiedManager.setFeatureEnabled(tabId, 'console', tabData?.console ?? false);
        await this.unifiedManager.setFeatureEnabled(tabId, 'tokens', tabData?.tokens ?? false);
      }
    }

    console.log('✅ Successfully applied migrated data');
  }

  /**
   * Step 6: Verify migration completed correctly
   */
  private async verifyMigration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if unified manager is working
      const globalEnabled = await this.unifiedManager.isGlobalEnabled();
      if (typeof globalEnabled !== 'boolean') {
        issues.push('Global state not properly migrated');
      }

      // Check if unified permission storage exists
      const result = await chrome.storage.local.get(['unifiedPermissions']);
      if (!result.unifiedPermissions) {
        issues.push('Unified permissions not found in storage');
      }

      console.log(issues.length === 0 ? '✅ Migration verification passed' : '⚠️ Migration verification issues:', issues);

    } catch (error) {
      issues.push(`Verification error: ${String(error)}`);
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Create backup of current system before migration
   */
  async createBackup(): Promise<{ success: boolean; backup?: any; error?: string }> {
    try {
      console.log('💾 Creating backup of current permission system...');

      // Backup chrome.storage.local permission-related data
      const allLocal = await chrome.storage.local.get(null);
      const permissionKeys = Object.keys(allLocal).filter(key =>
        key === 'extensionEnabled' ||
        key === 'extensionState' ||
        key.startsWith('tabLogging_') ||
        key.startsWith('tabErrorLogging_') ||
        key.startsWith('tabTokenLogging_')
      );

      const localBackup: any = {};
      permissionKeys.forEach(key => {
        localBackup[key] = allLocal[key];
      });

      // Backup IndexedDB settings
      let indexedDbBackup = null;
      try {
        const settingsResult = await this.storageService.get(['settings']);
        indexedDbBackup = settingsResult?.settings;
      } catch (error) {
        console.warn('Could not backup IndexedDB settings:', error);
      }

      const backup = {
        timestamp: Date.now(),
        chromeStorageLocal: localBackup,
        indexedDbSettings: indexedDbBackup,
        version: '1.0.0'
      };

      // Store backup
      await chrome.storage.local.set({ 'permissionSystemBackup': backup });

      console.log('✅ Backup created successfully');
      return { success: true, backup };

    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await chrome.storage.local.get(['permissionSystemBackup']);
      const backup = result.permissionSystemBackup;

      if (!backup) {
        throw new Error('No backup found');
      }

      // Restore chrome.storage.local data
      if (backup.chromeStorageLocal) {
        await chrome.storage.local.set(backup.chromeStorageLocal);
      }

      // Remove unified system
      await chrome.storage.local.remove(['unifiedPermissions']);

      console.log('✅ Successfully restored from backup');
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return { success: false, error: String(error) };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Find tab-specific keys in storage data
   */
  private findTabKeys(allData: any, prefix: string): Map<number, any> {
    const tabKeys = new Map<number, any>();

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(prefix)) {
        const tabIdStr = key.replace(prefix, '');
        const tabId = parseInt(tabIdStr);

        if (!isNaN(tabId)) {
          tabKeys.set(tabId, value);
        }
      }
    }

    return tabKeys;
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
}

// Export singleton instance
export const permissionMigrationUtility = new PermissionMigrationUtility();
