// Simplified content script focused on Reddit network interception
console.log('✅ CONTENT: Script loaded on:', window.location.href);

// MEMORY LEAK FIX: Centralized Chrome message handler to prevent response accumulation
const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    // Immediately copy and nullify response to prevent accumulation
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    console.error('Chrome message failed:', error)
    return null
  }
}

// Check if we're on Reddit
const isReddit = window.location.hostname.includes('reddit.com');
console.log('📍 CONTENT: Is Reddit?', isReddit);

// Check if extension should be active on this site
async function shouldInterceptOnThisSite(): Promise<boolean> {
  try {
    // Get current settings from storage
    const result = await chrome.storage.sync.get(['networkInterception', 'extensionEnabled']);
    const networkSettings = result.networkInterception;
    
    console.log('🔍 CONTENT: Retrieved settings:', JSON.stringify(result, null, 2));
    
    // Check if extension is globally disabled
    if (result.extensionEnabled === false) {
      console.log('🚫 CONTENT: Extension globally disabled');
      return false;
    }
    
    // If network interception is completely disabled, don't inject
    if (!networkSettings?.enabled) {
      console.log('🚫 CONTENT: Network interception disabled in settings');
      console.log('🔍 CONTENT: networkSettings:', networkSettings);
      
      // If no settings exist at all, initialize with defaults and allow
      if (!networkSettings) {
        console.log('🔧 CONTENT: No network settings found, initializing defaults...');
        const defaultNetworkSettings = {
          enabled: true,
          bodyCapture: {
            mode: 'partial',
            captureRequests: true,
            captureResponses: true,
            maxBodySize: 2000
          },
          privacy: {
            autoRedact: true,
            filterNoise: true
          },
          urlPatterns: {
            enabled: false,
            patterns: []
          }
        };
        
        try {
          await chrome.storage.sync.set({ 
            networkInterception: defaultNetworkSettings,
            extensionEnabled: true 
          });
          console.log('✅ CONTENT: Default settings initialized, allowing interception');
          // Continue with the function since we just enabled it
        } catch (setError) {
          console.log('❌ CONTENT: Failed to set default settings:', setError);
          return false;
        }
      } else {
        return false;
      }
    }
    
    const hostname = window.location.hostname;
    const currentUrl = window.location.href;
    
    // Check tab-specific logging state from popup controls FIRST
    // This should override URL pattern restrictions
    try {
      // MEMORY LEAK FIX: Use centralized handler instead of direct chrome.runtime.sendMessage
      const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
      if (tabResponse?.tabId) {
        const localResult = await chrome.storage.local.get([`tabLogging_${tabResponse.tabId}`]);
        const tabLoggingState = localResult[`tabLogging_${tabResponse.tabId}`];
        
        // If tab logging is explicitly disabled, don't intercept
        if (tabLoggingState && tabLoggingState.status === 'inactive') {
          console.log('🚫 CONTENT: Tab logging disabled via popup controls');
          return false;
        }
        
        // If tab logging is explicitly enabled, allow regardless of URL patterns
        if (tabLoggingState && tabLoggingState.status === 'active') {
          console.log('✅ CONTENT: Tab logging enabled via popup controls, allowing interception');
          console.log('✅ CONTENT: Tab logging state:', tabLoggingState);
          return true;
        }
        
        console.log('✅ CONTENT: Tab logging state (default enabled):', tabLoggingState);
      }
    } catch (tabError) {
      console.log('⚠️ CONTENT: Could not check tab logging state:', tabError);
      // Continue with other checks if tab state unavailable
    }
    
    // Always allow on localhost and test domains for development
    if (hostname.includes('localhost') || 
        hostname.includes('127.0.0.1') || 
        hostname.includes('httpbin.org') ||
        hostname === '') {
      console.log('✅ CONTENT: Development/test site allowed:', hostname);
      return true;
    }
    
    // Check URL patterns if enabled
    if (networkSettings?.urlPatterns?.enabled && networkSettings?.urlPatterns?.patterns) {
      for (const pattern of networkSettings.urlPatterns.patterns) {
        if (pattern.active) {
          // Convert glob pattern to regex for matching
          const regexPattern = pattern.pattern
            .replace(/\*/g, '.*')
            .replace(/\./g, '\\.');
          
          const regex = new RegExp(regexPattern);
          
          if (regex.test(currentUrl) || regex.test(hostname)) {
            console.log('✅ CONTENT: URL matches enabled pattern:', pattern.pattern);
            return true;
          }
        }
      }
    }
    
    // Fallback: if no URL patterns are configured but network interception is enabled,
    // allow on any site (this makes popup tab logging the primary control)
    if (!networkSettings?.urlPatterns?.enabled || 
        !networkSettings?.urlPatterns?.patterns?.length) {
      console.log('✅ CONTENT: No URL patterns configured, allowing based on popup controls');
      return true;
    }
    
    console.log('🚫 CONTENT: Site not enabled for interception:', hostname);
    return false;
    
  } catch (error) {
    console.log('❌ CONTENT: Error checking site settings:', error);
    // Fallback to conservative behavior - only allow known safe domains
    const hostname = window.location.hostname;
    return hostname.includes('localhost') || 
           hostname.includes('127.0.0.1') || 
           hostname.includes('httpbin.org');
  }
}

