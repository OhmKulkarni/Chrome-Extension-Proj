import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowUpDown, BarChart3, TrendingUp, Layers, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import { groupDataByDomain, DomainStats } from './domainUtils';

interface StatisticsCardProps {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
}

interface GlobalStats {
  totalRequests: number;
  totalErrors: number;
  totalTokenEvents: number;
  uniqueDomains: number;
  maxResponseTime: number;
  requestsByMethod: { [method: string]: number };
  errorsBySeverity: { [severity: string]: number };
  tokensByType: { [type: string]: number };
  avgResponseTime: number;
  successRate: number;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  networkRequests,
  consoleErrors,
  tokenEvents
}) => {
  const [globalSortConfig, setGlobalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'value',
    direction: 'desc'
  });
  
  const [domainSortConfig, setDomainSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'totalRequests',
    direction: 'desc'
  });

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Calculate global statistics
  const globalStats: GlobalStats = useMemo(() => {
    const totalRequests = networkRequests.length;
    const totalErrors = consoleErrors.length;
    const totalTokenEvents = tokenEvents.length;

    // Calculate unique domains
    const allData = [...networkRequests, ...consoleErrors, ...tokenEvents];
    const uniqueDomainsSet = new Set();
    allData.forEach(item => {
      const itemUrl = item.url || item.request?.url || item.details?.url || item.source_url || '';
      if (itemUrl && itemUrl !== 'unknown' && itemUrl !== 'Unknown' && itemUrl !== 'Unknown URL') {
        try {
          const hostname = new URL(itemUrl).hostname;
          // Extract main domain (e.g., reddit.com from www.reddit.com)
          const mainDomain = item.main_domain || hostname.replace(/^www\./, '').toLowerCase();
          if (mainDomain && mainDomain !== 'unknown') {
            uniqueDomainsSet.add(mainDomain);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    const uniqueDomains = uniqueDomainsSet.size;

    // Requests by method
    const requestsByMethod = networkRequests.reduce((acc, req) => {
      const method = req.method || req.request_method || 'GET';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as { [method: string]: number });

    // Errors by severity
    const errorsBySeverity = consoleErrors.reduce((acc, error) => {
      const severity = error.level || error.severity || 'error';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as { [severity: string]: number });

    // Tokens by type
    const tokensByType = tokenEvents.reduce((acc, token) => {
      // Analyze token event to determine type
      const url = (token.url || token.source_url || '').toLowerCase();
      const method = (token.method || token.request_method || '').toUpperCase();
      
      let type = 'Access Token';
      if (url.includes('/refresh') || method === 'POST' && url.includes('/token')) {
        type = 'Refresh Token';
      } else if (url.includes('/login') || url.includes('/signin')) {
        type = 'Login Token';
      } else if (token.headers && (token.headers['x-api-key'] || token.headers['X-API-Key'])) {
        type = 'API Key';
      }
      
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as { [type: string]: number });

    // Calculate average and max response time
    const responseTimes = networkRequests
      .map(req => req.response_time || req.responseTime)
      .filter(time => time && typeof time === 'number');
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0;
    const maxResponseTime = responseTimes.length > 0 
      ? Math.max(...responseTimes)
      : 0;

    // Calculate success rate
    const successfulRequests = networkRequests.filter(req => {
      const status = req.status || req.response_status;
      return status >= 200 && status < 400;
    }).length;
    const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0;

    return {
      totalRequests,
      totalErrors,
      totalTokenEvents,
      uniqueDomains,
      maxResponseTime,
      requestsByMethod,
      errorsBySeverity,
      tokensByType,
      avgResponseTime,
      successRate
    };
  }, [networkRequests, consoleErrors, tokenEvents]);

  // Calculate domain-specific statistics with enhanced grouping
  const domainStats: DomainStats[] = useMemo(() => {
    const allData = [...networkRequests, ...consoleErrors, ...tokenEvents];
    return groupDataByDomain(allData);
  }, [networkRequests, consoleErrors, tokenEvents]);

  // Sorting functions
  const handleGlobalSort = (key: string) => {
    setGlobalSortConfig({
      key,
      direction: globalSortConfig.key === key && globalSortConfig.direction === 'desc' ? 'asc' : 'desc'
    });
  };

  const handleDomainSort = (key: string) => {
    setDomainSortConfig({
      key,
      direction: domainSortConfig.key === key && domainSortConfig.direction === 'desc' ? 'asc' : 'desc'
    });
  };

  // Toggle expanded state for grouped domains
  const toggleDomainExpansion = (domain: string) => {
    const newExpanded = new Set(expandedDomains);
    if (expandedDomains.has(domain)) {
      newExpanded.delete(domain);
    } else {
      newExpanded.add(domain);
    }
    setExpandedDomains(newExpanded);
  };

  // Prepare sorted global stats for table
  const globalStatsTable = useMemo(() => {
    const stats = [
      // Network category metrics
      { metric: 'Total Requests', value: globalStats.totalRequests, category: 'Network' },
      { metric: 'Unique Domains', value: globalStats.uniqueDomains, category: 'Network' },
      ...Object.entries(globalStats.requestsByMethod).map(([method, count]) => ({
        metric: `${method} Requests`,
        value: count,
        category: 'Network'
      })),
      
      // Performance category metrics
      { metric: 'Success Rate', value: `${globalStats.successRate}%`, category: 'Performance' },
      { metric: 'Average Response Time', value: `${globalStats.avgResponseTime}ms`, category: 'Performance' },
      { metric: 'Max Response Time', value: `${globalStats.maxResponseTime}ms`, category: 'Performance' },
      
      // Console category metrics (Total Errors only - removed redundant ERROR Errors)
      { metric: 'Total Errors', value: globalStats.totalErrors, category: 'Console' },
      ...Object.entries(globalStats.errorsBySeverity)
        .filter(([severity]) => severity.toLowerCase() !== 'error') // Remove redundant 'error' severity to avoid duplication
        .map(([severity, count]) => ({
          metric: `${severity.toUpperCase()} Errors`,
          value: count,
          category: 'Console'
        })),
      
      // Auth category metrics
      { metric: 'Total Token Events', value: globalStats.totalTokenEvents, category: 'Auth' },
      ...Object.entries(globalStats.tokensByType).map(([type, count]) => ({
        metric: type,
        value: count,
        category: 'Auth'
      }))
    ];

    return stats.sort((a, b) => {
      if (globalSortConfig.key === 'metric') {
        return globalSortConfig.direction === 'asc' 
          ? a.metric.localeCompare(b.metric)
          : b.metric.localeCompare(a.metric);
      } else if (globalSortConfig.key === 'value') {
        const aVal = typeof a.value === 'string' ? parseInt(a.value) || 0 : a.value;
        const bVal = typeof b.value === 'string' ? parseInt(b.value) || 0 : b.value;
        return globalSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      } else if (globalSortConfig.key === 'category') {
        return globalSortConfig.direction === 'asc' 
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      return 0;
    });
  }, [globalStats, globalSortConfig]);

  // Prepare sorted domain stats
  const sortedDomainStats = useMemo(() => {
    return [...domainStats].sort((a, b) => {
      const key = domainSortConfig.key as keyof DomainStats;
      let aVal = a[key];
      let bVal = b[key];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return domainSortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        return domainSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [domainStats, domainSortConfig]);

  const SortButton: React.FC<{ column: string; currentSort: { key: string; direction: 'asc' | 'desc' }; onSort: (key: string) => void }> = 
    ({ column, currentSort, onSort }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 lg:px-3"
        onClick={() => onSort(column)}
      >
        <ArrowUpDown className="h-4 w-4" />
        {currentSort.key === column && (
          <span className="ml-1">
            {currentSort.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </Button>
    );

  return (
    <Card className="w-full max-w-full mx-auto mb-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl text-blue-800">
          <BarChart3 className="h-6 w-6" />
          Extension Statistics Dashboard
        </CardTitle>
        <CardDescription className="text-blue-600">
          Comprehensive analytics for network requests, console errors, and authentication events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Global Statistics
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Domain Statistics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="global" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Metric
                        <SortButton column="metric" currentSort={globalSortConfig} onSort={handleGlobalSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Value
                        <SortButton column="value" currentSort={globalSortConfig} onSort={handleGlobalSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Category
                        <SortButton column="category" currentSort={globalSortConfig} onSort={handleGlobalSort} />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalStatsTable.map((stat, index) => (
                    <TableRow key={index} className="hover:bg-blue-50/50">
                      <TableCell className="font-medium">{stat.metric}</TableCell>
                      <TableCell className="font-semibold text-blue-700">{stat.value}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          stat.category === 'Network' ? 'bg-green-100 text-green-800' :
                          stat.category === 'Console' ? 'bg-red-100 text-red-800' :
                          stat.category === 'Auth' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {stat.category}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {globalStatsTable.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        No statistics available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="domain" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Layers className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Smart Domain Grouping</h4>
                  <p className="text-xs text-blue-700">
                    Domains are intelligently grouped by tab context and subdomain patterns. 
                    <Layers className="h-3 w-3 inline mx-1" /> indicates grouped subdomains, 
                    <Monitor className="h-3 w-3 inline mx-1" /> shows main tab domains.
                    Hover for details.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Domain
                        <SortButton column="domain" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Requests
                        <SortButton column="totalRequests" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Errors
                        <SortButton column="errors" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Tokens
                        <SortButton column="tokens" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Success Rate
                        <SortButton column="successRate" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Avg Response
                        <SortButton column="avgResponseTime" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        Last Activity
                        <SortButton column="lastSeen" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDomainStats.map((stat, index) => (
                    <React.Fragment key={index}>
                      <TableRow className="hover:bg-blue-50/50">
                        <TableCell className="font-medium max-w-[300px]" title={
                          stat.isGrouped ? 
                            `${stat.domain} (Service group with ${stat.groupedDomains.length} domains: ${stat.groupedDomains.join(', ')})` :
                            `${stat.domain}${stat.tabContext?.primaryTabUrl ? ` - Tab: ${stat.tabContext.primaryTabUrl}` : ''}`
                        }>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {stat.isGrouped && (
                                <button
                                  onClick={() => toggleDomainExpansion(stat.domain)}
                                  className="p-0.5 hover:bg-gray-100 rounded"
                                  title={expandedDomains.has(stat.domain) ? "Collapse grouped domains" : "Expand grouped domains"}
                                >
                                  {expandedDomains.has(stat.domain) ? 
                                    <ChevronDown className="h-3 w-3" /> : 
                                    <ChevronRight className="h-3 w-3" />
                                  }
                                </button>
                              )}
                              <span className="truncate font-semibold">{stat.domain}</span>
                              {stat.tabContext?.isMainDomain && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Primary domain for tab">
                                  <Monitor className="h-3 w-3 mr-1" />
                                  Main
                                </span>
                              )}
                              {stat.isGrouped && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={`Grouped from: ${stat.groupedDomains.join(', ')}`}>
                                  <Layers className="h-3 w-3 mr-1" />
                                  {stat.groupedDomains.length}
                                </span>
                              )}
                              {stat.tabContext?.tabIds && stat.tabContext.tabIds.length > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title={`Active in ${stat.tabContext.tabIds.length} tabs`}>
                                  {stat.tabContext.tabIds.length}T
                                </span>
                              )}
                            </div>
                            {/* Show primary tab URL when available */}
                            {stat.tabContext?.primaryTabUrl && (
                              <div className="text-xs text-gray-500 truncate max-w-[280px]" title={stat.tabContext.primaryTabUrl}>
                                {stat.tabContext.primaryTabUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </div>
                            )}
                          </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-700">{stat.totalRequests}</TableCell>
                      <TableCell className="font-semibold text-red-700">{stat.errors}</TableCell>
                      <TableCell className="font-semibold text-yellow-700">{stat.tokens}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          stat.successRate >= 90 ? 'bg-green-100 text-green-800' :
                          stat.successRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stat.successRate}%
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700">
                        {stat.avgResponseTime > 0 ? `${stat.avgResponseTime}ms` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[150px] truncate" title={new Date(stat.lastSeen).toLocaleString()}>
                        {new Date(stat.lastSeen).toLocaleString()}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded grouped domains with stats */}
                    {stat.isGrouped && expandedDomains.has(stat.domain) && stat.subdomainStats.map((subStat, subIndex: number) => (
                      <TableRow key={`${index}-${subIndex}`} className="bg-blue-50/30 border-l-2 border-l-blue-200">
                        <TableCell className="pl-8 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-500">└─</span>
                            <span>{subStat.domain}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-green-600">{subStat.requests}</TableCell>
                        <TableCell className="text-sm font-medium text-red-600">{subStat.errors}</TableCell>
                        <TableCell className="text-sm font-medium text-yellow-600">{subStat.tokens}</TableCell>
                        <TableCell className="text-sm">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            subStat.successRate >= 90 ? 'bg-green-100 text-green-700' :
                            subStat.successRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {subStat.successRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-blue-600">
                          {subStat.avgResponseTime > 0 ? `${subStat.avgResponseTime}ms` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">-</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                  ))}
                  {sortedDomainStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No domain statistics available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;
