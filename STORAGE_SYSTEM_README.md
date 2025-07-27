# Chrome Extension Storage System

This Chrome Extension implements a comprehensive local data storage system that persists collected metrics with dual-backend support for maximum compatibility.

## Features

### ✅ SQLite WASM Integration with Extension Sandbox
- Uses `sql.js` v1.13.0 for SQLite operations
- Runs in offscreen document to bypass service worker CSP restrictions
- Manual WASM loading via fetch/ArrayBuffer for Vite compatibility
- Full SQL database capabilities with transactions and indexes

### ✅ IndexedDB Fallback Mechanism
- Automatic fallback if SQLite initialization fails
- Compatible with older Chrome versions (pre-109)
- Same interface as SQLite implementation
- Structured object stores with proper indexing

### ✅ Storage API with Common CRUD Operations
- Unified interface for all data types
- Batch operations for better performance
- Pagination support with limit/offset
- Type-safe operations with TypeScript

### ✅ Schema Definition for All Data Types

#### API Calls
```typescript
interface ApiCall {
  id?: number
  url: string
  method: string
  headers: string // JSON string
  payload_size: number
  status: number
  response_body: string
  timestamp: number
}
```

#### Console Errors
```typescript
interface ConsoleError {
  id?: number
  message: string
  stack_trace: string
  timestamp: number
  severity: 'error' | 'warn' | 'info'
  url: string
}
```

#### Token Events
```typescript
interface TokenEvent {
  id?: number
  type: 'jwt_token' | 'session_token' | 'api_key' | 'oauth_token'
  value_hash: string // Hash of token value for privacy
  timestamp: number
  source_url: string
  expiry?: number
}
```

#### Minified Libraries
```typescript
interface MinifiedLibrary {
  id?: number
  domain: string
  name: string
  version: string
  size: number
  source_map_available: boolean
  url: string
  timestamp: number
}
```

### ✅ Automated Data Pruning
- Configurable maximum age for records (default: 30 days)
- Configurable maximum records per table (default: 10,000)
- Automatic cleanup interval (default: 24 hours)
- Prevents storage bloat and maintains performance

## Architecture

### Storage Manager (`storage-manager.ts`)
The main entry point that provides:
- Automatic fallback logic (SQLite → IndexedDB)
- Unified API for all storage operations
- Batch operation support
- Storage type detection and status reporting

### SQLite Implementation (`sqlite-storage.ts`)
- Uses offscreen document for WASM operations
- Full SQL capabilities with prepared statements
- Optimized with database indexes
- Requires Chrome 109+ (Offscreen API)

### IndexedDB Implementation (`indexeddb-storage.ts`)
- Native browser IndexedDB operations
- Cursor-based pagination for large datasets
- Transaction management for data integrity
- Compatible with all Chrome versions

### Offscreen Document (`offscreen/offscreen.ts`)
- Handles SQLite operations outside service worker
- Message-based communication with background script
- WASM file loading and database initialization
- All CRUD operations and data management

## Usage

### Basic Setup
```typescript
import { storageManager } from './storage-manager'

// Initialize storage (tries SQLite first, falls back to IndexedDB)
await storageManager.init()

// Check which storage type is being used
console.log('Storage type:', storageManager.getStorageType()) // 'sqlite' | 'indexeddb'
```

### CRUD Operations
```typescript
// Insert data
const apiCallId = await storageManager.insertApiCall({
  url: 'https://api.example.com/users',
  method: 'GET',
  headers: JSON.stringify({ 'authorization': 'Bearer ...' }),
  payload_size: 256,
  status: 200,
  response_body: '{"users": [...]}',
  timestamp: Date.now()
})

// Retrieve data with pagination
const apiCalls = await storageManager.getApiCalls(10, 0) // limit 10, offset 0

// Delete specific record
await storageManager.deleteApiCall(apiCallId)
```

### Batch Operations
```typescript
// Insert multiple records efficiently
const apiCalls = [
  { url: '...', method: 'GET', /* ... */ },
  { url: '...', method: 'POST', /* ... */ }
]
const ids = await storageManager.insertApiCallsBatch(apiCalls)
```

### Data Management
```typescript
// Get storage statistics
const counts = await storageManager.getTableCounts()
// Returns: { apiCalls: 150, consoleErrors: 25, tokenEvents: 10, minifiedLibraries: 5 }

const storageInfo = await storageManager.getStorageInfo()
// Returns: { type: 'sqlite', size: 2048000 }

// Manual data pruning
await storageManager.pruneOldData()
```

## Configuration

```typescript
import { StorageManager } from './storage-manager'

const customConfig = {
  maxRecordsPerTable: 5000,    // Max records before pruning
  maxAgeInDays: 14,            // Max age before deletion
  pruneIntervalHours: 12       // How often to run cleanup
}

const storageManager = new StorageManager(customConfig)
```

## Error Handling

The storage system includes comprehensive error handling:
- SQLite initialization failures automatically trigger IndexedDB fallback
- Database operation errors are properly caught and reported
- Chrome version compatibility checks prevent runtime errors
- Graceful degradation ensures the extension remains functional

## Performance Considerations

### SQLite Advantages
- Full SQL query capabilities
- Better performance for complex queries
- Smaller storage footprint
- ACID transactions

### IndexedDB Advantages
- Native browser implementation
- No WASM loading overhead
- Better Chrome version compatibility
- Asynchronous by design

### Optimization Features
- Database indexes on timestamp and key fields
- Prepared statements for SQLite operations
- Cursor-based pagination for large datasets
- Automatic data pruning to prevent bloat
- Batch operations to reduce transaction overhead

## Manifest Configuration

Ensure your `manifest.json` includes:

```json
{
  "permissions": ["offscreen", "storage"],
  "minimum_chrome_version": "88",
  "web_accessible_resources": [
    {
      "resources": ["sql-wasm.wasm"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## File Structure

```
src/background/
├── storage-types.ts        # Type definitions and schemas
├── storage-manager.ts      # Main storage interface with fallback logic
├── sqlite-storage.ts       # SQLite implementation using offscreen document
├── indexeddb-storage.ts    # IndexedDB implementation for fallback
└── storage-example.ts      # Usage examples and testing

src/offscreen/
├── offscreen.html          # Offscreen document HTML
└── offscreen.ts           # SQLite WASM operations and message handling

public/
└── sql-wasm.wasm          # SQLite WASM binary
```

## Testing

See `storage-example.ts` for comprehensive usage examples and testing scenarios. The example demonstrates:
- Storage initialization and type detection
- CRUD operations for all data types
- Batch operations
- Data retrieval with pagination
- Storage statistics and management

## Browser Compatibility

- **Chrome 109+**: Full SQLite support with offscreen API
- **Chrome 88-108**: IndexedDB fallback (automatic)
- **Older versions**: May require polyfills for some features

The system automatically detects Chrome version and chooses the appropriate storage backend for optimal compatibility.
