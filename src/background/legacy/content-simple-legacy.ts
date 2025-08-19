// // === EXTENSION CONTEXT VALIDATION ===
// // Check if extension context is still valid
// let extensionContextValid = true;

// // Development debug: Log when content script loads
// console.log('📦 CONTENT SCRIPT LOADED:', new Date().toISOString(), 'Context Fix v2');

// function isExtensionContextValid(): boolean {
//   try {
//     // Test if chrome.runtime is accessible
//     return !!chrome.runtime && !!chrome.runtime.id && extensionContextValid;
//   } catch (error) {
//     extensionContextValid = false;
//     return false;
//   }
// }

// // === EXTENSION STATE CHECK ===
// // PHASE 2: Check extension state FIRST before any initialization
// async function checkExtensionState(): Promise<boolean> {
//   if (!isExtensionContextValid()) {
//     console.log('🚫 CONTENT: Extension context invalid, skipping state check');
//     return false;
//   }

//   try {
//     // Get current tab ID
//     const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//     const tabId = tabResponse?.tabId;

//     // Get extension state from background
//     const stateResponse = await sendChromeMessage({
//       action: 'GET_EXTENSION_STATE',
//       tabId: tabId
//     });

//     const isEnabled = stateResponse?.enabled ?? true; // Default to enabled if unknown

//     // Send state to main world script
//     window.dispatchEvent(new CustomEvent('extensionStateChange', {
//       detail: { enabled: isEnabled }
//     }));

//     if (!isEnabled) {
//       console.log('🚫 CONTENT: Extension is disabled, skipping all initialization');
//       return false;
//     }

//     console.log('✅ CONTENT: Extension is enabled, proceeding with initialization');
//     return true;
//   } catch (error) {
//     console.log('⚠️ CONTENT: Failed to check extension state, defaulting to enabled:', error);
//     // Send enabled state to main world script as fallback
//     window.dispatchEvent(new CustomEvent('extensionStateChange', {
//       detail: { enabled: true }
//     }));
//     return true; // Default to enabled on error for backward compatibility
//   }
// }

// // Simplified content script focused on network interception
// // MEMORY OPTIMIZATION: Reduced logging to minimize tab memory usage

// // MEMORY LEAK FIX: Helper function to check main world script activity without Promise constructor leaks
// const checkMainWorldActive = async (): Promise<boolean> => {
//   const checkId = Math.random().toString(36);
//   let resolved = false;

//   return new Promise<boolean>((resolve) => {
//     const responseHandler = (event: any) => {
//       if (event.detail?.checkId === checkId && !resolved) {
//         resolved = true;
//         window.removeEventListener('mainWorldActiveResponse', responseHandler);
//         resolve(event.detail.isActive === true);
//       }
//     };

//     window.addEventListener('mainWorldActiveResponse', responseHandler);
//     window.dispatchEvent(new CustomEvent('checkMainWorldActive', { detail: { checkId } }));

//     // Cleanup timeout to prevent memory leaks
//     setTimeout(() => {
//       if (!resolved) {
//         resolved = true;
//         window.removeEventListener('mainWorldActiveResponse', responseHandler);
//         resolve(false);
//       }
//     }, 100);
//   });
// };

// // MEMORY LEAK FIX: Helper function for script loading without Promise constructor leaks
// const loadScriptPromise = async (script: HTMLScriptElement): Promise<boolean> => {
//   let resolved = false;

//   return new Promise<boolean>((resolve) => {
//     const onLoad = () => {
//       if (!resolved) {
//         resolved = true;
//         cleanup();
//         // MEMORY OPTIMIZATION: Reduce success logging
//         resolve(true);
//       }
//     };

//     const onError = (error: any) => {
//       if (!resolved) {
//         resolved = true;
//         cleanup();
//         // MEMORY OPTIMIZATION: Keep only critical error logging
//         console.log('❌ CONTENT: Web-accessible script failed to load:', error);
//         resolve(false);
//       }
//     };

//     const cleanup = () => {
//       script.removeEventListener('load', onLoad);
//       script.removeEventListener('error', onError);
//       script.remove(); // Clean up script element
//     };

//     script.addEventListener('load', onLoad);
//     script.addEventListener('error', onError);
//   });
// };

// // MEMORY LEAK FIX: Centralized Chrome message handler to prevent response accumulation
// const sendChromeMessage = async (message: any): Promise<any> => {
//   try {
//     const response = await chrome.runtime.sendMessage(message)
//     // Immediately copy and nullify response to prevent accumulation
//     const result = response ? { ...response } : null
//     return result
//   } catch (error) {
//     if (error instanceof Error && error.message.includes('Extension context invalidated')) {
//       console.warn('🔄 CONTENT: Extension context invalidated, content script needs refresh')
//       // Mark context as invalid to prevent further operations
//       extensionContextValid = false;
//       // The extension was reloaded/updated, content script context is stale
//       // We should gracefully stop operations and wait for page reload
//       return null
//     } else if (error instanceof Error && error.message.includes('Could not establish connection')) {
//       console.warn('⚠️ CONTENT: Background script not ready, retrying...')
//       // Retry once after a short delay
//       await new Promise(resolve => setTimeout(resolve, 100))
//       try {
//         const response = await chrome.runtime.sendMessage(message)
//         return response ? { ...response } : null
//       } catch (retryError) {
//         console.error('❌ CONTENT: Chrome message failed after retry:', retryError)
//         return null
//       }
//     } else {
//       console.error('❌ CONTENT: Chrome message failed:', error)
//       return null
//     }
//   }
// }

