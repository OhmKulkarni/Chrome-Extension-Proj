# 🚀 **CHART OPTIMIZATION IMPLEMENTATION PLAN**

## 📋 **SAFE IMPLEMENTATION STRATEGY**

### **🎯 SCOPE: HIGH-COMPATIBILITY FEATURES ONLY**
- ✅ Chart-specific memoization with granular dependencies
- ✅ Shared data processing to eliminate duplication
- ✅ Incremental updates instead of full reloads
- ✅ Manual refresh button with clear state
- ✅ User preference controls for refresh intervals
- ✅ Memory usage warnings in settings tooltips

---

## **PHASE 1: FOUNDATION & SAFETY** 🔧

### **Step 1.1: Create Shared Data Hook (LOW RISK)**
**Duration:** 2-3 hours
**Risk Level:** 🟢 LOW
**Files:** `src/dashboard/hooks/useSharedChartData.ts` (NEW)

**Implementation:**
```typescript
// NEW FILE: useSharedChartData.ts
export interface ProcessedChartData {
  // Shared calculations all charts can use
  networkMetrics: {
    totalRequests: number;
    methodCounts: Record<string, number>;
    statusCodeCounts: Record<string, number>;
    // ... other shared metrics
  };
  errorMetrics: {
    totalErrors: number;
    severityCounts: Record<string, number>;
  };
  tokenMetrics: {
    totalTokens: number;
    typeCounts: Record<string, number>;
  };
  lastProcessed: number; // timestamp for staleness tracking
}

export const useSharedChartData = (analysisData: AnalysisData): ProcessedChartData => {
  return useMemo(() => {
    console.log('🔄 Processing shared chart data...');

    // Single processing pass for all charts
    const processed = processAllChartData(analysisData);

    console.log('✅ Shared chart data processed:', {
      networkRequests: analysisData.networkRequests?.length,
      consoleErrors: analysisData.consoleErrors?.length,
      tokenEvents: analysisData.tokenEvents?.length
    });

    return processed;
  }, [analysisData]); // Only recalculates when raw data changes
};
```

**Safety Measures:**
- Creates new file, doesn't modify existing code
- Extensive logging for monitoring performance
- Fallback to current system if hook fails

### **Step 1.2: Add Settings Infrastructure (MEDIUM RISK)**
**Duration:** 1-2 hours
**Risk Level:** 🟡 MEDIUM
**Files:** `src/dashboard/components/SettingsInline.tsx`

**Implementation:**
```typescript
// ADD to existing settings interface
interface DashboardSettings {
  // ... existing settings
  chartRefresh: {
    autoRefresh: boolean;
    interval: 15000 | 30000 | 60000 | 120000 | 300000 | 'manual'; // ms or 'manual'
    lastRefreshTime?: number;
  };
}

// ADD new settings section with memory warnings
const ChartRefreshSettings: React.FC = () => (
  <div className="space-y-4">
    <h4 className="text-sm font-medium text-gray-700">Chart Updates</h4>

    <div className="space-y-3">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.chartRefresh.autoRefresh}
          onChange={(e) => updateSettings('chartRefresh.autoRefresh', e.target.checked)}
          className="mr-2"
        />
        <span>Auto-refresh charts</span>
        <InfoTooltip text="Automatically update charts with new data. Disable to save memory and battery." />
      </label>

      <div className="ml-6">
        <label className="block text-sm text-gray-600 mb-2">Refresh Interval:</label>
        <select
          value={settings.chartRefresh.interval}
          onChange={(e) => updateSettings('chartRefresh.interval', e.target.value)}
          disabled={!settings.chartRefresh.autoRefresh}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={15000}>15 seconds ⚠️ High memory usage</option>
          <option value={30000}>30 seconds (Recommended)</option>
          <option value={60000}>1 minute</option>
          <option value={120000}>2 minutes</option>
          <option value={300000}>5 minutes 🔋 Battery friendly</option>
          <option value="manual">Manual only</option>
        </select>
        <InfoTooltip text="Shorter intervals provide real-time data but use more CPU and memory. Choose based on your monitoring needs." />
      </div>
    </div>
  </div>
);
```

