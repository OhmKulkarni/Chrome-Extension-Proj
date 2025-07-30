// Simplified content script focused on Reddit network interception
console.log('✅ CONTENT: Script loaded on:', window.location.href);

// Check if we're on Reddit
const isReddit = window.location.hostname.includes('reddit.com');
console.log('📍 CONTENT: Is Reddit?', isReddit);

// Track extension context validity
let extensionContextValid = true;
let injectionAttempted = false;

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
    console.log('🌍 CONTENT: Injection already attempted');
    return false;
  }
  
  injectionAttempted = true;
  
  try {
    if (!isExtensionContextValid()) {
      console.log('❌ CONTENT: Extension context invalid, cannot inject');
      return false;
    }
    
    console.log('🌍 CONTENT: Injecting main world network interception...');
    
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
window.addEventListener('networkRequestIntercepted', (event: any) => {
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
    
    // Send to background for storage
    chrome.runtime.sendMessage({
      type: 'NETWORK_REQUEST',
      data: enrichedData
    }).then((response) => {
      console.log('✅ CONTENT: Network request processed by background:', response);
    }).catch((error) => {
      console.log('❌ CONTENT: Failed to store network request:', error);
      console.log('🔍 CONTENT: Error details:', error instanceof Error ? error.message : String(error));
      extensionContextValid = false;
    });
    
  } catch (error) {
    console.log('❌ CONTENT: Error processing network request:', error);
    console.log('🔍 CONTENT: Error details:', error instanceof Error ? error.message : String(error));
    extensionContextValid = false;
  }
});

// Listen for console errors from main world
window.addEventListener('consoleErrorIntercepted', (event: any) => {
  const errorData = event.detail;
  console.log('📡 CONTENT: Captured console error:', errorData.message);
  
  try {
    if (!isExtensionContextValid()) {
      console.log('⚠️ CONTENT: Extension context invalid, console error captured but not stored');
      return;
    }
    
    // Get current tab ID
    chrome.runtime.sendMessage({ action: 'getCurrentTabId' }).then((tabResponse) => {
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
    }).catch((tabError) => {
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
    });
    
  } catch (error) {
    console.log('❌ CONTENT: Error processing console error:', error);
    extensionContextValid = false;
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'toggleLogging') {
    console.log('📱 CONTENT: Toggle network logging:', message.enabled);
    // Network logging toggle is handled by main-world-script
    // Just acknowledge the message
    sendResponse({ success: true });
  } else if (message.action === 'toggleErrorLogging') {
    console.log('📱 CONTENT: Toggle error logging:', message.enabled);
    // Error logging toggle is handled by main-world-script
    // Just acknowledge the message
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});

// Listen for extension context invalidation
window.addEventListener('beforeunload', () => {
  extensionContextValid = false;
});

// Check context periodically
setInterval(() => {
  if (extensionContextValid && !isExtensionContextValid()) {
    console.log('❌ CONTENT: Extension context became invalid');
    extensionContextValid = false;
  }
}, 5000);

// Initialize injection on content script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => injectMainWorldScript(), 100);
  });
} else {
  setTimeout(() => injectMainWorldScript(), 100);
}

// Also inject when document is ready if not already done
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!injectionAttempted) {
      injectMainWorldScript();
    }
  }, 500);
});

// Export for debugging
(window as any).__contentScriptDebug = {
  isExtensionContextValid,
  injectMainWorldScript,
  extensionContextValid,
  injectionAttempted
};

console.log('✅ CONTENT: Chrome APIs available');
console.log('✅ CONTENT: Main world injection completed');

// Set up early injection as well
injectMainWorldScript();
