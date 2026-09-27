import {
  addImports,
  addPlugin,
  addServerHandler,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit';
import type { EnfyraNuxtOptions } from './types';

const DEFAULT_PROXY_TIMEOUT = 300_000;

const COMPOSABLE_IMPORTS: Array<{ name: string; from: string }> = [
  { name: 'useEnfyra', from: './runtime/composables/useEnfyra' },
  { name: 'useAuth', from: './runtime/composables/useAuth' },
  { name: 'useQuery', from: './runtime/composables/useApi' },
  { name: 'useMutation', from: './runtime/composables/useApi' },
  { name: 'useStorage', from: './runtime/composables/useStorage' },
  { name: 'useWebSocket', from: './runtime/composables/useWebSocket' },
];

export default defineNuxtModule<EnfyraNuxtOptions>({
  meta: {
    name: '@enfyra/sdk-nuxt',
    configKey: 'enfyra',
  },
  defaults: {
    routePrefix: '/enfyra',
  },
  setup(options, nuxt) {
    const appUrl = (options.appUrl ?? process.env.ENFYRA_APP_URL)?.replace(
      /\/+$/,
      '',
    );
    if (!appUrl) {
      throw new Error(
        '@enfyra/sdk-nuxt requires ENFYRA_APP_URL or enfyra.appUrl',
      );
    }

    const routePrefix = normalizePrefix(options.routePrefix ?? '/enfyra');
    const proxy = {
      headersTimeout: resolveProxyTimeout(
        options.proxy?.headersTimeout,
        'headersTimeout',
      ),
      bodyTimeout: resolveProxyTimeout(options.proxy?.bodyTimeout, 'bodyTimeout'),
    };

    const privateConfig = (nuxt.options.runtimeConfig.enfyra ?? {}) as Record<
      string,
      unknown
    >;
    nuxt.options.runtimeConfig.enfyra = {
      ...privateConfig,
      appUrl,
      routePrefix,
      proxy,
    };

    const publicConfig = (nuxt.options.runtimeConfig.public.enfyra ??
      {}) as Record<string, unknown>;
    nuxt.options.runtimeConfig.public.enfyra = {
      ...publicConfig,
      baseUrl: routePrefix,
    };

    const nuxtOptions = nuxt.options as typeof nuxt.options & {
      routeRules?: Record<string, unknown>;
    };
    nuxtOptions.routeRules ??= {};
    const routeRule = `${routePrefix}/**`;
    if (nuxtOptions.routeRules[routeRule]) {
      throw new Error(`Route rule ${routeRule} is already configured`);
    }
    const resolver = createResolver(import.meta.url);
    addServerHandler({
      route: routeRule,
      handler: resolver.resolve('./runtime/server/proxy'),
    });
    addPlugin(resolver.resolve('./runtime/plugin'));
    for (const { name, from } of COMPOSABLE_IMPORTS) {
      addImports({ name, from: resolver.resolve(from) });
    }
  },
});

function normalizePrefix(prefix: string): string {
  const normalized = `/${prefix}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalized || '/';
}

function resolveProxyTimeout(
  value: number | undefined,
  field: 'headersTimeout' | 'bodyTimeout',
): number {
  if (value === undefined) return DEFAULT_PROXY_TIMEOUT;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`enfyra.proxy.${field} must be a non-negative integer`);
  }
  return value;
}

export type {
  EnfyraNuxtOptions,
  EnfyraNuxtProxyOptions,
} from './types';
