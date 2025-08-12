// Comprehensive Zero Overhead Verification Script
// Run this in the browser console on any page with the extension loaded

console.log('🔍 Starting comprehensive zero overhead verification...');

function verifyZeroOverhead() {
    const debug = window.__webAppMonitorDebug;
    
    if (!debug) {
        console.error('❌ Extension debug interface not available');
        return;
    }
    
    console.log('📊 PHASE 1: Initial State Check');
    const initialState = debug.getInterceptionState();
    console.log('Initial state:', initialState);
    
    console.log('\n🛑 PHASE 2: Stopping All Interception');
    debug.stopAll();
    
    setTimeout(() => {
        const stoppedState = debug.getInterceptionState();
        console.log('Stopped state:', stoppedState);
        
        // Critical check: Are console methods actually unwrapped?
        const isConsoleWrapped = stoppedState.consoleWrapped;
        const isAnyActive = debug.isAnyActive();
        
        console.log(`\n🎯 ZERO OVERHEAD VERIFICATION:`);
        console.log(`   Console wrapped: ${isConsoleWrapped ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
        console.log(`   Any active: ${isAnyActive ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
        
        if (!isConsoleWrapped && !isAnyActive) {
            console.log('✅ ZERO OVERHEAD ACHIEVED!');
        } else {
            console.log('❌ ZERO OVERHEAD NOT ACHIEVED');
        }
        
        console.log('\n⚡ PHASE 3: Performance Test (Disabled State)');
        
        // Test console performance when disabled
        const iterations = 10000;
        const originalLog = console.log;
        
        // Verify console.log is actually the original
        const isOriginal = console.log === window.__originalConsole.log;
        console.log(`Console.log is original: ${isOriginal ? '✅ YES' : '❌ NO'}`);
        
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            console.log(`Test ${i}`);
        }
        const disabledTime = performance.now() - start;
        
        console.log(`Disabled performance: ${disabledTime.toFixed(2)}ms for ${iterations} calls`);
        console.log(`Average: ${(disabledTime / iterations).toFixed(6)}ms per call`);
        
        console.log('\n🔄 PHASE 4: Enable Console and Test');
        debug.enableConsole();
        
        setTimeout(() => {
            const enabledState = debug.getInterceptionState();
            console.log('Enabled state:', enabledState);
            
            const enabledStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                console.log(`Enabled test ${i}`);
            }
            const enabledTime = performance.now() - enabledStart;
            
            console.log(`Enabled performance: ${enabledTime.toFixed(2)}ms for ${iterations} calls`);
            console.log(`Average: ${(enabledTime / iterations).toFixed(6)}ms per call`);
            
            const overhead = enabledTime - disabledTime;
            const overheadPercent = (overhead / disabledTime) * 100;
            
            console.log(`\n📈 OVERHEAD ANALYSIS:`);
            console.log(`   Overhead: ${overhead.toFixed(2)}ms (${overheadPercent.toFixed(1)}% increase)`);
            console.log(`   Expected: Some overhead when enabled (normal)`);
            
            console.log('\n🔄 PHASE 5: Disable Again and Verify');
            debug.disableConsole();
            
            setTimeout(() => {
                const finalState = debug.getInterceptionState();
                console.log('Final state:', finalState);
                
                const finalIsWrapped = finalState.consoleWrapped;
                const finalIsActive = debug.isAnyActive();
                
                console.log(`\n🎯 FINAL VERIFICATION:`);
                console.log(`   Console wrapped: ${finalIsWrapped ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
                console.log(`   Any active: ${finalIsActive ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
                console.log(`   Console.log is original: ${console.log === window.__originalConsole.log ? '✅ YES' : '❌ NO'}`);
                
                // Memory check
                if (performance.memory) {
                    const memory = performance.memory;
                    console.log(`\n💾 MEMORY USAGE:`);
                    console.log(`   Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`   Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
                }
                
                // Final verdict
                const isZeroOverhead = !finalIsWrapped && !finalIsActive && 
                                     console.log === window.__originalConsole.log;
                
                console.log(`\n${isZeroOverhead ? '🎉' : '💥'} FINAL RESULT: ZERO OVERHEAD ${isZeroOverhead ? 'VERIFIED ✅' : 'FAILED ❌'}`);
                
                if (isZeroOverhead) {
                    console.log('🎯 Perfect! When disabled, the extension has ZERO impact on console performance.');
                } else {
                    console.log('⚠️ Issue detected: Extension still has overhead when disabled.');
                }
                
            }, 100);
        }, 100);
    }, 100);
}

// Test network interception zero overhead
function verifyNetworkZeroOverhead() {
    const debug = window.__webAppMonitorDebug;
    
    if (!debug) {
        console.error('❌ Extension debug interface not available');
        return;
    }
    
    console.log('\n🌐 NETWORK ZERO OVERHEAD TEST');
    
    debug.disableNetwork();
    
    setTimeout(() => {
        const state = debug.getInterceptionState();
        console.log('Network disabled state:', state.networkEnabled);
        
        // Check if fetch is restored to original
        const isFetchOriginal = window.fetch === window.__originalFetch;
        console.log(`Fetch is original: ${isFetchOriginal ? '✅ YES' : '❌ NO'}`);
        
        // Quick performance test
        const start = performance.now();
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(fetch('data:text/plain,test'));
        }
        
        Promise.all(promises).then(() => {
            const duration = performance.now() - start;
            console.log(`Network disabled performance: ${duration.toFixed(2)}ms for 10 requests`);
            console.log(`Network zero overhead: ${isFetchOriginal ? '✅ VERIFIED' : '❌ FAILED'}`);
        });
    }, 100);
}

// Test cache performance
function verifyCachePerformance() {
    const debug = window.__webAppMonitorDebug;
    
    if (!debug) {
        console.error('❌ Extension debug interface not available');
        return;
    }
    
    console.log('\n🚀 CACHE PERFORMANCE TEST');
    
    debug.invalidateCache();
    
    const iterations = 1000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        debug.getCachedSetting('console');
    }
    
    const duration = performance.now() - start;
    console.log(`Cache performance: ${duration.toFixed(2)}ms for ${iterations} calls`);
    console.log(`Average: ${(duration / iterations).toFixed(4)}ms per call`);
}

// Run all tests
console.log('🚀 Starting comprehensive verification...');
verifyZeroOverhead();

setTimeout(() => {
    verifyNetworkZeroOverhead();
}, 2000);

setTimeout(() => {
    verifyCachePerformance();
}, 3000);
