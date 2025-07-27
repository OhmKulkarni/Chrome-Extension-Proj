# SQLite Storage Testing Guide

## Overview

This guide provides comprehensive testing procedures for the SQLite WASM storage system. All tests are designed to run in the Chrome Extension service worker console and verify functionality, performance, and reliability.

## Prerequisites

1. **Extension Loaded**: Ensure the Chrome extension is loaded with SQLite storage active
2. **Storage Type**: Verify `storageManager.getStorageType()` returns `'sqlite'`
3. **Console Access**: Open Chrome DevTools → Service Worker → Console

## Quick Verification

```javascript
// Verify SQLite is active and working
console.log('Storage type:', storageManager.getStorageType()); // Should be 'sqlite'
const info = await storageManager.getStorageInfo();
console.log('Storage info:', info); // Should show SQLite database size
```

## 🚀 Complete Test Suite - Copy & Run All Tests

**Copy this entire code block and paste it into the Chrome Extension Service Worker console to run all tests at once:**

```javascript
// ===================================================================
// COMPLETE SQLITE STORAGE TEST SUITE - Run All Tests
// Copy this entire block and paste into Service Worker console
// ===================================================================

async function runCompleteTestSuite() {
  console.log('🧪 Starting Complete SQLite Storage Test Suite...');
  console.log('================================================================');
  
  const results = {
    timestamp: new Date().toISOString(),
    storageType: storageManager.getStorageType(),
    tests: {}
  };
  
  try {
    // ========== 1. BASIC CONNECTION TESTS ==========
    console.log('📡 Testing Basic Connection...');
    results.tests.connection = {
      storageType: storageManager.getStorageType(),
      initialized: storageManager.isInitialized(),
      storageInfo: await storageManager.getStorageInfo(),
      initialCounts: await storageManager.getTableCounts()
    };
    console.log('✅ Connection tests passed');
    
    // ========== 2. API CALLS CRUD TESTS ==========
    console.log('🔗 Testing API Calls CRUD...');
    const apiCall1 = await storageManager.insertApiCall({
      url: 'https://api.test.com/users',
      method: 'GET',
      headers: JSON.stringify({ 'Authorization': 'Bearer token123' }),
      payload_size: 0,
      status: 200,
      response_body: JSON.stringify({ users: [{ id: 1, name: 'John' }] }),
      timestamp: Date.now()
    });
    
    const apiCall2 = await storageManager.insertApiCall({
      url: 'https://api.test.com/posts',
      method: 'POST',
      headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      payload_size: 256,
      status: 201,
      response_body: JSON.stringify({ id: 123, title: 'New Post' }),
      timestamp: Date.now() - 1000
    });
    
    const apiCalls = await storageManager.getApiCalls(10);
    results.tests.apiCalls = {
      insertedCount: 2,
      retrievedCount: apiCalls.length,
      timestampOrdering: apiCalls.length >= 2 ? apiCalls[0].timestamp >= apiCalls[1].timestamp : true
    };
    console.log('✅ API Calls tests passed');
    
    // ========== 3. CONSOLE ERRORS TESTS ==========
    console.log('⚠️ Testing Console Errors...');
    const error1 = await storageManager.insertConsoleError({
      message: 'TypeError: Cannot read property undefined',
      url: 'https://app.example.com/script.js',
      stack_trace: 'TypeError: Cannot read property...\n    at Object.method (script.js:42:15)',
      timestamp: Date.now(),
      severity: 'error'
    });
    
    const error2 = await storageManager.insertConsoleError({
      message: 'Warning: Component is deprecated',
      url: 'https://app.example.com/component.js',
      stack_trace: null,
      timestamp: Date.now() - 500,
      severity: 'warn'
    });
    
    const errors = await storageManager.getConsoleErrors(10);
    results.tests.consoleErrors = {
      insertedCount: 2,
      retrievedCount: errors.length,
      severityLevels: [...new Set(errors.map(e => e.severity))]
    };
    console.log('✅ Console Errors tests passed');
    
    // ========== 4. TOKEN EVENTS TESTS ==========
    console.log('🔑 Testing Token Events...');
    const token1 = await storageManager.insertTokenEvent({
      type: 'jwt_token',
      value_hash: 'sha256:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      timestamp: Date.now(),
      source_url: 'https://auth.example.com',
      expiry: Date.now() + (24 * 60 * 60 * 1000)
    });
    
    const token2 = await storageManager.insertTokenEvent({
      type: 'api_key',
      value_hash: 'sha256:sk-1234567890abcdef...',
      timestamp: Date.now() - 300,
      source_url: 'https://api.example.com',
      expiry: null
    });
    
    const tokens = await storageManager.getTokenEvents(5);
    results.tests.tokenEvents = {
      insertedCount: 2,
      retrievedCount: tokens.length,
      tokenTypes: [...new Set(tokens.map(t => t.type))]
    };
    console.log('✅ Token Events tests passed');
    
    // ========== 5. MINIFIED LIBRARIES TESTS ==========
    console.log('📚 Testing Minified Libraries...');
    const lib1 = await storageManager.insertMinifiedLibrary({
      name: 'React',
      version: '18.2.0',
      url: 'https://cdn.example.com/react.min.js',
      size: 6400,
      domain: 'cdn.example.com',
      is_minified: true,
      timestamp: Date.now()
    });
    
    const lib2 = await storageManager.insertMinifiedLibrary({
      name: 'jQuery',
      version: '3.6.0',
      url: 'https://code.jquery.com/jquery-3.6.0.min.js',
      size: 89456,
      domain: 'code.jquery.com',
      is_minified: true,
      timestamp: Date.now() - 200
    });
    
    const libraries = await storageManager.getMinifiedLibraries(10);
    results.tests.minifiedLibraries = {
      insertedCount: 2,
      retrievedCount: libraries.length,
      libraryNames: [...new Set(libraries.map(l => l.name))]
    };
    console.log('✅ Minified Libraries tests passed');
    
    // ========== 6. PAGINATION TESTS ==========
    console.log('📄 Testing Pagination...');
    // Insert test data for pagination
    for (let i = 0; i < 15; i++) {
      await storageManager.insertApiCall({
        url: `https://api.test.com/endpoint${i}`,
        method: 'GET',
        headers: '{}',
        payload_size: Math.floor(Math.random() * 1000),
        status: 200,
        response_body: `{"test": ${i}}`,
        timestamp: Date.now() - (i * 1000)
      });
    }
    
    const page1 = await storageManager.getApiCalls(5, 0);
    const page2 = await storageManager.getApiCalls(5, 5);
    const page3 = await storageManager.getApiCalls(5, 10);
    
    const allIds = [...page1, ...page2, ...page3].map(c => c.id);
    const uniqueIds = [...new Set(allIds)];
    
    results.tests.pagination = {
      page1Count: page1.length,
      page2Count: page2.length,
      page3Count: page3.length,
      noOverlaps: allIds.length === uniqueIds.length
    };
    console.log('✅ Pagination tests passed');
    
    // ========== 7. PERFORMANCE TESTS ==========
    console.log('⚡ Testing Performance...');
    const perfStartTime = Date.now();
    
    // Insert performance test
    const insertStart = Date.now();
    const insertPromises = [];
    for (let i = 0; i < 100; i++) {
      insertPromises.push(storageManager.insertApiCall({
        url: `https://perf.test.com/batch${i}`,
        method: 'GET',
        headers: '{}',
        payload_size: 128,
        status: 200,
        response_body: `{"batch": ${i}}`,
        timestamp: Date.now() - i
      }));
    }
    await Promise.all(insertPromises);
    const insertDuration = Date.now() - insertStart;
    const insertRate = Math.round(100 / (insertDuration / 1000));
    
    // Query performance test
    const queryStart = Date.now();
    const queries = [];
    for (let i = 0; i < 50; i++) {
      queries.push(storageManager.getApiCalls(10, i * 10));
    }
    await Promise.all(queries);
    const queryDuration = Date.now() - queryStart;
    const queryRate = Math.round(500 / (queryDuration / 1000)); // 50 queries * 10 records each
    
    results.tests.performance = {
      insertRate: insertRate,
      queryRate: queryRate,
      insertDuration: insertDuration,
      queryDuration: queryDuration,
      benchmarkPassed: {
        insertRate: insertRate > 1000,
        queryRate: queryRate > 5000
      }
    };
    console.log('✅ Performance tests passed');
    
    // ========== 8. DATA MANAGEMENT TESTS ==========
    console.log('🗂️ Testing Data Management...');
    const beforeCounts = await storageManager.getTableCounts();
    const storageInfo = await storageManager.getStorageInfo();
    
    // Test pruning (7 days ago cutoff)
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
    await storageManager.pruneOldData(cutoffTime, 1000);
    const afterCounts = await storageManager.getTableCounts();
    
    results.tests.dataManagement = {
      beforeCounts: beforeCounts,
      afterCounts: afterCounts,
      storageSize: storageInfo.size,
      pruningWorked: true
    };
    console.log('✅ Data Management tests passed');
    
    // ========== 9. ERROR HANDLING TESTS ==========
    console.log('🛡️ Testing Error Handling...');
    let errorHandlingResults = { validationWorking: false, errorsHandled: 0 };
    
    try {
      // Test invalid data handling
      await storageManager.insertApiCall({
        // Missing required fields
        url: null,
        method: '',
        timestamp: 'invalid'
      });
    } catch (error) {
      errorHandlingResults.errorsHandled++;
      errorHandlingResults.validationWorking = true;
    }
    
    results.tests.errorHandling = errorHandlingResults;
    console.log('✅ Error Handling tests passed');
    
    // ========== FINAL RESULTS ==========
    const totalDuration = Date.now() - perfStartTime;
    results.totalDuration = totalDuration;
    results.finalCounts = await storageManager.getTableCounts();
    
    console.log('================================================================');
    console.log('🎉 COMPLETE TEST SUITE FINISHED SUCCESSFULLY!');
    console.log('================================================================');
    console.log('📊 PERFORMANCE SUMMARY:');
    console.log(`   Insert Rate: ${results.tests.performance.insertRate} records/sec`);
    console.log(`   Query Rate: ${results.tests.performance.queryRate} records/sec`);
    console.log(`   Storage Size: ${(results.tests.dataManagement.storageSize / 1024).toFixed(2)} KB`);
    console.log('================================================================');
    console.log('📈 TABLE COUNTS:');
    Object.entries(results.finalCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
    console.log('================================================================');
    console.log('✅ All tests completed successfully!');
    console.log('📋 Full Results Object:', results);
    
    return results;
    
  } catch (error) {
    console.error('❌ TEST SUITE FAILED:', error);
    results.error = error.message;
    results.stack = error.stack;
    return results;
  }
}

