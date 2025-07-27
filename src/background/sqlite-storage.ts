// SQLite WASM implementation using offscreen document
import type { StorageOperations, ApiCall, ConsoleError, TokenEvent, MinifiedLibrary, StorageConfig } from './storage-types'
import { DEFAULT_CONFIG } from './storage-types'

export class SQLiteStorage implements StorageOperations {
  private offscreenCreated = false
  private config: StorageConfig

  constructor(config: StorageConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  private async ensureOffscreenDocument() {
    if (!this.offscreenCreated) {
      if (!chrome.offscreen) {
        throw new Error('Offscreen API is not available. Chrome 109+ required.')
      }
      
      try {
        const existingContexts = await chrome.runtime.getContexts({
          contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        })
        
        if (existingContexts.length === 0) {
          // Try multiple URL and reason approaches
          const urls = [
            chrome.runtime.getURL('offscreen.html'),
            chrome.runtime.getURL('./offscreen.html'),
            chrome.runtime.getURL('/offscreen.html')
          ];
          
          const reasons = [
            [chrome.offscreen.Reason.DOM_SCRAPING],
            [chrome.offscreen.Reason.WORKERS],
            [chrome.offscreen.Reason.AUDIO_PLAYBACK]
          ];
          
          console.log('Available URLs to try:', urls);
          console.log('Available reasons to try:', reasons);
          
          let success = false;
          for (const offscreenUrl of urls) {
            for (const reasonSet of reasons) {
              try {
                console.log('Attempting to create offscreen document with URL:', offscreenUrl, 'and reasons:', reasonSet);
                
                await chrome.offscreen.createDocument({
                  url: offscreenUrl,
                  reasons: reasonSet,
                  justification: 'Database operations using sql.js'
                });
                
                console.log('✅ Offscreen document created successfully with URL:', offscreenUrl, 'and reasons:', reasonSet);
                success = true;
                break;
              } catch (error) {
                console.log('❌ Failed with URL:', offscreenUrl, 'and reasons:', reasonSet, 'Error:', error);
              }
            }
            if (success) break;
          }
          
          if (!success) {
            throw new Error('Failed to create offscreen document with any URL variant');
          }
        }
        this.offscreenCreated = true
      } catch (error) {
        console.error('Failed to create offscreen document:', error)
        throw error
      }
    }
  }

  private async sendToOffscreen(action: string, data?: any): Promise<any> {
    await this.ensureOffscreenDocument()
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }

  async init(): Promise<void> {
    await this.sendToOffscreen('initDatabase')
    
    // Start auto-pruning
    this.startAutoPruning()
  }

  private startAutoPruning() {
    const intervalMs = this.config.pruneIntervalHours * 60 * 60 * 1000
    setInterval(() => {
      this.pruneOldData().catch(console.error)
    }, intervalMs)
  }

  // API Calls
  async insertApiCall(data: Omit<ApiCall, 'id'>): Promise<number> {
    const response = await this.sendToOffscreen('insertApiCall', data)
    return response.id
  }

  async getApiCalls(limit = 100, offset = 0): Promise<ApiCall[]> {
    const response = await this.sendToOffscreen('getApiCalls', { limit, offset })
    return response.data
  }

  async deleteApiCall(id: number): Promise<void> {
    await this.sendToOffscreen('deleteApiCall', { id })
  }

  // Console Errors
  async insertConsoleError(data: Omit<ConsoleError, 'id'>): Promise<number> {
    const response = await this.sendToOffscreen('insertConsoleError', data)
    return response.id
  }

  async getConsoleErrors(limit = 100, offset = 0): Promise<ConsoleError[]> {
    const response = await this.sendToOffscreen('getConsoleErrors', { limit, offset })
    return response.data
  }

  async deleteConsoleError(id: number): Promise<void> {
    await this.sendToOffscreen('deleteConsoleError', { id })
  }

  // Token Events
  async insertTokenEvent(data: Omit<TokenEvent, 'id'>): Promise<number> {
    const response = await this.sendToOffscreen('insertTokenEvent', data)
    return response.id
  }

  async getTokenEvents(limit = 100, offset = 0): Promise<TokenEvent[]> {
    const response = await this.sendToOffscreen('getTokenEvents', { limit, offset })
    return response.data
  }

  async deleteTokenEvent(id: number): Promise<void> {
    await this.sendToOffscreen('deleteTokenEvent', { id })
  }

  // Minified Libraries
  async insertMinifiedLibrary(data: Omit<MinifiedLibrary, 'id'>): Promise<number> {
    const response = await this.sendToOffscreen('insertMinifiedLibrary', data)
    return response.id
  }

  async getMinifiedLibraries(limit = 100, offset = 0): Promise<MinifiedLibrary[]> {
    const response = await this.sendToOffscreen('getMinifiedLibraries', { limit, offset })
    return response.data
  }

  async deleteMinifiedLibrary(id: number): Promise<void> {
    await this.sendToOffscreen('deleteMinifiedLibrary', { id })
  }

  // Data pruning
  async pruneOldData(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.maxAgeInDays * 24 * 60 * 60 * 1000)
    await this.sendToOffscreen('pruneOldData', { 
      cutoffTime, 
      maxRecords: this.config.maxRecordsPerTable 
    })
  }

  async getTableCounts(): Promise<{[table: string]: number}> {
    const response = await this.sendToOffscreen('getTableCounts')
    return response.counts
  }

  async getStorageInfo(): Promise<{type: 'sqlite' | 'indexeddb', size?: number}> {
    const response = await this.sendToOffscreen('getStorageInfo')
    return { type: 'sqlite', size: response.size }
  }
}
