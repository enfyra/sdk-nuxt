import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
}));

vi.mock('@nuxt/kit', () => ({
  addImports: mocks.addImports,
  addPlugin: mocks.addPlugin,
  createResolver: () => ({ resolve: (path: string) => path }),
  defineNuxtModule: (definition: unknown) => definition,
}));

import moduleDefinition from '../src/module';

type ModuleSetup = {
  setup: (options: Record<string, unknown>, nuxt: unknown) => void;
  defaults?: Record<string, unknown>;
  meta?: { name?: string; configKey?: string };
};

const mod = moduleDefinition as unknown as ModuleSetup;

function createNuxt() {
  return {
    options: {
      runtimeConfig: { public: {} } as Record<string, unknown>,
      routeRules: {} as Record<string, unknown>,
    },
  };
}

describe('@enfyra/sdk-nuxt module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('has correct meta', () => {
    expect(mod.meta?.name).toBe('@enfyra/sdk-nuxt');
    expect(mod.meta?.configKey).toBe('enfyra');
  });

  it('installs proxy, plugin, and composable imports', () => {
    const nuxt = createNuxt();
    mod.setup(
      { appUrl: 'https://admin.enfyra.example/', routePrefix: '/enfyra/' },
      nuxt,
    );

    expect(nuxt.options.runtimeConfig).toMatchObject({
      enfyra: {
        appUrl: 'https://admin.enfyra.example',
        routePrefix: '/enfyra',
      },
      public: { enfyra: { baseUrl: '/enfyra' } },
    });
    expect(nuxt.options.routeRules).toEqual({
      '/enfyra/**': {
        proxy: {
          to: 'https://admin.enfyra.example/api/**',
          fetchOptions: { redirect: 'manual' },
        },
      },
    });
    expect(mocks.addPlugin).toHaveBeenCalledWith('./runtime/plugin');
    expect(mocks.addImports).toHaveBeenCalledTimes(6);
    expect(mocks.addImports).toHaveBeenCalledWith({
      name: 'useEnfyra',
      from: './runtime/composables/useEnfyra',
    });
    expect(mocks.addImports).toHaveBeenCalledWith({
      name: 'useAuth',
      from: './runtime/composables/useAuth',
    });
    expect(mocks.addImports).toHaveBeenCalledWith({
      name: 'useQuery',
      from: './runtime/composables/useApi',
    });
    expect(mocks.addImports).toHaveBeenCalledWith({
      name: 'useMutation',
      from: './runtime/composables/useApi',
    });
    expect(mocks.addImports).toHaveBeenCalledWith({
      name: 'useStorage',
      from: './runtime/composables/useStorage',
    });
    expect(mocks.addImports).toHaveBeenCalledWith({
      name: 'useWebSocket',
      from: './runtime/composables/useWebSocket',
    });
  });

  it('throws when appUrl is missing', () => {
    const nuxt = createNuxt();
    const prevEnv = process.env.ENFYRA_APP_URL;
    delete process.env.ENFYRA_APP_URL;
    try {
      expect(() => mod.setup({}, nuxt)).toThrow(
        '@enfyra/sdk-nuxt requires ENFYRA_APP_URL or enfyra.appUrl',
      );
    } finally {
      if (prevEnv !== undefined) process.env.ENFYRA_APP_URL = prevEnv;
    }
  });

  it('throws on route rule conflict', () => {
    const nuxt = createNuxt();
    nuxt.options.routeRules = { '/enfyra/**': { proxy: {} } };
    expect(() =>
      mod.setup({ appUrl: 'https://x.example' }, nuxt),
    ).toThrow('Route rule /enfyra/** is already configured');
  });

  it('reads appUrl from ENFYRA_APP_URL env', () => {
    const nuxt = createNuxt();
    const prevEnv = process.env.ENFYRA_APP_URL;
    process.env.ENFYRA_APP_URL = 'https://env.example.com/';
    try {
      mod.setup({}, nuxt);
      expect(
        (nuxt.options.runtimeConfig as Record<string, unknown>).enfyra,
      ).toMatchObject({ appUrl: 'https://env.example.com' });
    } finally {
      if (prevEnv !== undefined) process.env.ENFYRA_APP_URL = prevEnv;
      else delete process.env.ENFYRA_APP_URL;
    }
  });
});