// // MEMORY OPTIMIZATION: Check if we're on a site that should be intercepted
// const isReddit = window.location.hostname.includes('reddit.com');

// // Check if extension should be active on this site
// async function shouldInterceptOnThisSite(): Promise<boolean> {
//   try {
//     // Get current settings from storage
//     const result = await chrome.storage.sync.get(['networkInterception', 'extensionEnabled']);
//     const networkSettings = result.networkInterception;

//     // MEMORY OPTIMIZATION: Reduce verbose logging

//     // Check if extension is globally disabled
//     if (result.extensionEnabled === false) {
//       return false;
//     }

//     // If network interception is completely disabled, don't inject
//     if (!networkSettings?.enabled) {
//       console.log('🔍 CONTENT: networkSettings:', networkSettings);

//       // If no settings exist at all, initialize with defaults and allow
//       if (!networkSettings) {
//         console.log('🔧 CONTENT: No network settings found, initializing defaults...');
//         const defaultNetworkSettings = {
//           enabled: true,
//           bodyCapture: {
//             mode: 'partial',
//             captureRequests: true,
//             captureResponses: true,
//             maxBodySize: 2000
//           },
//           privacy: {
//             autoRedact: true,
//             filterNoise: true
//           },
//           urlPatterns: {
//             enabled: false,
//             patterns: []
//           }
//         };

//         try {
//           await chrome.storage.sync.set({
//             networkInterception: defaultNetworkSettings,
//             extensionEnabled: true
//           });
//           console.log('✅ CONTENT: Default settings initialized, allowing interception');
//           // Continue with the function since we just enabled it
//         } catch (setError) {
//           console.log('❌ CONTENT: Failed to set default settings:', setError);
//           return false;
//         }
//       } else {
//         return false;
//       }
//     }

//     const hostname = window.location.hostname;
//     const currentUrl = window.location.href;

//     // Check tab-specific logging state from popup controls FIRST
//     // This should override URL pattern restrictions
//     try {
//       // MEMORY LEAK FIX: Use centralized handler instead of direct chrome.runtime.sendMessage
//       const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//       if (tabResponse?.tabId) {
//         const localResult = await chrome.storage.local.get([`tabLogging_${tabResponse.tabId}`]);
//         const tabLoggingState = localResult[`tabLogging_${tabResponse.tabId}`];

//         // If tab logging is explicitly disabled, don't intercept
//         if (tabLoggingState && tabLoggingState.status === 'inactive') {
//           console.log('🚫 CONTENT: Tab logging disabled via popup controls');
//           return false;
//         }

//         // If tab logging is explicitly enabled, allow regardless of URL patterns
//         if (tabLoggingState && tabLoggingState.status === 'active') {
//           console.log('✅ CONTENT: Tab logging enabled via popup controls, allowing interception');
//           console.log('✅ CONTENT: Tab logging state:', tabLoggingState);
//           return true;
//         }

//         console.log('✅ CONTENT: Tab logging state (default enabled):', tabLoggingState);
//       }
//     } catch (tabError) {
//       console.log('⚠️ CONTENT: Could not check tab logging state:', tabError);
//       // Continue with other checks if tab state unavailable
//     }

//     // Always allow on localhost and test domains for development
//     if (hostname.includes('localhost') ||
//         hostname.includes('127.0.0.1') ||
//         hostname.includes('httpbin.org') ||
//         hostname === '') {
//       console.log('✅ CONTENT: Development/test site allowed:', hostname);
//       return true;
//     }

//     // Check URL patterns if enabled
//     if (networkSettings?.urlPatterns?.enabled && networkSettings?.urlPatterns?.patterns) {
//       for (const pattern of networkSettings.urlPatterns.patterns) {
//         if (pattern.active) {
//           // Convert glob pattern to regex for matching
//           const regexPattern = pattern.pattern
//             .replace(/\*/g, '.*')
//             .replace(/\./g, '\\.');

//           const regex = new RegExp(regexPattern);

//           if (regex.test(currentUrl) || regex.test(hostname)) {
//             console.log('✅ CONTENT: URL matches enabled pattern:', pattern.pattern);
//             return true;
//           }
//         }
//       }
//     }

//     // Fallback: if no URL patterns are configured but network interception is enabled,
//     // allow on any site (this makes popup tab logging the primary control)
//     if (!networkSettings?.urlPatterns?.enabled ||
//         !networkSettings?.urlPatterns?.patterns?.length) {
//       console.log('✅ CONTENT: No URL patterns configured, allowing based on popup controls');
//       return true;
//     }

//     console.log('🚫 CONTENT: Site not enabled for interception:', hostname);
//     return false;

//   } catch (error) {
//     console.log('❌ CONTENT: Error checking site settings:', error);
//     // Fallback to conservative behavior - only allow known safe domains
//     const hostname = window.location.hostname;
//     return hostname.includes('localhost') ||
//            hostname.includes('127.0.0.1') ||
//            hostname.includes('httpbin.org');
//   }
// }

// // Track injection state
// let injectionAttempted = false;