// Track extension context validity
let extensionContextValid = true;
let injectionAttempted = false;

// MEMORY LEAK FIX: Store event handlers for cleanup
const eventHandlers = {
  settingsRequest: null as EventListener | null,
  networkIntercepted: null as EventListener | null,
  consoleIntercepted: null as EventListener | null,
  beforeUnload1: null as EventListener | null,
  beforeUnload2: null as EventListener | null,
  domContentLoaded: null as EventListener | null,
  windowLoad: null as EventListener | null,
  storageChange: null as ((changes: any, namespace: string) => void) | null,
  runtimeMessage: null as ((message: any, sender: any, sendResponse: any) => boolean) | null
};

// MEMORY LEAK FIX: Cleanup function to remove all event listeners
const cleanupEventListeners = () => {
  if (eventHandlers.settingsRequest) {
    window.removeEventListener('extensionRequestSettings', eventHandlers.settingsRequest);
    eventHandlers.settingsRequest = null;
  }
  if (eventHandlers.networkIntercepted) {
    window.removeEventListener('networkRequestIntercepted', eventHandlers.networkIntercepted);
    eventHandlers.networkIntercepted = null;
  }
  if (eventHandlers.consoleIntercepted) {
    window.removeEventListener('consoleErrorIntercepted', eventHandlers.consoleIntercepted);
    eventHandlers.consoleIntercepted = null;
  }
  if (eventHandlers.beforeUnload1) {
    window.removeEventListener('beforeunload', eventHandlers.beforeUnload1);
    eventHandlers.beforeUnload1 = null;
  }
  if (eventHandlers.beforeUnload2) {
    window.removeEventListener('beforeunload', eventHandlers.beforeUnload2);
    eventHandlers.beforeUnload2 = null;
  }
  if (eventHandlers.domContentLoaded) {
    document.removeEventListener('DOMContentLoaded', eventHandlers.domContentLoaded);
    eventHandlers.domContentLoaded = null;
  }
  if (eventHandlers.windowLoad) {
    window.removeEventListener('load', eventHandlers.windowLoad);
    eventHandlers.windowLoad = null;
  }
  if (eventHandlers.storageChange) {
    chrome.storage.onChanged.removeListener(eventHandlers.storageChange);
    eventHandlers.storageChange = null;
  }
  if (eventHandlers.runtimeMessage) {
    chrome.runtime.onMessage.removeListener(eventHandlers.runtimeMessage);
    eventHandlers.runtimeMessage = null;
  }
};

