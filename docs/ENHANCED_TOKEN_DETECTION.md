# Enhanced Token Type Detection - Implementation Guide

## 🎯 Overview

The Chrome extension now features comprehensive token type detection and classification system that can identify and categorize different types of authentication tokens based on their format, headers, and usage context.

## 🔍 Token Types Supported

### 1. **Access Tokens**
Used to authorize API requests and access protected resources.

#### Formats:
- **JWT Access Token**: `Authorization: Bearer <jwt>` - 3-part JWT format
- **Opaque Access Token**: `Authorization: Bearer <opaque>` - Single string token
- **Cookie Access Token**: `Cookie: access_token=<token>` - Token stored in cookie

#### Recognition Logic:
```typescript
if (authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  if (isJwt(token)) return 'Access Token (JWT)';
  return 'Access Token (Opaque)';
}
if (cookieHeader.includes('access_token=')) return 'Access Token (Cookie)';
```

### 2. **Refresh Tokens**
Used to obtain new access tokens without re-authentication.

#### Formats:
- **JWT Refresh Token**: JWT format used on refresh endpoints
- **Opaque Refresh Token**: Opaque string used on refresh endpoints

#### Recognition Logic:
```typescript
if (url.includes('/refresh') || url.includes('/token') || url.includes('/renew')) {
  if (isJwt(token)) return 'Refresh Token (JWT)';
  return 'Refresh Token (Opaque)';
}
```

### 3. **ID Tokens (OpenID Connect)**
Contains user identity information in OIDC flows.

#### Format:
- Always JWT format with specific claims (`sub`, `email`, `aud`, `iss`)

#### Recognition Logic:
```typescript
if (jwtPayload && ('sub' in payload && 'email' in payload || 'aud' in payload)) {
  return 'ID Token (JWT)';
}
```

### 4. **API Keys**
Simple authentication for server-to-server or developer APIs.

#### Formats:
- **Header API Key**: `x-api-key: <key>`
- **Authorization API Key**: `Authorization: ApiKey <key>`
- **Prefixed Keys**: Keys starting with `sk_`, `proj_`, `key_`

#### Recognition Logic:
```typescript
if (apiKeyHeader || authHeader.startsWith('ApiKey ')) return 'API Key';
if (key.startsWith('sk_') || key.includes('proj_')) return 'API Key';
```

### 5. **Session Tokens**
Maintain login sessions via cookies.

#### Formats:
- **Session Cookie**: `Cookie: sessionid=<token>`
- **Java Session**: `Cookie: JSESSIONID=<token>`
- **PHP Session**: `Cookie: PHPSESSID=<token>`
- **ASP.NET Session**: `Cookie: ASP.NET_SessionId=<token>`

#### Recognition Logic:
```typescript
if (cookieHeader.includes('sessionid=') || 
    cookieHeader.includes('JSESSIONID=') ||
    cookieHeader.includes('PHPSESSID=')) {
  return 'Session Token';
}
```

### 6. **CSRF Tokens**
Prevent cross-site request forgery attacks.

#### Format:
- **CSRF Header**: `X-CSRF-Token: <token>`

#### Recognition Logic:
```typescript
if (csrfHeader) return 'CSRF Token';
```

### 7. **State Tokens**
Temporary tokens used in OAuth flows and magic links.

#### Formats:
- **OAuth State**: URL parameter or header
- **Custom State**: `X-State-Token: <token>`

#### Recognition Logic:
```typescript
if (url.includes('state=') || headers['x-state-token']) return 'State Token';
```

### 8. **Basic Authentication**
Traditional username:password authentication.

#### Format:
- **Basic Auth**: `Authorization: Basic <base64>`

#### Recognition Logic:
```typescript
if (authHeader.startsWith('Basic ')) return 'Basic Auth';
```

### 9. **Custom Authentication Schemes**
Application-specific authentication methods.

#### Examples:
- `Authorization: Signature <signature>`
- `Authorization: Custom <token>`
- `Authorization: MyApp <token>`

#### Recognition Logic:
```typescript
if (authHeader && !authHeader.startsWith('Bearer ') && !authHeader.startsWith('Basic ')) {
  const scheme = authHeader.split(' ')[0];
  return `${scheme} Token`;
}
```

## 🎨 Visual Representation

### Badge Colors and Icons:
- **🎫 JWT-based**: Purple badges (`bg-purple-100 text-purple-800`)
- **🔑 Access Tokens**: Blue badges (`bg-blue-100 text-blue-800`)
- **🔄 Refresh Tokens**: Cyan badges (`bg-cyan-100 text-cyan-800`)
- **👤 ID Tokens**: Emerald badges (`bg-emerald-100 text-emerald-800`)
- **🔐 Basic Auth**: Orange badges (`bg-orange-100 text-orange-800`)
- **🗝️ API Keys**: Indigo badges (`bg-indigo-100 text-indigo-800`)
- **🍪 Session Tokens**: Green badges (`bg-green-100 text-green-800`)
- **🛡️ CSRF Tokens**: Red badges (`bg-red-100 text-red-800`)
- **🎫 State Tokens**: Yellow badges (`bg-yellow-100 text-yellow-800`)
- **🔧 Custom Schemes**: Teal badges (`bg-teal-100 text-teal-800`)