// // MEMORY LEAK FIX: Store event handlers for cleanup
// const eventHandlers = {
//   settingsRequest: null as EventListener | null,
//   contentScriptRequest: null as EventListener | null,
//   networkIntercepted: null as EventListener | null,
//   consoleIntercepted: null as EventListener | null,
//   beforeUnload1: null as EventListener | null,
//   beforeUnload2: null as EventListener | null,
//   domContentLoaded: null as EventListener | null,
//   windowLoad: null as EventListener | null,
//   storageChange: null as ((changes: any, namespace: string) => void) | null,
//   runtimeMessage: null as ((message: any, sender: any, sendResponse: any) => boolean) | null,
//   windowMessage: null as ((event: MessageEvent) => void) | null
// };

// // MEMORY LEAK FIX: Cleanup function to remove all event listeners
// const cleanupEventListeners = () => {
//   if (eventHandlers.settingsRequest) {
//     window.removeEventListener('extensionRequestSettings', eventHandlers.settingsRequest);
//     eventHandlers.settingsRequest = null;
//   }
//   if (eventHandlers.contentScriptRequest) {
//     window.removeEventListener('contentScriptRequest', eventHandlers.contentScriptRequest);
//     eventHandlers.contentScriptRequest = null;
//   }
//   if (eventHandlers.networkIntercepted) {
//     window.removeEventListener('networkRequestIntercepted', eventHandlers.networkIntercepted);
//     eventHandlers.networkIntercepted = null;
//   }
//   if (eventHandlers.consoleIntercepted) {
//     window.removeEventListener('consoleErrorIntercepted', eventHandlers.consoleIntercepted);
//     eventHandlers.consoleIntercepted = null;
//   }
//   if (eventHandlers.beforeUnload1) {
//     window.removeEventListener('beforeunload', eventHandlers.beforeUnload1);
//     eventHandlers.beforeUnload1 = null;
//   }
//   if (eventHandlers.beforeUnload2) {
//     window.removeEventListener('beforeunload', eventHandlers.beforeUnload2);
//     eventHandlers.beforeUnload2 = null;
//   }
//   if (eventHandlers.domContentLoaded) {
//     document.removeEventListener('DOMContentLoaded', eventHandlers.domContentLoaded);
//     eventHandlers.domContentLoaded = null;
//   }
//   if (eventHandlers.windowLoad) {
//     window.removeEventListener('load', eventHandlers.windowLoad);
//     eventHandlers.windowLoad = null;
//   }
//   if (eventHandlers.storageChange) {
//     chrome.storage.onChanged.removeListener(eventHandlers.storageChange);
//     eventHandlers.storageChange = null;
//   }
//   if (eventHandlers.runtimeMessage) {
//     chrome.runtime.onMessage.removeListener(eventHandlers.runtimeMessage);
//     eventHandlers.runtimeMessage = null;
//   }
//   if (eventHandlers.windowMessage) {
//     window.removeEventListener('message', eventHandlers.windowMessage);
//     eventHandlers.windowMessage = null;
//   }
// };

// // Listen for settings requests from main-world script
// eventHandlers.settingsRequest = async () => {
//   try {
//     // Use local storage for consistency with background script
//     const result = await chrome.storage.local.get(['settings']);
//     const settings = result.settings?.networkInterception || { bodyCapture: { maxBodySize: 2000 } };

//     window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
//       detail: { networkInterception: settings }
//     }));

//     console.log('🌍 CONTENT: Settings sent to main-world script:', settings);
//   } catch (error) {
//     console.log('❌ CONTENT: Could not get settings:', error);
//     // Send default settings
//     window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
//       detail: { networkInterception: { bodyCapture: { maxBodySize: 2000 } } }
//     }));
//   }
// };

// // Add the event listener
// window.addEventListener('extensionRequestSettings', eventHandlers.settingsRequest);

// // Add handler for requests from main-world script
// eventHandlers.contentScriptRequest = async (event: Event) => {
//   const customEvent = event as CustomEvent;
//   const { action, requestId } = customEvent.detail;
//   let response = null;

//   console.log('📨 CONTENT: Received request from main-world:', action, 'ID:', requestId);

//   try {
//     switch (action) {
//       case 'checkNetworkLogging':
//         console.log('📨 CONTENT: Processing checkNetworkLogging request...');
//         const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//         const tabId = tabResponse?.tabId;
//         console.log('📨 CONTENT: Current tab ID:', tabId);

//         if (tabId) {
//           const result = await chrome.storage.local.get([`tabLogging_${tabId}`, 'extensionEnabled']);
//           const globalEnabled = result.extensionEnabled !== false;
//           const tabLogging = result[`tabLogging_${tabId}`];
//           const tabEnabled = !tabLogging || tabLogging.status === 'active';

//           console.log('📨 CONTENT: Network logging state - Global:', globalEnabled, 'Tab:', tabEnabled, 'TabLogging:', tabLogging);
//           response = { enabled: globalEnabled && tabEnabled };
//         } else {
//           console.log('📨 CONTENT: No tab ID available, returning false');
//           response = { enabled: false };
//         }
//         break;

//       case 'checkConsoleLogging':
//         console.log('📨 CONTENT: Processing checkConsoleLogging request...');
//         const currentTabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//         const currentTabId = currentTabResponse?.tabId;
//         console.log('📨 CONTENT: Current tab ID for console:', currentTabId);

//         if (currentTabId) {
//           const result = await chrome.storage.local.get([
//             `tabLogging_${currentTabId}`,
//             'extensionEnabled',
//             'settings'
//           ]);

