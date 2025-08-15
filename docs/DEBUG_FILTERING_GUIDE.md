# Debug Script for Request Filtering & Console Error Issues

## Instructions for Testing

1. **Open the debug page**:
   - Navigate to `debug-filtering-test.html` in a tab with the extension enabled
   - Open browser developer tools (F12)

2. **Test Console Error Interception**:
   - Click the console test buttons
   - Check if console errors appear in the extension dashboard
   - Look for console messages with `🌍 MAIN_WORLD:` prefix

3. **Test Network Request Filtering**:
   - Click the network test buttons
   - Check if requests are properly filtered in the dashboard
   - Analytics requests should not appear if noise filtering is enabled

4. **Check Browser Console for Debug Info**:
   Look for these debug messages:
   ```
   🌍 MAIN_WORLD: Console severity check result: {enabled: true/false}
   🌍 MAIN_WORLD: Intercepted fetch request: [URL]
   📨 CONTENT: Processing checkConsoleSeverity request for: error/warn/info
   🔇 BACKGROUND: Filtered noise request: [URL]
   ```

## Common Issues and Solutions

### Console Errors Not Being Captured
**Symptoms**: Console errors don't appear in extension dashboard

**Debug Steps**:
1. Check if main-world script is injected: Look for `🌍 MAIN-WORLD: Script injected into main world`
2. Check if console interception started: Look for `🚀 MAIN_WORLD: Starting console interception...`
3. Check severity filtering: Look for `🌍 MAIN_WORLD: Console severity check result:`

**Likely Fixes**:
- Content script communication not working
- Console error logging disabled in settings
- Severity filter blocking messages

### Network Request Filtering Not Working
**Symptoms**: Analytics/noise requests appear in dashboard when they shouldn't

**Debug Steps**:
1. Check if noise filtering is enabled in settings
2. Look for `🔇 BACKGROUND: Filtered noise request:` messages
3. Check if URL patterns are configured correctly

**Likely Fixes**:
- Settings not properly loaded in background script
- Noise filter function not recognizing URLs
- Tab-specific filtering overriding global settings

## Settings Structure Check

Use the debug page to check current settings structure. Expected structure:

```json
{
  "networkInterception": {
    "enabled": true,
    "privacy": {
      "filterNoise": true
    },
    "urlPatterns": {
      "enabled": false,
      "patterns": []
    },
    "tabSpecific": {
      "enabled": true,
      "defaultState": "active"
    }
  },
  "errorLogging": {
    "enabled": true,
    "severityFilter": {
      "enabled": false,
      "allowed": ["error", "warn", "info"]
    },
    "tabSpecific": {
      "enabled": true,
      "defaultState": "active"
    }
  }
}
```

## Quick Fixes to Try

### Fix 1: Reset Settings
```javascript
chrome.storage.local.set({
  settings: {
    networkInterception: {
      enabled: true,
      privacy: { filterNoise: true },
      tabSpecific: { enabled: true, defaultState: "active" }
    },
    errorLogging: {
      enabled: true,
      severityFilter: { enabled: false, allowed: ["error", "warn", "info"] },
      tabSpecific: { enabled: true, defaultState: "active" }
    }
  }
});
```

### Fix 2: Check Tab Logging States
```javascript
chrome.storage.local.get(null, (data) => {
  const tabKeys = Object.keys(data).filter(key => 
    key.startsWith('tabLogging_') || 
    key.startsWith('tabErrorLogging_')
  );
  console.log('Tab states:', tabKeys.map(key => ({ [key]: data[key] })));
});
```

### Fix 3: Verify Main World Script Loading
Check in the page console for:
```
🌍 MAIN-WORLD: Script injected into main world
🌍 MAIN_WORLD: Checking initial logging states...
```

If missing, the content script injection may have failed.
