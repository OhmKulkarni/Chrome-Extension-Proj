// Quick test script to verify noise filtering patterns
console.log('🧪 Testing noise filtering patterns...');

// Copy the isNoiseRequest function from background.ts for testing
function isNoiseRequest(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    console.log('🔍 NOISE-FILTER: Checking URL:', url, 'hostname:', hostname, 'path:', pathname);
    
    // Common telemetry and tracking domains
    const noiseDomains = [
      'edge.sdk.awswaf.com',        // AWS WAF telemetry
      'waf.amazonaws.com',          // AWS WAF (broader pattern)
      'googleapis.com/pagespeedonline', // Google PageSpeed
      'googletagmanager.com',       // Google Tag Manager
      'google-analytics.com',       // Google Analytics
      'doubleclick.net',            // Google Ads
      'facebook.com/tr',            // Facebook Pixel
      'connect.facebook.net',       // Facebook Connect
      'hotjar.com',                 // Hotjar tracking
      'fullstory.com',              // FullStory tracking
      'intercom.io',                // Intercom tracking
      'mixpanel.com',               // Mixpanel analytics
      'segment.com',                // Segment analytics
      'amplitude.com',              // Amplitude analytics
      'bugsnag.com',                // Error tracking
      'sentry.io',                  // Error tracking
      'rollbar.com',                // Error tracking
      'newrelic.com',               // Performance monitoring
      'datadog.com',                // Performance monitoring
      'telemetry.mozilla.org',      // Mozilla telemetry
      'stats.wp.com',               // WordPress stats
      'quantcast.com',              // Quantcast tracking
      'scorecardresearch.com'       // ComScore tracking
    ];
    
    // Common telemetry paths
    const noisePaths = [
      '/telemetry',
      '/analytics',
      '/tracking',
      '/beacon',
      '/collect',
      '/pixel',
      '/impression',
      '/event',
      '/health',
      '/healthcheck',
      '/ping',
      '/stats',
      '/metrics'
    ];
    
    // Check if hostname matches any noise domains
    const domainMatch = noiseDomains.some(domain => hostname.includes(domain));
    if (domainMatch) {
      console.log('🔇 NOISE-FILTER: Domain match, filtering:', hostname);
      return true;
    }
    
    // Check if path matches any noise patterns
    const pathMatch = noisePaths.some(path => pathname.includes(path));
    if (pathMatch) {
      console.log('🔇 NOISE-FILTER: Path match, filtering:', pathname);
      return true;
    }
    
    // Filter out common tracking query parameters
    if (urlObj.search.includes('utm_') || urlObj.search.includes('fbclid') || urlObj.search.includes('gclid')) {
      return true;
    }
    
    return false;
  } catch (error) {
    // If URL parsing fails, don't filter it out
    return false;
  }
}

// Test cases
const testUrls = [
  // Should be filtered (noise)
  'https://edge.sdk.awswaf.com/collect',
  'https://waf.amazonaws.com/health',
  'https://www.google-analytics.com/collect',
  'https://connect.facebook.net/en_US/fbevents.js',
  'https://cdn.example.com/health',
  'https://telemetry.mozilla.org/submit',
  'https://any-domain.com/analytics',
  'https://any-domain.com/beacon',
  
  // Should NOT be filtered (legitimate)
  'https://jsonplaceholder.typicode.com/posts/1',
  'https://api.github.com/users/octocat',
  'https://httpbin.org/get',
  'https://example.com/api/data'
];

console.log('\n=== TESTING NOISE FILTERING ===');
testUrls.forEach(url => {
  const isNoise = isNoiseRequest(url);
  console.log(`${isNoise ? '🔇 FILTERED' : '✅ ALLOWED'}: ${url}`);
});

console.log('\n=== TEST COMPLETE ===');
