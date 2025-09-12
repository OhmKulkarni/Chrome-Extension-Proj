import React from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onPrevious: () => void
  onNext: () => void
  loading?: boolean
}

// Generate Google-style page numbers for pagination
const getPageNumbers = (currentPage: number, totalPages: number, maxVisible: number = 7) => {
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

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPrevious,
  onNext,
  loading = false
}) => {
  if (totalPages <= 1) return null

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage + 1

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="flex items-center">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{indexOfFirstItem}</span> to{' '}
          <span className="font-medium">{Math.min(indexOfLastItem, totalItems)}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={currentPage === 1 || loading}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            currentPage === 1 || loading
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>
        
        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {getPageNumbers(currentPage, totalPages).map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === 'number' ? onPageChange(pageNum) : undefined}
              disabled={pageNum === '...' || loading}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                pageNum === currentPage
                  ? 'bg-blue-500 text-white'
                  : pageNum === '...'
                  ? 'text-gray-500 cursor-default'
                  : loading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
        
        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentPage === totalPages || loading}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            currentPage === totalPages || loading
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  )
}
