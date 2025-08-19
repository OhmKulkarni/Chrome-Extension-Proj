/**
 * Storage Migration Service - Migrate from Chrome Storage to IndexedDB
 *
 * Handles one-time migration of settings and tab states from Chrome storage
 * to the new unified IndexedDB system.
 */

import { ChromeApiModule } from '../shared/chrome-api.module';
import { EnvironmentStorageManager } from '../environment-storage-manager';

export class StorageMigrationService {
  private readonly chromeApi: ChromeApiModule;
  private readonly indexedDbStorage: EnvironmentStorageManager;

  // Chrome storage keys from StorageManagerModule
  private readonly STORAGE_KEYS = {
    SETTINGS: 'settings',
    TAB_NETWORK_LOGGING: 'tabLogging', // Fixed key name
    TAB_ERROR_LOGGING: 'tabErrorLogging'
  } as const;

  constructor(chromeApi: ChromeApiModule, indexedDbStorage: EnvironmentStorageManager) {
    this.chromeApi = chromeApi;
    this.indexedDbStorage = indexedDbStorage;
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if we have any settings in IndexedDB already
      const indexedDbSettings = await this.indexedDbStorage.getAllSettings();
      if (indexedDbSettings.length > 0) {
        console.log('🔄 StorageMigration: IndexedDB settings already exist, migration not needed');
        return false;
      }

      // Check if we have data in Chrome storage
      const allChromeStorage = await this.chromeApi.getFromStorage(null);
      const hasSettings = !!allChromeStorage[this.STORAGE_KEYS.SETTINGS];
      const hasTabStates = Object.keys(allChromeStorage).some(key =>
        key.startsWith(this.STORAGE_KEYS.TAB_NETWORK_LOGGING) ||
        key.startsWith(this.STORAGE_KEYS.TAB_ERROR_LOGGING)
      );

      const migrationNeeded = hasSettings || hasTabStates;
      console.log('🔄 StorageMigration: Migration needed:', migrationNeeded, {
        hasSettings,
        hasTabStates,
        chromeStorageKeys: Object.keys(allChromeStorage).length
      });

      return migrationNeeded;
    } catch (error) {
      console.error('🔄 StorageMigration: Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Perform complete migration from Chrome storage to IndexedDB
   */
  async performMigration(): Promise<void> {
    console.log('🔄 StorageMigration: Starting migration from Chrome storage to IndexedDB');

    try {
      // Migrate settings
      await this.migrateSettings();

      // Migrate tab states
      await this.migrateTabStates();

      // Mark migration as completed
      await this.indexedDbStorage.setSetting('migrationCompleted', {
        completed: true,
        timestamp: Date.now(),
        version: '1.0.0'
      }, 'extension');

      console.log('✅ StorageMigration: Migration completed successfully');
    } catch (error) {
      console.error('❌ StorageMigration: Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate settings from Chrome storage to IndexedDB
   */
  private async migrateSettings(): Promise<void> {
    try {
      const chromeStorage = await this.chromeApi.getFromStorage(this.STORAGE_KEYS.SETTINGS);
      const settings = chromeStorage[this.STORAGE_KEYS.SETTINGS];

      if (!settings) {
        console.log('🔄 StorageMigration: No settings to migrate');
        return;
      }

      // Convert settings object to individual key-value pairs
      if (typeof settings === 'object' && settings !== null) {
        for (const [key, value] of Object.entries(settings)) {
          await this.indexedDbStorage.setSetting(key, value, this.getSettingType(key));
        }
        console.log('✅ StorageMigration: Settings migrated successfully');
      }
    } catch (error) {
      console.error('❌ StorageMigration: Settings migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate tab states from Chrome storage to IndexedDB
   */
  private async migrateTabStates(): Promise<void> {
    try {
      const allChromeStorage = await this.chromeApi.getFromStorage(null);
      let migratedCount = 0;

      // Find all tab state keys
      const tabStateKeys = Object.keys(allChromeStorage).filter(key =>
        key.startsWith(this.STORAGE_KEYS.TAB_NETWORK_LOGGING) ||
        key.startsWith(this.STORAGE_KEYS.TAB_ERROR_LOGGING)
      );

      // Group by tab ID
      const tabStatesMap = new Map<number, any>();

      for (const key of tabStateKeys) {
        const tabIdMatch = key.match(/_(\d+)$/);
        if (!tabIdMatch) continue;

        const tabId = parseInt(tabIdMatch[1]);
        const isNetworkKey = key.startsWith(this.STORAGE_KEYS.TAB_NETWORK_LOGGING);
        const isErrorKey = key.startsWith(this.STORAGE_KEYS.TAB_ERROR_LOGGING);

        if (!tabStatesMap.has(tabId)) {
          tabStatesMap.set(tabId, {
            networkActive: false,
            errorActive: false,
            networkRequestCount: 0,
            errorCount: 0
          });
        }

        const tabState = tabStatesMap.get(tabId)!;
        const chromeValue = allChromeStorage[key];

        if (isNetworkKey) {
          if (typeof chromeValue === 'boolean') {
            tabState.networkActive = chromeValue;
          } else if (chromeValue && typeof chromeValue === 'object') {
            tabState.networkActive = chromeValue.active || false;
            tabState.networkStartTime = chromeValue.startTime;
            tabState.networkRequestCount = chromeValue.requestCount || 0;
          }
        } else if (isErrorKey) {
          if (typeof chromeValue === 'boolean') {
            tabState.errorActive = chromeValue;
          } else if (chromeValue && typeof chromeValue === 'object') {
            tabState.errorActive = chromeValue.active || false;
            tabState.errorStartTime = chromeValue.startTime;
            tabState.errorCount = chromeValue.errorCount || 0;
          }
        }
      }

      // Save all tab states to IndexedDB
      for (const [tabId, tabState] of tabStatesMap.entries()) {
        await this.indexedDbStorage.setTabState(tabId, tabState);
        migratedCount++;
      }

      console.log(`✅ StorageMigration: ${migratedCount} tab states migrated successfully`);
    } catch (error) {
      console.error('❌ StorageMigration: Tab states migration failed:', error);
      throw error;
    }
  }

  /**
   * Determine setting type based on key name
   */
  private getSettingType(key: string): string {
    if (key.includes('network') || key.includes('Network')) return 'network';
    if (key.includes('console') || key.includes('error') || key.includes('Error')) return 'console';
    if (key.includes('token') || key.includes('Token')) return 'tokens';
    if (key.includes('ui') || key.includes('UI') || key.includes('dashboard')) return 'ui';
    return 'extension';
  }

  /**
   * Clean up Chrome storage after successful migration (optional)
   */
  async cleanupChromeStorage(): Promise<void> {
    console.log('🧹 StorageMigration: Cleaning up Chrome storage after migration');

    try {
      const allStorage = await this.chromeApi.getFromStorage(null);
      const keysToRemove: string[] = [];

      // Add settings key
      if (allStorage[this.STORAGE_KEYS.SETTINGS]) {
        keysToRemove.push(this.STORAGE_KEYS.SETTINGS);
      }

      // Add tab state keys
      Object.keys(allStorage).forEach(key => {
        if (key.startsWith(this.STORAGE_KEYS.TAB_NETWORK_LOGGING) ||
            key.startsWith(this.STORAGE_KEYS.TAB_ERROR_LOGGING)) {
          keysToRemove.push(key);
        }
      });

      if (keysToRemove.length > 0) {
        await this.chromeApi.removeFromStorage(keysToRemove);
        console.log(`🧹 StorageMigration: Cleaned up ${keysToRemove.length} Chrome storage keys`);
      }
    } catch (error) {
      console.error('❌ StorageMigration: Chrome storage cleanup failed:', error);
      // Don't throw - cleanup failure shouldn't break the extension
    }
  }
}
