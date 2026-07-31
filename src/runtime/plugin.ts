import { defineNuxtPlugin, useRuntimeConfig } from '#app';
import { EnfyraClient } from '@enfyra/sdk-core';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const event = nuxtApp.ssrContext?.event;
  let client: EnfyraClient;

  if (event) {
    const incoming = event.node.req.headers;
    client = new EnfyraClient({
      baseUrl: `${config.enfyra.appUrl}/api`,
      headers: {
        ...(typeof incoming.cookie === 'string'
          ? { cookie: incoming.cookie }
          : {}),
        ...(typeof incoming.authorization === 'string'
          ? { authorization: incoming.authorization }
          : {}),
      },
      onRawResponse: (response) => {
        for (const cookie of getSetCookieHeaders(response.headers)) {
          appendSetCookie(event.node.res, cookie);
        }
      },
      auth: {
        strategy: 'cookie',
        cookieBridgePrefix: config.enfyra.routePrefix,
      },
    });
  } else {
    const baseUrl = config.public.enfyra.baseUrl;
    client = new EnfyraClient({
      baseUrl,
      auth: {
        strategy: 'cookie',
        cookieBridgePrefix: baseUrl,
      },
    });
  }

  return {
    provide: { enfyra: client },
  };
});

function getSetCookieHeaders(headers: Headers): string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extended.getSetCookie === 'function') {
    return extended.getSetCookie();
  }
  const value = headers.get('set-cookie');
  return value ? [value] : [];
}

function appendSetCookie(
  res: {
    appendHeader?(name: string, value: string): void;
    getHeader(name: string): number | string | string[] | undefined;
    setHeader(name: string, value: string | string[]): void;
  },
  cookie: string,
): void {
  if (res.appendHeader) {
    res.appendHeader('set-cookie', cookie);
    return;
  }
  const current = res.getHeader('set-cookie');
  const values = Array.isArray(current)
    ? [...current, cookie]
    : typeof current === 'string'
      ? [current, cookie]
      : [cookie];
  res.setHeader('set-cookie', values);
}
