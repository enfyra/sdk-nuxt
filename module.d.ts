import type { ModuleOptions } from './module'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    enfyraSDK?: ModuleOptions
  }
  interface NuxtOptions {
    enfyraSDK?: ModuleOptions
  }
}

export type { ModuleOptions } from './module'
export type * from './src/types'