//           const globalEnabled = result.extensionEnabled !== false;
//           const tabLogging = result[`tabLogging_${currentTabId}`];
//           const tabEnabled = !tabLogging || tabLogging.status === 'active';

//           console.log('📨 CONTENT: Console logging state - Global:', globalEnabled, 'Tab:', tabEnabled);
//           response = { enabled: globalEnabled && tabEnabled };
//         } else {
//           console.log('📨 CONTENT: No tab ID available for console, returning false');
//           response = { enabled: false };
//         }
//         break;

//       case 'checkConsoleSeverity':
//         console.log('📨 CONTENT: Processing checkConsoleSeverity request for:', customEvent.detail.data?.severity);
//         const severity = customEvent.detail.data?.severity || 'error';

//         const tabIdResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//         const tabIdForSeverity = tabIdResponse?.tabId;

//         if (tabIdForSeverity) {
//           const result = await chrome.storage.local.get([
//             `tabLogging_${tabIdForSeverity}`,
//             'extensionEnabled',
//             'settings'
//           ]);

//           const globalEnabled = result.extensionEnabled !== false;
//           const tabLogging = result[`tabLogging_${tabIdForSeverity}`];
//           const tabEnabled = !tabLogging || tabLogging.status === 'active';

//           // Check severity filter
//           let severityAllowed = true;
//           if (result.settings?.errorLogging?.severityFilter?.enabled) {
//             const allowedSeverities = result.settings.errorLogging.severityFilter.allowed || [];
//             severityAllowed = allowedSeverities.includes(severity);
//           }

//           console.log('📨 CONTENT: Console severity check - Global:', globalEnabled, 'Tab:', tabEnabled, 'SeverityAllowed:', severityAllowed);
//           response = { enabled: globalEnabled && tabEnabled && severityAllowed };
//         } else {
//           console.log('📨 CONTENT: No tab ID available for severity check, returning false');
//           response = { enabled: false };
//         }
//         break;

//       default:
//         console.log('📨 CONTENT: Unknown action:', action);
//         response = { error: 'Unknown action' };
//     }
//   } catch (error) {
//     console.log('❌ CONTENT: Error handling content script request:', error);
//     response = { error: String(error) };
//   }

//   console.log('📨 CONTENT: Sending response for', action, ':', response);

//   // Send response back to main-world script
//   window.dispatchEvent(new CustomEvent('contentScriptResponse', {
//     detail: { requestId, response }
//   }));
// };

// window.addEventListener('contentScriptRequest', eventHandlers.contentScriptRequest);

// // ENHANCED MAIN-WORLD COMMUNICATION HANDLER
// // Handles both network requests and console errors from main-world script
// const mainWorldMessageHandler = async (event: MessageEvent) => {
//   // Only handle messages from the main-world-script
//   if (event.source !== window || !event.data) {
//     return;
//   }

//   // Handle new main-world communication pattern
//   if (event.data.type === 'MAIN_WORLD_TO_CONTENT') {
//     const { action, data, id } = event.data;

//     try {
//       console.log('📡 CONTENT: Received main-world request:', action, data);

//       let response: any = { success: false, error: 'Unknown action' };

//       switch (action) {
//         case 'logNetworkRequest':
//           // Forward network request to background
//           response = await sendChromeMessage({
//             action: 'STORE_NETWORK_REQUEST',
//             data: data
//           });
//           console.log('✅ CONTENT: Network request forwarded to background');
//           break;

//         case 'logNetworkResponse':
//           // Forward network response to background
//           response = await sendChromeMessage({
//             action: 'STORE_NETWORK_RESPONSE',
//             data: data
//           });
//           console.log('✅ CONTENT: Network response forwarded to background');
//           break;

//         case 'logConsoleError':
//           // Forward console error to background
//           response = await sendChromeMessage({
//             action: 'CONSOLE_ERROR',
//             data: data
//           });
//           console.log('✅ CONTENT: Console error forwarded to background');
//           break;

//         case 'getSettings':
//           // Get current settings from storage
//           try {
//             const settingsResult = await chrome.storage.local.get(['settings']);
//             response = {
//               success: true,
//               settings: settingsResult.settings || {}
//             };
//             console.log('✅ CONTENT: Settings retrieved for main-world');
//           } catch (error) {
//             response = {
//               success: false,
//               error: error instanceof Error ? error.message : 'Unknown error'
//             };
//           }
//           break;

//         case 'checkConsoleSeverity':
//           // Check if this console severity should be logged
//           try {
//             const settingsResult = await chrome.storage.local.get(['settings']);
//             const settings = settingsResult.settings || {};
//             const severities = settings.errorLogging?.severity || ['error', 'warn'];
//             response = {
//               success: true,
//               shouldLog: severities.includes(data.severity)
//             };
//           } catch (error) {
//             response = {
//               success: false,
//               error: error instanceof Error ? error.message : 'Unknown error'
//             };
//           }
//           break;

//         default:
//           console.warn('❌ CONTENT: Unknown main-world action:', action);
//       }

//       // Send response back to main-world script
//       window.postMessage({
//         type: 'CONTENT_TO_MAIN_WORLD',
//         action: action,
//         id: id,
//         ...response
//       }, '*');

//     } catch (error) {
//       console.error('❌ CONTENT: Failed to handle main-world request:', error);

//       // Send error response back
//       window.postMessage({
//         type: 'CONTENT_TO_MAIN_WORLD',
//         action: action,
//         id: id,
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       }, '*');
//     }
//     return;
//   }

