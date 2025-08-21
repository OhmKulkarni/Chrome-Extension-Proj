# Chrome Extension Project - Complete File Structure Documentation

> **Purpose**: This file serves as a corruption detection reference and complete project inventory.
> **Generated**: August 20, 2025 (Updated August 21, 2025 after network fixes)
> **Total Files**: 152 files (cleaned - removed all empty placeholders)
> **Total Size**: ~1,234 KB source code (excluding node_modules, dist, .git)

## 🚨 Current Development Status (August 21, 2025)
**Network Issues Still Outstanding:**
- ❌ Network request bodies not getting captured (despite implementation fixes)
- ❌ Request/response sizes not displaying in dashboard
- ❌ Response time measurements not accurate

**Recent Fixes Attempted:**
- Enhanced network-interceptor.module.ts with requestSize/responseSize fields
- Updated NetworkRequestsTable.tsx interface and display logic
- Modified network-processor.module.ts field mapping
- Added new fields to ApiCall interface in storage-types.ts
- Implemented settings broadcast system for dynamic configuration

**Build Status**: ✅ Successfully building (no TypeScript errors)
**Architecture Status**: ✅ Modular structure maintained

## 🛠️ Network Fixes Implementation Details (August 21, 2025)

### Files Modified for Network Request Fixes
1. **src/content/modules/network-interceptor.module.ts**
   - Added requestSize and responseSize field calculations using Blob API
   - Enhanced XMLHttpRequest and Fetch API interception
   - Implemented high-precision timing with performance.now()
   - Changed default configuration: captureBody: true (was false)

2. **src/dashboard/components/NetworkRequestsTable.tsx**
   - Updated NetworkRequest interface with requestSize, responseSize, duration fields
   - Modified size display logic to show combined request+response size
   - Enhanced response time display to prioritize duration field
   - Added backward compatibility for old field names

3. **src/background/modules/network-processor.module.ts**
   - Updated field mapping to handle new size fields (requestSize, responseSize)
   - Enhanced duration field handling from network interceptor
   - Added support for both old and new field names in data processing

4. **src/background/storage-types.ts**
   - Extended ApiCall interface with request_size and response_size fields
   - Maintained backward compatibility with existing payload_size field

5. **src/background/shared/storage-manager.module.ts**
   - Updated getNetworkRequests mapping to include new size and duration fields
   - Added proper fallback logic for old vs new field names

6. **src/settings/settings.tsx**
   - Changed default settings: captureRequests: true, captureResponses: true
   - Previously defaulted to false, preventing any network capture

### Root Cause Analysis
The network issues persist despite implementation because:
- Settings may not be properly broadcasting to content scripts
- Content script initialization timing with settings loading
- Possible race conditions between interceptor setup and settings application

## 🏗️ Project Architecture Overview

### Core Modular Architecture
- **Background Modules**: 8 TypeScript modules (95.2 KB total)
- **Content Modules**: 4 TypeScript modules (73.5 KB total)
- **Dashboard Components**: 80+ React/TypeScript files (620+ KB)
- **Supporting Infrastructure**: Services, utilities, contracts

---

## 📁 Complete Directory Structure

### Root Level Files
```
📄 .copilot-instructions.md (2.8 KB)         # Copilot maintenance instructions
📄 .env (1.3 KB)                           # Environment variables
📄 .env.example (1.3 KB)                   # Environment template
📄 .env.production (0.1 KB)                # Production environment
📄 .eslintrc.cjs (0.9 KB)                  # ESLint configuration
📄 .prettierrc (0.4 KB)                    # Prettier configuration
📄 analysis-results.md (6.1 KB)            # Architecture analysis
📄 analysis-results-complete.md (5.9 KB)   # Complete analysis
📄 background-test.js (1.2 KB)             # Background script testing
📄 final-architecture-audit.md (6.8 KB)    # Final audit report
📄 minimal-background.js (2 KB)            # Minimal background test
📄 package.json (1.7 KB)                   # Project dependencies
📄 package-lock.json (224.6 KB)            # Lock file
📄 postcss.config.js (0.2 KB)              # PostCSS configuration
📄 project-structure-reference.md (19.2 KB) # This file - structure reference
📄 README.md (1.3 KB)                      # Project documentation
📄 tailwind.config.js (2.6 KB)             # Tailwind configuration
📄 test-network.html (2.1 KB)              # Network interceptor testing page (NEW)
📄 test-results.md (4.7 KB)                # Test execution results
📄 tsconfig.json (0.9 KB)                  # TypeScript configuration
📄 vite.config.ts (2.9 KB)                 # Vite build configuration
```

