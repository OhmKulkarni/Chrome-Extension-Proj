# Debug Testing Checklist for Console Error Toggle

## Current Status
Built extension with debug logging to trace console error toggle functionality.

## What to Test

### 1. Dashboard Sidebar Toggle Visibility
- [ ] Open dashboard
- [ ] Click hamburger menu (☰) to open sidebar 
- [ ] Verify "Console Errors" toggle is visible for each tab
- [ ] Toggle should show current state (red = on, gray = off)

### 2. Toggle Functionality  
- [ ] Click console error toggle in dashboard sidebar
- [ ] Check browser console (F12) for debug output:
  - Should see `🔥 DASHBOARD: toggleTabErrorLogging called for tab: X`
  - Should see storage updates and state changes

### 3. Console Error Processing
- [ ] Run `test-console-errors-debug.js` on any webpage
- [ ] Check background script console for debug output:
  - Should see `🔥 BACKGROUND: handleConsoleError called with data:`
  - Should see config and tab state evaluation
  - Should see either acceptance (✅) or rejection (🚫)

### 4. Expected Behavior
**When toggle is ON (red):**
- Console errors should be processed and stored
- Should see `✅ BACKGROUND: Tab error logging is active, proceeding to store`
- Errors should appear in dashboard table

**When toggle is OFF (gray):**
- Console errors should be rejected
- Should see `🚫 BACKGROUND: Tab error logging is paused, rejecting error`
- Errors should NOT appear in dashboard table

### 5. Default State
**For new tabs (no previous state):**
- Should default to ON (red) based on `defaultState: 'active'`
- Should see `🔥 BACKGROUND: No tab state, using default: true`

## Debug Output Key
- 🔥 = Debug trace messages
- ✅ = Success/acceptance
- 🚫 = Rejection/blocking
- 📡 = Communication between components

## Common Issues to Look For
1. **Toggle not visible**: Settings not initialized properly
2. **Toggle visible but no debug output**: Click event not firing
3. **Debug output but no effect**: Storage not being checked correctly
4. **Wrong default state**: Settings defaults inconsistent

## Files to Check Console Output
- **Background script console**: Extension service worker debug output
- **Dashboard console**: Dashboard toggle debug output  
- **Webpage console**: Test script output and any errors
