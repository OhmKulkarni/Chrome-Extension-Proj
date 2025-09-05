# 🔧 Web Resource Detection & Categorization System

The extension now detects and categorizes **all types of web resources**, not just traditional JavaScript libraries. This provides a comprehensive view of what's actually running on websites.

## 📊 Resource Categories

### 🚀 **Traditional Libraries** (📚)
- **Frameworks**: React, Vue, Angular - `blue` background
- **UI Libraries**: Bootstrap, Material UI - `blue` background  
- **Utilities**: General JavaScript tools - `blue` background

### 🌐 **Web Services** 
- **📢 Advertising Services** (`red` background): 
  - `casalemedia.com`, `criteo.com`, `adsrvr.org`, `pubmatic.com`
  - Real-time bidding, ad serving, marketing automation
  
- **📊 Analytics Services** (`purple` background):
  - `collector.cdp.cnn.com`, `optimizely.com`, `browser-intake-datadoghq.com`
  - Data collection, user behavior tracking, experimentation
  
- **🎥 Streaming Services** (`green` background):
  - `live-manifests-aka.warnermediacdn.com` 
  - Video streaming, content delivery, media management
  
- **🔗 API Endpoints** (`orange` background):
  - `api.zetaglobal.net`, `receive.wmcdp.io`, `ssp.wknd.ai`
  - Web APIs, microservices, data endpoints

### 🛡️ **Specialized Tools**
- **🔒 Privacy Services** (`gray` background):
  - `adsafeprotected.com`, `adtrafficquality.google`
  - Privacy compliance, ad verification, security
  
- **👁️ Tracking Tools** (`yellow` background):
  - Traditional tracking pixels and identity management
  
- **⚙️ Site Tools** (`indigo` background):
  - Site-specific features like alerts, authentication
  
- **🎬 Media Tools** (`pink` background):
  - Video players, media libraries (d3, videotools)
  
- **⚡ Performance Tools** (`cyan` background):
  - Loading optimization, caching (loadingtools)

## 🎯 **What This Reveals**

Your CNN.com example shows the modern web reality:
- **Only ~20% are traditional libraries** (d3, videotools, loadingtools)
- **~80% are web services and APIs**:
  - Advertising ecosystem (casalemedia, criteo, pubmatic)
  - Analytics infrastructure (collector.cdp, optimizely, datadog)
  - Streaming services (live-manifests, cygnus)
  - Privacy/compliance services (adsafeprotected)

## 🔍 **Smart Detection Features**

### URL Pattern Recognition
- `api.*` → API Endpoint 🔗
- `collector.*` → Analytics Service 📊
- `live-manifests.*` → Streaming Service 🎥
- `bid.*`, `cdb.*` → Advertising Service 📢

### Service Type Classification
- **Services**: External business logic (advertising, analytics)
- **APIs**: Data endpoints and microservices
- **Libraries**: Traditional JavaScript code
- **Streams**: Media delivery systems
- **Collectors**: Data gathering endpoints

### Smart Name Truncation
- `livestream&cid=cnnfast&conf_csid=...` → `cid=cnnfast&platform=web&...`
- `p8dn7fp1liosd47cq1r3sb455.litix.io` → `p8dn7fp1...litix.io`
- Preserves meaningful information while maintaining readability

## 💡 **UI Improvements**

- **Column Header**: "Web Resources" (instead of "Libraries")
- **Color-coded Categories**: Each resource type has distinct visual styling
- **Smart Tooltips**: Show full names, types, and source domains
- **Service Type Icons**: Instant visual identification of resource purpose
- **Context Preservation**: Grouping by main domain while showing third-party sources

This provides a **comprehensive digital ecosystem analysis** of any website, showing not just the code libraries but the entire network of services, APIs, and systems that power modern web experiences.
