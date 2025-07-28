// ===================================================================
// MASTER VALIDATION TEST - Complete Storage System Validation
// Tests: Environment config, storage operations, performance, reliability
// Copy and paste this into the Chrome Extension Service Worker console
// ===================================================================

async function masterValidationTest() {
  console.log('🚀 MASTER STORAGE VALIDATION TEST');
  console.log('==================================');
  console.log('Complete validation of storage system with environment configuration');
  console.log('');

  const globalScope = typeof window !== 'undefined' ? window : self;
  
  const results = {
    environment: { passed: false, details: {} },
    functionality: { passed: false, details: {} },
    performance: { passed: false, details: {} },
    reliability: { passed: false, details: {} },
    overall: { passed: false, score: 0, maxScore: 4 }
  };

  try {
    // ===================================================================
    // TEST 1: ENVIRONMENT CONFIGURATION
    // ===================================================================
    console.log('📋 TEST 1: Environment Configuration');
    console.log('------------------------------------');
    
    if (globalScope.storageManager) {
      const storageType = globalScope.storageManager.getStorageType();
      const isInitialized = globalScope.storageManager.isInitialized();
      
      console.log(`✅ Storage Type: ${storageType}`);
      console.log(`✅ Initialized: ${isInitialized}`);
      
      if (globalScope.storageManager.getConfiguration) {
        const config = globalScope.storageManager.getConfiguration();
        console.log(`✅ Environment Config:`, {
          primaryType: config.primaryType,
          fallbackEnabled: config.enableFallback,
          logsEnabled: config.enableLogs,
          maxRecords: config.maxRecordsPerTable
        });
        
        results.environment.passed = isInitialized;
        results.environment.details = {
          storageType,
          isInitialized,
          config: config
        };
      } else {
        console.log('⚠️ Using legacy storage manager (no environment config)');
        results.environment.passed = isInitialized;
        results.environment.details = { storageType, isInitialized, legacy: true };
      }
    } else {
      console.log('❌ Storage manager not available');
      results.environment.details = { error: 'No storage manager' };
    }

    // ===================================================================
    // TEST 2: FUNCTIONALITY VALIDATION
    // ===================================================================
    console.log('\\n📋 TEST 2: Functionality Validation');
    console.log('------------------------------------');
    
    if (globalScope.storageManager && globalScope.storageManager.isInitialized()) {
      try {
        // Test all CRUD operations
        const testData = {
          url: 'https://master-test.com/api/validation',
          method: 'POST',
          headers: '{"test": "master-validation"}',
          payload_size: 512,
          status: 200,
          response_body: '{"success": true, "test": "master"}',
          timestamp: Date.now()
        };
        
        // INSERT test
        const insertId = await globalScope.storageManager.insertApiCall(testData);
        console.log(`✅ Insert: Record ID ${insertId}`);
        
        // READ test
        const records = await globalScope.storageManager.getApiCalls(5);
        console.log(`✅ Read: Retrieved ${records.length} records`);
        
        // Storage info test
        const storageInfo = await globalScope.storageManager.getStorageInfo();
        const tableCounts = await globalScope.storageManager.getTableCounts();
        console.log(`✅ Storage Info:`, storageInfo);
        console.log(`✅ Table Counts:`, tableCounts);
        
        // Test undefined handling
        const undefinedTestData = {
          url: 'https://undefined-test.com/api',
          method: 'GET',
          headers: undefined,
          payload_size: undefined,
          status: 200,
          response_body: undefined,
          timestamp: Date.now()
        };
        
        const undefinedId = await globalScope.storageManager.insertApiCall(undefinedTestData);
        console.log(`✅ Undefined Handling: Record ID ${undefinedId}`);
        
        results.functionality.passed = true;
        results.functionality.details = {
          insertId,
          recordCount: records.length,
          storageInfo,
          tableCounts,
          undefinedHandling: true
        };
        
      } catch (error) {
        console.log(`❌ Functionality test failed:`, error.message);
        results.functionality.details = { error: error.message };
      }
    } else {
      console.log('❌ Storage manager not initialized for functionality test');
      results.functionality.details = { error: 'Storage not initialized' };
    }

    // ===================================================================
    // TEST 3: PERFORMANCE BENCHMARKING
    // ===================================================================
    console.log('\\n📋 TEST 3: Performance Benchmarking');
    console.log('------------------------------------');
    
    if (globalScope.storageManager && globalScope.storageManager.isInitialized()) {
      try {
        const batchSize = 50;
        const testDataBatch = [];
        
        // Prepare test data
        for (let i = 0; i < batchSize; i++) {
          testDataBatch.push({
            url: `https://perf-test.com/api/batch/${i}`,
            method: 'POST',
            headers: i % 2 === 0 ? undefined : '{"batch": "test"}',
            payload_size: i % 3 === 0 ? undefined : i * 10,
            status: 200,
            response_body: i % 4 === 0 ? undefined : `{"batch": ${i}}`,
            timestamp: Date.now()
          });
        }
        
        // INSERT performance test
        const insertStart = Date.now();
        const insertPromises = testDataBatch.map(data => 
          globalScope.storageManager.insertApiCall(data)
        );
        await Promise.all(insertPromises);
        const insertTime = Date.now() - insertStart;
        const insertRate = Math.round(batchSize / (insertTime / 1000));
        
        console.log(`✅ Insert Performance: ${insertRate} records/sec (${insertTime}ms for ${batchSize} records)`);
        
        // QUERY performance test
        const queryStart = Date.now();
        const queryResults = await globalScope.storageManager.getApiCalls(100);
        const queryTime = Date.now() - queryStart;
        const queryRate = Math.round(queryResults.length / (queryTime / 1000));
        
        console.log(`✅ Query Performance: ${queryRate} records/sec (${queryTime}ms for ${queryResults.length} records)`);
        
        // Performance thresholds
        const insertPassThreshold = 100; // records/sec
        const queryPassThreshold = 1000; // records/sec
        
        const performancePassed = insertRate > insertPassThreshold && queryRate > queryPassThreshold;
        
        if (performancePassed) {
          console.log(`🏆 Performance: EXCELLENT (Insert: ${insertRate}/sec, Query: ${queryRate}/sec)`);
        } else {
          console.log(`⚠️ Performance: Below optimal thresholds`);
        }
        
        results.performance.passed = performancePassed;
        results.performance.details = {
          insertRate,
          queryRate,
          insertTime,
          queryTime,
          batchSize,
          recordsQueried: queryResults.length,
          thresholds: { insert: insertPassThreshold, query: queryPassThreshold }
        };
        
      } catch (error) {
        console.log(`❌ Performance test failed:`, error.message);
        results.performance.details = { error: error.message };
      }
    } else {
      console.log('❌ Storage manager not initialized for performance test');
      results.performance.details = { error: 'Storage not initialized' };
    }

    // ===================================================================
    // TEST 4: RELIABILITY & ERROR HANDLING
    // ===================================================================
    console.log('\\n📋 TEST 4: Reliability & Error Handling');
    console.log('----------------------------------------');
    
    if (globalScope.storageManager && globalScope.storageManager.isInitialized()) {
      try {
        let reliabilityTests = 0;
        let reliabilityPassed = 0;
        
        // Test 1: Minimal data insertion
        try {
          reliabilityTests++;
          const minimalId = await globalScope.storageManager.insertApiCall({
            url: 'https://minimal.com',
            method: 'GET',
            timestamp: Date.now()
          });
          reliabilityPassed++;
          console.log(`✅ Minimal Data: Record ID ${minimalId}`);
        } catch (error) {
          console.log(`❌ Minimal Data test failed:`, error.message);
        }
        
        // Test 2: All undefined fields
        try {
          reliabilityTests++;
          const allUndefinedId = await globalScope.storageManager.insertApiCall({
            url: 'https://all-undefined.com/test',
            method: 'POST',
            headers: undefined,
            payload_size: undefined,
            status: 201,
            response_body: undefined,
            timestamp: Date.now()
          });
          reliabilityPassed++;
          console.log(`✅ All Undefined Fields: Record ID ${allUndefinedId}`);
        } catch (error) {
          console.log(`❌ All Undefined Fields test failed:`, error.message);
        }
        
        // Test 3: Large data handling
        try {
          reliabilityTests++;
          const largeData = 'x'.repeat(10000); // 10KB string
          const largeId = await globalScope.storageManager.insertApiCall({
            url: 'https://large-data.com/test',
            method: 'POST',
            headers: `{"large": "${largeData.substring(0, 100)}..."}`,
            payload_size: largeData.length,
            status: 200,
            response_body: largeData,
            timestamp: Date.now()
          });
          reliabilityPassed++;
          console.log(`✅ Large Data Handling: Record ID ${largeId}`);
        } catch (error) {
          console.log(`❌ Large Data test failed:`, error.message);
        }
        
        const reliabilityScore = reliabilityPassed / reliabilityTests;
        const reliabilityPercent = Math.round(reliabilityScore * 100);
        
        console.log(`🔍 Reliability Score: ${reliabilityPassed}/${reliabilityTests} (${reliabilityPercent}%)`);
        
        results.reliability.passed = reliabilityScore >= 0.8; // 80% pass rate
        results.reliability.details = {
          score: reliabilityScore,
          passed: reliabilityPassed,
          total: reliabilityTests,
          percentage: reliabilityPercent
        };
        
      } catch (error) {
        console.log(`❌ Reliability test failed:`, error.message);
        results.reliability.details = { error: error.message };
      }
    } else {
      console.log('❌ Storage manager not initialized for reliability test');
      results.reliability.details = { error: 'Storage not initialized' };
    }

    // ===================================================================
    // FINAL RESULTS SUMMARY
    // ===================================================================
    console.log('\\n🏆 MASTER VALIDATION RESULTS');
    console.log('==============================');
    
    const passedTests = Object.values(results).slice(0, 4).filter(test => test.passed).length;
    results.overall.score = passedTests;
    results.overall.passed = passedTests === 4;
    
    console.log(`📊 Overall Score: ${passedTests}/4 tests passed`);
    console.log('');
    console.log('Test Results:');
    console.log(`  ${results.environment.passed ? '✅' : '❌'} Environment Configuration`);
    console.log(`  ${results.functionality.passed ? '✅' : '❌'} Functionality Validation`);
    console.log(`  ${results.performance.passed ? '✅' : '❌'} Performance Benchmarking`);
    console.log(`  ${results.reliability.passed ? '✅' : '❌'} Reliability & Error Handling`);
    
    if (results.overall.passed) {
      console.log('');
      console.log('🎉 MASTER VALIDATION: ALL TESTS PASSED!');
      console.log('🚀 Storage system is production-ready!');
    } else {
      console.log('');
      console.log('⚠️ MASTER VALIDATION: Some tests need attention');
    }
    
    // Performance summary
    if (results.performance.passed && results.performance.details.insertRate) {
      console.log('');
      console.log('📈 PERFORMANCE SUMMARY:');
      console.log(`  Storage Type: ${results.environment.details.storageType?.toUpperCase()}`);
      console.log(`  Insert Rate: ${results.performance.details.insertRate} records/sec`);
      console.log(`  Query Rate: ${results.performance.details.queryRate} records/sec`);
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 MASTER VALIDATION FAILED:', error);
    return {
      ...results,
      overall: { passed: false, score: 0, maxScore: 4 },
      criticalError: error.message
    };
  }
}

// Auto-run the test
console.log('🔥 STARTING MASTER VALIDATION TEST');
console.log('This comprehensive test validates:');
console.log('- Environment configuration');
console.log('- All storage operations');
console.log('- Performance benchmarks');
console.log('- Reliability & error handling');
console.log('');

masterValidationTest().then(results => {
  console.log('\\n📋 MASTER VALIDATION COMPLETE');
  console.log('Use masterValidationTest() to run again');
  
  // Make function globally available
  const globalScope = typeof window !== 'undefined' ? window : self;
  globalScope.masterValidationTest = masterValidationTest;
});
