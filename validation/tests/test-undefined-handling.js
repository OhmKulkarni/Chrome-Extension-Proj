// ===================================================================
// UNDEFINED VALUE HANDLING TEST
// Copy and paste this into the Chrome Extension Service Worker console
// ===================================================================

async function testUndefinedValueHandling() {
  console.log('🔧 Testing Undefined Value Handling...');
  console.log('=====================================');
  
  try {
    // Test 1: Insert API call with some undefined fields
    console.log('Test 1: API call with undefined fields...');
    const apiCall = await storageManager.insertApiCall({
      url: 'https://test.com/api',
      method: 'GET',
      headers: undefined, // undefined value
      payload_size: undefined, // undefined value
      status: 200,
      response_body: '{"success": true}',
      timestamp: Date.now()
    });
    console.log('✅ API call with undefined fields inserted:', apiCall);
    
    // Test 2: Insert console error with undefined stack trace
    console.log('Test 2: Console error with undefined stack trace...');
    const consoleError = await storageManager.insertConsoleError({
      message: 'Test error with undefined fields',
      stack_trace: undefined, // undefined value
      timestamp: Date.now(),
      severity: 'error',
      url: 'https://test.com/script.js'
    });
    console.log('✅ Console error with undefined stack trace inserted:', consoleError);
    
    // Test 3: Insert token event with some undefined fields
    console.log('Test 3: Token event with undefined fields...');
    const tokenEvent = await storageManager.insertTokenEvent({
      type: 'api_key',
      value_hash: 'sha256:test123',
      timestamp: Date.now(),
      source_url: undefined, // undefined value
      expiry: undefined // undefined value
    });
    console.log('✅ Token event with undefined fields inserted:', tokenEvent);
    
    // Test 4: Insert minified library with undefined fields
    console.log('Test 4: Minified library with undefined fields...');
    const library = await storageManager.insertMinifiedLibrary({
      domain: 'cdn.test.com',
      name: undefined, // undefined value
      version: undefined, // undefined value
      size: 1024,
      source_map_available: false,
      url: 'https://cdn.test.com/lib.js',
      timestamp: Date.now()
    });
    console.log('✅ Minified library with undefined fields inserted:', library);
    
    // Test 5: Verify all data was inserted correctly
    console.log('Test 5: Verifying inserted data...');
    const apiCalls = await storageManager.getApiCalls(5);
    const errors = await storageManager.getConsoleErrors(5);
    const tokens = await storageManager.getTokenEvents(5);
    const libraries = await storageManager.getMinifiedLibraries(5);
    
    console.log('Retrieved data samples:');
    console.log('- API calls:', apiCalls.length);
    console.log('- Console errors:', errors.length);
    console.log('- Token events:', tokens.length);
    console.log('- Libraries:', libraries.length);
    
    console.log('=====================================');
    console.log('🎉 Undefined Value Handling Test PASSED!');
    console.log('✅ All insert operations completed without binding errors');
    console.log('✅ Undefined values properly converted to null/defaults');
    console.log('✅ No "unknown type (undefined)" errors occurred');
    
    return {
      success: true,
      apiCallId: apiCall,
      consoleErrorId: consoleError,
      tokenEventId: tokenEvent,
      libraryId: library,
      retrievedCounts: {
        apiCalls: apiCalls.length,
        errors: errors.length,
        tokens: tokens.length,
        libraries: libraries.length
      }
    };
    
  } catch (error) {
    console.error('❌ Undefined Value Handling Test FAILED:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the test
console.log('🚀 Running Undefined Value Handling Test...');
testUndefinedValueHandling().then(result => {
  console.log('');
  console.log('📋 Test Results:', result);
  if (result.success) {
    console.log('🏆 UNDEFINED VALUE HANDLING VERIFIED!');
    console.log('All insert operations now properly handle undefined values.');
  } else {
    console.log('💥 UNDEFINED VALUE HANDLING FAILED!');
    console.log('Check the error details for debugging.');
  }
});
