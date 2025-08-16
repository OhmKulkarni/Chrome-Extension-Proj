/**
 * PHASE 5: Safe Migration Script
 * 
 * This file provides a safe way to migrate existing code to the new decoupled architecture.
 * It can be imported in background.ts and other files to enable the new system gradually.
 * 
 * SAFETY: Enables new architecture alongside existing code without breaking anything
 */

import { initializeLegacyCompatibility } from './legacy-compatibility';
import { networkDataProvider } from '../features/network/network-data-provider';
import { consoleDataProvider } from '../features/console/console-data-provider';
import { tokenDataProvider } from '../features/tokens/token-data-provider';
import { messageBus } from './messaging/message-bus';

// Migration flags to control rollout
export const MIGRATION_FLAGS = {
  ENABLE_NEW_NETWORK_HANDLING: true,
  ENABLE_NEW_CONSOLE_HANDLING: true,
  ENABLE_NEW_TOKEN_HANDLING: true,
  ENABLE_MESSAGE_BUS: true,
  ENABLE_LEGACY_COMPATIBILITY: true,
  DEBUG_MIGRATION: false // Set to true to see migration logs
} as const;

// Migration state tracking
interface MigrationState {
  networkMigrated: boolean;
  consoleMigrated: boolean;
  tokenMigrated: boolean;
  messageBusMigrated: boolean;
  legacyCompatibilityEnabled: boolean;
  startTime: string;
  errors: string[];
}

let migrationState: MigrationState = {
  networkMigrated: false,
  consoleMigrated: false,
  tokenMigrated: false,
  messageBusMigrated: false,
  legacyCompatibilityEnabled: false,
  startTime: '',
  errors: []
};

