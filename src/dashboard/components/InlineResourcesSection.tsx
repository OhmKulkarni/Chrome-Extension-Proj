import { Badge } from './ui/badge';
import { Package, Layers, BarChart, Shield, Library, Target, Settings, Film, Zap, Wrench, Database, HelpCircle, Search, Copy, CheckCircle, Lock, Box, ChevronDown, Globe, Puzzle, Megaphone, Server, ExternalLink } from 'lucide-react';
import { LibraryInfo } from '../../background/utils/library-detector';
import { useState, useMemo } from 'react';
import React from 'react';

// Hook to detect dark mode
const useDarkMode = () => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

interface InlineResourcesSectionProps {
  domain: string;
  resources: LibraryInfo[];
  className?: string;
}

// Map detailed categories to primary categories
const getPrimaryCategory = (type: LibraryInfo['type']): 'libraries' | 'analytics' | 'privacy' | 'services' | 'assets' => {
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

const getPrimaryCategoryIcon = (primaryType: string) => {
  switch (primaryType) {
    case 'libraries':
      return <Library className="h-4 w-4" />;
    case 'analytics':
      return <BarChart className="h-4 w-4" />;
    case 'privacy':
      return <Shield className="h-4 w-4" />;
    case 'services':
      return <Megaphone className="h-4 w-4" />;
    case 'assets':
      return <Package className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const getTypeIcon = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework':
      return <Layers className="h-4 w-4" />;
    case 'utility':
      return <Wrench className="h-4 w-4" />;
    case 'polyfill':
      return <Puzzle className="h-4 w-4" />;
    case 'data-collector':
      return <Database className="h-4 w-4" />;
    case 'service':
      return <Globe className="h-4 w-4" />;
    case 'privacy-tools':
      return <Lock className="h-4 w-4" />;
    case 'tracking-tools':
      return <Target className="h-4 w-4" />;
    case 'site-tools':
      return <Settings className="h-4 w-4" />;
    case 'media-tools':
      return <Film className="h-4 w-4" />;
    case 'performance-tools':
      return <Zap className="h-4 w-4" />;
    case 'build-artifact':
      return <Box className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const getTypeBadgeColor = (type: LibraryInfo['type'], isDark: boolean) => {
  switch (type) {
    case 'framework':
      return isDark ? 'bg-blue-800 text-blue-200' : 'bg-blue-600 text-white';
    case 'utility':
      return isDark ? 'bg-green-800 text-green-200' : 'bg-green-600 text-white';
    case 'polyfill':
      return isDark ? 'bg-purple-800 text-purple-200' : 'bg-purple-600 text-white';
    case 'data-collector':
      return isDark ? 'bg-orange-800 text-orange-200' : 'bg-orange-600 text-white';
    case 'service':
      return isDark ? 'bg-teal-800 text-teal-200' : 'bg-teal-600 text-white';
    case 'privacy-tools':
      return isDark ? 'bg-red-800 text-red-200' : 'bg-red-600 text-white';
    case 'tracking-tools':
      return isDark ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-600 text-white';
    case 'site-tools':
      return isDark ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-600 text-white';
    case 'media-tools':
      return isDark ? 'bg-pink-800 text-pink-200' : 'bg-pink-600 text-white';
    case 'performance-tools':
      return isDark ? 'bg-cyan-800 text-cyan-200' : 'bg-cyan-600 text-white';
    case 'build-artifact':
      return isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-600 text-white';
    default:
      return isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-600 text-white';
  }
};

const getPrimaryCategoryColor = (primaryType: string, isDark: boolean) => {
  switch (primaryType) {
    case 'libraries':
      return isDark ? 'bg-blue-800 text-blue-200' : 'bg-blue-700 text-white';
    case 'analytics':
      return isDark ? 'bg-orange-800 text-orange-200' : 'bg-orange-700 text-white';
    case 'privacy':
      return isDark ? 'bg-red-800 text-red-200' : 'bg-red-700 text-white';
    case 'services':
      return isDark ? 'bg-teal-800 text-teal-200' : 'bg-teal-700 text-white';
    case 'assets':
      return isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-700 text-white';
    default:
      return isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-700 text-white';
  }
};

const formatTypeName = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'service':
      return 'Web Service';
    default:
      return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
};

const InlineResourcesSection: React.FC<InlineResourcesSectionProps> = ({ domain, resources, className = '' }) => {
  const isDark = useDarkMode();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['libraries', 'analytics', 'privacy', 'services', 'assets']));
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Group resources by primary category
  const groupedResources = useMemo(() => {
    const filtered = resources.filter(lib =>
      lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lib.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lib.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, lib) => {
      const primary = getPrimaryCategory(lib.type);
      if (!acc[primary]) acc[primary] = [];
      acc[primary].push(lib);
      return acc;
    }, {} as Record<string, LibraryInfo[]>);
  }, [resources, searchTerm]);

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section);
    } else {
      newCollapsed.add(section);
    }
    setCollapsedSections(newCollapsed);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const totalResources = resources.length;
  const filteredResources = Object.values(groupedResources).flat().length;

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg w-full ${className}`}>
      <div className="p-4 space-y-4 w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Libraries for {domain}</h3>
            <Badge variant="outline" className="ml-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
              {totalResources} total
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full px-2">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search libraries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {searchTerm && filteredResources !== totalResources && (
          <div className="text-sm text-gray-600 dark:text-gray-400 px-2">
            Showing {filteredResources} of {totalResources} web resources
          </div>
        )}

        {/* Library Categories */}
        <div className="space-y-3 max-h-96 overflow-y-auto w-full px-2 bg-transparent">
          {Object.entries(groupedResources).map(([primaryType, resourceList]) => (
            <div key={primaryType} className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 w-full">
              <button
                onClick={() => toggleSection(primaryType)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <div className="flex items-center gap-2">
                  {getPrimaryCategoryIcon(primaryType)}
                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {primaryType} ({resourceList.length})
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${
                    collapsedSections.has(primaryType) ? '' : 'rotate-180'
                  }`}
                />
              </button>

              {!collapsedSections.has(primaryType) && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-600">
                  {resourceList.map((lib, index) => (
                    <div
                      key={`${lib.name}-${index}`}
                      className="flex flex-col p-3 bg-gray-50 dark:bg-gray-600 rounded-md w-full"
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-gray-100 break-words">{lib.name}</span>
                          {lib.version && lib.version !== 'unknown' && (
                            <Badge variant="outline" className="text-xs flex-shrink-0 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600">
                              v{lib.version}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`text-xs flex items-center gap-1 ${getPrimaryCategoryColor(primaryType, isDark)} flex-shrink-0`}>
                            {getPrimaryCategoryIcon(primaryType)}
                            <span className="capitalize">{primaryType}</span>
                          </Badge>
                          <Badge className={`text-xs flex items-center gap-1 ${getTypeBadgeColor(lib.type, isDark)} flex-shrink-0`}>
                            {getTypeIcon(lib.type)}
                            <span>{formatTypeName(lib.type)}</span>
                          </Badge>
                        </div>

                        {lib.url && (
                          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex-1">
                              {/* Truncated URL display */}
                              <div className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" title={lib.url}>
                                {(() => {
                                  try {
                                    const url = new URL(lib.url);
                                    const filename = url.pathname.split('/').pop() || url.pathname;
                                    return filename && filename !== '/' ? filename : url.hostname;
                                  } catch (error) {
                                    // If URL is invalid, just show the last part after the last slash
                                    const parts = lib.url.split('/');
                                    return parts[parts.length - 1] || lib.url;
                                  }
                                })()}
                              </div>

                              {/* Source and Confidence info */}
                              <div className="flex items-center gap-3 mt-1">
                                {/* Source info */}
                                <div className="flex items-center gap-1" title="Resource Source">
                                  {(() => {
                                    if (lib.cdnProvider) {
                                      return (
                                        <>
                                          <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{lib.cdnProvider}</span>
                                        </>
                                      );
                                    } else if (lib.url.includes(lib.domain)) {
                                      return (
                                        <>
                                          <Server className="h-3 w-3 text-green-600 dark:text-green-400" />
                                          <span className="text-xs text-green-600 dark:text-green-400">Self-hosted</span>
                                        </>
                                      );
                                    } else {
                                      return (
                                        <>
                                          <Package className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                          <span className="text-xs text-orange-600 dark:text-orange-400">External</span>
                                        </>
                                      );
                                    }
                                  })()}
                                </div>

                                {/* Confidence info */}
                                <div className="flex items-center gap-1" title="Detection Confidence">
                                  {(() => {
                                    if (lib.confidence >= 0.8) {
                                      return (
                                        <>
                                          <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                                          <span className="text-xs text-green-600 dark:text-green-400">High</span>
                                        </>
                                      );
                                    } else if (lib.confidence >= 0.6) {
                                      return (
                                        <>
                                          <HelpCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                                          <span className="text-xs text-yellow-600 dark:text-yellow-400">Medium</span>
                                        </>
                                      );
                                    } else {
                                      return (
                                        <>
                                          <Search className="h-3 w-3 text-red-600 dark:text-red-400" />
                                          <span className="text-xs text-red-600 dark:text-red-400">Low</span>
                                        </>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Copy buttons - make them more visible */}
                            <div className="flex items-start pt-1 gap-1">
                              <button
                                onClick={() => copyToClipboard(lib.url!)}
                                className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded border border-gray-300 dark:border-gray-500"
                                title="Copy full URL"
                              >
                                {copiedUrl === lib.url ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                )}
                              </button>
                              <button
                                onClick={() => window.open(lib.url, '_blank')}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded border border-gray-300 dark:border-gray-500"
                                title="Open URL in new tab"
                              >
                                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(groupedResources).length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No libraries match your search.' : 'No libraries detected for this domain.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineResourcesSection;
