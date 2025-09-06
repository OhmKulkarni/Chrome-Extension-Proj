// Quick test to verify library classification improvements
// This would be run in a browser console to test the fixes

// Test URLs to verify classification improvements
const testUrls = [
  // Should be frameworks (fixed)
  'https://cdn.jsdelivr.net/npm/vue@3.3.4/dist/vue.js',
  'https://unpkg.com/react@18.2.0/umd/react.development.js',
  'https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js',
  'https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',

  // Should be build artifacts (with hashes)
  'https://example.com/main-abc123def456.js',
  'https://example.com/vendor-789xyz012.min.js',
  'https://example.com/chunk-456def789.js',

  // Should be build artifacts (generic files without specific library patterns)
  'https://example.com/app.js',
  'https://example.com/client.js',
  'https://example.com/main.js',
  'https://example.com/vendor.js',
  'https://example.com/bundle.js',

  // Should be build artifacts (source maps)
  'https://example.com/app.js.map',
  'https://example.com/main.min.js.map',

  // Should remain as utilities (real utility libraries)
  'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
  'https://cdn.jsdelivr.net/npm/axios@1.4.0/dist/axios.min.js',
];

console.log('Testing library classification improvements...');
console.log('=================================================');

// This would need to be run in the actual extension context
// LibraryDetector.detectFromUrl() is not available in this test file
// The purpose is to document the expected classifications

testUrls.forEach(url => {
  console.log(`URL: ${url}`);
  console.log(`Expected: [framework|build-artifact|utility]`);
  console.log('---');
});

console.log('Key improvements:');
console.log('1. jQuery, Vue, D3, Bootstrap should be "framework"');
console.log('2. Generic files (app.js, client.js, etc.) should be "build-artifact"');
console.log('3. Files with content hashes should be "build-artifact"');
console.log('4. Source maps (.map) should be "build-artifact"');
console.log('5. Real utility libraries (lodash, axios) should remain "utility"');
