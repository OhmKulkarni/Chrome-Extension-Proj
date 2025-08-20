/**
 * Shared Infrastructure Module - Coordinates content script modules
 * Provides common utilities and communication between modules
 */

import { NetworkInterceptorModule, NetworkRequest } from './network-interceptor.module'
import { ConsoleInterceptorModule, ConsoleEvent } from './console-interceptor.module'

export interface SharedInfrastructureConfig {
  network: {
    enabled: boolean
    captureHeaders: boolean
    captureBody: boolean
    maxBodySize?: number
    urlFilters?: RegExp[]
    methodFilters?: string[]
  }
  console: {
    enabled: boolean
    captureStack: boolean
    maxMessageLength: number
    levels: ('error' | 'warn' | 'info' | 'log' | 'debug')[]
    urlFilters?: RegExp[]
  }
  communication: {
    enabled: boolean
    batchSize?: number
    flushInterval?: number
  }
}

export interface DataBatch {
  networkRequests: NetworkRequest[]
  consoleEvents: ConsoleEvent[]
  timestamp: number
  tabId?: number
}

export class SharedInfrastructureModule {
  private networkModule?: NetworkInterceptorModule
  private consoleModule?: ConsoleInterceptorModule
  private config: SharedInfrastructureConfig
  private isInitialized = false

  // Data batching
  private pendingData: DataBatch = {
    networkRequests: [],
    consoleEvents: [],
    timestamp: Date.now()
  }
  private flushTimer?: number

  // Communication
  private extensionContextValid = true

  // MEMORY LEAK FIX: Track event listeners for proper cleanup
  private eventListeners: Map<string, any> = new Map()
  private abortController = new AbortController()
  private chromeListeners: Map<string, any> = new Map()

  // RACE CONDITION FIX: Module initialization state tracking
  private initializationPromise: Promise<void> | null = null
  private isDestroying = false

  constructor(config: Partial<SharedInfrastructureConfig> = {}) {
    const networkDefaults = {
      enabled: true,
      captureHeaders: true,
      captureBody: false,
      maxBodySize: 1024,
      urlFilters: undefined,
      methodFilters: undefined
    }

    const consoleDefaults = {
      enabled: true,
      captureStack: true,
      levels: ['error', 'warn', 'info', 'log'] as ('error' | 'warn' | 'info' | 'log' | 'debug')[],
      maxMessageLength: 1000,
      urlFilters: undefined
    }

    const communicationDefaults = {
      enabled: true,
      batchSize: 10, // Restored to normal batch size
      flushInterval: 5000 // Restored to normal flush interval
    }

    this.config = {
      network: { ...networkDefaults, ...config.network },
      console: { ...consoleDefaults, ...config.console },
      communication: { ...communicationDefaults, ...config.communication }
    }
  }

  /**
   * Initialize all modules - RACE CONDITION SAFE
   */
  public async initialize(): Promise<void> {
    // Prevent concurrent initialization attempts
    if (this.initializationPromise) {
      console.warn('SharedInfrastructureModule: Initialization already in progress, waiting...')
      return this.initializationPromise
    }

    if (this.isInitialized) {
      console.warn('SharedInfrastructureModule: Already initialized')
      return
    }

    if (this.isDestroying) {
      console.error('SharedInfrastructureModule: Cannot initialize while destroying')
      return
    }

    // Create initialization promise for race condition prevention
    this.initializationPromise = this.performInitialization()

    try {
      await this.initializationPromise
    } finally {
      this.initializationPromise = null
    }
  }

