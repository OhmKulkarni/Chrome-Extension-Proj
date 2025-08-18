/**
 * Network Interceptor Module - Modular architecture for network request interception
 * Separates network interception logic from the main content script
 */

export interface NetworkRequest {
  id: string
  url: string
  method: string
  status: number
  statusText?: string
  timestamp: number
  duration?: number
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  requestBody?: string
  responseBody?: string
  tabId?: number
  frameId?: number
}

export interface NetworkInterceptorConfig {
  enabled: boolean
  captureHeaders: boolean
  captureBody: boolean
  maxBodySize: number
  urlFilters?: RegExp[]
  methodFilters?: string[]
}

export class NetworkInterceptorModule {
  private config: NetworkInterceptorConfig
  private listeners: Set<(request: NetworkRequest) => void> = new Set()
  private isInitialized = false

  // MEMORY LEAK FIX: Store original methods for proper restoration
  private originalMethods: {
    fetch?: typeof window.fetch
    xhrOpen?: typeof XMLHttpRequest.prototype.open
    xhrSend?: typeof XMLHttpRequest.prototype.send
  } = {}

  // RACE CONDITION FIX: Prevent concurrent destroy operations
  private isDestroying = false

  constructor(config: NetworkInterceptorConfig) {
    // Apply default values for any missing config properties
    const defaults: NetworkInterceptorConfig = {
      enabled: true,
      captureHeaders: true,
      captureBody: false,
      maxBodySize: 1024 * 1024, // 1MB
      urlFilters: undefined,
      methodFilters: undefined
    }

    this.config = { ...defaults, ...config }
  }

  /**
   * Initialize the network interceptor - RACE CONDITION SAFE
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('NetworkInterceptorModule: Already initialized')
      return
    }

    if (this.isDestroying) {
      console.error('NetworkInterceptorModule: Cannot initialize while destroying')
      return
    }

    if (!this.config.enabled) {
      console.log('NetworkInterceptorModule: Disabled by configuration')
      return
    }

    console.log('NetworkInterceptorModule: Initializing network interception...')

    try {
      // Set up XMLHttpRequest interception
      this.interceptXMLHttpRequest()

      // Set up Fetch API interception
      this.interceptFetch()

      this.isInitialized = true
      console.log('NetworkInterceptorModule: Network interception initialized')

    } catch (error) {
      console.error('NetworkInterceptorModule: Initialization failed:', error)
      // Clean up any partial state
      this.originalMethods = {}
      throw error
    }
  }

  /**
   * Add listener for network requests
   */
  public addListener(listener: (request: NetworkRequest) => void): void {
    this.listeners.add(listener)
  }

