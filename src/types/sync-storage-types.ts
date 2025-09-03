/**
 * Chrome Sync Storage Types
 *
 * Defines the structure for data that should sync across devices:
 * - User preferences
 * - Tab logging preferences
 * - Cross-device settings
 */

export interface DomainLoggingPreferences {
  network: boolean;
  errors: boolean;
  tokens: boolean;
  lastUpdated: number;
}

export interface TabLoggingDefaults {
  network: boolean;
  errors: boolean;
  tokens: boolean;
}

export interface SyncTabPreferences {
  // Domain-based preferences that sync across devices
  domainPreferences: {
    [domain: string]: DomainLoggingPreferences;
  };

  // Global defaults for new/unknown domains
  defaults: TabLoggingDefaults;

  // Metadata
  version: number;
  lastSync: number;
}

export interface SyncUserPreferences {
  // UI Theme preferences
  ui: {
    theme: 'dark' | 'light';
    compactView: boolean;
    showTimestamps: boolean;
    showFullUrls: boolean;
    language: string;
  };

  // Extension behavior preferences
  behavior: {
    globalEnabled: boolean;
    autoStartLogging: boolean;
    notificationsEnabled: boolean;
    soundEnabled: boolean;
  };

  // Feature toggles
  features: {
    advancedMode: boolean;
    debugMode: boolean;
    experimentalFeatures: string[];
  };

  // Cross-device sync settings
  sync: {
    syncTabStates: boolean;
    shareSettings: boolean;
    lastDeviceSync: string;
  };

  // Metadata
  version: number;
  lastUpdated: number;
}

// Main sync storage structure
export interface ChromeSyncStorage {
  // Tab logging preferences (domain-based)
  tabPreferences: SyncTabPreferences;

  // User preferences (UI, behavior, features)
  userPreferences: SyncUserPreferences;

  // Storage metadata
  syncMetadata: {
    version: string;
    deviceId: string;
    lastFullSync: number;
  };
}

// Default values
export const DEFAULT_TAB_PREFERENCES: SyncTabPreferences = {
  domainPreferences: {},
  defaults: {
    network: false, // Keep as false - site toggle will override when needed
    errors: false,  // FIXED: Changed from true to false for consistency
    tokens: false
  },
  version: 1,
  lastSync: Date.now()
};

export const DEFAULT_USER_PREFERENCES: SyncUserPreferences = {
  ui: {
    theme: 'dark',
    compactView: false,
    showTimestamps: true,
    showFullUrls: false,
    language: 'en'
  },
  behavior: {
    globalEnabled: true,
    autoStartLogging: false,
    notificationsEnabled: true,
    soundEnabled: false
  },
  features: {
    advancedMode: false,
    debugMode: false,
    experimentalFeatures: []
  },
  sync: {
    syncTabStates: true,
    shareSettings: true,
    lastDeviceSync: 'unknown'
  },
  version: 1,
  lastUpdated: Date.now()
};

export const DEFAULT_SYNC_STORAGE: ChromeSyncStorage = {
  tabPreferences: DEFAULT_TAB_PREFERENCES,
  userPreferences: DEFAULT_USER_PREFERENCES,
  syncMetadata: {
    version: '1.0.0',
    deviceId: 'unknown',
    lastFullSync: Date.now()
  }
};
