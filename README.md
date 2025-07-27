# Web App Monitor - Chrome Extension

A sophisticated Chrome extension for monitoring and analyzing client-side web applications. Features a dual-storage architecture with SQLite WASM (primary) and IndexedDB (fallback), comprehensive data collection, and real-time analytics.

## 🚀 Key Features

### Advanced Storage System
- **SQLite WASM** - High-performance primary database with ACID compliance
- **IndexedDB Fallback** - Enterprise-grade fallback with automatic failover
- **Intelligent Storage Manager** - Seamless switching between storage backends
- **Automatic Data Pruning** - Configurable retention policies and cleanup
- **Performance Optimized** - Indexed queries for fast data retrieval

### Web Application Monitoring
- **API Call Tracking** - Monitor HTTP requests with timing and payload analysis
- **Console Error Detection** - Capture and categorize JavaScript errors
- **Token Event Monitoring** - Detect and track authentication tokens and keys
- **Library Analysis** - Identify minified JavaScript libraries and versions

### Modern Technology Stack
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Full type safety and enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Vite** - Lightning-fast build tool and development server
- **Manifest V3** - Latest Chrome Extension API with enhanced security

## 📊 Storage Architecture

### Dual Storage System
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Service       │    │    Storage       │    │   Storage       │
│   Worker        │◄──►│    Manager       │◄──►│   Backends      │
│                 │    │                  │    │                 │
│ • Data Collection│    │ • Intelligent    │    │ • SQLite WASM   │
│ • Event Handling│    │   Fallback       │    │ • IndexedDB     │
│ • Message Router│    │ • Error Recovery │    │ • Auto-cleanup  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Models
- **API Calls**: Method, URL, timing, headers, payload
- **Console Errors**: Message, source, stack trace, severity
- **Token Events**: Type, hash, source, detection method
- **Minified Libraries**: Name, version, size, domain

## 🛠️ Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Chrome browser (v109+ for SQLite features)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd chrome-extension-proj

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands
```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Code quality
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Clean build directory
npm run clean
```

## 🔧 Building & Installation

### Build the Extension
```bash
npm run build
```

This creates a `dist` folder with:
- Optimized JavaScript bundles
- Processed HTML/CSS files
- Chrome extension manifest
- SQLite WASM files
- Proper path resolution for Chrome extension context

### Load in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked extension"
4. Select the `dist` folder
5. Extension will appear in Chrome toolbar

## 📁 Project Structure

```
├── src/
│   ├── background/              # Service worker and storage system
│   │   ├── background.ts        # Main service worker entry point
│   │   ├── storage-manager.ts   # Storage orchestration and fallback logic
│   │   ├── sqlite-storage.ts    # SQLite WASM implementation
│   │   ├── indexeddb-storage.ts # IndexedDB implementation
│   │   ├── storage-types.ts     # TypeScript interfaces and types
│   │   └── storage-example.ts   # Usage examples and demos
│   │
│   ├── content/                 # Content script for web page monitoring
│   │   ├── content.ts           # DOM monitoring and data extraction
│   │   └── content.css          # Injected styles
│   │
│   ├── popup/                   # Extension popup interface
│   │   ├── popup.tsx            # React popup component
│   │   ├── popup.html           # Popup HTML template
│   │   └── popup.css            # Popup styles
│   │
│   ├── dashboard/               # Comprehensive dashboard interface
│   │   ├── dashboard.tsx        # React dashboard component
│   │   ├── dashboard.html       # Dashboard HTML template
│   │   └── dashboard.css        # Dashboard styles
│   │
│   ├── settings/                # Extension settings and configuration
│   │   ├── settings.tsx         # React settings component
│   │   ├── settings.html        # Settings HTML template
│   │   └── settings.css         # Settings styles
│   │
│   ├── offscreen/               # Offscreen document for SQLite WASM
│   │   ├── offscreen.ts         # SQLite operations handler
│   │   └── offscreen.html       # Offscreen document template
│   │
│   └── types/                   # Global TypeScript definitions
│       └── sql.js.d.ts          # sql.js type definitions
│
├── public/                      # Static assets
│   └── sql-wasm.wasm           # SQLite WASM binary
│
├── dist/                        # Built extension (generated)
├── docs/                        # Documentation
├── PROJECT_STATUS.md            # Current project status
├── TECHNICAL_DOCUMENTATION.md   # Detailed technical docs
└── README.md                    # This file
```