  /**
   * Remove listener for network requests
   */
  public removeListener(listener: (request: NetworkRequest) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of a network request
   */
  private notifyListeners(request: NetworkRequest): void {
    this.listeners.forEach(listener => {
      try {
        listener(request)
      } catch (error) {
        console.error('NetworkInterceptorModule: Listener error:', error)
      }
    })
  }

  /**
   * Intercept XMLHttpRequest - MEMORY LEAK SAFE
   */
  private interceptXMLHttpRequest(): void {
    // Store originals if not already stored
    if (!this.originalMethods.xhrOpen) {
      this.originalMethods.xhrOpen = XMLHttpRequest.prototype.open
      this.originalMethods.xhrSend = XMLHttpRequest.prototype.send
    }

    const originalXHROpen = this.originalMethods.xhrOpen!
    const originalXHRSend = this.originalMethods.xhrSend!
    const moduleInstance = this

    XMLHttpRequest.prototype.open = function(method: string, url: string, async?: boolean, user?: string, password?: string) {
      ;(this as any)._networkInterceptor = {
        method,
        url,
        startTime: Date.now(),
        requestHeaders: {}
      }
      return originalXHROpen.call(this, method, url, async ?? true, user, password)
    }

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const interceptor = (this as any)._networkInterceptor
      if (!interceptor) {
        return originalXHRSend.call(this, body)
      }

      // Store request body
      if (body && typeof body === 'string') {
        interceptor.requestBody = body.length <= 1024 * 1024 ? body : body.substring(0, 1024 * 1024)
      }

      // Capture request headers
      const setRequestHeader = this.setRequestHeader
      this.setRequestHeader = function(name: string, value: string) {
        interceptor.requestHeaders[name] = value
        return setRequestHeader.call(this, name, value)
      }

      // Set up response handler
      this.addEventListener('readystatechange', () => {
        if (this.readyState === XMLHttpRequest.DONE) {
          const endTime = Date.now()
          const networkRequest: NetworkRequest = {
            id: `xhr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: interceptor.url,
            method: interceptor.method,
            status: this.status,
            statusText: this.statusText,
            timestamp: interceptor.startTime,
            duration: endTime - interceptor.startTime,
            requestHeaders: interceptor.requestHeaders,
            responseHeaders: this.getAllResponseHeaders() ? moduleInstance.parseHeaders(this.getAllResponseHeaders()) : {},
            requestBody: interceptor.requestBody,
            responseBody: this.responseText && this.responseText.length <= 1024 * 1024 ? this.responseText : undefined
          }

          // Notify listeners
          if (!moduleInstance.shouldFilter(networkRequest)) {
            moduleInstance.notifyListeners(networkRequest)
          }
        }
      })

      return originalXHRSend.call(this, body)
    }
  }

  /**
   * Intercept Fetch API - MEMORY LEAK SAFE
   */
  private interceptFetch(): void {
    // Store original if not already stored
    if (!this.originalMethods.fetch) {
      this.originalMethods.fetch = window.fetch
    }

    const originalFetch = this.originalMethods.fetch!
    const module = this

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now()
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method || 'GET'

      try {
        const response = await originalFetch(input, init)
        const endTime = Date.now()

        // Clone response to read body if needed
        const responseClone = response.clone()
        let responseBody: string | undefined

        try {
          const text = await responseClone.text()
          responseBody = text.length <= 1024 * 1024 ? text : undefined
        } catch (error) {
          // Ignore body reading errors
        }

        const networkRequest: NetworkRequest = {
          id: `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          timestamp: startTime,
          duration: endTime - startTime,
          requestHeaders: init?.headers ? module.headersToObject(init.headers) : {},
          responseHeaders: module.headersToObject(response.headers),
          requestBody: init?.body ? String(init.body).substring(0, 1024 * 1024) : undefined,
          responseBody
        }

        // Notify listeners
        if (!module.shouldFilter(networkRequest)) {
          module.notifyListeners(networkRequest)
        }

        return response
      } catch (error) {
        const endTime = Date.now()

        const networkRequest: NetworkRequest = {
          id: `fetch_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          status: 0,
          statusText: 'Network Error',
          timestamp: startTime,
          duration: endTime - startTime,
          requestHeaders: init?.headers ? module.headersToObject(init.headers) : {},
          responseHeaders: {},
          requestBody: init?.body ? String(init.body).substring(0, 1024 * 1024) : undefined,
          responseBody: error instanceof Error ? error.message : 'Unknown error'
        }

        if (!module.shouldFilter(networkRequest)) {
          module.notifyListeners(networkRequest)
        }
        throw error
      }
    }.bind(this)
  }

  /**
   * Parse response headers string into object
   */
  private parseHeaders(headerString: string): Record<string, string> {
    const headers: Record<string, string> = {}
    headerString.split('\r\n').forEach(line => {
      const [name, value] = line.split(': ')
      if (name && value) {
        headers[name.toLowerCase()] = value
      }
    })
    return headers
  }

  /**
   * Convert Headers object to plain object
   */
  private headersToObject(headers: Headers | Record<string, string> | string[][]): Record<string, string> {
    const result: Record<string, string> = {}

    if (headers instanceof Headers) {
      headers.forEach((value, name) => {
        result[name.toLowerCase()] = value
      })
    } else if (Array.isArray(headers)) {
      headers.forEach(([name, value]) => {
        result[name.toLowerCase()] = value
      })
    } else if (typeof headers === 'object') {
      Object.entries(headers).forEach(([name, value]) => {
        result[name.toLowerCase()] = value
      })
    }

    return result
  }

  /**
   * Check if request should be filtered
   */
  private shouldFilter(request: NetworkRequest): boolean {
    // URL filters
    if (this.config.urlFilters && this.config.urlFilters.length > 0) {
      const matchesFilter = this.config.urlFilters.some(filter => filter.test(request.url))
      if (!matchesFilter) return true
    }

    // Method filters
    if (this.config.methodFilters && this.config.methodFilters.length > 0) {
      if (!this.config.methodFilters.includes(request.method)) return true
    }

    return false
  }

  /**
   * Cleanup and destroy the interceptor - ENHANCED MEMORY LEAK PROTECTION
   */
  public destroy(): void {
    // Prevent concurrent destroy operations
    if (this.isDestroying) {
      console.warn('NetworkInterceptorModule: Destroy already in progress')
      return
    }

    this.isDestroying = true

    try {
      console.log('NetworkInterceptorModule: Destroying and restoring original methods...')

      // Restore original methods if they were intercepted
      if (this.originalMethods.fetch) {
        window.fetch = this.originalMethods.fetch
        this.originalMethods.fetch = undefined
      }

      if (this.originalMethods.xhrOpen) {
        XMLHttpRequest.prototype.open = this.originalMethods.xhrOpen
        this.originalMethods.xhrOpen = undefined
      }

      if (this.originalMethods.xhrSend) {
        XMLHttpRequest.prototype.send = this.originalMethods.xhrSend
        this.originalMethods.xhrSend = undefined
      }

      // Clear listeners
      this.listeners.clear()
      this.isInitialized = false

      console.log('NetworkInterceptorModule: Destroyed and methods restored')

    } catch (error) {
      console.error('NetworkInterceptorModule: Error during destroy:', error)
      // Even on error, clear our state
      this.listeners.clear()
      this.isInitialized = false
    } finally {
      this.isDestroying = false
    }
  }
}

export default NetworkInterceptorModule
