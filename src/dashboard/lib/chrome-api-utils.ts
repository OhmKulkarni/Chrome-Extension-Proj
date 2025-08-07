// MEMORY LEAK FIX: Chrome API utilities isolated from React components to prevent context capture

/**
 * Get Chrome storage bytes usage without capturing React component context
 * This function is completely isolated from any component scope
 */
export function getChromeStorageBytes(): Promise<number> {
  if (!chrome?.storage?.local?.getBytesInUse) {
    return Promise.resolve(0)
  }
  
  return new Promise<number>((resolve) => {
    try {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        if (chrome.runtime.lastError) {
          console.warn('Chrome storage error:', chrome.runtime.lastError.message)
          resolve(0)
        } else {
          resolve(bytes || 0)
        }
      })
    } catch (error) {
      console.warn('Error accessing Chrome storage:', error)
      resolve(0)
    }
  })
}
