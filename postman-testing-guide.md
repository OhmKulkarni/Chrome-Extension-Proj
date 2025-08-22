# Postman Test Configuration for Chrome Extension Timing

## Collection: Chrome Extension Timing Tests

### Request 1: Fast API Response
- **Method**: GET
- **URL**: `https://postman-echo.com/get?test=fast&timestamp={{$timestamp}}`
- **Purpose**: Test fast response timing
- **Expected**: All component times should be visible

### Request 2: Delayed Response (2 seconds)
- **Method**: GET
- **URL**: `https://postman-echo.com/delay/2?test=delayed&timestamp={{$timestamp}}`
- **Purpose**: Test clear TTFB timing
- **Expected**: ~2000ms TTFB, clear component breakdown

### Request 3: Large JSON Response
- **Method**: POST
- **URL**: `https://postman-echo.com/post`
- **Body** (raw JSON):
```json
{
  "test": "large_payload",
  "timestamp": "{{$timestamp}}",
  "data": "{{$randomLoremParagraphs}}",
  "array": [1,2,3,4,5,6,7,8,9,10],
  "nested": {
    "level1": {
      "level2": {
        "level3": "deep data"
      }
    }
  }
}
```
- **Purpose**: Test download timing component
- **Expected**: Visible content download time

### Request 4: HTTP (Non-SSL) Request
- **Method**: GET
- **URL**: `http://httpbin.org/get?test=http&timestamp={{$timestamp}}`
- **Purpose**: Test without SSL handshake
- **Expected**: SSL time = 0ms

### Request 5: Multiple Redirects
- **Method**: GET
- **URL**: `https://postman-echo.com/redirect-to?url=https://postman-echo.com/get`
- **Purpose**: Test redirect timing
- **Expected**: May show timing complexities

### Request 6: Custom Headers Test
- **Method**: GET
- **URL**: `https://postman-echo.com/headers`
- **Headers**:
  - `X-Test-Header`: `timing-test`
  - `User-Agent`: `Chrome-Extension-Timing-Test`
- **Purpose**: Test header processing impact
- **Expected**: Minimal impact on timing

## Testing Procedure:

1. **Setup Environment Variables** in Postman:
   - `baseUrl`: `https://postman-echo.com`
   - `timestamp`: `{{$timestamp}}`

2. **Run each request individually** while monitoring your Chrome extension

3. **Check your extension dashboard** after each request

4. **Compare timings** between Postman's response times and your extension's detailed view

## What to Look For:

- ✅ **DNS Lookup**: Should be >0ms on first request, 0ms on subsequent
- ✅ **TCP Connect**: Should be 10-100ms typically
- ✅ **SSL Handshake**: Should be 50-200ms for HTTPS, 0ms for HTTP
- ✅ **TTFB**: Should match delay parameter (2000ms for /delay/2)
- ✅ **Content Download**: Should increase with larger responses
- ✅ **Total Time**: Should match Postman's response time roughly

## Postman vs Extension Comparison:

Your extension should show:
- **More detailed breakdown** than Postman shows
- **Similar total times** to Postman's response time
- **Component-level insights** that Postman doesn't provide
