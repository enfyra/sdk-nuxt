export interface EnfyraConfig {
  apiUrl: string;
  defaultHeaders?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
  response?: any;
}

export interface BatchProgress {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Number of completed operations */
  completed: number;
  /** Total number of operations */
  total: number;
  /** Number of failed operations */
  failed: number;
  /** Number of operations currently in progress */
  inProgress: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Average time per operation in milliseconds */
  averageTime?: number;
  /** Current batch being processed */
  currentBatch: number;
  /** Total number of batches */
  totalBatches: number;
  /** Processing speed (operations per second) */
  operationsPerSecond?: number;
  /** Detailed results array for completed operations */
  results: Array<{
    index: number;
    status: 'completed' | 'failed';
    result?: any;
    error?: ApiError;
    duration?: number;
  }>;
}

interface BaseApiOptions<T> {
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  errorContext?: string;
  onError?: (error: ApiError, context?: string) => void;
  disableBatch?: boolean;
  default?: () => T;
  /** Enable SSR with useFetch instead of $fetch */
  ssr?: boolean;
  /** Unique key for useFetch caching */
  key?: string;
  /** Whether to fetch on server (default: true) - Only applies when ssr: true */
  server?: boolean;
  /** Don't block navigation (default: false) - Only applies when ssr: true */
  lazy?: boolean;
  /** Execute immediately (default: true) - Only applies when ssr: true */
  immediate?: boolean;
  /** Transform the response data - Only applies when ssr: true */
  transform?: (data: any) => T;
  /** Pick specific fields from response - Only applies when ssr: true */
  pick?: string[];
  /** Watch reactive sources and refetch when they change - Only applies when ssr: true */
  watch?: any[];
  /** Deep watch (default: false) - Only applies when ssr: true */
  deep?: boolean;
  /** Custom cache data retrieval function - Only applies when ssr: true */
  getCachedData?: (key: string) => T | null;
  /** Enable refresh (default: true) - Only applies when ssr: true */
  refresh?: boolean;
  /** Auto refresh interval in milliseconds - Only applies when ssr: true */
  refreshInterval?: number;
  /** Deduplication key - Only applies when ssr: true */
  dedupe?: string;
}

interface BatchApiOptions {
  /** Batch size for chunking large operations (default: no limit) - Only available for batch operations */
  batchSize?: number;
  /** Maximum concurrent requests (default: no limit) - Only available for batch operations */
  concurrent?: number;
  /** Real-time progress callback for batch operations - Only available for batch operations */
  onProgress?: (progress: BatchProgress) => void;
}

type ConditionalBatchOptions<T> = T extends { method?: 'patch' | 'delete' | 'PATCH' | 'DELETE' }
  ? BatchApiOptions
  : T extends { method?: 'post' | 'POST' }
  ? BatchApiOptions  // POST supports file batch uploads
  : T extends { method?: undefined } // Default method is 'get', but could be overridden at execution
  ? Partial<BatchApiOptions>  // Allow batch options but make them optional since method could change
  : {};

export type ApiOptions<T> = BaseApiOptions<T> & ConditionalBatchOptions<BaseApiOptions<T>>;

export interface BackendError {
  success: false;
  message: string;
}

export interface BackendErrorExtended extends BackendError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
    correlationId?: string;
  };
}

import type { Ref } from 'vue';
import type { AsyncData } from 'nuxt/app';

export interface UseEnfyraApiSSRReturn<T> extends Omit<AsyncData<T | null, ApiError>, 'pending' | 'error'> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<ApiError | null>; // Use null instead of undefined for consistency
  refresh: () => Promise<void>;
  // Keep pending for backward compatibility, but it's an alias of loading
  pending?: Ref<boolean>;
}

interface BaseExecuteOptions {
  body?: any;
  id?: string | number;
  query?: Record<string, any>;
}

interface BatchExecuteOptions {
  ids?: (string | number)[];
  /** Array of FormData objects for batch upload */
  files?: FormData[];
  /** Override batch size for this specific execution */
  batchSize?: number;
  /** Override concurrent limit for this specific execution */
  concurrent?: number;
  /** Override progress callback for this specific execution */
  onProgress?: (progress: BatchProgress) => void;
}

type ConditionalExecuteOptions<T> = T extends { ids: any }
  ? BatchExecuteOptions // If ids provided, enable all batch options
  : T extends { files: any }
  ? BatchExecuteOptions // If files provided, enable all batch options  
  : BaseExecuteOptions & Partial<BatchExecuteOptions>; // Otherwise base options + optional batch options

export type ExecuteOptions = BaseExecuteOptions & BatchExecuteOptions;

export interface UseEnfyraApiClientReturn<T> {
  data: Ref<T | null>;
  error: Ref<ApiError | null>;
  pending: Ref<boolean>;
  execute: (executeOpts?: ExecuteOptions) => Promise<T | T[] | null>;
}


export * from './auth';