### 📁 public/ (1 file)
```
📄 public/main-world-script.js (23.9 KB)   # Main world injection script
```

### 📁 scripts/ (4 files)
```
📄 scripts/backup-timeline.ps1 (1.7 KB)    # Timeline backup utility
📄 scripts/check-file-integrity.ps1 (3.4 KB) # File integrity checker
📄 scripts/check-integrity.ps1 (1.8 KB)    # Simplified integrity check
📄 scripts/emergency-cleanup.ps1 (1.6 KB)  # Emergency cleanup utility
```

---

## 📁 src/ - Main Source Directory

### 📁 src/background/ - Background Script Architecture
```
📄 src/background/background-controller.ts (13.5 KB)           # Main controller
📄 src/background/environment-storage-manager.ts (8.5 KB)      # Legacy storage
📄 src/background/indexeddb-storage.ts (43.7 KB)              # IndexedDB implementation
📄 src/background/storage-types.ts (4.7 KB)                   # Storage type definitions
```

#### 📁 src/background/modules/ - Background Modules (4 files)
```
📄 src/background/modules/console-handler.module.ts (14.9 KB)    # Console event handling
📄 src/background/modules/extension-state.module.ts (12.9 KB)    # Extension state management
📄 src/background/modules/network-processor.module.ts (17.2 KB)  # Network request processing
📄 src/background/modules/token-tracker.module.ts (23.5 KB)      # Authentication token tracking
```

#### 📁 src/background/shared/ - Shared Background Services (3 files)
```
📄 src/background/shared/chrome-api.module.ts (9.7 KB)                    # Chrome API abstraction
📄 src/background/shared/message-router-simple.module.ts (27.6 KB)        # Active message router
📄 src/background/shared/storage-manager.module.ts (30.8 KB)              # Storage management
```

#### 📁 src/background/types/ - Background Type Definitions (2 files)
```
📄 src/background/types/background-types.ts (4.5 KB)        # Background script types
📄 src/background/types/network.ts (1.3 KB)                # Network-related types
```

#### 📁 src/background/utils/ - Background Utilities (1 file)
```
📄 src/background/utils/domainAnalyzer.ts (4.7 KB)         # Domain analysis utility
```

### 📁 src/content/ - Content Script Architecture
```
📄 src/content/content-modular.ts (8 KB)                   # Main content script entry
```

#### 📁 src/content/modules/ - Content Script Modules (4 files)
```
📄 src/content/modules/console-interceptor.module.ts (17.4 KB)       # Console interception
📄 src/content/modules/edge-case-activation.module.ts (6.7 KB)       # Smart activation system
📄 src/content/modules/network-interceptor.module.ts (11.7 KB)       # Network interception
📄 src/content/modules/shared-infrastructure.module.ts (37.7 KB)     # Module coordination
```

### 📁 src/dashboard/ - Dashboard UI Architecture

#### Root Dashboard Files
```
📄 src/dashboard/dashboard.css (2.9 KB)                    # Dashboard styles
📄 src/dashboard/dashboard.html (0.4 KB)                   # Dashboard HTML
📄 src/dashboard/dashboard.tsx (68.1 KB)                   # Main dashboard component
📄 src/dashboard/decomposed-dashboard.tsx (67.1 KB)        # Decomposed dashboard
```

