import { Badge } from './ui/badge';
import { ExternalLink, Package, Layers, BarChart, Shield, Library, Target, Settings, Film, Zap, Wrench, Database, HelpCircle, Search, Copy, CheckCircle, Server, Lock, Box, ChevronDown, Globe, Puzzle } from 'lucide-react';
import { LibraryInfo } from '../../background/utils/library-detector';
import { useState, useMemo } from 'react';
import React from 'react';

// Hook to detect dark mode
const _useDarkMode = () => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const _checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for class changes
    const _observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

interface ResourceStatsSectionProps {
  resources: LibraryInfo[];
  className?: string;
}

// Map detailed categories to primary categories
const _getPrimaryCategory = (type: LibraryInfo['type']): 'libraries' | 'analytics' | 'privacy' | 'services' | 'assets' => {
  switch (type) {
    case 'framework':
    case 'utility':
    case 'polyfill':
      return 'libraries';
    case 'data-collector':
    case 'tracking-tools':
      return 'analytics';
    case 'privacy-tools':
      return 'privacy';
    case 'service':
      return 'services';
    case 'site-tools':
    case 'media-tools':
    case 'performance-tools':
    case 'build-artifact':
      return 'assets';
    default:
      return 'assets';
  }
};

const _getPrimaryCategoryIcon = (primaryType: string) => {
  switch (primaryType) {
    case 'libraries':
      return <Library className="h-4 w-4" />;
    case 'analytics':
      return <BarChart className="h-4 w-4" />;
    case 'privacy':
      return <Shield className="h-4 w-4" />;
    case 'services':
      return <Server className="h-4 w-4" />;
    case 'assets':
      return <Package className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const _getSecondaryTypeIcon = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework':
      return <Layers className="h-3 w-3" />;
    case 'utility':
      return <Wrench className="h-3 w-3" />;
    case 'polyfill':
      return <Puzzle className="h-3 w-3" />;
    case 'data-collector':
      return <Database className="h-3 w-3" />;
    case 'tracking-tools':
      return <Target className="h-3 w-3" />;
    case 'privacy-tools':
      return <Lock className="h-3 w-3" />;
    case 'service':
      return <Globe className="h-3 w-3" />;
    case 'site-tools':
      return <Settings className="h-3 w-3" />;
    case 'media-tools':
      return <Film className="h-3 w-3" />;
    case 'performance-tools':
      return <Zap className="h-3 w-3" />;
    case 'build-artifact':
      return <Box className="h-3 w-3" />;
    default:
      return <HelpCircle className="h-3 w-3" />;
  }
};

const _getTypeDisplayName = (type: LibraryInfo['type']): string => {
  switch (type) {
    case 'framework':
      return 'Framework';
    case 'utility':
      return 'Utility';
    case 'polyfill':
      return 'Polyfill';
    case 'data-collector':
      return 'Data Collector';
    case 'tracking-tools':
      return 'Tracking Tools';
    case 'privacy-tools':
      return 'Privacy Tools';
    case 'service':
      return 'Web Service';
    case 'site-tools':
      return 'Site Tools';
    case 'media-tools':
      return 'Media Tools';
    case 'performance-tools':
      return 'Performance Tools';
    case 'build-artifact':
      return 'Build Artifact';
    default:
      return 'Unknown';
  }
};

const _getBadgeStyle = (type: LibraryInfo['type'], isDark: boolean): string => {
  switch (type) {
    case 'framework':
      return isDark ? 'bg-blue-800 text-blue-200 hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700';
    case 'utility':
      return isDark ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-600 text-white hover:bg-green-700';
    case 'polyfill':
      return isDark ? 'bg-orange-800 text-orange-200 hover:bg-orange-700' : 'bg-orange-600 text-white hover:bg-orange-700';
    case 'data-collector':
      return isDark ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' : 'bg-purple-600 text-white hover:bg-purple-700';
    case 'tracking-tools':
      return isDark ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700';
    case 'privacy-tools':
      return isDark ? 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700';
    case 'service':
      return isDark ? 'bg-cyan-800 text-cyan-200 hover:bg-cyan-700' : 'bg-cyan-600 text-white hover:bg-cyan-700';
    case 'site-tools':
      return isDark ? 'bg-teal-800 text-teal-200 hover:bg-teal-700' : 'bg-teal-600 text-white hover:bg-teal-700';
    case 'media-tools':
      return isDark ? 'bg-pink-800 text-pink-200 hover:bg-pink-700' : 'bg-pink-600 text-white hover:bg-pink-700';
    case 'performance-tools':
      return isDark ? 'bg-yellow-800 text-yellow-200 hover:bg-yellow-700' : 'bg-yellow-600 text-white hover:bg-yellow-700';
    case 'build-artifact':
      return isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700';
    default:
      return isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-600 text-white hover:bg-gray-700';
  }
};

