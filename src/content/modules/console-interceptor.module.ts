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

export class ConsoleInterceptorModule {
  private config: ConsoleInterceptorConfig
  private listeners: Set<(event: ConsoleEvent) => void> = new Set()
  private isInitialized = false
  private originalMethods: Map<string, Function> = new Map()

  // RACE CONDITION FIX: Prevent concurrent destroy operations
  private isDestroying = false

  constructor(config: ConsoleInterceptorConfig) {
    const defaults: ConsoleInterceptorConfig = {
      enabled: true,
      captureStack: true,
      maxMessageLength: 10000,
      levels: ['error', 'warn']
    }
    this.config = { ...defaults, ...config }
  }

  /**
   * Initialize the console interceptor - RACE CONDITION SAFE
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('ConsoleInterceptorModule: Already initialized')
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

    console.log('ConsoleInterceptorModule: Initializing console interception...')

    try {
      // Set up console method interception
      this.interceptConsoleMethods()

      // Set up window error handler
      this.interceptWindowErrors()

      // Set up unhandled promise rejection handler
      this.interceptUnhandledRejections()

      this.isInitialized = true
      console.log('ConsoleInterceptorModule: Console interception initialized')

    } catch (error) {
      console.error('ConsoleInterceptorModule: Initialization failed:', error)
      // Clean up any partial state
      this.originalMethods.clear()
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
   */
  private notifyListeners(event: ConsoleEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        // Avoid infinite loops by not logging this error
      }
    })
  }

  /**
   * Intercept console methods
   */
  private interceptConsoleMethods(): void {
    const levels = this.config.levels

    levels.forEach(level => {
      if (typeof console[level] === 'function') {
        // Store original method
        this.originalMethods.set(level, console[level])

        // Replace with intercepted version
        console[level] = (...args: any[]) => {
          // Call original method first
          this.originalMethods.get(level)?.apply(console, args)

          // Create console event
          const consoleEvent = this.createConsoleEvent(level, args)

          // Filter if needed
          if (!this.shouldFilter(consoleEvent)) {
            this.notifyListeners(consoleEvent)

            // Dispatch custom event for main content script
            window.dispatchEvent(new CustomEvent('consoleEvent', { detail: consoleEvent }))
          }
        }
      }
    })
  }

  /**
   * Intercept window error events
   */
  private interceptWindowErrors(): void {
    window.addEventListener('error', (event: ErrorEvent) => {
      const consoleEvent: ConsoleEvent = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        level: 'error',
        message: event.message || 'Unknown error',
        timestamp: Date.now(),
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        args: [event.error]
      }

      if (!this.shouldFilter(consoleEvent)) {
        this.notifyListeners(consoleEvent)
        window.dispatchEvent(new CustomEvent('consoleEvent', { detail: consoleEvent }))
      }
    })
  }

  /**
   * Intercept unhandled promise rejections
   */
  private interceptUnhandledRejections(): void {
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason
      let message = 'Unhandled promise rejection'
      let stack: string | undefined

      if (reason instanceof Error) {
        message = reason.message
        stack = reason.stack
      } else if (typeof reason === 'string') {
        message = reason
      } else if (reason && typeof reason === 'object') {
        message = JSON.stringify(reason)
      }

      const consoleEvent: ConsoleEvent = {
        id: `rejection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        level: 'error',
        message: `Unhandled Promise Rejection: ${message}`,
        timestamp: Date.now(),
        stack,
        args: [reason]
      }

      if (!this.shouldFilter(consoleEvent)) {
        this.notifyListeners(consoleEvent)
        window.dispatchEvent(new CustomEvent('consoleEvent', { detail: consoleEvent }))
      }
    })
  }

  /**
   * Create console event from console method arguments
   */
  private createConsoleEvent(level: 'error' | 'warn' | 'info' | 'log' | 'debug', args: any[]): ConsoleEvent {
    // Format message
    let message = ''
    const filteredArgs: any[] = []

    args.forEach(arg => {
      if (typeof arg === 'string') {
        message += arg + ' '
      } else if (arg instanceof Error) {
        message += arg.message + ' '
        filteredArgs.push({
          name: arg.name,
          message: arg.message,
          stack: this.config.captureStack ? arg.stack : undefined
        })
      } else {
        try {
          const stringified = JSON.stringify(arg, null, 2)
          message += stringified + ' '
          filteredArgs.push(arg)
        } catch (error) {
          message += '[Circular Object] '
          filteredArgs.push('[Circular]')
        }
      }
    })

    // Trim and limit message length
    message = message.trim()
    if (message.length > this.config.maxMessageLength) {
      message = message.substring(0, this.config.maxMessageLength) + '...[truncated]'
    }

    // Get stack trace if available
    let stack: string | undefined
    if (this.config.captureStack) {
      try {
        throw new Error()
      } catch (e) {
        stack = (e as Error).stack
      }
    }

    return {
      id: `console_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: Date.now(),
      url: window.location.href,
      stack,
      args: filteredArgs
    }
  }

  /**
   * Check if console event should be filtered
   */
  private shouldFilter(event: ConsoleEvent): boolean {
    // URL filters
    if (this.config.urlFilters && this.config.urlFilters.length > 0 && event.url) {
      const matchesFilter = this.config.urlFilters.some(filter => filter.test(event.url!))
      if (!matchesFilter) return true
    }

    // Filter out our own extension messages to prevent infinite loops
    if (event.message.includes('CONTENT:') || event.message.includes('BACKGROUND:') ||
        event.message.includes('ConsoleInterceptorModule:') ||
        event.message.includes('NetworkInterceptorModule:')) {
      return true
    }

    return false
  }

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
    // Prevent concurrent destroy operations
    if (this.isDestroying) {
      console.warn('ConsoleInterceptorModule: Destroy already in progress')
      return
    }

    this.isDestroying = true

    try {
      console.log('ConsoleInterceptorModule: Destroying and restoring console methods...')

      // Restore original console methods
      this.originalMethods.forEach((originalMethod, level) => {
        try {
          if (typeof console[level as keyof Console] === 'function') {
            (console as any)[level] = originalMethod
          }
        } catch (error) {
          console.error(`ConsoleInterceptorModule: Error restoring console.${level}:`, error)
        }
      })

      this.listeners.clear()
      this.originalMethods.clear()
      this.isInitialized = false

      console.log('ConsoleInterceptorModule: Destroyed successfully')

    } catch (error) {
      console.error('ConsoleInterceptorModule: Error during destroy:', error)
      // Even on error, clear our state
      this.listeners.clear()
      this.originalMethods.clear()
      this.isInitialized = false
    } finally {
      this.isDestroying = false
    }
  }
}

export default ConsoleInterceptorModule
