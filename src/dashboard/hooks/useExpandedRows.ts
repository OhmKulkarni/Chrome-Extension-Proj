import { useState, useCallback, useRef, useEffect } from 'react';

interface ExpandedRowsHookReturn {
  expandedRows: Set<string>;
  toggleRow: (domain: string) => void;
  isExpanded: (domain: string) => boolean;
  collapseAll: () => void;
  expandedCount: number;
}

/**
 * Custom hook for managing expandable row state with performance safeguards
 * SAFETY: Prevents memory leaks with proper cleanup and limits expansion
 */
export const _useExpandedRows = (maxExpanded: number = 3): ExpandedRowsHookReturn => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const lastActionRef = useRef<number>(Date.now());

  // PERFORMANCE: Cleanup stale expanded rows on component unmount
  useEffect(() => {
    return () => {
      setExpandedRows(new Set());
    };
  }, []);

  // PERFORMANCE: Debounced toggle to prevent rapid clicking issues
  const _toggleRow = useCallback((domain: string) => {
    const _now = Date.now();
    // Prevent rapid toggling (< 200ms between actions)
    if (now - lastActionRef.current < 200) {
      return;
    }
    lastActionRef.current = now;

    setExpandedRows(prev => {
      const _newSet = new Set(prev);

      if (newSet.has(domain)) {
        // Collapse row
        newSet.delete(domain);
      } else {
        // SAFETY: Limit maximum expanded rows to prevent memory issues
        if (newSet.size >= maxExpanded) {
          // Auto-collapse the oldest expanded row
          const _firstDomain = Array.from(newSet)[0];
          newSet.delete(firstDomain);
          // console.log(`🎯 Auto-collapsed ${firstDomain} due to ${maxExpanded} row limit`);
        }
        // Expand new row
        newSet.add(domain);
      }

      return newSet;
    });
  }, [maxExpanded]);

  const _isExpanded = useCallback((domain: string) => {
    return expandedRows.has(domain);
  }, [expandedRows]);

  const _collapseAll = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  return {
    expandedRows,
    toggleRow,
    isExpanded,
    collapseAll,
    expandedCount: expandedRows.size
  };
};

export default useExpandedRows;
