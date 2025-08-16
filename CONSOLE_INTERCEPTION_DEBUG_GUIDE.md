# Console Interception Debugging Guide

## Issue Summary
Console error interception may not be working properly. This guide helps diagnose and fix the issue.

## 🔍 Diagnostic Steps

### 1. Check Extension Loading
Open Chrome DevTools (F12) and check:
- **Console**: Look for main-world script logs starting with `🌍 MAIN-WORLD:`
- **Sources**: Verify `main-world-script.js` is loaded under the extension folder
- **Network**: Check if the script file loads without errors

### 2. Expected Console Messages
If console interception is working, you should see:
```
🌍 MAIN-WORLD: Script starting initialization...
🌍 MAIN-WORLD: Initializing interception...
🌍 MAIN-WORLD: Setting up console interception...
🌍 MAIN-WORLD: Console interception active
🌍 MAIN-WORLD: Interception initialization complete
```

### 3. Test Console Interception
Run these commands in DevTools console:
```javascript
console.error("Test error message");
console.warn("Test warning message");
console.log("Test log message");
```

If working, you should see:
```
🌍 MAIN-WORLD: Captured console error : Test error message
📡 CONTENT: Received main-world request: logConsoleError
✅ CONTENT: Console error forwarded to background
```

## 🛠️ Common Issues & Fixes

### Issue 1: Main-World Script Not Loading
**Symptoms:** No `🌍 MAIN-WORLD:` messages in console

**Check:**
1. Extension is properly loaded and enabled
2. `main-world-script.js` exists in dist folder
3. Manifest.json includes the script in `web_accessible_resources`

**Fix:**
```bash
npm run build
# Reload extension in chrome://extensions/
```

### Issue 2: Content Script Communication Failure
**Symptoms:** Main-world messages appear, but no content script responses

**Check:**
1. Content script is loaded (`📡 CONTENT:` messages)
2. Message handler is properly registered
3. Chrome storage permissions are granted

**Fix:** Verify content script message handler in `content-simple.ts`

### Issue 3: Background Script Not Receiving Messages
**Symptoms:** Content script forwards messages but background doesn't process them

**Check:**
1. Background script is running (check service worker in DevTools)
2. `CONSOLE_ERROR` action is handled in background script
3. Settings allow error logging

**Fix:** Check background script error handling and settings

### Issue 4: Settings Filtering Console Messages
**Symptoms:** Some console messages not captured

**Check:**
1. Error logging is enabled in settings
2. Severity filtering allows the message type
3. Extension is enabled for the current tab

**Fix:** Adjust settings in extension options page

## 🔧 Manual Testing Commands

### Test Different Console Severities
```javascript
console.log("Info message");     // Should be captured if enabled
console.info("Info message");    // Should be captured if enabled  
console.warn("Warning message"); // Should be captured if enabled
console.error("Error message");  // Should be captured if enabled
console.debug("Debug message");  // Should be captured if enabled
console.trace("Trace message");  // Should be captured if enabled
```

### Test Error Objects
```javascript
const error = new Error("Test error object");
error.customProperty = "custom value";
console.error("Error with object:", error);
```

### Test Uncaught Errors
```javascript
// This should be captured by window.addEventListener('error')
setTimeout(() => {
  throw new Error("Test uncaught error");
}, 100);
```

### Test Promise Rejections
```javascript
// This should be captured by window.addEventListener('unhandledrejection')
Promise.reject(new Error("Test unhandled promise rejection"));
```

## 📋 Debugging Checklist

- [ ] Extension is loaded and enabled
- [ ] Main-world script loads successfully
- [ ] Console interception is initialized
- [ ] Content script receives messages
- [ ] Background script handles console errors
- [ ] Settings allow error logging
- [ ] Extension is enabled for current tab
- [ ] Console messages appear in dashboard

## 🎯 Success Indicators

When console interception is working correctly, you should see:

1. **In DevTools Console:**
   - Main-world initialization messages
   - Console capture confirmations
   - Content script forwarding messages

2. **In Extension Dashboard:**
   - Console errors appearing in real-time
   - Error details including stack traces
   - Proper timestamp and URL information

3. **In Extension Settings:**
   - Error logging toggle responsive
   - Severity filtering working
   - Tab-specific controls functional

## 🚨 Current Status

Based on recent fixes:
- ✅ Main-world script restored with enhanced console interception
- ✅ Content script communication handler added
- ✅ Background script error processing confirmed
- ⚠️ Need to verify end-to-end flow

## 🔄 Next Steps

1. Load the test page: `console-test.html`
2. Open DevTools and check for initialization messages
3. Click test buttons and verify console capture
4. Check extension dashboard for captured errors
5. Adjust settings if needed

## 📞 Troubleshooting Commands

If issues persist, run these in DevTools console:

```javascript
// Check if console methods are intercepted
console.log.toString() // Should show modified function if intercepted

// Check main-world communication
window.postMessage({
  type: 'MAIN_WORLD_TO_CONTENT',
  action: 'getSettings',
  id: 'test123'
}, '*');

// Force settings update
window.postMessage({
  type: 'CONTENT_TO_MAIN_WORLD',
  action: 'UPDATE_SETTINGS'
}, '*');
```
