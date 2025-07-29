# How to Run the Comprehensive Test Suite

## 🎯 **Two Testing Options**

### 1. **Quick Test (Webpage Console)** ⚡
**What it tests**: Main world injection, network interception, live capture
**Where to run**: Any webpage console (F12)
**Limitations**: Cannot test storage, background script, or full extension APIs

**Steps**:
1. Go to any website (like Reddit)
2. Press F12 to open console
3. Paste and run `comprehensive-test-suite.js`
4. Should show "Network interception is working!"

### 2. **Full Test (Extension Context)** 🔬
**What it tests**: ALL functionality including storage, background script, APIs
**Where to run**: Extension popup, dashboard, or options page console
**Complete**: Tests all 8 requirements and functionality

**Steps**:

#### Option A: Extension Popup Console
1. Click your extension icon in Chrome toolbar
2. Right-click in the popup → "Inspect"
3. Go to Console tab in the popup's DevTools
4. Paste and run `comprehensive-test-suite.js`

#### Option B: Extension Dashboard Console  
1. Open the extension dashboard (if you have one)
2. Press F12 to open console
3. Paste and run `comprehensive-test-suite.js`

#### Option C: Extension Options Console
1. Right-click extension icon → "Options" 
2. Press F12 to open console
3. Paste and run `comprehensive-test-suite.js`

## 📊 **Expected Results**

### Quick Test (Webpage):
```
✅ Main world injection: true
✅ Network interception: true  
✅ Live capture: true
💡 Network interception is working!
```

### Full Test (Extension Context):
```
🎉 ALL TESTS PASSED - Extension is fully functional!
📊 OVERALL: 8/8 tests passed
```

## 🚨 **Troubleshooting**

**If tests fail**:
1. Make sure extension is loaded and enabled
2. Refresh the webpage if testing from webpage console
3. Try reloading the extension: chrome://extensions → click reload
4. Check that you built the extension: `npm run build`

**Context Issues**:
- "Chrome APIs not available" = Wrong context, use extension popup/dashboard
- "Content script not found" = Extension not loaded or content script failed
- "Main world script not active" = CSP issues or injection failed

The test script will automatically detect where you're running it and provide appropriate guidance!
