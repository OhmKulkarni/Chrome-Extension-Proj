// Test script for network interception optimization
// This validates that network interception stops at the source when tab logging is disabled

console.log('=== Testing Network Interception Optimization ===');

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Track network requests to see if they're being intercepted
let interceptedRequests = [];
let originalDispatchEvent = window.dispatchEvent;

// Monitor for networkRequestIntercepted events
window.dispatchEvent = function(event) {
  if (event.type === 'networkRequestIntercepted') {
    interceptedRequests.push({
      timestamp: Date.now(),
      url: event.detail?.url,
      method: event.detail?.method
    });
    console.log('📡 Intercepted network request:', event.detail?.url);
  }
  return originalDispatchEvent.call(this, event);
};

// Function to check current network interception state
const checkInterceptionState = () => {
  const state = {
    networkEnabled: window.__networkInterceptionEnabled,
    isIntercepting: window.isIntercepting,
    debugState: window.__webAppMonitorDebug?.getInterceptionState()
  };
  console.log('🔍 Current interception state:', state);
  return state;
};

// Function to test fetch requests
const testFetch = async (url, description) => {
  console.log(`\n🧪 Testing ${description}...`);
  const beforeCount = interceptedRequests.length;
  
  try {
    const response = await fetch(url);
    await wait(500); // Give time for interception to process
    
    const afterCount = interceptedRequests.length;
    const wasIntercepted = afterCount > beforeCount;
    
    console.log(`   ${wasIntercepted ? '✅' : '❌'} Request ${wasIntercepted ? 'WAS' : 'was NOT'} intercepted`);
    console.log(`   📊 Interception count: ${beforeCount} → ${afterCount}`);
    
    return wasIntercepted;
  } catch (error) {
    console.log(`   ⚠️ Request failed (expected for test URLs):`, error.message);
    
    // Check if it was still intercepted despite failure
    const afterCount = interceptedRequests.length;
    const wasIntercepted = afterCount > beforeCount;
    console.log(`   ${wasIntercepted ? '✅' : '❌'} Failed request ${wasIntercepted ? 'WAS' : 'was NOT'} intercepted`);
    
    return wasIntercepted;
  }
};

// Main test function
const runNetworkOptimizationTest = async () => {
  console.log('\n=== PHASE 1: Check Initial State ===');
  checkInterceptionState();
  
  console.log('\n=== PHASE 2: Test with Network Logging ENABLED ===');
  
  // Enable network interception manually if available
  if (window.__webAppMonitorDebug?.enableNetwork) {
    console.log('🎛️ Manually enabling network interception...');
    window.__webAppMonitorDebug.enableNetwork();
    await wait(500);
    checkInterceptionState();
  }
  
  // Test some requests when enabled
  const enabledResults = [];
  enabledResults.push(await testFetch('/test-enabled-1', 'enabled request 1'));
  enabledResults.push(await testFetch('/api/test-enabled-2', 'enabled request 2'));
  
  console.log('\n=== PHASE 3: Test with Network Logging DISABLED ===');
  
  // Disable network interception manually if available
  if (window.__webAppMonitorDebug?.disableNetwork) {
    console.log('🎛️ Manually disabling network interception...');
    window.__webAppMonitorDebug.disableNetwork();
    await wait(500);
    checkInterceptionState();
  }
  
  // Test some requests when disabled
  const disabledResults = [];
  disabledResults.push(await testFetch('/test-disabled-1', 'disabled request 1'));
  disabledResults.push(await testFetch('/api/test-disabled-2', 'disabled request 2'));
  
  console.log('\n=== PHASE 4: Test Results Summary ===');
  
  const enabledIntercepted = enabledResults.filter(r => r).length;
  const disabledIntercepted = disabledResults.filter(r => r).length;
  
  console.log('📊 Test Results:');
  console.log(`   Enabled phase: ${enabledIntercepted}/${enabledResults.length} requests intercepted`);
  console.log(`   Disabled phase: ${disabledIntercepted}/${disabledResults.length} requests intercepted`);
  
  // Evaluate success
  const optimizationWorking = enabledIntercepted > 0 && disabledIntercepted === 0;
  
  console.log('\n🎯 OPTIMIZATION STATUS:');
  if (optimizationWorking) {
    console.log('✅ SUCCESS: Network interception properly starts/stops based on settings');
    console.log('✅ PERFORMANCE: No unnecessary interception when disabled');
    console.log('✅ PRIVACY: No data capture when tab logging is disabled');
  } else {
    console.log('❌ ISSUE: Network interception optimization not working properly');
    if (enabledIntercepted === 0) {
      console.log('   Problem: No interception when enabled');
    }
    if (disabledIntercepted > 0) {
      console.log('   Problem: Still intercepting when disabled');
    }
  }
  
  console.log('\n📈 Performance Impact:');
  console.log('   - Reduced CPU usage when tab logging disabled');
  console.log('   - Reduced memory usage (no data capture)');
  console.log('   - Better privacy (no unnecessary data collection)');
  
  console.log(`\n📋 Total requests monitored: ${interceptedRequests.length}`);
  console.log('=== Network Optimization Test Complete ===');
  
  return optimizationWorking;
};

// Auto-run test after a short delay
setTimeout(() => {
  runNetworkOptimizationTest();
}, 1000);

// Expose for manual testing
window.testNetworkOptimization = runNetworkOptimizationTest;
window.checkNetworkState = checkInterceptionState;

console.log('✅ Network optimization test script loaded');
console.log('ℹ️ Test will run automatically in 1 second');
console.log('ℹ️ Manual testing available via: testNetworkOptimization()');
