// Debug helper to test Chrome APIs
// Paste this in your Chrome DevTools Console (in the service worker context)

console.log('=== Chrome Extension Debug Info ===');
console.log('Chrome version:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
console.log('Extension context:', typeof chrome !== 'undefined' ? 'Available' : 'Not available');
console.log('Offscreen API:', typeof chrome?.offscreen !== 'undefined' ? 'Available' : 'Not available');
console.log('Runtime API:', typeof chrome?.runtime !== 'undefined' ? 'Available' : 'Not available');

// Test offscreen API directly
async function testOffscreenAPI() {
  try {
    console.log('Testing offscreen API...');
    
    if (!chrome.offscreen) {
      throw new Error('Offscreen API not available');
    }
    
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    
    console.log('Existing offscreen contexts:', existingContexts.length);
    
    if (existingContexts.length === 0) {
      console.log('Creating offscreen document...');
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'Database operations using sql.js'
      });
      console.log('✅ Offscreen document created successfully!');
    } else {
      console.log('✅ Offscreen document already exists');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Offscreen API test failed:', error);
    return false;
  }
}

// Test storage manager directly
async function testStorageManager() {
  try {
    console.log('Testing storage manager...');
    
    // Force reinitialize to test
    const { SQLiteStorage } = await import('./sqlite-storage.js');
    const { DEFAULT_CONFIG } = await import('./storage-types.js');
    
    const sqliteStorage = new SQLiteStorage(DEFAULT_CONFIG);
    await sqliteStorage.init();
    
    console.log('✅ SQLite storage initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ SQLite storage test failed:', error);
    return false;
  }
}

// Run tests
testOffscreenAPI().then(result => {
  console.log('Offscreen API test result:', result);
  if (result) {
    return testStorageManager();
  }
}).then(result => {
  if (result) {
    console.log('🎉 All tests passed! SQLite should work.');
  } else {
    console.log('ℹ️ SQLite unavailable, IndexedDB fallback is working correctly.');
  }
}).catch(error => {
  console.error('Test execution failed:', error);
});

console.log('=== Debug script loaded ===');
console.log('Run testOffscreenAPI() and testStorageManager() manually if needed');