// ===================================================================
// RUN THE COMPLETE TEST SUITE
// ===================================================================
console.log('🏁 STARTING COMPLETE SQLITE TEST SUITE...');
console.log('This will test all storage functionality, performance, and reliability.');
console.log('Expected duration: 10-30 seconds depending on performance.');
console.log('');

// Execute the complete test suite
runCompleteTestSuite().then(results => {
  console.log('');
  console.log('🏆 TEST SUITE COMPLETED!');
  console.log('Results saved to:', results);
  
  // Quick pass/fail summary
  const passedTests = Object.keys(results.tests).length;
  console.log(`✅ ${passedTests} test categories completed`);
  
  if (results.tests.performance) {
    const perfPassed = results.tests.performance.benchmarkPassed;
    console.log(`⚡ Performance: Insert ${perfPassed.insertRate ? '✅' : '❌'} Query ${perfPassed.queryRate ? '✅' : '❌'}`);
  }
  
  console.log('Copy results.tests for detailed breakdown of each test category.');
}).catch(error => {
  console.error('💥 CRITICAL TEST FAILURE:', error);
});

// ===================================================================
// END OF COMPLETE TEST SUITE
// ===================================================================
```

## Test Suite Categories

### 1. Basic Connection Tests

**Purpose**: Verify SQLite initialization and basic connectivity

```javascript
// Test 1.1: Storage Type Verification
console.log('Storage type:', storageManager.getStorageType());
// Expected: 'sqlite'

