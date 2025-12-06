import type { ModuleOptions } from './src/module'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    enfyraSDK?: ModuleOptions
  }
  interface NuxtOptions {
    enfyraSDK?: ModuleOptions
  }
}

export type { ModuleOptions } from './src/module'
export type * from './src/types'

