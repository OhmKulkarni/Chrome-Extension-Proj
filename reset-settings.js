// Script to reset extension settings for testing
// Run this in Chrome DevTools console on the extension's background page

console.log('=== RESETTING EXTENSION SETTINGS ===');

// Clear all storage
Promise.all([
  chrome.storage.local.clear(),
  chrome.storage.sync.clear()
]).then(() => {
  console.log('✅ All storage cleared');
  
  // Force re-initialization by reloading the extension
  console.log('Please reload the extension to test new defaults');
}).catch(error => {
  console.error('❌ Error clearing storage:', error);
});
