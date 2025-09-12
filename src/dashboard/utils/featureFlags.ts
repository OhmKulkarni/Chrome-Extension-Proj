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

// Default feature flags - enabling critical optimizations
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableSharedChartData: true,        // ENABLED - Critical for performance at scale
  enableGranularMemoization: true,    // ENABLED - Prevents redundant processing
  enableManualRefreshMode: true,      // Safe - User controls refresh
  enableStalenessTracking: false,     // Phase 3 - Advanced (keep disabled)
  enablePerformanceMonitoring: true   // Safe - Observability
};

// Override flags for development/testing
const DEV_FEATURE_FLAGS: Partial<FeatureFlags> = {
  enableSharedChartData: true,
  enableGranularMemoization: true,
  enableStalenessTracking: true
};

// Feature flag cache to prevent localStorage parsing on every call
let flagCache: FeatureFlags | null = null;
let _cacheExpiry = 0;
const _CACHE_DURATION = 5000; // 5 seconds

/**
 * Get current feature flags
 * Can be overridden via localStorage in development
 */
export const _getFeatureFlags = (): FeatureFlags => {
  // Return cached flags if still valid
  const _now = Date.now();
  if (flagCache && now < cacheExpiry) {
    return flagCache as FeatureFlags;
  }

  // Check for development override
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const _override = localStorage.getItem('chartOptimizationFlags');
      if (override) {
        const _flags = JSON.parse(override);
        // console.log('🚩 Using override feature flags:', flags);
        flagCache = { ...DEFAULT_FEATURE_FLAGS, ...flags };
        cacheExpiry = now + CACHE_DURATION;
        return flagCache as FeatureFlags;
      }
    } catch (error) {
      // console.warn('Invalid feature flags in localStorage:', error);
    }
  }

  // In development, use enhanced flags
  const _isDevelopment = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'));
  const _flags = isDevelopment
    ? { ...DEFAULT_FEATURE_FLAGS, ...DEV_FEATURE_FLAGS }
    : DEFAULT_FEATURE_FLAGS;

  // console.log('🚩 Feature flags active:', flags);

  // Cache the flags
  flagCache = flags;
  cacheExpiry = now + CACHE_DURATION;

  return flags;
};

/**
 * Set feature flag override (development only)
 */
export const _setFeatureFlagOverride = (flags: Partial<FeatureFlags>): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const _currentFlags = getFeatureFlags();
      const _newFlags = { ...currentFlags, ...flags };
      localStorage.setItem('chartOptimizationFlags', JSON.stringify(newFlags));
      // console.log('🚩 Feature flags override set:', newFlags);

      // Trigger reload to apply changes
      window.location.reload();
    } catch (error) {
      // console.error('Failed to set feature flag override:', error);
    }
  }
};

/**
 * Clear feature flag overrides
 */
export const _clearFeatureFlagOverrides = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('chartOptimizationFlags');
    // console.log('🚩 Feature flag overrides cleared');
    window.location.reload();
  }
};

/**
 * Check if a specific feature is enabled
 */
export const _isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const _flags = getFeatureFlags();
  return flags[feature];
};

/**
 * Performance monitoring wrapper
 * Only active when enablePerformanceMonitoring is true
 */
export const _withPerformanceMonitoring = <T extends (...args: any[]) => any>(
  _name: string,
  fn: T
): T => {
  if (!isFeatureEnabled('enablePerformanceMonitoring')) {
    return fn;
  }

  return ((...args: any[]) => {
    // Performance monitoring disabled
    // const _start = performance.now();
    const _result = fn(...args);

    if (result && typeof result.then === 'function') {
      // Handle async functions
      return result.finally(() => {
        // Performance monitoring disabled
        // const _duration = performance.now() - start;
        // console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      });
    } else {
      // Handle sync functions
      // Performance monitoring disabled
      // const _duration = performance.now() - start;
      // console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    }
  }) as T;
};

/**
 * Development helper - log all feature flags to console
 */
export const _logFeatureFlags = (): void => {
  const _isDevelopment = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'));
  if (isDevelopment) {
    const _flags = getFeatureFlags();
    console.table(flags);
  }
};

// Auto-log feature flags in development
const _isDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname.includes('dev'));
if (isDev) {
  setTimeout(logFeatureFlags, 1000);
}
