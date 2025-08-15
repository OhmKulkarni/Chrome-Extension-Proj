/**
 * Simple Integration for Background Script
 * 
 * Import this file in background.ts to enable the decoupled architecture
 * without breaking existing functionality.
 */

import { initializeDecoupledArchitecture, getMigrationStatus } from './migration';

// Simple one-line integration
export async function enableDecoupledArchitecture() {
  try {
    const status = await initializeDecoupledArchitecture();
    
    if (status.errors.length === 0) {
      console.log('✅ Decoupled architecture enabled successfully');
    } else {
      console.warn('⚠️ Decoupled architecture enabled with warnings:', status.errors);
    }
    
    return status;
  } catch (error) {
    console.error('❌ Failed to enable decoupled architecture:', error);
    return null;
  }
}

// Export the simple integration
export { getMigrationStatus };

// Also export key providers for direct use if needed
export { networkDataProvider } from '../features/network/network-data-provider';
export { consoleDataProvider } from '../features/console/console-data-provider';
export { tokenDataProvider } from '../features/tokens/token-data-provider';
