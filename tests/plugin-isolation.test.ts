import { afterEach, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({
  enfyra: { appUrl: 'https://app.invalid', routePrefix: '/enfyra' },
  public: { enfyra: { baseUrl: '/enfyra' } },
}));
vi.mock('#app', () => ({
  defineNuxtPlugin: (callback: unknown) => callback,
  useRuntimeConfig: () => config,
}));
import plugin from '../src/runtime/plugin';
const install = plugin as unknown as (app: any) => {
  provide: { enfyra: import('@enfyra/sdk-core').EnfyraClient };
};
afterEach(() => vi.unstubAllGlobals());
it('isolates incoming SSR credentials and relays cookies only for in-scope responses', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () =>
      new Response('{"data":true}', {
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'rotated=synthetic; HttpOnly',
        },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const make = (cookie: string) => {
    const appendHeader = vi.fn();
    const client = install({
      ssrContext: {
        event: {
          node: {
            req: {
              headers: {
                cookie,
                authorization: `Bearer ${cookie}`,
                'x-private': 'not-forwarded',
              },
            },
            res: { appendHeader },
          },
        },
      },
    }).provide.enfyra;
    return { client, appendHeader };
  };
  const a = make('session=a');
  const b = make('session=b');
  expect(a.client).not.toBe(b.client);
  await a.client.get('/records');
  await b.client.get('/records');
  expect(new Headers(fetch.mock.calls[0][1]?.headers).get('cookie')).toBe(
    'session=a',
  );
  expect(new Headers(fetch.mock.calls[1][1]?.headers).get('cookie')).toBe(
    'session=b',
  );
  expect(new Headers(fetch.mock.calls[0][1]?.headers).has('x-private')).toBe(
    false,
  );
  expect(a.appendHeader).toHaveBeenCalledTimes(1);
  expect(b.appendHeader).toHaveBeenCalledTimes(1);
  await a.client.get('../collect');
  expect(new Headers(fetch.mock.calls[2][1]?.headers).has('cookie')).toBe(
    false,
  );
  expect(
    new Headers(fetch.mock.calls[2][1]?.headers).has('authorization'),
  ).toBe(false);
  expect(a.appendHeader).toHaveBeenCalledTimes(1);
  a.client.dispose();
  b.client.dispose();
});
