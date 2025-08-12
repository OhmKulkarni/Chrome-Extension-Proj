# Chrome Extension Project

A powerful Chrome extension built with Manifest V3, TypeScript, React, and Vite.

## Features

- **Dual Power Control**: Global extension toggle + site-specific disable
- **Network Monitoring**: Real-time network request interception and logging
- **Token Detection**: Automatic authentication token capture and analysis
- **Error Logging**: Console error monitoring and tracking
- **Dynamic Toggles**: Enable/disable monitoring without page refresh
- **Memory Optimized**: Efficient memory usage with leak prevention

## Quick Start

```bash
# Install dependencies
npm install

# Development build
npm run build

# Production build
npm run build:prod
```

## Documentation

Detailed documentation is available in the [`docs/`](./docs/) folder.

## Architecture

- **Background Script**: Network interception and data processing
- **Content Script**: Page-level monitoring and communication
- **Popup**: Control interface for toggles and settings
- **Dashboard**: Data visualization and analysis
- **Settings**: Configuration management

## Development

Built with modern web technologies:
- TypeScript for type safety
- React for UI components
- Tailwind CSS for styling
- Vite for fast development and building
