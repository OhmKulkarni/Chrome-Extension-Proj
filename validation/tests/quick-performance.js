// ===================================================================
// QUICK PERFORMANCE TEST - Fast Performance Validation
// Tests: Rapid performance check with clear measurable results
// Copy and paste this into the Chrome Extension Service Worker console
// ===================================================================

async function quickPerformanceTest() {
  console.log('⚡ QUICK PERFORMANCE TEST');
  console.log('========================');
  console.log('Fast performance validation with measurable results');
  console.log('');

  const globalScope = typeof window !== 'undefined' ? window : self;
  
  const results = {
    system: { storageType: null, initialized: false },
    performance: { insert: {}, query: {}, operations: {} },
    status: { passed: false, grade: 'F', recommendations: [] }
  };

  try {
    // ===================================================================
    // SYSTEM CHECK
    // ===================================================================
    console.log('🔍 System Check');
    console.log('---------------');
    
    if (!globalScope.storageManager) {
      console.log('❌ No storage manager available');
      results.status.recommendations.push('Initialize storage system');
      return results;
    }
    
    const storageType = globalScope.storageManager.getStorageType();
    const isInitialized = globalScope.storageManager.isInitialized();
    
    console.log(`✅ Storage Type: ${storageType?.toUpperCase()}`);
    console.log(`✅ Initialized: ${isInitialized}`);
    
    results.system = { storageType, initialized: isInitialized };
    
    if (!isInitialized) {
      console.log('❌ Storage not initialized');
      results.status.recommendations.push('Wait for storage initialization');
      return results;
    }

    // ===================================================================
    // QUICK INSERT TEST (25 records)
    // ===================================================================
    console.log('\\n⚡ Quick Insert Test (25 records)');
    console.log('----------------------------------');
    
    const testBatch = [];
    for (let i = 0; i < 25; i++) {
      testBatch.push({
        url: `https://quick-test.com/api/endpoint/${i}`,
        method: i % 2 === 0 ? 'GET' : 'POST',
        headers: i % 3 === 0 ? undefined : `{"quick": "test", "id": ${i}}`,
        payload_size: i % 4 === 0 ? undefined : i * 50,
        status: 200,
        response_body: i % 5 === 0 ? undefined : `{"success": true, "id": ${i}}`,
        timestamp: Date.now() + i
      });
    }
    
    const insertStart = Date.now();
    const insertPromises = testBatch.map(data => globalScope.storageManager.insertApiCall(data));
    const insertIds = await Promise.all(insertPromises);
    const insertTime = Date.now() - insertStart;
    const insertRate = Math.round(25 / (insertTime / 1000));
    
    console.log(`📊 Insert Results:`);
    console.log(`  ⏱️  Time: ${insertTime}ms`);
    console.log(`  📈 Rate: ${insertRate} records/sec`);
    console.log(`  ✅ Records: ${insertIds.length}/25 inserted`);
    
    results.performance.insert = {
      time: insertTime,
      rate: insertRate,
      count: insertIds.length,
      expected: 25,
      success: insertIds.length === 25
    };

    // ===================================================================
    // QUICK QUERY TEST (50 records)
    // ===================================================================
    console.log('\\n⚡ Quick Query Test (50 records)');
    console.log('----------------------------------');
    
    const queryStart = Date.now();
    const queryResults = await globalScope.storageManager.getApiCalls(50);
    const queryTime = Date.now() - queryStart;
    const queryRate = Math.round(queryResults.length / (queryTime / 1000));
    
    console.log(`📊 Query Results:`);
    console.log(`  ⏱️  Time: ${queryTime}ms`);
    console.log(`  📈 Rate: ${queryRate} records/sec`);
    console.log(`  ✅ Records: ${queryResults.length} retrieved`);
    
    results.performance.query = {
      time: queryTime,
      rate: queryRate,
      count: queryResults.length,
      success: queryResults.length > 0
    };

    // ===================================================================
    // OPERATIONS TEST
    // ===================================================================
    console.log('\\n⚡ Operations Test');
    console.log('------------------');
    
    const opsStart = Date.now();
    
    try {
      const storageInfo = await globalScope.storageManager.getStorageInfo();
      const tableCounts = await globalScope.storageManager.getTableCounts();
      
      const opsTime = Date.now() - opsStart;
      
      console.log(`📊 Operations Results:`);
      console.log(`  ⏱️  Time: ${opsTime}ms`);
      console.log(`  📋 Storage Info: ${storageInfo ? 'Available' : 'Failed'}`);
      console.log(`  📊 Table Counts: ${tableCounts ? 'Available' : 'Failed'}`);
      
      results.performance.operations = {
        time: opsTime,
        storageInfoAvailable: !!storageInfo,
        tableCountsAvailable: !!tableCounts,
        success: !!(storageInfo && tableCounts)
      };
      
    } catch (error) {
      console.log(`❌ Operations failed: ${error.message}`);
      results.performance.operations = {
        time: Date.now() - opsStart,
        success: false,
        error: error.message
      };
    }

    // ===================================================================
    // PERFORMANCE GRADING
    // ===================================================================
    console.log('\\n🎯 PERFORMANCE GRADING');
    console.log('=======================');
    
    let score = 0;
    let maxScore = 0;
    const gradeDetails = {};
    
    // Insert performance grading
    maxScore += 25;
    if (results.performance.insert.success) {
      if (results.performance.insert.rate >= 1000) {
        score += 25;
        gradeDetails.insert = 'A+ (≥1000/sec)';
      } else if (results.performance.insert.rate >= 500) {
        score += 20;
        gradeDetails.insert = 'A (≥500/sec)';
      } else if (results.performance.insert.rate >= 250) {
        score += 15;
        gradeDetails.insert = 'B (≥250/sec)';
      } else if (results.performance.insert.rate >= 100) {
        score += 10;
        gradeDetails.insert = 'C (≥100/sec)';
      } else {
        score += 5;
        gradeDetails.insert = 'D (<100/sec)';
      }
    } else {
      gradeDetails.insert = 'F (Failed)';
    }
    
    // Query performance grading
    maxScore += 25;
    if (results.performance.query.success) {
      if (results.performance.query.rate >= 5000) {
        score += 25;
        gradeDetails.query = 'A+ (≥5000/sec)';
      } else if (results.performance.query.rate >= 2500) {
        score += 20;
        gradeDetails.query = 'A (≥2500/sec)';
      } else if (results.performance.query.rate >= 1000) {
        score += 15;
        gradeDetails.query = 'B (≥1000/sec)';
      } else if (results.performance.query.rate >= 500) {
        score += 10;
        gradeDetails.query = 'C (≥500/sec)';
      } else {
        score += 5;
        gradeDetails.query = 'D (<500/sec)';
      }
    } else {
      gradeDetails.query = 'F (Failed)';
    }
    
    // Operations grading
    maxScore += 25;
    if (results.performance.operations.success) {
      if (results.performance.operations.time <= 10) {
        score += 25;
        gradeDetails.operations = 'A+ (≤10ms)';
      } else if (results.performance.operations.time <= 25) {
        score += 20;
        gradeDetails.operations = 'A (≤25ms)';
      } else if (results.performance.operations.time <= 50) {
        score += 15;
        gradeDetails.operations = 'B (≤50ms)';
      } else if (results.performance.operations.time <= 100) {
        score += 10;
        gradeDetails.operations = 'C (≤100ms)';
      } else {
        score += 5;
        gradeDetails.operations = 'D (>100ms)';
      }
    } else {
      gradeDetails.operations = 'F (Failed)';
    }
    
    // Overall system health
    maxScore += 25;
    if (results.system.initialized && storageType) {
      score += 25;
      gradeDetails.system = 'A+ (Fully functional)';
    } else {
      gradeDetails.system = 'F (Not functional)';
    }
    
    // Calculate final grade
    const percentage = Math.round((score / maxScore) * 100);
    let grade;
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 85) grade = 'A';
    else if (percentage >= 80) grade = 'A-';
    else if (percentage >= 75) grade = 'B+';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 65) grade = 'B-';
    else if (percentage >= 60) grade = 'C+';
    else if (percentage >= 55) grade = 'C';
    else if (percentage >= 50) grade = 'C-';
    else if (percentage >= 45) grade = 'D+';
    else if (percentage >= 40) grade = 'D';
    else grade = 'F';
    
    console.log(`🏆 Overall Grade: ${grade} (${percentage}%)`);
    console.log(`📊 Score: ${score}/${maxScore} points`);
    console.log('');
    console.log('Detailed Grades:');
    console.log(`  📥 Insert Performance: ${gradeDetails.insert}`);
    console.log(`  📤 Query Performance: ${gradeDetails.query}`);
    console.log(`  ⚙️  Operations Speed: ${gradeDetails.operations}`);
    console.log(`  🔧 System Health: ${gradeDetails.system}`);
    
    results.status = {
      passed: percentage >= 70,
      grade,
      percentage,
      score,
      maxScore,
      gradeDetails,
      recommendations: []
    };
    
    // Generate recommendations
    if (percentage < 70) {
      results.status.recommendations.push('Performance below production threshold');
    }
    if (results.performance.insert.rate < 250) {
      results.status.recommendations.push('Consider optimizing insert operations');
    }
    if (results.performance.query.rate < 1000) {
      results.status.recommendations.push('Consider optimizing query operations');
    }
    if (results.performance.operations.time > 50) {
      results.status.recommendations.push('Consider optimizing storage operations');
    }
    
    // Success messages
    console.log('');
    if (percentage >= 90) {
      console.log('🎉 EXCELLENT! Production-ready performance!');
    } else if (percentage >= 80) {
      console.log('🚀 GREAT! Good production performance!');
    } else if (percentage >= 70) {
      console.log('✅ GOOD! Acceptable production performance!');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT! Consider optimization before production');
    }
    
    // Performance summary
    console.log('');
    console.log('📈 QUICK PERFORMANCE SUMMARY:');
    console.log(`  🏪 Storage: ${storageType?.toUpperCase()}`);
    console.log(`  📥 Insert: ${results.performance.insert.rate} records/sec`);
    console.log(`  📤 Query: ${results.performance.query.rate} records/sec`);
    console.log(`  ⚙️  Ops: ${results.performance.operations.time}ms`);
    
    if (results.status.recommendations.length > 0) {
      console.log('');
      console.log('💡 Recommendations:');
      results.status.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 QUICK PERFORMANCE TEST FAILED:', error);
    results.status = {
      passed: false,
      grade: 'F',
      percentage: 0,
      recommendations: ['Fix critical error before testing'],
      error: error.message
    };
    return results;
  }
}

// Auto-run the test
console.log('🔥 STARTING QUICK PERFORMANCE TEST');
console.log('This fast test validates:');
console.log('- Insert performance (25 records)');
console.log('- Query performance (50 records)');
console.log('- Operations speed');
console.log('- Overall system health');
console.log('- Performance grading (A+ to F)');
console.log('');

quickPerformanceTest().then(results => {
  console.log('\\n📋 QUICK PERFORMANCE TEST COMPLETE');
  console.log('Use quickPerformanceTest() to run again');
  
  // Make function globally available
  const globalScope = typeof window !== 'undefined' ? window : self;
  globalScope.quickPerformanceTest = quickPerformanceTest;
});
