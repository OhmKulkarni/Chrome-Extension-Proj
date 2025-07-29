// Simplified background script for testing
console.log('✅ Main extension background worker started');

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Main extension installed successfully');
  
  // Set complete network interception settings matching the UI structure
  chrome.storage.sync.set({
    extensionSettings: {
      notifications: true,
      autoSync: true,
      theme: 'system',
      language: 'en',
      updateFrequency: 5,
      privacyMode: false,
      dataCollection: true,
      networkInterception: {
        enabled: true,
        domainFilter: 'current-tab',
        customDomains: [],
        bodyCapture: {
          mode: 'partial',
          captureRequests: false,
          captureResponses: false,
        },
        privacy: {
          autoRedact: true,
        },
      },
    }
  }, () => {
    console.log('✅ Complete extension settings saved');
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('📨 Background received message:', request);
  
  if (request.action === 'getNetworkData') {
    // For now, return mock data
    sendResponse({
      success: true,
      data: {
        requests: [],
        totalRequests: 0,
        totalSize: 0,
        uniqueDomains: 0
      }
    });
  }
  
  return true; // Keep message channel open
});
