// Pagination utilities
export const calculatePagination = (
  currentPage: number,
  itemsPerPage: number,
  totalItems: number
) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  
  return {
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  }
}

// Generate Google-style page numbers for pagination
export const getPageNumbers = (currentPage: number, totalPages: number, maxVisible: number = 7) => {
  const pageNumbers: (number | string)[] = []
  
  if (totalPages <= maxVisible) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Google-style pagination logic
    if (currentPage <= 4) {
      // Show 1-5 ... totalPages
      for (let i = 1; i <= 5; i++) {
        pageNumbers.push(i)
      }
      if (totalPages > 5) {
        pageNumbers.push('...')
        pageNumbers.push(totalPages)
      }
    } else if (currentPage >= totalPages - 3) {
      // Show 1 ... (totalPages-4)-totalPages
      pageNumbers.push(1)
      pageNumbers.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Show 1 ... (currentPage-1) currentPage (currentPage+1) ... totalPages
      pageNumbers.push(1)
      pageNumbers.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i)
      }
      pageNumbers.push('...')
      pageNumbers.push(totalPages)
    }
  }
  
  return pageNumbers
}

// Sorting utilities
export const sortData = <T>(data: T[], sortConfig: { key: string; direction: 'asc' | 'desc' }): T[] => {
  return [...data].sort((a, b) => {
    const aValue = (a as any)[sortConfig.key]
    const bValue = (b as any)[sortConfig.key]
    
    if (sortConfig.key === 'timestamp') {
      const aTime = new Date(aValue).getTime()
      const bTime = new Date(bValue).getTime()
      return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    // String comparison
    const aStr = String(aValue || '').toLowerCase()
    const bStr = String(bValue || '').toLowerCase()
    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })
}

// Filtering utilities
export const filterData = <T>(
  data: T[],
  searchTerm: string,
  searchFields: string[],
  additionalFilters?: Record<string, any>
): T[] => {
  let filtered = [...data]
  
  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filtered = filtered.filter(item =>
      searchFields.some(field => {
        const value = (item as any)[field]
        return String(value || '').toLowerCase().includes(term)
      })
    )
  }
  
  // Apply additional filters
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item =>
          String((item as any)[key] || '').toLowerCase() === value.toLowerCase()
        )
      }
    })
  }
  
  return filtered
}

// Memory monitoring utilities
export const checkMemoryPressure = (): { pressure: number; shouldThrottle: boolean } => {
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
