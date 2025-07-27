// Storage system usage example
import { storageManager } from './storage-manager'

// Initialize the storage system (will try SQLite first, fallback to IndexedDB)
async function initializeStorage() {
  try {
    await storageManager.init()
    console.log('Storage initialized successfully')
    console.log('Storage type:', storageManager.getStorageType())
    
    // Run some example operations
    await runExamples()
  } catch (error) {
    console.error('Failed to initialize storage:', error)
  }
}

async function runExamples() {
  // Example API call data
  const apiCallData = {
    url: 'https://api.example.com/users',
    method: 'GET',
    headers: JSON.stringify({ 'content-type': 'application/json' }),
    payload_size: 256,
    status: 200,
    response_body: '{"users": [{"id": 1, "name": "John"}]}',
    timestamp: Date.now()
  }
  
  // Example console error data
  const consoleErrorData = {
    message: 'Uncaught TypeError: Cannot read property of undefined',
    stack_trace: 'Error at line 42:10 in https://example.com/app.js',
    timestamp: Date.now(),
    severity: 'error' as const,
    url: 'https://example.com/app.js'
  }
  
  // Example token event data
  const tokenEventData = {
    type: 'jwt_token' as const,
    value_hash: 'sha256:a1b2c3d4e5f6...',
    timestamp: Date.now(),
    source_url: 'https://example.com',
    expiry: Date.now() + 3600000 // 1 hour from now
  }
  
  // Example minified library data
  const libraryData = {
    domain: 'example.com',
    name: 'react',
    version: '18.2.0',
    size: 2048,
    source_map_available: false,
    url: 'https://example.com/static/js/react.min.js',
    timestamp: Date.now()
  }
  
  try {
    // Insert data
    const apiCallId = await storageManager.insertApiCall(apiCallData)
    const errorId = await storageManager.insertConsoleError(consoleErrorData)
    const tokenId = await storageManager.insertTokenEvent(tokenEventData)
    const libraryId = await storageManager.insertMinifiedLibrary(libraryData)
    
    console.log('Inserted records with IDs:', { apiCallId, errorId, tokenId, libraryId })
    
    // Retrieve data
    const apiCalls = await storageManager.getApiCalls(10, 0)
    const errors = await storageManager.getConsoleErrors(10, 0)
    const tokens = await storageManager.getTokenEvents(10, 0)
    const libraries = await storageManager.getMinifiedLibraries(10, 0)
    
    console.log('Retrieved data:', { apiCalls, errors, tokens, libraries })
    
    // Get table counts
    const counts = await storageManager.getTableCounts()
    console.log('Table counts:', counts)
    
    // Get storage info
    const storageInfo = await storageManager.getStorageInfo()
    console.log('Storage info:', storageInfo)
    
    // Test batch operations
    const batchApiCalls = [
      { 
        ...apiCallData, 
        url: 'https://api.example.com/posts', 
        response_body: '{"posts": []}',
        timestamp: Date.now() 
      },
      { 
        ...apiCallData, 
        url: 'https://api.example.com/comments', 
        response_body: '{"comments": []}',
        timestamp: Date.now() 
      }
    ]
    
    const batchIds = await storageManager.insertApiCallsBatch(batchApiCalls)
    console.log('Batch insert IDs:', batchIds)
    
  } catch (error) {
    console.error('Error running examples:', error)
  }
}

// Export for use in background script
export { initializeStorage, runExamples }
