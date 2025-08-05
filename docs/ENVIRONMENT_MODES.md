# Switching Between Development and Production Modes

This guide explains how to switch between development and production modes for your Chrome extension, and what each mode does.

> 📖 **For detailed information about trade-offs, performance impacts, and best practices, see [BUILD_MODES_COMPREHENSIVE_GUIDE.md](./BUILD_MODES_COMPREHENSIVE_GUIDE.md)**

---

## How to Switch Modes

### 1. **Development Mode**
- Use for local development, debugging, and testing.
- Includes source maps, verbose logging, and debug features.
- Uses settings from `.env`.

**To build in development mode:**
```powershell
$env:NODE_ENV = "development"; npm run build
```
Or simply run:
```powershell
npm run dev
```

### 2. **Production Mode**
- Use for final builds to distribute or publish.
- Optimized, minified, excludes debug features and source maps.
- Uses settings from `.env.production` (if present).

**To build in production mode:**
```powershell
$env:NODE_ENV = "production"; npm run build
```
Or use the provided script:
```powershell
./build-production.ps1
```

---

## What Each Mode Does

| Feature                | Development Mode         | Production Mode           |
|-----------------------|-------------------------|---------------------------|
| Source Maps           | Included                | Excluded                  |
| Verbose Logging       | Enabled                 | Disabled                  |
| Debug Features        | Enabled                 | Disabled                  |
| Minification          | Disabled                | Enabled                   |
| Performance Metrics   | Enabled (if set in .env)| Disabled (if set in .env.production) |
| Storage Logs          | Enabled (if set in .env)| Disabled (if set in .env.production) |

---

## Environment Files
- `.env` — Used for development mode
- `.env.production` — Used for production mode

Set your feature flags and storage options in these files to control behavior for each mode.

---

## Summary
- **Switch modes by setting `NODE_ENV` before building.**
- **Development mode** is for debugging and testing.
- **Production mode** is for optimized, user-ready builds.
- **Environment files** let you control features and logging for each mode.

---
