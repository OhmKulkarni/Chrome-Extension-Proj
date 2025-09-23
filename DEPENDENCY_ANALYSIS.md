# Chrome Extension Dependency Analysis & Legacy Code Detection

## 📊 **Dependency Tree Analysis**

### **Entry Points from Manifest**
1. **Background Service Worker**: `src/background/background-controller.ts`
2. **Content Script**: `src/content/content-modular.ts`
3. **Popup**: `src/popup/popup.html` → `src/popup/popup.tsx`
4. **Web Accessible**: `main-world-script.js`

### **Active Dependencies Traced from Entry Points**

#### **Background Service Worker Chain**
```
background-controller.ts
├── ChromeApiModule (shared/chrome-api.module.ts)
├── StorageManagerModule (shared/storage-manager.module.ts)
├── MessageRouterSimpleModule (shared/message-router-simple.module.ts)
├── NetworkProcessorModule (modules/network-processor.module.ts)
├── ConsoleHandlerModule (modules/console-handler.module.ts)
├── TokenTrackerModule (modules/token-tracker.module.ts)
├── ExtensionStateModule (modules/extension-state.module.ts)
├── EnvironmentStorageManager (environment-storage-manager.ts)
├── IndexedDBStorage (indexeddb-storage.ts)
├── UnifiedPermissionService (services/unified-permission-service.ts)
├── ExtensionStateController (utils/extensionStateController.ts)
├── LibraryDetector (utils/library-detector.ts)
├── ChromeSyncService (services/chrome-sync-service.ts)
└── Types: background-types.ts, storage-types.ts, network.ts
```

#### **Content Script Chain**
```
content-modular.ts
├── SharedInfrastructureModule (modules/shared-infrastructure.module.ts)
├── EdgeCaseActivationSystem (modules/edge-case-activation.module.ts)
└── ContentLibraryDetectionModule (modules/library-detection.module.ts)
```

#### **Popup Chain**
```
popup.tsx
├── UI Components (components/ui/*)
├── StorageService (utils/storage-service.ts)
├── ChromeSyncService (services/chrome-sync-service.ts)
└── UnifiedPermissionManager (utils/unified-permission-manager.ts)
```

#### **Dashboard Chain** (accessed via popup)
```
dashboard.tsx → decomposed-dashboard.tsx
├── Components: NetworkRequestsTable, ConsoleErrorsTable, TokenEventsTable
├── Timeline Components (components/timeline/*)
├── Chart Components (components/ChartComponents.tsx)
├── Storage Services
└── Shared Types & Utilities
```
