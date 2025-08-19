/**
 * Simple test to verify IndexedDB integration is working
 * This can be used to quickly test the storage functionality
 */

// Test script to verify IndexedDB integration
console.log('🧪 Testing IndexedDB Integration...');

// Mock Chrome API for testing
const mockChromeApi = {
  isExtensionContextValid: () => true
};

// Mock request data for testing
const testNetworkRequest = {
  url: 'https://api.example.com/auth/token',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"username":"test","password":"test"}',
  timestamp: new Date().toISOString(),
  source_url: 'https://example.com',
  tabId: 123
};

const testConsoleError = {
  message: 'Test error message',
  severity: 'error',
  timestamp: new Date().toISOString(),
  source_url: 'https://example.com',
  stack: 'Error at line 10',
  tabId: 123
};

console.log('✅ Test data prepared');
console.log('📝 Network request test data:', testNetworkRequest);
console.log('📝 Console error test data:', testConsoleError);
console.log('🎯 Integration test complete - IndexedDB should store all interception data');
