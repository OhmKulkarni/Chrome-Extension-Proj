import React, { useState, useEffect } from 'react';
import { ExportOptions } from '../utils/export-utils';

interface TableStats {
  total: number;
  filtered: number;
  currentPage: number;
  totalPages: number;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  availableTables: ('network' | 'errors' | 'tokens')[];
  tableStats: {
    network: TableStats;
    errors: TableStats;
    tokens: TableStats;
  };
  activeFilters: {
    network: { search: string; method: string };
    errors: { search: string; severity: string };
    tokens: { search: string; type: string };
  };
}

const tableDisplayNames = {
  network: 'Network Requests',
  errors: 'Console Errors',
  tokens: 'Token Events'
};

const tableIcons = {
  network: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
    </svg>
  ),
  errors: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  tokens: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  availableTables,
  tableStats,
  activeFilters
}) => {
  const [selectedTables, setSelectedTables] = useState<('network' | 'errors' | 'tokens')[]>([]);
  const [pageSelection, setPageSelection] = useState<'current' | 'all' | 'range'>('current');
  const [includeDetails, setIncludeDetails] = useState<{ [key: string]: boolean }>({});
  const [pageRanges, setPageRanges] = useState<{ [key: string]: { from: string; to: string } }>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTables([]);
      setPageSelection('current');
      setIncludeDetails({});
      setPageRanges({});
      setIsExporting(false);
      setExportError(null);
    }
  }, [isOpen]);

  const handleTableToggle = (table: 'network' | 'errors' | 'tokens') => {
    setSelectedTables(prev =>
      prev.includes(table)
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );

    // Initialize or clear detail preference for this table
    setIncludeDetails(prev => ({
      ...prev,
      [table]: false
    }));

    // Initialize page ranges for this table
    setPageRanges(prev => ({
      ...prev,
      [table]: { from: '1', to: tableStats[table]?.totalPages?.toString() || '1' }
    }));
  };

  const handleDetailToggle = (table: string) => {
    setIncludeDetails(prev => ({
      ...prev,
      [table]: !prev[table]
    }));
  };

  const handlePageRangeChange = (table: string, field: 'from' | 'to', value: string) => {
    setPageRanges(prev => ({
      ...prev,
      [table]: {
        ...prev[table],
        [field]: value
      }
    }));
  };





  const hasActiveFilters = (table: 'network' | 'errors' | 'tokens'): boolean => {
    const filters = activeFilters[table];
    switch (table) {
      case 'network':
        const networkFilters = filters as { search: string; method: string };
        return !!(networkFilters.search?.trim() || (networkFilters.method && networkFilters.method !== 'all'));
      case 'errors':
        const errorFilters = filters as { search: string; severity: string };
        return !!(errorFilters.search?.trim() || (errorFilters.severity && errorFilters.severity !== 'all'));
      case 'tokens':
        const tokenFilters = filters as { search: string; type: string };
        return !!(tokenFilters.search?.trim() || (tokenFilters.type && tokenFilters.type !== 'all'));
      default:
        return false;
    }
  };

  const validateExport = (): string | null => {
    if (selectedTables.length === 0) {
      return 'Please select at least one table to export.';
    }

    if (pageSelection === 'range') {
      for (const table of selectedTables) {
        const range = pageRanges[table];
        if (!range || !range.from || !range.to) {
          return `Please specify page range for ${tableDisplayNames[table]}.`;
        }

        const fromNum = parseInt(range.from);
        const toNum = parseInt(range.to);
        const maxPage = tableStats[table].totalPages;

        if (isNaN(fromNum) || isNaN(toNum) || fromNum < 1 || toNum < 1) {
          return `Page numbers for ${tableDisplayNames[table]} must be positive integers.`;
        }

        if (fromNum > toNum) {
          return `"From" page must be less than or equal to "To" page for ${tableDisplayNames[table]}.`;
        }

        if (fromNum > maxPage || toNum > maxPage) {
          return `Page numbers for ${tableDisplayNames[table]} must be between 1 and ${maxPage}.`;
        }
      }
    }

    return null;
  };

  const handleExport = async () => {
    const validationError = validateExport();
    if (validationError) {
      setExportError(validationError);
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const exportOptions: ExportOptions = {
        tables: selectedTables,
        format: 'csv',
        includeDetails,
        pageSelection,
        pageRanges: pageSelection === 'range'
          ? Object.fromEntries(
              selectedTables.map(table => {
                const range = pageRanges[table];
                return [table, range ? { from: parseInt(range.from), to: parseInt(range.to) } : { from: 1, to: 1 }];
              })
            )
          : undefined
      };

      await onExport(exportOptions);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Data to CSV</h2>
              <p className="text-sm text-gray-600">Select tables and pages to export in CSV format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {exportError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{exportError}</p>
              </div>
            </div>
          )}

          {/* Table Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Tables to Export</h3>
            <div className="space-y-3">
              {availableTables.map(table => (
                <div key={table} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={`table-${table}`}
                      checked={selectedTables.includes(table)}
                      onChange={() => handleTableToggle(table)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor={`table-${table}`} className="flex items-center space-x-2 cursor-pointer">
                        {tableIcons[table]}
                        <span className="font-medium text-gray-900">{tableDisplayNames[table]}</span>
                      </label>

                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>
                            <strong>{tableStats[table].filtered.toLocaleString()}</strong> records
                            {tableStats[table].filtered !== tableStats[table].total && (
                              <span className="text-gray-500"> (filtered from {tableStats[table].total.toLocaleString()})</span>
                            )}
                          </span>
                          {hasActiveFilters(table) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              Filters Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          Current page: {tableStats[table].currentPage} of {tableStats[table].totalPages}
                        </div>
                      </div>

                      {/* Include Details Toggle and Page Selection */}
                      {selectedTables.includes(table) && (
                        <div className="mt-4 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                          {/* Include Details Toggle */}
                          <div>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={includeDetails[table] || false}
                                onChange={() => handleDetailToggle(table)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">Include detailed view information</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              {table === 'network' && 'Includes request/response headers, body content, and performance metrics'}
                              {table === 'errors' && 'Includes full stack traces'}
                              {table === 'tokens' && 'Includes additional token metadata'}
                            </p>
                          </div>

                          {/* Page Selection for this table */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Page Selection</h4>
                            <div className="space-y-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`pageSelection-${table}`}
                                  value="current"
                                  checked={pageSelection === 'current'}
                                  onChange={(e) => setPageSelection(e.target.value as 'current')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm">Current page only</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`pageSelection-${table}`}
                                  value="all"
                                  checked={pageSelection === 'all'}
                                  onChange={(e) => setPageSelection(e.target.value as 'all')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm">All pages</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`pageSelection-${table}`}
                                  value="range"
                                  checked={pageSelection === 'range'}
                                  onChange={(e) => setPageSelection(e.target.value as 'range')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm">Page range</span>
                              </label>

                              {/* Page Range Inputs for this specific table */}
                              {pageSelection === 'range' && (
                                <div className="ml-6 mt-3">
                                  <div className="bg-white p-3 rounded-md border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      📊 {tableDisplayNames[table]} (Max: {tableStats[table].totalPages} pages)
                                    </label>
                                    <div className="flex items-center space-x-3">
                                      <div className="flex-1">
                                        <label className="block text-xs text-gray-500 mb-1">From page</label>
                                        <input
                                          type="number"
                                          min="1"
                                          max={tableStats[table].totalPages}
                                          placeholder="1"
                                          value={pageRanges[table]?.from || ''}
                                          onChange={(e) => handlePageRangeChange(table, 'from', e.target.value)}
                                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                      </div>
                                      <div className="flex-shrink-0 text-gray-400 pt-6">to</div>
                                      <div className="flex-1">
                                        <label className="block text-xs text-gray-500 mb-1">To page</label>
                                        <input
                                          type="number"
                                          min="1"
                                          max={tableStats[table].totalPages}
                                          placeholder={tableStats[table].totalPages.toString()}
                                          value={pageRanges[table]?.to || ''}
                                          onChange={(e) => handlePageRangeChange(table, 'to', e.target.value)}
                                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                      💡 Export pages {pageRanges[table]?.from || '1'} to {pageRanges[table]?.to || '1'}
                                      {pageRanges[table]?.from && pageRanges[table]?.to &&
                                        ` (${Math.max(0, parseInt(pageRanges[table].to) - parseInt(pageRanges[table].from) + 1)} pages)`
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedTables.length === 0 || isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