//   // Handle legacy network message format for backward compatibility
//   if (event.data?.source === 'main-world-network-interceptor') {
//     try {
//       console.log('📡 CONTENT: Received legacy network request from main-world:', event.data.data);

//       // Forward the network request data to background script
//       await sendChromeMessage({
//         action: 'STORE_NETWORK_REQUEST',
//         data: event.data.data
//       });

//       console.log('✅ CONTENT: Legacy network request forwarded to background');
//     } catch (error) {
//       console.error('❌ CONTENT: Failed to forward legacy network request:', error);
//     }
//   }
// };

// // Add the enhanced message listener
// window.addEventListener('message', mainWorldMessageHandler);
// eventHandlers.windowMessage = mainWorldMessageHandler;

// // MAIN WORLD INJECTION for page-level network interception
// async function injectMainWorldScript() {
//   if (injectionAttempted) {
//     console.log('🌍 CONTENT: Injection already attempted, checking if script is active...');

//     // MEMORY LEAK FIX: Use helper function instead of Promise constructor
//     const isActive = await checkMainWorldActive();

//     if (isActive) {
//       console.log('✅ CONTENT: Main-world script already active, skipping injection');
//       return true;
//     } else {
//       console.log('🔄 CONTENT: Main-world script not active, proceeding with injection...');
//       injectionAttempted = false; // Reset to allow re-injection
//     }
//   }

//   // Check if there are already any injected scripts to prevent duplicates
//   const existingScripts = document.querySelectorAll('script[src*="main-world-script.js"]');
//   if (existingScripts.length > 0) {
//     console.log('⚠️ CONTENT: Main world script already injected via DOM, skipping');
//     injectionAttempted = true;
//     return true;
//   }

//   injectionAttempted = true;

//   // Check if we should intercept on this site (async check)
//   const shouldIntercept = await shouldInterceptOnThisSite();
//   if (!shouldIntercept) {
//     console.log('🚫 CONTENT: Site not enabled for interception:', window.location.hostname);
//     return false;
//   }

//   try {
//     if (!isExtensionContextValid()) {
//       console.log('❌ CONTENT: Extension context invalid, cannot inject');
//       return false;
//     }

//     console.log('🌍 CONTENT: Injecting main world network interception on allowed site...');

//     // Use web_accessible_resources script instead of inline injection
//     return await tryWebAccessibleInjection();

//   } catch (error) {
//     console.log('❌ CONTENT: Main world injection failed:', error);
//     return false;
//   }
// }

// async function tryWebAccessibleInjection(): Promise<boolean> {
//   try {
//     console.log('🔄 CONTENT: Starting web-accessible script injection...');

//     // Check if script is already injected
//     const isAlreadyActive = await checkMainWorldActive();
//     if (isAlreadyActive) {
//       console.log('✅ CONTENT: Main world script already active, skipping injection');
//       return true;
//     }

//     // Double-check DOM for existing script elements
//     const existingScripts = document.querySelectorAll('script[src*="main-world-script.js"]');
//     if (existingScripts.length > 0) {
//       console.log('⚠️ CONTENT: Script element already exists in DOM, removing and re-injecting');
//       existingScripts.forEach(script => script.remove());
//     }

//     // Use the pre-built main world script from web_accessible_resources
//     const script = document.createElement('script');
//     script.src = chrome.runtime.getURL('main-world-script.js');
//     script.async = false;
//     script.onload = () => console.log('✅ CONTENT: Main world script loaded successfully');
//     script.onerror = (error) => console.log('❌ CONTENT: Main world script failed to load:', error);

//     // Inject the script
//     (document.head || document.documentElement).appendChild(script);

//     // MEMORY LEAK FIX: Use helper function instead of Promise constructor
//     const success = await loadScriptPromise(script);
//     console.log(success ? '✅ CONTENT: Direct script injection successful' : '❌ CONTENT: Direct script injection failed');

//     // Initialize interception state after successful injection
//     if (success) {
//       setTimeout(() => initializeInterceptionState(), 200); // Small delay to ensure main world script is ready
//     }

//     return success;

//   } catch (error) {
//     console.log('❌ CONTENT: Direct injection failed:', error);
//     return false;
//   }
// }

// // Listen for network requests from main world
// eventHandlers.networkIntercepted = async (event: any) => {
//   const requestData = event.detail;

//   // MEMORY OPTIMIZATION: Reduce per-request logging to minimize tab memory usage

//   // Always check context validity before processing
//   const contextValid = isExtensionContextValid();

//   if (!contextValid) {
//     // MEMORY OPTIMIZATION: Only log critical context failures
//     console.log('⚠️ CONTENT: Extension context invalid, request not stored');
//     return;
//   }

//   try {
//     // Add tab context information
//     const enrichedData = {
//       ...requestData,
//       tabUrl: window.location.href,
//       tabDomain: window.location.hostname
//     };

//     // MEMORY OPTIMIZATION: Remove per-request success logging
//     // MEMORY LEAK FIX: Use centralized handler to prevent response accumulation
//     const response = await sendChromeMessage({
//       type: 'NETWORK_REQUEST',
//       data: enrichedData
//     });

//     // Only log if there's an error
//     if (!response?.success) {
//       console.log('❌ CONTENT: Failed to store network request:', response?.error);
//       extensionContextValid = false;
//     }

