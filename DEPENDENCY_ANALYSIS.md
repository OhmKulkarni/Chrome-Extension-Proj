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

## 🗑️ **IDENTIFIED LEGACY/UNUSED FILES**

### **High Confidence - Safe to Remove**

#### **1. Test/Debug Files**
- `minimal-background.js` - Testing file, not referenced in manifest
- `src/test/` directory - All files unused in production
  - `storage-migration-test.html/ts`
  - `permission-library-detection-test.html/ts`
  - `label-based-categorization-test.html`
- `test/` directory - All HTML test files
  - `simple-test.html`, `iframe-domain-test.html`, etc.

#### **2. Backup Files**
- `src/content/modules/library-detection.module.ts.backup`
- `scripts/backup-timeline.ps1` - Development script only

#### **3. Enhanced/Alternative Implementations**
- `public/enhanced-main-world-script.js` - Alternative to `main-world-script.js`
- `src/popup/enhanced-popup.tsx` - Alternative to main `popup.tsx`

#### **4. Development Tools**
- `src/dashboard/components/ChartOptimizationDevTools.tsx` - Dev tool only
- `src/dashboard/components/timeline/test-import.ts`
- `src/dashboard/components/timeline/TESTING_CHECKLIST.md`

### **Medium Confidence - Review Before Removal**

#### **1. Migration Utilities** (May be needed for updates)
- `src/utils/permission-migration-utility.ts`
- `src/utils/domain-migration.ts`

#### **2. Feature System** (Partially used)
- `src/features/` directory - Some components may be unused
- `src/shared/contracts/` - Data contracts may be unused

#### **3. Alternative Popup Components**
- `src/popup/components/UnifiedPermissionDemo.tsx`
- `src/popup/components/LegacyPopupWrapper.tsx`

## 📈 **FILE USAGE ANALYSIS**

### **Actively Used (Keep)**
- All manifest entry points and their dependencies
- Core modular architecture files
- Dashboard components and tables
- Storage and messaging systems
- Timeline functionality
- UI components and utilities

### **Potentially Unused (Investigate)**
```
src/features/ - Alternative data providers
src/shared/contracts/ - V1 data contracts
src/shared/messaging/ - Message bus system
src/popup/components/PopupTabs.tsx - Tab system
src/dashboard/lib/ - Alternative storage managers
```

### **Deprecated/Legacy (Safe to Remove)**
```
minimal-background.js
src/test/
test/
*.backup files
enhanced-* alternative files
development tools
migration utilities (after stable release)
```

## 🎯 **CLEANUP RECOMMENDATIONS**

### **Phase 1: Safe Cleanup (Immediate)**
```bash
# Remove test files
rm -rf src/test/
rm -rf test/
rm minimal-background.js

# Remove backup files
rm src/content/modules/library-detection.module.ts.backup

# Remove development tools
rm src/dashboard/components/ChartOptimizationDevTools.tsx
rm src/dashboard/components/timeline/test-import.ts
rm src/dashboard/components/timeline/TESTING_CHECKLIST.md
```

### **Phase 2: Alternative Implementation Cleanup**
```bash
# Remove enhanced alternatives (if main versions work)
rm public/enhanced-main-world-script.js
rm src/popup/enhanced-popup.tsx
```

### **Phase 3: Feature System Evaluation**
- Analyze `src/features/` usage in dashboard
- Evaluate `src/shared/contracts/` necessity
- Check if popup tab system is used

## 💡 **BUILD OPTIMIZATION OPPORTUNITIES**

1. **Remove unused imports** in active files
2. **Tree-shake unused exports** from utility files
3. **Consolidate similar functionality** across modules
4. **Remove debug logging** in production builds

## ⚠️ **CAUTION AREAS**

- Migration utilities might be needed for user data transitions
- Some "unused" files might be referenced dynamically
- Dashboard feature flags might activate unused components
- Development tools might be needed for debugging production issues

---

**Total estimated cleanup**: ~50+ files, ~500KB reduction in bundle size
**Risk level**: Low to Medium (if following phased approach)
