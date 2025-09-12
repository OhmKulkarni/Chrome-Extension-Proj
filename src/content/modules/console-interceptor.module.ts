/**
 * Console Interceptor Module - Modular architecture for console error interception
 * Separates console interception logic from the main content script
 */

export interface ConsoleEvent {
  id: string
  level: 'error' | 'warn' | 'info' | 'log' | 'debug'
  message: string
  timestamp: number
  url?: string
  line?: number
  column?: number
  stack?: string
  args?: any[]
}

export interface ConsoleInterceptorConfig {
  enabled: boolean
  captureStack: boolean
  maxMessageLength: number
  levels: ('error' | 'warn' | 'info' | 'log' | 'debug')[]
  urlFilters?: RegExp[]
}

type ConsoleLevel = 'error' | 'warn' | 'info' | 'log' | 'debug'

interface ConsoleError {
  level: ConsoleLevel
  message: string
  timestamp: number
  stack?: string
  url: string
  line?: number
  column?: number
}

export class ConsoleInterceptorModule {
  private config: ConsoleInterceptorConfig
  private listeners: Set<(event: ConsoleEvent) => void> = new Set()
  private isInitialized = false
  private originalMethods: Map<string, Function> = new Map()
  private errorQueue: ConsoleError[] = []
  private readonly MAX_QUEUE_SIZE = 50

  // RACE CONDITION FIX: Prevent concurrent destroy operations
  private isDestroying = false

  // OPTIMIZATION: Add debouncing for high-frequency events
  private debounceTimers: Map<string, number> = new Map()
  // Note: DEBOUNCE_DELAY available for future debouncing implementation

  // OPTIMIZATION: Cache formatted messages to avoid re-processing
  private messageCache: Map<string, string> = new Map()
  private readonly MAX_CACHE_SIZE = 100

  constructor(config: ConsoleInterceptorConfig) {
    const defaults: ConsoleInterceptorConfig = {
      enabled: true,
      captureStack: true,
      maxMessageLength: 10000,
      levels: ['error', 'warn', 'info', 'log']
    }
    this.config = { ...defaults, ...config }
  }

  /**
   * Initialize the console interceptor - RACE CONDITION SAFE
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[ConsoleInterceptor] Already initialized')
      return
    }

    if (this.isDestroying) {
      console.error('ConsoleInterceptorModule: Cannot initialize while destroying')
      return
    }

    if (!this.config.enabled) {
      console.log('ConsoleInterceptorModule: Disabled by configuration')
      return
    }

    console.log('[ConsoleInterceptor] Initializing...')

    try {
      // Set up console method interception
      this.interceptConsoleMethods()

      // Set up window error handler
      this.interceptWindowErrors()

      // Set up unhandled promise rejection handler
      this.interceptUnhandledRejections()

      this.isInitialized = true
      console.log('[ConsoleInterceptor] Initialized successfully')
    } catch (error) {
      console.error('[ConsoleInterceptor] Failed to initialize:', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Add listener for console events
   */
  public addListener(listener: (event: ConsoleEvent) => void): void {
    this.listeners.add(listener)
  }

