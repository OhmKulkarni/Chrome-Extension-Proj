/**
 * PHASE 2: Message Bus Isolation
 * 
 * This file provides isolated message channels to prevent features from breaking each other.
 * Each feature gets its own channel with typed safety and memory leak prevention.
 * 
 * SAFETY: Channels are isolated, changes to one feature don't affect others
 */

import { 
  MessageContractV1, 
  MessageFactory, 
  MessageValidator 
} from '../contracts/message.contract';

// Channel definitions - each feature has isolated communication
export const MESSAGE_CHANNELS = {
  NETWORK: 'network_channel_v1',
  CONSOLE: 'console_channel_v1', 
  TOKEN: 'token_channel_v1',
  EXTENSION_STATE: 'extension_state_channel_v1',
  DASHBOARD: 'dashboard_channel_v1',
  LEGACY: 'legacy_channel_v1' // For backwards compatibility during migration
} as const;

// Message response structure with timeout protection
interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  messageId: string;
}

// Handler function type with memory safety
type MessageHandler<T extends MessageContractV1> = (
  message: T,
  sender?: chrome.runtime.MessageSender
) => Promise<MessageResponse> | MessageResponse;

// Message listener registry to prevent memory leaks
class MessageListenerRegistry {
  private listeners = new Map<string, Set<Function>>();
  private handlerRefs = new WeakMap<Function, Function>();

  register(channel: string, handler: Function, chromeHandler: Function) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(handler);
    this.handlerRefs.set(handler, chromeHandler);
  }

  unregister(channel: string, handler: Function) {
    const chromeHandler = this.handlerRefs.get(handler);
    if (chromeHandler) {
      chrome.runtime.onMessage.removeListener(chromeHandler as any);
      this.handlerRefs.delete(handler);
    }
    
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(handler);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }

  clear(channel?: string) {
    if (channel) {
      const channelListeners = this.listeners.get(channel);
      if (channelListeners) {
        channelListeners.forEach(handler => {
          const chromeHandler = this.handlerRefs.get(handler);
          if (chromeHandler) {
            chrome.runtime.onMessage.removeListener(chromeHandler as any);
            this.handlerRefs.delete(handler);
          }
        });
        this.listeners.delete(channel);
      }
    } else {
      // Clear all listeners
      this.listeners.forEach((handlers) => {
        handlers.forEach(handler => {
          const chromeHandler = this.handlerRefs.get(handler);
          if (chromeHandler) {
            chrome.runtime.onMessage.removeListener(chromeHandler as any);
            this.handlerRefs.delete(handler);
          }
        });
      });
      this.listeners.clear();
    }
  }

  getActiveChannels(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// Global registry instance with proper cleanup
const listenerRegistry = new MessageListenerRegistry();

// Safe message bus implementation
export class MessageBus {
  private static instance: MessageBus | null = null;
  private responseTimeouts = new Map<string, any>();
  private readonly RESPONSE_TIMEOUT = 5000; // 5 second timeout

  private constructor() {
    // Cleanup timeouts on unload to prevent memory leaks
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  // Send message to specific channel with type safety
  async send<T extends MessageContractV1>(
    channel: string,
    message: T,
    tabId?: number
  ): Promise<MessageResponse> {
    try {
      // Validate message format
      if (!MessageValidator.isValidMessageV1(message)) {
        throw new Error('Invalid message format');
      }

      // Create channel-wrapped message
      const channelMessage = {
        channel,
        message,
        timestamp: new Date().toISOString()
      };

      // Send message
      let response: any;
      if (tabId) {
        response = await chrome.tabs.sendMessage(tabId, channelMessage);
      } else {
        response = await chrome.runtime.sendMessage(channelMessage);
      }

      // Clean up response reference to prevent memory retention
      const result: MessageResponse = {
        success: response?.success ?? false,
        data: response?.data ? { ...response.data } : undefined,
        error: response?.error,
        timestamp: new Date().toISOString(),
        messageId: message.id
      };

      // Nullify response to prevent memory leaks
      response = null;
      
      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        messageId: message.id
      };
    }
  }

  // Listen for messages on specific channel with type safety
  listen<T extends MessageContractV1>(
    channel: string,
    handler: MessageHandler<T>
  ): () => void {
    // Create Chrome message listener with channel filtering
    const chromeHandler = async (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      // Only handle messages for this channel
      if (message.channel !== channel) {
        return false; // Not handled
      }

      try {
        // Validate message format
        if (!MessageValidator.isValidMessageV1(message.message)) {
          sendResponse({
            success: false,
            error: 'Invalid message format',
            timestamp: new Date().toISOString(),
            messageId: message.message?.id || 'unknown'
          });
          return true;
        }

        // Set up timeout for response
        const timeoutId = setTimeout(() => {
          sendResponse({
            success: false,
            error: 'Handler timeout',
            timestamp: new Date().toISOString(),
            messageId: message.message.id
          });
        }, this.RESPONSE_TIMEOUT);

        // Handle message
        const result = await Promise.resolve(handler(message.message, sender));
        
        // Clear timeout and send response
        clearTimeout(timeoutId);
        sendResponse({
          ...result,
          timestamp: new Date().toISOString(),
          messageId: message.message.id
        });

        return true; // Handled
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Handler error',
          timestamp: new Date().toISOString(),
          messageId: message.message?.id || 'unknown'
        });
        return true;
      }
    };

    // Register listener
    chrome.runtime.onMessage.addListener(chromeHandler);
    listenerRegistry.register(channel, handler, chromeHandler);

    // Return cleanup function
    return () => {
      listenerRegistry.unregister(channel, handler);
    };
  }

  // Broadcast message to all tabs on specific channel
  async broadcast<T extends MessageContractV1>(
    channel: string,
    message: T,
    includeExtensionPages = true
  ): Promise<MessageResponse[]> {
    try {
      const tabs = await chrome.tabs.query({});
      const responses: MessageResponse[] = [];

      // Send to all valid tabs
      for (const tab of tabs) {
        if (tab.id && tab.url && 
            !tab.url.startsWith('chrome://') && 
            !tab.url.startsWith('moz-extension://')) {
          try {
            const response = await this.send(channel, message, tab.id);
            responses.push(response);
          } catch (error) {
            // Tab might not have content script, continue
            responses.push({
              success: false,
              error: 'Tab not reachable',
              timestamp: new Date().toISOString(),
              messageId: message.id
            });
          }
        }
      }

      // Send to extension pages if requested
      if (includeExtensionPages) {
        try {
          const response = await this.send(channel, message);
          responses.push(response);
        } catch (error) {
          responses.push({
            success: false,
            error: 'Extension pages not reachable',
            timestamp: new Date().toISOString(),
            messageId: message.id
          });
        }
      }

      return responses;
    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Broadcast failed',
        timestamp: new Date().toISOString(),
        messageId: message.id
      }];
    }
  }

  // Get channel statistics for debugging
  getChannelStats(): Record<string, { listeners: number; lastActivity: string }> {
    const stats: Record<string, { listeners: number; lastActivity: string }> = {};
    const activeChannels = listenerRegistry.getActiveChannels();
    
    for (const channel of activeChannels) {
      stats[channel] = {
        listeners: 1, // Simplified for now
        lastActivity: new Date().toISOString()
      };
    }
    
    return stats;
  }

  // Cleanup resources to prevent memory leaks
  cleanup(): void {
    // Clear all response timeouts
    for (const timeout of this.responseTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.responseTimeouts.clear();

    // Clear all listeners
    listenerRegistry.clear();
  }

  // Static cleanup for extension unload
  static cleanup(): void {
    if (MessageBus.instance) {
      MessageBus.instance.cleanup();
      MessageBus.instance = null;
    }
  }
}

