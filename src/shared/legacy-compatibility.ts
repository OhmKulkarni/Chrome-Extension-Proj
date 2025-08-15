/**
 * PHASE 4: Backward Compatibility Layer
 * 
 * This file provides a migration layer to safely transition existing code
 * to the new decoupled architecture without breaking functionality.
 * 
 * SAFETY: Existing code continues to work while new architecture is adopted
 */

import { networkDataProvider } from '../features/network/network-data-provider';
import { consoleDataProvider } from '../features/console/console-data-provider';
import { tokenDataProvider } from '../features/tokens/token-data-provider';
import { LegacyMessageBus } from '../shared/messaging/message-bus';

// Legacy message handler that routes to new architecture
export class LegacyCompatibilityLayer {
  private static instance: LegacyCompatibilityLayer | null = null;

  private constructor() {
    this.setupLegacyHandlers();
  }

  static getInstance(): LegacyCompatibilityLayer {
    if (!LegacyCompatibilityLayer.instance) {
      LegacyCompatibilityLayer.instance = new LegacyCompatibilityLayer();
    }
    return LegacyCompatibilityLayer.instance;
  }

  // Set up handlers for legacy message formats
  private setupLegacyHandlers(): void {
    // Handle legacy chrome.runtime.sendMessage calls
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Only handle messages that haven't been handled by new architecture
        if (this.isLegacyMessage(message)) {
          this.handleLegacyMessage(message, sender, sendResponse);
          return true; // Keep message channel open
        }
        return false; // Not handled
      });
    }
  }

  // Check if message is in legacy format
  private isLegacyMessage(message: any): boolean {
    // New messages have 'channel' property, legacy ones don't
    if (message.channel) {
      return false;
    }

    // Check for legacy action patterns
    const legacyActions = [
      'STORE_NETWORK_REQUEST',
      'NETWORK_REQUEST', 
      'CONSOLE_ERROR',
      'TOKEN_EVENT',
      'getNetworkRequests',
      'getConsoleErrors',
      'getTokenEvents',
      'clearAllData',
      'clearNetworkRequests',
      'clearConsoleErrors',
      'clearTokenEvents'
    ];

    return legacyActions.includes(message.action || message.type);
  }

  // Handle legacy message and route to appropriate feature
  private async handleLegacyMessage(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const action = message.action || message.type;
      
      switch (action) {
        // Network requests
        case 'STORE_NETWORK_REQUEST':
        case 'NETWORK_REQUEST':
          await this.handleLegacyNetworkRequest(message, sender, sendResponse);
          break;

        case 'getNetworkRequests':
          await this.handleGetNetworkRequests(message, sendResponse);
          break;

        case 'clearNetworkRequests':
          await this.handleClearNetworkRequests(message, sendResponse);
          break;

        // Console errors
        case 'CONSOLE_ERROR':
          await this.handleLegacyConsoleError(message, sender, sendResponse);
          break;

        case 'getConsoleErrors':
          await this.handleGetConsoleErrors(message, sendResponse);
          break;

        case 'clearConsoleErrors':
          await this.handleClearConsoleErrors(message, sendResponse);
          break;

        // Token events
        case 'TOKEN_EVENT':
          await this.handleLegacyTokenEvent(message, sender, sendResponse);
          break;

        case 'getTokenEvents':
          await this.handleGetTokenEvents(message, sendResponse);
          break;

        case 'clearTokenEvents':
          await this.handleClearTokenEvents(message, sendResponse);
          break;

        // General
        case 'clearAllData':
          await this.handleClearAllData(sendResponse);
          break;

        default:
          // Route through legacy message bus
          const response = await LegacyMessageBus.sendLegacyMessage(action, message.data);
          sendResponse(response);
      }
    } catch (error) {
      console.error('Legacy message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Legacy handler error'
      });
    }
  }

  // Handle legacy network request storage
  private async handleLegacyNetworkRequest(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const data = message.data || message;
    
    // Add sender context if available
    if (sender.tab?.id) {
      data.tabId = sender.tab.id;
    }
    
    const success = await networkDataProvider.storeNetworkRequest(data);
    sendResponse({ success });
  }

  // Handle get network requests
  private async handleGetNetworkRequests(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const { limit, offset, tabId } = message;
    const data = await networkDataProvider.getNetworkRequests({
      limit,
      offset,
      tabId
    });
    
    sendResponse({ success: true, data });
  }

  // Handle clear network requests
  private async handleClearNetworkRequests(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const success = await networkDataProvider.clearNetworkRequests(message.tabId);
    sendResponse({ success });
  }

  // Handle legacy console error storage
  private async handleLegacyConsoleError(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const data = message.data || message;
    
    // Add sender context if available
    if (sender.tab?.id) {
      data.tabId = sender.tab.id;
    }
    
    const success = await consoleDataProvider.storeConsoleError(data);
    sendResponse({ success });
  }

  // Handle get console errors
  private async handleGetConsoleErrors(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const { limit, offset, tabId } = message;
    const data = await consoleDataProvider.getConsoleErrors({
      limit,
      offset,
      tabId
    });
    
    sendResponse({ success: true, data });
  }

  // Handle clear console errors
  private async handleClearConsoleErrors(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const success = await consoleDataProvider.clearConsoleErrors(message.tabId);
    sendResponse({ success });
  }

  // Handle legacy token event storage
  private async handleLegacyTokenEvent(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const data = message.data || message;
    
    // Add sender context if available
    if (sender.tab?.id) {
      data.tabId = sender.tab.id;
    }
    
    const success = await tokenDataProvider.storeTokenEvent(data);
    sendResponse({ success });
  }

  // Handle get token events
  private async handleGetTokenEvents(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const { limit, offset, tabId } = message;
    const data = await tokenDataProvider.getTokenEvents({
      limit,
      offset,
      tabId
    });
    
    sendResponse({ success: true, data });
  }

  // Handle clear token events
  private async handleClearTokenEvents(
    message: any,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const success = await tokenDataProvider.clearTokenEvents(message.tabId);
    sendResponse({ success });
  }

  // Handle clear all data
  private async handleClearAllData(
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      await Promise.all([
        networkDataProvider.clearNetworkRequests(),
        consoleDataProvider.clearConsoleErrors(),
        tokenDataProvider.clearTokenEvents()
      ]);
      
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Clear all data failed' 
      });
    }
  }

  // Cleanup
  cleanup(): void {
    // Remove legacy handlers if needed
  }

  static cleanup(): void {
    if (LegacyCompatibilityLayer.instance) {
      LegacyCompatibilityLayer.instance.cleanup();
      LegacyCompatibilityLayer.instance = null;
    }
  }
}