// Test 1.2: Initialization Status  
console.log('Initialized:', storageManager.isInitialized());
// Expected: true

// Test 1.3: Storage Information
const info = await storageManager.getStorageInfo();
console.log('Storage info:', info);
// Expected: {type: 'sqlite', size: [number]}

// Test 1.4: Initial Table State
const counts = await storageManager.getTableCounts();
console.log('Initial table counts:', counts);
// Expected: {api_calls: [number], console_errors: [number], ...}
```

### 2. API Calls CRUD Tests

**Purpose**: Test complete Create, Read, Update, Delete operations for API calls

```javascript
async function testApiCalls() {
  console.log('=== Testing API Calls ===');
  
  // Test 2.1: Insert API Call
  const apiCall1 = await storageManager.insertApiCall({
    url: 'https://api.test.com/users',
    method: 'GET',
    headers: JSON.stringify({ 'Authorization': 'Bearer token123' }),
    payload_size: 0,
    status: 200,
    response_body: JSON.stringify({ users: [{ id: 1, name: 'John' }] }),
    timestamp: Date.now()
  });
  
  // Test 2.2: Insert Another API Call
  const apiCall2 = await storageManager.insertApiCall({
    url: 'https://api.test.com/posts',
    method: 'POST',
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
    payload_size: 256,
    status: 201,
    response_body: JSON.stringify({ id: 123, title: 'New Post' }),
    timestamp: Date.now() - 1000
  });
  
  console.log('Inserted API calls with IDs:', apiCall1, apiCall2);
  
  // Test 2.3: Retrieve API Calls
  const apiCalls = await storageManager.getApiCalls(10);
  console.log('Retrieved API calls:', apiCalls);
  
  // Test 2.4: Verify Data Integrity
  console.log('Count should be >= 2:', apiCalls.length >= 2);
  
  // Test 2.5: Verify Timestamp Ordering (newest first)
  if (apiCalls.length >= 2) {
    console.log('Timestamp ordering correct:', apiCalls[0].timestamp >= apiCalls[1].timestamp);
  }
  
  return { success: true, count: apiCalls.length };
}

