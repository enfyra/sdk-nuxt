/**
 * Type declarations for Nuxt auto-imports
 * These are provided at runtime by Nuxt but need declarations for TypeScript
 */

declare global {
  const useEnfyraApi: typeof import('../composables/useEnfyraApi').useEnfyraApi
  const useEnfyraAuth: typeof import('../composables/useEnfyraAuth').useEnfyraAuth
}

declare module '#imports' {
  export const useRuntimeConfig: () => {
    public: {
      enfyraSDK?: {
        apiUrl?: string;
        apiPrefix?: string;
        configError?: boolean;
        configErrorMessage?: string;
      };
    };
    [key: string]: any;
  };
  
  export const useRequestHeaders: (headers?: string[]) => Record<string, string | undefined>;
  
  export const useRequestURL: () => URL;
  
  export const useFetch: <T = any>(
    url: string | (() => string),
    options?: any
  ) => any;
  
  export const useNuxtApp: () => {
    payload: {
      data: Record<string, any>;
      [key: string]: any;
    };
    static: {
      data: Record<string, any>;
      [key: string]: any;
    };
    [key: string]: any;
  };
  
  export const defineNuxtPlugin: (plugin: any) => any;
  
  export const defineCachedEventHandler: (handler: any, options?: any) => any;
  
  export const getCookie: (event: any, name: string) => string | undefined;
  
  export const setCookie: (event: any, name: string, value: string, options?: any) => void;
  
  export const deleteCookie: (event: any, name: string, options?: any) => void;
  
  export const createError: (options: {
    statusCode?: number;
    statusMessage?: string;
    message?: string;
    data?: any;
  }) => Error;
}