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
  function tryAppendStyle() {
    if (document.head) {
      console.log('[Web App Monitor] Appending style to head:', style);
      document.head.appendChild(style);
    } else {
      console.warn('[Web App Monitor] document.head not found, retrying style injection...');
      setTimeout(tryAppendStyle, 100);
    }
  }
  tryAppendStyle();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize(): void {
  console.log('Content script initialized');
  // Only run if DOM is interactive or complete
  if (document.readyState !== 'interactive' && document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
    return;
  }
  injectStyles();
  console.log('[Web App Monitor] Calling chrome.storage.sync.get for extensionEnabled');
  try {
    chrome.storage.sync.get(['extensionEnabled'], (result: StorageResult) => {
      try {
        console.log('[Web App Monitor] chrome.storage.sync.get result:', result);
        if (result.extensionEnabled !== false) {
          injectExtensionFeatures();
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Extension context invalidated')) {
          console.warn('[Web App Monitor] Extension context invalidated during storage.get:', err);
        } else {
          console.error('[Web App Monitor] Error in storage.get callback:', err);
        }
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Extension context invalidated')) {
      console.warn('[Web App Monitor] Extension context invalidated during storage.get:', err);
    } else {
      console.error('[Web App Monitor] Error calling chrome.storage.sync.get:', err);
    }
  }
}

function injectExtensionFeatures(): void {
  try {
    createFloatingButton();
  } catch (err) {
    if (err instanceof Error && err.message.includes('Extension context invalidated')) {
      console.warn('[Web App Monitor] Extension context invalidated during feature injection:', err);
    } else {
      console.error('[Web App Monitor] Error injecting features:', err);
    }
  }
}

// --- SPA/Gmail navigation and MutationObserver support ---
let lastUrl = location.href;
let observer: MutationObserver | null = null;

function reinjectOnNavigation() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('[Web App Monitor] Detected navigation, re-initializing content script.');
    cleanupInjectedUI();
    initialize();
  }
}

function observeUrlChanges() {
  // Listen for pushState/popstate (SPA navigation)
  window.addEventListener('popstate', reinjectOnNavigation);
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args as any);
    reinjectOnNavigation();
  };
}

function observeDomChanges() {
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    // For Gmail, look for major DOM changes
    if (location.href !== lastUrl) {
      reinjectOnNavigation();
    }
    // Optionally, check for loss of injected UI and re-inject
    if (!document.getElementById('extension-floating-button')) {
      console.log('[Web App Monitor] Floating button missing, re-injecting.');
      injectExtensionFeatures();
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
}

function cleanupInjectedUI() {
  // Remove floating button if present
  const btn = document.getElementById('extension-floating-button');
  if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  // Remove styles if present
  const style = document.getElementById('extension-content-styles');
  if (style && style.parentNode) style.parentNode.removeChild(style);
}

// --- Patch sendMessage to retry on context invalidation ---
function safeSendMessage(message: any, responseCallback?: (response: any) => void, retries = 1) {
  try {
    chrome.runtime.sendMessage(message, responseCallback);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Extension context invalidated') && retries > 0) {
      console.warn('[Web App Monitor] sendMessage context invalidated, retrying...');
      setTimeout(() => safeSendMessage(message, responseCallback, retries - 1), 300);
    } else {
      let errorMsg = 'Unknown error';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMsg = (err as any).message;
      }
      console.error('[Web App Monitor] Error in sendMessage:', err);
      if (responseCallback) responseCallback({ error: errorMsg });
    }
  }
}

// --- Patch floating button to use safeSendMessage ---
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
  try {
    button.addEventListener('click', () => {
      safeSendMessage({ action: 'openDashboard' });
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Extension context invalidated')) {
      console.warn('[Web App Monitor] Extension context invalidated during button event:', err);
    } else {
      console.error('[Web App Monitor] Error adding button event:', err);
    }
  }
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
    // Log a warning if body never appears
    setTimeout(() => {
      if (!document.body && !document.getElementById('extension-floating-button')) {
        console.warn('[Web App Monitor] document.body not found, floating button not injected.');
      }
    }, 5000);
  }
}

// --- Initialization patch ---
function fullInit() {
  initialize();
  observeUrlChanges();
  observeDomChanges();
}

fullInit();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request: MessageRequest, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  try {
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
  } catch (err) {
    if (err instanceof Error && err.message.includes('Extension context invalidated')) {
      console.warn('[Web App Monitor] Extension context invalidated during onMessage:', err);
    } else {
      console.error('[Web App Monitor] Error in onMessage listener:', err);
    }
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