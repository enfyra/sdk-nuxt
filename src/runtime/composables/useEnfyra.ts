import { useNuxtApp } from '#app';
import type { EnfyraClient } from '@enfyra/sdk-core';

export function useEnfyra(): EnfyraClient {
  return useNuxtApp().$enfyra;
}