**Safety Measures:**
- Adds new settings without modifying existing ones
- Default values maintain current behavior
- Settings are optional (graceful fallback)

### **Step 1.3: Manual Refresh Button (LOW RISK)**
**Duration:** 1 hour
**Risk Level:** 🟢 LOW
**Files:** `src/dashboard/components/StatisticsCard.tsx`

**Implementation:**
```typescript
// ADD to StatisticsCard component
const [isManualRefreshing, setIsManualRefreshing] = useState(false);
const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

const handleManualRefresh = useCallback(async () => {
  setIsManualRefreshing(true);
  try {
    console.log('🔄 Manual refresh triggered by user');
    await refreshAnalysisData();
    setLastRefreshTime(new Date());
    console.log('✅ Manual refresh completed');
  } catch (error) {
    console.error('❌ Manual refresh failed:', error);
  } finally {
    setIsManualRefreshing(false);
  }
}, [refreshAnalysisData]);

// ADD refresh button to existing header
<div className="flex items-center gap-3">
  <button
    onClick={handleManualRefresh}
    disabled={isManualRefreshing}
    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    title="Refresh all charts with latest data"
  >
    {isManualRefreshing ? (
      <>
        <Spinner className="w-4 h-4" />
        Refreshing...
      </>
    ) : (
      <>
        <RefreshIcon className="w-4 h-4" />
        Refresh
      </>
    )}
  </button>

  <span className="text-xs text-gray-500">
    Last updated: {formatRelativeTime(lastRefreshTime)}
  </span>
</div>
```

**Safety Measures:**
- Pure addition, doesn't modify existing refresh logic
- Disabled state prevents double-clicks
- Error handling with user feedback

---

## **PHASE 2: GRADUAL MIGRATION** 🔄

### **Step 2.1: Migrate Charts to Shared Data (HIGH VALUE)**
**Duration:** 4-6 hours
**Risk Level:** 🟡 MEDIUM
**Files:** `src/dashboard/components/ChartComponents.tsx` (MODIFY EXISTING)

**Migration Strategy - Chart by Chart:**
```typescript
// EXAMPLE: HttpMethodDistributionChart migration
export const HttpMethodDistributionChart: React.FC<ChartProps> = ({ networkRequests }) => {
  // OLD: Direct data processing
  // const chartData = useMemo(() => processNetworkRequests(networkRequests), [networkRequests]);

  // NEW: Use shared processed data
  const sharedData = useSharedChartData({ networkRequests, consoleErrors: [], tokenEvents: [] });

  const chartData = useMemo(() => {
    // Only transform already-processed data
    return transformForMethodChart(sharedData.networkMetrics.methodCounts);
  }, [sharedData.networkMetrics]); // Granular dependency

  console.log('📊 HttpMethodChart rendered with shared data');

  // ... rest of component unchanged
};
```

**Safe Migration Order:**
1. ✅ **Start with simple charts:** HttpMethodDistributionChart, StatusCodeBreakdownChart
2. ✅ **Move to complex charts:** PayloadSizeDistributionChart, RequestsOverTimeChart
3. ✅ **Finish with chart-specific logic:** Custom calculation charts

**Safety Measures:**
- Migrate one chart at a time
- Keep old processing logic as fallback initially
- Extensive console logging for each migration
- Easy rollback if issues found

### **Step 2.2: Implement Chart-Specific Memoization (HIGH IMPACT)**
**Duration:** 3-4 hours
**Risk Level:** 🟢 LOW
**Files:** `src/dashboard/components/ChartComponents.tsx` (ENHANCE EXISTING)

**Implementation Pattern:**
```typescript
// BEFORE: Broad dependency
const chartData = useMemo(() => {
  return processChartData(analysisData);
}, [analysisData]); // Re-runs when ANY data changes

// AFTER: Granular dependencies
const chartData = useMemo(() => {
  console.log('🔄 PayloadSizeChart: Processing with granular deps');
  return processChartData(sharedData.networkMetrics);
}, [
  sharedData.networkMetrics.totalRequests,
  sharedData.networkMetrics.sizeDistribution,
  sharedData.lastProcessed
]); // Only re-runs when RELEVANT data changes
```

