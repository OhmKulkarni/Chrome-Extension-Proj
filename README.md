# Web Analytics Chrome Extension

**Enterprise-grade web analytics and network monitoring extension built with AI-assisted architecture design.**

> **Development Timeline**: 6 weeks of active development (excluding documented breaks)
> **Tech Stack**: Manifest V3, TypeScript, React, Vite, IndexedDB

---

## **Key Features**

### **Comprehensive Analytics Dashboard**
- **Real-time Network Monitoring**: HTTP/HTTPS request interception with detailed metrics
- **Console Error Tracking**: Automatic error capture with stack traces and severity levels
- **Token Security Analysis**: Authentication token detection and validation monitoring
- **Timeline Visualization**: Interactive timeline with density clustering and event correlation
- **Data Export**: CSV/JSON export with structured analytical data

### **Advanced Interception System**
- **Dual-Context Architecture**: Content script + main-world injection for comprehensive coverage
- **Permission-Based Controls**: Granular site-specific and global toggle system
- **Memory Optimization**: Automatic cleanup, leak prevention, and performance monitoring
- **Dark Mode Support**: Complete UI theming with professional design system

### **Enterprise Security Features**
- **Sandboxed Execution**: Secure service worker architecture
- **Data Privacy**: Local-only storage with optional sync capabilities
- **Resource Classification**: Automatic detection of libraries, APIs, and third-party services

---

## **Architecture Overview**

### **System Component Diagram**
```
┌───────────────────────────────────────────────────────────────┐
│                    Chrome Extension V3                        │
├───────────────────┬─────────────────┬─────────────────────────┤
│   Background      │   Content       │        UI Layer         │
│   Service         │   Scripts       │   (Popup/Dashboard)     │
│   Worker          │                 │                         │
│                   │                 │                         │
│ ┌───────────────┐ │ ┌─────────────┐ │ ┌─────────────────────┐ │
│ │BackgroundCtrl ├─┤ │SharedInfra  ├─┤ │  React Components   │ │
│ │               │ │ │  Module     │ │ │  + Recharts         │ │
│ │ - 7 Modules   │ │ │ - 5 Modules │ │ │  + TypeScript       │ │
│ │ - 1 Service   │ │ │ - Network   │ │ │  + Tailwind CSS     │ │
│ │ - IndexedDB   │ │ │ - Console   │ │ │  + Main-World       │ │
│ │ - Safety      │ │ │ - Library   │ │ │   Script Bridge     │ │
│ └───────────────┘ │ └─────────────┘ │ └─────────────────────┘ │
└───────────────────┴─────────────────┴─────────────────────────┘
```

### **Modular Background Architecture**
```typescript
class BackgroundController {
  // Core Processing Modules
  - networkProcessor: NetworkProcessor    // HTTP analysis & metrics
  - consoleHandler: ConsoleHandler       // Error tracking & logging
  - tokenTracker: TokenTracker          // Security monitoring
  - extensionState: ExtensionState      // State management

  // Infrastructure Services
  - chromeApi: ChromeApiModule          // Chrome API abstraction
  - storageManager: StorageManager      // IndexedDB operations
  - messageRouter: MessageRouter        // Cross-context communication
  - unifiedPermissions: PermissionService // Access control

  // Safety & Performance
  - abortController: AbortController    // Race condition prevention
  - memoryMonitoring: PerformanceTracker // Resource optimization
}
```

---

## **Quick Start**

### **Installation**
```bash
# Install dependencies
npm install

# Development build with hot reload
npm run dev

# Production build (optimized)
npm run build

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" → select dist/ folder
```

### **Development Commands**
```bash
npm run build:dev     # Development build
npm run build:prod    # Production build (minified)
npm run type-check    # TypeScript validation
npm run lint          # ESLint code quality check
```

---

## **Project Structure**

```
src/
├── background/           # Service worker architecture
│   ├── background-controller.ts    # Main orchestrator
│   ├── modules/         # Specialized processing modules
│   ├── services/        # Cross-cutting services
│   └── types/           # Type definitions
├── content/             # Page injection system
│   ├── content-modular.ts         # Content script entry
│   └── modules/         # Feature-specific modules
├── dashboard/           # Analytics interface
│   ├── components/      # React UI components
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Dashboard utilities
├── popup/               # Extension popup UI
└── shared/              # Cross-context utilities
```

---

## **Technical Achievements**

- **Modular Architecture**: AI-assisted refactoring from monolithic to enterprise-grade modular system
- **Performance Optimized**: 99.6% chart performance improvement (25s → 95ms load times)
- **Memory Safe**: Automatic leak detection, cleanup, and resource monitoring
- **Professional UI**: Complete dark mode with consistent design system
- **Scalable Storage**: IndexedDB with query optimization and memory limits

---

## **Demo Features**

Perfect for technical interviews and portfolio presentations:

1. **Live Network Analysis** - Real-time HTTP request monitoring
2. **Interactive Timeline** - Event correlation with density visualization
3. **Error Intelligence** - Stack trace analysis with severity classification
4. **Security Insights** - Token detection and validation monitoring
5. **Data Intelligence** - Export capabilities with structured analytics

---

## **Documentation**

- **[Architecture Guide](./docs/UML_ARCHITECTURE_GUIDE.md)** - Detailed technical documentation
- **[API Reference](./docs/)** - Component interfaces and usage patterns

---

## **Built With**

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type safety and developer experience |
| **React + Hooks** | Modern UI component architecture |
| **Tailwind CSS** | Utility-first styling system |
| **Vite** | Fast development and optimized builds |
| **IndexedDB** | Client-side data persistence |
| **Recharts** | Interactive data visualization |
| **Chrome Manifest V3** | Modern extension architecture |

---
