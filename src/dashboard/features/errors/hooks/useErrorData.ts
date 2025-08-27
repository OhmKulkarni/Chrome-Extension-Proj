import { useState, useEffect, useCallback } from 'react'

// Type definitions
interface ConsoleError {
  id: string;
  message: string;
  url?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warn' | 'info';
  timestamp: string;
  stack_trace?: string;
  stack?: string;
  tab_id?: number;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

// Chrome message utility
const sendChromeMessage = async (message: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage(message)
    const result = response ? { ...response } : null
    return result
  } catch (error) {
    console.error('Chrome message failed:', error)
    return null
  }
}

// Memory monitoring utility
const checkMemoryPressure = (): { pressure: number; shouldThrottle: boolean } => {
  const performanceMemory = (performance as any).memory
  if (!performanceMemory?.usedJSHeapSize) {
    return { pressure: 0, shouldThrottle: false }
  }

  const heapUsed = performanceMemory.usedJSHeapSize
  const heapLimit = performanceMemory.jsHeapSizeLimit
  const pressure = (heapUsed / heapLimit) * 100

  return {
    pressure,
    shouldThrottle: pressure > 70
  }
}

interface UseErrorDataReturn {
  errors: ConsoleError[]
  totalErrors: number
  loading: boolean
  error: string | null
  pagination: PaginationConfig
  sortConfig: SortConfig
  filters: {
    searchTerm: string
    severity: string
  }
  actions: {
    loadPage: (page: number) => Promise<void>
    setSort: (key: string) => void
    setFilters: (filters: { searchTerm?: string; severity?: string }) => void
    refresh: () => Promise<void>
  }
}

export const useErrorData = (
  initialPage: number = 1,
  itemsPerPage: number = 10
): UseErrorDataReturn => {
  const [errors, setErrors] = useState<ConsoleError[]>([])
  const [totalErrors, setTotalErrors] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'timestamp',
    direction: 'desc'
  })
  const [filters, setFiltersState] = useState({
    searchTerm: '',
    severity: 'all'
  })

  // Load console errors with pagination
  const loadConsoleErrors = useCallback(async (page: number, limit: number = itemsPerPage) => {
    try {
      console.log(`🔄 Loading console errors page ${page} with limit ${limit}`)
      setLoading(true)
      setError(null)

      // Check memory pressure before loading
      const { shouldThrottle } = checkMemoryPressure()
      if (shouldThrottle) {
        console.warn('🚨 High memory pressure, reducing error load')
        limit = Math.min(limit, 5) // Reduce load under pressure
      }

      const offset = (page - 1) * limit
      const response = await sendChromeMessage({
        action: 'getConsoleErrors',
        limit,
        offset
      })

      if (response?.success && response?.errors) {
        // Clear previous data to prevent accumulation
        setErrors(response.errors)
        setTotalErrors(response.total || 0)
        console.log(`✅ Loaded ${response.errors.length} console errors, total: ${response.total}`)
      } else {
        setError('Failed to load console errors')
        console.warn('⚠️ Console errors response missing success/errors:', response)
      }
    } catch (err) {
      setError('Error loading console errors')
      console.error('❌ Error loading console errors:', err)
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage])

  // Load page
  const loadPage = useCallback(async (page: number) => {
    setCurrentPage(page)
    await loadConsoleErrors(page, itemsPerPage)
  }, [loadConsoleErrors, itemsPerPage])

  // Set sorting
  const setSort = useCallback((key: string) => {
    setSortConfig((prev: SortConfig) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1) // Reset to first page when sorting
  }, [])

  // Set filters
  const setFilters = useCallback((newFilters: { searchTerm?: string; severity?: string }) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  // Refresh data
  const refresh = useCallback(async () => {
    await loadConsoleErrors(currentPage, itemsPerPage)
  }, [loadConsoleErrors, currentPage, itemsPerPage])

  // Initial load
  useEffect(() => {
    loadConsoleErrors(currentPage, itemsPerPage)
  }, [loadConsoleErrors, currentPage, itemsPerPage])

  // Calculate pagination
  const totalPages = Math.ceil(totalErrors / itemsPerPage)
  const pagination: PaginationConfig = {
    currentPage,
    itemsPerPage,
    totalItems: totalErrors,
    totalPages
  }

  return {
    errors,
    totalErrors,
    loading,
    error,
    pagination,
    sortConfig,
    filters,
    actions: {
      loadPage,
      setSort,
      setFilters,
      refresh
    }
  }
}
