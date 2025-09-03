import React from 'react';
import { Activity, EyeOff } from 'lucide-react';
import { Button } from './ui/button';

interface DomainChartsHeaderProps {
  expandedCount: number;
  maxExpanded: number;
  onCollapseAll: () => void;
  className?: string;
}

const DomainChartsHeader: React.FC<DomainChartsHeaderProps> = ({
  expandedCount,
  maxExpanded,
  onCollapseAll,
  className = ''
}) => {
  if (expandedCount === 0) return null;

  return (
    <div className={`flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-blue-800">
        <Activity className="h-4 w-4" />
        <span className="font-medium">
          {expandedCount} domain chart{expandedCount === 1 ? '' : 's'} expanded
        </span>
        {expandedCount >= maxExpanded && (
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
            Max limit reached
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCollapseAll}
        className="text-blue-600 hover:bg-blue-100"
      >
        <EyeOff className="h-4 w-4 mr-1" />
        Collapse All
      </Button>
    </div>
  );
};

export default DomainChartsHeader;