// Listen for settings requests from main-world script
eventHandlers.settingsRequest = async () => {
  try {
    const result = await chrome.storage.sync.get(['networkInterception']);
    const settings = result.networkInterception || { bodyCapture: { maxBodySize: 2000 } };
    
    window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
      detail: { networkInterception: settings }
    }));
    
    console.log('🌍 CONTENT: Settings sent to main-world script:', settings);
  } catch (error) {
    console.log('❌ CONTENT: Could not get settings:', error);
    // Send default settings
    window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
      detail: { networkInterception: { bodyCapture: { maxBodySize: 2000 } } }
    }));
  }
};

// Add the event listener
window.addEventListener('extensionRequestSettings', eventHandlers.settingsRequest);

// Check if extension context is still valid
function isExtensionContextValid(): boolean {
  try {
    // More thorough check for extension context
    if (!chrome || !chrome.runtime) {
      console.log('❌ CONTENT: Chrome runtime not available');
      return false;
    }
    
    // Check if runtime.id is accessible (throws error if context invalid)
    const id = chrome.runtime.id;
    if (!id) {
      console.log('❌ CONTENT: Runtime ID not available');
      return false;
    }
    
    console.log('✅ CONTENT: Extension context valid, ID:', id);
    return true;
  } catch (error) {
    console.log('❌ CONTENT: Extension context check failed:', error);
    extensionContextValid = false;
    return false;
  }
}

// MAIN WORLD INJECTION for page-level network interception
async function injectMainWorldScript() {
  if (injectionAttempted) {
    console.log('🌍 CONTENT: Injection already attempted, checking if script is active...');
    
    // Check if main-world script is actually active by testing for our marker
    const isActive = await new Promise<boolean>((resolve) => {
      const checkId = Math.random().toString(36);
      
      const responseHandler = (event: any) => {
        if (event.detail?.checkId === checkId) {
          window.removeEventListener('mainWorldActiveResponse', responseHandler);
          resolve(event.detail.isActive === true);
        }
      };
      
      window.addEventListener('mainWorldActiveResponse', responseHandler);
      window.dispatchEvent(new CustomEvent('checkMainWorldActive', { detail: { checkId } }));
      
      // Timeout after 100ms if no response
      setTimeout(() => {
        window.removeEventListener('mainWorldActiveResponse', responseHandler);
        resolve(false);
      }, 100);
    });
    
    if (isActive) {
      console.log('✅ CONTENT: Main-world script already active, skipping injection');
      return true;
    } else {
      console.log('🔄 CONTENT: Main-world script not active, proceeding with injection...');
      injectionAttempted = false; // Reset to allow re-injection
    }
  }
  
  injectionAttempted = true;
  
  // Check if we should intercept on this site (async check)
  const shouldIntercept = await shouldInterceptOnThisSite();
  if (!shouldIntercept) {
    console.log('🚫 CONTENT: Site not enabled for interception:', window.location.hostname);
    return false;
  }
  
  try {
    if (!isExtensionContextValid()) {
      console.log('❌ CONTENT: Extension context invalid, cannot inject');
      return false;
    }
    
    console.log('🌍 CONTENT: Injecting main world network interception on allowed site...');
    
    // Use web_accessible_resources script instead of inline injection
    return await tryWebAccessibleInjection();
    
  } catch (error) {
    console.log('❌ CONTENT: Main world injection failed:', error);
    return false;
  }
}

async function tryWebAccessibleInjection(): Promise<boolean> {
  try {
    console.log('🔄 CONTENT: Starting web-accessible script injection...');
    
    // Use the pre-built main world script from web_accessible_resources
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('main-world-script.js');
    script.async = false;
    
    // Wait for script to load
    const loadPromise = new Promise<boolean>((resolve) => {
      script.onload = () => {
        console.log('✅ CONTENT: Web-accessible script loaded successfully');
        script.remove(); // Clean up script element
        resolve(true);
      };
      
      script.onerror = (error) => {
        console.log('❌ CONTENT: Web-accessible script failed to load:', error);
        script.remove(); // Clean up script element
        resolve(false);
      };
    });
    
    // Inject the script
    (document.head || document.documentElement).appendChild(script);
    
    const success = await loadPromise;
    console.log(success ? '✅ CONTENT: Direct script injection successful' : '❌ CONTENT: Direct script injection failed');
    return success;
    
  } catch (error) {
    console.log('❌ CONTENT: Direct injection failed:', error);
    return false;
  }
}