## 📊 Dashboard Integration

### Token Events Table Columns:
1. **Event Type**: acquire, refresh, refresh_error, expired
2. **Token Type**: Enhanced classification with visual badges
3. **URL**: Request endpoint
4. **Status**: HTTP response status
5. **Method**: HTTP method (GET, POST, etc.)
6. **Value Hash**: Redacted token information
7. **Expiry**: Token expiration time (if available)
8. **Timestamp**: Event occurrence time

### Detail View Features:
- **Token Analysis**: Comprehensive breakdown of token properties
- **Header Inspection**: Full request/response headers with expandable values
- **Security Classification**: Token type explanation and use case
- **Privacy Protection**: All sensitive data properly redacted

## 🔧 Implementation Details

### Backend Detection (`background.ts`):
```typescript
function detectTokenTypeFromHeaders(headers: any, url: string): string {
  // Enhanced logic to analyze headers and context
  // Returns specific token type classification
}
```

### Frontend Display (`dashboard.tsx`):
```typescript
const getTokenType = (): string => {
  // Frontend analysis of token events
  // Includes JWT decoding and context analysis
}
```

### Storage Enhancement:
- Token types stored in `value_hash` field with descriptive format
- Examples: `[REDACTED - token acquired: Access Token (JWT)]`
- Maintains privacy while providing classification info

## 🧪 Testing

### Comprehensive Test Suite (`test-token-types.html`):
- **JWT Access Tokens**: Various JWT formats and claims
- **Opaque Access Tokens**: Non-JWT bearer tokens
- **Refresh Tokens**: Both JWT and opaque refresh scenarios
- **ID Tokens**: OIDC identity tokens with user claims
- **API Keys**: Multiple API key formats and headers
- **Session Tokens**: Various cookie-based sessions
- **CSRF Tokens**: Cross-site request forgery protection
- **State Tokens**: OAuth and temporary tokens
- **Custom Authentication**: Application-specific schemes
- **Batch Testing**: Comprehensive test suite runner

### Test Coverage:
- ✅ 25+ different token format variations
- ✅ Real-world authentication scenarios
- ✅ Edge cases and error conditions
- ✅ Cross-browser compatibility
- ✅ Performance with high-frequency requests

## 🚀 Usage Examples

### Real-World Scenarios:

1. **Modern SPA Authentication**:
   - Login: `Access Token (JWT)` detected
   - API calls: Automatic JWT classification
   - Refresh: `Refresh Token (JWT)` handling

2. **Legacy Web Applications**:
   - Login: `Session Token` via cookies
   - CSRF protection: `CSRF Token` detection
   - Form submissions: Comprehensive token analysis

3. **API Integration**:
   - Server-to-server: `API Key` classification
   - OAuth flows: `State Token` and `ID Token` handling
   - Custom authentication: Flexible scheme detection

4. **Multi-tenant Applications**:
   - Tenant-specific tokens: Custom scheme recognition
   - Role-based tokens: JWT payload analysis
   - Cross-domain authentication: Cookie and header analysis

## 📈 Benefits

### For Developers:
- **Comprehensive Monitoring**: See exactly what token types your app uses
- **Security Analysis**: Identify token usage patterns and potential issues
- **Debug Authentication**: Understand token flows and failures
- **Privacy Compliance**: No sensitive data exposure during monitoring

### For Security Teams:
- **Token Inventory**: Complete visibility into authentication mechanisms
- **Risk Assessment**: Identify insecure token practices
- **Compliance Monitoring**: Track authentication compliance requirements
- **Incident Investigation**: Detailed token event logging

### For DevOps:
- **Performance Monitoring**: Track authentication overhead
- **Integration Analysis**: Understand service-to-service authentication
- **Deployment Verification**: Ensure tokens work across environments
- **Troubleshooting**: Quick identification of authentication issues

## 🔮 Future Enhancements

### Planned Features:
- **Token Lifecycle Tracking**: Monitor token creation to expiration
- **Security Scoring**: Rate token security practices
- **Anomaly Detection**: Identify unusual token usage patterns
- **Integration Mapping**: Visualize service authentication dependencies
- **Export Capabilities**: Generate compliance and security reports

This enhanced token type detection system provides comprehensive visibility into authentication mechanisms while maintaining strict privacy and security standards.
