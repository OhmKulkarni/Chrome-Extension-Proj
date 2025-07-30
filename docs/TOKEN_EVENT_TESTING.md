# Token Event Tracking - Testing Guide

## Feature Overview

The token event tracking feature monitors authentication-related network requests and captures key events without exposing sensitive data. This guide explains how to test the implementation.

## What Gets Tracked

### Event Types
1. **Token Acquire** (`acquire`) - Successful authentication/login requests
2. **Token Refresh** (`refresh`) - Successful token refresh requests  
3. **Refresh Error** (`refresh_error`) - Failed token refresh attempts

### Monitored Endpoints

#### Token Acquisition Endpoints
- `/auth`, `/login`, `/token`, `/signin`, `/authenticate`, `/oauth`
- `/api/auth`, `/api/login`, `/api/token`, `/api/signin`, `/api/authenticate`
- `/v1/auth`, `/v2/auth`, `/session`, `/sso`, `/connect`

#### Token Refresh Endpoints
- `/refresh`, `/renew`, `/reauth`, `/token/refresh`, `/auth/refresh`
- `/api/refresh`, `/api/renew`, `/api/reauth`, `/api/token/refresh`
- `/v1/refresh`, `/v2/refresh`, `/session/refresh`

### Detection Criteria
- **Acquire Events**: POST requests to acquisition endpoints with 2xx status codes
- **Refresh Events**: POST/GET requests to refresh endpoints with 2xx status codes
- **Error Events**: POST/GET requests to refresh endpoints with 4xx/5xx status codes

## Testing Methods

### 1. Using the Test Page
1. Open `test-token-events.html` in a browser with the extension enabled
2. Click various test buttons to simulate authentication requests
3. Check the Dashboard > Token Events section for captured events

### 2. Manual Testing with Real Applications
1. Navigate to web applications that use authentication
2. Perform login, logout, and session refresh actions
3. Monitor the token events in the dashboard

### 3. Developer Tools Testing
1. Open browser Developer Tools > Network tab
2. Manually trigger XHR/fetch requests to token endpoints
3. Verify events appear in the extension dashboard

## Dashboard Features

### Token Events Display
- **Table View**: Shows event type, URL, status, method, and timestamp
- **Filtering**: Filter by event type (acquire, refresh, refresh_error)
- **Search**: Search by URL or event type
- **Sorting**: Sort by any column (type, URL, status, method, timestamp)
- **Pagination**: Navigate through large event lists
- **Stats Card**: Shows total count of token events

### Data Management
- **Real-time Updates**: Events appear immediately after detection
- **Data Persistence**: Events stored in IndexedDB/SQLite
- **Clear Function**: Remove all data including token events
- **Privacy**: Sensitive data is redacted with placeholder text

## Privacy & Security

### Data Redaction
- Token values are never stored - replaced with `[REDACTED - token acquired/refreshed]`
- Only metadata is captured (URL, method, status, timestamp)
- No request/response bodies containing sensitive data

### Storage
- Events stored locally only (no external transmission)
- Uses same storage mechanism as network requests
- Respects user's data clearing preferences

## Verification Steps

### 1. Basic Functionality
- [ ] Token acquisition events are captured on successful auth (2xx status)
- [ ] Token refresh events are captured on successful refresh (2xx status)
- [ ] Refresh error events are captured on failed refresh (4xx/5xx status)
- [ ] Events appear in dashboard immediately
- [ ] Sensitive data is properly redacted

### 2. Dashboard Features
- [ ] Events display in table format with correct columns
- [ ] Filtering by event type works correctly
- [ ] Search functionality works for URL and type
- [ ] Sorting works for all columns
- [ ] Pagination works with large event lists
- [ ] Stats card shows accurate count

### 3. Data Management
- [ ] Events persist between browser sessions
- [ ] Clear data function removes token events
- [ ] No sensitive information is stored
- [ ] Events load correctly on dashboard refresh

## Common Test Scenarios

### Scenario 1: Login Flow
1. Navigate to a login page
2. Enter credentials and submit
3. Verify `acquire` event captured with 200 status
4. Check dashboard shows event with correct details

### Scenario 2: Session Management
1. Stay logged in to an application
2. Wait for automatic token refresh (or trigger manually)
3. Verify `refresh` event captured
4. Check timestamp and URL are correct

### Scenario 3: Authentication Failure
1. Trigger an expired token scenario
2. Attempt to refresh the token
3. Verify `refresh_error` event captured with 401/403 status
4. Confirm error is properly categorized

### Scenario 4: Mixed Usage
1. Perform multiple auth actions (login, refresh, errors)
2. Use filtering to view specific event types
3. Use search to find specific URLs
4. Test pagination with multiple events
5. Verify sorting works correctly

## Troubleshooting

### Events Not Appearing
- Check if requests match the monitored endpoint patterns
- Verify requests have appropriate HTTP methods (POST for acquire, POST/GET for refresh)
- Ensure extension is enabled and has necessary permissions
- Check browser developer console for errors

### Dashboard Issues
- Refresh the dashboard page
- Check browser console for JavaScript errors
- Verify storage permissions are granted
- Clear extension data and test again

### Performance Considerations
- Large numbers of events may affect dashboard loading
- Use filtering and search to manage large datasets
- Consider clearing old data periodically
- Monitor browser memory usage during extended testing

## Test Results Documentation

When testing, document:
- Event detection accuracy
- Dashboard display correctness
- Filter/search functionality
- Performance with large datasets
- Privacy/security compliance
- Cross-browser compatibility

## Integration Testing

The token event tracking integrates with:
- Network request monitoring (shares detection pipeline)
- Storage management (same database/storage system)
- Dashboard display (consistent UI patterns)
- Settings management (respects user preferences)

Test these integrations to ensure no conflicts or data corruption occurs.
