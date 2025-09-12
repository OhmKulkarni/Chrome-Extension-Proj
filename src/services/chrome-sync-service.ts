/**
 * Chrome Sync Service
 *
 * Handles Chrome sync storage operations for cross-device preferences.
 * Separates user preferences and tab logging preferences from large local data.
 */

import {
  ChromeSyncStorage,
  SyncTabPreferences,
  SyncUserPreferences,
  DomainLoggingPreferences,
  DEFAULT_TAB_PREFERENCES,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_SYNC_STORAGE
} from '../types/sync-storage-types';

export class ChromeSyncService {
  private static instance: ChromeSyncService | null = null;

  private constructor() {}

  static getInstance(): ChromeSyncService {
    if (!this.instance) {
      this.instance = new ChromeSyncService();
    }
    return this.instance;
  }

  /**
   * Get domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get tab logging preferences for a specific domain
   */
  async getTabPreferencesForDomain(domain: string): Promise<DomainLoggingPreferences> {
    try {
      const result = await chrome.storage.sync.get(['tabPreferences']);
      const tabPrefs = result.tabPreferences || DEFAULT_TAB_PREFERENCES;

      // Return domain-specific preferences or safe defaults with timestamp
      const domainPrefs = tabPrefs.domainPreferences[domain];
      if (domainPrefs) {
        return domainPrefs;
      } else {
        // MAJOR FIX: Always return safe defaults for new domains
        return {
          network: false,
          errors: false, // Hardcoded to false for security
          tokens: false,
          lastUpdated: Date.now()
        };
      }
    } catch (error) {
      // console.warn('ChromeSyncService: Failed to get tab preferences, using defaults:', error);
      // MAJOR FIX: Return safe hardcoded defaults
      return {
        network: false,
        errors: false, // Hardcoded to false for security
        tokens: false,
        lastUpdated: Date.now()
      };
    }
  }

  /**
   * Get tab logging preferences for a URL
   */
  async getTabPreferencesForUrl(url: string): Promise<DomainLoggingPreferences> {
    const domain = this.extractDomain(url);
    return this.getTabPreferencesForDomain(domain);
  }

