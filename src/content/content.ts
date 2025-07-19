// src/content/content.ts
console.log('Content script loaded on:', window.location.href);

// Type definitions for better IDE support
interface StorageResult {
  extensionEnabled?: boolean;
}

interface MessageRequest {
  action: string;
  selector?: string;
}

// Inject CSS styles
function injectStyles(): void {
  const styleId = 'extension-content-styles';
  
  // Check if styles already injected
  if (document.getElementById(styleId)) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .extension-floating-button {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      border: none;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .extension-floating-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }

    .extension-highlight {
      outline: 3px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
  `;
  
  document.head.appendChild(style);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize(): void {
  console.log('Content script initialized');
  
  // Inject CSS first
  injectStyles();
  
  // Check if extension is enabled
  chrome.storage.sync.get(['extensionEnabled'], (result: StorageResult) => {
    if (result.extensionEnabled !== false) { // Default to true if not set
      injectExtensionFeatures();
    }
  });
}

function injectExtensionFeatures(): void {
  console.log('Extension features injected');
  createFloatingButton();
}

function createFloatingButton(): void {
  // Check if button already exists
  if (document.getElementById('extension-floating-button')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'extension-floating-button';
  button.className = 'extension-floating-button';
  button.innerHTML = '🔧';
  button.title = 'Open Extension Dashboard';
  
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openDashboard' });
  });
  
  // Add to body, but wait for body to exist
  if (document.body) {
    document.body.appendChild(button);
  } else {
    // If body doesn't exist yet, wait for it
    const observer = new MutationObserver(() => {
      if (document.body) {
        document.body.appendChild(button);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request: MessageRequest, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  console.log('Content script received message:', request);
  
  switch (request.action) {
    case 'highlightElement':
      if (request.selector) {
        highlightElement(request.selector);
      }
      sendResponse({ success: true });
      break;
    case 'removeHighlight':
      removeHighlight();
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

function highlightElement(selector: string): void {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.add('extension-highlight');
  }
}

function removeHighlight(): void {
  const elements = document.querySelectorAll('.extension-highlight');
  elements.forEach(el => el.classList.remove('extension-highlight'));
}

// Export empty object to make this a module
export {};