#### 📁 src/dashboard/components/ - Dashboard Components (20 files)
```
📄 src/dashboard/components/ChartComponents.tsx (118.7 KB)              # Large chart collection
📄 src/dashboard/components/CollapsibleSidebar.tsx (16.8 KB)            # Collapsible sidebar
📄 src/dashboard/components/ConsoleErrorsTable.tsx (14 KB)              # Console errors display
📄 src/dashboard/components/DashboardHeader.tsx (2.4 KB)                # Header component
📄 src/dashboard/components/DashboardSidebar.tsx (9.1 KB)               # Main sidebar
📄 src/dashboard/components/domainUtils.ts (12.9 KB)                    # Domain utilities
📄 src/dashboard/components/LazyChartComponents.tsx (2.8 KB)            # Lazy-loaded charts
📄 src/dashboard/components/LazyStatisticsCard.tsx (1.3 KB)             # Lazy statistics
📄 src/dashboard/components/LeftSidebar.tsx (14.2 KB)                   # Left navigation
📄 src/dashboard/components/NetworkRequestsTable.tsx (18.8 KB)          # Network requests display
📄 src/dashboard/components/PerformanceMonitor.ts (7.8 KB)              # Performance monitoring
📄 src/dashboard/components/PerformanceMonitoringDashboard.tsx (11.9 KB) # Performance dashboard
📄 src/dashboard/components/PerformanceTable.tsx (0.6 KB)               # Performance table
📄 src/dashboard/components/SettingsInline.tsx (44.1 KB)                # Inline settings
📄 src/dashboard/components/SimpleCharts.tsx (3.7 KB)                   # Simple chart components
📄 src/dashboard/components/SimpleTestChart.tsx (1.3 KB)                # Test chart
📄 src/dashboard/components/StatisticsCard.tsx (55.9 KB)                # Statistics display
📄 src/dashboard/components/TokenEventsTable.tsx (16 KB)                # Token events display
📄 src/dashboard/components/UsageCard.tsx (33.1 KB)                     # Usage statistics
```

#### 📁 src/dashboard/components/charts/ - Chart Components (6 files)
```
📄 src/dashboard/components/charts/DomainActivityChart.tsx (1 KB)        # Domain activity chart
📄 src/dashboard/components/charts/ErrorsOverTimeChart.tsx (1.1 KB)      # Errors timeline chart
📄 src/dashboard/components/charts/index.ts (0.9 KB)                     # Chart exports
📄 src/dashboard/components/charts/RequestsOverTimeChart.tsx (1.1 KB)    # Requests timeline
📄 src/dashboard/components/charts/TokenEventsOverTimeChart.tsx (1.1 KB) # Token events timeline
📄 src/dashboard/components/charts/TopApiEndpointsChart.tsx (1.2 KB)     # Top endpoints chart
```

#### 📁 src/dashboard/components/timeline/ - Timeline Visualization (21 files)
```
📄 src/dashboard/components/timeline/test-import.ts (0.1 KB)             # Timeline test
📄 src/dashboard/components/timeline/TimelineVisualization.tsx (4.3 KB)  # Main timeline
```

##### 📁 src/dashboard/components/timeline/components/ (11 files)
```
📄 timeline/components/AllTimeViewDemo.tsx (4.4 KB)           # Demo component
📄 timeline/components/CompareView.tsx (6.1 KB)              # Comparison view
📄 timeline/components/DensityCluster.tsx (4.4 KB)           # Density clustering
📄 timeline/components/EventCard.tsx (4.3 KB)                # Event card display
📄 timeline/components/EventCluster.tsx (2.2 KB)             # Event clustering
📄 timeline/components/EventListPopup.tsx (6.6 KB)          # Event list popup
📄 timeline/components/EventPopup.tsx (3.7 KB)              # Event detail popup
📄 timeline/components/Swimlane.tsx (5.8 KB)                # Timeline swimlane
📄 timeline/components/SwimlanesContainer.tsx (9.4 KB)      # Swimlanes container
📄 timeline/components/TimelineHeader.tsx (0.8 KB)          # Timeline header
📄 timeline/components/TimelineHeaderMinimal.tsx (0.1 KB)   # Minimal header
📄 timeline/components/TimelineHeaderNew.tsx (16.7 KB)      # Enhanced header
📄 timeline/components/TimelineSidebar.tsx (6 KB)           # Timeline sidebar
📄 timeline/components/TimeMarkers.tsx (3.1 KB)             # Time markers
```

##### 📁 src/dashboard/components/timeline/hooks/ (4 files)
```
📄 timeline/hooks/useOptimizedTimelineData.ts (2.9 KB)      # Optimized data hook
📄 timeline/hooks/useTimelineData.ts (4.4 KB)              # Timeline data hook
📄 timeline/hooks/useTimelineVisualization.ts (3.7 KB)     # Visualization hook
📄 timeline/hooks/useViewport.ts (5.3 KB)                  # Viewport management
```

