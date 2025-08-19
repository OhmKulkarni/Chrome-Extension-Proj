// Test version of background.ts using ServiceWorkerBackgroundController
import { ServiceWorkerBackgroundController } from './service-worker-background-controller';

console.log('🚀 Service Worker Background starting with ServiceWorkerBackgroundController...');

let controller: ServiceWorkerBackgroundController | null = null;
let isInitialized = false;

async function initializeController() {
  if (isInitialized) return;

  try {
    console.log('🎯 Initializing ServiceWorkerBackgroundController...');
    controller = new ServiceWorkerBackgroundController();
    await controller.initialize();
    isInitialized = true;
    console.log('✅ ServiceWorkerBackgroundController initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize ServiceWorkerBackgroundController:', error);
  }
}

// Message listener
if (!chrome.runtime.onMessage.hasListener(handleMessage)) {
  chrome.runtime.onMessage.addListener(handleMessage);
}

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<boolean> {
  console.log('📨 Background received message:', message.action, 'from:', sender.tab?.url);

  try {
    // Initialize controller if not already done
    if (!controller || !isInitialized) {
      await initializeController();
    }

    // Let the controller handle the message
    if (controller && isInitialized) {
      const response = await controller.handleMessage(message, sender);
      sendResponse(response);
    } else {
      sendResponse({ success: false, error: 'Controller not initialized' });
    }

    return true; // Keep the message channel open for async response
  } catch (error) {
    console.error('❌ Error handling message:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
    return true;
  }
}

// Install listener
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  await initializeController();
});

// Startup listener
chrome.runtime.onStartup.addListener(async () => {
  console.log('🌅 Extension startup');
  await initializeController();
});

// Initialize immediately
initializeController().catch(error => {
  console.error('❌ Failed to initialize controller on startup:', error);
});

console.log('🎉 Background script setup complete with ServiceWorkerBackgroundController');