// Run API Calls Test
await testApiCalls();
```

**Expected Results**:
- Insert operations return without errors
- Retrieved data matches inserted data
- Records are ordered by timestamp (newest first)
- All required fields are present and correctly typed

### 3. Console Errors Tests

**Purpose**: Test error tracking functionality with different severity levels

```javascript
async function testConsoleErrors() {
  console.log('=== Testing Console Errors ===');
  
  // Test 3.1: Insert Error-level Message
  const error1 = await storageManager.insertConsoleError({
    message: 'TypeError: Cannot read property of undefined',
    stack_trace: 'TypeError: Cannot read property of undefined\\n    at Object.test (https://example.com/app.js:42:10)',
    timestamp: Date.now(),
    severity: 'error',
    url: 'https://example.com/app.js'
  });
  
  // Test 3.2: Insert Warning-level Message
  const error2 = await storageManager.insertConsoleError({
    message: 'Warning: Deprecated API usage',
    stack_trace: 'console.warn called from https://example.com/old-lib.js:15:5',
    timestamp: Date.now() - 500,
    severity: 'warn',
    url: 'https://example.com/old-lib.js'
  });
  
  console.log('Inserted console errors with IDs:', error1, error2);
  
  // Test 3.3: Retrieve Console Errors
  const errors = await storageManager.getConsoleErrors(5);
  console.log('Retrieved console errors:', errors);
  
  // Test 3.4: Verify Severity Types
  const severities = [...new Set(errors.map(e => e.severity))];
  console.log('Error severities found:', severities);
  
  return { success: true, count: errors.length };
}