  /**
   * Set tab logging preferences for a domain
   */
  async setTabPreferencesForDomain(domain: string, preferences: Partial<DomainLoggingPreferences>): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['tabPreferences']);
      const tabPrefs: SyncTabPreferences = result.tabPreferences || DEFAULT_TAB_PREFERENCES;

      // Update domain preferences
      tabPrefs.domainPreferences[domain] = {
        ...tabPrefs.domainPreferences[domain],
        ...preferences,
        lastUpdated: Date.now()
      };

      tabPrefs.lastSync = Date.now();

      await chrome.storage.sync.set({ tabPreferences: tabPrefs });

      // console.log(`✅ ChromeSyncService: Updated tab preferences for domain ${domain}`, preferences);
    } catch (error) {
      // console.error('ChromeSyncService: Failed to set tab preferences:', error);
      throw error;
    }
  }

  /**
   * Set tab logging preferences for a URL
   */
  async setTabPreferencesForUrl(url: string, preferences: Partial<DomainLoggingPreferences>): Promise<void> {
    const domain = this.extractDomain(url);
    return this.setTabPreferencesForDomain(domain, preferences);
  }

  /**
   * Get global tab logging defaults
   */
  async getTabDefaults(): Promise<Omit<DomainLoggingPreferences, 'lastUpdated'>> {
    // MAJOR FIX: Always return safe defaults regardless of stored sync data
    // This prevents console logging from being enabled by default due to old cached sync data
    return {
      network: false,
      errors: false, // Hardcoded to false for security
      tokens: false
    };
  }

  /**
   * Set global tab logging defaults
   */
  async setTabDefaults(defaults: Partial<Omit<DomainLoggingPreferences, 'lastUpdated'>>): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['tabPreferences']);
      const tabPrefs: SyncTabPreferences = result.tabPreferences || DEFAULT_TAB_PREFERENCES;

      tabPrefs.defaults = {
        ...tabPrefs.defaults,
        ...defaults
      };

      tabPrefs.lastSync = Date.now();

      await chrome.storage.sync.set({ tabPreferences: tabPrefs });

      // console.log('✅ ChromeSyncService: Updated tab defaults', defaults);
    } catch (error) {
      // console.error('ChromeSyncService: Failed to set tab defaults:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<SyncUserPreferences> {
    try {
      const result = await chrome.storage.sync.get(['userPreferences']);
      return result.userPreferences || DEFAULT_USER_PREFERENCES;
    } catch (error) {
      // console.warn('ChromeSyncService: Failed to get user preferences, using defaults:', error);
      return DEFAULT_USER_PREFERENCES;
    }
  }

  /**
   * Set user preferences
   */
  async setUserPreferences(preferences: Partial<SyncUserPreferences>): Promise<void> {
    try {
      const current = await this.getUserPreferences();

      const updated: SyncUserPreferences = {
        ...current,
        ...preferences,
        lastUpdated: Date.now()
      };

      await chrome.storage.sync.set({ userPreferences: updated });

      // console.log('✅ ChromeSyncService: Updated user preferences', preferences);
    } catch (error) {
      // console.error('ChromeSyncService: Failed to set user preferences:', error);
      throw error;
    }
  }

  /**
   * Get all sync storage data
   */
  async getAllSyncData(): Promise<ChromeSyncStorage> {
    try {
      const result = await chrome.storage.sync.get(['tabPreferences', 'userPreferences', 'syncMetadata']);

      return {
        tabPreferences: result.tabPreferences || DEFAULT_TAB_PREFERENCES,
        userPreferences: result.userPreferences || DEFAULT_USER_PREFERENCES,
        syncMetadata: result.syncMetadata || DEFAULT_SYNC_STORAGE.syncMetadata
      };
    } catch (error) {
      // console.warn('ChromeSyncService: Failed to get all sync data, using defaults:', error);
      return DEFAULT_SYNC_STORAGE;
    }
  }

  /**
   * Initialize sync storage with defaults if empty
   */
  async initializeSyncStorage(): Promise<void> {
    try {
      const existing = await chrome.storage.sync.get(['tabPreferences', 'userPreferences', 'syncMetadata']);

      const updates: Partial<ChromeSyncStorage> = {};

      if (!existing.tabPreferences) {
        updates.tabPreferences = DEFAULT_TAB_PREFERENCES;
      }

      if (!existing.userPreferences) {
        updates.userPreferences = DEFAULT_USER_PREFERENCES;
      }

      if (!existing.syncMetadata) {
        updates.syncMetadata = {
          ...DEFAULT_SYNC_STORAGE.syncMetadata,
          deviceId: this.generateDeviceId()
        };
      }

      if (Object.keys(updates).length > 0) {
        await chrome.storage.sync.set(updates);
        // console.log('✅ ChromeSyncService: Initialized sync storage with defaults');
      } else {
        // console.log('✅ ChromeSyncService: Sync storage already initialized');
      }
    } catch (error) {
      // console.error('ChromeSyncService: Failed to initialize sync storage:', error);
    }
  }

  /**
   * Generate a unique device ID
   */
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current sync storage usage
   */
  async getSyncStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    try {
      const bytesUsed = await chrome.storage.sync.getBytesInUse();
      const quota = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB

      return {
        used: bytesUsed,
        quota,
        percentage: (bytesUsed / quota) * 100
      };
    } catch (error) {
      // console.warn('ChromeSyncService: Failed to get storage usage:', error);
      return { used: 0, quota: 102400, percentage: 0 };
    }
  }

  /**
   * Clear all sync storage (for debugging/reset)
   */
  async clearAllSyncStorage(): Promise<void> {
    try {
      await chrome.storage.sync.clear();
      // console.log('🗑️ ChromeSyncService: Cleared all sync storage');
    } catch (error) {
      // console.error('ChromeSyncService: Failed to clear sync storage:', error);
      throw error;
    }
  }
}
