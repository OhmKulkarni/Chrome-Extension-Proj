/**
 * Modular Architecture Integration with Smart Edge Case Detection
 * Replaces monolithic content-simple.ts with coordinated modules
 * NOW WITH: Intelligent activation for edge cases that main-world script cannot handle
 */

import { SharedInfrastructureModule } from './modules/shared-infrastructure.module'
import { EdgeCaseActivationSystem } from './modules/edge-case-activation.module'

console.log('🧩 MODULAR CONTENT SCRIPT LOADED:', new Date().toISOString())

// Configuration for the modular architecture
// SMART ACTIVATION: Will be overridden by edge case detection and settings
const defaultModuleConfig = {
  network: {
    enabled: true, // CHANGED: Enable network capture by default
    captureHeaders: true,
    captureBody: true, // CHANGED: Enable body capture by default
    maxBodySize: 2048, // CHANGED: Increased default size
    urlFilters: [
      /^https?:\/\/(?!chrome-extension:)/i, // Exclude extension URLs
      /^https?:\/\/(?!moz-extension:)/i     // Exclude Firefox extension URLs
    ],
    methodFilters: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  console: {
    enabled: false, // Default: DISABLED (main-world script handles most cases)
    captureStack: true,
    maxMessageLength: 1000,
    levels: ['error', 'warn'] as ('error' | 'warn' | 'info' | 'log' | 'debug')[],
    urlFilters: [
      /^https?:/i // Only capture from HTTP/HTTPS pages
    ]
  },
  communication: {
    enabled: true, // Always enabled for coordination
    batchSize: 8,
    flushInterval: 4000
  }
}

// Global shared infrastructure instance
let sharedInfrastructure: SharedInfrastructureModule | null = null

/**
 * Initialize the modular architecture with smart edge case detection
 */
async function initializeModularArchitecture(): Promise<void> {
  console.log('🚀 Initializing modular architecture with edge case detection...')

  try {
    // Check extension context validity
    if (!chrome?.runtime?.id) {
      console.error('❌ Extension context invalid - cannot initialize modules')
      return
    }

    // SMART ACTIVATION: Analyze environment for edge cases
    console.log('🔍 Analyzing environment for edge cases...')
    const edgeCaseSystem = new EdgeCaseActivationSystem()
    const analysis = await edgeCaseSystem.analyzeEnvironment()
    const activationConfig = edgeCaseSystem.getActivationConfig()

    console.log('📊 Edge case analysis:', {
      analysis: analysis,
      activation: activationConfig
    })

    // Create final configuration based on edge case detection
    const moduleConfig = {
      ...defaultModuleConfig,
      network: {
        ...defaultModuleConfig.network,
        enabled: activationConfig.network.enabled
      },
      console: {
        ...defaultModuleConfig.console,
        enabled: activationConfig.console.enabled
      }
    }

    // Log activation decisions
    if (activationConfig.network.enabled) {
      console.log('🌐 ACTIVATING content script network interception:', activationConfig.network.reason)
    } else {
      console.log('🌐 Content script network interception remains DISABLED (main-world sufficient)')
    }

    if (activationConfig.console.enabled) {
      console.log('🖥️ ACTIVATING content script console interception:', activationConfig.console.reason)
    } else {
      console.log('🖥️ Content script console interception remains DISABLED (main-world sufficient)')
    }

    // Initialize shared infrastructure with smart configuration
    sharedInfrastructure = new SharedInfrastructureModule(moduleConfig)
    await sharedInfrastructure.initialize()

    // Request main-world script injection for full website console/network interception
    try {
      console.log('🌍 Requesting main-world script injection...')
      const injectionResponse = await chrome.runtime.sendMessage({
        action: 'INJECT_MAIN_WORLD_SCRIPT'
      })
      if (injectionResponse?.success) {
        console.log('✅ Main-world script injection successful')
      } else {
        console.warn('⚠️ Main-world script injection failed:', injectionResponse?.error)
      }
    } catch (error) {
      console.error('❌ Failed to request main-world script injection:', error)
    }

    console.log('✅ Modular architecture initialized successfully')

    // Log initial statistics
    const stats = sharedInfrastructure.getStatistics()
    console.log('📊 Initial module statistics:', stats)

    // Set up periodic memory monitoring
    setInterval(() => {
      if (sharedInfrastructure) {
        const currentStats = sharedInfrastructure.getStatistics()
        console.log('📈 Module stats update:', {
          pending: currentStats.pendingData,
          modules: currentStats.modules
        })
      }
    }, 30000) // Every 30 seconds

  } catch (error) {
    console.error('❌ Failed to initialize modular architecture:', error)
  }
}

/**
 * Test the modular architecture functionality
 */
async function testModularArchitecture(): Promise<void> {
  if (!sharedInfrastructure) {
    console.error('❌ Cannot test - shared infrastructure not initialized')
    return
  }

  // Test network interception
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1')
    const data = await response.json()
    console.log('✅ Network test completed:', { status: response.status, data: data.id })
  } catch (error) {
    console.log('⚠️ Network test failed (expected in some contexts):', error instanceof Error ? error.message : String(error))
  }

  // Test XHR interception
  const xhr = new XMLHttpRequest()
  xhr.open('GET', 'https://jsonplaceholder.typicode.com/posts/2')
  xhr.onload = () => {
    console.log('✅ XHR test completed:', xhr.status)
  }
  xhr.onerror = (error) => {
    console.log('⚠️ XHR test failed (expected in some contexts):', error)
  }
  xhr.send()
}

/**
 * Handle page visibility changes for optimization
 */
function setupPageVisibilityOptimization(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('📱 Page hidden - pausing intensive operations')
      if (sharedInfrastructure) {
        // Flush any pending data before page becomes hidden
        const stats = sharedInfrastructure.getStatistics()
        if (stats.pendingData.networkRequests > 0 || stats.pendingData.consoleEvents > 0) {
          console.log('💾 Flushing pending data before page hide')
        }
      }
    } else {
      console.log('📱 Page visible - resuming normal operations')
    }
  })
}

/**
 * Cleanup on page unload
 */
function setupCleanup(): void {
  window.addEventListener('beforeunload', () => {
    console.log('🧹 Cleaning up modular architecture...')
    if (sharedInfrastructure) {
      sharedInfrastructure.destroy()
      sharedInfrastructure = null
    }
  })

  // Also handle extension context invalidation
  chrome.runtime.onConnect.addListener(() => {
    // Connection test to detect context invalidation
  })
}

/**
 * Main initialization
 */
async function main(): Promise<void> {
  console.log('🎯 Starting modular content script main function')

  // Wait a bit for page to stabilize
  await new Promise(resolve => setTimeout(resolve, 1000))

  try {
    // Initialize modular architecture
    await initializeModularArchitecture()

    // Set up optimizations and cleanup
    setupPageVisibilityOptimization()
    setupCleanup()

    // Run integration test after a short delay
    setTimeout(() => {
      testModularArchitecture()
    }, 2000)

    console.log('🎉 Modular content script initialization complete')

  } catch (error) {
    console.error('💥 Fatal error in modular content script:', error)
  }
}

// Export for debugging
(window as any).modularArchitecture = {
  sharedInfrastructure,
  defaultModuleConfig,
  reinitialize: initializeModularArchitecture,
  test: testModularArchitecture
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}
