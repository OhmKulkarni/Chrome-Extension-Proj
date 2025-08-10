// Force update extension settings
// Run this in Chrome DevTools console on the extension's background page

console.log('=== FORCING SETTINGS UPDATE ===');

const correctSettings = {
  notifications: true,
  autoSync: true,
  theme: 'system',
  language: 'en',
  updateFrequency: 5,
  privacyMode: false,
  dataCollection: true,
  networkInterception: {
    enabled: true,
    bodyCapture: {
      mode: 'partial',
      captureRequests: false,
      captureResponses: false,
    },
    privacy: {
      autoRedact: true,
      filterNoise: true,
    },
    urlPatterns: {
      enabled: false,
      patterns: []
    },
    tabSpecific: {
      enabled: true,
      defaultState: 'paused'
    },
    requestFilters: {
      enabled: false,
      filters: []
    },
    profiles: []
  },
  errorLogging: {
    enabled: true,
    severityFilter: {
      enabled: false,
      allowed: ['error', 'warn', 'info']
    },
    tabSpecific: {
      enabled: true,  // THIS MUST BE TRUE
      defaultState: 'paused'
    }
  },
  tokenLogging: {
    enabled: true,
    tabSpecific: {
      enabled: true,
      defaultState: 'paused'
    }
  }
};

chrome.storage.local.set({ settings: correctSettings }, () => {
  console.log('✅ Settings force-updated');
  console.log('📝 Error logging tab-specific enabled:', correctSettings.errorLogging.tabSpecific.enabled);
  console.log('🔄 Please reload the popup to see the toggle');
});
