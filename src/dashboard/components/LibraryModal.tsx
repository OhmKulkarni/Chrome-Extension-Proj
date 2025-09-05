import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { X, ExternalLink, Package, Code, Palette, BarChart3, Globe, Layers } from 'lucide-react';

interface LibraryInfo {
  name: string;
  version?: string;
  type: 'framework' | 'utility' | 'ui' | 'analytics' | 'cdn' | 'polyfill' | 'unknown' | 'privacy-tools' | 'tracking-tools' | 'site-tools' | 'media-tools' | 'performance-tools' | 'advertising-service' | 'api-endpoint' | 'streaming-service' | 'data-collector' | 'web-service';
  confidence: 'high' | 'medium' | 'low';
  source: 'url' | 'content' | 'headers';
  cdnProvider?: string;
  minified: boolean;
  size?: number;
  url: string;
}

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  libraries: LibraryInfo[];
}

const getTypeIcon = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework': return <Code className="h-4 w-4" />;
    case 'utility': return <Package className="h-4 w-4" />;
    case 'ui': return <Palette className="h-4 w-4" />;
    case 'analytics': return <BarChart3 className="h-4 w-4" />;
    case 'data-collector': return <BarChart3 className="h-4 w-4" />;
    case 'cdn': return <Globe className="h-4 w-4" />;
    case 'polyfill': return <Layers className="h-4 w-4" />;
    case 'advertising-service': return <ExternalLink className="h-4 w-4" />;
    case 'api-endpoint': return <Globe className="h-4 w-4" />;
    case 'streaming-service': return <Package className="h-4 w-4" />;
    case 'privacy-tools': return <Package className="h-4 w-4" />;
    case 'tracking-tools': return <BarChart3 className="h-4 w-4" />;
    case 'site-tools': return <Package className="h-4 w-4" />;
    case 'media-tools': return <Package className="h-4 w-4" />;
    case 'performance-tools': return <Package className="h-4 w-4" />;
    case 'web-service': return <Globe className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const getTypeColor = (type: LibraryInfo['type']) => {
  switch (type) {
    case 'framework': return 'bg-blue-100 text-blue-800';
    case 'utility': return 'bg-green-100 text-green-800';
    case 'ui': return 'bg-purple-100 text-purple-800';
    case 'analytics': return 'bg-orange-100 text-orange-800';
    case 'data-collector': return 'bg-purple-100 text-purple-800';
    case 'cdn': return 'bg-gray-100 text-gray-800';
    case 'polyfill': return 'bg-yellow-100 text-yellow-800';
    case 'advertising-service': return 'bg-red-100 text-red-800';
    case 'api-endpoint': return 'bg-orange-100 text-orange-800';
    case 'streaming-service': return 'bg-green-100 text-green-800';
    case 'privacy-tools': return 'bg-gray-100 text-gray-800';
    case 'tracking-tools': return 'bg-yellow-100 text-yellow-800';
    case 'site-tools': return 'bg-indigo-100 text-indigo-800';
    case 'media-tools': return 'bg-pink-100 text-pink-800';
    case 'performance-tools': return 'bg-cyan-100 text-cyan-800';
    case 'web-service': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getConfidenceColor = (confidence: LibraryInfo['confidence']) => {
  switch (confidence) {
    case 'high': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatSize = (size?: number) => {
  if (!size) return null;
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${Math.round(size / (1024 * 1024) * 10) / 10}MB`;
};

export default function LibraryModal({ isOpen, onClose, domain, libraries }: LibraryModalProps) {
  const groupedLibraries = libraries.reduce((acc, lib) => {
    if (!acc[lib.type]) acc[lib.type] = [];
    acc[lib.type].push(lib);
    return acc;
  }, {} as Record<string, LibraryInfo[]>);

  const stats = {
    total: libraries.length,
    frameworks: libraries.filter(lib => lib.type === 'framework').length,
    utilities: libraries.filter(lib => lib.type === 'utility').length,
    ui: libraries.filter(lib => lib.type === 'ui').length,
    analytics: libraries.filter(lib => lib.type === 'analytics').length,
    minified: libraries.filter(lib => lib.minified).length,
    totalSize: libraries.reduce((sum, lib) => sum + (lib.size || 0), 0)
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
            <p>No libraries detected for this domain</p>
            <p className="text-sm mt-2">Library detection happens automatically as JavaScript files are loaded.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Libraries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.frameworks}</div>
                <div className="text-sm text-gray-600">Frameworks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.minified}</div>
                <div className="text-sm text-gray-600">Minified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.totalSize > 0 ? formatSize(stats.totalSize) : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Total Size</div>
              </div>
            </div>

            {/* Libraries by Type */}
            {Object.entries(groupedLibraries).map(([type, typeLibraries]) => (
              <div key={type} className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold capitalize">
                  {getTypeIcon(type as LibraryInfo['type'])}
                  {type} Libraries ({typeLibraries.length})
                </h3>

                <div className="grid gap-3">
                  {typeLibraries.map((library, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg">{library.name}</h4>
                            {library.version && (
                              <Badge variant="outline" className="text-xs">
                                v{library.version}
                              </Badge>
                            )}
                            <Badge className={`text-xs ${getTypeColor(library.type)}`}>
                              {library.type}
                            </Badge>
                            <Badge className={`text-xs ${getConfidenceColor(library.confidence)}`}>
                              {library.confidence}
                            </Badge>
                            {library.minified && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                Minified
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Detection:</span> {library.source}
                            </div>
                            {library.cdnProvider && (
                              <div>
                                <span className="font-medium">CDN:</span> {library.cdnProvider}
                              </div>
                            )}
                            {library.size && (
                              <div>
                                <span className="font-medium">Size:</span> {formatSize(library.size)}
                              </div>
                            )}
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
