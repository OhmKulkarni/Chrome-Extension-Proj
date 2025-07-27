// README.md
# Chrome Extension Project

A modern Chrome extension built with React, TypeScript, Tailwind CSS, and Vite. Uses Manifest V3 and CRXJS for build and packaging.

## 🚀 Features

- **React 18** - Modern React with hooks
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Manifest V3** - Latest Chrome Extension API
- **Hot Reload** - Instant updates during development


A modern browser extension for monitoring client-side web applications. Built with React, TypeScript, Tailwind CSS, and Vite. Uses Manifest V3 and CRXJS for build and packaging.
## 📁 Full Directory Structure

```
- **Web App Monitoring** - Track API calls, errors, and events in client-side web apps
- **React 18** - Modern React with hooks
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Manifest V3** - Latest Chrome Extension API
- **Hot Reload** - Instant updates during development
├── PROJECT_STATUS.md
├── README.md
├── tailwind.config.js
├── TECHNICAL_DOCUMENTATION.md
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── manifest.json
    ├── background/
    │   └── background.ts
    ├── content/
    │   ├── content.css
    │   └── content.ts
    ├── dashboard/
    │   ├── dashboard.css
    │   ├── dashboard.html
    │   └── dashboard.tsx
    ├── popup/
    │   ├── popup.css
    │   ├── popup.html
    │   └── popup.tsx
    └── settings/
        ├── settings.css
        ├── settings.html
        └── settings.tsx
```

## 🛠️ Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

```bash
# Start development server
npm run dev

# Build for production (generates dist/)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

## 🔧 Building & Installing

### Build the Extension

```bash
npm run build
```

This creates a `dist` folder with the built extension.

### Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

## 📝 Configuration & Conventions

- **vite.config.ts**: Build config, manifest definition, entry points
- **tsconfig.json**: TypeScript strictness, unused param conventions (prefix unused params with `_`)
- **tailwind.config.js**: Custom colors, animations
- **postcss.config.js**: Tailwind + Autoprefixer
- **.eslintrc.cjs**: ESLint rules, unused args must be prefixed with `_`
- **.prettierrc**: Formatting rules

## 🎨 Styling

Tailwind CSS with custom color palette and animations. See `tailwind.config.js` for details.
- **dashboard.tsx**: Dashboard UI, displays extension stats
- **settings.tsx**: Settings UI, syncs with chrome.storage

MIT License - see LICENSE file for details
- Responsive design utilities

## 📱 Pages

### Dashboard (`dashboard/`)
- Comprehensive feature access
- Opened via popup or context menu

### Settings (`settings/`)

## 🔧 Chrome APIs
- `chrome.storage` - Data persistence
- `chrome.tabs` - Tab management

## 🚀 Deployment

### Chrome Web Store


### Development Distribution

1. Build: `npm run build`
2. Share the `dist` folder
3. Users can load as unpacked extension

## 📋 Scripts Explained

- **dev** - Runs Vite development server with hot reload
- **build** - Compiles TypeScript and builds production bundle
- **preview** - Serves production build locally
- **lint** - Checks code quality with ESLint
- **format** - Formats code with Prettier
- **type-check** - Validates TypeScript without emitting files

## 🔧 Troubleshooting

### Common Issues
2. **Hot reload not working**
   - Reload extension in chrome://extensions/
   - Check if service worker is active

3. **TypeScript errors**
   - Run `npm run type-check`
   - Check tsconfig.json configuration

4. **Styling issues**
   - Ensure Tailwind classes are correct
   - Check postcss.config.js
   - Verify CSS imports

## 📚 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [React Documentation](https://reactjs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Contributing

1. Fork the repository

MIT License - see LICENSE file for details