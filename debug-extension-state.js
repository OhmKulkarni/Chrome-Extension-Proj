// Advanced diagnostic script for Chrome Extension APIs
// Run this in the service worker console

console.log('=== ADVANCED CHROME EXTENSION DIAGNOSTICS ===');

// 1. Check Chrome version and APIs
console.log('Chrome version:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
console.log('User agent:', navigator.userAgent);

// 2. Check all Chrome APIs availability
const chromeAPIs = {
  'chrome': typeof chrome !== 'undefined',
  'chrome.runtime': typeof chrome?.runtime !== 'undefined',
  'chrome.offscreen': typeof chrome?.offscreen !== 'undefined',
  'chrome.storage': typeof chrome?.storage !== 'undefined',
  'chrome.tabs': typeof chrome?.tabs !== 'undefined',
  'chrome.scripting': typeof chrome?.scripting !== 'undefined'
};

console.table(chromeAPIs);

// 3. Check manifest permissions
async function checkManifestPermissions() {
  try {
    const manifest = chrome.runtime.getManifest();
    console.log('Manifest version:', manifest.manifest_version);
    console.log('Extension permissions:', manifest.permissions);
    console.log('Minimum Chrome version:', manifest.minimum_chrome_version);
    
    // Check if permissions were granted
    if (chrome.permissions) {
      const permissions = await chrome.permissions.getAll();
      console.log('Granted permissions:', permissions);
    }
    
    return manifest;
  } catch (error) {
    console.error('Failed to check manifest:', error);
    return null;
  }
}

// 4. Test extension context
function checkExtensionContext() {
  console.log('Extension ID:', chrome.runtime.id);
  console.log('Extension URL:', chrome.runtime.getURL(''));
  
  // Check if we're in the right context
  console.log('Service worker context:', typeof importScripts !== 'undefined');
  console.log('Window context:', typeof window !== 'undefined');
  console.log('Worker context:', typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
}

// 5. Test file access
async function testFileAccess() {
  try {
    // Test if offscreen HTML file is accessible
    const offscreenUrl = chrome.runtime.getURL('src/offscreen/offscreen.html');
    console.log('Offscreen URL:', offscreenUrl);
    
    // Try to fetch the file
    const response = await fetch(offscreenUrl);
    console.log('Offscreen HTML accessible:', response.ok);
    
    if (!response.ok) {
      console.error('Offscreen HTML not found - this could be the issue!');
    }
    
    // Test WASM file
    const wasmUrl = chrome.runtime.getURL('sql-wasm.wasm');
    console.log('WASM URL:', wasmUrl);
    
    const wasmResponse = await fetch(wasmUrl);
    console.log('WASM file accessible:', wasmResponse.ok);
    
    return { offscreen: response.ok, wasm: wasmResponse.ok };
  } catch (error) {
    console.error('File access test failed:', error);
    return { offscreen: false, wasm: false };
  }
}

// 6. Check extension loading state
function checkExtensionState() {
  // Check if extension is properly loaded
  console.log('Runtime last error:', chrome.runtime.lastError);
  
  // Check extension details if available
  if (chrome.management) {
    chrome.management.getSelf().then(info => {
      console.log('Extension info:', info);
      console.log('Extension enabled:', info.enabled);
      console.log('Install type:', info.installType);
    }).catch(err => {
      console.log('Management API not available:', err.message);
    });
  }
}

// Run all diagnostics
async function runFullDiagnostics() {
  console.log('\n--- STARTING FULL DIAGNOSTICS ---\n');
  
  // Basic checks
  checkExtensionContext();
  
  // Manifest check
  const manifest = await checkManifestPermissions();
  
  // File access check
  const fileAccess = await testFileAccess();
  
  // Extension state
  checkExtensionState();
  
  // Summary
  console.log('\n--- DIAGNOSTIC SUMMARY ---');
  console.log('Manifest loaded:', !!manifest);
  console.log('Files accessible:', fileAccess);
  console.log('Offscreen API available:', typeof chrome?.offscreen !== 'undefined');
  
  // Recommendations
  if (typeof chrome?.offscreen === 'undefined') {
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Reload the extension completely');
    console.log('2. Check if extension is in Developer Mode');
    console.log('3. Verify all files are built/copied correctly');
    console.log('4. Try removing and re-adding the extension');
    
    if (!fileAccess.offscreen) {
      console.log('5. ⚠️ CRITICAL: Offscreen HTML file missing - this is likely the main issue!');
    }
  }
  
  return {
    chromeAPIs,
    manifest,
    fileAccess,
    recommendations: typeof chrome?.offscreen === 'undefined'
  };
}

// Auto-run diagnostics
runFullDiagnostics().then(results => {
  console.log('\n✅ Diagnostics complete. Results saved to window.diagnosticResults');
  window.diagnosticResults = results;
});

console.log('=== DIAGNOSTIC SCRIPT LOADED ===');
console.log('Results will appear above. Run runFullDiagnostics() to repeat if needed.');