##### 📁 src/dashboard/components/timeline/services/ (2 files)
```
📄 timeline/services/timelineDataService.ts (7.4 KB)       # Timeline data service
📄 timeline/services/TimelineService.ts (7.4 KB)          # Timeline service
```

##### 📁 src/dashboard/components/timeline/types/ (1 file)
```
📄 timeline/types/timeline.types.ts (4.8 KB)               # Timeline type definitions
```

#### 📁 src/dashboard/components/ui/ - UI Components (4 files)
```
📄 src/dashboard/components/ui/button.tsx (1.8 KB)          # Button component
📄 src/dashboard/components/ui/card.tsx (1.9 KB)            # Card component
📄 src/dashboard/components/ui/table.tsx (2.8 KB)           # Table component
📄 src/dashboard/components/ui/tabs.tsx (1.9 KB)            # Tabs component
```

#### 📁 src/dashboard/features/ - Feature Modules

##### 📁 src/dashboard/features/errors/ - Error Management (4 files)
```
📄 features/errors/ErrorDashboard.tsx (4.3 KB)             # Error dashboard
📄 features/errors/components/ErrorFilters.tsx (3.7 KB)    # Error filtering
📄 features/errors/components/ErrorTable.tsx (6 KB)        # Error table display
📄 features/errors/hooks/useErrorData.ts (5.2 KB)         # Error data hook
```

##### 📁 src/dashboard/features/network/ - Network Management (4 files)
```
📄 features/network/NetworkDashboard.tsx (4.3 KB)          # Network dashboard
📄 features/network/components/NetworkFilters.tsx (3.9 KB) # Network filtering
📄 features/network/components/NetworkTable.tsx (8.9 KB)   # Network table display
📄 features/network/hooks/useNetworkData.ts (5.5 KB)      # Network data hook
```

