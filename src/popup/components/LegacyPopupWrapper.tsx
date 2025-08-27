// src/popup/components/LegacyPopupWrapper.tsx
// Wrapper for the existing popup functionality
import React from 'react';

const LegacyPopupWrapper: React.FC = () => {
  return (
    <div className="text-center p-8">
      <div className="text-gray-500">
        <h3 className="font-medium mb-2">Legacy Popup</h3>
        <p className="text-sm">
          This would show the original popup.tsx content.<br/>
          Currently preserved for comparison.
        </p>
        <p className="text-xs mt-4 bg-gray-100 p-2 rounded">
          To use legacy popup, set the main popup.tsx to render the original component
        </p>
      </div>
    </div>
  );
};

export default LegacyPopupWrapper;
