import { useRuntimeConfig } from "#imports";
import { getAppUrl, normalizeUrl } from "../utils/url";
import { ENFYRA_API_PREFIX } from "../constants/config";

export interface UseEnfyraReturn {
  baseUrl: string;
  apiPrefix: string;
}

export function useEnfyra(): UseEnfyraReturn {
  const config = useRuntimeConfig().public.enfyraSDK;
  const appUrl = getAppUrl();
  const apiPrefix = config?.apiPrefix || ENFYRA_API_PREFIX;
  const baseUrl = normalizeUrl(appUrl, apiPrefix);

  return {
    baseUrl,
    apiPrefix,
  };
}

