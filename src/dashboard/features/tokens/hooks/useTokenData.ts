import { useState, useEffect, useCallback } from 'react'

// Type definitions
interface TokenEvent {
  id?: string;
  type: string;
  token_type?: string;
  url: string;
  method?: string;
  status?: number;
  valueHash?: string;
  expiry?: number;
  timestamp: string;
  headers?: string | object;
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

interface UseTokenDataReturn {
  tokens: TokenEvent[]
  totalTokens: number
  loading: boolean
  error: string | null
  pagination: PaginationConfig
  sortConfig: SortConfig
  filters: {
    searchTerm: string
    tokenType: string
  }
  actions: {
    loadPage: (page: number) => Promise<void>
    setSort: (key: string) => void
    setFilters: (filters: { searchTerm?: string; tokenType?: string }) => void
    refresh: () => Promise<void>
  }
}

export const useTokenData = (
  initialPage: number = 1,
  itemsPerPage: number = 10
): UseTokenDataReturn => {
  const [tokens, setTokens] = useState<TokenEvent[]>([])
  const [totalTokens, setTotalTokens] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'timestamp', 
    direction: 'desc' 
  })
  const [filters, setFiltersState] = useState({
    searchTerm: '',
    tokenType: 'all'
  })

  // Load token events with pagination
  const loadTokenEvents = useCallback(async (page: number, limit: number = itemsPerPage) => {
    try {
      // console.log(`🔄 Loading token events page ${page} with limit ${limit}`)
      setLoading(true)
      setError(null)
      
      const offset = (page - 1) * limit
      const response = await sendChromeMessage({ 
        action: 'getTokenEvents', 
        limit, 
        offset 
      })
      
      if (response?.success && response?.events) {
        setTokens(response.events)
        setTotalTokens(response.total || 0)
        // console.log(`✅ Loaded ${response.events.length} token events, total: ${response.total}`)
      } else {
        setError('Failed to load token events')
        console.warn('⚠️ Token events response missing success/events:', response)
      }
    } catch (err) {
      setError('Error loading token events')
      console.error('❌ Error loading token events:', err)
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage])

  // Load page
  const loadPage = useCallback(async (page: number) => {
    setCurrentPage(page)
    await loadTokenEvents(page, itemsPerPage)
  }, [loadTokenEvents, itemsPerPage])

  // Set sorting
  const setSort = useCallback((key: string) => {
    setSortConfig((prev: SortConfig) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setCurrentPage(1)
  }, [])

  // Set filters
  const setFilters = useCallback((newFilters: { searchTerm?: string; tokenType?: string }) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }, [])

  // Refresh data
  const refresh = useCallback(async () => {
    await loadTokenEvents(currentPage, itemsPerPage)
  }, [loadTokenEvents, currentPage, itemsPerPage])

  // Initial load
  useEffect(() => {
    loadTokenEvents(currentPage, itemsPerPage)
  }, [loadTokenEvents, currentPage, itemsPerPage])

  // Calculate pagination
  const totalPages = Math.ceil(totalTokens / itemsPerPage)
  const pagination: PaginationConfig = {
    currentPage,
    itemsPerPage,
    totalItems: totalTokens,
    totalPages
  }

  return {
    tokens,
    totalTokens,
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
