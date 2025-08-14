// Local types for domain analysis utility
export interface NetworkRequest {
  id?: string;
  method: string;
  url: string;
  status: number;
  timestamp: number;
  payload_size?: number;
  response_time?: number;
  headers?: string | object;
  request_body?: string | object;
  response_body?: string | object;
  tab_id?: number;
  main_domain?: string;
}

export interface ConsoleError {
  id?: string;
  message: string;
  url: string;
  severity: 'error' | 'warn' | 'info';
  timestamp: number;
  stack_trace?: string;
  tab_id?: number;
  main_domain?: string;
}

export interface TokenEvent {
  id?: string;
  type: string;
  url: string;
  method?: string;
  status?: number;
  value_hash?: string;
  expiry?: number;
  timestamp: number;
  source_url: string;
  tab_id?: number;
  main_domain?: string;
}
