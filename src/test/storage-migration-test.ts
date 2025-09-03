/**
 * Storage Migration Test
 *
 * Simple test page to verify that the IndexedDB storage system is working
 * and that chrome.storage.local has been successfully replaced.
 */

console.log('🧪 Storage Migration Test Starting...');

// Test the new storage service
import { storageService } from '../utils/storage-service';

async function testStorageService() {
  try {
    console.log('📝 Testing storageService.set...');
    await storageService.set({
      testKey: 'testValue',
      extensionSettings: {
        globalEnabled: true,
        theme: 'dark'
      },
      settings: {
        networkInterception: { enabled: true },
        errorLogging: { enabled: true }
      }
    });
    console.log('✅ Storage set successful');

    console.log('📖 Testing storageService.get...');
    const result = await storageService.get(['testKey', 'extensionSettings', 'settings']);
    console.log('✅ Storage get successful:', result);

    console.log('🗑️ Testing storageService.remove...');
    await storageService.remove(['testKey']);
    console.log('✅ Storage remove successful');

    const afterRemove = await storageService.get(['testKey', 'extensionSettings']);
    console.log('✅ After remove:', afterRemove);

    console.log('📊 Testing storage info...');
    const storageInfo = await storageService.getStorageInfo();
    console.log('✅ Storage info:', storageInfo);

    console.log('🎉 All storage tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    return false;
  }
}

// Test extension state controller
async function testExtensionStateController() {
  try {
    console.log('🔧 Testing ExtensionStateController...');

    // We'll import dynamically to avoid issues
    const { ExtensionStateController } = await import('../utils/extensionStateController');

    const controller = ExtensionStateController.getInstance();
    await controller.init();

    console.log('📄 Getting global state...');
    const globalState = await controller.isGlobalPowerEnabled();
    console.log('✅ Global power enabled:', globalState);

    console.log('🔄 Setting global state...');
    await controller.setGlobalState(false);
    const newGlobalState = await controller.isGlobalPowerEnabled();
    console.log('✅ New global power enabled:', newGlobalState);

    // Restore original state
    await controller.setGlobalState(globalState);
    console.log('✅ ExtensionStateController tests passed!');
    return true;
  } catch (error) {
    console.error('❌ ExtensionStateController test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive storage migration tests...');

  const storageSuccess = await testStorageService();
  const stateSuccess = await testExtensionStateController();

  if (storageSuccess && stateSuccess) {
    console.log('🎊 All tests passed! Storage migration is working correctly.');
    document.body.innerHTML = `
      <h1>✅ Storage Migration Test - SUCCESS</h1>
      <p>All storage operations are working correctly with IndexedDB.</p>
      <p>Check the console for detailed test results.</p>
    `;
  } else {
    console.log('⚠️ Some tests failed. Check the console for details.');
    document.body.innerHTML = `
      <h1>❌ Storage Migration Test - FAILED</h1>
      <p>Some storage operations failed. Check the console for details.</p>
    `;
  }
}

// Run tests when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}
