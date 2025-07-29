// src/dashboard/dashboard.tsx
// This file contains the React component for the Chrome extension dashboard.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface DashboardData {
  totalTabs: number;
  extensionEnabled: boolean;
  lastActivity: string;
  networkRequests: any[];
  totalRequests: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    totalTabs: 0,
    extensionEnabled: true,
    lastActivity: 'Never',
    networkRequests: [],
    totalRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get tabs count
      const tabs = await chrome.tabs.query({});
      
      // Get storage data
      const storageData = await chrome.storage.sync.get(['extensionEnabled', 'lastActivity']);
      
      // Get network requests from background storage
      const networkData = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getNetworkRequests', limit: 50 }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Dashboard: Error getting network requests:', chrome.runtime.lastError);
            resolve({ requests: [], total: 0 });
          } else {
            resolve(response || { requests: [], total: 0 });
          }
        });
      });
      
      setData({
        totalTabs: tabs.length,
        extensionEnabled: storageData.extensionEnabled ?? true,
        lastActivity: storageData.lastActivity 
          ? new Date(storageData.lastActivity).toLocaleString()
          : 'Never',
        networkRequests: networkData.requests || [],
        totalRequests: networkData.total || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Web App Monitor Dashboard</h1>
              <p className="text-gray-600">Monitor and analyze your client-side web applications</p>
            </div>
            <button
              onClick={refreshData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tabs</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalTabs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  data.extensionEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white font-bold">
                    {data.extensionEnabled ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Extension Status</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.extensionEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🕒</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Last Activity</p>
                <p className="text-sm font-semibold text-gray-900">{data.lastActivity}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🌐</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Network Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{data.totalRequests}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Network Requests Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Network Requests</h2>
              <span className="text-sm text-gray-500">Last 50 requests</span>
            </div>
            
            {data.networkRequests.length > 0 ? (
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          URL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.networkRequests.slice(0, 10).map((request, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                              request.method === 'POST' ? 'bg-green-100 text-green-800' :
                              request.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              request.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.method}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs" title={request.url}>
                              {request.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status >= 200 && request.status < 300 ? 'bg-green-100 text-green-800' :
                              request.status >= 300 && request.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                              request.status >= 400 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.payload_size ? `${Math.round(request.payload_size / 1024)}KB` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {data.networkRequests.length > 10 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Showing 10 of {data.networkRequests.length} requests
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🌐</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No network requests yet</h3>
                <p className="text-gray-500">Network requests will appear here as they are captured.</p>
              </div>
            )}
          </div>
        </div>

        {/* Feature Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Analyze Current Tab
                </button>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Export Data
                </button>
                <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors">
                  Clear Cache
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Extension activated</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Settings updated</p>
                    <p className="text-xs text-gray-500">5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Data exported</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const container = document.getElementById('dashboard-root');
if (container) {
  const root = createRoot(container);
  root.render(<Dashboard />);
}