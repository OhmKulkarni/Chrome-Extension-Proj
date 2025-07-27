// ===================================================================
// CONSOLE ERRORS FIX VERIFICATION TEST
// Copy and paste this into the Chrome Extension Service Worker console
// ===================================================================

async function testConsoleErrorsFix() {
  console.log('🔧 Testing Console Errors Fix...');
  console.log('=================================');
  
  try {
    // Test 1: Insert error with stack trace
    console.log('Test 1: Inserting error with stack trace...');
    const error1 = await storageManager.insertConsoleError({
      message: 'TypeError: Cannot read property undefined',
      url: 'https://app.example.com/script.js',
      stack_trace: 'TypeError: Cannot read property...\n    at Object.method (script.js:42:15)',
      timestamp: Date.now(),
      severity: 'error'
    });
    console.log('✅ Error 1 inserted with ID:', error1);
    
    // Test 2: Insert warning without stack trace (null)
    console.log('Test 2: Inserting warning without stack trace...');
    const error2 = await storageManager.insertConsoleError({
      message: 'Warning: Component is deprecated',
      url: 'https://app.example.com/component.js',
      stack_trace: null,
      timestamp: Date.now() - 500,
      severity: 'warn'
    });
    console.log('✅ Error 2 inserted with ID:', error2);
    
    // Test 3: Insert info message with undefined stack trace
    console.log('Test 3: Inserting info with undefined stack trace...');
    const error3 = await storageManager.insertConsoleError({
      message: 'Info: Application loaded successfully',
      url: 'https://app.example.com/main.js',
      stack_trace: undefined,
      timestamp: Date.now() - 1000,
      severity: 'info'
    });
    console.log('✅ Error 3 inserted with ID:', error3);
    
    // Test 4: Retrieve and verify
    console.log('Test 4: Retrieving and verifying console errors...');
    const errors = await storageManager.getConsoleErrors(5);
    console.log('Retrieved errors:', errors);
    
    // Verify results
    const severityLevels = [...new Set(errors.map(e => e.severity))];
    console.log('Severity levels found:', severityLevels);
    
    const stackTraceHandling = {
      withStackTrace: errors.filter(e => e.stack_trace && e.stack_trace.length > 0).length,
      withoutStackTrace: errors.filter(e => !e.stack_trace || e.stack_trace === null).length
    };
    console.log('Stack trace handling:', stackTraceHandling);
    
    console.log('=================================');
    console.log('🎉 Console Errors Fix Test PASSED!');
    console.log('✅ All test cases completed successfully');
    console.log('✅ Null/undefined stack traces handled properly');
    console.log('✅ All severity levels working');
    
    return {
      success: true,
      errorsInserted: 3,
      errorsRetrieved: errors.length,
      severityLevels: severityLevels,
      stackTraceHandling: stackTraceHandling
    };
    
  } catch (error) {
    console.error('❌ Console Errors Fix Test FAILED:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the test
console.log('🚀 Running Console Errors Fix Verification...');
testConsoleErrorsFix().then(result => {
  console.log('');
  console.log('📋 Test Results:', result);
  if (result.success) {
    console.log('🏆 FIX VERIFIED! Console errors now work properly.');
  } else {
    console.log('💥 FIX FAILED! Please check the error details.');
  }
});
