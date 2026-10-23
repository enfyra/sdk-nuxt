import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ client: { from: vi.fn() } }));
vi.mock('../src/runtime/composables/useEnfyra', () => ({
  useEnfyra: () => state.client,
}));
import { useMutation } from '../src/runtime/composables/useApi';
it('waits for all started writes before settling a rejected bulk mutation', async () => {
  let resolve!: (value: any) => void;
  state.client.from.mockImplementation(() => ({
    byId: (id: number) => ({
      update: () =>
        id === 1
          ? Promise.reject(new Error('denied'))
          : new Promise((done) => {
              resolve = done;
            }),
    }),
  }));
  const onSettled = vi.fn();
  const mutation = useMutation('records', { operation: 'update', onSettled });
  const done = mutation.execute({ ids: [1, 2], data: {} });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(onSettled).not.toHaveBeenCalled();
  expect(mutation.pending.value).toBe(true);
  resolve({ data: 'done' });
  await done;
  expect(onSettled).toHaveBeenCalledTimes(1);
});
