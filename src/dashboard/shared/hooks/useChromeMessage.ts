// Centralized Chrome message handler with memory leak prevention
export const _sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const _response = await chrome.runtime.sendMessage(message)
    // Immediately copy and nullify response to prevent accumulation
    const _result = response ? { ...response } : null
    return result
  } catch (error) {
    // console.error('Chrome message failed:', error)
    return null
  }
}

// Chrome message functions for specific actions
export const _getChromeTabInfo = async (): Promise<any> => {
  try {
    const _response = await sendChromeMessage({ action: 'getTabInfo' })
    if (response && !response.error) {
      return response
    } else {
      return { title: 'Unknown', url: 'Unknown' }
    }
  } catch (error) {
    // console.warn('Error getting tab info:', error)
    return { title: 'Loading...', url: 'Extension starting up...' }
  }
}

export const _clearChromeData = async (): Promise<void> => {
  const _response = await sendChromeMessage({ action: 'clearAllData' })
  if (chrome.runtime.lastError) {
    // console.error('Error clearing data:', chrome.runtime.lastError)
    throw chrome.runtime.lastError
  } else if (response?.success) {
    // console.log('Data cleared successfully')
    return
  } else {
    throw new Error('Failed to clear data')
  }
}

// Storage utilities
export const _getStorageData = async (keys: string[]): Promise<any> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve)
  })
}

export const _setStorageData = async (data: any): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve)
  })
}
