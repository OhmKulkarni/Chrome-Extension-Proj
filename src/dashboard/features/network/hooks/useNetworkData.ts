import { useState, useEffect, useCallback } from 'react'

// Type definitions
interface NetworkRequest {
  id?: string;
  method: string;
  url: string;
  status: number;
  timestamp: string;
  payload_size?: number;
  response_time?: number;
  time_taken?: number;
  headers?: string | object;
  request_headers?: string | object;
  response_headers?: string | object;
  request_body?: string | object;
  response_body?: string | object;
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

interface UseNetworkDataReturn {
  requests: NetworkRequest[]
  totalRequests: number
  loading: boolean
  error: string | null
  pagination: PaginationConfig
  sortConfig: SortConfig
  filters: {
    searchTerm: string
    method: string
  }
  actions: {
    loadPage: (page: number) => Promise<void>
    setSort: (key: string) => void
    setFilters: (filters: { searchTerm?: string; method?: string }) => void
    refresh: () => Promise<void>
  }
}

export const useNetworkData = (
  initialPage: number = 1,
  itemsPerPage: number = 10
): UseNetworkDataReturn => {
  const [requests, setRequests] = useState<NetworkRequest[]>([])
  const [totalRequests, setTotalRequests] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'timestamp', 
    direction: 'desc' 
  })
  const [filters, setFiltersState] = useState({
    searchTerm: '',
    method: 'all'
  })

  // Load network requests with pagination
  const loadNetworkRequests = useCallback(async (page: number, limit: number = itemsPerPage) => {
    try {
      // console.log(`🔄 Loading network requests page ${page} with limit ${limit}`)
      setLoading(true)
      setError(null)
      
      // Check memory pressure before loading
      const { shouldThrottle } = checkMemoryPressure()
      if (shouldThrottle) {
        console.warn('🚨 High memory pressure, reducing request load')
        limit = Math.min(limit, 5) // Reduce load under pressure
      }
      
      const offset = (page - 1) * limit
      const response = await sendChromeMessage({ 
        action: 'getNetworkRequests', 
        limit, 
        offset 
      })
      
      if (response?.success && response?.requests) {
        // Clear previous data to prevent accumulation
        setRequests(response.requests)
        setTotalRequests(response.total || 0)
        // console.log(`✅ Loaded ${response.requests.length} network requests, total: ${response.total}`)
      } else {
        setError('Failed to load network requests')
        console.warn('⚠️ Network requests response missing success/requests:', response)
      }
    } catch (err) {
      setError('Error loading network requests')
      console.error('❌ Error loading network requests:', err)
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage])

  // Load page
  const loadPage = useCallback(async (page: number) => {
    setCurrentPage(page)
    await loadNetworkRequests(page, itemsPerPage)
  }, [loadNetworkRequests, itemsPerPage])

  // Set sorting
  const setSort = useCallback((key: string) => {
    setSortConfig((prev: SortConfig) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1) // Reset to first page when sorting
  }, [])

  // Set filters
  const setFilters = useCallback((newFilters: { searchTerm?: string; method?: string }) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  // Refresh data
  const refresh = useCallback(async () => {
    await loadNetworkRequests(currentPage, itemsPerPage)
  }, [loadNetworkRequests, currentPage, itemsPerPage])

  // Initial load
  useEffect(() => {
    loadNetworkRequests(currentPage, itemsPerPage)
  }, [loadNetworkRequests, currentPage, itemsPerPage])

  // Calculate pagination
  const totalPages = Math.ceil(totalRequests / itemsPerPage)
  const pagination: PaginationConfig = {
    currentPage,
    itemsPerPage,
    totalItems: totalRequests,
    totalPages
  }

  return {
    requests,
    totalRequests,
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
