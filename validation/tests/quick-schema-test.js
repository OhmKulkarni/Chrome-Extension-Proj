// Simple Schema Fix Verification Test
// Copy and paste this into the Chrome Extension Service Worker console

console.log('🧪 Quick Schema Fix Test...');

// Test that should have previously failed with "NOT NULL constraint failed"
storageManager.insertApiCall({
  url: 'https://schema-fix-test.com/api/test',
  method: 'POST',
  headers: undefined,        // This used to cause NOT NULL constraint failed
  payload_size: undefined,   // This used to cause NOT NULL constraint failed
  status: 200,
  response_body: undefined,  // This used to cause NOT NULL constraint failed
  timestamp: Date.now()
}).then(id => {
  console.log('✅ SUCCESS! API call with undefined fields inserted. ID:', id);
  console.log('✅ Schema fix is working - undefined values handled as NULL');
  
  // Verify the data was stored correctly
  return storageManager.getApiCalls(1);
}).then(calls => {
  console.log('📋 Retrieved API call data:', calls[0]);
  console.log('🎉 SCHEMA FIX VERIFIED - No more constraint errors!');
}).catch(error => {
  console.error('❌ Schema fix failed:', error.message);
  if (error.message.includes('NOT NULL constraint failed')) {
    console.error('💥 The NOT NULL constraint error is still occurring');
    console.error('📝 This means the schema update did not take effect');
  }
});