//   } catch (error) {
//     // MEMORY OPTIMIZATION: Reduce error logging detail
//     console.log('❌ CONTENT: Error processing network request:', error);
//     extensionContextValid = false;
//   }
// };

// // Add the event listener
// window.addEventListener('networkRequestIntercepted', eventHandlers.networkIntercepted);

// // Listen for console errors from main world
// eventHandlers.consoleIntercepted = async (event: any) => {
//   const errorData = event.detail;

//   try {
//     // Quick context check
//     if (!isExtensionContextValid()) {
//       return; // Silent fail
//     }

//     // Get tab ID efficiently
//     const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//     if (!tabResponse?.tabId) return;

//     // Format data for existing CONSOLE_ERROR handler
//     const formattedData = {
//       message: errorData.message || 'Unknown error',
//       stack: errorData.stack || null,
//       stack_trace: errorData.stack || null, // Ensure compatibility with dashboard
//       timestamp: errorData.timestamp || Date.now(),
//       severity: errorData.severity || 'error',
//       url: errorData.url || window.location.href,
//       tabId: tabResponse.tabId,
//       tabUrl: window.location.href,
//       domain: errorData.domain || window.location.hostname,
//       // Include enhanced error data
//       errorName: errorData.errorName || null,
//       errorMessage: errorData.errorMessage || null,
//       lineNumber: errorData.lineNumber || null,
//       columnNumber: errorData.columnNumber || null,
//       source: errorData.source || 'page-console'
//     };

//     // Send to background script using existing CONSOLE_ERROR action
//     const response = await sendChromeMessage({
//       action: 'CONSOLE_ERROR',
//       data: formattedData
//     });

//     // Only log errors in debug mode, not success to prevent console pollution
//     if (!response?.success && response?.reason !== 'Tab error logging paused') {
//       console.debug('❌ CONTENT: Failed to store console error:', response?.reason || 'Unknown error');
//     }
//   } catch (error) {
//     // Silent fail to prevent memory leaks and recursive console errors
//     extensionContextValid = false;
//   }
// };

// // Add the event listener
// window.addEventListener('consoleErrorIntercepted', eventHandlers.consoleIntercepted);

// // Initialize console error interception state
// async function initializeConsoleInterceptionState() {
//   try {
//     // Get current tab ID
//     const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//     if (!tabResponse?.tabId) return;

//     // Get interception state from background
//     const response = await sendChromeMessage({
//       action: 'getInterceptionState',
//       tabId: tabResponse.tabId
//     });

//     // Send control message to main world
//     if (response?.consoleEnabled !== undefined) {
//       window.postMessage({
//         type: 'CONTROL_INTERCEPTION',
//         target: 'console',
//         enabled: response.consoleEnabled
//       }, '*');
//       console.log('📱 CONTENT: Set initial console interception state:', response.consoleEnabled);
//     }
//   } catch (error) {
//     console.log('⚠️ CONTENT: Could not initialize console interception state:', error);
//   }
// }

// // Function to handle site reactivation - check current logging states and restart monitoring
// async function handleSiteReactivation(): Promise<void> {
//   try {
//     console.log('🔄 CONTENT: Site reactivated, checking current logging states...');

//     // Get current tab ID
//     const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//     if (!tabResponse?.tabId) {
//       console.log('⚠️ CONTENT: No tab ID available for reactivation');
//       return;
//     }

//     const tabId = tabResponse.tabId;

//     // Get current logging states from storage
//     const storageResult = await chrome.storage.local.get([
//       `tabLogging_${tabId}`,
//       `tabErrorLogging_${tabId}`,
//       `tabTokenLogging_${tabId}`
//     ]);

//     const networkState = storageResult[`tabLogging_${tabId}`];
//     const errorState = storageResult[`tabErrorLogging_${tabId}`];
//     const tokenState = storageResult[`tabTokenLogging_${tabId}`];

//     console.log('📊 CONTENT: Current logging states:', {
//       network: networkState?.active || networkState?.status === 'active',
//       error: errorState?.active,
//       token: tokenState?.active
//     });

//     // If any logging is enabled, inject main world script and set up monitoring
//     const networkEnabled = networkState?.active || networkState?.status === 'active';
//     const errorEnabled = errorState?.active;
//     const tokenEnabled = tokenState?.active;

//     if (networkEnabled || errorEnabled || tokenEnabled) {
//       console.log('🌍 CONTENT: Some logging is enabled, injecting main world script...');

//       // Inject main world script if needed
//       const injectionSuccess = await injectMainWorldScript();

//       if (injectionSuccess) {
//         // Set up monitoring states based on current toggles
//         if (networkEnabled) {
//           console.log('🔄 CONTENT: Enabling network monitoring...');
//           window.postMessage({
//             type: 'CONTROL_INTERCEPTION',
//             target: 'network',
//             enabled: true
//           }, '*');
//         }

//         if (errorEnabled) {
//           console.log('🔄 CONTENT: Enabling error monitoring...');
//           window.postMessage({
//             type: 'CONTROL_INTERCEPTION',
//             target: 'console',
//             enabled: true
//           }, '*');
//         }

//         // Token logging is handled in background script, no content script control needed

//         console.log('✅ CONTENT: Site reactivation complete, monitoring restored');
//       } else {
//         console.log('❌ CONTENT: Failed to inject main world script during reactivation');
//       }
//     } else {
//       console.log('ℹ️ CONTENT: No logging enabled, site reactivated but no monitoring needed');
//     }

