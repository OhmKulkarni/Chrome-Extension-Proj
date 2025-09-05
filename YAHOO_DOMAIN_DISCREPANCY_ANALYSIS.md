# Yahoo Finance Domain Discrepancy Analysis & Solution

## 🔍 Problem Analysis

### Current Domain Counts (Yahoo Finance Example):
1. **Domain Stats Table**: 6 subdomains
   - `query1.finance.yahoo.com`, `finance.yahoo.com`, `udc.yahoo.com`, `query2.finance.yahoo.com`, `yfc-server-query.finance.yahoo.com`, `s.yimg.com`

2. **Domain Libraries Table**: 8 domains
   - `finance.yahoo.com`, `query1.finance.yahoo.com`, `query2.finance.yahoo.com`, `s.yimg.com`, `udc.yahoo.com`, `yahoo.com`, `yfc-server-query.finance.yahoo.com`, `yimg.com`

3. **Web Resources Table**: 13 domains
   - Shows individual libraries with their actual source domains

## 🎯 Root Cause Identified

The discrepancy is **technically correct** but **logically confusing**:

### Why `yimg.com` appears separately from `yahoo.com`:
- `s.yimg.com` correctly extracts to `yimg.com` (using `parts.slice(-2).join('.')`)
- `yimg.com` is Yahoo's separate image/static content domain
- `yahoo.com` is the main Yahoo domain
- These are actually **different** domains, even though they're both owned by Yahoo

### The Algorithm Works Correctly:
```javascript
// Domain extraction logic:
's.yimg.com'.split('.').slice(-2).join('.') → 'yimg.com' ✅
'finance.yahoo.com'.split('.').slice(-2).join('.') → 'yahoo.com' ✅
```

## 🔧 Solution: Domain Affiliation System

### Implemented Features:

1. **Domain Affiliation Mapping**:
   ```javascript
   const DOMAIN_AFFILIATIONS = {
     'yimg.com': 'yahoo.com',        // Yahoo images → Yahoo main
     'yahooapis.com': 'yahoo.com',   // Yahoo APIs → Yahoo main
     'googleapis.com': 'google.com', // Google APIs → Google main
     'gstatic.com': 'google.com',    // Google static → Google main
     // ... and many more
   };
   ```

2. **Intelligent Grouping**:
   - Libraries from `s.yimg.com` now grouped under `yahoo.com`
   - Libraries from `apis.google.com` grouped under `google.com`
   - Maintains source domain information for detailed breakdown

3. **Enhanced Domain Stats**:
   - Added `affiliatedDomains` field showing related domains
   - Added `parentDomain` field for domain hierarchy
   - Preserves original source domain for debugging

## 📊 Expected Results After Fix

### Before (Confusing):
- **Domain Libraries**: `yahoo.com` (3 libraries) + `yimg.com` (5 libraries) = 8 total
- User sees two separate entries for the same logical entity

### After (Intuitive):
- **Domain Libraries**: `yahoo.com` (8 libraries total, with dropdown showing source breakdown)
- User sees one consolidated entry with detailed source domain information

## 🎨 UI Improvements

### Domain Libraries Table Enhancement:
```
yahoo.com                    8 libraries
├─ 📦 3 libraries from finance.yahoo.com
├─ 🎨 5 libraries from s.yimg.com
└─ 🔗 Affiliated domains: yimg.com, yahooapis.com
```

### Expandable Source Domain View:
- Click to expand shows breakdown by actual source domains
- Maintains technical accuracy while improving user understanding
- Shows third-party classifications for each source

## 🧪 Testing

Test the fix with common multi-domain companies:
- **Yahoo**: `yahoo.com` + `yimg.com` + `yahooapis.com`
- **Google**: `google.com` + `googleapis.com` + `gstatic.com` + `googletagmanager.com`
- **Facebook**: `facebook.com` + `fbcdn.net` + `instagram.com`
- **Amazon**: `amazon.com` + `amazonaws.com` + `cloudfront.net`

## 🔄 Migration Notes

- Existing data will be automatically regrouped using the new affiliation logic
- No data loss - original source domains preserved in library records
- Gradual rollout as new data is captured with updated grouping
