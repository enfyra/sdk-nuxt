export interface UseWebSocketOptions {
  baseUrl?: string;
  immediate?: boolean;
}

export interface StorageUploadOptions {
  folder?: number | string;
  title?: string;
  description?: string;
  storageConfig?: number | string;
  uploadId?: string;
}
