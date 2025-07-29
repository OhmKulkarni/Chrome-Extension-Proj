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
          bodyCapture: {
            mode: 'partial',
            captureRequests: false,
            captureResponses: false,
          },
          privacy: {
            autoRedact: true,
            filterNoise: true,
          },
          urlPatterns: {
            enabled: false,
            patterns: []
          },
          tabSpecific: {
            enabled: true,
            defaultState: 'paused'
          },
          requestFilters: {
            enabled: false,
            filters: []
          },
          profiles: []
        },
      };
      
      chrome.storage.local.set({ settings: defaultSettings }, () => {
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
async function handleNetworkRequest(requestData: any, sendResponse: (response: any) => void, sender?: chrome.runtime.MessageSender) {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    // Get current settings to check filtering rules
    const settingsResult = await chrome.storage.local.get(['settings']);
    const settings = settingsResult.settings || {};
    const networkConfig = settings.networkInterception || {};
    
    // Debug logging for noise filtering
    console.log('🔍 BACKGROUND: Processing request:', requestData.url);
    console.log('🔍 BACKGROUND: Full network config:', JSON.stringify(networkConfig, null, 2));
    console.log('🔍 BACKGROUND: Privacy settings:', {
      enabled: networkConfig.enabled,
      filterNoise: networkConfig.privacy?.filterNoise,
      hasPrivacy: !!networkConfig.privacy,
      tabSpecificEnabled: networkConfig.tabSpecific?.enabled,
      tabSpecificDefault: networkConfig.tabSpecific?.defaultState
    });
    
    // Check if network interception is enabled
    if (!networkConfig.enabled) {
      sendResponse({ success: false, reason: 'Network interception disabled' });
      return;
    }
    
    // Check tab-specific control (ALWAYS check if enabled, regardless of default)
    if (networkConfig.tabSpecific?.enabled) {
      // Get the sender tab ID from the message
      const tabId = sender?.tab?.id;
      
      if (tabId) {
        try {
          const tabStateResult = await chrome.storage.local.get([`tabLogging_${tabId}`]);
          const tabState = tabStateResult[`tabLogging_${tabId}`];
          
          // Start with the default state from settings
          let tabLoggingEnabled = networkConfig.tabSpecific?.defaultState === 'active';
          
          if (tabState !== undefined) {
            // Override with actual tab state if it exists
            if (typeof tabState === 'boolean') {
              tabLoggingEnabled = tabState;
            } else if (tabState && typeof tabState === 'object' && 'active' in tabState) {
              tabLoggingEnabled = tabState.active;
            }
          }
          
          console.log(`🔍 BACKGROUND: Tab ${tabId} logging state:`, tabLoggingEnabled, 'tabState:', tabState);
          
          if (!tabLoggingEnabled) {
            console.log(`🚫 BACKGROUND: Tab ${tabId} logging disabled, blocking request:`, requestData.url);
            sendResponse({ success: false, reason: 'Tab logging disabled' });
            return;
          }
        } catch (tabError) {
          console.warn('Could not determine tab logging state, using default:', tabError);
          // Use default state from settings
          if (networkConfig.tabSpecific?.defaultState === 'paused') {
            console.log('🚫 BACKGROUND: Tab state unknown, defaulting to paused, blocking request:', requestData.url);
            sendResponse({ success: false, reason: 'Tab logging disabled (default)' });
            return;
          }
        }
      } else {
        console.warn('No tab ID available for tab-specific filtering');
        // If we can't get tab ID, use default state
        if (networkConfig.tabSpecific?.defaultState === 'paused') {
          console.log('🚫 BACKGROUND: No tab ID, defaulting to paused, blocking request:', requestData.url);
          sendResponse({ success: false, reason: 'Tab logging disabled (no tab ID)' });
          return;
        }
      }
    }
    
    // Filter out common noise/telemetry requests (if enabled)
    console.log('🔍 BACKGROUND: Checking noise filter. filterNoise enabled:', networkConfig.privacy?.filterNoise, 'URL:', requestData.url);
    if (networkConfig.privacy?.filterNoise) {
      const isNoise = isNoiseRequest(requestData.url);
      console.log('🔍 BACKGROUND: isNoiseRequest result:', isNoise, 'for URL:', requestData.url);
      if (isNoise) {
        console.log('🔇 BACKGROUND: Filtered noise request:', requestData.url);
        sendResponse({ success: false, reason: 'Filtered out noise/telemetry request' });
        return;
      }
    }
    
    // Check URL pattern filtering (if enabled)
    if (networkConfig.urlPatterns?.enabled && networkConfig.urlPatterns?.patterns?.length > 0) {
      const activePatterns = networkConfig.urlPatterns.patterns.filter((p: any) => p.active);
      
      if (activePatterns.length > 0) {
        const matchesPattern = activePatterns.some((pattern: any) => {
          return matchesUrlPattern(requestData.url, pattern.pattern);
        });
        
        if (!matchesPattern) {
          sendResponse({ success: false, reason: 'URL does not match any active patterns' });
          return;
        }
      }
    }
    
    // All filters passed - store the request
    
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
    
    // ALWAYS update tab request count (regardless of tab-specific setting)
    // This ensures popup shows accurate count matching the dashboard
    if (sender?.tab?.id) {
      const tabId = sender.tab.id;
      try {
        const tabStateResult = await chrome.storage.local.get([`tabLogging_${tabId}`]);
        const currentTabState = tabStateResult[`tabLogging_${tabId}`];
        
        if (currentTabState && typeof currentTabState === 'object') {
          const updatedTabState = {
            ...currentTabState,
            requestCount: (currentTabState.requestCount || 0) + 1
          };
          await chrome.storage.local.set({ [`tabLogging_${tabId}`]: updatedTabState });
        } else {
          // Create tab state if it doesn't exist (for accurate counting)
          const newTabState = {
            active: networkConfig.tabSpecific?.defaultState === 'active',
            startTime: Date.now(),
            requestCount: 1
          };
          await chrome.storage.local.set({ [`tabLogging_${tabId}`]: newTabState });
        }
      } catch (tabUpdateError) {
        console.warn('Failed to update tab request count:', tabUpdateError);
      }
    }
    
    sendResponse({ success: true, id });
  } catch (error) {
    console.error('[Web App Monitor] Failed to store network request:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Storage failed' });
  }
}

