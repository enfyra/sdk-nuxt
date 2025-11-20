import { ref } from 'vue';
import type { EnfyraConfig } from '../types';

const config = ref<EnfyraConfig>({
  apiUrl: '',
  defaultHeaders: {}
});

export function useEnfyraConfig() {
  const setConfig = (newConfig: Partial<EnfyraConfig>) => {
    config.value = { ...config.value, ...newConfig };
  };

  const getConfig = () => config.value;

  return {
    setConfig,
    getConfig
  };
}

export { config };