import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest: {
        manifest_version: 3,
        name: "Chrome Extension Proj",
        version: "1.0.0",
        description: "Chrome Extension with Manifest V3, TypeScript, and Vite",
        permissions: [
          "storage",
          "activeTab",
          "tabs",
          "scripting",
          "declarativeNetRequest"
        ],
        host_permissions: [
          "http://*/*",
          "https://*/*"
        ],
        action: {
          default_popup: "src/popup/popup.html"
        },
        background: {
          service_worker: "src/background/background.ts",
          type: "module"
        },
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["src/content/content-simple.ts"]
          }
        ],
        options_page: "src/settings/settings.html",
        web_accessible_resources: [
          {
            resources: [
              "main-world-script.js",
              "sql-wasm.wasm",
              "src/offscreen/offscreen.html",
              "assets/*"
            ],
            matches: ["<all_urls>"]
          }
        ],
        content_security_policy: {
          extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
        }
      },
      contentScripts: {
        injectCss: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  publicDir: 'public',
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        dashboard: resolve(__dirname, 'src/dashboard/dashboard.html'),
        settings: resolve(__dirname, 'src/settings/settings.html'),
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
      },
    }
  },
  esbuild: {
    target: 'es2020'
  },
  server: {
    port: 3000,
    strictPort: true,
  },
})