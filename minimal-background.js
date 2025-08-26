/**
 * Minimal Background Script Test
 *
 * This is a minimal background script to test if the service worker
 * loads correctly without our complex modular architecture.
 */

console.log('🚀 MINIMAL BACKGROUND: Starting service worker test');
console.log('📋 MINIMAL BACKGROUND: Extension ID:', chrome.runtime.id);
console.log('📋 MINIMAL BACKGROUND: Manifest Version:', chrome.runtime.getManifest().manifest_version);

// Test message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📬 MINIMAL BACKGROUND: Received message:', message);

  switch (message.action || message.type) {
    case 'ping':
      console.log('🏓 MINIMAL BACKGROUND: Responding to ping');
      sendResponse({ success: true, message: 'Minimal background script is active' });
      break;

    case 'test':
      console.log('🧪 MINIMAL BACKGROUND: Running test');
      sendResponse({ success: true, timestamp: new Date().toISOString() });
      break;

    default:
      console.log('❓ MINIMAL BACKGROUND: Unknown action:', message.action || message.type);
      sendResponse({ success: false, error: 'Unknown action' });
      break;
  }

  return true; // Keep message channel open for async response
});

// Test basic Chrome APIs
try {
  console.log('🔍 MINIMAL BACKGROUND: Testing storage API...');
  chrome.storage.local.get(['test'], (result) => {
    console.log('✅ MINIMAL BACKGROUND: Storage API works:', result);
  });

  console.log('🔍 MINIMAL BACKGROUND: Testing tabs API...');
  chrome.tabs.query({}, (tabs) => {
    console.log('✅ MINIMAL BACKGROUND: Tabs API works, found', tabs.length, 'tabs');
  });

} catch (error) {
  console.error('❌ MINIMAL BACKGROUND: Error testing APIs:', error);
}

console.log('✅ MINIMAL BACKGROUND: Service worker initialization complete');

// Export for debugging
globalThis.minimalBackground = {
  version: '1.0.0',
  active: true,
  startTime: Date.now()
};
