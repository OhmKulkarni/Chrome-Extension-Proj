/**
 * Permission-based Library Detection Test
 * Tests that library detection only runs when logging permissions are enabled
 */

import { unifiedPermissionManager } from '../utils/unified-permission-manager';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

class PermissionLibraryDetectionTest {
  private results: TestResult[] = [];

  /**
   * Mock background script message handler
   */
  private mockBackgroundMessageHandler = async (message: any): Promise<any> => {
    if (message.action === 'CHECK_LOGGING_PERMISSIONS' && message.tabId !== undefined) {
      try {
        // Check if any of the three logging types are enabled for this tab
        const [networkEnabled, consoleEnabled, tokenEnabled] = await Promise.all([
          unifiedPermissionManager.isFeatureEnabled(message.tabId, 'network'),
          unifiedPermissionManager.isFeatureEnabled(message.tabId, 'console'),
          unifiedPermissionManager.isFeatureEnabled(message.tabId, 'tokens')
        ]);

        const hasAnyLoggingEnabled = networkEnabled || consoleEnabled || tokenEnabled;
        
        return { 
          success: true, 
          enabled: hasAnyLoggingEnabled,
          details: {
            network: networkEnabled,
            console: consoleEnabled,
            tokens: tokenEnabled
          }
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to check logging permissions' };
      }
    }
    return { success: false, error: 'Unknown action' };
  };

  /**
   * Mock content script permission checking method
   */
  private mockCheckLoggingPermissions = async (tabId: number): Promise<boolean> => {
    try {
      // Simulate chrome.runtime.sendMessage
      const response = await this.mockBackgroundMessageHandler({
        action: 'CHECK_LOGGING_PERMISSIONS',
        tabId: tabId
      });

      if (response.success) {
        console.log('📊 Permission Check Result:', response.details);
        return response.enabled;
      } else {
        console.error('❌ Permission check failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      return false;
    }
  };

  /**
   * Test: All logging disabled - library detection should not run
   */
  private async testAllLoggingDisabled(): Promise<void> {
    const testTabId = 1;
    
    try {
      // Ensure all logging is disabled for this tab
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'network', false);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'console', false);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'tokens', false);

      const shouldDetectLibraries = await this.mockCheckLoggingPermissions(testTabId);

      this.results.push({
        test: 'All logging disabled',
        passed: !shouldDetectLibraries,
        message: shouldDetectLibraries 
          ? 'FAIL: Library detection should be disabled when no logging is active'
          : 'PASS: Library detection correctly disabled'
      });
    } catch (error) {
      this.results.push({
        test: 'All logging disabled',
        passed: false,
        message: `ERROR: ${error instanceof Error ? error.message : error}`
      });
    }
  }

  /**
   * Test: Only network logging enabled - library detection should run
   */
  private async testNetworkLoggingOnly(): Promise<void> {
    const testTabId = 2;
    
    try {
      // Enable only network logging
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'network', true);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'console', false);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'tokens', false);

      const shouldDetectLibraries = await this.mockCheckLoggingPermissions(testTabId);

      this.results.push({
        test: 'Network logging only',
        passed: shouldDetectLibraries,
        message: shouldDetectLibraries 
          ? 'PASS: Library detection correctly enabled with network logging'
          : 'FAIL: Library detection should be enabled when network logging is active'
      });
    } catch (error) {
      this.results.push({
        test: 'Network logging only',
        passed: false,
        message: `ERROR: ${error instanceof Error ? error.message : error}`
      });
    }
  }

  /**
   * Test: Only console logging enabled - library detection should run
   */
  private async testConsoleLoggingOnly(): Promise<void> {
    const testTabId = 3;
    
    try {
      // Enable only console logging
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'network', false);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'console', true);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'tokens', false);

      const shouldDetectLibraries = await this.mockCheckLoggingPermissions(testTabId);

      this.results.push({
        test: 'Console logging only',
        passed: shouldDetectLibraries,
        message: shouldDetectLibraries 
          ? 'PASS: Library detection correctly enabled with console logging'
          : 'FAIL: Library detection should be enabled when console logging is active'
      });
    } catch (error) {
      this.results.push({
        test: 'Console logging only',
        passed: false,
        message: `ERROR: ${error instanceof Error ? error.message : error}`
      });
    }
  }

  /**
   * Test: Only token logging enabled - library detection should run
   */
  private async testTokenLoggingOnly(): Promise<void> {
    const testTabId = 4;
    
    try {
      // Enable only token logging
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'network', false);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'console', false);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'tokens', true);

      const shouldDetectLibraries = await this.mockCheckLoggingPermissions(testTabId);

      this.results.push({
        test: 'Token logging only',
        passed: shouldDetectLibraries,
        message: shouldDetectLibraries 
          ? 'PASS: Library detection correctly enabled with token logging'
          : 'FAIL: Library detection should be enabled when token logging is active'
      });
    } catch (error) {
      this.results.push({
        test: 'Token logging only',
        passed: false,
        message: `ERROR: ${error instanceof Error ? error.message : error}`
      });
    }
  }

  /**
   * Test: All logging enabled - library detection should run
   */
  private async testAllLoggingEnabled(): Promise<void> {
    const testTabId = 5;
    
    try {
      // Enable all logging
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'network', true);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'console', true);
      await unifiedPermissionManager.setFeatureEnabled(testTabId, 'tokens', true);

      const shouldDetectLibraries = await this.mockCheckLoggingPermissions(testTabId);

      this.results.push({
        test: 'All logging enabled',
        passed: shouldDetectLibraries,
        message: shouldDetectLibraries 
          ? 'PASS: Library detection correctly enabled with all logging active'
          : 'FAIL: Library detection should be enabled when all logging is active'
      });
    } catch (error) {
      this.results.push({
        test: 'All logging enabled',
        passed: false,
        message: `ERROR: ${error instanceof Error ? error.message : error}`
      });
    }
  }

  /**
   * Run all tests
   */
  public async runTests(): Promise<void> {
    console.log('🧪 Starting Permission-based Library Detection Tests...\n');

    // Initialize unified permission manager
    await unifiedPermissionManager.initialize();

    // Run all test cases
    await this.testAllLoggingDisabled();
    await this.testNetworkLoggingOnly();
    await this.testConsoleLoggingOnly();
    await this.testTokenLoggingOnly();
    await this.testAllLoggingEnabled();

    // Report results
    this.reportResults();
  }

  /**
   * Report test results
   */
  private reportResults(): void {
    console.log('\n📊 Test Results:');
    console.log('=================');

    let passedCount = 0;
    let failedCount = 0;

    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}: ${result.message}`);
      
      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    });

    console.log('\n📈 Summary:');
    console.log(`✅ Passed: ${passedCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📊 Total: ${this.results.length}`);

    if (failedCount === 0) {
      console.log('\n🎉 All tests passed! Permission-based library detection is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
  }
}

// Export for use in other modules
export { PermissionLibraryDetectionTest };

// Self-executing test when run directly
if (typeof window !== 'undefined') {
  const test = new PermissionLibraryDetectionTest();
  test.runTests().catch(console.error);
}
