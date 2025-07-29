// src/background/background.ts
console.log('Background service worker started');

// --- Environment-Aware Storage System ---
import { EnvironmentStorageManager } from './environment-storage-manager';

// Initialize environment-aware storage system
const storageManager = new EnvironmentStorageManager();

const initializeStorage = async () => {
  try {
    await storageManager.init();
    
    const config = storageManager.getConfiguration();
    console.log('[Web App Monitor] ✅ Environment storage system initialized successfully');
    console.log('[Web App Monitor] Configuration:', config);
    console.log('[Web App Monitor] Active storage type:', storageManager.getStorageType());
    
    return storageManager;
  } catch (error) {
    console.error('[Web App Monitor] ❌ Storage system initialization failed:', error);
    throw error;
  }
};

// Initialize the storage system on service worker load
initializeStorage()
  .then(() => {
    console.log('[Web App Monitor] Storage system ready for use');
    
    // Also initialize Chrome storage with proper settings structure
    initializeChromeStorageSettings();
  })
  .catch((err) => {
    console.error('[Web App Monitor] Failed to initialize storage system:', err);
  });

// Initialize Chrome storage with the settings structure expected by content script
const initializeChromeStorageSettings = () => {
  chrome.storage.sync.get(['extensionSettings'], (result) => {
    if (!result.extensionSettings || !result.extensionSettings.networkInterception) {
      console.log('[Web App Monitor] Initializing Chrome storage settings...');
      
      const defaultSettings = {
        notifications: true,
        autoSync: true,
        theme: 'system',
        language: 'en',
        updateFrequency: 5,
        privacyMode: false,
        dataCollection: true,
        networkInterception: {
          enabled: true, // Enable by default for testing
          domainFilter: 'current-tab',
          customDomains: [],
          bodyCapture: {
            mode: 'partial',
            captureRequests: false,
            captureResponses: false,
          },
          privacy: {
            autoRedact: true,
          },
        },
      };
      
      chrome.storage.sync.set({ extensionSettings: defaultSettings }, () => {
        console.log('[Web App Monitor] ✅ Chrome storage settings initialized');
        console.log('[Web App Monitor] Network interception enabled by default');
      });
    } else {
      console.log('[Web App Monitor] Chrome storage settings already exist');
    }
  });
};

// Expose storage system for debugging in DevTools (service worker context)
(self as any).storageManager = storageManager;

// Legacy test helpers for backward compatibility
(self as any).insertTestApiCall = async () => {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    const testData = {
      url: 'https://api.test.com/debug',
      method: 'GET',
      headers: JSON.stringify({ 'authorization': 'Bearer test-token' }),
      payload_size: 128,
      status: 200,
      response_body: '{"status": "test successful"}',
      timestamp: Date.now()
    };
    
    const id = await storageManager.insertApiCall(testData);
    console.log('Test API call inserted with ID:', id);
    return id;
  } catch (error) {
    console.error('Failed to insert test API call:', error);
  }
};

(self as any).queryApiCalls = async () => {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    const results = await storageManager.getApiCalls(10, 0);
    console.log('API calls:', results);
    return results;
  } catch (error) {
    console.error('Failed to query API calls:', error);
  }
};

// Additional debugging helpers
(self as any).getStorageStats = async () => {
  try {
    const counts = await storageManager.getTableCounts();
    const info = await storageManager.getStorageInfo();
    console.log('Storage statistics:', { counts, info });
    return { counts, info };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
  }
};

(self as any).pruneOldData = async () => {
  try {
    await storageManager.pruneOldData();
    console.log('Data pruning completed');
  } catch (error) {
    console.error('Failed to prune data:', error);
  }
};

// --- Message Handlers for Popup Communication ---

// Network request handler
async function handleNetworkRequest(requestData: any, sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Map the request data from main-world-script to storage API format
    const storageData = {
      url: requestData.url,
      method: requestData.method || 'GET',
      headers: JSON.stringify({
        request: requestData.headers?.request || {},
        response: requestData.headers?.response || {}
      }),
      payload_size: requestData.requestBody ? requestData.requestBody.length : 0,
      status: requestData.status || 0,
      response_body: requestData.responseBody || `Status: ${requestData.status} ${requestData.statusText}`,
      timestamp: requestData.timestamp ? new Date(requestData.timestamp).getTime() : Date.now()
    };
    
    // Store the network request using the existing API call storage
    const id = await storageManager.insertApiCall(storageData);
    
    sendResponse({ success: true, id });
  } catch (error) {
    console.error('[Web App Monitor] Failed to store network request:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Storage failed' });
  }
}

// Get network requests handler
async function handleGetNetworkRequests(limit: number, sendResponse: (response: any) => void) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Get recent API calls (network requests)
    const requests = await storageManager.getApiCalls(limit);
    const counts = await storageManager.getTableCounts();
    
    sendResponse({ 
      success: true, 
      requests: requests || [], 
      total: counts?.api_calls || 0 
    });
  } catch (error) {
    console.error('[Web App Monitor] Failed to get network requests:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Query failed' });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action || message.type) {
    case 'INJECT_MAIN_WORLD_SCRIPT':
      // Handle main world script injection from content script
      if (sender.tab && sender.tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          world: 'MAIN',
          files: ['assets/main-world-network-interceptor-BFD3WDcJ.js'] // Use the built file name
        }).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          console.log('[Background] Main world injection failed:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
      } else {
        sendResponse({ success: false, error: 'No tab ID available' });
      }
      break;
      
    case 'GET_CURRENT_TAB_ID':
      // Get current tab ID for content script
      if (sender.tab && sender.tab.id) {
        sendResponse({ tabId: sender.tab.id });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          sendResponse({ tabId: tabs[0]?.id || 0 });
        });
        return true; // Keep message channel open for async response
      }
      break;
      
    case 'getTabInfo':
      // Get current active tab information
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          sendResponse({
            title: tab.title || 'Unknown',
            url: tab.url || 'Unknown'
          });
        } else {
          sendResponse({
            title: 'Unknown',
            url: 'Unknown'
          });
        }
      });
      return true; // Keep message channel open for async response

    case 'openDashboard':
      // Open dashboard in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/dashboard/dashboard.html')
      });
      sendResponse({ success: true });
      break;

    case 'storeNetworkRequest':
    case 'STORE_NETWORK_REQUEST':
    case 'NETWORK_REQUEST':
      // Store network request data from content script
      handleNetworkRequest(message.data, sendResponse);
      return true; // Keep message channel open for async response

    case 'getNetworkRequests':
      // Get stored network requests
      handleGetNetworkRequests(message.limit || 50, sendResponse);
      return true; // Keep message channel open for async response

    default:
      // Let other messages pass through
      break;
  }
});

// No additional message interception needed - storage manager handles operations internally