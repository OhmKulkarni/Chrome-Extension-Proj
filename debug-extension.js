// Debug helper for extension runtime debugging
console.log('🔧 DEBUG HELPER: Loaded');

// Function to check current extension settings
async function debugExtensionSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    const networkConfig = settings.networkInterception || {};
    
    console.log('🔧 DEBUG: Current extension settings:');
    console.log('📊 Full settings object:', JSON.stringify(settings, null, 2));
    console.log('🌐 Network config:', JSON.stringify(networkConfig, null, 2));
    console.log('🔇 Noise filtering enabled:', networkConfig.privacy?.filterNoise);
    console.log('📋 Tab-specific enabled:', networkConfig.tabSpecific?.enabled);
    console.log('⏸️ Tab default state:', networkConfig.tabSpecific?.defaultState);
    
    return settings;
  } catch (error) {
    console.error('🔧 DEBUG: Error getting settings:', error);
  }
}

// Function to check tab states
async function debugTabStates() {
  try {
    const tabs = await chrome.tabs.query({});
    console.log('🔧 DEBUG: Checking tab states...');
    
    for (const tab of tabs) {
      if (tab.id) {
        const result = await chrome.storage.local.get([`tabLogging_${tab.id}`]);
        const tabState = result[`tabLogging_${tab.id}`];
        console.log(`📑 Tab ${tab.id} (${tab.url}):`, tabState);
      }
    }
  } catch (error) {
    console.error('🔧 DEBUG: Error getting tab states:', error);
  }
}

// Function to manually test noise filtering
function debugNoiseFiltering(url) {
  // This should match the background script logic
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    const noiseDomains = [
      'edge.sdk.awswaf.com',
      'waf.amazonaws.com',
      'googletagmanager.com',
      'google-analytics.com',
      'doubleclick.net',
      'facebook.com/tr',
      'connect.facebook.net',
      'hotjar.com',
      'fullstory.com',
      'intercom.io',
      'mixpanel.com',
      'segment.com',
      'amplitude.com',
      'bugsnag.com',
      'sentry.io',
      'rollbar.com',
      'newrelic.com',
      'datadog.com',
      'telemetry.mozilla.org',
      'stats.wp.com',
      'quantcast.com',
      'scorecardresearch.com'
    ];
    
    const noisePaths = [
      '/telemetry', '/analytics', '/tracking', '/beacon', '/collect',
      '/pixel', '/impression', '/event', '/health', '/healthcheck',
      '/ping', '/stats', '/metrics'
    ];
    
    const domainMatch = noiseDomains.some(domain => hostname.includes(domain));
    const pathMatch = noisePaths.some(path => pathname.includes(path));
    const queryMatch = urlObj.search.includes('utm_') || urlObj.search.includes('fbclid') || urlObj.search.includes('gclid');
    
    console.log(`🔧 DEBUG: Noise filtering for ${url}:`);
    console.log(`  Hostname: ${hostname}`);
    console.log(`  Path: ${pathname}`);
    console.log(`  Domain match: ${domainMatch}`);
    console.log(`  Path match: ${pathMatch}`);
    console.log(`  Query match: ${queryMatch}`);
    console.log(`  Final result: ${domainMatch || pathMatch || queryMatch ? 'FILTERED' : 'ALLOWED'}`);
    
    return domainMatch || pathMatch || queryMatch;
  } catch (error) {
    console.error('🔧 DEBUG: Error in noise filtering:', error);
    return false;
  }
}

// Make functions globally available
window.debugExtensionSettings = debugExtensionSettings;
window.debugTabStates = debugTabStates;
window.debugNoiseFiltering = debugNoiseFiltering;

console.log('🔧 DEBUG HELPER: Functions available:');
console.log('  - debugExtensionSettings() - Check current settings');
console.log('  - debugTabStates() - Check all tab logging states');
console.log('  - debugNoiseFiltering(url) - Test noise filtering for a URL');
console.log('');
console.log('🔧 Run debugExtensionSettings() to start debugging!');
