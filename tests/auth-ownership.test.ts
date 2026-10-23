import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  client: {
    auth: { getMe: vi.fn(), logout: vi.fn(async () => {}), login: vi.fn() },
  },
}));
vi.mock('../src/runtime/composables/useEnfyra', () => ({
  useEnfyra: () => state.client,
}));
import { useAuth } from '../src/runtime/composables/useAuth';
it('does not restore identity from a refresh settling after logout', async () => {
  let resolve!: (value: any) => void;
  state.client.auth.getMe.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const auth = useAuth();
  const pending = auth.refresh();
  await auth.logout();
  resolve({ id: 'old' });
  await pending;
  expect(auth.user.value).toBeNull();
});
