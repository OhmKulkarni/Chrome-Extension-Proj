import { Badge } from './ui/badge';
import { ExternalLink, Package, Layers, BarChart, Shield, Library, Target, Settings, Film, Zap, Wrench, Database, HelpCircle, Search, Copy, CheckCircle, Server, Lock, Box, ChevronDown, Globe, Puzzle } from 'lucide-react';
import { LibraryInfo } from '../../background/utils/library-detector';
import { useState, useMemo } from 'react';
import React from 'react';

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
      return <Server className="h-4 w-4" />;
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

const getTypeBadgeColor = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework':
      return 'bg-blue-600 text-white';
    case 'utility':
      return 'bg-green-600 text-white';
    case 'polyfill':
      return 'bg-purple-600 text-white';
    case 'data-collector':
      return 'bg-orange-600 text-white';
    case 'service':
      return 'bg-teal-600 text-white';
    case 'privacy-tools':
      return 'bg-red-600 text-white';
    case 'tracking-tools':
      return 'bg-yellow-600 text-white';
    case 'site-tools':
      return 'bg-indigo-600 text-white';
    case 'media-tools':
      return 'bg-pink-600 text-white';
    case 'performance-tools':
      return 'bg-cyan-600 text-white';
    case 'build-artifact':
      return 'bg-gray-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
};

const getPrimaryCategoryColor = (primaryType: string) => {
  switch (primaryType) {
    case 'libraries':
      return 'bg-blue-700 text-white';
    case 'analytics':
      return 'bg-orange-700 text-white';
    case 'privacy':
      return 'bg-red-700 text-white';
    case 'services':
      return 'bg-teal-700 text-white';
    case 'assets':
      return 'bg-gray-700 text-white';
    default:
      return 'bg-gray-700 text-white';
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
    <div className={`bg-gray-50 border rounded-lg max-w-4xl ${className}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Libraries for {domain}</h3>
            <Badge variant="outline" className="ml-2">
              {totalResources} total
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search libraries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {searchTerm && filteredResources !== totalResources && (
          <div className="text-sm text-gray-600">
            Showing {filteredResources} of {totalResources} web resources
          </div>
        )}

        {/* Library Categories */}
        <div className="space-y-3 max-h-96 overflow-y-auto w-full">
          {Object.entries(groupedResources).map(([primaryType, resourceList]) => (
            <div key={primaryType} className="border border-gray-200 rounded-lg bg-white w-full">
              <button
                onClick={() => toggleSection(primaryType)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {getPrimaryCategoryIcon(primaryType)}
                  <span className="font-medium text-gray-900 capitalize">
                    {primaryType} ({resourceList.length})
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    collapsedSections.has(primaryType) ? '' : 'rotate-180'
                  }`}
                />
              </button>

              {!collapsedSections.has(primaryType) && (
                <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                  {resourceList.map((lib, index) => (
                    <div
                      key={`${lib.name}-${index}`}
                      className="flex flex-col p-3 bg-gray-50 rounded-md w-full"
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-gray-900 break-words">{lib.name}</span>
                          {lib.version && lib.version !== 'unknown' && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              v{lib.version}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`text-xs flex items-center gap-1 ${getPrimaryCategoryColor(primaryType)} flex-shrink-0`}>
                            {getPrimaryCategoryIcon(primaryType)}
                            <span className="capitalize">{primaryType}</span>
                          </Badge>
                          <Badge className={`text-xs flex items-center gap-1 ${getTypeBadgeColor(lib.type)} flex-shrink-0`}>
                            {getTypeIcon(lib.type)}
                            <span>{formatTypeName(lib.type)}</span>
                          </Badge>
                        </div>

                        {lib.url && (
                          <div className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="break-all flex-1 leading-relaxed">{lib.url}</span>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => copyToClipboard(lib.url!)}
                                className="hover:text-purple-600 transition-colors"
                                title="Copy URL"
                              >
                                {copiedUrl === lib.url ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              <a
                                href={lib.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-purple-600 transition-colors"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
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
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No libraries match your search.' : 'No libraries detected for this domain.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InlineResourcesSection;
