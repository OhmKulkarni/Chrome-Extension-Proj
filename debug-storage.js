// Debug script to check Chrome storage settings
// Run this in the Chrome DevTools console on the extension's background page

console.log('=== CHECKING CHROME STORAGE ===');

// Check local storage settings
chrome.storage.local.get(['settings'], (result) => {
  console.log('Local storage settings:', result);
});

// Check sync storage settings
chrome.storage.sync.get(['extensionSettings'], (result) => {
  console.log('Sync storage extensionSettings:', result);
});

// Clear settings for testing (run this if needed)
/*
chrome.storage.local.remove(['settings'], () => {
  console.log('Cleared local storage settings');
});

chrome.storage.sync.remove(['extensionSettings'], () => {
  console.log('Cleared sync storage extensionSettings');
});
*/
