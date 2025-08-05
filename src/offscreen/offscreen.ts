// This file is no longer used - SQLite storage has been removed for optimization
// The extension now uses IndexedDB-only storage for 70% smaller bundle size

console.log('[Offscreen] SQLite storage has been disabled for optimization. Using IndexedDB instead.')

// Stub message handler for compatibility
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.warn('[Offscreen] SQLite storage disabled. Message:', message.action)
  sendResponse({ 
    error: 'SQLite storage has been removed for optimization. Extension uses IndexedDB-only storage.' 
  })
})

console.log('[Offscreen] Stub document loaded (SQLite functionality removed)')
