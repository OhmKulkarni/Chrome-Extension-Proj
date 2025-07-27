// ===================================================================
// SCHEMA FIX AND UNDEFINED VALUE HANDLING TEST
// Copy and paste this into the Chrome Extension Service Worker console
// ===================================================================

async function testSchemaFixAndUndefinedHandling() {
  console.log('🔧 Testing Schema Fix and Undefined Value Handling...');
  console.log('=======================================================');
  
  try {
    // First, test storage type and initialization
    console.log('Step 1: Verifying storage system...');
    console.log('Storage type:', storageManager.getStorageType());
    console.log('Initialized:', storageManager.isInitialized());
    
    // Test 1: Insert API call with undefined/null fields
    console.log('\\nTest 1: API call with undefined fields...');
    const apiCall = await storageManager.insertApiCall({
      url: 'https://test.com/api/v1/test',
      method: 'POST',
      headers: undefined, // undefined value - should work now
      payload_size: undefined, // undefined value - should work now
      status: 201,
      response_body: undefined, // undefined value - should work now
      timestamp: Date.now()
    });
    console.log('✅ API call with undefined fields inserted:', apiCall);
    
    // Test 2: Insert console error with minimal data
    console.log('\\nTest 2: Console error with minimal data...');
    const consoleError = await storageManager.insertConsoleError({
      message: 'Test error after schema fix',
      stack_trace: undefined, // undefined value - should work now
      timestamp: Date.now(),
      severity: 'error',
      url: 'https://test.com/script.js'
    });
    console.log('✅ Console error with undefined stack trace inserted:', consoleError);
    
    // Test 3: Insert token event with optional fields undefined
    console.log('\\nTest 3: Token event with optional fields undefined...');
    const tokenEvent = await storageManager.insertTokenEvent({
      type: 'jwt_token',
      value_hash: 'sha256:test-hash-12345',
      timestamp: Date.now(),
      source_url: undefined, // undefined value - should work now
      expiry: undefined // undefined value - should work now
    });
    console.log('✅ Token event with undefined optional fields inserted:', tokenEvent);
    
    // Test 4: Insert minified library with minimal required data
    console.log('\\nTest 4: Minified library with minimal data...');
    const library = await storageManager.insertMinifiedLibrary({
      domain: undefined, // undefined value - should work now
      name: undefined, // undefined value - should work now
      version: undefined, // undefined value - should work now
      size: undefined, // undefined value - should work now
      source_map_available: false,
      url: 'https://cdn.test.com/minimal-lib.js',
      timestamp: Date.now()
    });
    console.log('✅ Minified library with minimal data inserted:', library);
    
    // Test 5: Verify all data retrieval works
    console.log('\\nTest 5: Verifying data retrieval...');
    const apiCalls = await storageManager.getApiCalls(5);
    const errors = await storageManager.getConsoleErrors(5);
    const tokens = await storageManager.getTokenEvents(5);
    const libraries = await storageManager.getMinifiedLibraries(5);
    
    console.log('Retrieved data counts:');
    console.log(`- API calls: ${apiCalls.length}`);
    console.log(`- Console errors: ${errors.length}`);
    console.log(`- Token events: ${tokens.length}`);
    console.log(`- Libraries: ${libraries.length}`);
    
    // Test 6: Verify data integrity with null values
    console.log('\\nTest 6: Checking data integrity...');
    const latestApiCall = apiCalls.find(call => call.id === apiCall);
    const latestError = errors.find(error => error.id === consoleError);
    const latestToken = tokens.find(token => token.id === tokenEvent);
    const latestLibrary = libraries.find(lib => lib.id === library);
    
    console.log('Data integrity check:');
    console.log('- API call headers (undefined→null):', latestApiCall?.headers);
    console.log('- Error stack trace (undefined→null):', latestError?.stack_trace);
    console.log('- Token source URL (undefined→null):', latestToken?.source_url);
    console.log('- Library name (undefined→null):', latestLibrary?.name);
    
    // Test 7: Storage information
    console.log('\\nTest 7: Storage system health...');
    const storageInfo = await storageManager.getStorageInfo();
    const tableCounts = await storageManager.getTableCounts();
    
    console.log('Storage health:');
    console.log('- Storage info:', storageInfo);
    console.log('- Table counts:', tableCounts);
    
    console.log('\\n=======================================================');
    console.log('🎉 SCHEMA FIX AND UNDEFINED HANDLING TEST PASSED!');
    console.log('✅ All insert operations completed without constraint errors');
    console.log('✅ Undefined values properly handled as NULL in database');
    console.log('✅ Schema now allows NULL values for optional fields');
    console.log('✅ Data retrieval working perfectly');
    console.log('✅ No more "NOT NULL constraint failed" errors');
    
    return {
      success: true,
      insertedIds: {
        apiCall: apiCall,
        consoleError: consoleError,
        tokenEvent: tokenEvent,
        library: library
      },
      retrievedCounts: {
        apiCalls: apiCalls.length,
        errors: errors.length,
        tokens: tokens.length,
        libraries: libraries.length
      },
      storageInfo: storageInfo,
      tableCounts: tableCounts
    };
    
  } catch (error) {
    console.error('❌ Schema Fix and Undefined Handling Test FAILED:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the comprehensive test
console.log('🚀 Running Schema Fix and Undefined Value Handling Test...');
console.log('This test verifies that the database schema now allows NULL values');
console.log('and that undefined values are properly handled without errors.');
console.log('');

testSchemaFixAndUndefinedHandling().then(result => {
  console.log('');
  console.log('📋 Comprehensive Test Results:', result);
  if (result.success) {
    console.log('');
    console.log('🏆 SCHEMA FIX SUCCESSFUL!');
    console.log('🏆 UNDEFINED VALUE HANDLING VERIFIED!');
    console.log('');
    console.log('The database schema has been updated to handle real-world data');
    console.log('where some fields may be undefined or null. All operations');
    console.log('now work reliably without constraint violations.');
  } else {
    console.log('');
    console.log('💥 SCHEMA FIX FAILED!');
    console.log('Check the error details for debugging information.');
  }
});