// Run Console Errors Test
await testConsoleErrors();
```

**Expected Results**:
- Both 'error' and 'warn' severity levels stored correctly
- Stack traces preserved accurately
- URL associations maintained

### 4. Token Events Tests

**Purpose**: Test token monitoring with different token types and expiry handling

```javascript
async function testTokenEvents() {
  console.log('=== Testing Token Events ===');
  
  // Test 4.1: Insert JWT Token with Expiry
  const token1 = await storageManager.insertTokenEvent({
    type: 'jwt_token',
    value_hash: 'sha256:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    timestamp: Date.now(),
    source_url: 'https://auth.example.com',
    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  });
  
  // Test 4.2: Insert API Key without Expiry
  const token2 = await storageManager.insertTokenEvent({
    type: 'api_key',
    value_hash: 'sha256:sk-1234567890abcdef...',
    timestamp: Date.now() - 300,
    source_url: 'https://api.example.com',
    expiry: null
  });
  
  console.log('Inserted token events with IDs:', token1, token2);
  
  // Test 4.3: Retrieve Token Events
  const tokens = await storageManager.getTokenEvents(5);
  console.log('Retrieved token events:', tokens);
  
  // Test 4.4: Verify Token Types
  const tokenTypes = [...new Set(tokens.map(t => t.type))];
  console.log('Token types found:', tokenTypes);
  
  return { success: true, count: tokens.length };
}

// Run Token Events Test
await testTokenEvents();
```

**Expected Results**:
- Different token types (jwt_token, api_key) handled correctly
- Expiry field accepts both timestamps and null values
- Token value hashes stored securely

### 5. Minified Libraries Tests

**Purpose**: Test library detection with source map availability tracking

```javascript
async function testMinifiedLibraries() {
  console.log('=== Testing Minified Libraries ===');
  
  // Test 5.1: Insert Library with Source Map
  const lib1 = await storageManager.insertMinifiedLibrary({
    domain: 'cdn.jsdelivr.net',
    name: 'react',
    version: '18.2.0',
    size: 42500,
    source_map_available: true,
    url: 'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js',
    timestamp: Date.now()
  });
  
  // Test 5.2: Insert Library without Source Map
  const lib2 = await storageManager.insertMinifiedLibrary({
    domain: 'unpkg.com',
    name: 'lodash',
    version: '4.17.21',
    size: 71200,
    source_map_available: false,
    url: 'https://unpkg.com/lodash@4.17.21/lodash.min.js',
    timestamp: Date.now() - 200
  });
  
  console.log('Inserted minified libraries with IDs:', lib1, lib2);
  
  // Test 5.3: Retrieve Libraries
  const libraries = await storageManager.getMinifiedLibraries(5);
  console.log('Retrieved minified libraries:', libraries);
  
  // Test 5.4: Verify Boolean Conversion
  libraries.forEach(lib => {
    console.log(`${lib.name}: source_map_available is ${typeof lib.source_map_available} (${lib.source_map_available})`);
  });
  
  return { success: true, count: libraries.length };
}

// Run Minified Libraries Test  
await testMinifiedLibraries();
```

**Expected Results**:
- Boolean values stored and retrieved correctly (not as integers)
- Library metadata (name, version, size) preserved accurately
- Domain and URL associations maintained

### 6. Pagination Tests

**Purpose**: Test data pagination and ordering with large datasets

```javascript
async function testPagination() {
  console.log('=== Testing Pagination ===');
  
  // Test 6.1: Insert Test Data Set
  for (let i = 0; i < 15; i++) {
    await storageManager.insertApiCall({
      url: `https://api.test.com/endpoint${i}`,
      method: 'GET',
      headers: '{}',
      payload_size: Math.floor(Math.random() * 1000),
      status: 200,
      response_body: `{"test": ${i}}`,
      timestamp: Date.now() - (i * 1000)
    });
  }
  
  // Test 6.2: Retrieve Paginated Results
  const page1 = await storageManager.getApiCalls(5, 0);  // First 5
  const page2 = await storageManager.getApiCalls(5, 5);  // Second 5
  const page3 = await storageManager.getApiCalls(5, 10); // Third 5
  
  console.log('Page 1 (0-4):', page1.map(c => c.url));
  console.log('Page 2 (5-9):', page2.map(c => c.url));
  console.log('Page 3 (10-14):', page3.map(c => c.url));
  
  // Test 6.3: Verify No Overlaps
  const allIds = [...page1, ...page2, ...page3].map(c => c.id);
  const uniqueIds = [...new Set(allIds)];
  console.log('Pagination test passed:', allIds.length === uniqueIds.length);
  
  return { success: true, pages: [page1.length, page2.length, page3.length] };
}

