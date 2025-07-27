// Simple test to verify offscreen document creation works
// Run this in Chrome DevTools console on the service worker

async function testOffscreenDocument() {
  console.log('🧪 Testing offscreen document creation...');
  
  try {
    // Check if offscreen API is available
    if (!chrome.offscreen) {
      console.error('❌ Offscreen API not available');
      return;
    }
    
    // Clear any existing offscreen documents
    try {
      await chrome.offscreen.closeDocument();
      console.log('🧹 Closed existing offscreen document');
    } catch (e) {
      console.log('ℹ️ No existing offscreen document to close');
    }
    
    // Test our specific path
    const urlToTest = 'src/offscreen/offscreen.html';
    const fullUrl = chrome.runtime.getURL(urlToTest);
    
    console.log('🔗 Testing URL:', fullUrl);
    
    // Check if file exists
    try {
      const response = await fetch(fullUrl);
      console.log(`📄 File response: ${response.status} ${response.statusText}`);
      if (response.ok) {
        const content = await response.text();
        console.log('📝 File content length:', content.length);
        console.log('📝 Content preview:', content.substring(0, 200) + '...');
      }
    } catch (fetchError) {
      console.error('❌ File fetch failed:', fetchError);
      return;
    }
    
    // Try to create offscreen document
    console.log('🚀 Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: urlToTest,
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'SQLite database operations using WebAssembly require DOM context'
    });
    
    console.log('✅ Offscreen document created successfully!');
    
    // Verify it exists
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    console.log('📊 Active offscreen contexts:', contexts.length);
    
    // Test sending a message to it
    console.log('📨 Testing message sending...');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'ping',
        data: 'test'
      });
      console.log('📬 Message response:', response);
    } catch (msgError) {
      console.log('⚠️ Message test failed (expected if handler not ready):', msgError.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return false;
  }
}

// Export for manual testing
self.testOffscreenDocument = testOffscreenDocument;
