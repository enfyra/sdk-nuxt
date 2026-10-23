import { createServer, get as httpGet, type Server } from 'node:http';
import { createApp, toNodeListener } from 'h3';
import { getGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../src/runtime/server/proxy';

let warn: ReturnType<typeof vi.spyOn>;
const records = () => warn.mock.calls.filter(call => call[0] === '[EnfyraProxyDelivery]').map(call => JSON.parse(String(call[1])) as Record<string, any>);

const servers: Server[] = [];
const clients: AbortController[] = [];
const config = vi.hoisted(() => ({
  enfyra: {
    appUrl: '',
    routePrefix: '/enfyra',
    proxy: {
      headersTimeout: 300_000,
      bodyTimeout: 300_000,
    },
  },
}));
vi.mock('#imports', () => ({ useRuntimeConfig: () => config }));

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return `http://127.0.0.1:${address.port}`;
}

async function bridge() {
  const app = createApp().use(handler);
  return listen(createServer(toNodeListener(app)));
}

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  config.enfyra.proxy.headersTimeout = 300_000;
  config.enfyra.proxy.bodyTimeout = 300_000;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.abort();
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
  warn.mockRestore();
});

describe('API proxy real transport', () => {
  it('forwards the native socket polling path to the App websocket bridge', async () => {
    let target = '';
    config.enfyra.appUrl = await listen(createServer((request, response) => {
      target = request.url ?? '';
      response.end('0{}');
    }));
    const response = await fetch((await bridge()) + '/enfyra/socket.io/?EIO=4&transport=polling');
    expect(await response.text()).toBe('0{}');
    expect(target).toBe('/ws/socket.io/?EIO=4&transport=polling');
  });
  it('replaces caller hop identity without exposing linkage in the response', async () => {
    const forged = '46f9cacd-e79f-46b4-8cae-78d207ced765';
    let hop: unknown;
    config.enfyra.appUrl = await listen(createServer((req, res) => {
      hop = req.headers['x-enfyra-delivery-hop'];
      res.setHeader('x-enfyra-delivery-hop', String(hop));
      res.end('chào 👋');
    }));
    const response = await fetch((await bridge()) + '/enfyra/v1/models', { headers: { 'x-enfyra-delivery-hop': forged } });
    expect(await response.text()).toBe('chào 👋');
    expect(hop).toMatch(/^[0-9a-f-]{36}$/);
    expect(hop).not.toBe(forged);
    expect(response.headers.has('x-enfyra-delivery-hop')).toBe(false);
    expect(records()).toEqual([]);
  });

  it('does not replace the process-wide dispatcher', async () => {
    const globalDispatcher = getGlobalDispatcher();
    config.enfyra.appUrl = await listen(createServer((_req, res) => {
      res.writeHead(204);
      res.end();
    }));

    const response = await fetch((await bridge()) + '/enfyra/v1/models');

    expect(response.status).toBe(204);
    expect(getGlobalDispatcher()).toBe(globalDispatcher);
  });

  it('enforces the configured response headers timeout', async () => {
    config.enfyra.proxy.headersTimeout = 50;
    config.enfyra.proxy.bodyTimeout = 300_000;
    config.enfyra.appUrl = await listen(createServer(() => {}));

    const response = await fetch((await bridge()) + '/enfyra/v1/images/generations');

    expect(response.status).toBe(502);
    expect(records()).toHaveLength(1);
    expect(records()[0]).toMatchObject({ hop: 'sdk', firstCause: { origin: 'upstream', phase: 'headers', code: 'UND_ERR_HEADERS_TIMEOUT' } });
  });

  it('enforces the configured response body inactivity timeout', async () => {
    config.enfyra.proxy.headersTimeout = 300_000;
    config.enfyra.proxy.bodyTimeout = 50;
    config.enfyra.appUrl = await listen(createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.write('first');
    }));

    await expect(
      fetch((await bridge()) + '/enfyra/v1/images/generations').then(response => response.arrayBuffer()),
    ).rejects.toThrow();
    await vi.waitFor(() => expect(records()).toHaveLength(1));
    expect(records()[0]).toMatchObject({ firstCause: { origin: 'upstream', phase: 'body', code: 'UND_ERR_BODY_TIMEOUT' }, bytes: 5, chunks: 1 });
  });

  it('closes a silent upstream when the downstream request disconnects', async () => {
    let entered = false;
    let closed = false;
    config.enfyra.appUrl = await listen(createServer((_req, res) => {
      entered = true;
      res.once('close', () => { closed = true; });
    }));
    const controller = new AbortController();
    clients.push(controller);
    const request = fetch((await bridge()) + '/enfyra/v1/chat/completions', { signal: controller.signal }).catch(() => undefined);
    await vi.waitFor(() => expect(entered).toBe(true));
    controller.abort();
    await request;
    await vi.waitFor(() => expect(closed).toBe(true), { timeout: 500 });
  });

  it('closes an active upstream stream when the client stops reading', async () => {
    let closed = false;
    config.enfyra.appUrl = await listen(createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('data: first\n\n');
      res.once('close', () => { closed = true; });
    }));
    const controller = new AbortController();
    clients.push(controller);
    const response = await fetch((await bridge()) + '/enfyra/v1/chat/completions', { signal: controller.signal });
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('data: first\n\n');
    controller.abort();
    await vi.waitFor(() => expect(closed).toBe(true), { timeout: 500 });
    reader.releaseLock();
  });

  it('preserves status, cookies, redirects, query, headers, and raw request bytes', async () => {
    let received: { url?: string; body?: string; pat?: string } = {};
    config.enfyra.appUrl = await listen(createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      received = { url: req.url, body: Buffer.concat(chunks).toString(), pat: String(req.headers['x-enfyra-pat']) };
      res.writeHead(307, { location: '/next', 'set-cookie': ['a=one; Path=/', 'b=two; Path=/'], 'content-type': 'application/octet-stream' });
      res.end(Buffer.from([0, 1, 255]));
    }));
    const response = await fetch((await bridge()) + '/enfyra/v1/chat/completions?test=1', { method: 'POST', headers: { 'x-enfyra-pat': 'synthetic' }, body: '{"raw":"unchanged"}', redirect: 'manual' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/next');
    expect(response.headers.getSetCookie()).toEqual(['a=one; Path=/', 'b=two; Path=/']);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1, 255]);
    expect(received).toEqual({ url: '/api/v1/chat/completions?test=1', body: '{"raw":"unchanged"}', pat: 'synthetic' });
  });
  it('does not drain an unbounded response while the downstream socket is paused', async () => {
    let produced = 0;
    let stopped = false;
    const chunk = Buffer.alloc(64 * 1024, 120);
    config.enfyra.appUrl = await listen(createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      const pump = () => {
        while (!stopped && produced < 1024) {
          produced++;
          if (!res.write(chunk)) { res.once('drain', pump); return; }
        }
        if (produced === 1024) res.end();
      };
      res.once('close', () => { stopped = true; });
      pump();
    }));
    const url = await bridge();
    const client = httpGet(url + '/enfyra/v1/stream', response => response.pause());
    client.on('error', () => {});
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(produced).toBeGreaterThan(0);
      expect(produced).toBeLessThan(1024);
    } finally {
      client.destroy();
      await vi.waitFor(() => expect(stopped).toBe(true));
    }
  });

  it('preserves an empty upstream response without leaving the proxy open', async () => {
    config.enfyra.appUrl = await listen(createServer((_req, res) => {
      res.writeHead(204, { 'x-fixture': 'empty' });
      res.end();
    }));
    const response = await fetch((await bridge()) + '/enfyra/v1/empty');
    expect(response.status).toBe(204);
    expect(response.headers.get('x-fixture')).toBe('empty');
    expect(await response.text()).toBe('');
  });

});
