export interface EnfyraNuxtProxyOptions {
  headersTimeout?: number;
  bodyTimeout?: number;
}

export interface EnfyraNuxtOptions {
  appUrl?: string;
  routePrefix?: string;
  proxy?: EnfyraNuxtProxyOptions;
}

export interface EnfyraNuxtRuntimeConfig {
  appUrl: string;
  routePrefix: string;
  proxy: Required<EnfyraNuxtProxyOptions>;
}
