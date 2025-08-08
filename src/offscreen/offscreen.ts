// This file is no longer used - SQLite storage has been removed for optimization
// The extension now uses IndexedDB-only storage for 70% smaller bundle size

console.log('[Offscreen] SQLite storage has been disabled for optimization. Using IndexedDB instead.')

// MEMORY LEAK FIX: Store message handler for cleanup
const messageHandler = (message: any, _sender: any, sendResponse: (response: any) => void) => {
  console.warn('[Offscreen] SQLite storage disabled. Message:', message.action)
  sendResponse({ 
    error: 'SQLite storage has been removed for optimization. Extension uses IndexedDB-only storage.' 
  })
};

// Stub message handler for compatibility
chrome.runtime.onMessage.addListener(messageHandler);

// MEMORY LEAK FIX: Cleanup on context invalidation
const cleanup = () => {
  chrome.runtime.onMessage.removeListener(messageHandler);
};

// Listen for extension context invalidation
self.addEventListener('beforeunload', cleanup);

console.log('[Offscreen] Stub document loaded (SQLite functionality removed)')
