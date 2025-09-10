// Shared TypeScript types for the dashboard
export interface DashboardData {
  totalTabs: number;
  extensionEnabled: boolean;
  lastActivity: string;
  networkRequests: NetworkRequest[];
  totalRequests: number;
  consoleErrors: ConsoleError[];
  totalErrors: number;
  tokenEvents: TokenEvent[];
  totalTokenEvents: number;
}

export interface NetworkRequest {
  id?: number; // Database auto-increment ID for deletion
  method: string;
  url: string;
  status: number;
  timestamp: string;
  payload_size?: number;
  response_time?: number;
  time_taken?: number;
  headers?: string | object;
  request_headers?: string | object;
  response_headers?: string | object;
  request_body?: string | object;
  response_body?: string | object;
  tab_id?: number;
}

export interface ConsoleError {
  id: string;
  message: string;
  url?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warn' | 'info';
  timestamp: string;
  stack_trace?: string;
  stack?: string;
  tab_id?: number;
}

export interface TokenEvent {
  id?: string;
  type: string;
  token_type?: string;
  url: string;
  method?: string;
  status?: number;
  valueHash?: string;
  expiry?: number;
  timestamp: string;
  headers?: string | object;
  request_body?: string | object;
  response_body?: string | object;
  tab_id?: number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TabLoggingStatus {
  tabId: number;
  url: string;
  title: string;
  domain: string;
  networkLogging: boolean;
  errorLogging: boolean;
  tokenLogging: boolean;
  favicon?: string;
}

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface FilterConfig {
  searchTerm: string;
  [key: string]: any;
}
