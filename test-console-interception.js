// test-console-interception.js
// Updated test script for console interception functionality

console.log('=== Testing Console Interception (Fixed Version) ===');

// Check initial state
console.log('Initial interception state:', {
  enabled: window.__consoleInterceptionEnabled,
  originalConsole: !!window.__originalConsole,
  interceptedConsole: !!window.__interceptedConsole
});

// Test all console methods
console.log('🔵 This is a log message (should show as info severity)');
console.info('🔵 This is an info message');
console.warn('🟡 This is a warning message');
console.error('🔴 This is an error message');

// Test with objects
console.log('🔵 Object test:', { key: 'value', nested: { data: 123 } });

// Test with null and undefined
console.log('🔵 Null test:', null);
console.log('🔵 Undefined test:', undefined);

// Test with numbers and booleans
console.log('🔵 Number test:', 42);
console.log('🔵 Boolean test:', true);

// Test with Error objects (should capture stack traces)
try {
  throw new Error('Test error with stack trace');
} catch (e) {
  console.error('🔴 Caught error with stack:', e);
}

// Test with nested errors
function deepFunction() {
  function nestedFunction() {
    throw new Error('Nested error from deep function');
  }
  nestedFunction();
}

try {
  deepFunction();
} catch (e) {
  console.error('🔴 Deep nested error:', e);
}

// Test rapid-fire console calls (reduced to prevent overwhelming)
console.log('🔵 Starting controlled rapid-fire test...');
for (let i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log(`🔵 Rapid message ${i}:`, { timestamp: Date.now(), iteration: i });
    console.warn(`🟡 Rapid warning ${i}`);
    console.error(`🔴 Rapid error ${i}`);
  }, i * 100);
}

// Check final state after a delay
setTimeout(() => {
  console.log('=== Final State Check ===');
  console.log('🔍 Interception state:', {
    enabled: window.__consoleInterceptionEnabled,
    originalConsole: !!window.__originalConsole,
    interceptedConsole: !!window.__interceptedConsole,
    isIntercepting: window.__isInterceptingConsole
  });
  
  // Test manual toggle if available
  if (window.webAppMonitor) {
    console.log('🔧 Testing manual control...');
    
    console.log('🔴 Disabling console interception...');
    window.webAppMonitor.disableConsole();
    console.log('🔵 This should NOT be intercepted');
    
    setTimeout(() => {
      console.log('🟢 Re-enabling console interception...');
      window.webAppMonitor.enableConsole();
      console.log('🔵 This should be intercepted again');
      
      console.log('=== Console Interception Test Complete ===');
      console.log('✅ If no "Failed to store console error" messages appeared, the fix worked!');
    }, 500);
  } else {
    console.log('=== Console Interception Test Complete ===');
    console.log('✅ If no "Failed to store console error" messages appeared, the fix worked!');
    console.log('ℹ️ Manual controls not available (webAppMonitor not found)');
  }
}, 1000);
