import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, defineEventHandler, toNodeListener } from 'h3';
import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../src/runtime/server/proxy';

const config = vi.hoisted(() => ({ enfyra: { appUrl: '', routePrefix: '/enfyra', proxy: { headersTimeout: 10_000, bodyTimeout: 10_000 } } }));
vi.mock('#imports', () => ({ useRuntimeConfig: () => config }));
const enfyraRoot = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(enfyraRoot, 'server/package.json'));
const servers: Server[] = [];
const directories: string[] = [];
let warn: ReturnType<typeof vi.spyOn>;
let isolated: { onDestroy(): void };
let bodyDispatcher: Agent | undefined;
const globalDispatcher = getGlobalDispatcher();
const runtime = async (path: string) => import(path);

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  config.enfyra.proxy.headersTimeout = 10_000;
  config.enfyra.proxy.bodyTimeout = 10_000;
});
afterEach(async () => {
  setGlobalDispatcher(globalDispatcher);
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections(); server.close(() => resolve());
  })));
  await bodyDispatcher?.destroy(); bodyDispatcher = undefined;
  isolated?.onDestroy();
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
  warn.mockRestore();
});

describe('SDK → eApp → native executor delivery chain', () => {
  for (const mode of ['complete', 'eapp-body-timeout', 'source-error']) {
    it(`${mode} retains private links and the originating failure without a client abort`, async () => {
      const { IsolatedExecutorService, ExecutorEngineService } = require('@enfyra/kernel');
      const root = join(enfyraRoot, 'server');
      const { DynamicContextFactory } = await runtime(`${root}/src/shared/services/dynamic-context.factory.ts`);
      const { DynamicService } = await runtime(`${root}/src/modules/dynamic-api/services/dynamic.service.ts`);
      const { RuntimeScriptExecutorService } = await runtime(`${root}/src/engines/cache/services/runtime-script-executor.service.ts`);
      const { compileScriptSource } = await runtime(`${root}/src/shared/utils/script-code.util.ts`);
      const { peekRuntimeLogs, acknowledgeRuntimeLog } = await runtime(`${root}/src/shared/runtime-log-buffer.ts`);
      const { proxyToAPI } = await runtime(join(enfyraRoot, 'app/app/utils/enfyra/server/proxy.ts'));
      const directory = await mkdtemp(join(tmpdir(), 'enfyra-chain-')); directories.push(directory);
      const packagePath = join(directory, 'fixture.mjs');
      await writeFile(packagePath, `import { Readable } from 'node:stream'; export default { stream() { return Readable.from((async function* () { yield 'chào 👋'; await new Promise(resolve => setTimeout(resolve, ${mode === 'complete' ? 30 : mode === 'source-error' ? 100 : 5000})); ${mode === 'source-error' ? "throw new Error('private-source-error');" : "yield ' done';"} })()); } };`);
      isolated = new IsolatedExecutorService({ packageCacheService: { getPackages: async () => ['fixture'] }, packageCdnLoaderService: { getPackageSources: () => [{ name: 'fixture', safeName: 'fixture', version: 'fixture', sourceCode: '', filePath: packagePath, fileUrl: packagePath }] }, tuning: { maxConcurrentWorkers: 1, isolateMemoryLimitMb: 64, isolatesPerWorker: 1 } });
      const executor = new RuntimeScriptExecutorService({ runtimeRegistryService: { getSharedHelpers: () => [] }, kernelExecutorEngineService: new ExecutorEngineService({ isolatedExecutorService: isolated }) });
      const factory = new DynamicContextFactory({ bcryptService: {}, apiTokenService: {}, userCacheService: {}, envService: { get: () => 'fixture' }, websocketContextFactory: { createGlobalProxy: () => ({}) } });
      let executionId: string | undefined;
      const failures: Array<{ statusCode: number }> = [];
      const dynamic = new DynamicService({ executorEngineService: executor, dynamicCancellationService: { run: async (_req: unknown, failure: { statusCode: number }) => failures.push(failure) }, loggingService: { error() {} } });
      const script = "await @HELPERS.$delivery('dispatch_start', { protocol: 'chat', clientStreaming: true, upstreamStreaming: true }); return await @RES.stream(@PKGS.fixture.stream(), { mimetype: 'text/plain', timeoutMs: 7000 });";
      let finished: () => void = () => {};
      const done = new Promise<void>(resolve => { finished = resolve; });
      const gatewayUrl = await listen(createServer(async (req: any, res: any) => {
        req.body = {}; req.path = '/v2/fixture';
        res.status = (code: number) => { res.statusCode = code; return res; };
        res.json = (value: unknown) => { res.end(JSON.stringify(value)); return res; };
        const context = factory.createHttp(req, { params: {}, realClientIP: '127.0.0.1' }); executionId = context.$api.request.executionId;
        req.routeData = { res, context, handler: compileScriptSource(script, 'javascript'), handlerRecord: { id: 1, sourceCode: script, scriptLanguage: 'javascript' }, route: { path: '/v2/fixture' }, routeMethodConfig: { timeout: 8000 }, postHooks: [], preHooks: [] };
        try { await dynamic.runHandler(req); } finally { finished(); }
      }));
      (globalThis as any).useRuntimeConfig = () => ({ public: { apiUrl: gatewayUrl } });
      if (mode === 'eapp-body-timeout') { bodyDispatcher = new Agent({ bodyTimeout: 50 }); setGlobalDispatcher(bodyDispatcher); }
      config.enfyra.appUrl = await listen(createServer(toNodeListener(createApp().use(defineEventHandler(event => proxyToAPI(event))))));
      const publicUrl = await listen(createServer(toNodeListener(createApp().use(handler))));
      const response = await fetch(`${publicUrl}/enfyra/v2/fixture`, { method: 'POST' });
      expect(response.status).toBe(200);
      expect(response.headers.has('x-enfyra-delivery-hop')).toBe(false);
      if (mode === 'complete') expect(await response.text()).toBe('chào 👋 done');
      else await expect(response.text()).rejects.toThrow();
      await done;
      const getRecords = () => warn.mock.calls.filter(call => call[0] === '[EnfyraProxyDelivery]').map(call => JSON.parse(String(call[1])) as Record<string, any>);
      let records = getRecords();
      const native = peekRuntimeLogs(2000).filter((row: any) => row.record.component === 'DynamicHttpDelivery' && row.record.details.executionId === executionId);
      if (mode === 'complete') { expect(records).toEqual([]); expect(native).toEqual([]); expect(failures).toEqual([]); }
      else {
        await vi.waitFor(() => expect(getRecords()).toHaveLength(2));
        records = getRecords();
        const eapp = records.find(record => record.hop === 'eapp')!;
        const sdk = records.find(record => record.hop === 'sdk')!;
        expect(eapp.parentHopId).toBe(sdk.hopId);
        expect(native[0].record.details.proxyLink).toEqual({ hopId: eapp.hopId, trusted: false });
        expect(eapp.firstCause.origin).toBe('upstream');
        if (mode === 'eapp-body-timeout') expect(eapp.firstCause.code).toBe('UND_ERR_BODY_TIMEOUT');
        expect(failures[0].statusCode).toBe(mode === 'source-error' ? 502 : 499);
        expect(JSON.stringify(records)).not.toMatch(/private-source-error|chào|authorization|fixture\.mjs/);
        native.forEach((row: any) => acknowledgeRuntimeLog(row.record.eventId));
      }
    }, 12_000);
  }
});
