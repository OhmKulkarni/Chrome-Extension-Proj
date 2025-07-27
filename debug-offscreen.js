// Debug script to test offscreen document creation
console.log('🔍 Starting offscreen document debug test...');

async function testOffscreenCreation() {
  if (!chrome.offscreen) {
    console.error('❌ Offscreen API not available');
    return;
  }

  // Check existing contexts
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    
    console.log('📋 Existing offscreen contexts:', existingContexts.length);
    
    if (existingContexts.length > 0) {
      console.log('🧹 Closing existing offscreen documents...');
      await chrome.offscreen.closeDocument();
    }
  } catch (error) {
    console.log('ℹ️ No existing contexts to close:', error.message);
  }

  // Test different URL paths
  const urlsToTest = [
    'offscreen.html',
    './offscreen.html', 
    '/offscreen.html',
    'src/offscreen/offscreen.html',
    './src/offscreen/offscreen.html',
    '/src/offscreen/offscreen.html'
  ];

  // Test different reasons
  const reasonsToTest = [
    [chrome.offscreen.Reason.DOM_SCRAPING],
    [chrome.offscreen.Reason.WORKERS],
    [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    [chrome.offscreen.Reason.CLIPBOARD]
  ];

  console.log('🔗 Testing URLs:', urlsToTest.map(url => chrome.runtime.getURL(url)));

  for (let i = 0; i < urlsToTest.length; i++) {
    const relativeUrl = urlsToTest[i];
    const fullUrl = chrome.runtime.getURL(relativeUrl);
    
    console.log(`\n🧪 Testing URL ${i + 1}/${urlsToTest.length}: ${relativeUrl}`);
    console.log(`   Full URL: ${fullUrl}`);
    
    // Check if the URL actually exists
    try {
      const response = await fetch(fullUrl);
      console.log(`   📄 File exists: ${response.ok} (status: ${response.status})`);
      if (response.ok) {
        const content = await response.text();
        console.log(`   📝 Content preview: ${content.substring(0, 100)}...`);
      }
    } catch (fetchError) {
      console.log(`   ❌ File check failed: ${fetchError.message}`);
      continue; // Skip this URL if file doesn't exist
    }

    // Test each reason for this URL
    for (let j = 0; j < reasonsToTest.length; j++) {
      const reasons = reasonsToTest[j];
      console.log(`     🎯 Testing reason ${j + 1}/${reasonsToTest.length}: ${reasons.map(r => Object.keys(chrome.offscreen.Reason).find(key => chrome.offscreen.Reason[key] === r)).join(', ')}`);
      
      try {
        await chrome.offscreen.createDocument({
          url: relativeUrl,
          reasons: reasons,
          justification: 'Testing offscreen document creation for SQLite database operations'
        });
        
        console.log(`     ✅ SUCCESS! Offscreen document created with:`);
        console.log(`        URL: ${relativeUrl}`);
        console.log(`        Reasons: ${reasons.map(r => Object.keys(chrome.offscreen.Reason).find(key => chrome.offscreen.Reason[key] === r)).join(', ')}`);
        
        // Verify it was created
        const contexts = await chrome.runtime.getContexts({
          contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        });
        console.log(`     📊 Active offscreen contexts: ${contexts.length}`);
        
        // Close it for next test
        await chrome.offscreen.closeDocument();
        console.log(`     🧹 Closed offscreen document`);
        return { url: relativeUrl, reasons };
        
      } catch (error) {
        console.log(`     ❌ Failed: ${error.message}`);
      }
    }
  }
  
  console.log('\n💥 All combinations failed!');
  return null;
}

// Run the test
testOffscreenCreation().then(result => {
  if (result) {
    console.log('\n🎉 Found working configuration:', result);
  } else {
    console.log('\n😞 No working configuration found');
  }
}).catch(error => {
  console.error('💥 Debug test failed:', error);
});