// Listen for network requests from main world
eventHandlers.networkIntercepted = async (event: any) => {
  const requestData = event.detail;
  console.log('📡 CONTENT: Captured network request:', requestData.url);
  console.log('📍 CONTENT: Current extension context valid?', extensionContextValid);
  
  // Always check context validity before processing
  const contextValid = isExtensionContextValid();
  console.log('🔍 CONTENT: Fresh context check result:', contextValid);
  
  if (!contextValid) {
    console.log('⚠️ CONTENT: Extension context invalid, network request captured but not stored');
    console.log('📊 CONTENT: Request details:', {
      url: requestData.url,
      method: requestData.method,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href
    });
    return;
  }
  
  try {
    // Add tab context information
    const enrichedData = {
      ...requestData,
      tabUrl: window.location.href,
      tabDomain: window.location.hostname
    };
    
    console.log('📤 CONTENT: Sending network request to background:', enrichedData.url);
    
    // MEMORY LEAK FIX: Use centralized handler to prevent response accumulation
    try {
      const response = await sendChromeMessage({
        type: 'NETWORK_REQUEST',
        data: enrichedData
      });
      console.log('✅ CONTENT: Network request processed by background:', response);
    } catch (error) {
      console.log('❌ CONTENT: Failed to store network request:', error);
      console.log('🔍 CONTENT: Error details:', error instanceof Error ? error.message : String(error));
      extensionContextValid = false;
    }
    
  } catch (error) {
    console.log('❌ CONTENT: Error processing network request:', error);
    console.log('🔍 CONTENT: Error details:', error instanceof Error ? error.message : String(error));
    extensionContextValid = false;
  }
};

// Add the event listener
window.addEventListener('networkRequestIntercepted', eventHandlers.networkIntercepted);

// Listen for console errors from main world
eventHandlers.consoleIntercepted = async (event: any) => {
  const errorData = event.detail;
  console.log('📡 CONTENT: Captured console error:', errorData.message);
  
  try {
    if (!isExtensionContextValid()) {
      console.log('⚠️ CONTENT: Extension context invalid, console error captured but not stored');
      return;
    }
    
    try {
      // MEMORY LEAK FIX: Use centralized handler instead of direct chrome.runtime.sendMessage
      const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
      // Add tab context information
      const enrichedData = {
        ...errorData,
        tabUrl: window.location.href,
        tabDomain: window.location.hostname,
        tabId: tabResponse?.tabId
      };
      
      // Send to background for storage
      chrome.runtime.sendMessage({
        type: 'CONSOLE_ERROR',
        data: enrichedData
      }).then(() => {
        console.log('✅ CONTENT: Stored console error');
      }).catch((error) => {
        console.log('❌ CONTENT: Failed to store console error:', error);
        extensionContextValid = false;
      });
    } catch (tabError) {
      console.log('❌ CONTENT: Could not get tab ID:', tabError);
      // Send without tab ID as fallback
      const enrichedData = {
        ...errorData,
        tabUrl: window.location.href,
        tabDomain: window.location.hostname
      };
      
      chrome.runtime.sendMessage({
        type: 'CONSOLE_ERROR',
        data: enrichedData
      });
    }
    
  } catch (error) {
    console.log('❌ CONTENT: Error processing console error:', error);
    extensionContextValid = false;
  }
};

// Add the event listener
window.addEventListener('consoleErrorIntercepted', eventHandlers.consoleIntercepted);

