# Technical Documentation

## Overview
This Chrome extension is built with React, TypeScript, Tailwind CSS, and Vite, using Manifest V3 and CRXJS for packaging. The architecture features a comprehensive dual-storage system with SQLite WASM (primary) and IndexedDB (fallback), modular UI components, and robust data management capabilities.

## Core Architecture

### Storage System (Primary Feature)

#### Storage Manager (`src/background/storage-manager.ts`)
The central orchestrator that manages storage initialization and operations:
- **Intelligent Fallback**: Attempts SQLite first, falls back to IndexedDB if unavailable
- **Unified Interface**: Provides consistent API regardless of underlying storage
- **Error Handling**: Graceful degradation with detailed error reporting
- **Performance Monitoring**: Tracks storage type and performance metrics

#### SQLite WASM Storage (`src/background/sqlite-storage.ts`)
High-performance primary storage using sql.js in an offscreen document:
- **Offscreen Execution**: Runs SQLite WASM in dedicated offscreen context to avoid CSP restrictions
- **Optimized Schema**: Indexed tables for fast queries on large datasets
- **Message Passing**: Communicates with service worker via Chrome runtime messaging
- **ACID Compliance**: Full transactional support with rollback capabilities
- **Performance**: Optimized for high-volume data operations

#### IndexedDB Storage (`src/background/indexeddb-storage.ts`)
Robust fallback storage with enterprise-grade features:
- **Browser Compatibility**: Works in all modern browsers
- **Indexed Queries**: Optimized indexes on timestamp, URL, severity, and domain fields
- **Pagination**: Efficient large dataset handling with cursor-based pagination
- **Automatic Pruning**: Configurable data lifecycle management
- **Transaction Management**: Safe concurrent operations with proper error handling

#### Storage Types (`src/background/storage-types.ts`)
Comprehensive TypeScript interfaces and configurations:
- **Data Models**: ApiCall, ConsoleError, TokenEvent, MinifiedLibrary
- **Storage Interface**: Unified StorageOperations interface
- **Configuration**: Configurable retention policies and performance settings

### Data Models

#### API Calls
```typescript
interface ApiCall {
  id?: number
  timestamp: number
  method: string
  url: string
  status_code: number
  response_time: number
  request_headers: string
  response_headers: string
  request_body?: string
  response_body?: string
}
```

#### Console Errors
```typescript
interface ConsoleError {
  id?: number
  timestamp: number
  message: string
  source: string
  line_number: number
  column_number: number
  severity: 'error' | 'warning' | 'info'
  stack_trace?: string
  url: string
}
```

#### Token Events
```typescript
interface TokenEvent {
  id?: number
  timestamp: number
  token_type: string
  token_value_hash: string
  source_url: string
  context: string
  detection_method: string
}
```

#### Minified Libraries
```typescript
interface MinifiedLibrary {
  id?: number
  timestamp: number
  library_name: string
  version: string
  file_url: string
  domain: string
  file_size: number
  minified: boolean
}
```

## Application Components

### 1. Background Service Worker (`src/background/background.ts`)
- Initializes storage system on startup
- Handles extension lifecycle events (install, update)
- Routes messages between components
- Manages tab activity monitoring
- Coordinates data collection and storage

### 2. Content Script (`src/content/content.ts`)
- Monitors web page activity
- Detects API calls, errors, and tokens
- Injects monitoring UI elements
- Communicates findings to background service worker
- Handles highlighting and DOM manipulation

### 3. Popup UI (`src/popup/popup.tsx`)
- Quick access interface for extension control
- Displays current page statistics
- Provides toggles for monitoring features
- Links to dashboard and settings

### 4. Dashboard UI (`src/dashboard/dashboard.tsx`)
- Comprehensive data visualization
- Real-time statistics and analytics
- Data export capabilities
- Advanced filtering and search

### 5. Settings UI (`src/settings/settings.tsx`)
- Storage configuration options
- Data retention policy settings
- Performance tuning parameters
- Export/import functionality

### 6. Offscreen Document (`src/offscreen/offscreen.ts`)
- Isolated context for SQLite WASM execution
- Handles database operations away from service worker
- Manages sql.js library and WASM loading
- Processes storage requests via message passing

## Storage Performance & Configuration

### Default Configuration
```typescript
const DEFAULT_CONFIG: StorageConfig = {
  maxAgeInDays: 30,           // Data retention period
  maxRecordsPerTable: 10000,  // Maximum records per table
  pruneIntervalHours: 24      // Cleanup frequency
}
```

### Performance Characteristics
- **SQLite**: Optimized for complex queries and large datasets (10k+ records)
- **IndexedDB**: Excellent for moderate datasets with reliable cross-browser support
- **Auto-pruning**: Prevents storage bloat with configurable cleanup
- **Indexed Queries**: Fast retrieval even with large datasets

## Build & Development Workflow

### Build Process
```bash
npm run build           # Compile TypeScript and build extension
npm run build:watch    # Development mode with auto-rebuild
npm run lint           # Check code quality
npm run format         # Format code with Prettier
```

### File Structure
```
src/
├── background/         # Service worker and storage system
│   ├── background.ts   # Main service worker
│   ├── storage-manager.ts    # Storage orchestrator
│   ├── sqlite-storage.ts     # SQLite implementation
│   ├── indexeddb-storage.ts  # IndexedDB implementation
│   └── storage-types.ts      # TypeScript interfaces
├── content/           # Content script
├── popup/             # Popup UI
├── dashboard/         # Dashboard UI
├── settings/          # Settings UI
├── offscreen/         # Offscreen document for SQLite
└── types/             # Type definitions
```

## Development Conventions

### Code Quality
- **TypeScript Strict Mode**: Full type safety enforcement
- **ESLint**: Comprehensive linting with custom rules
- **Prettier**: Consistent code formatting
- **Unused Parameters**: Must be prefixed with `_`

### Storage Operations
- **Error Handling**: All storage operations include proper error handling
- **Type Safety**: Full TypeScript coverage for all data operations
- **Performance**: Prefer indexed queries over full table scans
- **Cleanup**: Always implement proper resource cleanup

### Testing Approach
- **Unit Tests**: Individual storage operations
- **Integration Tests**: Cross-component communication
- **Performance Tests**: Storage system benchmarks
- **Browser Tests**: Cross-browser compatibility validation

## Extensibility

### Adding New Data Types
1. Define interface in `storage-types.ts`
2. Add table creation in both storage implementations
3. Implement CRUD operations
4. Update storage manager interface
5. Add UI components for data visualization

### Storage System Extensions
- **Custom Indexes**: Add specialized indexes for new query patterns
- **Data Migration**: Implement versioning for schema changes
- **Backup/Restore**: Add data export/import capabilities
- **Analytics**: Integration with analytics platforms

## Security Considerations

### Data Privacy
- **Local Storage**: All data stored locally, no external transmission
- **Hashing**: Sensitive data (tokens) stored as hashes
- **Cleanup**: Automatic data expiration for privacy compliance

### Chrome Extension Security
- **Manifest V3**: Modern security model with limited permissions
- **CSP Compliance**: WASM execution in isolated offscreen context
- **Message Validation**: All inter-component messages validated
