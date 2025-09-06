import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { X, ExternalLink, Package, Layers, Megaphone, BarChart, Video, Shield, Library, Target, Settings, Film, Zap, Wrench, Wifi, Database, Cpu, Type, FileText, HelpCircle, Search, Copy, CheckCircle, ArrowUpDown, Filter } from 'lucide-react';
import { LibraryInfo } from '../../background/utils/library-detector';
import { useState, useMemo } from 'react';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  libraries: LibraryInfo[];
}

const getTypeIcon = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework':
      return <Library className="h-4 w-4" />;
    case 'utility':
      return <Wrench className="h-4 w-4" />;
    case 'analytics':
    case 'data-collector':
      return <BarChart className="h-4 w-4" />;
    case 'service':
      return <Megaphone className="h-4 w-4" />;
    case 'streaming-service':
      return <Video className="h-4 w-4" />;
    case 'privacy-tools':
      return <Shield className="h-4 w-4" />;
    case 'tracking-tools':
      return <Target className="h-4 w-4" />;
    case 'site-tools':
      return <Settings className="h-4 w-4" />;
    case 'media-tools':
      return <Film className="h-4 w-4" />;
    case 'performance-tools':
      return <Zap className="h-4 w-4" />;
    case 'build-artifact':
      return <Package className="h-4 w-4" />;
    case 'websocket':
      return <Wifi className="h-4 w-4" />;
    case 'graphql':
      return <Database className="h-4 w-4" />;
    case 'service-worker':
      return <Cpu className="h-4 w-4" />;
    case 'web-font':
      return <Type className="h-4 w-4" />;
    case 'config-file':
      return <FileText className="h-4 w-4" />;
    case 'polyfill':
      return <Layers className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
};

const getTypeColor = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework':
      return 'bg-blue-100 text-blue-800';
    case 'utility':
      return 'bg-teal-100 text-teal-800';
    case 'analytics':
    case 'data-collector':
      return 'bg-purple-100 text-purple-800';
    case 'service':
      return 'bg-red-100 text-red-800';
    case 'streaming-service':
      return 'bg-green-100 text-green-800';
    case 'privacy-tools':
      return 'bg-gray-100 text-gray-800';
    case 'tracking-tools':
      return 'bg-yellow-100 text-yellow-800';
    case 'site-tools':
      return 'bg-indigo-100 text-indigo-800';
    case 'media-tools':
      return 'bg-pink-100 text-pink-800';
    case 'performance-tools':
      return 'bg-cyan-100 text-cyan-800';
    case 'build-artifact':
      return 'bg-slate-100 text-slate-800';
    case 'websocket':
      return 'bg-emerald-100 text-emerald-800';
    case 'graphql':
      return 'bg-violet-100 text-violet-800';
    case 'service-worker':
      return 'bg-amber-100 text-amber-800';
    case 'web-font':
      return 'bg-rose-100 text-rose-800';
    case 'config-file':
      return 'bg-stone-100 text-stone-800';
    case 'polyfill':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'bg-green-100 text-green-800';
  if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
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
    case 'ui': return 'UI Component';
    case 'analytics': return 'Analytics';
    case 'data-collector': return 'Data Collection';
    case 'advertising-service': return 'Advertising';
    case 'streaming-service': return 'Media Streaming';
    case 'api-endpoint': return 'API Endpoint';
    case 'privacy-tools': return 'Privacy Tool';
    case 'tracking-tools': return 'Tracking';
    case 'site-tools': return 'Site Tool';
    case 'media-tools': return 'Media Tool';
    case 'performance-tools': return 'Performance';
    case 'build-artifact': return 'Build Artifact';
    case 'websocket': return 'WebSocket';
    case 'graphql': return 'GraphQL';
    case 'service-worker': return 'Service Worker';
    case 'web-font': return 'Web Font';
    case 'config-file': return 'Configuration';
    case 'polyfill': return 'Polyfill';
    case 'web-service': return 'Web Service';
    default: return type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};

