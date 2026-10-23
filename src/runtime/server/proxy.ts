import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { defineEventHandler, proxyRequest } from 'h3';
import { Agent, fetch as undiciFetch } from 'undici';
import { useRuntimeConfig } from '#imports';
import { beginProxyDelivery, deliveryHopHeader } from './proxy-delivery';

const dispatchers = new Map<string, Agent>();

export default defineEventHandler(async (event) => {
  const { appUrl, routePrefix, proxy } = useRuntimeConfig().enfyra;
  const dispatcher = getDispatcher(proxy.headersTimeout, proxy.bodyTimeout);
  const path = event.path.slice(routePrefix === '/' ? 0 : routePrefix.length);
  const socketPath = /^\/socket\.io(?:\/|\?|$)/.test(path);
  const target = `${appUrl}${socketPath ? '/ws' : '/api'}${path.startsWith('/') || path.startsWith('?') ? path : `/${path}`}`;
  const delivery = beginProxyDelivery(event, 'sdk');
  const controller = new AbortController();
  const abort = () => {
    if (!event.node.res.writableEnded) controller.abort();
  };
  const onAborted = () => {
    delivery.failure('downstream', 'response', 'request_aborted');
    abort();
  };
  const onClose = () => {
    delivery.mark('response_close');
    if (!event.node.res.writableEnded) delivery.failure('downstream', 'response', 'response_close');
    abort();
    delivery.report();
  };
  const onError = (error: Error) => delivery.failure('downstream', 'response', 'response_error', error);
  const onFinish = () => delivery.mark('response_finish');
  event.node.req.once('aborted', onAborted);
  event.node.res.once('close', onClose);
  event.node.res.once('error', onError);
  event.node.res.once('finish', onFinish);
  if (event.node.req.aborted || event.node.res.destroyed) onAborted();

  try {
    return await proxyRequest(event, target, {
      streamRequest: true,
      headers: { [deliveryHopHeader]: delivery.snapshot.hopId },
      fetch: (input, init) =>
        undiciFetch(String(input), {
          ...init,
          dispatcher,
        } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>,
      fetchOptions: { redirect: 'manual', signal: controller.signal },
      onResponse: async (_event, response) => {
        event.node.res.removeHeader(deliveryHopHeader);
        delivery.snapshot.upstreamStatusCode = response.status;
        delivery.mark('upstream_headers');
        if (response.body) {
          const source = Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>);
          source.on('data', (chunk: Buffer) => delivery.chunk(chunk.byteLength));
          source.once('error', error => delivery.failure('upstream', 'body', 'source_error', error));
          source.once('end', () => delivery.mark('source_end'));
          try {
            await pipeline(source, event.node.res, { signal: controller.signal });
            delivery.mark('relay_end');
          } catch (error) {
            delivery.failure('bridge', 'body', 'relay_error', error);
            throw error;
          }
        } else {
          event.node.res.end();
        }
      },
    });
  } catch (error) {
    delivery.failure('upstream', delivery.snapshot.upstreamStatusCode === undefined ? 'headers' : 'body', 'proxy_error', error);
    if (controller.signal.aborted || event.node.res.destroyed) return;
    throw error;
  } finally {
    delivery.report();
    event.node.req.off('aborted', onAborted);
    event.node.res.off('close', onClose);
    event.node.res.off('error', onError);
    event.node.res.off('finish', onFinish);
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
