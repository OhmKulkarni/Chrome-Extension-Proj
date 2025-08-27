// src/popup/enhanced-popup.tsx
// Enhanced popup using Unified Permission System (Phase 3)
import './popup.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupTabs from './components/PopupTabs';

const EnhancedPopup: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <PopupTabs />
    </div>
  );
};

// Mount the component
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<EnhancedPopup />);
} else {
  console.error('Root element not found');
}