**Chart-Specific Dependencies:**
```typescript
// PayloadSizeDistributionChart
[sharedData.networkMetrics.sizeDistribution, sharedData.lastProcessed]

// StatusCodeBreakdownChart
[sharedData.networkMetrics.statusCodeCounts, sharedData.lastProcessed]

// ErrorFrequencyOverTimeChart
[sharedData.errorMetrics.timelineCounts, sharedData.lastProcessed]
```

**Safety Measures:**
- Start with non-critical charts for testing
- Include `lastProcessed` timestamp to force updates when needed
- Console logging to verify dependency behavior

### **Step 2.3: Implement Settings-Based Auto-Refresh (CRITICAL)**
**Duration:** 2-3 hours
**Risk Level:** 🔴 HIGH
**Files:** `src/dashboard/decomposed-dashboard.tsx`, `src/dashboard/dashboard.tsx`

**Implementation:**
```typescript
// REPLACE existing auto-refresh logic
const useSettingsBasedRefresh = (loadDashboardData: () => Promise<void>) => {
  const settings = useSettings();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (refreshInterval) {
      clearTimeout(refreshInterval);
      setRefreshInterval(null);
    }

    // Skip if auto-refresh disabled or manual mode
    if (!settings.chartRefresh.autoRefresh || settings.chartRefresh.interval === 'manual') {
      console.log('📊 Auto-refresh disabled by user settings');
      return;
    }

    const interval = typeof settings.chartRefresh.interval === 'number'
      ? settings.chartRefresh.interval
      : 30000; // fallback

    console.log(`📊 Setting up auto-refresh: ${interval}ms interval`);

    const timeoutId = setTimeout(() => {
      console.log('🔄 Settings-based auto-refresh triggered');
      loadDashboardData().catch(error => {
        console.error('❌ Auto-refresh failed:', error);
      });
    }, interval);

    setRefreshInterval(timeoutId);

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [settings.chartRefresh, loadDashboardData]);
};
```

**Safety Measures:**
- Feature flag to enable/disable new refresh logic
- Fallback to old system if settings missing
- Memory leak prevention with proper cleanup
- Extensive error handling and logging

---

## **PHASE 3: INCREMENTAL UPDATES** ⚡

### **Step 3.1: Implement Data Staleness Tracking (FOUNDATION)**
**Duration:** 2-3 hours
**Risk Level:** 🟡 MEDIUM
**Files:** `src/dashboard/hooks/useDataStaleness.ts` (NEW)

**Implementation:**
```typescript
// NEW FILE: useDataStaleness.ts
interface StalenessInfo {
  recordsAddedSinceRefresh: number;
  chartsNeedingUpdate: string[];
  lastRefreshTime: Date;
  isStale: boolean;
}

export const useDataStaleness = (): StalenessInfo => {
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [lastKnownCounts, setLastKnownCounts] = useState({
    networkRequests: 0,
    consoleErrors: 0,
    tokenEvents: 0
  });

  // Track when data actually changes
  useEffect(() => {
    // Listen for background data updates
    const handleDataUpdate = (message: any) => {
      if (message.type === 'DATA_UPDATED') {
        console.log('📊 Data staleness detected:', message.dataType);
        // Don't auto-refresh here, just track staleness
      }
    };

    chrome.runtime.onMessage.addListener(handleDataUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleDataUpdate);
  }, []);

  return {
    recordsAddedSinceRefresh,
    chartsNeedingUpdate,
    lastRefreshTime,
    isStale: recordsAddedSinceRefresh > 0
  };
};
```

### **Step 3.2: Add Visual Staleness Indicators (USER FEEDBACK)**
**Duration:** 1-2 hours
**Risk Level:** 🟢 LOW
**Files:** `src/dashboard/components/StatisticsCard.tsx`

