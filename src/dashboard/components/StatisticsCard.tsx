import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { ArrowUpDown, BarChart3, TrendingUp } from 'lucide-react';

interface StatisticsCardProps {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
}

interface GlobalStats {
  totalRequests: number;
  totalErrors: number;
  totalTokenEvents: number;
  requestsByMethod: { [method: string]: number };
  errorsBySeverity: { [severity: string]: number };
  tokensByType: { [type: string]: number };
  avgResponseTime: number;
  successRate: number;
}

interface DomainStats {
  domain: string;
  requests: number;
  errors: number;
  tokens: number;
  successRate: number;
  avgResponseTime: number;
  lastActivity: string;
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
    key: 'requests',
    direction: 'desc'
  });

  // Calculate global statistics
  const globalStats: GlobalStats = useMemo(() => {
    const totalRequests = networkRequests.length;
    const totalErrors = consoleErrors.length;
    const totalTokenEvents = tokenEvents.length;

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

    // Calculate average response time
    const responseTimes = networkRequests
      .map(req => req.response_time || req.responseTime)
      .filter(time => time && typeof time === 'number');
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
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
      requestsByMethod,
      errorsBySeverity,
      tokensByType,
      avgResponseTime,
      successRate
    };
  }, [networkRequests, consoleErrors, tokenEvents]);

  // Calculate domain-specific statistics
  const domainStats: DomainStats[] = useMemo(() => {
    const domainMap = new Map<string, {
      requests: any[];
      errors: any[];
      tokens: any[];
    }>();

    // Group network requests by domain
    networkRequests.forEach(req => {
      const url = req.url || req.request_url || '';
      try {
        const domain = new URL(url).hostname || 'unknown';
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { requests: [], errors: [], tokens: [] });
        }
        domainMap.get(domain)!.requests.push(req);
      } catch {
        const domain = 'invalid-url';
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { requests: [], errors: [], tokens: [] });
        }
        domainMap.get(domain)!.requests.push(req);
      }
    });

    // Group console errors by domain (if available)
    consoleErrors.forEach(error => {
      const url = error.source_url || error.url || '';
      try {
        const domain = url ? new URL(url).hostname : 'unknown';
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { requests: [], errors: [], tokens: [] });
        }
        domainMap.get(domain)!.errors.push(error);
      } catch {
        const domain = 'unknown';
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { requests: [], errors: [], tokens: [] });
        }
        domainMap.get(domain)!.errors.push(error);
      }
    });

    // Group token events by domain
    tokenEvents.forEach(token => {
      const url = token.url || token.source_url || '';
      try {
        const domain = url ? new URL(url).hostname : 'unknown';
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { requests: [], errors: [], tokens: [] });
        }
        domainMap.get(domain)!.tokens.push(token);
      } catch {
        const domain = 'unknown';
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { requests: [], errors: [], tokens: [] });
        }
        domainMap.get(domain)!.tokens.push(token);
      }
    });

    // Convert to array and calculate stats
    return Array.from(domainMap.entries()).map(([domain, data]) => {
      const requests = data.requests.length;
      const errors = data.errors.length;
      const tokens = data.tokens.length;

      // Calculate success rate for this domain
      const successfulRequests = data.requests.filter(req => {
        const status = req.status || req.response_status;
        return status >= 200 && status < 400;
      }).length;
      const successRate = requests > 0 ? Math.round((successfulRequests / requests) * 100) : 0;

      // Calculate average response time for this domain
      const responseTimes = data.requests
        .map(req => req.response_time || req.responseTime)
        .filter(time => time && typeof time === 'number');
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0;

      // Get last activity timestamp
      const allTimestamps = [
        ...data.requests.map(r => r.timestamp),
        ...data.errors.map(e => e.timestamp),
        ...data.tokens.map(t => t.timestamp)
      ].filter(Boolean);
      
      const lastActivity = allTimestamps.length > 0 
        ? new Date(Math.max(...allTimestamps.map(t => new Date(t).getTime()))).toLocaleString()
        : 'Never';

      return {
        domain,
        requests,
        errors,
        tokens,
        successRate,
        avgResponseTime,
        lastActivity
      };
    }).filter(stat => stat.requests > 0 || stat.errors > 0 || stat.tokens > 0);
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

  // Prepare sorted global stats for table
  const globalStatsTable = useMemo(() => {
    const stats = [
      { metric: 'Total Requests', value: globalStats.totalRequests, category: 'Network' },
      { metric: 'Total Errors', value: globalStats.totalErrors, category: 'Console' },
      { metric: 'Total Token Events', value: globalStats.totalTokenEvents, category: 'Auth' },
      { metric: 'Average Response Time', value: `${globalStats.avgResponseTime}ms`, category: 'Performance' },
      { metric: 'Success Rate', value: `${globalStats.successRate}%`, category: 'Performance' },
      ...Object.entries(globalStats.requestsByMethod).map(([method, count]) => ({
        metric: `${method} Requests`,
        value: count,
        category: 'Network'
      })),
      ...Object.entries(globalStats.errorsBySeverity).map(([severity, count]) => ({
        metric: `${severity.toUpperCase()} Errors`,
        value: count,
        category: 'Console'
      })),
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
                        <SortButton column="requests" currentSort={domainSortConfig} onSort={handleDomainSort} />
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
                        <SortButton column="lastActivity" currentSort={domainSortConfig} onSort={handleDomainSort} />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDomainStats.map((stat, index) => (
                    <TableRow key={index} className="hover:bg-blue-50/50">
                      <TableCell className="font-medium max-w-[200px] truncate" title={stat.domain}>
                        {stat.domain}
                      </TableCell>
                      <TableCell className="font-semibold text-green-700">{stat.requests}</TableCell>
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
                      <TableCell className="text-sm text-gray-600 max-w-[150px] truncate" title={stat.lastActivity}>
                        {stat.lastActivity}
                      </TableCell>
                    </TableRow>
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
