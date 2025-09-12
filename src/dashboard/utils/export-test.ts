// Test file to verify CSV export functionality
import {
  exportNetworkRequestsToCSV,
  exportConsoleErrorsToCSV,
  exportTokenEventsToCSV,
  generateCombinedCSV,
  NetworkRequest,
  ConsoleError,
  TokenEvent
} from '../utils/export-utils';

// Test data
const sampleNetworkRequests: NetworkRequest[] = [
  {
    method: 'GET',
    url: 'https://api.example.com/users',
    status: 200,
    payload_size: 1024,
    timestamp: '2025-09-10T14:30:00Z',
    response_time: 150,
    request_headers: { 'Content-Type': 'application/json' },
    response_headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
  },
  {
    method: 'POST',
    url: 'https://api.example.com/auth/login',
    status: 401,
    payload_size: 512,
    timestamp: '2025-09-10T14:31:00Z',
    response_time: 75,
    request_body: '{"username":"test","password":"***"}',
    response_body: '{"error":"Invalid credentials"}'
  }
];

const sampleConsoleErrors: ConsoleError[] = [
  {
    id: '1',
    message: 'TypeError: Cannot read property "name" of undefined',
    url: 'https://example.com/app.js',
    line: 45,
    column: 12,
    severity: 'error',
    timestamp: '2025-09-10T14:32:00Z',
    stack: 'TypeError: Cannot read property "name" of undefined\n    at Object.getName (app.js:45:12)'
  },
  {
    id: '2',
    message: 'Warning: React component is missing key prop',
    url: 'https://example.com/components.js',
    line: 23,
    severity: 'warn',
    timestamp: '2025-09-10T14:33:00Z'
  }
];

const sampleTokenEvents: TokenEvent[] = [
  {
    id: '1',
    type: 'acquire',
    url: 'https://auth.example.com/oauth/token',
    method: 'POST',
    status: 200,
    valueHash: 'a1b2c3d4e5f6',
    timestamp: '2025-09-10T14:34:00Z',
    tokenType: 'bearer'
  },
  {
    id: '2',
    type: 'refresh',
    url: 'https://auth.example.com/oauth/refresh',
    method: 'POST',
    status: 200,
    valueHash: 'f6e5d4c3b2a1',
    timestamp: '2025-09-10T14:35:00Z',
    expiry: '3600'
  }
];

// Test functions
export const testCSVExport = () => {
  // console.log('🧪 Testing CSV Export Functions...');

  try {
    // Test individual exports
    const _networkCSV = exportNetworkRequestsToCSV(sampleNetworkRequests, false);
    // console.log('✅ Network Requests CSV (Basic):', _networkCSV.substring(0, 200) + '...');

    const _networkDetailedCSV = exportNetworkRequestsToCSV(sampleNetworkRequests, true);
    // console.log('✅ Network Requests CSV (Detailed):', _networkDetailedCSV.substring(0, 200) + '...');

    const _errorsCSV = exportConsoleErrorsToCSV(sampleConsoleErrors, false);
    // console.log('✅ Console Errors CSV (Basic):', _errorsCSV.substring(0, 200) + '...');

    const _errorsDetailedCSV = exportConsoleErrorsToCSV(sampleConsoleErrors, true);
    // console.log('✅ Console Errors CSV (Detailed):', _errorsDetailedCSV.substring(0, 200) + '...');

    const _tokensCSV = exportTokenEventsToCSV(sampleTokenEvents, false);
    // console.log('✅ Token Events CSV (Basic):', _tokensCSV.substring(0, 200) + '...');

    const _tokensDetailedCSV = exportTokenEventsToCSV(sampleTokenEvents, true);
    // console.log('✅ Token Events CSV (Detailed):', _tokensDetailedCSV.substring(0, 200) + '...');

    // Test combined export
    const _combinedCSV = generateCombinedCSV(
      {
        network: sampleNetworkRequests,
        errors: sampleConsoleErrors,
        tokens: sampleTokenEvents
      },
      {
        network: true,
        errors: true,
        tokens: false
      }
    );
    // console.log('✅ Combined CSV Export:', _combinedCSV.substring(0, 300) + '...');

    // console.log('🎉 All CSV export tests passed!');
    return true;

  } catch (error) {
    // console.error('❌ CSV export test failed:', error);
    return false;
  }
};

// Test with browser download (commented out for safety)
export const testBrowserDownload = () => {
  // console.log('🧪 Testing browser download...');

  // Uncomment to test actual file download
  /*
  const testCSV = generateCombinedCSV(
    { network: sampleNetworkRequests },
    { network: false }
  );

  downloadCSVFile(testCSV, 'test-export.csv');
  // console.log('✅ Test file should be downloading...');
  */

  // console.log('⚠️ Browser download test is commented out for safety');
};

// Export test data for use in other components
export {
  sampleNetworkRequests,
  sampleConsoleErrors,
  sampleTokenEvents
};
