## Service Label Removal & Domain Expandability Explanation

### ✅ **Service Label Removed**

The "Service" badge and all its hardcoded logic have been completely removed:

#### **Changes Made:**
1. **Removed `SERVICE_GROUPS` constant** - No more hardcoded list of services
2. **Removed `getServiceGroup()` function** - No more service detection logic
3. **Updated `DomainInfo` interface** - Removed `serviceGroup` property
4. **Updated `DomainStats` interface** - Removed `serviceGroup` property
5. **Removed Service badge from UI** - No more purple "Service" labels
6. **Simplified `isGrouped` logic** - Now only based on actual domain relationships

#### **Result:**
- **Cleaner UI** without unnecessary labels
- **No hardcoded assumptions** about what constitutes a "service"
- **Smaller bundle size** with less code
- **More flexible** - works with any domain without predefined lists

---

### 🔍 **Why Only Some Domains Are Expandable**

A domain shows the expand/collapse chevron (▼/▶) and is expandable **only if** it has multiple related domains grouped under it.

#### **Expandability Conditions:**
A domain is expandable when **either** condition is true:

1. **Multiple Subdomains**: Different subdomains of the same base domain
   - Example: `reddit.com` groups `api.reddit.com`, `oauth.reddit.com`, `svc.reddit.com`

2. **Multiple Related Domains**: Different full domains grouped together
   - Example: `reddit.com` groups `reddit.com`, `www.reddit.com`, `shreddit.events`

#### **Logic in Code:**
```typescript
const isGrouped = group.subdomains.size > 1 || group.allGroupedDomains.size > 1;
```

#### **Examples:**

**✅ Expandable Domains:**
- **reddit.com** → Groups: `reddit.com`, `oauth.reddit.com`, `svc.reddit.com`, `svc.shreddit.events`
- **github.com** → Groups: `github.com`, `api.github.com`, `raw.githubusercontent.com`
- **google.com** → Groups: `google.com`, `apis.google.com`, `accounts.google.com`

**❌ Non-Expandable Domains:**
- **example.com** → Only has requests from `example.com` itself
- **localhost** → Only has requests from `localhost:3000`
- **unknown** → Single entry with no related domains

#### **Why This Happens:**
- **Single-domain sites**: If you only visit `example.com` and it doesn't make requests to subdomains, there's nothing to group
- **Simple websites**: Sites that don't use CDNs, APIs, or multiple subdomains won't be expandable
- **Limited data**: If the extension only captured requests from one subdomain, there's nothing to expand to

#### **Expected Behavior:**
This is **correct behavior** - only domains with actual relationships should be expandable. Domains with single entries don't need expansion since there's nothing additional to show.

---

### 🎯 **Summary:**
- **Service labels removed** - cleaner, less opinionated UI
- **Domain expandability** is based on actual data relationships, not arbitrary rules
- **Only domains with multiple related domains** show as expandable (which is the correct behavior)

The extension now provides a cleaner, more data-driven experience without hardcoded assumptions about services!