// Helper function to match URL patterns (supports wildcards)
function matchesUrlPattern(url: string, pattern: string): boolean {
  try {
    // Convert pattern to regex
    // Replace * with .* and escape other regex special characters
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\\\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(url);
  } catch (error) {
    console.error('Invalid URL pattern:', pattern, error);
    return false;
  }
}

// Helper function to filter out noise/telemetry requests
function isNoiseRequest(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    console.log('🔍 NOISE-FILTER: Checking URL:', url, 'hostname:', hostname, 'path:', pathname);
    
    // Common telemetry and tracking domains
    const noiseDomains = [
      'edge.sdk.awswaf.com',        // AWS WAF telemetry
      'waf.amazonaws.com',          // AWS WAF (broader pattern)
      'googleapis.com/pagespeedonline', // Google PageSpeed
      'googletagmanager.com',       // Google Tag Manager
      'google-analytics.com',       // Google Analytics
      'doubleclick.net',            // Google Ads
      'facebook.com/tr',            // Facebook Pixel
      'connect.facebook.net',       // Facebook Connect
      'hotjar.com',                 // Hotjar tracking
      'fullstory.com',              // FullStory tracking
      'intercom.io',                // Intercom tracking
      'mixpanel.com',               // Mixpanel analytics
      'segment.com',                // Segment analytics
      'amplitude.com',              // Amplitude analytics
      'bugsnag.com',                // Error tracking
      'sentry.io',                  // Error tracking
      'rollbar.com',                // Error tracking
      'newrelic.com',               // Performance monitoring
      'datadog.com',                // Performance monitoring
      'telemetry.mozilla.org',      // Mozilla telemetry
      'stats.wp.com',               // WordPress stats
      'quantcast.com',              // Quantcast tracking
      'scorecardresearch.com'       // ComScore tracking
    ];
    
    // Common telemetry paths
    const noisePaths = [
      '/telemetry',
      '/analytics',
      '/tracking',
      '/beacon',
      '/collect',
      '/pixel',
      '/impression',
      '/event',
      '/health',
      '/healthcheck',
      '/ping',
      '/stats',
      '/metrics'
    ];
    
    // Check if hostname matches any noise domains
    const domainMatch = noiseDomains.some(domain => hostname.includes(domain));
    if (domainMatch) {
      console.log('🔇 NOISE-FILTER: Domain match, filtering:', hostname);
      return true;
    }
    
    // Check if path matches any noise patterns
    const pathMatch = noisePaths.some(path => pathname.includes(path));
    if (pathMatch) {
      console.log('🔇 NOISE-FILTER: Path match, filtering:', pathname);
      return true;
    }
    
    // Filter out common tracking query parameters
    if (urlObj.search.includes('utm_') || urlObj.search.includes('fbclid') || urlObj.search.includes('gclid')) {
      return true;
    }
    
    return false;
  } catch (error) {
    // If URL parsing fails, don't filter it out
    return false;
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
      handleNetworkRequest(message.data, sendResponse, sender);
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