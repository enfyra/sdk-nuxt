import { expect, it, vi } from 'vitest';
vi.mock('vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue')>()),
  onUnmounted: vi.fn(),
}));
const mocks = vi.hoisted(() => ({ config: vi.fn(), disconnect: vi.fn() }));
vi.mock('@enfyra/sdk-core', () => ({
  WebSocketClient: class {
    constructor(config: unknown) {
      mocks.config(config);
    }
    on() {}
    connect = async () => {};
    disconnect = mocks.disconnect;
  },
}));
vi.mock('../src/runtime/composables/useEnfyra', () => ({
  useEnfyra: () => ({
    getHttpClient: () => ({ baseUrl: '/enfyra' }),
    auth: { getToken: vi.fn() },
  }),
}));
import { useWebSocket } from '../src/runtime/composables/useWebSocket';
it('uses the browser same-origin socket prefix instead of a namespace under the HTTP base', async () => {
  const socket = useWebSocket('chat');
  await socket.connect();
  expect(mocks.config).toHaveBeenCalledWith(
    expect.objectContaining({ baseUrl: '', path: '/enfyra/socket.io' }),
  );
  socket.disconnect();
});
