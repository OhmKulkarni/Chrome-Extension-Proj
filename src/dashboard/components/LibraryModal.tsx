import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { X, ExternalLink, Package, Layers, Megaphone, BarChart, Shield, Library, Target, Settings, Film, Zap, Wrench, Database, HelpCircle, Search, Copy, CheckCircle, ArrowUpDown, Filter, Server, Lock, Box, ChevronDown } from 'lucide-react';
import { LibraryInfo } from '../../background/utils/library-detector';
import { useState, useMemo } from 'react';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  libraries: LibraryInfo[];
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
      return <Box className="h-4 w-4" />;
    case 'data-collector':
      return <Database className="h-4 w-4" />;
    case 'service':
      return <Server className="h-4 w-4" />;
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

const getTypeColor = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework':
      return 'bg-blue-100 text-blue-900 border border-blue-200';
    case 'utility':
      return 'bg-emerald-100 text-emerald-900 border border-emerald-200';
    case 'polyfill':
      return 'bg-amber-100 text-amber-900 border border-amber-200';
    case 'data-collector':
      return 'bg-purple-100 text-purple-900 border border-purple-200';
    case 'service':
      return 'bg-rose-100 text-rose-900 border border-rose-200';
    case 'privacy-tools':
      return 'bg-green-100 text-green-900 border border-green-200';
    case 'tracking-tools':
      return 'bg-orange-100 text-orange-900 border border-orange-200';
    case 'site-tools':
      return 'bg-indigo-100 text-indigo-900 border border-indigo-200';
    case 'media-tools':
      return 'bg-pink-100 text-pink-900 border border-pink-200';
    case 'performance-tools':
      return 'bg-cyan-100 text-cyan-900 border border-cyan-200';
    case 'build-artifact':
      return 'bg-slate-100 text-slate-900 border border-slate-200';
    default:
      return 'bg-gray-100 text-gray-900 border border-gray-200';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'bg-green-100 text-green-900 border border-green-200';
  if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-900 border border-yellow-200';
  return 'bg-red-100 text-red-900 border border-red-200';
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'framework': return 'Framework';
    case 'utility': return 'Utility';
    case 'polyfill': return 'Polyfill';
    case 'data-collector': return 'Data Collection';
    case 'service': return 'Service';
    case 'privacy-tools': return 'Privacy Tool';
    case 'tracking-tools': return 'Tracking';
    case 'site-tools': return 'Site Tool';
    case 'media-tools': return 'Media Tool';
    case 'performance-tools': return 'Performance';
    case 'build-artifact': return 'Build Artifact';
    default: return type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};

const getTypeDescription = (type: string) => {
  switch (type) {
    case 'framework': return 'JavaScript frameworks and libraries';
    case 'utility': return 'Utility libraries and helper functions';
    case 'polyfill': return 'Browser compatibility and feature polyfills';
    case 'data-collector': return 'Data collection and metrics tools';
    case 'service': return 'Web services and API integrations';
    case 'privacy-tools': return 'Privacy and consent management tools';
    case 'tracking-tools': return 'User tracking and behavior analytics';
    case 'site-tools': return 'Website functionality and management tools';
    case 'media-tools': return 'Media processing and manipulation tools';
    case 'performance-tools': return 'Performance monitoring and optimization';
    case 'build-artifact': return 'Build and development artifacts';
    default: return `${type.replace('-', ' ')} related resources`;
  }
};

// Primary category info function for badge styling
const getPrimaryCategoryInfo = (primaryType: string) => {
  switch (primaryType) {
    case 'libraries':
      return { icon: Library, bgColor: 'bg-blue-100 border border-blue-200', textColor: 'text-blue-900', label: 'Libraries' };
    case 'analytics':
      return { icon: BarChart, bgColor: 'bg-purple-100 border border-purple-200', textColor: 'text-purple-900', label: 'Analytics' };
    case 'privacy':
      return { icon: Shield, bgColor: 'bg-green-100 border border-green-200', textColor: 'text-green-900', label: 'Privacy' };
    case 'services':
      return { icon: Megaphone, bgColor: 'bg-rose-100 border border-rose-200', textColor: 'text-rose-900', label: 'Services' };
    case 'assets':
      return { icon: Package, bgColor: 'bg-slate-100 border border-slate-200', textColor: 'text-slate-900', label: 'Assets' };
    default:
      return { icon: HelpCircle, bgColor: 'bg-gray-100 border border-gray-200', textColor: 'text-gray-900', label: 'Unknown' };
  }
};

