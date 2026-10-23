import { computed, readonly, ref, shallowRef } from 'vue';
import {
  isEnfyraError,
  type EnfyraClient,
  type AuthLoginResult,
  type LoginCredentials,
  type OAuthProvider,
  type RequestStatus,
  type UserInfo,
} from '@enfyra/sdk-core';
import { useEnfyra } from './useEnfyra';

function createAuth(client: EnfyraClient) {
  const user = shallowRef<UserInfo | null>(null);
  const pending = ref(false);
  const status = ref<RequestStatus | null>(null);
  const error = shallowRef<Error | null>(null);
  let refreshPromise: Promise<UserInfo | null> | null = null;
  let generation = 0;
  const invalidate = () => {
    generation++;
    refreshPromise = null;
  };
  const refresh = (): Promise<UserInfo | null> => {
    if (refreshPromise) return refreshPromise;
    const current = generation;
    pending.value = true;
    status.value = 'pending';
    error.value = null;
    refreshPromise = (async () => {
      try {
        const currentUser = await client.auth.getMe();
        if (current !== generation) return user.value;
        user.value = currentUser;
        status.value = 'success';
        return currentUser;
      } catch (err) {
        if (current !== generation) return user.value;
        if (isEnfyraError(err) && err.statusCode === 401) {
          user.value = null;
          status.value = 'success';
          return null;
        }
        error.value =
          err instanceof Error ? err : new Error('Auth check failed');
        status.value = 'error';
        return null;
      } finally {
        if (current === generation) {
          pending.value = false;
          refreshPromise = null;
        }
      }
    })();
    return refreshPromise;
  };
  const login = async (
    credentials: LoginCredentials,
  ): Promise<AuthLoginResult | null> => {
    invalidate();
    const current = generation;
    pending.value = true;
    status.value = 'pending';
    error.value = null;
    try {
      const result = await client.auth.login(credentials);
      if (current !== generation) return null;
      await refresh();
      return result;
    } catch (err) {
      if (current === generation) {
        error.value = err instanceof Error ? err : new Error('Login failed');
        status.value = 'error';
      }
      return null;
    } finally {
      if (current === generation) pending.value = false;
    }
  };
  const logout = async (): Promise<void> => {
    invalidate();
    user.value = null;
    pending.value = false;
    status.value = null;
    await client.auth.logout();
  };
  const oauthLogin = (provider: OAuthProvider): void => {
    if (import.meta.server) return;
    window.location.href = client.auth.getOAuthRedirectUrl(
      provider,
      window.location.href,
    );
  };
  return {
    user: readonly(user),
    isAuthenticated: computed(() => user.value !== null),
    pending: readonly(pending),
    status: readonly(status),
    error: readonly(error),
    login,
    logout,
    refresh,
    oauthLogin,
  };
}

const states = new WeakMap<EnfyraClient, ReturnType<typeof createAuth>>();

export function useAuth() {
  const client = useEnfyra();
  let auth = states.get(client);
  if (!auth) {
    auth = createAuth(client);
    states.set(client, auth);
  }
  return auth;
}
