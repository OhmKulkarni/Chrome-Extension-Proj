// src/popup/components/PopupTabs.tsx
// Tab system to compare old vs new popup implementation
import React, { useState } from 'react';
import { Button } from './ui/button';
import UnifiedPopup from './UnifiedPopup';
import LegacyPopupWrapper from './LegacyPopupWrapper';

const PopupTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'unified' | 'legacy'>('unified');

  return (
    <div className="w-80">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <Button
          variant={activeTab === 'unified' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('unified')}
          className="flex-1 rounded-b-none"
        >
          🚀 Unified System
        </Button>
        <Button
          variant={activeTab === 'legacy' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('legacy')}
          className="flex-1 rounded-b-none"
        >
          📋 Legacy System
        </Button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'unified' ? (
          <div>
            <div className="text-xs bg-green-100 text-green-800 p-2 rounded mb-4">
              ✨ <strong>Phase 3:</strong> Uses UnifiedPermissionManager with single chrome.storage.local source
            </div>
            <UnifiedPopup />
          </div>
        ) : (
          <div>
            <div className="text-xs bg-yellow-100 text-yellow-800 p-2 rounded mb-4">
              🔧 <strong>Legacy:</strong> Uses mixed storage (chrome.storage.local + IndexedDB + ChromeSync)
            </div>
            <LegacyPopupWrapper />
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupTabs;
