/**
 * Modular Background Script Entry Point
 *
 * This file serves as the entry point for our modular architecture.
 * It imports and initializes the BackgroundController which orchestrates
 * all 7 specialized modules following the exact pattern from the working legacy version.
 */

import { BackgroundController } from './background-controller';

console.log('🚀 Modular background service worker started');

// MEMORY LEAK FIX: Guard against duplicate listener registration (FROM LEGACY)
let listenersRegistered = false;

// CRITICAL: Register listeners immediately using the EXACT pattern from the working legacy version
if (!listenersRegistered) {
  console.log('📬 Registering immediate listeners (legacy pattern)...');

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Wrap everything in async IIFE to properly handle service worker async operations (FROM LEGACY)
    (async () => {
      try {
        console.log('📬 BACKGROUND: Message received:', message.action || message.type);

        switch (message.action || message.type) {
          case 'ping':
            sendResponse({ success: true, message: 'Modular background service worker is active' });
            break;

          default:
            // Let the modular system handle other messages once initialized
            sendResponse({ success: false, error: 'Message type not handled by immediate listener' });
        }
      } catch (error) {
        console.error('❌ Error in immediate message handler:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();

    // Return true to indicate we'll respond asynchronously (FROM LEGACY)
    return true;
  });

  // Add startup ping to keep service worker active (FROM LEGACY)
  chrome.runtime.onStartup.addListener(() => {
    console.log('🔄 Extension startup detected');
  });

  chrome.runtime.onInstalled.addListener(() => {
    console.log('🎉 Extension installed/updated');
  });

  // Handle service worker suspension with proper cleanup (FROM LEGACY)
  chrome.runtime.onSuspend.addListener(() => {
    console.log('� Service worker suspending, cleaning up resources...');
  });

  // Handle suspension canceled (FROM LEGACY)
  chrome.runtime.onSuspendCanceled.addListener(() => {
    console.log('� Service worker suspension canceled');
  });

  // MEMORY LEAK FIX: Mark all listeners as registered (FROM LEGACY)
  listenersRegistered = true;
}

// Initialize the modular background controller
const backgroundController = new BackgroundController();

// Start the initialization process
backgroundController.initialize().catch((error) => {
  console.error('❌ Failed to initialize modular background:', error);

  // Attempt recovery after delay
  setTimeout(() => {
    console.log('🔄 Attempting background script recovery...');
    backgroundController.initialize().catch((retryError) => {
      console.error('❌ Background script recovery failed:', retryError);
    });
  }, 5000);
});

// Cleanup on service worker shutdown
self.addEventListener('beforeunload', () => {
  console.log('🧹 Background service worker shutting down...');
  backgroundController.cleanup();
});

// Export for debugging (available in Chrome DevTools)
(globalThis as any).backgroundController = backgroundController;

console.log('✅ Modular background entry point loaded successfully');
