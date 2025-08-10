// Debug test script for console error logging
// Run this in the console on any webpage to test error logging

console.log('=== CONSOLE ERROR LOGGING TEST ===');

// Generate different types of console errors
setTimeout(() => {
  console.error('Test Error 1: Simple error message');
}, 1000);

setTimeout(() => {
  console.error('Test Error 2: Error with data', { 
    code: 'TEST_ERROR', 
    details: 'Additional error information' 
  });
}, 2000);

setTimeout(() => {
  console.error('Test Error 3: Multiple argument error', 'arg1', 'arg2', { prop: 'value' });
}, 3000);

setTimeout(() => {
  // This will generate a JavaScript error
  try {
    nonExistentVariable.someProperty;
  } catch (e) {
    console.error('Test Error 4: Caught exception', e);
  }
}, 4000);

// Check background script console for debug output:
// - Look for 🔥 BACKGROUND logs to see error processing
// - Look for 🔥 DASHBOARD logs when toggling switches
// - Check if errors are being accepted or rejected

console.log('✅ Test errors will be generated over the next 4 seconds');
console.log('📊 Check dashboard to see if errors appear');
console.log('🔧 Try toggling console error logging in dashboard sidebar');
console.log('🔍 Check background script console for debug output');
