// lib/DashboardUpdateManager.ts - Decoupled dashboard updates
import { InterceptionEventBus } from './InterceptionManager';
import { StorageEventBus, UnifiedStorageManager } from './StorageManager';

export interface DashboardState {
  networkRequests: any[];
  consoleErrors: any[];
  tokenEvents: any[];
  totalRequests: number;
  totalErrors: number;
  totalTokenEvents: number;
  lastUpdate: string;
  loading: boolean;
}

export type DashboardUpdateCallback = (state: Partial<DashboardState>) => void;

// Dashboard Update Manager - Coordinates all updates without tight coupling
export class DashboardUpdateManager {
  private interceptionBus: InterceptionEventBus;
  private storageBus: StorageEventBus;
  private storageManager: UnifiedStorageManager;
  private updateCallbacks: Set<DashboardUpdateCallback> = new Set();
  private currentState: DashboardState;
  private updateThrottle: number = 1000; // 1 second throttle
  private lastUpdateTime: number = 0;
  private pendingUpdate: number | null = null;

  constructor(interceptionBus: InterceptionEventBus, storageManager: UnifiedStorageManager) {
    this.interceptionBus = interceptionBus;
    this.storageBus = storageManager.events;
    this.storageManager = storageManager;
    
    this.currentState = {
      networkRequests: [],
      consoleErrors: [],
      tokenEvents: [],
      totalRequests: 0,
      totalErrors: 0,
      totalTokenEvents: 0,
      lastUpdate: new Date().toISOString(),
      loading: false
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for new data being captured
    this.interceptionBus.subscribe('network_request_captured', () => {
      this.scheduleUpdate('network_request_added');
    });

    this.interceptionBus.subscribe('console_error_captured', () => {
      this.scheduleUpdate('console_error_added');
    });

    this.interceptionBus.subscribe('token_event_detected', () => {
      this.scheduleUpdate('token_event_added');
    });

    // Listen for storage events
    this.storageBus.subscribe('network_request_stored', () => {
      this.scheduleUpdate('network_data_updated');
    });

    this.storageBus.subscribe('console_error_stored', () => {
      this.scheduleUpdate('error_data_updated');
    });

    this.storageBus.subscribe('token_event_stored', () => {
      this.scheduleUpdate('token_data_updated');
    });

    // Listen for data clearing
    this.storageBus.subscribe('all_data_cleared', () => {
      this.handleDataCleared();
    });

    this.storageBus.subscribe('network_requests_cleared', () => {
      this.updateState({ networkRequests: [], totalRequests: 0 });
    });

    this.storageBus.subscribe('console_errors_cleared', () => {
      this.updateState({ consoleErrors: [], totalErrors: 0 });
    });

    this.storageBus.subscribe('token_events_cleared', () => {
      this.updateState({ tokenEvents: [], totalTokenEvents: 0 });
    });
  }

  public subscribe(callback: DashboardUpdateCallback): () => void {
    this.updateCallbacks.add(callback);

    // Send current state immediately
    callback(this.currentState);

    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  private scheduleUpdate(reason: string): void {
    const now = Date.now();
    
    // Clear any pending update
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate);
    }

    // If enough time has passed, update immediately
    if (now - this.lastUpdateTime >= this.updateThrottle) {
      this.performUpdate(reason);
    } else {
      // Schedule update for later
      const delay = this.updateThrottle - (now - this.lastUpdateTime);
      this.pendingUpdate = setTimeout(() => {
        this.performUpdate(reason);
      }, delay);
    }
  }

  private async performUpdate(reason: string): Promise<void> {
    console.log(`📊 DashboardUpdateManager: Performing update (${reason})`);
    
    this.lastUpdateTime = Date.now();
    this.pendingUpdate = null;

    try {
      this.updateState({ loading: true });

      // Get fresh data counts without fetching full data
      const [networkResult, errorsResult, tokensResult] = await Promise.all([
        this.storageManager.network.getPage(1, 1), // Just get count
        this.storageManager.errors.getPage(1, 1),   // Just get count
        this.storageManager.tokens.getPage(1, 1)    // Just get count
      ]);

      // Update only the counts and last update time
      this.updateState({
        totalRequests: networkResult.total,
        totalErrors: errorsResult.total,
        totalTokenEvents: tokensResult.total,
        lastUpdate: new Date().toISOString(),
        loading: false
      });

    } catch (error) {
      console.error('Dashboard update error:', error);
      this.updateState({ 
        loading: false,
        lastUpdate: new Date().toISOString()
      });
    }
  }

  private updateState(newState: Partial<DashboardState>): void {
    this.currentState = { ...this.currentState, ...newState };
    
    // Notify all subscribers
    this.updateCallbacks.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('Dashboard callback error:', error);
      }
    });
  }

  private handleDataCleared(): void {
    this.updateState({
      networkRequests: [],
      consoleErrors: [],
      tokenEvents: [],
      totalRequests: 0,
      totalErrors: 0,
      totalTokenEvents: 0,
      lastUpdate: new Date().toISOString()
    });
  }

  // Public API for dashboard components
  public async refreshPage(page: number, limit: number, type: 'network' | 'errors' | 'tokens'): Promise<any> {
    try {
      this.updateState({ loading: true });

      let result;
      switch (type) {
        case 'network':
          result = await this.storageManager.network.getPage(page, limit);
          this.updateState({
            networkRequests: result.items,
            totalRequests: result.total,
            loading: false
          });
          break;
        
        case 'errors':
          result = await this.storageManager.errors.getPage(page, limit);
          this.updateState({
            consoleErrors: result.items,
            totalErrors: result.total,
            loading: false
          });
          break;
        
        case 'tokens':
          result = await this.storageManager.tokens.getPage(page, limit);
          this.updateState({
            tokenEvents: result.items,
            totalTokenEvents: result.total,
            loading: false
          });
          break;
      }

      return result;
    } catch (error) {
      this.updateState({ loading: false });
      throw error;
    }
  }

  public async clearAllData(): Promise<{ success: boolean; errors: string[] }> {
    this.updateState({ loading: true });
    
    try {
      const result = await this.storageManager.clearAll();
      this.updateState({ loading: false });
      return result;
    } catch (error) {
      this.updateState({ loading: false });
      throw error;
    }
  }

  public getCurrentState(): DashboardState {
    return { ...this.currentState };
  }

  public destroy(): void {
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate);
    }
    this.updateCallbacks.clear();
  }
}
