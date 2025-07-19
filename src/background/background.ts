// src/background/background.ts
console.log('Background service worker started');

// Type definitions
interface TabInfo {
  url?: string;
  title?: string;
  error?: string;
}

interface MessageRequest {
  action: string;
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('Extension installed:', details.reason);
  
  // Initialize default settings
  chrome.storage.sync.set({
    extensionEnabled: true,
    lastInstalled: Date.now()
  }).catch((error: Error) => {
    console.error('Error setting initial storage:', error);
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    
    // Update last activity timestamp
    chrome.storage.sync.set({
      lastActivity: Date.now()
    }).catch((error: Error) => {
      console.error('Error updating last activity:', error);
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((
  request: MessageRequest, 
  _sender: chrome.runtime.MessageSender, 
  sendResponse: (response: TabInfo | { error: string }) => void
) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'getTabInfo':
      handleGetTabInfo(sendResponse);
      return true; // Will respond asynchronously
      
    case 'openDashboard':
      handleOpenDashboard(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
      return false;
  }
});

function handleGetTabInfo(sendResponse: (response: TabInfo) => void): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      sendResponse({ error: 'Failed to get tab info' });
      return;
    }
    
    if (tabs[0]) {
      sendResponse({ 
        url: tabs[0].url, 
        title: tabs[0].title 
      });
    } else {
      sendResponse({ error: 'No active tab found' });
    }
  });
}

function handleOpenDashboard(sendResponse: (response: { error?: string }) => void): void {
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/dashboard/dashboard.html')
  }).then(() => {
    sendResponse({});
  }).catch((error: Error) => {
    console.error('Error opening dashboard:', error);
    sendResponse({ error: 'Failed to open dashboard' });
  });
}

// Storage change listener
chrome.storage.onChanged.addListener((changes: {[key: string]: chrome.storage.StorageChange}, namespace: string) => {
  console.log('Storage changed in', namespace, ':', changes);
});

// Export empty object to make this a module
export {};