  /**
   * Remove listener for console events
   */
  public removeListener(listener: (event: ConsoleEvent) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of a console event
   * OPTIMIZATION: Add error boundary and async notification
   */
  private notifyListeners(event: ConsoleEvent): void {
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      this.listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          // Avoid infinite loops by not logging this error
        }
      })
    }, 0)
  }

  /**
   * Create a console event from method and arguments
   */
  private createConsoleEvent(method: ConsoleLevel, args: any[]): ConsoleEvent {
    return {
      id: `console_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level: method,
      message: this.formatMessage(args),
      timestamp: Date.now(),
      url: window.location.href,
      stack: this.captureStackTrace(),
      args: args
    }
  }

  /**
   * Intercept console methods
   */
  private interceptConsoleMethods(): void {
    const methods: ConsoleLevel[] = ['error', 'warn', 'log', 'info', 'debug']

    methods.forEach(method => {
      // Store original method
      this.originalMethods.set(method, console[method])

      const originalMethod = console[method].bind(console)
      const module = this

      console[method] = function (...args: any[]): void {
        // Call original method first
        originalMethod(...args)

        // Skip if disabled for this level
        if (!module.config.levels.includes(method)) {
          return
        }

        try {
          const event = module.createConsoleEvent(method, args)

          // Skip if should be filtered
          if (module.shouldFilter(event)) {
            return
          }

          // Add to queue with size management
          module.addToQueue({
            level: method,
            message: event.message,
            timestamp: event.timestamp,
            stack: event.stack,
            url: event.url || window.location.href
          })

          // Notify listeners
          module.notifyListeners(event)
        } catch (err) {
          // Use original method to avoid recursion
          originalMethod('Error in console interceptor:', err)
        }
      }
    })
  }

  /**
   * Intercept window error events
   */
  private interceptWindowErrors(): void {
    const module = this

    // Store original handler if exists
    const originalOnError = window.onerror
    this.originalMethods.set('onerror', originalOnError || (() => {}))

    window.onerror = function (
      message: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ): boolean {
      try {
        const errorData: ConsoleError = {
          level: 'error',
          message: message.toString(),
          timestamp: Date.now(),
          stack: error?.stack || module.captureStackTrace(),
          url: source || window.location.href,
          line: lineno,
          column: colno
        }

        // Add to queue with size management
        module.addToQueue(errorData)

        // Create event for listeners
        const event: ConsoleEvent = {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: 'error',
          message: errorData.message,
          timestamp: errorData.timestamp,
          url: errorData.url,
          line: errorData.line,
          column: errorData.column,
          stack: errorData.stack,
          args: []
        }

        // Notify listeners
        module.notifyListeners(event)
      } catch (err) {
        console.error('Error in window.onerror interceptor:', err)
      }

      // Call original handler if it existed
      if (originalOnError && typeof originalOnError === 'function') {
        return originalOnError.call(window, message, source, lineno, colno, error)
      }

      return false
    }
  }

  /**
   * Intercept unhandled promise rejections
   */
  private interceptUnhandledRejections(): void {
    const module = this

    const originalOnUnhandledRejection = window.onunhandledrejection
    this.originalMethods.set('onunhandledrejection', originalOnUnhandledRejection || (() => {}))

    window.onunhandledrejection = function (event: PromiseRejectionEvent): any {
      try {
        const errorMessage = event.reason instanceof Error
          ? event.reason.message
          : String(event.reason)

        const errorStack = event.reason instanceof Error
          ? event.reason.stack
          : module.captureStackTrace()

        const errorData: ConsoleError = {
          level: 'error',
          message: `Unhandled Promise Rejection: ${errorMessage}`,
          timestamp: Date.now(),
          stack: errorStack,
          url: window.location.href
        }

        // Add to queue with size management
        module.addToQueue(errorData)

        // Create event for listeners
        const consoleEvent: ConsoleEvent = {
          id: `promise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: 'error',
          message: errorData.message,
          timestamp: errorData.timestamp,
          url: errorData.url,
          stack: errorData.stack,
          args: [event.reason]
        }

        // Notify listeners
        module.notifyListeners(consoleEvent)
      } catch (err) {
        console.error('Error in unhandledrejection interceptor:', err)
      }

      // Call original handler if it existed
      if (originalOnUnhandledRejection && typeof originalOnUnhandledRejection === 'function') {
        return originalOnUnhandledRejection.call(window, event)
      }
    }
  }

  /**
   * Capture current stack trace
   */
  private captureStackTrace(): string {
    if (!this.config.captureStack) {
      return ''
    }

    try {
      const err = new Error()
      return err.stack || ''
    } catch (e) {
      return ''
    }
  }

  /**
   * Add error to queue with size management
   * OPTIMIZATION: Implement efficient queue management
   */
  private addToQueue(error: ConsoleError): void {
    this.errorQueue.push(error)

    // Remove oldest items if queue exceeds max size
    if (this.errorQueue.length > this.MAX_QUEUE_SIZE) {
      const itemsToRemove = this.errorQueue.length - this.MAX_QUEUE_SIZE
      this.errorQueue.splice(0, itemsToRemove)
    }
  }

  /**
   * Get current error queue
   */
  public getErrorQueue(): ReadonlyArray<ConsoleError> {
    return [...this.errorQueue]
  }

  /**
   * Clear error queue
   */
  public clearErrorQueue(): void {
    this.errorQueue = []
  }

  /**
   * Format message from console arguments
   * OPTIMIZATION: Add caching for repeated messages
   */
  private formatMessage(args: any[]): string {
    // Create a cache key from arguments
    const cacheKey = this.createCacheKey(args)

    // Check cache first
    const cached = this.messageCache.get(cacheKey)
    if (cached) {
      return cached
    }

    let message = ''

    args.forEach((arg, index) => {
      if (index > 0) message += ' '

      if (arg === null) {
        message += 'null'
      } else if (arg === undefined) {
        message += 'undefined'
      } else if (typeof arg === 'string') {
        message += arg
      } else if (arg instanceof Error) {
        message += `${arg.name}: ${arg.message}`
      } else {
        try {
          // OPTIMIZATION: Use faster serialization for simple objects
          if (this.isSimpleObject(arg)) {
            message += this.fastStringify(arg)
          } else {
            message += JSON.stringify(arg, null, 2)
          }
        } catch (e) {
          message += '[Circular Object]'
        }
      }
    })

    // Trim and limit message length
    message = message.trim()
    if (message.length > this.config.maxMessageLength) {
      message = message.substring(0, this.config.maxMessageLength) + '...[truncated]'
    }

    // Cache the formatted message
    this.cacheFormattedMessage(cacheKey, message)

    return message
  }

  /**
   * Create cache key from arguments
   */
  private createCacheKey(args: any[]): string {
    return args.map(arg => {
      if (arg === null) return 'null'
      if (arg === undefined) return 'undefined'
      if (typeof arg === 'string') return arg.substring(0, 50)
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
      if (arg instanceof Error) return `Error:${arg.message}`
      return typeof arg
    }).join('|')
  }

  /**
   * Cache formatted message with size limit
   */
  private cacheFormattedMessage(key: string, message: string): void {
    this.messageCache.set(key, message)

    // Implement LRU cache eviction
    if (this.messageCache.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.messageCache.keys().next().value
      if (firstKey) {
        this.messageCache.delete(firstKey)
      }
    }
  }

  /**
   * Check if object is simple (no nested objects or arrays)
   */
  private isSimpleObject(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) return false

    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) return false
    }

    return true
  }

  /**
   * Fast stringify for simple objects
   */
  private fastStringify(obj: any): string {
    const pairs = Object.entries(obj).map(([key, value]) => {
      const valueStr = value === null ? 'null'
        : value === undefined ? 'undefined'
        : typeof value === 'string' ? `"${value}"`
        : String(value)
      return `"${key}":${valueStr}`
    })
    return `{${pairs.join(',')}}`
  }

  /**
   * Check if console event should be filtered
   * OPTIMIZATION: Compile regex patterns once
   */
  private shouldFilter(event: ConsoleEvent): boolean {
    // URL filters
    if (this.config.urlFilters && this.config.urlFilters.length > 0 && event.url) {
      const matchesFilter = this.config.urlFilters.some(filter => filter.test(event.url!))
      if (!matchesFilter) return true
    }

    // OPTIMIZATION: Use a single regex for all filter patterns
    if (!this._filterRegex) {
      const filterPatterns = [
        'CONTENT:',
        'BACKGROUND:',
        'ConsoleInterceptor',
        'NetworkInterceptor',
        'SharedInfrastructure',
        '\\[ConsoleInterceptor\\]',
        '\\[NetworkInterceptor\\]',
        '\\[SharedInfrastructure\\]',
        'Chrome Extension:'
      ]
      this._filterRegex = new RegExp(filterPatterns.join('|'))
    }

    return this._filterRegex.test(event.message)
  }

  private _filterRegex?: RegExp

  /**
   * Get current configuration
   */
  public getConfig(): ConsoleInterceptorConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ConsoleInterceptorConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Cleanup and destroy the interceptor - RACE CONDITION SAFE
   */
  public destroy(): void {
    console.log('[ConsoleInterceptor] Destroying module...')

    // Prevent concurrent destroy operations
    if (this.isDestroying) {
      console.warn('ConsoleInterceptorModule: Destroy already in progress')
      return
    }

    this.isDestroying = true

    try {
      // Restore console methods
      const methods: ConsoleLevel[] = ['error', 'warn', 'log', 'info', 'debug']
      methods.forEach(method => {
        const original = this.originalMethods.get(method)
        if (original) {
          console[method] = original as any
        }
      })

      // Restore window.onerror
      const originalOnError = this.originalMethods.get('onerror')
      if (originalOnError) {
        window.onerror = originalOnError as OnErrorEventHandler
      }

      // Restore window.onunhandledrejection
      const originalOnUnhandledRejection = this.originalMethods.get('onunhandledrejection')
      if (originalOnUnhandledRejection) {
        window.onunhandledrejection = originalOnUnhandledRejection as ((this: WindowEventHandlers, ev: PromiseRejectionEvent) => any)
      }

      // Clear stored methods
      this.originalMethods.clear()

      // Clear listeners
      this.listeners.clear()

      // Clear error queue
      this.errorQueue = []

      // OPTIMIZATION: Clear caches and timers
      this.messageCache.clear()
      this.debounceTimers.forEach(timer => clearTimeout(timer))
      this.debounceTimers.clear()
      this._filterRegex = undefined

      // Reset initialization flag
      this.isInitialized = false

      console.log('[ConsoleInterceptor] Module destroyed successfully')
    } catch (error) {
      console.error('[ConsoleInterceptor] Error during destroy:', error)
    } finally {
      this.isDestroying = false
    }
  }

  private cleanup(): void {
    // Emergency cleanup for initialization failures
    try {
      // Restore any methods that were intercepted
      const methods: ConsoleLevel[] = ['error', 'warn', 'log', 'info', 'debug']
      methods.forEach(method => {
        const original = this.originalMethods.get(method)
        if (original) {
          console[method] = original as any
        }
      })

      const originalOnError = this.originalMethods.get('onerror')
      if (originalOnError) {
        window.onerror = originalOnError as OnErrorEventHandler
      }

      const originalOnUnhandledRejection = this.originalMethods.get('onunhandledrejection')
      if (originalOnUnhandledRejection) {
        window.onunhandledrejection = originalOnUnhandledRejection as ((this: WindowEventHandlers, ev: PromiseRejectionEvent) => any)
      }

      this.originalMethods.clear()
      this.listeners.clear()
      this.errorQueue = []
      this.messageCache.clear()
      this.debounceTimers.forEach(timer => clearTimeout(timer))
      this.debounceTimers.clear()
      this._filterRegex = undefined
      this.isInitialized = false
    } catch (error) {
      console.error('[ConsoleInterceptor] Error during cleanup:', error)
    }
  }
}

export default ConsoleInterceptorModule
