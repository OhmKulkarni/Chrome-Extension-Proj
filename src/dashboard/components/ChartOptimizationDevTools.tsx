/**
 * Chart Optimization Development Tools
 * Provides debugging and testing utilities for chart optimization features
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Settings,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Database,
  Activity,
  Code,
  AlertTriangle
} from 'lucide-react';
import {
  getFeatureFlags,
  setFeatureFlagOverride,
  clearFeatureFlagOverrides,
  logFeatureFlags,
  FeatureFlags
} from '../utils/featureFlags';

interface PerformanceTest {
  name: string;
  description: string;
  run: () => Promise<{ duration: number; result: any }>;
}

export const ChartOptimizationDevTools: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  // Refresh flags from storage
  const _refreshFlags = useCallback(() => {
    const _currentFlags = getFeatureFlags();
    setFlags(currentFlags);
    logFeatureFlags();
  }, []);

  // Toggle a feature flag
  const _toggleFlag = useCallback((flagName: keyof FeatureFlags) => {
    const _newValue = !flags[flagName];
    setFeatureFlagOverride({ [flagName]: newValue });

    // Update local state immediately (will reload after setFeatureFlagOverride)
    setFlags(prev => ({ ...prev, [flagName]: newValue }));
  }, [flags]);

  // Reset all flags
  const _resetFlags = useCallback(() => {
    clearFeatureFlagOverrides();
  }, []);

  // Performance tests
  const performanceTests: PerformanceTest[] = [
    {
      name: 'Data Processing Speed',
      description: 'Test raw data processing vs shared processing performance',
      run: async () => {
        const _start = performance.now();

        // Simulate data processing
        const _mockData = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
          status: 200 + Math.floor(Math.random() * 300),
          response_time: Math.random() * 1000
        }));

        // Process the data
        const _processed = mockData.reduce((acc, req) => {
          acc.methodCounts = acc.methodCounts || {};
          acc.methodCounts[req.method] = (acc.methodCounts[req.method] || 0) + 1;
          return acc;
        }, {} as any);

        const _end = performance.now();
        return { duration: end - start, result: processed };
      }
    },
    {
      name: 'Memory Usage Test',
      description: 'Monitor memory consumption during chart rendering',
      run: async () => {
        const _startMemory = (performance as any).memory?.usedJSHeapSize || 0;

        // Simulate chart rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        const _endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const _memoryIncrease = endMemory - startMemory;

        return {
          duration: 100,
          result: {
            startMemory: startMemory / 1024 / 1024,
            endMemory: endMemory / 1024 / 1024,
            increase: memoryIncrease / 1024 / 1024
          }
        };
      }
    },
    {
      name: 'Chart Update Performance',
      description: 'Test chart re-rendering performance with different optimization levels',
      run: async () => {
        const _iterations = 10;
        const times: number[] = [];

        for (let _i = 0; i < iterations; i++) {
          const _start = performance.now();

          // Simulate chart update
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));

          const _end = performance.now();
          times.push(end - start);
        }

        const _avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        return {
          duration: avgTime,
          result: {
            iterations,
            avgTime: avgTime.toFixed(2),
            minTime: Math.min(...times).toFixed(2),
            maxTime: Math.max(...times).toFixed(2)
          }
        };
      }
    }
  ];

  // Run a performance test
  const _runTest = useCallback(async (test: PerformanceTest) => {
    setRunningTests(prev => new Set(prev).add(test.name));

    try {
      const _result = await test.run();
      setTestResults(prev => ({
        ...prev,
        [test.name]: {
          ...result,
          timestamp: Date.now(),
          success: true
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [test.name]: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          success: false
        }
      }));
    } finally {
      setRunningTests(prev => {
        const _newSet = new Set(prev);
        newSet.delete(test.name);
        return newSet;
      });
    }
  }, []);

  // Run all tests
  const _runAllTests = useCallback(async () => {
    for (const test of performanceTests) {
      await runTest(test);
    }
  }, [runTest, performanceTests]);

  const _getFlagColor = (enabled: boolean) => enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
  const _getFlagIcon = (enabled: boolean) => enabled ? '🟢' : '⚫';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chart Optimization Development Tools
          </CardTitle>
          <CardDescription>
            Debug and test chart optimization features in development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Feature Flags Control */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Feature Flags
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {Object.entries(flags).map(([flagName, enabled]) => (
                  <div key={flagName} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">
                        {getFlagIcon(enabled)} {flagName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div className="text-xs text-gray-600">
                        {flagName === 'enableSharedChartData' && 'Centralized data processing for all charts'}
                        {flagName === 'enableGranularMemoization' && 'Fine-grained memoization of chart components'}
                        {flagName === 'enableManualRefreshMode' && 'Allow manual-only chart refresh mode'}
                        {flagName === 'enableStalenessTracking' && 'Show data age indicators on charts'}
                        {flagName === 'enablePerformanceMonitoring' && 'Track and display performance metrics'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getFlagColor(enabled)}`}>
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                      <Button
                        onClick={() => toggleFlag(flagName as keyof FeatureFlags)}
                        variant="outline"
                        size="sm"
                      >
                        Toggle
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={refreshFlags} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button onClick={resetFlags} variant="outline" size="sm">
                  Reset All
                </Button>
              </div>
            </div>

            {/* Performance Tests */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Tests
              </h3>
              <div className="space-y-3 mb-4">
                {performanceTests.map((test) => {
                  const _isRunning = runningTests.has(test.name);
                  const _result = testResults[test.name];

                  return (
                    <div key={test.name} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{test.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{test.description}</p>

                          {result && (
                            <div className="text-xs">
                              {result.success ? (
                                <div className="space-y-1">
                                  <div className="text-green-600">
                                    ✓ Completed in {result.duration.toFixed(2)}ms
                                  </div>
                                  <div className="text-gray-600">
                                    Result: {JSON.stringify(result.result, null, 2)}
                                  </div>
                                  <div className="text-gray-500">
                                    {new Date(result.timestamp).toLocaleTimeString()}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-red-600">
                                  ✗ Error: {result.error}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => runTest(test)}
                          disabled={isRunning}
                          variant="outline"
                          size="sm"
                        >
                          {isRunning ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Run Test
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button onClick={runAllTests} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </Button>
            </div>

            {/* System Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><strong>User Agent:</strong> {navigator.userAgent.split(' ').slice(0, 3).join(' ')}...</div>
                  <div><strong>Memory Limit:</strong> {((performance as any).memory?.jsHeapSizeLimit / 1024 / 1024)?.toFixed(0) || 'N/A'} MB</div>
                  <div><strong>Current Memory:</strong> {((performance as any).memory?.usedJSHeapSize / 1024 / 1024)?.toFixed(1) || 'N/A'} MB</div>
                </div>
                <div className="space-y-2">
                  <div><strong>Platform:</strong> {navigator.platform}</div>
                  <div><strong>Chrome Extension:</strong> {typeof chrome !== 'undefined' ? '✓' : '✗'}</div>
                  <div><strong>Performance API:</strong> {typeof performance.mark === 'function' ? '✓' : '✗'}</div>
                </div>
              </div>
            </div>

            {/* Development Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Development Notes
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>• Feature flags persist in localStorage and require page refresh</div>
                <div>• Performance tests simulate real-world scenarios with random delays</div>
                <div>• Memory measurements may not be available in all environments</div>
                <div>• Use browser DevTools → Performance tab for detailed profiling</div>
              </div>
            </div>

            {/* Only show in development environments */}
            {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Development Tool Warning
                </h4>
                <div className="text-sm text-yellow-800">
                  This development tool is for testing purposes only. Feature flag changes may affect performance and stability.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
