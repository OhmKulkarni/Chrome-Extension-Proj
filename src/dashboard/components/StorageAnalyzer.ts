// Storage analysis utilities for accurate performance monitoring
// Handles existing IndexedDB data and provides baseline measurements

export interface StorageBreakdown {
  totalSize: number;
  totalRecords: number;
  tables: {
    [tableName: string]: {
      recordCount: number;
      estimatedSize: number;
      oldestRecord: number;
      newestRecord: number;
      averageRecordSize: number;
      sampleRecords: any[];
    };
  };
  baseline: {
    preExistingData: boolean;
    oldestTimestamp: number;
    performanceTrackingStart: number;
    dataAge: number; // in hours
  };
}

export interface IndexedDBQuota {
  usage: number;
  quota: number;
  usagePercentage: number;
  available: number;
}

export class StorageAnalyzer {
  private dbName = 'ChromeExtensionStorage';
  private dbVersion = 1;
  private performanceTrackingStartTime: number;

  constructor() {
    // Mark when performance tracking started (now)
    this.performanceTrackingStartTime = Date.now();
  }

  /**
   * Get detailed storage breakdown including pre-existing data analysis
   */
  async getDetailedStorageBreakdown(): Promise<StorageBreakdown> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          const breakdown: StorageBreakdown = {
            totalSize: 0,
            totalRecords: 0,
            tables: {},
            baseline: {
              preExistingData: false,
              oldestTimestamp: Date.now(),
              performanceTrackingStart: this.performanceTrackingStartTime,
              dataAge: 0
            }
          };

          const storeNames = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries'];
          
          for (const storeName of storeNames) {
            const storeData = await this.analyzeStore(db, storeName);
            breakdown.tables[storeName] = storeData;
            breakdown.totalRecords += storeData.recordCount;
            breakdown.totalSize += storeData.estimatedSize;
            
            // Check if this store has pre-existing data
            if (storeData.oldestRecord < this.performanceTrackingStartTime) {
              breakdown.baseline.preExistingData = true;
              if (storeData.oldestRecord < breakdown.baseline.oldestTimestamp) {
                breakdown.baseline.oldestTimestamp = storeData.oldestRecord;
              }
            }
          }

          // Calculate data age
          if (breakdown.baseline.preExistingData) {
            breakdown.baseline.dataAge = 
              (this.performanceTrackingStartTime - breakdown.baseline.oldestTimestamp) / (1000 * 60 * 60);
          }