// Legacy function exports for existing code
export const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    // Try new message bus first
    if (message.action) {
      const response = await LegacyMessageBus.sendLegacyMessage(message.action, message.data || message);
      return response.success ? (response.data || { success: true }) : { success: false, error: response.error };
    }
    
    // Fall back to direct chrome message
    const response = await chrome.runtime.sendMessage(message);
    return response ? { ...response } : null;
  } catch (error) {
    console.error('Legacy chrome message failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Message failed' };
  }
};

// Legacy data access functions for existing components
export const legacyDataAccess = {
  // Network data access
  async getNetworkRequests(limit = 50, offset = 0, tabId?: number) {
    return networkDataProvider.getNetworkRequests({ limit, offset, tabId });
  },

  async clearNetworkRequests(tabId?: number) {
    return networkDataProvider.clearNetworkRequests(tabId);
  },

  // Console data access
  async getConsoleErrors(limit = 50, offset = 0, tabId?: number) {
    return consoleDataProvider.getConsoleErrors({ limit, offset, tabId });
  },

  async clearConsoleErrors(tabId?: number) {
    return consoleDataProvider.clearConsoleErrors(tabId);
  },

  // Token data access
  async getTokenEvents(limit = 50, offset = 0, tabId?: number) {
    return tokenDataProvider.getTokenEvents({ limit, offset, tabId });
  },

  async clearTokenEvents(tabId?: number) {
    return tokenDataProvider.clearTokenEvents(tabId);
  },

  // Combined operations
  async clearAllData() {
    await Promise.all([
      this.clearNetworkRequests(),
      this.clearConsoleErrors(), 
      this.clearTokenEvents()
    ]);
  }
};

// Initialize compatibility layer
export function initializeLegacyCompatibility(): LegacyCompatibilityLayer {
  return LegacyCompatibilityLayer.getInstance();
}

// Cleanup function
export function cleanupLegacyCompatibility(): void {
  LegacyCompatibilityLayer.cleanup();
}
