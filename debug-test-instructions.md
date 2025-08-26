# 🔧 Extension Debug Test Instructions

## Recent Changes Applied
1. ✅ **Storage Fix**: Enhanced loadExtensionState() to check both storage locations
2. ✅ **Console Fallback**: Added console interception when main-world injection fails
3. ✅ **Network Debug**: Added extensive debugging to network interceptor

## Testing Steps

### 1. Reload Extension
- Go to `chrome://extensions/`
- Find your extension and click the reload button
- Check for any errors in the extension details

### 2. Check Storage Debug
- Open extension popup
- Verify all toggles are ON
- Go to background script console (`chrome://extensions/` → Details → Inspect background page)
- Look for these debug messages:
```
🔍 ExtensionStateModule: Raw storage data: {...}
🔌 ExtensionStateModule: Using extensionEnabled: true
🔌 ExtensionStateModule: State loaded, enabled: true
```

### 3. Test Network Interception
- Open the test page: `test-post-storage-fix.html`
- Open browser console (F12)
- Click "Test Simple GET Request" button
- Look for these debug messages:
```
🌐 NetworkInterceptor: Fetch called for GET /api/test-get-1?timestamp=...
🔍 NetworkInterceptor: shouldFilter check for GET /api/test-get-1?timestamp=...
✅ NetworkInterceptor: Request passes all filters, will notify listeners
📢 NetworkInterceptor: Notifying X listeners for GET /api/test-get-1...
```

### 4. Check Main-World Injection
- In the page console, look for:
```
✅ Main-world script injection successful
```
- Instead of:
```
⚠️ Main-world script injection failed: Extension globally disabled
```

### 5. Network Requests on Real Sites
- Go to Reddit, Yahoo Finance, or any real site
- Make sure extension popup shows all toggles ON
- Perform actions that generate network requests (scroll, click links)
- Check browser console for network debug messages

## Expected Results

### If Storage Fix Worked:
- Background console shows proper storage loading
- Content script console shows successful main-world injection
- Network interceptor initializes without "Extension globally disabled" error

### If Network Interception Works:
- Console shows "Fetch called" messages for network requests
- Console shows "shouldFilter check" for each request
- Console shows "Notifying listeners" when requests should be captured
- Extension popup should show network request counts increasing

### If Still Not Working:
- Check what debug messages are missing
- Note if requests are being intercepted but not notified to listeners
- Check if the problem is in URL filtering, listener registration, or elsewhere

## Debug Message Reference

| Message | Meaning |
|---------|---------|
| `🌐 NetworkInterceptor: Fetch called` | Request intercepted |
| `🔍 NetworkInterceptor: shouldFilter check` | Checking if request should be filtered |
| `❌ NetworkInterceptor: URL filtered out` | Request blocked by filters |
| `✅ NetworkInterceptor: Request passes all filters` | Request will be processed |
| `📢 NetworkInterceptor: Notifying X listeners` | Sending to extension listeners |
| `🔌 ExtensionStateModule: State loaded, enabled: true` | Extension properly enabled |

Run these tests and report back what debug messages you see!