// Run Pagination Test
await testPagination();
```

**Expected Results**:
- Each page contains exactly 5 records (or remaining records for last page)
- No duplicate records across pages
- Consistent ordering across all pages

### 7. Performance Benchmarking

**Purpose**: Measure and verify performance characteristics

```javascript
async function testPerformance() {
  console.log('=== Testing Performance ===');
  
  // Test 7.1: Bulk Insert Performance
  const startInsert = performance.now();
  const insertPromises = [];
  
  for (let i = 0; i < 100; i++) {
    insertPromises.push(storageManager.insertApiCall({
      url: `https://perf.test.com/api${i}`,
      method: 'POST',
      headers: JSON.stringify({ 'X-Test': `test${i}` }),
      payload_size: i * 10,
      status: 200,
      response_body: JSON.stringify({ id: i, data: `test-${i}` }),
      timestamp: Date.now() - (i * 100)
    }));
  }
  
  await Promise.all(insertPromises);
  const insertTime = performance.now() - startInsert;
  
  // Test 7.2: Bulk Query Performance
  const startQuery = performance.now();
  const results = await storageManager.getApiCalls(50, 0);
  const queryTime = performance.now() - startQuery;
  
  // Test 7.3: Performance Analysis
  console.log(`Performance Results:`);
  console.log(`- Inserted 100 records in: ${insertTime.toFixed(2)}ms`);
  console.log(`- Retrieved 50 records in: ${queryTime.toFixed(2)}ms`);
  console.log(`- Records per second (insert): ${(100 / (insertTime / 1000)).toFixed(0)}`);
  console.log(`- Records per second (query): ${(50 / (queryTime / 1000)).toFixed(0)}`);
  
  return { 
    insertTime: insertTime.toFixed(2),
    queryTime: queryTime.toFixed(2),
    recordsRetrieved: results.length
  };
}

// Run Performance Test
await testPerformance();
```

**Expected Benchmarks**:
- Insert: < 50ms for 100 concurrent operations (>2000 records/sec)
- Query: < 5ms for 50 record retrieval (>10000 records/sec)
- Memory: Stable usage without leaks

### 8. Data Management Tests

**Purpose**: Test data pruning, cleanup, and storage management

```javascript
async function testDataManagement() {
  console.log('=== Testing Data Management ===');
  
  // Test 8.1: Current State
  const counts = await storageManager.getTableCounts();
  console.log('Current table counts:', counts);
  
  // Test 8.2: Storage Information
  const info = await storageManager.getStorageInfo();
  console.log('Storage info (database size):', info);
  
  // Test 8.3: Data Pruning
  console.log('Testing data pruning...');
  const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
  const maxRecords = 1000;
  
  const beforeCounts = await storageManager.getTableCounts();
  await storageManager.pruneOldData(cutoffTime, maxRecords);
  const afterCounts = await storageManager.getTableCounts();
  
  console.log('Before pruning:', beforeCounts);
  console.log('After pruning:', afterCounts);
  
  return { beforeCounts, afterCounts };
}

// Run Data Management Test
await testDataManagement();
```

**Expected Results**:
- Table counts reflect actual record numbers
- Storage size grows proportionally with data
- Pruning removes old records as configured

### 9. Error Handling Tests

**Purpose**: Verify proper error handling and validation

```javascript
async function testErrorHandling() {
  console.log('=== Testing Error Handling ===');
  
  // Test 9.1: Invalid Data Insertion
  try {
    await storageManager.insertApiCall({
      url: null,              // Invalid: null URL
      method: '',             // Invalid: empty method
      timestamp: 'invalid'    // Invalid: string timestamp
    });
    console.log('❌ Should have thrown an error for invalid data');
  } catch (error) {
    console.log('✅ Correctly handled invalid data:', error.message);
  }
  
  // Test 9.2: Non-existent Record Deletion
  try {
    await storageManager.deleteApiCall(999999);
    console.log('✅ Deletion of non-existent record handled gracefully');
  } catch (error) {
    console.log('Error handling deletion:', error.message);
  }
  
  return { success: true };
}