  /**
   * Perform actual initialization - MEMORY LEAK SAFE
   */
  private async performInitialization(): Promise<void> {
    console.log('SharedInfrastructureModule: Initializing...')

    // Check extension context
    if (!this.isExtensionContextValid()) {
      console.error('SharedInfrastructureModule: Invalid extension context')
      return
    }

    try {
      // Initialize network module
      if (this.config.network.enabled && !this.isDestroying) {
        const networkConfig = {
          ...this.config.network,
          maxBodySize: this.config.network.maxBodySize || 1024
        }
        this.networkModule = new NetworkInterceptorModule(networkConfig)
        this.networkModule.addListener(this.handleNetworkRequest.bind(this))
        this.networkModule.initialize()
      }

      // Initialize console module
      if (this.config.console.enabled && !this.isDestroying) {
        this.consoleModule = new ConsoleInterceptorModule(this.config.console)
        this.consoleModule.addListener(this.handleConsoleEvent.bind(this))
        this.consoleModule.initialize()
      }

      // Set up communication
      if (this.config.communication.enabled && !this.isDestroying) {
        this.initializeCommunication()
      }

      // Set up main-world script communication
      this.setupMainWorldCommunication()

      // Set up communication batching with error handling
      this.setupCommunicationBatching()

      // Set up event listeners with proper tracking
      this.setupEventListeners()

      this.isInitialized = true
      console.log('SharedInfrastructureModule: Initialization complete')

      // Notify main-world script about current logging state
      setTimeout(() => {
        this.notifyMainWorldStateChange()
      }, 1000) // Small delay to ensure main-world script is ready

    } catch (error) {
      console.error('SharedInfrastructureModule: Initialization failed:', error)
      // Clean up any partial initialization
      await this.cleanup()
      throw error
    }
  }

  /**
   * Setup communication batching with enhanced error handling
   */
  private setupCommunicationBatching(): void {
    if (this.config.communication.flushInterval && this.config.communication.flushInterval > 0 && !this.isDestroying) {
      this.flushTimer = window.setInterval(() => {
        try {
          this.flushPendingData()
        } catch (error) {
          console.error('SharedInfrastructureModule: Error during data flush:', error)
          // Continue operation, don't break the timer
        }
      }, this.config.communication.flushInterval)
    }
  }

  /**
   * Handle network requests from the network module
   */
  private handleNetworkRequest(request: NetworkRequest): void {
    if (!this.isExtensionContextValid()) return

    // Add to pending batch
    this.pendingData.networkRequests.push(request)

    // Check if we should flush
    if (this.shouldFlush()) {
      this.flushPendingData()
    }
  }

  /**
   * Handle console events from the console module
   */
  private handleConsoleEvent(event: ConsoleEvent): void {
    console.log('SharedInfrastructureModule: Console event captured:', event.level, event.message)

    // Always add to pending batch - context will be checked during flush
    this.pendingData.consoleEvents.push(event)

    // Check if we should flush
    if (this.shouldFlush()) {
      this.flushPendingData()
    }
  }

  /**
   * Check if we should flush pending data
   */
  private shouldFlush(): boolean {
    const totalItems = this.pendingData.networkRequests.length + this.pendingData.consoleEvents.length
    return totalItems >= (this.config.communication.batchSize || 10)
  }

  /**
   * Flush pending data to background script
   */
  private async flushPendingData(): Promise<void> {
    if (this.pendingData.networkRequests.length === 0 && this.pendingData.consoleEvents.length === 0) {
      return
    }

    // Clear the flush timer if it exists
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = undefined
    }

    console.log(`🚀 SharedInfrastructure: Flushing data - Network: ${this.pendingData.networkRequests.length}, Console: ${this.pendingData.consoleEvents.length}`)

    const batch = { ...this.pendingData }

    // Reset pending data
    this.pendingData = {
      networkRequests: [],
      consoleEvents: [],
      timestamp: Date.now()
    }

    // Send network requests
    for (const request of batch.networkRequests) {
      console.log('🚀 SharedInfrastructure: Sending network request to background:', request.url)
      await this.sendToBackground('storeNetworkRequest', request)
    }

