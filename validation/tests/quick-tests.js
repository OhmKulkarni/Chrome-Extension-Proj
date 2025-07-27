// ===================================================================
// QUICK FIX VALIDATION - Individual Test Components
// Run these individually if you want to test specific fixes
// ===================================================================

// Quick Test 1: Undefined Value Handling
async function quickTestUndefinedHandling() {
  console.log('🧪 Quick Test: Undefined Value Handling');
  try {
    const result = await storageManager.insertApiCall({
      url: 'https://quick-test.com/undefined',
      method: 'POST',
      headers: undefined,
      payload_size: undefined,
      status: 200,
      response_body: undefined,
      timestamp: Date.now()
    });
    console.log('✅ SUCCESS: Undefined values handled correctly. ID:', result);
    return true;
  } catch (error) {
    console.error('❌ FAILED: Undefined handling error:', error.message);
    return false;
  }
}

// Quick Test 2: Schema Constraint Fix
async function quickTestSchemaFix() {
  console.log('🧪 Quick Test: Schema Constraint Fix');
  try {
    // This should have previously failed with "NOT NULL constraint failed"
    const result = await storageManager.insertMinifiedLibrary({
      domain: undefined,
      name: undefined,
      version: undefined,
      size: undefined,
      source_map_available: false,
      url: 'https://quick-test.com/lib.js',
      timestamp: Date.now()
    });
    console.log('✅ SUCCESS: Schema allows NULL values. ID:', result);
    return true;
  } catch (error) {
    console.error('❌ FAILED: Schema constraint error:', error.message);
    return false;
  }
}

// Quick Test 3: Performance Check
async function quickTestPerformance() {
  console.log('🧪 Quick Test: Performance Check');
  try {
    const startTime = Date.now();
    
    // Insert 10 records
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(storageManager.insertApiCall({
        url: `https://perf-test.com/${i}`,
        method: 'GET',
        timestamp: Date.now()
      }));
    }
    
    await Promise.all(promises);
    const insertTime = Date.now() - startTime;
    const insertRate = Math.round(10 / (insertTime / 1000));
    
    console.log(`✅ SUCCESS: Insert rate: ${insertRate} records/second`);
    return insertRate > 50; // Should be much higher with optimization
  } catch (error) {
    console.error('❌ FAILED: Performance test error:', error.message);
    return false;
  }
}

// Quick Test 4: Data Retrieval
async function quickTestDataRetrieval() {
  console.log('🧪 Quick Test: Data Retrieval');
  try {
    const apiCalls = await storageManager.getApiCalls(5);
    const errors = await storageManager.getConsoleErrors(5);
    const tokens = await storageManager.getTokenEvents(5);
    const libraries = await storageManager.getMinifiedLibraries(5);
    
    console.log(`✅ SUCCESS: Retrieved ${apiCalls.length + errors.length + tokens.length + libraries.length} total records`);
    return true;
  } catch (error) {
    console.error('❌ FAILED: Data retrieval error:', error.message);
    return false;
  }
}

// Run All Quick Tests
async function runAllQuickTests() {
  console.log('⚡ RUNNING ALL QUICK TESTS');
  console.log('==========================');
  
  const results = {
    undefinedHandling: await quickTestUndefinedHandling(),
    schemaFix: await quickTestSchemaFix(),
    performance: await quickTestPerformance(),
    dataRetrieval: await quickTestDataRetrieval()
  };
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log('\\n==========================');
  console.log(`📊 QUICK TEST RESULTS: ${passed}/${total} PASSED`);
  console.log(`✅ Undefined Handling: ${results.undefinedHandling ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Schema Fix: ${results.schemaFix ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Performance: ${results.performance ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Data Retrieval: ${results.dataRetrieval ? 'PASS' : 'FAIL'}`);
  
  if (passed === total) {
    console.log('\\n🎉 ALL QUICK TESTS PASSED!');
  } else {
    console.log('\\n⚠️ Some quick tests failed - check details above');
  }
  
  return results;
}

// Export functions for individual use
console.log('📋 Quick Test Functions Available:');
console.log('- quickTestUndefinedHandling()');
console.log('- quickTestSchemaFix()');
console.log('- quickTestPerformance()');
console.log('- quickTestDataRetrieval()');
console.log('- runAllQuickTests()');
console.log('');
console.log('💡 Run runAllQuickTests() for a quick validation of all fixes');