// Feature-specific message senders with type safety
export class NetworkMessageBus {
  private static bus = MessageBus.getInstance();

  static async sendNetworkRequest(data: any, tabId?: number): Promise<MessageResponse> {
    const message = MessageFactory.createNetworkRequest(data);
    return this.bus.send(MESSAGE_CHANNELS.NETWORK, message, tabId);
  }

  static listen(handler: MessageHandler<any>): () => void {
    return this.bus.listen(MESSAGE_CHANNELS.NETWORK, handler);
  }
}

export class ConsoleMessageBus {
  private static bus = MessageBus.getInstance();

  static async sendConsoleError(data: any, tabId?: number): Promise<MessageResponse> {
    const message = MessageFactory.createConsoleError(data);
    return this.bus.send(MESSAGE_CHANNELS.CONSOLE, message, tabId);
  }

  static listen(handler: MessageHandler<any>): () => void {
    return this.bus.listen(MESSAGE_CHANNELS.CONSOLE, handler);
  }
}

export class TokenMessageBus {
  private static bus = MessageBus.getInstance();

  static async sendTokenEvent(data: any, tabId?: number): Promise<MessageResponse> {
    const message = MessageFactory.createTokenEvent(data);
    return this.bus.send(MESSAGE_CHANNELS.TOKEN, message, tabId);
  }

  static listen(handler: MessageHandler<any>): () => void {
    return this.bus.listen(MESSAGE_CHANNELS.TOKEN, handler);
  }
}

// Legacy message bus for backwards compatibility during migration
export class LegacyMessageBus {
  private static bus = MessageBus.getInstance();

  // Handle legacy message formats during transition
  static async sendLegacyMessage(action: string, data: any, tabId?: number): Promise<MessageResponse> {
    try {
      // Route to appropriate channel based on action
      switch (action) {
        case 'STORE_NETWORK_REQUEST':
        case 'NETWORK_REQUEST':
          return NetworkMessageBus.sendNetworkRequest(data, tabId);
        
        case 'CONSOLE_ERROR':
          return ConsoleMessageBus.sendConsoleError(data, tabId);
        
        case 'TOKEN_EVENT':
          return TokenMessageBus.sendTokenEvent(data, tabId);
        
        default:
          // Use legacy channel for unknown actions - create a generic message structure
          const legacyMessage = {
            version: 'v1' as const,
            type: 'DATA_UPDATED_V1' as const, // Use a valid message type
            timestamp: new Date().toISOString(),
            id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: {
              dataType: 'network_request' as const,
              id: `legacy_${action}`,
              timestamp: new Date().toISOString(),
              legacyAction: action,
              legacyData: data
            }
          };
          return this.bus.send(MESSAGE_CHANNELS.LEGACY, legacyMessage, tabId);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Legacy message failed',
        timestamp: new Date().toISOString(),
        messageId: 'unknown'
      };
    }
  }
}

// Export singleton instance for direct use
export const messageBus = MessageBus.getInstance();

// Cleanup function for extension lifecycle
export function cleanupMessageBus(): void {
  MessageBus.cleanup();
}
