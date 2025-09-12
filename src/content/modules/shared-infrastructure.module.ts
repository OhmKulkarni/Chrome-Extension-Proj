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
  // Remove unused static instance
  private networkModule?: NetworkInterceptorModule
  private consoleModule?: ConsoleInterceptorModule
  private config: SharedInfrastructureConfig
  private isInitialized = false

  // Bound handlers to prevent duplicate listener registrations
  private boundNetworkHandler: (request: NetworkRequest) => void
  private boundConsoleHandler: (event: ConsoleEvent) => void

  // Data batching
  private pendingData: DataBatch = {
    networkRequests: [],
    consoleEvents: [],
    timestamp: Date.now()
  }

  // FIXED: Separate timers for interval and timeout
  private flushIntervalTimer: number | null = null
  private flushTimeoutTimer: number | null = null

  // REMOVED: Unused collections
  // private listeners = new Map<string, EventListener>() // Not used
  // private boundHandlers = new Map<string, (...args: any[]) => void>() // Not used
  // private beforeUnloadHandler: (() => void) | null = null // Not needed with AbortController

  // Communication
  private extensionContextValid = true

  // MEMORY LEAK FIX: Track event listeners for proper cleanup
  private eventListeners: Map<string, any> = new Map()
  private abortController = new AbortController()
  private chromeListeners: Map<string, any> = new Map()

  // RACE CONDITION FIX: Module initialization state tracking
  private initializationPromise: Promise<void> | null = null
  private isDestroying = false

  // ADDED: Flush operation tracking to prevent concurrent flushes
  private isFlushInProgress = false
  private flushQueue: Array<() => void> = []

  // ADDED: Configuration update tracking
  private configUpdateInProgress = false

  // ADDED: Periodic context recovery timer
  private recoveryTimer: number | null = null
  private recoveryAttempts = 0
  private maxRecoveryAttempts = 10

  // ADDED: Local storage backup system for extension context failures
  private localStorageBackup = {
    key: 'chrome-ext-network-backup',
    maxItems: 100, // Prevent unlimited growth

    store: (data: any) => {
      try {
        const existing = JSON.parse(localStorage.getItem(this.localStorageBackup.key) || '[]')
        existing.push({
          timestamp: Date.now(),
          data: data
        })

        // Keep only the most recent items
        if (existing.length > this.localStorageBackup.maxItems) {
          existing.splice(0, existing.length - this.localStorageBackup.maxItems)
        }

        localStorage.setItem(this.localStorageBackup.key, JSON.stringify(existing))
        // console.log('SharedInfrastructureModule: Data backed up to localStorage')
      } catch (error) {
        // console.warn('SharedInfrastructureModule: Failed to backup to localStorage:', error)
      }
    },

    retrieve: (): any[] => {
      try {
        const data = JSON.parse(localStorage.getItem(this.localStorageBackup.key) || '[]')
        return data
      } catch (error) {
        // console.warn('SharedInfrastructureModule: Failed to retrieve from localStorage:', error)
        return []
      }
    },

    clear: () => {
      try {
        localStorage.removeItem(this.localStorageBackup.key)
        // console.log('SharedInfrastructureModule: localStorage backup cleared')
      } catch (error) {
        // console.warn('SharedInfrastructureModule: Failed to clear localStorage:', error)
      }
    }
  }

  constructor(config: Partial<SharedInfrastructureConfig> = {}) {
    const networkDefaults = {
      enabled: true, // CHANGED: Enable by default to capture network requests
      captureHeaders: true,
      captureBody: true, // CHANGED: Enable body capture by default
      maxBodySize: 2048, // CHANGED: Increased default size to 2KB
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

    // Initialize bound handlers to prevent duplicate listener registrations
    this.boundNetworkHandler = this.handleNetworkRequest.bind(this)
    this.boundConsoleHandler = this.handleConsoleEvent.bind(this)
  }

  /**
   * Initialize all modules - RACE CONDITION SAFE
   */
  public async initialize(): Promise<void> {
    // Prevent concurrent initialization attempts
    if (this.initializationPromise) {
      // console.warn('SharedInfrastructureModule: Initialization already in progress, waiting...')
      return this.initializationPromise
    }

    if (this.isInitialized) {
      // console.warn('SharedInfrastructureModule: Already initialized')
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
    // console.log('SharedInfrastructureModule: Initializing...')

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
        this.networkModule.addListener(this.boundNetworkHandler)
        await this.networkModule.initialize() // FIXED: Added await
      }

      // Initialize console module
      if (this.config.console.enabled && !this.isDestroying) {
        this.consoleModule = new ConsoleInterceptorModule(this.config.console)
        this.consoleModule.addListener(this.boundConsoleHandler)
        await this.consoleModule.initialize() // FIXED: Added await
      }

      // Set up communication (includes all event listeners)
      if (this.config.communication.enabled && !this.isDestroying) {
        this.initializeCommunication()
      }

      // Set up main-world script communication
      this.setupMainWorldCommunication()

      // Set up communication batching with error handling
      this.setupCommunicationBatching()

      // REMOVED: Redundant call to setupEventListeners()
      // this.setupEventListeners() // This was calling initializeCommunication again!

      this.isInitialized = true
      // console.log('SharedInfrastructureModule: Initialization complete')

      // ADDED: Set up periodic context recovery check
      this.startPeriodicRecoveryCheck()

      // Notify main-world script about current logging state
      setTimeout(() => {
        this.notifyMainWorldStateChange().catch(error => {
          console.error('SharedInfrastructureModule: Failed to notify main-world:', error)
        })
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
      // FIXED: Use proper interval timer
      this.flushIntervalTimer = window.setInterval(() => {
        if (this.isDestroying) {
          this.clearFlushTimers()
          return
        }

        try {
          this.flushPendingData()
        } catch (error) {
          console.error('SharedInfrastructureModule: Error during interval flush:', error)
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

    // Check if we should flush - priority flush for errors or slow requests
    const isHighPriority = request.status >= 400 || (request.duration && request.duration > 5000)
    const priority: 'normal' | 'high' = isHighPriority ? 'high' : 'normal'

    if (this.shouldFlush(priority)) {
      this.flushPendingData()
    }
  }

  /**
   * Handle console events from the console module
   */
  private handleConsoleEvent(event: ConsoleEvent): void {
    // Only log errors and warnings for console events
    if (event.level === 'error' || event.level === 'warn') {
      // console.log('Console', event.level + ':', event.message.substring(0, 100))
    }

    // Always add to pending batch - context will be checked during flush
    this.pendingData.consoleEvents.push(event)

    // Check if we should flush - priority flush for errors
    const isHighPriority = event.level === 'error' || event.level === 'warn'
    const priority: 'normal' | 'high' = isHighPriority ? 'high' : 'normal'

    if (this.shouldFlush(priority)) {
      this.flushPendingData()
    }
  }

  /**
   * Check if we should flush pending data
   */
  private shouldFlush(priority: 'normal' | 'high' = 'normal'): boolean {
    const totalItems = this.pendingData.networkRequests.length + this.pendingData.consoleEvents.length

    // For high priority events, flush immediately if there's any data
    if (priority === 'high' && totalItems > 0) {
      return true
    }

    // For normal priority, use the batch size threshold
    return totalItems >= (this.config.communication.batchSize || 10)
  }

  /**
   * Flush pending data to background script - RACE CONDITION SAFE
   */
  private async flushPendingData(): Promise<void> {
    // Prevent concurrent flush operations
    if (this.isFlushInProgress) {
      // console.log('SharedInfrastructureModule: Flush already in progress, queueing...')
      return new Promise<void>((resolve) => {
        this.flushQueue.push(resolve)
      })
    }

    if (this.pendingData.networkRequests.length === 0 && this.pendingData.consoleEvents.length === 0) {
      return
    }

    this.isFlushInProgress = true

    // Clear the timeout timer if it exists
    if (this.flushTimeoutTimer) {
      clearTimeout(this.flushTimeoutTimer)
      this.flushTimeoutTimer = null
    }

    try {
      // Only log when there's significant data to flush
      const totalItems = this.pendingData.networkRequests.length + this.pendingData.consoleEvents.length
      if (totalItems >= 5) {
        // console.log(`🚀 Flushing ${totalItems} items (Network: ${this.pendingData.networkRequests.length}, Console: ${this.pendingData.consoleEvents.length})`)
      }

      const batch = { ...this.pendingData }

      // Reset pending data
      this.pendingData = {
        networkRequests: [],
        consoleEvents: [],
        timestamp: Date.now()
      }

      // Send network requests
      for (const request of batch.networkRequests) {
        if (this.isDestroying) break
        // console.log('🚀 SharedInfrastructure: Sending network request to background:', request.url)
        await this.sendToBackground('storeNetworkRequest', request)
        // if (request.url.includes('httpbin.org')) {
        //   console.log('🔍 CONTENT DEBUG: Network request response:', response)
        // }
      }

      // Send console events
      for (const event of batch.consoleEvents) {
        if (this.isDestroying) break
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
        // Only log error/warning console events
        if (event.level === 'error' || event.level === 'warn') {
          // console.log('🚀 Sending console', event.level + ':', consoleData.message.substring(0, 80))
        }
        await this.sendToBackground('CONSOLE_ERROR', consoleData)
      }
    } catch (error) {
      console.error('SharedInfrastructureModule: Error during flush:', error)
      // Re-add failed data back to pending
      // Note: This is a simplified recovery, in production you'd want more sophisticated retry logic
    } finally {
      this.isFlushInProgress = false

      // Process any queued flush requests
      const queuedResolvers = [...this.flushQueue]
      this.flushQueue = []
      queuedResolvers.forEach(resolve => resolve())
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

    // ENHANCED: Add error handling for extension context issues
    try {
      // Listen for messages from background script
      const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
        if (this.isDestroying) return true
        this.handleBackgroundMessage(message, sender, sendResponse)
        return true // Will respond asynchronously
      }

      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener(messageListener)
        this.chromeListeners.set('runtimeMessage', messageListener)
      } else {
        console.warn('SharedInfrastructureModule: chrome.runtime.onMessage not available')
        this.extensionContextValid = false
      }
    } catch (error) {
      console.error('SharedInfrastructureModule: Failed to set up message listener:', error)
      this.extensionContextValid = false
    }

    // Listen for extension state changes
    const stateChangeListener = async (event: any) => {
      if (this.isDestroying) return
      try {
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
      } catch (error) {
        console.error('SharedInfrastructureModule: Error handling state change:', error)
      }
    }
    window.addEventListener('extensionStateChange', stateChangeListener, { signal })
    this.eventListeners.set('extensionStateChange', stateChangeListener)

    // Listen for page visibility changes
    const visibilityChangeListener = () => {
      if (this.isDestroying) return
      if (document.hidden) {
        // Use Promise to handle async flush
        this.flushPendingData().catch(error => {
          console.error('SharedInfrastructureModule: Error flushing on visibility change:', error)
        })
      }
    }
    document.addEventListener('visibilitychange', visibilityChangeListener, { signal })
    this.eventListeners.set('visibilitychange', visibilityChangeListener)

    // Listen for page unload
    const beforeUnloadListener = () => {
      if (this.isDestroying) return
      // Synchronous flush attempt for beforeunload
      try {
        // Try to send immediately without await (fire-and-forget)
        this.flushPendingData().catch(() => {})
      } catch (error) {
        console.error('SharedInfrastructureModule: Error during page unload:', error)
      }
    }
    window.addEventListener('beforeunload', beforeUnloadListener, { signal })
    this.eventListeners.set('beforeunload', beforeUnloadListener)
  }

  /**
   * Clear all flush timers
   */
  private clearFlushTimers(): void {
    if (this.flushIntervalTimer !== null) {
      clearInterval(this.flushIntervalTimer)
      this.flushIntervalTimer = null
    }

    if (this.flushTimeoutTimer !== null) {
      clearTimeout(this.flushTimeoutTimer)
      this.flushTimeoutTimer = null
    }
  }

  /**
   * Cleanup method for handling initialization failures - MEMORY LEAK SAFE
   */
  private async cleanup(): Promise<void> {
    console.log('SharedInfrastructureModule: Performing cleanup due to initialization failure')

    // Clear any partial state
    this.isInitialized = false
    this.isDestroying = true

    try {
      // Clear all timers
      this.clearFlushTimers()

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

      // Clear flush queue
      this.flushQueue.forEach(resolve => resolve())
      this.flushQueue = []

    } finally {
      this.isDestroying = false
      this.isFlushInProgress = false
    }
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
        // Use the async updateConfiguration method for proper module reconfiguration
        this.updateConfiguration(message.config).then(() => {
          sendResponse({ success: true })
        }).catch(error => {
          console.error('SharedInfrastructureModule: Failed to update configuration:', error)
          sendResponse({ success: false, error: error.message })
        })
        break

      case 'loggingStateChanged':
        // Handle logging state changes from background script
        console.log('📨 CONTENT: Received logging state change:', message)

        // Check for atomic site toggle (all three states provided)
        if (message.type === 'atomic' &&
            message.networkEnabled !== undefined &&
            message.consoleEnabled !== undefined &&
            message.tokenEnabled !== undefined) {
          // Send combined event for atomic operations
          window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
            detail: {
              networkEnabled: message.networkEnabled,
              consoleEnabled: message.consoleEnabled,
              tokenEnabled: message.tokenEnabled
            }
          }))
          console.log('📨 CONTENT: Sent atomic state change to main-world:', {
            network: message.networkEnabled,
            console: message.consoleEnabled,
            tokens: message.tokenEnabled
          })
        }
        // Handle individual feature changes
        else if (message.type === 'network' && message.networkEnabled !== undefined) {
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

      case 'retryScriptInjection':
        // Retry main-world script injection when site becomes enabled
        console.log('📨 CONTENT: Retrying main-world script injection...')
        this.retryScriptInjection().then((result) => {
          sendResponse({ success: result.success, error: result.error })
        }).catch(error => {
          sendResponse({ success: false, error: error.message })
        })
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
   * Resume interception (query actual tab states instead of hardcoding)
   */
  private resumeInterception(): void {
    // FIXED: Don't hardcode states - let the state checking logic handle this
    // The actual states will be determined by the tab-specific configuration
    // during the next state check cycle
    console.log('📨 CONTENT: Extension resumed, states will be determined by tab configuration');
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
   * Start periodic context recovery checks
   */
  private startPeriodicRecoveryCheck(): void {
    // Only start if we don't already have a timer
    if (this.recoveryTimer) return

    // Check every 30 seconds for context recovery opportunities
    this.recoveryTimer = window.setInterval(() => {
      if (this.isDestroying) {
        this.stopPeriodicRecoveryCheck()
        return
      }

      // Only try recovery if context is invalid and we haven't exceeded max attempts
      if (!this.extensionContextValid && this.recoveryAttempts < this.maxRecoveryAttempts) {
        const backupData = this.localStorageBackup.retrieve()
        if (backupData.length > 0) {
          console.log(`SharedInfrastructureModule: Attempting periodic recovery (${this.recoveryAttempts + 1}/${this.maxRecoveryAttempts})`)
          this.recoveryAttempts++

          this.attemptContextRecovery().catch(() => {
            // Recovery failed, but timer will try again
          })
        }
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Stop periodic context recovery checks
   */
  private stopPeriodicRecoveryCheck(): void {
    if (this.recoveryTimer) {
      window.clearInterval(this.recoveryTimer)
      this.recoveryTimer = null
    }
  }

  /**
   * Attempt to recover extension context
   */
  private async attemptContextRecovery(): Promise<void> {
    console.log('SharedInfrastructureModule: Attempting extension context recovery...')

    try {
      // Strategy 1: Wait and retry - extension might be reloading
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Strategy 2: Test chrome runtime availability
      if (chrome?.runtime?.id) {
        console.log('SharedInfrastructureModule: Chrome runtime detected, testing connection...')

        // Strategy 3: Test actual communication with background script
        try {
          const response = await chrome.runtime.sendMessage({ action: 'ping' })
          if (response?.success) {
            this.extensionContextValid = true
            this.recoveryAttempts = 0 // Reset counter on successful recovery
            console.log('SharedInfrastructureModule: Extension context recovered successfully!')

            // Process any backup data
            await this.processQueuedData()
            return
          }
        } catch (error) {
          console.warn('SharedInfrastructureModule: Background script ping failed:', error)
        }
      }

      // Strategy 4: Try longer wait for extension reload
      console.log('SharedInfrastructureModule: Initial recovery failed, waiting longer...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      if (chrome?.runtime?.id) {
        try {
          const response = await chrome.runtime.sendMessage({ action: 'ping' })
          if (response?.success) {
            this.extensionContextValid = true
            this.recoveryAttempts = 0 // Reset counter on successful recovery
            console.log('SharedInfrastructureModule: Extension context recovered after longer wait!')
            await this.processQueuedData()
            return
          }
        } catch (error) {
          console.warn('SharedInfrastructureModule: Second recovery attempt failed:', error)
        }
      }

      console.error('SharedInfrastructureModule: Extension context recovery failed')
      this.extensionContextValid = false

    } catch (error) {
      console.error('SharedInfrastructureModule: Context recovery error:', error)
      this.extensionContextValid = false
    }
  }

  /**
   * Queue data for later when extension context is invalid
   */
  private queueDataForLater(action: string, data: any): void {
    console.warn(`SharedInfrastructureModule: Extension context invalid, backing up ${action} data`)

    // Store data in localStorage as backup
    this.localStorageBackup.store({
      action: action,
      data: data,
      url: window.location.href,
      userAgent: navigator.userAgent
    })

    // Also try context recovery in case it's just a temporary issue
    this.attemptContextRecovery().catch(() => {
      console.warn('SharedInfrastructureModule: Context recovery failed, data remains in backup')
    })
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

    // ADDED: Process localStorage backup data
    try {
      const backupData = this.localStorageBackup.retrieve()
      if (backupData.length > 0) {
        console.log(`SharedInfrastructureModule: Found ${backupData.length} items in localStorage backup, attempting to send...`)

        let successCount = 0
        for (const item of backupData) {
          try {
            const response = await this.sendToBackground(item.data.action || 'storeNetworkRequest', item.data.data || item.data)
            if (response?.success) {
              successCount++
            }
          } catch (error) {
            console.warn('SharedInfrastructureModule: Failed to send backup item:', error)
          }
        }

        if (successCount > 0) {
          console.log(`SharedInfrastructureModule: Successfully sent ${successCount}/${backupData.length} backup items`)
          this.localStorageBackup.clear()
        } else {
          console.warn('SharedInfrastructureModule: No backup items could be sent, keeping in storage')
        }
      }
    } catch (error) {
      console.error('SharedInfrastructureModule: Error processing localStorage backup:', error)
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
    const backupCount = this.localStorageBackup.retrieve().length

    return {
      initialized: this.isInitialized,
      destroying: this.isDestroying,
      extensionContext: {
        valid: this.extensionContextValid,
        recoveryAttempts: this.recoveryAttempts,
        maxRecoveryAttempts: this.maxRecoveryAttempts
      },
      pendingData: {
        networkRequests: this.pendingData.networkRequests.length,
        consoleEvents: this.pendingData.consoleEvents.length,
        timestamp: this.pendingData.timestamp
      },
      localStorageBackup: {
        count: backupCount,
        key: this.localStorageBackup.key
      },
      modules: {
        network: !!this.networkModule,
        console: !!this.consoleModule
      },
      config: this.config,
      communication: {
        flushInProgress: this.isFlushInProgress,
        flushQueueLength: this.flushQueue.length
      }
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
      // Clear all timers
      this.clearFlushTimers()
      this.stopPeriodicRecoveryCheck()

      // Flush any remaining data with error handling
      // Use Promise to avoid blocking destroy
      this.flushPendingData().catch(error => {
        console.error('SharedInfrastructureModule: Error flushing data during destroy:', error)
      })

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

      // Clear flush queue
      this.flushQueue.forEach(resolve => resolve())
      this.flushQueue = []

      // Clear initialization state
      this.isInitialized = false
      this.initializationPromise = null
      this.extensionContextValid = true // Reset for potential re-initialization

      console.log('SharedInfrastructureModule: Destroyed successfully')

    } catch (error) {
      console.error('SharedInfrastructureModule: Error during destroy:', error)
    } finally {
      this.isDestroying = false
      this.isFlushInProgress = false
    }
  }

  /**
   * Set up communication with main-world script
   */
  private setupMainWorldCommunication(): void {
    // Listen for messages from main-world script (network requests and console events)
    const mainWorldListener = (event: MessageEvent) => {
      // Handle network requests from main-world script
      if (event.data?.source === 'main-world-network-interceptor') {
        this.handleMainWorldMessage({
          type: 'networkRequest',
          payload: event.data.data
        })
      }
      // Handle console events from main-world script
      else if (event.data?.source === 'main-world-console-interceptor') {
        this.handleMainWorldMessage({
          type: 'consoleEvent',
          payload: {
            level: event.data.data.severity, // main-world uses 'severity'
            message: event.data.data.message,
            timestamp: new Date(event.data.data.timestamp).getTime(),
            url: event.data.data.url,
            stack: event.data.data.stack,
            args: []
          }
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
              const result = await chrome.storage.local.get([`tabLogging_${tabId}`, 'extensionEnabled', 'settings'])
              const globalEnabled = result.extensionEnabled !== false
              const tabLogging = result[`tabLogging_${tabId}`]
              const settings = result.settings

              // PERMISSION FIX: Default to disabled when no tab state exists
              // This respects the defaultState: 'paused' configuration
              let tabEnabled = false
              if (tabLogging) {
                // Tab has explicit state, use it
                tabEnabled = tabLogging.active === true
              } else {
                // No tab state exists, check settings for default
                const defaultState = settings?.networkInterception?.tabSpecific?.defaultState || 'paused'
                tabEnabled = defaultState === 'active'
              }

              console.log('📨 CONTENT: Network logging state - Global:', globalEnabled, 'Tab:', tabEnabled, 'TabData:', tabLogging, 'DefaultFromSettings:', settings?.networkInterception?.tabSpecific?.defaultState)
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
                'settings',
                'unifiedPermissionManager'
              ])

              // MAJOR FIX: Use unified permission manager for console feature state, not master switch
              const masterSwitchEnabled = result.extensionEnabled !== false
              const unifiedManager = result.unifiedPermissionManager
              const globalConsoleEnabled = unifiedManager?.featureDefaults?.console ?? false
              const tabLogging = result[`tabErrorLogging_${currentTabId}`] // FIXED: Use correct key
              const settings = result.settings

              // MAJOR FIX: Different logic for explicit tab state vs defaults
              let finalEnabled = false
              if (tabLogging) {
                // Tab has explicit state - ignore global console feature default
                // Only check: master switch && explicit tab toggle
                finalEnabled = masterSwitchEnabled && (tabLogging.active === true)
                console.log('📨 CONTENT: Using explicit tab state:', tabLogging.active, 'Final:', finalEnabled)
              } else {
                // No explicit tab state - use console feature default
                finalEnabled = masterSwitchEnabled && globalConsoleEnabled
                console.log('📨 CONTENT: Using feature default:', globalConsoleEnabled, 'Final:', finalEnabled)
              }

              console.log('📨 CONTENT: Console logging state - Master:', masterSwitchEnabled, 'ConsoleFeature:', globalConsoleEnabled, 'TabData:', tabLogging, 'DefaultFromSettings:', settings?.errorLogging?.tabSpecific?.defaultState)

              response = { enabled: finalEnabled }
            } else {
              console.log('📨 CONTENT: No tab ID available for console, returning false')
              response = { enabled: false }
            }
            break

          case 'getCurrentLoggingState':
            console.log('📨 CONTENT: Processing getCurrentLoggingState request...')
            const stateTabResponse = await this.sendToBackground('getCurrentTabId', {})
            const stateTabId = stateTabResponse?.tabId

            if (stateTabId) {
              // Get both network and console logging states
              const result = await chrome.storage.local.get([
                `tabLogging_${stateTabId}`,
                `tabErrorLogging_${stateTabId}`,
                'extensionEnabled'
              ])

              const globalEnabled = result.extensionEnabled !== false
              const tabNetworkLogging = result[`tabLogging_${stateTabId}`]
              const tabConsoleLogging = result[`tabErrorLogging_${stateTabId}`]

              const networkEnabled = globalEnabled && (tabNetworkLogging?.active === true)
              const consoleEnabled = globalEnabled && (tabConsoleLogging?.active === true)

              console.log('📨 CONTENT: Current state - Network:', networkEnabled, 'Console:', consoleEnabled)

              // Send the state change event to enable/disable logging
              window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
                detail: {
                  networkEnabled,
                  consoleEnabled
                }
              }))

              response = { networkEnabled, consoleEnabled }
            } else {
              console.log('📨 CONTENT: No tab ID available for state check')
              response = { networkEnabled: false, consoleEnabled: false }
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
    const storageChangeListener = async (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (this.isDestroying || namespace !== 'local') return

      // Get current tab ID to check if changes are relevant to this tab
      const tabResponse = await this.sendToBackground('getCurrentTabId', {})
      const currentTabId = tabResponse?.tabId

      if (!currentTabId) return

      console.log('📨 CONTENT: Storage change detected:', Object.keys(changes))

      // Check for tab-specific logging changes that affect current tab
      const networkLoggingKey = `tabLogging_${currentTabId}`
      const consoleLoggingKey = `tabErrorLogging_${currentTabId}`

      let shouldNotifyMainWorld = false
      let networkEnabled = undefined
      let consoleEnabled = undefined

      // Handle network logging changes
      if (changes[networkLoggingKey]) {
        const change = changes[networkLoggingKey]
        const oldValue = change.oldValue
        const newValue = change.newValue

        console.log('🔄 CONTENT: Network logging change for current tab:', { old: oldValue, new: newValue })

        // Only notify if this is a user-initiated change (not initial setup or system changes)
        if (oldValue !== undefined && newValue !== undefined) {
          const oldActive = oldValue?.active ?? (oldValue?.status === 'active')
          const newActive = newValue?.active ?? (newValue?.status === 'active')

          if (oldActive !== newActive) {
            shouldNotifyMainWorld = true
            networkEnabled = newActive
            console.log('👤 CONTENT: User changed network logging to:', networkEnabled)
          }
        }
      }

      // Handle console/error logging changes
      if (changes[consoleLoggingKey]) {
        const change = changes[consoleLoggingKey]
        const oldValue = change.oldValue
        const newValue = change.newValue

        console.log('🔄 CONTENT: Console logging change for current tab:', { old: oldValue, new: newValue })

        // Only notify if this is a user-initiated change (not initial setup or system changes)
        if (oldValue !== undefined && newValue !== undefined) {
          const oldActive = oldValue?.active ?? false
          const newActive = newValue?.active ?? false

          if (oldActive !== newActive) {
            shouldNotifyMainWorld = true
            consoleEnabled = newActive
            console.log('👤 CONTENT: User changed console logging to:', consoleEnabled)
          }
        }
      }

      // Handle global extension state changes
      if (changes.extensionEnabled) {
        shouldNotifyMainWorld = true
        console.log('� CONTENT: Extension enabled state changed')
      }

      // Only notify main-world script if there were actual user-initiated changes
      if (shouldNotifyMainWorld) {
        // Get current global state
        const globalState = await chrome.storage.local.get(['extensionEnabled'])
        const globalEnabled = globalState.extensionEnabled !== false

        // If specific states weren't changed, get current values
        if (networkEnabled === undefined) {
          const networkState = await chrome.storage.local.get([networkLoggingKey])
          const tabNetworkLogging = networkState[networkLoggingKey]
          networkEnabled = globalEnabled && (tabNetworkLogging?.active === true || tabNetworkLogging?.status === 'active')
        } else {
          networkEnabled = globalEnabled && networkEnabled
        }

        if (consoleEnabled === undefined) {
          const consoleState = await chrome.storage.local.get([consoleLoggingKey])
          const tabConsoleLogging = consoleState[consoleLoggingKey]
          consoleEnabled = globalEnabled && (tabConsoleLogging?.active === true)
        } else {
          consoleEnabled = globalEnabled && consoleEnabled
        }

        // Notify main-world script
        window.dispatchEvent(new CustomEvent('tabLoggingStateChange', {
          detail: {
            networkEnabled,
            consoleEnabled,
            userInitiated: true // Flag to indicate this was a user action
          }
        }))

        console.log('📨 CONTENT: Notified main-world of USER-INITIATED state change - Network:', networkEnabled, 'Console:', consoleEnabled)
      } else {
        console.log('📨 CONTENT: Storage change was system-initiated, skipping main-world notification')
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
        const networkEnabled = globalEnabled && (tabNetworkLogging?.active === true)

        // Check console logging state
        const tabConsoleLogging = result[`tabErrorLogging_${tabId}`]
        const consoleEnabled = globalEnabled && (tabConsoleLogging?.active === true)

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
    if (this.isDestroying) return

    try {
      const { type, payload } = data

      switch (type) {
        case 'networkRequest':
          // Always handle network requests from main-world script, regardless of local network module status
          if (payload) {
            // Minimal logging - only for errors/important requests
            if (payload.status >= 400 || payload.url.includes('error') || payload.url.includes('debug')) {
              console.log('🌐 Network request:', payload.url, payload.status)
            }

            this.pendingData.networkRequests.push(payload)

            // Check if we should flush - priority flush for errors or slow requests
            const isHighPriority = payload.status >= 400 || (payload.duration && payload.duration > 5000)
            const priority: 'normal' | 'high' = isHighPriority ? 'high' : 'normal'

            if (this.shouldFlush(priority)) {
              this.flushPendingData().catch(error => {
                console.error('SharedInfrastructure: Flush error:', error)
              })
            } else if (!this.flushTimeoutTimer) {
              // Set timeout for normal batching
              this.flushTimeoutTimer = window.setTimeout(() => {
                this.flushPendingData().catch(error => {
                  console.error('SharedInfrastructure: Timeout flush error:', error)
                })
                this.flushTimeoutTimer = null
              }, 2000)
            }
          } else {
            console.warn('🌐 SharedInfrastructure: Received empty network request payload')
          }
          break

        case 'consoleEvent':
          if (payload) {
            // Only log errors or warnings for console events
            if (payload.level === 'error' || payload.level === 'warn') {
              console.log(`📝 Console ${payload.level}:`, payload.message.substring(0, 100))
            }
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
            if (this.shouldFlush('normal')) {
              this.flushPendingData().catch(error => {
                console.error('SharedInfrastructure: Error flushing console event:', error)
              })
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

  /**
   * Update configuration dynamically - handles settings changes
   */
  async updateConfiguration(newConfig: Partial<SharedInfrastructureConfig>): Promise<void> {
    if (this.configUpdateInProgress) {
      console.warn('SharedInfrastructureModule: Configuration update already in progress')
      return
    }

    this.configUpdateInProgress = true

    try {
      console.log('📝 Configuration update:', Object.keys(newConfig).join(', '))

      // Deep merge the new configuration
      const updatedConfig = {
        network: { ...this.config.network, ...newConfig.network },
        console: { ...this.config.console, ...newConfig.console },
        communication: { ...this.config.communication, ...newConfig.communication }
      }

      // Store the old config for potential rollback (future use)
      // const oldConfig = this.config
      this.config = updatedConfig

      // Update network module if configuration changed
      if (newConfig.network && this.networkModule) {
        // Destroy old module
        this.networkModule.destroy()

        // Create new module with updated config (ensure maxBodySize is set)
        const networkConfig = {
          ...this.config.network,
          maxBodySize: this.config.network.maxBodySize || 2048
        }
        this.networkModule = new NetworkInterceptorModule(networkConfig)
        this.networkModule.addListener(this.boundNetworkHandler)
        await this.networkModule.initialize()

        console.log('✅ Network interceptor reconfigured')
      } else if (newConfig.network?.enabled && !this.networkModule) {
        // Enable network module if it wasn't enabled before
        const networkConfig = {
          ...this.config.network,
          maxBodySize: this.config.network.maxBodySize || 2048
        }
        this.networkModule = new NetworkInterceptorModule(networkConfig)
        this.networkModule.addListener(this.boundNetworkHandler)
        await this.networkModule.initialize()

        console.log('✅ Network interceptor enabled')
      } else if (newConfig.network?.enabled === false && this.networkModule) {
        // Disable network module

        this.networkModule.destroy()
        this.networkModule = undefined

        console.log('✅ Network interceptor disabled')
      }

      // Update console module if configuration changed
      if (newConfig.console && this.consoleModule) {
        // Destroy old module
        this.consoleModule.destroy()

        // Create new module with updated config
        this.consoleModule = new ConsoleInterceptorModule(this.config.console)
        this.consoleModule.addListener(this.boundConsoleHandler)
        await this.consoleModule.initialize()

        console.log('✅ Console interceptor reconfigured')
      } else if (newConfig.console?.enabled && !this.consoleModule) {
        // Enable console module if it wasn't enabled before
        this.consoleModule = new ConsoleInterceptorModule(this.config.console)
        this.consoleModule.addListener(this.boundConsoleHandler)
        await this.consoleModule.initialize()

        console.log('✅ Console interceptor enabled')
      } else if (newConfig.console?.enabled === false && this.consoleModule) {
        // Disable console module
        this.consoleModule.destroy()
        this.consoleModule = undefined

        console.log('✅ Console interceptor disabled')
      }

      console.log('✅ Configuration updated')

    } catch (error) {
      console.error('❌ Configuration update failed:', error)
      // Could implement rollback logic here if needed
      throw error
    } finally {
      this.configUpdateInProgress = false
    }
  }

  /**
   * Retry main-world script injection (used when site becomes enabled)
   */
  private async retryScriptInjection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Retrying script injection...')

      const injectionResponse = await chrome.runtime.sendMessage({
        action: 'INJECT_MAIN_WORLD_SCRIPT'
      })

      if (injectionResponse?.success) {
        console.log('✅ Script injection successful')
        return { success: true }
      } else {
        console.warn('⚠️ CONTENT: Script injection retry failed:', injectionResponse?.error)
        return { success: false, error: injectionResponse?.error || 'Unknown injection error' }
      }
    } catch (error) {
      console.error('❌ CONTENT: Error during script injection retry:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during injection retry'
      }
    }
  }

  /**
   * Remove all event listeners for cleanup
   */
  private removeEventListeners(): void {
    try {
      // Abort all listeners attached with AbortController
      this.abortController.abort()

      // Clear tracked event listeners
      this.eventListeners.clear()

      // Clear chrome API listeners
      this.chromeListeners.clear()

      // Create new AbortController for potential re-initialization
      this.abortController = new AbortController()
    } catch (error) {
      console.error('SharedInfrastructureModule: Error removing event listeners:', error)
    }
  }
}

export default SharedInfrastructureModule
