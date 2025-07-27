// src/background/background.ts
console.log('Background service worker started');

// --- Comprehensive Storage System ---
import { storageManager } from './storage-manager';
import { initializeStorage } from './storage-example';

// Initialize the storage system on service worker load
initializeStorage()
  .then(() => {
    console.log('[Web App Monitor] Storage system initialized successfully.');
    console.log('[Web App Monitor] Storage type:', storageManager.getStorageType());
  })
  .catch((err) => {
    console.error('[Web App Monitor] Storage system initialization failed:', err);
  });

// Expose storage system for debugging in DevTools (service worker context)
(self as any).storageManager = storageManager;

// Legacy test helpers for backward compatibility
(self as any).insertTestApiCall = async () => {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    const testData = {
      url: 'https://api.test.com/debug',
      method: 'GET',
      headers: JSON.stringify({ 'authorization': 'Bearer test-token' }),
      payload_size: 128,
      status: 200,
      response_body: '{"status": "test successful"}',
      timestamp: Date.now()
    };
    
    const id = await storageManager.insertApiCall(testData);
    console.log('Test API call inserted with ID:', id);
    return id;
  } catch (error) {
    console.error('Failed to insert test API call:', error);
  }
};

(self as any).queryApiCalls = async () => {
  try {
    if (!storageManager.isInitialized()) {
      await storageManager.init();
    }
    
    const results = await storageManager.getApiCalls(10, 0);
    console.log('API calls:', results);
    return results;
  } catch (error) {
    console.error('Failed to query API calls:', error);
  }
};

// Additional debugging helpers
(self as any).getStorageStats = async () => {
  try {
    const counts = await storageManager.getTableCounts();
    const info = await storageManager.getStorageInfo();
    console.log('Storage statistics:', { counts, info });
    return { counts, info };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
  }
};

(self as any).pruneOldData = async () => {
  try {
    await storageManager.pruneOldData();
    console.log('Data pruning completed');
  } catch (error) {
    console.error('Failed to prune data:', error);
  }
};