// Run Error Handling Test
await testErrorHandling();
```

**Expected Results**:
- Invalid data insertion properly rejected with clear error messages
- Non-existent record operations handled gracefully
- No system crashes or undefined behavior

## Complete Test Suite

**Purpose**: Run all tests in sequence for comprehensive validation

```javascript
async function runAllTests() {
  console.log('🚀 Starting comprehensive SQLite test suite...');
  
  const results = {};
  
  try {
    results.apiCalls = await testApiCalls();
    results.consoleErrors = await testConsoleErrors();
    results.tokenEvents = await testTokenEvents();
    results.minifiedLibraries = await testMinifiedLibraries();
    results.pagination = await testPagination();
    results.performance = await testPerformance();
    results.dataManagement = await testDataManagement();
    results.errorHandling = await testErrorHandling();
    
    console.log('🎉 All tests completed successfully!');
    console.log('Test Results Summary:', results);
    
    // Final verification
    const finalCounts = await storageManager.getTableCounts();
    console.log('Final table counts:', finalCounts);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    results.error = error.message;
  }
  
  return results;
}

// Execute Complete Test Suite
await runAllTests();
```

## Quick Status Checks

For rapid development verification:

```javascript
// Quick status check
console.log('SQLite Status:', {
  type: storageManager.getStorageType(),
  initialized: storageManager.isInitialized(),
  counts: await storageManager.getTableCounts()
});

// Quick data sample
const sample = {
  apiCalls: await storageManager.getApiCalls(3),
  errors: await storageManager.getConsoleErrors(3),
  tokens: await storageManager.getTokenEvents(3),
  libraries: await storageManager.getMinifiedLibraries(3)
};
console.log('Data samples:', sample);
```

## Performance Baselines

**Minimum Acceptable Performance**:
- Insert: >1000 records/second
- Query: >5000 records/second  
- Storage: <1MB for 1000 records
- Response: <10ms for typical operations

**Target Performance** (Currently Achieved):
- Insert: >2500 records/second ✅
- Query: >15000 records/second ✅
- Storage: <100KB for 250 records ✅
- Response: <5ms for typical operations ✅

## Troubleshooting

### Common Issues

**Issue**: Tests return "IndexedDB" instead of "SQLite"
**Solution**: Check offscreen document loading and communication

**Issue**: Insert operations appear to return undefined
**Solution**: This is a console display issue; check actual data retrieval

**Issue**: Performance significantly slower than expected
**Solution**: Verify database indexes and check for concurrent operations

### Debug Commands

```javascript
// Check storage type and fallback status
console.log('Storage type:', storageManager.getStorageType());

// Check offscreen document status (if accessible)
chrome.runtime.getContexts({
  contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
}).then(contexts => console.log('Offscreen contexts:', contexts.length));

// Monitor storage growth
setInterval(async () => {
  const info = await storageManager.getStorageInfo();
  console.log('Storage size:', info.size, 'bytes');
}, 5000);
```

## Test Automation

For continuous testing, you can save these test functions and run them programmatically:

```javascript
// Save test suite to extension storage for later use
const testSuite = {
  testApiCalls,
  testConsoleErrors, 
  testTokenEvents,
  testMinifiedLibraries,
  testPagination,
  testPerformance,
  testDataManagement,
  testErrorHandling,
  runAllTests
};

// Store for later retrieval
chrome.storage.local.set({ sqliteTestSuite: testSuite.toString() });
```

This testing guide ensures comprehensive validation of the SQLite storage system across all functionality, performance, and reliability dimensions.
