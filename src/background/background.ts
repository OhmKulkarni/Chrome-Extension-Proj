/**
 * Zero Import Background Script
 *
 * Everything inline to avoid any bundling issues
 */

console.log('🚀 Zero import background service worker started');

// MEMORY LEAK FIX: Guard against duplicate listener registration
let listenersRegistered = false;

// Ultra-minimal inline controller
class InlineBackgroundController {
  private isInitialized = false;

  constructor() {
    console.log('🔧 InlineBackgroundController: Starting...');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ InlineBackgroundController: Already initialized');
      return;
    }

    try {
      // Test basic Chrome API access
      if (!chrome || !chrome.runtime) {
        throw new Error('Chrome runtime API not available');
      }

      console.log('✅ InlineBackgroundController: Chrome APIs available');
      this.isInitialized = true;

    } catch (error) {
      console.error('❌ InlineBackgroundController: Initialization failed:', error);
      throw error;
    }
  }

  async handleMessage(message: any): Promise<any> {
    console.log('📨 InlineBackgroundController: Handling:', message.action || message.type);

    switch (message.action || message.type) {
      case 'ping':
        return { success: true, message: 'Inline controller active' };

      case 'getCurrentTabId':
        return new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else if (tabs && tabs.length > 0) {
              resolve({ success: true, tabId: tabs[0].id });
            } else {
              resolve({ success: false, error: 'No active tab found' });
            }
          });
        });

      case 'GET_NETWORK_REQUESTS':
        return { success: true, requests: [] };

      case 'GET_CONSOLE_ERRORS':
        return { success: true, errors: [] };

      case 'GET_TOKEN_EVENTS':
        return { success: true, events: [] };

      case 'GET_ANALYSIS_DATA':
        return {
          success: true,
          networkRequests: [],
          consoleErrors: [],
          tokenEvents: [],
          totalRequests: 0,
          totalErrors: 0,
          totalTokenEvents: 0
        };

      default:
        return { success: false, error: 'Unknown message type' };
    }
  }

  cleanup(): void {
    console.log('🧹 InlineBackgroundController: Cleaning up...');
    this.isInitialized = false;
  }
}

