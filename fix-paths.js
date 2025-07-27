import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple offscreen document at the root
const simpleOffscreenContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Offscreen</title>
</head>
<body>
  <script>
    console.log('Offscreen loaded');
  </script>
</body>
</html>`;

// Create the simple offscreen document in the root
const rootOffscreenPath = path.join(__dirname, 'dist/offscreen.html');
fs.writeFileSync(rootOffscreenPath, simpleOffscreenContent);
console.log('✓ Created simple offscreen document at root');

// Fix offscreen document paths after build
const offscreenPath = path.join(__dirname, 'dist/src/offscreen/offscreen.html');

if (fs.existsSync(offscreenPath)) {
    let content = fs.readFileSync(offscreenPath, 'utf-8');
    
    // Replace absolute paths with relative paths
    content = content.replace(/src="\/assets\//g, 'src="../../assets/');
    content = content.replace(/href="\/assets\//g, 'href="../../assets/');
    
    // Remove problematic attributes that Chrome might reject
    content = content.replace(/ crossorigin/g, '');
    content = content.replace(/<link rel="modulepreload"[^>]*>/g, '');
    
    // Find the correct offscreen asset file
    const assetsDir = path.join(__dirname, 'dist/assets');
    const offscreenAsset = fs.readdirSync(assetsDir).find(file => file.startsWith('offscreen-') && file.endsWith('.js'));
    
    if (offscreenAsset) {
        // Move script to body if it's in head and update with correct asset name
        if (content.includes('<script') && content.includes('</head>')) {
            content = content.replace(/(\s*<script[^>]*>[^<]*<\/script>\s*)/, '');
            content = content.replace('</body>', `  <script type="module" src="../../assets/${offscreenAsset}"></script>\n</body>`);
        } else {
            // Update existing script reference
            content = content.replace(/src="\.\.\/\.\.\/assets\/offscreen-[^"]*\.js"/, `src="../../assets/${offscreenAsset}"`);
        }
    }
    
    fs.writeFileSync(offscreenPath, content);
    console.log('✓ Fixed complex offscreen document paths and cleaned up problematic elements');
} else {
    console.log('⚠ Complex offscreen document not found at:', offscreenPath);
}

// Fix manifest.json to add CSP for WASM support
const manifestPath = path.join(__dirname, 'dist/manifest.json');
if (fs.existsSync(manifestPath)) {
    let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    // Add CSP to allow WASM execution
    manifest.content_security_policy = {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✓ Added Content Security Policy for WASM support');
} else {
    console.log('⚠ Manifest not found at:', manifestPath);
}