export default function LibraryModal({ isOpen, onClose, domain, libraries }: LibraryModalProps) {
  // Enhanced UX features state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'confidence'>('type');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Toggle section collapse
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  // Enhanced filtering and sorting
  const filteredAndSortedLibraries = useMemo(() => {
    let filtered = libraries;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(lib =>
        lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lib.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lib.description && lib.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(lib => lib.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'confidence':
          return b.confidence - a.confidence;
        case 'type':
        default:
          return a.type.localeCompare(b.type);
      }
    });

    return filtered;
  }, [libraries, searchTerm, filterType, sortBy]);

  // Group filtered libraries by type for display
  const filteredLibrariesByType = useMemo(() => {
    const grouped: { [key: string]: { label: string; type: string; description: string; count: number; libraries: LibraryInfo[] } } = {};

    filteredAndSortedLibraries.forEach(library => {
      const key = library.type;
      if (!grouped[key]) {
        grouped[key] = {
          label: getTypeLabel(library.type),
          type: library.type,
          description: getTypeDescription(library.type),
          count: 0,
          libraries: []
        };
      }
      grouped[key].count++;
      grouped[key].libraries.push(library);
    });

    return grouped;
  }, [filteredAndSortedLibraries]);

  // Copy URL functionality
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Get unique types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(libraries.map(lib => lib.type))];
    return types.sort();
  }, [libraries]);

  // Define resource type sections with proper labels and descriptions
  const resourceTypeSections = [
    { type: 'framework', label: 'Frameworks', description: 'JavaScript frameworks and libraries' },
    { type: 'utility', label: 'Utilities', description: 'Utility libraries and tools' },
    { type: 'polyfill', label: 'Polyfills', description: 'Browser compatibility and feature polyfills' },
    { type: 'data-collector', label: 'Data Collection', description: 'Data collection and metrics tools' },
    { type: 'service', label: 'Services', description: 'Web services and API integrations' },
    { type: 'privacy-tools', label: 'Privacy Tools', description: 'Privacy and consent management tools' },
    { type: 'tracking-tools', label: 'Tracking', description: 'User tracking and behavior analytics' },
    { type: 'site-tools', label: 'Site Tools', description: 'Website functionality and management tools' },
    { type: 'media-tools', label: 'Media Tools', description: 'Media processing and manipulation tools' },
    { type: 'performance-tools', label: 'Performance', description: 'Performance monitoring and optimization' },
    { type: 'build-artifact', label: 'Build Artifacts', description: 'Compiled bundles and build outputs' }
  ];

  // Organize libraries by individual resource types
  const librariesByType = resourceTypeSections.reduce((acc, section) => {
    const sectionLibraries = libraries.filter(lib => lib.type === section.type);
    if (sectionLibraries.length > 0) {
      acc[section.type] = {
        ...section,
        libraries: sectionLibraries,
        count: sectionLibraries.length
      };
    }
    return acc;
  }, {} as Record<string, { type: string; label: string; description: string; libraries: LibraryInfo[]; count: number }>);

  const stats = {
    total: libraries.length,
    types: Object.keys(librariesByType).length,
    minified: libraries.filter(lib => lib.isMinified).length,
    buildArtifacts: libraries.filter(lib => lib.type === 'build-artifact').length,
    // totalSize: libraries.reduce((sum, lib) => sum + (lib.size || 0), 0), // Size not tracked in current system
    // Top resource types
    frameworks: libraries.filter(lib => lib.type === 'framework').length,
    analytics: libraries.filter(lib => ['analytics', 'data-collector', 'tracking-tools'].includes(lib.type)).length,
    services: libraries.filter(lib => lib.type === 'service').length
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              📚 Libraries for {domain}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Primary Category Overview */}
          {libraries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {['libraries', 'analytics', 'privacy', 'services', 'assets'].map(primaryCategory => {
                const count = libraries.filter(lib => getPrimaryCategory(lib.type) === primaryCategory).length;
                if (count === 0) return null;

                return (
                  <div key={primaryCategory} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm">
                    {getPrimaryCategoryIcon(primaryCategory)}
                    <span className="capitalize">{primaryCategory}: {count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogHeader>

        {libraries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No libraries detected for this domain</p>
            <p className="text-sm mt-2">Library detection happens automatically as JavaScript files are loaded.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enhanced Search and Filter Controls */}
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search libraries, types, or descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <Filter className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
                  >
                    <option value="all">All Types</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>
                        {getTypeLabel(type)} ({libraries.filter(lib => lib.type === type).length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Options */}
                <div className="relative">
                  <ArrowUpDown className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'type' | 'confidence')}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
                  >
                    <option value="type">Sort by Type</option>
                    <option value="name">Sort by Name</option>
                    <option value="confidence">Sort by Confidence</option>
                  </select>
                </div>
              </div>

              {/* Search Results Summary */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {filteredAndSortedLibraries.length === libraries.length
                    ? `Showing all ${libraries.length} resources`
                    : `Showing ${filteredAndSortedLibraries.length} of ${libraries.length} resources`
                  }
                </span>
                {(searchTerm || filterType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            {/* Statistics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Resources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.frameworks}</div>
                <div className="text-sm text-gray-600">Frameworks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.services}</div>
                <div className="text-sm text-gray-600">Services</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">{stats.buildArtifacts}</div>
                <div className="text-sm text-gray-600">Build Assets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.types}</div>
                <div className="text-sm text-gray-600">Unique Types</div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">{stats.minified}</div>
                <div className="text-xs text-gray-500">Minified</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{stats.analytics}</div>
                <div className="text-xs text-gray-500">Analytics & Tracking</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-600">{stats.types}</div>
                <div className="text-xs text-gray-500">Resource Types</div>
              </div>
            </div>

            {/* Libraries by Individual Type */}
            {Object.entries(filteredLibrariesByType)
              .sort(([, a], [, b]) => {
                if (sortBy === 'name') return a.label.localeCompare(b.label);
                if (sortBy === 'type') return a.type.localeCompare(b.type);
                return b.count - a.count; // default: count descending
              })
              .map(([typeKey, typeData]) => (
              <div key={typeKey} className="space-y-3 border border-gray-200 rounded-lg bg-white">
                {/* Collapsible Section Header */}
                <button
                  onClick={() => toggleSection(typeKey)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-t-lg border-b"
                >
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    {getTypeIcon(typeData.type as LibraryInfo['type'])}
                    <div className="flex flex-col text-left">
                      <span>
                        {typeData.label} ({typeData.count})
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          [{getPrimaryCategoryInfo(getPrimaryCategory(typeData.type as LibraryInfo['type'])).label}]
                        </span>
                      </span>
                      <span className="text-sm font-normal text-gray-500">{typeData.description}</span>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform ${
                      collapsedSections.has(typeKey) ? '-rotate-90' : 'rotate-0'
                    }`} 
                  />
                </button>

                {/* Collapsible Content */}
                {!collapsedSections.has(typeKey) && (

                <div className="grid gap-3">
                  {typeData.libraries.map((library, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-1">
                              {getTypeIcon(library.type)}
                              <h4 className="font-semibold text-lg">{library.name}</h4>
                            </div>
                            {library.version && library.version !== 'unknown' && (
                              <Badge variant="outline" className="text-xs">
                                v{library.version}
                              </Badge>
                            )}
                            {/* Primary Category Badge */}
                            <Badge className={`text-xs ${getPrimaryCategoryInfo(getPrimaryCategory(library.type)).bgColor} ${getPrimaryCategoryInfo(getPrimaryCategory(library.type)).textColor}`}>
                              {getPrimaryCategoryInfo(getPrimaryCategory(library.type)).label}
                            </Badge>
                            {/* Detailed Technical Type Badge */}
                            <Badge variant="outline" className={`text-xs ${getTypeColor(library.type)}`}>
                              {getTypeLabel(library.type)}
                            </Badge>
                            <Badge className={`text-xs ${getConfidenceColor(library.confidence)}`}>
                              {getConfidenceLabel(library.confidence)} ({Math.round(library.confidence * 100)}%)
                            </Badge>
                            {library.isMinified && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                Minified
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Detection:</span> {library.detectionMethod}
                            </div>
                            {library.cdnProvider && (
                              <div>
                                <span className="font-medium">CDN:</span> {library.cdnProvider}
                              </div>
                            )}
                            {/* Size information not available in current system */}
                            <div className="md:col-span-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">URL:</span>
                                <a
                                  href={library.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 truncate flex items-center gap-1 max-w-xs"
                                  title={library.url}
                                >
                                  {library.url.split('/').pop() || library.url}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                <button
                                  onClick={() => copyUrl(library.url)}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Copy URL"
                                >
                                  {copiedUrl === library.url ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