    // Send console events
    for (const event of batch.consoleEvents) {
      // Map console event format to background expected format
      const consoleData = {
        message: event.message,
        severity: event.level, // Map level to severity
        timestamp: new Date(event.timestamp).toISOString(),
        url: event.url,
        stack: event.stack,
        // Include original event data for debugging
        originalEvent: event
      }
      console.log('🚀 SharedInfrastructure: Sending console event to background:', consoleData.message.substring(0, 50))
      await this.sendToBackground('CONSOLE_ERROR', consoleData)
    }
  }

  /**
   * Send message to background script
   */
  private async sendToBackground(action: string, data: any): Promise<any> {
    if (!this.isExtensionContextValid()) {
      console.log('SharedInfrastructureModule: Extension context invalid, attempting recovery...')

      // Try to recover the extension context
      await this.attemptContextRecovery()

      // If still invalid after recovery attempt, queue the data
      if (!this.isExtensionContextValid()) {
        console.warn('SharedInfrastructureModule: Context recovery failed, dropping data')
        this.queueDataForLater(action, data)
        return null
      }

      console.log('SharedInfrastructureModule: Extension context recovered successfully!')
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action,
        data
      })

      if (chrome.runtime.lastError) {
        console.error('SharedInfrastructureModule: Chrome runtime error:', chrome.runtime.lastError)
        // Mark context as invalid and queue data
        this.extensionContextValid = false
        this.queueDataForLater(action, data)
        return null
      }

      return response
    } catch (error) {
      console.error('SharedInfrastructureModule: Message sending failed:', error)
      // Mark context as invalid and queue data
      this.extensionContextValid = false
      this.queueDataForLater(action, data)
      return null
    }
  }

  /**
   * Initialize communication handlers - MEMORY LEAK SAFE
   */
  private initializeCommunication(): void {
    // MEMORY LEAK FIX: Track listeners with AbortController
    const signal = this.abortController.signal

    // Listen for messages from background script
    const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
      this.handleBackgroundMessage(message, sender, sendResponse)
      return true // Will respond asynchronously
    }
    chrome.runtime.onMessage.addListener(messageListener)
    this.chromeListeners.set('runtimeMessage', messageListener)

    // Listen for extension state changes
    const stateChangeListener = async (event: any) => {
      if (this.isDestroying) return
      const { enabled } = event.detail
      if (!enabled) {
        console.log('SharedInfrastructureModule: Extension disabled, pausing interception')
        this.pauseInterception()
      } else {
        console.log('SharedInfrastructureModule: Extension enabled, resuming interception')
        this.resumeInterception()
      }
      // Notify main-world script about the state change
      await this.notifyMainWorldStateChange()
    }
    window.addEventListener('extensionStateChange', stateChangeListener, { signal })
    this.eventListeners.set('extensionStateChange', stateChangeListener)

    // Listen for page visibility changes
    const visibilityChangeListener = () => {
      if (this.isDestroying) return
      if (document.hidden) {
        try {
          this.flushPendingData() // Flush data when page becomes hidden
        } catch (error) {
          console.error('SharedInfrastructureModule: Error flushing data on visibility change:', error)
        }
      }
    }
    document.addEventListener('visibilitychange', visibilityChangeListener, { signal })
    this.eventListeners.set('visibilitychange', visibilityChangeListener)

    // Listen for page unload
    const beforeUnloadListener = () => {
      if (this.isDestroying) return
      try {
        this.flushPendingData()
        // Note: destroy() will be called separately to avoid race conditions
      } catch (error) {
        console.error('SharedInfrastructureModule: Error during page unload:', error)
      }
    }
    window.addEventListener('beforeunload', beforeUnloadListener, { signal })
    this.eventListeners.set('beforeunload', beforeUnloadListener)
  }

  /**
   * Setup event listeners with proper tracking - REPLACES OLD initializeCommunication CALL
   */
  private setupEventListeners(): void {
    // This now calls the enhanced initializeCommunication
    this.initializeCommunication()
  }

  /**
   * Remove all tracked event listeners - MEMORY LEAK PREVENTION
   */
  private removeEventListeners(): void {
    // Remove Chrome API listeners
    this.chromeListeners.forEach((listener, type) => {
      try {
        if (type === 'runtimeMessage') {
          chrome.runtime.onMessage.removeListener(listener)
        } else if (type === 'storageChange') {
          chrome.storage.onChanged.removeListener(listener)
        }
      } catch (error) {
        console.error('SharedInfrastructureModule: Error removing Chrome listener:', error)
      }
    })
    this.chromeListeners.clear()

    // Abort all DOM event listeners via AbortController
    try {
      this.abortController.abort()
    } catch (error) {
      console.error('SharedInfrastructureModule: Error aborting event listeners:', error)
    }

    // Create new AbortController for potential re-initialization
    this.abortController = new AbortController()
    this.eventListeners.clear()
  }

  /**
   * Cleanup method for handling initialization failures - MEMORY LEAK SAFE
   */
  private async cleanup(): Promise<void> {
    console.log('SharedInfrastructureModule: Performing cleanup due to initialization failure')

    // Clear any partial state
    this.isInitialized = false
    this.isDestroying = true

    // Clear timer if exists
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }

    // Destroy any initialized modules
    if (this.networkModule) {
      try {
        this.networkModule.destroy()
      } catch (error) {
        console.error('SharedInfrastructureModule: Error destroying network module during cleanup:', error)
      }
      this.networkModule = undefined
    }

    if (this.consoleModule) {
      try {
        this.consoleModule.destroy()
      } catch (error) {
        console.error('SharedInfrastructureModule: Error destroying console module during cleanup:', error)
      }
      this.consoleModule = undefined
    }

    // Clear event listeners
    this.removeEventListeners()

    // Clear pending data
    this.pendingData = {
      networkRequests: [],
      consoleEvents: [],
      timestamp: Date.now()
    }

    this.isDestroying = false
  }

  /**
   * Handle messages from background script
   */
  private handleBackgroundMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): void {
    switch (message.action) {
      case 'getModuleStatus':
        sendResponse({
          success: true,
          status: {
            initialized: this.isInitialized,
            networkEnabled: !!this.networkModule,
            consoleEnabled: !!this.consoleModule,
            pendingData: {
              networkRequests: this.pendingData.networkRequests.length,
              consoleEvents: this.pendingData.consoleEvents.length
            }
          }
        })
        break

      case 'flushPendingData':
        this.flushPendingData().then(() => {
          sendResponse({ success: true })
        }).catch(error => {
          sendResponse({ success: false, error: error.message })
        })
        break

      case 'updateConfig':
        this.updateConfig(message.config)
        sendResponse({ success: true })
        break

      case 'loggingStateChanged':
        // Handle logging state changes from background script
        console.log('📨 CONTENT: Received logging state change:', message)

        // Immediately notify main-world script about the state change
        if (message.type === 'network' && message.networkEnabled !== undefined) {
          window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
            detail: {
              networkEnabled: message.networkEnabled,
              consoleEnabled: undefined, // Don't change console state
              tokenEnabled: undefined    // Don't change token state
            }
          }))
        } else if (message.type === 'console' && message.consoleEnabled !== undefined) {
          window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
            detail: {
              networkEnabled: undefined, // Don't change network state
              consoleEnabled: message.consoleEnabled,
              tokenEnabled: undefined    // Don't change token state
            }
          }))
        } else if (message.type === 'token' && message.tokenEnabled !== undefined) {
          // Token logging doesn't require main-world script notification
          // since it's handled entirely in the background script
          console.log('📨 CONTENT: Token logging state changed:', message.tokenEnabled)
        }

        sendResponse({ success: true })
        break

      default:
        sendResponse({ success: false, error: 'Unknown action' })
    }
  }

  /**
   * Pause interception
   */
  private pauseInterception(): void {
    // Implementation would depend on the modules' capabilities
    // For now, we can just stop processing new data
    this.config.network.enabled = false
    this.config.console.enabled = false
  }

  /**
   * Resume interception
   */
  private resumeInterception(): void {
    this.config.network.enabled = true
    this.config.console.enabled = true
  }

  /**
   * Check if extension context is still valid
   */
  private isExtensionContextValid(): boolean {
    try {
      return !!chrome.runtime && !!chrome.runtime.id && this.extensionContextValid
    } catch (error) {
      this.extensionContextValid = false
      return false
    }
  }

  /**
   * Attempt to recover extension context
   */
  private async attemptContextRecovery(): Promise<void> {
    console.log('SharedInfrastructureModule: Attempting extension context recovery...')

    try {
      // Wait a bit for potential extension reload
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if chrome runtime is available again
      if (chrome?.runtime?.id) {
        this.extensionContextValid = true
        console.log('SharedInfrastructureModule: Extension context recovered successfully')

        // Try to process any queued data
        await this.processQueuedData()
      } else {
        console.warn('SharedInfrastructureModule: Extension context recovery failed')
      }
    } catch (error) {
      console.error('SharedInfrastructureModule: Context recovery error:', error)
      this.extensionContextValid = false
    }
  }

  /**
   * Queue data for later when extension context is invalid
   */
  private queueDataForLater(action: string, data: any): void {
    // For simplicity, just log that data would be lost
    // In a production system, you might want to implement local storage backup
    console.warn(`SharedInfrastructureModule: Dropping ${action} data due to invalid extension context (${typeof data})`)
    console.warn('SharedInfrastructureModule: Consider implementing local storage backup for reliability')
  }

  /**
   * Process queued data when context is recovered
   */
  private async processQueuedData(): Promise<void> {
    // Try to flush any existing pending data after context recovery
    if (this.pendingData && (this.pendingData.networkRequests.length > 0 || this.pendingData.consoleEvents.length > 0)) {
      console.log('SharedInfrastructureModule: Attempting to flush pending data after context recovery')
      try {
        await this.flushPendingData()
      } catch (error) {
        console.error('SharedInfrastructureModule: Failed to flush pending data after recovery:', error)
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SharedInfrastructureConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Update module configurations
    if (this.networkModule && newConfig.network) {
      // Network module would need a updateConfig method
      console.log('SharedInfrastructureModule: Network config updated')
    }

    if (this.consoleModule && newConfig.console) {
      this.consoleModule.updateConfig(newConfig.console)
    }
  }

  /**
   * Get current statistics
   */
  public getStatistics(): any {
    return {
      initialized: this.isInitialized,
      pendingData: {
        networkRequests: this.pendingData.networkRequests.length,
        consoleEvents: this.pendingData.consoleEvents.length
      },
      modules: {
        network: !!this.networkModule,
        console: !!this.consoleModule
      },
      config: this.config
    }
  }

  /**
   * Cleanup and destroy all modules - ENHANCED MEMORY LEAK PROTECTION
   */
  public destroy(): void {
    console.log('SharedInfrastructureModule: Destroying...')

    // Prevent concurrent destroy attempts
    if (this.isDestroying) {
      console.warn('SharedInfrastructureModule: Destroy already in progress')
      return
    }

    this.isDestroying = true

    try {
      // Clear flush timer with error handling
      if (this.flushTimer) {
        clearInterval(this.flushTimer)
        this.flushTimer = undefined
      }

      // Flush any remaining data with error handling
      try {
        this.flushPendingData()
      } catch (error) {
        console.error('SharedInfrastructureModule: Error flushing data during destroy:', error)
      }

      // Destroy modules with error handling
      if (this.networkModule) {
        try {
          this.networkModule.destroy()
        } catch (error) {
          console.error('SharedInfrastructureModule: Error destroying network module:', error)
        }
        this.networkModule = undefined
      }

      if (this.consoleModule) {
        try {
          this.consoleModule.destroy()
        } catch (error) {
          console.error('SharedInfrastructureModule: Error destroying console module:', error)
        }
        this.consoleModule = undefined
      }

      // Remove all event listeners
      this.removeEventListeners()

      // Clear pending data
      this.pendingData = {
        networkRequests: [],
        consoleEvents: [],
        timestamp: Date.now()
      }

      // Clear initialization state
      this.isInitialized = false
      this.initializationPromise = null
      this.extensionContextValid = true // Reset for potential re-initialization

      console.log('SharedInfrastructureModule: Destroyed successfully')

    } catch (error) {
      console.error('SharedInfrastructureModule: Error during destroy:', error)
    } finally {
      this.isDestroying = false
    }
  }

  /**
   * Set up communication with main-world script
   */
  private setupMainWorldCommunication(): void {
    // Listen for messages from main-world script (network requests)
    const mainWorldListener = (event: MessageEvent) => {
      // Only handle messages from the main-world-script
      if (event.data?.source === 'main-world-network-interceptor') {
        this.handleMainWorldMessage({
          type: 'networkRequest',
          payload: event.data.data
        })
      }
    }

    // Listen for console events from main-world script
    const consoleEventListener = (event: CustomEvent) => {
      if (event.detail) {
        this.handleMainWorldMessage({
          type: 'consoleEvent',
          payload: {
            level: event.detail.severity, // main-world uses 'severity'
            message: event.detail.message,
            timestamp: new Date(event.detail.timestamp).getTime(),
            url: event.detail.url,
            stack: event.detail.stack,
            args: []
          }
        })
      }
    }

    // CRITICAL: Handle logging state requests from main-world script
    const contentScriptRequestListener = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { action, requestId } = customEvent.detail
      let response = null

      console.log('📨 CONTENT: Received request from main-world:', action, 'ID:', requestId)

      try {
        switch (action) {
          case 'checkNetworkLogging':
            console.log('📨 CONTENT: Processing checkNetworkLogging request...')
            const tabResponse = await this.sendToBackground('getCurrentTabId', {})
            const tabId = tabResponse?.tabId

            if (tabId) {
              // Get extension and tab logging state from storage
              const result = await chrome.storage.local.get([`tabLogging_${tabId}`, 'extensionEnabled'])
              const globalEnabled = result.extensionEnabled !== false
              const tabLogging = result[`tabLogging_${tabId}`]
              // FIXED: Background saves {active: boolean}, not {status: 'active'}
              const tabEnabled = !tabLogging || tabLogging.active === true

              console.log('📨 CONTENT: Network logging state - Global:', globalEnabled, 'Tab:', tabEnabled, 'TabData:', tabLogging)
              response = { enabled: globalEnabled && tabEnabled }
            } else {
              console.log('📨 CONTENT: No tab ID available, returning false')
              response = { enabled: false }
            }
            break

          case 'checkConsoleLogging':
            console.log('📨 CONTENT: Processing checkConsoleLogging request...')
            const currentTabResponse = await this.sendToBackground('getCurrentTabId', {})
            const currentTabId = currentTabResponse?.tabId

            if (currentTabId) {
              const result = await chrome.storage.local.get([
                `tabErrorLogging_${currentTabId}`, // FIXED: Use correct key for error logging
                'extensionEnabled',
                'settings'
              ])

              const globalEnabled = result.extensionEnabled !== false
              const tabLogging = result[`tabErrorLogging_${currentTabId}`] // FIXED: Use correct key
              // FIXED: Background saves {active: boolean}, not {status: 'active'}
              const tabEnabled = !tabLogging || tabLogging.active === true

              console.log('📨 CONTENT: Console logging state - Global:', globalEnabled, 'Tab:', tabEnabled, 'TabData:', tabLogging)
              response = { enabled: globalEnabled && tabEnabled }
            } else {
              console.log('📨 CONTENT: No tab ID available for console, returning false')
              response = { enabled: false }
            }
            break

          default:
            console.log('📨 CONTENT: Unknown action:', action)
        }
      } catch (error) {
        console.error('📨 CONTENT: Error processing request:', error)
        response = { enabled: false }
      }

      // Send response back to main-world script
      window.dispatchEvent(new CustomEvent('contentScriptResponse', {
        detail: { requestId, response }
      }))
    }

    // Handle settings requests from main-world script
    const settingsRequestListener = async (_event: Event) => {
      console.log('📨 CONTENT: Settings request from main-world script')
      try {
        // Get settings from background script
        const settingsResponse = await this.sendToBackground('getSettings', {})
        if (settingsResponse) {
          window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
            detail: settingsResponse
          }))
        } else {
          // Send default settings if can't get from background
          window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
            detail: { networkInterception: { bodyCapture: { maxBodySize: 2000 } } }
          }))
        }
      } catch (error) {
        console.error('📨 CONTENT: Error getting settings:', error)
        // Send default settings
        window.dispatchEvent(new CustomEvent('extensionSettingsResponse', {
          detail: { networkInterception: { bodyCapture: { maxBodySize: 2000 } } }
        }))
      }
    }

    // Listen for storage changes to notify main-world script
    const storageChangeListener = async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (this.isDestroying) return

      // Check if extension enabled state or tab logging changed
      if (changes.extensionEnabled || Object.keys(changes).some(key => key.startsWith('tabLogging_'))) {
        console.log('📨 CONTENT: Storage change detected, notifying main-world script')
        await this.notifyMainWorldStateChange()
      }
    }

    chrome.storage.onChanged.addListener(storageChangeListener)
    this.chromeListeners.set('storageChange', storageChangeListener)

    window.addEventListener('message', mainWorldListener, {
      signal: this.abortController.signal
    })
    window.addEventListener('consoleErrorIntercepted', consoleEventListener as EventListener, {
      signal: this.abortController.signal
    })
    window.addEventListener('contentScriptRequest', contentScriptRequestListener, {
      signal: this.abortController.signal
    })
    window.addEventListener('extensionRequestSettings', settingsRequestListener, {
      signal: this.abortController.signal
    })

    this.eventListeners.set('mainWorldMessage', mainWorldListener)
    this.eventListeners.set('consoleErrorIntercepted', consoleEventListener)
    this.eventListeners.set('contentScriptRequest', contentScriptRequestListener)
    this.eventListeners.set('extensionRequestSettings', settingsRequestListener)

    console.log('SharedInfrastructureModule: Main-world communication setup complete')
  }

  /**
   * Notify main-world script about logging state changes
   */
  private async notifyMainWorldStateChange(): Promise<void> {
    try {
      // Get current tab ID and logging states
      const tabResponse = await this.sendToBackground('getCurrentTabId', {})
      const tabId = tabResponse?.tabId

      if (tabId) {
        const result = await chrome.storage.local.get([
          `tabLogging_${tabId}`,       // Network logging
          `tabErrorLogging_${tabId}`,  // Console/Error logging
          'extensionEnabled',
          'settings'
        ])

        const globalEnabled = result.extensionEnabled !== false

        // Check network logging state
        const tabNetworkLogging = result[`tabLogging_${tabId}`]
        const networkEnabled = globalEnabled && (!tabNetworkLogging || tabNetworkLogging.active === true)

        // Check console logging state
        const tabConsoleLogging = result[`tabErrorLogging_${tabId}`]
        const consoleEnabled = globalEnabled && (!tabConsoleLogging || tabConsoleLogging.active === true)

        // Notify main-world script about state changes
        window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
          detail: {
            networkEnabled,
            consoleEnabled
          }
        }))

        console.log('📨 CONTENT: Notified main-world of state change - Network:', networkEnabled, 'Console:', consoleEnabled)
      }
    } catch (error) {
      console.error('📨 CONTENT: Error notifying main-world of state change:', error)
    }
  }

  /**
   * Handle messages from main-world script
   */
  private handleMainWorldMessage(data: any): void {
    try {
      const { type, payload } = data

      switch (type) {
        case 'networkRequest':
          // Always handle network requests from main-world script, regardless of local network module status
          if (payload) {
            console.log('🌐 SharedInfrastructure: Received network request from main-world:', payload.url)
            console.log('🌐 SharedInfrastructure: Network request payload:', {
              url: payload.url,
              domain: payload.domain,
              method: payload.method,
              status: payload.status,
              timestamp: payload.timestamp
            })
            this.pendingData.networkRequests.push(payload)
            console.log(`🌐 SharedInfrastructure: Pending network requests: ${this.pendingData.networkRequests.length}`)
            // Trigger flush if batch size reached
            if (this.shouldFlush()) {
              console.log('🌐 SharedInfrastructure: Flushing network data (batch size reached)')
              this.flushPendingData()
            } else {
              console.log('🌐 SharedInfrastructure: Not flushing yet (batch size not reached)')
              // Set a timer to flush after 2 seconds if not already set
              if (!this.flushTimer) {
                console.log('🌐 SharedInfrastructure: Setting flush timer for 2 seconds')
                this.flushTimer = setTimeout(() => {
                  console.log('🌐 SharedInfrastructure: Timer-triggered flush')
                  this.flushPendingData()
                  this.flushTimer = undefined
                }, 2000)
              }
            }
          } else {
            console.warn('🌐 SharedInfrastructure: Received empty network request payload')
          }
          break

        case 'consoleEvent':
          if (payload) {
            console.log(`📝 SharedInfrastructure: Received console event from main-world: ${payload.level} - ${payload.message.substring(0, 50)}...`)
            // Convert main-world console event to our format
            const consoleEvent = {
              id: payload.id || `mainworld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              level: payload.level,
              message: payload.message,
              timestamp: payload.timestamp || Date.now(),
              url: payload.url || window.location.href,
              stack: payload.stack,
              args: payload.args || []
            }
            this.pendingData.consoleEvents.push(consoleEvent)
            // Trigger flush if batch size reached
            if (this.shouldFlush()) {
              this.flushPendingData()
            }
          }
          break

        default:
          console.warn('SharedInfrastructureModule: Unknown main-world message type:', type)
      }
    } catch (error) {
      console.error('SharedInfrastructureModule: Error handling main-world message:', error)
    }
  }
}

export default SharedInfrastructureModule
