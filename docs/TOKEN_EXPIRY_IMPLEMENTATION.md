# Token Expiry Calculation and Display

## 🎯 Overview

The Web App Monitor extension now supports **automatic JWT token expiry extraction and display** in the Token Events table. This feature helps you track when tokens will expire and identify expired tokens at a glance.

## 🔧 How It Works

### 1. **Automatic JWT Expiry Extraction**
- The extension automatically detects JWT tokens in `Authorization: Bearer` headers
- Decodes the JWT payload to extract the standard `exp` claim (expiry timestamp)
- Stores the expiry timestamp with each token event for future reference

### 2. **Token Event Types with Expiry**
All token event types now support expiry information:
- **Acquire Events**: When new JWT tokens are obtained
- **Refresh Events**: When JWT tokens are refreshed
- **Refresh Error Events**: Failed refresh attempts (may still contain expiry info)
- **Expired Events**: 401/403 responses (useful for tracking token expiration)

### 3. **Smart Expiry Display**
The dashboard shows expiry information in two formats:
- **Absolute Time**: Full date and time when the token expires
- **Relative Time**: Human-readable time remaining (or "Expired" status)

## 📊 Dashboard Features

### Expiry Column Display
```
2025-08-03 15:30:45    ← Absolute expiry time
2h 15m remaining       ← Time remaining
```

### Status Indicators
- **🟢 Active**: Shows time remaining (e.g., "2h 15m remaining")
- **🟡 Expires Soon**: Less than 1 minute remaining
- **🔴 Expired**: Token has already expired
- **🔘 No Expiry**: Non-JWT tokens or missing expiry information

### Time Formats
- **Days**: "5d 12h remaining"
- **Hours**: "3h 45m remaining" 
- **Minutes**: "15m remaining"
- **Soon**: "⏰ Expires soon" (less than 1 minute)
- **Expired**: "⚠️ Expired" (past expiry time)

## 🧪 Testing

### Test File: `test-jwt-expiry.html`
Use the provided test page to simulate different JWT token scenarios:

1. **Short-lived Tokens** (5 minutes)
2. **Medium-lived Tokens** (1 hour)
3. **Long-lived Tokens** (24 hours)
4. **Weekly Refresh Tokens** (7 days)
5. **Monthly Refresh Tokens** (30 days)
6. **Expired Tokens** (already expired)
7. **Near-expired Tokens** (1 minute remaining)

### Testing Steps
1. Open `test-jwt-expiry.html` in your browser
2. Ensure the extension is enabled with token logging active
3. Click various test buttons to generate token events
4. Check the Dashboard > Token Events section
5. Verify expiry information is displayed correctly

## 🔒 Privacy & Security

### What We Extract
- **Only the `exp` claim**: Standard JWT expiry timestamp
- **No sensitive data**: Token content, user info, or secrets are never stored
- **Metadata only**: URL, method, status, timestamp, and expiry

### What We Don't Store
- ❌ Complete JWT tokens
- ❌ User identity information
- ❌ Token secrets or signatures
- ❌ Request/response bodies

## 🛠️ Technical Implementation

### JWT Expiry Extraction
```typescript
function extractTokenExpiry(headers: any): number | undefined {
  const authHeader = headers.authorization || headers.Authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // Check if it's a JWT (3 parts)
    if (token.split('.').length === 3) {
      try {
        // Decode payload (second part)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Extract standard 'exp' claim
        if (payload.exp && typeof payload.exp === 'number') {
          return payload.exp; // Unix timestamp in seconds
        }
      } catch (error) {
        // JWT decode failed - not a valid JWT
      }
    }
  }
  
  return undefined;
}
```

### Database Storage
The `expiry` field is stored as a Unix timestamp (seconds since epoch) in the `token_events` table:

```sql
CREATE TABLE token_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  value_hash TEXT,
  timestamp INTEGER,
  source_url TEXT,
  expiry INTEGER,  -- Unix timestamp in seconds
  status INTEGER,
  method TEXT,
  url TEXT
);
```

### Dashboard Display Logic
```typescript
// Convert Unix timestamp to Date
const expiryDate = new Date(event.expiry * 1000);

// Calculate time remaining
const timeRemaining = expiryDate.getTime() - Date.now();

// Display logic
if (timeRemaining <= 0) {
  return "⚠️ Expired";
} else if (timeRemaining < 60000) { // Less than 1 minute
  return "⏰ Expires soon";
} else {
  // Calculate days, hours, minutes remaining
  return formatTimeRemaining(timeRemaining);
}
```

## 🔍 Supported Token Types

### JWT Access Tokens
- **Format**: `Authorization: Bearer <jwt>`
- **Expiry Source**: JWT `exp` claim
- **Typical Lifetime**: 15 minutes to 24 hours

### JWT Refresh Tokens
- **Format**: `Authorization: Bearer <jwt>` on refresh endpoints
- **Expiry Source**: JWT `exp` claim
- **Typical Lifetime**: 7 days to 30 days

### JWT ID Tokens (OIDC)
- **Format**: JWT with identity claims
- **Expiry Source**: JWT `exp` claim
- **Typical Lifetime**: 1 hour to 24 hours

### Non-JWT Tokens
- **Format**: Opaque tokens, API keys, session tokens
- **Expiry Source**: Not available (shows "No expiry")
- **Note**: Some may have server-side expiry not visible to client

## 📈 Benefits

### For Developers
- **Token Lifecycle Visibility**: See exactly when tokens expire
- **Debugging**: Identify token expiry issues quickly
- **Testing**: Verify token lifetimes match expectations
- **Monitoring**: Track token refresh patterns

### For Security Teams
- **Compliance**: Monitor token lifetime policies
- **Risk Assessment**: Identify long-lived tokens
- **Incident Response**: Track token expiry during security events
- **Audit Trail**: Complete token lifecycle logging

### For DevOps
- **Proactive Monitoring**: Identify expiry-related failures
- **Performance**: Optimize token refresh timing
- **Troubleshooting**: Quick identification of auth issues
- **Metrics**: Track authentication overhead and patterns

## 🚀 Future Enhancements

### Planned Features
- **Expiry Alerts**: Notifications for soon-to-expire tokens
- **Refresh Predictions**: Predict when refresh will be needed
- **Token Lifetime Analytics**: Statistics on token usage patterns
- **Custom Expiry Logic**: Support for non-standard expiry claims
- **Bulk Operations**: Filter/sort by expiry status

---

**Implementation Date**: August 3, 2025  
**Feature Status**: ✅ Complete and Ready for Testing  
**Test Coverage**: Comprehensive JWT expiry scenarios included