##### 📁 src/dashboard/features/tokens/ - Token Management (2 files)
```
📄 features/tokens/TokenDashboard.tsx (7.8 KB)            # Token dashboard
📄 features/tokens/hooks/useTokenData.ts (4.4 KB)        # Token data hook
```
📄 features/tokens/TokenDashboard.tsx (7.8 KB)            # Token dashboard
📄 features/tokens/hooks/useTokenData.ts (4.4 KB)        # Token data hook
```

#### 📁 src/dashboard/lib/ - Dashboard Libraries (6 files)
```
📄 src/dashboard/lib/chrome-api-utils.ts (0.8 KB)          # Chrome API utilities
📄 src/dashboard/lib/DashboardUpdateManager.ts (7.4 KB)    # Update management
📄 src/dashboard/lib/DecoupledExtensionController.ts (8.6 KB) # Extension controller
📄 src/dashboard/lib/InterceptionManager.ts (7.3 KB)       # Interception management
📄 src/dashboard/lib/StorageManager.ts (9.8 KB)            # Storage management
📄 src/dashboard/lib/utils.ts (0.2 KB)                     # General utilities
```

#### 📁 src/dashboard/shared/ - Shared Dashboard Components

##### 📁 src/dashboard/shared/components/ (2 files)
```
📄 shared/components/DetailedViews.tsx (49.6 KB)           # Detailed view components
📄 shared/components/Pagination.tsx (4.1 KB)              # Pagination component
```

##### 📁 src/dashboard/shared/hooks/ (1 file)
```
📄 shared/hooks/useChromeMessage.ts (1.7 KB)              # Chrome messaging hook
```

##### 📁 src/dashboard/shared/types/ (1 file)
```
📄 shared/types/index.ts (1.8 KB)                         # Shared type definitions
```

##### 📁 src/dashboard/shared/utils/ (1 file)
```
📄 shared/utils/dataUtils.ts (4 KB)                       # Data utility functions
```

#### 📁 src/dashboard/utils/ - Dashboard Utilities (2 files)
```
📄 src/dashboard/utils/domainUtils.ts (5.6 KB)            # Domain utilities
📄 src/dashboard/utils/types.ts (0.8 KB)                  # Utility types
```

### 📁 src/features/ - Feature Data Providers (3 files)
```
📄 src/features/console/console-data-provider.ts (12.2 KB)   # Console data provider
📄 src/features/network/network-data-provider.ts (12.4 KB)   # Network data provider
📄 src/features/tokens/token-data-provider.ts (18.2 KB)      # Token data provider
```

### 📁 src/popup/ - Extension Popup (7 files)
```
📄 src/popup/popup.css (0.4 KB)                            # Popup styles
📄 src/popup/popup.html (0.3 KB)                           # Popup HTML
📄 src/popup/popup.tsx (29.5 KB)                           # Main popup component
📄 src/popup/lib/utils.ts (0.2 KB)                         # Popup utilities
```

#### 📁 src/popup/components/ui/ - Popup UI Components (3 files)
```
📄 popup/components/ui/button.tsx (1.8 KB)                 # Popup button
📄 popup/components/ui/card.tsx (1.9 KB)                   # Popup card
📄 popup/components/ui/switch.tsx (2.5 KB)                 # Popup switch
```

### 📁 src/services/ - Global Services (1 file)
```
📄 src/services/chrome-sync-service.ts (8.3 KB)            # Chrome sync service
```

### 📁 src/settings/ - Settings Page (8 files)
```
📄 src/settings/settings.css (1.7 KB)                      # Settings styles
📄 src/settings/settings.html (0.4 KB)                     # Settings HTML
📄 src/settings/settings.tsx (42.2 KB)                     # Main settings component
📄 src/settings/lib/utils.ts (0.2 KB)                      # Settings utilities
```

#### 📁 src/settings/components/ui/ - Settings UI Components (5 files)
```
📄 settings/components/ui/button.tsx (1.8 KB)              # Settings button
📄 settings/components/ui/card.tsx (1.9 KB)                # Settings card
📄 settings/components/ui/input.tsx (0.8 KB)               # Settings input
📄 settings/components/ui/select.tsx (0.8 KB)              # Settings select
📄 settings/components/ui/switch.tsx (2.2 KB)              # Settings switch
```

### 📁 src/shared/ - Shared Infrastructure (5 files)
```
📄 src/shared/contracts/data.contract.ts (12.4 KB)         # Data contracts
📄 src/shared/contracts/message.contract.ts (7.7 KB)       # Message contracts
📄 src/shared/messaging/message-bus.ts (13.3 KB)           # Message bus system
```

### 📁 src/test/ - Test Infrastructure (2 files)
```
📄 src/test/storage-migration-test.html (1.5 KB)           # Storage test HTML
📄 src/test/storage-migration-test.ts (3.7 KB)             # Storage migration tests
```

### 📁 src/types/ - Global Types (1 file)
```
📄 src/types/sync-storage-types.ts (2.9 KB)                # Sync storage types
```

### 📁 src/utils/ - Global Utilities (2 files)
```
📄 src/utils/extensionStateController.ts (7.4 KB)          # Extension state controller
📄 src/utils/storage-service.ts (4.4 KB)                   # Storage service
```

### Core Configuration Files
```
📄 src/manifest.json (1.1 KB)                              # Extension manifest
```

---

## 🚨 Files Status: CLEANED ✅

All empty placeholder files and unused duplicates have been removed from the project.

### 📊 Size Analysis
- **Largest Files**:
  - `ChartComponents.tsx` (118.7 KB)
  - `dashboard.tsx` (68.1 KB)
  - `StatisticsCard.tsx` (55.9 KB)
- **Module Sizes**:
  - Background modules: 68.5 KB
  - Content modules: 73.5 KB
  - Dashboard components: 620+ KB

---

## 🔍 Corruption Detection Markers

**File Count Check**: 152 total files (cleaned from 205)
**Critical Files Integrity**:
- ✅ All 12 module files present and sized correctly
- ✅ All configuration files present
- ✅ All HTML entry points present
- ✅ No empty files remaining - all cleaned up

**Cleanup Summary**:
- ❌ Removed 17 empty placeholder files (0 KB)
- ❌ Removed 1 unused duplicate file
- ❌ Removed 35+ backup files (.new extensions)
- ✅ **Total cleanup: 53 files removed**

**Last Updated**: August 20, 2025 (Post-cleanup)
**Generated By**: GitHub Copilot Architecture Analysis System---

> **Note**: This documentation should be updated whenever files are added, removed, or significantly modified. Use the Copilot instruction file to maintain this automatically.
