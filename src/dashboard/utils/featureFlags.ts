/**
 * Feature Flag System for Chart Optimizations
 * Provides safe rollout mechanism with runtime toggles
 */

export interface FeatureFlags {
  enableSharedChartData: boolean;
  enableGranularMemoization: boolean;
  enableManualRefreshMode: boolean;
  enableStalenessTracking: boolean;
  enablePerformanceMonitoring: boolean;
}

// Default feature flags - conservative approach
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableSharedChartData: false,       // Phase 1 - Foundation
  enableGranularMemoization: false,   // Phase 2 - Migration
  enableManualRefreshMode: true,      // Phase 1 - Safe
  enableStalenessTracking: false,     // Phase 3 - Advanced
  enablePerformanceMonitoring: true   // Phase 1 - Observability
};

// Override flags for development/testing
const DEV_FEATURE_FLAGS: Partial<FeatureFlags> = {
  enableSharedChartData: true,
  enableGranularMemoization: true,
  enableStalenessTracking: true
};

/**
 * Get current feature flags
 * Can be overridden via localStorage in development
 */
export const getFeatureFlags = (): FeatureFlags => {
  // Check for development override
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const override = localStorage.getItem('chartOptimizationFlags');
      if (override) {
        const flags = JSON.parse(override);
        console.log('🚩 Using override feature flags:', flags);
        return { ...DEFAULT_FEATURE_FLAGS, ...flags };
      }
    } catch (error) {
      console.warn('Invalid feature flags in localStorage:', error);
    }
  }

  // In development, use enhanced flags
  const isDevelopment = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'));
  const flags = isDevelopment
    ? { ...DEFAULT_FEATURE_FLAGS, ...DEV_FEATURE_FLAGS }
    : DEFAULT_FEATURE_FLAGS;

  console.log('🚩 Feature flags active:', flags);
  return flags;
};

/**
 * Set feature flag override (development only)
 */
export const setFeatureFlagOverride = (flags: Partial<FeatureFlags>): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const currentFlags = getFeatureFlags();
      const newFlags = { ...currentFlags, ...flags };
      localStorage.setItem('chartOptimizationFlags', JSON.stringify(newFlags));
      console.log('🚩 Feature flags override set:', newFlags);

      // Trigger reload to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Failed to set feature flag override:', error);
    }
  }
};

/**
 * Clear feature flag overrides
 */
export const clearFeatureFlagOverrides = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('chartOptimizationFlags');
    console.log('🚩 Feature flag overrides cleared');
    window.location.reload();
  }
};

/**
 * Check if a specific feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const flags = getFeatureFlags();
  return flags[feature];
};

/**
 * Performance monitoring wrapper
 * Only active when enablePerformanceMonitoring is true
 */
export const withPerformanceMonitoring = <T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T => {
  if (!isFeatureEnabled('enablePerformanceMonitoring')) {
    return fn;
  }

  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);

    if (result && typeof result.then === 'function') {
      // Handle async functions
      return result.finally(() => {
        const duration = performance.now() - start;
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      });
    } else {
      // Handle sync functions
      const duration = performance.now() - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    }
  }) as T;
};

/**
 * Development helper - log all feature flags to console
 */
export const logFeatureFlags = (): void => {
  const isDevelopment = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'));
  if (isDevelopment) {
    const flags = getFeatureFlags();
    console.table(flags);
  }
};

// Auto-log feature flags in development
const isDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'));
if (isDev) {
  setTimeout(logFeatureFlags, 1000);
}
