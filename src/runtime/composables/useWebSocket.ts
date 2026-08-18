import { onUnmounted, readonly, ref, shallowRef } from 'vue';
import { WebSocketClient } from '@enfyra/sdk-core';
import type { WebSocketConfig, WebSocketEvent } from '@enfyra/sdk-core';
import type { UseWebSocketOptions } from '../types';
import { useEnfyra } from './useEnfyra';

export function useWebSocket(
  gateway: string,
  options: UseWebSocketOptions = {},
) {
  const client = useEnfyra();
  const { immediate = false } = options;

  const connected = ref(false);
  const connecting = ref(false);
  const error = shallowRef<Error | null>(null);
  let ws: WebSocketClient | null = null;
  const unsubscribes: Array<() => void> = [];

  const connect = async (): Promise<void> => {
    if (import.meta.server) return;
    if (ws) return;
    connecting.value = true;
    error.value = null;

    const baseUrl =
      options.baseUrl ??
      client.getHttpClient().baseUrl.replace(/\/api\/?$/, '');
    const socketConfig: WebSocketConfig = {
      baseUrl,
      gateway,
      getAuthToken: () => client.auth.getToken(),
    };
    if (options.path !== undefined) socketConfig.path = options.path;
    if (options.namespacePrefix !== undefined) socketConfig.namespacePrefix = options.namespacePrefix;
    if (options.withCredentials !== undefined) socketConfig.withCredentials = options.withCredentials;
    if (options.reconnect !== undefined) socketConfig.reconnect = options.reconnect;
    if (options.maxReconnectAttempts !== undefined) socketConfig.maxReconnectAttempts = options.maxReconnectAttempts;
    if (options.reconnectInterval !== undefined) socketConfig.reconnectInterval = options.reconnectInterval;
    if (options.reconnectDelayMax !== undefined) socketConfig.reconnectDelayMax = options.reconnectDelayMax;
    if (options.transports !== undefined) socketConfig.transports = options.transports;
    if (options.upgrade !== undefined) socketConfig.upgrade = options.upgrade;
    const socket = new WebSocketClient(socketConfig);

    socket.on('connect', () => {
      connected.value = true;
      connecting.value = false;
    });
    socket.on('disconnect', () => {
      connected.value = false;
    });
    socket.on('connect_error', (value) => {
      error.value =
        value instanceof Error ? value : new Error(String(value));
      connecting.value = false;
    });

    ws = socket;
    try {
      await socket.connect();
    } catch (value) {
      const err = value instanceof Error ? value : new Error(String(value));
      error.value = err;
      connecting.value = false;
      ws = null;
      throw err;
    }
  };

  const disconnect = (): void => {
    unsubscribes.forEach((fn) => fn());
    unsubscribes.length = 0;
    ws?.disconnect();
    ws = null;
    connected.value = false;
    connecting.value = false;
  };

  const emit = (event: string, data: unknown): void => {
    ws?.emit(event, data);
  };

  const on = (
    event: string,
    handler: (data?: unknown) => void,
  ): (() => void) => {
    if (!ws) throw new Error('Not connected. Call connect() first.');
    const unsubscribe = ws.on(event as WebSocketEvent, handler);
    unsubscribes.push(unsubscribe);
    return unsubscribe;
  };

  if (immediate) {
    connect().catch(() => undefined);
  }

  onUnmounted(disconnect);

  return {
    connected: readonly(connected),
    connecting: readonly(connecting),
    error: readonly(error),
    connect,
    disconnect,
    emit,
    on,
  };
}
