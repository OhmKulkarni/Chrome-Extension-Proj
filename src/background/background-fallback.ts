/**
 * Fallback Background Script
 *
 * This should only run if the modular background-controller.ts fails to load.
 * The primary background logic should be in background-controller.ts with IndexedDB support.
 */

console.log('⚠️ FALLBACK: Basic background service worker loaded');

// Check if modular system is available
const checkModularSystem = () => {
  const backgroundController = (globalThis as any).backgroundController;
  if (backgroundController) {
    console.log('✅ FALLBACK: Modular background controller detected');
    return true;
  } else {
    console.log('❌ FALLBACK: No modular background controller found');
    return false;
  }
};

// Wait a bit for modular system to load, then check
setTimeout(() => {
  if (!checkModularSystem()) {
    console.log('📬 FALLBACK: Registering minimal fallback handlers...');

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log('📨 FALLBACK: Handling:', message.action || message.type);

      switch (message.action || message.type) {
        case 'ping':
          sendResponse({ success: true, message: 'Fallback mode active', fallback: true });
          break;

        case 'getConsoleErrors':
          sendResponse({ success: true, errors: [], fallback: true });
          break;

        case 'getNetworkRequests':
          sendResponse({ success: true, requests: [], fallback: true });
          break;

        case 'getTokenEvents':
          sendResponse({ success: true, events: [], fallback: true });
          break;

        default:
          sendResponse({ success: false, error: 'Fallback mode - limited functionality', fallback: true });
      }

      return true;
    });

    console.log('⚠️ FALLBACK: Minimal handlers registered');
  } else {
    console.log('✅ FALLBACK: Modular system active, no fallback needed');
  }
}, 1000);

console.log('✅ Fallback background loaded');
