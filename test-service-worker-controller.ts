// Test script for ServiceWorkerBackgroundController
import { ServiceWorkerBackgroundController } from './src/background/service-worker-background-controller';

async function testServiceWorkerController() {
  console.log('🧪 Testing ServiceWorkerBackgroundController...');

  // Create controller instance
  const controller = new ServiceWorkerBackgroundController();

  try {
    // Test initialization
    console.log('1. Testing initialization...');
    await controller.initialize();
    console.log('✅ Controller initialized successfully');

    // Test data collection methods
    console.log('2. Testing data collection...');

    // Test network request collection
    await controller.collectNetworkRequest({
      url: 'https://api.example.com/test',
      method: 'GET',
      status: 200,
      responseTime: 150
    });
    console.log('✅ Network request collected');

    // Test console error collection
    await controller.collectConsoleError({
      message: 'Test error message',
      level: 'error',
      source: 'test.js:42'
    });
    console.log('✅ Console error collected');

    // Test token event collection
    await controller.collectTokenEvent({
      token: 'test-token-123',
      event: 'detected',
      domain: 'example.com'
    });
    console.log('✅ Token event collected');

    // Test statistics
    console.log('3. Testing statistics...');
    const stats = await controller.getStatistics();
    console.log('📊 Statistics:', stats);

    // Test message handlers
    console.log('4. Testing message handlers...');

    // Test GET_NETWORK_REQUESTS
    const networkResponse = await controller.handleMessage({
      action: 'GET_NETWORK_REQUESTS',
      data: {}
    }, {} as chrome.runtime.MessageSender);
    console.log('📡 Network requests:', networkResponse);

    // Test GET_CONSOLE_ERRORS
    const errorResponse = await controller.handleMessage({
      action: 'GET_CONSOLE_ERRORS',
      data: {}
    }, {} as chrome.runtime.MessageSender);
    console.log('🔍 Console errors:', errorResponse);

    // Test GET_TOKEN_EVENTS
    const tokenResponse = await controller.handleMessage({
      action: 'GET_TOKEN_EVENTS',
      data: {}
    }, {} as chrome.runtime.MessageSender);
    console.log('🔑 Token events:', tokenResponse);

    // Test settings
    console.log('5. Testing settings...');

    // Update settings
    await controller.handleMessage({
      action: 'UPDATE_EXTENSION_SETTINGS',
      data: {
        networkLogging: true,
        consoleErrorTracking: true,
        tokenDetection: true
      }
    }, {} as chrome.runtime.MessageSender);
    console.log('✅ Settings updated');

    // Get settings
    const settingsResponse = await controller.handleMessage({
      action: 'GET_EXTENSION_SETTINGS',
      data: {}
    }, {} as chrome.runtime.MessageSender);
    console.log('⚙️ Settings:', settingsResponse);

    // Test cleanup
    console.log('6. Testing cleanup...');
    controller.cleanup();
    console.log('✅ Controller cleaned up');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testServiceWorkerController();
