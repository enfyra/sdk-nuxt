import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { defineEventHandler, proxyRequest } from 'h3';
import { Agent, fetch as undiciFetch } from 'undici';
import { useRuntimeConfig } from '#imports';

const dispatchers = new Map<string, Agent>();

export default defineEventHandler(async (event) => {
  const { appUrl, routePrefix, proxy } = useRuntimeConfig().enfyra;
  const dispatcher = getDispatcher(proxy.headersTimeout, proxy.bodyTimeout);
  const path = event.path.slice(routePrefix === '/' ? 0 : routePrefix.length);
  const target = `${appUrl}/api${path.startsWith('/') || path.startsWith('?') ? path : `/${path}`}`;
  const controller = new AbortController();
  const abort = () => {
    if (!event.node.res.writableEnded) controller.abort();
  };
  event.node.req.once('aborted', abort);
  event.node.res.once('close', abort);
  if (event.node.req.aborted || event.node.res.destroyed) abort();

  try {
    return await proxyRequest(event, target, {
      streamRequest: true,
      fetch: (input, init) =>
        undiciFetch(String(input), {
          ...init,
          dispatcher,
        } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>,
      fetchOptions: { redirect: 'manual', signal: controller.signal },
      onResponse: async (_event, response) => {
        if (response.body) {
          await pipeline(Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>), event.node.res, {
            signal: controller.signal,
          });
        } else {
          event.node.res.end();
        }
      },
    });
  } catch (error) {
    if (controller.signal.aborted || event.node.res.destroyed) return;
    throw error;
  } finally {
    event.node.req.off('aborted', abort);
    event.node.res.off('close', abort);
  }
});

function getDispatcher(headersTimeout: number, bodyTimeout: number): Agent {
  const key = `${headersTimeout}:${bodyTimeout}`;
  let dispatcher = dispatchers.get(key);
  if (!dispatcher) {
    dispatcher = new Agent({ headersTimeout, bodyTimeout });
    dispatchers.set(key, dispatcher);
  }
  return dispatcher;
}
