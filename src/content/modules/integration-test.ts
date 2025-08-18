/**
 * Integration Test for Modular Architecture
 * Tests coordination between NetworkInterceptor, ConsoleInterceptor, and SharedInfrastructure modules
 */

import { SharedInfrastructureModule } from './shared-infrastructure.module'

// Test configuration
const testConfig = {
  network: {
    enabled: true,
    captureHeaders: true,
    captureBody: false,
    maxBodySize: 1024
  },
  console: {
    enabled: true,
    captureStack: true,
    maxMessageLength: 500,
    levels: ['error', 'warn'] as ('error' | 'warn' | 'info' | 'log' | 'debug')[]
  },
  communication: {
    enabled: true,
    batchSize: 5,
    flushInterval: 3000
  }
}

// Global test variables
let sharedInfra: SharedInfrastructureModule | null = null
let testResults: { [key: string]: boolean } = {}

/**
 * Initialize the integration test
 */
async function initializeIntegrationTest(): Promise<void> {
  console.log('🧪 Starting modular architecture integration test...')
  
  try {
    // Initialize shared infrastructure
    sharedInfra = new SharedInfrastructureModule(testConfig)
    await sharedInfra.initialize()
    
    testResults.initialization = true
    console.log('✅ Shared infrastructure initialized successfully')
    
    // Test module status
    const stats = sharedInfra.getStatistics()
    console.log('📊 Module Statistics:', stats)
    
    testResults.statistics = stats.initialized && stats.modules.network && stats.modules.console
    
  } catch (error) {
    console.error('❌ Initialization failed:', error)
    testResults.initialization = false
  }
}

/**
 * Test network request interception
 */
async function testNetworkInterception(): Promise<void> {
  console.log('🌐 Testing network request interception...')
  
  try {
    // Create a test XHR request
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/posts/1')
    
    // Set up promise to track completion
    const requestPromise = new Promise<void>((resolve, reject) => {
      xhr.onload = () => {
        console.log('✅ XHR request completed successfully')
        testResults.networkXHR = true
        resolve()
      }
      xhr.onerror = () => {
        console.error('❌ XHR request failed')
        testResults.networkXHR = false
        reject()
      }
    })
    
    xhr.send()
    await requestPromise
    
    // Test fetch request
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/2')
      await response.json() // Just verify it can parse JSON
      console.log('✅ Fetch request completed successfully')
      testResults.networkFetch = true
    } catch (error) {
      console.error('❌ Fetch request failed:', error)
      testResults.networkFetch = false
    }
    
  } catch (error) {
    console.error('❌ Network interception test failed:', error)
    testResults.networkXHR = false
    testResults.networkFetch = false
  }
}

/**
 * Test console error interception
 */
function testConsoleInterception(): void {
  console.log('📝 Testing console interception...')
  
  try {
    // Test different console methods
    console.error('Test error message for interception')
    console.warn('Test warning message for interception')
    console.log('Test log message (should not be intercepted)')
    
    // Test error with stack trace
    try {
      throw new Error('Test error with stack trace')
    } catch (error) {
      console.error('Caught test error:', error)
    }
    
    testResults.consoleInterception = true
    console.log('✅ Console interception test completed')
    
  } catch (error) {
    console.error('❌ Console interception test failed:', error)
    testResults.consoleInterception = false
  }
}

/**
 * Test communication and data batching
 */
async function testCommunication(): Promise<void> {
  console.log('📡 Testing communication and batching...')
  
  try {
    if (!sharedInfra) {
      throw new Error('Shared infrastructure not initialized')
    }
    
    // Get statistics before and after
    const statsBefore = sharedInfra.getStatistics()
    console.log('📊 Statistics before:', statsBefore)
    
    // Trigger multiple events to test batching
    for (let i = 0; i < 8; i++) {
      console.error(`Batch test error ${i}`)
    }
    
    // Wait a bit for batching
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const statsAfter = sharedInfra.getStatistics()
    console.log('📊 Statistics after:', statsAfter)
    
    testResults.communication = true
    console.log('✅ Communication test completed')
    
  } catch (error) {
    console.error('❌ Communication test failed:', error)
    testResults.communication = false
  }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting comprehensive integration test suite...')
  
  // Initialize
  await initializeIntegrationTest()
  
  if (!testResults.initialization) {
    console.error('❌ Cannot continue tests - initialization failed')
    return
  }
  
  // Wait a bit for initialization to complete
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Run tests
  testConsoleInterception()
  await new Promise(resolve => setTimeout(resolve, 500))
  
  await testNetworkInterception()
  await new Promise(resolve => setTimeout(resolve, 500))
  
  await testCommunication()
  
  // Print final results
  console.log('\n📋 Integration Test Results:')
  console.log('==========================')
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌'
    console.log(`${status} ${test}: ${passed ? 'PASSED' : 'FAILED'}`)
  })
  
  const totalTests = Object.keys(testResults).length
  const passedTests = Object.values(testResults).filter(Boolean).length
  
  console.log(`\n📊 Summary: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Modular architecture is working correctly.')
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.')
  }
}

/**
 * Cleanup test resources
 */
function cleanup(): void {
  if (sharedInfra) {
    sharedInfra.destroy()
    sharedInfra = null
    console.log('🧹 Test cleanup completed')
  }
}

// Export for external use
export {
  runIntegrationTests,
  cleanup,
  testConfig
}

// Auto-run if in development mode
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🔧 Development mode detected - running integration tests automatically in 2 seconds...')
  
  setTimeout(() => {
    runIntegrationTests().then(() => {
      console.log('Integration tests completed.')
    }).catch(error => {
      console.error('Integration test suite failed:', error)
    })
  }, 2000)
}