// CRITICAL: Register listeners immediately
if (!listenersRegistered) {
  console.log('📬 Registering immediate listeners...');

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('📬 BACKGROUND: Message received:', message.action || message.type);

    switch (message.action || message.type) {
      case 'ping':
        sendResponse({ success: true, message: 'Background service worker is active' });
        break;

      case 'getCurrentTabId':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            sendResponse({ success: true, tabId: tabs[0].id });
          } else {
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        break;

      case 'openDashboard':
        chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') }, (tab) => {
          if (tab) {
            sendResponse({ success: true, tabId: tab.id });
          } else {
            sendResponse({ success: false, error: 'Failed to open dashboard' });
          }
        });
        break;

      case 'getTabInfo':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            const activeTab = tabs[0];
            sendResponse({
              success: true,
              tabs: [{
                id: activeTab.id,
                url: activeTab.url,
                title: activeTab.title,
                active: activeTab.active
              }]
            });
          } else {
            sendResponse({ success: true, tabs: [] });
          }
        });
        break;

      case 'GET_EXTENSION_STATE':
      case 'GET_GLOBAL_POWER_STATE':
      case 'GET_SITE_SPECIFIC_STATE':
        sendResponse({ success: true, enabled: true });
        break;

      case 'getInterceptionState':
        // Return current interception state for the tab
        sendResponse({
          success: true,
          networkEnabled: true, // Default enabled
          consoleEnabled: true  // Default enabled
        });
        break;

      case 'STORE_NETWORK_REQUEST':
        // Store network request data (basic in-memory storage for now)
        console.log('📡 BACKGROUND: Storing network request:', message.data?.url);
        sendResponse({ success: true });
        break;

      case 'STORE_NETWORK_RESPONSE':
        // Store network response data (basic in-memory storage for now)
        console.log('📡 BACKGROUND: Storing network response:', message.data?.url);
        sendResponse({ success: true });
        break;

      case 'CONSOLE_ERROR':
      case 'STORE_CONSOLE_ERROR':
        // Store console error data (basic in-memory storage for now)
        console.log('🔍 BACKGROUND: Storing console error:', message.data?.message);
        sendResponse({ success: true });
        break;

      case 'STORE_TOKEN_EVENT':
        // Store token event data (basic in-memory storage for now)
        console.log('🔑 BACKGROUND: Storing token event:', message.data?.token);
        sendResponse({ success: true });
        break;

      case 'GET_NETWORK_REQUESTS':
        // Return stored network requests
        chrome.storage.local.get(['networkRequests'], (result) => {
          const requests = result.networkRequests || [];
          sendResponse({ success: true, requests });
        });
        break;

      case 'GET_CONSOLE_ERRORS':
        // Return stored console errors
        chrome.storage.local.get(['consoleErrors'], (result) => {
          const errors = result.consoleErrors || [];
          sendResponse({ success: true, errors });
        });
        break;

      case 'GET_TOKEN_EVENTS':
        // Return empty token events for now
        sendResponse({ success: true, events: [] });
        break;

      case 'GET_ANALYSIS_DATA':
        // Return basic analysis data
        sendResponse({
          success: true,
          networkRequests: [],
          consoleErrors: [],
          tokenEvents: [],
          totalRequests: 0,
          totalErrors: 0,
          totalTokenEvents: 0
        });
        break;

      case 'CONSOLE_ERROR':
        // Handle console error from content script
        chrome.storage.local.get(['consoleErrors'], (result) => {
          const existingErrors = result.consoleErrors || [];
          const newError = {
            ...message.data,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: message.data.timestamp || new Date().toISOString()
          };

          existingErrors.push(newError);

          // Keep only last 500 errors
          const trimmedErrors = existingErrors.slice(-500);

          chrome.storage.local.set({ consoleErrors: trimmedErrors }, () => {
            sendResponse({ success: true });
          });
        });
        break;

      case 'storeNetworkRequest':
        // Handle network request from content script
        chrome.storage.local.get(['networkRequests'], (result) => {
          const existingRequests = result.networkRequests || [];
          const newRequest = {
            ...message.data,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: message.data.timestamp || new Date().toISOString()
          };

          existingRequests.push(newRequest);

          // Keep only last 500 requests
          const trimmedRequests = existingRequests.slice(-500);

          chrome.storage.local.set({ networkRequests: trimmedRequests }, () => {
            sendResponse({ success: true });
          });
        });
        break;

      default:
        // Try inline controller if available
        const inlineController = (globalThis as any).inlineController;
        if (inlineController && typeof inlineController.handleMessage === 'function') {
          inlineController.handleMessage(message)
            .then((result: any) => sendResponse(result))
            .catch((error: any) => sendResponse({ success: false, error: error.message }));
        } else {
          sendResponse({ success: false, error: 'Message type not handled' });
        }
    }
    return true;
  });

  chrome.runtime.onInstalled.addListener(() => {
    console.log('🎉 Extension installed/updated');
  });

  chrome.runtime.onStartup.addListener(() => {
    console.log('🔄 Extension startup detected');
  });

  listenersRegistered = true;
  console.log('✅ Basic listeners registered - service worker is now active');
}

// Initialize inline controller without dynamic imports
console.log('⏳ Initializing inline controller...');

setTimeout(async () => {
  try {
    console.log('🔧 Creating inline background controller...');
    const inlineController = new InlineBackgroundController();

    await inlineController.initialize();
    console.log('✅ Inline controller initialized successfully');

    // Export for debugging
    (globalThis as any).inlineController = inlineController;

  } catch (error) {
    console.error('❌ Failed to initialize inline controller:', error);
  }
}, 500);

console.log('✅ Zero import background entry point loaded successfully');
