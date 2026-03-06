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
  progress: number;
  completed: number;
  total: number;
  failed: number;
  inProgress: number;
  estimatedTimeRemaining?: number;
  averageTime?: number;
  currentBatch: number;
  totalBatches: number;
  operationsPerSecond?: number;
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
  ssr?: boolean;
  key?: string;
  server?: boolean;
  lazy?: boolean;
  immediate?: boolean;
  transform?: (data: any) => T;
  pick?: string[];
  watch?: any[];
  deep?: boolean;
  getCachedData?: (key: string) => T | null;
  refresh?: boolean;
  refreshInterval?: number;
  dedupe?: string;
  cache?: RequestCache;
}

interface BatchApiOptions {
  batchSize?: number;
  concurrent?: number;
  onProgress?: (progress: BatchProgress) => void;
}

type ConditionalBatchOptions<T> = T extends { method?: 'patch' | 'delete' | 'PATCH' | 'DELETE' }
  ? BatchApiOptions
  : T extends { method?: 'post' | 'POST' }
  ? BatchApiOptions
  : T extends { method?: undefined }
  ? Partial<BatchApiOptions>
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
  error: Ref<ApiError | null>;
  refresh: () => Promise<void>;
  pending?: Ref<boolean>;
}

interface BaseExecuteOptions {
  body?: any;
  id?: string | number;
  query?: Record<string, any>;
}

interface BatchExecuteOptions {
  ids?: (string | number)[];
  files?: FormData[];
  batchSize?: number;
  concurrent?: number;
  onProgress?: (progress: BatchProgress) => void;
}

type ConditionalExecuteOptions<T> = T extends { ids: any }
  ? BatchExecuteOptions
  : T extends { files: any }
  ? BatchExecuteOptions
  : BaseExecuteOptions & Partial<BatchExecuteOptions>;

export type ExecuteOptions = BaseExecuteOptions & BatchExecuteOptions;

export interface UseEnfyraApiClientReturn<T> {
  data: Ref<T | null>;
  error: Ref<ApiError | null>;
  pending: Ref<boolean>;
  execute: (executeOpts?: ExecuteOptions) => Promise<T | T[] | null>;
}


export * from './auth';

