/**
 * Standardized size calculation utilities for network requests
 * Ensures consistent size data usage across all components
 */

export interface NetworkRequestWithSize {
  // Database size fields (snake_case)
  payload_size?: number;
  request_size?: number;
  response_size?: number;

  // JavaScript size fields (camelCase)
  requestSize?: number;
  responseSize?: number;

  // Body content (for fallback estimation) - flexible types
  requestBody?: string | object;
  request_body?: string | object;
  responseBody?: string | object;
  response_body?: string | object;

  // Headers (for additional size estimation)
  headers?: string | object;
}

/**
 * Get standardized size from a network request
 * Uses consistent priority order for size calculation:
 * 1. payload_size (most reliable from database)
 * 2. request_size + response_size (calculated totals)
 * 3. body content estimation (fallback)
 */
export function getStandardizedSize(req: NetworkRequestWithSize): number {
  // Priority 1: Use payload_size if available (most reliable from database)
  if (req.payload_size && req.payload_size > 0) {
    return req.payload_size;
  }

  // Priority 2: Calculate from separate size fields (try both naming conventions)
  const requestSize = req.requestSize || req.request_size || 0;
  const responseSize = req.responseSize || req.response_size || 0;
  const totalSize = requestSize + responseSize;

  if (totalSize > 0) {
    return totalSize;
  }

  // Priority 3: Estimate from body content if available
  let estimatedSize = 0;
  const requestBody = req.requestBody || req.request_body;
  const responseBody = req.responseBody || req.response_body;

  if (requestBody && typeof requestBody === 'string') {
    estimatedSize += new Blob([requestBody]).size;
  }
  if (responseBody && typeof responseBody === 'string') {
    estimatedSize += new Blob([responseBody]).size;
  }

  return estimatedSize;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Parse size value from various formats to number
 */
export function parseSize(value: any): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

/**
 * Get size breakdown from a network request
 * Returns detailed size information for debugging/display
 */
export function getSizeBreakdown(req: NetworkRequestWithSize): {
  payloadSize: number;
  requestSize: number;
  responseSize: number;
  totalCalculated: number;
  estimatedFromBody: number;
  standardizedSize: number;
  source: 'payload_size' | 'calculated' | 'estimated' | 'none';
} {
  const payloadSize = parseSize(req.payload_size);
  const requestSize = parseSize(req.requestSize || req.request_size);
  const responseSize = parseSize(req.responseSize || req.response_size);
  const totalCalculated = requestSize + responseSize;

  // Estimate from body content
  let estimatedFromBody = 0;
  const requestBody = req.requestBody || req.request_body;
  const responseBody = req.responseBody || req.response_body;

  if (requestBody && typeof requestBody === 'string') {
    estimatedFromBody += new Blob([requestBody]).size;
  }
  if (responseBody && typeof responseBody === 'string') {
    estimatedFromBody += new Blob([responseBody]).size;
  }

  const standardizedSize = getStandardizedSize(req);

  let source: 'payload_size' | 'calculated' | 'estimated' | 'none' = 'none';
  if (payloadSize > 0) {
    source = 'payload_size';
  } else if (totalCalculated > 0) {
    source = 'calculated';
  } else if (estimatedFromBody > 0) {
    source = 'estimated';
  }

  return {
    payloadSize,
    requestSize,
    responseSize,
    totalCalculated,
    estimatedFromBody,
    standardizedSize,
    source
  };
}