const _copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
};

const ResourceStatsSection: React.FC<ResourceStatsSectionProps> = ({ resources, className = '' }) => {
  const _isDark = useDarkMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  // Filter resources by search term and exclude unknown versions
  const _filteredResources = useMemo(() => {
    return resources.filter(resource =>
      resource.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      resource.version !== 'unknown'
    );
  }, [resources, searchTerm]);

  // Group resources by primary category
  const _resourcesByCategory = useMemo(() => {
    const grouped: Record<string, LibraryInfo[]> = {};
    filteredResources.forEach(resource => {
      const _primaryCategory = getPrimaryCategory(resource.type);
      if (!grouped[primaryCategory]) {
        grouped[primaryCategory] = [];
      }
      grouped[primaryCategory].push(resource);
    });
    return grouped;
  }, [filteredResources]);

  // Group resources within each category by their detailed type
  const _resourcesByDetailedType = useMemo(() => {
    const result: Record<string, Record<string, LibraryInfo[]>> = {};
    Object.entries(resourcesByCategory).forEach(([primaryCategory, categoryResources]) => {
      result[primaryCategory] = {};
      categoryResources.forEach(resource => {
        const _detailedType = resource.type;
        if (!result[primaryCategory][detailedType]) {
          result[primaryCategory][detailedType] = [];
        }
        result[primaryCategory][detailedType].push(resource);
      });
    });
    return result;
  }, [resourcesByCategory]);

  const _toggleCategory = (category: string) => {
    const _newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const _handleCopy = async (text: string, resourceName: string) => {
    const _success = await copyToClipboard(text);
    if (success) {
      setCopiedItems(prev => new Set([...prev, resourceName]));
      setTimeout(() => {
        setCopiedItems(prev => {
          const _newSet = new Set(prev);
          newSet.delete(resourceName);
          return newSet;
        });
      }, 2000);
    }
  };

  if (filteredResources.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border ${className}`}>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {searchTerm ? 'No resources match your search.' : 'No resources detected for this domain.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 bg-transparent ${className}`}>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Resource categories */}
      <div className="space-y-4 bg-transparent">
        {Object.entries(resourcesByDetailedType).map(([primaryCategory, detailedTypes]) => {
          const _totalCount = Object.values(detailedTypes).reduce((sum, resources) => sum + resources.length, 0);
          const _isCollapsed = collapsedCategories.has(primaryCategory);

          return (
            <div key={primaryCategory} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(primaryCategory)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600
                         flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getPrimaryCategoryIcon(primaryCategory)}
                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {primaryCategory} ({totalCount})
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>

              {/* Category content */}
              {!isCollapsed && (
                <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  <div className="p-4 space-y-4 bg-transparent">
                    {Object.entries(detailedTypes).map(([detailedType, typeResources]) => (
                      <div key={detailedType} className="space-y-2 bg-transparent">
                        {/* Detailed type header */}
                        <div className="flex items-center space-x-2 pb-2 border-b border-gray-100 dark:border-gray-600">
                          {getSecondaryTypeIcon(detailedType as LibraryInfo['type'])}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getTypeDisplayName(detailedType as LibraryInfo['type'])} ({typeResources.length})
                          </span>
                        </div>

                        {/* Resources in this type */}
                        <div className="space-y-2 bg-transparent">
                          {typeResources.map((resource, index) => (
                            <div key={`${resource.name}-${index}`}
                                 className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900
                                          border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {resource.name}
                                  </span>
                                  {resource.version && (
                                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700">
                                      v{resource.version}
                                    </Badge>
                                  )}
                                  <Badge className={`text-xs px-2 py-0.5 ${getBadgeStyle(resource.type, isDark)}`}>
                                    {getTypeDisplayName(resource.type)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {resource.url}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2 ml-4">
                                {/* Copy button */}
                                <button
                                  onClick={() => handleCopy(resource.url, resource.name)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                                           hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                                  title="Copy URL"
                                >
                                  {copiedItems.has(resource.name) ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>

                                {/* External link button */}
                                <button
                                  onClick={() => window.open(resource.url, '_blank')}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                                           hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResourceStatsSection;