// Safe migration function that can be called from any file
export async function initializeDecoupledArchitecture(): Promise<MigrationState> {
  migrationState.startTime = new Date().toISOString();
  migrationState.errors = [];
  
  if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
    console.log('🚀 Starting decoupled architecture migration...');
  }

  try {
    // Phase 1: Enable legacy compatibility first (safety net)
    if (MIGRATION_FLAGS.ENABLE_LEGACY_COMPATIBILITY) {
      try {
        initializeLegacyCompatibility();
        migrationState.legacyCompatibilityEnabled = true;
        
        if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
          console.log('✅ Legacy compatibility layer enabled');
        }
      } catch (error) {
        const errorMsg = `Legacy compatibility failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        migrationState.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Phase 2: Initialize message bus
    if (MIGRATION_FLAGS.ENABLE_MESSAGE_BUS) {
      try {
        // Message bus is already initialized as singleton
        migrationState.messageBusMigrated = true;
        
        if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
          console.log('✅ Message bus initialized');
          console.log('📊 Message bus stats:', messageBus.getChannelStats());
        }
      } catch (error) {
        const errorMsg = `Message bus initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        migrationState.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Phase 3: Initialize network data provider
    if (MIGRATION_FLAGS.ENABLE_NEW_NETWORK_HANDLING) {
      try {
        // Network data provider is already initialized as singleton
        migrationState.networkMigrated = true;
        
        if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
          console.log('✅ Network data provider initialized');
          console.log('📊 Network stats:', networkDataProvider.getNetworkStats());
        }
      } catch (error) {
        const errorMsg = `Network provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        migrationState.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Phase 4: Initialize console data provider
    if (MIGRATION_FLAGS.ENABLE_NEW_CONSOLE_HANDLING) {
      try {
        // Console data provider is already initialized as singleton
        migrationState.consoleMigrated = true;
        
        if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
          console.log('✅ Console data provider initialized');
          console.log('📊 Console stats:', consoleDataProvider.getConsoleStats());
        }
      } catch (error) {
        const errorMsg = `Console provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        migrationState.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Phase 5: Initialize token data provider
    if (MIGRATION_FLAGS.ENABLE_NEW_TOKEN_HANDLING) {
      try {
        // Token data provider is already initialized as singleton
        migrationState.tokenMigrated = true;
        
        if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
          console.log('✅ Token data provider initialized');
          console.log('📊 Token stats:', tokenDataProvider.getTokenStats());
        }
      } catch (error) {
        const errorMsg = `Token provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        migrationState.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    // Log migration summary
    const successCount = [
      migrationState.networkMigrated,
      migrationState.consoleMigrated, 
      migrationState.tokenMigrated,
      migrationState.messageBusMigrated,
      migrationState.legacyCompatibilityEnabled
    ].filter(Boolean).length;

    if (MIGRATION_FLAGS.DEBUG_MIGRATION || migrationState.errors.length > 0) {
      console.log(`🎯 Migration complete: ${successCount}/5 components initialized`);
      if (migrationState.errors.length > 0) {
        console.log('⚠️ Migration errors:', migrationState.errors);
      }
    }

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    migrationState.errors.push(errorMsg);
    console.error('❌ Critical migration error:', errorMsg);
  }

  return { ...migrationState };
}

// Function to check if new architecture is available for a feature
export function isFeatureMigrated(feature: 'network' | 'console' | 'token' | 'messaging'): boolean {
  switch (feature) {
    case 'network':
      return migrationState.networkMigrated && MIGRATION_FLAGS.ENABLE_NEW_NETWORK_HANDLING;
    case 'console':
      return migrationState.consoleMigrated && MIGRATION_FLAGS.ENABLE_NEW_CONSOLE_HANDLING;
    case 'token':
      return migrationState.tokenMigrated && MIGRATION_FLAGS.ENABLE_NEW_TOKEN_HANDLING;
    case 'messaging':
      return migrationState.messageBusMigrated && MIGRATION_FLAGS.ENABLE_MESSAGE_BUS;
    default:
      return false;
  }
}

// Function to get migration status for debugging
export function getMigrationStatus(): MigrationState & { 
  isFullyMigrated: boolean;
  migrationTime: number;
} {
  const isFullyMigrated = migrationState.networkMigrated && 
                         migrationState.consoleMigrated && 
                         migrationState.tokenMigrated && 
                         migrationState.messageBusMigrated && 
                         migrationState.legacyCompatibilityEnabled;

  const migrationTime = migrationState.startTime ? 
    Date.now() - new Date(migrationState.startTime).getTime() : 0;

  return {
    ...migrationState,
    isFullyMigrated,
    migrationTime
  };
}

// Safe wrapper for existing background.ts message handlers
export function createSafeMessageHandler(
  originalHandler: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | void,
  feature: 'network' | 'console' | 'token' | 'general' = 'general'
) {
  return (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
    try {
      // Check if we should use new architecture
      const useNewArchitecture = feature !== 'general' && isFeatureMigrated(feature);
      
      if (useNewArchitecture) {
        // Let new architecture handle it
        return false; // Not handled by legacy code
      } else {
        // Use original handler
        const result = originalHandler(message, sender, sendResponse);
        return result === true; // Ensure boolean return
      }
    } catch (error) {
      console.error(`Safe message handler error (${feature}):`, error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Message handler error' 
      });
      return true;
    }
  };
}

// Memory-safe cleanup function
export function cleanupDecoupledArchitecture(): void {
  try {
    if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
      console.log('🧹 Cleaning up decoupled architecture...');
    }

    // Cleanup in reverse order
    if (migrationState.tokenMigrated) {
      tokenDataProvider.cleanup();
    }
    
    if (migrationState.consoleMigrated) {
      consoleDataProvider.cleanup();
    }
    
    if (migrationState.networkMigrated) {
      networkDataProvider.cleanup();
    }
    
    if (migrationState.messageBusMigrated) {
      messageBus.cleanup();
    }

    // Reset migration state
    migrationState = {
      networkMigrated: false,
      consoleMigrated: false,
      tokenMigrated: false,
      messageBusMigrated: false,
      legacyCompatibilityEnabled: false,
      startTime: '',
      errors: []
    };

    if (MIGRATION_FLAGS.DEBUG_MIGRATION) {
      console.log('✅ Decoupled architecture cleanup complete');
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// Function to enable debug mode
export function enableMigrationDebug(): void {
  (MIGRATION_FLAGS as any).DEBUG_MIGRATION = true;
  console.log('🔍 Migration debug mode enabled');
}

// Export migration state for external monitoring
export { migrationState };

// Auto-initialize if in service worker context
if (typeof self !== 'undefined' && 'serviceWorker' in self) {
  // This is likely a service worker (background script)
  // Auto-initialize with a small delay to allow other scripts to load
  setTimeout(() => {
    initializeDecoupledArchitecture().then(state => {
      if (state.errors.length === 0) {
        console.log('🎉 Decoupled architecture initialized successfully');
      } else {
        console.warn('⚠️ Decoupled architecture initialized with warnings:', state.errors);
      }
    });
  }, 100);
}