const getTypeDescription = (type: string) => {
  switch (type) {
    case 'framework': return 'JavaScript frameworks and libraries';
    case 'utility': return 'Utility libraries and helper functions';
    case 'ui': return 'User interface components and styling';
    case 'analytics': return 'Analytics and tracking services';
    case 'data-collector': return 'Data collection and metrics tools';
    case 'advertising-service': return 'Advertisement and marketing services';
    case 'streaming-service': return 'Video and media streaming services';
    case 'api-endpoint': return 'External API and service endpoints';
    case 'privacy-tools': return 'Privacy and consent management tools';
    case 'tracking-tools': return 'User tracking and behavior analytics';
    case 'site-tools': return 'Website functionality and management tools';
    case 'media-tools': return 'Media processing and manipulation tools';
    case 'performance-tools': return 'Performance monitoring and optimization';
    case 'build-artifact': return 'Build and development artifacts';
    case 'websocket': return 'Real-time communication protocols';
    case 'graphql': return 'GraphQL API and query language';
    case 'service-worker': return 'Progressive web app functionality';
    case 'web-font': return 'Web fonts and typography resources';
    case 'config-file': return 'Configuration and settings files';
    case 'polyfill': return 'Browser compatibility polyfills';
    case 'web-service': return 'Web services and API integrations';
    default: return `${type.replace('-', ' ')} related resources`;
  }
};

export default function LibraryModal({ isOpen, onClose, domain, libraries }: LibraryModalProps) {
  // Enhanced UX features state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'confidence'>('type');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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
    { type: 'ui', label: 'UI Components', description: 'User interface libraries and components' },
    { type: 'analytics', label: 'Analytics', description: 'Analytics and tracking services' },
    { type: 'data-collector', label: 'Data Collection', description: 'Data collection and metrics tools' },
    { type: 'advertising-service', label: 'Advertising', description: 'Advertisement and marketing services' },
    { type: 'streaming-service', label: 'Media Streaming', description: 'Video and media streaming services' },
    { type: 'api-endpoint', label: 'API Endpoints', description: 'External API and service endpoints' },
    { type: 'privacy-tools', label: 'Privacy Tools', description: 'Privacy and consent management tools' },
    { type: 'tracking-tools', label: 'Tracking', description: 'User tracking and behavior analytics' },
    { type: 'site-tools', label: 'Site Tools', description: 'Website functionality and management tools' },
    { type: 'media-tools', label: 'Media Tools', description: 'Media processing and manipulation tools' },
    { type: 'performance-tools', label: 'Performance', description: 'Performance monitoring and optimization' },
    { type: 'build-artifact', label: 'Build Artifacts', description: 'Compiled bundles and build outputs' },
    { type: 'websocket', label: 'WebSocket', description: 'Real-time communication connections' },
    { type: 'graphql', label: 'GraphQL', description: 'GraphQL endpoints and queries' },
    { type: 'service-worker', label: 'Service Workers', description: 'Background service worker scripts' },
    { type: 'web-font', label: 'Web Fonts', description: 'Font files and typography resources' },
    { type: 'config-file', label: 'Configuration', description: 'Configuration and manifest files' },
    { type: 'polyfill', label: 'Polyfills', description: 'Browser compatibility polyfills' },
    { type: 'web-service', label: 'Web Services', description: 'General web services and APIs' }
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
    services: libraries.filter(lib => ['advertising-service', 'streaming-service', 'api-endpoint', 'web-service'].includes(lib.type)).length
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
              <div key={typeKey} className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                  {getTypeIcon(typeData.type as LibraryInfo['type'])}
                  <div className="flex flex-col">
                    <span>{typeData.label} ({typeData.count})</span>
                    <span className="text-sm font-normal text-gray-500">{typeData.description}</span>
                  </div>
                </h3>

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
                            <Badge className={`text-xs ${getTypeColor(library.type)}`}>
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
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
