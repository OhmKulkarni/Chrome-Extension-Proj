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
  requestSize?: number // ADDED: Accurate request size in bytes
  responseSize?: number // ADDED: Accurate response size in bytes
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
      captureBody: true, // CHANGED: Enable body capture by default
      maxBodySize: 2048, // CHANGED: Increased from 1MB to 2KB for better performance
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
    console.log('NetworkInterceptorModule: Config:', {
      enabled: this.config.enabled,
      captureHeaders: this.config.captureHeaders,
      captureBody: this.config.captureBody,
      maxBodySize: this.config.maxBodySize
    })

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
    console.log(`📢 NetworkInterceptor: Notifying ${this.listeners.size} listeners for ${request.method} ${request.url}`)
    this.listeners.forEach(listener => {
      try {
        listener(request)
        console.log(`✅ NetworkInterceptor: Listener notified successfully`)
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
        startTime: performance.now(), // CHANGED: Use high-precision timing
        realStartTime: Date.now(), // Keep real timestamp for storage
        requestHeaders: {}
      }
      return originalXHROpen.call(this, method, url, async ?? true, user, password)
    }

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const interceptor = (this as any)._networkInterceptor
      console.log(`🌐 NetworkInterceptor: XHR send called for ${interceptor?.url || 'unknown'}`)

      if (!interceptor) {
        console.log(`⚠️ NetworkInterceptor: No interceptor data found`)
        return originalXHRSend.call(this, body)
      }

      // Store request body and calculate size
      let requestBody: string | undefined = undefined
      let requestSize = 0

      if (body && moduleInstance.config.captureBody) {
        if (typeof body === 'string') {
          const bodyStr = body.length <= moduleInstance.config.maxBodySize ? body : body.substring(0, moduleInstance.config.maxBodySize)
          requestBody = bodyStr
          requestSize = new Blob([body]).size // Accurate size calculation
        } else if (body instanceof FormData) {
          requestBody = '[FormData]'
          // Approximate FormData size calculation
          let formDataSize = 0
          try {
            body.forEach((value) => {
              if (typeof value === 'string') {
                formDataSize += new Blob([value]).size
              } else if (value instanceof File) {
                formDataSize += value.size
              }
            })
          } catch (e) {
            // Fallback if forEach fails
            formDataSize = 0
          }
          requestSize = formDataSize
        } else if (body instanceof Blob) {
          requestBody = `[Blob: ${body.type || 'unknown'} - ${body.size} bytes]`
          requestSize = body.size
        } else if (body instanceof ArrayBuffer) {
          requestBody = `[ArrayBuffer: ${body.byteLength} bytes]`
          requestSize = body.byteLength
        } else {
          const bodyStr = String(body)
          requestBody = bodyStr.length <= moduleInstance.config.maxBodySize ? bodyStr : bodyStr.substring(0, moduleInstance.config.maxBodySize)
          requestSize = new Blob([bodyStr]).size
        }
      } else if (body) {
        // Calculate size even if not capturing body
        if (typeof body === 'string') {
          requestSize = new Blob([body]).size
        } else if (body instanceof Blob) {
          requestSize = body.size
        } else if (body instanceof ArrayBuffer) {
          requestSize = body.byteLength
        } else if (body instanceof FormData) {
          // Approximate FormData size
          let formDataSize = 0
          try {
            body.forEach((value) => {
              if (typeof value === 'string') {
                formDataSize += new Blob([value]).size
              } else if (value instanceof File) {
                formDataSize += value.size
              }
            })
          } catch (e) {
            formDataSize = 0
          }
          requestSize = formDataSize
        } else {
          requestSize = new Blob([String(body)]).size
        }
      }

      interceptor.requestBody = requestBody
      interceptor.requestSize = requestSize

      // Capture request headers
      const setRequestHeader = this.setRequestHeader
      this.setRequestHeader = function(name: string, value: string) {
        interceptor.requestHeaders[name] = value
        return setRequestHeader.call(this, name, value)
      }

      // Set up response handler
      this.addEventListener('readystatechange', () => {
        if (this.readyState === XMLHttpRequest.DONE) {
          const endTime = performance.now() // High-precision end time

          // Calculate response size and body
          let responseBody: string | undefined = undefined
          let responseSize = 0

          if (moduleInstance.config.captureBody && this.responseText) {
            responseBody = this.responseText.length <= moduleInstance.config.maxBodySize
              ? this.responseText
              : this.responseText.substring(0, moduleInstance.config.maxBodySize)
          }

          // Calculate accurate response size
          if (this.responseText) {
            responseSize = new Blob([this.responseText]).size
          } else if (this.response) {
            if (this.response instanceof ArrayBuffer) {
              responseSize = this.response.byteLength
            } else if (this.response instanceof Blob) {
              responseSize = this.response.size
            } else {
              responseSize = new Blob([String(this.response)]).size
            }
          }

          const networkRequest: NetworkRequest = {
            id: `xhr_${interceptor.realStartTime}_${Math.random().toString(36).substr(2, 9)}`,
            url: interceptor.url,
            method: interceptor.method,
            status: this.status,
            statusText: this.statusText,
            timestamp: interceptor.realStartTime,
            duration: Math.round((endTime - interceptor.startTime) * 100) / 100, // Round to 2 decimal places for ms precision
            requestHeaders: interceptor.requestHeaders,
            responseHeaders: this.getAllResponseHeaders() ? moduleInstance.parseHeaders(this.getAllResponseHeaders()) : {},
            requestBody: interceptor.requestBody,
            responseBody,
            requestSize: interceptor.requestSize || 0,
            responseSize
          }

          console.log('🌐 NetworkInterceptor: Created XHR request:', {
            url: networkRequest.url,
            method: networkRequest.method,
            status: networkRequest.status,
            hasRequestBody: !!networkRequest.requestBody,
            hasResponseBody: !!networkRequest.responseBody,
            requestBodySize: networkRequest.requestBody?.length,
            responseBodySize: networkRequest.responseBody?.length
          })

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
      const startTime = performance.now() // High-precision timing
      const realStartTime = Date.now() // Real timestamp for storage
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method || 'GET'

      console.log(`🌐 NetworkInterceptor: Fetch called for ${method} ${url}`)

      // Calculate request size and body
      let requestBody: string | undefined = undefined
      let requestSize = 0

      if (init?.body && module.config.captureBody) {
        if (typeof init.body === 'string') {
          requestBody = init.body.length <= module.config.maxBodySize ? init.body : init.body.substring(0, module.config.maxBodySize)
          requestSize = new Blob([init.body]).size
        } else if (init.body instanceof FormData) {
          requestBody = '[FormData]'
          let formDataSize = 0
          try {
            init.body.forEach((value) => {
              if (typeof value === 'string') {
                formDataSize += new Blob([value]).size
              } else if (value instanceof File) {
                formDataSize += value.size
              }
            })
          } catch (e) {
            formDataSize = 0
          }
          requestSize = formDataSize
        } else if (init.body instanceof Blob) {
          requestBody = `[Blob: ${init.body.type || 'unknown'} - ${init.body.size} bytes]`
          requestSize = init.body.size
        } else if (init.body instanceof ArrayBuffer) {
          requestBody = `[ArrayBuffer: ${init.body.byteLength} bytes]`
          requestSize = init.body.byteLength
        } else {
          const bodyStr = String(init.body)
          requestBody = bodyStr.length <= module.config.maxBodySize ? bodyStr : bodyStr.substring(0, module.config.maxBodySize)
          requestSize = new Blob([bodyStr]).size
        }
      } else if (init?.body) {
        // Calculate size even if not capturing body
        if (typeof init.body === 'string') {
          requestSize = new Blob([init.body]).size
        } else if (init.body instanceof Blob) {
          requestSize = init.body.size
        } else if (init.body instanceof ArrayBuffer) {
          requestSize = init.body.byteLength
        } else if (init.body instanceof FormData) {
          let formDataSize = 0
          try {
            init.body.forEach((value) => {
              if (typeof value === 'string') {
                formDataSize += new Blob([value]).size
              } else if (value instanceof File) {
                formDataSize += value.size
              }
            })
          } catch (e) {
            formDataSize = 0
          }
          requestSize = formDataSize
        } else {
          requestSize = new Blob([String(init.body)]).size
        }
      }

      try {
        const response = await originalFetch(input, init)
        const endTime = performance.now() // High-precision end time

        // Calculate response size and body
        let responseBody: string | undefined = undefined
        let responseSize = 0

        if (module.config.captureBody) {
          try {
            const responseClone = response.clone()
            const text = await responseClone.text()
            responseBody = text.length <= module.config.maxBodySize ? text : text.substring(0, module.config.maxBodySize)
            responseSize = new Blob([text]).size
            console.log('🌐 NetworkInterceptor: Captured response body:', text.length, 'chars, truncated to:', responseBody.length)
          } catch (error) {
            console.warn('🌐 NetworkInterceptor: Failed to capture response body:', error)
            // If reading response body fails, try to get content-length header
            const contentLength = response.headers.get('content-length')
            if (contentLength) {
              responseSize = parseInt(contentLength, 10) || 0
            }
          }
        } else {
          // Get size from content-length header if available
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            responseSize = parseInt(contentLength, 10) || 0
          }
        }

        const networkRequest: NetworkRequest = {
          id: `fetch_${realStartTime}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          timestamp: realStartTime,
          duration: Math.round((endTime - startTime) * 100) / 100, // Round to 2 decimal places
          requestHeaders: init?.headers ? module.headersToObject(init.headers) : {},
          responseHeaders: module.headersToObject(response.headers),
          requestBody,
          responseBody,
          requestSize,
          responseSize
        }

        console.log('🌐 NetworkInterceptor: Created fetch request:', {
          url: networkRequest.url,
          method: networkRequest.method,
          status: networkRequest.status,
          hasRequestBody: !!networkRequest.requestBody,
          hasResponseBody: !!networkRequest.responseBody,
          requestBodySize: networkRequest.requestBody?.length,
          responseBodySize: networkRequest.responseBody?.length
        })

        // Notify listeners
        if (!module.shouldFilter(networkRequest)) {
          module.notifyListeners(networkRequest)
        }

        return response
      } catch (error) {
        const endTime = performance.now()

        const networkRequest: NetworkRequest = {
          id: `fetch_error_${realStartTime}_${Math.random().toString(36).substr(2, 9)}`,
          url,
          method,
          status: 0,
          statusText: 'Network Error',
          timestamp: realStartTime,
          duration: Math.round((endTime - startTime) * 100) / 100,
          requestHeaders: init?.headers ? module.headersToObject(init.headers) : {},
          responseHeaders: {},
          requestBody,
          responseBody: error instanceof Error ? error.message : 'Unknown error',
          requestSize,
          responseSize: 0
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
    console.log(`🔍 NetworkInterceptor: shouldFilter check for ${request.method} ${request.url}`)

    // URL filters
    if (this.config.urlFilters && this.config.urlFilters.length > 0) {
      console.log(`🔍 NetworkInterceptor: Checking ${this.config.urlFilters.length} URL filters`)
      const matchesFilter = this.config.urlFilters.some(filter => {
        const matches = filter.test(request.url)
        console.log(`🔍 NetworkInterceptor: Filter ${filter} - matches: ${matches}`)
        return matches
      })
      if (!matchesFilter) {
        console.log(`❌ NetworkInterceptor: URL filtered out - no filter match`)
        return true
      }
      console.log(`✅ NetworkInterceptor: URL passes filter`)
    }

    // Method filters
    if (this.config.methodFilters && this.config.methodFilters.length > 0) {
      console.log(`🔍 NetworkInterceptor: Checking method filters: ${this.config.methodFilters}`)
      if (!this.config.methodFilters.includes(request.method)) {
        console.log(`❌ NetworkInterceptor: Method ${request.method} filtered out`)
        return true
      }
      console.log(`✅ NetworkInterceptor: Method ${request.method} passes filter`)
    }

    console.log(`✅ NetworkInterceptor: Request passes all filters, will notify listeners`)
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