// MEMORY LEAK FIX: Runtime message listener with cleanup
eventHandlers.runtimeMessage = (message, _sender, sendResponse) => {
  if (message.action === 'toggleLogging') {
    console.log('📱 CONTENT: Toggle network logging:', message.enabled);
    
    // Try injection if enabled (the injection function will check if it's already active)
    if (message.enabled) {
      console.log('🔄 CONTENT: Logging enabled, attempting injection...');
      injectMainWorldScript().then(success => {
        console.log('🌍 CONTENT: Dynamic injection result:', success);
      });
    } else {
      console.log('🚫 CONTENT: Network logging disabled');
    }
    
    sendResponse({ success: true });
  } else if (message.action === 'toggleErrorLogging') {
    console.log('📱 CONTENT: Toggle error logging:', message.enabled);
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
};

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener(eventHandlers.runtimeMessage);

// MEMORY LEAK FIX: Storage change listener with proper cleanup
const storageChangeHandler = (changes: any, namespace: string) => {
  if (namespace === 'local') {
    // Check for tab logging changes
    for (const key in changes) {
      if (key.startsWith('tabLogging_')) {
        const tabId = key.replace('tabLogging_', '');
        const change = changes[key];
        console.log('📡 CONTENT: Tab logging state changed for tab', tabId, ':', change.newValue);
        
        // If logging was enabled and we haven't injected yet, try to inject
        if (change.newValue?.status === 'active') {
          console.log('🔄 CONTENT: Tab logging enabled via storage change, attempting injection...');
          injectMainWorldScript().then(success => {
            console.log('🌍 CONTENT: Storage-triggered injection result:', success);
          });
        }
      }
    }
  }
};

// Listen for storage changes to react to popup logging controls
chrome.storage.onChanged.addListener(storageChangeHandler);

// Add storage handler to cleanup system
eventHandlers.storageChange = storageChangeHandler;

// Listen for extension context invalidation
eventHandlers.beforeUnload1 = () => {
  extensionContextValid = false;
};

window.addEventListener('beforeunload', eventHandlers.beforeUnload1!);

// MEMORY LEAK FIX: Store interval ID and clear it on page unload
const contextCheckInterval = setInterval(() => {
  if (extensionContextValid && !isExtensionContextValid()) {
    console.log('❌ CONTENT: Extension context became invalid');
    extensionContextValid = false;
  }
}, 5000);

// MEMORY LEAK FIX: Clear interval on page unload to prevent accumulation
eventHandlers.beforeUnload2 = () => {
  clearInterval(contextCheckInterval);
  cleanupEventListeners(); // Clean up all event listeners
};

if (window.addEventListener && eventHandlers.beforeUnload2) {
  window.addEventListener('beforeunload', eventHandlers.beforeUnload2);
}

// Initialize injection on content script load
if (document.readyState === 'loading') {
  eventHandlers.domContentLoaded = () => {
    setTimeout(() => injectMainWorldScript(), 100);
  };
  if (document.addEventListener && eventHandlers.domContentLoaded) {
    document.addEventListener('DOMContentLoaded', eventHandlers.domContentLoaded);
  }
} else {
  setTimeout(() => injectMainWorldScript(), 100);
}

// Also inject when document is ready if not already done
eventHandlers.windowLoad = () => {
  setTimeout(() => {
    if (!injectionAttempted) {
      injectMainWorldScript();
    }
  }, 500);
};

// Register window load listener
if (window.addEventListener && eventHandlers.windowLoad) {
  window.addEventListener('load', eventHandlers.windowLoad);
}

// Export for debugging
(window as any).__contentScriptDebug = {
  isExtensionContextValid,
  injectMainWorldScript,
  extensionContextValid,
  injectionAttempted
};

console.log('✅ CONTENT: Chrome APIs available');
console.log('✅ CONTENT: Main world injection setup completed');

// Single injection attempt on script load
setTimeout(() => injectMainWorldScript(), 100);
