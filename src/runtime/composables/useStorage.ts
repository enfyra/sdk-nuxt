import { readonly, ref } from 'vue';
import type { FileRecord, FolderNode } from '@enfyra/sdk-core';
import type { StorageUploadOptions } from '../types';
import { useEnfyra } from './useEnfyra';

export function useStorage() {
  const client = useEnfyra();
  const uploading = ref(false);

  const upload = async (
    file: File | Blob,
    options?: StorageUploadOptions,
  ): Promise<FileRecord | null> => {
    if (import.meta.server) return null;
    uploading.value = true;
    try {
      return await client.storage.upload({ file, ...options });
    } catch {
      return null;
    } finally {
      uploading.value = false;
    }
  };

  const download = (fileId: number | string): Promise<Blob | null> => {
    return client.storage.download(fileId).catch(() => null);
  };

  const getDownloadUrl = (fileId: number | string): string => {
    return client.storage.getDownloadUrl(fileId);
  };

  const getFolderTree = async (): Promise<FolderNode[] | null> => {
    try {
      return await client.storage.getFolderTree();
    } catch {
      return null;
    }
  };

  return {
    uploading: readonly(uploading),
    upload,
    download,
    getDownloadUrl,
    getFolderTree,
  };
}
