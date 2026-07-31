import { onMounted, readonly, ref, shallowRef } from 'vue';
import { isEnfyraError } from '@enfyra/sdk-core';
import type {
  EnfyraError,
  MutationOptions,
  MutationParams,
  QueryOptions,
  RequestStatus,
} from '@enfyra/sdk-core';
import { useEnfyra } from './useEnfyra';

export function useQuery<T = unknown>(
  table: string,
  options: QueryOptions = {},
) {
  const client = useEnfyra();
  const {
    select,
    filter,
    sort,
    limit,
    page,
    meta,
    deep,
    immediate = true,
  } = options;

  const data = shallowRef<T | null>(null);
  const error = shallowRef<EnfyraError | null>(null);
  const pending = ref(false);
  const status = ref<RequestStatus | null>(null);
  const queryMeta = shallowRef<{
    totalCount?: number;
    filterCount?: number;
  } | null>(null);

  const refresh = async (): Promise<T | null> => {
    pending.value = true;
    status.value = 'pending';
    error.value = null;
    try {
      const builder = client.from<T>(table);
      if (select) builder.select(select);
      if (filter) builder.filter(filter);
      if (sort) builder.sort(sort);
      if (limit !== undefined) builder.limit(limit);
      if (page !== undefined) builder.page(page);
      if (meta) builder.meta(meta);
      if (deep) builder.deep(deep);
      const result = await builder.execute();
      data.value = result.data as T;
      queryMeta.value = result.meta ?? null;
      status.value = 'success';
      return result.data as T;
    } catch (err) {
      error.value = isEnfyraError(err)
        ? err
        : ({
            message: err instanceof Error ? err.message : 'Request failed',
            code: 'NETWORK_ERROR',
          } as EnfyraError);
      status.value = 'error';
      return null;
    } finally {
      pending.value = false;
    }
  };

  if (immediate) {
    onMounted(() => {
      void refresh();
    });
  }

  return {
    data: readonly(data),
    error: readonly(error),
    pending: readonly(pending),
    status: readonly(status),
    meta: readonly(queryMeta),
    refresh,
  };
}

export function useMutation<T = unknown>(
  table: string,
  options: MutationOptions = {},
) {
  const client = useEnfyra();
  const { operation = 'insert', onSuccess, onError, onSettled } = options;

  const data = shallowRef<T | null>(null);
  const error = shallowRef<EnfyraError | null>(null);
  const pending = ref(false);
  const status = ref<RequestStatus | null>(null);

  const execute = async (params: MutationParams): Promise<T | null> => {
    pending.value = true;
    status.value = 'pending';
    error.value = null;
    try {
      let result: T | null = null;

      if (params.ids && params.ids.length > 0) {
        const results = await Promise.all(
          params.ids.map((id) => {
            if (operation === 'delete')
              return client.from(table).byId(id).delete();
            return client
              .from<T>(table)
              .byId(id)
              .update(params.data as never);
          }),
        );
        result = results.map(
          (r) => (r as { data?: T } | undefined)?.data ?? null,
        ) as unknown as T;
      } else if (operation === 'delete') {
        if (params.id == null) throw new Error('id is required for delete');
        await client.from(table).byId(params.id).delete();
        result = null;
      } else if (operation === 'update') {
        if (params.id == null) throw new Error('id is required for update');
        result = (
          await client.from<T>(table).byId(params.id).update(params.data as never)
        ).data as T;
      } else {
        result = (
          await client.from<T>(table).insert(params.data as never)
        ).data as T;
      }

      data.value = result;
      status.value = 'success';
      onSuccess?.(result);
      return result;
    } catch (err) {
      const enfyraError = isEnfyraError(err)
        ? err
        : ({
            message: err instanceof Error ? err.message : 'Request failed',
            code: 'NETWORK_ERROR',
          } as EnfyraError);
      error.value = enfyraError;
      status.value = 'error';
      onError?.(enfyraError);
      return null;
    } finally {
      pending.value = false;
      onSettled?.();
    }
  };

  return {
    data: readonly(data),
    error: readonly(error),
    pending: readonly(pending),
    status: readonly(status),
    execute,
  };
}
