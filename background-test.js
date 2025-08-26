// Simple test script to check background worker status
(function() {
  console.log('🔧 Background Worker Test: Starting...');

  // Test basic Chrome API access
  if (typeof chrome === 'undefined') {
    console.error('❌ Chrome API not available');
    return;
  }

  if (!chrome.runtime) {
    console.error('❌ chrome.runtime not available');
    return;
  }

  if (!chrome.runtime.id) {
    console.error('❌ Extension context not available');
    return;
  }

  console.log('✅ Basic Chrome API access working');
  console.log('📋 Extension ID:', chrome.runtime.id);
  console.log('📋 Manifest:', chrome.runtime.getManifest());

  // Test if our background controller is accessible
  if (typeof globalThis !== 'undefined' && globalThis.backgroundController) {
    console.log('✅ Background Controller found');
    try {
      const status = globalThis.backgroundController.getStatus();
      console.log('📊 Controller Status:', status);
    } catch (error) {
      console.error('❌ Error getting controller status:', error);
    }
  } else {
    console.warn('⚠️ Background Controller not found on globalThis');
  }

  console.log('🔧 Background Worker Test: Complete');
})();
