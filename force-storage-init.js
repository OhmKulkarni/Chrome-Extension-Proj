// Force storage initialization script
// Run this in the browser console on any page to force proper storage initialization

const defaultSettings = {
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
      defaultState: 'active'
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
      enabled: true, // THIS IS THE KEY VALUE
      defaultState: 'paused'
    }
  },
  tokenLogging: {
    enabled: true,
    tabSpecific: {
      enabled: true,
      defaultState: 'paused'
    }
  },
};

console.log('🔧 Force initializing storage with correct settings...');
chrome.storage.local.set({ settings: defaultSettings }, () => {
  console.log('✅ Storage initialized with settings:', defaultSettings);
  console.log('✅ Error logging tab-specific enabled:', defaultSettings.errorLogging.tabSpecific.enabled);
});
