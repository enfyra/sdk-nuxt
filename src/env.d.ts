declare module '#app' {
  import type { EnfyraClient } from '@enfyra/sdk-core';
  import type { Ref } from 'vue';

  export interface NuxtApp {
    $enfyra: EnfyraClient;
    ssrContext?: {
      event: {
        node: {
          req: { headers: Record<string, string | string[] | undefined> };
          res: {
            appendHeader?(name: string, value: string): void;
            getHeader(name: string): number | string | string[] | undefined;
            setHeader(name: string, value: string | string[]): void;
          };
        };
      };
    };
    [key: string]: unknown;
  }

  export function defineNuxtPlugin(
    plugin: (nuxtApp: NuxtApp) => void | { provide: Record<string, unknown> },
  ): typeof plugin;

  export function useNuxtApp(): NuxtApp;

  export function useRuntimeConfig(): {
    enfyra: {
      appUrl: string;
      routePrefix: string;
      proxy: { headersTimeout: number; bodyTimeout: number };
    };
    public: { enfyra: { baseUrl: string } };
    [key: string]: unknown;
  };

  export function useState<T>(key: string, init?: () => T): Ref<T>;
}

declare module '#imports' {
  export function useRuntimeConfig(): {
    enfyra: {
      appUrl: string;
      routePrefix: string;
      proxy: { headersTimeout: number; bodyTimeout: number };
    };
  };
}

interface ImportMeta {
  readonly server: boolean;
  readonly client: boolean;
}
