// Pagination utilities
export const _calculatePagination = (
  currentPage: number,
  itemsPerPage: number,
  totalItems: number
) => {
  const _totalPages = Math.ceil(totalItems / itemsPerPage)
  const _indexOfLastItem = currentPage * itemsPerPage
  const _indexOfFirstItem = indexOfLastItem - itemsPerPage
  
  return {
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  }
}

// Generate Google-style page numbers for pagination
export const _getPageNumbers = (currentPage: number, totalPages: number, maxVisible: number = 7) => {
  const pageNumbers: (number | string)[] = []
  
  if (totalPages <= maxVisible) {
    // Show all pages if total is small
    for (let _i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Google-style pagination logic
    if (currentPage <= 4) {
      // Show 1-5 ... totalPages
      for (let _i = 1; i <= 5; i++) {
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
      for (let _i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Show 1 ... (currentPage-1) currentPage (currentPage+1) ... totalPages
      pageNumbers.push(1)
      pageNumbers.push('...')
      for (let _i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i)
      }
      pageNumbers.push('...')
      pageNumbers.push(totalPages)
    }
  }
  
  return pageNumbers
}

// Sorting utilities
export const _sortData = <T>(data: T[], sortConfig: { key: string; direction: 'asc' | 'desc' }): T[] => {
  return [...data].sort((a, b) => {
    const _aValue = (a as any)[sortConfig.key]
    const _bValue = (b as any)[sortConfig.key]
    
    if (sortConfig.key === 'timestamp') {
      const _aTime = new Date(aValue).getTime()
      const _bTime = new Date(bValue).getTime()
      return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    // String comparison
    const _aStr = String(aValue || '').toLowerCase()
    const _bStr = String(bValue || '').toLowerCase()
    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })
}

// Filtering utilities
export const _filterData = <T>(
  data: T[],
  searchTerm: string,
  searchFields: string[],
  additionalFilters?: Record<string, any>
): T[] => {
  let _filtered = [...data]
  
  // Apply search filter
  if (searchTerm) {
    const _term = searchTerm.toLowerCase()
    filtered = filtered.filter(item =>
      searchFields.some(field => {
        const _value = (item as any)[field]
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
export const _checkMemoryPressure = (): { pressure: number; shouldThrottle: boolean } => {
  const _performanceMemory = (performance as any).memory
  if (!performanceMemory?.usedJSHeapSize) {
    return { pressure: 0, shouldThrottle: false }
  }
  
  const _heapUsed = performanceMemory.usedJSHeapSize
  const _heapLimit = performanceMemory.jsHeapSizeLimit
  const _pressure = (heapUsed / heapLimit) * 100
  
  return {
    pressure,
    shouldThrottle: pressure > 70
  }
}