          db.close();
          resolve(breakdown);
        } catch (error) {
          db.close();
          reject(error);
        }
      };
    });
  }

  /**
   * Analyze a specific IndexedDB store
   */
  private async analyzeStore(db: IDBDatabase, storeName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      // Get count
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const recordCount = countRequest.result;
        
        if (recordCount === 0) {
          resolve({
            recordCount: 0,
            estimatedSize: 0,
            oldestRecord: Date.now(),
            newestRecord: Date.now(),
            averageRecordSize: 0,
            sampleRecords: []
          });
          return;
        }

        // Get sample records for size estimation
        const sampleSize = Math.min(10, recordCount);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const allRecords = getAllRequest.result;
          
          // Get sample records
          const sampleRecords = allRecords.slice(0, sampleSize);
          
          // Calculate estimated size
          const sampleSizeBytes = this.estimateObjectSize(sampleRecords);
          const averageRecordSize = sampleSizeBytes / sampleRecords.length;
          const estimatedTotalSize = averageRecordSize * recordCount;
          
          // Find oldest and newest records
          const timestamps = allRecords
            .map(record => record.timestamp || Date.now())
            .sort((a, b) => a - b);
          
          resolve({
            recordCount,
            estimatedSize: estimatedTotalSize,
            oldestRecord: timestamps[0] || Date.now(),
            newestRecord: timestamps[timestamps.length - 1] || Date.now(),
            averageRecordSize,
            sampleRecords: sampleRecords.map(record => ({
              id: record.id,
              timestamp: record.timestamp,
              type: this.identifyRecordType(record, storeName),
              size: this.estimateObjectSize(record)
            }))
          });
        };
        
        getAllRequest.onerror = () => reject(new Error(`Failed to analyze ${storeName}`));
      };
      
      countRequest.onerror = () => reject(new Error(`Failed to count ${storeName}`));
    });
  }

  /**
   * Get browser storage quota information
   */
  async getStorageQuota(): Promise<IndexedDBQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usagePercentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
        available: (estimate.quota || 0) - (estimate.usage || 0)
      };
    } else {
      // Fallback for browsers without Storage API
      return {
        usage: 0,
        quota: 0,
        usagePercentage: 0,
        available: 0
      };
    }
  }

  /**
   * Clear all data and reset performance tracking baseline
   */
  async clearAllDataAndResetBaseline(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          const storeNames = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries'];
          const transaction = db.transaction(storeNames, 'readwrite');
          
          // Clear all stores
          for (const storeName of storeNames) {
            const store = transaction.objectStore(storeName);
            await new Promise<void>((resolveStore, rejectStore) => {
              const clearRequest = store.clear();
              clearRequest.onsuccess = () => resolveStore();
              clearRequest.onerror = () => rejectStore(new Error(`Failed to clear ${storeName}`));
            });
          }
          
          // Reset performance tracking start time
          this.performanceTrackingStartTime = Date.now();
          
          db.close();
          resolve();
        } catch (error) {
          db.close();
          reject(error);
        }
      };
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB for clearing'));
    });
  }

  /**
   * Get only data created after performance tracking started
   */
  async getNewDataSince(timestamp: number): Promise<StorageBreakdown> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          const breakdown: StorageBreakdown = {
            totalSize: 0,
            totalRecords: 0,
            tables: {},
            baseline: {
              preExistingData: false,
              oldestTimestamp: timestamp,
              performanceTrackingStart: timestamp,
              dataAge: 0
            }
          };

          const storeNames = ['apiCalls', 'consoleErrors', 'tokenEvents', 'minifiedLibraries'];
          
          for (const storeName of storeNames) {
            const storeData = await this.analyzeStoreFromTimestamp(db, storeName, timestamp);
            breakdown.tables[storeName] = storeData;
            breakdown.totalRecords += storeData.recordCount;
            breakdown.totalSize += storeData.estimatedSize;
          }

          db.close();
          resolve(breakdown);
        } catch (error) {
          db.close();
          reject(error);
        }
      };
    });
  }

  /**
   * Analyze store data from a specific timestamp onwards
   */
  private async analyzeStoreFromTimestamp(db: IDBDatabase, storeName: string, fromTimestamp: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.lowerBound(fromTimestamp);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const records = request.result;
        const recordCount = records.length;
        
        if (recordCount === 0) {
          resolve({
            recordCount: 0,
            estimatedSize: 0,
            oldestRecord: fromTimestamp,
            newestRecord: fromTimestamp,
            averageRecordSize: 0,
            sampleRecords: []
          });
          return;
        }

        // Calculate size for new records only
        const totalSize = this.estimateObjectSize(records);
        const averageRecordSize = totalSize / recordCount;
        
        const timestamps = records.map(record => record.timestamp).sort((a, b) => a - b);
        
        resolve({
          recordCount,
          estimatedSize: totalSize,
          oldestRecord: timestamps[0],
          newestRecord: timestamps[timestamps.length - 1],
          averageRecordSize,
          sampleRecords: records.slice(0, 5).map(record => ({
            id: record.id,
            timestamp: record.timestamp,
            type: this.identifyRecordType(record, storeName),
            size: this.estimateObjectSize(record)
          }))
        });
      };
      
      request.onerror = () => reject(new Error(`Failed to analyze ${storeName} from timestamp`));
    });
  }

  /**
   * Estimate the size of a JavaScript object in bytes
   */
  private estimateObjectSize(obj: any): number {
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size;
  }

  /**
   * Identify the type of record for better categorization
   */
  private identifyRecordType(record: any, storeName: string): string {
    switch (storeName) {
      case 'apiCalls':
        return `${record.method || 'UNKNOWN'} ${record.status || 'UNKNOWN'}`;
      case 'consoleErrors':
        return record.severity || 'error';
      case 'tokenEvents':
        return record.type || 'unknown';
      case 'minifiedLibraries':
        return record.name || 'unknown';
      default:
        return 'unknown';
    }
  }

  /**
   * Get performance tracking start time
   */
  getPerformanceTrackingStartTime(): number {
    return this.performanceTrackingStartTime;
  }

  /**
   * Set performance tracking start time (for testing or reset scenarios)
   */
  setPerformanceTrackingStartTime(timestamp: number): void {
    this.performanceTrackingStartTime = timestamp;
  }
}
