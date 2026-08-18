import type { WebSocketTransport } from '@enfyra/sdk-core';

export interface UseWebSocketOptions {
  baseUrl?: string;
  immediate?: boolean;
  path?: string;
  namespacePrefix?: string;
  withCredentials?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  reconnectDelayMax?: number;
  transports?: WebSocketTransport[];
  upgrade?: boolean;
}

export interface StorageUploadOptions {
  folder?: number | string;
  title?: string;
  description?: string;
  storageConfig?: number | string;
  uploadId?: string;
}