//   } catch (error) {
//     console.error('❌ CONTENT: Error during site reactivation:', error);
//   }
// }

// // MEMORY LEAK FIX: Runtime message listener with cleanup
// eventHandlers.runtimeMessage = (message, _sender, sendResponse) => {
//   if (message.action === 'ping') {
//     console.log('📱 CONTENT: Ping received');
//     sendResponse({ success: true, message: 'Content script is active' });
//     return true;
//   }

//   if (message.action === 'EXTENSION_STATE_CHANGED') {
//     console.log('📱 CONTENT: Extension state changed (global):', message.enabled);

//     // Send state change to main world script
//     window.dispatchEvent(new CustomEvent('extensionStateChange', {
//       detail: { enabled: message.enabled }
//     }));

//     if (message.enabled) {
//       // Extension was re-enabled, start context checking
//       startContextChecking();
//     } else {
//       // Extension was disabled, stop all monitoring
//       stopContextChecking();
//     }

//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === 'SITE_SPECIFIC_STATE_CHANGED') {
//     console.log('📱 CONTENT: Site-specific state changed:', message.enabled);

//     if (message.enabled) {
//       // Site was re-enabled, check current logging states and start monitoring
//       handleSiteReactivation();
//     } else {
//       // Site was disabled, send disable signal to main world
//       window.postMessage({
//         type: 'CONTROL_INTERCEPTION',
//         target: 'all',
//         enabled: false
//       }, '*');
//     }

//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === 'toggleLogging') {
//     console.log('📱 CONTENT: Toggle network logging:', message.enabled);

//     // Try injection if enabled (the injection function will check if it's already active)
//     if (message.enabled) {
//       console.log('🔄 CONTENT: Logging enabled, attempting injection...');
//       injectMainWorldScript().then(success => {
//         console.log('🌍 CONTENT: Dynamic injection result:', success);
//       });
//     } else {
//       console.log('🚫 CONTENT: Network logging disabled');

//       // Send control message to main world script
//       window.postMessage({
//         type: 'CONTROL_INTERCEPTION',
//         target: 'network',
//         enabled: false
//       }, '*');
//     }

//     sendResponse({ success: true });
//   } else if (message.action === 'toggleErrorLogging') {
//     console.log('📱 CONTENT: Toggle error logging:', message.enabled);

//     // Send control message to main world script
//     window.postMessage({
//       type: 'CONTROL_INTERCEPTION',
//       target: 'console',
//       enabled: message.enabled
//     }, '*');

//     sendResponse({ success: true });
//   }
//   return true; // Keep the message channel open for async response
// };

// // Listen for messages from popup/background
// chrome.runtime.onMessage.addListener(eventHandlers.runtimeMessage);

// // MEMORY LEAK FIX: Storage change listener with proper cleanup
// const storageChangeHandler = async (changes: any, namespace: string) => {
//   if (namespace === 'local') {
//     // Check for settings changes
//     if (changes.settings) {
//       console.log('⚙️ CONTENT: Settings changed, updating main-world script...');
//       // Send updated settings to main-world script
//       const newSettings = changes.settings.newValue;
//       if (newSettings?.networkInterception) {
//         window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
//           detail: { networkInterception: newSettings.networkInterception }
//         }));
//       }
//     }

//     // Check for tab logging changes
//     for (const key in changes) {
//       if (key.startsWith('tabLogging_')) {
//         const tabId = key.replace('tabLogging_', '');
//         const change = changes[key];
//         console.log('📡 CONTENT: Tab logging state changed for tab', tabId, ':', change.newValue);

//         // Get current tab ID to see if this change affects current tab
//         const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//         const currentTabId = tabResponse?.tabId;

//         if (currentTabId && tabId === currentTabId.toString()) {
//           const tabLoggingEnabled = change.newValue?.status === 'active';

//           // Check if extension is globally enabled
//           const stateResponse = await sendChromeMessage({
//             action: 'GET_EXTENSION_STATE',
//             tabId: currentTabId
//           });
//           const globalEnabled = stateResponse?.enabled ?? true;

//           // Notify main-world script about state changes
//           window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
//             detail: {
//               networkEnabled: globalEnabled && tabLoggingEnabled,
//               consoleEnabled: globalEnabled && tabLoggingEnabled
//             }
//           }));

//           // If logging was enabled and we haven't injected yet, try to inject
//           if (tabLoggingEnabled) {
//             console.log('🔄 CONTENT: Tab logging enabled via storage change, attempting injection...');
//             injectMainWorldScript().then(success => {
//               console.log('🌍 CONTENT: Storage-triggered injection result:', success);
//             });
//           }
//         }
//       }
//     }
//   }
// };

// // Listen for storage changes to react to popup logging controls
// chrome.storage.onChanged.addListener(storageChangeHandler);

// // Add storage handler to cleanup system
// eventHandlers.storageChange = storageChangeHandler;

// // === INTERCEPTION STATE INITIALIZATION ===

// // Function to query and set initial interception state in main world script
// async function initializeInterceptionState(): Promise<void> {
//   try {
//     const tabResponse = await sendChromeMessage({ action: 'getCurrentTabId' });
//     const tabId = tabResponse?.tabId;

//     if (!tabId) {
//       console.log('📱 CONTENT: No tab ID available for interception state initialization');
//       return;
//     }

