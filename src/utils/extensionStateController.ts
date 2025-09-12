/**
 * Extension State Controller - Manages global extension on/off state
 * Prevents memory leaks through proper cleanup and state management
 */

import { StorageService } from './storage-service';

interface TabState {
  enabled: boolean;
  url: string;
  timestamp: number;
}

interface ExtensionState {
  globalEnabled: boolean;  // Master switch for entire extension
  tabStates: {
    [tabId: number]: TabState;
  };
}

export class ExtensionStateController {
  private static instance: ExtensionStateController | null = null;
  private state: ExtensionState | null = null;
  private cleanupInterval: number | null = null;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly TAB_STATE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly storageService = new StorageService();

  private constructor() {
    // Initialize state asynchronously but don't wait
    this.initializeState().catch(_error => {
      // console.error('Failed to initialize extension state:', error);
    });
    this.startPeriodicCleanup();
  }

  /**
   * Public initialization method for external use
   * Ensures state is fully loaded before use
   */
  async init(): Promise<void> {
    await this.initializeState();
  }

  static getInstance(): ExtensionStateController {
    if (!this.instance) {
      this.instance = new ExtensionStateController();
    }
    return this.instance;
  }

  // MEMORY SAFETY: Proper cleanup method
  static destroyInstance(): void {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }

  private async initializeState(): Promise<void> {
    try {
      const result = await this.storageService.get<ExtensionState>('extensionState');
      this.state = result.extensionState || {
        globalEnabled: true, // Default to enabled for backward compatibility
        tabStates: {}
      };
    } catch (error) {
      // Fallback state on error
      this.state = {
        globalEnabled: true,
        tabStates: {}
      };
    }
  }

  async loadState(): Promise<void> {
    if (!this.state) {
      await this.initializeState();
    }
  }

  async isExtensionEnabled(tabId?: number): Promise<boolean> {
    await this.loadState();

    if (!this.state) {
      return false; // Fail safe
    }

    // Check global state first
    if (!this.state.globalEnabled) {
      return false;
    }

    // If tab-specific, check tab state
    if (tabId && this.state.tabStates[tabId]) {
      return this.state.tabStates[tabId].enabled;
    }

    // Default to global state
    return this.state.globalEnabled;
  }

  /**
   * Check only the global power state (entire extension on/off)
   */
  async isGlobalPowerEnabled(): Promise<boolean> {
    await this.loadState();

    if (!this.state) {
      return true; // Default to enabled
    }

    return this.state.globalEnabled;
  }

  /**
   * Check only the site-specific state for a tab (ignoring global state)
   */
  async isSiteSpecificEnabled(tabId: number): Promise<boolean> {
    await this.loadState();

    if (!this.state) {
      return true; // Default to enabled
    }

    // If tab-specific state exists, use it
    if (this.state.tabStates[tabId]) {
      return this.state.tabStates[tabId].enabled;
    }

    // Default to enabled (no site-specific override)
    return true;
  }

  async setGlobalState(enabled: boolean): Promise<void> {
    await this.loadState();

    if (!this.state) {
      return;
    }

    this.state.globalEnabled = enabled;

    try {
      await this.storageService.set({ extensionState: this.state });

      // Notify all tabs of state change
      await this.notifyAllTabs(enabled);
    } catch (error) {
      // console.error('Failed to set global extension state:', error);
    }
  }

  private async notifyAllTabs(enabled: boolean): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      const notifications = tabs.map(tab => {
        if (tab.id) {
          return chrome.tabs.sendMessage(tab.id, {
            action: 'EXTENSION_STATE_CHANGED',
            enabled: enabled
          }).catch(() => {
            // Tab might not have content script or be invalid, ignore
          });
        }
        return Promise.resolve();
      });

      await Promise.allSettled(notifications);
    } catch (error) {
      // Fail silently for tab notification errors
    }
  }

  async setTabState(tabId: number, enabled: boolean, url: string): Promise<void> {
    await this.loadState();

    if (!this.state) {
      return;
    }

    this.state.tabStates[tabId] = {
      enabled,
      url,
      timestamp: Date.now()
    };

    try {
      await this.storageService.set({ extensionState: this.state });

      // Notify the specific tab of site-specific state change
      await this.notifyTabStateChange(tabId, enabled);
    } catch (error) {
      // console.error('Failed to set tab state:', error);
    }
  }

  private async notifyTabStateChange(tabId: number, enabled: boolean): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'SITE_SPECIFIC_STATE_CHANGED',
        enabled: enabled
      });
    } catch (error) {
      // Tab might not have content script or be invalid, ignore
      // console.log(`Could not notify tab ${tabId} of state change:`, error);
    }
  }

  async removeTabState(tabId: number): Promise<void> {
    await this.loadState();

    if (!this.state || !this.state.tabStates[tabId]) {
      return;
    }

    delete this.state.tabStates[tabId];

    try {
      await this.storageService.set({ extensionState: this.state });
    } catch (error) {
      // console.error('Failed to remove tab state:', error);
    }
  }

  private async cleanupOldTabStates(): Promise<void> {
    await this.loadState();

    if (!this.state) {
      return;
    }

    const now = Date.now();
    let hasChanges = false;

    for (const tabIdStr in this.state.tabStates) {
      const tabId = parseInt(tabIdStr, 10);
      const tabState = this.state.tabStates[tabId];

      if (now - tabState.timestamp > this.TAB_STATE_TTL) {
        delete this.state.tabStates[tabId];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      try {
        await this.storageService.set({ extensionState: this.state });
      } catch (error) {
        // console.error('Failed to cleanup tab states:', error);
      }
    }
  }

  private startPeriodicCleanup(): void {
    // Clear any existing interval to prevent duplicates
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldTabStates().catch(() => {
        // Ignore cleanup errors
      });
    }, this.CLEANUP_INTERVAL);
  }

  // MEMORY SAFETY: Complete cleanup method
  private cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.state = null;
  }

  // Get current state for debugging
  async getState(): Promise<ExtensionState | null> {
    await this.loadState();
    return this.state ? { ...this.state } : null;
  }
}

// MEMORY SAFETY: Cleanup on extension unload
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onSuspend?.addListener(() => {
    ExtensionStateController.destroyInstance();
  });
}
