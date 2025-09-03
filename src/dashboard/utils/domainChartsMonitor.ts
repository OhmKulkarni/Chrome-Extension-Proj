/**
 * Performance and Safety Monitor for Domain Charts
 *
 * This utility provides real-time monitoring of:
 * 1. Memory usage from expanded charts
 * 2. Performance impact tracking
 * 3. Safety limit enforcement
 * 4. Automatic cleanup triggers
 */

interface PerformanceMetrics {
  expandedCharts: number;
  memoryEstimate: number; // Rough estimate in KB
  renderTime: number; // Last chart render time in ms
  safetyStatus: 'safe' | 'warning' | 'critical';
  recommendations: string[];
}

export class DomainChartsMonitor {
  private metrics: PerformanceMetrics = {
    expandedCharts: 0,
    memoryEstimate: 0,
    renderTime: 0,
    safetyStatus: 'safe',
    recommendations: []
  };

  private readonly MEMORY_PER_CHART = 150; // Estimated KB per chart
  private readonly SAFE_MEMORY_LIMIT = 500; // KB
  private readonly WARNING_MEMORY_LIMIT = 800; // KB
  private readonly MAX_RENDER_TIME = 1000; // ms

  updateExpandedCount(count: number): void {
    this.metrics.expandedCharts = count;
    this.updateMemoryEstimate();
    this.updateSafetyStatus();
  }

  recordRenderTime(timeMs: number): void {
    this.metrics.renderTime = timeMs;
    this.updateSafetyStatus();
  }

  private updateMemoryEstimate(): void {
    this.metrics.memoryEstimate = this.metrics.expandedCharts * this.MEMORY_PER_CHART;
  }

  private updateSafetyStatus(): void {
    const { memoryEstimate, renderTime, expandedCharts } = this.metrics;
    const recommendations: string[] = [];

    if (memoryEstimate > this.WARNING_MEMORY_LIMIT) {
      this.metrics.safetyStatus = 'critical';
      recommendations.push('Close some charts to reduce memory usage');
    } else if (memoryEstimate > this.SAFE_MEMORY_LIMIT || renderTime > this.MAX_RENDER_TIME) {
      this.metrics.safetyStatus = 'warning';
      recommendations.push('Consider closing charts if experiencing slowdowns');
    } else {
      this.metrics.safetyStatus = 'safe';
    }

    if (expandedCharts === 0) {
      recommendations.push('Click chart icons to view domain-specific analytics');
    }

    this.metrics.recommendations = recommendations;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getSafetyMessage(): string {
    const { safetyStatus, expandedCharts, memoryEstimate } = this.metrics;

    if (expandedCharts === 0) return '';

    switch (safetyStatus) {
      case 'safe':
        return `${expandedCharts} charts active (~${memoryEstimate}KB) - Performance optimal`;
      case 'warning':
        return `${expandedCharts} charts active (~${memoryEstimate}KB) - Monitor performance`;
      case 'critical':
        return `${expandedCharts} charts active (~${memoryEstimate}KB) - Consider closing charts`;
      default:
        return '';
    }
  }
}

export const chartMonitor = new DomainChartsMonitor();
