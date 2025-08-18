// Minimal service worker test - this should stay active
console.log('🚀 MINIMAL: Service worker started');

// Immediate listener registration - no imports, no complexity
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('📬 MINIMAL: Message received:', message);
  sendResponse({ success: true, message: 'Minimal service worker active' });
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 MINIMAL: Extension installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 MINIMAL: Extension startup');
});

console.log('✅ MINIMAL: All listeners registered');
