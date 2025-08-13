# Stack Trace Debugging Guide

## Issues Addressed

Based on your report that "either the stack trace doesn't show, or the error itself is a script error", I've implemented several fixes and debugging tools.

## Fixes Implemented

### 1. **Cross-Origin "Script Error" Handling**
- Added better handling for cross-origin script errors that show up as "Script error."
- Now provides helpful information about cross-origin errors instead of just "Script error."

### 2. **Enhanced Content Script Mapping**
- Added `stack_trace` field mapping for dashboard compatibility
- Included all enhanced fields (lineNumber, columnNumber, errorObject, parsedStack, source)

### 3. **Improved Error Handling in Stack Generation**
- Added try/catch blocks around stack trace generation to prevent failures
- Graceful fallbacks when stack trace generation fails

### 4. **Debug Information in Dashboard**
- Added temporary debug sections that show the raw error object
- This will help identify what data is actually being received

## Testing Steps

### 1. **Load the Extension**
1. Build the extension: `npm run build`
2. Load the extension in Chrome
3. Enable console error logging in settings

### 2. **Use the Test Page**
1. Open `stack-trace-test.html` in Chrome
2. Open the extension dashboard
3. Click each test button and observe the console errors table

### 3. **Test Different Error Types**

#### A. Console Error with String
```javascript
console.error("This is a simple string error");
```
**Expected**: Should show stack trace with current function location

#### B. Console Error with Error Object
```javascript
const error = new Error("This is an Error object");
console.error("Error:", error);
```
**Expected**: Should preserve original Error object stack trace

#### C. Uncaught Runtime Error
```javascript
throw new Error("Uncaught error");
```
**Expected**: Should be captured by global error handler with full stack

#### D. Unhandled Promise Rejection
```javascript
Promise.reject(new Error("Promise rejection"));
```
**Expected**: Should be captured with promise rejection source

#### E. Cross-Origin Script Error
- Try loading a script from a different domain
**Expected**: Should show "Script error (cross-origin)" with helpful message

### 4. **Debug Information**

In the dashboard, when viewing console error details:

1. **Check Stack Trace Section**: Look for the stack trace display
2. **Check Debug Section**: Expand "Debug: Error Object" to see raw data
3. **Verify Field Mapping**: Ensure `stack`, `stack_trace` fields are present

## Common Issues and Solutions

### Issue 1: No Stack Trace Displayed
**Possible Causes:**
- Stack trace field is empty or null
- Dashboard not finding `stack` or `stack_trace` fields
- Console error logging disabled in settings

**Debug Steps:**
1. Check the debug section in dashboard to see raw error object
2. Verify `stack` field contains data
3. Check browser console for any extension errors
4. Ensure console error logging is enabled in extension settings

### Issue 2: "Script Error" Messages
**Causes:**
- Cross-origin script errors (CORS restrictions)
- Errors in external scripts without proper CORS headers

**Expected Behavior:**
- Should now show "Script error (cross-origin): Error occurred in external script at [URL]"
- Provides more context than just "Script error."

### Issue 3: Stack Trace Shows Extension Code
**Causes:**
- Stack trace cleaning not working properly
- Interceptor frames not being removed

**Debug Steps:**
1. Check if stack trace contains extension file names
2. Verify `parseStackTrace()` function is working
3. Look at both raw and cleaned stack traces in debug output

## Debugging Commands

### Check Extension Status
```javascript
// In browser console on any page
console.log("Extension test error");
```

### Check Settings
```javascript
// In extension dashboard console
chrome.storage.local.get(null, console.log);
```

### Manual Error Test
```javascript
// Create test error with stack
function testFunction() {
  function innerFunction() {
    console.error("Test error from nested function");
  }
  innerFunction();
}
testFunction();
```

## Expected Debug Output

When viewing a console error in the dashboard, you should see:

1. **Stack Trace Section** (if stack available):
   - "View Full Stack Trace" expandable section
   - Clean stack trace without extension files

2. **Debug Section** (temporary):
   - "Debug: Error Object" expandable section
   - Raw JSON of the error object
   - Should include fields: `message`, `stack`, `stack_trace`, `lineNumber`, `columnNumber`, etc.

## Files Modified for Debugging

1. **`public/main-world-script.js`**:
   - Enhanced cross-origin error handling
   - Added error handling in stack generation
   - Better "Script error" detection and messaging

2. **`src/content/content-simple.ts`**:
   - Added `stack_trace` field mapping for dashboard compatibility
   - Included all enhanced error data fields

3. **`src/dashboard/dashboard.tsx`**:
   - Added temporary debug sections to show raw error objects
   - Enhanced error data visibility for troubleshooting

4. **`stack-trace-test.html`**:
   - Created comprehensive test page for different error scenarios
   - Includes buttons for testing all error types

## Next Steps

1. **Test with the provided test page**
2. **Check debug output in dashboard**
3. **Report specific error scenarios that aren't working**
4. **Share screenshot of debug section if stack traces still don't appear**

The debug sections will help identify exactly what data is being captured and why stack traces might not be displaying properly.

## Removal of Debug Code

Once stack trace issues are resolved, remove the debug sections by:
1. Removing the debug `<details>` sections from dashboard.tsx
2. Keeping the enhanced error handling and field mapping

The debug code is clearly marked with comments for easy removal.