//     // Get current interception state from background
//     const stateResponse = await sendChromeMessage({
//       action: 'getInterceptionState',
//       tabId: tabId
//     });

//     if (stateResponse?.success !== false) {
//       const { consoleEnabled, networkEnabled } = stateResponse;

//       console.log('📱 CONTENT: Setting initial interception state:', {
//         console: consoleEnabled,
//         network: networkEnabled
//       });

//       // Dispatch initial state to main world script using CustomEvent
//       window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
//         detail: {
//           networkEnabled: networkEnabled,
//           consoleEnabled: consoleEnabled
//         }
//       }));

//       console.log('📱 CONTENT: Initial interception state dispatched to main world');
//     }
//   } catch (error) {
//     console.log('📱 CONTENT: Failed to initialize interception state:', error);
//   }
// }

// // Listen for extension context invalidation
// eventHandlers.beforeUnload1 = () => {
//   extensionContextValid = false;
// };

// window.addEventListener('beforeunload', eventHandlers.beforeUnload1!);

// // MEMORY LEAK FIX: Store interval ID and clear it on page unload
// let contextCheckIntervalId: number | null = null

// // MEMORY LEAK FIX: Memory-aware context checking with exponential backoff
// const startContextChecking = () => {
//   if (contextCheckIntervalId) {
//     clearInterval(contextCheckIntervalId)
//   }

//   let checkInterval = 5000 // Start with 5 seconds
//   const maxInterval = 30000 // Cap at 30 seconds

//   const scheduleNextCheck = () => {
//     contextCheckIntervalId = window.setTimeout(() => {
//       try {
//         // Check memory pressure before context check
//         const performanceMemory = (performance as any).memory
//         if (performanceMemory?.usedJSHeapSize) {
//           const heapUsed = performanceMemory.usedJSHeapSize
//           const heapLimit = performanceMemory.jsHeapSizeLimit
//           const heapPercentage = (heapUsed / heapLimit) * 100

//           if (heapPercentage > 85) {
//             // Skip check under high memory pressure
//             checkInterval = Math.min(checkInterval * 1.5, maxInterval)
//             scheduleNextCheck()
//             return
//           } else {
//             // Reset to normal interval
//             checkInterval = 5000
//           }
//         }

//         if (extensionContextValid && !isExtensionContextValid()) {
//           console.log('❌ CONTENT: Extension context became invalid')
//           extensionContextValid = false
//         }
//       } catch (error) {
//         console.error('Context check error:', error)
//       }

//       scheduleNextCheck()
//     }, checkInterval)
//   }

//   scheduleNextCheck()
// }

// // MEMORY LEAK FIX: Stop context checking when extension is disabled
// function stopContextChecking() {
//   if (contextCheckIntervalId) {
//     clearTimeout(contextCheckIntervalId);
//     contextCheckIntervalId = null;
//     console.log('🚫 CONTENT: Context checking stopped');
//   }
// }

// // MEMORY LEAK FIX: Clear interval on page unload to prevent accumulation
// eventHandlers.beforeUnload2 = () => {
//   if (contextCheckIntervalId) {
//     clearTimeout(contextCheckIntervalId);
//     contextCheckIntervalId = null;
//   }
//   cleanupEventListeners(); // Clean up all event listeners
// };

// if (window.addEventListener && eventHandlers.beforeUnload2) {
//   window.addEventListener('beforeunload', eventHandlers.beforeUnload2);
// }

// // Initialize injection on content script load
// // PHASE 2: Check extension state FIRST before any initialization
// async function initializeContentScript() {
//   const isExtensionEnabled = await checkExtensionState();

//   if (!isExtensionEnabled) {
//     // Extension is disabled - do absolutely nothing
//     console.log('🚫 CONTENT: Extension disabled, content script will remain inactive');
//     return;
//   }

//   // Extension is enabled - proceed with normal initialization
//   console.log('✅ CONTENT: Extension enabled, starting content script initialization');

//   // Start context checking only when extension is enabled
//   startContextChecking();

//   if (document.readyState === 'loading') {
//     eventHandlers.domContentLoaded = () => {
//       setTimeout(() => injectMainWorldScript(), 100);
//     };
//     if (document.addEventListener && eventHandlers.domContentLoaded) {
//       document.addEventListener('DOMContentLoaded', eventHandlers.domContentLoaded);
//     }
//   } else {
//     setTimeout(() => injectMainWorldScript(), 100);
//   }

//   // Also inject when document is ready if not already done
//   eventHandlers.windowLoad = () => {
//     setTimeout(() => {
//       if (!injectionAttempted) {
//         injectMainWorldScript();
//       }
//     }, 500);
//   };

//   // Register window load listener
//   if (window.addEventListener && eventHandlers.windowLoad) {
//     window.addEventListener('load', eventHandlers.windowLoad);
//   }

//   console.log('✅ CONTENT: Chrome APIs available');
//   console.log('✅ CONTENT: Main world injection setup completed');

//   // Export for debugging
//   (window as any).__contentScriptDebug = {
//     isExtensionContextValid,
//     injectMainWorldScript,
//     extensionContextValid,
//     injectionAttempted
//   };

//   // Single injection attempt on script load
//   setTimeout(() => injectMainWorldScript(), 100);

//   // PERFORMANCE OPTIMIZATION: Use comprehensive initialization for both console and network
//   setTimeout(() => {
//     initializeInterceptionState();
//   }, 500);
// }

// // Start initialization
// initializeContentScript();
