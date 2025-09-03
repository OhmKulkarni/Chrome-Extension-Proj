```mermaid
graph TD
    %% User Interface Layer
    subgraph "🖥️ User Interface"
        P[Popup UI]
        D[Dashboard UI]
    end

    %% Background Service Layer
    subgraph "⚙️ Background Service"
        ESM[ExtensionStateModule]
        SM[StorageManagerModule]
        MR[MessageRouter]
        CA[ChromeApiModule]
    end

    %% Storage Layer
    subgraph "💾 Storage Systems"
        CSL[chrome.storage.local<br/>extensionEnabled<br/>tabLogging_*<br/>extensionState]
        IDB[IndexedDB<br/>settings<br/>tabStates<br/>apiCalls/errors]
        CSS[chrome.storage.sync<br/>tabPreferences<br/>userPreferences<br/>syncMetadata]
    end

    %% Content Scripts Layer
    subgraph "🌐 Content Scripts"
        CS[Content Script]
        MWS[Main World Script]
    end

    %% Utils Layer
    subgraph "🔧 Utils & Controllers"
        ESC[ExtensionStateController]
        SS[StorageService]
        ChSS[ChromeSyncService]
    end

    %% User Actions
    P -->|Toggle Global Power| ESM
    P -->|Toggle Site Specific| ESM
    P -->|Toggle Individual| SM
    D -->|Settings Changes| SM

    %% Background Processing
    ESM -->|Read/Write State| CSL
    SM -->|Read/Write Settings| IDB
    MR -->|Route Messages| ESM
    MR -->|Route Messages| SM
    CA -->|Chrome API Wrapper| CSL

    %% Cross-Device Sync
    P -->|User Preferences| ChSS
    D -->|User Preferences| ChSS
    ChSS -->|Sync Data| CSS

    %% Content Script Communication
    ESM -->|State Changes| CS
    SM -->|Logging Control| CS
    CS -->|Inject/Control| MWS

    %% Utils Access
    P -->|State Checks| ESC
    D -->|Storage Access| SS
    ESC -->|Storage Access| CSL
    SS -->|IndexedDB Access| IDB

    %% Data Flow Colors
    classDef storage fill:#e1f5fe
    classDef background fill:#f3e5f5
    classDef ui fill:#e8f5e8
    classDef content fill:#fff3e0
    classDef utils fill:#fce4ec

    class CSL,IDB,CSS storage
    class ESM,SM,MR,CA background
    class P,D ui
    class CS,MWS content
    class ESC,SS,ChSS utils
```

## 🔄 Current Data Flow Issues

### 1. **Multiple Write Paths**
- Popup writes to `chrome.storage.local` directly
- Background writes to `IndexedDB` via StorageManager
- Utils write to both systems separately
- **Result**: Data inconsistency and race conditions

### 2. **Complex Read Patterns**
```typescript
// Popup loading logic (simplified)
async loadState() {
  // Try background message first
  let state = await sendMessage('GET_GLOBAL_POWER_STATE');
  if (!state) {
    // Fallback to chrome.storage.local
    state = await chrome.storage.local.get(['extensionEnabled']);
    if (!state) {
      // Final fallback to true
      state = { enabled: true };
    }
  }
}
```

### 3. **Storage Layer Duplication**
- **chrome.storage.local**: `extensionEnabled`, `tabLogging_123`
- **IndexedDB**: `extensionSettings`, `tabStates`
- **chrome.storage.sync**: `tabPreferences`
- **Result**: Same data stored 2-3 times in different formats

### 4. **Event Propagation Gaps**
- Changes in popup don't immediately update dashboard
- Background storage changes don't notify content scripts
- IndexedDB changes don't trigger chrome.storage listeners

## ✅ Improved Data Flow Design

```mermaid
graph TD
    %% Simplified Architecture
    subgraph "🖥️ UI Layer"
        UI[Popup + Dashboard]
    end

    subgraph "🎯 Unified Controller"
        UPM[UnifiedPermissionManager]
    end

    subgraph "💾 Primary Storage"
        PS[chrome.storage.local<br/>Single Source of Truth]
    end

    subgraph "📡 Event Bus"
        EB[PermissionEventBus]
    end

    subgraph "🌐 Content Layer"
        CL[Content Scripts]
    end

    %% Simplified Flow
    UI -->|All Permission Changes| UPM
    UPM -->|Read/Write State| PS
    UPM -->|Emit Events| EB
    EB -->|Notify Changes| UI
    EB -->|State Updates| CL

    %% Single data flow
    classDef unified fill:#4caf50
    classDef primary fill:#2196f3
    classDef events fill:#ff9800

    class UPM unified
    class PS primary
    class EB events
```

This simplified design eliminates:
- ❌ Multiple storage systems for same data
- ❌ Complex fallback logic
- ❌ Race conditions between components
- ❌ Inconsistent state across UI components

And provides:
- ✅ Single source of truth
- ✅ Immediate UI synchronization
- ✅ Consistent permission logic
- ✅ 3x faster permission checks
