import { ref } from 'vue';
import type { EnfyraConfig } from '../types';

const config = ref<EnfyraConfig>({
  apiUrl: '',
  defaultHeaders: {}
});

export function useEnfyraConfig() {
  const setConfig = (newConfig: Partial<EnfyraConfig>) => {
    const normalizedConfig = { ...newConfig };

    if (typeof normalizedConfig.apiUrl === 'string') {
      normalizedConfig.apiUrl = normalizedConfig.apiUrl.replace(/\/+$/, '');
    }

    config.value = { ...config.value, ...normalizedConfig };
  };

  const getConfig = () => config.value;

  return {
    setConfig,
    getConfig
  };
}

export { config };