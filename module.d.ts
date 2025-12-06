import type { ModuleOptions } from "./src/module";

declare module "@nuxt/schema" {
  interface NuxtConfig {
    enfyraSDK?: ModuleOptions;
  }
  interface NuxtOptions {
    enfyraSDK?: ModuleOptions;
  }
  interface PublicRuntimeConfig {
    enfyraSDK?: ModuleOptions & {
      configError?: boolean;
      configErrorMessage?: string;
    };
  }
}

declare module "#imports" {
  export const useEnfyraApi: typeof import("./src/runtime/composables/useEnfyraApi").useEnfyraApi;
  export const useEnfyraAuth: typeof import("./src/runtime/composables/useEnfyraAuth").useEnfyraAuth;
}

export type { ModuleOptions } from "./src/module";
export type * from "./src/types";
