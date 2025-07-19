# Technical Documentation

## Overview
This Chrome extension is built with React, TypeScript, Tailwind CSS, and Vite, using Manifest V3 and CRXJS for packaging. The architecture is modular, with clear separation between background logic, content scripts, UI components, and configuration.

## Modules & Components

### 1. Background Service Worker (`src/background/background.ts`)
- Handles extension lifecycle events (install, update)
- Listens for tab updates and records activity
- Routes messages from popup/content scripts
- Opens dashboard page on request
- Uses Chrome Storage API for persistent state

### 2. Content Script (`src/content/content.ts`)
- Injects custom styles and UI elements into web pages
- Listens for messages from background (e.g., highlight/remove highlight)
- Communicates with background via `chrome.runtime.sendMessage`
- Uses MutationObserver to ensure UI is injected after DOM is ready

### 3. Popup UI (`src/popup/popup.tsx`)
- React component rendered in popup.html
- Displays current tab info and extension state
- Allows toggling extension enabled/disabled
- Can open dashboard and settings pages
- Communicates with background via messages

### 4. Dashboard UI (`src/dashboard/dashboard.tsx`)
- React component rendered in dashboard.html
- Shows extension stats (total tabs, last activity, enabled state)
- Refreshes data from background and chrome.storage

### 5. Settings UI (`src/settings/settings.tsx`)
- React component rendered in settings.html
- Allows user to configure extension settings (theme, notifications, etc.)
- Persists settings in chrome.storage.sync
- Supports reset to defaults

### 6. Configuration Files
- `vite.config.ts`: Defines build process, manifest, entry points
- `tsconfig.json`: TypeScript strictness, unused param conventions
- `tailwind.config.js`: Custom colors, animations
- `.eslintrc.cjs`: ESLint rules, unused args must be prefixed with `_`
- `.prettierrc`: Formatting rules

## Data Flow & Communication
- **Background <-> Content/Popup**: Uses `chrome.runtime.onMessage` and `sendMessage` for cross-component communication
- **UI <-> Storage**: All UIs use `chrome.storage.sync` for persistent settings/state
- **Content Script**: Injects UI and responds to highlight requests from background

## Build & Load Workflow
- Run `npm run build` to generate the `dist` folder
- Load the extension in Chrome via `chrome://extensions/` > "Load unpacked" > select `dist`

## Conventions
- Unused function parameters must be prefixed with `_` (see ESLint and tsconfig)
- All UI is built with React and Tailwind CSS
- Manifest is generated via Vite config

## Extensibility
- Add new features by creating new modules in `src/`
- UI pages (popup, dashboard, settings) are React apps, easily extendable
- Content script can be expanded for more page interactions