## 🔍 Storage System Details

### SQLite WASM Storage
- **Performance**: Optimized for complex queries and large datasets
- **ACID Compliance**: Full transactional support with rollback
- **Offscreen Execution**: Runs in dedicated context to avoid CSP restrictions
- **Schema**: Optimized indexes for fast query performance

### IndexedDB Storage
- **Reliability**: Works in all modern browsers
- **Indexed Queries**: Optimized indexes on key fields
- **Pagination**: Cursor-based pagination for large datasets
- **Transactions**: Safe concurrent operations

### Configuration Options
```typescript
interface StorageConfig {
  maxAgeInDays: number        // Data retention period (default: 30)
  maxRecordsPerTable: number  // Maximum records per table (default: 10000)
  pruneIntervalHours: number  // Cleanup frequency (default: 24)
}
```

## 🎨 User Interface

### Popup Interface
- Quick access to extension status
- Real-time monitoring toggles
- Links to dashboard and settings

### Dashboard
- Comprehensive data visualization
- Real-time statistics and analytics
- Data export capabilities
- Advanced filtering and search

### Settings
- Storage configuration
- Data retention policies
- Performance tuning
- Export/import functionality

## 🚀 Performance & Optimization

### Storage Performance
- **SQLite**: Optimized for complex queries and large datasets (10k+ records)
- **IndexedDB**: Excellent for moderate datasets with browser compatibility
- **Automatic Indexing**: Key fields indexed for fast retrieval
- **Background Pruning**: Prevents storage bloat with configurable cleanup

### Build Optimization
- **Code Splitting**: Separate bundles for different components
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Compressed and optimized static assets
- **Source Maps**: Available for development debugging

## 🔐 Security & Privacy

### Data Privacy
- **Local Storage Only**: All data stored locally, no external transmission
- **Token Hashing**: Sensitive data stored as secure hashes
- **Automatic Expiration**: Configurable data retention for privacy compliance
- **No Tracking**: No analytics or user tracking

### Chrome Extension Security
- **Manifest V3**: Latest security model with restricted permissions
- **CSP Compliance**: WASM execution in isolated offscreen context
- **Message Validation**: All inter-component communication validated
- **Minimal Permissions**: Only requests necessary permissions

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes following coding conventions
4. Run tests and quality checks: `npm run lint && npm run type-check`
5. Commit changes: `git commit -m "Add new feature"`
6. Push to branch: `git push origin feature/new-feature`
7. Create Pull Request

### Coding Conventions
- **TypeScript**: Use strict mode and proper typing
- **Unused Parameters**: Prefix with `_` (e.g., `_unusedParam`)
- **Error Handling**: All async operations must include proper error handling
- **Documentation**: Document complex functions and storage operations

## 📚 Documentation

- **[Technical Documentation](./TECHNICAL_DOCUMENTATION.md)** - Detailed architecture and API reference
- **[Project Status](./PROJECT_STATUS.md)** - Current development status and roadmap
- **[Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)** - Official Chrome extension documentation
- **[Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)** - Chrome Extension Manifest V3 reference

## 🔧 Troubleshooting

### Common Issues

#### Extension Not Loading
- Verify `dist` folder was created: `npm run build`
- Check Chrome Developer Mode is enabled
- Look for errors in `chrome://extensions/`

#### Storage Issues
- Check browser console for storage errors
- Verify Chrome version (v109+ for SQLite features)
- Try clearing extension data in Chrome settings

#### Build Errors
- Clear dependencies: `rm -rf node_modules && npm install`
- Check Node.js version (v16+ required)
- Run type checking: `npm run type-check`

#### Development Hot Reload
- Reload extension in `chrome://extensions/`
- Check if service worker is active
- Restart development server: `npm run dev`

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🌟 Acknowledgments

- Built with modern web technologies and Chrome Extension APIs
- Inspired by the need for comprehensive web application monitoring
- Special thanks to the open-source community for excellent tools and libraries
