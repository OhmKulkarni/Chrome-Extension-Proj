const fs = require('fs');
const path = require('path');

const fixes = [
  ['src/background/background-controller.ts', 'const totalStartupTime =', 'const _totalStartupTime ='],
  ['src/background/background-controller.ts', 'const memoryUsage =', 'const _memoryUsage ='],
  ['src/background/indexeddb-storage.ts', 'const avg =', 'const _avg ='],
  ['src/background/indexeddb-storage.ts', 'const initialCounts =', 'const _initialCounts ='],
  ['src/background/indexeddb-storage.ts', 'const finalCounts =', 'const _finalCounts ='],
  ['src/background/indexeddb-storage.ts', 'const count =', 'const _count ='],
  ['src/background/services/unified-permission-service.ts', 'const domain =', 'const _domain ='],
  ['src/background/shared/chrome-api.module.ts', 'const duration =', 'const _duration ='],
  ['src/content/content-modular.ts', 'const stats =', 'const _stats ='],
  ['src/content/content-modular.ts', 'const data =', 'const _data ='],
  ['src/content/content-modular.ts', 'xhr.onerror = (error)', 'xhr.onerror = (_error)'],
  ['src/content/modules/shared-infrastructure.module.ts', 'const response =', 'const _response ='],
  ['src/content/modules/shared-infrastructure.module.ts', 'const settings =', 'const _settings ='],
  ['src/dashboard/components/domainUtils.ts', 'trackTabDomain: (tabId:', 'trackTabDomain: (_tabId:'],
  ['src/dashboard/components/domainUtils.ts', 'const requestDomain =', 'const _requestDomain ='],
  ['src/dashboard/components/domainUtils.ts', 'const tabDomain =', 'const _tabDomain ='],
  ['src/dashboard/components/timeline/test-import.ts', 'import TimelineHeader', 'import _TimelineHeader'],
  ['src/dashboard/lib/DashboardUpdateManager.ts', 'private async performUpdate(reason:', 'private async performUpdate(_reason:']
];

let totalFixed = 0;

console.log('🔧 Fixing unused variables...');

fixes.forEach(([file, oldPattern, newPattern]) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    content = content.replace(oldPattern, newPattern);

    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ ${file}: ${oldPattern} → ${newPattern}`);
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

// Handle the special case of multiple fullData variables in decomposed-dashboard.tsx
try {
  let content = fs.readFileSync('src/dashboard/decomposed-dashboard.tsx', 'utf8');
  const originalContent = content;

  // Replace all instances of 'const fullData =' with 'const _fullData ='
  content = content.replace(/const fullData =/g, 'const _fullData =');

  if (content !== originalContent) {
    fs.writeFileSync('src/dashboard/decomposed-dashboard.tsx', content, 'utf8');
    console.log(`✅ src/dashboard/decomposed-dashboard.tsx: const fullData = → const _fullData =`);
    totalFixed++;
  }
} catch (error) {
  console.error(`❌ Error fixing decomposed-dashboard.tsx:`, error.message);
}

console.log(`\n📊 Fixed ${totalFixed} unused variables`);