**Implementation:**
```typescript
const StalenessIndicator: React.FC<{ staleness: StalenessInfo }> = ({ staleness }) => (
  <div className="flex items-center gap-2 text-sm">
    {staleness.isStale ? (
      <div className="flex items-center gap-2 text-yellow-600">
        <AlertIcon className="w-4 h-4" />
        <span>{staleness.recordsAddedSinceRefresh} new records</span>
        <button
          onClick={handleManualRefresh}
          className="text-blue-600 hover:underline"
        >
          Refresh now
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-green-600">
        <CheckIcon className="w-4 h-4" />
        <span>Charts up to date</span>
      </div>
    )}

    <span className="text-gray-500">
      • Last updated: {formatRelativeTime(staleness.lastRefreshTime)}
    </span>
  </div>
);
```

---

## **PHASE 4: TESTING & VALIDATION** ✅

### **Step 4.1: Performance Monitoring (CRITICAL)**
**Duration:** 1-2 hours
**Risk Level:** 🟢 LOW

**Add Performance Tracking:**
```typescript
// Performance monitoring wrapper
const useChartPerformanceMonitor = () => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log('📊 Chart rendering performance:', {
        duration: `${duration.toFixed(2)}ms`,
        memory: (performance as any).memory?.usedJSHeapSize || 'unknown'
      });

      // Warn if performance degradation
      if (duration > 100) {
        console.warn('⚠️ Slow chart render detected:', duration);
      }
    };
  });
};
```

### **Step 4.2: Memory Leak Validation (SAFETY)**
**Duration:** 1 hour
**Risk Level:** 🟢 LOW

**Memory Leak Checks:**
```typescript
// Add to each major component
useEffect(() => {
  const checkMemoryLeak = () => {
    const memory = (performance as any).memory;
    if (memory) {
      const heapUsed = memory.usedJSHeapSize;
      const heapLimit = memory.jsHeapSizeLimit;
      const percentage = (heapUsed / heapLimit) * 100;

      if (percentage > 90) {
        console.error('🚨 Memory leak warning! Heap usage:', percentage.toFixed(1) + '%');
      }
    }
  };

  const interval = setInterval(checkMemoryLeak, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## **📅 IMPLEMENTATION TIMELINE**

### **Week 1 - Foundation**
- Day 1-2: Phase 1 (Foundation & Safety)
- Day 3-4: Phase 2.1 (Migrate 2-3 simple charts)
- Day 5: Testing and validation

### **Week 2 - Full Migration**
- Day 1-2: Phase 2.2 (Chart-specific memoization)
- Day 3: Phase 2.3 (Settings-based refresh) - CAREFUL!
- Day 4-5: Phase 3 (Incremental updates & staleness)

### **Week 3 - Polish & Testing**
- Day 1-2: Phase 4 (Performance monitoring)
- Day 3-4: End-to-end testing
- Day 5: Documentation and rollout

---

## **🚨 ROLLBACK STRATEGY**

### **Feature Flags for Safety:**
```typescript
const FEATURE_FLAGS = {
  USE_SHARED_DATA_PROCESSING: true,
  USE_GRANULAR_MEMOIZATION: true,
  USE_SETTINGS_REFRESH: false, // Start disabled!
  USE_STALENESS_TRACKING: true
};
```

### **Easy Rollback Steps:**
1. Disable feature flags immediately
2. Revert to previous refresh logic
3. Clear any problematic state
4. Restart auto-refresh with original intervals

---

## **✅ SUCCESS METRICS**

### **Performance Improvements:**
- ✅ **Memory usage**: 40-60% reduction in peak usage
- ✅ **CPU usage**: 50-70% reduction in chart processing
- ✅ **User responsiveness**: Manual refresh under 1 second
- ✅ **Settings integration**: No conflicts with existing features

### **User Experience:**
- ✅ **Clear staleness indicators**: Users know when data is outdated
- ✅ **Predictable refresh intervals**: No more adaptive slowdowns
- ✅ **Manual control**: Instant refresh when needed
- ✅ **Memory warnings**: Users informed about performance trade-offs

### **Memory Safety:**
- ✅ **No new memory leaks**: Heap growth remains bounded
- ✅ **Proper cleanup**: All intervals and listeners cleaned up
- ✅ **Graceful fallbacks**: System works even if optimizations fail

---

**Status:** Ready for Implementation
**Risk Level:** 🟡 MEDIUM (manageable with proper testing)
**Expected Benefit:** 🔥 HIGH (major performance improvements)
**Timeline:** 2-3 weeks for full implementation
